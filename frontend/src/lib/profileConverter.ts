/**
 * Profile Converter
 *
 * Converts PatientProfile and app data to HealthData format for encryption and storage.
 * This module bridges between the UI form data and the standardized HealthData schema.
 */

import { v4 as uuidv4 } from "uuid";
import type {
	Allergy,
	ImagingReport,
	LabResult,
	MedicalHistory,
	Medication,
	PatientProfile,
} from "@/types";
import type {
	Condition,
	HealthData,
	Allergy as HealthDataAllergy,
	LabResult as HealthDataLabResult,
	Medication as HealthDataMedication,
	ImagingStudy,
	LocalizedString,
	UserProfile,
} from "@/types/healthData";

/**
 * Convert AgeBand to approximate birth year
 *
 * @param ageBand - Age band string (e.g., "30s", "40s")
 * @returns Approximate birth year (middle of the age band)
 *
 * @example
 * ```typescript
 * ageBandToBirthYear("30s") // Returns current_year - 35
 * ```
 */
function ageBandToBirthYear(
	ageBand:
		| "10s"
		| "20s"
		| "30s"
		| "40s"
		| "50s"
		| "60s"
		| "70s"
		| "80plus"
		| null,
): number {
	const currentYear = new Date().getFullYear();

	if (!ageBand) {
		return currentYear - 30; // Default to 30 years old
	}

	const ageMap: Record<string, number> = {
		"10s": 15,
		"20s": 25,
		"30s": 35,
		"40s": 45,
		"50s": 55,
		"60s": 65,
		"70s": 75,
		"80plus": 85,
	};

	const age = ageMap[ageBand] || 30;
	return currentYear - age;
}

/**
 * Convert PatientProfile to UserProfile (HealthData format)
 *
 * @param profile - Patient profile from form
 * @returns UserProfile for HealthData
 */
function convertUserProfile(profile: PatientProfile): UserProfile {
	const birthYear = ageBandToBirthYear(profile.ageBand);

	const userProfile: UserProfile = {
		birth_year: birthYear,
		gender:
			profile.gender === "unknown"
				? "other"
				: (profile.gender as "male" | "female" | "other"),
		country: profile.country || "US",
	};

	// Add blood type if available
	if (profile.bloodType && profile.bloodType !== "unknown") {
		userProfile.blood_type = profile.bloodType;
	}

	// Add biometrics if both height and weight are available
	if (profile.heightCm && profile.weightKg) {
		const heightM = profile.heightCm / 100;
		const bmi = profile.weightKg / (heightM * heightM);

		userProfile.biometrics = {
			height_cm: profile.heightCm,
			weight_kg: profile.weightKg,
			bmi: Number.parseFloat(bmi.toFixed(1)),
		};
	}

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
				codes: {},
				name: createLocalizedString(history.diagnosis, locale),
				onset_date: history.diagnosisDate,
				note: history.description || history.notes,
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
 * Convert birth year to age band
 *
 * @param birthYear - Birth year
 * @returns Age band string (e.g., "30s", "40s")
 */
function birthYearToAgeBand(
	birthYear: number,
): "10s" | "20s" | "30s" | "40s" | "50s" | "60s" | "70s" | "80plus" | null {
	const currentYear = new Date().getFullYear();
	const age = currentYear - birthYear;

	if (age < 10) return null;
	if (age < 20) return "10s";
	if (age < 30) return "20s";
	if (age < 40) return "30s";
	if (age < 50) return "40s";
	if (age < 60) return "50s";
	if (age < 70) return "60s";
	if (age < 80) return "70s";
	return "80plus";
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

	// Convert birth year to age band
	const ageBand = birthYearToAgeBand(userProfile.birth_year);

	// Convert gender
	const gender =
		userProfile.gender === "other"
			? "unknown"
			: (userProfile.gender as "male" | "female" | "unknown");

	// Extract biometrics
	const heightCm = userProfile.biometrics?.height_cm ?? undefined;
	const weightKg = userProfile.biometrics?.weight_kg ?? undefined;
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
	// Both use "A", "B", "O", "AB", "unknown" format (no Rh factor)
	const mappedBloodType: PatientProfile["bloodType"] =
		bloodType && ["A", "B", "O", "AB"].includes(bloodType)
			? (bloodType as "A" | "B" | "O" | "AB")
			: "unknown";

	// Build PatientProfile
	const profile: PatientProfile = {
		ageBand,
		gender,
		country: userProfile.country || null,
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
