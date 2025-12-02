/**
 * Walrus Blob Storage Integration
 *
 * This module provides utilities for storing and retrieving encrypted medical data
 * using Walrus decentralized blob storage.
 *
 * Walrus Architecture:
 * - Decentralized storage with erasure coding
 * - Content-addressed blobs with on-chain references
 * - SDK writeBlobFlow for uploads (raw Uint8Array support)
 * - SDK readBlob for downloads with HTTP API fallback
 *
 * Key API Choices:
 * - writeBlobFlow: For raw Uint8Array (Seal encrypted data) - NOT writeFilesFlow
 * - readBlob: For raw blob download - NOT getFiles
 */

import { getFullnodeUrl } from "@mysten/sui/client";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import type { Transaction } from "@mysten/sui/transactions";
import { type WalrusClient, walrus } from "@mysten/walrus";
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
 * Upload relay configuration (mandatory)
 * リレー未設定での直アクセスはサポートしない。
 */
const resolvedUploadRelay =
	process.env.NEXT_PUBLIC_WALRUS_UPLOAD_RELAY ||
	(SUI_NETWORK === "testnet"
		? process.env.NEXT_PUBLIC_WALRUS_UPLOAD_RELAY_TESTNET
		: process.env.NEXT_PUBLIC_WALRUS_UPLOAD_RELAY_MAINNET);

if (!resolvedUploadRelay) {
	throw new Error(
		"[Walrus] Upload relay host is required. Set NEXT_PUBLIC_WALRUS_UPLOAD_RELAY or network-specific relay env.",
	);
}

const UPLOAD_RELAY_HOST: string = resolvedUploadRelay;

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

	// Upload relay is required
	walrusOptions.uploadRelay = {
		host: UPLOAD_RELAY_HOST,
		sendTip: {
			max: 10_000, // Max tip in MIST
		},
	};

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
 * Options for upload operations using writeBlobFlow
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
 * Upload encrypted data to Walrus using SDK writeBlobFlow
 *
 * Uses the SDK's writeBlobFlow which handles raw Uint8Array directly.
 * This is the correct API for Seal encrypted data (NOT writeFilesFlow).
 *
 * Upload flow:
 * 1. Validate data size
 * 2. Create writeBlobFlow with raw Uint8Array
 * 3. Encode the blob
 * 4. Register on-chain (sign and execute transaction)
 * 5. Upload to relay
 * 6. Certify on-chain (sign and execute transaction)
 * 7. Get blob info and return reference
 *
 * @param data - Encrypted data to upload (Uint8Array)
 * @param options - Upload options including signAndExecuteTransaction
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
		console.log(
			`[Walrus] Uploading ${data.length} bytes via SDK writeBlobFlow for ${epochs} epochs...`,
		);

		const client = getWalrusClient();

		// Step 1: Create flow with raw Uint8Array (NOT WalrusFile)
		const flow = client.walrus.writeBlobFlow({ blob: data });

		// Step 2: Encode the blob
		console.log("[Walrus] Encoding blob...");
		await flow.encode();

		// Step 3: Register on-chain
		console.log("[Walrus] Registering blob on-chain...");
		const registerTx = flow.register({ epochs, owner, deletable });
		const { digest: registerDigest } = await signAndExecuteTransaction({
			transaction: registerTx,
		});
		console.log(`[Walrus] Register transaction: ${registerDigest}`);

		// Step 4: Upload to relay
		console.log("[Walrus] Uploading to relay...");
		await flow.upload({ digest: registerDigest });

		// Step 5: Certify on-chain
		console.log("[Walrus] Certifying blob on-chain...");
		const certifyTx = flow.certify();
		const { digest: certifyDigest } = await signAndExecuteTransaction({
			transaction: certifyTx,
		});
		console.log(`[Walrus] Certify transaction: ${certifyDigest}`);

		// Step 6: Get blob info
		const { blobId } = await flow.getBlob();
		console.log(`[Walrus] Upload complete, blobId: ${blobId}`);

		return {
			blobId,
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
 * HTTP Aggregator URLs for fallback download
 */
const WALRUS_AGGREGATORS = [
	"https://aggregator.walrus-testnet.walrus.space",
	"https://walrus-testnet-aggregator.mystenlabs.com",
];

/**
 * Download blob from Walrus using HTTP API (fallback method)
 *
 * This is the reliable method that works with raw blob data.
 * Used as fallback when SDK methods fail.
 *
 * @param blobId - Walrus blob ID
 * @returns Encrypted data as Uint8Array
 * @throws Error if all aggregators fail
 */
async function downloadViaHttpApi(blobId: string): Promise<Uint8Array> {
	for (const aggregator of WALRUS_AGGREGATORS) {
		const url = `${aggregator}/v1/${blobId}`;
		try {
			const response = await fetch(url);
			if (response.ok) {
				const arrayBuffer = await response.arrayBuffer();
				console.log(
					`[Walrus] HTTP API download success from ${aggregator}, size: ${arrayBuffer.byteLength}`,
				);
				return new Uint8Array(arrayBuffer);
			}
			console.log(
				`[Walrus] HTTP API ${aggregator} returned ${response.status}`,
			);
		} catch (error) {
			console.log(`[Walrus] HTTP API ${aggregator} failed:`, error);
		}
	}
	throw new Error(`Blob not found via HTTP API: ${blobId}`);
}

/**
 * Download blob from Walrus by blob ID using SDK readBlob
 *
 * Download flow (with fallback):
 * 1. Try SDK readBlob (raw blob access - matches writeBlobFlow upload)
 * 2. If readBlob fails, fallback to HTTP API
 *
 * Note: Using readBlob (not getFiles) because writeBlobFlow stores raw blobs.
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
	const client = getWalrusClient();

	// Strategy 1: SDK readBlob (matches writeBlobFlow upload)
	try {
		console.log("[Walrus] Downloading via SDK readBlob...");
		const data = await client.walrus.readBlob({ blobId });
		if (data && data.length > 0) {
			console.log(`[Walrus] SDK readBlob success, size: ${data.length}`);
			return data;
		}
	} catch (error) {
		console.log("[Walrus] SDK readBlob failed:", error);
	}

	// Strategy 2: HTTP API fallback
	try {
		console.log("[Walrus] Trying HTTP API fallback...");
		const data = await downloadViaHttpApi(blobId);
		return data;
	} catch (error) {
		console.log("[Walrus] HTTP API fallback failed:", error);
	}

	throw new Error(`Blob not found: ${blobId}. All download strategies failed.`);
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
		// Use readBlob to check existence (matches writeBlobFlow upload pattern)
		const data = await client.walrus.readBlob({ blobId });
		return data && data.length > 0;
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
 * Note: This downloads the full content to get accurate size.
 * For large blobs, consider using a lighter check.
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
		// Use readBlob to match writeBlobFlow upload pattern
		const data = await client.walrus.readBlob({ blobId });

		if (!data || data.length === 0) {
			throw new Error(`Blob not found: ${blobId}`);
		}

		return {
			size: data.length,
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
