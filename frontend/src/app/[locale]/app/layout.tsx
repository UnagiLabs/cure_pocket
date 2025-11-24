"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { Activity, Bell, Calendar, FileText, Plus, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
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
	const pathname = usePathname();
	const locale = useLocale();
	const { walletAddress, settings } = useApp();
	const [activeTab, setActiveTab] = useState("home");
	const theme = getTheme(settings.theme);
	const currentAccount = useCurrentAccount();

	// ウォレット接続状態（dApp Kitから取得）
	const isWalletConnected = currentAccount !== null;

	// Update active tab based on pathname
	useEffect(() => {
		if (pathname.includes("/vitals")) {
			setActiveTab("vitals");
		} else if (pathname.includes("/card")) {
			setActiveTab("card");
		} else if (pathname.includes("/data")) {
			setActiveTab("files");
		} else if (pathname.includes("/medications")) {
			// legacy route fallback
			setActiveTab("files");
		} else if (pathname.includes("/settings")) {
			setActiveTab("settings");
		} else if (pathname.includes("/profile")) {
			setActiveTab("profile");
		} else if (pathname.includes("/add")) {
			setActiveTab("add");
		} else if (pathname.endsWith("/app")) {
			setActiveTab("home");
		}
	}, [pathname]);

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
			className="relative flex min-h-screen w-full transition-colors duration-500"
			style={{
				backgroundColor: theme.colors.background,
				color: theme.colors.text,
			}}
		>
			{/* Desktop Sidebar Navigation */}
			<aside
				className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-50 border-r transition-colors duration-500"
				style={{
					backgroundColor: theme.colors.surface,
					borderColor: `${theme.colors.textSecondary}20`,
				}}
			>
				{/* Logo/Brand */}
				<div
					className="px-6 py-8 border-b"
					style={{ borderColor: `${theme.colors.textSecondary}20` }}
				>
					<div className="flex items-center gap-3">
						<div
							className="w-12 h-12 rounded-xl bg-gradient-to-tr flex items-center justify-center text-white shadow-lg"
							style={{
								backgroundImage: `linear-gradient(to top right, ${theme.colors.primary}, ${theme.colors.secondary})`,
							}}
						>
							<Activity size={24} strokeWidth={2.5} />
						</div>
						<div>
							<h1
								className="text-lg font-bold"
								style={{ color: theme.colors.text }}
							>
								CurePocket
							</h1>
							<p
								className="text-xs"
								style={{ color: theme.colors.textSecondary }}
							>
								Health Passport
							</p>
						</div>
					</div>
				</div>

				{/* Profile Section */}
				<div
					className="px-6 py-6 border-b"
					style={{ borderColor: `${theme.colors.textSecondary}20` }}
				>
					<div className="flex items-center gap-3">
						<div
							className="w-12 h-12 rounded-full bg-gradient-to-tr flex items-center justify-center text-white shadow-md"
							style={{
								backgroundImage:
									theme.id === "midnight-travel"
										? `linear-gradient(to top right, ${theme.colors.primary}, #0F172A)`
										: `linear-gradient(to top right, #1A365D, #2c5282)`,
							}}
						>
							<span className="font-bold">
								{walletAddress ? walletAddress.slice(0, 2).toUpperCase() : "U"}
							</span>
						</div>
						<div className="flex-1 min-w-0">
							<p
								className="text-xs"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("home.greetingShort")}
							</p>
							<h2
								className="text-sm font-bold truncate"
								style={{ color: theme.colors.text }}
							>
								{walletAddress
									? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
									: t("home.guest")}
							</h2>
						</div>
					</div>
				</div>

				{/* Navigation Links */}
				<nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
					<button
						type="button"
						onClick={() => navigateTo("/app", "home")}
						className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:translate-x-1"
						style={{
							backgroundColor:
								activeTab === "home"
									? `${theme.colors.primary}15`
									: "transparent",
							color:
								activeTab === "home" ? theme.colors.primary : theme.colors.text,
						}}
					>
						<Activity size={20} strokeWidth={activeTab === "home" ? 2.5 : 2} />
						<span className="font-medium">{t("tabs.home")}</span>
					</button>

					<button
						type="button"
						onClick={() => navigateTo("/app/card", "card")}
						className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:translate-x-1"
						style={{
							backgroundColor:
								activeTab === "card"
									? `${theme.colors.primary}15`
									: "transparent",
							color:
								activeTab === "card" ? theme.colors.primary : theme.colors.text,
						}}
					>
						<Calendar size={20} strokeWidth={activeTab === "card" ? 2.5 : 2} />
						<span className="font-medium">{t("home.share")}</span>
					</button>

					<button
						type="button"
						onClick={() => navigateTo("/app/data", "files")}
						className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:translate-x-1"
						style={{
							backgroundColor:
								activeTab === "files"
									? `${theme.colors.primary}15`
									: "transparent",
							color:
								activeTab === "files"
									? theme.colors.primary
									: theme.colors.text,
						}}
					>
						<FileText size={20} strokeWidth={activeTab === "files" ? 2.5 : 2} />
						<span className="font-medium">{t("tabs.data")}</span>
					</button>

					<button
						type="button"
						onClick={() => navigateTo("/app/settings", "profile")}
						className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:translate-x-1"
						style={{
							backgroundColor:
								activeTab === "profile"
									? `${theme.colors.primary}15`
									: "transparent",
							color:
								activeTab === "profile"
									? theme.colors.primary
									: theme.colors.text,
						}}
					>
						<User size={20} strokeWidth={activeTab === "profile" ? 2.5 : 2} />
						<span className="font-medium">{t("tabs.profile")}</span>
					</button>

					<div
						className="pt-4 mt-4 border-t"
						style={{ borderColor: `${theme.colors.textSecondary}20` }}
					>
						<button
							type="button"
							onClick={() => navigateTo("/app/add", "add")}
							className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
							style={{
								backgroundImage: `linear-gradient(to top right, ${theme.colors.primary}, ${theme.colors.secondary})`,
							}}
						>
							<Plus size={20} />
							<span>{t("tabs.addNew")}</span>
						</button>
					</div>
				</nav>
			</aside>

			{/* Main Content Area */}
			<div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
				{/* Mobile Header */}
				<header
					className="lg:hidden px-6 pt-8 pb-2 flex justify-between items-center sticky top-0 z-30 transition-colors duration-500"
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
							<p
								className="text-xs"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("home.greetingShort")}
							</p>
							<h1
								className="text-lg font-bold leading-tight"
								style={{ color: theme.colors.text }}
							>
								{walletAddress
									? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
									: t("home.guest")}
							</h1>
						</div>
					</div>
					<div className="flex gap-3 items-center">
						<WalletButton size="small" variant="mobile" />
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

				{/* Desktop Top Bar */}
				<div
					className="hidden lg:block sticky top-0 z-20 border-b py-4 px-8 backdrop-blur-sm"
					style={{
						backgroundColor: `${theme.colors.background}f0`,
						borderColor: `${theme.colors.textSecondary}20`,
					}}
				>
					<div className="flex items-center justify-between">
						<div>
							<h1
								className="text-2xl font-bold"
								style={{ color: theme.colors.text }}
							>
								{activeTab === "home" && t("tabs.home")}
								{activeTab === "vitals" && t("tabs.vitals")}
								{activeTab === "card" && t("home.share")}
								{activeTab === "files" && t("tabs.data")}
								{activeTab === "settings" && t("tabs.settings")}
								{activeTab === "profile" && t("tabs.profile")}
								{activeTab === "add" && t("tabs.addNew")}
							</h1>
						</div>
						<div className="flex items-center gap-4">
							<WalletButton size="medium" variant="desktop" />
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
					</div>
				</div>

				{/* Main Content Container */}
				<main className="flex-1 overflow-y-auto lg:h-auto pb-24 lg:pb-0">
					<div className="lg:max-w-7xl lg:mx-auto">{children}</div>
				</main>

				{/* Mobile Bottom Navigation */}
				<nav
					className="lg:hidden fixed bottom-0 left-0 right-0 w-full border-t pb-6 pt-2 px-6 z-40 transition-colors duration-500 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]"
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
							<Activity
								size={24}
								strokeWidth={activeTab === "home" ? 2.5 : 2}
							/>
							<span className="text-[10px] font-bold">{t("tabs.home")}</span>
						</button>

						<button
							type="button"
							onClick={() => navigateTo("/app/card", "card")}
							className="flex flex-col items-center gap-1 w-12 transition-colors duration-300"
							style={{
								color: activeTab === "card" ? theme.colors.primary : "#94a3b8",
							}}
						>
							<Calendar
								size={24}
								strokeWidth={activeTab === "card" ? 2.5 : 2}
							/>
							<span className="text-[10px] font-bold">{t("home.share")}</span>
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
							onClick={() => navigateTo("/app/data", "files")}
							className="flex flex-col items-center gap-1 w-12 transition-colors duration-300"
							style={{
								color: activeTab === "files" ? theme.colors.primary : "#94a3b8",
							}}
						>
							<FileText
								size={24}
								strokeWidth={activeTab === "files" ? 2.5 : 2}
							/>
							<span className="text-[10px] font-bold">{t("tabs.data")}</span>
						</button>

						<button
							type="button"
							onClick={() => navigateTo("/app/settings", "profile")}
							className="flex flex-col items-center gap-1 w-12 transition-colors duration-300"
							style={{
								color:
									activeTab === "profile" ? theme.colors.primary : "#94a3b8",
							}}
						>
							<User size={24} strokeWidth={activeTab === "profile" ? 2.5 : 2} />
							<span className="text-[10px] font-bold">{t("tabs.profile")}</span>
						</button>
					</div>
				</nav>
			</div>

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
