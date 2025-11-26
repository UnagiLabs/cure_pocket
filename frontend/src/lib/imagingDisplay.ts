/**
 * Imaging Display Utilities
 *
 * Provides utility functions for displaying imaging data in the browser.
 *
 * ## Features
 * - Generate Object URLs for browser display
 * - Memory management for Object URLs
 * - Error handling for imaging operations
 *
 * ## Note
 * For decryption operations, use the `useDecryptAndFetch` hook with
 * `dataType: "imaging_binary"` instead of functions in this file.
 *
 * ## Usage
 * ```typescript
 * // Create an Object URL from ArrayBuffer
 * const url = createImageObjectUrl(arrayBuffer, "image/jpeg");
 * <img src={url} alt="X-ray" />
 *
 * // Clean up when done
 * revokeImageObjectUrl(url);
 * ```
 */

// ==========================================
// Type Definitions
// ==========================================

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
// Utility Functions
// ==========================================

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
