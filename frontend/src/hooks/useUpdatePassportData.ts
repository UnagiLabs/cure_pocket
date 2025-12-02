/**
 * useUpdatePassportData Hook (v3.0.0)
 *
 * Updates MedicalPassport Dynamic Fields on-chain after data save.
 * Supports the new metadata blob architecture (v3.0.0).
 *
 * ## Features
 * - Call add_data_entry contract function (add new data type)
 * - Call replace_data_entry contract function (replace existing data type)
 * - Transaction status management with error handling
 * - Single metadata blob ID per data type
 *
 * ## Contract Functions (v3.0.0)
 * - `add_data_entry(passport, data_type, seal_id, metadata_blob_id, clock)`
 * - `replace_data_entry(passport, data_type, seal_id, metadata_blob_id, clock)`
 *
 * ## Usage
 * ```typescript
 * const { updatePassportData, isUpdating, error } = useUpdatePassportData();
 *
 * // Add new data type
 * await updatePassportData({
 *   passportId: "0x123...",
 *   dataType: "medications",
 *   metadataBlobId: "abc...",
 *   replace: false, // add mode
 * });
 *
 * // Replace existing data type
 * await updatePassportData({
 *   passportId: "0x123...",
 *   dataType: "basic_profile",
 *   metadataBlobId: "xyz...",
 *   replace: true, // replace mode
 * });
 * ```
 */
"use client";

import { fromHex } from "@mysten/bcs";
import {
	useCurrentAccount,
	useSignAndExecuteTransaction,
	useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useCallback, useState } from "react";
import { generateSealId } from "@/lib/crypto/walrusSeal";
import type { DataType } from "@/types/healthData";

// Re-export DataType for backward compatibility
export type { DataType };

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
 * Sui Clock object ID (shared system object)
 */
const SUI_CLOCK_OBJECT_ID = "0x6";

/**
 * Update parameters for Dynamic Fields (v3.0.0)
 */
export interface UpdatePassportParams {
	/** MedicalPassport object ID */
	passportId: string;
	/** Data type (e.g., "basic_profile", "medications") */
	dataType: DataType | string;
	/** Metadata blob ID (v3.0.0: single metadata blob, not array) */
	metadataBlobId: string;
	/** If true, use replace_data_entry; if false, use add_data_entry */
	replace?: boolean;
}

/**
 * Parameters for batch update (v3.0.0)
 */
export interface UpdateMultiplePassportParams {
	/** MedicalPassport object ID */
	passportId: string;
	/** Array of data entries to add/replace */
	dataEntries: Array<{
		dataType: DataType | string;
		metadataBlobId: string;
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
	const currentAccount = useCurrentAccount();
	const { mutateAsync: signAndExecuteTransaction } =
		useSignAndExecuteTransaction();

	const [isUpdating, setIsUpdating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [digest, setDigest] = useState<string | null>(null);

	/**
	 * Update passport Dynamic Fields on-chain (v3.0.0)
	 */
	const updatePassportData = useCallback(
		async (params: UpdatePassportParams) => {
			const { passportId, dataType, metadataBlobId, replace = false } = params;

			// Validate: wallet must be connected
			if (!currentAccount?.address) {
				throw new Error("Wallet not connected");
			}

			// Validate: metadata blob ID must be provided
			if (!metadataBlobId) {
				throw new Error("Metadata blob ID must be provided");
			}

			setIsUpdating(true);
			setError(null);
			setDigest(null);

			try {
				const packageId = getPackageId();

				// Generate seal_id from wallet address and data type
				const sealId = await generateSealId(currentAccount.address, dataType);

				console.log("[UpdatePassport] Preparing transaction (v3.0.0)...");
				console.log(`  Passport ID: ${passportId}`);
				console.log(`  Data Type: ${dataType}`);
				console.log(`  Seal ID: ${sealId}`);
				console.log(`  Metadata Blob ID: ${metadataBlobId}`);
				console.log(`  Mode: ${replace ? "replace" : "add"}`);

				// Build transaction
				const tx = new Transaction();

				// Use add_data_entry or replace_data_entry (v3.0.0: metadata_blob_id)
				const functionName = replace ? "replace_data_entry" : "add_data_entry";
				tx.moveCall({
					target: `${packageId}::accessor::${functionName}`,
					arguments: [
						tx.object(passportId), // passport
						tx.pure.string(dataType), // data_type
						tx.pure.vector("u8", Array.from(fromHex(sealId))), // seal_id (vector<u8>)
						tx.pure.string(metadataBlobId), // metadata_blob_id (String)
						tx.object(SUI_CLOCK_OBJECT_ID), // clock
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
		[currentAccount, signAndExecuteTransaction, suiClient],
	);

	/**
	 * Update multiple data types in a single transaction (v3.0.0)
	 */
	const updateMultiplePassportData = useCallback(
		async (params: UpdateMultiplePassportParams) => {
			const { passportId, dataEntries } = params;

			// Validate: wallet must be connected
			if (!currentAccount?.address) {
				throw new Error("Wallet not connected");
			}

			// Validate: at least one data entry must be provided
			if (!dataEntries || dataEntries.length === 0) {
				throw new Error("At least one data entry must be provided");
			}

			// Validate: all data entries must have metadata blob ID
			for (const entry of dataEntries) {
				if (!entry.metadataBlobId) {
					throw new Error(
						`Data type "${entry.dataType}" must have a metadata blob ID`,
					);
				}
			}

			setIsUpdating(true);
			setError(null);
			setDigest(null);

			try {
				const packageId = getPackageId();

				console.log(
					"[UpdateMultiplePassport] Preparing batch transaction (v3.0.0)...",
				);
				console.log(`  Passport ID: ${passportId}`);
				console.log(`  Data Entries: ${dataEntries.length}`);
				for (const entry of dataEntries) {
					console.log(
						`    - ${entry.dataType}: ${entry.metadataBlobId} (${entry.replace ? "replace" : "add"})`,
					);
				}

				// Build transaction with multiple move calls
				const tx = new Transaction();

				for (const entry of dataEntries) {
					// Generate seal_id for each data type
					const sealId = await generateSealId(
						currentAccount.address,
						entry.dataType,
					);
					const functionName = entry.replace
						? "replace_data_entry"
						: "add_data_entry";
					tx.moveCall({
						target: `${packageId}::accessor::${functionName}`,
						arguments: [
							tx.object(passportId), // passport
							tx.pure.string(entry.dataType), // data_type
							tx.pure.vector("u8", Array.from(fromHex(sealId))), // seal_id (vector<u8>)
							tx.pure.string(entry.metadataBlobId), // metadata_blob_id (String)
							tx.object(SUI_CLOCK_OBJECT_ID), // clock
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
		[currentAccount, signAndExecuteTransaction, suiClient],
	);

	return {
		updatePassportData,
		updateMultiplePassportData,
		isUpdating,
		error,
		digest,
	};
}
