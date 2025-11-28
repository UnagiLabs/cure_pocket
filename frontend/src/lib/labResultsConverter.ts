/**
 * 検査値データの変換関数
 * フォーム入力値 ↔ LabResultsData (JSON) の相互変換
 */

import { v4 as uuidv4 } from "uuid";
import { LAB_FIELDS, LAB_GROUPS } from "@/data/labFields";
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

/**
 * 検査項目グループID
 */
export type LabGroupId =
	| "cbc"
	| "electrolyteRenal"
	| "liver"
	| "lipid"
	| "glucose"
	| "optional";

/**
 * 検査項目カテゴリ
 */
export type LabCategory =
	| "biochemistry"
	| "hematology"
	| "immunology"
	| "other";

/**
 * 検査項目フィールド定義インターフェース
 *
 * 各検査項目のID、ラベル、単位、基準値範囲、LOINCコードなどを定義。
 * 性別に応じた基準値が異なる項目は refRanges プロパティで定義。
 */
export interface LabFieldDefinition {
	id: string;
	group: LabGroupId;
	labelEn: string;
	labelJa: string;
	labelZh: string;
	labelFr: string;
	labelPt: string;
	unit: string;
	refLow?: number;
	refHigh?: number;
	/**
	 * 基準値範囲（全言語共通）
	 * 数値は言語に関係なく同じため、1つのフィールドで管理
	 */
	reference: string;
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
 *
 * データは frontend/src/data/labFields.ts からインポート。
 * 既存のインポートパスとの互換性のため、ここから再エクスポート。
 */
export { LAB_FIELDS, LAB_GROUPS };

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

	if (refRanges && gender && (gender === "male" || gender === "female")) {
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

		// ロケールに応じたラベルを選択
		let localLabel: string;
		switch (locale) {
			case "ja":
				localLabel = field.labelJa;
				break;
			case "zh":
				localLabel = field.labelZh;
				break;
			case "fr":
				localLabel = field.labelFr;
				break;
			case "pt":
				localLabel = field.labelPt;
				break;
			default:
				localLabel = field.labelEn;
		}

		const name: LocalizedString = {
			en: field.labelEn,
			local: localLabel,
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
