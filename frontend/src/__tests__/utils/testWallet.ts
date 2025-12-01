/**
 * Test Wallet Utilities
 *
 * Provides wallet setup for integration tests using Sui Testnet.
 * Uses Ed25519 keypair for deterministic test wallets.
 */

import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import type { Transaction } from "@mysten/sui/transactions";
import { fromHex } from "@mysten/bcs";

// ==========================================
// Configuration
// ==========================================

const SUI_NETWORK = "testnet" as const;

/**
 * Get test keypair from environment or generate new one
 *
 * For CI/CD: Set TEST_WALLET_PRIVATE_KEY environment variable
 * For local development: Will generate a new keypair (requires faucet funding)
 */
export function getTestKeypair(): Ed25519Keypair {
	const privateKey = process.env.TEST_WALLET_PRIVATE_KEY;

	if (privateKey) {
		// Use environment variable (32 bytes hex)
		const secretKey = fromHex(privateKey);
		return Ed25519Keypair.fromSecretKey(secretKey);
	}

	// Generate new keypair for local testing
	// Note: Will need to be funded via faucet
	console.warn(
		"[TestWallet] No TEST_WALLET_PRIVATE_KEY set, generating new keypair",
	);
	return Ed25519Keypair.generate();
}

/**
 * Get test wallet address
 */
export function getTestAddress(): string {
	const keypair = getTestKeypair();
	return keypair.getPublicKey().toSuiAddress();
}

/**
 * Create SuiClient for testnet
 */
export function createTestSuiClient(): SuiClient {
	return new SuiClient({
		url: getFullnodeUrl(SUI_NETWORK),
	});
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
