/**
 * Health Data Validation for Encryption
 *
 * Validates HealthData before encryption and upload to Walrus.
 * Based on data_schema.md v2.0.0 specifications.
 */
import type {
	BasicProfileData,
	ConditionsData,
	HealthData,
	ImagingMetaData,
	LabResultsData,
	MedicationsData,
	SelfMetricsData,
} from "@/types/healthData";

/**
 * Validation error class
 */
export class HealthDataValidationError extends Error {
	constructor(
		message: string,
		public readonly field?: string,
		public readonly dataType?: string,
	) {
		super(message);
		this.name = "HealthDataValidationError";
	}
}

/**
 * Validate HealthData before encryption
 *
 * Performs basic structural validation to ensure data integrity before
 * encryption and upload to Walrus storage.
 *
 * @param healthData - Complete health data object
 * @param dataType - Data type identifier (e.g., "basic_profile", "medications")
 * @throws {HealthDataValidationError} If validation fails
 */
export function validateHealthData(
	healthData: HealthData,
	dataType: string,
): void {
	// Basic structural validation
	if (!healthData) {
		throw new HealthDataValidationError(
			"HealthData object is required",
			undefined,
			dataType,
		);
	}

	// Validate metadata
	if (!healthData.meta) {
		throw new HealthDataValidationError(
			"Metadata (meta) is required",
			"meta",
			dataType,
		);
	}

	if (!healthData.meta.schema_version) {
		throw new HealthDataValidationError(
			"Schema version is required in metadata",
			"meta.schema_version",
			dataType,
		);
	}

	// Validate based on data type
	switch (dataType) {
		case "basic_profile":
			validateBasicProfile(healthData);
			break;

		case "medications":
			validateMedications(healthData);
			break;

		case "conditions":
			validateConditions(healthData);
			break;

		case "lab_results":
			validateLabResults(healthData);
			break;

		case "imaging_meta":
		case "imaging_binary":
			validateImaging(healthData);
			break;

		case "self_metrics":
			// Self metrics validation (future implementation)
			break;

		default:
			throw new HealthDataValidationError(
				`Unknown data type: ${dataType}`,
				undefined,
				dataType,
			);
	}
}

/**
 * Validate basic profile data
 */
function validateBasicProfile(healthData: HealthData): void {
	if (!healthData.profile) {
		throw new HealthDataValidationError(
			"User profile is required for basic_profile data type",
			"profile",
			"basic_profile",
		);
	}

	const profile = healthData.profile;

	// Validate required fields
	if (!profile.country) {
		throw new HealthDataValidationError(
			"Country (ISO 3166-1 alpha-2) is required in profile",
			"profile.country",
			"basic_profile",
		);
	}

	// Validate country code format (2-letter uppercase)
	if (!/^[A-Z]{2}$/.test(profile.country)) {
		throw new HealthDataValidationError(
			`Invalid country code format: ${profile.country}. Expected 2-letter uppercase (e.g., JP, US)`,
			"profile.country",
			"basic_profile",
		);
	}

	if (!profile.gender) {
		throw new HealthDataValidationError(
			"Gender is required in profile",
			"profile.gender",
			"basic_profile",
		);
	}

	// Validate blood type format if present
	if (profile.blood_type) {
		const validBloodTypes = [
			"A+",
			"A-",
			"B+",
			"B-",
			"AB+",
			"AB-",
			"O+",
			"O-",
			"Unknown",
		];
		if (!validBloodTypes.includes(profile.blood_type)) {
			throw new HealthDataValidationError(
				`Invalid blood type: ${profile.blood_type}. Expected one of: ${validBloodTypes.join(", ")}`,
				"profile.blood_type",
				"basic_profile",
			);
		}
	}
}

/**
 * Validate medications data
 */
function validateMedications(healthData: HealthData): void {
	if (!Array.isArray(healthData.medications)) {
		throw new HealthDataValidationError(
			"Medications must be an array",
			"medications",
			"medications",
		);
	}

	// Validate each medication entry
	for (const [index, medication] of healthData.medications.entries()) {
		if (!medication.id) {
			throw new HealthDataValidationError(
				`Medication at index ${index} is missing ID`,
				`medications[${index}].id`,
				"medications",
			);
		}

		if (!medication.name) {
			throw new HealthDataValidationError(
				`Medication at index ${index} is missing name`,
				`medications[${index}].name`,
				"medications",
			);
		}

		// Validate ATC code format if present (7 characters: Letter + 2 digits + 2 letters + 2 digits)
		if (
			medication.codes.atc &&
			!/^[A-Z]\d{2}[A-Z]{2}\d{2}$/.test(medication.codes.atc)
		) {
			throw new HealthDataValidationError(
				`Invalid ATC code format at index ${index}: ${medication.codes.atc}. Expected format: A10BA02`,
				`medications[${index}].codes.atc`,
				"medications",
			);
		}

		// Validate RxNorm code format if present (1-7 digits)
		if (medication.codes.rxnorm && !/^\d{1,7}$/.test(medication.codes.rxnorm)) {
			throw new HealthDataValidationError(
				`Invalid RxNorm code format at index ${index}: ${medication.codes.rxnorm}. Expected 1-7 digits`,
				`medications[${index}].codes.rxnorm`,
				"medications",
			);
		}
	}
}

/**
 * Validate conditions data
 */
function validateConditions(healthData: HealthData): void {
	if (!Array.isArray(healthData.conditions)) {
		throw new HealthDataValidationError(
			"Conditions must be an array",
			"conditions",
			"conditions",
		);
	}

	// Validate each condition entry
	for (const [index, condition] of healthData.conditions.entries()) {
		if (!condition.id) {
			throw new HealthDataValidationError(
				`Condition at index ${index} is missing ID`,
				`conditions[${index}].id`,
				"conditions",
			);
		}

		if (!condition.name) {
			throw new HealthDataValidationError(
				`Condition at index ${index} is missing name`,
				`conditions[${index}].name`,
				"conditions",
			);
		}

		// Validate ICD-10 code format if present (Letter + 2 digits + optional .digits)
		if (
			condition.codes.icd10 &&
			!/^[A-Z]\d{2}(\.\d{1,2})?$/.test(condition.codes.icd10)
		) {
			throw new HealthDataValidationError(
				`Invalid ICD-10 code format at index ${index}: ${condition.codes.icd10}. Expected format: E11.9`,
				`conditions[${index}].codes.icd10`,
				"conditions",
			);
		}
	}
}

/**
 * Validate lab results data
 */
function validateLabResults(healthData: HealthData): void {
	if (!Array.isArray(healthData.lab_results)) {
		throw new HealthDataValidationError(
			"Lab results must be an array",
			"lab_results",
			"lab_results",
		);
	}

	// Validate each lab result entry
	for (const [index, labResult] of healthData.lab_results.entries()) {
		if (!labResult.id) {
			throw new HealthDataValidationError(
				`Lab result at index ${index} is missing ID`,
				`lab_results[${index}].id`,
				"lab_results",
			);
		}

		if (!labResult.date) {
			throw new HealthDataValidationError(
				`Lab result at index ${index} is missing date`,
				`lab_results[${index}].date`,
				"lab_results",
			);
		}

		if (!Array.isArray(labResult.items) || labResult.items.length === 0) {
			throw new HealthDataValidationError(
				`Lab result at index ${index} must have at least one test item`,
				`lab_results[${index}].items`,
				"lab_results",
			);
		}

		// Validate each lab item
		for (const [itemIndex, item] of labResult.items.entries()) {
			// Validate LOINC code format if present (4-5 digits + dash + 1 digit)
			if (item.codes.loinc && !/^\d{4,5}-\d$/.test(item.codes.loinc)) {
				throw new HealthDataValidationError(
					`Invalid LOINC code format at lab_results[${index}].items[${itemIndex}]: ${item.codes.loinc}. Expected format: 4548-4`,
					`lab_results[${index}].items[${itemIndex}].codes.loinc`,
					"lab_results",
				);
			}

			if (typeof item.value !== "number") {
				throw new HealthDataValidationError(
					`Lab result value at lab_results[${index}].items[${itemIndex}] must be a number`,
					`lab_results[${index}].items[${itemIndex}].value`,
					"lab_results",
				);
			}

			if (!item.unit) {
				throw new HealthDataValidationError(
					`Lab result unit at lab_results[${index}].items[${itemIndex}] is required`,
					`lab_results[${index}].items[${itemIndex}].unit`,
					"lab_results",
				);
			}
		}
	}
}

/**
 * Validate imaging data
 */
function validateImaging(healthData: HealthData): void {
	if (!Array.isArray(healthData.imaging)) {
		throw new HealthDataValidationError(
			"Imaging studies must be an array",
			"imaging",
			"imaging_meta",
		);
	}

	// Validate each imaging study
	for (const [index, imaging] of healthData.imaging.entries()) {
		if (!imaging.id) {
			throw new HealthDataValidationError(
				`Imaging study at index ${index} is missing ID`,
				`imaging[${index}].id`,
				"imaging_meta",
			);
		}

		if (!imaging.date) {
			throw new HealthDataValidationError(
				`Imaging study at index ${index} is missing date`,
				`imaging[${index}].date`,
				"imaging_meta",
			);
		}

		if (!imaging.modality) {
			throw new HealthDataValidationError(
				`Imaging study at index ${index} is missing modality`,
				`imaging[${index}].modality`,
				"imaging_meta",
			);
		}

		// Validate DICOM modality codes
		const validModalities = ["CT", "MR", "US", "XR", "XA", "OT"];
		if (!validModalities.includes(imaging.modality)) {
			throw new HealthDataValidationError(
				`Invalid DICOM modality at index ${index}: ${imaging.modality}. Expected one of: ${validModalities.join(", ")}`,
				`imaging[${index}].modality`,
				"imaging_meta",
			);
		}
	}
}

// ==========================================
// Data Type-Specific Validation Functions (v2.0.0)
// ==========================================

/**
 * Validate BasicProfileData
 */
export function validateBasicProfileData(data: BasicProfileData): void {
	if (!data.meta?.schema_version) {
		throw new HealthDataValidationError(
			"Schema version is required",
			"meta.schema_version",
			"basic_profile",
		);
	}

	if (!data.profile) {
		throw new HealthDataValidationError(
			"Profile is required",
			"profile",
			"basic_profile",
		);
	}

	const profile = data.profile;

	if (!profile.country || !/^[A-Z]{2}$/.test(profile.country)) {
		throw new HealthDataValidationError(
			`Invalid country code: ${profile.country}. Expected 2-letter uppercase (e.g., JP, US)`,
			"profile.country",
			"basic_profile",
		);
	}

	if (!profile.gender) {
		throw new HealthDataValidationError(
			"Gender is required",
			"profile.gender",
			"basic_profile",
		);
	}

	if (profile.blood_type) {
		const validBloodTypes = [
			"A+",
			"A-",
			"B+",
			"B-",
			"AB+",
			"AB-",
			"O+",
			"O-",
			"Unknown",
		];
		if (!validBloodTypes.includes(profile.blood_type)) {
			throw new HealthDataValidationError(
				`Invalid blood type: ${profile.blood_type}. Expected one of: ${validBloodTypes.join(", ")}`,
				"profile.blood_type",
				"basic_profile",
			);
		}
	}

	if (!Array.isArray(data.allergies)) {
		throw new HealthDataValidationError(
			"Allergies must be an array",
			"allergies",
			"basic_profile",
		);
	}
}

/**
 * Validate MedicationsData
 */
export function validateMedicationsData(data: MedicationsData): void {
	if (!data.meta?.schema_version) {
		throw new HealthDataValidationError(
			"Schema version is required",
			"meta.schema_version",
			"medications",
		);
	}

	if (!Array.isArray(data.medications)) {
		throw new HealthDataValidationError(
			"Medications must be an array",
			"medications",
			"medications",
		);
	}

	for (const [index, medication] of data.medications.entries()) {
		if (!medication.id) {
			throw new HealthDataValidationError(
				`Medication at index ${index} is missing ID`,
				`medications[${index}].id`,
				"medications",
			);
		}

		if (!medication.name) {
			throw new HealthDataValidationError(
				`Medication at index ${index} is missing name`,
				`medications[${index}].name`,
				"medications",
			);
		}

		if (
			medication.codes.atc &&
			!/^[A-Z]\d{2}[A-Z]{2}\d{2}$/.test(medication.codes.atc)
		) {
			throw new HealthDataValidationError(
				`Invalid ATC code format at index ${index}: ${medication.codes.atc}`,
				`medications[${index}].codes.atc`,
				"medications",
			);
		}

		if (medication.codes.rxnorm && !/^\d{1,7}$/.test(medication.codes.rxnorm)) {
			throw new HealthDataValidationError(
				`Invalid RxNorm code format at index ${index}: ${medication.codes.rxnorm}`,
				`medications[${index}].codes.rxnorm`,
				"medications",
			);
		}
	}
}

/**
 * Validate ConditionsData
 */
export function validateConditionsData(data: ConditionsData): void {
	if (!data.meta?.schema_version) {
		throw new HealthDataValidationError(
			"Schema version is required",
			"meta.schema_version",
			"conditions",
		);
	}

	if (!Array.isArray(data.conditions)) {
		throw new HealthDataValidationError(
			"Conditions must be an array",
			"conditions",
			"conditions",
		);
	}

	for (const [index, condition] of data.conditions.entries()) {
		if (!condition.id) {
			throw new HealthDataValidationError(
				`Condition at index ${index} is missing ID`,
				`conditions[${index}].id`,
				"conditions",
			);
		}

		if (!condition.name) {
			throw new HealthDataValidationError(
				`Condition at index ${index} is missing name`,
				`conditions[${index}].name`,
				"conditions",
			);
		}

		if (
			condition.codes.icd10 &&
			!/^[A-Z]\d{2}(\.\d{1,2})?$/.test(condition.codes.icd10)
		) {
			throw new HealthDataValidationError(
				`Invalid ICD-10 code format at index ${index}: ${condition.codes.icd10}`,
				`conditions[${index}].codes.icd10`,
				"conditions",
			);
		}
	}
}

/**
 * Validate LabResultsData
 */
export function validateLabResultsData(data: LabResultsData): void {
	if (!data.meta?.schema_version) {
		throw new HealthDataValidationError(
			"Schema version is required",
			"meta.schema_version",
			"lab_results",
		);
	}

	if (!Array.isArray(data.lab_results)) {
		throw new HealthDataValidationError(
			"Lab results must be an array",
			"lab_results",
			"lab_results",
		);
	}

	for (const [index, labResult] of data.lab_results.entries()) {
		if (!labResult.id) {
			throw new HealthDataValidationError(
				`Lab result at index ${index} is missing ID`,
				`lab_results[${index}].id`,
				"lab_results",
			);
		}

		if (!labResult.date) {
			throw new HealthDataValidationError(
				`Lab result at index ${index} is missing date`,
				`lab_results[${index}].date`,
				"lab_results",
			);
		}

		if (!Array.isArray(labResult.items) || labResult.items.length === 0) {
			throw new HealthDataValidationError(
				`Lab result at index ${index} must have at least one test item`,
				`lab_results[${index}].items`,
				"lab_results",
			);
		}

		for (const [itemIndex, item] of labResult.items.entries()) {
			if (item.codes.loinc && !/^\d{4,5}-\d$/.test(item.codes.loinc)) {
				throw new HealthDataValidationError(
					`Invalid LOINC code format at lab_results[${index}].items[${itemIndex}]: ${item.codes.loinc}`,
					`lab_results[${index}].items[${itemIndex}].codes.loinc`,
					"lab_results",
				);
			}

			if (typeof item.value !== "number") {
				throw new HealthDataValidationError(
					`Lab result value at lab_results[${index}].items[${itemIndex}] must be a number`,
					`lab_results[${index}].items[${itemIndex}].value`,
					"lab_results",
				);
			}

			if (!item.unit) {
				throw new HealthDataValidationError(
					`Lab result unit at lab_results[${index}].items[${itemIndex}] is required`,
					`lab_results[${index}].items[${itemIndex}].unit`,
					"lab_results",
				);
			}
		}
	}
}

/**
 * Validate ImagingMetaData
 */
export function validateImagingMetaData(data: ImagingMetaData): void {
	if (!data.meta?.schema_version) {
		throw new HealthDataValidationError(
			"Schema version is required",
			"meta.schema_version",
			"imaging_meta",
		);
	}

	if (!Array.isArray(data.imaging_meta)) {
		throw new HealthDataValidationError(
			"Imaging metadata must be an array",
			"imaging_meta",
			"imaging_meta",
		);
	}

	for (const [index, imaging] of data.imaging_meta.entries()) {
		if (!imaging.id) {
			throw new HealthDataValidationError(
				`Imaging study at index ${index} is missing ID`,
				`imaging_meta[${index}].id`,
				"imaging_meta",
			);
		}

		if (!imaging.date) {
			throw new HealthDataValidationError(
				`Imaging study at index ${index} is missing date`,
				`imaging_meta[${index}].date`,
				"imaging_meta",
			);
		}

		if (!imaging.modality) {
			throw new HealthDataValidationError(
				`Imaging study at index ${index} is missing modality`,
				`imaging_meta[${index}].modality`,
				"imaging_meta",
			);
		}

		const validModalities = ["CT", "MR", "US", "XR", "XA", "OT"];
		if (!validModalities.includes(imaging.modality)) {
			throw new HealthDataValidationError(
				`Invalid DICOM modality at index ${index}: ${imaging.modality}. Expected one of: ${validModalities.join(", ")}`,
				`imaging_meta[${index}].modality`,
				"imaging_meta",
			);
		}
	}
}

/**
 * Validate SelfMetricsData
 */
export function validateSelfMetricsData(data: SelfMetricsData): void {
	if (!data.meta?.schema_version) {
		throw new HealthDataValidationError(
			"Schema version is required",
			"meta.schema_version",
			"self_metrics",
		);
	}

	if (!Array.isArray(data.self_metrics)) {
		throw new HealthDataValidationError(
			"Self metrics must be an array",
			"self_metrics",
			"self_metrics",
		);
	}

	for (const [index, metric] of data.self_metrics.entries()) {
		if (!metric.id) {
			throw new HealthDataValidationError(
				`Metric at index ${index} is missing ID`,
				`self_metrics[${index}].id`,
				"self_metrics",
			);
		}

		if (!metric.metric_type) {
			throw new HealthDataValidationError(
				`Metric at index ${index} is missing metric_type`,
				`self_metrics[${index}].metric_type`,
				"self_metrics",
			);
		}

		if (!metric.recorded_at) {
			throw new HealthDataValidationError(
				`Metric at index ${index} is missing recorded_at`,
				`self_metrics[${index}].recorded_at`,
				"self_metrics",
			);
		}

		if (!metric.unit) {
			throw new HealthDataValidationError(
				`Metric at index ${index} is missing unit`,
				`self_metrics[${index}].unit`,
				"self_metrics",
			);
		}

		// Validate blood pressure has both systolic and diastolic
		if (metric.metric_type === "blood_pressure") {
			if (
				typeof metric.systolic !== "number" ||
				typeof metric.diastolic !== "number"
			) {
				throw new HealthDataValidationError(
					`Blood pressure metric at index ${index} must have both systolic and diastolic values`,
					`self_metrics[${index}]`,
					"self_metrics",
				);
			}
		} else {
			// Other metrics should have a single value
			if (typeof metric.value !== "number") {
				throw new HealthDataValidationError(
					`Metric at index ${index} must have a numeric value`,
					`self_metrics[${index}].value`,
					"self_metrics",
				);
			}
		}
	}
}
