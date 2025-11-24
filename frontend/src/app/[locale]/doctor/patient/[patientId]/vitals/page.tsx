"use client";

import { Activity, Heart, TrendingUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { use, useMemo } from "react";

const doctorTheme = {
	primary: "#2563EB",
	secondary: "#3B82F6",
	text: "#0F172A",
	textSecondary: "#64748B",
	surface: "#FFFFFF",
};

interface VitalsPageProps {
	params: Promise<{ patientId: string }>;
}

export default function DoctorVitalsPage({ params }: VitalsPageProps) {
	const { patientId } = use(params);
	const t = useTranslations();
	const locale = useLocale();

	// モックデータ
	const mockVitalSigns = [
		{
			id: "v1",
			type: "blood-pressure" as const,
			recordedAt: "2024-11-20T08:30:00",
			systolic: 135,
			diastolic: 85,
			unit: "mmHg",
			notes: "Morning measurement before breakfast",
		},
		{
			id: "v2",
			type: "blood-glucose" as const,
			recordedAt: "2024-11-20T08:35:00",
			value: 128,
			unit: "mg/dL",
			notes: "Fasting blood glucose",
		},
		{
			id: "v3",
			type: "weight" as const,
			recordedAt: "2024-11-20T08:00:00",
			value: 72.5,
			unit: "kg",
		},
		{
			id: "v4",
			type: "temperature" as const,
			recordedAt: "2024-11-20T08:00:00",
			value: 36.5,
			unit: "°C",
		},
		{
			id: "v5",
			type: "heart-rate" as const,
			recordedAt: "2024-11-20T08:30:00",
			value: 72,
			unit: "bpm",
		},
		{
			id: "v6",
			type: "blood-pressure" as const,
			recordedAt: "2024-11-19T19:00:00",
			systolic: 138,
			diastolic: 88,
			unit: "mmHg",
			notes: "Evening measurement",
		},
		{
			id: "v7",
			type: "blood-glucose" as const,
			recordedAt: "2024-11-19T12:30:00",
			value: 145,
			unit: "mg/dL",
			notes: "2 hours after lunch",
		},
	];

	const sortedVitals = useMemo(() => {
		return [...mockVitalSigns].sort((a, b) => {
			const dateA = new Date(a.recordedAt).getTime();
			const dateB = new Date(b.recordedAt).getTime();
			return dateB - dateA;
		});
	}, [mockVitalSigns]);

	// グループ化（日付ごと）
	const groupedVitals = useMemo(() => {
		const groups: Record<string, typeof mockVitalSigns> = {};
		sortedVitals.forEach((vital) => {
			const date = new Date(vital.recordedAt).toLocaleDateString(locale);
			if (!groups[date]) {
				groups[date] = [];
			}
			groups[date].push(vital);
		});
		return groups;
	}, [sortedVitals, locale]);

	const _formatDateTime = (dateString: string) => {
		return new Date(dateString).toLocaleString(locale, {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getVitalIcon = (type: string) => {
		switch (type) {
			case "blood-pressure":
			case "heart-rate":
				return <Heart size={18} />;
			case "blood-glucose":
			case "temperature":
			case "weight":
				return <Activity size={18} />;
			default:
				return <Activity size={18} />;
		}
	};

	const getVitalColor = (type: string) => {
		switch (type) {
			case "blood-pressure":
				return "#EF4444";
			case "blood-glucose":
				return "#F59E0B";
			case "heart-rate":
				return "#EC4899";
			case "temperature":
				return "#8B5CF6";
			case "weight":
				return "#10B981";
			default:
				return doctorTheme.primary;
		}
	};

	const getVitalLabel = (type: string) => {
		switch (type) {
			case "blood-pressure":
				return t("vitals.bloodPressure", { default: "Blood Pressure" });
			case "blood-glucose":
				return t("vitals.bloodGlucose", { default: "Blood Glucose" });
			case "heart-rate":
				return t("vitals.heartRate", { default: "Heart Rate" });
			case "temperature":
				return t("vitals.temperature", { default: "Temperature" });
			case "weight":
				return t("vitals.weight", { default: "Weight" });
			default:
				return type;
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
						<Activity size={20} style={{ color: doctorTheme.primary }} />
					</div>
					<h1
						className="text-2xl font-bold"
						style={{ color: doctorTheme.text }}
					>
						{t("home.todayVitals", { default: "Vital Signs" })}
					</h1>
					<p className="text-xs" style={{ color: doctorTheme.textSecondary }}>
						ID: {patientId}
					</p>
				</div>
				<p className="text-sm" style={{ color: doctorTheme.textSecondary }}>
					{t("doctor.vitalHistory", {
						default: "Patient's vital signs monitoring records",
					})}
				</p>
			</div>

			{/* Vital Signs by Date */}
			{Object.keys(groupedVitals).length === 0 ? (
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
						{t("dataOverview.noVitals", {
							default: "No vital signs recorded",
						})}
					</p>
				</div>
			) : (
				<div className="space-y-6">
					{Object.entries(groupedVitals).map(([date, vitals]) => (
						<div key={date}>
							<h2
								className="text-lg font-bold mb-3 flex items-center gap-2"
								style={{ color: doctorTheme.text }}
							>
								<TrendingUp size={18} style={{ color: doctorTheme.primary }} />
								{date}
							</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{vitals.map((vital) => {
									const color = getVitalColor(vital.type);
									return (
										<div
											key={vital.id}
											className="rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
											style={{
												backgroundColor: doctorTheme.surface,
												borderColor: `${color}30`,
											}}
										>
											<div
												className="px-4 py-3 border-b"
												style={{
													backgroundColor: `${color}10`,
													borderColor: `${color}20`,
												}}
											>
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-2">
														<div
															className="flex h-8 w-8 items-center justify-center rounded-lg"
															style={{
																backgroundColor: `${color}20`,
																color: color,
															}}
														>
															{getVitalIcon(vital.type)}
														</div>
														<span
															className="font-semibold"
															style={{ color: doctorTheme.text }}
														>
															{getVitalLabel(vital.type)}
														</span>
													</div>
													<span
														className="text-xs"
														style={{ color: doctorTheme.textSecondary }}
													>
														{new Date(vital.recordedAt).toLocaleTimeString(
															locale,
															{
																hour: "2-digit",
																minute: "2-digit",
															},
														)}
													</span>
												</div>
											</div>
											<div className="px-4 py-3">
												<div className="flex items-end gap-2 mb-2">
													<span
														className="text-3xl font-bold"
														style={{ color: doctorTheme.text }}
													>
														{vital.value ??
															`${vital.systolic}/${vital.diastolic}`}
													</span>
													<span
														className="text-lg pb-1"
														style={{ color: doctorTheme.textSecondary }}
													>
														{vital.unit}
													</span>
												</div>
												{vital.notes && (
													<div
														className="text-xs p-2 rounded bg-gray-50"
														style={{ color: doctorTheme.text }}
													>
														{vital.notes}
													</div>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
