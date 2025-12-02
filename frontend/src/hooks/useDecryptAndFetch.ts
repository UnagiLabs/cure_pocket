/**
 * useDecryptAndFetch Hook (v3.0.0)
 *
 * Fetches encrypted data from Walrus and decrypts with Seal using SessionKey.
 * Uses metadata blob architecture for efficient data access.
 *
 * ## Features
 * - Download encrypted data from Walrus
 * - Retrieve seal_id from MedicalPassport Dynamic Fields (EntryData.seal_id)
 * - Build PTB for access control verification
 * - Decrypt with Seal using SessionKey
 * - Polymorphic decryption (JSON for health data, binary for images)
 * - Progress tracking for multi-step operation
 *
 * ## Decryption Flow (v3.0.0)
 * 1. Fetch EntryData from SBT Dynamic Field to get seal_id and metadata_blob_id
 * 2. Fetch and decrypt metadata blob to get data blob references
 * 3. Fetch and decrypt required data blob(s)
 * 4. Parse based on dataType (JSON or binary envelope)
 *
 * ## Usage
 * ```typescript
 * const { decrypt, decryptWithSealId, isDecrypting, progress, error } = useDecryptAndFetch();
 *
 * // For JSON health data (seal_id fetched from DF automatically)
 * const medicationsData = await decrypt({
 *   dataType: "medications",
 *   sessionKey,
 *   passportId: "0x789...",
 * });
 *
 * // For direct decryption with known seal_id and blobId
 * const data = await decryptWithSealId({
 *   blobId: "abc123...",
 *   sealId: "def456...",
 *   dataType: "medications",
 *   sessionKey,
 *   passportId: "0x789...",
 * });
 * ```
 */
"use client";

import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import type { SessionKey } from "@mysten/seal";
import { useCallback, useState } from "react";
import {
	buildPatientAccessPTB,
	createSealClient,
	decryptHealthData,
	downloadFromWalrusByBlobId,
} from "@/lib/crypto/walrusSeal";
import { decryptImagingBinaryInternal } from "@/lib/data/binaryAdapter";
import { getDataEntry, PASSPORT_REGISTRY_ID } from "@/lib/suiClient";
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
import type { BaseMetadata, BaseMetadataEntry } from "@/types/metadata";

/**
 * Decryption progress stages
 */
export type DecryptionProgress =
	| "idle"
	| "fetching_entry"
	| "fetching_metadata"
	| "fetching"
	| "building_ptb"
	| "decrypting"
	| "completed"
	| "error";

/**
 * Decryption parameters (seal_id and metadata_blob_id fetched from SBT Dynamic Fields)
 */
export interface DecryptionParams {
	/** Data type for DF lookup */
	dataType: DataType;
	/** SessionKey with wallet signature */
	sessionKey: SessionKey;
	/** MedicalPassport object ID */
	passportId: string;
	/** PassportRegistry object ID (optional, defaults to env) */
	registryId?: string;
	/** Optional: partition key value to select specific entry from metadata */
	partitionKeyValue?: string;
}

/**
 * Direct decryption parameters (when seal_id and blob_id are already known)
 */
export interface DirectDecryptionParams {
	/** Walrus blob ID (content-addressed) */
	blobId: string;
	/** Seal ID from EntryData */
	sealId: string;
	/** Data type for PTB */
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
	/** Fetch seal_id from DF and decrypt data from Walrus */
	decrypt: <T extends DataType>(
		params: DecryptionParams & { dataType: T },
	) => Promise<DecryptedData<T>>;
	/** Decrypt with known seal_id and blob_id (for doctor/consent flows) */
	decryptWithSealId: <T extends DataType>(
		params: DirectDecryptionParams & { dataType: T },
	) => Promise<DecryptedData<T>>;
	/** Decrypt metadata blob to get entries list */
	decryptMetadata: <TEntry extends BaseMetadataEntry>(
		params: DecryptionParams,
	) => Promise<BaseMetadata<TEntry>>;
	/** Decrypt multiple data types in parallel */
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
 * Uses metadata blob architecture (v3.0.0)
 *
 * @returns Decryption and fetch controls
 */
export function useDecryptAndFetch(): UseDecryptAndFetchReturn {
	const suiClient = useSuiClient();
	const currentAccount = useCurrentAccount();

	const [progress, setProgress] = useState<DecryptionProgress>("idle");
	const [error, setError] = useState<string | null>(null);

	/**
	 * Internal decryption with known seal_id and blob_id
	 */
	const decryptInternal = useCallback(
		async <T extends DataType>(params: {
			blobId: string;
			sealId: string;
			dataType: T;
			sessionKey: SessionKey;
			passportId: string;
			registryId?: string;
		}): Promise<DecryptedData<T>> => {
			const { blobId, sealId, dataType, sessionKey, passportId, registryId } =
				params;

			// Get registry ID from environment if not provided
			const effectiveRegistryId = registryId || PASSPORT_REGISTRY_ID;

			if (!effectiveRegistryId) {
				throw new Error("PassportRegistry ID not configured");
			}

			// Step 1: Fetch encrypted data from Walrus
			setProgress("fetching");
			console.log(`[DecryptAndFetch] Fetching blob: ${blobId}...`);

			const encryptedData = await downloadFromWalrusByBlobId(blobId);

			console.log(`[DecryptAndFetch] Downloaded ${encryptedData.length} bytes`);

			// Step 2: Build PTB for access control
			setProgress("building_ptb");
			console.log("[DecryptAndFetch] Building PTB for access control...");

			const txBytes = await buildPatientAccessPTB({
				passportObjectId: passportId,
				registryObjectId: effectiveRegistryId,
				suiClient,
				sealId,
				dataType,
			});

			console.log("[DecryptAndFetch] PTB built successfully");

			// Step 3: Decrypt based on dataType
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
		},
		[suiClient],
	);

	/**
	 * Decrypt metadata blob to get entries list (v3.0.0)
	 */
	const decryptMetadata = useCallback(
		async <TEntry extends BaseMetadataEntry>(
			params: DecryptionParams,
		): Promise<BaseMetadata<TEntry>> => {
			const { dataType, sessionKey, passportId, registryId } = params;

			setProgress("fetching_entry");
			setError(null);

			try {
				// Wallet address check
				if (!currentAccount?.address) {
					throw new Error("Wallet not connected");
				}

				// Fetch EntryData from SBT Dynamic Field
				console.log(
					`[DecryptAndFetch] Fetching EntryData for ${dataType} from passport ${passportId}...`,
				);
				const entryData = await getDataEntry(passportId, dataType);

				if (!entryData) {
					throw new Error(`No data found for type: ${dataType}`);
				}

				const { sealId, metadataBlobId } = entryData;

				console.log(
					`[DecryptAndFetch] Retrieved seal_id from DF: ${sealId.substring(0, 16)}...`,
				);
				console.log(
					`[DecryptAndFetch] Metadata blob: ${metadataBlobId.substring(0, 16)}...`,
				);

				// Get registry ID
				const effectiveRegistryId = registryId || PASSPORT_REGISTRY_ID;
				if (!effectiveRegistryId) {
					throw new Error("PassportRegistry ID not configured");
				}

				// Fetch and decrypt metadata blob
				setProgress("fetching_metadata");
				console.log("[DecryptAndFetch] Fetching metadata blob...");

				const encryptedMetadata =
					await downloadFromWalrusByBlobId(metadataBlobId);

				// Build PTB
				setProgress("building_ptb");
				const txBytes = await buildPatientAccessPTB({
					passportObjectId: passportId,
					registryObjectId: effectiveRegistryId,
					suiClient,
					sealId,
					dataType,
				});

				// Decrypt metadata
				setProgress("decrypting");
				const sealClient = createSealClient(suiClient);
				const metadata = await decryptHealthData({
					encryptedData: encryptedMetadata,
					sealClient,
					sessionKey,
					txBytes,
					sealId,
				});

				console.log("[DecryptAndFetch] Metadata decryption complete");
				setProgress("completed");

				return metadata as unknown as BaseMetadata<TEntry>;
			} catch (err) {
				console.error("[DecryptAndFetch] Metadata decryption failed:", err);
				setProgress("error");

				const errorMessage =
					err instanceof Error ? err.message : "Failed to decrypt metadata";
				setError(errorMessage);

				throw new Error(errorMessage);
			}
		},
		[suiClient, currentAccount],
	);

	/**
	 * Fetch and decrypt data from Walrus (v3.0.0)
	 * Uses metadata blob architecture - first decrypts metadata, then data blob
	 */
	const decrypt = useCallback(
		async <T extends DataType>(
			params: DecryptionParams & { dataType: T },
		): Promise<DecryptedData<T>> => {
			const {
				dataType,
				sessionKey,
				passportId,
				registryId,
				partitionKeyValue,
			} = params;

			setProgress("fetching_entry");
			setError(null);

			try {
				// Wallet address check
				if (!currentAccount?.address) {
					throw new Error("Wallet not connected");
				}

				// Fetch EntryData from SBT Dynamic Field
				console.log(
					`[DecryptAndFetch] Fetching EntryData for ${dataType} from passport ${passportId}...`,
				);
				const entryData = await getDataEntry(passportId, dataType);

				if (!entryData) {
					throw new Error(`No data found for type: ${dataType}`);
				}

				const { sealId, metadataBlobId } = entryData;

				console.log(
					`[DecryptAndFetch] Retrieved seal_id from DF: ${sealId.substring(0, 16)}...`,
				);
				console.log(
					`[DecryptAndFetch] Metadata blob: ${metadataBlobId.substring(0, 16)}...`,
				);

				// Get registry ID
				const effectiveRegistryId = registryId || PASSPORT_REGISTRY_ID;
				if (!effectiveRegistryId) {
					throw new Error("PassportRegistry ID not configured");
				}

				// Fetch and decrypt metadata blob
				setProgress("fetching_metadata");
				console.log("[DecryptAndFetch] Fetching metadata blob...");

				const encryptedMetadata =
					await downloadFromWalrusByBlobId(metadataBlobId);

				// Build PTB
				setProgress("building_ptb");
				const txBytes = await buildPatientAccessPTB({
					passportObjectId: passportId,
					registryObjectId: effectiveRegistryId,
					suiClient,
					sealId,
					dataType,
				});

				// Decrypt metadata
				setProgress("decrypting");
				const sealClient = createSealClient(suiClient);
				const metadata = (await decryptHealthData({
					encryptedData: encryptedMetadata,
					sealClient,
					sessionKey,
					txBytes,
					sealId,
				})) as unknown as BaseMetadata<BaseMetadataEntry>;

				console.log(
					`[DecryptAndFetch] Metadata decrypted, ${metadata.entries?.length ?? 0} entries`,
				);

				// Select data blob based on partition key or use first entry
				let targetEntry: BaseMetadataEntry | undefined;

				if (
					partitionKeyValue &&
					metadata.entries &&
					metadata.entries.length > 0
				) {
					// Find entry by partition key value
					targetEntry = metadata.entries.find((entry) => {
						// Check common partition keys
						const e = entry as unknown as Record<string, unknown>;
						return (
							e.month_key === partitionKeyValue ||
							e.prescription_id === partitionKeyValue ||
							e.test_date === partitionKeyValue ||
							e.study_id === partitionKeyValue
						);
					});
				}

				if (!targetEntry && metadata.entries && metadata.entries.length > 0) {
					// Use first entry if no partition key match
					targetEntry = metadata.entries[0];
				}

				if (!targetEntry) {
					throw new Error(`No data blob found for type: ${dataType}`);
				}

				// Fetch and decrypt data blob
				console.log(
					`[DecryptAndFetch] Fetching data blob: ${targetEntry.blob_id.substring(0, 16)}...`,
				);

				return await decryptInternal({
					blobId: targetEntry.blob_id,
					sealId,
					dataType,
					sessionKey,
					passportId,
					registryId,
				});
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
		[suiClient, currentAccount, decryptInternal],
	);

	/**
	 * Decrypt with known seal_id and blob_id (for doctor/consent flows)
	 */
	const decryptWithSealId = useCallback(
		async <T extends DataType>(
			params: DirectDecryptionParams & { dataType: T },
		): Promise<DecryptedData<T>> => {
			const { blobId, sealId, dataType, sessionKey, passportId, registryId } =
				params;

			setProgress("fetching");
			setError(null);

			try {
				console.log(
					`[DecryptAndFetch] Direct decryption with provided seal_id: ${sealId.substring(0, 16)}...`,
				);

				return await decryptInternal({
					blobId,
					sealId,
					dataType,
					sessionKey,
					passportId,
					registryId,
				});
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
		[decryptInternal],
	);

	/**
	 * Decrypt multiple data types in parallel
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
		decryptWithSealId,
		decryptMetadata,
		decryptMultiple,
		isDecrypting:
			progress !== "idle" && progress !== "completed" && progress !== "error",
		progress,
		error,
		reset,
	};
}
