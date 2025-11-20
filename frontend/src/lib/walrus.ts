/**
 * Walrus Blob Storage Integration
 *
 * This module provides utilities for storing and retrieving encrypted medical data
 * using Walrus decentralized blob storage.
 *
 * Walrus Architecture:
 * - Decentralized storage with erasure coding
 * - Content-addressed blobs with on-chain references
 * - HTTP API for upload/download operations
 * - Integration with Sui blockchain for blob objects
 */

import type { WalrusBlobReference } from "@/types/healthData";

// ==========================================
// Environment Configuration
// ==========================================

/**
 * Walrus Publisher endpoint (for uploads)
 */
const WALRUS_PUBLISHER =
  process.env.NEXT_PUBLIC_WALRUS_RPC_URL ||
  "https://walrus-testnet-publisher.mystenlabs.com";

/**
 * Walrus Aggregator endpoint (for downloads)
 */
const WALRUS_AGGREGATOR =
  process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ||
  "https://walrus-testnet-aggregator.mystenlabs.com";

/**
 * Maximum blob size (1MB default)
 */
const MAX_BLOB_SIZE = 1 * 1024 * 1024;

// ==========================================
// Type Definitions
// ==========================================

/**
 * Walrus upload response for newly created blobs
 */
interface WalrusNewlyCreatedResponse {
  newlyCreated: {
    blobObject: {
      id: string; // Sui object ID
      storedEpoch: number;
      blobId: string; // Content-addressed blob ID
      size: number;
      erasureCodeType: string;
      certifiedEpoch: number;
      storage: {
        id: string;
        startEpoch: number;
        endEpoch: number;
        storageSize: number;
      };
    };
    encodedSize: number;
    cost: number;
  };
}

/**
 * Walrus upload response for already certified blobs
 */
interface WalrusAlreadyCertifiedResponse {
  alreadyCertified: {
    blobId: string;
    objectId: string;
    endEpoch: number;
  };
}

/**
 * Union type for Walrus upload responses
 */
type WalrusUploadResponse =
  | WalrusNewlyCreatedResponse
  | WalrusAlreadyCertifiedResponse;

/**
 * Walrus error response
 */
interface WalrusErrorResponse {
  error: string;
  message?: string;
}

// ==========================================
// Core Walrus Functions
// ==========================================

/**
 * Upload encrypted data to Walrus
 *
 * Upload flow:
 * 1. Validate data size
 * 2. Send PUT request to /v1/blobs
 * 3. Receive blob reference (blobId + objectId)
 * 4. Return reference for on-chain storage
 *
 * @param data - Encrypted data to upload (Uint8Array)
 * @param epochs - Number of epochs to store (default: 1)
 * @returns Walrus blob reference
 * @throws Error if upload fails or data exceeds size limit
 */
export async function uploadToWalrus(
  data: Uint8Array,
  _epochs: number = 1,
): Promise<WalrusBlobReference> {
  // Validate size
  if (data.length > MAX_BLOB_SIZE) {
    throw new Error(
      `Data size ${data.length} bytes exceeds maximum ${MAX_BLOB_SIZE} bytes`,
    );
  }

  try {
    // Upload to Walrus
    const response = await fetch(`${WALRUS_PUBLISHER}/v1/blobs`, {
      method: "PUT",
      body: data,
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });

    if (!response.ok) {
      const errorData = (await response.json()) as WalrusErrorResponse;
      throw new Error(
        `Walrus upload failed: ${errorData.error || response.statusText}`,
      );
    }

    const result = (await response.json()) as WalrusUploadResponse;

    // Handle both response types
    if ("newlyCreated" in result) {
      return {
        blobId: result.newlyCreated.blobObject.blobId,
        uploadedAt: Date.now(),
        size: result.newlyCreated.blobObject.size,
      };
    } else if ("alreadyCertified" in result) {
      // Blob already exists, return existing reference
      return {
        blobId: result.alreadyCertified.blobId,
        uploadedAt: Date.now(),
        size: data.length,
      };
    } else {
      throw new Error("Unexpected Walrus response format");
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to upload to Walrus: ${error.message}`);
    }
    throw new Error("Failed to upload to Walrus: Unknown error");
  }
}

/**
 * Download blob from Walrus by blob ID
 *
 * Download flow:
 * 1. Send GET request to /v1/blobs/by-blob-id/{blob_id}
 * 2. Receive encrypted data
 * 3. Return as Uint8Array for decryption
 *
 * @param blobId - Walrus blob ID (content-addressed)
 * @returns Encrypted data as Uint8Array
 * @throws Error if download fails or blob not found
 */
export async function downloadFromWalrusByBlobId(
  blobId: string,
): Promise<Uint8Array> {
  try {
    const response = await fetch(
      `${WALRUS_AGGREGATOR}/v1/blobs/by-blob-id/${blobId}`,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Blob not found: ${blobId}`);
      }
      throw new Error(`Walrus download failed: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to download from Walrus: ${error.message}`);
    }
    throw new Error("Failed to download from Walrus: Unknown error");
  }
}

/**
 * Download blob from Walrus by Sui object ID
 *
 * This is useful when you have the on-chain blob object reference.
 *
 * @param objectId - Sui blob object ID
 * @returns Encrypted data as Uint8Array
 * @throws Error if download fails or blob not found
 */
export async function downloadFromWalrusByObjectId(
  objectId: string,
): Promise<Uint8Array> {
  try {
    const response = await fetch(
      `${WALRUS_AGGREGATOR}/v1/blobs/by-object-id/${objectId}`,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Blob object not found: ${objectId}`);
      }
      throw new Error(`Walrus download failed: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
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
    const response = await fetch(
      `${WALRUS_AGGREGATOR}/v1/blobs/by-blob-id/${blobId}`,
      {
        method: "HEAD",
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Delete a blob from Walrus (if supported)
 *
 * Note: Walrus is immutable storage, so deletion may not be supported.
 * This function is a placeholder for future deletion mechanisms.
 *
 * @param blobId - Walrus blob ID to delete
 * @returns True if deleted, false otherwise
 */
export async function deleteBlob(blobId: string): Promise<boolean> {
  // Walrus is immutable storage
  // Deletion would require burning the on-chain blob object
  // This is typically handled through smart contract calls
  console.warn(
    `Walrus blob deletion not implemented: ${blobId}. Blobs are immutable.`,
  );
  return false;
}

/**
 * Get blob metadata without downloading content
 *
 * This is useful for checking blob size, epochs, etc. before downloading.
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
    const response = await fetch(
      `${WALRUS_AGGREGATOR}/v1/blobs/by-blob-id/${blobId}`,
      {
        method: "HEAD",
      },
    );

    if (!response.ok) {
      throw new Error(`Blob not found: ${blobId}`);
    }

    const size = Number.parseInt(
      response.headers.get("Content-Length") || "0",
      10,
    );
    const contentType =
      response.headers.get("Content-Type") || "application/octet-stream";

    return {
      size,
      contentType,
      certified: true, // Walrus blobs are always certified
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
 * This is a rough estimate based on blob size and epoch count.
 * Actual cost may vary based on Walrus pricing.
 *
 * @param sizeBytes - Size of blob in bytes
 * @param epochs - Number of epochs to store
 * @returns Estimated cost in MIST (1 SUI = 1,000,000,000 MIST)
 */
export function estimateStorageCost(
  sizeBytes: number,
  epochs: number = 1,
): number {
  // Placeholder formula: 1 MIST per KB per epoch
  // TODO: Update with actual Walrus pricing
  const sizeKB = Math.ceil(sizeBytes / 1024);
  return sizeKB * epochs * 1_000; // Cost in MIST
}
