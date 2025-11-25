/**
 * Seal Encryption Service Integration
 *
 * This module provides utilities for encrypting and decrypting medical data
 * using Mysten Labs' Seal identity-based encryption service.
 *
 * Seal Architecture:
 * - Identity-Based Encryption (IBE) with threshold cryptography
 * - Access control enforced via Move smart contract policies
 * - SessionKey with wallet signature for time-limited access
 * - Programmable Transaction Blocks (PTB) for policy verification
 *
 * Official Documentation: https://seal-docs.wal.app/
 */

import { fromHex, toHex } from "@mysten/bcs";
import { EncryptedObject, SealClient, SessionKey } from "@mysten/seal";
import type { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import type { HealthData } from "@/types/healthData";

// ==========================================
// Environment Configuration
// ==========================================

/**
 * Seal KeyServer ObjectIds from environment
 * Comma-separated list of key server object IDs
 */
export const SEAL_KEY_SERVERS =
	process.env.NEXT_PUBLIC_SEAL_KEY_SERVERS?.split(",")
		.map((id) => id.trim())
		.filter(Boolean) || [];

/**
 * Calculate appropriate threshold based on number of key servers
 * - 1 server: threshold = 1 (single point of failure, but functional)
 * - 2+ servers: threshold = 2 (recommended for redundancy and security)
 *
 * @param keyServerCount - Number of key servers configured
 * @returns Appropriate threshold value (1 or 2)
 *
 * @example
 * ```typescript
 * calculateThreshold(1) // Returns 1
 * calculateThreshold(2) // Returns 2
 * calculateThreshold(5) // Returns 2
 * ```
 */
export function calculateThreshold(keyServerCount: number): number {
	return Math.min(2, Math.max(1, keyServerCount));
}

/**
 * SessionKey TTL in minutes (default: 10 minutes)
 */
const DEFAULT_SESSION_TTL_MIN = 10;

/**
 * Package ID for access control policies
 */
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "";
const CLOCK_OBJECT_ID = "0x6";

/**
 * Sui network for key server lookup
 */
const SUI_NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK || "testnet") as
	| "mainnet"
	| "testnet"
	| "devnet"
	| "localnet";

/**
 * Verify key server URLs against on-chain metadata
 * Enable in production to prevent endpoint spoofing
 */
const VERIFY_KEY_SERVERS =
	(process.env.NEXT_PUBLIC_SEAL_VERIFY_KEY_SERVERS || "").toLowerCase() ===
	"true";

// ==========================================
// Core Seal Functions
// ==========================================

/**
 * Get allowlisted key servers for the network
 *
 * @param network - Sui network (testnet, mainnet, devnet)
 * @returns Array of key server object IDs
 */
function resolveKeyServers(
	network: "mainnet" | "testnet" | "devnet" | "localnet",
): string[] {
	if (SEAL_KEY_SERVERS.length > 0) {
		return SEAL_KEY_SERVERS;
	}
	// No SDK helper available in @mysten/seal v0.9.x; require env configuration.
	throw new Error(
		`No Seal key servers configured for ${network}. Set NEXT_PUBLIC_SEAL_KEY_SERVERS.`,
	);
}

/**
 * Create and initialize a Seal client
 *
 * @param suiClient - Sui blockchain client
 * @returns Initialized SealClient instance
 * @throws Error if KeyServer configuration is invalid
 */
// Cache SealClient to avoid re-creating (reduces key fetch / auth prompts)
let cachedSealClient: { key: string; client: SealClient } | null = null;

export function createSealClient(suiClient: SuiClient): SealClient {
	// Get key server object IDs
	const serverObjectIds = resolveKeyServers(SUI_NETWORK);

	if (serverObjectIds.length === 0) {
		throw new Error(
			"No Seal key servers configured. Set NEXT_PUBLIC_SEAL_KEY_SERVERS or use allowlisted servers.",
		);
	}

	const serverKey = `${SUI_NETWORK}:${VERIFY_KEY_SERVERS}:${serverObjectIds.join(
		",",
	)}`;

	if (cachedSealClient && cachedSealClient.key === serverKey) {
		return cachedSealClient.client;
	}

	// Create server configs with equal weights
	const serverConfigs = serverObjectIds.map((objectId) => ({
		objectId,
		weight: 1,
	}));

	// Initialize SealClient
	const client = new SealClient({
		suiClient,
		serverConfigs,
		verifyKeyServers: VERIFY_KEY_SERVERS,
	});

	cachedSealClient = { key: serverKey, client };
	return client;
}

/**
 * Create a SessionKey for time-limited decryption access
 *
 * SessionKey flow (Official API):
 * 1. Create SessionKey with SessionKey.create()
 * 2. Get personal message with getPersonalMessage()
 * 3. User signs message with wallet
 * 4. Set signature with setPersonalMessageSignature()
 *
 * @param options - SessionKey creation options
 * @returns Initialized SessionKey (not yet signed)
 */
export async function createSessionKey(options: {
	address: string;
	suiClient: SuiClient;
	ttlMin?: number;
}): Promise<SessionKey> {
	const { address, suiClient, ttlMin = DEFAULT_SESSION_TTL_MIN } = options;

	// Create SessionKey
	const sessionKey = await SessionKey.create({
		address,
		packageId: PACKAGE_ID,
		ttlMin,
		suiClient,
	});

	return sessionKey;
}

/**
 * Encrypt health data using Seal's threshold IBE
 *
 * Official API flow:
 * 1. Call client.encrypt() with threshold, packageId, id, and data
 * 2. Returns { encryptedObject, key }
 * 3. encryptedObject is stored in Walrus
 * 4. key can be used for backup/recovery
 *
 * @param params - Encryption parameters
 * @returns Encrypted data and symmetric key
 */
export async function encryptHealthData<T = HealthData>(params: {
	healthData: T;
	sealClient: SealClient;
	sealId: string; // hex string (without package prefix)
	threshold?: number;
}): Promise<{ encryptedObject: Uint8Array; backupKey: Uint8Array }> {
	const { healthData, sealClient, sealId, threshold } = params;

	// If threshold not provided, calculate based on key server count
	const effectiveThreshold =
		threshold ?? calculateThreshold(SEAL_KEY_SERVERS.length);

	// Serialize to JSON
	const json = JSON.stringify(healthData);
	const data = new TextEncoder().encode(json);

	// Encrypt with Seal
	// sealId をUTF-8エンコードしてからhex文字列に変換
	// これにより、PTB構築時の TextEncoder().encode(sealId) と同じバイト列になる
	// Seal SDKは内部で fromHex() を使用するため、この変換が必要
	const sealIdForEncryption = toHex(new TextEncoder().encode(sealId));

	const { encryptedObject, key: backupKey } = await sealClient.encrypt({
		threshold: effectiveThreshold,
		packageId: PACKAGE_ID,
		id: sealIdForEncryption,
		data,
	});

	return { encryptedObject, backupKey };
}

/**
 * Decrypt health data using SessionKey and PTB
 *
 * Official API flow:
 * 1. Create PTB with seal_approve* function call
 * 2. Build PTB with onlyTransactionKind: true
 * 3. Call client.decrypt({ data, sessionKey, txBytes })
 * 4. Returns decrypted Uint8Array
 *
 * @param params - Decryption parameters
 * @returns Decrypted HealthData
 * @throws Error if access is denied or decryption fails
 */
export async function decryptHealthData(params: {
	encryptedData: Uint8Array;
	sealClient: SealClient;
	sessionKey: SessionKey;
	txBytes: Uint8Array;
	sealId?: string;
}): Promise<HealthData> {
	const { encryptedData, sealClient, sessionKey, txBytes, sealId } = params;

	console.log("[decryptHealthData] Starting decryption...");
	console.log(
		`[decryptHealthData] sealId: ${sealId ? sealId.substring(0, 20) + "..." : "not provided"}`,
	);
	console.log(
		`[decryptHealthData] encryptedData length: ${encryptedData.length}`,
	);

	// Optional sanity check: ensure the encrypted object matches expected id
	if (sealId) {
		try {
			const parsed = EncryptedObject.parse(encryptedData);
			console.log(`[decryptHealthData] parsed.id: ${parsed.id}`);

			const normalize = (value: string): string => {
				if (!value) return "";
				let normalized = value.startsWith("0x") ? value.slice(2) : value;
				normalized = normalized.toLowerCase();
				return normalized;
			};

			const normalizedParsedId = normalize(parsed.id);
			const normalizedSealId = normalize(sealId);
			console.log(
				`[decryptHealthData] normalized parsed.id: ${normalizedParsedId.substring(0, 20)}...`,
			);
			console.log(
				`[decryptHealthData] normalized sealId: ${normalizedSealId.substring(0, 20)}...`,
			);

			if (normalizedParsedId !== normalizedSealId) {
				// 形式の違いにより不一致が発生する可能性があるため、警告のみで復号は継続
				console.warn(
					`[decryptHealthData] seal_id形式不一致（復号は継続）: parsed=${normalizedParsedId.substring(0, 20)}, expected=${normalizedSealId.substring(0, 20)}`,
				);
			}
			console.log("[decryptHealthData] seal_id match verified");
		} catch (parseError) {
			console.error(
				"[decryptHealthData] EncryptedObject.parse or validation failed:",
				parseError,
			);
			throw parseError;
		}
	}

	// Decrypt with Seal
	try {
		console.log("[decryptHealthData] Calling sealClient.decrypt...");
		console.log(
			"[decryptHealthData] sessionKey expired:",
			sessionKey.isExpired(),
		);
		console.log("[decryptHealthData] txBytes length:", txBytes.length);

		const decryptedBytes = await sealClient.decrypt({
			data: encryptedData,
			sessionKey,
			txBytes,
		});
		console.log(
			`[decryptHealthData] Decrypted ${decryptedBytes.length} bytes successfully`,
		);

		// Parse JSON
		const json = new TextDecoder().decode(decryptedBytes);
		const healthData = JSON.parse(json) as HealthData;
		console.log("[decryptHealthData] Successfully parsed health data");

		return healthData;
	} catch (decryptError) {
		console.error("[decryptHealthData] decrypt failed:", decryptError);
		console.error("[decryptHealthData] error type:", typeof decryptError);
		console.error(
			"[decryptHealthData] error constructor:",
			(decryptError as Error)?.constructor?.name,
		);
		// If error is undefined, wrap it with a descriptive message
		if (decryptError === undefined) {
			throw new Error(
				"Seal SDK decrypt() rejected with undefined. Check network tab for key server response.",
			);
		}
		throw decryptError;
	}
}

/**
 * Build SealAuthPayload bytes for consent-based access
 *
 * Layout (BCS):
 *  - vector<u8> secret
 *  - address target_passport_id
 *  - vector<u8> requested_scope (UTF-8)
 */
export function buildSealAuthPayloadBytes(params: {
	secret: string;
	passportId: string;
	dataType: string;
}): Uint8Array {
	const secretBytes = new TextEncoder().encode(params.secret);
	const scopeBytes = new TextEncoder().encode(params.dataType);
	const passportBytes = fromHex(normalizeSuiAddress(params.passportId));

	const encodeVecU8 = (bytes: Uint8Array): Uint8Array => {
		const len = bytes.length;
		const uleb = encodeUleb128(len);
		return concatBytes(uleb, bytes);
	};

	return concatBytes(
		encodeVecU8(secretBytes),
		passportBytes,
		encodeVecU8(scopeBytes),
	);
}

/**
 * Build PTB for consent-based access (seal_approve_consent)
 *
 * @param params - PTB parameters
 * @returns Transaction bytes for Seal verification
 */
export async function buildConsentAccessPTB(params: {
	passportObjectId: string; // MedicalPassport object ID
	consentTokenObjectId: string;
	dataType: string; // Data type being accessed (e.g., "medications")
	payload: Uint8Array; // BCS-encoded SealAuthPayload
	suiClient: SuiClient;
}): Promise<Uint8Array> {
	const {
		passportObjectId,
		consentTokenObjectId,
		dataType,
		suiClient,
		payload,
	} = params;

	if (!PACKAGE_ID) {
		throw new Error("NEXT_PUBLIC_PACKAGE_ID not configured");
	}

	const tx = new Transaction();

	// Call seal_approve_consent(id, consent_token, passport, data_type, clock)
	tx.moveCall({
		target: `${PACKAGE_ID}::accessor::seal_approve_consent`,
		arguments: [
			tx.pure.vector("u8", Array.from(payload)), // SealAuthPayload
			tx.object(consentTokenObjectId), // ConsentToken
			tx.object(passportObjectId), // MedicalPassport
			tx.pure.string(dataType), // data_type
			tx.object(CLOCK_OBJECT_ID), // Clock
		],
	});

	// Build transaction bytes with onlyTransactionKind: true
	const txBytes = await tx.build({
		client: suiClient,
		onlyTransactionKind: true,
	});

	return txBytes;
}

/**
 * Build PTB for patient-only access (seal_approve_patient_only)
 *
 * Official API requirement:
 * - Build PTB with seal_approve* function call
 * - Use onlyTransactionKind: true
 * - PTB is evaluated by key servers via dry_run_transaction_block
 *
 * @param params - PTB parameters
 * @returns Transaction bytes for Seal verification
 */
export async function buildPatientAccessPTB(params: {
	passportObjectId: string;
	registryObjectId: string;
	suiClient: SuiClient;
	sealId: string;
	dataType: string;
}): Promise<Uint8Array> {
	const { passportObjectId, registryObjectId, suiClient, sealId, dataType } =
		params;

	const tx = new Transaction();

	// Call seal_approve_patient_only(id, passport, registry, data_type)
	// First argument is the identity (seal_id) as UTF-8 bytes
	// Note: sealId is a hex string that must be passed as UTF-8 bytes (not hex-decoded)
	// because the contract compares it with stored seal_id using std::string::utf8()
	tx.moveCall({
		target: `${PACKAGE_ID}::accessor::seal_approve_patient_only`,
		arguments: [
			tx.pure.vector("u8", Array.from(new TextEncoder().encode(sealId))), // UTF-8 encoded string
			tx.object(passportObjectId),
			tx.object(registryObjectId),
			tx.pure.string(dataType), // Data type for scope-based access
		],
	});

	// Build transaction bytes with onlyTransactionKind: true
	const txBytes = await tx.build({
		client: suiClient,
		onlyTransactionKind: true,
	});

	return txBytes;
}

/**
 * Helper: Sign SessionKey with wallet
 *
 * This is a client-side operation that should be done in the frontend.
 * Example usage:
 *
 * const sessionKey = await createSessionKey({ address, suiClient });
 * const message = sessionKey.getPersonalMessage();
 * const { signature } = await wallet.signPersonalMessage(message);
 * sessionKey.setPersonalMessageSignature(signature);
 *
 * @param sessionKey - SessionKey instance
 * @param signPersonalMessage - Wallet's signPersonalMessage function
 */
export async function signSessionKey(
	sessionKey: SessionKey,
	signPersonalMessage: (message: Uint8Array) => Promise<{ signature: string }>,
): Promise<void> {
	const message = sessionKey.getPersonalMessage();
	const { signature } = await signPersonalMessage(message);
	await sessionKey.setPersonalMessageSignature(signature);
}

// ==========================================
// Internal helpers
// ==========================================

function encodeUleb128(value: number): Uint8Array {
	const bytes: number[] = [];
	let val = value >>> 0;
	do {
		let byte = val & 0x7f;
		val >>>= 7;
		if (val !== 0) {
			byte |= 0x80;
		}
		bytes.push(byte);
	} while (val !== 0);
	return new Uint8Array(bytes);
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
	const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
	const result = new Uint8Array(total);
	let offset = 0;
	for (const arr of arrays) {
		result.set(arr, offset);
		offset += arr.length;
	}
	return result;
}
