/**
 * useUpdatePassportData Hook
 *
 * Updates MedicalPassport walrus_blob_id and seal_id on-chain after profile save.
 *
 * ## Features
 * - Call update_walrus_blob_id contract function
 * - Call update_seal_id contract function
 * - Transaction status management with error handling
 * - Support for sequential or batch updates
 *
 * ## Contract Functions
 * - `update_walrus_blob_id(registry, passport, new_blob_id, clock)`
 * - `update_seal_id(registry, passport, new_seal_id, clock)`
 *
 * ## Usage
 * ```typescript
 * const { updatePassportData, isUpdating, error } = useUpdatePassportData();
 *
 * await updatePassportData({
 *   passportId: "0x123...",
 *   blobId: "abc...",
 *   sealId: "def...",
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
 * PassportRegistry ID from environment
 */
function getRegistryId(): string {
	const registryId = process.env.NEXT_PUBLIC_PASSPORT_REGISTRY_ID;
	if (!registryId) {
		throw new Error("NEXT_PUBLIC_PASSPORT_REGISTRY_ID is not set");
	}
	return registryId;
}

/**
 * Clock object ID (shared object on Sui)
 */
const CLOCK_OBJECT_ID = "0x6";

/**
 * Update parameters
 */
export interface UpdatePassportParams {
	/** MedicalPassport object ID */
	passportId: string;
	/** New Walrus blob ID (optional, updates if provided) */
	blobId?: string;
	/** New Seal ID (optional, updates if provided) */
	sealId?: string;
	/** Custom registry ID (optional, uses env default if not provided) */
	registryId?: string;
}

/**
 * Hook return type
 */
export interface UseUpdatePassportDataReturn {
	/** Update passport walrus_blob_id and/or seal_id */
	updatePassportData: (params: UpdatePassportParams) => Promise<void>;
	/** Whether update transaction is in progress */
	isUpdating: boolean;
	/** Error message if update failed */
	error: string | null;
	/** Transaction digest of the last successful update */
	digest: string | null;
}

/**
 * Update MedicalPassport data (walrus_blob_id and seal_id) on-chain
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
	 * Update passport data on-chain
	 */
	const updatePassportData = useCallback(
		async (params: UpdatePassportParams) => {
			const { passportId, blobId, sealId, registryId } = params;

			// Validate: at least one field must be provided
			if (!blobId && !sealId) {
				throw new Error(
					"At least one of blobId or sealId must be provided for update",
				);
			}

			setIsUpdating(true);
			setError(null);
			setDigest(null);

			try {
				const packageId = getPackageId();
				const effectiveRegistryId = registryId || getRegistryId();

				console.log("[UpdatePassport] Preparing transaction...");
				console.log(`  Passport ID: ${passportId}`);
				console.log(`  Registry ID: ${effectiveRegistryId}`);
				if (blobId) console.log(`  New Blob ID: ${blobId}`);
				if (sealId) console.log(`  New Seal ID: ${sealId}`);

				// Build transaction
				const tx = new Transaction();

				// Update walrus_blob_id if provided
				if (blobId) {
					tx.moveCall({
						target: `${packageId}::accessor::update_walrus_blob_id`,
						arguments: [
							tx.object(effectiveRegistryId), // registry
							tx.object(passportId), // passport
							tx.pure.string(blobId), // new_blob_id
							tx.object(CLOCK_OBJECT_ID), // clock
						],
					});
				}

				// Update seal_id if provided
				if (sealId) {
					tx.moveCall({
						target: `${packageId}::accessor::update_seal_id`,
						arguments: [
							tx.object(effectiveRegistryId), // registry
							tx.object(passportId), // passport
							tx.pure.string(sealId), // new_seal_id
							tx.object(CLOCK_OBJECT_ID), // clock
						],
					});
				}

				console.log("[UpdatePassport] Executing transaction...");

				// ✅ Execute transaction with mutateAsync
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

	return {
		updatePassportData,
		isUpdating,
		error,
		digest,
	};
}
