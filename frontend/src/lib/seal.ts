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

import { fromHex } from "@mysten/bcs";
import { EncryptedObject, SealClient, SessionKey } from "@mysten/seal";
import type { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
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
export function createSealClient(suiClient: SuiClient): SealClient {
	// Get key server object IDs
	const serverObjectIds = resolveKeyServers(SUI_NETWORK);

	if (serverObjectIds.length === 0) {
		throw new Error(
			"No Seal key servers configured. Set NEXT_PUBLIC_SEAL_KEY_SERVERS or use allowlisted servers.",
		);
	}

	// Create server configs with equal weights
	const serverConfigs = serverObjectIds.map((objectId) => ({
		objectId,
		weight: 1,
	}));

	// Initialize SealClient
	return new SealClient({
		suiClient,
		serverConfigs,
		verifyKeyServers: VERIFY_KEY_SERVERS,
	});
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
 * Generate seal_id from passport object ID
 *
 * seal_id is the identity suffix used in Seal's IBE model.
 * Format: [packageId][seal_id]
 *
 * @param passportObjectId - MedicalPassport Sui object ID
 * @returns seal_id as Uint8Array
 */
export async function generateSealId(
	passportObjectId: string,
): Promise<string> {
	// Use SHA-256 to generate deterministic seal_id
	const encoder = new TextEncoder();
	const data = encoder.encode(passportObjectId);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);

	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
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
export async function encryptHealthData(params: {
	healthData: HealthData;
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
	const { encryptedObject, key: backupKey } = await sealClient.encrypt({
		threshold: effectiveThreshold,
		packageId: PACKAGE_ID,
		id: sealId,
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

	// Optional sanity check: ensure the encrypted object matches expected id
	if (sealId) {
		const parsed = EncryptedObject.parse(encryptedData);
		const normalize = (value: string) =>
			value.startsWith("0x") ? value.slice(2) : value;
		if (normalize(parsed.id) !== normalize(sealId)) {
			throw new Error("Encrypted object seal_id mismatch");
		}
	}

	// Decrypt with Seal
	const decryptedBytes = await sealClient.decrypt({
		data: encryptedData,
		sessionKey,
		txBytes,
	});

	// Parse JSON
	const json = new TextDecoder().decode(decryptedBytes);
	const healthData = JSON.parse(json) as HealthData;

	return healthData;
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
}): Promise<Uint8Array> {
	const { passportObjectId, registryObjectId, suiClient, sealId } = params;

	const tx = new Transaction();

	// Call seal_approve_patient_only(id, passport, registry)
	// First argument is the identity (seal_id), excluding package ID prefix
	tx.moveCall({
		target: `${PACKAGE_ID}::accessor::seal_approve_patient_only`,
		arguments: [
			tx.pure.vector("u8", Array.from(fromHex(sealId))), // Identity as vector<u8>
			tx.object(passportObjectId),
			tx.object(registryObjectId),
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
 * Build PTB for consent-based access (seal_approve_consent)
 *
 * @param params - PTB parameters
 * @returns Transaction bytes for Seal verification
 */
export async function buildConsentAccessPTB(params: {
	passportObjectId: string;
	registryObjectId: string;
	consentTokenObjectId: string;
	suiClient: SuiClient;
	sealId: string;
}): Promise<Uint8Array> {
	const {
		passportObjectId,
		registryObjectId,
		consentTokenObjectId,
		suiClient,
		sealId,
	} = params;

	const tx = new Transaction();

	// Call seal_approve_consent(id, passport, registry, consent_token, clock)
	tx.moveCall({
		target: `${PACKAGE_ID}::accessor::seal_approve_consent`,
		arguments: [
			tx.pure.vector("u8", Array.from(fromHex(sealId))), // Identity as vector<u8>
			tx.object(passportObjectId),
			tx.object(registryObjectId),
			tx.object(consentTokenObjectId),
			tx.object("0x6"), // Clock object
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
