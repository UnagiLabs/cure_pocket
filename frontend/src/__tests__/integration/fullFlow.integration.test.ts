/**
 * Full Flow Integration Tests
 *
 * Tests the complete flow: Encrypt → Upload → Download → Decrypt
 * This is the most comprehensive test that verifies the entire data lifecycle.
 *
 * Prerequisites:
 * - Test wallet with sufficient SUI balance
 * - Network connectivity to Sui Testnet, Walrus storage nodes, and Seal KeyServers
 * - For full decrypt testing: Deployed MedicalPassport contract
 */

import { beforeAll, describe, expect, it } from "vitest";
import {
	buildPatientAccessPTB,
	createSealClient,
	createSessionKey,
	decryptHealthData,
	encryptHealthData,
	signSessionKey,
} from "@/lib/seal";
import { generateSealId } from "@/lib/sealIdGenerator";
import { downloadFromWalrusByBlobId, uploadToWalrus } from "@/lib/walrus";
import {
	createTestContext,
	ensureSufficientBalance,
	type TestContext,
} from "../utils/testWallet";

describe("Full Flow Integration Tests", () => {
	let ctx: TestContext;

	beforeAll(async () => {
		ctx = createTestContext();

		// Verify wallet has sufficient balance
		const hasSufficientBalance = await ensureSufficientBalance();
		if (!hasSufficientBalance) {
			console.warn(
				"[FullFlow Test] Skipping tests due to insufficient balance",
			);
		}
	});

	describe("Encrypt → Upload → Download → Decrypt", () => {
		it("should complete full flow for vital signs data", async () => {
			const sealClient = createSealClient(ctx.suiClient);

			// 1. Original health data
			const originalData = {
				type: "vital_signs",
				timestamp: Date.now(),
				data: {
					bloodPressure: { systolic: 120, diastolic: 80 },
					heartRate: 72,
					temperature: 36.5,
					oxygenSaturation: 98,
				},
			};

			const dataType = "self_metrics";
			const sealId = await generateSealId(ctx.address, dataType);

			console.log("[FullFlow] Step 1: Encrypting data with Seal...");

			// 2. Encrypt with Seal
			const { encryptedObject } = await encryptHealthData({
				healthData: originalData,
				sealClient,
				sealId,
				threshold: 1,
			});

			expect(encryptedObject).toBeDefined();
			expect(encryptedObject.length).toBeGreaterThan(0);
			console.log(
				`[FullFlow] Encrypted data size: ${encryptedObject.length} bytes`,
			);

			console.log("[FullFlow] Step 2: Uploading to Walrus...");

			// 3. Upload to Walrus
			const uploadResult = await uploadToWalrus(encryptedObject, {
				signAndExecuteTransaction: ctx.signAndExecuteTransaction,
				owner: ctx.address,
				epochs: 1,
				deletable: false,
			});

			expect(uploadResult.blobId).toBeDefined();
			console.log(
				`[FullFlow] Uploaded to Walrus, blobId: ${uploadResult.blobId}`,
			);

			console.log("[FullFlow] Step 3: Downloading from Walrus...");

			// 4. Download from Walrus
			const downloadedEncrypted = await downloadFromWalrusByBlobId(
				uploadResult.blobId,
			);

			expect(downloadedEncrypted).toBeDefined();
			expect(downloadedEncrypted).toEqual(encryptedObject);
			console.log(
				`[FullFlow] Downloaded ${downloadedEncrypted.length} bytes from Walrus`,
			);

			// 5. Verify data integrity (encrypted → uploaded → downloaded)
			expect(downloadedEncrypted.length).toBe(encryptedObject.length);

			console.log("[FullFlow] Step 4: Preparing for decryption...");

			// 6. Create and sign SessionKey for decryption
			const sessionKey = await createSessionKey({
				address: ctx.address,
				suiClient: ctx.suiClient,
				ttlMin: 10,
			});

			await signSessionKey(sessionKey, async (message: Uint8Array) => {
				const signature = await ctx.keypair.signPersonalMessage(message);
				return { signature: signature.signature };
			});

			console.log("[FullFlow] SessionKey created and signed");

			// 7. Decrypt (requires deployed contract for full verification)
			const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
			const registryId = process.env.NEXT_PUBLIC_REGISTRY_ID;
			const passportId = process.env.TEST_PASSPORT_OBJECT_ID;

			if (!packageId || !registryId || !passportId) {
				console.log(
					"[FullFlow] Full decrypt test skipped - contract not deployed or passport not created",
				);
				console.log(
					"[FullFlow] Encryption → Upload → Download verified successfully!",
				);
				return;
			}

			// Build PTB for patient access
			const txBytes = await buildPatientAccessPTB({
				passportObjectId: passportId,
				registryObjectId: registryId,
				suiClient: ctx.suiClient,
				sealId,
				dataType,
			});

			console.log("[FullFlow] Step 5: Decrypting data...");

			// 8. Decrypt with Seal
			const decryptedData = await decryptHealthData({
				encryptedData: downloadedEncrypted,
				sealClient,
				sessionKey,
				txBytes,
				sealId,
			});

			// 9. Verify decrypted data matches original
			expect(decryptedData).toEqual(originalData);
			console.log("[FullFlow] Full flow completed successfully!");
		});

		it("should handle medication data through full flow", async () => {
			const sealClient = createSealClient(ctx.suiClient);

			// Complex medication data
			const medicationData = {
				meta: {
					schema_version: "2.0.0",
					updated_at: Date.now(),
				},
				medications: [
					{
						name: "Lisinopril",
						dosage: "10mg",
						frequency: "once daily",
						purpose: "blood pressure",
						startDate: "2024-01-01",
					},
					{
						name: "Metformin",
						dosage: "500mg",
						frequency: "twice daily",
						purpose: "blood sugar control",
						startDate: "2023-06-15",
					},
					{
						name: "Vitamin D3",
						dosage: "2000 IU",
						frequency: "once daily",
						purpose: "supplement",
						startDate: "2024-03-01",
					},
				],
			};

			const dataType = "medications";
			const sealId = await generateSealId(ctx.address, dataType);

			// Encrypt
			const { encryptedObject } = await encryptHealthData({
				healthData: medicationData,
				sealClient,
				sealId,
				threshold: 1,
			});

			// Upload
			const uploadResult = await uploadToWalrus(encryptedObject, {
				signAndExecuteTransaction: ctx.signAndExecuteTransaction,
				owner: ctx.address,
				epochs: 1,
				deletable: false,
			});

			// Download
			const downloaded = await downloadFromWalrusByBlobId(uploadResult.blobId);

			// Verify round-trip integrity
			expect(downloaded).toEqual(encryptedObject);
		});

		it("should handle lab results data through full flow", async () => {
			const sealClient = createSealClient(ctx.suiClient);

			// Lab results data
			const labData = {
				meta: {
					schema_version: "2.0.0",
					updated_at: Date.now(),
					facility: "Test Medical Center",
				},
				results: [
					{
						test: "Complete Blood Count",
						date: "2024-01-15",
						values: {
							wbc: { value: 7.5, unit: "K/uL", range: "4.5-11.0" },
							rbc: { value: 4.8, unit: "M/uL", range: "4.5-5.5" },
							hemoglobin: { value: 14.2, unit: "g/dL", range: "13.5-17.5" },
							hematocrit: { value: 42, unit: "%", range: "38-50" },
							platelets: { value: 250, unit: "K/uL", range: "150-400" },
						},
					},
					{
						test: "Basic Metabolic Panel",
						date: "2024-01-15",
						values: {
							glucose: { value: 95, unit: "mg/dL", range: "70-100" },
							sodium: { value: 140, unit: "mEq/L", range: "136-145" },
							potassium: { value: 4.2, unit: "mEq/L", range: "3.5-5.0" },
							creatinine: { value: 1.0, unit: "mg/dL", range: "0.7-1.3" },
						},
					},
				],
			};

			const dataType = "lab_results";
			const sealId = await generateSealId(ctx.address, dataType);

			// Encrypt
			const { encryptedObject } = await encryptHealthData({
				healthData: labData,
				sealClient,
				sealId,
				threshold: 1,
			});

			// Upload
			const uploadResult = await uploadToWalrus(encryptedObject, {
				signAndExecuteTransaction: ctx.signAndExecuteTransaction,
				owner: ctx.address,
				epochs: 1,
				deletable: false,
			});

			// Download
			const downloaded = await downloadFromWalrusByBlobId(uploadResult.blobId);

			// Verify round-trip integrity
			expect(downloaded).toEqual(encryptedObject);
			expect(downloaded.length).toBe(encryptedObject.length);
		});
	});

	describe("Multiple Data Types in Sequence", () => {
		it("should handle multiple data types with unique seal IDs", async () => {
			const sealClient = createSealClient(ctx.suiClient);

			const dataTypes = [
				"vital_signs",
				"medications",
				"lab_results",
				"allergies",
			];
			const results: Array<{
				dataType: string;
				sealId: string;
				blobId: string;
				originalSize: number;
				encryptedSize: number;
			}> = [];

			for (const dataType of dataTypes) {
				const sealId = await generateSealId(ctx.address, dataType);
				const testData = {
					type: dataType,
					timestamp: Date.now(),
					content: `Test content for ${dataType}`,
				};

				// Encrypt
				const { encryptedObject } = await encryptHealthData({
					healthData: testData,
					sealClient,
					sealId,
					threshold: 1,
				});

				// Upload
				const uploadResult = await uploadToWalrus(encryptedObject, {
					signAndExecuteTransaction: ctx.signAndExecuteTransaction,
					owner: ctx.address,
					epochs: 1,
					deletable: false,
				});

				results.push({
					dataType,
					sealId,
					blobId: uploadResult.blobId,
					originalSize: JSON.stringify(testData).length,
					encryptedSize: encryptedObject.length,
				});
			}

			// Verify all data types were processed
			expect(results.length).toBe(dataTypes.length);

			// Verify all seal IDs are unique
			const sealIds = results.map((r) => r.sealId);
			const uniqueSealIds = new Set(sealIds);
			expect(uniqueSealIds.size).toBe(dataTypes.length);

			// Verify all blob IDs are unique
			const blobIds = results.map((r) => r.blobId);
			const uniqueBlobIds = new Set(blobIds);
			expect(uniqueBlobIds.size).toBe(dataTypes.length);

			// Download and verify each blob
			for (const result of results) {
				const downloaded = await downloadFromWalrusByBlobId(result.blobId);
				expect(downloaded.length).toBe(result.encryptedSize);
			}
		});
	});

	describe("Edge Cases", () => {
		it("should handle minimum viable data", async () => {
			const sealClient = createSealClient(ctx.suiClient);

			// Minimal data
			const minimalData = { v: 1 };
			const sealId = await generateSealId(ctx.address, "minimal_test");

			const { encryptedObject } = await encryptHealthData({
				healthData: minimalData,
				sealClient,
				sealId,
				threshold: 1,
			});

			const uploadResult = await uploadToWalrus(encryptedObject, {
				signAndExecuteTransaction: ctx.signAndExecuteTransaction,
				owner: ctx.address,
				epochs: 1,
				deletable: false,
			});

			const downloaded = await downloadFromWalrusByBlobId(uploadResult.blobId);
			expect(downloaded).toEqual(encryptedObject);
		});

		it("should handle data with special characters", async () => {
			const sealClient = createSealClient(ctx.suiClient);

			// Data with special characters
			const specialData = {
				notes: "Patient reports: 頭痛、発熱 (headache, fever)",
				emoji: "🏥 💊 🩺",
				unicode: "Ñoño señor año",
				newlines: "Line 1\nLine 2\nLine 3",
			};
			const sealId = await generateSealId(ctx.address, "special_chars_test");

			const { encryptedObject } = await encryptHealthData({
				healthData: specialData,
				sealClient,
				sealId,
				threshold: 1,
			});

			const uploadResult = await uploadToWalrus(encryptedObject, {
				signAndExecuteTransaction: ctx.signAndExecuteTransaction,
				owner: ctx.address,
				epochs: 1,
				deletable: false,
			});

			const downloaded = await downloadFromWalrusByBlobId(uploadResult.blobId);
			expect(downloaded).toEqual(encryptedObject);
		});

		it("should handle deeply nested data structures", async () => {
			const sealClient = createSealClient(ctx.suiClient);

			// Deeply nested structure
			const nestedData = {
				level1: {
					level2: {
						level3: {
							level4: {
								level5: {
									value: "deep value",
									array: [1, 2, 3, { nested: true }],
								},
							},
						},
					},
				},
			};
			const sealId = await generateSealId(ctx.address, "nested_test");

			const { encryptedObject } = await encryptHealthData({
				healthData: nestedData,
				sealClient,
				sealId,
				threshold: 1,
			});

			const uploadResult = await uploadToWalrus(encryptedObject, {
				signAndExecuteTransaction: ctx.signAndExecuteTransaction,
				owner: ctx.address,
				epochs: 1,
				deletable: false,
			});

			const downloaded = await downloadFromWalrusByBlobId(uploadResult.blobId);
			expect(downloaded).toEqual(encryptedObject);
		});
	});

	describe("Performance Characteristics", () => {
		it("should complete full flow within acceptable time", async () => {
			const sealClient = createSealClient(ctx.suiClient);

			const startTime = Date.now();

			const testData = { test: "performance", value: 42 };
			const sealId = await generateSealId(ctx.address, "perf_test");

			// Encrypt
			const encryptStart = Date.now();
			const { encryptedObject } = await encryptHealthData({
				healthData: testData,
				sealClient,
				sealId,
				threshold: 1,
			});
			const encryptTime = Date.now() - encryptStart;

			// Upload
			const uploadStart = Date.now();
			const uploadResult = await uploadToWalrus(encryptedObject, {
				signAndExecuteTransaction: ctx.signAndExecuteTransaction,
				owner: ctx.address,
				epochs: 1,
				deletable: false,
			});
			const uploadTime = Date.now() - uploadStart;

			// Download
			const downloadStart = Date.now();
			await downloadFromWalrusByBlobId(uploadResult.blobId);
			const downloadTime = Date.now() - downloadStart;

			const totalTime = Date.now() - startTime;

			console.log(`[Performance] Encrypt: ${encryptTime}ms`);
			console.log(`[Performance] Upload: ${uploadTime}ms`);
			console.log(`[Performance] Download: ${downloadTime}ms`);
			console.log(`[Performance] Total: ${totalTime}ms`);

			// Reasonable expectations for testnet
			expect(totalTime).toBeLessThan(120000); // 2 minutes max
		});
	});
});
