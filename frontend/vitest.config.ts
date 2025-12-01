import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		testTimeout: 120000, // Testnet通信のため長めに設定
		hookTimeout: 60000,
		include: ["src/**/*.test.ts", "src/**/*.integration.test.ts"],
		// 統合テスト用のリトライ設定
		retry: 2,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
