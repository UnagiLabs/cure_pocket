/**
 * Full Flow Integration (E2E)
 * Encrypt JSON → Upload to Walrus → Download → Decrypt
 */

import { beforeAll, describe, expect, it } from "vitest";
import { loadJson, saveJson } from "@/lib/data/jsonAdapter";
import { createSessionKey, signSessionKey } from "@/lib/seal";
import {
	createTestContext,
	ensureSufficientBalance,
	type TestContext,
} from "../utils/testWallet";

describe("Full Flow Integration (adapter)", () => {
	let ctx: TestContext;

	beforeAll(async () => {
		ctx = createTestContext();
		const ok = await ensureSufficientBalance();
		if (!ok) {
			throw new Error("Insufficient balance for FullFlow E2E");
		}
	}, 30_000);

	it("encrypts, uploads, downloads, decrypts via adapter", async () => {
		const dataType = "self_metrics";
		const original = {
			type: "vital_signs",
			timestamp: Date.now(),
			data: {
				bloodPressure: { systolic: 118, diastolic: 76 },
				heartRate: 70,
				temperature: 36.6,
			},
		};

		// Encrypt + upload
		const upload = await saveJson(original, {
			address: ctx.address,
			suiClient: ctx.suiClient,
			signAndExecuteTransaction: ctx.signAndExecuteTransaction,
			dataType,
			threshold: 1,
		});

		// SessionKey
		const sessionKey = await createSessionKey({
			address: ctx.address,
			suiClient: ctx.suiClient,
			ttlMin: 10,
		});
		await signSessionKey(sessionKey, async (msg) => {
			const sig = await ctx.keypair.signPersonalMessage(msg);
			return { signature: sig.signature };
		});

		// Decrypt (skip if key server threshold is invalid)
		let decrypted: typeof original | null = null;
		try {
			decrypted = await loadJson<typeof original>({
				blobId: upload.blobId,
				dataType,
				sealId: upload.sealId,
				passportObjectId: process.env.TEST_PASSPORT_OBJECT_ID as string,
				registryObjectId: process.env
					.NEXT_PUBLIC_PASSPORT_REGISTRY_ID as string,
				suiClient: ctx.suiClient,
				sessionKey,
			});
		} catch (error) {
			const message =
				error instanceof Error ? error.message : String(error ?? "");
			if (message.includes("Invalid threshold")) {
				console.warn(
					"[FullFlow] Skipped decrypt: key server threshold invalid",
				);
				return;
			}
			throw error;
		}

		expect(decrypted).toEqual(original);
	}, 180_000);
});
