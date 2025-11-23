"use client";

import { useSuiClient } from "@mysten/dapp-kit";
import { Calendar, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { usePassport } from "@/hooks/usePassport";
import { useSessionKeyManager } from "@/hooks/useSessionKeyManager";
import {
	type DisplayMedication,
	medicationsCsvToDisplayData,
	uint8ArrayToCsv,
} from "@/lib/prescriptionConverter";
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

/**
 * 処方箋一覧ページ
 * Walrusから medications CSV データを読み込んで表示
 */
export default function MedicationsPage() {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const { settings } = useApp();
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

			// Step 1: パスポートからmedications Blob IDsを取得
			const medicationsBlobIds = await getDataEntryBlobIds(
				passport.id,
				"medications",
			);

			if (medicationsBlobIds.length === 0) {
				console.log("[Medications] No medications data found");
				setMedications([]);
				setIsLoading(false);
				return;
			}

			console.log(
				`[Medications] Found ${medicationsBlobIds.length} medications blob(s)`,
			);

			// Step 2: Seal clientとPTBを準備
			const sealClient = createSealClient(getSuiClient());
			const txBytes = await buildPatientAccessPTB({
				passportObjectId: passport.id,
				registryObjectId: PASSPORT_REGISTRY_ID,
				suiClient,
				sealId: passport.sealId,
			});

			// Step 3: 各Blobをダウンロード→復号化→CSVパース
			const allMedications: DisplayMedication[] = [];

			for (const blobId of medicationsBlobIds) {
				console.log(`[Medications] Downloading blob: ${blobId}`);

				// Walrusからダウンロード
				const encryptedData = await downloadFromWalrusByBlobId(blobId);

				// Seal復号化
				const decryptedData = await decryptHealthData({
					encryptedData,
					sealClient,
					sessionKey,
					txBytes,
					sealId: passport.sealId,
				});

				// Uint8Array → CSV文字列
				const csvString = uint8ArrayToCsv(
					decryptedData as unknown as Uint8Array,
				);

				console.log(
					`[Medications] CSV data: ${csvString.substring(0, 100)}...`,
				);

				// CSV → 表示用データ
				const displayData = medicationsCsvToDisplayData(csvString);

				allMedications.push(...displayData);
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
		suiClient,
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
						onClick={loadMedicationsFromWalrus}
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

			{/* Empty State */}
			{!isLoading &&
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
			{!isLoading && !error && medications.length > 0 && (
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
