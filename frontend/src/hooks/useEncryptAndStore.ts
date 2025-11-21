/**
 * useEncryptAndStore Hook
 *
 * Encrypts HealthData with Seal and uploads to Walrus storage.
 *
 * ## Features
 * - HealthData encryption using Seal's threshold IBE
 * - Automatic upload to Walrus decentralized storage
 * - Progress tracking for multi-step operation
 * - Error handling with detailed status
 *
 * ## Encryption Flow
 * 1. Generate seal_id from wallet address
 * 2. Encrypt HealthData with Seal (2-of-n threshold)
 * 3. Upload encrypted blob to Walrus
 * 4. Return walrus_blob_id and seal_id for on-chain storage
 *
 * ## Usage
 * ```typescript
 * const { encryptAndStore, isEncrypting, progress, error } = useEncryptAndStore();
 *
 * const result = await encryptAndStore(healthData);
 * console.log(result.blobId, result.sealId);
 * ```
 */
"use client";

import { useSuiClient } from "@mysten/dapp-kit";
import { useCallback, useState } from "react";
import {
	calculateThreshold,
	createSealClient,
	encryptHealthData,
	SEAL_KEY_SERVERS,
} from "@/lib/seal";
import { uploadToWalrus } from "@/lib/walrus";
import type { HealthData } from "@/types/healthData";

/**
 * Encryption and storage progress stages
 */
export type EncryptionProgress =
	| "idle"
	| "generating_seal_id"
	| "encrypting"
	| "uploading"
	| "completed"
	| "error";

/**
 * Encryption result
 */
export interface EncryptionResult {
	/** Walrus blob ID (content-addressed) */
	blobId: string;
	/** Seal ID for decryption policy */
	sealId: string;
	/** Backup encryption key (optional, for recovery) */
	backupKey?: Uint8Array;
}

/**
 * Hook return type
 */
export interface UseEncryptAndStoreReturn {
	/** Encrypt HealthData and upload to Walrus */
	encryptAndStore: (
		healthData: HealthData,
		sealId: string,
	) => Promise<EncryptionResult>;
	/** Whether encryption/upload operation is in progress */
	isEncrypting: boolean;
	/** Current progress stage */
	progress: EncryptionProgress;
	/** Error message if operation failed */
	error: string | null;
	/** Reset state to idle */
	reset: () => void;
}

/**
 * Encrypt HealthData with Seal and upload to Walrus
 *
 * @returns Encryption and storage controls
 */
export function useEncryptAndStore(): UseEncryptAndStoreReturn {
	const suiClient = useSuiClient();

	const [progress, setProgress] = useState<EncryptionProgress>("idle");
	const [error, setError] = useState<string | null>(null);

	/**
	 * Encrypt HealthData and upload to Walrus
	 */
	const encryptAndStore = useCallback(
		async (
			healthData: HealthData,
			sealId: string,
		): Promise<EncryptionResult> => {
			setProgress("encrypting");
			setError(null);

			try {
				// Step 1: Create Seal client
				const sealClient = createSealClient(suiClient);

				// Step 2: Calculate threshold based on number of key servers
				const threshold = calculateThreshold(SEAL_KEY_SERVERS.length);

				console.log(
					`[EncryptAndStore] Encrypting HealthData with Seal (threshold: ${threshold}, servers: ${SEAL_KEY_SERVERS.length})...`,
				);

				// Step 3: Encrypt HealthData
				const { encryptedObject, backupKey } = await encryptHealthData({
					healthData,
					sealClient,
					sealId,
					threshold,
				});

				console.log(
					`[EncryptAndStore] Encryption complete, size: ${encryptedObject.length} bytes`,
				);

				// Step 4: Upload to Walrus
				setProgress("uploading");
				console.log("[EncryptAndStore] Uploading to Walrus...");

				const walrusRef = await uploadToWalrus(encryptedObject);

				console.log(
					`[EncryptAndStore] Upload complete, blobId: ${walrusRef.blobId}`,
				);

				// Step 5: Return result
				setProgress("completed");

				return {
					blobId: walrusRef.blobId,
					sealId,
					backupKey,
				};
			} catch (err) {
				console.error("[EncryptAndStore] Operation failed:", err);
				setProgress("error");

				const errorMessage =
					err instanceof Error
						? err.message
						: "Failed to encrypt and store data";
				setError(errorMessage);

				throw new Error(errorMessage);
			}
		},
		[suiClient],
	);

	/**
	 * Reset state to idle
	 */
	const reset = useCallback(() => {
		setProgress("idle");
		setError(null);
	}, []);

	return {
		encryptAndStore,
		isEncrypting:
			progress !== "idle" && progress !== "completed" && progress !== "error",
		progress,
		error,
		reset,
	};
}
