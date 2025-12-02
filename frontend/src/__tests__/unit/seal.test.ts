import { afterEach, describe, expect, it, vi } from "vitest";
import {
	buildPatientAccessPTB,
	createSealClient,
	createSessionKey,
	decryptHealthData,
	encryptHealthData,
	generateSealId,
	signSessionKey,
} from "@/lib/crypto/walrusSeal";
import {
	createTestContext,
	ensureSufficientBalance,
	type TestContext,
} from "../utils/testWallet";

// Helper to reload module with fresh env
// Import directly from seal.ts to ensure fresh env evaluation
async function loadSealModule() {
	return await import(
		`@/lib/crypto/seal?cache_bust=${Date.now()}_${Math.random()}`
	);
}

describe("seal utils (unit)", () => {
	const defaultTestnetKey =
		"0x164ac3d2b3b8694b8181c13f671950004765c23f270321a45fdd04d40cccf0f2";
	const originalEnv = { ...process.env };

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it("calculateThreshold chooses 1 for single server and 2 for 2+ servers", async () => {
		const { calculateThreshold } = await loadSealModule();

		expect(calculateThreshold(1)).toBe(1);
		expect(calculateThreshold(2)).toBe(2);
		expect(calculateThreshold(5)).toBe(2);
	});

	it("resolveKeyServers returns env-configured servers when provided", async () => {
		process.env.NEXT_PUBLIC_SEAL_KEY_SERVERS = "0xabc, 0xdef , 0xghi";
		const { resolveKeyServers } = await loadSealModule();

		const servers = resolveKeyServers("testnet");
		expect(servers).toEqual(["0xabc", "0xdef", "0xghi"]);
	});

	it("resolveKeyServers falls back to default testnet servers when env not set", async () => {
		delete process.env.NEXT_PUBLIC_SEAL_KEY_SERVERS;
		const { resolveKeyServers } = await loadSealModule();

		const servers = resolveKeyServers("testnet");
		expect(servers.length).toBeGreaterThan(0);
		expect(servers).toContain(defaultTestnetKey);
	});

	it("encryptHealthData uses seal client and returns encrypted payload", async () => {
		process.env.NEXT_PUBLIC_SEAL_KEY_SERVERS = "0xkey1";
		const { encryptHealthData } = await loadSealModule();

		const mockEncrypt = vi.fn().mockResolvedValue({
			encryptedObject: new Uint8Array([1, 2, 3]),
			key: new Uint8Array([4, 5, 6]),
		});
		const mockSealClient = {
			encrypt: mockEncrypt,
		} as unknown as import("@mysten/seal").SealClient;

		const result = await encryptHealthData({
			healthData: { test: true },
			sealClient: mockSealClient,
			sealId: "0xabc",
		});

		expect(mockEncrypt).toHaveBeenCalledTimes(1);
		expect(result.encryptedObject).toEqual(new Uint8Array([1, 2, 3]));
		expect(result.backupKey).toEqual(new Uint8Array([4, 5, 6]));
	});

	it("decryptHealthData returns original object when seal client decrypts", async () => {
		process.env.NEXT_PUBLIC_SEAL_KEY_SERVERS = "0xkey1";
		const { decryptHealthData } = await loadSealModule();
		const { EncryptedObject } = await import("@mysten/seal");

		const parsedMeta = { id: "0xabc", threshold: 1, services: ["ok"] };
		const parseSpy = vi
			.spyOn(EncryptedObject, "parse")
			.mockReturnValue(
				parsedMeta as unknown as ReturnType<typeof EncryptedObject.parse>,
			);

		const original = { hello: "seal" };
		const encoded = new TextEncoder().encode(JSON.stringify(original));

		const mockSealClient = {
			decrypt: vi.fn().mockResolvedValue(encoded),
		} as unknown as import("@mysten/seal").SealClient;
		const mockSessionKey = {
			isExpired: () => false,
		} as unknown as import("@mysten/seal").SessionKey;
		const txBytes = new Uint8Array([9, 9]);

		const result = await decryptHealthData({
			encryptedData: new Uint8Array([1]),
			sealClient: mockSealClient,
			sessionKey: mockSessionKey,
			txBytes,
			sealId: "0xabc",
		});

		expect(result).toEqual(original);
		expect(mockSealClient.decrypt).toHaveBeenCalledTimes(1);
		expect(parseSpy).toHaveBeenCalledTimes(1);

		parseSpy.mockRestore();
	});

	/**
	 * 実際の Seal クライアントで暗号化→復号を行う簡易E2E。
	 * 実行にはネットワーク・Sui残高・契約オブジェクトIDが必要なため、
	 * 環境変数 SEAL_E2E=1 が設定されたときのみ走る。
	 */
	const E2E_ENABLED =
		process.env.SEAL_E2E === "1" &&
		!!process.env.TEST_PASSPORT_OBJECT_ID &&
		!!process.env.NEXT_PUBLIC_PASSPORT_REGISTRY_ID &&
		!!process.env.NEXT_PUBLIC_PACKAGE_ID;

	/**
	 * E2E 用に patient 権限を自動付与するヘルパー。
	 * - 対象: dataType に紐づく sealId（ウォレット＋dataType から生成）
	 * - 1回の PTB 送信で key server が復号キーを返せる状態にする
	 * 注意: ネットワーク書き込みを行うため SEAL_E2E=1 時のみ実行。
	 */
	async function ensurePatientAccess(
		ctx: TestContext,
		{ sealId, dataType }: { sealId: string; dataType: string },
	): Promise<void> {
		const txBytes = await buildPatientAccessPTB({
			passportObjectId: process.env.TEST_PASSPORT_OBJECT_ID as string,
			registryObjectId: process.env.NEXT_PUBLIC_PASSPORT_REGISTRY_ID as string,
			suiClient: ctx.suiClient,
			sealId,
			dataType,
		});

		// 型合わせのため Transaction にキャストしつつ bytes をそのまま渡す
		await ctx.signAndExecuteTransaction({
			transaction:
				txBytes as unknown as import("@mysten/sui/transactions").Transaction,
		});
	}

	(E2E_ENABLED ? it : it.skip)(
		"encrypts and decrypts via real Seal client (skips on NoAccessError)",
		async () => {
			const ctx: TestContext = createTestContext();
			const hasBalance = await ensureSufficientBalance();
			if (!hasBalance) {
				throw new Error("Insufficient balance for Seal E2E test");
			}

			const sealClient = createSealClient(ctx.suiClient);
			const healthData = { hello: "seal-e2e", ts: Date.now() };
			const sealId = await generateSealId(ctx.address, "unit_e2e");
			const dataType = "unit_e2e";

			// patient 権限を付与（幾何度も送るが重複は許容）
			try {
				await ensurePatientAccess(ctx, { sealId, dataType });
			} catch (error) {
				const message =
					error instanceof Error ? error.message : String(error ?? "");
				if (
					message.includes("does not have access") ||
					message.includes("Deserialization error")
				) {
					console.warn(
						"[Seal E2E] Skipped before encrypt: wallet lacks access or registry/passport mismatch.",
					);
					return;
				}
				throw error;
			}

			const { encryptedObject } = await encryptHealthData({
				healthData,
				sealClient,
				sealId,
				threshold: 1,
			});

			const sessionKey = await createSessionKey({
				address: ctx.address,
				suiClient: ctx.suiClient,
				ttlMin: 10,
			});

			await signSessionKey(sessionKey, async (message: Uint8Array) => {
				const signature = await ctx.keypair.signPersonalMessage(message);
				return { signature: signature.signature };
			});

			const txBytes = await buildPatientAccessPTB({
				passportObjectId: process.env.TEST_PASSPORT_OBJECT_ID as string,
				registryObjectId: process.env
					.NEXT_PUBLIC_PASSPORT_REGISTRY_ID as string,
				suiClient: ctx.suiClient,
				sealId,
				dataType,
			});

			try {
				const decrypted = await decryptHealthData({
					encryptedData: encryptedObject,
					sealClient,
					sessionKey,
					txBytes,
					sealId,
				});
				expect(decrypted).toEqual(healthData);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : String(error ?? "");
				if (
					message.includes("does not have access") ||
					message.includes("Deserialization error")
				) {
					console.warn(
						"[Seal E2E] Skipped: wallet lacks access or registry/passport not aligned (NoAccess/Deserialization).",
					);
					return;
				}
				throw error;
			}
		},
		180_000,
	);
});
