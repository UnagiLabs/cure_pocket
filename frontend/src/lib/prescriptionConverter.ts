/**
 * 処方箋データの変換関数
 * Prescription ↔ MedicationsData (JSON) の相互変換
 */

import { v4 as uuidv4 } from "uuid";
import type { Prescription } from "@/types";
import type {
	LocalizedString,
	Medication,
	MedicationsData,
	MetaData,
} from "@/types/healthData";

/**
 * CSV形式のmedications行
 */
export interface MedicationsCsvRow {
	dispensed_on: string; // YYYY-MM-DD
	atc_code: string;
	rxnorm_code: string;
}

/**
 * 表示用の薬品情報
 * CSVから復元した際の表示データ
 */
export interface DisplayMedication {
	dispensed_on: string;
	atc_code: string;
	rxnorm_code: string;
	drugName: string; // コードから逆引きした薬品名（モック）
}

/**
 * モック：薬品名からATCコード/RxNormコードへの変換
 * OCR実装時に本格的なマッピング処理に置き換える
 *
 * @param drugName 薬品名
 * @returns ATCコード、RxNormコード
 */
export function mockDrugNameToCode(drugName: string): {
	atcCode: string;
	rxnormCode: string;
} {
	// 簡単なハッシュ関数でダミーコードを生成
	const hash = drugName.split("").reduce((acc, char) => {
		return acc + char.charCodeAt(0);
	}, 0);

	// ATC形式: A10BA02 (7文字)
	const atcCode = `A${String(hash % 10).padStart(2, "0")}AA${String(hash % 100).padStart(2, "0")}`;

	// RxNorm形式: 6桁の数値
	const rxnormCode = String(100000 + (hash % 900000));

	return { atcCode, rxnormCode };
}

/**
 * モック：ATCコード/RxNormコードから薬品名への逆変換
 * OCR実装時に本格的なマッピング処理に置き換える
 *
 * @param atcCode ATCコード
 * @param rxnormCode RxNormコード
 * @returns 薬品名（モック）
 */
export function mockCodeToDrugName(
	atcCode: string,
	rxnormCode: string,
): string {
	// モック実装：コードをそのまま表示
	return `薬品 (ATC:${atcCode}, RxNorm:${rxnormCode})`;
}

/**
 * PrescriptionをMedications CSVに変換
 *
 * @param prescription 処方箋データ
 * @returns CSV形式の文字列（ヘッダー付き）
 */
export function prescriptionToMedicationsCsv(
	prescription: Prescription,
): string {
	const rows: MedicationsCsvRow[] = prescription.medications.map((med) => {
		const { atcCode, rxnormCode } = mockDrugNameToCode(med.drugName);

		return {
			dispensed_on: prescription.prescriptionDate,
			atc_code: atcCode,
			rxnorm_code: rxnormCode,
		};
	});

	// CSVヘッダー
	const header = "dispensed_on,atc_code,rxnorm_code";

	// CSVボディ
	const body = rows
		.map((row) => {
			return `${row.dispensed_on},${row.atc_code},${row.rxnorm_code}`;
		})
		.join("\n");

	return `${header}\n${body}`;
}

/**
 * Medications CSVをパースして表示用データに変換
 *
 * @param csv CSV文字列
 * @returns 表示用薬品データの配列
 */
export function medicationsCsvToDisplayData(csv: string): DisplayMedication[] {
	const lines = csv.trim().split("\n");

	// ヘッダー行をスキップ
	const dataLines = lines.slice(1);

	return dataLines
		.filter((line) => line.trim() !== "")
		.map((line) => {
			const [dispensed_on, atc_code, rxnorm_code] = line.split(",");

			// コードから薬品名を逆引き（モック）
			const drugName = mockCodeToDrugName(atc_code, rxnorm_code);

			return {
				dispensed_on,
				atc_code,
				rxnorm_code,
				drugName,
			};
		});
}

/**
 * CSVをUint8Arrayに変換（Walrusアップロード用）
 *
 * @param csv CSV文字列
 * @returns UTF-8エンコードされたUint8Array
 */
export function csvToUint8Array(csv: string): Uint8Array {
	const encoder = new TextEncoder();
	return encoder.encode(csv);
}

/**
 * Uint8ArrayをCSVに変換（Walrusダウンロード後）
 *
 * @param data Uint8Array
 * @returns CSV文字列
 */
export function uint8ArrayToCsv(data: Uint8Array): string {
	const decoder = new TextDecoder("utf-8");
	return decoder.decode(data);
}

// ==========================================
// JSON形式での変換（推奨）
// ==========================================

/**
 * MetaDataを生成
 */
function createMetaData(): MetaData {
	return {
		schema_version: "2.0.0",
		updated_at: Date.now(),
		generator: "CurePocket_Web_v1",
	};
}

/**
 * PrescriptionをMedicationsData (JSON形式) に変換
 *
 * @param prescription 処方箋データ
 * @returns MedicationsData
 */
export function prescriptionToMedicationsData(
	prescription: Prescription,
): MedicationsData {
	const medications: Medication[] = prescription.medications.map((med) => {
		const { atcCode, rxnormCode } = mockDrugNameToCode(med.drugName);

		// LocalizedStringを生成
		const name: LocalizedString = {
			en: med.drugName,
			local: med.drugName,
		};

		return {
			id: uuidv4(),
			status: "active" as const,
			codes: {
				atc: atcCode,
				rxnorm: rxnormCode,
			},
			name,
			dosage: `${med.dosage} - ${med.quantity}${med.duration ? ` (${med.duration})` : ""}`,
			start_date: prescription.prescriptionDate,
			prescriber: prescription.doctorName
				? `${prescription.doctorName} - ${prescription.clinic}`
				: prescription.clinic,
		};
	});

	return {
		meta: createMetaData(),
		medications,
	};
}

/**
 * MedicationsDataを表示用データに変換
 *
 * @param medicationsData MedicationsData
 * @returns 表示用薬品データの配列
 */
export function medicationsDataToDisplayData(
	medicationsData: MedicationsData,
): DisplayMedication[] {
	return medicationsData.medications.map((medication) => {
		return {
			dispensed_on: medication.start_date,
			atc_code: medication.codes.atc || "",
			rxnorm_code: medication.codes.rxnorm || "",
			drugName: medication.name.local,
		};
	});
}
