/**
 * WalletService
 * Mysten dApp Kitを使用したウォレット接続サービス
 *
 * 注意: このサービスはReactコンポーネント内でのみ使用可能です。
 * useConnectWalletとuseCurrentAccountフックを使用してください。
 */
export interface WalletService {
	connect(): Promise<string>; // returns walletAddress
	disconnect(): Promise<void>;
	isConnected(): boolean;
	getAddress(): string | null;
}

/**
 * 注意: walletServiceは非推奨です。
 * 代わりに、Reactコンポーネント内で以下のフックを直接使用してください:
 * - useConnectWallet() - ウォレット接続
 * - useCurrentAccount() - 現在のアカウント情報
 * - useDisconnectWallet() - ウォレット切断
 *
 * このファイルは後方互換性のために残されていますが、
 * 新しいコードでは直接フックを使用することを推奨します。
 */
class WalletServiceImpl implements WalletService {
	private address: string | null = null;

	async connect(): Promise<string> {
		// この実装は非推奨です
		// コンポーネント内でuseConnectWallet()を直接使用してください
		throw new Error(
			"walletService.connect() is deprecated. Use useConnectWallet() hook in React components instead.",
		);
	}

	async disconnect(): Promise<void> {
		// この実装は非推奨です
		// コンポーネント内でuseDisconnectWallet()を直接使用してください
		throw new Error(
			"walletService.disconnect() is deprecated. Use useDisconnectWallet() hook in React components instead.",
		);
	}

	isConnected(): boolean {
		return this.address !== null;
	}

	getAddress(): string | null {
		return this.address;
	}

	// Restore wallet connection from localStorage on page load
	restore(): void {
		// この実装は非推奨です
		// dApp KitのautoConnect機能を使用してください
	}
}

export const walletService = new WalletServiceImpl();
