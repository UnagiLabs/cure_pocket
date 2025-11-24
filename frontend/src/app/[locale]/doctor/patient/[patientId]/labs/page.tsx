"use client";

import { Activity, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

const doctorTheme = {
	primary: "#2563EB",
	secondary: "#3B82F6",
	text: "#0F172A",
	textSecondary: "#64748B",
	surface: "#FFFFFF",
};

interface LabsPageProps {
	params: { patientId: string };
}

export default function DoctorLabsPage({ params: _params }: LabsPageProps) {
	const t = useTranslations();
	const locale = useLocale();

	// モックデータ
	const mockLabResults = [
		{
			id: "l1",
			testName: "HbA1c",
			value: "6.8",
			unit: "%",
			referenceRange: "4.0-5.6",
			testDate: "2024-11-10",
			category: "Blood Test",
			testedBy: "Tokyo General Hospital Lab",
			notes: "Slightly elevated, monitor blood glucose",
		},
		{
			id: "l2",
			testName: "Total Cholesterol",
			value: "195",
			unit: "mg/dL",
			referenceRange: "<200",
			testDate: "2024-11-10",
			category: "Blood Test",
		},
		{
			id: "l3",
			testName: "LDL Cholesterol",
			value: "115",
			unit: "mg/dL",
			referenceRange: "<100",
			testDate: "2024-11-10",
			category: "Blood Test",
		},
		{
			id: "l4",
			testName: "HDL Cholesterol",
			value: "55",
			unit: "mg/dL",
			referenceRange: ">40",
			testDate: "2024-11-10",
			category: "Blood Test",
		},
		{
			id: "l5",
			testName: "Triglycerides",
			value: "125",
			unit: "mg/dL",
			referenceRange: "<150",
			testDate: "2024-11-10",
			category: "Blood Test",
		},
		{
			id: "l6",
			testName: "Fasting Blood Glucose",
			value: "118",
			unit: "mg/dL",
			referenceRange: "70-100",
			testDate: "2024-10-15",
			category: "Blood Test",
			testedBy: "City Clinic Lab",
		},
	];

	const sortedLabResults = useMemo(() => {
		return [...mockLabResults].sort((a, b) => {
			const dateA = new Date(a.testDate).getTime();
			const dateB = new Date(b.testDate).getTime();
			return dateB - dateA;
		});
	}, []);

	// グループ化（テスト日ごと）
	const groupedResults = useMemo(() => {
		const groups: Record<string, typeof mockLabResults> = {};
		sortedLabResults.forEach((result) => {
			if (!groups[result.testDate]) {
				groups[result.testDate] = [];
			}
			groups[result.testDate].push(result);
		});
		return groups;
	}, [sortedLabResults]);

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString(locale, {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const getResultStatus = (value: string, range: string) => {
		// 簡易的な判定ロジック
		const numValue = Number.parseFloat(value);
		if (Number.isNaN(numValue)) return "normal";

		if (range.includes("<")) {
			const max = Number.parseFloat(range.replace("<", ""));
			return numValue <= max ? "normal" : "high";
		}
		if (range.includes(">")) {
			const min = Number.parseFloat(range.replace(">", ""));
			return numValue >= min ? "normal" : "low";
		}
		if (range.includes("-")) {
			const [min, max] = range.split("-").map((v) => Number.parseFloat(v));
			if (numValue < min) return "low";
			if (numValue > max) return "high";
			return "normal";
		}
		return "normal";
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
						{t("home.labResults", { default: "Lab Results" })}
					</h1>
				</div>
				<p className="text-sm" style={{ color: doctorTheme.textSecondary }}>
					{t("doctor.labHistory", {
						default: "Patient's laboratory test results and trends",
					})}
				</p>
			</div>

			{/* Lab Results by Date */}
			{Object.keys(groupedResults).length === 0 ? (
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
						{t("dataOverview.noLabs", {
							default: "No lab results registered",
						})}
					</p>
				</div>
			) : (
				<div className="space-y-6">
					{Object.entries(groupedResults).map(([date, results]) => (
						<div
							key={date}
							className="rounded-xl border overflow-hidden shadow-sm"
							style={{
								backgroundColor: doctorTheme.surface,
								borderColor: `${doctorTheme.textSecondary}20`,
							}}
						>
							{/* Date Header */}
							<div
								className="px-4 py-3 border-b"
								style={{
									backgroundColor: `${doctorTheme.primary}10`,
									borderColor: `${doctorTheme.textSecondary}20`,
								}}
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<TrendingUp
											size={16}
											style={{ color: doctorTheme.primary }}
										/>
										<span
											className="font-bold"
											style={{ color: doctorTheme.text }}
										>
											{formatDate(date)}
										</span>
									</div>
									<span
										className="text-xs"
										style={{ color: doctorTheme.textSecondary }}
									>
										{results.length} {t("doctor.tests", { default: "tests" })}
									</span>
								</div>
								{results[0].testedBy && (
									<div
										className="text-xs mt-1"
										style={{ color: doctorTheme.textSecondary }}
									>
										{results[0].testedBy}
									</div>
								)}
							</div>

							{/* Results List */}
							<div
								className="divide-y"
								style={{ borderColor: `${doctorTheme.textSecondary}10` }}
							>
								{results.map((result) => {
									const status = getResultStatus(
										result.value,
										result.referenceRange || "",
									);
									return (
										<div
											key={result.id}
											className="px-4 py-3 hover:bg-gray-50 transition-colors"
										>
											<div className="flex items-start justify-between gap-4">
												<div className="flex-1">
													<div className="flex items-center gap-2 mb-1">
														<span
															className="font-medium"
															style={{ color: doctorTheme.text }}
														>
															{result.testName}
														</span>
														{status !== "normal" && (
															<AlertTriangle
																size={14}
																className={
																	status === "high"
																		? "text-orange-500"
																		: "text-yellow-500"
																}
															/>
														)}
													</div>
													{result.category && (
														<div
															className="text-xs"
															style={{ color: doctorTheme.textSecondary }}
														>
															{result.category}
														</div>
													)}
													{result.notes && (
														<div
															className="text-xs mt-2 p-2 rounded bg-amber-50 border border-amber-200"
															style={{ color: doctorTheme.text }}
														>
															{result.notes}
														</div>
													)}
												</div>
												<div className="text-right">
													<div className="flex items-center gap-2 justify-end mb-1">
														<span
															className="text-lg font-bold"
															style={{
																color:
																	status === "high"
																		? "#F97316"
																		: status === "low"
																			? "#EAB308"
																			: doctorTheme.text,
															}}
														>
															{result.value}
														</span>
														<span
															className="text-sm"
															style={{ color: doctorTheme.textSecondary }}
														>
															{result.unit}
														</span>
														{status === "normal" && (
															<CheckCircle
																size={16}
																className="text-green-500"
															/>
														)}
													</div>
													{result.referenceRange && (
														<div
															className="text-xs"
															style={{ color: doctorTheme.textSecondary }}
														>
															{t("labs.reference", { default: "Ref" })}:{" "}
															{result.referenceRange}
														</div>
													)}
												</div>
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
