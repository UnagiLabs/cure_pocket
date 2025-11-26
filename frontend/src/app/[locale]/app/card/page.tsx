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
	QrCode,
	Scan,
} from "lucide-react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { usePassport } from "@/hooks/usePassport";
import { PACKAGE_ID, PASSPORT_REGISTRY_ID } from "@/lib/suiClient";
import { getTheme } from "@/lib/themes";
import type { DataType } from "@/types/healthData";

/**
 * UIカテゴリーIDからコントラクトのdataTypeへのマッピング
 * UIカテゴリーは表示用、dataTypeはコントラクト/暗号化用
 */
type UiCategory =
	| "medications"
	| "allergies"
	| "histories"
	| "labs"
	| "imaging"
	| "vitals";

const uiCategoryToDataType: Record<UiCategory, DataType> = {
	medications: "medications",
	allergies: "basic_profile", // アレルギーはbasic_profileに含まれる
	histories: "conditions", // 既往歴はconditionsに含まれる
	labs: "lab_results",
	imaging: "imaging_meta",
	vitals: "self_metrics",
};

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
	const [selectedCategories, setSelectedCategories] = useState<UiCategory[]>([
		"medications",
		"allergies",
	]);
	const [qrImageUrl, setQrImageUrl] = useState("");

	useEffect(() => {
		if (!consentUrl) {
			setQrImageUrl("");
			return;
		}

		let isMounted = true;
		QRCode.toDataURL(consentUrl, {
			margin: 1,
			width: 400,
			errorCorrectionLevel: "M",
			color: {
				dark: "#000000",
				light: "#FFFFFF",
			},
		})
			.then((url: string) => {
				if (isMounted) {
					setQrImageUrl(url);
				}
			})
			.catch((error: unknown) => {
				console.error("Failed to render QR code", error);
			});

		return () => {
			isMounted = false;
		};
	}, [consentUrl]);

	const activeMedications = medications.filter((m) => m.status === "active");
	const importantHistories = medicalHistories.filter(
		(h) => h.status === "active" || h.type === "surgery",
	);
	const recentLabResults = labResults.slice(0, 3);
	const latestImaging = imagingReports[0];
	const recentVitals = vitalSigns.slice(0, 3);

	const handleCategoryToggle = (category: UiCategory) => {
		setSelectedCategories((prev) =>
			prev.includes(category)
				? prev.filter((c) => c !== category)
				: [...prev, category],
		);
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

	/**
	 * Instagram風の装飾付きQR画像を生成する
	 */
	const generateStyledQRImage = async (): Promise<Blob | null> => {
		if (!qrImageUrl || !walletAddress) return null;

		const CANVAS_WIDTH = 1080;
		const CANVAS_HEIGHT = 1920;
		const QR_SIZE = 500;

		const canvas = document.createElement("canvas");
		canvas.width = CANVAS_WIDTH;
		canvas.height = CANVAS_HEIGHT;
		const ctx = canvas.getContext("2d");
		if (!ctx) return null;

		// 1. 背景グラデーション（テーマカラーベース）
		const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
		gradient.addColorStop(0, theme.colors.background);
		gradient.addColorStop(1, theme.colors.surface);
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		// 2. ロゴ描画（上部中央）
		const logo = new Image();
		logo.crossOrigin = "anonymous";
		logo.src = "/icon.png";
		await new Promise<void>((resolve, reject) => {
			logo.onload = () => resolve();
			logo.onerror = () => reject(new Error("Failed to load logo"));
		});
		const logoSize = 150;
		ctx.drawImage(logo, (CANVAS_WIDTH - logoSize) / 2, 100, logoSize, logoSize);

		// 3. QRコード描画（中央）
		const qrImage = new Image();
		qrImage.src = qrImageUrl;
		await new Promise<void>((resolve) => {
			qrImage.onload = () => resolve();
		});

		// QRコードの白い背景ボックス（角丸、シャドウ付き）
		const qrBoxSize = QR_SIZE + 40;
		const qrX = (CANVAS_WIDTH - qrBoxSize) / 2;
		const qrY = 320;
		ctx.fillStyle = "#FFFFFF";
		ctx.shadowColor = "rgba(0,0,0,0.15)";
		ctx.shadowBlur = 30;
		ctx.shadowOffsetY = 10;
		roundRect(ctx, qrX, qrY, qrBoxSize, qrBoxSize, 24);
		ctx.fill();
		ctx.shadowBlur = 0;
		ctx.shadowOffsetY = 0;

		ctx.drawImage(qrImage, qrX + 20, qrY + 20, QR_SIZE, QR_SIZE);

		// 4. 共有カテゴリセクション
		ctx.fillStyle = theme.colors.text;
		ctx.font = "bold 40px sans-serif";
		ctx.textAlign = "center";
		ctx.fillText("📋 共有カテゴリ", CANVAS_WIDTH / 2, 960);

		ctx.font = "36px sans-serif";
		ctx.fillStyle = theme.colors.textSecondary;
		const categoryLabels = selectedCategories.map((cat) => {
			return categoryOptions.find((opt) => opt.id === cat)?.label || cat;
		});
		categoryLabels.forEach((label, i) => {
			ctx.fillText(`・${label}`, CANVAS_WIDTH / 2, 1030 + i * 55);
		});

		// 5. 有効期限（具体的な日時形式で表示）
		const expiryY = 1030 + categoryLabels.length * 55 + 100;
		ctx.fillStyle = theme.colors.text;
		ctx.font = "bold 36px sans-serif";
		const expiryDateStr = expiresAt
			? formatExpiryDateTime(expiresAt)
			: "24時間";
		ctx.fillText(`⏱ 有効期限: ${expiryDateStr}`, CANVAS_WIDTH / 2, expiryY);

		// 6. フッター（アプリ名）
		ctx.fillStyle = theme.colors.textSecondary;
		ctx.font = "32px sans-serif";
		ctx.fillText("─ CurePocket ─", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 120);

		// Blob生成
		return new Promise((resolve) => {
			canvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
		});
	};

	const handleDownloadImage = async () => {
		if (!qrImageUrl || !walletAddress) return;

		const blob = await generateStyledQRImage();
		if (!blob) return;

		// ウォレットアドレスの頭4桁と末尾4桁を取得
		const addrPrefix = walletAddress.slice(0, 6); // "0x" + 4桁
		const addrSuffix = walletAddress.slice(-4);
		const filename = `${addrPrefix}...${addrSuffix}_share_qr.png`;

		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
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

			// 3) UIカテゴリーをコントラクトのdataTypeに変換（重複を除去）
			const contractScopes = [
				...new Set(selectedCategories.map((cat) => uiCategoryToDataType[cat])),
			];

			// 4) Build PTB for create_consent_token
			const tx = new Transaction();
			tx.moveCall({
				target: `${PACKAGE_ID}::accessor::create_consent_token`,
				arguments: [
					tx.object(passport.id),
					tx.object(PASSPORT_REGISTRY_ID),
					tx.pure.vector("u8", Array.from(secretHash)),
					tx.pure.vector("string", contractScopes),
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
				scopes: contractScopes,
				expiresAt: expiresAtIso,
			});

			setConsentUrl(payload);
			setExpiresAt(expiresAtIso);
			setDurationLabel(formatDuration(expiresAtIso));
		} catch (error) {
			console.error("Failed to generate consent token:", error);
			const errorMessage =
				error instanceof Error ? error.message : "不明なエラー";
			alert(`QRコード生成に失敗しました: ${errorMessage}`);
			// QRコードを表示しない
			setConsentUrl("");
			setExpiresAt("");
			setDurationLabel("");
		} finally {
			setIsGenerating(false);
		}
	};

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
									{qrImageUrl ? (
										<img
											src={qrImageUrl}
											alt={t("card.scanToView")}
											className="h-full w-full rounded-lg object-cover"
										/>
									) : (
										<div className="flex h-full w-full items-center justify-center">
											<span className="text-xs font-medium text-gray-400">
												{t("card.scanToView")}
											</span>
										</div>
									)}
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
			<div className="mt-6">
				<button
					type="button"
					onClick={handleDownloadImage}
					disabled={!qrImageUrl}
					className="flex w-full items-center justify-center rounded-xl p-4 font-medium text-white shadow-md transition-transform active:scale-95 md:p-5 md:text-lg hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
					style={{ backgroundColor: theme.colors.primary }}
				>
					<Download className="mr-2 h-5 w-5" />
					<span>{t("card.downloadImage")}</span>
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

/**
 * 有効期限を「2025/10/10 15:00」形式でフォーマット
 */
function formatExpiryDateTime(expiresAtIso: string): string {
	const date = new Date(expiresAtIso);
	if (Number.isNaN(date.getTime())) return "";
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${year}/${month}/${day} ${hours}:${minutes}`;
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
	// UTF-8文字列をBase64に変換（unescape非推奨のため置き換え）
	const encoder = new TextEncoder();
	const data = encoder.encode(json);
	const base64 = btoa(String.fromCharCode(...data));
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

/**
 * Canvas上に角丸矩形を描画するヘルパー関数
 */
function roundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
) {
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
}
