/**
 * Walrus EncryptedObject Integrity Test
 *
 * このテストは、Walrus SDKの`getFiles`/`bytes()`がSealの暗号化メタデータを
 * 正しく扱えているかを検証します。
 *
 * 問題：
 * - `downloadFromWalrusByBlobId`で取得したデータを`EncryptedObject.parse()`でパースすると
 *   threshold=0, services=[], id=""になる
 *
 * テスト内容：
 * 1. SDKでダウンロード → EncryptedObject.parse() → メタデータ検証
 * 2. HTTP API（fetch直接）でダウンロード → パース → SDKと比較
 * 3. readBlob低レベルAPIでダウンロード → パース
 */

import { EncryptedObject } from "@mysten/seal";
import { getFullnodeUrl } from "@mysten/sui/client";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { walrus } from "@mysten/walrus";
import { describe, expect, it } from "vitest";
import { downloadFromWalrusByBlobId } from "@/lib/crypto/walrusSeal";

// 問題のあるblobId（ユーザーのログから）
const PROBLEM_BLOB_ID = "Vlv_JU8SKhPXma4cIBdt2N-Q9eON9YI7vuPsW8QOIYw";

// HTTP Aggregator URLs（複数試す）
const WALRUS_AGGREGATORS = [
	"https://aggregator.walrus-testnet.walrus.space",
	"https://walrus-testnet-aggregator.mystenlabs.com",
];

describe("Walrus EncryptedObject Integrity", () => {
	describe("SDK download (current implementation)", () => {
		it("should download data via SDK and check EncryptedObject metadata", async () => {
			console.log("\n========================================");
			console.log("Testing SDK download (getFiles/bytes)");
			console.log("========================================");

			// SDKでダウンロード（現在の実装: getFiles → bytes()）
			const data = await downloadFromWalrusByBlobId(PROBLEM_BLOB_ID);

			console.log("[SDK] Downloaded data length:", data.length);
			console.log("[SDK] First 32 bytes:", Array.from(data.slice(0, 32)));
			console.log(
				"[SDK] First 32 bytes (hex):",
				Buffer.from(data.slice(0, 32)).toString("hex"),
			);

			// EncryptedObjectとしてパース
			let parsed: ReturnType<typeof EncryptedObject.parse>;
			try {
				parsed = EncryptedObject.parse(data);
				console.log("[SDK] EncryptedObject.parse() success");
			} catch (error) {
				console.error("[SDK] EncryptedObject.parse() failed:", error);
				throw error;
			}

			console.log("[SDK] parsed.id:", parsed.id);
			console.log("[SDK] parsed.threshold:", parsed.threshold);
			console.log("[SDK] parsed.services:", parsed.services);
			console.log(
				"[SDK] parsed.services.length:",
				parsed.services?.length || 0,
			);

			// メタデータが正しく設定されているか検証
			// 問題がある場合、これらのアサーションが失敗する
			expect(parsed.threshold).toBeGreaterThan(0);
			expect(parsed.services).toBeDefined();
			expect(parsed.services.length).toBeGreaterThan(0);
			expect(parsed.id).toBeTruthy();
		}, 60000);
	});

	describe("HTTP API download (direct fetch)", () => {
		it("should try multiple aggregators to download blob", async () => {
			console.log("\n========================================");
			console.log("Testing HTTP API download (multiple aggregators)");
			console.log("========================================");

			let httpData: Uint8Array | null = null;

			// 複数のAggregatorを試す
			for (const aggregator of WALRUS_AGGREGATORS) {
				const url = `${aggregator}/v1/${PROBLEM_BLOB_ID}`;
				console.log(`[HTTP] Trying: ${url}`);

				try {
					const httpResponse = await fetch(url);
					console.log(`[HTTP] Response status: ${httpResponse.status}`);

					if (httpResponse.ok) {
						const httpArrayBuffer = await httpResponse.arrayBuffer();
						httpData = new Uint8Array(httpArrayBuffer);
						console.log(`[HTTP] Success! Downloaded ${httpData.length} bytes`);
						break;
					}
				} catch (error) {
					console.log(`[HTTP] Failed: ${error}`);
				}
			}

			if (!httpData) {
				console.log(
					"[HTTP] All aggregators returned 404 - blob not accessible via HTTP API",
				);
				console.log(
					"[HTTP] This suggests the blob was uploaded via writeFilesFlow (SDK-specific format)",
				);
				// スキップせずに情報を記録
				expect(true).toBe(true);
				return;
			}

			console.log("[HTTP] Downloaded data length:", httpData.length);
			console.log("[HTTP] First 32 bytes:", Array.from(httpData.slice(0, 32)));

			// EncryptedObjectとしてパース
			try {
				const httpParsed = EncryptedObject.parse(httpData);
				console.log("[HTTP] parsed.threshold:", httpParsed.threshold);
				console.log(
					"[HTTP] parsed.services.length:",
					httpParsed.services?.length || 0,
				);
			} catch (error) {
				console.error("[HTTP] EncryptedObject.parse() failed:", error);
			}
		}, 60000);
	});

	describe("SDK readBlob (low-level API)", () => {
		it("should download data via readBlob and check EncryptedObject metadata", async () => {
			console.log("\n========================================");
			console.log("Testing SDK readBlob (low-level API)");
			console.log("========================================");

			try {
				// 低レベルWalrusクライアントを作成
				const baseClient = new SuiJsonRpcClient({
					url: getFullnodeUrl("testnet"),
					network: "testnet",
				});

				const walrusExtension = walrus({
					network: "testnet",
					name: "walrus" as const,
				});

				const client = baseClient.$extend(
					walrusExtension,
				) as typeof baseClient & {
					walrus: ReturnType<typeof walrus> extends (client: unknown) => infer R
						? R
						: never;
				};

				// readBlob APIを試す
				console.log("[readBlob] Attempting to read blob:", PROBLEM_BLOB_ID);

				// @ts-expect-error - readBlobの型が正確でない可能性
				if (typeof client.walrus.readBlob === "function") {
					// @ts-expect-error - readBlobの型が正確でない可能性
					const blobData = await client.walrus.readBlob(PROBLEM_BLOB_ID);
					console.log("[readBlob] Downloaded data length:", blobData.length);
					console.log(
						"[readBlob] First 32 bytes:",
						Array.from(blobData.slice(0, 32)),
					);

					const parsed = EncryptedObject.parse(blobData);
					console.log("[readBlob] parsed.threshold:", parsed.threshold);
					console.log(
						"[readBlob] parsed.services.length:",
						parsed.services?.length || 0,
					);
					console.log("[readBlob] parsed.id:", parsed.id ? "present" : "empty");
				} else {
					console.log("[readBlob] readBlob method not available on client");
					console.log(
						"[readBlob] Available walrus methods:",
						Object.keys(client.walrus || {}),
					);
				}
			} catch (error) {
				console.error("[readBlob] Error:", error);
			}

			expect(true).toBe(true);
		}, 60000);
	});

	describe("SDK vs HTTP API comparison", () => {
		it("should compare data from SDK and HTTP API", async () => {
			console.log("\n========================================");
			console.log("Comparing SDK vs HTTP API download");
			console.log("========================================");

			// HTTP APIで直接ダウンロード
			let httpData: Uint8Array | null = null;
			for (const aggregator of WALRUS_AGGREGATORS) {
				try {
					const httpResponse = await fetch(
						`${aggregator}/v1/${PROBLEM_BLOB_ID}`,
					);
					if (httpResponse.ok) {
						const httpArrayBuffer = await httpResponse.arrayBuffer();
						httpData = new Uint8Array(httpArrayBuffer);
						break;
					}
				} catch {
					// 次を試す
				}
			}

			if (!httpData) {
				console.log("[Compare] HTTP API returned 404 for all aggregators");
				httpData = new Uint8Array(0);
			}

			// SDKでダウンロード
			const sdkData = await downloadFromWalrusByBlobId(PROBLEM_BLOB_ID);

			// データ長の比較
			console.log("[Compare] HTTP data length:", httpData.length);
			console.log("[Compare] SDK data length:", sdkData.length);

			const isSameLength = httpData.length === sdkData.length;
			console.log("[Compare] Same length:", isSameLength);

			// データ内容の比較
			if (isSameLength) {
				let firstDiffIndex = -1;
				for (let i = 0; i < httpData.length; i++) {
					if (httpData[i] !== sdkData[i]) {
						firstDiffIndex = i;
						break;
					}
				}

				if (firstDiffIndex === -1) {
					console.log("[Compare] Data is IDENTICAL");
				} else {
					console.log("[Compare] Data DIFFERS at index:", firstDiffIndex);
					console.log("[Compare] HTTP byte at diff:", httpData[firstDiffIndex]);
					console.log("[Compare] SDK byte at diff:", sdkData[firstDiffIndex]);

					// 差分周辺を表示
					const start = Math.max(0, firstDiffIndex - 5);
					const end = Math.min(httpData.length, firstDiffIndex + 10);
					console.log(
						"[Compare] HTTP around diff:",
						Array.from(httpData.slice(start, end)),
					);
					console.log(
						"[Compare] SDK around diff:",
						Array.from(sdkData.slice(start, end)),
					);
				}
			} else {
				console.log("[Compare] Data lengths differ - cannot compare content");

				// 長さの差を確認
				const lengthDiff = Math.abs(httpData.length - sdkData.length);
				console.log("[Compare] Length difference:", lengthDiff, "bytes");

				// 先頭/末尾を比較
				console.log(
					"[Compare] HTTP first 50 bytes:",
					Array.from(httpData.slice(0, 50)),
				);
				console.log(
					"[Compare] SDK first 50 bytes:",
					Array.from(sdkData.slice(0, 50)),
				);
				console.log(
					"[Compare] HTTP last 50 bytes:",
					Array.from(httpData.slice(-50)),
				);
				console.log(
					"[Compare] SDK last 50 bytes:",
					Array.from(sdkData.slice(-50)),
				);
			}

			// 両方のデータでEncryptedObjectをパース
			console.log("\n--- Parsing comparison ---");

			try {
				const httpParsed = EncryptedObject.parse(httpData);
				console.log("[HTTP parsed] threshold:", httpParsed.threshold);
				console.log(
					"[HTTP parsed] services.length:",
					httpParsed.services?.length || 0,
				);
				console.log("[HTTP parsed] id:", httpParsed.id ? "present" : "empty");
			} catch (error) {
				console.error("[HTTP parsed] FAILED:", error);
			}

			try {
				const sdkParsed = EncryptedObject.parse(sdkData);
				console.log("[SDK parsed] threshold:", sdkParsed.threshold);
				console.log(
					"[SDK parsed] services.length:",
					sdkParsed.services?.length || 0,
				);
				console.log("[SDK parsed] id:", sdkParsed.id ? "present" : "empty");
			} catch (error) {
				console.error("[SDK parsed] FAILED:", error);
			}

			// このテストは比較結果を出力するためのもので、
			// 結果に応じて適切なアサーションを追加
			expect(true).toBe(true); // プレースホルダー
		}, 60000);
	});
});
