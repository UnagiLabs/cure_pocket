/**
 * Walrus Integration Tests
 *
 * Tests actual Walrus SDK operations against Testnet.
 * These tests verify:
 * - Upload → Download roundtrip data integrity
 * - Large data handling
 * - Error cases
 *
 * Prerequisites:
 * - Test wallet with sufficient SUI balance
 * - Network connectivity to Sui Testnet and Walrus storage nodes
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
	uploadToWalrus,
	downloadFromWalrusByBlobId,
	blobExists,
	getBlobMetadata,
} from "@/lib/walrus";
import {
	createTestContext,
	ensureSufficientBalance,
	type TestContext,
} from "../utils/testWallet";

describe("Walrus Integration Tests", () => {
	let ctx: TestContext;

	beforeAll(async () => {
		ctx = createTestContext();

		// Verify wallet has sufficient balance
		const hasSufficientBalance = await ensureSufficientBalance();
		if (!hasSufficientBalance) {
			console.warn(
				"[Walrus Test] Skipping tests due to insufficient balance",
			);
		}
	});

	describe("Upload and Download", () => {
		it("should upload and download small data with matching content", async () => {
			// 1. Prepare test data
			const testPayload = {
				test: "walrus-integration",
				timestamp: Date.now(),
				data: "Hello, Walrus!",
			};
			const testData = new TextEncoder().encode(JSON.stringify(testPayload));

			// 2. Upload to Walrus
			const uploadResult = await uploadToWalrus(testData, {
				signAndExecuteTransaction: ctx.signAndExecuteTransaction,
				owner: ctx.address,
				epochs: 1, // Short epoch for test
				deletable: false,
			});

			expect(uploadResult).toBeDefined();
			expect(uploadResult.blobId).toBeDefined();
			expect(typeof uploadResult.blobId).toBe("string");
			expect(uploadResult.size).toBe(testData.length);

			// 3. Download from Walrus
			const downloaded = await downloadFromWalrusByBlobId(uploadResult.blobId);

			// 4. Verify data integrity
			expect(downloaded).toEqual(testData);

			// 5. Verify JSON content
			const downloadedPayload = JSON.parse(new TextDecoder().decode(downloaded));
			expect(downloadedPayload.test).toBe("walrus-integration");
			expect(downloadedPayload.data).toBe("Hello, Walrus!");
		});

		it("should upload and download medium-sized data (100KB)", async () => {
			// 1. Create 100KB test data
			const size = 100 * 1024;
			const testData = new Uint8Array(size);
			for (let i = 0; i < size; i++) {
				testData[i] = i % 256;
			}

			// 2. Upload to Walrus
			const uploadResult = await uploadToWalrus(testData, {
				signAndExecuteTransaction: ctx.signAndExecuteTransaction,
				owner: ctx.address,
				epochs: 1,
				deletable: false,
			});

			expect(uploadResult.blobId).toBeDefined();
			expect(uploadResult.size).toBe(size);

			// 3. Download and verify
			const downloaded = await downloadFromWalrusByBlobId(uploadResult.blobId);
			expect(downloaded.length).toBe(size);
			expect(downloaded).toEqual(testData);
		});

		it("should upload and download large data (500KB)", async () => {
			// 1. Create 500KB test data
			const size = 500 * 1024;
			const testData = new Uint8Array(size);
			for (let i = 0; i < size; i++) {
				testData[i] = (i * 7) % 256; // Different pattern
			}

			// 2. Upload to Walrus
			const uploadResult = await uploadToWalrus(testData, {
				signAndExecuteTransaction: ctx.signAndExecuteTransaction,
				owner: ctx.address,
				epochs: 1,
				deletable: false,
			});

			expect(uploadResult.blobId).toBeDefined();
			expect(uploadResult.size).toBe(size);

			// 3. Download and verify
			const downloaded = await downloadFromWalrusByBlobId(uploadResult.blobId);
			expect(downloaded.length).toBe(size);
			expect(downloaded).toEqual(testData);
		});
	});

	describe("Blob Existence Check", () => {
		it("should return true for existing blob", async () => {
			// Upload a blob first
			const testData = new TextEncoder().encode("existence-check-test");
			const uploadResult = await uploadToWalrus(testData, {
				signAndExecuteTransaction: ctx.signAndExecuteTransaction,
				owner: ctx.address,
				epochs: 1,
				deletable: false,
			});

			// Check existence
			const exists = await blobExists(uploadResult.blobId);
			expect(exists).toBe(true);
		});

		it("should return false for non-existing blob", async () => {
			const fakeBlobId = "0x" + "a".repeat(64);
			const exists = await blobExists(fakeBlobId);
			expect(exists).toBe(false);
		});
	});

	describe("Blob Metadata", () => {
		it("should return correct metadata for uploaded blob", async () => {
			const testData = new TextEncoder().encode("metadata-test-data");
			const uploadResult = await uploadToWalrus(testData, {
				signAndExecuteTransaction: ctx.signAndExecuteTransaction,
				owner: ctx.address,
				epochs: 1,
				deletable: false,
			});

			const metadata = await getBlobMetadata(uploadResult.blobId);

			expect(metadata.size).toBe(testData.length);
			expect(metadata.certified).toBe(true);
			expect(metadata.contentType).toBe("application/octet-stream");
		});
	});

	describe("Error Handling", () => {
		it("should throw error for non-existing blob download", async () => {
			const fakeBlobId = "0x" + "b".repeat(64);

			await expect(downloadFromWalrusByBlobId(fakeBlobId)).rejects.toThrow();
		});

		it("should throw error when data exceeds max size (1MB)", async () => {
			// Create data larger than 1MB
			const oversizedData = new Uint8Array(1.5 * 1024 * 1024);

			await expect(
				uploadToWalrus(oversizedData, {
					signAndExecuteTransaction: ctx.signAndExecuteTransaction,
					owner: ctx.address,
					epochs: 1,
					deletable: false,
				}),
			).rejects.toThrow(/exceeds maximum/);
		});
	});

	describe("Data Integrity", () => {
		it("should preserve binary data exactly", async () => {
			// Create binary data with all byte values
			const binaryData = new Uint8Array(256);
			for (let i = 0; i < 256; i++) {
				binaryData[i] = i;
			}

			const uploadResult = await uploadToWalrus(binaryData, {
				signAndExecuteTransaction: ctx.signAndExecuteTransaction,
				owner: ctx.address,
				epochs: 1,
				deletable: false,
			});

			const downloaded = await downloadFromWalrusByBlobId(uploadResult.blobId);

			// Verify every byte
			expect(downloaded.length).toBe(256);
			for (let i = 0; i < 256; i++) {
				expect(downloaded[i]).toBe(i);
			}
		});

		it("should handle empty-like small data", async () => {
			const smallData = new Uint8Array([1]); // 1 byte

			const uploadResult = await uploadToWalrus(smallData, {
				signAndExecuteTransaction: ctx.signAndExecuteTransaction,
				owner: ctx.address,
				epochs: 1,
				deletable: false,
			});

			const downloaded = await downloadFromWalrusByBlobId(uploadResult.blobId);
			expect(downloaded).toEqual(smallData);
		});
	});
});
