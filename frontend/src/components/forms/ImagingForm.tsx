"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";
import type { ImagingReport, ImagingType } from "@/types";

type ImagingFormProps = {
	onSaved?: (report: ImagingReport) => void;
	onCancel?: () => void;
};

export function ImagingForm({ onSaved, onCancel }: ImagingFormProps) {
	const t = useTranslations();
	const { settings, addImagingReport } = useApp();
	const theme = getTheme(settings.theme);

	const [formData, setFormData] = useState({
		type: "xray" as ImagingType,
		bodyPart: "",
		examDate: "",
		performedBy: "",
		summary: "",
		findings: "",
		impression: "",
	});

	const handleInputChange = (field: string, value: string | ImagingType) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSave = () => {
		const report: ImagingReport = {
			id: uuidv4(),
			type: formData.type,
			bodyPart: formData.bodyPart || undefined,
			examDate: formData.examDate || new Date().toISOString().split("T")[0],
			performedBy: formData.performedBy || undefined,
			summary: formData.summary,
			findings: formData.findings || undefined,
			impression: formData.impression || undefined,
		};

		addImagingReport(report);
		onSaved?.(report);
	};

	return (
		<div className="space-y-4">
			<div>
				<label
					htmlFor="field1-1"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("imaging.type")} *
				</label>
				<select
					id="field1-1"
					value={formData.type}
					onChange={(e) =>
						handleInputChange("type", e.target.value as ImagingType)
					}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
				>
					<option value="xray">{t("imaging.types.xray")}</option>
					<option value="ct">{t("imaging.types.ct")}</option>
					<option value="mri">{t("imaging.types.mri")}</option>
					<option value="ultrasound">{t("imaging.types.ultrasound")}</option>
					<option value="other">{t("imaging.types.other")}</option>
				</select>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<label
						htmlFor="field2-2"
						className="mb-1 block text-sm font-medium"
						style={{ color: theme.colors.text }}
					>
						{t("imaging.bodyPart")}
					</label>
					<input
						id="field2-2"
						type="text"
						value={formData.bodyPart}
						onChange={(e) => handleInputChange("bodyPart", e.target.value)}
						className="w-full rounded-lg border p-3"
						style={{
							backgroundColor: theme.colors.surface,
							borderColor: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
						placeholder="胸部"
					/>
				</div>

				<div>
					<label
						htmlFor="field3-3"
						className="mb-1 block text-sm font-medium"
						style={{ color: theme.colors.text }}
					>
						{t("imaging.examDate")} *
					</label>
					<input
						id="field3-3"
						type="date"
						value={formData.examDate}
						onChange={(e) => handleInputChange("examDate", e.target.value)}
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
					htmlFor="field4-4"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("imaging.performedBy")}
				</label>
				<input
					id="field4-4"
					type="text"
					value={formData.performedBy}
					onChange={(e) => handleInputChange("performedBy", e.target.value)}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("imaging.performedBy")}
				/>
			</div>

			<div>
				<label
					htmlFor="field5-5"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("imaging.summary")} *
				</label>
				<textarea
					id="field5-5"
					value={formData.summary}
					onChange={(e) => handleInputChange("summary", e.target.value)}
					className="w-full rounded-lg border p-3"
					rows={4}
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("imaging.summary")}
				/>
			</div>

			<div>
				<label
					htmlFor="field6-6"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("imaging.findings")}
				</label>
				<textarea
					id="field6-6"
					value={formData.findings}
					onChange={(e) => handleInputChange("findings", e.target.value)}
					className="w-full rounded-lg border p-3"
					rows={4}
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("imaging.findings")}
				/>
			</div>

			<div>
				<label
					htmlFor="field7-7"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("imaging.impression")}
				</label>
				<textarea
					id="field7-7"
					value={formData.impression}
					onChange={(e) => handleInputChange("impression", e.target.value)}
					className="w-full rounded-lg border p-3"
					rows={3}
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("imaging.impression")}
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
					disabled={!formData.summary}
					className="flex-1 rounded-xl p-4 font-medium text-white transition-transform active:scale-95 disabled:opacity-50"
					style={{ backgroundColor: theme.colors.primary }}
				>
					{t("actions.save")}
				</button>
			</div>
		</div>
	);
}
