import { useSuiClient } from "@mysten/dapp-kit";
import { useCallback } from "react";

/**
 * Hook to check if a Dynamic Field exists on-chain for a given passport
 */
export function useCheckDataEntryExists() {
	const suiClient = useSuiClient();

	/**
	 * Check if a data entry exists on-chain
	 * @param passportId - MedicalPassport object ID
	 * @param dataType - Data type key (e.g., "basic_profile", "medications")
	 * @returns true if the Dynamic Field exists, false otherwise
	 */
	const checkExists = useCallback(
		async (passportId: string, dataType: string): Promise<boolean> => {
			console.log(
				`[CheckDataEntryExists] Checking existence: passportId=${passportId}, dataType=${dataType}`,
			);

			try {
				const result = await suiClient.getDynamicFieldObject({
					parentId: passportId,
					name: {
						type: "0x1::string::String",
						value: dataType,
					},
				});

				console.log(
					`[CheckDataEntryExists] getDynamicFieldObject result:`,
					JSON.stringify(result, null, 2),
				);
				console.log(
					`[CheckDataEntryExists] result.data type: ${typeof result.data}, value:`,
					result.data,
				);

				// Dynamic Fieldが存在する場合、result.dataはnullではない
				// さらに、contentフィールドが存在することも確認
				const exists =
					result.data !== null &&
					result.data !== undefined &&
					result.data.content !== undefined;

				console.log(`[CheckDataEntryExists] Final decision: exists=${exists}`);

				return exists;
			} catch (error) {
				// Dynamic Field not foundエラーは正常（存在しない）
				if (
					error instanceof Error &&
					error.message.includes("Dynamic field not found")
				) {
					console.log(
						`[CheckDataEntryExists] Dynamic field not found for ${dataType} (expected for new data)`,
					);
					return false;
				}

				// その他のエラーの詳細をログ出力
				console.warn(`[CheckDataEntryExists] Error occurred for ${dataType}:`);
				console.warn(`  Error type: ${error?.constructor?.name}`);
				console.warn(
					`  Error message: ${error instanceof Error ? error.message : String(error)}`,
				);
				console.warn(`  Full error:`, error);

				// 不明なエラーの場合も存在しないと判断（安全側に倒す）
				return false;
			}
		},
		[suiClient],
	);

	return { checkExists };
}
