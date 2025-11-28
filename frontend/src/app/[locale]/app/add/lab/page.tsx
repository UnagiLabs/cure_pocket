"use client";

import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import {
	Camera,
	ChevronDown,
	ChevronUp,
	Image as ImageIcon,
	Loader2,
	X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { usePassport } from "@/hooks/usePassport";
import { useSessionKeyManager } from "@/hooks/useSessionKeyManager";
import { useUpdatePassportData } from "@/hooks/useUpdatePassportData";
import {
	calculateFlag,
	createMetaData,
	formValuesToLabResultsData,
	getLabFieldsByGroup,
	LAB_FIELDS,
	LAB_GROUPS,
	type LabFieldDefinition,
	type LabGroupId,
	mapOCRResultToFormValues,
} from "@/lib/labResultsConverter";
import {
	buildPatientAccessPTB,
	calculateThreshold,
	createSealClient,
	decryptHealthData,
	encryptHealthData,
	SEAL_KEY_SERVERS,
} from "@/lib/seal";
import { generateSealId } from "@/lib/sealIdGenerator";
import { getDataEntry, PASSPORT_REGISTRY_ID } from "@/lib/suiClient";
import { getTheme } from "@/lib/themes";
import { downloadFromWalrusByBlobId, uploadToWalrus } from "@/lib/walrus";
import type { LabResult, LabResultsData } from "@/types/healthData";
import {
	createEmptyMetadata,
	type LabResultsMetadataEntry,
} from "@/types/metadata";

type InputMode = "image" | "manual";

/**
 * OCR API呼び出し
 */
async function performLabOCR(images: string[]): Promise<{
	testDate: string;
	facility: string;
	items: {
		testName: string;
		value: string;
		unit: string;
		refRange?: string;
		flag?: string;
	}[];
}> {
	const response = await fetch("/api/ocr/lab-results", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ images }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "OCR処理に失敗しました");
	}

	return await response.json();
}

/**
 * 検査値追加ページ
 * AI画像認識 + 手動入力の2モード構成
 */
export default function AddLabPage() {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const { settings, profile } = useApp();
	const theme = getTheme(settings.theme);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Walrus関連フック
	const suiClient = useSuiClient();
	const currentAccount = useCurrentAccount();
	const { passport } = usePassport();
	const { updatePassportData, isUpdating } = useUpdatePassportData();
	const { sessionKey } = useSessionKeyManager();

	// 入力モード
	const [inputMode, setInputMode] = useState<InputMode>("image");
	const [isOCRProcessing, setIsOCRProcessing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	// 画像関連
	const [uploadedImages, setUploadedImages] = useState<string[]>([]);

	// 検査基本情報
	const [testDate, setTestDate] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [facility, setFacility] = useState("");
	const [notes, setNotes] = useState("");

	// 検査値（fieldId -> 値文字列）
	const [values, setValues] = useState<Record<string, string>>({});

	// グループ展開状態
	const [expandedGroups, setExpandedGroups] = useState<
		Record<LabGroupId, boolean>
	>({
		cbc: true,
		electrolyteRenal: true,
		liver: true,
		lipid: true,
		glucose: true,
		optional: false,
	});

	// OCR未マッピング項目
	const [unmappedItems, setUnmappedItems] = useState<
		{ testName: string; value: string; unit?: string }[]
	>([]);

	// グループの展開/折りたたみ
	const toggleGroup = (groupId: LabGroupId) => {
		setExpandedGroups((prev) => ({
			...prev,
			[groupId]: !prev[groupId],
		}));
	};

	// 画像アップロード処理
	const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files) return;

		Array.from(files).forEach((file) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				const base64String = reader.result as string;
				setUploadedImages((prev) => [...prev, base64String]);
			};
			reader.readAsDataURL(file);
		});
	};

	// 画像削除
	const handleRemoveImage = (index: number) => {
		setUploadedImages((prev) => prev.filter((_, i) => i !== index));
	};

	// OCR実行
	const handleRunOCR = async () => {
		if (uploadedImages.length === 0) return;

		setIsOCRProcessing(true);
		try {
			const ocrResult = await performLabOCR(uploadedImages);

			// OCR結果を自動入力
			if (ocrResult.testDate) {
				setTestDate(ocrResult.testDate);
			}
			if (ocrResult.facility) {
				setFacility(ocrResult.facility);
			}

			// 検査項目をフォーム値にマッピング
			const { values: mappedValues, unmapped } = mapOCRResultToFormValues(
				ocrResult.items,
			);
			setValues(mappedValues);
			setUnmappedItems(unmapped);

			// 手入力モードに切り替えて確認・編集を促す
			setInputMode("manual");
		} catch (error) {
			console.error("OCR processing error:", error);
			alert(t("labs.ocrError") || "OCR処理中にエラーが発生しました");
		} finally {
			setIsOCRProcessing(false);
		}
	};

	// 検査値変更
	const handleValueChange = (fieldId: string, value: string) => {
		setValues((prev) => ({
			...prev,
			[fieldId]: value,
		}));
	};

	// 保存処理
	const handleSave = async () => {
		// バリデーション
		if (!facility.trim()) {
			alert(
				t("labs.validation.facilityRequired") || "検査機関名を入力してください",
			);
			return;
		}

		const hasAnyValue = Object.values(values).some((v) => v && v.trim() !== "");
		if (!hasAnyValue) {
			alert(t("labs.validation.noValues") || "検査値を1つ以上入力してください");
			return;
		}

		// パスポート確認
		if (!passport) {
			alert("パスポートが見つかりません。プロフィールを作成してください。");
			return;
		}

		// ウォレットアドレス確認
		if (!currentAccount?.address) {
			alert("ウォレットが接続されていません。");
			return;
		}

		setIsSaving(true);

		try {
			// seal_id を生成（lab_results タイプ用）
			const labResultsSealId = await generateSealId(
				currentAccount.address,
				"lab_results",
			);
			console.log(
				`[AddLab] Generated seal_id for lab_results: ${labResultsSealId.substring(0, 16)}...`,
			);

			// フォーム値をLabResultsDataに変換
			// 性別が"male"または"female"の場合のみ、男女別の閾値を使用
			const gender =
				profile?.gender === "male" || profile?.gender === "female"
					? profile.gender
					: undefined;
			const newLabResultsData = formValuesToLabResultsData(
				values,
				testDate,
				facility,
				locale,
				gender,
			);

			// v3.0.0: 既存のlab_resultsメタデータを読み込む
			console.log("[AddLab] Loading existing lab_results metadata...");
			const existingEntry = await getDataEntry(passport.id, "lab_results");

			const existingLabResults: LabResult[] = [];
			const isNewEntry = existingEntry === null;

			if (existingEntry?.metadataBlobId) {
				console.log(
					`[AddLab] Found existing metadata blob: ${existingEntry.metadataBlobId.substring(0, 16)}...`,
				);

				try {
					// SessionKeyチェック
					if (!sessionKey) {
						throw new Error(
							"SessionKeyが見つかりません。再度ログインしてください。",
						);
					}

					// PTBを準備
					const txBytes = await buildPatientAccessPTB({
						passportObjectId: passport.id,
						registryObjectId: PASSPORT_REGISTRY_ID,
						suiClient,
						sealId: labResultsSealId,
						dataType: "lab_results",
					});

					// Seal clientを作成
					const sealClient = createSealClient(suiClient);

					// メタデータBlobをダウンロード・復号化
					const encryptedMetadata = await downloadFromWalrusByBlobId(
						existingEntry.metadataBlobId,
					);
					const metadataData = await decryptHealthData({
						encryptedData: encryptedMetadata,
						sealClient,
						sessionKey,
						txBytes,
						sealId: labResultsSealId,
					});

					const metadata = metadataData as unknown as {
						entries: Array<{ blob_id: string }>;
					};

					// 各データBlobを読み込んでマージ
					for (const entry of metadata.entries || []) {
						try {
							const encryptedData = await downloadFromWalrusByBlobId(
								entry.blob_id,
							);
							const decryptedData = await decryptHealthData({
								encryptedData,
								sealClient,
								sessionKey,
								txBytes,
								sealId: labResultsSealId,
							});

							const existingData = decryptedData as unknown as LabResultsData;
							existingLabResults.push(...(existingData.lab_results || []));
						} catch (blobError) {
							console.error(
								`[AddLab] Failed to load blob ${entry.blob_id}:`,
								blobError,
							);
						}
					}

					console.log(
						`[AddLab] Loaded ${existingLabResults.length} existing lab results`,
					);
				} catch (error) {
					console.error("[AddLab] Failed to load existing data:", error);
					// 既存データの読み込みに失敗しても続行（新規データとして保存）
				}
			}

			// 既存のlab_results配列と新しいlab_results配列をマージ
			const labResultsData: LabResultsData = {
				meta: createMetaData(),
				lab_results: [...existingLabResults, ...newLabResultsData.lab_results],
			};

			console.log(
				"[AddLab] Lab results count:",
				labResultsData.lab_results.length,
			);

			// Seal clientを作成
			const sealClient = createSealClient(suiClient);
			const threshold = calculateThreshold(SEAL_KEY_SERVERS.length);

			// LabResultsDataを暗号化
			const { encryptedObject } = await encryptHealthData({
				healthData: labResultsData as unknown as never,
				sealClient,
				sealId: labResultsSealId,
				threshold,
			});

			console.log(
				`[AddLab] Encrypted data size: ${encryptedObject.byteLength} bytes`,
			);

			// Walrusにアップロード（データBlob）
			const walrusRef = await uploadToWalrus(encryptedObject);

			console.log(
				`[AddLab] Data blob upload complete, blobId: ${walrusRef.blobId}`,
			);

			// v3.0.0: メタデータBlobを作成してアップロード
			const metadataEntry: LabResultsMetadataEntry = {
				blob_id: walrusRef.blobId,
				test_date: testDate,
				facility: facility.trim(),
				test_count: newLabResultsData.lab_results[0]?.items.length || 0,
			};

			const metadata = {
				...createEmptyMetadata("lab_results"),
				entries: [metadataEntry],
			};

			// メタデータを暗号化
			const { encryptedObject: encryptedMetadata } = await encryptHealthData({
				healthData: metadata as unknown as never,
				sealClient,
				sealId: labResultsSealId,
				threshold,
			});

			// メタデータBlobをアップロード
			const metadataRef = await uploadToWalrus(encryptedMetadata);
			console.log(
				`[AddLab] Metadata blob upload complete, blobId: ${metadataRef.blobId}`,
			);

			// パスポートのDynamic Fieldを更新
			console.log("[AddLab] Updating passport data...");
			await updatePassportData({
				passportId: passport.id,
				dataType: "lab_results",
				metadataBlobId: metadataRef.blobId,
				replace: !isNewEntry,
			});

			console.log("[AddLab] Save complete!");
			router.push(`/${locale}/app/labs`);
		} catch (error) {
			console.error("[AddLab] Save failed:", error);
			alert(
				`保存に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
			);
		} finally {
			setIsSaving(false);
		}
	};

	// 入力済み項目数を計算
	const filledCount = Object.values(values).filter(
		(v) => v && v.trim() !== "",
	).length;

	return (
		<div className="px-4 md:px-8 lg:px-12 py-4 lg:py-8 pb-24 lg:pb-8 space-y-6">
			{/* Header - Mobile only */}
			<div className="lg:hidden mb-2">
				<h1 className="text-xl font-bold" style={{ color: theme.colors.text }}>
					{t("labs.add")}
				</h1>
			</div>

			{/* モード切り替えボタン */}
			<div className="flex gap-3">
				<button
					type="button"
					onClick={() => setInputMode("image")}
					className={`flex-1 rounded-xl py-3 px-4 font-medium transition-all ${
						inputMode === "image" ? "text-white shadow-md" : "border-2"
					}`}
					style={
						inputMode === "image"
							? { backgroundColor: theme.colors.primary }
							: {
									borderColor: `${theme.colors.textSecondary}40`,
									backgroundColor: theme.colors.surface,
									color: theme.colors.textSecondary,
								}
					}
				>
					<Camera className="inline mr-2" size={18} />
					{t("labs.inputFromImage") || "画像から入力"}
				</button>
				<button
					type="button"
					onClick={() => setInputMode("manual")}
					className={`flex-1 rounded-xl py-3 px-4 font-medium transition-all ${
						inputMode === "manual" ? "text-white shadow-md" : "border-2"
					}`}
					style={
						inputMode === "manual"
							? { backgroundColor: theme.colors.primary }
							: {
									borderColor: `${theme.colors.textSecondary}40`,
									backgroundColor: theme.colors.surface,
									color: theme.colors.textSecondary,
								}
					}
				>
					{t("labs.manualInput") || "手入力"}
				</button>
			</div>

			{/* 画像モード */}
			{inputMode === "image" && (
				<div className="space-y-4">
					{/* 画像アップロードエリア */}
					<button
						type="button"
						className="w-full rounded-2xl p-6 text-center border-2 border-dashed cursor-pointer transition-all hover:opacity-80"
						style={{
							borderColor: `${theme.colors.textSecondary}40`,
							backgroundColor: theme.colors.surface,
						}}
						onClick={() => fileInputRef.current?.click()}
					>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							capture="environment"
							multiple
							onChange={handleImageUpload}
							className="hidden"
						/>
						<ImageIcon
							size={48}
							className="mx-auto mb-3"
							style={{ color: theme.colors.textSecondary }}
						/>
						<p className="font-medium" style={{ color: theme.colors.text }}>
							{t("labs.uploadOrTakePhoto") || "検査結果をアップロード/撮影"}
						</p>
						<p
							className="text-sm mt-1"
							style={{ color: theme.colors.textSecondary }}
						>
							{t("labs.tapToUpload") || "タップして画像を選択"}
						</p>
					</button>

					{/* アップロード済み画像 */}
					{uploadedImages.length > 0 && (
						<div className="space-y-3">
							<p
								className="text-sm font-medium"
								style={{ color: theme.colors.text }}
							>
								{t("labs.uploadedImages") || "アップロード済み画像"} (
								{uploadedImages.length})
							</p>
							<div className="grid grid-cols-3 gap-2">
								{uploadedImages.map((img, index) => (
									<div
										key={`img-${index}-${img.substring(0, 20)}`}
										className="relative"
									>
										<Image
											src={img}
											alt={`Uploaded ${index + 1}`}
											width={100}
											height={100}
											className="rounded-lg object-cover w-full aspect-square"
										/>
										<button
											type="button"
											onClick={() => handleRemoveImage(index)}
											className="absolute -top-2 -right-2 rounded-full p-1 shadow-md bg-red-500"
										>
											<X size={14} className="text-white" />
										</button>
									</div>
								))}
							</div>

							{/* OCR実行ボタン */}
							<button
								type="button"
								onClick={handleRunOCR}
								disabled={isOCRProcessing}
								className="w-full rounded-xl py-3 px-4 font-medium text-white transition-all disabled:opacity-50"
								style={{ backgroundColor: theme.colors.primary }}
							>
								{isOCRProcessing ? (
									<>
										<Loader2 className="inline mr-2 animate-spin" size={18} />
										{t("labs.ocrProcessing") || "OCR処理中..."}
									</>
								) : (
									t("labs.runOCR") || "画像から読み取る"
								)}
							</button>
						</div>
					)}
				</div>
			)}

			{/* 手動入力モード */}
			{inputMode === "manual" && (
				<div className="space-y-6">
					{/* OCR未マッピング項目の警告 */}
					{unmappedItems.length > 0 && (
						<div className="rounded-xl p-4 bg-amber-50">
							<p className="font-medium mb-2 text-amber-700">
								{t("labs.unmappedItems") || "未マッピング項目"}
							</p>
							<ul
								className="text-sm space-y-1"
								style={{ color: theme.colors.text }}
							>
								{unmappedItems.map((item, i) => (
									<li key={`unmapped-${i}-${item.testName}`}>
										{item.testName}: {item.value} {item.unit || ""}
									</li>
								))}
							</ul>
						</div>
					)}

					{/* 検査基本情報 */}
					<div
						className="rounded-2xl p-4 space-y-4"
						style={{ backgroundColor: theme.colors.surface }}
					>
						<h2 className="font-semibold" style={{ color: theme.colors.text }}>
							{t("labs.basicInfo") || "基本情報"}
						</h2>

						{/* 検査日 */}
						<div>
							<label
								htmlFor="lab-test-date"
								className="block text-sm font-medium mb-1"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("labs.testDate")} *
							</label>
							<input
								id="lab-test-date"
								type="date"
								value={testDate}
								onChange={(e) => setTestDate(e.target.value)}
								className="w-full rounded-xl px-4 py-3 border-2 transition-colors"
								style={{
									borderColor: `${theme.colors.textSecondary}40`,
									backgroundColor: theme.colors.background,
									color: theme.colors.text,
								}}
							/>
						</div>

						{/* 検査機関 */}
						<div>
							<label
								htmlFor="lab-facility"
								className="block text-sm font-medium mb-1"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("labs.facility")} *
							</label>
							<input
								id="lab-facility"
								type="text"
								value={facility}
								onChange={(e) => setFacility(e.target.value)}
								placeholder={
									t("labs.facilityPlaceholder") || "例：〇〇病院 検査部"
								}
								className="w-full rounded-xl px-4 py-3 border-2 transition-colors"
								style={{
									borderColor: `${theme.colors.textSecondary}40`,
									backgroundColor: theme.colors.background,
									color: theme.colors.text,
								}}
							/>
						</div>

						{/* メモ */}
						<div>
							<label
								htmlFor="lab-notes"
								className="block text-sm font-medium mb-1"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("labs.notes")}
							</label>
							<textarea
								id="lab-notes"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder={t("labs.notesPlaceholder") || "メモ（任意）"}
								rows={2}
								className="w-full rounded-xl px-4 py-3 border-2 transition-colors resize-none"
								style={{
									borderColor: `${theme.colors.textSecondary}40`,
									backgroundColor: theme.colors.background,
									color: theme.colors.text,
								}}
							/>
						</div>
					</div>

					{/* 検査値入力セクション */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h2
								className="font-semibold"
								style={{ color: theme.colors.text }}
							>
								{t("labs.testValues") || "検査値"}
							</h2>
							<span
								className="text-sm"
								style={{ color: theme.colors.textSecondary }}
							>
								{filledCount} / {LAB_FIELDS.length}{" "}
								{t("labs.itemsFilled") || "項目入力済み"}
							</span>
						</div>

						{/* グループ別入力フォーム */}
						{LAB_GROUPS.map((group) => {
							const groupFields = getLabFieldsByGroup(group.id);
							const groupFilledCount = groupFields.filter(
								(f) => values[f.id] && values[f.id].trim() !== "",
							).length;

							return (
								<div
									key={group.id}
									className="rounded-2xl overflow-hidden"
									style={{ backgroundColor: theme.colors.surface }}
								>
									{/* グループヘッダー */}
									<button
										type="button"
										onClick={() => toggleGroup(group.id)}
										className="w-full px-4 py-3 flex items-center justify-between"
										style={{ color: theme.colors.text }}
									>
										<span className="font-medium">
											{locale === "ja" ? group.labelJa : group.labelEn}
											{groupFilledCount > 0 && (
												<span
													className="ml-2 text-sm"
													style={{ color: theme.colors.primary }}
												>
													({groupFilledCount})
												</span>
											)}
										</span>
										{expandedGroups[group.id] ? (
											<ChevronUp size={20} />
										) : (
											<ChevronDown size={20} />
										)}
									</button>

									{/* グループ内容 */}
									{expandedGroups[group.id] && (
										<div className="px-4 pb-4 space-y-3">
											{groupFields.map((field) => {
												// 性別が"male"または"female"の場合のみ、男女別の閾値を使用
												const gender =
													profile?.gender === "male" ||
													profile?.gender === "female"
														? profile.gender
														: undefined;
												return (
													<LabInputRow
														key={field.id}
														field={field}
														value={values[field.id] || ""}
														onChange={(val) => handleValueChange(field.id, val)}
														locale={locale}
														theme={theme}
														gender={gender}
													/>
												);
											})}
										</div>
									)}
								</div>
							);
						})}
					</div>

					{/* アップロード済み画像（OCR後に表示） */}
					{uploadedImages.length > 0 && (
						<div
							className="rounded-2xl p-4"
							style={{ backgroundColor: theme.colors.surface }}
						>
							<p
								className="text-sm font-medium mb-2"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("labs.attachedImages") || "添付画像"}
							</p>
							<div className="grid grid-cols-4 gap-2">
								{uploadedImages.map((img, index) => (
									<Image
										key={`attached-${index}-${img.substring(0, 20)}`}
										src={img}
										alt={`Attached ${index + 1}`}
										width={60}
										height={60}
										className="rounded-lg object-cover w-full aspect-square"
									/>
								))}
							</div>
						</div>
					)}
				</div>
			)}

			{/* 保存ボタン（固定） */}
			<div className="fixed bottom-0 left-0 right-0 p-4 lg:static lg:p-0">
				<div className="max-w-2xl mx-auto">
					<button
						type="button"
						onClick={handleSave}
						disabled={isSaving || isUpdating}
						className="w-full rounded-xl py-4 px-6 font-semibold text-white transition-all disabled:opacity-50 shadow-lg"
						style={{ backgroundColor: theme.colors.primary }}
					>
						{isSaving || isUpdating ? (
							<>
								<Loader2 className="inline mr-2 animate-spin" size={20} />
								{t("common.saving") || "保存中..."}
							</>
						) : (
							t("common.save") || "保存"
						)}
					</button>
				</div>
			</div>
		</div>
	);
}

/**
 * 検査項目入力行コンポーネント
 */
function LabInputRow({
	field,
	value,
	onChange,
	locale,
	theme,
	gender,
}: {
	field: LabFieldDefinition;
	value: string;
	onChange: (value: string) => void;
	locale: string;
	theme: ReturnType<typeof getTheme>;
	gender?: "male" | "female";
}) {
	const numValue = Number.parseFloat(value);
	const flag = !Number.isNaN(numValue)
		? calculateFlag(
				numValue,
				field.refLow,
				field.refHigh,
				gender,
				field.refRanges,
			)
		: null;

	const flagColor =
		flag === "H"
			? "#ef4444" // red-500
			: flag === "L"
				? "#f59e0b" // amber-500
				: "#22c55e"; // green-500

	return (
		<div className="flex items-center gap-3">
			{/* ラベル */}
			<div className="flex-1 min-w-0">
				<p
					className="text-sm font-medium truncate"
					style={{ color: theme.colors.text }}
				>
					{locale === "ja" ? field.labelJa : field.labelEn}
				</p>
				<p
					className="text-xs truncate"
					style={{ color: theme.colors.textSecondary }}
				>
					{locale === "ja" ? field.referenceJa : field.referenceEn}
				</p>
			</div>

			{/* 入力フィールド */}
			<div className="flex items-center gap-2">
				<input
					type="number"
					step="any"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder="--"
					className="w-24 rounded-lg px-3 py-2 text-right border-2 transition-colors"
					style={{
						borderColor: flag
							? `${flagColor}80`
							: `${theme.colors.textSecondary}40`,
						backgroundColor: theme.colors.background,
						color: theme.colors.text,
					}}
				/>
				<span
					className="text-sm w-16 truncate"
					style={{ color: theme.colors.textSecondary }}
				>
					{field.unit}
				</span>
			</div>

			{/* フラグ表示 */}
			{flag && flag !== "N" && (
				<span
					className="text-xs font-bold w-6 text-center"
					style={{ color: flagColor }}
				>
					{flag}
				</span>
			)}
		</div>
	);
}
