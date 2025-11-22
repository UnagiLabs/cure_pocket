"use client";

import {
	AlertTriangle,
	Droplet,
	FileText,
	FlaskConical,
	Heart,
	Package,
	QrCode,
	Scan,
	Thermometer,
	Weight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";
import type { Prescription } from "@/types";

/**
 * ホーム画面（ダッシュボード）
 * 全データタイプのサマリーと最近の更新を表示
 */
export default function HomePage() {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const {
		prescriptions,
		allergies,
		medicalHistories,
		labResults,
		imagingReports,
		vitalSigns,
		settings,
		setPrescriptions,
		walletAddress,
	} = useApp();
	const theme = getTheme(settings.theme);

	useEffect(() => {
		// Load demo prescriptions if empty
		if (prescriptions.length === 0 && walletAddress) {
			const demoPrescriptions: Prescription[] = [
				{
					id: uuidv4(),
					prescriptionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
						.toISOString()
						.split("T")[0], // 7 days ago
					clinic: "Central Medical Center",
					department: "Cardiology",
					doctorName: "Dr. Smith",
					medications: [
						{
							id: uuidv4(),
							drugName: "Aspirin 81 MG Oral Tablet",
							strength: "81 MG",
							dosage: "Once daily",
							quantity: "1 tablet",
							duration: "30 days",
						},
						{
							id: uuidv4(),
							drugName: "Atorvastatin 10 MG Oral Tablet",
							strength: "10 MG",
							dosage: "Once daily at bedtime",
							quantity: "1 tablet",
							duration: "30 days",
						},
					],
					symptoms: "High cholesterol, cardiovascular prevention",
					notes: "Take aspirin with food to reduce stomach upset",
				},
				{
					id: uuidv4(),
					prescriptionDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
						.toISOString()
						.split("T")[0], // 14 days ago
					clinic: "Downtown Family Clinic",
					department: "Internal Medicine",
					doctorName: "Dr. Johnson",
					medications: [
						{
							id: uuidv4(),
							drugName: "Metformin 500 MG Oral Tablet",
							strength: "500 MG",
							dosage: "Twice daily with meals",
							quantity: "1 tablet",
							duration: "30 days",
						},
					],
					symptoms: "Type 2 diabetes management",
					notes: "Monitor blood glucose levels regularly",
				},
			];
			setPrescriptions(demoPrescriptions);
		}
	}, [prescriptions.length, walletAddress, setPrescriptions]);

	// 最近の更新を時系列で取得
	const recentUpdates = useMemo(() => {
		const updates: Array<{
			id: string;
			type: "medication" | "allergy" | "history" | "lab" | "imaging";
			title: string;
			date: string;
			icon: typeof Package;
		}> = [];

		prescriptions.forEach((prescription) => {
			const medicationNames = prescription.medications
				.map((m) => m.drugName)
				.join(", ");
			const displayTitle =
				medicationNames.length > 50
					? `${medicationNames.substring(0, 50)}...`
					: medicationNames;

			updates.push({
				id: prescription.id,
				type: "medication",
				title: `${prescription.clinic} - ${displayTitle}`,
				date: prescription.prescriptionDate,
				icon: Package,
			});
		});

		allergies.forEach((allergy) => {
			updates.push({
				id: allergy.id,
				type: "allergy",
				title: allergy.substance,
				date: allergy.onsetDate || new Date().toISOString(),
				icon: AlertTriangle,
			});
		});

		medicalHistories.forEach((history) => {
			updates.push({
				id: history.id,
				type: "history",
				title: history.diagnosis,
				date: history.diagnosisDate || new Date().toISOString(),
				icon: FileText,
			});
		});

		labResults.forEach((lab) => {
			updates.push({
				id: lab.id,
				type: "lab",
				title: `${lab.testName}: ${lab.value}${lab.unit || ""}`,
				date: lab.testDate,
				icon: FlaskConical,
			});
		});

		imagingReports.forEach((report) => {
			updates.push({
				id: report.id,
				type: "imaging",
				title:
					report.summary.substring(0, 30) +
					(report.summary.length > 30 ? "..." : ""),
				date: report.examDate,
				icon: Scan,
			});
		});

		return updates
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
			.slice(0, 5);
	}, [prescriptions, allergies, medicalHistories, labResults, imagingReports]);

	// Get latest vital signs for display
	const latestVitals = useMemo(() => {
		const vitalsMap = new Map();
		vitalSigns.forEach((vital) => {
			const existing = vitalsMap.get(vital.type);
			if (
				!existing ||
				new Date(vital.recordedAt) > new Date(existing.recordedAt)
			) {
				vitalsMap.set(vital.type, vital);
			}
		});
		return vitalsMap;
	}, [vitalSigns]);

	const temperatureVital = latestVitals.get("temperature");
	const bloodGlucoseVital = latestVitals.get("blood-glucose");
	const bloodPressureVital = latestVitals.get("blood-pressure");
	const weightVital = latestVitals.get("weight");

	return (
		<div
			className="space-y-8 pb-24 lg:pb-8 px-4 md:px-8 lg:px-12 animate-fade-in"
			style={{ backgroundColor: theme.colors.background }}
		>
			{/* Today's Vitals */}
			<section className="mt-2 lg:mt-6">
				<SectionTitle>{t("home.todayVitals")}</SectionTitle>
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
					{/* Blood Pressure Card */}
					<GlassCard
						className="flex flex-col gap-3 group cursor-pointer"
						onClick={() => router.push(`/${locale}/app/vitals`)}
					>
						<div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
							<Heart size={14} className="text-[#FF6B6B]" />{" "}
							{t("vitals.bloodPressure")}
						</div>
						{bloodPressureVital ? (
							<>
								<div className="flex items-baseline gap-1">
									<div
										className="text-2xl font-bold font-inter"
										style={{ color: theme.colors.text }}
									>
										{bloodPressureVital.systolic}
									</div>
									<span className="text-sm opacity-60">/</span>
									<div
										className="text-2xl font-bold font-inter"
										style={{ color: theme.colors.text }}
									>
										{bloodPressureVital.diastolic}
									</div>
								</div>
								<div className="flex gap-2 text-xs">
									<span className="text-slate-500">
										{t("vitals.systolicShort")} {bloodPressureVital.systolic}
									</span>
									<span className="text-slate-500">
										{t("vitals.diastolicShort")} {bloodPressureVital.diastolic}
									</span>
								</div>
							</>
						) : (
							<>
								<div className="flex items-baseline gap-1">
									<div
										className="text-2xl font-bold font-inter"
										style={{ color: theme.colors.text }}
									>
										120
									</div>
									<span className="text-sm opacity-60">/</span>
									<div
										className="text-2xl font-bold font-inter"
										style={{ color: theme.colors.text }}
									>
										90
									</div>
								</div>
								<div className="flex gap-2 text-xs">
									<span className="text-slate-500">
										{t("vitals.systolicShort")} 120
									</span>
									<span className="text-slate-500">
										{t("vitals.diastolicShort")} 90
									</span>
								</div>
							</>
						)}
					</GlassCard>

					{/* Temperature Card */}
					<GlassCard
						className="flex flex-col gap-3 group cursor-pointer"
						onClick={() => router.push(`/${locale}/app/vitals`)}
					>
						<div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
							<Thermometer size={14} className="text-[#FF6B6B]" />{" "}
							{t("vitals.temperature")}
						</div>
						<div
							className="text-2xl font-bold font-inter"
							style={{ color: theme.colors.text }}
						>
							{temperatureVital?.value || "36.2"}
							<span className="text-sm font-normal ml-1 opacity-60">°C</span>
						</div>
						<div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
							<div
								className="bg-[#FF6B6B] h-full rounded-full"
								style={{
									width: `${((temperatureVital?.value || 36.2) - 35) * 50}%`,
								}}
							></div>
						</div>
					</GlassCard>

					{/* Blood Glucose Card */}
					<GlassCard
						className="flex flex-col gap-3 group cursor-pointer"
						onClick={() => router.push(`/${locale}/app/vitals`)}
					>
						<div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
							<Droplet size={14} style={{ color: theme.colors.primary }} />{" "}
							{t("vitals.bloodGlucose")}
						</div>
						<div
							className="text-2xl font-bold font-inter"
							style={{ color: theme.colors.text }}
						>
							{bloodGlucoseVital?.value || "96"}
							<span className="text-sm font-normal ml-1 opacity-60">mg/dL</span>
						</div>
						<div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
							<div
								className="h-full rounded-full"
								style={{
									backgroundColor: theme.colors.primary,
									width: `${Math.min((bloodGlucoseVital?.value || 96) / 2, 100)}%`,
								}}
							></div>
						</div>
					</GlassCard>

					{/* Weight Card */}
					<GlassCard
						className="flex flex-col gap-3 group cursor-pointer"
						onClick={() => router.push(`/${locale}/app/vitals`)}
					>
						<div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
							<Weight size={14} className="text-[#8B5CF6]" />{" "}
							{t("vitals.weight")}
						</div>
						<div
							className="text-2xl font-bold font-inter"
							style={{ color: theme.colors.text }}
						>
							{weightVital?.value || "53"}
							<span className="text-sm font-normal ml-1 opacity-60">kg</span>
						</div>
						<div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
							<div
								className="bg-[#8B5CF6] h-full rounded-full"
								style={{
									width: `${Math.min(((weightVital?.value || 53) / 100) * 100, 100)}%`,
								}}
							></div>
						</div>
					</GlassCard>
				</div>
			</section>

			{/* Quick Actions */}
			<section>
				<div className="max-w-4xl mx-auto">
					<div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide lg:overflow-visible lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 lg:gap-6">
						<button
							type="button"
							onClick={() => router.push(`/${locale}/app/card`)}
							className="flex-shrink-0 w-20 h-24 bg-white rounded-2xl flex flex-col items-center justify-center gap-2 shadow-sm border border-slate-50 active:scale-95 transition-transform lg:w-full lg:h-40 lg:rounded-3xl lg:shadow-md"
						>
							<div
								className="w-10 h-10 rounded-full flex items-center justify-center lg:w-14 lg:h-14"
								style={{
									backgroundColor: `${theme.colors.primary}20`,
									color: theme.colors.primary,
								}}
							>
								<QrCode className="w-5 h-5 lg:w-7 lg:h-7" />
							</div>
							<span className="text-[10px] font-bold text-slate-500 lg:text-sm">
								{t("home.share")}
							</span>
						</button>

						<button
							type="button"
							onClick={() => router.push(`/${locale}/app/medications`)}
							className="flex-shrink-0 w-20 h-24 bg-white rounded-2xl flex flex-col items-center justify-center gap-2 shadow-sm border border-slate-50 active:scale-95 transition-transform lg:w-full lg:h-40 lg:rounded-3xl lg:shadow-md"
						>
							<div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981] lg:w-14 lg:h-14">
								<Package className="w-5 h-5 lg:w-7 lg:h-7" />
							</div>
							<span className="text-[10px] font-bold text-slate-500 text-center leading-tight lg:text-sm">
								{t("home.medicationNotebook")}
							</span>
						</button>

						<button
							type="button"
							onClick={() => router.push(`/${locale}/app/add/lab`)}
							className="flex-shrink-0 w-20 h-24 bg-white rounded-2xl flex flex-col items-center justify-center gap-2 shadow-sm border border-slate-50 active:scale-95 transition-transform lg:w-full lg:h-40 lg:rounded-3xl lg:shadow-md"
						>
							<div className="w-10 h-10 rounded-full bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B] lg:w-14 lg:h-14">
								<FlaskConical className="w-5 h-5 lg:w-7 lg:h-7" />
							</div>
							<span className="text-[10px] font-bold text-slate-500 lg:text-sm">
								{t("home.labResults")}
							</span>
						</button>

						<button
							type="button"
							onClick={() => router.push(`/${locale}/app/add/imaging`)}
							className="flex-shrink-0 w-20 h-24 bg-white rounded-2xl flex flex-col items-center justify-center gap-2 shadow-sm border border-slate-50 active:scale-95 transition-transform lg:w-full lg:h-40 lg:rounded-3xl lg:shadow-md"
						>
							<div className="w-10 h-10 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center text-[#8B5CF6] lg:w-14 lg:h-14">
								<Scan className="w-5 h-5 lg:w-7 lg:h-7" />
							</div>
							<span className="text-[10px] font-bold text-slate-500 text-center leading-tight lg:text-sm">
								{t("home.imagingData")}
							</span>
						</button>
					</div>
				</div>
			</section>

			{/* Recent Updates Timeline */}
			{recentUpdates.length > 0 && (
				<section>
					<SectionTitle
						action
						onActionClick={() => router.push(`/${locale}/app/add`)}
					>
						{t("home.recentRecords")}
					</SectionTitle>
					<div className="relative pl-4 border-l-2 border-slate-100 ml-2 space-y-6">
						{recentUpdates.map((update, index) => {
							return (
								<div key={update.id} className="relative group cursor-pointer">
									<div
										className="absolute -left-[21px] top-1.5 w-3 h-3 bg-white border-2 rounded-full group-hover:scale-125 transition-transform"
										style={{ borderColor: theme.colors.primary }}
									></div>
									<div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50 transition-all hover:translate-x-1">
										<div className="flex justify-between items-start mb-1">
											<span className="text-xs font-bold opacity-50 font-inter tracking-wide">
												{new Date(update.date).toLocaleDateString("ja-JP")}
											</span>
											<Badge type={index === 0 ? "primary" : "default"}>
												{t(`dataTypes.${update.type}`)}
											</Badge>
										</div>
										<h3
											className="font-bold mb-1"
											style={{ color: theme.colors.text }}
										>
											{update.title}
										</h3>
										<p className="text-xs text-slate-500 flex items-center gap-1">
											<span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>{" "}
											{t(`dataTypes.${update.type}`)}
										</p>
									</div>
								</div>
							);
						})}
					</div>
				</section>
			)}

			<style jsx global>{`
				.scrollbar-hide::-webkit-scrollbar {
					display: none;
				}
				.scrollbar-hide {
					-ms-overflow-style: none;
					scrollbar-width: none;
				}
				@keyframes fadeIn {
					from {
						opacity: 0;
						transform: translateY(10px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
				.animate-fade-in {
					animation: fadeIn 0.4s ease-out forwards;
				}
				.font-inter {
					font-family: 'Inter', sans-serif;
				}
			`}</style>
		</div>
	);
}
