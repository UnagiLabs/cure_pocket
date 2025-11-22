"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { CreditCard, Home, Menu, Plus, Settings, Activity, Calendar, FileText, User, Bell } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";

interface AppLayoutProps {
	children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const { walletAddress, settings } = useApp();
	const [activeTab, setActiveTab] = useState("home");
	const [showMenu, setShowMenu] = useState(false);
	const theme = getTheme(settings.theme);
	const currentAccount = useCurrentAccount();

	// ウォレット接続状態（dApp Kitから取得）
	const isWalletConnected = currentAccount !== null;

	useEffect(() => {
		// Redirect to landing if not connected
		if (!walletAddress && !isWalletConnected) {
			router.push(`/${locale}`);
		}
	}, [walletAddress, isWalletConnected, router, locale]);

	const navigateTo = (path: string, tab: string) => {
		setActiveTab(tab);
		router.push(`/${locale}${path}`);
	};

	return (
		<div
			className="relative flex min-h-screen flex-col max-w-md mx-auto shadow-2xl overflow-hidden transition-colors duration-500"
			style={{
				backgroundColor: theme.colors.background,
				color: theme.colors.text,
			}}
		>
			{/* Header with Profile */}
			<header
				className="px-6 pt-8 pb-2 flex justify-between items-center sticky top-0 z-30 transition-colors duration-500"
				style={{ backgroundColor: theme.colors.background }}
			>
				<div className="flex items-center gap-3">
					<div
						className="w-10 h-10 rounded-full bg-gradient-to-tr flex items-center justify-center text-white shadow-md cursor-pointer hover:scale-105 transition-transform"
						style={{
							backgroundImage:
								theme.id === "midnight-travel"
									? `linear-gradient(to top right, ${theme.colors.primary}, #0F172A)`
									: `linear-gradient(to top right, #1A365D, #2c5282)`,
						}}
					>
						<span className="font-bold text-sm">
							{walletAddress ? walletAddress.slice(0, 2).toUpperCase() : "U"}
						</span>
					</div>
					<div>
						<p className="text-xs" style={{ color: theme.colors.textSecondary }}>
							こんにちは、
						</p>
						<h1 className="text-lg font-bold leading-tight" style={{ color: theme.colors.text }}>
							{walletAddress
								? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
								: "ゲスト"}
						</h1>
					</div>
				</div>
				<div className="flex gap-3">
					<button
						type="button"
						className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow-md transition-all relative"
						style={{ color: theme.colors.textSecondary }}
					>
						<Bell size={20} />
						<span
							className="absolute top-2 right-2 w-2 h-2 rounded-full border border-white"
							style={{ backgroundColor: theme.colors.accent }}
						></span>
					</button>
				</div>
			</header>

			{/* Main Content Container */}
			<main className="overflow-y-auto h-[calc(100vh-80px)] scrollbar-hide">
				{children}
			</main>

			{/* Bottom Navigation */}
			<nav
				className="absolute bottom-0 w-full border-t pb-6 pt-2 px-6 z-40 transition-colors duration-500 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]"
				style={{
					backgroundColor: `${theme.colors.surface}e6`,
					backdropFilter: "blur(10px)",
					borderColor: "#e2e8f0",
				}}
			>
				<div className="flex justify-between items-center">
					<button
						type="button"
						onClick={() => navigateTo("/app", "home")}
						className="flex flex-col items-center gap-1 w-12 transition-colors duration-300"
						style={{
							color: activeTab === "home" ? theme.colors.primary : "#94a3b8",
						}}
					>
						<Activity size={24} strokeWidth={activeTab === "home" ? 2.5 : 2} />
						<span className="text-[10px] font-bold">ホーム</span>
					</button>

					<button
						type="button"
						onClick={() => navigateTo("/app/card", "card")}
						className="flex flex-col items-center gap-1 w-12 transition-colors duration-300"
						style={{
							color: activeTab === "card" ? theme.colors.primary : "#94a3b8",
						}}
					>
						<Calendar size={24} strokeWidth={activeTab === "card" ? 2.5 : 2} />
						<span className="text-[10px] font-bold">記録</span>
					</button>

					<button
						type="button"
						onClick={() => navigateTo("/app/add", "add")}
						className="w-14 h-14 -mt-8 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform"
						style={{
							backgroundImage: `linear-gradient(to top right, ${theme.colors.primary}, ${theme.colors.secondary})`,
						}}
					>
						<Plus size={28} />
					</button>

					<button
						type="button"
						onClick={() => navigateTo("/app/medications", "files")}
						className="flex flex-col items-center gap-1 w-12 transition-colors duration-300"
						style={{
							color: activeTab === "files" ? theme.colors.primary : "#94a3b8",
						}}
					>
						<FileText size={24} strokeWidth={activeTab === "files" ? 2.5 : 2} />
						<span className="text-[10px] font-bold">データ</span>
					</button>

					<button
						type="button"
						onClick={() => navigateTo("/app/settings", "profile")}
						className="flex flex-col items-center gap-1 w-12 transition-colors duration-300"
						style={{
							color: activeTab === "profile" ? theme.colors.primary : "#94a3b8",
						}}
					>
						<User size={24} strokeWidth={activeTab === "profile" ? 2.5 : 2} />
						<span className="text-[10px] font-bold">私</span>
					</button>
				</div>
			</nav>

			{/* Background Decorative Blobs */}
			<div
				className="absolute top-20 -left-20 w-64 h-64 opacity-5 rounded-full blur-3xl pointer-events-none -z-10 transition-colors duration-1000"
				style={{ backgroundColor: theme.colors.primary }}
			></div>
			<div
				className="absolute bottom-40 -right-20 w-80 h-80 opacity-5 rounded-full blur-3xl pointer-events-none -z-10 transition-colors duration-1000"
				style={{ backgroundColor: theme.colors.accent }}
			></div>

			<style jsx global>{`
				.scrollbar-hide::-webkit-scrollbar {
					display: none;
				}
				.scrollbar-hide {
					-ms-overflow-style: none;
					scrollbar-width: none;
				}
			`}</style>
		</div>
	);
}
