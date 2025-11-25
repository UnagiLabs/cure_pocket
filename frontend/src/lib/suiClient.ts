/**
 * Sui Client Utilities
 *
 * This module provides utilities for interacting with the Sui blockchain,
 * including SuiClient initialization and MedicalPassport data retrieval.
 *
 * Architecture:
 * - SuiClient for blockchain queries and transactions
 * - PassportRegistry uses Dynamic Fields for address -> passport mapping
 * - MedicalPassport stores references to encrypted medical data
 */

import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import type { MedicalPassport } from "@/types";

// ==========================================
// Environment Configuration
// ==========================================

/**
 * Sui network configuration
 */
const SUI_NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK || "testnet") as
	| "mainnet"
	| "testnet"
	| "devnet"
	| "localnet";

/**
 * Smart contract addresses
 */
export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "";
export const PASSPORT_REGISTRY_ID =
	process.env.NEXT_PUBLIC_PASSPORT_REGISTRY_ID || "";

// ==========================================
// Type Definitions
// ==========================================

/**
 * MedicalPassport object structure from Move contract
 * Note: seal_id exists in the contract but is no longer used by frontend
 * (seal_id is now dynamically generated per dataType using generateSealId)
 */
interface MedicalPassportObject {
	id: string; // Sui object ID
	seal_id: string; // Deprecated: kept for contract compatibility, not used
	country_code: string;
	analytics_opt_in: boolean;
}

// ==========================================
// SuiClient Singleton
// ==========================================

/**
 * Global SuiClient instance
 * Initialized lazily on first use
 */
let suiClientInstance: SuiClient | null = null;

/**
 * Get or create SuiClient instance
 *
 * @returns SuiClient configured for the current network
 */
export function getSuiClient(): SuiClient {
	if (!suiClientInstance) {
		const url = getFullnodeUrl(SUI_NETWORK);
		suiClientInstance = new SuiClient({ url });
	}
	return suiClientInstance;
}

/**
 * Reset SuiClient instance (useful for testing)
 */
export function resetSuiClient(): void {
	suiClientInstance = null;
}

// ==========================================
// MedicalPassport Retrieval
// ==========================================

/**
 * Get MedicalPassport object by object ID
 *
 * @param passportObjectId - MedicalPassport Sui object ID
 * @returns MedicalPassport data
 * @throws Error if passport not found or fetch fails
 */
export async function getMedicalPassport(
	passportObjectId: string,
): Promise<MedicalPassport> {
	const client = getSuiClient();

	try {
		const response = await client.getObject({
			id: passportObjectId,
			options: {
				showContent: true,
				showType: true,
			},
		});

		if (!response.data) {
			throw new Error(`MedicalPassport not found: ${passportObjectId}`);
		}

		const content = response.data.content;
		if (content?.dataType !== "moveObject") {
			throw new Error("Invalid passport object structure");
		}

		const fields = content.fields as unknown as MedicalPassportObject;

		// Note: fields.seal_id is intentionally ignored
		// seal_id is now dynamically generated per dataType using generateSealId(address, dataType)
		return {
			id: response.data.objectId,
			countryCode: fields.country_code,
			analyticsOptIn: fields.analytics_opt_in,
		};
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to fetch MedicalPassport: ${error.message}`);
		}
		throw new Error("Failed to fetch MedicalPassport: Unknown error");
	}
}

/**
 * Get MedicalPassport object ID by wallet address
 *
 * This queries the PassportRegistry's Dynamic Field to find the passport
 * associated with a specific wallet address.
 *
 * Flow:
 * 1. Query PassportRegistry for dynamic field with address as key
 * 2. Dynamic field value is the MedicalPassport object ID
 * 3. Return object ID for further queries
 *
 * @param walletAddress - Sui wallet address
 * @returns MedicalPassport object ID, or null if not found
 * @throws Error if registry query fails
 */
export async function getPassportIdByAddress(
	walletAddress: string,
): Promise<string | null> {
	const client = getSuiClient();

	if (!PASSPORT_REGISTRY_ID) {
		throw new Error("NEXT_PUBLIC_PASSPORT_REGISTRY_ID not configured");
	}

	try {
		// Query dynamic field with wallet address as key
		const dynamicFieldName = {
			type: "address",
			value: walletAddress,
		};

		const response = await client.getDynamicFieldObject({
			parentId: PASSPORT_REGISTRY_ID,
			name: dynamicFieldName,
		});

		if (!response.data) {
			// No passport found for this address
			return null;
		}

		// Dynamic Fieldのcontentからvalueフィールドを取得
		// PassportRegistryのDynamic Fieldは address -> object::ID のマッピング
		const content = response.data.content;
		if (!content || content.dataType !== "moveObject") {
			throw new Error("Invalid dynamic field structure");
		}

		// valueフィールドがパスポートのobject IDを格納している
		const fields = content.fields as { name: unknown; value: string };
		if (!fields.value) {
			throw new Error("Dynamic field value not found");
		}

		return fields.value;
	} catch (error) {
		// If error is "Dynamic field not found", return null
		if (
			error instanceof Error &&
			error.message.includes("Dynamic field not found")
		) {
			return null;
		}

		if (error instanceof Error) {
			throw new Error(`Failed to query PassportRegistry: ${error.message}`);
		}
		throw new Error("Failed to query PassportRegistry: Unknown error");
	}
}

/**
 * Get full MedicalPassport data by wallet address
 *
 * Convenience function that combines getPassportIdByAddress and getMedicalPassport.
 *
 * @param walletAddress - Sui wallet address
 * @returns MedicalPassport data, or null if not found
 * @throws Error if fetch fails
 */
export async function getPassportByAddress(
	walletAddress: string,
): Promise<MedicalPassport | null> {
	const passportId = await getPassportIdByAddress(walletAddress);

	if (!passportId) {
		return null;
	}

	return await getMedicalPassport(passportId);
}

/**
 * Check if a wallet has a MedicalPassport
 *
 * @param walletAddress - Sui wallet address
 * @returns True if passport exists, false otherwise
 */
export async function hasPassport(walletAddress: string): Promise<boolean> {
	try {
		const passportId = await getPassportIdByAddress(walletAddress);
		return passportId !== null;
	} catch {
		return false;
	}
}

/**
 * Get all MedicalPassports from the registry (admin function)
 *
 * This queries all dynamic fields in the PassportRegistry.
 * Use with caution - this can be expensive for large registries.
 *
 * @param limit - Maximum number of passports to fetch (default: 100)
 * @returns Array of [walletAddress, passportId] tuples
 * @throws Error if registry query fails
 */
export async function getAllPassports(
	limit: number = 100,
): Promise<Array<[string, string]>> {
	const client = getSuiClient();

	if (!PASSPORT_REGISTRY_ID) {
		throw new Error("NEXT_PUBLIC_PASSPORT_REGISTRY_ID not configured");
	}

	try {
		const dynamicFields = await client.getDynamicFields({
			parentId: PASSPORT_REGISTRY_ID,
			limit,
		});

		return dynamicFields.data.map((field) => [
			// Dynamic field name value is the wallet address
			(field.name as { value: string }).value,
			field.objectId,
		]);
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to fetch all passports: ${error.message}`);
		}
		throw new Error("Failed to fetch all passports: Unknown error");
	}
}

/**
 * Build transaction for updating data entry in Dynamic Fields
 *
 * This creates a transaction that calls add_data_entry or replace_data_entry on the contract.
 * The transaction must be signed and executed by the passport owner.
 *
 * @param params - Update parameters
 * @returns Transaction block ready for signing
 */
/**
 * Get blob IDs for a specific data type from MedicalPassport Dynamic Fields
 *
 * This queries the Dynamic Field associated with a specific data type
 * (e.g., "medications", "basic_profile") and returns the array of blob IDs.
 *
 * Flow:
 * 1. Query Dynamic Field with data type as key (String type)
 * 2. Extract blob_ids array from field value (vector<String>)
 * 3. Return blob IDs for Walrus download
 *
 * @param passportObjectId - MedicalPassport Sui object ID
 * @param dataType - Data type key (e.g., "medications", "basic_profile")
 * @returns Array of blob IDs, or empty array if data type not found
 * @throws Error if query fails (except for "not found" which returns empty array)
 *
 * @example
 * ```typescript
 * const blobIds = await getDataEntryBlobIds(passportId, "medications");
 * for (const blobId of blobIds) {
 *   const encryptedData = await downloadFromWalrusByBlobId(blobId);
 *   // ... decrypt and process
 * }
 * ```
 */
export async function getDataEntryBlobIds(
	passportObjectId: string,
	dataType: string,
): Promise<string[]> {
	const client = getSuiClient();

	try {
		// Query dynamic field with data type as key
		// Dynamic Field key type is String
		const dynamicFieldName = {
			type: "0x1::string::String",
			value: dataType,
		};

		const response = await client.getDynamicFieldObject({
			parentId: passportObjectId,
			name: dynamicFieldName,
		});

		if (!response.data) {
			// Data type not found - this is normal for uninitialized fields
			return [];
		}

		// Extract blob_ids from Dynamic Field value
		const content = response.data.content;
		if (!content || content.dataType !== "moveObject") {
			throw new Error("Invalid dynamic field structure");
		}

		// Dynamic Field value is vector<String> (blob_ids array)
		const fields = content.fields as { name: unknown; value: string[] };
		if (!fields.value || !Array.isArray(fields.value)) {
			throw new Error("Dynamic field value is not an array");
		}

		return fields.value;
	} catch (error) {
		// If error is "Dynamic field not found", return empty array
		if (
			error instanceof Error &&
			error.message.includes("Dynamic field not found")
		) {
			return [];
		}

		if (error instanceof Error) {
			throw new Error(`Failed to get data entry blob IDs: ${error.message}`);
		}
		throw new Error("Failed to get data entry blob IDs: Unknown error");
	}
}

export function buildUpdateDataEntryTransaction(params: {
	passportObjectId: string;
	dataType: string; // データ種別 (e.g., "basic_profile", "medications")
	sealId: string; // Seal ID for encryption
	blobIds: string[]; // Blob IDの配列
	replace?: boolean; // true: replace_data_entry, false: add_data_entry
}): {
	packageId: string;
	module: string;
	function: string;
	arguments: (string | string[])[];
} {
	if (!PACKAGE_ID) {
		throw new Error("NEXT_PUBLIC_PACKAGE_ID not configured");
	}

	return {
		packageId: PACKAGE_ID,
		module: "accessor",
		function: params.replace ? "replace_data_entry" : "add_data_entry",
		arguments: [
			params.passportObjectId,
			params.dataType,
			params.sealId,
			params.blobIds,
		],
	};
}

/**
 * Verify package ID matches environment configuration
 *
 * @param packageId - Package ID to verify
 * @returns True if matches, false otherwise
 */
export function verifyPackageId(packageId: string): boolean {
	return packageId === PACKAGE_ID;
}

/**
 * Get current network configuration
 *
 * @returns Network name and package details
 */
export function getNetworkConfig(): {
	network: string;
	packageId: string;
	registryId: string;
} {
	return {
		network: SUI_NETWORK,
		packageId: PACKAGE_ID,
		registryId: PASSPORT_REGISTRY_ID,
	};
}
