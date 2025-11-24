/**
 * Seal ID Generator
 *
 * Generates deterministic seal_id from wallet address
 * seal_id = SHA256(address + "medical_passport")
 *
 * This ensures that the seal_id is consistent and reproducible
 * for a given wallet address, enabling reliable encryption/decryption.
 */

/**
 * Generate seal_id from wallet address
 *
 * The seal_id is computed as SHA256(address + "medical_passport")
 * to create a deterministic identifier for the encryption policy.
 *
 * @param address - Sui wallet address (normalized 0x... format)
 * @returns Promise<seal_id as hex string>
 *
 * @example
 * ```typescript
 * const sealId = await generateSealId("0x1234...");
 * console.log(sealId); // "a1b2c3d4..."
 * ```
 */
export async function generateSealId(address: string): Promise<string> {
	const input = `${address}medical_passport`;

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
