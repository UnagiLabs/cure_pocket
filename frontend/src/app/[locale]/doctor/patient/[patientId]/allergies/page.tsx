"use client";

import {
	AlertCircle,
	AlertTriangle,
	Calendar,
	ShieldAlert,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { use, useMemo } from "react";

const doctorTheme = {
	primary: "#2563EB",
	secondary: "#3B82F6",
	text: "#0F172A",
	textSecondary: "#64748B",
	surface: "#FFFFFF",
};

interface AllergiesPageProps {
	params: Promise<{ patientId: string }>;
}

export default function DoctorAllergiesPage({ params }: AllergiesPageProps) {
	const { patientId } = use(params);
	const t = useTranslations();
	const locale = useLocale();

	// モックデータ
	const mockAllergies = [
		{
			id: "a1",
			substance: "Penicillin",
			severity: "severe" as const,
			symptoms: "Anaphylaxis, difficulty breathing, severe rash",
			onsetDate: "2010-05-20",
			diagnosedBy: "Emergency Hospital",
			notes: "Patient carries epinephrine auto-injector",
		},
		{
			id: "a2",
			substance: "Aspirin (ASA)",
			severity: "moderate" as const,
			symptoms: "Stomach upset, gastric irritation",
			onsetDate: "2018-03-15",
			diagnosedBy: "City Clinic",
		},
		{
			id: "a3",
			substance: "Iodine Contrast",
			severity: "moderate" as const,
			symptoms: "Hives, itching",
			onsetDate: "2022-01-10",
			diagnosedBy: "Imaging Center",
			notes: "Use non-ionic low-osmolar contrast if imaging required",
		},
		{
			id: "a4",
			substance: "Sulfa Drugs",
			severity: "mild" as const,
			symptoms: "Skin rash",
			onsetDate: "2015-07-08",
		},
	];

	const sortedAllergies = useMemo(() => {
		// 重症度順にソート（severe > moderate > mild）
		const severityOrder = {
			severe: 0,
			"life-threatening": 0,
			moderate: 1,
			mild: 2,
		};
		return [...mockAllergies].sort((a, b) => {
			return severityOrder[a.severity] - severityOrder[b.severity];
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mockAllergies]);

	const formatDate = (dateString: string | undefined) => {
		if (!dateString) return "-";
		return new Date(dateString).toLocaleDateString(locale, {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const getSeverityConfig = (severity: string) => {
		switch (severity) {
			case "severe":
			case "life-threatening":
				return {
					bg: "bg-red-50",
					text: "text-red-800",
					border: "border-red-300",
					icon: <ShieldAlert size={20} />,
					label: t("allergies.severe", { default: "Severe" }),
				};
			case "moderate":
				return {
					bg: "bg-orange-50",
					text: "text-orange-800",
					border: "border-orange-300",
					icon: <AlertTriangle size={20} />,
					label: t("allergies.moderate", { default: "Moderate" }),
				};
			case "mild":
				return {
					bg: "bg-yellow-50",
					text: "text-yellow-800",
					border: "border-yellow-300",
					icon: <AlertCircle size={20} />,
					label: t("allergies.mild", { default: "Mild" }),
				};
			default:
				return {
					bg: "bg-gray-50",
					text: "text-gray-800",
					border: "border-gray-300",
					icon: <AlertCircle size={20} />,
					label: severity,
				};
		}
	};

	return (
		<div className="px-4 md:px-8 lg:px-12 py-4 lg:py-8 space-y-6">
			{/* Header */}
			<div className="mb-6">
				<div className="flex items-center gap-3 mb-2">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
						<ShieldAlert size={20} className="text-red-600" />
					</div>
			<h1
				className="text-2xl font-bold"
				style={{ color: doctorTheme.text }}
			>
				{t("doctor.drugAllergies", { default: "Drug Allergies" })}
			</h1>
			<p className="text-xs" style={{ color: doctorTheme.textSecondary }}>
				ID: {patientId}
			</p>
		</div>
				<p className="text-sm" style={{ color: doctorTheme.textSecondary }}>
					{t("doctor.allergyWarning", {
						default:
							"Critical information - Review before prescribing any medication",
					})}
				</p>
			</div>

			{/* Alert Banner */}
			{sortedAllergies.some((a) => a.severity === "severe") && (
				<div className="rounded-lg border-2 border-red-500 bg-red-50 p-4">
					<div className="flex items-start gap-3">
						<ShieldAlert
							size={24}
							className="text-red-600 flex-shrink-0 mt-0.5"
						/>
						<div>
							<h3 className="font-bold text-red-900 mb-1">
								{t("doctor.severeAllergies", {
									default: "Severe Allergies Detected",
								})}
							</h3>
							<p className="text-sm text-red-800">
								{t("doctor.severeAllergyWarning", {
									default:
										"This patient has severe drug allergies. Exercise extreme caution when prescribing medications.",
								})}
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Allergies List */}
			{sortedAllergies.length === 0 ? (
				<div
					className="flex flex-col h-64 items-center justify-center rounded-lg border"
					style={{
						backgroundColor: doctorTheme.surface,
						borderColor: `${doctorTheme.textSecondary}20`,
					}}
				>
					<p
						className="text-center"
						style={{ color: doctorTheme.textSecondary }}
					>
						{t("doctor.noAllergies", {
							default: "No drug allergies recorded",
						})}
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{sortedAllergies.map((allergy) => {
						const config = getSeverityConfig(allergy.severity);
						return (
							<div
								key={allergy.id}
								className={`rounded-xl border-2 overflow-hidden shadow-sm ${config.bg} ${config.border}`}
							>
								{/* Header */}
								<div className={`px-4 py-3 border-b-2 ${config.border}`}>
									<div className="flex items-start justify-between gap-3">
										<div className="flex items-start gap-3 flex-1">
											<div
												className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.text}`}
											>
												{config.icon}
											</div>
											<div className="flex-1">
												<h3
													className="font-bold text-xl mb-1"
													style={{ color: doctorTheme.text }}
												>
													{allergy.substance}
												</h3>
												<div className="flex items-center gap-2">
													<span
														className={`px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text} ${config.border} border-2`}
													>
														{config.label}
													</span>
												</div>
											</div>
										</div>
									</div>
								</div>

								{/* Body */}
								<div className="px-4 py-4 bg-white space-y-3">
									{/* Symptoms */}
									{allergy.symptoms && (
										<div>
											<div
												className="text-xs font-medium mb-1"
												style={{ color: doctorTheme.textSecondary }}
											>
												{t("allergies.symptoms", { default: "Symptoms" })}
											</div>
											<div
												className={`text-sm p-3 rounded-lg ${config.bg} border ${config.border}`}
												style={{ color: doctorTheme.text }}
											>
												{allergy.symptoms}
											</div>
										</div>
									)}

									{/* Date and Diagnosis Info */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										{allergy.onsetDate && (
											<div>
												<div className="flex items-center gap-2 mb-1">
													<Calendar
														size={14}
														style={{ color: doctorTheme.textSecondary }}
													/>
													<span
														className="text-xs font-medium"
														style={{ color: doctorTheme.textSecondary }}
													>
														{t("allergies.onsetDate", {
															default: "Onset Date",
														})}
													</span>
												</div>
												<div
													className="text-sm font-medium"
													style={{ color: doctorTheme.text }}
												>
													{formatDate(allergy.onsetDate)}
												</div>
											</div>
										)}
										{allergy.diagnosedBy && (
											<div>
												<div
													className="text-xs font-medium mb-1"
													style={{ color: doctorTheme.textSecondary }}
												>
													{t("allergies.diagnosedBy", {
														default: "Diagnosed By",
													})}
												</div>
												<div
													className="text-sm font-medium"
													style={{ color: doctorTheme.text }}
												>
													{allergy.diagnosedBy}
												</div>
											</div>
										)}
									</div>

									{/* Notes */}
									{allergy.notes && (
										<div>
											<div
												className="text-xs font-medium mb-1"
												style={{ color: doctorTheme.textSecondary }}
											>
												{t("allergies.notes", { default: "Notes" })}
											</div>
											<div
												className="text-sm p-3 rounded-lg bg-amber-50 border border-amber-300"
												style={{ color: doctorTheme.text }}
											>
												<div className="flex items-start gap-2">
													<AlertTriangle
														size={16}
														className="text-amber-600 flex-shrink-0 mt-0.5"
													/>
													<span>{allergy.notes}</span>
												</div>
											</div>
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
