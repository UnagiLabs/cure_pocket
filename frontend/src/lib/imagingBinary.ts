/**
 * Imaging Binary Encryption/Decryption Helpers
 *
 * imaging_binary だけをバイナリ安全に暗号化/復号する専用ルート。
 * - 汎用の encryptHealthData(JSON) を通さず、バイナリを Base64 包装して暗号化
 * - 他の機能から再利用できるよう lib として切り出し
 */

import type { SessionKey } from "@mysten/seal";
import type { SuiClient } from "@mysten/sui/client";
import {
	buildPatientAccessPTB,
	calculateThreshold,
	createSealClient,
	SEAL_KEY_SERVERS,
} from "@/lib/seal";
import { PASSPORT_REGISTRY_ID } from "@/lib/suiClient";
import { downloadFromWalrusByBlobId, uploadToWalrus } from "@/lib/walrus";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "";

/**
 * File/Blob → Uint8Array
 */
async function fileToUint8(file: Blob): Promise<Uint8Array> {
	const buf = await file.arrayBuffer();
	return new Uint8Array(buf);
}

function uint8ToBase64(bytes: Uint8Array): string {
	if (typeof Buffer !== "undefined") {
		return Buffer.from(bytes).toString("base64");
	}
	let binary = "";
	for (const b of bytes) {
		binary += String.fromCharCode(b);
	}
	return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
	if (typeof Buffer !== "undefined") {
		return new Uint8Array(Buffer.from(base64, "base64"));
	}
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

type EncryptBinaryParams = {
	file: File | Blob;
	sealId: string;
	suiClient: SuiClient;
};

/**
 * imaging_binary を暗号化して Walrus へアップロード
 */
export async function encryptAndStoreImagingBinary({
	file,
	sealId,
	suiClient,
}: EncryptBinaryParams): Promise<{
	blobId: string;
	contentType: string;
	size: number;
}> {
	const bytes = await fileToUint8(file);
	const envelope = {
		content_type: file.type || "application/octet-stream",
		data_base64: uint8ToBase64(bytes),
	};

	const sealClient = createSealClient(suiClient);
	const threshold = calculateThreshold(SEAL_KEY_SERVERS.length);

	const { encryptedObject } = await sealClient.encrypt({
		threshold,
		packageId: PACKAGE_ID,
		id: sealId,
		data: new TextEncoder().encode(JSON.stringify(envelope)),
	});

	const walrusRef = await uploadToWalrus(encryptedObject);

	return {
		blobId: walrusRef.blobId,
		contentType: envelope.content_type,
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

/**
 * imaging_binary を復号して Uint8Array と ObjectURL を返す
 */
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
	});

	const sealClient = createSealClient(suiClient);

	const decryptedBytes = await sealClient.decrypt({
		data: encrypted,
		sessionKey,
		txBytes,
	});

	const envelope = JSON.parse(new TextDecoder().decode(decryptedBytes)) as {
		content_type: string;
		data_base64: string;
	};

	const data = base64ToUint8(envelope.data_base64);
	const arrayBuffer = new Uint8Array(data).buffer;
	const objectUrl = URL.createObjectURL(
		new Blob([arrayBuffer], { type: envelope.content_type }),
	);

	return { contentType: envelope.content_type, data: arrayBuffer, objectUrl };
}
