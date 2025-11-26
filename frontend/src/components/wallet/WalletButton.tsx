"use client";

import {
	useConnectWallet,
	useCurrentAccount,
	useWallets,
} from "@mysten/dapp-kit";
import { Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ConnectedWalletPanel } from "./ConnectedWalletPanel";

interface WalletButtonProps {
	size?: "small" | "medium" | "large";
	className?: string;
	variant?: "desktop" | "mobile";
	colorScheme?: "transparent" | "solid";
}

export function WalletButton({
	size = "medium",
	className = "",
	variant = "desktop",
	colorScheme = "transparent",
}: WalletButtonProps) {
	const t = useTranslations();
	const { mutate: connectWallet, isPending: isConnecting } = useConnectWallet();
	const currentAccount = useCurrentAccount();
	const wallets = useWallets();
	const [showPanel, setShowPanel] = useState(false);

	const isWalletConnected = currentAccount !== null;

	const handleConnectWallet = () => {
		const availableWallet = wallets[0];

		if (!availableWallet) {
			toast.error(t("wallet.notInstalled"));
			return;
		}

		connectWallet(
			{
				wallet: availableWallet,
			},
			{
				onSuccess: () => {
					toast.success(t("wallet.connected"));
				},
				onError: (error) => {
					// ユーザーがリクエストを拒否した場合は、エラーメッセージを表示しない
					const errorMessage = error?.message || String(error);
					if (
						errorMessage.includes("User rejected") ||
						errorMessage.includes("rejected")
					) {
						// ユーザーが意図的に拒否した場合は、静かに処理する
						return;
					}
					// その他のエラーの場合のみ、エラーメッセージを表示
					console.error("Failed to connect wallet:", error);
					toast.error(t("wallet.connectionFailed"));
				},
			},
		);
	};

	// サイズクラスの定義
	const sizeClasses = {
		small: "px-2 py-1 text-xs",
		medium: "px-2 py-1.5 text-xs",
		large: "px-3 py-2 text-sm",
	};

	const baseClasses =
		"rounded-lg font-medium text-white transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap";

	if (isWalletConnected) {
		return (
			<div className="relative">
				<button
					type="button"
					onClick={() => setShowPanel(!showPanel)}
					className={`${baseClasses} ${sizeClasses[size]} ${className} bg-blue-500 hover:bg-blue-600 flex items-center gap-1.5`}
					aria-expanded={showPanel}
					aria-label={t("wallet.connectedAddress")}
				>
					<Wallet className="h-3 w-3" />
					<span>
						{currentAccount?.address.slice(0, 6)}...
						{currentAccount?.address.slice(-4)}
					</span>
				</button>

				{showPanel && (
					<ConnectedWalletPanel
						onClose={() => setShowPanel(false)}
						variant={variant}
					/>
				)}
			</div>
		);
	}

	const colorClasses =
		colorScheme === "solid"
			? "bg-blue-500 hover:bg-blue-600"
			: "bg-white/20 hover:bg-white/30";

	return (
		<button
			type="button"
			onClick={handleConnectWallet}
			disabled={isConnecting}
			className={`${baseClasses} ${sizeClasses[size]} ${className} ${colorClasses} disabled:opacity-50 flex items-center gap-1`}
			aria-label={t("actions.connectWallet")}
		>
			<Wallet className="h-3 w-3" />
			<span className="hidden lg:inline">
				{isConnecting ? t("wallet.connecting") : t("actions.connectWallet")}
			</span>
			<span className="lg:hidden">
				{isConnecting ? t("wallet.connecting") : t("wallet.connect")}
			</span>
		</button>
	);
}
