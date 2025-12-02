/**
 * Binary Adapter for Walrus + Seal Integration
 *
 * Provides functions for encrypting/decrypting binary files (images, etc.)
 * with MIME type preservation using an envelope format:
 * [0-3]   uint32 big-endian = mime length (bytes)
 * [4-..]  mime utf8 bytes
 * [..]    raw binary bytes
 */

import type { SessionKey } from "@mysten/seal";
import type { SuiClient } from "@mysten/sui/client";
import {
	calculateThreshold,
	createSealClient,
	downloadAndDecrypt,
	type EncryptUploadOptions,
	encryptAndUpload,
	generateSealId,
	SEAL_KEY_SERVERS,
	type TransactionExecutor,
	uploadToWalrus,
} from "@/lib/crypto/walrusSeal";

// ==========================================
// Envelope Encoding/Decoding
// ==========================================

function encodeEnvelope(mime: string, payload: Uint8Array): Uint8Array {
	const mimeBytes = new TextEncoder().encode(
		mime || "application/octet-stream",
	);
	const header = new Uint8Array(4 + mimeBytes.length + payload.length);
	const view = new DataView(header.buffer);
	view.setUint32(0, mimeBytes.length, false); // big-endian
	header.set(mimeBytes, 4);
	header.set(payload, 4 + mimeBytes.length);
	return header;
}

function decodeEnvelope(bytes: Uint8Array): { mime: string; data: Uint8Array } {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const mimeLen = view.getUint32(0, false);
	const mimeStart = 4;
	const mimeEnd = mimeStart + mimeLen;
	const mime = new TextDecoder().decode(bytes.slice(mimeStart, mimeEnd));
	const data = bytes.slice(mimeEnd);
	return { mime, data };
}

// ==========================================
// High-Level API
// ==========================================

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "";

/**
 * Save binary file to Walrus with encryption
 *
 * @param file - File or Blob to save
 * @param opts - Encryption and upload options
 * @returns Upload result with blobId, sealId, size, dataType
 */
export async function saveBinary(
	file: File | Blob,
	opts: Omit<EncryptUploadOptions, "threshold"> & { threshold?: number },
) {
	const buf = new Uint8Array(await file.arrayBuffer());
	const envelope = encodeEnvelope(file.type || "application/octet-stream", buf);
	return encryptAndUpload(envelope, opts);
}

/**
 * Load binary file from Walrus with decryption
 *
 * @param params - Download and decryption parameters
 * @returns Decoded binary with MIME type
 */
export async function loadBinary(params: {
	blobId: string;
	dataType: string;
	sealId?: string;
	passportObjectId: string;
	registryObjectId: string;
	suiClient: SuiClient;
	sessionKey: SessionKey;
}): Promise<{ mime: string; data: Uint8Array }> {
	const { data } = await downloadAndDecrypt(params);
	return decodeEnvelope(data);
}

// ==========================================
// Imaging Binary Functions (legacy API compatibility)
// ==========================================

type EncryptBinaryParams = {
	file: File | Blob;
	address: string;
	suiClient: SuiClient;
	signAndExecuteTransaction: TransactionExecutor;
};

/**
 * Encrypt image binary and store in Walrus
 * seal_id is automatically generated from address with "imaging_binary" scope
 *
 * @deprecated Use saveBinary with dataType: "imaging_binary" instead
 */
export async function encryptAndStoreImagingBinary({
	file,
	address,
	suiClient,
	signAndExecuteTransaction,
}: EncryptBinaryParams): Promise<{
	blobId: string;
	contentType: string;
	size: number;
}> {
	// Generate scoped seal_id for imaging_binary
	const sealId = await generateSealId(address, "imaging_binary");

	const bytes = new Uint8Array(await file.arrayBuffer());
	const envelope = encodeEnvelope(
		file.type || "application/octet-stream",
		bytes,
	);

	const sealClient = createSealClient(suiClient);
	const threshold = calculateThreshold(SEAL_KEY_SERVERS.length);

	// sealId（hex文字列）をそのまま渡す
	// Seal SDKは内部でfromHex()を使用してバイナリに変換する
	const { encryptedObject } = await sealClient.encrypt({
		threshold,
		packageId: PACKAGE_ID,
		id: sealId,
		data: envelope,
	});

	const walrusRef = await uploadToWalrus(encryptedObject, {
		signAndExecuteTransaction,
		owner: address,
	});

	return {
		blobId: walrusRef.blobId,
		contentType: file.type || "application/octet-stream",
		size: bytes.length,
	};
}

/**
 * Internal helper for decrypting imaging binary
 * Called from useDecryptAndFetch hook - does NOT download from Walrus
 * (Walrus download is handled by the hook)
 *
 * @param params - Decryption parameters with already-downloaded encrypted data
 * @returns Decrypted image with content type and object URL
 */
type DecryptBinaryInternalParams = {
	encryptedData: Uint8Array;
	sealId: string;
	sessionKey: SessionKey;
	txBytes: Uint8Array;
	suiClient: SuiClient;
};

export async function decryptImagingBinaryInternal({
	encryptedData,
	sessionKey,
	txBytes,
	suiClient,
}: DecryptBinaryInternalParams): Promise<{
	contentType: string;
	data: ArrayBuffer;
	objectUrl: string;
}> {
	const sealClient = createSealClient(suiClient);

	const decryptedBytes = await sealClient.decrypt({
		data: encryptedData,
		sessionKey,
		txBytes,
	});

	const { mime, data } = decodeEnvelope(new Uint8Array(decryptedBytes));
	const cloned = data.slice();
	const arrayBuffer = cloned.buffer as ArrayBuffer;
	const objectUrl = URL.createObjectURL(
		new Blob([arrayBuffer], { type: mime }),
	);

	return { contentType: mime, data: arrayBuffer, objectUrl };
}

/**
 * Create object URL from decoded binary data
 *
 * @param mime - MIME type
 * @param data - Binary data
 * @returns Object URL for the blob
 */
export function createObjectUrl(mime: string, data: Uint8Array): string {
	const cloned = data.slice();
	const arrayBuffer = cloned.buffer as ArrayBuffer;
	return URL.createObjectURL(new Blob([arrayBuffer], { type: mime }));
}
