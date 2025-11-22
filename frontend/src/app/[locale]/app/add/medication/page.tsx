"use client";

import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { DrugAutocomplete } from "@/components/DrugAutocomplete";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";
import type { Prescription, PrescriptionMedication } from "@/types";

/**
 * 処方箋追加フォームページ
 * 処方基本情報 + 複数薬品 + メモ/添付
 */
export default function AddPrescriptionPage() {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const { settings, addPrescription, prescriptions } = useApp();
	const theme = getTheme(settings.theme);

	// 処方基本情報
	const [prescriptionDate, setPrescriptionDate] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [clinic, setClinic] = useState("");
	const [department, setDepartment] = useState("");
	const [doctorName, setDoctorName] = useState("");

	// 症状・メモ
	const [symptoms, setSymptoms] = useState("");
	const [notes, setNotes] = useState("");

	// 薬品リスト（最低1つ）
	const [medications, setMedications] = useState<
		Omit<PrescriptionMedication, "id">[]
	>([
		{
			drugName: "",
			strength: "",
			dosage: "",
			quantity: "",
			duration: "",
		},
	]);

	// 医療機関履歴から候補を取得
	const clinicHistory = Array.from(
		new Set(prescriptions.map((p) => p.clinic)),
	).filter(Boolean);

	const handleAddMedication = () => {
		setMedications([
			...medications,
			{
				drugName: "",
				strength: "",
				dosage: "",
				quantity: "",
				duration: "",
			},
		]);
	};

	const handleRemoveMedication = (index: number) => {
		if (medications.length > 1) {
			setMedications(medications.filter((_, i) => i !== index));
		}
	};

	const handleMedicationChange = (
		index: number,
		field: keyof Omit<PrescriptionMedication, "id">,
		value: string,
	) => {
		const updated = [...medications];
		updated[index] = { ...updated[index], [field]: value };
		setMedications(updated);
	};

	const handleSave = () => {
		// バリデーション
		if (!clinic.trim()) {
			alert(t("prescriptions.validation.clinicRequired"));
			return;
		}

		const hasValidMedication = medications.some(
			(med) => med.drugName.trim() !== "",
		);
		if (!hasValidMedication) {
			alert(t("prescriptions.validation.medicationRequired"));
			return;
		}

		// 処方箋オブジェクトを作成
		const prescription: Prescription = {
			id: uuidv4(),
			prescriptionDate,
			clinic: clinic.trim(),
			department: department.trim() || undefined,
			doctorName: doctorName.trim() || undefined,
			medications: medications
				.filter((med) => med.drugName.trim() !== "") // 空の薬品を除外
				.map((med) => ({
					id: uuidv4(),
					drugName: med.drugName.trim(),
					strength: med.strength.trim(),
					dosage: med.dosage.trim(),
					quantity: med.quantity.trim(),
					duration: med.duration?.trim() || undefined,
				})),
			symptoms: symptoms.trim() || undefined,
			notes: notes.trim() || undefined,
			attachments: undefined, // 将来的に画像アップロード機能を追加
		};

		addPrescription(prescription);
		router.push(`/${locale}/app/medications`);
	};

	return (
		<div className="px-4 md:px-8 lg:px-12 py-4 lg:py-8 pb-24 lg:pb-8 space-y-6">
			{/* Header - Mobile only, desktop shows in top bar */}
			<div className="lg:hidden mb-2">
				<h1
					className="text-xl font-bold"
					style={{ color: theme.colors.text }}
				>
					{t("prescriptions.addNew")}
				</h1>
			</div>

			{/* Section 1: 処方基本情報 */}
			<div
				className="rounded-xl p-5 space-y-4"
				style={{
					backgroundColor: theme.colors.surface,
					border: `2px solid ${theme.colors.textSecondary}20`,
				}}
			>
				<h2
					className="text-lg font-bold mb-4"
					style={{ color: theme.colors.text }}
				>
					{t("prescriptions.basicInfo")}
				</h2>

				{/* 処方日 */}
				<div>
					<label
						htmlFor="prescription-date"
						className="block text-sm font-medium mb-1"
						style={{ color: theme.colors.textSecondary }}
					>
						{t("prescriptions.prescriptionDate")} *
					</label>
					<input
						id="prescription-date"
						type="date"
						value={prescriptionDate}
						onChange={(e) => setPrescriptionDate(e.target.value)}
						className="w-full rounded-lg border p-3"
						style={{
							backgroundColor: theme.colors.background,
							borderColor: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
					/>
				</div>

				{/* 医療機関名 */}
				<div>
					<label
						htmlFor="clinic"
						className="block text-sm font-medium mb-1"
						style={{ color: theme.colors.textSecondary }}
					>
						{t("prescriptions.clinic")} *
					</label>
					<input
						id="clinic"
						type="text"
						value={clinic}
						onChange={(e) => setClinic(e.target.value)}
						list="clinic-history"
						className="w-full rounded-lg border p-3"
						style={{
							backgroundColor: theme.colors.background,
							borderColor: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
						placeholder={t("prescriptions.clinicPlaceholder")}
					/>
					{clinicHistory.length > 0 && (
						<datalist id="clinic-history">
							{clinicHistory.map((c) => (
								<option key={c} value={c} />
							))}
						</datalist>
					)}
				</div>

				{/* 診療科 */}
				<div>
					<label
						htmlFor="department"
						className="block text-sm font-medium mb-1"
						style={{ color: theme.colors.textSecondary }}
					>
						{t("prescriptions.department")}
					</label>
					<input
						id="department"
						type="text"
						value={department}
						onChange={(e) => setDepartment(e.target.value)}
						className="w-full rounded-lg border p-3"
						style={{
							backgroundColor: theme.colors.background,
							borderColor: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
						placeholder={t("prescriptions.departmentPlaceholder")}
					/>
				</div>

				{/* 医師名 */}
				<div>
					<label
						htmlFor="doctor"
						className="block text-sm font-medium mb-1"
						style={{ color: theme.colors.textSecondary }}
					>
						{t("prescriptions.doctorName")}
					</label>
					<input
						id="doctor"
						type="text"
						value={doctorName}
						onChange={(e) => setDoctorName(e.target.value)}
						className="w-full rounded-lg border p-3"
						style={{
							backgroundColor: theme.colors.background,
							borderColor: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
						placeholder={t("prescriptions.doctorNamePlaceholder")}
					/>
				</div>
			</div>

			{/* Section 2: 薬品追加（複数行） */}
			<div
				className="rounded-xl p-5 space-y-4"
				style={{
					backgroundColor: theme.colors.surface,
					border: `2px solid ${theme.colors.textSecondary}20`,
				}}
			>
				<div className="flex items-center justify-between mb-4">
					<h2
						className="text-lg font-bold"
						style={{ color: theme.colors.text }}
					>
						{t("prescriptions.medications")}
					</h2>
					<button
						type="button"
						onClick={handleAddMedication}
						className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-transform active:scale-95"
						style={{ backgroundColor: theme.colors.primary }}
					>
						<Plus size={16} />
						{t("prescriptions.addMedication")}
					</button>
				</div>

				{medications.map((medication, index) => (
					<div
						key={`med-${
							// biome-ignore lint/suspicious/noArrayIndexKey: This is a form array where order matters
							index
						}`}
						className="p-4 rounded-lg space-y-3"
						style={{
							backgroundColor: theme.colors.background,
							border: `1px solid ${theme.colors.textSecondary}20`,
						}}
					>
						<div className="flex items-center justify-between mb-2">
							<span
								className="font-medium text-sm"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("prescriptions.medication")} {index + 1}
							</span>
							{medications.length > 1 && (
								<button
									type="button"
									onClick={() => handleRemoveMedication(index)}
									className="text-red-500 hover:text-red-700 p-1"
								>
									<Minus size={18} />
								</button>
							)}
						</div>

						{/* 薬品名 */}
						<div>
							<label
								htmlFor={`drugName-${index}`}
								className="block text-xs font-medium mb-1"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("prescriptions.drugName")} *
							</label>
							<DrugAutocomplete
								id={`drugName-${index}`}
								value={medication.drugName}
								onChange={(drugName, strength) => {
									handleMedicationChange(index, "drugName", drugName);
									// 規格が取得できた場合は自動入力
									if (strength && !medication.strength) {
										handleMedicationChange(index, "strength", strength);
									}
								}}
								placeholder={t("prescriptions.drugNamePlaceholder")}
								themeId={settings.theme}
							/>
						</div>

						{/* 規格 */}
						<div>
							<label
								htmlFor={`strength-${index}`}
								className="block text-xs font-medium mb-1"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("prescriptions.strength")}
							</label>
							<input
								id={`strength-${index}`}
								type="text"
								value={medication.strength}
								onChange={(e) =>
									handleMedicationChange(index, "strength", e.target.value)
								}
								className="w-full rounded-lg border p-2.5 text-sm"
								style={{
									backgroundColor: theme.colors.surface,
									borderColor: `${theme.colors.textSecondary}40`,
									color: theme.colors.text,
								}}
								placeholder="5mg, 10mg/mL"
							/>
						</div>

						{/* 用法 */}
						<div>
							<label
								htmlFor={`dosage-${index}`}
								className="block text-xs font-medium mb-1"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("prescriptions.dosage")}
							</label>
							<input
								id={`dosage-${index}`}
								type="text"
								value={medication.dosage}
								onChange={(e) =>
									handleMedicationChange(index, "dosage", e.target.value)
								}
								className="w-full rounded-lg border p-2.5 text-sm"
								style={{
									backgroundColor: theme.colors.surface,
									borderColor: `${theme.colors.textSecondary}40`,
									color: theme.colors.text,
								}}
								placeholder={t("prescriptions.dosagePlaceholder")}
							/>
						</div>

						<div className="grid grid-cols-2 gap-3">
							{/* 用量 */}
							<div>
								<label
									htmlFor={`quantity-${index}`}
									className="block text-xs font-medium mb-1"
									style={{ color: theme.colors.textSecondary }}
								>
									{t("prescriptions.quantity")}
								</label>
								<input
									id={`quantity-${index}`}
									type="text"
									value={medication.quantity}
									onChange={(e) =>
										handleMedicationChange(index, "quantity", e.target.value)
									}
									className="w-full rounded-lg border p-2.5 text-sm"
									style={{
										backgroundColor: theme.colors.surface,
										borderColor: `${theme.colors.textSecondary}40`,
										color: theme.colors.text,
									}}
									placeholder="1錠, 5mL"
								/>
							</div>

							{/* 日数/総量 */}
							<div>
								<label
									htmlFor={`duration-${index}`}
									className="block text-xs font-medium mb-1"
									style={{ color: theme.colors.textSecondary }}
								>
									{t("prescriptions.duration")}
								</label>
								<input
									id={`duration-${index}`}
									type="text"
									value={medication.duration || ""}
									onChange={(e) =>
										handleMedicationChange(index, "duration", e.target.value)
									}
									className="w-full rounded-lg border p-2.5 text-sm"
									style={{
										backgroundColor: theme.colors.surface,
										borderColor: `${theme.colors.textSecondary}40`,
										color: theme.colors.text,
									}}
									placeholder="7日分, 14錠"
								/>
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Section 3: メモ/添付 */}
			<div
				className="rounded-xl p-5 space-y-4"
				style={{
					backgroundColor: theme.colors.surface,
					border: `2px solid ${theme.colors.textSecondary}20`,
				}}
			>
				<h2
					className="text-lg font-bold mb-4"
					style={{ color: theme.colors.text }}
				>
					{t("prescriptions.additionalInfo")}
				</h2>

				{/* 症状・目的 */}
				<div>
					<label
						htmlFor="symptoms"
						className="block text-sm font-medium mb-1"
						style={{ color: theme.colors.textSecondary }}
					>
						{t("prescriptions.symptoms")}
					</label>
					<textarea
						id="symptoms"
						value={symptoms}
						onChange={(e) => setSymptoms(e.target.value)}
						rows={2}
						className="w-full rounded-lg border p-3"
						style={{
							backgroundColor: theme.colors.background,
							borderColor: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
						placeholder={t("prescriptions.symptomsPlaceholder")}
					/>
				</div>

				{/* 注意・自由メモ */}
				<div>
					<label
						htmlFor="notes"
						className="block text-sm font-medium mb-1"
						style={{ color: theme.colors.textSecondary }}
					>
						{t("prescriptions.notes")}
					</label>
					<textarea
						id="notes"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						rows={3}
						className="w-full rounded-lg border p-3"
						style={{
							backgroundColor: theme.colors.background,
							borderColor: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
						placeholder={t("prescriptions.notesPlaceholder")}
					/>
				</div>

				{/* TODO: 写真添付 (将来実装) */}
				<div
					className="p-4 rounded-lg text-sm text-center"
					style={{
						backgroundColor: `${theme.colors.textSecondary}10`,
						color: theme.colors.textSecondary,
					}}
				>
					📸 {t("prescriptions.photoAttachmentComingSoon")}
				</div>
			</div>

			{/* Save Button */}
			<button
				type="button"
				onClick={handleSave}
				className="w-full rounded-xl py-4 font-medium text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
				style={{
					backgroundImage: `linear-gradient(to top right, ${theme.colors.primary}, ${theme.colors.secondary})`,
				}}
			>
				{t("actions.save")}
			</button>
		</div>
	);
}
