/**
 * useWalrusUpload Hook
 *
 * Provides a convenient interface for uploading data to Walrus
 * using the SDK with dapp-kit wallet integration.
 *
 * ## Usage
 * ```typescript
 * const { upload, isReady, isUploading } = useWalrusUpload();
 *
 * const result = await upload(encryptedData);
 * console.log(result.blobId);
 * ```
 */
"use client";

import {
	useCurrentAccount,
	useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { useCallback, useMemo, useState } from "react";
import { type UploadOptions, uploadToWalrus } from "@/lib/walrus";
import type { WalrusBlobReference } from "@/types/healthData";

/**
 * Upload progress state
 */
export type UploadProgress =
	| "idle"
	| "encoding"
	| "registering"
	| "uploading"
	| "certifying"
	| "completed"
	| "error";

/**
 * Return type for the useWalrusUpload hook
 */
export interface UseWalrusUploadReturn {
	/** Upload data to Walrus */
	upload: (
		data: Uint8Array,
		options?: Partial<
			Omit<UploadOptions, "signAndExecuteTransaction" | "owner">
		>,
	) => Promise<WalrusBlobReference>;
	/** Whether the hook is ready to upload */
	isReady: boolean;
	/** Whether an upload is in progress */
	isUploading: boolean;
	/** Current upload progress */
	progress: UploadProgress;
	/** Error message if upload failed */
	error: string | null;
	/** Reset the upload state */
	reset: () => void;
}

/**
 * Hook for uploading data to Walrus with dapp-kit integration
 *
 * @returns Upload function and state
 */
export function useWalrusUpload(): UseWalrusUploadReturn {
	const currentAccount = useCurrentAccount();
	const { mutateAsync: signAndExecuteTransaction } =
		useSignAndExecuteTransaction();

	const [progress, setProgress] = useState<UploadProgress>("idle");
	const [error, setError] = useState<string | null>(null);

	const isReady = useMemo(() => {
		return !!currentAccount?.address;
	}, [currentAccount]);

	const upload = useCallback(
		async (
			data: Uint8Array,
			options?: Partial<
				Omit<UploadOptions, "signAndExecuteTransaction" | "owner">
			>,
		): Promise<WalrusBlobReference> => {
			if (!currentAccount?.address) {
				throw new Error("Wallet not connected");
			}

			setProgress("encoding");
			setError(null);

			try {
				const result = await uploadToWalrus(data, {
					signAndExecuteTransaction,
					owner: currentAccount.address,
					...options,
				});

				setProgress("completed");
				return result;
			} catch (err) {
				setProgress("error");
				const errorMessage =
					err instanceof Error ? err.message : "Upload failed";
				setError(errorMessage);
				throw err;
			}
		},
		[currentAccount, signAndExecuteTransaction],
	);

	const reset = useCallback(() => {
		setProgress("idle");
		setError(null);
	}, []);

	return {
		upload,
		isReady,
		isUploading:
			progress !== "idle" && progress !== "completed" && progress !== "error",
		progress,
		error,
		reset,
	};
}
