import type { SessionKey } from "@mysten/seal";
import type { SuiClient } from "@mysten/sui/client";
import {
	downloadAndDecrypt,
	type EncryptUploadOptions,
	encryptAndUpload,
} from "@/lib/crypto/walrusSeal";

export async function saveJson(
	data: unknown,
	opts: Omit<EncryptUploadOptions, "threshold"> & { threshold?: number },
) {
	const encoded = new TextEncoder().encode(JSON.stringify(data));
	return encryptAndUpload(encoded, opts);
}

export async function loadJson<T>(params: {
	blobId: string;
	dataType: string;
	sealId?: string;
	passportObjectId: string;
	registryObjectId: string;
	suiClient: SuiClient;
	sessionKey: SessionKey;
}): Promise<T> {
	const { data } = await downloadAndDecrypt(params);
	return JSON.parse(new TextDecoder().decode(data)) as T;
}
