/**
 * Test Wallet Utilities
 *
 * Provides wallet setup for integration tests using Sui Testnet.
 * Uses Ed25519 keypair for deterministic test wallets.
 */

import { fromHex } from "@mysten/bcs";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import type { Transaction } from "@mysten/sui/transactions";

// ==========================================
// Configuration
// ==========================================

const SUI_NETWORK = "testnet" as const;

// Cached instances to avoid re-creation
let cachedKeypair: Ed25519Keypair | null = null;
let cachedSuiClient: SuiClient | null = null;

/**
 * Get test keypair from environment or generate new one
 *
 * For CI/CD: Set TEST_WALLET_PRIVATE_KEY environment variable
 * For local development: Will generate a new keypair (requires faucet funding)
 *
 * Supports two formats:
 * - Bech32: suiprivkey1... (from `sui keytool export`)
 * - Hex: 64-character hex string (raw 32 bytes)
 */
export function getTestKeypair(): Ed25519Keypair {
	if (cachedKeypair) {
		return cachedKeypair;
	}

	const privateKey = process.env.TEST_WALLET_PRIVATE_KEY;

	if (privateKey) {
		// Bech32 format (suiprivkey1...)
		if (privateKey.startsWith("suiprivkey")) {
			cachedKeypair = Ed25519Keypair.fromSecretKey(privateKey);
			return cachedKeypair;
		}

		// Hex format (32 bytes = 64 characters)
		const secretKey = fromHex(privateKey);
		cachedKeypair = Ed25519Keypair.fromSecretKey(secretKey);
		return cachedKeypair;
	}

	// Generate new keypair for local testing
	// Note: Will need to be funded via faucet
	console.warn(
		"[TestWallet] No TEST_WALLET_PRIVATE_KEY set, generating new keypair",
	);
	cachedKeypair = Ed25519Keypair.generate();
	return cachedKeypair;
}

/**
 * Get test wallet address
 */
export function getTestAddress(): string {
	const keypair = getTestKeypair();
	return keypair.getPublicKey().toSuiAddress();
}

/**
 * Create SuiClient for testnet (cached)
 */
export function createTestSuiClient(): SuiClient {
	if (cachedSuiClient) {
		return cachedSuiClient;
	}
	cachedSuiClient = new SuiClient({
		url: getFullnodeUrl(SUI_NETWORK),
	});
	return cachedSuiClient;
}

/**
 * Transaction executor for tests
 * Signs and executes transactions using test keypair
 */
export async function signAndExecuteTransaction(params: {
	transaction: Transaction;
}): Promise<{ digest: string }> {
	const keypair = getTestKeypair();
	const client = createTestSuiClient();

	const result = await client.signAndExecuteTransaction({
		signer: keypair,
		transaction: params.transaction,
	});

	// Wait for transaction to be confirmed
	await client.waitForTransaction({ digest: result.digest });

	return { digest: result.digest };
}

/**
 * Check wallet balance
 */
export async function getTestWalletBalance(): Promise<bigint> {
	const client = createTestSuiClient();
	const address = getTestAddress();

	const balance = await client.getBalance({ owner: address });
	return BigInt(balance.totalBalance);
}

/**
 * Ensure wallet has sufficient balance for tests
 * Returns true if balance is sufficient, false otherwise
 */
export async function ensureSufficientBalance(
	minBalance = BigInt(100_000_000), // 0.1 SUI minimum
): Promise<boolean> {
	const balance = await getTestWalletBalance();
	if (balance < minBalance) {
		console.warn(
			`[TestWallet] Insufficient balance: ${balance} MIST (need ${minBalance} MIST)`,
		);
		console.warn(
			`[TestWallet] Fund wallet at: https://faucet.testnet.sui.io/?address=${getTestAddress()}`,
		);
		return false;
	}
	return true;
}

/**
 * Test context with all necessary clients and utilities
 */
export interface TestContext {
	keypair: Ed25519Keypair;
	address: string;
	suiClient: SuiClient;
	signAndExecuteTransaction: typeof signAndExecuteTransaction;
}

/**
 * Create test context with all necessary clients
 */
export function createTestContext(): TestContext {
	return {
		keypair: getTestKeypair(),
		address: getTestAddress(),
		suiClient: createTestSuiClient(),
		signAndExecuteTransaction,
	};
}
