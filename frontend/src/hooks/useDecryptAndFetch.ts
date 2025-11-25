/**
 * useDecryptAndFetch Hook
 *
 * Fetches encrypted data from Walrus and decrypts with Seal using SessionKey.
 * Automatically generates scope-based seal_id from wallet address and dataType.
 *
 * ## Features
 * - Download encrypted data from Walrus
 * - Auto-generate seal_id from address + dataType (no manual seal_id needed)
 * - Build PTB for access control verification
 * - Decrypt with Seal using SessionKey
 * - Polymorphic decryption (JSON for health data, binary for images)
 * - Progress tracking for multi-step operation
 *
 * ## Decryption Flow
 * 1. Generate seal_id from wallet address + dataType
 * 2. Fetch encrypted blob from Walrus by blob_id
 * 3. Build PTB with seal_approve_patient_only call
 * 4. Decrypt with Seal using SessionKey and PTB
 * 5. Parse based on dataType (JSON or binary envelope)
 *
 * ## Usage
 * ```typescript
 * const { decrypt, isDecrypting, progress, error } = useDecryptAndFetch();
 *
 * // For JSON health data
 * const medicationsData = await decrypt({
 *   blobId: "abc123...",
 *   dataType: "medications",
 *   sessionKey,
 *   passportId: "0x789...",
 * });
 *
 * // For imaging binary
 * const imagingBinary = await decrypt({
 *   blobId: "def456...",
 *   dataType: "imaging_binary",
 *   sessionKey,
 *   passportId: "0x789...",
 * });
 * // imagingBinary.objectUrl contains the image URL
 * ```
 */
"use client";

import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import type { SessionKey } from "@mysten/seal";
import { useCallback, useState } from "react";
import { decryptImagingBinaryInternal } from "@/lib/imagingBinary";
import {
	buildPatientAccessPTB,
	createSealClient,
	decryptHealthData,
} from "@/lib/seal";
import { generateSealId } from "@/lib/sealIdGenerator";
import { downloadFromWalrusByBlobId } from "@/lib/walrus";
import type {
	BasicProfileData,
	ConditionsData,
	DataType,
	HealthData,
	ImagingMetaData,
	LabResultsData,
	MedicationsData,
	SelfMetricsData,
} from "@/types/healthData";

/**
 * Decryption progress stages
 */
export type DecryptionProgress =
	| "idle"
	| "generating_seal_id"
	| "fetching"
	| "building_ptb"
	| "decrypting"
	| "completed"
	| "error";

/**
 * Decryption parameters
 * Note: sealId is NOT included - it's auto-generated from address + dataType
 */
export interface DecryptionParams {
	/** Walrus blob ID (content-addressed) */
	blobId: string;
	/** Data type for seal_id generation */
	dataType: DataType;
	/** SessionKey with wallet signature */
	sessionKey: SessionKey;
	/** MedicalPassport object ID */
	passportId: string;
	/** PassportRegistry object ID (optional, defaults to env) */
	registryId?: string;
}

/**
 * Imaging binary result type
 */
export interface ImagingBinaryResult {
	contentType: string;
	data: ArrayBuffer;
	objectUrl: string;
}

/**
 * Decrypted data type based on dataType parameter
 */
export type DecryptedData<T extends DataType> = T extends "imaging_binary"
	? ImagingBinaryResult
	: T extends "basic_profile"
		? BasicProfileData
		: T extends "medications"
			? MedicationsData
			: T extends "conditions"
				? ConditionsData
				: T extends "lab_results"
					? LabResultsData
					: T extends "imaging_meta"
						? ImagingMetaData
						: T extends "self_metrics"
							? SelfMetricsData
							: HealthData;

/**
 * Decrypt multiple result
 */
export interface DecryptMultipleResult {
	dataType: DataType;
	data: unknown;
	success: boolean;
	error?: string;
}

/**
 * Hook return type
 */
export interface UseDecryptAndFetchReturn {
	/** Fetch and decrypt data from Walrus (seal_id auto-generated) */
	decrypt: <T extends DataType>(
		params: DecryptionParams & { dataType: T },
	) => Promise<DecryptedData<T>>;
	/** Decrypt multiple blobs in parallel */
	decryptMultiple: (
		params: DecryptionParams[],
	) => Promise<DecryptMultipleResult[]>;
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
 * Automatically generates scope-based seal_id from wallet address and dataType
 *
 * @returns Decryption and fetch controls
 */
export function useDecryptAndFetch(): UseDecryptAndFetchReturn {
	const suiClient = useSuiClient();
	const currentAccount = useCurrentAccount();

	const [progress, setProgress] = useState<DecryptionProgress>("idle");
	const [error, setError] = useState<string | null>(null);

	/**
	 * Fetch and decrypt data from Walrus
	 * seal_id is automatically generated from wallet address + dataType
	 */
	const decrypt = useCallback(
		async <T extends DataType>(
			params: DecryptionParams & { dataType: T },
		): Promise<DecryptedData<T>> => {
			const { blobId, dataType, sessionKey, passportId, registryId } = params;

			setProgress("generating_seal_id");
			setError(null);

			try {
				// Step 0: Wallet address check
				if (!currentAccount?.address) {
					throw new Error("Wallet not connected");
				}

				// Step 1: Generate seal_id from address + dataType (KEY CHANGE)
				const sealId = await generateSealId(currentAccount.address, dataType);
				console.log(
					`[DecryptAndFetch] Generated seal_id for ${dataType}: ${sealId.substring(0, 16)}...`,
				);

				// Get registry ID from environment if not provided
				const effectiveRegistryId =
					registryId || process.env.NEXT_PUBLIC_PASSPORT_REGISTRY_ID;

				if (!effectiveRegistryId) {
					throw new Error("PassportRegistry ID not configured");
				}

				// Step 2: Fetch encrypted data from Walrus
				setProgress("fetching");
				console.log(`[DecryptAndFetch] Fetching blob: ${blobId}...`);

				const encryptedData = await downloadFromWalrusByBlobId(blobId);

				console.log(
					`[DecryptAndFetch] Downloaded ${encryptedData.length} bytes`,
				);

				// Step 3: Build PTB for access control
				setProgress("building_ptb");
				console.log("[DecryptAndFetch] Building PTB for access control...");

				const txBytes = await buildPatientAccessPTB({
					passportObjectId: passportId,
					registryObjectId: effectiveRegistryId,
					suiClient,
					sealId,
				});

				console.log("[DecryptAndFetch] PTB built successfully");

				// Step 4: Decrypt based on dataType
				setProgress("decrypting");
				console.log(
					`[DecryptAndFetch] Decrypting ${dataType === "imaging_binary" ? "binary" : "JSON"} data...`,
				);

				if (dataType === "imaging_binary") {
					// Binary image decryption with envelope handling
					const result = await decryptImagingBinaryInternal({
						encryptedData,
						sealId,
						sessionKey,
						txBytes,
						suiClient,
					});

					console.log(
						`[DecryptAndFetch] Binary decryption complete: ${result.contentType}`,
					);
					setProgress("completed");

					return result as DecryptedData<T>;
				}

				// JSON health data decryption
				const sealClient = createSealClient(suiClient);

				const healthData = await decryptHealthData({
					encryptedData,
					sealClient,
					sessionKey,
					txBytes,
					sealId,
				});

				console.log("[DecryptAndFetch] JSON decryption complete");
				setProgress("completed");

				return healthData as DecryptedData<T>;
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
		[suiClient, currentAccount],
	);

	/**
	 * Decrypt multiple blobs in parallel
	 */
	const decryptMultiple = useCallback(
		async (params: DecryptionParams[]): Promise<DecryptMultipleResult[]> => {
			const results = await Promise.allSettled(params.map((p) => decrypt(p)));

			return results.map((result, index) => {
				if (result.status === "fulfilled") {
					return {
						dataType: params[index].dataType,
						data: result.value,
						success: true,
					};
				}
				return {
					dataType: params[index].dataType,
					data: null,
					success: false,
					error: result.reason?.message || "Unknown error",
				};
			});
		},
		[decrypt],
	);

	/**
	 * Reset state to idle
	 */
	const reset = useCallback(() => {
		setProgress("idle");
		setError(null);
	}, []);

	return {
		decrypt,
		decryptMultiple,
		isDecrypting:
			progress !== "idle" && progress !== "completed" && progress !== "error",
		progress,
		error,
		reset,
	};
}
