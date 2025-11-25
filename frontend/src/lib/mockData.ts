/**
 * モックデータ定義
 * DEMO動画用のサンプル医療データ
 *
 * 注意: このDataTypeはUI表示用のカテゴリーIDです。
 * コントラクトで使用するdataTypeは @/types/healthData からimportしてください。
 * UI→Contract マッピング:
 *   - medications → "medications"
 *   - allergies → "basic_profile" (アレルギーはbasic_profileに含まれる)
 *   - histories → "conditions"
 *   - labs → "lab_results"
 *   - imaging → "imaging_meta"
 *   - vitals → "self_metrics"
 */

/**
 * UI表示用のカテゴリーID
 * @deprecated コントラクト連携時は DataType from "@/types/healthData" を使用
 */
export type MockDataType =
	| "medications"
	| "allergies"
	| "histories"
	| "labs"
	| "imaging"
	| "vitals";

// Backward compatibility alias
export type DataType = MockDataType;

export interface Medication {
	name: string;
	dosage: string;
	frequency: string;
	startDate: string;
	prescribedBy?: string;
	notes?: string;
}

export interface Allergy {
	allergen: string;
	reaction: string;
	severity: "mild" | "moderate" | "severe";
	diagnosedDate: string;
}

export interface History {
	condition: string;
	diagnosedDate: string;
	status: "active" | "resolved";
	notes?: string;
}

export interface LabResult {
	testName: string;
	value: string;
	unit: string;
	referenceRange: string;
	date: string;
	status: "normal" | "abnormal" | "critical";
}

export interface ImagingReport {
	examType: string;
	bodyPart: string;
	date: string;
	findings: string;
	radiologist: string;
}

export interface VitalSign {
	type: string;
	value: string;
	unit: string;
	date: string;
	time: string;
}

export const mockData = {
	medications: [
		{
			name: "Amoxicillin",
			dosage: "500mg",
			frequency: "3回/日",
			startDate: "2025-01-15",
			prescribedBy: "Dr. 山田太郎",
			notes: "食後服用",
		},
		{
			name: "Lisinopril",
			dosage: "10mg",
			frequency: "1回/日",
			startDate: "2024-06-01",
			prescribedBy: "Dr. 佐藤花子",
			notes: "朝食後",
		},
		{
			name: "Metformin",
			dosage: "850mg",
			frequency: "2回/日",
			startDate: "2024-03-10",
			prescribedBy: "Dr. 田中一郎",
			notes: "朝夕食後",
		},
	] as Medication[],

	allergies: [
		{
			allergen: "ペニシリン",
			reaction: "発疹、かゆみ",
			severity: "moderate" as const,
			diagnosedDate: "2020-05-12",
		},
		{
			allergen: "卵",
			reaction: "蕁麻疹",
			severity: "mild" as const,
			diagnosedDate: "2015-03-20",
		},
		{
			allergen: "ハウスダスト",
			reaction: "くしゃみ、鼻水",
			severity: "mild" as const,
			diagnosedDate: "2018-11-05",
		},
	] as Allergy[],

	histories: [
		{
			condition: "高血圧",
			diagnosedDate: "2024-01-15",
			status: "active" as const,
			notes: "定期的に血圧測定中",
		},
		{
			condition: "2型糖尿病",
			diagnosedDate: "2023-08-20",
			status: "active" as const,
			notes: "食事療法と薬物療法",
		},
		{
			condition: "虫垂炎",
			diagnosedDate: "2019-07-10",
			status: "resolved" as const,
			notes: "2019年7月に手術済み",
		},
	] as History[],

	labs: [
		{
			testName: "ヘモグロビンA1c (HbA1c)",
			value: "6.8",
			unit: "%",
			referenceRange: "4.0-6.0",
			date: "2025-01-20",
			status: "abnormal" as const,
		},
		{
			testName: "総コレステロール",
			value: "195",
			unit: "mg/dL",
			referenceRange: "150-219",
			date: "2025-01-20",
			status: "normal" as const,
		},
		{
			testName: "血糖値 (空腹時)",
			value: "118",
			unit: "mg/dL",
			referenceRange: "70-110",
			date: "2025-01-20",
			status: "abnormal" as const,
		},
		{
			testName: "クレアチニン",
			value: "0.9",
			unit: "mg/dL",
			referenceRange: "0.6-1.2",
			date: "2025-01-20",
			status: "normal" as const,
		},
	] as LabResult[],

	imaging: [
		{
			examType: "胸部X線",
			bodyPart: "胸部",
			date: "2025-01-18",
			findings: "両肺野に異常陰影なし。心拡大なし。",
			radiologist: "Dr. 鈴木次郎",
		},
		{
			examType: "腹部CT",
			bodyPart: "腹部",
			date: "2024-11-25",
			findings: "肝臓、腎臓、膵臓に異常所見なし。軽度の脂肪肝が認められる。",
			radiologist: "Dr. 高橋美咲",
		},
	] as ImagingReport[],

	vitals: [
		{
			type: "血圧 (収縮期)",
			value: "135",
			unit: "mmHg",
			date: "2025-01-24",
			time: "09:30",
		},
		{
			type: "血圧 (拡張期)",
			value: "85",
			unit: "mmHg",
			date: "2025-01-24",
			time: "09:30",
		},
		{
			type: "心拍数",
			value: "72",
			unit: "bpm",
			date: "2025-01-24",
			time: "09:30",
		},
		{
			type: "体温",
			value: "36.5",
			unit: "°C",
			date: "2025-01-24",
			time: "09:30",
		},
		{
			type: "体重",
			value: "68.5",
			unit: "kg",
			date: "2025-01-24",
			time: "09:30",
		},
		{
			type: "SpO2",
			value: "98",
			unit: "%",
			date: "2025-01-24",
			time: "09:30",
		},
	] as VitalSign[],
};

/**
 * データタイプに基づいてモックデータを取得
 */
export function getMockData(dataType: DataType | DataType[]) {
	const types = Array.isArray(dataType) ? dataType : [dataType];
	const result: Record<string, unknown> = {};

	for (const type of types) {
		result[type] = mockData[type] || [];
	}

	return result;
}

/**
 * 日本語のデータタイプ名を取得
 */
export function getDataTypeLabel(dataType: DataType): string {
	const labels: Record<DataType, string> = {
		medications: "処方薬",
		allergies: "アレルギー",
		histories: "病歴",
		labs: "検査結果",
		imaging: "画像診断",
		vitals: "バイタルサイン",
	};
	return labels[dataType] || dataType;
}
