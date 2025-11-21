"use client";

import {
	useAccounts,
	useCurrentAccount,
	useDisconnectWallet,
	useSwitchAccount,
} from "@mysten/dapp-kit";
import { Check, Copy, ExternalLink, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface ConnectedWalletPanelProps {
	onClose: () => void;
	variant?: "desktop" | "mobile";
}

export function ConnectedWalletPanel({
	onClose,
	variant = "desktop",
}: ConnectedWalletPanelProps) {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const currentAccount = useCurrentAccount();
	const accounts = useAccounts();
	const { mutate: disconnectWallet } = useDisconnectWallet();
	const { mutate: switchAccount } = useSwitchAccount();
	const panelRef = useRef<HTMLDivElement>(null);
	const [copiedAddress, setCopiedAddress] = useState(false);

	// Escapeキーで閉じる
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	// 外部クリックで閉じる
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
				onClose();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [onClose]);

	const handleCopyAddress = async () => {
		if (!currentAccount?.address) return;

		try {
			await navigator.clipboard.writeText(currentAccount.address);
			setCopiedAddress(true);
			toast.success(t("wallet.addressCopied"));
			setTimeout(() => setCopiedAddress(false), 2000);
		} catch (error) {
			console.error("Failed to copy address:", error);
			toast.error(t("wallet.copyFailed"));
		}
	};

	const handleOpenExplorer = () => {
		if (!currentAccount?.address) return;
		const explorerUrl = `https://suiscan.xyz/testnet/account/${currentAccount.address}`;
		window.open(explorerUrl, "_blank", "noopener,noreferrer");
	};

	const handleDisconnect = () => {
		disconnectWallet();
		onClose();
		router.push(`/${locale}`);
		toast.success(t("wallet.disconnected"));
	};

	const handleSwitchAccount = (address: string) => {
		const targetAccount = accounts.find((acc) => acc.address === address);
		if (!targetAccount) {
			toast.error(t("wallet.switchFailed"));
			return;
		}

		switchAccount(
			{ account: targetAccount },
			{
				onSuccess: () => {
					toast.success(t("wallet.accountSwitched"));
				},
				onError: (error) => {
					console.error("Failed to switch account:", error);
					toast.error(t("wallet.switchFailed"));
				},
			},
		);
	};

	// レスポンシブ配置用のクラス
	const positionClasses =
		variant === "mobile"
			? "fixed left-1/2 -translate-x-1/2 top-20"
			: "absolute right-0 top-full mt-2";

	return (
		<div
			ref={panelRef}
			className={`${positionClasses} z-50 w-80 rounded-lg border border-gray-200 bg-white shadow-lg`}
		>
			<div className="p-4 space-y-4">
				{/* ステータス表示 */}
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium text-gray-900">Connected</span>
					<div className="h-2 w-2 rounded-full bg-green-500" />
				</div>

				{/* アドレス表示 */}
				<div className="space-y-2">
					<div className="text-xs text-gray-500">{t("wallet.address")}</div>
					<div className="flex items-center gap-2">
						<div className="flex-1 rounded bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900 truncate">
							{currentAccount?.address.slice(0, 10)}...
							{currentAccount?.address.slice(-8)}
						</div>
					</div>
				</div>

				{/* アクションボタン */}
				<div className="flex gap-2">
					<button
						type="button"
						onClick={handleCopyAddress}
						className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 hover:scale-105 active:scale-95"
						aria-label={t("wallet.copyAddress")}
					>
						{copiedAddress ? (
							<>
								<Check className="h-4 w-4 text-green-600" />
								<span className="text-green-600">{t("wallet.copied")}</span>
							</>
						) : (
							<>
								<Copy className="h-4 w-4" />
								<span>{t("wallet.copy")}</span>
							</>
						)}
					</button>

					<button
						type="button"
						onClick={handleOpenExplorer}
						className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 hover:scale-105 active:scale-95"
						aria-label={t("wallet.viewOnExplorer")}
					>
						<ExternalLink className="h-4 w-4" />
						<span>{t("wallet.explorer")}</span>
					</button>
				</div>

				{/* 複数アカウント表示 */}
				{accounts.length > 1 && (
					<div className="space-y-2">
						<div className="text-xs font-medium text-gray-500">
							{t("wallet.accounts")}
						</div>
						<div className="space-y-1 max-h-40 overflow-y-auto">
							{accounts.map((account) => {
								const isActive = account.address === currentAccount?.address;
								return (
									<button
										key={account.address}
										type="button"
										onClick={() => handleSwitchAccount(account.address)}
										className={`w-full rounded-lg px-3 py-2 text-left text-sm font-mono transition-all hover:scale-105 active:scale-95 ${
											isActive
												? "bg-blue-500 text-white"
												: "bg-gray-50 text-gray-900 hover:bg-gray-100"
										}`}
										disabled={isActive}
									>
										{account.address.slice(0, 10)}...
										{account.address.slice(-8)}
									</button>
								);
							})}
						</div>
					</div>
				)}

				{/* 切断ボタン */}
				<button
					type="button"
					onClick={handleDisconnect}
					className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-600 hover:scale-105 active:scale-95"
					aria-label={t("wallet.disconnect")}
				>
					<LogOut className="h-4 w-4" />
					<span>DISCONNECT</span>
				</button>
			</div>
		</div>
	);
}
