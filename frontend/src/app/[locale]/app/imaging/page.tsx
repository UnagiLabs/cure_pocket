"use client";

import { useSuiClient } from "@mysten/dapp-kit";
import { Loader2, Plus, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ImagingForm } from "@/components/forms/ImagingForm";
import { ImagingImageViewer } from "@/components/ImagingImageViewer";
import { useApp } from "@/contexts/AppContext";
import { usePassport } from "@/hooks/usePassport";
import { useSessionKeyManager } from "@/hooks/useSessionKeyManager";
import { decryptAndDisplayImage } from "@/lib/imagingDisplay";
import {
	buildPatientAccessPTB,
	createSealClient,
	decryptHealthData,
} from "@/lib/seal";
import {
	getDataEntryBlobIds,
	getSuiClient,
	PASSPORT_REGISTRY_ID,
} from "@/lib/suiClient";
import { getTheme } from "@/lib/themes";
import { downloadFromWalrusByBlobId } from "@/lib/walrus";
import type { ImagingReport } from "@/types";
import type { ImagingMetaData } from "@/types/healthData";

/**
 * DICOM Modalityを ImagingReport type にマッピング
 */
function mapModalityToType(
	modality: string,
): "xray" | "ct" | "mri" | "ultrasound" | "other" {
	const normalizedModality = modality.toUpperCase();
	switch (normalizedModality) {
		case "CR": // Computed Radiography
		case "DX": // Digital Radiography
		case "XR": // X-Ray
			return "xray";
		case "CT":
			return "ct";
		case "MR":
		case "MRI":
			return "mri";
		case "US":
			return "ultrasound";
		default:
			return "other";
	}
}

/**
 * 画像レポート一覧ページ
 * 登録された画像レポートを一覧表示し、同一画面で追加も行う
 */
export default function ImagingPage() {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const searchParams = useSearchParams();
	const { imagingReports, settings } = useApp();
	const theme = getTheme(settings.theme);
	const suiClient = useSuiClient();

	// Passport and session key
	const { passport, has_passport, loading: passportLoading } = usePassport();
	const {
		sessionKey,
		generateSessionKey,
		isValid: sessionKeyValid,
	} = useSessionKeyManager();

	// State
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [walrusReports, setWalrusReports] = useState<ImagingReport[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setIsAddOpen(searchParams.get("mode") === "add");
	}, [searchParams]);

	// Walrusからデータを読み込む
	const loadImagingFromWalrus = useCallback(async () => {
		// パスポートがない場合はスキップ
		if (!has_passport || !passport) {
			console.log("[Imaging] No passport found, skipping data load");
			return;
		}

		// SessionKeyがない場合は生成
		if (!sessionKey || !sessionKeyValid) {
			console.log("[Imaging] Generating new SessionKey...");
			await generateSessionKey();
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			console.log("[Imaging] Loading imaging data from Walrus...");

			// Step 1: パスポートからimaging_meta Blob IDsを取得
			const metaBlobIds = await getDataEntryBlobIds(
				passport.id,
				"imaging_meta",
			);

			if (metaBlobIds.length === 0) {
				console.log("[Imaging] No imaging data found");
				setWalrusReports([]);
				setIsLoading(false);
				return;
			}

			console.log(`[Imaging] Found ${metaBlobIds.length} imaging_meta blob(s)`);

			// Step 2: Seal clientとPTBを準備
			const sealClient = createSealClient(getSuiClient());
			const txBytes = await buildPatientAccessPTB({
				passportObjectId: passport.id,
				registryObjectId: PASSPORT_REGISTRY_ID,
				suiClient,
				sealId: passport.sealId,
			});

			// Step 3: 各Blobをダウンロード→復号化→ObjectURL生成
			const allReports: ImagingReport[] = [];

			for (const metaBlobId of metaBlobIds) {
				console.log(`[Imaging] Downloading meta blob: ${metaBlobId}`);

				try {
					// Walrusからメタデータをダウンロード
					const encryptedMeta = await downloadFromWalrusByBlobId(metaBlobId);
					console.log(
						`[Imaging] Downloaded encrypted meta size: ${encryptedMeta.byteLength} bytes`,
					);

					// Seal復号化（JSON形式）
					const decryptedMeta = await decryptHealthData({
						encryptedData: encryptedMeta,
						sealClient,
						sessionKey,
						txBytes,
						sealId: passport.sealId,
					});

					console.log("[Imaging] Decrypted meta data:", decryptedMeta);

					// ImagingMetaDataとして型アサーション
					const imagingMetaData = decryptedMeta as unknown as ImagingMetaData;

					// データの存在確認とバリデーション
					if (!imagingMetaData || typeof imagingMetaData !== "object") {
						console.error("[Imaging] Decrypted meta is not an object");
						continue;
					}

					if (
						!imagingMetaData.imaging_meta ||
						!Array.isArray(imagingMetaData.imaging_meta)
					) {
						console.error(
							"[Imaging] Invalid meta format - missing imaging_meta array:",
							imagingMetaData,
						);
						continue;
					}

					console.log(
						`[Imaging] ImagingMetaData loaded:`,
						imagingMetaData.imaging_meta.length,
						"studies",
					);

					// 各スタディを処理
					for (const study of imagingMetaData.imaging_meta) {
						// 画像バイナリのBlob IDを取得（最初のシリーズの最初のインスタンス）
						const firstSeries = study.series[0];
						const firstInstance = firstSeries?.instance_blobs[0];
						const binaryBlobId = firstInstance?.dicom_blob_id;

						if (!binaryBlobId) {
							console.warn("[Imaging] No binary blob ID found for study");
							continue;
						}

						// 画像のObjectURLを生成
						let imageObjectUrl: string | undefined;
						try {
							imageObjectUrl = await decryptAndDisplayImage({
								blobId: binaryBlobId,
								sealId: passport.sealId,
								sessionKey,
								passportId: passport.id,
								suiClient,
							});
							console.log(`[Imaging] Generated ObjectURL for ${binaryBlobId}`);
						} catch (imgError) {
							console.error(
								`[Imaging] Failed to decrypt image ${binaryBlobId}:`,
								imgError,
							);
						}

						// ImagingReport形式に変換
						const report: ImagingReport = {
							id: study.study_uid,
							type: mapModalityToType(study.modality),
							bodyPart: study.body_site,
							examDate: study.performed_at
								? new Date(study.performed_at).toISOString().split("T")[0]
								: new Date().toISOString().split("T")[0],
							performedBy: study.facility,
							summary: study.report?.summary || "No summary",
							findings: study.report?.findings,
							impression: study.report?.impression,
							imageObjectUrl,
							walrusBlobId: binaryBlobId,
							suiObjectId: metaBlobId,
						};

						allReports.push(report);
					}
				} catch (blobError) {
					console.error(
						`[Imaging] Failed to process meta blob ${metaBlobId}:`,
						blobError,
					);
				}
			}

			// 検査日順にソート（新しい順）
			const sortedReports = allReports.sort((a, b) => {
				const dateA = new Date(a.examDate).getTime();
				const dateB = new Date(b.examDate).getTime();
				return dateB - dateA;
			});

			setWalrusReports(sortedReports);
			console.log(`[Imaging] Loaded ${sortedReports.length} imaging report(s)`);
		} catch (err) {
			console.error("[Imaging] Failed to load data:", err);
			setError(
				err instanceof Error ? err.message : "データの読み込みに失敗しました",
			);
		} finally {
			setIsLoading(false);
		}
	}, [
		passport,
		has_passport,
		sessionKey,
		sessionKeyValid,
		generateSessionKey,
		suiClient,
	]);

	// パスポート・SessionKey準備完了後にデータ読み込み
	useEffect(() => {
		if (passportLoading) {
			return;
		}

		if (!has_passport || !passport) {
			setWalrusReports([]);
			return;
		}

		if (!sessionKey || !sessionKeyValid) {
			return;
		}

		loadImagingFromWalrus();
	}, [
		passport,
		has_passport,
		passportLoading,
		sessionKey,
		sessionKeyValid,
		loadImagingFromWalrus,
	]);

	// Walrusデータとローカルデータを統合してソート
	const sortedReports = useMemo(() => {
		const combined = [...imagingReports, ...walrusReports];
		return combined.sort((a, b) => {
			const dateA = new Date(a.examDate).getTime();
			const dateB = new Date(b.examDate).getTime();
			return dateB - dateA;
		});
	}, [imagingReports, walrusReports]);

	const openAdd = () => {
		setIsAddOpen(true);
		const params = new URLSearchParams(searchParams.toString());
		params.set("mode", "add");
		router.replace(`/${locale}/app/imaging?${params.toString()}`);
	};

	const closeAdd = () => {
		setIsAddOpen(false);
		const params = new URLSearchParams(searchParams.toString());
		params.delete("mode");
		const query = params.toString();
		router.replace(`/${locale}/app/imaging${query ? `?${query}` : ""}`);
	};

	return (
		<div className="p-4 md:p-6 space-y-6">
			{/* Header */}
			<div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<h1
						className="text-xl font-bold md:text-2xl"
						style={{ color: theme.colors.text }}
					>
						{t("imaging.title")}
					</h1>
					<p
						className="mt-1 text-sm"
						style={{ color: theme.colors.textSecondary }}
					>
						{t("imaging.description")}
					</p>
				</div>
				<button
					type="button"
					onClick={openAdd}
					className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
					style={{ backgroundColor: theme.colors.primary }}
				>
					<Plus className="h-4 w-4" />
					{t("imaging.add")}
				</button>
			</div>

			{/* Loading State */}
			{isLoading && (
				<div
					className="flex flex-col h-64 items-center justify-center rounded-lg"
					style={{ backgroundColor: theme.colors.surface }}
				>
					<Loader2
						className="animate-spin mb-4"
						size={48}
						style={{ color: theme.colors.primary }}
					/>
					<p style={{ color: theme.colors.textSecondary }}>
						データを読み込んでいます...
					</p>
				</div>
			)}

			{/* Error State */}
			{error && !isLoading && (
				<div
					className="rounded-lg p-4 border-2"
					style={{
						backgroundColor: `${theme.colors.surface}`,
						borderColor: "#ef4444",
					}}
				>
					<p className="text-red-600 font-medium mb-2">エラーが発生しました</p>
					<p className="text-sm" style={{ color: theme.colors.textSecondary }}>
						{error}
					</p>
					<button
						type="button"
						onClick={loadImagingFromWalrus}
						className="mt-3 px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
					>
						再試行
					</button>
				</div>
			)}

			{/* No Passport State */}
			{!has_passport && !passportLoading && !isLoading && (
				<div
					className="flex flex-col h-64 items-center justify-center rounded-lg"
					style={{ backgroundColor: theme.colors.surface }}
				>
					<p
						className="mb-4 text-center"
						style={{ color: theme.colors.textSecondary }}
					>
						パスポートが見つかりません。プロフィールを作成してください。
					</p>
				</div>
			)}

			{/* Reports List */}
			{!isLoading && !error && sortedReports.length === 0 && (
				<div
					className="flex h-64 items-center justify-center rounded-lg"
					style={{ backgroundColor: theme.colors.surface }}
				>
					<p style={{ color: theme.colors.textSecondary }}>
						{t("imaging.noReports")}
					</p>
				</div>
			)}

			{/* Reports List */}
			{!isLoading && !error && sortedReports.length > 0 && (
				<div className="space-y-3">
					{sortedReports.map((report) => {
						const examDate = new Date(report.examDate).toLocaleDateString(
							"ja-JP",
							{
								year: "numeric",
								month: "short",
								day: "numeric",
							},
						);

						return (
							<div
								key={report.id}
								className="rounded-lg border-2 p-4"
								style={{
									backgroundColor: theme.colors.surface,
									borderColor: `${theme.colors.textSecondary}40`,
								}}
							>
								<div className="flex items-start gap-4">
									{/* Image Thumbnail */}
									{report.imageObjectUrl && (
										<div className="flex-shrink-0">
											<ImagingImageViewer
												objectUrl={report.imageObjectUrl}
												alt={`${t(`imaging.types.${report.type}`)} - ${report.bodyPart || ""}`}
												mode="thumbnail"
												className="w-32 h-32"
											/>
										</div>
									)}

									{/* Report Details */}
									<div className="flex-1">
										<div className="mb-2 flex items-center gap-2">
											<div
												className="font-semibold text-lg"
												style={{ color: theme.colors.text }}
											>
												{t(`imaging.types.${report.type}`)}
											</div>
											{report.bodyPart && (
												<span
													className="rounded px-2 py-0.5 text-xs"
													style={{
														backgroundColor: `${theme.colors.primary}20`,
														color: theme.colors.primary,
													}}
												>
													{report.bodyPart}
												</span>
											)}
										</div>
										<div
											className="mb-2 text-xs"
											style={{ color: theme.colors.textSecondary }}
										>
											{t("imaging.examDate")}: {examDate}
										</div>
										{report.performedBy && (
											<div
												className="mb-2 text-xs"
												style={{ color: theme.colors.textSecondary }}
											>
												{t("imaging.performedBy")}: {report.performedBy}
											</div>
										)}
										<div
											className="mb-2 text-sm font-medium"
											style={{ color: theme.colors.text }}
										>
											{t("imaging.summary")}: {report.summary}
										</div>
										{report.findings && (
											<div
												className="mb-2 text-sm"
												style={{ color: theme.colors.textSecondary }}
											>
												{t("imaging.findings")}: {report.findings}
											</div>
										)}
										{report.impression && (
											<div
												className="mt-2 text-sm"
												style={{ color: theme.colors.textSecondary }}
											>
												{t("imaging.impression")}: {report.impression}
											</div>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Add Imaging Form (inline panel) */}
			{isAddOpen && (
				<div
					className="fixed inset-x-0 bottom-0 z-20 rounded-t-2xl border-t bg-white p-4 shadow-lg md:static md:rounded-xl md:border md:p-6"
					style={{
						backgroundColor: theme.colors.background,
						borderColor: `${theme.colors.textSecondary}20`,
					}}
				>
					<div className="mb-4 flex items-center justify-between">
						<h2
							className="text-lg font-bold md:text-xl"
							style={{ color: theme.colors.text }}
						>
							{t("imaging.add")}
						</h2>
						<button
							type="button"
							onClick={closeAdd}
							className="rounded-full p-2"
							style={{ color: theme.colors.textSecondary }}
						>
							<X className="h-5 w-5" />
						</button>
					</div>
					<ImagingForm
						onSaved={() => {
							closeAdd();
						}}
						onCancel={closeAdd}
					/>
				</div>
			)}
		</div>
	);
}
