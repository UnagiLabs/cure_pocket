/**
 * Walrus Integration Test (Minimum)
 *
 * 1 ケースだけで Walrus SDK のアップロード→ダウンロード往復を確認する簡易版。
 * 残高不足やネットワーク不調で落ちやすいので、必要に応じて実行可否を切り替える。
 */

import { beforeAll, describe, expect, it } from "vitest";
import { downloadFromWalrusByBlobId, uploadToWalrus } from "@/lib/walrus";
import {
	createTestContext,
	ensureSufficientBalance,
	type TestContext,
} from "../utils/testWallet";

const TEST_TIMEOUT = 120_000;

describe("Walrus Integration Test (minimal)", () => {
	let ctx: TestContext;
	let shouldRun = true;

	beforeAll(async () => {
		ctx = createTestContext();

		// 残高確認（不足ならテストをスキップ）
		shouldRun = await ensureSufficientBalance();
		if (!shouldRun) {
			console.warn("[Walrus Test] Skipped: insufficient balance.");
		}
	});

	it(
		"uploads and downloads small JSON payload",
		async () => {
			if (!shouldRun) {
				return;
			}

			const payload = {
				test: "walrus-minimal",
				timestamp: Date.now(),
				message: "Hello, Walrus!",
			};
			const data = new TextEncoder().encode(JSON.stringify(payload));

			const uploadResult = await uploadToWalrus(data, {
				signAndExecuteTransaction: ctx.signAndExecuteTransaction,
				owner: ctx.address,
				epochs: 1,
				deletable: false,
			});

			expect(uploadResult.blobId).toBeDefined();
			expect(uploadResult.size).toBe(data.length);

			const downloaded = await downloadFromWalrusByBlobId(uploadResult.blobId);
			expect(downloaded.length).toBeGreaterThan(0);
		},
		TEST_TIMEOUT,
	);
});
