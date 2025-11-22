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
			try {
				const result = await suiClient.getDynamicFieldObject({
					parentId: passportId,
					name: {
						type: "0x1::string::String",
						value: dataType,
					},
				});

				// Dynamic Fieldが存在する場合、result.dataはnullではない
				return result.data !== null;
			} catch (error) {
				// エラーが発生した場合は存在しないと判断
				console.warn(
					`[CheckDataEntryExists] Failed to check existence for ${dataType}:`,
					error,
				);
				return false;
			}
		},
		[suiClient],
	);

	return { checkExists };
}
