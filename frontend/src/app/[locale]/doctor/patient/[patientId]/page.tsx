"use client";

import {
	Activity,
	AlertCircle,
	FileText,
	Heart,
	Image as ImageIcon,
	Pill,
	ShieldAlert,
	Stethoscope,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { use, useMemo, useState } from "react";
import type { DataScope } from "@/types/doctor";

// 医師向けテーマカラー
const doctorTheme = {
	primary: "#2563EB",
	secondary: "#3B82F6",
	accent: "#60A5FA",
	background: "#F8FAFC",
	surface: "#FFFFFF",
	text: "#0F172A",
	textSecondary: "#64748B",
};

interface DoctorPatientPageProps {
	params: Promise<{ patientId: string }>;
}

export default function DoctorPatientPage({ params }: DoctorPatientPageProps) {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const { patientId } = use(params);

	// TODO: バックエンド実装後、実際のデータ取得に置き換え
	// 現在はモックデータで表示
	const [allowedScopes] = useState<DataScope[]>([
		"basic_profile",
		"medications",
		"allergies",
		"conditions",
		"lab_results",
		"vital_signs",
	]);

	// モックデータ
	const mockProfile = {
		birthDate: "1985-03-15",
		ageBand: "30s" as const,
		gender: "male" as const,
		country: "JP",
		bloodType: "A+" as const,
		foodAllergies: ["Peanuts", "Shellfish"],
	};

	const mockPrescriptions = [
		{
			id: "1",
			prescriptionDate: "2024-11-15",
			clinic: "Tokyo General Hospital",
			department: "Internal Medicine",
			medications: [
				{
					id: "m1",
					drugName: "Amlodipine",
					strength: "5mg",
					dosage: "Once daily",
					quantity: "1 tablet",
				},
				{
					id: "m2",
					drugName: "Metformin",
					strength: "500mg",
					dosage: "Twice daily",
					quantity: "1 tablet",
				},
			],
		},
		{
			id: "2",
			prescriptionDate: "2024-10-20",
			clinic: "City Clinic",
			medications: [
				{
					id: "m3",
					drugName: "Lisinopril",
					strength: "10mg",
					dosage: "Once daily",
					quantity: "1 tablet",
				},
			],
		},
	];

	const mockAllergies = [
		{
			id: "a1",
			substance: "Penicillin",
			severity: "severe" as const,
			symptoms: "Rash, difficulty breathing",
			onsetDate: "2010-05-20",
		},
		{
			id: "a2",
			substance: "Aspirin",
			severity: "moderate" as const,
			symptoms: "Stomach upset",
		},
	];

	const mockHistories = [
		{
			id: "h1",
			type: "condition" as const,
			diagnosis: "Hypertension",
			diagnosisDate: "2020-03-10",
			status: "chronic" as const,
		},
		{
			id: "h2",
			type: "condition" as const,
			diagnosis: "Type 2 Diabetes",
			diagnosisDate: "2021-07-15",
			status: "active" as const,
		},
		{
			id: "h3",
			type: "surgery" as const,
			diagnosis: "Appendectomy",
			diagnosisDate: "2015-08-20",
			status: "resolved" as const,
		},
	];

	const mockLabResults = [
		{
			id: "l1",
			testName: "HbA1c",
			value: "6.8",
			unit: "%",
			referenceRange: "4.0-5.6",
			testDate: "2024-11-10",
			category: "Blood Test",
		},
		{
			id: "l2",
			testName: "Total Cholesterol",
			value: "195",
			unit: "mg/dL",
			referenceRange: "<200",
			testDate: "2024-11-10",
		},
		{
			id: "l3",
			testName: "Blood Pressure",
			value: "138/88",
			unit: "mmHg",
			referenceRange: "<120/80",
			testDate: "2024-11-15",
		},
	];

	const mockImagingReports = [
		{
			id: "i1",
			type: "xray" as const,
			bodyPart: "Chest",
			examDate: "2024-09-25",
			performedBy: "Tokyo Imaging Center",
			summary: "Normal chest X-ray",
			findings: "No acute cardiopulmonary abnormality",
		},
	];

	const mockVitalSigns = [
		{
			id: "v1",
			type: "blood-pressure" as const,
			recordedAt: "2024-11-20T08:30:00",
			systolic: 135,
			diastolic: 85,
			unit: "mmHg",
		},
		{
			id: "v2",
			type: "blood-glucose" as const,
			recordedAt: "2024-11-20T08:30:00",
			value: 128,
			unit: "mg/dL",
		},
		{
			id: "v3",
			type: "weight" as const,
			recordedAt: "2024-11-20T08:30:00",
			value: 72.5,
			unit: "kg",
		},
	];

	const summary = useMemo(
		() => ({
			conditions: mockHistories.length,
			prescriptions: mockPrescriptions.length,
			labs: mockLabResults.length,
			imaging: mockImagingReports.length,
			vitals: mockVitalSigns.length,
			allergies: mockAllergies.length,
		}),
		[
			mockAllergies.length,
			mockHistories.length,
			mockImagingReports.length,
			mockVitalSigns.length,
		],
	);

	const formatDate = (value: string | null | undefined) => {
		if (!value) return "-";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return "-";
		return date.toLocaleDateString(locale, {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const isScopeAllowed = (scope: DataScope) => allowedScopes.includes(scope);

	// スコープが許可されていないカード用のコンポーネント
	const LockedCard = ({
		title,
		accentColor,
		icon,
	}: {
		title: string;
		accentColor: string;
		icon?: React.ReactNode;
	}) => (
		<SectionCard title={title} accentColor={accentColor} icon={icon}>
			<div className="flex flex-col items-center justify-center py-8 text-center">
				<div
					className="mb-3 flex h-16 w-16 items-center justify-center rounded-full"
					style={{ backgroundColor: `${accentColor}10` }}
				>
					<ShieldAlert size={32} style={{ color: accentColor, opacity: 0.5 }} />
				</div>
				<p
					className="text-sm font-medium mb-1"
					style={{ color: doctorTheme.textSecondary }}
				>
					{t("doctor.accessRestricted", {
						default: "Access Restricted",
					})}
				</p>
				<p
					className="text-xs"
					style={{ color: doctorTheme.textSecondary, opacity: 0.7 }}
				>
					{t("doctor.noPermission", {
						default: "You don't have permission to view this data",
					})}
				</p>
			</div>
		</SectionCard>
	);

	return (
		<div className="px-4 md:px-8 lg:px-12 py-4 lg:py-8 space-y-8">
			{/* Hero / Header */}
			<section
				className="relative overflow-hidden rounded-2xl border shadow-sm"
				style={{
					backgroundImage: `linear-gradient(120deg, ${doctorTheme.primary}, ${doctorTheme.secondary})`,
					borderColor: `${doctorTheme.textSecondary}30`,
				}}
			>
				<div className="absolute inset-0 opacity-10">
					<div className="absolute -left-24 -top-24 h-48 w-48 rounded-full bg-white" />
					<div className="absolute right-0 -bottom-24 h-64 w-64 rounded-full bg-white" />
				</div>
				<div className="relative z-10 px-5 py-5 lg:px-8 lg:py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
					<div className="space-y-2">
						<p className="text-xs font-semibold uppercase tracking-wide text-white/70">
							{t("doctor.medicalRecord", { default: "Medical Record" })}
						</p>
						<h1 className="text-2xl lg:text-3xl font-bold text-white">
							{t("doctor.patientInformation", {
								default: "Patient Information",
							})}
						</h1>
						<p className="text-sm text-white/80 max-w-xl">
							{t("doctor.viewDescription", {
								default:
									"Viewing shared medical data. Access is limited to authorized scopes only.",
							})}
						</p>
					</div>
					<div className="flex flex-wrap gap-3 lg:gap-4">
						<SummaryChip
							icon={<ShieldAlert className="h-3.5 w-3.5" />}
							label={t("doctor.allergies", { default: "Allergies" })}
							value={summary.allergies}
							isAlert
						/>
						<SummaryChip
							icon={<Stethoscope className="h-3.5 w-3.5" />}
							label={t("dataOverview.chips.conditions", {
								default: "Conditions",
							})}
							value={summary.conditions}
						/>
						<SummaryChip
							icon={<Pill className="h-3.5 w-3.5" />}
							label={t("dataOverview.chips.prescriptions", {
								default: "Prescriptions",
							})}
							value={summary.prescriptions}
						/>
					</div>
				</div>
			</section>

			{/* 2-column layout on desktop */}
			<div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
				{/* Left column: basic + allergies + conditions + prescriptions */}
				<div className="space-y-6 lg:col-span-3">
					{isScopeAllowed("basic_profile") ? (
						<SectionCard
							title={t("dataOverview.basicInfo", { default: "Basic Profile" })}
							accentColor={doctorTheme.primary}
						>
							<div className="grid grid-cols-2 gap-3 text-xs lg:text-sm">
								<InfoRow
									label={t("dataOverview.birthDate", { default: "Birth Date" })}
									value={mockProfile.birthDate || "-"}
								/>
								<InfoRow
									label={t("settings.ageBand", { default: "Age band" })}
									value={mockProfile.ageBand || "-"}
								/>
								<InfoRow
									label={t("settings.country", { default: "Nationality" })}
									value={mockProfile.country || "-"}
								/>
								<InfoRow
									label={t("settings.bloodType", { default: "Blood Type" })}
									value={mockProfile.bloodType || "-"}
								/>
								<InfoRow
									label={t("dataOverview.allergies", {
										default: "Food Allergies",
									})}
									value={
										mockProfile.foodAllergies &&
										mockProfile.foodAllergies.length > 0
											? mockProfile.foodAllergies.join(", ")
											: t("dataOverview.none", { default: "None" })
									}
								/>
							</div>
						</SectionCard>
					) : (
						<LockedCard
							title={t("dataOverview.basicInfo", { default: "Basic Profile" })}
							accentColor={doctorTheme.primary}
						/>
					)}

					{isScopeAllowed("allergies") ? (
						<SectionCard
							title={t("doctor.drugAllergies", { default: "Drug Allergies" })}
							accentColor="#EF4444"
							icon={<AlertCircle className="h-4 w-4 text-[#EF4444]" />}
							onClick={() =>
								router.push(`/${locale}/doctor/patient/${patientId}/allergies`)
							}
						>
							{summary.allergies === 0 ? (
								<EmptyState
									label={t("doctor.noAllergies", {
										default: "No drug allergies recorded",
									})}
								/>
							) : (
								<ul className="space-y-2">
									{mockAllergies.slice(0, 3).map((allergy) => (
										<li
											key={allergy.id}
											className="flex items-start justify-between gap-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs lg:text-sm"
										>
											<div className="space-y-0.5">
												<p className="font-medium text-red-900">
													{allergy.substance}
												</p>
												{allergy.symptoms && (
													<p className="text-[11px] lg:text-xs text-red-700">
														{allergy.symptoms}
													</p>
												)}
											</div>
											<span
												className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
													allergy.severity === "severe"
														? "bg-red-100 text-red-800"
														: allergy.severity === "moderate"
															? "bg-orange-100 text-orange-800"
															: "bg-yellow-100 text-yellow-800"
												}`}
											>
												{allergy.severity}
											</span>
										</li>
									))}
								</ul>
							)}
						</SectionCard>
					) : (
						<LockedCard
							title={t("doctor.drugAllergies", { default: "Drug Allergies" })}
							accentColor="#EF4444"
							icon={<AlertCircle className="h-4 w-4 text-[#EF4444]" />}
						/>
					)}

					{isScopeAllowed("conditions") ? (
						<SectionCard
							title={t("dataOverview.conditions", { default: "Conditions" })}
							accentColor="#F97373"
							icon={<Heart className="h-4 w-4 text-[#F97373]" />}
							onClick={() =>
								router.push(`/${locale}/doctor/patient/${patientId}/histories`)
							}
						>
							{summary.conditions === 0 ? (
								<EmptyState
									label={t("dataOverview.noConditions", {
										default: "No conditions registered",
									})}
								/>
							) : (
								<ul className="space-y-2">
									{mockHistories.slice(0, 3).map((history) => (
										<li
											key={history.id}
											className="flex items-start justify-between gap-3 rounded-lg bg-black/5 px-3 py-2 text-xs lg:text-sm"
										>
											<div className="space-y-0.5">
												<p
													className="font-medium"
													style={{ color: doctorTheme.text }}
												>
													{history.diagnosis}
												</p>
												<p
													className="text-[11px] lg:text-xs"
													style={{ color: doctorTheme.textSecondary }}
												>
													{formatDate(history.diagnosisDate)}
												</p>
											</div>
											{history.status && (
												<span className="rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-medium">
													{history.status}
												</span>
											)}
										</li>
									))}
								</ul>
							)}
						</SectionCard>
					) : (
						<LockedCard
							title={t("dataOverview.conditions", { default: "Conditions" })}
							accentColor="#F97373"
							icon={<Heart className="h-4 w-4 text-[#F97373]" />}
						/>
					)}

					{isScopeAllowed("medications") ? (
						<SectionCard
							title={t("dataOverview.prescriptions", {
								default: "Prescriptions",
							})}
							accentColor="#6366F1"
							icon={<FileText className="h-4 w-4 text-[#6366F1]" />}
							onClick={() =>
								router.push(
									`/${locale}/doctor/patient/${patientId}/medications`,
								)
							}
						>
							{summary.prescriptions === 0 ? (
								<EmptyState
									label={t("medications.noPrescriptions", {
										default: "No prescriptions recorded",
									})}
								/>
							) : (
								<div className="space-y-3">
									{mockPrescriptions.slice(0, 3).map((p) => (
										<div
											key={p.id}
											className="rounded-lg border px-3 py-2.5 text-xs lg:text-sm"
											style={{ borderColor: `${doctorTheme.textSecondary}20` }}
										>
											<div className="flex items-start justify-between gap-2 mb-1.5">
												<div>
													<p
														className="font-medium"
														style={{ color: doctorTheme.text }}
													>
														{p.clinic}
													</p>
													<p
														className="text-[11px] lg:text-xs"
														style={{ color: doctorTheme.textSecondary }}
													>
														{formatDate(p.prescriptionDate)}
													</p>
												</div>
												{p.department && (
													<span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
														{p.department}
													</span>
												)}
											</div>
											<p
												className="text-[11px] lg:text-xs"
												style={{ color: doctorTheme.textSecondary }}
											>
												{p.medications
													.slice(0, 2)
													.map((m) => m.drugName)
													.join(" / ")}
												{p.medications.length > 2 && " …"}
											</p>
										</div>
									))}
								</div>
							)}
						</SectionCard>
					) : (
						<LockedCard
							title={t("dataOverview.prescriptions", {
								default: "Prescriptions",
							})}
							accentColor="#6366F1"
							icon={<FileText className="h-4 w-4 text-[#6366F1]" />}
						/>
					)}
				</div>

				{/* Right column: labs + imaging + vitals */}
				<div className="space-y-6 lg:col-span-2">
					{isScopeAllowed("lab_results") ? (
						<SectionCard
							title={t("home.labResults", { default: "Lab Results" })}
							accentColor="#0EA5E9"
							onClick={() =>
								router.push(`/${locale}/doctor/patient/${patientId}/labs`)
							}
						>
							{summary.labs === 0 ? (
								<EmptyState
									label={t("dataOverview.noLabs", {
										default: "No lab results registered",
									})}
								/>
							) : (
								<ul className="space-y-2 text-xs lg:text-sm">
									{mockLabResults.slice(0, 4).map((lab) => (
										<li
											key={lab.id}
											className="flex items-center justify-between rounded-lg bg-black/5 px-3 py-1.5"
										>
											<div>
												<p
													className="font-medium"
													style={{ color: doctorTheme.text }}
												>
													{lab.testName}
												</p>
												<p
													className="text-[11px] lg:text-xs"
													style={{ color: doctorTheme.textSecondary }}
												>
													{formatDate(lab.testDate)}
												</p>
											</div>
											<div className="text-right">
												<p
													className="text-sm font-semibold"
													style={{ color: doctorTheme.text }}
												>
													{lab.value} {lab.unit}
												</p>
												{lab.referenceRange && (
													<p
														className="text-[10px]"
														style={{ color: doctorTheme.textSecondary }}
													>
														{lab.referenceRange}
													</p>
												)}
											</div>
										</li>
									))}
								</ul>
							)}
						</SectionCard>
					) : (
						<LockedCard
							title={t("home.labResults", { default: "Lab Results" })}
							accentColor="#0EA5E9"
						/>
					)}

					{isScopeAllowed("imaging_reports") ? (
						<SectionCard
							title={t("home.imagingData", { default: "Imaging Data" })}
							accentColor="#FB923C"
							icon={<ImageIcon className="h-4 w-4 text-[#FB923C]" />}
							onClick={() =>
								router.push(`/${locale}/doctor/patient/${patientId}/imaging`)
							}
						>
							{summary.imaging === 0 ? (
								<EmptyState
									label={t("dataOverview.noImaging", {
										default: "No imaging data registered",
									})}
								/>
							) : (
								<div className="space-y-2">
									{mockImagingReports.slice(0, 3).map((img) => (
										<div
											key={img.id}
											className="flex items-start justify-between rounded-lg border px-3 py-2 text-xs lg:text-sm"
											style={{ borderColor: `${doctorTheme.textSecondary}20` }}
										>
											<div>
												<p
													className="font-medium"
													style={{ color: doctorTheme.text }}
												>
													{img.type.toUpperCase()} · {img.bodyPart}
												</p>
												<p
													className="text-[11px] lg:text-xs"
													style={{ color: doctorTheme.textSecondary }}
												>
													{formatDate(img.examDate)}
												</p>
											</div>
											{img.findings && (
												<p
													className="ml-3 max-w-[9rem] text-[11px] lg:text-xs line-clamp-2"
													style={{ color: doctorTheme.textSecondary }}
												>
													{img.findings}
												</p>
											)}
										</div>
									))}
								</div>
							)}
						</SectionCard>
					) : (
						<LockedCard
							title={t("home.imagingData", { default: "Imaging Data" })}
							accentColor="#FB923C"
							icon={<ImageIcon className="h-4 w-4 text-[#FB923C]" />}
						/>
					)}

					{isScopeAllowed("vital_signs") ? (
						<SectionCard
							title={t("home.todayVitals", { default: "Vital Signs" })}
							accentColor="#22C55E"
							icon={<Activity className="h-4 w-4 text-[#22C55E]" />}
							onClick={() =>
								router.push(`/${locale}/doctor/patient/${patientId}/vitals`)
							}
						>
							{summary.vitals === 0 ? (
								<EmptyState
									label={t("dataOverview.noVitals", {
										default: "No vital records yet",
									})}
								/>
							) : (
								<div className="grid grid-cols-2 gap-3 text-xs lg:text-sm">
									{mockVitalSigns.slice(0, 3).map((vital) => (
										<div
											key={vital.id}
											className="rounded-lg bg-black/5 px-3 py-2 flex flex-col gap-0.5"
										>
											<p
												className="font-medium"
												style={{ color: doctorTheme.text }}
											>
												{vital.type}
											</p>
											<p className="text-sm font-semibold">
												{vital.value ?? `${vital.systolic}/${vital.diastolic}`}{" "}
												<span
													className="text-[11px]"
													style={{ color: doctorTheme.textSecondary }}
												>
													{vital.unit}
												</span>
											</p>
											<p
												className="text-[10px]"
												style={{ color: doctorTheme.textSecondary }}
											>
												{formatDate(vital.recordedAt)}
											</p>
										</div>
									))}
								</div>
							)}
						</SectionCard>
					) : (
						<LockedCard
							title={t("home.todayVitals", { default: "Vital Signs" })}
							accentColor="#22C55E"
							icon={<Activity className="h-4 w-4 text-[#22C55E]" />}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

interface SummaryChipProps {
	icon: React.ReactNode;
	label: string;
	value: number;
	isAlert?: boolean;
}

function SummaryChip({ icon, label, value, isAlert }: SummaryChipProps) {
	return (
		<div
			className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-white backdrop-blur-sm ${
				isAlert ? "bg-red-500/20 border border-red-300/30" : "bg-white/15"
			}`}
		>
			<div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
				{icon}
			</div>
			<div className="flex items-baseline gap-1">
				<span className="text-sm font-semibold">{value}</span>
				<span className="text-[11px] opacity-80">{label}</span>
			</div>
		</div>
	);
}

interface SectionCardProps {
	title: string;
	accentColor: string;
	icon?: React.ReactNode;
	onClick?: () => void;
	children: React.ReactNode;
}

function SectionCard({
	title,
	accentColor,
	icon,
	onClick,
	children,
}: SectionCardProps) {
	const handleClick = () => {
		if (onClick) onClick();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			if (onClick) onClick();
		}
	};

	return (
		<div
			className={`rounded-2xl border bg-white/70 p-4 lg:p-5 shadow-sm backdrop-blur-sm ${
				onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""
			}`}
			style={{ borderColor: `${accentColor}30` }}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			role={onClick ? "button" : undefined}
			tabIndex={onClick ? 0 : undefined}
		>
			<div className="mb-3 flex items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<div
						className="flex h-7 w-7 items-center justify-center rounded-full"
						style={{ backgroundColor: `${accentColor}20` }}
					>
						{icon ?? (
							<FileText className="h-4 w-4" style={{ color: accentColor }} />
						)}
					</div>
					<h2
						className="text-xs font-semibold uppercase tracking-wide"
						style={{ color: accentColor }}
					>
						{title}
					</h2>
				</div>
				{onClick && (
					<button
						type="button"
						className="text-[11px] font-medium text-gray-500 hover:text-gray-800"
					>
						View All
					</button>
				)}
			</div>
			{children}
		</div>
	);
}

interface InfoRowProps {
	label: string;
	value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
	return (
		<div className="space-y-0.5">
			<p className="text-[11px] font-medium text-gray-500">{label}</p>
			<p className="text-xs lg:text-sm font-medium text-gray-900">{value}</p>
		</div>
	);
}

interface EmptyStateProps {
	label: string;
}

function EmptyState({ label }: EmptyStateProps) {
	return (
		<div className="flex items-center justify-center rounded-lg bg-gray-50 px-3 py-4 text-xs lg:text-sm text-gray-500">
			<span>{label}</span>
		</div>
	);
}
