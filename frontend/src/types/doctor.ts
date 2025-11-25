/**
 * 医師向け患者情報閲覧の型定義
 */

import type { DataType as ContractDataType } from "./healthData";
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
 * DataScope（UI用）からコントラクトのdataTypeへのマッピング
 *
 * UI上のスコープ名とコントラクトで有効なdataType文字列の対応関係を定義。
 * コントラクトで有効なdataType:
 *   "basic_profile", "medications", "conditions", "lab_results",
 *   "imaging_meta", "imaging_binary", "self_metrics"
 */
export const dataScopeToContractDataType: Record<DataScope, ContractDataType> =
	{
		basic_profile: "basic_profile",
		medications: "medications",
		allergies: "basic_profile", // アレルギーはbasic_profileに含まれる
		conditions: "conditions",
		lab_results: "lab_results",
		imaging_reports: "imaging_meta",
		vital_signs: "self_metrics",
	};

/**
 * DataScopeをコントラクトのdataTypeに変換
 */
export function toContractDataType(scope: DataScope): ContractDataType {
	return dataScopeToContractDataType[scope];
}

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
