"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import {
	Activity,
	Droplet,
	Edit2,
	Heart,
	Loader2,
	Thermometer,
	Trash2,
	Weight,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import VitalSignChart from "@/components/VitalSignChart";
import { useApp } from "@/contexts/AppContext";
import { useVitalsPersistence } from "@/hooks/useVitalsPersistence";
import { getTheme } from "@/lib/themes";
import type { VitalSign, VitalSignType } from "@/types";

// 4種類のバイタルのみサポート
const VITAL_TYPES: VitalSignType[] = [
	"blood-pressure",
	"temperature",
	"blood-glucose",
	"weight",
];

export default function VitalsPage() {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const searchParams = useSearchParams();
	const { walletAddress, settings, vitalSigns } = useApp();
	const {
		persistVitals,
		isSaving,
		error: persistError,
	} = useVitalsPersistence();
	const [selectedType, setSelectedType] =
		useState<VitalSignType>("blood-pressure");
	const [period, setPeriod] = useState<"week" | "month" | "3months" | "year">(
		"month",
	);
	const theme = getTheme(settings.theme);
	const currentAccount = useCurrentAccount();

	// Form state
	const [systolic, setSystolic] = useState("");
	const [diastolic, setDiastolic] = useState("");
	const [value, setValue] = useState("");
	const [recordedAt, setRecordedAt] = useState(
		new Date().toISOString().slice(0, 16),
	);
	const [notes, setNotes] = useState("");

	// Edit mode state
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<Partial<VitalSign>>({});

	// Delete confirmation state
	const [deletingId, setDeletingId] = useState<string | null>(null);

	// Set initial type from URL parameter
	useEffect(() => {
		const typeParam = searchParams.get("type") as VitalSignType | null;
		if (typeParam && VITAL_TYPES.includes(typeParam)) {
			setSelectedType(typeParam);
		}
	}, [searchParams]);

	// Redirect if not connected
	const isWalletConnected = currentAccount !== null;
	useEffect(() => {
		if (!walletAddress && !isWalletConnected) {
			router.push(`/${locale}`);
		}
	}, [walletAddress, isWalletConnected, router, locale]);

	// Helper functions
	const getTypeLabel = (type: VitalSignType): string => {
		switch (type) {
			case "blood-pressure":
				return t("vitals.bloodPressure");
			case "blood-glucose":
				return t("vitals.bloodGlucose");
			case "temperature":
				return t("vitals.temperature");
			case "weight":
				return t("vitals.weight");
			default:
				return "";
		}
	};

	const getUnit = (type: VitalSignType): string => {
		switch (type) {
			case "blood-pressure":
				return "mmHg";
			case "blood-glucose":
				return "mg/dL";
			case "temperature":
				return "°C";
			case "weight":
				return "kg";
			default:
				return "";
		}
	};

	const getIcon = (type: VitalSignType) => {
		switch (type) {
			case "blood-pressure":
				return <Heart size={20} className="text-[#FF6B6B]" />;
			case "temperature":
				return <Thermometer size={20} className="text-[#4ECDC4]" />;
			case "blood-glucose":
				return <Droplet size={20} className="text-[#95E1D3]" />;
			case "weight":
				return <Weight size={20} className="text-[#FFE66D]" />;
			default:
				return <Activity size={20} />;
		}
	};

	// Handle save (add new vital)
	const handleSave = async () => {
		if (selectedType === "blood-pressure") {
			if (!systolic || !diastolic) {
				alert(t("vitals.validation.bloodPressureRequired"));
				return;
			}
		} else if (!value) {
			alert(t("vitals.validation.valueRequired"));
			return;
		}

		const vitalSign: VitalSign = {
			id: crypto.randomUUID(),
			type: selectedType,
			recordedAt: new Date(recordedAt).toISOString(),
			unit: getUnit(selectedType),
			notes: notes || undefined,
		};

		if (selectedType === "blood-pressure") {
			vitalSign.systolic = Number.parseFloat(systolic);
			vitalSign.diastolic = Number.parseFloat(diastolic);
		} else {
			vitalSign.value = Number.parseFloat(value);
		}

		try {
			const updatedVitals = [...vitalSigns, vitalSign];
			await persistVitals(updatedVitals);

			// Reset form
			setSystolic("");
			setDiastolic("");
			setValue("");
			setNotes("");
			setRecordedAt(new Date().toISOString().slice(0, 16));
		} catch (err) {
			console.error("[VitalsPage] Save failed:", err);
			alert(err instanceof Error ? err.message : t("vitals.error.saveFailed"));
		}
	};

	// Handle delete
	const handleDelete = async (id: string) => {
		try {
			const updatedVitals = vitalSigns.filter((v) => v.id !== id);
			await persistVitals(updatedVitals);
			setDeletingId(null);
		} catch (err) {
			console.error("[VitalsPage] Delete failed:", err);
			alert(
				err instanceof Error ? err.message : t("vitals.error.deleteFailed"),
			);
		}
	};

	// Handle edit start
	const handleEditStart = (vital: VitalSign) => {
		setEditingId(vital.id);
		setEditForm({
			...vital,
			recordedAt: vital.recordedAt.slice(0, 16), // Format for datetime-local input
		});
	};

	// Handle edit cancel
	const handleEditCancel = () => {
		setEditingId(null);
		setEditForm({});
	};

	// Handle edit save
	const handleEditSave = async () => {
		if (!editingId || !editForm) return;

		try {
			const updatedVitals = vitalSigns.map((v) => {
				if (v.id === editingId) {
					return {
						...v,
						...editForm,
						recordedAt: editForm.recordedAt
							? new Date(editForm.recordedAt).toISOString()
							: v.recordedAt,
					} as VitalSign;
				}
				return v;
			});
			await persistVitals(updatedVitals);
			setEditingId(null);
			setEditForm({});
		} catch (err) {
			console.error("[VitalsPage] Edit failed:", err);
			alert(err instanceof Error ? err.message : t("vitals.error.editFailed"));
		}
	};

	// Filter vitals by selected type
	const filteredVitals = vitalSigns.filter((v) => v.type === selectedType);

	return (
		<div className="px-4 md:px-8 lg:px-12 py-4 lg:py-8 space-y-6 pb-32 lg:pb-8">
			{/* Header - Hide on desktop as it's shown in top bar */}
			<div className="lg:hidden">
				<SectionTitle>{t("vitals.title")}</SectionTitle>
			</div>

			{/* Vital Type Tabs */}
			<div className="grid grid-cols-4 gap-3 lg:gap-4 max-w-3xl mx-auto">
				{VITAL_TYPES.map((type) => (
					<button
						key={type}
						type="button"
						onClick={() => setSelectedType(type)}
						className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300 ${
							selectedType === type
								? "shadow-md scale-105"
								: "opacity-60 hover:opacity-100"
						}`}
						style={{
							backgroundColor:
								selectedType === type
									? `${theme.colors.primary}15`
									: `${theme.colors.surface}80`,
							borderWidth: selectedType === type ? "2px" : "1px",
							borderColor:
								selectedType === type
									? theme.colors.primary
									: `${theme.colors.textSecondary}20`,
						}}
					>
						{getIcon(type)}
						<span
							className="text-[10px] font-bold text-center leading-tight"
							style={{
								color:
									selectedType === type
										? theme.colors.primary
										: theme.colors.textSecondary,
							}}
						>
							{getTypeLabel(type)}
						</span>
					</button>
				))}
			</div>

			{/* Form and Chart Layout */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Input Form */}
				<GlassCard>
					<h3
						className="text-sm font-bold mb-4 uppercase tracking-wider"
						style={{ color: theme.colors.textSecondary }}
					>
						{t("vitals.newRecord")}
					</h3>

					<div className="space-y-4">
						{/* 血圧の場合 */}
						{selectedType === "blood-pressure" ? (
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label
										htmlFor="systolic"
										className="block text-xs font-medium mb-1"
										style={{ color: theme.colors.textSecondary }}
									>
										{t("vitals.systolic")} *
									</label>
									<input
										id="systolic"
										type="number"
										value={systolic}
										onChange={(e) => setSystolic(e.target.value)}
										className="w-full rounded-lg border p-2.5 text-sm"
										style={{
											backgroundColor: theme.colors.surface,
											borderColor: `${theme.colors.textSecondary}40`,
											color: theme.colors.text,
										}}
										placeholder="120"
									/>
								</div>
								<div>
									<label
										htmlFor="diastolic"
										className="block text-xs font-medium mb-1"
										style={{ color: theme.colors.textSecondary }}
									>
										{t("vitals.diastolic")} *
									</label>
									<input
										id="diastolic"
										type="number"
										value={diastolic}
										onChange={(e) => setDiastolic(e.target.value)}
										className="w-full rounded-lg border p-2.5 text-sm"
										style={{
											backgroundColor: theme.colors.surface,
											borderColor: `${theme.colors.textSecondary}40`,
											color: theme.colors.text,
										}}
										placeholder="80"
									/>
								</div>
							</div>
						) : (
							<div>
								<label
									htmlFor="value"
									className="block text-xs font-medium mb-1"
									style={{ color: theme.colors.textSecondary }}
								>
									{getTypeLabel(selectedType)} ({getUnit(selectedType)}) *
								</label>
								<input
									id="value"
									type="number"
									step={selectedType === "temperature" ? "0.1" : "1"}
									value={value}
									onChange={(e) => setValue(e.target.value)}
									className="w-full rounded-lg border p-2.5 text-sm"
									style={{
										backgroundColor: theme.colors.surface,
										borderColor: `${theme.colors.textSecondary}40`,
										color: theme.colors.text,
									}}
									placeholder={
										selectedType === "temperature"
											? "36.5"
											: selectedType === "blood-glucose"
												? "96"
												: "53"
									}
								/>
							</div>
						)}

						{/* 測定日時 */}
						<div>
							<label
								htmlFor="recordedAt"
								className="block text-xs font-medium mb-1"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("vitals.recordedAt")} *
							</label>
							<input
								id="recordedAt"
								type="datetime-local"
								value={recordedAt}
								onChange={(e) => setRecordedAt(e.target.value)}
								className="w-full rounded-lg border p-2.5 text-sm"
								style={{
									backgroundColor: theme.colors.surface,
									borderColor: `${theme.colors.textSecondary}40`,
									color: theme.colors.text,
								}}
							/>
						</div>

						{/* メモ */}
						<div>
							<label
								htmlFor="notes"
								className="block text-xs font-medium mb-1"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("vitals.notes")}
							</label>
							<textarea
								id="notes"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								className="w-full rounded-lg border p-2.5 text-sm"
								rows={2}
								style={{
									backgroundColor: theme.colors.surface,
									borderColor: `${theme.colors.textSecondary}40`,
									color: theme.colors.text,
								}}
								placeholder={t("vitals.notesPlaceholder")}
							/>
						</div>

						{/* 保存ボタン */}
						<button
							type="button"
							onClick={handleSave}
							disabled={isSaving}
							className="w-full rounded-lg p-3 font-medium text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
							style={{
								backgroundImage: `linear-gradient(to top right, ${theme.colors.primary}, ${theme.colors.secondary})`,
							}}
						>
							{isSaving ? (
								<>
									<Loader2 size={18} className="animate-spin" />
									{t("vitals.saving")}
								</>
							) : (
								t("vitals.saveRecord")
							)}
						</button>

						{/* Error display */}
						{persistError && (
							<p className="text-xs text-red-500 mt-2">{persistError}</p>
						)}
					</div>
				</GlassCard>

				{/* Chart Section */}
				<div className="space-y-4">
					{/* Period Selector */}
					<div className="flex items-center justify-between">
						<h3
							className="text-sm font-bold uppercase tracking-wider"
							style={{ color: theme.colors.textSecondary }}
						>
							{t("vitals.dataHistory")}
						</h3>
						<select
							value={period}
							onChange={(e) =>
								setPeriod(
									e.target.value as "week" | "month" | "3months" | "year",
								)
							}
							className="rounded-lg border px-3 py-1.5 text-xs font-medium"
							style={{
								backgroundColor: theme.colors.surface,
								borderColor: `${theme.colors.textSecondary}40`,
								color: theme.colors.text,
							}}
						>
							<option value="week">{t("vitals.period.week")}</option>
							<option value="month">{t("vitals.period.month")}</option>
							<option value="3months">{t("vitals.period.3months")}</option>
							<option value="year">{t("vitals.period.year")}</option>
						</select>
					</div>

					{/* Chart */}
					<GlassCard>
						<VitalSignChart
							vitalSigns={vitalSigns}
							type={selectedType}
							period={period}
							themeId={settings.theme}
						/>
					</GlassCard>
				</div>
			</div>

			{/* Data List Section */}
			<GlassCard>
				<h3
					className="text-sm font-bold mb-4 uppercase tracking-wider"
					style={{ color: theme.colors.textSecondary }}
				>
					{t("vitals.records")} ({filteredVitals.length})
				</h3>

				{filteredVitals.length === 0 ? (
					<p
						className="text-sm text-center py-8"
						style={{ color: theme.colors.textSecondary }}
					>
						{t("vitals.noRecords")}
					</p>
				) : (
					<div className="space-y-3">
						{filteredVitals
							.sort(
								(a, b) =>
									new Date(b.recordedAt).getTime() -
									new Date(a.recordedAt).getTime(),
							)
							.map((vital) => (
								<div
									key={vital.id}
									className="flex items-center justify-between p-3 rounded-lg"
									style={{
										backgroundColor: `${theme.colors.surface}80`,
										borderWidth: "1px",
										borderColor: `${theme.colors.textSecondary}20`,
									}}
								>
									{editingId === vital.id ? (
										// Edit mode
										<div className="flex-1 space-y-3">
											<div className="grid grid-cols-2 gap-3">
												{vital.type === "blood-pressure" ? (
													<>
														<input
															type="number"
															value={editForm.systolic || ""}
															onChange={(e) =>
																setEditForm({
																	...editForm,
																	systolic: Number.parseFloat(e.target.value),
																})
															}
															className="w-full rounded-lg border p-2 text-sm"
															style={{
																backgroundColor: theme.colors.surface,
																borderColor: `${theme.colors.textSecondary}40`,
																color: theme.colors.text,
															}}
															placeholder={t("vitals.systolic")}
														/>
														<input
															type="number"
															value={editForm.diastolic || ""}
															onChange={(e) =>
																setEditForm({
																	...editForm,
																	diastolic: Number.parseFloat(e.target.value),
																})
															}
															className="w-full rounded-lg border p-2 text-sm"
															style={{
																backgroundColor: theme.colors.surface,
																borderColor: `${theme.colors.textSecondary}40`,
																color: theme.colors.text,
															}}
															placeholder={t("vitals.diastolic")}
														/>
													</>
												) : (
													<input
														type="number"
														value={editForm.value || ""}
														onChange={(e) =>
															setEditForm({
																...editForm,
																value: Number.parseFloat(e.target.value),
															})
														}
														className="w-full rounded-lg border p-2 text-sm col-span-2"
														style={{
															backgroundColor: theme.colors.surface,
															borderColor: `${theme.colors.textSecondary}40`,
															color: theme.colors.text,
														}}
														placeholder={getTypeLabel(vital.type)}
													/>
												)}
											</div>
											<input
												type="datetime-local"
												value={editForm.recordedAt || ""}
												onChange={(e) =>
													setEditForm({
														...editForm,
														recordedAt: e.target.value,
													})
												}
												className="w-full rounded-lg border p-2 text-sm"
												style={{
													backgroundColor: theme.colors.surface,
													borderColor: `${theme.colors.textSecondary}40`,
													color: theme.colors.text,
												}}
											/>
											<div className="flex gap-2">
												<button
													type="button"
													onClick={handleEditSave}
													disabled={isSaving}
													className="flex-1 rounded-lg p-2 text-xs font-medium text-white flex items-center justify-center gap-1"
													style={{
														backgroundColor: theme.colors.primary,
													}}
												>
													{isSaving ? (
														<Loader2 size={14} className="animate-spin" />
													) : (
														t("common.save")
													)}
												</button>
												<button
													type="button"
													onClick={handleEditCancel}
													disabled={isSaving}
													className="flex-1 rounded-lg p-2 text-xs font-medium"
													style={{
														backgroundColor: `${theme.colors.textSecondary}20`,
														color: theme.colors.text,
													}}
												>
													{t("common.cancel")}
												</button>
											</div>
										</div>
									) : deletingId === vital.id ? (
										// Delete confirmation mode
										<div className="flex-1">
											<p
												className="text-sm mb-3"
												style={{ color: theme.colors.text }}
											>
												{t("vitals.confirmDelete")}
											</p>
											<div className="flex gap-2">
												<button
													type="button"
													onClick={() => handleDelete(vital.id)}
													disabled={isSaving}
													className="flex-1 rounded-lg p-2 text-xs font-medium text-white flex items-center justify-center gap-1"
													style={{
														backgroundColor: "#EF4444",
													}}
												>
													{isSaving ? (
														<Loader2 size={14} className="animate-spin" />
													) : (
														t("common.delete")
													)}
												</button>
												<button
													type="button"
													onClick={() => setDeletingId(null)}
													disabled={isSaving}
													className="flex-1 rounded-lg p-2 text-xs font-medium"
													style={{
														backgroundColor: `${theme.colors.textSecondary}20`,
														color: theme.colors.text,
													}}
												>
													{t("common.cancel")}
												</button>
											</div>
										</div>
									) : (
										// Normal display mode
										<>
											<div className="flex items-center gap-3">
												{getIcon(vital.type)}
												<div>
													<p
														className="text-sm font-medium"
														style={{ color: theme.colors.text }}
													>
														{vital.type === "blood-pressure"
															? `${vital.systolic}/${vital.diastolic} ${vital.unit}`
															: `${vital.value} ${vital.unit}`}
													</p>
													<p
														className="text-xs"
														style={{ color: theme.colors.textSecondary }}
													>
														{new Date(vital.recordedAt).toLocaleString(locale)}
													</p>
													{vital.notes && (
														<p
															className="text-xs mt-1"
															style={{ color: theme.colors.textSecondary }}
														>
															{vital.notes}
														</p>
													)}
												</div>
											</div>
											<div className="flex items-center gap-2">
												<button
													type="button"
													onClick={() => handleEditStart(vital)}
													disabled={isSaving}
													className="p-2 rounded-lg transition-all hover:scale-105"
													style={{
														backgroundColor: `${theme.colors.primary}15`,
														color: theme.colors.primary,
													}}
													title={t("common.edit")}
												>
													<Edit2 size={16} />
												</button>
												<button
													type="button"
													onClick={() => setDeletingId(vital.id)}
													disabled={isSaving}
													className="p-2 rounded-lg transition-all hover:scale-105"
													style={{
														backgroundColor: "#FEE2E2",
														color: "#EF4444",
													}}
													title={t("common.delete")}
												>
													<Trash2 size={16} />
												</button>
											</div>
										</>
									)}
								</div>
							))}
					</div>
				)}
			</GlassCard>
		</div>
	);
}
