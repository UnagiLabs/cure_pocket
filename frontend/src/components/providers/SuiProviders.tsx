"use client";

import {
	createNetworkConfig,
	SuiClientProvider,
	WalletProvider,
} from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

/**
 * Sui dApp Kit プロバイダーコンポーネント
 * SuiClientProvider, WalletProvider, QueryClientProviderを提供
 */
const { networkConfig } = createNetworkConfig({
	localnet: { url: getFullnodeUrl("localnet") },
	devnet: { url: getFullnodeUrl("devnet") },
	testnet: { url: getFullnodeUrl("testnet") },
	mainnet: { url: getFullnodeUrl("mainnet") },
});

// NEXT_PUBLIC_SUI_NETWORK でデフォルト接続先を切り替える（未設定時はtestnet）。
const defaultNetwork = (() => {
	const env = process.env.NEXT_PUBLIC_SUI_NETWORK?.toLowerCase();
	if (env && env in networkConfig) {
		return env as keyof typeof networkConfig;
	}
	return "testnet" as const;
})();

interface SuiProvidersProps {
	children: React.ReactNode;
}

export function SuiProviders({ children }: SuiProvidersProps) {
	// QueryClientはuseStateで管理（再レンダリング時に再作成されないように）
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 10 * 1000, // 10秒
						gcTime: 24 * 60 * 60 * 1000, // 24時間
					},
				},
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>
			<SuiClientProvider
				networks={networkConfig}
				defaultNetwork={defaultNetwork}
			>
				{/* autoConnectを無効化して、ユーザーが明示的にコネクトを開始するまで待つ */}
				<WalletProvider autoConnect={false}>
					{children}
					<Toaster position="top-right" />
				</WalletProvider>
			</SuiClientProvider>
		</QueryClientProvider>
	);
}
