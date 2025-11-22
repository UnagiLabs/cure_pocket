import { z } from "zod";

// ISO 3166-1 alpha-2国コードの検証
const countryCodeSchema = z
	.string()
	.regex(/^[A-Z]{2}$/, "2文字の大文字国コードが必要です");

// 血液型の検証
const bloodTypeSchema = z.enum(
	["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"],
	{ message: "無効な血液型です" },
);

// 基本プロフィールスキーマ
export const basicProfileSchema = z.object({
	birth_date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください")
		.refine(
			(date) => !Number.isNaN(Date.parse(date)),
			"有効な日付を入力してください",
		)
		.refine(
			(date) => new Date(date) <= new Date(),
			"未来の日付は指定できません",
		),
	nationality: countryCodeSchema,
	gender: z.enum(["male", "female", "other"]),
	allergies: z.array(z.string().min(1).max(500)),
	blood_type: bloodTypeSchema,
});

// ICD-10コードスキーマ
const icd10Schema = z
	.string()
	.regex(/^[A-Z]\d{2}(\.\d{1,2})?$/, "無効なICD-10コードです");

// 疾病情報スキーマ
export const conditionsSchema = z.object({
	current_conditions: z.array(icd10Schema),
	past_conditions: z.array(icd10Schema),
});

// ATCコードスキーマ
const atcCodeSchema = z
	.string()
	.regex(/^[A-Z]\d{2}[A-Z]{2}\d{2}$/, "無効なATCコードです（例: A10BA02）");

// RxNormコードスキーマ
const rxnormCodeSchema = z
	.string()
	.regex(/^\d{1,7}$/, "無効なRxNormコードです");

// 薬剤CSVスキーマ（各行）
export const medicationRowSchema = z.object({
	dispensed_on: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください")
		.refine(
			(date) => !Number.isNaN(Date.parse(date)),
			"有効な日付を入力してください",
		),
	atc_code: atcCodeSchema,
	rxnorm_code: rxnormCodeSchema,
});

// LOINCコードスキーマ
const loincCodeSchema = z
	.string()
	.regex(/^\d{4,5}-\d$/, "無効なLOINCコードです（例: 4548-4）");

// 検査値CSV行スキーマ
export const labResultRowSchema = z.object({
	collected_on: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください")
		.refine(
			(date) => !Number.isNaN(Date.parse(date)),
			"有効な日付を入力してください",
		),
	loinc_code: loincCodeSchema,
	value: z.number().min(0, "0以上の値を入力してください"),
	unit: z.string().min(1, "単位を入力してください"),
	ref_low: z.number().optional(),
	ref_high: z.number().optional(),
	flag: z.enum(["H", "L", "N", "U"]).optional(),
	notes: z.string().optional(),
});

// バイタルCSV行スキーマ
export const vitalRowSchema = z
	.object({
		recorded_at: z
			.string()
			.regex(
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
				"ISO 8601形式で入力してください",
			),
		metric: z.enum(["blood_pressure", "weight", "pulse", "temperature"]),
		systolic: z.number().min(50).max(300).optional(),
		diastolic: z.number().min(50).max(300).optional(),
		pulse: z.number().min(30).max(250).optional(),
		value: z.number().optional(),
		unit: z.string().optional(),
		notes: z.string().optional(),
	})
	.refine(
		(data) => {
			if (data.metric === "blood_pressure") {
				return data.systolic !== undefined && data.diastolic !== undefined;
			}
			return true;
		},
		{ message: "血圧の場合、収縮期・拡張期の両方が必要です" },
	);

// 画像メタデータスキーマ
export const imagingMetaSchema = z.object({
	study_uid: z.string().min(1, "Study UIDは必須です"),
	modality: z.string().min(1, "Modalityは必須です"),
	body_site: z.string().min(1, "Body Siteは必須です"),
	series: z.array(
		z.object({
			series_uid: z.string().min(1, "Series UIDは必須です"),
			modality: z.string().min(1, "Modalityは必須です"),
			instance_blobs: z.array(
				z.object({
					dicom_blob_id: z.string().min(1, "DICOM Blob IDは必須です"),
				}),
			),
		}),
	),
	schema_version: z.string(),
});
