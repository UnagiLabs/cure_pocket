"use client";

import { Clock, Heart, Stethoscope } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { use, useMemo } from "react";

const doctorTheme = {
	primary: "#2563EB",
	secondary: "#3B82F6",
	text: "#0F172A",
	textSecondary: "#64748B",
	surface: "#FFFFFF",
};

interface HistoriesPageProps {
	params: Promise<{ patientId: string }>;
}

export default function DoctorHistoriesPage({ params }: HistoriesPageProps) {
	const { patientId } = use(params);
	const t = useTranslations();
	const locale = useLocale();

	// モックデータ
	const mockHistories = [
		{
			id: "h1",
			type: "condition" as const,
			diagnosis: "Hypertension",
			diagnosisDate: "2020-03-10",
			status: "chronic" as const,
			diagnosedBy: "Tokyo General Hospital",
			description: "Essential hypertension, controlled with medication",
			icd10Code: "I10",
			notes: undefined as string | undefined,
		},
		{
			id: "h2",
			type: "condition" as const,
			diagnosis: "Type 2 Diabetes Mellitus",
			diagnosisDate: "2021-07-15",
			status: "active" as const,
			diagnosedBy: "City Clinic",
			description:
				"Type 2 diabetes, managed with oral medications and lifestyle modifications",
			icd10Code: "E11",
			notes: undefined as string | undefined,
		},
		{
			id: "h3",
			type: "surgery" as const,
			diagnosis: "Appendectomy",
			diagnosisDate: "2015-08-20",
			status: "resolved" as const,
			diagnosedBy: "Emergency Hospital",
			description: "Laparoscopic appendectomy for acute appendicitis",
			resolvedDate: "2015-09-05",
			notes: undefined as string | undefined,
		},
		{
			id: "h4",
			type: "condition" as const,
			diagnosis: "Gastroesophageal Reflux Disease (GERD)",
			diagnosisDate: "2019-05-12",
			status: "chronic" as const,
			description: "Managed with proton pump inhibitors",
			icd10Code: "K21",
			notes: undefined as string | undefined,
		},
	];

	const sortedHistories = useMemo(() => {
		return [...mockHistories].sort((a, b) => {
			const dateA = new Date(a.diagnosisDate || "").getTime();
			const dateB = new Date(b.diagnosisDate || "").getTime();
			return dateB - dateA;
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mockHistories]);

	const formatDate = (dateString: string | undefined) => {
		if (!dateString) return "-";
		return new Date(dateString).toLocaleDateString(locale, {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return {
					bg: "bg-blue-50",
					text: "text-blue-700",
					border: "border-blue-200",
				};
			case "chronic":
				return {
					bg: "bg-orange-50",
					text: "text-orange-700",
					border: "border-orange-200",
				};
			case "resolved":
				return {
					bg: "bg-green-50",
					text: "text-green-700",
					border: "border-green-200",
				};
			default:
				return {
					bg: "bg-gray-50",
					text: "text-gray-700",
					border: "border-gray-200",
				};
		}
	};

	const getTypeIcon = (type: string) => {
		switch (type) {
			case "surgery":
			case "procedure":
				return <Stethoscope size={18} />;
			default:
				return <Heart size={18} />;
		}
	};

	return (
		<div className="px-4 md:px-8 lg:px-12 py-4 lg:py-8 space-y-6">
			{/* Header */}
			<div className="mb-6">
				<div className="flex items-center gap-3 mb-2">
					<div
						className="flex h-10 w-10 items-center justify-center rounded-xl"
						style={{ backgroundColor: `${doctorTheme.primary}20` }}
					>
						<Heart size={20} style={{ color: doctorTheme.primary }} />
					</div>
			<h1
				className="text-2xl font-bold"
				style={{ color: doctorTheme.text }}
			>
				{t("dataOverview.conditions", { default: "Medical History" })}
			</h1>
			<p className="text-xs" style={{ color: doctorTheme.textSecondary }}>
				ID: {patientId}
			</p>
		</div>
				<p className="text-sm" style={{ color: doctorTheme.textSecondary }}>
					{t("doctor.medicalHistory", {
						default: "Patient's conditions, surgeries, and procedures",
					})}
				</p>
			</div>

			{/* Medical History List */}
			{sortedHistories.length === 0 ? (
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
						{t("dataOverview.noConditions", {
							default: "No medical history recorded",
						})}
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{sortedHistories.map((history) => {
						const statusColors = getStatusColor(history.status || "");
						return (
							<div
								key={history.id}
								className="rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
								style={{
									backgroundColor: doctorTheme.surface,
									borderColor: `${doctorTheme.textSecondary}20`,
								}}
							>
								{/* Header */}
								<div
									className={`px-4 py-3 border-b ${statusColors.bg} ${statusColors.border}`}
								>
									<div className="flex items-start justify-between gap-3">
										<div className="flex items-start gap-3 flex-1">
											<div
												className={`flex h-9 w-9 items-center justify-center rounded-lg ${statusColors.bg} ${statusColors.text}`}
											>
												{getTypeIcon(history.type)}
											</div>
											<div className="flex-1">
												<h3
													className="font-bold text-lg mb-1"
													style={{ color: doctorTheme.text }}
												>
													{history.diagnosis}
												</h3>
												<div className="flex flex-wrap items-center gap-2 text-xs">
													<span
														className={`px-2 py-1 rounded-full font-medium ${statusColors.bg} ${statusColors.text} ${statusColors.border} border`}
													>
														{history.type}
													</span>
													<span
														className={`px-2 py-1 rounded-full font-medium ${statusColors.bg} ${statusColors.text} ${statusColors.border} border`}
													>
														{history.status}
													</span>
													{history.icd10Code && (
														<span
															className="px-2 py-1 rounded-full font-mono bg-gray-100 border border-gray-300"
															style={{ color: doctorTheme.text }}
														>
															{history.icd10Code}
														</span>
													)}
												</div>
											</div>
										</div>
									</div>
								</div>

								{/* Body */}
								<div className="px-4 py-3 space-y-3">
									{/* Date Information */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										<div>
											<div className="flex items-center gap-2 mb-1">
												<Clock
													size={14}
													style={{ color: doctorTheme.textSecondary }}
												/>
												<span
													className="text-xs font-medium"
													style={{ color: doctorTheme.textSecondary }}
												>
													{t("histories.diagnosisDate", {
														default: "Diagnosis Date",
													})}
												</span>
											</div>
											<div
												className="text-sm font-medium"
												style={{ color: doctorTheme.text }}
											>
												{formatDate(history.diagnosisDate)}
											</div>
										</div>
										{history.resolvedDate && (
											<div>
												<div className="flex items-center gap-2 mb-1">
													<Clock
														size={14}
														style={{ color: doctorTheme.textSecondary }}
													/>
													<span
														className="text-xs font-medium"
														style={{ color: doctorTheme.textSecondary }}
													>
														{t("histories.resolvedDate", {
															default: "Resolved Date",
														})}
													</span>
												</div>
												<div
													className="text-sm font-medium"
													style={{ color: doctorTheme.text }}
												>
													{formatDate(history.resolvedDate)}
												</div>
											</div>
										)}
									</div>

									{/* Diagnosed By */}
									{history.diagnosedBy && (
										<div>
											<div
												className="text-xs font-medium mb-1"
												style={{ color: doctorTheme.textSecondary }}
											>
												{t("histories.diagnosedBy", {
													default: "Diagnosed By",
												})}
											</div>
											<div
												className="text-sm"
												style={{ color: doctorTheme.text }}
											>
												{history.diagnosedBy}
											</div>
										</div>
									)}

									{/* Description */}
									{history.description && (
										<div>
											<div
												className="text-xs font-medium mb-1"
												style={{ color: doctorTheme.textSecondary }}
											>
												{t("histories.description", { default: "Description" })}
											</div>
											<div
												className="text-sm p-3 rounded-lg bg-gray-50"
												style={{ color: doctorTheme.text }}
											>
												{history.description}
											</div>
										</div>
									)}

									{/* Notes */}
									{history.notes && (
										<div>
											<div
												className="text-xs font-medium mb-1"
												style={{ color: doctorTheme.textSecondary }}
											>
												{t("histories.notes", { default: "Notes" })}
											</div>
											<div
												className="text-sm"
												style={{ color: doctorTheme.text }}
											>
												{history.notes}
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
