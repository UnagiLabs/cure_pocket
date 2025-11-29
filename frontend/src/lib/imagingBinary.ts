/**
 * Imaging Binary Encryption/Decryption Helpers
 *
 * Base64 ではなく生の Uint8Array を Seal で暗号化し、Walrus に保存する。
 * MIME type だけを先頭にバイト列で埋め込む独自エンベロープ形式:
 * [0-3]   uint32 big-endian = mime length (bytes)
 * [4-..]  mime utf8 bytes
 * [..]    raw image bytes
 */

import type { SessionKey } from "@mysten/seal";
import type { SuiClient } from "@mysten/sui/client";
import {
	buildPatientAccessPTB,
	calculateThreshold,
	createSealClient,
	SEAL_KEY_SERVERS,
} from "@/lib/seal";
import { generateSealId } from "@/lib/sealIdGenerator";
import { PASSPORT_REGISTRY_ID } from "@/lib/suiClient";
import {
	downloadFromWalrusByBlobId,
	type TransactionExecutor,
	uploadToWalrus,
} from "@/lib/walrus";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "";

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

async function fileToUint8(file: Blob): Promise<Uint8Array> {
	const buf = await file.arrayBuffer();
	return new Uint8Array(buf);
}

type EncryptBinaryParams = {
	file: File | Blob;
	address: string;
	suiClient: SuiClient;
	signAndExecuteTransaction: TransactionExecutor;
};

/**
 * Encrypt image binary and store in Walrus
 * seal_id is automatically generated from address with "imaging_binary" scope
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

	const bytes = await fileToUint8(file);
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

type DecryptBinaryParams = {
	blobId: string;
	sealId: string;
	sessionKey: SessionKey;
	passportId: string;
	suiClient: SuiClient;
	registryId?: string;
};

export async function decryptImagingBinary({
	blobId,
	sealId,
	sessionKey,
	passportId,
	suiClient,
	registryId,
}: DecryptBinaryParams): Promise<{
	contentType: string;
	data: ArrayBuffer;
	objectUrl: string;
}> {
	const effectiveRegistryId = registryId || PASSPORT_REGISTRY_ID;
	if (!effectiveRegistryId) {
		throw new Error("PassportRegistry ID not configured");
	}

	const encrypted = await downloadFromWalrusByBlobId(blobId);

	const txBytes = await buildPatientAccessPTB({
		passportObjectId: passportId,
		registryObjectId: effectiveRegistryId,
		suiClient,
		sealId,
		dataType: "imaging_binary",
	});

	const sealClient = createSealClient(suiClient);

	const decryptedBytes = await sealClient.decrypt({
		data: encrypted,
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
