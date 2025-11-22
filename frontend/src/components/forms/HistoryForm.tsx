"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";
import type { MedicalHistory, MedicalHistoryType } from "@/types";

type HistoryFormProps = {
	onSaved?: (history: MedicalHistory) => void;
	onCancel?: () => void;
};

// バリデーションスキーマ
const historyFormSchema = z.object({
	type: z.enum(["condition", "surgery", "procedure", "other"]),
	diagnosis: z
		.string()
		.min(1, "診断名を入力してください")
		.max(300, "300文字以内で入力してください"),
	diagnosisDate: z.string().optional(),
	resolvedDate: z.string().optional(),
	icd10Code: z
		.string()
		.regex(/^([A-Z]\d{2}(\.\d{1,2})?)?$/, "無効なICD-10コードです（例: E11.9）")
		.optional()
		.or(z.literal("")),
	diagnosedBy: z.string().max(200, "200文字以内で入力してください").optional(),
	description: z
		.string()
		.max(1000, "1000文字以内で入力してください")
		.optional(),
	status: z.enum(["active", "resolved", "chronic"]).optional(),
	notes: z.string().max(1000, "1000文字以内で入力してください").optional(),
});

type HistoryFormData = z.infer<typeof historyFormSchema>;

export function HistoryForm({ onSaved, onCancel }: HistoryFormProps) {
	const t = useTranslations();
	const { settings, addMedicalHistory } = useApp();
	const theme = getTheme(settings.theme);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<HistoryFormData>({
		resolver: zodResolver(historyFormSchema),
		mode: "onBlur",
		defaultValues: {
			type: "condition",
			diagnosis: "",
			diagnosisDate: "",
			resolvedDate: "",
			icd10Code: "",
			diagnosedBy: "",
			description: "",
			status: "active",
			notes: "",
		},
	});

	const onSubmit = (data: HistoryFormData) => {
		const history: MedicalHistory = {
			id: uuidv4(),
			type: data.type as MedicalHistoryType,
			diagnosis: data.diagnosis,
			diagnosisDate: data.diagnosisDate || undefined,
			resolvedDate: data.resolvedDate || undefined,
			icd10Code: data.icd10Code || undefined,
			diagnosedBy: data.diagnosedBy || undefined,
			description: data.description || undefined,
			status: data.status,
			notes: data.notes || undefined,
		};

		addMedicalHistory(history);
		onSaved?.(history);
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
			<div>
				<label
					htmlFor="type"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("histories.type")} *
				</label>
				<select
					id="type"
					{...register("type")}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
				>
					<option value="condition">{t("histories.types.condition")}</option>
					<option value="surgery">{t("histories.types.surgery")}</option>
					<option value="procedure">{t("histories.types.procedure")}</option>
					<option value="other">{t("histories.types.other")}</option>
				</select>
			</div>

			<div>
				<label
					htmlFor="diagnosis"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("histories.diagnosis")} *
				</label>
				<input
					id="diagnosis"
					type="text"
					{...register("diagnosis")}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: errors.diagnosis
							? "#ef4444"
							: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("histories.diagnosis")}
				/>
				{errors.diagnosis && (
					<p className="mt-1 text-sm text-red-500">
						{errors.diagnosis.message}
					</p>
				)}
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<label
						htmlFor="diagnosisDate"
						className="mb-1 block text-sm font-medium"
						style={{ color: theme.colors.text }}
					>
						{t("histories.diagnosisDate")}
					</label>
					<input
						id="diagnosisDate"
						type="date"
						{...register("diagnosisDate")}
						className="w-full rounded-lg border p-3"
						style={{
							backgroundColor: theme.colors.surface,
							borderColor: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
					/>
				</div>

				<div>
					<label
						htmlFor="status"
						className="mb-1 block text-sm font-medium"
						style={{ color: theme.colors.text }}
					>
						{t("histories.status")}
					</label>
					<select
						id="status"
						{...register("status")}
						className="w-full rounded-lg border p-3"
						style={{
							backgroundColor: theme.colors.surface,
							borderColor: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
					>
						<option value="active">{t("histories.statuses.active")}</option>
						<option value="resolved">{t("histories.statuses.resolved")}</option>
						<option value="chronic">{t("histories.statuses.chronic")}</option>
					</select>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<label
						htmlFor="icd10Code"
						className="mb-1 block text-sm font-medium"
						style={{ color: theme.colors.text }}
					>
						ICD-10コード
					</label>
					<input
						id="icd10Code"
						type="text"
						{...register("icd10Code")}
						className="w-full rounded-lg border p-3"
						style={{
							backgroundColor: theme.colors.surface,
							borderColor: errors.icd10Code
								? "#ef4444"
								: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
						placeholder="例: E11.9"
					/>
					{errors.icd10Code && (
						<p className="mt-1 text-sm text-red-500">
							{errors.icd10Code.message}
						</p>
					)}
				</div>

				<div>
					<label
						htmlFor="resolvedDate"
						className="mb-1 block text-sm font-medium"
						style={{ color: theme.colors.text }}
					>
						完治日
					</label>
					<input
						id="resolvedDate"
						type="date"
						{...register("resolvedDate")}
						className="w-full rounded-lg border p-3"
						style={{
							backgroundColor: theme.colors.surface,
							borderColor: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
					/>
				</div>
			</div>

			<div>
				<label
					htmlFor="diagnosedBy"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("histories.diagnosedBy")}
				</label>
				<input
					id="diagnosedBy"
					type="text"
					{...register("diagnosedBy")}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: errors.diagnosedBy
							? "#ef4444"
							: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("histories.diagnosedBy")}
				/>
				{errors.diagnosedBy && (
					<p className="mt-1 text-sm text-red-500">
						{errors.diagnosedBy.message}
					</p>
				)}
			</div>

			<div>
				<label
					htmlFor="description"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("histories.description")}
				</label>
				<textarea
					id="description"
					{...register("description")}
					className="w-full rounded-lg border p-3"
					rows={4}
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: errors.description
							? "#ef4444"
							: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("histories.description")}
				/>
				{errors.description && (
					<p className="mt-1 text-sm text-red-500">
						{errors.description.message}
					</p>
				)}
			</div>

			<div>
				<label
					htmlFor="notes"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("histories.notes")}
				</label>
				<textarea
					id="notes"
					{...register("notes")}
					className="w-full rounded-lg border p-3"
					rows={3}
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: errors.notes
							? "#ef4444"
							: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("histories.notes")}
				/>
				{errors.notes && (
					<p className="mt-1 text-sm text-red-500">{errors.notes.message}</p>
				)}
			</div>

			<div className="flex gap-3 md:max-w-md md:mx-auto">
				<button
					type="button"
					onClick={onCancel}
					className="flex-1 rounded-xl border-2 p-4 font-medium transition-transform active:scale-95"
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
					className="flex-1 rounded-xl p-4 font-medium text-white transition-transform active:scale-95 disabled:opacity-50"
					style={{ backgroundColor: theme.colors.primary }}
				>
					{isSubmitting ? t("actions.saving") : t("actions.save")}
				</button>
			</div>
		</form>
	);
}
