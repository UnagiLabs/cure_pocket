import type { SessionKey } from "@mysten/seal";
import type { SuiClient } from "@mysten/sui/client";
import {
	downloadAndDecrypt,
	type EncryptUploadOptions,
	encryptAndUpload,
} from "@/lib/crypto/walrusSeal";
import { csvToUint8Array } from "@/lib/prescriptionConverter";

export async function saveCsv(
	csv: string,
	opts: Omit<EncryptUploadOptions, "threshold"> & { threshold?: number },
) {
	const encoded = csvToUint8Array(csv);
	return encryptAndUpload(encoded, opts);
}

export async function loadCsv(params: {
	blobId: string;
	dataType: string;
	sealId?: string;
	passportObjectId: string;
	registryObjectId: string;
	suiClient: SuiClient;
	sessionKey: SessionKey;
}): Promise<string> {
	const { data } = await downloadAndDecrypt(params);
	return new TextDecoder().decode(data);
}
