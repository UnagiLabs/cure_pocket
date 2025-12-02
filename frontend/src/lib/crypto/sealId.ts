/**
 * Seal ID Generator
 *
 * Generates deterministic seal_id from wallet address and data type
 * seal_id = SHA256(address + "::" + "cure_pocket" + "::" + dataType)
 *
 * This ensures that each data type has a unique seal_id per wallet,
 * enabling scope-based encryption and access control.
 */

/**
 * Generate seal_id from wallet address and data type
 *
 * The seal_id is computed as SHA256(address::cure_pocket::dataType)
 * to create a deterministic identifier unique to each data type.
 *
 * @param address - Sui wallet address (normalized 0x... format)
 * @param dataType - Data type identifier (e.g., "medications", "lab_results", "basic_profile")
 * @returns Promise<seal_id as hex string>
 *
 * @example
 * ```typescript
 * const sealId = await generateSealId("0x1234...", "medications");
 * console.log(sealId); // "a1b2c3d4..." (unique per address + dataType combination)
 * ```
 */
export async function generateSealId(
	address: string,
	dataType: string,
): Promise<string> {
	const input = `${address}::cure_pocket::${dataType}`;

	const cryptoObj = globalThis.crypto;
	if (!cryptoObj?.subtle) {
		throw new Error("Web Crypto API is unavailable in this environment");
	}

	const encoder = new TextEncoder();
	const data = encoder.encode(input);
	const hashBuffer = await cryptoObj.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
