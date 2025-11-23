/**
 * 医師向け患者情報閲覧の型定義
 */

import type {
	Allergy,
	ImagingReport,
	LabResult,
	MedicalHistory,
	PatientProfile,
	Prescription,
	VitalSign,
} from "./index";

/**
 * 患者が共有可能なデータスコープ
 */
export type DataScope =
	| "basic_profile" // 基本情報
	| "medications" // 処方箋・薬剤情報
	| "allergies" // アレルギー情報
	| "conditions" // 疾患・病歴
	| "lab_results" // 検査値
	| "imaging_reports" // 画像レポート
	| "vital_signs"; // バイタルサイン

/**
 * 医師向け患者情報ビュー
 * 患者が共有を許可したデータスコープに基づいて表示
 */
export interface DoctorPatientView {
	patientId: string; // MedicalPassport ID
	allowedScopes: DataScope[]; // 患者が許可したデータスコープ
	accessExpiry?: Date; // アクセス有効期限
	viewedAt: Date; // 閲覧開始日時

	// データスコープに応じて表示されるデータ（undefinedの場合は共有されていない）
	profile?: Partial<PatientProfile>; // 基本情報（一部のみ共有される場合もある）
	prescriptions?: Prescription[]; // 処方箋
	allergies?: Allergy[]; // アレルギー
	medicalHistories?: MedicalHistory[]; // 病歴
	labResults?: LabResult[]; // 検査値
	imagingReports?: ImagingReport[]; // 画像レポート
	vitalSigns?: VitalSign[]; // バイタルサイン
}

/**
 * データスコープの表示情報
 */
export interface DataScopeInfo {
	scope: DataScope;
	label: string; // 表示名（多言語対応）
	icon: string; // アイコン名
	color: string; // テーマカラー
	available: boolean; // このスコープのデータが利用可能か
}
