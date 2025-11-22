"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { Activity, Droplet, Heart, Thermometer, Weight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import VitalSignChart from "@/components/VitalSignChart";
import { useApp } from "@/contexts/AppContext";
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
	const { walletAddress, settings, vitalSigns, addVitalSign } = useApp();
	const [selectedType, setSelectedType] = useState<VitalSignType>("blood-pressure");
	const [period, setPeriod] = useState<"week" | "month" | "3months" | "year">("month");
	const theme = getTheme(settings.theme);
	const currentAccount = useCurrentAccount();

	// Form state
	const [systolic, setSystolic] = useState("");
	const [diastolic, setDiastolic] = useState("");
	const [value, setValue] = useState("");
	const [recordedAt, setRecordedAt] = useState(new Date().toISOString().slice(0, 16));
	const [notes, setNotes] = useState("");

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

	// Handle save
	const handleSave = () => {
		if (selectedType === "blood-pressure") {
			if (!systolic || !diastolic) {
				alert("最高血圧と最低血圧を入力してください");
				return;
			}
		} else if (!value) {
			alert("値を入力してください");
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

		addVitalSign(vitalSign);

		// Reset form
		setSystolic("");
		setDiastolic("");
		setValue("");
		setNotes("");
		setRecordedAt(new Date().toISOString().slice(0, 16));
	};

	return (
		<div className="px-6 py-4 space-y-6 pb-32">
			{/* Header */}
			<SectionTitle>{t("vitals.title")}</SectionTitle>

			{/* Vital Type Tabs */}
			<div className="grid grid-cols-4 gap-2">
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

			{/* Input Form */}
			<GlassCard>
				<h3
					className="text-sm font-bold mb-4 uppercase tracking-wider"
					style={{ color: theme.colors.textSecondary }}
				>
					新しいデータを記録
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
							placeholder="メモを入力..."
						/>
					</div>

					{/* 保存ボタン */}
					<button
						type="button"
						onClick={handleSave}
						className="w-full rounded-lg p-3 font-medium text-white transition-all hover:scale-[1.02] active:scale-95"
						style={{
							backgroundImage: `linear-gradient(to top right, ${theme.colors.primary}, ${theme.colors.secondary})`,
						}}
					>
						記録を保存
					</button>
				</div>
			</GlassCard>

			{/* Period Selector */}
			<div className="flex items-center justify-between">
				<h3
					className="text-sm font-bold uppercase tracking-wider"
					style={{ color: theme.colors.textSecondary }}
				>
					データ履歴
				</h3>
				<select
					value={period}
					onChange={(e) =>
						setPeriod(e.target.value as "week" | "month" | "3months" | "year")
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
	);
}
