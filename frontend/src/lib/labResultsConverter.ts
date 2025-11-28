/**
 * 検査値データの変換関数
 * フォーム入力値 ↔ LabResultsData (JSON) の相互変換
 */

import { v4 as uuidv4 } from "uuid";
import type {
	LabItem,
	LabResult,
	LabResultsData,
	LocalizedString,
	MetaData,
} from "@/types/healthData";

// ==========================================
// 検査項目フィールド定義
// ==========================================

export type LabGroupId =
	| "cbc"
	| "electrolyteRenal"
	| "liver"
	| "lipid"
	| "glucose"
	| "optional";

export type LabCategory =
	| "biochemistry"
	| "hematology"
	| "immunology"
	| "other";

export interface LabFieldDefinition {
	id: string;
	group: LabGroupId;
	labelEn: string;
	labelJa: string;
	unit: string;
	refLow?: number;
	refHigh?: number;
	referenceJa: string;
	referenceEn: string;
	loincCode: string;
	category: LabCategory;
	/**
	 * 男女別の基準値範囲
	 * 性別に応じた閾値が異なる検査項目で使用
	 */
	refRanges?: {
		male?: { low?: number; high?: number };
		female?: { low?: number; high?: number };
	};
}

/**
 * 検査項目定義（LOINCコード付き）
 */
export const LAB_FIELDS: LabFieldDefinition[] = [
	// CBC（血算）- hematology
	{
		id: "wbc",
		group: "cbc",
		labelEn: "WBC (White blood cells)",
		labelJa: "WBC（白血球数）",
		unit: "/µL",
		refLow: 4000,
		refHigh: 10000,
		referenceJa: "4,000〜10,000",
		referenceEn: "4,000-10,000",
		loincCode: "26464-8",
		category: "hematology",
	},
	{
		id: "rbc",
		group: "cbc",
		labelEn: "RBC (Red blood cells)",
		labelJa: "RBC（赤血球数）",
		unit: "×10⁶/µL",
		refLow: 4.0,
		refHigh: 5.5,
		referenceJa: "4.0〜5.5",
		referenceEn: "4.0-5.5",
		loincCode: "26453-1",
		category: "hematology",
	},
	{
		id: "hb",
		group: "cbc",
		labelEn: "Hb (Hemoglobin)",
		labelJa: "Hb（ヘモグロビン）",
		unit: "g/dL",
		refLow: 12.0,
		refHigh: 17.0,
		referenceJa: "男: 13.0〜17.0 / 女: 12.0〜15.5",
		referenceEn: "M: 13.0-17.0 / F: 12.0-15.5",
		loincCode: "718-7",
		category: "hematology",
		refRanges: {
			male: { low: 13.0, high: 17.0 },
			female: { low: 12.0, high: 15.5 },
		},
	},
	{
		id: "hct",
		group: "cbc",
		labelEn: "Hct (Hematocrit)",
		labelJa: "Hct（ヘマトクリット）",
		unit: "%",
		refLow: 36,
		refHigh: 50,
		referenceJa: "男: 40〜50 / 女: 36〜45",
		referenceEn: "M: 40-50 / F: 36-45",
		loincCode: "4544-3",
		category: "hematology",
		refRanges: {
			male: { low: 40, high: 50 },
			female: { low: 36, high: 45 },
		},
	},
	{
		id: "plt",
		group: "cbc",
		labelEn: "PLT (Platelets)",
		labelJa: "PLT（血小板数）",
		unit: "×10³/µL",
		refLow: 150,
		refHigh: 400,
		referenceJa: "150〜400",
		referenceEn: "150-400",
		loincCode: "26515-7",
		category: "hematology",
	},

	// 電解質・腎機能 - biochemistry
	{
		id: "na",
		group: "electrolyteRenal",
		labelEn: "Na (Sodium)",
		labelJa: "Na（ナトリウム）",
		unit: "mEq/L",
		refLow: 135,
		refHigh: 145,
		referenceJa: "135〜145",
		referenceEn: "135-145",
		loincCode: "2951-2",
		category: "biochemistry",
	},
	{
		id: "k",
		group: "electrolyteRenal",
		labelEn: "K (Potassium)",
		labelJa: "K（カリウム）",
		unit: "mEq/L",
		refLow: 3.5,
		refHigh: 5.0,
		referenceJa: "3.5〜5.0",
		referenceEn: "3.5-5.0",
		loincCode: "2823-3",
		category: "biochemistry",
	},
	{
		id: "cl",
		group: "electrolyteRenal",
		labelEn: "Cl (Chloride)",
		labelJa: "Cl（クロール）",
		unit: "mEq/L",
		refLow: 96,
		refHigh: 106,
		referenceJa: "96〜106",
		referenceEn: "96-106",
		loincCode: "2075-0",
		category: "biochemistry",
	},
	{
		id: "bun",
		group: "electrolyteRenal",
		labelEn: "BUN (Blood Urea Nitrogen)",
		labelJa: "BUN（尿素窒素）",
		unit: "mg/dL",
		refLow: 8,
		refHigh: 20,
		referenceJa: "8〜20",
		referenceEn: "8-20",
		loincCode: "3094-0",
		category: "biochemistry",
	},
	{
		id: "cre",
		group: "electrolyteRenal",
		labelEn: "Cre (Creatinine)",
		labelJa: "Cre（クレアチニン）",
		unit: "mg/dL",
		refLow: 0.6,
		refHigh: 1.2,
		referenceJa: "男: 0.7〜1.3 / 女: 0.6〜1.1",
		referenceEn: "M: 0.7-1.3 / F: 0.6-1.1",
		loincCode: "2160-0",
		category: "biochemistry",
		refRanges: {
			male: { low: 0.7, high: 1.3 },
			female: { low: 0.6, high: 1.1 },
		},
	},
	{
		id: "egfr",
		group: "electrolyteRenal",
		labelEn: "eGFR",
		labelJa: "eGFR（推算糸球体濾過量）",
		unit: "mL/min/1.73m²",
		refLow: 60,
		refHigh: undefined,
		referenceJa: "≥60",
		referenceEn: "≥60",
		loincCode: "33914-3",
		category: "biochemistry",
	},

	// 肝機能 - biochemistry
	{
		id: "ast",
		group: "liver",
		labelEn: "AST (GOT)",
		labelJa: "AST（GOT）",
		unit: "U/L",
		refLow: 10,
		refHigh: 40,
		referenceJa: "10〜40",
		referenceEn: "10-40",
		loincCode: "1920-8",
		category: "biochemistry",
	},
	{
		id: "alt",
		group: "liver",
		labelEn: "ALT (GPT)",
		labelJa: "ALT（GPT）",
		unit: "U/L",
		refLow: 5,
		refHigh: 40,
		referenceJa: "5〜40",
		referenceEn: "5-40",
		loincCode: "1742-6",
		category: "biochemistry",
	},
	{
		id: "alp",
		group: "liver",
		labelEn: "ALP",
		labelJa: "ALP（アルカリフォスファターゼ）",
		unit: "U/L",
		refLow: 30,
		refHigh: 130,
		referenceJa: "30〜130",
		referenceEn: "30-130",
		loincCode: "6768-6",
		category: "biochemistry",
	},
	{
		id: "ggt",
		group: "liver",
		labelEn: "γ-GTP",
		labelJa: "γ-GTP",
		unit: "U/L",
		refLow: undefined,
		refHigh: 80,
		referenceJa: "男: ≤80 / 女: ≤30",
		referenceEn: "M: ≤80 / F: ≤30",
		loincCode: "2324-2",
		category: "biochemistry",
		refRanges: {
			male: { high: 80 },
			female: { high: 30 },
		},
	},
	{
		id: "tbil",
		group: "liver",
		labelEn: "T-Bil (Total Bilirubin)",
		labelJa: "T-Bil（総ビリルビン）",
		unit: "mg/dL",
		refLow: 0.2,
		refHigh: 1.2,
		referenceJa: "0.2〜1.2",
		referenceEn: "0.2-1.2",
		loincCode: "1975-2",
		category: "biochemistry",
	},
	{
		id: "alb",
		group: "liver",
		labelEn: "Alb (Albumin)",
		labelJa: "Alb（アルブミン）",
		unit: "g/dL",
		refLow: 3.5,
		refHigh: 5.0,
		referenceJa: "3.5〜5.0",
		referenceEn: "3.5-5.0",
		loincCode: "1751-7",
		category: "biochemistry",
	},

	// 脂質 - biochemistry
	{
		id: "ldl",
		group: "lipid",
		labelEn: "LDL-C (LDL Cholesterol)",
		labelJa: "LDL-C（LDLコレステロール）",
		unit: "mg/dL",
		refLow: undefined,
		refHigh: 140,
		referenceJa: "<140",
		referenceEn: "<140",
		loincCode: "13457-7",
		category: "biochemistry",
	},
	{
		id: "hdl",
		group: "lipid",
		labelEn: "HDL-C (HDL Cholesterol)",
		labelJa: "HDL-C（HDLコレステロール）",
		unit: "mg/dL",
		refLow: 40,
		refHigh: undefined,
		referenceJa: "≥40",
		referenceEn: "≥40",
		loincCode: "2085-9",
		category: "biochemistry",
	},
	{
		id: "tg",
		group: "lipid",
		labelEn: "TG (Triglycerides)",
		labelJa: "TG（中性脂肪）",
		unit: "mg/dL",
		refLow: undefined,
		refHigh: 150,
		referenceJa: "<150",
		referenceEn: "<150",
		loincCode: "2571-8",
		category: "biochemistry",
	},

	// 血糖 - biochemistry
	{
		id: "glu_f",
		group: "glucose",
		labelEn: "FBS (Fasting Blood Sugar)",
		labelJa: "空腹時血糖",
		unit: "mg/dL",
		refLow: 70,
		refHigh: 109,
		referenceJa: "70〜109",
		referenceEn: "70-109",
		loincCode: "1558-6",
		category: "biochemistry",
	},
	{
		id: "hba1c",
		group: "glucose",
		labelEn: "HbA1c",
		labelJa: "HbA1c",
		unit: "%",
		refLow: 4.6,
		refHigh: 6.2,
		referenceJa: "4.6〜6.2",
		referenceEn: "4.6-6.2",
		loincCode: "4548-4",
		category: "biochemistry",
	},

	// その他 - immunology / biochemistry
	{
		id: "crp",
		group: "optional",
		labelEn: "CRP (C-Reactive Protein)",
		labelJa: "CRP（C反応性タンパク）",
		unit: "mg/dL",
		refLow: undefined,
		refHigh: 0.3,
		referenceJa: "≤0.3",
		referenceEn: "≤0.3",
		loincCode: "1988-5",
		category: "immunology",
	},
	{
		id: "tsh",
		group: "optional",
		labelEn: "TSH",
		labelJa: "TSH（甲状腺刺激ホルモン）",
		unit: "µIU/mL",
		refLow: 0.4,
		refHigh: 4.0,
		referenceJa: "0.4〜4.0",
		referenceEn: "0.4-4.0",
		loincCode: "3016-3",
		category: "biochemistry",
	},
];

/**
 * グループ定義
 */
export const LAB_GROUPS: {
	id: LabGroupId;
	labelEn: string;
	labelJa: string;
}[] = [
	{ id: "cbc", labelEn: "CBC (Blood Count)", labelJa: "血算（CBC）" },
	{
		id: "electrolyteRenal",
		labelEn: "Electrolytes & Renal",
		labelJa: "電解質・腎機能",
	},
	{ id: "liver", labelEn: "Liver Function", labelJa: "肝機能" },
	{ id: "lipid", labelEn: "Lipids", labelJa: "脂質" },
	{ id: "glucose", labelEn: "Glucose", labelJa: "血糖" },
	{ id: "optional", labelEn: "Optional", labelJa: "その他" },
];

// ==========================================
// OCR結果マッピング用エイリアス
// ==========================================

/**
 * 検査項目名エイリアス辞書
 * OCR抽出結果をフィールドIDにマッピング
 */
export const TEST_NAME_ALIASES: Record<string, string> = {
	// WBC関連
	WBC: "wbc",
	白血球: "wbc",
	白血球数: "wbc",
	"White Blood Cell": "wbc",
	"White blood cells": "wbc",

	// RBC関連
	RBC: "rbc",
	赤血球: "rbc",
	赤血球数: "rbc",
	"Red Blood Cell": "rbc",
	"Red blood cells": "rbc",

	// Hemoglobin関連
	Hb: "hb",
	HGB: "hb",
	ヘモグロビン: "hb",
	Hemoglobin: "hb",
	血色素量: "hb",

	// Hematocrit関連
	Hct: "hct",
	Ht: "hct",
	ヘマトクリット: "hct",
	Hematocrit: "hct",

	// Platelet関連
	PLT: "plt",
	血小板: "plt",
	血小板数: "plt",
	Platelet: "plt",
	Platelets: "plt",

	// 電解質
	Na: "na",
	ナトリウム: "na",
	Sodium: "na",
	K: "k",
	カリウム: "k",
	Potassium: "k",
	Cl: "cl",
	クロール: "cl",
	Chloride: "cl",

	// 腎機能
	BUN: "bun",
	尿素窒素: "bun",
	"Blood Urea Nitrogen": "bun",
	Cre: "cre",
	CRE: "cre",
	クレアチニン: "cre",
	Creatinine: "cre",
	eGFR: "egfr",
	EGFR: "egfr",
	推算糸球体濾過量: "egfr",

	// 肝機能
	AST: "ast",
	GOT: "ast",
	アスパラギン酸アミノトランスフェラーゼ: "ast",
	ALT: "alt",
	GPT: "alt",
	アラニンアミノトランスフェラーゼ: "alt",
	ALP: "alp",
	アルカリフォスファターゼ: "alp",
	"γ-GTP": "ggt",
	γGTP: "ggt",
	GGT: "ggt",
	"γ-GT": "ggt",
	ガンマGTP: "ggt",
	"T-Bil": "tbil",
	TBIL: "tbil",
	総ビリルビン: "tbil",
	"Total Bilirubin": "tbil",
	Alb: "alb",
	ALB: "alb",
	アルブミン: "alb",
	Albumin: "alb",

	// 脂質
	LDL: "ldl",
	"LDL-C": "ldl",
	LDLコレステロール: "ldl",
	"LDL Cholesterol": "ldl",
	悪玉コレステロール: "ldl",
	HDL: "hdl",
	"HDL-C": "hdl",
	HDLコレステロール: "hdl",
	"HDL Cholesterol": "hdl",
	善玉コレステロール: "hdl",
	TG: "tg",
	中性脂肪: "tg",
	Triglyceride: "tg",
	Triglycerides: "tg",
	トリグリセライド: "tg",

	// 血糖
	FBS: "glu_f",
	空腹時血糖: "glu_f",
	"Fasting Blood Sugar": "glu_f",
	"Fasting Glucose": "glu_f",
	Glucose: "glu_f",
	BS: "glu_f",
	血糖: "glu_f",
	HbA1c: "hba1c",
	NGSP: "hba1c",
	グリコヘモグロビン: "hba1c",
	"Hemoglobin A1c": "hba1c",

	// その他
	CRP: "crp",
	C反応性タンパク: "crp",
	"C-Reactive Protein": "crp",
	TSH: "tsh",
	甲状腺刺激ホルモン: "tsh",
	"Thyroid Stimulating Hormone": "tsh",
};

// ==========================================
// 変換関数
// ==========================================

/**
 * MetaDataを生成
 */
export function createMetaData(): MetaData {
	return {
		schema_version: "2.0.0",
		updated_at: Date.now(),
		generator: "CurePocket_Web_v1",
	};
}

/**
 * フラグを計算
 * @param value 検査値
 * @param refLow 基準値下限（デフォルト値）
 * @param refHigh 基準値上限（デフォルト値）
 * @param gender 性別（"male" | "female"）
 * @param refRanges 男女別の基準値範囲
 * @returns フラグ（H: 高い, L: 低い, N: 正常）
 */
export function calculateFlag(
	value: number,
	refLow?: number,
	refHigh?: number,
	gender?: "male" | "female",
	refRanges?: {
		male?: { low?: number; high?: number };
		female?: { low?: number; high?: number };
	},
): "H" | "L" | "N" {
	// refRangesとgenderが提供され、genderが"male"または"female"の場合、性別に応じた閾値を使用
	let effectiveRefLow = refLow;
	let effectiveRefHigh = refHigh;

	if (
		refRanges &&
		gender &&
		(gender === "male" || gender === "female")
	) {
		const genderRange = refRanges[gender];
		if (genderRange) {
			effectiveRefLow = genderRange.low ?? refLow;
			effectiveRefHigh = genderRange.high ?? refHigh;
		}
	}

	if (effectiveRefLow !== undefined && value < effectiveRefLow) {
		return "L";
	}
	if (effectiveRefHigh !== undefined && value > effectiveRefHigh) {
		return "H";
	}
	return "N";
}

/**
 * カテゴリを決定（アイテムの多数決）
 * @param items 検査項目配列
 * @returns 最も多いカテゴリ
 */
export function determineCategory(
	items: { category: LabCategory }[],
): LabCategory {
	if (items.length === 0) return "other";

	const counts: Record<LabCategory, number> = {
		biochemistry: 0,
		hematology: 0,
		immunology: 0,
		other: 0,
	};

	for (const item of items) {
		counts[item.category]++;
	}

	let maxCategory: LabCategory = "other";
	let maxCount = 0;

	for (const [category, count] of Object.entries(counts)) {
		if (count > maxCount) {
			maxCount = count;
			maxCategory = category as LabCategory;
		}
	}

	return maxCategory;
}

/**
 * フォーム入力値をLabResultsDataに変換
 * @param values フォームの値（fieldId -> 文字列値）
 * @param testDate 検査日（YYYY-MM-DD）
 * @param facility 医療機関名
 * @param locale 現在のロケール（翻訳用）
 * @param gender 性別（"male" | "female"）
 * @returns LabResultsData
 */
export function formValuesToLabResultsData(
	values: Record<string, string>,
	testDate: string,
	_facility: string,
	locale: string,
	gender?: "male" | "female",
): LabResultsData {
	const items: (LabItem & { category: LabCategory })[] = [];

	for (const field of LAB_FIELDS) {
		const valueStr = values[field.id];
		if (!valueStr || valueStr.trim() === "") continue;

		const value = Number.parseFloat(valueStr);
		if (Number.isNaN(value)) continue;

		// 性別に応じた閾値でフラグを計算
		const flag = calculateFlag(
			value,
			field.refLow,
			field.refHigh,
			gender,
			field.refRanges,
		);

		// 性別に応じた基準値を決定（表示用）
		let effectiveRefLow = field.refLow;
		let effectiveRefHigh = field.refHigh;
		if (
			field.refRanges &&
			gender &&
			(gender === "male" || gender === "female")
		) {
			const genderRange = field.refRanges[gender];
			if (genderRange) {
				effectiveRefLow = genderRange.low ?? field.refLow;
				effectiveRefHigh = genderRange.high ?? field.refHigh;
			}
		}

		const name: LocalizedString = {
			en: field.labelEn,
			local: locale === "ja" ? field.labelJa : field.labelEn,
		};

		items.push({
			codes: {
				loinc: field.loincCode,
			},
			name,
			value,
			unit: field.unit,
			range_low: effectiveRefLow,
			range_high: effectiveRefHigh,
			flag,
			category: field.category,
		});
	}

	// カテゴリを決定
	const category = determineCategory(items);

	// categoryプロパティを削除してLabItem[]に変換
	const labItems: LabItem[] = items.map(
		({ category: _category, ...item }) => item,
	);

	const labResult: LabResult = {
		id: uuidv4(),
		date: testDate,
		category,
		items: labItems,
	};

	return {
		meta: createMetaData(),
		lab_results: [labResult],
	};
}

/**
 * OCR結果をフォーム値にマッピング
 * @param ocrItems OCR抽出された検査項目
 * @returns マッピングされたフォーム値と未マッピング項目
 */
export function mapOCRResultToFormValues(
	ocrItems: {
		testName: string;
		value: string;
		unit?: string;
		refRange?: string;
		flag?: string;
	}[],
): { values: Record<string, string>; unmapped: typeof ocrItems } {
	const values: Record<string, string> = {};
	const unmapped: typeof ocrItems = [];

	for (const item of ocrItems) {
		// エイリアス辞書でフィールドIDを検索
		const fieldId = TEST_NAME_ALIASES[item.testName];

		if (fieldId) {
			values[fieldId] = item.value;
		} else {
			// 部分一致でも検索
			const normalizedTestName = item.testName
				.toLowerCase()
				.replace(/[\s\-_]/g, "");
			let found = false;

			for (const [alias, id] of Object.entries(TEST_NAME_ALIASES)) {
				const normalizedAlias = alias.toLowerCase().replace(/[\s\-_]/g, "");
				if (
					normalizedTestName.includes(normalizedAlias) ||
					normalizedAlias.includes(normalizedTestName)
				) {
					values[id] = item.value;
					found = true;
					break;
				}
			}

			if (!found) {
				unmapped.push(item);
			}
		}
	}

	return { values, unmapped };
}

/**
 * フィールドIDからLabFieldDefinitionを取得
 * @param fieldId フィールドID
 * @returns フィールド定義またはundefined
 */
export function getLabFieldById(
	fieldId: string,
): LabFieldDefinition | undefined {
	return LAB_FIELDS.find((f) => f.id === fieldId);
}

/**
 * グループ別に検査項目を取得
 * @param groupId グループID
 * @returns 該当グループの検査項目配列
 */
export function getLabFieldsByGroup(groupId: LabGroupId): LabFieldDefinition[] {
	return LAB_FIELDS.filter((f) => f.group === groupId);
}
