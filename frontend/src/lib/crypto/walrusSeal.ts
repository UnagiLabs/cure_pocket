import type { SessionKey } from "@mysten/seal";
import { SealClient } from "@mysten/seal";
import type { SuiClient } from "@mysten/sui/client";
import {
	buildPatientAccessPTB,
	calculateThreshold,
	resolveKeyServers,
	SUI_NETWORK,
} from "@/lib/seal";
import { generateSealId } from "@/lib/sealIdGenerator";
import {
	downloadFromWalrusByBlobId,
	type TransactionExecutor,
	uploadToWalrus,
} from "@/lib/walrus";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "";
const DEFAULT_TESTNET_KEY_SERVER =
	"0x164ac3d2b3b8694b8181c13f671950004765c23f270321a45fdd04d40cccf0f2";

export interface EncryptUploadOptions {
	address: string;
	suiClient: SuiClient;
	signAndExecuteTransaction: TransactionExecutor;
	dataType: string;
	sealId?: string;
	threshold?: number;
}

export interface DecryptDownloadOptions {
	blobId: string;
	dataType: string;
	sealId?: string;
	passportObjectId: string;
	registryObjectId: string;
	suiClient: SuiClient;
	sessionKey: SessionKey;
}

export async function encryptAndUpload(
	payload: Uint8Array,
	{
		address,
		suiClient,
		signAndExecuteTransaction,
		dataType,
		sealId,
		threshold,
	}: EncryptUploadOptions,
): Promise<{ blobId: string; sealId: string; size: number; dataType: string }> {
	const effectiveSealId = sealId ?? (await generateSealId(address, dataType));

	const serverObjectIds = resolveKeyServers(SUI_NETWORK);
	const sealClient = new SealClient({
		suiClient,
		serverConfigs: serverObjectIds.map((id) => ({ objectId: id, weight: 1 })),
		verifyKeyServers:
			(process.env.NEXT_PUBLIC_SEAL_VERIFY_KEY_SERVERS || "").toLowerCase() ===
			"true",
	});

	const effectiveThreshold =
		threshold ?? calculateThreshold(serverObjectIds.length || 1);

	const { encryptedObject } = await sealClient.encrypt({
		threshold: effectiveThreshold,
		packageId: PACKAGE_ID,
		id: effectiveSealId,
		data: payload,
	});

	const walrusRef = await uploadToWalrus(encryptedObject, {
		signAndExecuteTransaction,
		owner: address,
	});

	return {
		blobId: walrusRef.blobId,
		sealId: effectiveSealId,
		size: payload.length,
		dataType,
	};
}

export async function downloadAndDecrypt({
	blobId,
	dataType,
	sealId,
	passportObjectId,
	registryObjectId,
	suiClient,
	sessionKey,
}: DecryptDownloadOptions): Promise<{
	data: Uint8Array;
	sealId: string;
	dataType: string;
}> {
	const encrypted = await downloadFromWalrusByBlobId(blobId);
	const effectiveSealId =
		sealId ??
		(() => {
			throw new Error("sealId is required for decrypt");
		})();

	const txBytes = await buildPatientAccessPTB({
		passportObjectId,
		registryObjectId,
		suiClient,
		sealId: effectiveSealId,
		dataType,
	});

	let serverObjectIds: string[] = [];
	try {
		serverObjectIds = resolveKeyServers(SUI_NETWORK);
	} catch {
		serverObjectIds = [];
	}
	if (!serverObjectIds.length) {
		serverObjectIds = [DEFAULT_TESTNET_KEY_SERVER];
	}
	const sealClient = new SealClient({
		suiClient,
		serverConfigs: serverObjectIds.map((id) => ({ objectId: id, weight: 1 })),
		verifyKeyServers:
			(process.env.NEXT_PUBLIC_SEAL_VERIFY_KEY_SERVERS || "").toLowerCase() ===
			"true",
	});
	const decrypted = await sealClient.decrypt({
		data: encrypted,
		sessionKey,
		txBytes,
	});

	return { data: decrypted, sealId: effectiveSealId, dataType };
}
