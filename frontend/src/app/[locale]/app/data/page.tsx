"use client";

import { Activity, FileText, Heart, Image as ImageIcon, Pill, Stethoscope } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";

export default function DataOverviewPage() {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const {
		profile,
		medicalHistories,
		prescriptions,
		labResults,
		imagingReports,
		vitalSigns,
		settings,
	} = useApp();
	const theme = getTheme(settings.theme);

	const summary = useMemo(
		() => ({
			conditions: medicalHistories.length,
			prescriptions: prescriptions.length,
			labs: labResults.length,
			imaging: imagingReports.length,
			vitals: vitalSigns.length,
		}),
		[medicalHistories.length, prescriptions.length, labResults.length, imagingReports.length, vitalSigns.length],
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

	return (
		<div className="px-4 md:px-8 lg:px-12 py-4 lg:py-8 pb-24 lg:pb-8 space-y-8">
			{/* Hero / Header */}
			<section
				className="relative overflow-hidden rounded-2xl border shadow-sm"
				style={{
					backgroundImage: `linear-gradient(120deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
					borderColor: `${theme.colors.textSecondary}30`,
				}}
			>
				<div className="absolute inset-0 opacity-10">
					<div className="absolute -left-24 -top-24 h-48 w-48 rounded-full bg-white" />
					<div className="absolute right-0 -bottom-24 h-64 w-64 rounded-full bg-white" />
				</div>
				<div className="relative z-10 px-5 py-5 lg:px-8 lg:py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
					<div className="space-y-2">
						<p className="text-xs font-semibold uppercase tracking-wide text-white/70">
							{t("appName")}
						</p>
						<h1 className="text-2xl lg:text-3xl font-bold text-white">
							{t("passport.title")}
						</h1>
						<p className="text-sm text-white/80 max-w-xl">
							{t("dataOverview.description", {
								default:
									"SBT に保存されたあなたの基本情報・疾病・お薬・検査値・画像・バイタルを、一目で確認できるダッシュボードです。",
							})}
						</p>
					</div>
					<div className="flex flex-wrap gap-3 lg:gap-4">
						<SummaryChip
							icon={<Stethoscope className="h-3.5 w-3.5" />}
							label={t("dataOverview.chips.conditions", { default: "Conditions" })}
							value={summary.conditions}
						/>
						<SummaryChip
							icon={<Pill className="h-3.5 w-3.5" />}
							label={t("dataOverview.chips.prescriptions", { default: "Prescriptions" })}
							value={summary.prescriptions}
						/>
						<SummaryChip
							icon={<Activity className="h-3.5 w-3.5" />}
							label={t("dataOverview.chips.vitals", { default: "Vitals" })}
							value={summary.vitals}
						/>
					</div>
				</div>
			</section>

			{/* 2-column layout on desktop */}
			<div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
				{/* Left column: basic + disease + prescriptions */}
				<div className="space-y-6 lg:col-span-3">
					<SectionCard
						title={t("dataOverview.basicInfo", { default: "Basic Profile" })}
						accentColor={theme.colors.primary}
						onClickEdit={() => router.push(`/${locale}/app/settings`)}
					>
						<div className="grid grid-cols-2 gap-3 text-xs lg:text-sm">
							<InfoRow
								label={t("settings.displayName", { default: "Display name" })}
								value={profile?.displayName || t("dataOverview.empty", { default: "Not set" })}
							/>
							<InfoRow
								label={t("settings.ageBand", { default: "Age band" })}
								value={profile?.ageBand || t("dataOverview.empty", { default: "Not set" })}
							/>
							<InfoRow
								label={t("settings.country", { default: "Country" })}
								value={profile?.country || t("dataOverview.empty", { default: "Not set" })}
							/>
							<InfoRow
								label={t("vitals.weight", { default: "Weight" })}
								value={
									profile?.weight
										? `${profile.weight} kg`
										: t("dataOverview.empty", { default: "Not set" })
								}
							/>
						</div>
					</SectionCard>

					<SectionCard
						title={t("dataOverview.conditions", { default: "Conditions" })}
						accentColor="#F97373"
						icon={<Heart className="h-4 w-4 text-[#F97373]" />}
						onClickEdit={() => router.push(`/${locale}/app/histories`)}
					>
						{summary.conditions === 0 ? (
							<EmptyState
								label={t("dataOverview.noConditions", {
									default: "No conditions registered",
								})}
								actionLabel={t("allergies.add", { default: "Add" })}
							/>
						) : (
							<ul className="space-y-2">
								{medicalHistories.slice(0, 3).map((history) => (
									<li
										key={history.id}
										className="flex items-start justify-between gap-3 rounded-lg bg-black/5 px-3 py-2 text-xs lg:text-sm"
									>
										<div className="space-y-0.5">
											<p className="font-medium" style={{ color: theme.colors.text }}>
												{history.conditionName}
											</p>
											<p className="text-[11px] lg:text-xs" style={{ color: theme.colors.textSecondary }}>
												{formatDate(history.diagnosedAt)}
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

					<SectionCard
						title={t("dataOverview.prescriptions", { default: "Prescriptions" })}
						accentColor="#6366F1"
						icon={<FileText className="h-4 w-4 text-[#6366F1]" />}
						onClickEdit={() => router.push(`/${locale}/app/medications`)}
					>
						{summary.prescriptions === 0 ? (
							<EmptyState
								label={t("medications.noPrescriptions")}
								actionLabel={t("medications.addFirstPrescription")}
								onClickAction={() => router.push(`/${locale}/app/add/medication`)}
							/>
						) : (
							<div className="space-y-3">
								{prescriptions.slice(0, 3).map((p) => (
									<div
										key={p.id}
										className="rounded-lg border px-3 py-2.5 text-xs lg:text-sm"
										style={{ borderColor: `${theme.colors.textSecondary}20` }}
									>
										<div className="flex items-start justify-between gap-2 mb-1.5">
											<div>
												<p className="font-medium" style={{ color: theme.colors.text }}>
													{p.clinic}
												</p>
												<p
													className="text-[11px] lg:text-xs"
													style={{ color: theme.colors.textSecondary }}
												>
													{formatDate(p.prescriptionDate)}
												</p>
											</div>
											<span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
												{t("medications.morning")}
											</span>
										</div>
										<p
											className="text-[11px] lg:text-xs"
											style={{ color: theme.colors.textSecondary }}
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
				</div>

				{/* Right column: labs + imaging + vitals */}
				<div className="space-y-6 lg:col-span-2">
					<SectionCard
						title={t("home.labResults")}
						accentColor="#0EA5E9"
						onClickEdit={() => router.push(`/${locale}/app/labs`)}
					>
						{summary.labs === 0 ? (
							<EmptyState
								label={t("dataOverview.noLabs", { default: "No lab results registered" })}
							/>
						) : (
							<ul className="space-y-2 text-xs lg:text-sm">
								{labResults.slice(0, 4).map((lab) => (
									<li
										key={lab.id}
										className="flex items-center justify-between rounded-lg bg-black/5 px-3 py-1.5"
									>
										<div>
											<p className="font-medium" style={{ color: theme.colors.text }}>
												{lab.testName}
											</p>
											<p
												className="text-[11px] lg:text-xs"
												style={{ color: theme.colors.textSecondary }}
											>
												{formatDate(lab.collectedAt)}
											</p>
										</div>
										<div className="text-right">
											<p className="text-sm font-semibold" style={{ color: theme.colors.text }}>
												{lab.value} {lab.unit}
											</p>
											{lab.referenceRange && (
												<p className="text-[10px]" style={{ color: theme.colors.textSecondary }}>
													{lab.referenceRange}
												</p>
											)}
										</div>
									</li>
								))}
							</ul>
						)}
					</SectionCard>

					<SectionCard
						title={t("home.imagingData")}
						accentColor="#FB923C"
						icon={<ImageIcon className="h-4 w-4 text-[#FB923C]" />}
						onClickEdit={() => router.push(`/${locale}/app/imaging`)}
					>
						{summary.imaging === 0 ? (
							<EmptyState
								label={t("dataOverview.noImaging", { default: "No imaging data registered" })}
							/>
						) : (
							<div className="space-y-2">
								{imagingReports.slice(0, 3).map((img) => (
									<div
										key={img.id}
										className="flex items-start justify-between rounded-lg border px-3 py-2 text-xs lg:text-sm"
										style={{ borderColor: `${theme.colors.textSecondary}20` }}
									>
										<div>
											<p className="font-medium" style={{ color: theme.colors.text }}>
												{img.modality} · {img.bodyPart}
											</p>
											<p
												className="text-[11px] lg:text-xs"
												style={{ color: theme.colors.textSecondary }}
											>
												{formatDate(img.performedAt)}
											</p>
										</div>
										{img.findings && (
											<p
												className="ml-3 max-w-[9rem] text-[11px] lg:text-xs line-clamp-2"
												style={{ color: theme.colors.textSecondary }}
											>
												{img.findings}
											</p>
										)}
									</div>
								))}
							</div>
						)}
					</SectionCard>

					<SectionCard
						title={t("home.todayVitals")}
						accentColor="#22C55E"
						icon={<Activity className="h-4 w-4 text-[#22C55E]" />}
						onClickEdit={() => router.push(`/${locale}/app/vitals`)}
					>
						{summary.vitals === 0 ? (
							<EmptyState
								label={t("dataOverview.noVitals", { default: "No vital records yet" })}
								actionLabel={t("add.vitalsDescription")}
								onClickAction={() => router.push(`/${locale}/app/add/vital`)}
							/>
						) : (
							<div className="grid grid-cols-2 gap-3 text-xs lg:text-sm">
								{/* 最新3件だけ簡易表示 */}
								{vitalSigns.slice(0, 3).map((vital) => (
									<div
										key={vital.id}
										className="rounded-lg bg-black/5 px-3 py-2 flex flex-col gap-0.5"
									>
										<p className="font-medium" style={{ color: theme.colors.text }}>
											{vital.type}
										</p>
										<p className="text-sm font-semibold">
											{vital.value ?? `${vital.systolic}/${vital.diastolic}`}{" "}
											<span className="text-[11px]" style={{ color: theme.colors.textSecondary }}>
												{vital.unit}
											</span>
										</p>
										<p
											className="text-[10px]"
											style={{ color: theme.colors.textSecondary }}
										>
											{formatDate(vital.recordedAt)}
										</p>
									</div>
								))}
							</div>
						)}
					</SectionCard>
				</div>
			</div>
		</div>
	);
}

interface SummaryChipProps {
	icon: React.ReactNode;
	label: string;
	value: number;
}

function SummaryChip({ icon, label, value }: SummaryChipProps) {
	return (
		<div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
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
	onClickEdit?: () => void;
	children: React.ReactNode;
}

function SectionCard({ title, accentColor, icon, onClickEdit, children }: SectionCardProps) {
	return (
		<section
			className="rounded-2xl border bg-white/70 p-4 lg:p-5 shadow-sm backdrop-blur-sm"
			style={{ borderColor: `${accentColor}30` }}
		>
			<div className="mb-3 flex items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<div
						className="flex h-7 w-7 items-center justify-center rounded-full"
						style={{ backgroundColor: `${accentColor}20` }}
					>
						{icon ?? <FileText className="h-4 w-4" style={{ color: accentColor }} />}
					</div>
					<h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: accentColor }}>
						{title}
					</h2>
				</div>
				{onClickEdit && (
					<button
						type="button"
						onClick={onClickEdit}
						className="text-[11px] font-medium text-gray-500 hover:text-gray-800"
					>
						Edit
					</button>
				)}
			</div>
			{children}
		</section>
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
	actionLabel?: string;
	onClickAction?: () => void;
}

function EmptyState({ label, actionLabel, onClickAction }: EmptyStateProps) {
	return (
		<div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs lg:text-sm text-gray-500">
			<span>{label}</span>
			{actionLabel && onClickAction && (
				<button
					type="button"
					onClick={onClickAction}
					className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
				>
					{actionLabel}
				</button>
			)}
		</div>
	);
}
