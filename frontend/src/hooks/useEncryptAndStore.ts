/**
 * useEncryptAndStore Hook
 *
 * Encrypts HealthData with Seal and uploads to Walrus storage.
 *
 * ## Features
 * - HealthData validation before encryption
 * - HealthData encryption using Seal's threshold IBE
 * - Automatic upload to Walrus decentralized storage
 * - Progress tracking for multi-step operation
 * - Error handling with detailed status
 *
 * ## Encryption Flow
 * 1. Validate HealthData against schema
 * 2. Generate seal_id from wallet address
 * 3. Encrypt HealthData with Seal (2-of-n threshold)
 * 4. Upload encrypted blob to Walrus
 * 5. Return walrus_blob_id and seal_id for on-chain storage
 *
 * ## Usage
 * ```typescript
 * const { encryptAndStore, isEncrypting, progress, error } = useEncryptAndStore();
 *
 * const result = await encryptAndStore(healthData, sealId, "medications");
 * console.log(result.blobId, result.dataType, result.sealId);
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
import {
	HealthDataValidationError,
	validateBasicProfileData,
	validateConditionsData,
	validateHealthData,
	validateImagingMetaData,
	validateLabResultsData,
	validateMedicationsData,
	validateSelfMetricsData,
} from "@/lib/validation/healthDataValidator";
import { downloadFromWalrusByBlobId, uploadToWalrus } from "@/lib/walrus";
import type {
	BasicProfileData,
	ConditionsData,
	DataType,
	HealthData,
	ImagingBinaryData,
	ImagingMetaData,
	LabResultsData,
	MedicationsData,
	SelfMetricsData,
} from "@/types/healthData";

/**
 * Encryption and storage progress stages
 */
export type EncryptionProgress =
	| "idle"
	| "validating"
	| "generating_seal_id"
	| "encrypting"
	| "uploading"
	| "completed"
	| "error";

/**
 * Union type for all supported health data types
 */
export type HealthDataTypes =
	| BasicProfileData
	| MedicationsData
	| ConditionsData
	| LabResultsData
	| ImagingMetaData
	| ImagingBinaryData
	| SelfMetricsData;

/**
 * Encryption result
 */
export interface EncryptionResult {
	/** Walrus blob ID (content-addressed) */
	blobId: string;
	/** Data type (e.g., "basic_profile", "medications") */
	dataType: string;
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
		dataType: string,
	) => Promise<EncryptionResult>;
	/** Encrypt multiple HealthData items and upload to Walrus in parallel */
	encryptAndStoreMultiple: (
		dataItems: Array<{ data: HealthDataTypes; dataType: DataType }>,
		sealId: string,
	) => Promise<EncryptionResult[]>;
	/** Decrypt multiple blob IDs and return the data */
	decryptMultiple: (
		blobIds: Array<{ dataType: DataType; blobId: string }>,
		sealId: string,
	) => Promise<Array<{ dataType: DataType; data: HealthDataTypes | null }>>;
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
			dataType: string,
		): Promise<EncryptionResult> => {
			setProgress("validating");
			setError(null);

			try {
				// Step 1: Validate HealthData before encryption
				console.log(
					`[EncryptAndStore] Validating HealthData for type: ${dataType}...`,
				);

				try {
					validateHealthData(healthData, dataType);
				} catch (validationError) {
					if (validationError instanceof HealthDataValidationError) {
						console.error(
							`[EncryptAndStore] Validation failed: ${validationError.message}`,
							{
								field: validationError.field,
								dataType: validationError.dataType,
							},
						);
						throw new Error(
							`Data validation failed: ${validationError.message}${
								validationError.field
									? ` (field: ${validationError.field})`
									: ""
							}`,
						);
					}
					throw validationError;
				}

				console.log(
					"[EncryptAndStore] Validation passed, proceeding with encryption...",
				);

				// Step 2: Create Seal client
				setProgress("encrypting");
				const sealClient = createSealClient(suiClient);

				// Step 3: Calculate threshold based on number of key servers
				const threshold = calculateThreshold(SEAL_KEY_SERVERS.length);

				console.log(
					`[EncryptAndStore] Encrypting HealthData with Seal (threshold: ${threshold}, servers: ${SEAL_KEY_SERVERS.length})...`,
				);

				// Step 4: Encrypt HealthData
				const { encryptedObject, backupKey } = await encryptHealthData({
					healthData,
					sealClient,
					sealId,
					threshold,
				});

				console.log(
					`[EncryptAndStore] Encryption complete, size: ${encryptedObject.length} bytes`,
				);

				// Step 5: Upload to Walrus
				setProgress("uploading");
				console.log("[EncryptAndStore] Uploading to Walrus...");

				const walrusRef = await uploadToWalrus(encryptedObject);

				console.log(
					`[EncryptAndStore] Upload complete, blobId: ${walrusRef.blobId}`,
				);

				// Step 6: Return result
				setProgress("completed");

				return {
					blobId: walrusRef.blobId,
					dataType,
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

	const encryptAndStoreMultiple = useCallback(
		async (
			dataItems: Array<{ data: HealthDataTypes; dataType: DataType }>,
			sealId: string,
		): Promise<EncryptionResult[]> => {
			setProgress("validating");
			setError(null);

			try {
				// Step 1: Validate all data items
				console.log(
					`[EncryptAndStoreMultiple] Validating ${dataItems.length} data items...`,
				);

				for (const item of dataItems) {
					try {
						// Use data-type-specific validation functions
						switch (item.dataType) {
							case "basic_profile":
								validateBasicProfileData(item.data as BasicProfileData);
								break;
							case "medications":
								validateMedicationsData(item.data as MedicationsData);
								break;
							case "conditions":
								validateConditionsData(item.data as ConditionsData);
								break;
							case "lab_results":
								validateLabResultsData(item.data as LabResultsData);
								break;
							case "imaging_meta":
								validateImagingMetaData(item.data as ImagingMetaData);
								break;
							case "self_metrics":
								validateSelfMetricsData(item.data as SelfMetricsData);
								break;
							case "imaging_binary":
								// Imaging binary validation not yet implemented
								console.warn(
									`[EncryptAndStoreMultiple] Skipping validation for imaging_binary`,
								);
								break;
							default:
								throw new Error(`Unknown data type: ${item.dataType}`);
						}
					} catch (validationError) {
						if (validationError instanceof HealthDataValidationError) {
							console.error(
								`[EncryptAndStoreMultiple] Validation failed for type: ${item.dataType}`,
								{
									field: validationError.field,
									dataType: validationError.dataType,
								},
							);
							throw new Error(
								`Data validation failed for ${item.dataType}: ${validationError.message}${
									validationError.field
										? ` (field: ${validationError.field})`
										: ""
								}`,
							);
						}
						throw validationError;
					}
				}

				console.log(
					"[EncryptAndStoreMultiple] All validations passed, proceeding with batch encryption...",
				);

				// Step 2: Create Seal client
				setProgress("encrypting");
				const sealClient = createSealClient(suiClient);

				// Step 3: Calculate threshold
				const threshold = calculateThreshold(SEAL_KEY_SERVERS.length);

				console.log(
					`[EncryptAndStoreMultiple] Batch encrypting ${dataItems.length} items with Seal (threshold: ${threshold})...`,
				);

				// Step 4: Encrypt all items in parallel
				const encryptionPromises = dataItems.map(async (item) => {
					const { encryptedObject, backupKey } = await encryptHealthData({
						healthData: item.data,
						sealClient,
						sealId,
						threshold,
					});

					console.log(
						`[EncryptAndStoreMultiple] Encrypted ${item.dataType}, size: ${encryptedObject.length} bytes`,
					);

					// Step 5: Upload to Walrus
					const walrusRef = await uploadToWalrus(encryptedObject);

					console.log(
						`[EncryptAndStoreMultiple] Uploaded ${item.dataType}, blobId: ${walrusRef.blobId}`,
					);

					return {
						blobId: walrusRef.blobId,
						dataType: item.dataType,
						sealId,
						backupKey,
					};
				});

				// Step 6: Wait for all uploads to complete
				setProgress("uploading");
				const results = await Promise.all(encryptionPromises);

				console.log(
					`[EncryptAndStoreMultiple] All ${results.length} items encrypted and uploaded successfully`,
				);

				setProgress("completed");
				return results;
			} catch (err) {
				console.error("[EncryptAndStoreMultiple] Batch operation failed:", err);
				setProgress("error");

				const errorMessage =
					err instanceof Error
						? err.message
						: "Failed to encrypt and store multiple data items";
				setError(errorMessage);

				throw new Error(errorMessage);
			}
		},
		[suiClient],
	);

	const decryptMultiple = useCallback(
		async (
			blobIds: Array<{ dataType: DataType; blobId: string }>,
			_sealId: string,
		): Promise<Array<{ dataType: DataType; data: HealthDataTypes | null }>> => {
			setProgress("validating");
			setError(null);

			try {
				// TODO: Implement full decryption flow
				// Decryption requires:
				// 1. SessionKey creation (requires user wallet signature)
				// 2. PTB construction (requires passport object ID, registry object ID)
				// 3. Wallet signature on SessionKey
				// 4. Seal decryption with sessionKey + txBytes
				//
				// This functionality should be implemented in a dedicated decryption hook
				// that handles the complete wallet interaction flow.

				console.warn(
					"[DecryptMultiple] Decryption functionality not yet fully implemented",
				);
				console.warn(
					"[DecryptMultiple] Requires SessionKey, PTB, and wallet signature",
				);

				// Placeholder: Download encrypted data to verify blobs exist
				setProgress("encrypting"); // Reusing the same progress state
				const downloadPromises = blobIds.map(async (item) => {
					// Verify blob exists by downloading
					const encryptedData = await downloadFromWalrusByBlobId(item.blobId);

					console.log(
						`[DecryptMultiple] Downloaded encrypted blob ${item.dataType}, size: ${encryptedData.length} bytes`,
					);

					// Return placeholder data
					// TODO: Replace with actual decryption when SessionKey flow is implemented
					return {
						dataType: item.dataType,
						data: null, // Placeholder - decryption not yet implemented
					};
				});

				const results = await Promise.all(downloadPromises);

				console.log(
					`[DecryptMultiple] Downloaded ${results.length} encrypted blobs (decryption pending implementation)`,
				);

				setProgress("completed");
				throw new Error(
					"Decryption functionality not yet implemented. Requires SessionKey and wallet signature flow.",
				);
			} catch (err) {
				console.error("[DecryptMultiple] Batch operation failed:", err);
				setProgress("error");

				const errorMessage =
					err instanceof Error
						? err.message
						: "Failed to process multiple data items";
				setError(errorMessage);

				throw new Error(errorMessage);
			}
		},
		[],
	);

	return {
		encryptAndStore,
		encryptAndStoreMultiple,
		decryptMultiple,
		isEncrypting:
			progress !== "idle" && progress !== "completed" && progress !== "error",
		progress,
		error,
		reset,
	};
}
