/**
 * Seal ID Generator
 *
 * ウォレットアドレスとデータ型から決定論的なseal_idを生成
 * seal_id = SHA256(address + "::" + "cure_pocket" + "::" + dataType)
 *
 * これにより、各データ型がウォレットごとに一意のseal_idを持ち、
 * スコープベースの暗号化とアクセス制御が可能になります。
 */

/**
 * ウォレットアドレスとデータ型からseal_idを生成
 *
 * seal_idはSHA256(address::cure_pocket::dataType)として計算され、
 * 各データ型に対して一意の決定論的識別子を作成します。
 *
 * @param address - Suiウォレットアドレス（正規化された0x...形式）
 * @param dataType - データ型識別子（例: "medications", "lab_results", "basic_profile"）
 * @returns seal_idを16進数文字列として返すPromise
 *
 * @example
 * ```typescript
 * const sealId = await generateSealId("0x1234...", "medications");
 * console.log(sealId); // "a1b2c3d4..." (アドレス + dataTypeの組み合わせごとに一意)
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
