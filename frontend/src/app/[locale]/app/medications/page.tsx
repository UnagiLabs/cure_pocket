"use client";

import { Calendar, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useDecryptAndFetch } from "@/hooks/useDecryptAndFetch";
import { usePassport } from "@/hooks/usePassport";
import { useSessionKeyManager } from "@/hooks/useSessionKeyManager";
import {
	type DisplayMedication,
	medicationsDataToDisplayData,
} from "@/lib/prescriptionConverter";
import { getDataEntry } from "@/lib/suiClient";
import { getTheme } from "@/lib/themes";
import type { MedicationsData } from "@/types/healthData";

/**
 * 処方箋一覧ページ
 * Walrusから medications データ(JSON形式) を読み込んで表示
 * seal_id は useDecryptAndFetch フック内で自動生成される
 */
export default function MedicationsPage() {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const { settings } = useApp();
	const theme = getTheme(settings.theme);

	// Passport and session key
	const { passport, has_passport, loading: passportLoading } = usePassport();
	const {
		sessionKey,
		generateSessionKey,
		isValid: sessionKeyValid,
	} = useSessionKeyManager();

	// Unified decrypt hook (seal_id retrieved from SBT Dynamic Fields)
	const { decryptWithSealId, isDecrypting } = useDecryptAndFetch();

	// State
	const [medications, setMedications] = useState<DisplayMedication[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Walrusからデータを読み込む
	const loadMedicationsFromWalrus = useCallback(async () => {
		// パスポートがない場合はスキップ
		if (!has_passport || !passport) {
			console.log("[Medications] No passport found, skipping data load");
			return;
		}

		// SessionKeyがない場合は生成
		if (!sessionKey || !sessionKeyValid) {
			console.log("[Medications] Generating new SessionKey...");
			await generateSessionKey();
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			console.log("[Medications] Loading medications from Walrus...");

			// Step 1: パスポートからEntryData（seal_id + blob_ids）を取得
			const entryData = await getDataEntry(passport.id, "medications");

			if (!entryData || entryData.blobIds.length === 0) {
				console.log("[Medications] No medications data found");
				setMedications([]);
				setIsLoading(false);
				return;
			}

			const { sealId, blobIds } = entryData;
			console.log(
				`[Medications] Found ${blobIds.length} medications blob(s), seal_id: ${sealId.substring(0, 16)}...`,
			);

			// Step 2: 各Blobをダウンロード→復号化→JSON変換
			// seal_id はDFから取得した値を使用
			const allMedications: DisplayMedication[] = [];

			for (const blobId of blobIds) {
				console.log(`[Medications] Downloading and decrypting blob: ${blobId}`);

				try {
					// DFから取得したseal_idを使用して復号化
					const decryptedData = await decryptWithSealId({
						blobId,
						sealId,
						dataType: "medications",
						sessionKey,
						passportId: passport.id,
					});

					// 復号化結果の詳細をコンソールに表示
					console.log(
						"[Medications] ========== Decrypted Data Details ==========",
					);
					console.log("[Medications] Type:", typeof decryptedData);
					console.log("[Medications] Is Array:", Array.isArray(decryptedData));
					console.log("[Medications] Raw decryptedData:", decryptedData);
					console.log(
						"[Medications] JSON stringified:",
						JSON.stringify(decryptedData, null, 2),
					);
					console.log("[Medications] Keys:", Object.keys(decryptedData || {}));
					console.log(
						"[Medications] ==========================================",
					);

					// MedicationsDataとして型アサーション
					const medicationsData = decryptedData as unknown as MedicationsData;

					// データの存在確認とバリデーション
					if (!medicationsData || typeof medicationsData !== "object") {
						console.error("[Medications] Decrypted data is not an object");
						continue;
					}

					if (
						!medicationsData.medications ||
						!Array.isArray(medicationsData.medications)
					) {
						console.error(
							"[Medications] Invalid data format - missing medications array:",
							medicationsData,
						);
						continue; // スキップして次のBlobへ
					}

					console.log(
						`[Medications] MedicationsData loaded:`,
						medicationsData.medications.length,
						"medications",
					);

					// MedicationsData → 表示用データ
					const displayData = medicationsDataToDisplayData(medicationsData);

					allMedications.push(...displayData);
				} catch (blobError) {
					console.error(
						`[Medications] Failed to process blob ${blobId}:`,
						blobError,
					);
				}
			}

			// 調剤日順にソート（新しい順）
			const sortedMedications = allMedications.sort((a, b) => {
				const dateA = new Date(a.dispensed_on).getTime();
				const dateB = new Date(b.dispensed_on).getTime();
				return dateB - dateA;
			});

			setMedications(sortedMedications);
			console.log(
				`[Medications] Loaded ${sortedMedications.length} medication(s)`,
			);
		} catch (err) {
			console.error("[Medications] Failed to load data:", err);
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
		decryptWithSealId,
	]);

	// パスポート・SessionKey準備完了後にデータ読み込み
	useEffect(() => {
		if (passportLoading) {
			return;
		}

		if (!has_passport || !passport) {
			setMedications([]);
			return;
		}

		if (!sessionKey || !sessionKeyValid) {
			return;
		}

		loadMedicationsFromWalrus();
	}, [
		passport,
		has_passport,
		passportLoading,
		sessionKey,
		sessionKeyValid,
		loadMedicationsFromWalrus,
	]);

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString(locale, {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const showLoading = isLoading || isDecrypting;

	return (
		<div className="px-4 md:px-8 lg:px-12 py-4 lg:py-8 pb-24 lg:pb-8 space-y-6">
			{/* Header - Mobile only, desktop shows in top bar */}
			<div className="lg:hidden mb-4">
				<h1 className="text-xl font-bold" style={{ color: theme.colors.text }}>
					{t("medications.title")}
				</h1>
				<p
					className="mt-1 text-sm"
					style={{ color: theme.colors.textSecondary }}
				>
					{t("medications.description")}
				</p>
			</div>

			{/* Loading State */}
			{showLoading && (
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
			{error && !showLoading && (
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
						onClick={loadMedicationsFromWalrus}
						className="mt-3 px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
					>
						再試行
					</button>
				</div>
			)}

			{/* No Passport State */}
			{!has_passport && !passportLoading && !showLoading && (
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

			{/* Empty State */}
			{!showLoading &&
				!error &&
				has_passport &&
				medications.length === 0 &&
				!passportLoading && (
					<div
						className="flex flex-col h-64 items-center justify-center rounded-lg"
						style={{ backgroundColor: theme.colors.surface }}
					>
						<p
							className="mb-4 text-center"
							style={{ color: theme.colors.textSecondary }}
						>
							{t("medications.noPrescriptions")}
						</p>
						<button
							type="button"
							onClick={() => router.push(`/${locale}/app/add/medication`)}
							className="flex items-center gap-2 rounded-lg px-6 py-3 font-medium text-white transition-all hover:scale-[1.02]"
							style={{
								backgroundImage: `linear-gradient(to top right, ${theme.colors.primary}, ${theme.colors.secondary})`,
							}}
						>
							<Plus className="h-5 w-5" />
							{t("medications.addFirstPrescription")}
						</button>
					</div>
				)}

			{/* Medications List */}
			{!showLoading && !error && medications.length > 0 && (
				<div className="space-y-4">
					{medications.map((medication, index) => (
						<div
							key={`med-${medication.dispensed_on}-${medication.atc_code}-${index}`}
							className="rounded-xl border-2 p-4"
							style={{
								backgroundColor: theme.colors.surface,
								borderColor: `${theme.colors.textSecondary}20`,
							}}
						>
							{/* Date */}
							<div className="flex items-center gap-2 mb-3">
								<Calendar size={16} style={{ color: theme.colors.primary }} />
								<span
									className="font-bold text-sm"
									style={{ color: theme.colors.text }}
								>
									{formatDate(medication.dispensed_on)}
								</span>
							</div>

							{/* Drug Name (from mock conversion) */}
							<div
								className="font-semibold mb-2"
								style={{ color: theme.colors.text }}
							>
								{medication.drugName}
							</div>

							{/* Codes */}
							<div className="grid grid-cols-2 gap-2 text-xs">
								<div>
									<span style={{ color: theme.colors.textSecondary }}>
										ATC Code:{" "}
									</span>
									<span
										className="font-mono"
										style={{ color: theme.colors.text }}
									>
										{medication.atc_code}
									</span>
								</div>
								<div>
									<span style={{ color: theme.colors.textSecondary }}>
										RxNorm Code:{" "}
									</span>
									<span
										className="font-mono"
										style={{ color: theme.colors.text }}
									>
										{medication.rxnorm_code}
									</span>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Add Button */}
			{has_passport && !passportLoading && (
				<button
					type="button"
					onClick={() => router.push(`/${locale}/app/add/medication`)}
					className="w-full rounded-xl py-4 font-medium text-white transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
					style={{
						backgroundImage: `linear-gradient(to top right, ${theme.colors.primary}, ${theme.colors.secondary})`,
					}}
				>
					<Plus className="h-5 w-5" />
					{t("medications.addNewPrescription")}
				</button>
			)}
		</div>
	);
}
