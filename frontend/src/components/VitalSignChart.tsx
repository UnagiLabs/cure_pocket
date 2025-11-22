"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { getTheme } from "@/lib/themes";
import type { ThemeId, VitalSign, VitalSignType } from "@/types";

/**
 * バイタルデータのグラフ表示コンポーネント
 * Rechartsを使用して時系列データを可視化
 */
interface VitalSignChartProps {
	vitalSigns: VitalSign[];
	type: VitalSignType;
	period?: "week" | "month" | "3months" | "year";
	themeId?: ThemeId;
}

export default function VitalSignChart({
	vitalSigns,
	type,
	period = "month",
	themeId = "classic-blue",
}: VitalSignChartProps) {
	const t = useTranslations();
	const theme = getTheme(themeId);

	// 指定されたタイプのデータをフィルタリング
	const filteredData = useMemo(() => {
		return vitalSigns.filter((vital) => vital.type === type);
	}, [vitalSigns, type]);

	// 期間でフィルタリング
	const periodFilteredData = useMemo(() => {
		const now = new Date();
		const periodMs = {
			week: 7 * 24 * 60 * 60 * 1000,
			month: 30 * 24 * 60 * 60 * 1000,
			"3months": 90 * 24 * 60 * 60 * 1000,
			year: 365 * 24 * 60 * 60 * 1000,
		};

		const cutoff = new Date(now.getTime() - periodMs[period]);

		return filteredData.filter((vital) => {
			const recordedDate = new Date(vital.recordedAt);
			return recordedDate >= cutoff;
		});
	}, [filteredData, period]);

	// グラフ用データを準備
	const chartData = useMemo(() => {
		return periodFilteredData
			.sort(
				(a, b) =>
					new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
			)
			.map((vital) => {
				const date = new Date(vital.recordedAt);
				const dateStr = date.toLocaleDateString("ja-JP", {
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				});

				if (type === "blood-pressure") {
					return {
						date: dateStr,
						timestamp: date.getTime(),
						systolic: vital.systolic,
						diastolic: vital.diastolic,
					};
				} else {
					return {
						date: dateStr,
						timestamp: date.getTime(),
						value: vital.value,
					};
				}
			});
	}, [periodFilteredData, type]);

	// タイプに応じたラベルを取得
	const getTypeLabel = (vitalType: VitalSignType): string => {
		switch (vitalType) {
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

	// 単位を取得
	const getUnit = (vitalType: VitalSignType): string => {
		switch (vitalType) {
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

	if (chartData.length === 0) {
		return (
			<div
				className="flex h-64 items-center justify-center rounded-lg"
				style={{ backgroundColor: theme.colors.surface }}
			>
				<p style={{ color: theme.colors.textSecondary }}>
					{t("vitals.noData")}
				</p>
			</div>
		);
	}

	return (
		<div className="w-full">
			<h3
				className="mb-4 text-lg font-semibold"
				style={{ color: theme.colors.text }}
			>
				{getTypeLabel(type)} ({getUnit(type)})
			</h3>
			<ResponsiveContainer width="100%" height={300}>
				<LineChart
					data={chartData}
					margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
				>
					<CartesianGrid
						strokeDasharray="3 3"
						stroke={`${theme.colors.textSecondary}40`}
					/>
					<XAxis
						dataKey="date"
						stroke={theme.colors.textSecondary}
						style={{ fontSize: "12px" }}
					/>
					<YAxis
						stroke={theme.colors.textSecondary}
						style={{ fontSize: "12px" }}
					/>
					<Tooltip
						contentStyle={{
							backgroundColor: theme.colors.surface,
							border: `1px solid ${theme.colors.textSecondary}40`,
							borderRadius: "8px",
							color: theme.colors.text,
						}}
					/>
					<Legend />
					{type === "blood-pressure" ? (
						<>
							<Line
								type="monotone"
								dataKey="systolic"
								stroke={theme.colors.primary}
								strokeWidth={2}
								name={t("vitals.systolic")}
								dot={{ r: 4 }}
							/>
							<Line
								type="monotone"
								dataKey="diastolic"
								stroke={theme.colors.accent}
								strokeWidth={2}
								name={t("vitals.diastolic")}
								dot={{ r: 4 }}
							/>
						</>
					) : (
						<Line
							type="monotone"
							dataKey="value"
							stroke={theme.colors.primary}
							strokeWidth={2}
							name={getTypeLabel(type)}
							dot={{ r: 4 }}
						/>
					)}
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
