"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";
import type { LabResult } from "@/types";

type LabFormProps = {
	onSaved?: (result: LabResult) => void;
	onCancel?: () => void;
};

type EvaluationStatus = "low" | "normal" | "high" | "notEntered";

type LabGroupId =
	| "cbc"
	| "electrolyteRenal"
	| "liver"
	| "lipid"
	| "glucose"
	| "optional";

interface LabFieldDefinition {
	id: string;
	group: LabGroupId;
	labelEn: string;
	labelJa: string;
	unit: string;
	/**
	 * Reference range lower bound (inclusive). If undefined, only upper bound is used.
	 */
	refLow?: number;
	/**
	 * Reference range upper bound (inclusive). If undefined, only lower bound is used.
	 */
	refHigh?: number;
	/**
	 * Human-readable reference text (localized).
	 */
	referenceJa: string;
	referenceEn: string;
}

const LAB_FIELDS: LabFieldDefinition[] = [
	// 1. CBC（血算）
	{
		id: "wbc",
		group: "cbc",
		labelEn: "WBC (White blood cells)",
		labelJa: "WBC（白血球数）",
		unit: "/µL",
		refLow: 4000,
		refHigh: 10000,
		referenceEn: "4,000 – 10,000 /µL",
		referenceJa: "4,000〜10,000 /µL",
	},
	{
		id: "rbc",
		group: "cbc",
		labelEn: "RBC (Red blood cells)",
		labelJa: "RBC（赤血球数）",
		unit: "×10⁶/µL",
		refLow: 3.8,
		refHigh: 5.7,
		referenceEn: "3.8 – 5.7 ×10⁶/µL",
		referenceJa: "3.8〜5.7 ×10⁶/µL",
	},
	{
		id: "hb",
		group: "cbc",
		labelEn: "Hb (Hemoglobin)",
		labelJa: "Hb（ヘモグロビン）",
		unit: "g/dL",
		refLow: 11.5,
		refHigh: 17.0,
		referenceEn: "11.5 – 17.0 g/dL",
		referenceJa: "11.5〜17.0 g/dL",
	},
	{
		id: "hct",
		group: "cbc",
		labelEn: "Hct (Hematocrit)",
		labelJa: "Ht（ヘマトクリット）",
		unit: "%",
		refLow: 35,
		refHigh: 52,
		referenceEn: "35 – 52 %",
		referenceJa: "35〜52 %",
	},
	{
		id: "plt",
		group: "cbc",
		labelEn: "Platelets",
		labelJa: "血小板数",
		unit: "/µL",
		refLow: 150000,
		refHigh: 400000,
		referenceEn: "150,000 – 400,000 /µL",
		referenceJa: "150,000〜400,000 /µL",
	},

	// 2. 電解質・腎機能
	{
		id: "na",
		group: "electrolyteRenal",
		labelEn: "Na (Sodium)",
		labelJa: "Na（ナトリウム）",
		unit: "mEq/L",
		refLow: 135,
		refHigh: 145,
		referenceEn: "135 – 145 mEq/L",
		referenceJa: "135〜145 mEq/L",
	},
	{
		id: "k",
		group: "electrolyteRenal",
		labelEn: "K (Potassium)",
		labelJa: "K（カリウム）",
		unit: "mEq/L",
		refLow: 3.5,
		refHigh: 5.0,
		referenceEn: "3.5 – 5.0 mEq/L",
		referenceJa: "3.5〜5.0 mEq/L",
	},
	{
		id: "cl",
		group: "electrolyteRenal",
		labelEn: "Cl (Chloride)",
		labelJa: "Cl（クロール）",
		unit: "mEq/L",
		refLow: 98,
		refHigh: 107,
		referenceEn: "98 – 107 mEq/L",
		referenceJa: "98〜107 mEq/L",
	},
	{
		id: "bun",
		group: "electrolyteRenal",
		labelEn: "BUN (Blood Urea Nitrogen)",
		labelJa: "BUN（尿素窒素）",
		unit: "mg/dL",
		refLow: 8,
		refHigh: 20,
		referenceEn: "8 – 20 mg/dL",
		referenceJa: "8〜20 mg/dL",
	},
	{
		id: "cre",
		group: "electrolyteRenal",
		labelEn: "Creatinine",
		labelJa: "クレアチニン",
		unit: "mg/dL",
		refLow: 0.5,
		refHigh: 1.2,
		referenceEn: "0.5 – 1.2 mg/dL",
		referenceJa: "0.5〜1.2 mg/dL",
	},
	{
		id: "egfr",
		group: "electrolyteRenal",
		labelEn: "eGFR",
		labelJa: "eGFR",
		unit: "mL/min/1.73m²",
		refLow: 60,
		referenceEn: "≥ 60 mL/min/1.73m² (approx. normal)",
		referenceJa: "おおよそ 60 以上で正常範囲",
	},

	// 3. 肝機能
	{
		id: "ast",
		group: "liver",
		labelEn: "AST (GOT)",
		labelJa: "AST（GOT）",
		unit: "U/L",
		refLow: 10,
		refHigh: 40,
		referenceEn: "10 – 40 U/L",
		referenceJa: "10〜40 U/L",
	},
	{
		id: "alt",
		group: "liver",
		labelEn: "ALT (GPT)",
		labelJa: "ALT（GPT）",
		unit: "U/L",
		refLow: 5,
		refHigh: 40,
		referenceEn: "5 – 40 U/L",
		referenceJa: "5〜40 U/L",
	},
	{
		id: "alp",
		group: "liver",
		labelEn: "ALP",
		labelJa: "ALP",
		unit: "U/L",
		refLow: 100,
		refHigh: 340,
		referenceEn: "100 – 340 U/L (approximate)",
		referenceJa: "100〜340 U/L（おおよその範囲）",
	},
	{
		id: "ggt",
		group: "liver",
		labelEn: "γ-GTP (γ-GT)",
		labelJa: "γ-GTP（γ-GT）",
		unit: "U/L",
		refLow: 10,
		refHigh: 70,
		referenceEn: "10 – 70 U/L (approximate)",
		referenceJa: "10〜70 U/L（おおよその範囲）",
	},
	{
		id: "tbil",
		group: "liver",
		labelEn: "Total Bilirubin",
		labelJa: "総ビリルビン",
		unit: "mg/dL",
		refLow: 0.2,
		refHigh: 1.2,
		referenceEn: "0.2 – 1.2 mg/dL",
		referenceJa: "0.2〜1.2 mg/dL",
	},
	{
		id: "alb",
		group: "liver",
		labelEn: "Albumin",
		labelJa: "アルブミン",
		unit: "g/dL",
		refLow: 3.8,
		refHigh: 5.0,
		referenceEn: "3.8 – 5.0 g/dL",
		referenceJa: "3.8〜5.0 g/dL",
	},

	// 4. 脂質
	{
		id: "ldl",
		group: "lipid",
		labelEn: "LDL-C",
		labelJa: "LDLコレステロール",
		unit: "mg/dL",
		refHigh: 120,
		referenceEn: "< 120 mg/dL (target)",
		referenceJa: "120 未満を目安",
	},
	{
		id: "hdl",
		group: "lipid",
		labelEn: "HDL-C",
		labelJa: "HDLコレステロール",
		unit: "mg/dL",
		refLow: 40,
		referenceEn: "≥ 40 mg/dL (target)",
		referenceJa: "40 以上を目安",
	},
	{
		id: "tg",
		group: "lipid",
		labelEn: "Triglycerides",
		labelJa: "中性脂肪",
		unit: "mg/dL",
		refHigh: 150,
		referenceEn: "< 150 mg/dL (target)",
		referenceJa: "150 未満を目安",
	},

	// 5. 血糖
	{
		id: "glu_f",
		group: "glucose",
		labelEn: "Fasting Glucose",
		labelJa: "空腹時血糖",
		unit: "mg/dL",
		refLow: 70,
		refHigh: 99,
		referenceEn: "70 – 99 mg/dL",
		referenceJa: "70〜99 mg/dL",
	},
	{
		id: "hba1c",
		group: "glucose",
		labelEn: "HbA1c (NGSP)",
		labelJa: "HbA1c（NGSP）",
		unit: "%",
		refLow: 4.6,
		refHigh: 6.2,
		referenceEn: "4.6 – 6.2 %",
		referenceJa: "4.6〜6.2 %",
	},

	// 6. オプション項目
	{
		id: "crp",
		group: "optional",
		labelEn: "CRP",
		labelJa: "CRP",
		unit: "mg/dL",
		refLow: 0,
		refHigh: 0.3,
		referenceEn: "0.0 – 0.3 mg/dL",
		referenceJa: "0.0〜0.3 mg/dL",
	},
	{
		id: "tsh",
		group: "optional",
		labelEn: "TSH",
		labelJa: "TSH",
		unit: "µIU/mL",
		refLow: 0.4,
		refHigh: 4.0,
		referenceEn: "0.4 – 4.0 µIU/mL",
		referenceJa: "0.4〜4.0 µIU/mL",
	},
];

interface EvaluatedResult {
	id: string;
	label: string;
	valueText: string;
	unit: string;
	reference: string;
	status: EvaluationStatus;
}

export function LabForm({ onSaved, onCancel }: LabFormProps) {
	const t = useTranslations();
	const locale = useLocale();
	const { settings, addLabResult } = useApp();
	const theme = getTheme(settings.theme);

	const [values, setValues] = useState<Record<string, string>>({});
	const [testDate, setTestDate] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [testedBy, setTestedBy] = useState("");
	const [notes, setNotes] = useState("");
	const [evaluated, setEvaluated] = useState<EvaluatedResult[]>([]);

	const groupedFields = useMemo(() => {
		const groups: Record<LabGroupId, LabFieldDefinition[]> = {
			cbc: [],
			electrolyteRenal: [],
			liver: [],
			lipid: [],
			glucose: [],
			optional: [],
		};
		for (const field of LAB_FIELDS) {
			groups[field.group].push(field);
		}
		return groups;
	}, []);

	const evaluateStatus = (
		value: number,
		field: LabFieldDefinition,
	): EvaluationStatus => {
		const { refLow, refHigh } = field;

		if (refLow != null && refHigh != null) {
			if (value < refLow) return "low";
			if (value > refHigh) return "high";
			return "normal";
		}
		if (refLow != null) {
			// Only lower bound defined (e.g., HDL, eGFR)
			if (value < refLow) return "low";
			return "normal";
		}
		if (refHigh != null) {
			// Only upper bound defined (e.g., LDL, TG)
			if (value > refHigh) return "high";
			return "normal";
		}
		return "normal";
	};

	const handleChange = (id: string, raw: string) => {
		setValues((prev) => ({ ...prev, [id]: raw }));
	};

	const handleSave = () => {
		const results: EvaluatedResult[] = [];
		const toSave: LabResult[] = [];

		for (const field of LAB_FIELDS) {
			const raw = values[field.id];
			const label = locale === "ja" ? field.labelJa : field.labelEn;
			const reference = locale === "ja" ? field.referenceJa : field.referenceEn;

			if (!raw) {
				results.push({
					id: field.id,
					label,
					valueText: "-",
					unit: field.unit,
					reference,
					status: "notEntered",
				});
				continue;
			}

			const num = Number.parseFloat(raw);
			if (Number.isNaN(num)) {
				results.push({
					id: field.id,
					label,
					valueText: raw,
					unit: field.unit,
					reference,
					status: "notEntered",
				});
				continue;
			}

			const status = evaluateStatus(num, field);

			results.push({
				id: field.id,
				label,
				valueText: raw,
				unit: field.unit,
				reference,
				status,
			});

			// 保存用の LabResult（1項目 = 1レコード）
			toSave.push({
				id: uuidv4(),
				testName: label,
				value: raw,
				unit: field.unit,
				referenceRange: reference,
				testDate: testDate || new Date().toISOString().split("T")[0],
				testedBy: testedBy || undefined,
				category: undefined,
				notes: notes || undefined,
			});
		}

		const hasAnyValue = toSave.length > 0 && toSave.some((r) => r.value !== "");
		if (!hasAnyValue) {
			alert(t("labs.validation.noValues"));
			return;
		}

		results.sort((a, b) => a.label.localeCompare(b.label));
		setEvaluated(results);

		for (const r of toSave) {
			addLabResult(r);
		}

		if (toSave[0]) {
			onSaved?.(toSave[0]);
		}
	};

	const hasAnyInput = useMemo(
		() =>
			Object.values(values).some(
				(v) => typeof v === "string" && v.trim() !== "",
			),
		[values],
	);
	return (
		<div className="space-y-6 md:max-w-3xl md:mx-auto">
			{/* 検査日・検査機関 */}
			<div>
				<label
					htmlFor="field2-2"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("labs.testDate")} *
				</label>
				<input
					id="field2-2"
					type="date"
					value={testDate}
					onChange={(e) => setTestDate(e.target.value)}
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
					htmlFor="field3-3"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("labs.testedBy")}
				</label>
				<input
					id="field3-3"
					type="text"
					value={testedBy}
					onChange={(e) => setTestedBy(e.target.value)}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("labs.testedBy")}
				/>
			</div>

			{/* メモ */}
			<div>
				<label
					htmlFor="field4-4"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("labs.notes")}
				</label>
				<textarea
					id="field4-4"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					className="w-full rounded-lg border p-3"
					rows={3}
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("labs.notes")}
				/>
			</div>

			{/* 検査値入力ブロック */}
			<div className="space-y-6">
				<section className="space-y-3">
					<h3
						className="text-sm font-semibold"
						style={{ color: theme.colors.text }}
					>
						{t("labs.groups.cbc")}
					</h3>
					<div className="space-y-2 rounded-xl bg-white/70 p-3 shadow-sm">
						{groupedFields.cbc.map((field) => (
							<LabInputRow
								key={field.id}
								label={locale === "ja" ? field.labelJa : field.labelEn}
								unit={field.unit}
								reference={
									locale === "ja" ? field.referenceJa : field.referenceEn
								}
								value={values[field.id] ?? ""}
								onChange={(v) => handleChange(field.id, v)}
								theme={theme}
							/>
						))}
					</div>
				</section>

				<section className="space-y-3">
					<h3
						className="text-sm font-semibold"
						style={{ color: theme.colors.text }}
					>
						{t("labs.groups.electrolyteRenal")}
					</h3>
					<div className="space-y-2 rounded-xl bg-white/70 p-3 shadow-sm">
						{groupedFields.electrolyteRenal.map((field) => (
							<LabInputRow
								key={field.id}
								label={locale === "ja" ? field.labelJa : field.labelEn}
								unit={field.unit}
								reference={
									locale === "ja" ? field.referenceJa : field.referenceEn
								}
								value={values[field.id] ?? ""}
								onChange={(v) => handleChange(field.id, v)}
								theme={theme}
							/>
						))}
					</div>
				</section>

				<section className="space-y-3">
					<h3
						className="text-sm font-semibold"
						style={{ color: theme.colors.text }}
					>
						{t("labs.groups.liver")}
					</h3>
					<div className="space-y-2 rounded-xl bg-white/70 p-3 shadow-sm">
						{groupedFields.liver.map((field) => (
							<LabInputRow
								key={field.id}
								label={locale === "ja" ? field.labelJa : field.labelEn}
								unit={field.unit}
								reference={
									locale === "ja" ? field.referenceJa : field.referenceEn
								}
								value={values[field.id] ?? ""}
								onChange={(v) => handleChange(field.id, v)}
								theme={theme}
							/>
						))}
					</div>
				</section>

				<section className="space-y-3">
					<h3
						className="text-sm font-semibold"
						style={{ color: theme.colors.text }}
					>
						{t("labs.groups.lipid")}
					</h3>
					<div className="space-y-2 rounded-xl bg-white/70 p-3 shadow-sm">
						{groupedFields.lipid.map((field) => (
							<LabInputRow
								key={field.id}
								label={locale === "ja" ? field.labelJa : field.labelEn}
								unit={field.unit}
								reference={
									locale === "ja" ? field.referenceJa : field.referenceEn
								}
								value={values[field.id] ?? ""}
								onChange={(v) => handleChange(field.id, v)}
								theme={theme}
							/>
						))}
					</div>
				</section>

				<section className="space-y-3">
					<h3
						className="text-sm font-semibold"
						style={{ color: theme.colors.text }}
					>
						{t("labs.groups.glucose")}
					</h3>
					<div className="space-y-2 rounded-xl bg-white/70 p-3 shadow-sm">
						{groupedFields.glucose.map((field) => (
							<LabInputRow
								key={field.id}
								label={locale === "ja" ? field.labelJa : field.labelEn}
								unit={field.unit}
								reference={
									locale === "ja" ? field.referenceJa : field.referenceEn
								}
								value={values[field.id] ?? ""}
								onChange={(v) => handleChange(field.id, v)}
								theme={theme}
							/>
						))}
					</div>
				</section>

				<section className="space-y-3">
					<h3
						className="text-sm font-semibold"
						style={{ color: theme.colors.text }}
					>
						{t("labs.groups.optional")}
					</h3>
					<div className="space-y-2 rounded-xl bg-white/70 p-3 shadow-sm">
						{groupedFields.optional.map((field) => (
							<LabInputRow
								key={field.id}
								label={locale === "ja" ? field.labelJa : field.labelEn}
								unit={field.unit}
								reference={
									locale === "ja" ? field.referenceJa : field.referenceEn
								}
								value={values[field.id] ?? ""}
								onChange={(v) => handleChange(field.id, v)}
								theme={theme}
							/>
						))}
					</div>
				</section>
			</div>

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
					type="button"
					onClick={handleSave}
					disabled={!hasAnyInput}
					className="flex-1 rounded-lg p-3 font-medium text-white transition-colors disabled:opacity-50"
					style={{ backgroundColor: theme.colors.primary }}
				>
					{t("actions.save")}
				</button>
			</div>

			{/* 判定結果一覧 */}
			{evaluated.length > 0 && (
				<section className="space-y-3 rounded-xl border bg-white/80 p-4 shadow-sm">
					<h3
						className="text-sm font-semibold"
						style={{ color: theme.colors.text }}
					>
						{t("labs.resultSummaryTitle")}
					</h3>
					<div className="overflow-x-auto">
						<table className="min-w-full text-xs">
							<thead>
								<tr
									className="border-b"
									style={{ borderColor: `${theme.colors.textSecondary}30` }}
								>
									<th className="py-1 pr-2 text-left font-medium">
										{t("labs.result.headerTest")}
									</th>
									<th className="py-1 px-2 text-left font-medium">
										{t("labs.result.headerValue")}
									</th>
									<th className="py-1 px-2 text-left font-medium">
										{t("labs.result.headerReference")}
									</th>
									<th className="py-1 pl-2 text-left font-medium">
										{t("labs.result.headerStatus")}
									</th>
								</tr>
							</thead>
							<tbody>
								{evaluated.map((row) => (
									<tr
										key={row.id}
										className="border-b last:border-b-0"
										style={{
											borderColor: `${theme.colors.textSecondary}15`,
										}}
									>
										<td className="py-1 pr-2 align-top">{row.label}</td>
										<td className="py-1 px-2 align-top whitespace-nowrap">
											{row.valueText}{" "}
											<span className="text-[11px] text-gray-500">
												{row.unit}
											</span>
										</td>
										<td className="py-1 px-2 align-top text-[11px] text-gray-500">
											{row.reference}
										</td>
										<td className="py-1 pl-2 align-top">
											<span
												className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
												style={{
													backgroundColor:
														row.status === "normal"
															? `${theme.colors.primary}15`
															: row.status === "high"
																? "#fee2e2"
																: row.status === "low"
																	? "#dbeafe"
																	: "#f3f4f6",
													color:
														row.status === "normal"
															? theme.colors.primary
															: row.status === "high"
																? "#b91c1c"
																: row.status === "low"
																	? "#1d4ed8"
																	: "#6b7280",
												}}
											>
												{row.status === "low" && t("labs.result.low")}
												{row.status === "normal" && t("labs.result.normal")}
												{row.status === "high" && t("labs.result.high")}
												{row.status === "notEntered" &&
													t("labs.result.notEntered")}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<p
						className="text-[11px] leading-snug"
						style={{ color: theme.colors.textSecondary }}
					>
						{t("labs.disclaimer")}
					</p>
				</section>
			)}
		</div>
	);
}

interface LabInputRowProps {
	label: string;
	unit: string;
	reference: string;
	value: string;
	onChange: (value: string) => void;
	theme: ReturnType<typeof getTheme>;
}

function LabInputRow({
	label,
	unit,
	reference,
	value,
	onChange,
	theme,
}: LabInputRowProps) {
	return (
		<div className="grid grid-cols-1 gap-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,2fr)] md:items-center">
			<div className="text-xs font-medium md:text-sm">{label}</div>
			<div className="flex items-center gap-2">
				<input
					type="number"
					inputMode="decimal"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="w-full rounded-lg border px-3 py-2 text-xs md:text-sm"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
				/>
				<span
					className="text-[11px] text-gray-500"
					style={{ whiteSpace: "nowrap" }}
				>
					{unit}
				</span>
			</div>
			<div className="text-[11px] text-gray-500 md:text-xs">{reference}</div>
		</div>
	);
}
