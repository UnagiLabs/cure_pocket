/**
 * CurePocket Metadata Schema (v3.0.0)
 *
 * メタデータBlobの型定義
 *
 * アーキテクチャ:
 * - SBT DataEntry → メタデータBlob → データBlob[] の2層構造
 * - メタデータBlobは各データBlobへの参照とパーティション情報を保持
 * - 同じデータ種のメタデータとデータBlobは全て同一seal_idで暗号化
 */

import type { DataType } from "./healthData";

// ==========================================
// 共通基底型
// ==========================================

/**
 * メタデータの共通構造
 */
export interface BaseMetadata<TEntry extends BaseMetadataEntry> {
	/** スキーマバージョン */
	schema_version: "3.0.0";
	/** データ種別 */
	data_type: DataType;
	/** 最終更新時刻（Unix timestamp ms） */
	updated_at: number;
	/** データBlobへの参照一覧 */
	entries: TEntry[];
}

/**
 * メタデータエントリの基底型
 */
export interface BaseMetadataEntry {
	/** データBlobのWalrus Blob ID */
	blob_id: string;
}

// ==========================================
// バイタルサイン型（VitalSignType）
// ==========================================

/**
 * バイタルサインの種類
 */
export type VitalSignType =
	| "blood_pressure"
	| "heart_rate"
	| "blood_glucose"
	| "weight"
	| "temperature"
	| "other";

// ==========================================
// 各データ種のメタデータEntry型
// ==========================================

/**
 * basic_profile メタデータエントリ
 * パーティションなし（単一blob）
 */
export interface BasicProfileMetadataEntry extends BaseMetadataEntry {
	// 追加フィールドなし
}

/**
 * medications メタデータエントリ
 * パーティションキー: prescription_id
 */
export interface MedicationsMetadataEntry extends BaseMetadataEntry {
	/** 処方箋ID（パーティションキー） */
	prescription_id: string;
	/** 処方日 (YYYY-MM-DD) */
	prescription_date: string;
	/** 医療機関名 */
	clinic: string;
	/** 薬剤数 */
	medication_count: number;
}

/**
 * conditions メタデータエントリ
 * パーティションなし（単一blob）
 */
export interface ConditionsMetadataEntry extends BaseMetadataEntry {
	/** 疾患数 */
	condition_count: number;
}

/**
 * lab_results メタデータエントリ
 * パーティションキー: test_date
 */
export interface LabResultsMetadataEntry extends BaseMetadataEntry {
	/** 検査日（パーティションキー）(YYYY-MM-DD) */
	test_date: string;
	/** 医療機関名 */
	facility: string;
	/** 検査項目数 */
	test_count: number;
}

/**
 * imaging_meta メタデータエントリ
 * パーティションキー: study_id
 */
export interface ImagingMetadataEntry extends BaseMetadataEntry {
	/** 検査ID（パーティションキー） */
	study_id: string;
	/** 検査日 (YYYY-MM-DD) */
	study_date: string;
	/** モダリティ（CT, MRI, X-Ray等） */
	modality: string;
	/** 撮影部位 */
	body_part: string;
	/** imaging_binaryのBlob ID */
	binary_blob_id: string;
}

/**
 * self_metrics (Vitals) メタデータエントリ
 * パーティションキー: month_key
 */
export interface SelfMetricsMetadataEntry extends BaseMetadataEntry {
	/** 月キー（パーティションキー）"YYYY-MM" */
	month_key: string;
	/** レコード数 */
	record_count: number;
	/** 含まれるバイタル種類 */
	types: VitalSignType[];
}

// ==========================================
// 各データ種のメタデータ完全型
// ==========================================

/**
 * basic_profile メタデータ
 */
export type BasicProfileMetadata = BaseMetadata<BasicProfileMetadataEntry>;

/**
 * medications メタデータ
 */
export type MedicationsMetadata = BaseMetadata<MedicationsMetadataEntry>;

/**
 * conditions メタデータ
 */
export type ConditionsMetadata = BaseMetadata<ConditionsMetadataEntry>;

/**
 * lab_results メタデータ
 */
export type LabResultsMetadata = BaseMetadata<LabResultsMetadataEntry>;

/**
 * imaging_meta メタデータ
 */
export type ImagingMetadata = BaseMetadata<ImagingMetadataEntry>;

/**
 * self_metrics メタデータ
 */
export type SelfMetricsMetadata = BaseMetadata<SelfMetricsMetadataEntry>;

/**
 * メタデータのUnion型
 */
export type AnyMetadata =
	| BasicProfileMetadata
	| MedicationsMetadata
	| ConditionsMetadata
	| LabResultsMetadata
	| ImagingMetadata
	| SelfMetricsMetadata;

// ==========================================
// ヘルパー型
// ==========================================

/**
 * データ種別 → メタデータEntry型のマッピング
 */
export type MetadataEntryType<T extends DataType> = T extends "basic_profile"
	? BasicProfileMetadataEntry
	: T extends "medications"
		? MedicationsMetadataEntry
		: T extends "conditions"
			? ConditionsMetadataEntry
			: T extends "lab_results"
				? LabResultsMetadataEntry
				: T extends "imaging_meta"
					? ImagingMetadataEntry
					: T extends "self_metrics"
						? SelfMetricsMetadataEntry
						: BaseMetadataEntry;

/**
 * データ種別 → メタデータ型のマッピング
 */
export type MetadataType<T extends DataType> = T extends "basic_profile"
	? BasicProfileMetadata
	: T extends "medications"
		? MedicationsMetadata
		: T extends "conditions"
			? ConditionsMetadata
			: T extends "lab_results"
				? LabResultsMetadata
				: T extends "imaging_meta"
					? ImagingMetadata
					: T extends "self_metrics"
						? SelfMetricsMetadata
						: BaseMetadata<BaseMetadataEntry>;

// ==========================================
// ファクトリ関数用の型
// ==========================================

/**
 * 空のメタデータを作成するための入力パラメータ
 */
export interface CreateEmptyMetadataParams {
	dataType: DataType;
}

/**
 * 空のメタデータを作成
 */
export function createEmptyMetadata<T extends DataType>(
	dataType: T,
): MetadataType<T> {
	return {
		schema_version: "3.0.0",
		data_type: dataType,
		updated_at: Date.now(),
		entries: [],
	} as unknown as MetadataType<T>;
}
