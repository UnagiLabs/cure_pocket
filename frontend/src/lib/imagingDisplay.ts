/**
 * Imaging Display Utilities
 *
 * Provides functions for fetching, decrypting, and displaying imaging data
 * from Walrus with Seal encryption.
 *
 * ## Features
 * - Decrypt imaging binary data from Walrus
 * - Generate Object URLs for browser display
 * - Handle imaging meta + binary pairs
 * - Memory management for Object URLs
 *
 * ## Usage
 * ```typescript
 * const imageUrl = await decryptAndDisplayImage({
 *   blobId: "abc123...",
 *   sealId: "def456...",
 *   sessionKey,
 *   passportId: "0x789...",
 *   suiClient,
 * });
 *
 * // Display image
 * <img src={imageUrl} alt="Medical imaging" />
 *
 * // Clean up when done
 * URL.revokeObjectURL(imageUrl);
 * ```
 */

import type { SessionKey } from "@mysten/seal";
import type { SuiClient } from "@mysten/sui/client";
import {
	buildPatientAccessPTB,
	createSealClient,
	decryptHealthData,
} from "@/lib/seal";
import { downloadFromWalrusByBlobId } from "@/lib/walrus";
import type {
	ImagingBinaryData,
	ImagingMetaData,
	ImagingStudyV2,
} from "@/types/healthData";

// ==========================================
// Type Definitions
// ==========================================

/**
 * Parameters for decrypting and displaying an image
 */
export interface DecryptImageParams {
	/** Walrus blob ID for the imaging binary data */
	blobId: string;
	/** Seal ID for decryption policy */
	sealId: string;
	/** SessionKey with wallet signature */
	sessionKey: SessionKey;
	/** MedicalPassport object ID */
	passportId: string;
	/** Sui client for blockchain operations */
	suiClient: SuiClient;
	/** PassportRegistry object ID (optional, defaults to env) */
	registryId?: string;
}

/**
 * Imaging data pair (metadata + binary)
 */
export interface ImagingDataPair {
	meta: ImagingStudyV2;
	binary: {
		contentType: string;
		data: ArrayBuffer;
		objectUrl: string;
	};
}

/**
 * Error types for imaging operations
 */
export enum ImagingErrorType {
	BLOB_NOT_FOUND = "BLOB_NOT_FOUND",
	DECRYPTION_FAILED = "DECRYPTION_FAILED",
	SESSION_KEY_INVALID = "SESSION_KEY_INVALID",
	INVALID_DATA_FORMAT = "INVALID_DATA_FORMAT",
	UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Imaging operation error
 */
export class ImagingError extends Error {
	constructor(
		public type: ImagingErrorType,
		message: string,
		public originalError?: Error,
	) {
		super(message);
		this.name = "ImagingError";
	}
}

// ==========================================
// Core Functions
// ==========================================

/**
 * Decrypt and display imaging binary data as an Object URL
 *
 * This function:
 * 1. Downloads encrypted imaging binary from Walrus
 * 2. Builds PTB for access control verification
 * 3. Decrypts with Seal using SessionKey
 * 4. Generates Object URL for browser display
 *
 * @param params - Decryption parameters
 * @returns Object URL for the decrypted image
 * @throws {ImagingError} If decryption or URL generation fails
 *
 * @example
 * ```typescript
 * try {
 *   const imageUrl = await decryptAndDisplayImage({
 *     blobId: "abc123...",
 *     sealId: "def456...",
 *     sessionKey,
 *     passportId: "0x789...",
 *     suiClient,
 *   });
 *
 *   // Display the image
 *   setImageSrc(imageUrl);
 *
 *   // Clean up when component unmounts
 *   return () => URL.revokeObjectURL(imageUrl);
 * } catch (error) {
 *   if (error instanceof ImagingError) {
 *     if (error.type === ImagingErrorType.SESSION_KEY_INVALID) {
 *       // Regenerate session key and retry
 *     }
 *   }
 * }
 * ```
 */
export async function decryptAndDisplayImage(
	params: DecryptImageParams,
): Promise<string> {
	const { blobId, sealId, sessionKey, passportId, suiClient, registryId } =
		params;

	try {
		// Get registry ID from environment if not provided
		const effectiveRegistryId =
			registryId || process.env.NEXT_PUBLIC_PASSPORT_REGISTRY_ID;

		if (!effectiveRegistryId) {
			throw new ImagingError(
				ImagingErrorType.INVALID_DATA_FORMAT,
				"PassportRegistry ID not configured",
			);
		}

		// Step 1: Download encrypted binary from Walrus
		console.log(`[ImagingDisplay] Fetching binary blob: ${blobId}...`);

		const encryptedData = await downloadFromWalrusByBlobId(blobId);

		console.log(`[ImagingDisplay] Downloaded ${encryptedData.length} bytes`);

		// Step 2: Build PTB for access control
		console.log("[ImagingDisplay] Building PTB for access control...");

		const txBytes = await buildPatientAccessPTB({
			passportObjectId: passportId,
			registryObjectId: effectiveRegistryId,
			suiClient,
			sealId,
		});

		// Step 3: Decrypt with Seal
		console.log("[ImagingDisplay] Decrypting with Seal...");

		const sealClient = createSealClient(suiClient);

		const decryptedData = await decryptHealthData({
			encryptedData,
			sealClient,
			sessionKey,
			txBytes,
			sealId,
		});

		// Step 4: Extract imaging binary data
		const binaryData = decryptedData as unknown as ImagingBinaryData;

		if (!binaryData.imaging_binary) {
			throw new ImagingError(
				ImagingErrorType.INVALID_DATA_FORMAT,
				"Decrypted data is not imaging binary format",
			);
		}

		const { content_type, data } = binaryData.imaging_binary;

		// Step 5: Create Object URL from ArrayBuffer
		const objectUrl = createImageObjectUrl(data, content_type);

		console.log(`[ImagingDisplay] Image ready for display (${content_type})`);

		return objectUrl;
	} catch (error) {
		console.error("[ImagingDisplay] Failed to decrypt and display:", error);

		// Classify error type
		if (error instanceof ImagingError) {
			throw error;
		}

		if (error instanceof Error) {
			if (error.message.includes("Blob not found")) {
				throw new ImagingError(
					ImagingErrorType.BLOB_NOT_FOUND,
					"Image data not found in Walrus storage",
					error,
				);
			}

			if (
				error.message.includes("SessionKey") ||
				error.message.includes("session")
			) {
				throw new ImagingError(
					ImagingErrorType.SESSION_KEY_INVALID,
					"Session key is invalid or expired",
					error,
				);
			}

			if (
				error.message.includes("decrypt") ||
				error.message.includes("decryption")
			) {
				throw new ImagingError(
					ImagingErrorType.DECRYPTION_FAILED,
					"Failed to decrypt imaging data",
					error,
				);
			}
		}

		throw new ImagingError(
			ImagingErrorType.UNKNOWN_ERROR,
			"Failed to load imaging data",
			error instanceof Error ? error : undefined,
		);
	}
}

/**
 * Create Object URL from ArrayBuffer and content type
 *
 * @param data - Image data as ArrayBuffer
 * @param contentType - MIME type (e.g., "image/jpeg", "application/dicom")
 * @returns Object URL for browser display
 *
 * @example
 * ```typescript
 * const url = createImageObjectUrl(arrayBuffer, "image/jpeg");
 * <img src={url} alt="X-ray" />
 *
 * // Clean up when done
 * URL.revokeObjectURL(url);
 * ```
 */
export function createImageObjectUrl(
	data: ArrayBuffer,
	contentType: string,
): string {
	const blob = new Blob([data], { type: contentType });
	return URL.createObjectURL(blob);
}

/**
 * Load imaging metadata and binary data as a paired structure
 *
 * This is useful when you need both metadata (study information) and
 * the actual image data together.
 *
 * @param params - Parameters for loading imaging data pair
 * @returns Imaging metadata with binary data and Object URL
 * @throws {ImagingError} If loading fails
 *
 * @example
 * ```typescript
 * const imagingData = await loadImagingDataPair({
 *   metaBlobId: "meta_abc...",
 *   binaryBlobId: "binary_def...",
 *   sealId: "seal_ghi...",
 *   sessionKey,
 *   passportId: "0x789...",
 *   suiClient,
 * });
 *
 * console.log(imagingData.meta.modality); // "CT"
 * console.log(imagingData.binary.contentType); // "application/dicom"
 * <img src={imagingData.binary.objectUrl} />
 * ```
 */
export async function loadImagingDataPair(params: {
	metaBlobId: string;
	binaryBlobId: string;
	sealId: string;
	sessionKey: SessionKey;
	passportId: string;
	suiClient: SuiClient;
	registryId?: string;
}): Promise<ImagingDataPair> {
	const {
		metaBlobId,
		binaryBlobId,
		sealId,
		sessionKey,
		passportId,
		suiClient,
		registryId,
	} = params;

	try {
		const effectiveRegistryId =
			registryId || process.env.NEXT_PUBLIC_PASSPORT_REGISTRY_ID;

		if (!effectiveRegistryId) {
			throw new ImagingError(
				ImagingErrorType.INVALID_DATA_FORMAT,
				"PassportRegistry ID not configured",
			);
		}

		console.log("[ImagingDisplay] Loading imaging data pair...");

		// Load metadata and binary in parallel
		const [metaEncrypted, binaryEncrypted] = await Promise.all([
			downloadFromWalrusByBlobId(metaBlobId),
			downloadFromWalrusByBlobId(binaryBlobId),
		]);

		// Build PTB for access control
		const txBytes = await buildPatientAccessPTB({
			passportObjectId: passportId,
			registryObjectId: effectiveRegistryId,
			suiClient,
			sealId,
		});

		const sealClient = createSealClient(suiClient);

		// Decrypt both in parallel
		const [metaDecrypted, binaryDecrypted] = await Promise.all([
			decryptHealthData({
				encryptedData: metaEncrypted,
				sealClient,
				sessionKey,
				txBytes,
				sealId,
			}),
			decryptHealthData({
				encryptedData: binaryEncrypted,
				sealClient,
				sessionKey,
				txBytes,
				sealId,
			}),
		]);

		// Extract metadata
		const metaData = metaDecrypted as unknown as ImagingMetaData;

		if (!metaData.imaging_meta || metaData.imaging_meta.length === 0) {
			throw new ImagingError(
				ImagingErrorType.INVALID_DATA_FORMAT,
				"No imaging metadata found",
			);
		}

		// Extract binary data
		const binaryData = binaryDecrypted as unknown as ImagingBinaryData;

		if (!binaryData.imaging_binary) {
			throw new ImagingError(
				ImagingErrorType.INVALID_DATA_FORMAT,
				"No imaging binary data found",
			);
		}

		const { content_type, data } = binaryData.imaging_binary;

		// Create Object URL
		const objectUrl = createImageObjectUrl(data, content_type);

		console.log("[ImagingDisplay] Imaging data pair loaded successfully");

		return {
			meta: metaData.imaging_meta[0], // Return first study
			binary: {
				contentType: content_type,
				data: data,
				objectUrl: objectUrl,
			},
		};
	} catch (error) {
		console.error("[ImagingDisplay] Failed to load imaging data pair:", error);

		if (error instanceof ImagingError) {
			throw error;
		}

		throw new ImagingError(
			ImagingErrorType.UNKNOWN_ERROR,
			"Failed to load imaging data pair",
			error instanceof Error ? error : undefined,
		);
	}
}

/**
 * Batch load multiple imaging data pairs efficiently
 *
 * Uses parallel processing to load multiple imaging studies at once.
 *
 * @param params - Batch loading parameters
 * @returns Array of imaging data pairs
 *
 * @example
 * ```typescript
 * const pairs = await batchLoadImagingData({
 *   studies: [
 *     { metaBlobId: "meta1", binaryBlobId: "bin1" },
 *     { metaBlobId: "meta2", binaryBlobId: "bin2" },
 *   ],
 *   sealId,
 *   sessionKey,
 *   passportId,
 *   suiClient,
 * });
 * ```
 */
export async function batchLoadImagingData(params: {
	studies: Array<{ metaBlobId: string; binaryBlobId: string }>;
	sealId: string;
	sessionKey: SessionKey;
	passportId: string;
	suiClient: SuiClient;
	registryId?: string;
}): Promise<ImagingDataPair[]> {
	const { studies, sealId, sessionKey, passportId, suiClient, registryId } =
		params;

	console.log(`[ImagingDisplay] Batch loading ${studies.length} studies...`);

	// Load all studies in parallel
	const results = await Promise.allSettled(
		studies.map((study) =>
			loadImagingDataPair({
				metaBlobId: study.metaBlobId,
				binaryBlobId: study.binaryBlobId,
				sealId,
				sessionKey,
				passportId,
				suiClient,
				registryId,
			}),
		),
	);

	// Filter successful results
	const successfulPairs: ImagingDataPair[] = [];

	for (const result of results) {
		if (result.status === "fulfilled") {
			successfulPairs.push(result.value);
		} else {
			console.error("[ImagingDisplay] Failed to load study:", result.reason);
		}
	}

	console.log(
		`[ImagingDisplay] Batch load complete: ${successfulPairs.length}/${studies.length} successful`,
	);

	return successfulPairs;
}

/**
 * Revoke Object URL to free memory
 *
 * Call this when the image is no longer needed (e.g., component unmount)
 *
 * @param objectUrl - Object URL to revoke
 *
 * @example
 * ```typescript
 * useEffect(() => {
 *   return () => {
 *     if (imageUrl) {
 *       revokeImageObjectUrl(imageUrl);
 *     }
 *   };
 * }, [imageUrl]);
 * ```
 */
export function revokeImageObjectUrl(objectUrl: string): void {
	try {
		URL.revokeObjectURL(objectUrl);
		console.log("[ImagingDisplay] Object URL revoked");
	} catch (error) {
		console.error("[ImagingDisplay] Failed to revoke Object URL:", error);
	}
}

/**
 * Check if content type is a displayable image format
 *
 * @param contentType - MIME type to check
 * @returns True if format can be displayed in browser
 *
 * @example
 * ```typescript
 * isDisplayableImageFormat("image/jpeg") // true
 * isDisplayableImageFormat("image/png") // true
 * isDisplayableImageFormat("application/dicom") // false
 * ```
 */
export function isDisplayableImageFormat(contentType: string): boolean {
	const displayableFormats = [
		"image/jpeg",
		"image/jpg",
		"image/png",
		"image/gif",
		"image/webp",
		"image/bmp",
		"image/svg+xml",
	];

	return displayableFormats.includes(contentType.toLowerCase());
}

/**
 * Get user-friendly error message for imaging errors
 *
 * @param error - Imaging error
 * @returns Localized error message
 */
export function getImagingErrorMessage(error: ImagingError): string {
	switch (error.type) {
		case ImagingErrorType.BLOB_NOT_FOUND:
			return "画像データが見つかりません。削除された可能性があります。";
		case ImagingErrorType.DECRYPTION_FAILED:
			return "画像データの復号化に失敗しました。";
		case ImagingErrorType.SESSION_KEY_INVALID:
			return "セッションの有効期限が切れています。再度ログインしてください。";
		case ImagingErrorType.INVALID_DATA_FORMAT:
			return "画像データの形式が不正です。";
		default:
			return "画像データの読み込みに失敗しました。";
	}
}
