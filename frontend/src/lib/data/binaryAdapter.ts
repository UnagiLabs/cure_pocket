import type { SessionKey } from "@mysten/seal";
import type { SuiClient } from "@mysten/sui/client";
import {
	downloadAndDecrypt,
	type EncryptUploadOptions,
	encryptAndUpload,
} from "@/lib/crypto/walrusSeal";

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

export async function saveBinary(
	file: File | Blob,
	opts: Omit<EncryptUploadOptions, "threshold"> & { threshold?: number },
) {
	const buf = new Uint8Array(await file.arrayBuffer());
	const envelope = encodeEnvelope(file.type || "application/octet-stream", buf);
	return encryptAndUpload(envelope, opts);
}

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
