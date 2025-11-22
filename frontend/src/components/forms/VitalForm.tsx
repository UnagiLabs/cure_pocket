"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";
import type { VitalSign, VitalSignType } from "@/types";

type VitalFormProps = {
	onSaved?: (vital: VitalSign) => void;
	onCancel?: () => void;
};

// バリデーションスキーマ（条件付き検証付き）
const vitalFormSchema = z
	.object({
		type: z.enum([
			"blood-pressure",
			"heart-rate",
			"blood-glucose",
			"temperature",
			"weight",
		]),
		systolic: z
			.string()
			.regex(/^-?\d+(\.\d+)?$/, "数値を入力してください")
			.optional()
			.or(z.literal("")),
		diastolic: z
			.string()
			.regex(/^-?\d+(\.\d+)?$/, "数値を入力してください")
			.optional()
			.or(z.literal("")),
		value: z
			.string()
			.regex(/^-?\d+(\.\d+)?$/, "数値を入力してください")
			.optional()
			.or(z.literal("")),
		recordedAt: z.string().min(1, "測定日時を選択してください"),
		notes: z.string().optional(),
	})
	.refine(
		(data) => {
			if (data.type === "blood-pressure") {
				return (
					data.systolic &&
					data.systolic !== "" &&
					data.diastolic &&
					data.diastolic !== ""
				);
			}
			return data.value && data.value !== "";
		},
		{
			message: "必要な値を入力してください",
			path: ["value"],
		},
	);

type VitalFormData = z.infer<typeof vitalFormSchema>;

export function VitalForm({ onSaved, onCancel }: VitalFormProps) {
	const t = useTranslations();
	const { settings, addVitalSign } = useApp();
	const theme = getTheme(settings.theme);

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<VitalFormData>({
		resolver: zodResolver(vitalFormSchema),
		mode: "onBlur",
		defaultValues: {
			type: "blood-pressure",
			systolic: "",
			diastolic: "",
			value: "",
			recordedAt: new Date().toISOString().slice(0, 16),
			notes: "",
		},
	});

	const type = watch("type");

	const getUnit = (vitalType: VitalSignType): string => {
		switch (vitalType) {
			case "blood-pressure":
				return "mmHg";
			case "heart-rate":
				return "bpm";
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

	const getTypeLabel = (vitalType: VitalSignType): string => {
		switch (vitalType) {
			case "blood-pressure":
				return t("vitals.bloodPressure");
			case "heart-rate":
				return t("vitals.heartRate");
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

	const onSubmit = (data: VitalFormData) => {
		const vitalSign: VitalSign = {
			id: uuidv4(),
			type: data.type,
			recordedAt: new Date(data.recordedAt).toISOString(),
			unit: getUnit(data.type),
			notes: data.notes || undefined,
		};

		if (data.type === "blood-pressure") {
			vitalSign.systolic = Number.parseFloat(data.systolic || "0");
			vitalSign.diastolic = Number.parseFloat(data.diastolic || "0");
		} else {
			vitalSign.value = Number.parseFloat(data.value || "0");
		}

		addVitalSign(vitalSign);
		onSaved?.(vitalSign);
	};

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="space-y-4 md:max-w-2xl md:mx-auto"
		>
			{/* タイプ選択 */}
			<div>
				<label
					htmlFor="type"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("vitals.type")} *
				</label>
				<select
					id="type"
					{...register("type")}
					onChange={(e) => {
						const nextType = e.target.value as VitalSignType;
						setValue("type", nextType);
						setValue("systolic", "");
						setValue("diastolic", "");
						setValue("value", "");
					}}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
				>
					<option value="blood-pressure">{t("vitals.bloodPressure")}</option>
					<option value="heart-rate">{t("vitals.heartRate")}</option>
					<option value="blood-glucose">{t("vitals.bloodGlucose")}</option>
					<option value="temperature">{t("vitals.temperature")}</option>
					<option value="weight">{t("vitals.weight")}</option>
				</select>
			</div>

			{/* 血圧の場合 */}
			{type === "blood-pressure" ? (
				<div className="grid grid-cols-2 gap-4">
					<div>
						<label
							htmlFor="systolic"
							className="mb-1 block text-sm font-medium"
							style={{ color: theme.colors.text }}
						>
							{t("vitals.systolic")} *
						</label>
						<input
							id="systolic"
							type="number"
							{...register("systolic")}
							className="w-full rounded-lg border p-3"
							style={{
								backgroundColor: theme.colors.surface,
								borderColor: errors.systolic
									? "#ef4444"
									: `${theme.colors.textSecondary}40`,
								color: theme.colors.text,
							}}
							placeholder="120"
						/>
						{errors.systolic && (
							<p className="mt-1 text-sm text-red-500">
								{errors.systolic.message}
							</p>
						)}
					</div>
					<div>
						<label
							htmlFor="diastolic"
							className="mb-1 block text-sm font-medium"
							style={{ color: theme.colors.text }}
						>
							{t("vitals.diastolic")} *
						</label>
						<input
							id="diastolic"
							type="number"
							{...register("diastolic")}
							className="w-full rounded-lg border p-3"
							style={{
								backgroundColor: theme.colors.surface,
								borderColor: errors.diastolic
									? "#ef4444"
									: `${theme.colors.textSecondary}40`,
								color: theme.colors.text,
							}}
							placeholder="80"
						/>
						{errors.diastolic && (
							<p className="mt-1 text-sm text-red-500">
								{errors.diastolic.message}
							</p>
						)}
					</div>
				</div>
			) : (
				<div>
					<label
						htmlFor="value"
						className="mb-1 block text-sm font-medium"
						style={{ color: theme.colors.text }}
					>
						{getTypeLabel(type)} *
					</label>
					<input
						id="value"
						type="number"
						{...register("value")}
						className="w-full rounded-lg border p-3"
						style={{
							backgroundColor: theme.colors.surface,
							borderColor: errors.value
								? "#ef4444"
								: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
						placeholder="0"
					/>
					{errors.value && (
						<p className="mt-1 text-sm text-red-500">{errors.value.message}</p>
					)}
				</div>
			)}

			{/* 測定日時 */}
			<div>
				<label
					htmlFor="recordedAt"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("vitals.recordedAt")} *
				</label>
				<input
					id="recordedAt"
					type="datetime-local"
					{...register("recordedAt")}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: errors.recordedAt
							? "#ef4444"
							: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
				/>
				{errors.recordedAt && (
					<p className="mt-1 text-sm text-red-500">
						{errors.recordedAt.message}
					</p>
				)}
			</div>

			{/* メモ */}
			<div>
				<label
					htmlFor="notes"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("vitals.notes")}
				</label>
				<textarea
					id="notes"
					{...register("notes")}
					className="w-full rounded-lg border p-3"
					rows={3}
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("vitals.notes")}
				/>
			</div>

			{/* 保存ボタン */}
			<div className="flex gap-3 pt-4">
				<button
					type="button"
					onClick={onCancel}
					className="flex-1 rounded-lg border-2 p-3 font-medium transition-colors"
					style={{
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
				>
					{t("actions.cancel")}
				</button>
				<button
					type="submit"
					disabled={isSubmitting}
					className="flex-1 rounded-lg p-3 font-medium text-white transition-colors disabled:opacity-50"
					style={{ backgroundColor: theme.colors.primary }}
				>
					{isSubmitting ? t("actions.saving") : t("actions.save")}
				</button>
			</div>
		</form>
	);
}
