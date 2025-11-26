"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { Wallet } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { WalletButton } from "@/components/wallet/WalletButton";

interface DoctorLayoutProps {
	children: React.ReactNode;
}

export default function DoctorLayout({ children }: DoctorLayoutProps) {
	const t = useTranslations();
	const currentAccount = useCurrentAccount();
	const isWalletConnected = currentAccount !== null;

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
			{/* 医師画面ヘッダー */}
			<header className="sticky top-0 z-50 border-b border-blue-100 bg-white/80 backdrop-blur-sm">
				<div className="max-w-7xl mx-auto px-4 py-3">
					<div className="flex items-center justify-between">
						{/* ロゴ・タイトル */}
						<div className="flex items-center gap-3">
							<Image
								src="/icon.png"
								alt="CurePocket"
								width={40}
								height={40}
								className="rounded-xl shadow-md"
							/>
							<div className="flex items-center gap-2">
								<h1 className="text-lg font-bold text-gray-900">
									{t("appName")}
								</h1>
								<span className="px-2 py-0.5 text-xs font-medium rounded-md bg-blue-100 text-blue-700 border border-blue-200">
									{t("doctor.badge", { default: "Doctor View" })}
								</span>
							</div>
						</div>

						{/* Wallet接続 */}
						<div className="flex items-center gap-3">
							<WalletButton
								size="medium"
								variant="desktop"
								colorScheme="solid"
							/>
						</div>
					</div>
				</div>
			</header>

			{/* Wallet未接続時の警告バナー */}
			{!isWalletConnected && (
				<div className="bg-amber-50 border-b border-amber-200">
					<div className="max-w-7xl mx-auto px-4 py-3">
						<div className="flex items-center gap-3">
							<Wallet className="h-5 w-5 text-amber-600 flex-shrink-0" />
							<div className="flex-1">
								<p className="text-sm font-medium text-amber-800">
									{t("doctor.walletRequired", {
										default:
											"Wallet connection required to decrypt patient data",
									})}
								</p>
								<p className="text-xs text-amber-600">
									{t("doctor.walletRequiredDesc", {
										default:
											"Please connect your wallet using the button above to access encrypted medical records.",
									})}
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* メインコンテンツ */}
			{children}
		</div>
	);
}
