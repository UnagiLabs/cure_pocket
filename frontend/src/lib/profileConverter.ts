/**
 * Profile Converter
 *
 * Converts PatientProfile and app data to HealthData format for encryption and storage.
 * This module bridges between the UI form data and the standardized HealthData schema.
 */

import { v4 as uuidv4 } from "uuid";
import type {
	AgeBand,
	Allergy,
	ImagingReport,
	LabResult,
	MedicalHistory,
	Medication,
	PatientProfile,
	VitalSign,
} from "@/types";
import type {
	BasicProfileData,
	Condition,
	ConditionsData,
	HealthData,
	Allergy as HealthDataAllergy,
	LabResult as HealthDataLabResult,
	Medication as HealthDataMedication,
	ImagingMetaData,
	ImagingStudy,
	LabResultsData,
	LocalizedString,
	MedicationsData,
	MetaData,
	SelfMetric,
	SelfMetricsData,
	UserProfile,
} from "@/types/healthData";

/**
 * Calculate age band from birth date
 *
 * @param birthDate - Birth date in YYYY-MM-DD format
 * @returns AgeBand or null if birthDate is invalid
 *
 * @example
 * ```typescript
 * calculateAgeBandFromDate("1990-01-15") // Returns "30-39"
 * calculateAgeBandFromDate("2010-05-20") // Returns "0-17"
 * ```
 */
export function calculateAgeBandFromDate(birthDate: string): AgeBand | null {
	if (!birthDate) return null;

	const birth = new Date(birthDate);
	const today = new Date();
	const age = today.getFullYear() - birth.getFullYear();

	// Adjust age if birthday hasn't occurred this year yet
	const monthDiff = today.getMonth() - birth.getMonth();
	const dayDiff = today.getDate() - birth.getDate();
	const adjustedAge =
		monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

	if (adjustedAge < 20) return "10s";
	if (adjustedAge < 30) return "20s";
	if (adjustedAge < 40) return "30s";
	if (adjustedAge < 50) return "40s";
	if (adjustedAge < 60) return "50s";
	if (adjustedAge < 70) return "60s";
	if (adjustedAge < 80) return "70s";
	return "80plus";
}

/**
 * Convert PatientProfile to UserProfile (HealthData format)
 *
 * @param profile - Patient profile from form
 * @returns UserProfile for HealthData
 */
function convertUserProfile(profile: PatientProfile): UserProfile {
	// Use full birth date (YYYY-MM-DD format)
	const birthDate = profile.birthDate || "";

	// Combine all allergies into a single string array
	const allergies: string[] = [
		...profile.drugAllergies.map((d) => d.name),
		...profile.foodAllergies,
	];

	const userProfile: UserProfile = {
		birth_date: birthDate,
		nationality: profile.country || "US",
		gender:
			profile.gender === "unknown"
				? "other"
				: (profile.gender as "male" | "female" | "other"),
		allergies: allergies,
		blood_type: profile.bloodType || "Unknown",
	};

	return userProfile;
}

/**
 * Create localized string with English and local language support
 *
 * @param text - Text in current language
 * @param _locale - Current locale (default: "en")
 * @returns LocalizedString object
 */
function createLocalizedString(text: string, _locale = "en"): LocalizedString {
	return {
		en: text, // For emergency card display
		local: text, // For daily use (could be enhanced with actual translation)
	};
}

/**
 * Convert PatientProfile allergies to HealthData Allergy format
 *
 * @param profile - Patient profile with drug allergies
 * @param _locale - Current locale for localization
 * @returns Array of HealthData Allergy objects
 */
function convertAllergies(
	profile: PatientProfile,
	_locale = "en",
): HealthDataAllergy[] {
	const allergies: HealthDataAllergy[] = [];

	// Convert drug allergies
	for (const drugAllergy of profile.drugAllergies) {
		allergies.push({
			id: uuidv4(),
			substance: {
				code_type: "rxnorm",
				name: drugAllergy.name,
			},
			severity: drugAllergy.severity,
			reaction: undefined, // Could be enhanced if we collect this data
		});
	}

	// Convert food allergies
	for (const foodAllergy of profile.foodAllergies) {
		allergies.push({
			id: uuidv4(),
			substance: {
				code_type: "food",
				name: foodAllergy,
			},
			severity: "moderate", // Default severity for food allergies
			reaction: undefined,
		});
	}

	return allergies;
}

/**
 * Convert chronic conditions and medical histories to HealthData Condition format
 *
 * @param profile - Patient profile with chronic conditions
 * @param medicalHistories - Medical history entries
 * @param locale - Current locale for localization
 * @returns Array of HealthData Condition objects
 */
function convertConditions(
	profile: PatientProfile,
	medicalHistories: MedicalHistory[],
	locale = "en",
): Condition[] {
	const conditions: Condition[] = [];

	// Convert chronic conditions
	for (const condition of profile.chronicConditions) {
		conditions.push({
			id: uuidv4(),
			status: "active",
			codes: {
				icd10: condition.code,
			},
			name: createLocalizedString(condition.label, locale),
			onset_date: undefined,
			note: undefined,
		});
	}

	// Convert medical histories (conditions only, not surgeries)
	for (const history of medicalHistories) {
		if (history.type === "condition") {
			conditions.push({
				id: history.id,
				status:
					history.status === "resolved"
						? "resolved"
						: history.status === "chronic"
							? "active"
							: "active",
				codes: history.icd10Code ? { icd10: history.icd10Code } : {},
				name: createLocalizedString(history.diagnosis, locale),
				onset_date: history.diagnosisDate,
				note: history.resolvedDate
					? `${history.description || ""} 完治日: ${history.resolvedDate}`.trim()
					: history.description || history.notes,
			});
		}
	}

	return conditions;
}

/**
 * Convert app medications to HealthData Medication format
 *
 * @param medications - Medication entries from app state
 * @param locale - Current locale for localization
 * @returns Array of HealthData Medication objects
 */
function convertMedications(
	medications: Medication[],
	locale = "en",
): HealthDataMedication[] {
	return medications.map((med) => ({
		id: med.id,
		status:
			med.status === "active"
				? "active"
				: med.endDate
					? "completed"
					: "stopped",
		codes: {
			// Future enhancement: Add ATC/RxNorm codes
		},
		name: createLocalizedString(med.name, locale),
		dosage: `${med.dose || ""} ${med.frequency || ""}`.trim(),
		start_date: med.startDate || "",
		end_date: med.endDate,
		prescriber: med.clinic,
	}));
}

/**
 * Convert app lab results to HealthData LabResult format
 *
 * @param labResults - Lab result entries from app state
 * @param locale - Current locale for localization
 * @returns Array of HealthData LabResult objects
 */
function convertLabResults(
	labResults: LabResult[],
	locale = "en",
): HealthDataLabResult[] {
	// Group lab results by test date
	const groupedByDate = new Map<string, LabResult[]>();

	for (const lab of labResults) {
		const date = lab.testDate;
		if (!groupedByDate.has(date)) {
			groupedByDate.set(date, []);
		}
		groupedByDate.get(date)?.push(lab);
	}

	// Convert to HealthData format
	return Array.from(groupedByDate.entries()).map(([date, labs]) => ({
		id: uuidv4(),
		date,
		category: (labs[0]?.category as "biochemistry" | "hematology") || "other",
		items: labs.map((lab) => ({
			codes: {},
			name: createLocalizedString(lab.testName, locale),
			value: Number.parseFloat(lab.value) || 0,
			unit: lab.unit || "",
			range_low: lab.referenceRange
				? Number.parseFloat(lab.referenceRange.split("-")[0])
				: undefined,
			range_high: lab.referenceRange
				? Number.parseFloat(lab.referenceRange.split("-")[1])
				: undefined,
			flag: undefined,
		})),
	}));
}

/**
 * Convert app imaging reports to HealthData ImagingStudy format
 *
 * @param imagingReports - Imaging report entries from app state
 * @param locale - Current locale for localization
 * @returns Array of HealthData ImagingStudy objects
 */
function convertImagingStudies(
	imagingReports: ImagingReport[],
	locale = "en",
): ImagingStudy[] {
	return imagingReports.map((report) => ({
		id: report.id,
		date: report.examDate,
		modality: mapImagingTypeToModality(report.type),
		body_site: createLocalizedString(report.bodyPart || "Unknown", locale),
		summary: createLocalizedString(report.summary, locale),
		abnormal_flag:
			report.impression?.toLowerCase().includes("abnormal") || false,
		dicom_blob_id: undefined,
	}));
}

/**
 * Map ImagingType to DICOM modality code
 *
 * @param type - Imaging type from app
 * @returns DICOM modality code
 */
function mapImagingTypeToModality(
	type: "xray" | "ct" | "mri" | "ultrasound" | "other",
): "CT" | "MR" | "US" | "XR" | "XA" | "OT" {
	const mapping: Record<string, "CT" | "MR" | "US" | "XR" | "XA" | "OT"> = {
		ct: "CT",
		mri: "MR",
		ultrasound: "US",
		xray: "XR",
		other: "OT",
	};
	return mapping[type] || "OT";
}

/**
 * Convert HealthData back to PatientProfile format
 *
 * This function performs the reverse conversion from the encrypted HealthData
 * format back to the UI's PatientProfile format.
 *
 * @param healthData - HealthData object from decryption
 * @returns PatientProfile for UI
 *
 * @example
 * ```typescript
 * const profile = healthDataToPatientProfile(decryptedHealthData);
 * ```
 */
export function healthDataToPatientProfile(
	healthData: HealthData,
): PatientProfile {
	const { profile: userProfile, allergies, conditions } = healthData;

	// Convert birth date to age band
	const ageBand = calculateAgeBandFromDate(userProfile.birth_date);

	// Convert gender
	const gender =
		userProfile.gender === "other"
			? "unknown"
			: (userProfile.gender as "male" | "female" | "unknown");

	// biometrics is not in basic_profile (moved to self_metrics)
	const heightCm = undefined;
	const weightKg = undefined;
	const bloodType = userProfile.blood_type;

	// Separate drug and food allergies
	const drugAllergies = allergies
		.filter((allergy) => allergy.substance.code_type === "rxnorm")
		.map((allergy) => ({
			name: allergy.substance.name,
			severity: allergy.severity as "mild" | "moderate" | "severe",
		}));

	const foodAllergies = allergies
		.filter((allergy) => allergy.substance.code_type === "food")
		.map((allergy) => allergy.substance.name);

	// Check for anaphylaxis history based on severity
	const hasAnaphylaxisHistory = allergies.some(
		(allergy) => allergy.severity === "severe",
	);

	// Extract active chronic conditions
	const chronicConditions = conditions
		.filter((condition) => condition.status === "active")
		.map((condition) => ({
			code: condition.codes.icd10 || "",
			label: condition.name.en,
		}));

	// Extract surgeries from medical histories
	// Note: Surgeries are not directly stored in HealthData conditions,
	// they would need to be tracked separately or extracted from procedures
	const surgeries: PatientProfile["surgeries"] = [];

	// Map HealthData blood_type to PatientProfile bloodType
	// Both now use the same format with Rh factor (e.g., "A+", "B-", "Unknown")
	const mappedBloodType: PatientProfile["bloodType"] =
		bloodType as PatientProfile["bloodType"];

	// Build PatientProfile
	const profile: PatientProfile = {
		birthDate: null,
		ageBand,
		gender,
		country: userProfile.nationality || null,
		preferredLanguage: null, // Not stored in HealthData
		heightCm,
		weightKg,
		bloodType: mappedBloodType,
		smokingStatus: "unknown", // Not stored in HealthData
		alcoholUse: "unknown", // Not stored in HealthData
		exercise: "unknown", // Not stored in HealthData
		drugAllergies,
		foodAllergies,
		hasAnaphylaxisHistory,
		chronicConditions,
		surgeries,
		dataSharing: {
			preference: "deny", // Default to most restrictive
			shareMedication: false,
			shareLabs: false,
			shareConditions: false,
			shareSurgeries: false,
			shareLifestyle: false,
			rewardsEnabled: false,
		},
	};

	return profile;
}

/**
 * Convert app data to HealthData format for encryption and storage
 *
 * This is the main conversion function that combines all patient data
 * into the standardized HealthData schema.
 *
 * @param profile - Patient profile from form
 * @param medications - Medication entries from app state
 * @param allergies - Allergy entries from app state (UI format)
 * @param medicalHistories - Medical history entries from app state
 * @param labResults - Lab result entries from app state
 * @param imagingReports - Imaging report entries from app state
 * @param locale - Current locale for localization (default: "en")
 * @returns Complete HealthData object ready for encryption
 *
 * @example
 * ```typescript
 * const healthData = profileToHealthData(
 *   profile,
 *   medications,
 *   allergies,
 *   medicalHistories,
 *   labResults,
 *   imagingReports,
 *   "en"
 * );
 * ```
 */
export function profileToHealthData(
	profile: PatientProfile,
	medications: Medication[],
	_allergies: Allergy[], // UI format (not used currently, using profile allergies instead)
	medicalHistories: MedicalHistory[],
	labResults: LabResult[],
	imagingReports: ImagingReport[],
	locale = "en",
): HealthData {
	return {
		meta: {
			schema_version: "1.0.0",
			updated_at: Date.now(),
			generator: "CurePocket_Web_v1",
		},
		profile: convertUserProfile(profile),
		medications: convertMedications(medications, locale),
		conditions: convertConditions(profile, medicalHistories, locale),
		lab_results: convertLabResults(labResults, locale),
		imaging: convertImagingStudies(imagingReports, locale),
		allergies: convertAllergies(profile, locale),
	};
}

// ==========================================
// Data Type-Specific Conversion Functions (v2.0.0)
// ==========================================

/**
 * Create metadata for data type-specific objects
 */
function createMetadata(): MetaData {
	return {
		schema_version: "2.0.0",
		updated_at: Date.now(),
		generator: "CurePocket_Web_v1",
	};
}

/**
 * Convert PatientProfile to BasicProfileData
 *
 * @param profile - Patient profile from form
 * @param allergies - Allergy list from app state (UI format)
 * @param locale - Locale for localized strings
 * @returns BasicProfileData for encryption
 */
export function profileToBasicProfile(
	profile: PatientProfile,
	_allergies: Allergy[],
	locale = "en",
): BasicProfileData {
	return {
		meta: createMetadata(),
		profile: convertUserProfile(profile),
		allergies: convertAllergies(profile, locale),
	};
}

/**
 * Convert Medication list to MedicationsData
 *
 * @param medications - Medication list from app state
 * @param locale - Locale for localized strings
 * @returns MedicationsData for encryption
 */
export function medicationsToMedicationsData(
	medications: Medication[],
	locale = "en",
): MedicationsData {
	return {
		meta: createMetadata(),
		medications: convertMedications(medications, locale),
	};
}

/**
 * Convert MedicalHistory list to ConditionsData
 *
 * @param profile - Patient profile (for chronic conditions)
 * @param medicalHistories - Medical history list from app state
 * @param locale - Locale for localized strings
 * @returns ConditionsData for encryption
 */
export function historiesToConditions(
	profile: PatientProfile,
	medicalHistories: MedicalHistory[],
	locale = "en",
): ConditionsData {
	return {
		meta: createMetadata(),
		conditions: convertConditions(profile, medicalHistories, locale),
	};
}

/**
 * Convert LabResult list to LabResultsData
 *
 * @param labResults - Lab result list from app state
 * @param locale - Locale for localized strings
 * @returns LabResultsData for encryption
 */
export function labResultsToLabResultsData(
	labResults: LabResult[],
	locale = "en",
): LabResultsData {
	return {
		meta: createMetadata(),
		lab_results: convertLabResults(labResults, locale),
	};
}

/**
 * Convert ImagingReport list to ImagingMetaData
 *
 * @param imagingReports - Imaging report list from app state
 * @param locale - Locale for localized strings
 * @returns ImagingMetaData for encryption
 */
export function imagingReportsToImagingMeta(
	imagingReports: ImagingReport[],
	locale = "en",
): ImagingMetaData {
	return {
		meta: createMetadata(),
		imaging_meta: convertImagingStudies(imagingReports, locale),
	};
}

/**
 * Convert VitalSign list to SelfMetricsData
 *
 * @param vitalSigns - Vital sign list from app state
 * @returns SelfMetricsData for encryption
 */
export function vitalsToSelfMetrics(vitalSigns: VitalSign[]): SelfMetricsData {
	const selfMetrics: SelfMetric[] = vitalSigns.map((vital) => {
		const metric: SelfMetric = {
			id: vital.id,
			metric_type: mapVitalType(vital.type),
			recorded_at: vital.recordedAt,
			unit: vital.unit,
			notes: vital.notes,
		};

		// Handle blood pressure (has both systolic and diastolic)
		if (vital.type === "blood-pressure" && vital.systolic && vital.diastolic) {
			metric.systolic = vital.systolic;
			metric.diastolic = vital.diastolic;
		} else if (vital.value !== undefined) {
			// Other metrics have a single value
			metric.value = vital.value;
		}

		return metric;
	});

	return {
		meta: createMetadata(),
		self_metrics: selfMetrics,
	};
}

/**
 * Map VitalSignType to SelfMetric metric_type
 */
function mapVitalType(type: VitalSign["type"]): SelfMetric["metric_type"] {
	const typeMap: Record<VitalSign["type"], SelfMetric["metric_type"]> = {
		"blood-pressure": "blood_pressure",
		"heart-rate": "heart_rate",
		"blood-glucose": "blood_glucose",
		temperature: "temperature",
		weight: "weight",
	};
	return typeMap[type] || "other";
}
