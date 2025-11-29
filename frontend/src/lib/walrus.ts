/**
 * Walrus Blob Storage Integration
 *
 * This module provides utilities for storing and retrieving encrypted medical data
 * using Walrus decentralized blob storage via @mysten/walrus SDK.
 *
 * Walrus Architecture:
 * - Decentralized storage with erasure coding
 * - Content-addressed blobs with on-chain references
 * - Direct storage node interaction via SDK
 * - Uses writeFilesFlow for browser-compatible uploads with dapp-kit
 */

import { getFullnodeUrl } from "@mysten/sui/client";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import type { Transaction } from "@mysten/sui/transactions";
import { type WalrusClient, WalrusFile, walrus } from "@mysten/walrus";
import type { WalrusBlobReference } from "@/types/healthData";

// ==========================================
// Environment Configuration
// ==========================================

/**
 * Sui network configuration
 */
const SUI_NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK || "testnet") as
	| "mainnet"
	| "testnet";

/**
 * Maximum blob size (1MB default)
 */
const MAX_BLOB_SIZE = 1 * 1024 * 1024;

/**
 * Default storage epochs (1 epoch ≈ 1 day on testnet)
 * Testnet has epoch limits, SDK examples use epochs: 3
 * Can be configured via environment variable for production
 */
const DEFAULT_EPOCHS = Number(process.env.NEXT_PUBLIC_WALRUS_EPOCHS) || 5;

/**
 * Upload relay configuration (optional, reduces request count)
 */
const UPLOAD_RELAY_HOST = process.env.NEXT_PUBLIC_WALRUS_UPLOAD_RELAY;

// ==========================================
// Walrus Client Setup
// ==========================================

// Type for the extended client with walrus methods
interface WalrusExtendedClient extends SuiJsonRpcClient {
	walrus: WalrusClient;
}

/**
 * Create Walrus-enabled Sui client
 * Uses $extend pattern to add walrus functionality
 */
function createWalrusClient(): WalrusExtendedClient {
	// Build walrus options
	const walrusOptions: Parameters<typeof walrus>[0] = {
		network: SUI_NETWORK,
	};

	// Add upload relay if configured
	if (UPLOAD_RELAY_HOST) {
		walrusOptions.uploadRelay = {
			host: UPLOAD_RELAY_HOST,
			sendTip: {
				max: 10_000, // Max tip in MIST
			},
		};
	}

	// Add WASM URL for browser environments
	if (typeof window !== "undefined") {
		walrusOptions.wasmUrl =
			process.env.NEXT_PUBLIC_WALRUS_WASM_URL ||
			"https://unpkg.com/@mysten/walrus-wasm@latest/web/walrus_wasm_bg.wasm";
	}

	const baseClient = new SuiJsonRpcClient({
		url: getFullnodeUrl(SUI_NETWORK),
		network: SUI_NETWORK,
	});

	// Extend with walrus functionality
	// Explicitly pass name to satisfy type requirements
	const walrusExtension = walrus({ ...walrusOptions, name: "walrus" as const });
	return baseClient.$extend(walrusExtension) as unknown as WalrusExtendedClient;
}

// Singleton client instance
let walrusClient: ReturnType<typeof createWalrusClient> | null = null;

/**
 * Get or create Walrus client instance
 */
function getWalrusClient() {
	if (!walrusClient) {
		walrusClient = createWalrusClient();
	}
	return walrusClient;
}

// ==========================================
// Type Definitions
// ==========================================

/**
 * Transaction executor function type
 * Compatible with dapp-kit's signAndExecuteTransaction
 */
export type TransactionExecutor = (params: {
	transaction: Transaction;
}) => Promise<{ digest: string }>;

/**
 * Options for upload operations using writeFilesFlow
 */
export interface UploadOptions {
	/** Function to sign and execute transactions (from dapp-kit) */
	signAndExecuteTransaction: TransactionExecutor;
	/** Owner address for the blob */
	owner: string;
	/** Number of epochs to store (default: DEFAULT_EPOCHS) */
	epochs?: number;
	/** Whether the blob can be deleted later (default: false for medical data) */
	deletable?: boolean;
}

/**
 * Options for download operations (no signer needed)
 */
export interface DownloadOptions {
	/** Optional timeout in milliseconds */
	timeout?: number;
}

// ==========================================
// Core Walrus Functions
// ==========================================

/**
 * Upload encrypted data to Walrus using SDK writeFilesFlow
 *
 * Upload flow (browser-compatible with dapp-kit):
 * 1. Validate data size
 * 2. Create WalrusFile and initialize writeFilesFlow
 * 3. Encode the blob data
 * 4. Register the blob (requires transaction signature)
 * 5. Upload data to storage nodes
 * 6. Certify the blob (requires transaction signature)
 * 7. Return blob reference for on-chain storage
 *
 * @param data - Encrypted data to upload (Uint8Array)
 * @param options - Upload options including transaction executor
 * @returns Walrus blob reference
 * @throws Error if upload fails or data exceeds size limit
 */
export async function uploadToWalrus(
	data: Uint8Array,
	options: UploadOptions,
): Promise<WalrusBlobReference> {
	const {
		signAndExecuteTransaction,
		owner,
		epochs = DEFAULT_EPOCHS,
		deletable = false,
	} = options;

	// Validate size
	if (data.length > MAX_BLOB_SIZE) {
		throw new Error(
			`Data size ${data.length} bytes exceeds maximum ${MAX_BLOB_SIZE} bytes`,
		);
	}

	try {
		const client = getWalrusClient();

		// Create WalrusFile from data
		const walrusFile = WalrusFile.from({
			contents: data,
			identifier: `medical-data-${Date.now()}`,
		});

		// Initialize writeFilesFlow for browser-compatible upload
		const flow = client.walrus.writeFilesFlow({
			files: [walrusFile],
		});

		// Step 1: Encode the blob
		console.log("[Walrus] Encoding blob...");
		await flow.encode();

		// Step 2: Register the blob (requires wallet signature)
		console.log("[Walrus] Registering blob...");
		const registerTx = flow.register({
			epochs,
			owner,
			deletable,
		});
		const { digest: registerDigest } = await signAndExecuteTransaction({
			transaction: registerTx,
		});
		console.log(`[Walrus] Register transaction: ${registerDigest}`);

		// Step 3: Upload data to storage nodes
		console.log("[Walrus] Uploading to storage nodes...");
		await flow.upload({ digest: registerDigest });

		// Step 4: Certify the blob (requires wallet signature)
		console.log("[Walrus] Certifying blob...");
		const certifyTx = flow.certify();
		const { digest: certifyDigest } = await signAndExecuteTransaction({
			transaction: certifyTx,
		});
		console.log(`[Walrus] Certify transaction: ${certifyDigest}`);

		// Step 5: Get the uploaded file info
		const files = await flow.listFiles();
		if (files.length === 0) {
			throw new Error("No files returned after upload");
		}

		const uploadedFile = files[0];
		console.log(`[Walrus] Upload complete, blobId: ${uploadedFile.blobId}`);

		return {
			blobId: uploadedFile.blobId,
			uploadedAt: Date.now(),
			size: data.length,
		};
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to upload to Walrus: ${error.message}`);
		}
		throw new Error("Failed to upload to Walrus: Unknown error");
	}
}

/**
 * Download blob from Walrus by blob ID using SDK
 *
 * Download flow:
 * 1. Use SDK readBlob to fetch from storage nodes
 * 2. SDK handles erasure decoding automatically
 * 3. Return decrypted data as Uint8Array
 *
 * @param blobId - Walrus blob ID (content-addressed)
 * @param _options - Optional download options
 * @returns Encrypted data as Uint8Array
 * @throws Error if download fails or blob not found
 */
export async function downloadFromWalrusByBlobId(
	blobId: string,
	_options?: DownloadOptions,
): Promise<Uint8Array> {
	try {
		const client = getWalrusClient();

		// Download using SDK readBlob
		const data = await client.walrus.readBlob({ blobId });

		return data;
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes("not found")) {
				throw new Error(`Blob not found: ${blobId}`);
			}
			throw new Error(`Failed to download from Walrus: ${error.message}`);
		}
		throw new Error("Failed to download from Walrus: Unknown error");
	}
}

/**
 * Download blob from Walrus by Sui object ID
 *
 * Note: SDK requires blobId for download. This function first
 * retrieves the blobId from the Sui object, then downloads.
 *
 * @param objectId - Sui blob object ID
 * @returns Encrypted data as Uint8Array
 * @throws Error if download fails or blob not found
 */
export async function downloadFromWalrusByObjectId(
	objectId: string,
): Promise<Uint8Array> {
	try {
		const client = getWalrusClient();

		// Get blob object to extract blobId
		const blobObject = await client.getObject({
			id: objectId,
			options: { showContent: true },
		});

		if (!blobObject.data?.content) {
			throw new Error(`Blob object not found: ${objectId}`);
		}

		// Extract blobId from object content
		const content = blobObject.data.content;
		if (content.dataType !== "moveObject") {
			throw new Error(`Invalid blob object type: ${objectId}`);
		}

		const fields = content.fields as Record<string, unknown>;
		const blobId = fields.blob_id as string;

		if (!blobId) {
			throw new Error(`No blobId found in object: ${objectId}`);
		}

		// Download using blobId
		return downloadFromWalrusByBlobId(blobId);
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to download from Walrus: ${error.message}`);
		}
		throw new Error("Failed to download from Walrus: Unknown error");
	}
}

/**
 * Check if a blob exists in Walrus
 *
 * @param blobId - Walrus blob ID to check
 * @returns True if blob exists, false otherwise
 */
export async function blobExists(blobId: string): Promise<boolean> {
	try {
		const client = getWalrusClient();
		const blob = await client.walrus.getBlob({ blobId });
		return blob !== null;
	} catch {
		return false;
	}
}

/**
 * Delete a blob from Walrus (if deletable)
 *
 * Note: Only blobs created with deletable=true can be deleted.
 * Medical data should typically be non-deletable.
 *
 * @param blobId - Walrus blob ID to delete
 * @param signAndExecuteTransaction - Transaction executor function
 * @returns True if deleted, false otherwise
 */
export async function deleteBlob(
	blobId: string,
	_signAndExecuteTransaction?: TransactionExecutor,
): Promise<boolean> {
	console.warn(
		`Walrus blob deletion attempted: ${blobId}. Medical data should typically be non-deletable.`,
	);

	// TODO: Implement deletion when SDK supports it
	// For now, log warning and return false
	return false;
}

/**
 * Get blob metadata without downloading content
 *
 * @param blobId - Walrus blob ID
 * @returns Blob metadata
 * @throws Error if blob not found
 */
export async function getBlobMetadata(blobId: string): Promise<{
	size: number;
	contentType: string;
	certified: boolean;
}> {
	try {
		const client = getWalrusClient();
		const blob = await client.walrus.getBlob({ blobId });

		if (!blob) {
			throw new Error(`Blob not found: ${blobId}`);
		}

		return {
			size: 0, // SDK doesn't expose size directly
			contentType: "application/octet-stream",
			certified: true,
		};
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to get blob metadata: ${error.message}`);
		}
		throw new Error("Failed to get blob metadata: Unknown error");
	}
}

/**
 * Estimate storage cost for a blob
 *
 * Cost depends on:
 * - Blob size (determines storage requirements)
 * - Number of epochs (storage duration)
 * - Current WAL/SUI prices
 *
 * @param sizeBytes - Size of blob in bytes
 * @param epochs - Number of epochs to store
 * @returns Estimated cost in MIST (1 SUI = 1,000,000,000 MIST)
 */
export function estimateStorageCost(
	sizeBytes: number,
	epochs: number = DEFAULT_EPOCHS,
): number {
	// Rough estimate: ~0.001 WAL per KB per epoch
	// This is approximate and actual cost depends on network conditions
	const sizeKB = Math.ceil(sizeBytes / 1024);
	return sizeKB * epochs * 1_000_000; // Cost in MIST (rough estimate)
}

/**
 * Reset the Walrus client
 *
 * Useful when encountering RetryableWalrusClientError during epoch changes.
 */
export function resetWalrusClient(): void {
	const client = getWalrusClient();
	client.walrus.reset();
}
