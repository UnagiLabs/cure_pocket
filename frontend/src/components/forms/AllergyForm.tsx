"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";
import type { Allergy, AllergySeverity } from "@/types";

type AllergyFormProps = {
	onSaved?: (allergy: Allergy) => void;
	onCancel?: () => void;
};

// バリデーションスキーマ
const allergyFormSchema = z.object({
	substance: z
		.string()
		.min(1, "アレルギー物質を入力してください")
		.max(500, "500文字以内で入力してください"),
	severity: z.enum(["mild", "moderate", "severe", "life-threatening"]),
	symptoms: z.string().max(1000, "1000文字以内で入力してください").optional(),
	onsetDate: z.string().optional(),
	diagnosedBy: z.string().max(200, "200文字以内で入力してください").optional(),
	notes: z.string().max(1000, "1000文字以内で入力してください").optional(),
});

type AllergyFormData = z.infer<typeof allergyFormSchema>;

export function AllergyForm({ onSaved, onCancel }: AllergyFormProps) {
	const t = useTranslations();
	const _locale = useLocale();
	const { settings, addAllergy } = useApp();
	const theme = getTheme(settings.theme);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<AllergyFormData>({
		resolver: zodResolver(allergyFormSchema),
		mode: "onBlur",
		defaultValues: {
			substance: "",
			severity: "moderate",
			symptoms: "",
			onsetDate: "",
			diagnosedBy: "",
			notes: "",
		},
	});

	const onSubmit = (data: AllergyFormData) => {
		const allergy: Allergy = {
			id: uuidv4(),
			substance: data.substance,
			severity: data.severity as AllergySeverity,
			symptoms: data.symptoms || undefined,
			onsetDate: data.onsetDate || undefined,
			diagnosedBy: data.diagnosedBy || undefined,
			notes: data.notes || undefined,
		};

		addAllergy(allergy);
		onSaved?.(allergy);
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
			<div>
				<label
					htmlFor="substance"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("allergies.substance")} *
				</label>
				<input
					id="substance"
					type="text"
					{...register("substance")}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: errors.substance
							? "#ef4444"
							: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("allergies.substance")}
				/>
				{errors.substance && (
					<p className="mt-1 text-sm text-red-500">
						{errors.substance.message}
					</p>
				)}
			</div>

			<div>
				<label
					htmlFor="severity"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("allergies.severity")} *
				</label>
				<select
					id="severity"
					{...register("severity")}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
				>
					<option value="mild">{t("allergies.severities.mild")}</option>
					<option value="moderate">{t("allergies.severities.moderate")}</option>
					<option value="severe">{t("allergies.severities.severe")}</option>
					<option value="life-threatening">
						{t("allergies.severities.life-threatening")}
					</option>
				</select>
			</div>

			<div>
				<label
					htmlFor="symptoms"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("allergies.symptoms")}
				</label>
				<textarea
					id="symptoms"
					{...register("symptoms")}
					className="w-full rounded-lg border p-3"
					rows={3}
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: errors.symptoms
							? "#ef4444"
							: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("allergies.symptoms")}
				/>
				{errors.symptoms && (
					<p className="mt-1 text-sm text-red-500">{errors.symptoms.message}</p>
				)}
			</div>

			<div>
				<label
					htmlFor="onsetDate"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("allergies.onsetDate")}
				</label>
				<input
					id="onsetDate"
					type="date"
					{...register("onsetDate")}
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
					htmlFor="diagnosedBy"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("allergies.diagnosedBy")}
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
					placeholder={t("allergies.diagnosedBy")}
				/>
				{errors.diagnosedBy && (
					<p className="mt-1 text-sm text-red-500">
						{errors.diagnosedBy.message}
					</p>
				)}
			</div>

			<div>
				<label
					htmlFor="notes"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("allergies.notes")}
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
					placeholder={t("allergies.notes")}
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
