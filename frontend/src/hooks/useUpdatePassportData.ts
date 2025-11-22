/**
 * useUpdatePassportData Hook
 *
 * Updates MedicalPassport Dynamic Fields on-chain after data save.
 * Replaces the old single-blob model with data-type-based blob management.
 *
 * ## Features
 * - Call add_data_entry contract function (add new data type)
 * - Call replace_data_entry contract function (replace existing data type)
 * - Transaction status management with error handling
 * - Support for multiple blob IDs per data type
 *
 * ## Contract Functions
 * - `add_data_entry(passport, data_type, blob_ids)`
 * - `replace_data_entry(passport, data_type, blob_ids)`
 *
 * ## Usage
 * ```typescript
 * const { updatePassportData, isUpdating, error } = useUpdatePassportData();
 *
 * // Add new data type
 * await updatePassportData({
 *   passportId: "0x123...",
 *   dataType: "medications",
 *   blobIds: ["abc...", "def..."],
 *   replace: false, // add mode
 * });
 *
 * // Replace existing data type
 * await updatePassportData({
 *   passportId: "0x123...",
 *   dataType: "basic_profile",
 *   blobIds: ["xyz..."],
 *   replace: true, // replace mode
 * });
 * ```
 */
"use client";

import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useCallback, useState } from "react";

/**
 * Package ID from environment
 */
function getPackageId(): string {
	const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
	if (!packageId) {
		throw new Error("NEXT_PUBLIC_PACKAGE_ID is not set");
	}
	return packageId;
}

/**
 * Data types for medical records
 */
export type DataType =
	| "basic_profile"
	| "medications"
	| "allergies"
	| "histories"
	| "lab_results"
	| "imaging"
	| "vitals";

/**
 * Update parameters for Dynamic Fields
 */
export interface UpdatePassportParams {
	/** MedicalPassport object ID */
	passportId: string;
	/** Data type (e.g., "basic_profile", "medications") */
	dataType: DataType | string;
	/** Array of Walrus blob IDs for this data type */
	blobIds: string[];
	/** If true, use replace_data_entry; if false, use add_data_entry */
	replace?: boolean;
}

/**
 * Parameters for batch update
 */
export interface UpdateMultiplePassportParams {
	/** MedicalPassport object ID */
	passportId: string;
	/** Array of data entries to add/replace */
	dataEntries: Array<{
		dataType: DataType | string;
		blobIds: string[];
		replace: boolean;
	}>;
}

/**
 * Hook return type
 */
export interface UseUpdatePassportDataReturn {
	/** Update passport Dynamic Fields (add or replace data entry) */
	updatePassportData: (params: UpdatePassportParams) => Promise<void>;
	/** Update multiple data types in a single transaction */
	updateMultiplePassportData: (
		params: UpdateMultiplePassportParams,
	) => Promise<void>;
	/** Whether update transaction is in progress */
	isUpdating: boolean;
	/** Error message if update failed */
	error: string | null;
	/** Transaction digest of the last successful update */
	digest: string | null;
}

/**
 * Update MedicalPassport Dynamic Fields on-chain
 *
 * @returns Update controls and status
 */
export function useUpdatePassportData(): UseUpdatePassportDataReturn {
	const suiClient = useSuiClient();
	const { mutateAsync: signAndExecuteTransaction } =
		useSignAndExecuteTransaction();

	const [isUpdating, setIsUpdating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [digest, setDigest] = useState<string | null>(null);

	/**
	 * Update passport Dynamic Fields on-chain
	 */
	const updatePassportData = useCallback(
		async (params: UpdatePassportParams) => {
			const { passportId, dataType, blobIds, replace = false } = params;

			// Validate: blob IDs must be provided
			if (!blobIds || blobIds.length === 0) {
				throw new Error("At least one blob ID must be provided");
			}

			setIsUpdating(true);
			setError(null);
			setDigest(null);

			try {
				const packageId = getPackageId();

				console.log("[UpdatePassport] Preparing transaction...");
				console.log(`  Passport ID: ${passportId}`);
				console.log(`  Data Type: ${dataType}`);
				console.log(`  Blob IDs: ${blobIds.join(", ")}`);
				console.log(`  Mode: ${replace ? "replace" : "add"}`);

				// Build transaction
				const tx = new Transaction();

				// Use add_data_entry or replace_data_entry
				const functionName = replace ? "replace_data_entry" : "add_data_entry";
				tx.moveCall({
					target: `${packageId}::accessor::${functionName}`,
					arguments: [
						tx.object(passportId), // passport
						tx.pure.string(dataType), // data_type
						tx.pure.vector("string", blobIds), // blob_ids (vector<String>)
					],
				});

				console.log("[UpdatePassport] Executing transaction...");

				// Execute transaction
				const result = await signAndExecuteTransaction({
					transaction: tx,
				});

				const txDigest = result.digest;
				console.log(`[UpdatePassport] Transaction successful: ${txDigest}`);

				// Wait for transaction to be finalized
				await suiClient.waitForTransaction({
					digest: txDigest,
					options: {
						showEffects: true,
					},
				});

				console.log("[UpdatePassport] Transaction finalized");

				setDigest(txDigest);
				setIsUpdating(false);
			} catch (err) {
				console.error("[UpdatePassport] Update failed:", err);

				const errorMessage =
					err instanceof Error ? err.message : "Failed to update passport data";
				setError(errorMessage);
				setIsUpdating(false);
				throw new Error(errorMessage);
			}
		},
		[signAndExecuteTransaction, suiClient],
	);

	/**
	 * Update multiple data types in a single transaction
	 */
	const updateMultiplePassportData = useCallback(
		async (params: UpdateMultiplePassportParams) => {
			const { passportId, dataEntries } = params;

			// Validate: at least one data entry must be provided
			if (!dataEntries || dataEntries.length === 0) {
				throw new Error("At least one data entry must be provided");
			}

			// Validate: all data entries must have blob IDs
			for (const entry of dataEntries) {
				if (!entry.blobIds || entry.blobIds.length === 0) {
					throw new Error(
						`Data type "${entry.dataType}" must have at least one blob ID`,
					);
				}
			}

			setIsUpdating(true);
			setError(null);
			setDigest(null);

			try {
				const packageId = getPackageId();

				console.log("[UpdateMultiplePassport] Preparing batch transaction...");
				console.log(`  Passport ID: ${passportId}`);
				console.log(`  Data Entries: ${dataEntries.length}`);
				for (const entry of dataEntries) {
					console.log(
						`    - ${entry.dataType}: ${entry.blobIds.join(", ")} (${entry.replace ? "replace" : "add"})`,
					);
				}

				// Build transaction with multiple move calls
				const tx = new Transaction();

				for (const entry of dataEntries) {
					const functionName = entry.replace
						? "replace_data_entry"
						: "add_data_entry";
					tx.moveCall({
						target: `${packageId}::accessor::${functionName}`,
						arguments: [
							tx.object(passportId), // passport
							tx.pure.string(entry.dataType), // data_type
							tx.pure.vector("string", entry.blobIds), // blob_ids (vector<String>)
						],
					});
				}

				console.log("[UpdateMultiplePassport] Executing batch transaction...");

				// Execute transaction
				const result = await signAndExecuteTransaction({
					transaction: tx,
				});

				const txDigest = result.digest;
				console.log(
					`[UpdateMultiplePassport] Batch transaction successful: ${txDigest}`,
				);

				// Wait for transaction to be finalized
				await suiClient.waitForTransaction({
					digest: txDigest,
					options: {
						showEffects: true,
					},
				});

				console.log("[UpdateMultiplePassport] Batch transaction finalized");

				setDigest(txDigest);
				setIsUpdating(false);
			} catch (err) {
				console.error("[UpdateMultiplePassport] Batch update failed:", err);

				const errorMessage =
					err instanceof Error
						? err.message
						: "Failed to update multiple passport data";
				setError(errorMessage);
				setIsUpdating(false);
				throw new Error(errorMessage);
			}
		},
		[signAndExecuteTransaction, suiClient],
	);

	return {
		updatePassportData,
		updateMultiplePassportData,
		isUpdating,
		error,
		digest,
	};
}
