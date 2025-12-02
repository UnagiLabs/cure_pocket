"use client";

import {
	useCurrentAccount,
	useSignAndExecuteTransaction,
	useSuiClient,
} from "@mysten/dapp-kit";
import {
	Camera,
	Image as ImageIcon,
	Loader2,
	Minus,
	Plus,
	X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { DrugAutocomplete } from "@/components/DrugAutocomplete";
import { useApp } from "@/contexts/AppContext";
import { usePassport } from "@/hooks/usePassport";
import { useSessionKeyManager } from "@/hooks/useSessionKeyManager";
import { useUpdatePassportData } from "@/hooks/useUpdatePassportData";
import {
	buildPatientAccessPTB,
	calculateThreshold,
	createSealClient,
	decryptHealthData,
	downloadFromWalrusByBlobId,
	encryptHealthData,
	generateSealId,
	SEAL_KEY_SERVERS,
	uploadToWalrus,
} from "@/lib/crypto/walrusSeal";
import {
	createMetaData,
	prescriptionToMedicationsData,
} from "@/lib/prescriptionConverter";
import { getDataEntry, PASSPORT_REGISTRY_ID } from "@/lib/suiClient";
import { getTheme } from "@/lib/themes";
import type { Prescription, PrescriptionMedication } from "@/types";
import type { Medication, MedicationsData } from "@/types/healthData";
import {
	createEmptyMetadata,
	type MedicationsMetadataEntry,
} from "@/types/metadata";

type InputMode = "image" | "manual";

/**
 * Gemini APIを使用したOCR処理
 */
async function performOCR(images: string[]): Promise<{
	prescriptionDate: string;
	clinic: string;
	department?: string;
	doctorName?: string;
	medications: Omit<PrescriptionMedication, "id">[];
	symptoms?: string;
}> {
	const response = await fetch("/api/ocr/gemini", {
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
 * 処方箋追加フォームページ
 * 画像アップロード/撮影優先、OCRモック機能、手入力フォーム切り替え
 */
export default function AddPrescriptionPage() {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const { settings, prescriptions } = useApp();
	const theme = getTheme(settings.theme);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Walrus関連フック
	const suiClient = useSuiClient();
	const currentAccount = useCurrentAccount();
	const { mutateAsync: signAndExecuteTransaction } =
		useSignAndExecuteTransaction();
	const { passport } = usePassport();
	const { updatePassportData, isUpdating } = useUpdatePassportData();
	const { sessionKey } = useSessionKeyManager();

	// 入力モード
	const [inputMode, setInputMode] = useState<InputMode>("image");
	const [isOCRProcessing, setIsOCRProcessing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	// 画像関連
	const [uploadedImages, setUploadedImages] = useState<string[]>([]);

	// 処方基本情報
	const [prescriptionDate, setPrescriptionDate] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [clinic, setClinic] = useState("");
	const [department, setDepartment] = useState("");
	const [doctorName, setDoctorName] = useState("");

	// 症状・メモ
	const [symptoms, setSymptoms] = useState("");
	const [notes, setNotes] = useState("");

	// 薬品リスト（最低1つ）
	const [medications, setMedications] = useState<
		Omit<PrescriptionMedication, "id">[]
	>([
		{
			drugName: "",
			strength: "",
			dosage: "",
			quantity: "",
			duration: "",
		},
	]);

	// 医療機関履歴から候補を取得
	const clinicHistory = Array.from(
		new Set(prescriptions.map((p) => p.clinic)),
	).filter(Boolean);

	// 画像アップロード処理
	const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files) return;

		// ファイルをBase64に変換して配列に追加
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
			const ocrResult = await performOCR(uploadedImages);

			// OCR結果を自動入力
			setPrescriptionDate(ocrResult.prescriptionDate);
			setClinic(ocrResult.clinic);
			setDepartment(ocrResult.department || "");
			setDoctorName(ocrResult.doctorName || "");
			setMedications(ocrResult.medications);
			setSymptoms(ocrResult.symptoms || "");

			// OCR完了後、手入力モードに切り替えて確認・編集を促す
			setInputMode("manual");
		} catch (error) {
			console.error("OCR processing error:", error);
			alert("OCR処理中にエラーが発生しました");
		} finally {
			setIsOCRProcessing(false);
		}
	};

	const handleAddMedication = () => {
		setMedications([
			...medications,
			{
				drugName: "",
				strength: "",
				dosage: "",
				quantity: "",
				duration: "",
			},
		]);
	};

	const handleRemoveMedication = (index: number) => {
		if (medications.length > 1) {
			setMedications(medications.filter((_, i) => i !== index));
		}
	};

	const handleMedicationChange = (
		index: number,
		field: keyof Omit<PrescriptionMedication, "id">,
		value: string,
	) => {
		const updated = [...medications];
		updated[index] = { ...updated[index], [field]: value };
		setMedications(updated);
	};

	const handleSave = async () => {
		// バリデーション
		if (!clinic.trim()) {
			alert(t("prescriptions.validation.clinicRequired"));
			return;
		}

		const hasValidMedication = medications.some(
			(med) => med.drugName.trim() !== "",
		);
		if (!hasValidMedication) {
			alert(t("prescriptions.validation.medicationRequired"));
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

		try {
			// seal_id を生成（medications タイプ用）
			const medicationsSealId = await generateSealId(
				currentAccount.address,
				"medications",
			);
			console.log(
				`[AddMedication] Generated seal_id for medications: ${medicationsSealId.substring(0, 16)}...`,
			);
			// 処方箋オブジェクトを作成
			const prescription: Prescription = {
				id: uuidv4(),
				prescriptionDate,
				clinic: clinic.trim(),
				department: department.trim() || undefined,
				doctorName: doctorName.trim() || undefined,
				medications: medications
					.filter((med) => med.drugName.trim() !== "")
					.map((med) => ({
						id: uuidv4(),
						drugName: med.drugName.trim(),
						strength: med.strength.trim(),
						dosage: med.dosage.trim(),
						quantity: med.quantity.trim(),
						duration: med.duration?.trim() || undefined,
					})),
				symptoms: symptoms.trim() || undefined,
				notes: notes.trim() || undefined,
				attachments: uploadedImages.length > 0 ? uploadedImages : undefined,
			};

			console.log(
				"[AddMedication] Converting prescription to MedicationsData...",
			);

			// PrescriptionをMedicationsData (JSON形式) に変換
			const newMedicationsData = prescriptionToMedicationsData(prescription);

			// v3.0.0: 既存のmedicationsメタデータを読み込む
			console.log("[AddMedication] Loading existing medications metadata...");
			const existingEntry = await getDataEntry(passport.id, "medications");

			const existingMedications: Medication[] = [];
			const isNewEntry = existingEntry === null;

			if (existingEntry?.metadataBlobId) {
				console.log(
					`[AddMedication] Found existing metadata blob: ${existingEntry.metadataBlobId.substring(0, 16)}...`,
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
						sealId: medicationsSealId,
						dataType: "medications",
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
						sealId: medicationsSealId,
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
								sealId: medicationsSealId,
							});

							const existingData = decryptedData as unknown as MedicationsData;
							existingMedications.push(...(existingData.medications || []));
						} catch (blobError) {
							console.error(
								`[AddMedication] Failed to load blob ${entry.blob_id}:`,
								blobError,
							);
						}
					}

					console.log(
						`[AddMedication] Loaded ${existingMedications.length} existing medications`,
					);
				} catch (error) {
					console.error("[AddMedication] Failed to load existing data:", error);
					// 既存データの読み込みに失敗しても続行（新規データとして保存）
				}
			}

			// 既存のmedications配列と新しいmedications配列をマージ
			const medicationsData: MedicationsData = {
				meta: createMetaData(),
				medications: [
					...existingMedications,
					...newMedicationsData.medications,
				],
			};

			// 暗号化前のデータを詳細に表示
			console.log(
				"[AddMedication] ========== MedicationsData Before Encryption ==========",
			);
			console.log("[AddMedication] Type:", typeof medicationsData);
			console.log("[AddMedication] Raw medicationsData:", medicationsData);
			console.log(
				"[AddMedication] JSON stringified:",
				JSON.stringify(medicationsData, null, 2),
			);
			console.log("[AddMedication] Keys:", Object.keys(medicationsData || {}));
			console.log(
				"[AddMedication] Medications count:",
				medicationsData.medications?.length || 0,
			);
			console.log(
				"[AddMedication] =============================================",
			);

			// 直接暗号化・アップロード
			console.log("[AddMedication] Encrypting and uploading to Walrus...");
			setIsSaving(true);

			// Seal clientを作成
			const sealClient = createSealClient(suiClient);
			const threshold = calculateThreshold(SEAL_KEY_SERVERS.length);

			// MedicationsDataを暗号化
			const { encryptedObject } = await encryptHealthData({
				healthData: medicationsData as unknown as never,
				sealClient,
				sealId: medicationsSealId,
				threshold,
			});

			console.log(
				`[AddMedication] Encrypted data size: ${encryptedObject.byteLength} bytes`,
			);

			// Walrusにアップロード（データBlob）
			const walrusRef = await uploadToWalrus(encryptedObject, {
				signAndExecuteTransaction,
				owner: currentAccount.address,
			});
			setIsSaving(false);

			console.log(
				`[AddMedication] Data blob upload complete, blobId: ${walrusRef.blobId}`,
			);

			// v3.0.0: メタデータBlobを作成してアップロード
			const prescriptionId = `prescription-${Date.now()}`;
			const metadataEntry: MedicationsMetadataEntry = {
				blob_id: walrusRef.blobId,
				prescription_id: prescriptionId,
				prescription_date: prescription.prescriptionDate,
				clinic: prescription.clinic,
				medication_count: newMedicationsData.medications.length,
			};

			const metadata = {
				...createEmptyMetadata("medications"),
				entries: [metadataEntry],
			};

			// メタデータを暗号化
			const { encryptedObject: encryptedMetadata } = await encryptHealthData({
				healthData: metadata as unknown as never,
				sealClient,
				sealId: medicationsSealId,
				threshold,
			});

			// メタデータBlobをアップロード
			const metadataRef = await uploadToWalrus(encryptedMetadata, {
				signAndExecuteTransaction,
				owner: currentAccount.address,
			});
			console.log(
				`[AddMedication] Metadata blob upload complete, blobId: ${metadataRef.blobId}`,
			);

			// パスポートのDynamic Fieldを更新
			console.log("[AddMedication] Updating passport data...");
			await updatePassportData({
				passportId: passport.id,
				dataType: "medications",
				metadataBlobId: metadataRef.blobId,
				replace: !isNewEntry, // 既存データがあれば置き換え、なければ新規追加
			});

			console.log("[AddMedication] Save complete!");
			router.push(`/${locale}/app/medications`);
		} catch (error) {
			console.error("[AddMedication] Save failed:", error);
			alert(
				`保存に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
			);
		}
	};

	return (
		<div className="px-4 md:px-8 lg:px-12 py-4 lg:py-8 pb-24 lg:pb-8 space-y-6">
			{/* Header - Mobile only, desktop shows in top bar */}
			<div className="lg:hidden mb-2">
				<h1 className="text-xl font-bold" style={{ color: theme.colors.text }}>
					{t("prescriptions.addNew")}
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
					{t("prescriptions.inputFromImage")}
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
					{t("prescriptions.manualInput")}
				</button>
			</div>

			{/* 画像アップロード/撮影エリア */}
			{inputMode === "image" && (
				<div
					className="rounded-xl p-6 space-y-4"
					style={{
						backgroundColor: theme.colors.surface,
						border: `2px solid ${theme.colors.textSecondary}20`,
					}}
				>
					<h2
						className="text-lg font-bold"
						style={{ color: theme.colors.text }}
					>
						{t("prescriptions.uploadOrTakePhoto")}
					</h2>

					{/* ファイル入力 */}
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						capture="environment"
						multiple
						onChange={handleImageUpload}
						className="hidden"
					/>

					{/* アップロードボタン */}
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						className="w-full rounded-xl py-8 border-2 border-dashed transition-all hover:scale-[1.01] active:scale-95"
						style={{
							borderColor: theme.colors.primary,
							backgroundColor: `${theme.colors.primary}10`,
							color: theme.colors.text,
						}}
					>
						<ImageIcon
							className="mx-auto mb-2"
							size={48}
							style={{ color: theme.colors.primary }}
						/>
						<p className="font-medium">{t("prescriptions.dragDropImages")}</p>
						<p
							className="text-sm mt-1"
							style={{ color: theme.colors.textSecondary }}
						>
							{t("prescriptions.clickToUpload")}
						</p>
					</button>

					{/* 画像プレビュー */}
					{uploadedImages.length > 0 && (
						<div className="space-y-3">
							<p
								className="text-sm font-medium"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("prescriptions.uploadedImages")} ({uploadedImages.length})
							</p>
							<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
								{uploadedImages.map((image, index) => (
									<div
										key={`img-${
											// biome-ignore lint/suspicious/noArrayIndexKey: Image order matters
											index
										}`}
										className="relative rounded-lg overflow-hidden"
										style={{
											backgroundColor: theme.colors.background,
											border: `1px solid ${theme.colors.textSecondary}20`,
										}}
									>
										<Image
											src={image}
											alt={`処方箋画像 ${index + 1}`}
											className="w-full h-32 object-cover"
											width={200}
											height={128}
											unoptimized
										/>
										<button
											type="button"
											onClick={() => handleRemoveImage(index)}
											className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
										>
											<X size={14} />
										</button>
									</div>
								))}
							</div>
						</div>
					)}

					{/* OCR実行ボタン */}
					<button
						type="button"
						onClick={handleRunOCR}
						disabled={uploadedImages.length === 0 || isOCRProcessing}
						className="w-full rounded-xl py-4 font-medium text-white transition-all hover:scale-[1.02] active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
						style={{
							backgroundImage: `linear-gradient(to top right, ${theme.colors.primary}, ${theme.colors.secondary})`,
						}}
					>
						{isOCRProcessing ? (
							<>
								<Loader2 className="inline mr-2 animate-spin" size={18} />
								{t("prescriptions.ocrProcessing")}
							</>
						) : (
							t("prescriptions.runOCR")
						)}
					</button>
				</div>
			)}

			{/* 手入力フォームエリア */}
			{inputMode === "manual" && (
				<>
					{/* Section 1: 処方基本情報 */}
					<div
						className="rounded-xl p-5 space-y-4"
						style={{
							backgroundColor: theme.colors.surface,
							border: `2px solid ${theme.colors.textSecondary}20`,
						}}
					>
						<h2
							className="text-lg font-bold mb-4"
							style={{ color: theme.colors.text }}
						>
							{t("prescriptions.basicInfo")}
						</h2>

						{/* 処方日 */}
						<div>
							<label
								htmlFor="prescription-date"
								className="block text-sm font-medium mb-1"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("prescriptions.prescriptionDate")} *
							</label>
							<input
								id="prescription-date"
								type="date"
								value={prescriptionDate}
								onChange={(e) => setPrescriptionDate(e.target.value)}
								className="w-full rounded-lg border p-3"
								style={{
									backgroundColor: theme.colors.background,
									borderColor: `${theme.colors.textSecondary}40`,
									color: theme.colors.text,
								}}
							/>
						</div>

						{/* 医療機関名 */}
						<div>
							<label
								htmlFor="clinic"
								className="block text-sm font-medium mb-1"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("prescriptions.clinic")} *
							</label>
							<input
								id="clinic"
								type="text"
								value={clinic}
								onChange={(e) => setClinic(e.target.value)}
								list="clinic-history"
								className="w-full rounded-lg border p-3"
								style={{
									backgroundColor: theme.colors.background,
									borderColor: `${theme.colors.textSecondary}40`,
									color: theme.colors.text,
								}}
								placeholder={t("prescriptions.clinicPlaceholder")}
							/>
							{clinicHistory.length > 0 && (
								<datalist id="clinic-history">
									{clinicHistory.map((c) => (
										<option key={c} value={c} />
									))}
								</datalist>
							)}
						</div>

						{/* 診療科 */}
						<div>
							<label
								htmlFor="department"
								className="block text-sm font-medium mb-1"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("prescriptions.department")}
							</label>
							<input
								id="department"
								type="text"
								value={department}
								onChange={(e) => setDepartment(e.target.value)}
								className="w-full rounded-lg border p-3"
								style={{
									backgroundColor: theme.colors.background,
									borderColor: `${theme.colors.textSecondary}40`,
									color: theme.colors.text,
								}}
								placeholder={t("prescriptions.departmentPlaceholder")}
							/>
						</div>

						{/* 医師名 */}
						<div>
							<label
								htmlFor="doctor"
								className="block text-sm font-medium mb-1"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("prescriptions.doctorName")}
							</label>
							<input
								id="doctor"
								type="text"
								value={doctorName}
								onChange={(e) => setDoctorName(e.target.value)}
								className="w-full rounded-lg border p-3"
								style={{
									backgroundColor: theme.colors.background,
									borderColor: `${theme.colors.textSecondary}40`,
									color: theme.colors.text,
								}}
								placeholder={t("prescriptions.doctorNamePlaceholder")}
							/>
						</div>
					</div>

					{/* Section 2: 薬品追加（複数行） */}
					<div
						className="rounded-xl p-5 space-y-4"
						style={{
							backgroundColor: theme.colors.surface,
							border: `2px solid ${theme.colors.textSecondary}20`,
						}}
					>
						<div className="flex items-center justify-between mb-4">
							<h2
								className="text-lg font-bold"
								style={{ color: theme.colors.text }}
							>
								{t("prescriptions.medications")}
							</h2>
							<button
								type="button"
								onClick={handleAddMedication}
								className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-transform active:scale-95"
								style={{ backgroundColor: theme.colors.primary }}
							>
								<Plus size={16} />
								{t("prescriptions.addMedication")}
							</button>
						</div>

						{medications.map((medication, index) => (
							<div
								key={`med-${
									// biome-ignore lint/suspicious/noArrayIndexKey: This is a form array where order matters
									index
								}`}
								className="p-4 rounded-lg space-y-3"
								style={{
									backgroundColor: theme.colors.background,
									border: `1px solid ${theme.colors.textSecondary}20`,
								}}
							>
								<div className="flex items-center justify-between mb-2">
									<span
										className="font-medium text-sm"
										style={{ color: theme.colors.textSecondary }}
									>
										{t("prescriptions.medication")} {index + 1}
									</span>
									{medications.length > 1 && (
										<button
											type="button"
											onClick={() => handleRemoveMedication(index)}
											className="text-red-500 hover:text-red-700 p-1"
										>
											<Minus size={18} />
										</button>
									)}
								</div>

								{/* 薬品名 */}
								<div>
									<label
										htmlFor={`drugName-${index}`}
										className="block text-xs font-medium mb-1"
										style={{ color: theme.colors.textSecondary }}
									>
										{t("prescriptions.drugName")} *
									</label>
									<DrugAutocomplete
										id={`drugName-${index}`}
										value={medication.drugName}
										onChange={(drugName, strength) => {
											handleMedicationChange(index, "drugName", drugName);
											// 規格が取得できた場合は自動入力
											if (strength && !medication.strength) {
												handleMedicationChange(index, "strength", strength);
											}
										}}
										placeholder={t("prescriptions.drugNamePlaceholder")}
										themeId={settings.theme}
									/>
								</div>

								{/* 規格 */}
								<div>
									<label
										htmlFor={`strength-${index}`}
										className="block text-xs font-medium mb-1"
										style={{ color: theme.colors.textSecondary }}
									>
										{t("prescriptions.strength")}
									</label>
									<input
										id={`strength-${index}`}
										type="text"
										value={medication.strength}
										onChange={(e) =>
											handleMedicationChange(index, "strength", e.target.value)
										}
										className="w-full rounded-lg border p-2.5 text-sm"
										style={{
											backgroundColor: theme.colors.surface,
											borderColor: `${theme.colors.textSecondary}40`,
											color: theme.colors.text,
										}}
										placeholder="5mg, 10mg/mL"
									/>
								</div>

								{/* 用法 */}
								<div>
									<label
										htmlFor={`dosage-${index}`}
										className="block text-xs font-medium mb-1"
										style={{ color: theme.colors.textSecondary }}
									>
										{t("prescriptions.dosage")}
									</label>
									<input
										id={`dosage-${index}`}
										type="text"
										value={medication.dosage}
										onChange={(e) =>
											handleMedicationChange(index, "dosage", e.target.value)
										}
										className="w-full rounded-lg border p-2.5 text-sm"
										style={{
											backgroundColor: theme.colors.surface,
											borderColor: `${theme.colors.textSecondary}40`,
											color: theme.colors.text,
										}}
										placeholder={t("prescriptions.dosagePlaceholder")}
									/>
								</div>

								<div className="grid grid-cols-2 gap-3">
									{/* 用量 */}
									<div>
										<label
											htmlFor={`quantity-${index}`}
											className="block text-xs font-medium mb-1"
											style={{ color: theme.colors.textSecondary }}
										>
											{t("prescriptions.quantity")}
										</label>
										<input
											id={`quantity-${index}`}
											type="text"
											value={medication.quantity}
											onChange={(e) =>
												handleMedicationChange(
													index,
													"quantity",
													e.target.value,
												)
											}
											className="w-full rounded-lg border p-2.5 text-sm"
											style={{
												backgroundColor: theme.colors.surface,
												borderColor: `${theme.colors.textSecondary}40`,
												color: theme.colors.text,
											}}
											placeholder="1錠, 5mL"
										/>
									</div>

									{/* 日数/総量 */}
									<div>
										<label
											htmlFor={`duration-${index}`}
											className="block text-xs font-medium mb-1"
											style={{ color: theme.colors.textSecondary }}
										>
											{t("prescriptions.duration")}
										</label>
										<input
											id={`duration-${index}`}
											type="text"
											value={medication.duration || ""}
											onChange={(e) =>
												handleMedicationChange(
													index,
													"duration",
													e.target.value,
												)
											}
											className="w-full rounded-lg border p-2.5 text-sm"
											style={{
												backgroundColor: theme.colors.surface,
												borderColor: `${theme.colors.textSecondary}40`,
												color: theme.colors.text,
											}}
											placeholder="7日分, 14錠"
										/>
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Section 3: メモ */}
					<div
						className="rounded-xl p-5 space-y-4"
						style={{
							backgroundColor: theme.colors.surface,
							border: `2px solid ${theme.colors.textSecondary}20`,
						}}
					>
						<h2
							className="text-lg font-bold mb-4"
							style={{ color: theme.colors.text }}
						>
							{t("prescriptions.additionalInfo")}
						</h2>

						{/* 症状・目的 */}
						<div>
							<label
								htmlFor="symptoms"
								className="block text-sm font-medium mb-1"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("prescriptions.symptoms")}
							</label>
							<textarea
								id="symptoms"
								value={symptoms}
								onChange={(e) => setSymptoms(e.target.value)}
								rows={2}
								className="w-full rounded-lg border p-3"
								style={{
									backgroundColor: theme.colors.background,
									borderColor: `${theme.colors.textSecondary}40`,
									color: theme.colors.text,
								}}
								placeholder={t("prescriptions.symptomsPlaceholder")}
							/>
						</div>

						{/* 注意・自由メモ */}
						<div>
							<label
								htmlFor="notes"
								className="block text-sm font-medium mb-1"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("prescriptions.notes")}
							</label>
							<textarea
								id="notes"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								rows={3}
								className="w-full rounded-lg border p-3"
								style={{
									backgroundColor: theme.colors.background,
									borderColor: `${theme.colors.textSecondary}40`,
									color: theme.colors.text,
								}}
								placeholder={t("prescriptions.notesPlaceholder")}
							/>
						</div>

						{/* アップロード済み画像表示 */}
						{uploadedImages.length > 0 && (
							<div>
								<p
									className="text-sm font-medium mb-2"
									style={{ color: theme.colors.textSecondary }}
								>
									{t("prescriptions.attachedImages")} ({uploadedImages.length})
								</p>
								<div className="grid grid-cols-3 gap-2">
									{uploadedImages.map((image, index) => (
										<Image
											key={`attached-${
												// biome-ignore lint/suspicious/noArrayIndexKey: Image order matters
												index
											}`}
											src={image}
											alt={`添付画像 ${index + 1}`}
											className="w-full h-20 object-cover rounded-lg"
											width={100}
											height={80}
											unoptimized
											style={{
												border: `1px solid ${theme.colors.textSecondary}20`,
											}}
										/>
									))}
								</div>
							</div>
						)}
					</div>

					{/* Save Button */}
					<button
						type="button"
						onClick={handleSave}
						disabled={isSaving || isUpdating}
						className="w-full rounded-xl py-4 font-medium text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
						style={{
							backgroundImage: `linear-gradient(to top right, ${theme.colors.primary}, ${theme.colors.secondary})`,
						}}
					>
						{isSaving || isUpdating ? (
							<>
								<Loader2 className="inline mr-2 animate-spin" size={18} />
								{t("actions.saving")}
							</>
						) : (
							t("actions.save")
						)}
					</button>
				</>
			)}
		</div>
	);
}
