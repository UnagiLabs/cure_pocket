"use client";

import {
	useCurrentAccount,
	useSignAndExecuteTransaction,
	useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { sha3_256 } from "@noble/hashes/sha3";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	Clock,
	Download,
	FileText,
	FlaskConical,
	Package,
	Printer,
	QrCode,
	Scan,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { QRCodeCanvas } from "qrcode.react";
import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { usePassport } from "@/hooks/usePassport";
import { PACKAGE_ID, PASSPORT_REGISTRY_ID } from "@/lib/suiClient";
import { getTheme } from "@/lib/themes";

/**
 * 緊急ヘルスカードページ
 * 全データタイプを表示し、カテゴリー選択機能を提供
 */
export default function EmergencyCardPage() {
	const t = useTranslations();
	const {
		medications,
		allergies,
		medicalHistories,
		labResults,
		imagingReports,
		vitalSigns,
		settings,
		walletAddress,
	} = useApp();
	const { passport } = usePassport();
	const suiClient = useSuiClient();
	const currentAccount = useCurrentAccount();
	const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
	const theme = getTheme(settings.theme);
	const [consentUrl, setConsentUrl] = useState("");
	const [expiresAt, setExpiresAt] = useState("");
	const [durationLabel, setDurationLabel] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);
	const [selectedCategories, setSelectedCategories] = useState<
		(
			| "medications"
			| "allergies"
			| "histories"
			| "labs"
			| "imaging"
			| "vitals"
		)[]
	>(["medications", "allergies"]);

	const activeMedications = medications.filter((m) => m.status === "active");
	const importantHistories = medicalHistories.filter(
		(h) => h.status === "active" || h.type === "surgery",
	);
	const recentLabResults = labResults.slice(0, 3);
	const latestImaging = imagingReports[0];
	const recentVitals = vitalSigns.slice(0, 3);

	const handleCategoryToggle = (
		category:
			| "medications"
			| "allergies"
			| "histories"
			| "labs"
			| "imaging"
			| "vitals",
	) => {
		setSelectedCategories((prev) =>
			prev.includes(category)
				? prev.filter((c) => c !== category)
				: [...prev, category],
		);
	};

	const handleGenerateQR = async () => {
		if (!walletAddress) return;
		if (!passport) {
			console.error("No passport found");
			return;
		}
		if (!currentAccount) {
			console.error("Wallet not connected");
			return;
		}
		if (!PACKAGE_ID || !PASSPORT_REGISTRY_ID) {
			console.error("Package ID or registry ID is not configured");
			return;
		}

		setIsGenerating(true);
		try {
			const newSecret = generateSecret();

			// 1) secret_hash
			const secretBytes = new TextEncoder().encode(newSecret);
			const secretHash = sha3_256(secretBytes);

			// 2) duration (ms) - 24h default
			const durationMs = 24 * 60 * 60 * 1000;
			const expiresAtIso = new Date(Date.now() + durationMs).toISOString();

			// 3) Build PTB for create_consent_token
			const tx = new Transaction();
			tx.moveCall({
				target: `${PACKAGE_ID}::accessor::create_consent_token`,
				arguments: [
					tx.object(passport.id),
					tx.object(PASSPORT_REGISTRY_ID),
					tx.pure.vector("u8", Array.from(secretHash)),
					tx.pure.vector("string", selectedCategories),
					tx.pure.u64(durationMs),
					tx.object("0x6"), // Clock
				],
			});

			const execResult = await signAndExecute({
				transaction: tx,
			});

			const txResult = await suiClient.waitForTransaction({
				digest: execResult.digest,
				options: {
					showEffects: true,
					showObjectChanges: true,
				},
			});

			const tokenId = extractConsentTokenId(txResult) || "";
			if (!tokenId) {
				console.warn("ConsentToken ID not found in effects");
			}

			const payload = buildQrPayload({
				tokenId,
				passportId: passport.id,
				secret: newSecret,
				scopes: selectedCategories,
				expiresAt: expiresAtIso,
			});

			setConsentUrl(payload);
			setExpiresAt(expiresAtIso);
			setDurationLabel(formatDuration(expiresAtIso));
		} catch (error) {
			console.error("Failed to generate consent token:", error);
			// Fallback to mock for now
			const mockUrl = `https://curepocket.app/view/${walletAddress?.slice(0, 8)}`;
			const mockExpires = new Date(
				Date.now() + 24 * 60 * 60 * 1000,
			).toISOString();
			setConsentUrl(mockUrl);
			setExpiresAt(mockExpires);
			setDurationLabel("24時間");
		} finally {
			setIsGenerating(false);
		}
	};

	const categoryOptions = [
		{
			id: "medications" as const,
			label: t("dataTypes.medication"),
			icon: Package,
		},
		{
			id: "allergies" as const,
			label: t("dataTypes.allergy"),
			icon: AlertTriangle,
		},
		{ id: "histories" as const, label: t("dataTypes.history"), icon: FileText },
		{ id: "labs" as const, label: t("dataTypes.lab"), icon: FlaskConical },
		{ id: "imaging" as const, label: t("dataTypes.imaging"), icon: Scan },
		{ id: "vitals" as const, label: t("dataTypes.vitals"), icon: Activity },
	];

	return (
		<div className="px-4 md:px-8 lg:px-12 py-4 lg:py-8 pb-24 lg:pb-8">
			{/* Header - Hide on desktop as it's shown in top bar */}
			<div className="lg:hidden mb-6 flex items-center">
				<AlertCircle className="mr-2 h-5 w-5 text-red-500" />
				<h1 className="text-lg font-bold" style={{ color: theme.colors.text }}>
					{t("card.title")}
				</h1>
			</div>

			<p
				className="mb-6 text-sm md:text-base"
				style={{ color: theme.colors.textSecondary }}
			>
				{t("card.description")}
			</p>

			{/* Category Selection */}
			<div
				className="mb-4 rounded-xl p-4 shadow-sm md:p-6"
				style={{ backgroundColor: theme.colors.surface }}
			>
				<h3
					className="mb-3 font-bold md:text-lg"
					style={{ color: theme.colors.text }}
				>
					{t("card.selectCategories")}
				</h3>
				<div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 md:gap-3">
					{categoryOptions.map((option) => {
						const Icon = option.icon;
						const isSelected = selectedCategories.includes(option.id);
						return (
							<button
								type="button"
								key={option.id}
								onClick={() => handleCategoryToggle(option.id)}
								className="flex w-full items-center rounded-lg border-2 p-3 transition-colors md:p-4 hover:shadow-sm"
								style={{
									borderColor: isSelected
										? theme.colors.primary
										: `${theme.colors.textSecondary}40`,
									backgroundColor: isSelected
										? `${theme.colors.primary}10`
										: "transparent",
								}}
							>
								<Icon
									className="mr-3 h-5 w-5 md:h-6 md:w-6"
									style={{
										color: isSelected
											? theme.colors.primary
											: theme.colors.textSecondary,
									}}
								/>
								<span
									className="flex-1 text-left font-medium md:text-base"
									style={{
										color: isSelected
											? theme.colors.primary
											: theme.colors.text,
									}}
								>
									{option.label}
								</span>
								{isSelected && (
									<span
										className="text-sm md:text-base"
										style={{ color: theme.colors.primary }}
									>
										✓
									</span>
								)}
							</button>
						);
					})}
				</div>
			</div>

			{/* QR Code Display */}
			<div
				className="mb-4 rounded-xl p-6 shadow-sm md:p-8"
				style={{ backgroundColor: theme.colors.surface }}
			>
				<div
					className="mb-4 flex items-center justify-center rounded-xl p-8 md:p-12"
					style={{ backgroundColor: theme.colors.background }}
				>
					<div className="text-center">
						{consentUrl ? (
							<>
								<div className="mb-2 flex h-32 w-32 items-center justify-center rounded-lg border-4 border-gray-300 bg-white p-2 md:h-48 md:w-48">
									<QRCodeCanvas
										value={consentUrl}
										size={176}
										level="M"
										includeMargin
									/>
								</div>
								<p
									className="text-sm"
									style={{ color: theme.colors.textSecondary }}
								>
									{t("card.scanToView")}
								</p>
								<p
									className="text-sm"
									style={{ color: theme.colors.textSecondary }}
								>
									{t("card.englishVersion")}
								</p>
							</>
						) : (
							<>
								<QrCode className="mx-auto mb-2 h-32 w-32 text-gray-400" />
								<p className="text-sm text-gray-600">{t("card.scanToView")}</p>
								<p className="text-sm text-gray-600">
									{t("card.englishVersion")}
								</p>
							</>
						)}
					</div>
				</div>

				{expiresAt && (
					<div
						className="mb-4 flex items-center justify-center text-sm"
						style={{ color: theme.colors.textSecondary }}
					>
						<Clock className="mr-1 h-4 w-4" />
						{t("card.validFor", { duration: durationLabel || "24h" })}
					</div>
				)}

				<button
					type="button"
					onClick={handleGenerateQR}
					disabled={isGenerating || selectedCategories.length === 0}
					className="w-full rounded-lg p-3 font-medium text-white transition-transform active:scale-95 disabled:opacity-50"
					style={{ backgroundColor: theme.colors.primary }}
				>
					{isGenerating ? t("card.generating") : t("card.generateQR")}
				</button>
			</div>

			{/* Data Preview */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{/* Allergies (Most Important) */}
				{selectedCategories.includes("allergies") && allergies.length > 0 && (
					<div
						className="rounded-xl p-4 shadow-sm md:p-6"
						style={{ backgroundColor: theme.colors.surface }}
					>
						<h3
							className="mb-3 flex items-center font-bold md:text-lg"
							style={{ color: theme.colors.text }}
						>
							<AlertTriangle className="mr-2 h-5 w-5 text-red-500 md:h-6 md:w-6" />
							{t("allergies.title")}
						</h3>
						<ul className="space-y-2">
							{allergies.map((allergy) => (
								<li key={allergy.id} style={{ color: theme.colors.text }}>
									<span className="font-medium">{allergy.substance}</span>
									{allergy.severity && (
										<span
											className="ml-2 text-sm"
											style={{ color: theme.colors.textSecondary }}
										>
											({t(`allergies.severities.${allergy.severity}`)})
										</span>
									)}
								</li>
							))}
						</ul>
					</div>
				)}

				{/* Medications */}
				{selectedCategories.includes("medications") &&
					activeMedications.length > 0 && (
						<div
							className="rounded-xl p-4 shadow-sm md:p-6"
							style={{ backgroundColor: theme.colors.surface }}
						>
							<h3
								className="mb-3 font-bold md:text-lg"
								style={{ color: theme.colors.text }}
							>
								{t("card.currentMedications")}
							</h3>
							<ul className="space-y-2">
								{activeMedications.map((med) => (
									<li key={med.id} style={{ color: theme.colors.text }}>
										<span className="mr-2">•</span>
										{med.name} {med.dose && `${med.dose}`}
									</li>
								))}
							</ul>
						</div>
					)}

				{/* Medical Histories */}
				{selectedCategories.includes("histories") &&
					importantHistories.length > 0 && (
						<div
							className="rounded-xl p-4 shadow-sm"
							style={{ backgroundColor: theme.colors.surface }}
						>
							<h3
								className="mb-3 font-bold"
								style={{ color: theme.colors.text }}
							>
								{t("histories.title")}
							</h3>
							<ul className="space-y-2">
								{importantHistories.map((history) => (
									<li key={history.id} style={{ color: theme.colors.text }}>
										<span className="mr-2">•</span>
										{history.diagnosis}
									</li>
								))}
							</ul>
						</div>
					)}

				{/* Lab Results */}
				{selectedCategories.includes("labs") && recentLabResults.length > 0 && (
					<div
						className="rounded-xl p-4 shadow-sm"
						style={{ backgroundColor: theme.colors.surface }}
					>
						<h3 className="mb-3 font-bold" style={{ color: theme.colors.text }}>
							{t("labs.title")}
						</h3>
						<ul className="space-y-2">
							{recentLabResults.map((lab) => (
								<li key={lab.id} style={{ color: theme.colors.text }}>
									<span className="mr-2">•</span>
									{lab.testName}: {lab.value} {lab.unit || ""}
								</li>
							))}
						</ul>
					</div>
				)}

				{/* Imaging Reports */}
				{selectedCategories.includes("imaging") && latestImaging && (
					<div
						className="rounded-xl p-4 shadow-sm"
						style={{ backgroundColor: theme.colors.surface }}
					>
						<h3 className="mb-3 font-bold" style={{ color: theme.colors.text }}>
							{t("imaging.title")}
						</h3>
						<div style={{ color: theme.colors.text }}>
							<p className="font-medium">{latestImaging.summary}</p>
							{latestImaging.examDate && (
								<p
									className="mt-1 text-sm"
									style={{ color: theme.colors.textSecondary }}
								>
									{new Date(latestImaging.examDate).toLocaleDateString("ja-JP")}
								</p>
							)}
						</div>
					</div>
				)}

				{/* Vital Signs */}
				{selectedCategories.includes("vitals") && recentVitals.length > 0 && (
					<div
						className="rounded-xl p-4 shadow-sm md:p-6"
						style={{ backgroundColor: theme.colors.surface }}
					>
						<h3
							className="mb-3 font-bold md:text-lg"
							style={{ color: theme.colors.text }}
						>
							{t("vitals.title")}
						</h3>
						<ul className="space-y-2">
							{recentVitals.map((vital) => (
								<li key={vital.id} style={{ color: theme.colors.text }}>
									<span className="mr-2">•</span>
									{t(`vitals.${vital.type}`)}:{" "}
									{vital.systolic && vital.diastolic
										? `${vital.systolic}/${vital.diastolic}`
										: vital.value}{" "}
									{vital.unit || ""}
								</li>
							))}
						</ul>
					</div>
				)}
			</div>

			{/* Action Buttons */}
			<div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
				<button
					type="button"
					className="flex w-full items-center justify-center rounded-xl p-4 font-medium text-white shadow-md transition-transform active:scale-95 md:p-5 md:text-lg hover:shadow-lg"
					style={{ backgroundColor: theme.colors.primary }}
				>
					<Download className="mr-2 h-5 w-5" />
					<span>{t("card.downloadPDF")}</span>
				</button>
				<button
					type="button"
					className="flex w-full items-center justify-center rounded-xl p-4 font-medium text-white shadow-md transition-transform active:scale-95 md:p-5 md:text-lg hover:shadow-lg"
					style={{ backgroundColor: "#374151" }}
				>
					<Printer className="mr-2 h-5 w-5" />
					<span>{t("card.printCard")}</span>
				</button>
			</div>

			{/* Info Section */}
			<div
				className="mt-6 rounded-xl p-4"
				style={{ backgroundColor: `${theme.colors.primary}10` }}
			>
				<div className="flex items-start">
					<span className="mr-3 text-2xl">ℹ️</span>
					<div className="text-sm" style={{ color: theme.colors.text }}>
						<p className="mb-1 font-medium">{t("card.emergencyInfo.title")}</p>
						<p style={{ color: theme.colors.textSecondary }}>
							{t("card.emergencyInfo.description")}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

function formatDuration(expiresAtIso: string): string {
	const expires = new Date(expiresAtIso).getTime();
	if (Number.isNaN(expires)) return "";
	const diffMs = expires - Date.now();
	if (diffMs <= 0) return "";
	const hours = Math.round(diffMs / (1000 * 60 * 60));
	if (hours >= 24) {
		const days = Math.round(hours / 24);
		return `${days}日`;
	}
	return `${hours}時間`;
}

function generateSecret(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	const base64 = btoa(String.fromCharCode(...bytes));
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildQrPayload(params: {
	tokenId: string;
	passportId: string;
	secret: string;
	scopes: string[];
	expiresAt: string;
}): string {
	const payload = {
		v: 1,
		token: params.tokenId,
		passport: params.passportId,
		secret: params.secret,
		scope: params.scopes,
		exp: params.expiresAt,
	};

	const json = JSON.stringify(payload);
	const base64 = btoa(unescape(encodeURIComponent(json)));
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function extractConsentTokenId(result: {
	effects?: {
		created?: Array<{ reference?: { objectId?: string } | null }>;
	} | null;
	objectChanges?: Array<{
		type?: string;
		objectId?: string;
		objectType?: string;
	}> | null;
}): string | undefined {
	// Prefer objectChanges if available
	const objectChanges = (result.objectChanges ?? []) as Array<{
		type?: string;
		objectId?: string;
		objectType?: string;
	}>;

	const createdFromChanges = objectChanges.find(
		(c) =>
			c.type === "created" &&
			typeof c.objectId === "string" &&
			typeof c.objectType === "string" &&
			c.objectType.includes("consent_token::ConsentToken"),
	);
	if (createdFromChanges?.objectId) return createdFromChanges.objectId;

	// Fallback to effects.created
	const created = (result.effects?.created ?? []) as Array<{
		reference?: { objectId?: string } | null;
	}>;
	for (const item of created) {
		const objectId = item.reference?.objectId;
		if (objectId) return objectId;
	}
	return undefined;
}
