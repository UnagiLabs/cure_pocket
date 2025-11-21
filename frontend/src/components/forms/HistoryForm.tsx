"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";
import type { MedicalHistory, MedicalHistoryType } from "@/types";

type HistoryFormProps = {
	onSaved?: (history: MedicalHistory) => void;
	onCancel?: () => void;
};

export function HistoryForm({ onSaved, onCancel }: HistoryFormProps) {
	const t = useTranslations();
	const { settings, addMedicalHistory } = useApp();
	const theme = getTheme(settings.theme);

	const [formData, setFormData] = useState({
		type: "condition" as MedicalHistoryType,
		diagnosis: "",
		diagnosisDate: "",
		diagnosedBy: "",
		description: "",
		status: "active" as "active" | "resolved" | "chronic" | undefined,
		notes: "",
	});

	const handleInputChange = (
		field: string,
		value:
			| string
			| MedicalHistoryType
			| "active"
			| "resolved"
			| "chronic"
			| undefined,
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSave = () => {
		const history: MedicalHistory = {
			id: uuidv4(),
			type: formData.type,
			diagnosis: formData.diagnosis,
			diagnosisDate: formData.diagnosisDate || undefined,
			diagnosedBy: formData.diagnosedBy || undefined,
			description: formData.description || undefined,
			status: formData.status,
			notes: formData.notes || undefined,
		};

		addMedicalHistory(history);
		onSaved?.(history);
	};

	return (
		<div className="space-y-4">
			<div>
				<label
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("histories.type")} *
				</label>
				<select
					value={formData.type}
					onChange={(e) =>
						handleInputChange("type", e.target.value as MedicalHistoryType)
					}
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
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("histories.diagnosis")} *
				</label>
				<input
					type="text"
					value={formData.diagnosis}
					onChange={(e) => handleInputChange("diagnosis", e.target.value)}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("histories.diagnosis")}
				/>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<label
						className="mb-1 block text-sm font-medium"
						style={{ color: theme.colors.text }}
					>
						{t("histories.diagnosisDate")}
					</label>
					<input
						type="date"
						value={formData.diagnosisDate}
						onChange={(e) => handleInputChange("diagnosisDate", e.target.value)}
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
						className="mb-1 block text-sm font-medium"
						style={{ color: theme.colors.text }}
					>
						{t("histories.status")}
					</label>
					<select
						value={formData.status || ""}
						onChange={(e) =>
							handleInputChange(
								"status",
								e.target.value === ""
									? undefined
									: (e.target.value as "active" | "resolved" | "chronic"),
							)
						}
						className="w-full rounded-lg border p-3"
						style={{
							backgroundColor: theme.colors.surface,
							borderColor: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
					>
						<option value="">{t("common.none")}</option>
						<option value="active">{t("histories.statuses.active")}</option>
						<option value="resolved">{t("histories.statuses.resolved")}</option>
						<option value="chronic">{t("histories.statuses.chronic")}</option>
					</select>
				</div>
			</div>

			<div>
				<label
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("histories.diagnosedBy")}
				</label>
				<input
					type="text"
					value={formData.diagnosedBy}
					onChange={(e) => handleInputChange("diagnosedBy", e.target.value)}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("histories.diagnosedBy")}
				/>
			</div>

			<div>
				<label
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("histories.description")}
				</label>
				<textarea
					value={formData.description}
					onChange={(e) => handleInputChange("description", e.target.value)}
					className="w-full rounded-lg border p-3"
					rows={4}
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("histories.description")}
				/>
			</div>

			<div>
				<label
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("histories.notes")}
				</label>
				<textarea
					value={formData.notes}
					onChange={(e) => handleInputChange("notes", e.target.value)}
					className="w-full rounded-lg border p-3"
					rows={3}
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("histories.notes")}
				/>
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
					type="button"
					onClick={handleSave}
					disabled={!formData.diagnosis}
					className="flex-1 rounded-xl p-4 font-medium text-white transition-transform active:scale-95 disabled:opacity-50"
					style={{ backgroundColor: theme.colors.primary }}
				>
					{t("actions.save")}
				</button>
			</div>
		</div>
	);
}
