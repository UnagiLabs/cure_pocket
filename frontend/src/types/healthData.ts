/**
 * CurePocket Health Data Schema
 *
 * Based on data_schema.md v2.0.0
 *
 * This file defines the complete type system for medical data stored in Walrus.
 * These types follow international standards (ATC, RxNorm, ICD-10, LOINC, DICOM)
 * for global interoperability while maintaining local language support.
 */

// ==========================================
// Root & Metadata Types
// ==========================================

/**
 * Root structure for all health data stored in Walrus
 * @deprecated Use data-type-specific interfaces instead (BasicProfileData, MedicationsData, etc.)
 */
export interface HealthData {
	meta: MetaData;
	profile: UserProfile;
	medications: Medication[];
	conditions: Condition[];
	lab_results: LabResult[];
	imaging: ImagingStudy[];
	allergies: Allergy[];
}

/**
 * Data type identifier for different kinds of medical data
 */
export type DataType =
	| "basic_profile"
	| "medications"
	| "conditions"
	| "lab_results"
	| "imaging_meta"
	| "imaging_binary"
	| "self_metrics";

// ==========================================
// Data Type-Specific Interfaces (v2.0.0)
// ==========================================

/**
 * Basic profile data including demographics and allergies
 */
export interface BasicProfileData {
	meta: MetaData;
	profile: UserProfile;
	allergies: Allergy[];
}

/**
 * Medication data
 */
export interface MedicationsData {
	meta: MetaData;
	medications: Medication[];
}

/**
 * Conditions/diseases data
 */
export interface ConditionsData {
	meta: MetaData;
	conditions: Condition[];
}

/**
 * Laboratory results data
 */
export interface LabResultsData {
	meta: MetaData;
	lab_results: LabResult[];
}

/**
 * Imaging study metadata
 */
export interface ImagingMetaData {
	meta: MetaData;
	imaging_meta: ImagingStudy[];
}

/**
 * Imaging binary data (DICOM, ZIP, etc.)
 */
export interface ImagingBinaryData {
	meta: MetaData;
	imaging_binary: {
		content_type: string; // e.g., "application/dicom", "application/zip"
		data: ArrayBuffer;
	};
}

/**
 * Self-tracked metrics (vital signs, daily measurements)
 */
export interface SelfMetricsData {
	meta: MetaData;
	self_metrics: SelfMetric[];
}

/**
 * Self-tracked metric entry
 */
export interface SelfMetric {
	id: string; // UUID v4
	metric_type:
		| "blood_pressure"
		| "heart_rate"
		| "blood_glucose"
		| "weight"
		| "temperature"
		| "other";
	recorded_at: string; // ISO 8601 datetime
	value?: number; // Single value (for heart rate, glucose, weight, temperature)
	systolic?: number; // For blood pressure
	diastolic?: number; // For blood pressure
	unit: string; // e.g., "mmHg", "bpm", "mg/dL", "kg", "°C"
	notes?: string;
}

/**
 * Metadata about the data structure and updates
 */
export interface MetaData {
	schema_version: string; // e.g., "1.0.0"
	updated_at: number; // Unix Timestamp (milliseconds)
	generator: string; // e.g., "CurePocket_Web_v1"
}

/**
 * Localized string for international + local language support
 */
export interface LocalizedString {
	en: string; // English (for Emergency Card display)
	local: string; // Local language (for daily use)
}

// ==========================================
// User Profile
// ==========================================

export interface UserProfile {
	birth_year: number; // For age calculation (privacy: year only, not full DOB)
	gender: "male" | "female" | "other";
	country: string; // ISO 3166-1 alpha-2 (e.g., "JP", "US")
	blood_type?: string; // e.g., "A+", "O-", "Unknown"
	biometrics?: {
		height_cm: number;
		weight_kg: number;
		bmi: number; // Auto-calculated from height/weight
	};
}

// ==========================================
// Medications (薬剤)
// ==========================================

export interface Medication {
	id: string; // UUID v4
	status: "active" | "completed" | "stopped";
	codes: {
		atc?: string; // WHO ATC Code (Anatomical Therapeutic Chemical)
		rxnorm?: string; // RxNorm CUI (Global standard for drug ingredients)
		local_code?: string; // YJ Code (Japan) or NDC (USA)
	};
	name: LocalizedString; // Drug brand name or generic name
	dosage: string; // Dosage and frequency (e.g., "1 tablet twice daily")
	start_date: string; // YYYY-MM-DD
	end_date?: string; // YYYY-MM-DD (optional)
	prescriber?: string; // Prescribing doctor or clinic name (optional)
}

// ==========================================
// Conditions (疾患・病歴)
// ==========================================

export interface Condition {
	id: string; // UUID v4
	status: "active" | "remission" | "resolved";
	codes: {
		icd10?: string; // ICD-10 Code (e.g., "E11.9" for Type 2 Diabetes)
	};
	name: LocalizedString; // Condition name
	onset_date?: string; // YYYY-MM-DD (optional)
	note?: string; // Free-text notes (optional)
}

// ==========================================
// Lab Results (検査結果)
// ==========================================

export interface LabResult {
	id: string; // UUID v4
	date: string; // Test date YYYY-MM-DD
	category: "biochemistry" | "hematology" | "immunology" | "other";
	items: LabItem[]; // Array of test items (one lab session can have multiple tests)
}

export interface LabItem {
	codes: {
		loinc?: string; // LOINC Code (e.g., "4548-4" for HbA1c)
	};
	name: LocalizedString; // Test item name
	value: number; // Test result value
	unit: string; // Unit (e.g., "%", "mg/dL")
	range_low?: number; // Reference range lower bound (optional)
	range_high?: number; // Reference range upper bound (optional)
	flag?: "H" | "L" | "N"; // H=High, L=Low, N=Normal/Null
}

// ==========================================
// Imaging Studies (画像検査)
// ==========================================

export interface ImagingStudy {
	id: string; // UUID v4
	date: string; // Imaging date YYYY-MM-DD
	modality: "CT" | "MR" | "US" | "XR" | "XA" | "OT"; // DICOM Modality Codes
	body_site: LocalizedString; // Body part (e.g., "Chest", "Head")
	summary: LocalizedString; // Radiologist report summary
	abnormal_flag: boolean; // Whether abnormalities were found
	dicom_blob_id?: string; // Future use: DICOM image data Walrus Blob ID
}

// ==========================================
// Allergies (アレルギー)
// ==========================================

export interface Allergy {
	id: string; // UUID v4
	substance: {
		code_type?: "rxnorm" | "atc" | "food" | "other";
		code?: string;
		name: string;
	};
	severity: "mild" | "moderate" | "severe";
	reaction?: string; // Reaction description (e.g., "Rash", "Anaphylaxis")
}

// ==========================================
// Analytics Data Schema (統計データ)
// ==========================================

/**
 * Anonymized statistics payload for analytics submission
 * This data is completely separated from personal health data
 */
export interface AnonymousStatsPayload {
	meta: {
		schema_version: string;
		report_period: string; // YYYY-MM
	};
	demographics: {
		country: string; // ISO 3166-1 alpha-2
		age_band: string; // e.g., "30-39" (10-year bands)
		sex: "M" | "F" | "O"; // Male, Female, Other
	};
	medication_stats: Array<{
		atc_l3_code: string; // ATC Level 3 (first 4 characters)
		active_count: number;
	}>;
	condition_stats: Array<{
		icd10_l3_code: string; // ICD-10 Level 3 (first 3 characters)
		status: string;
	}>;
	lab_stats_summary: Array<{
		loinc_code: string;
		result_flag: "H" | "L" | "N";
	}>;
}

/**
 * Analytics submission with separated reward claim
 */
export interface AnalyticsSubmission {
	stats_payload: AnonymousStatsPayload; // Anonymized data
	reward_claim: {
		walletAddress: string;
		signature: string;
	}; // Separated for privacy
}

// ==========================================
// Validation & Helper Types
// ==========================================

/**
 * Status for async operations
 */
export type AsyncStatus = "idle" | "loading" | "success" | "error";

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
}

/**
 * Walrus blob reference
 */
export interface WalrusBlobReference {
	blobId: string;
	uploadedAt: number; // Unix timestamp
	size: number; // Blob size in bytes
}
