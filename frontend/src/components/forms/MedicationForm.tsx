"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";
import type { Medication, MedicationForm as MedicationFormType } from "@/types";

type MedicationFormProps = {
	onSaved?: (medication: Medication) => void;
	onCancel?: () => void;
};

// バリデーションスキーマ
const medicationFormSchema = z.object({
	name: z
		.string()
		.min(1, "薬剤名を入力してください")
		.max(200, "200文字以内で入力してください"),
	genericName: z.string().max(200, "200文字以内で入力してください").optional(),
	strength: z.string().max(50, "50文字以内で入力してください").optional(),
	form: z.enum(["tablet", "capsule", "liquid", "other"]),
	dose: z.string().max(100, "100文字以内で入力してください").optional(),
	frequency: z.string().max(100, "100文字以内で入力してください").optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	reason: z.string().max(500, "500文字以内で入力してください").optional(),
	clinic: z.string().max(200, "200文字以内で入力してください").optional(),
	warning: z.string().max(500, "500文字以内で入力してください").optional(),
});

type MedicationFormData = z.infer<typeof medicationFormSchema>;

export function MedicationForm({ onSaved, onCancel }: MedicationFormProps) {
	const t = useTranslations();
	const { settings, addMedication } = useApp();
	const theme = getTheme(settings.theme);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<MedicationFormData>({
		resolver: zodResolver(medicationFormSchema),
		mode: "onBlur",
		defaultValues: {
			name: "",
			genericName: "",
			strength: "",
			form: "tablet",
			dose: "",
			frequency: "",
			startDate: "",
			endDate: "",
			reason: "",
			clinic: "",
			warning: "",
		},
	});

	const onSubmit = (data: MedicationFormData) => {
		const medication: Medication = {
			id: uuidv4(),
			name: data.name,
			genericName: data.genericName || undefined,
			strength: data.strength || undefined,
			form: data.form as MedicationFormType,
			dose: data.dose || undefined,
			frequency: data.frequency || undefined,
			startDate: data.startDate || undefined,
			endDate: data.endDate || undefined,
			reason: data.reason || undefined,
			clinic: data.clinic || undefined,
			warning: data.warning || undefined,
			status: "active",
		};

		addMedication(medication);
		onSaved?.(medication);
	};

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="space-y-4 md:max-w-2xl md:mx-auto"
		>
			<div>
				<label
					htmlFor="name"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("add.drugName")} *
				</label>
				<input
					id="name"
					type="text"
					{...register("name")}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: errors.name
							? "#ef4444"
							: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("add.drugName")}
				/>
				{errors.name && (
					<p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
				)}
			</div>

			<div>
				<label
					htmlFor="genericName"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("add.genericName")}
				</label>
				<input
					id="genericName"
					type="text"
					{...register("genericName")}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: errors.genericName
							? "#ef4444"
							: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("add.genericName")}
				/>
				{errors.genericName && (
					<p className="mt-1 text-sm text-red-500">
						{errors.genericName.message}
					</p>
				)}
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<label
						htmlFor="strength"
						className="mb-1 block text-sm font-medium md:text-base"
						style={{ color: theme.colors.text }}
					>
						{t("add.strength")}
					</label>
					<input
						id="strength"
						type="text"
						{...register("strength")}
						className="w-full rounded-lg border p-3"
						style={{
							backgroundColor: theme.colors.surface,
							borderColor: errors.strength
								? "#ef4444"
								: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
						placeholder="5mg"
					/>
					{errors.strength && (
						<p className="mt-1 text-sm text-red-500">
							{errors.strength.message}
						</p>
					)}
				</div>

				<div>
					<label
						htmlFor="form"
						className="mb-1 block text-sm font-medium"
						style={{ color: theme.colors.text }}
					>
						{t("add.form")}
					</label>
					<select
						id="form"
						{...register("form")}
						className="w-full rounded-lg border p-3"
						style={{
							backgroundColor: theme.colors.surface,
							borderColor: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
					>
						<option value="tablet">{t("forms.tablet")}</option>
						<option value="capsule">{t("forms.capsule")}</option>
						<option value="liquid">{t("forms.liquid")}</option>
						<option value="other">{t("forms.other")}</option>
					</select>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<label
						htmlFor="dose"
						className="mb-1 block text-sm font-medium"
						style={{ color: theme.colors.text }}
					>
						{t("add.dose")}
					</label>
					<input
						id="dose"
						type="text"
						{...register("dose")}
						className="w-full rounded-lg border p-3"
						style={{
							backgroundColor: theme.colors.surface,
							borderColor: errors.dose
								? "#ef4444"
								: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
						placeholder="1 tablet"
					/>
					{errors.dose && (
						<p className="mt-1 text-sm text-red-500">{errors.dose.message}</p>
					)}
				</div>

				<div>
					<label
						htmlFor="frequency"
						className="mb-1 block text-sm font-medium"
						style={{ color: theme.colors.text }}
					>
						{t("add.frequency")}
					</label>
					<input
						id="frequency"
						type="text"
						{...register("frequency")}
						className="w-full rounded-lg border p-3"
						style={{
							backgroundColor: theme.colors.surface,
							borderColor: errors.frequency
								? "#ef4444"
								: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
						placeholder="1日2回"
					/>
					{errors.frequency && (
						<p className="mt-1 text-sm text-red-500">
							{errors.frequency.message}
						</p>
					)}
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<label
						htmlFor="startDate"
						className="mb-1 block text-sm font-medium"
						style={{ color: theme.colors.text }}
					>
						{t("add.startDate")}
					</label>
					<input
						id="startDate"
						type="date"
						{...register("startDate")}
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
						htmlFor="endDate"
						className="mb-1 block text-sm font-medium"
						style={{ color: theme.colors.text }}
					>
						{t("add.endDate")}
					</label>
					<input
						id="endDate"
						type="date"
						{...register("endDate")}
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
					htmlFor="clinic"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("medications.clinic")}
				</label>
				<input
					id="clinic"
					type="text"
					{...register("clinic")}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: errors.clinic
							? "#ef4444"
							: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("medications.clinic")}
				/>
				{errors.clinic && (
					<p className="mt-1 text-sm text-red-500">{errors.clinic.message}</p>
				)}
			</div>

			<div>
				<label
					htmlFor="reason"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("add.reason")}
				</label>
				<textarea
					id="reason"
					{...register("reason")}
					className="w-full rounded-lg border p-3"
					rows={3}
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: errors.reason
							? "#ef4444"
							: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("add.reason")}
				/>
				{errors.reason && (
					<p className="mt-1 text-sm text-red-500">{errors.reason.message}</p>
				)}
			</div>

			<div>
				<label
					htmlFor="warning"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("medications.warning")}
				</label>
				<input
					id="warning"
					type="text"
					{...register("warning")}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: errors.warning
							? "#ef4444"
							: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("medications.warning")}
				/>
				{errors.warning && (
					<p className="mt-1 text-sm text-red-500">{errors.warning.message}</p>
				)}
			</div>

			<div className="flex gap-3 md:max-w-md md:mx-auto">
				<button
					type="button"
					onClick={onCancel}
					className="flex-1 rounded-xl border-2 p-4 font-medium transition-transform active:scale-95 md:p-5 md:text-lg hover:shadow-sm"
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
					className="flex-1 rounded-xl p-4 font-medium text-white transition-transform active:scale-95 disabled:opacity-50 md:p-5 md:text-lg hover:shadow-lg"
					style={{ backgroundColor: theme.colors.primary }}
				>
					{isSubmitting ? t("actions.saving") : t("actions.save")}
				</button>
			</div>
		</form>
	);
}
