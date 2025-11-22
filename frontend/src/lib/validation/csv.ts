import Papa from "papaparse";
import type { z } from "zod";

export interface CsvValidationResult<T> {
	success: boolean;
	data?: T[];
	errors: Array<{
		row: number;
		field?: string;
		message: string;
	}>;
}

/**
 * CSV文字列を検証し、Zodスキーマに準拠したデータを返す
 * @param csvString - 検証するCSV文字列
 * @param schema - 各行のZodスキーマ
 * @param expectedHeaders - 期待されるヘッダー名の配列
 * @returns 検証結果（成功/失敗、データ、エラー）
 */
export function validateCsv<T>(
	csvString: string,
	schema: z.ZodType<T>,
	expectedHeaders: string[],
): CsvValidationResult<T> {
	const parseResult = Papa.parse(csvString, {
		header: true,
		dynamicTyping: true,
		skipEmptyLines: true,
	});

	const errors: CsvValidationResult<T>["errors"] = [];

	// ヘッダー検証
	const headers = parseResult.meta.fields || [];
	const missingHeaders = expectedHeaders.filter((h) => !headers.includes(h));
	if (missingHeaders.length > 0) {
		errors.push({
			row: 0,
			message: `不足しているヘッダー: ${missingHeaders.join(", ")}`,
		});
		return { success: false, errors };
	}

	// パースエラーチェック
	if (parseResult.errors.length > 0) {
		for (const err of parseResult.errors) {
			errors.push({
				row: err.row || 0,
				message: `CSV解析エラー: ${err.message}`,
			});
		}
	}

	// データ行の検証
	const validatedData: T[] = [];
	for (const [index, row] of parseResult.data.entries()) {
		const result = schema.safeParse(row);
		if (result.success) {
			validatedData.push(result.data);
		} else {
			for (const err of result.error.issues) {
				errors.push({
					row: index + 2, // ヘッダー行を考慮して+2
					field: err.path.join("."),
					message: err.message,
				});
			}
		}
	}

	return {
		success: errors.length === 0,
		data: validatedData,
		errors,
	};
}
