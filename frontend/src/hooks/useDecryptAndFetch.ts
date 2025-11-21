/**
 * useDecryptAndFetch Hook
 *
 * Fetches encrypted data from Walrus and decrypts with Seal using SessionKey.
 *
 * ## Features
 * - Download encrypted data from Walrus
 * - Build PTB for access control verification
 * - Decrypt with Seal using SessionKey
 * - Progress tracking for multi-step operation
 *
 * ## Decryption Flow
 * 1. Fetch encrypted blob from Walrus by blob_id
 * 2. Build PTB with seal_approve_patient_only call
 * 3. Decrypt with Seal using SessionKey and PTB
 * 4. Parse and return HealthData
 *
 * ## Usage
 * ```typescript
 * const { decryptAndFetch, isDecrypting, progress, error } = useDecryptAndFetch();
 *
 * const healthData = await decryptAndFetch({
 *   blobId: "abc123...",
 *   sealId: "def456...",
 *   sessionKey,
 *   passportId: "0x789...",
 * });
 * ```
 */
"use client";

import { useSuiClient } from "@mysten/dapp-kit";
import type { SessionKey } from "@mysten/seal";
import { useCallback, useState } from "react";
import {
	buildPatientAccessPTB,
	createSealClient,
	decryptHealthData,
} from "@/lib/seal";
import { downloadFromWalrusByBlobId } from "@/lib/walrus";
import type { HealthData } from "@/types/healthData";

/**
 * Decryption progress stages
 */
export type DecryptionProgress =
	| "idle"
	| "fetching"
	| "building_ptb"
	| "decrypting"
	| "completed"
	| "error";

/**
 * Decryption parameters
 */
export interface DecryptionParams {
	/** Walrus blob ID (content-addressed) */
	blobId: string;
	/** Seal ID for decryption policy */
	sealId: string;
	/** SessionKey with wallet signature */
	sessionKey: SessionKey;
	/** MedicalPassport object ID */
	passportId: string;
	/** PassportRegistry object ID */
	registryId?: string;
}

/**
 * Hook return type
 */
export interface UseDecryptAndFetchReturn {
	/** Fetch and decrypt HealthData from Walrus */
	decryptAndFetch: (params: DecryptionParams) => Promise<HealthData>;
	/** Whether decryption operation is in progress */
	isDecrypting: boolean;
	/** Current progress stage */
	progress: DecryptionProgress;
	/** Error message if operation failed */
	error: string | null;
	/** Reset state to idle */
	reset: () => void;
}

/**
 * Fetch encrypted data from Walrus and decrypt with Seal
 *
 * @returns Decryption and fetch controls
 */
export function useDecryptAndFetch(): UseDecryptAndFetchReturn {
	const suiClient = useSuiClient();

	const [progress, setProgress] = useState<DecryptionProgress>("idle");
	const [error, setError] = useState<string | null>(null);

	/**
	 * Fetch and decrypt HealthData from Walrus
	 */
	const decryptAndFetch = useCallback(
		async (params: DecryptionParams): Promise<HealthData> => {
			const { blobId, sealId, sessionKey, passportId, registryId } = params;

			setProgress("fetching");
			setError(null);

			try {
				// Get registry ID from environment if not provided
				const effectiveRegistryId =
					registryId || process.env.NEXT_PUBLIC_PASSPORT_REGISTRY_ID;

				if (!effectiveRegistryId) {
					throw new Error("PassportRegistry ID not configured");
				}

				// Step 1: Fetch encrypted data from Walrus
				console.log(`[DecryptAndFetch] Fetching blob: ${blobId}...`);

				const encryptedData = await downloadFromWalrusByBlobId(blobId);

				console.log(
					`[DecryptAndFetch] Downloaded ${encryptedData.length} bytes`,
				);

				// Step 2: Build PTB for access control
				setProgress("building_ptb");
				console.log("[DecryptAndFetch] Building PTB for access control...");

				const txBytes = await buildPatientAccessPTB({
					passportObjectId: passportId,
					registryObjectId: effectiveRegistryId,
					suiClient,
					sealId,
				});

				console.log("[DecryptAndFetch] PTB built successfully");

				// Step 3: Decrypt with Seal
				setProgress("decrypting");
				console.log("[DecryptAndFetch] Decrypting with Seal...");

				const sealClient = createSealClient(suiClient);

				const healthData = await decryptHealthData({
					encryptedData,
					sealClient,
					sessionKey,
					txBytes,
					sealId,
				});

				console.log("[DecryptAndFetch] Decryption complete");

				// Step 4: Return decrypted data
				setProgress("completed");

				return healthData;
			} catch (err) {
				console.error("[DecryptAndFetch] Operation failed:", err);
				setProgress("error");

				const errorMessage =
					err instanceof Error
						? err.message
						: "Failed to fetch and decrypt data";
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
		decryptAndFetch,
		isDecrypting:
			progress !== "idle" && progress !== "completed" && progress !== "error",
		progress,
		error,
		reset,
	};
}
