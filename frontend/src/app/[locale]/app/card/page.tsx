"use client";

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
import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { apiClient } from "@/lib/apiClient";
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
	const theme = getTheme(settings.theme);
	const [consentUrl, setConsentUrl] = useState("");
	const [expiresAt, setExpiresAt] = useState("");
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

		setIsGenerating(true);
		try {
			const response = await apiClient.createConsentToken({
				walletAddress,
				categories: selectedCategories,
			});
			setConsentUrl(response.consentUrl);
			setExpiresAt(response.expiresAt);
		} catch (error) {
			console.error("Failed to generate consent token:", error);
			// Fallback to mock for now
			const mockUrl = `https://curepocket.app/view/${walletAddress?.slice(0, 8)}`;
			const mockExpires = new Date(
				Date.now() + 24 * 60 * 60 * 1000,
			).toISOString();
			setConsentUrl(mockUrl);
			setExpiresAt(mockExpires);
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
								<div className="mb-2 flex h-32 w-32 items-center justify-center rounded-lg border-4 border-gray-300 bg-white md:h-48 md:w-48">
									<QrCode className="h-24 w-24 text-gray-600 md:h-36 md:w-36" />
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
						{t("card.validFor", { duration: "24時間" })}
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
