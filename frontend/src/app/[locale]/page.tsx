"use client";

import {
	useConnectWallet,
	useCurrentAccount,
	useWallets,
} from "@mysten/dapp-kit";
import {
	ArrowRight,
	Database,
	Globe as GlobeIcon,
	Heart,
	Lock,
	Shield,
	Sparkles,
	Zap,
} from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { type Locale, localeNames, locales } from "@/i18n/config";

export default function LandingPage() {
	const t = useTranslations();
	const router = useRouter();
	const params = useParams();
	const currentLocale = (params.locale as Locale) || "en";
	const { walletAddress } = useApp();
	const [selectedLocale, setSelectedLocale] = useState<Locale>(currentLocale);
	const [isScrolled, setIsScrolled] = useState(false);

	const { mutate: connectWallet, isPending: isConnecting } = useConnectWallet();
	const currentAccount = useCurrentAccount();
	const wallets = useWallets();

	useEffect(() => {
		if (walletAddress || currentAccount) {
			router.push(`/${currentLocale}/app`);
		}
	}, [walletAddress, currentAccount, router, currentLocale]);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20);
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const handleConnect = () => {
		const availableWallet = wallets[0];

		if (!availableWallet) {
			alert(t("wallet.notInstalled"));
			return;
		}

		connectWallet(
			{
				wallet: availableWallet,
			},
			{
				onSuccess: () => {
					router.push(`/${selectedLocale}/app/passport`);
				},
				onError: (error) => {
					const errorMessage = error?.message || String(error);
					if (
						errorMessage.includes("User rejected") ||
						errorMessage.includes("rejected")
					) {
						return;
					}
					console.error("Failed to connect wallet:", error);
					alert(t("wallet.connectionFailed"));
				},
			},
		);
	};

	const handleLanguageChange = (newLocale: Locale) => {
		setSelectedLocale(newLocale);
		router.push(`/${newLocale}`);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-teal-50/50 via-white to-cyan-50/30 relative overflow-hidden">
			{/* Animated Background Elements */}
			<div className="fixed inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-20 left-10 w-72 h-72 bg-teal-200/20 rounded-full blur-3xl animate-pulse"></div>
				<div
					className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl animate-pulse"
					style={{ animationDelay: "1s" }}
				></div>
				<div
					className="absolute top-1/2 left-1/2 w-64 h-64 bg-coral-200/10 rounded-full blur-3xl animate-pulse"
					style={{ animationDelay: "2s" }}
				></div>
			</div>

			{/* Floating Header with Glassmorphism */}
			<header
				className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
					isScrolled
						? "bg-white/70 backdrop-blur-xl shadow-lg shadow-teal-500/5"
						: "bg-transparent"
				}`}
			>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16 sm:h-20">
						<div
							className="flex items-center gap-3 group cursor-pointer"
							onClick={() => {
								// ランディングページから /app に遷移
								router.push(`/${selectedLocale}/app`);
							}}
						>
							<div className="relative">
								<div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
								<Image
									src="/icon.png"
									alt="CurePocket"
									width={40}
									height={40}
									className="rounded-xl relative"
								/>
							</div>
							<span className="text-xl sm:text-2xl font-bold text-gray-800 hover:text-teal-600 transition-colors duration-300">
								{t("appName")}
							</span>
						</div>

						{/* Language Selector - Desktop */}
						<div className="hidden sm:flex items-center gap-2">
							{locales.map((locale) => (
								<button
									type="button"
									key={locale}
									onClick={() => handleLanguageChange(locale)}
									className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
										selectedLocale === locale
											? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/30 scale-105"
											: "text-gray-600 hover:bg-teal-50 hover:text-teal-600"
									}`}
								>
									{localeNames[locale]}
								</button>
							))}
						</div>

						{/* Language Selector - Mobile */}
						<div className="sm:hidden">
							<select
								value={selectedLocale}
								onChange={(e) => handleLanguageChange(e.target.value as Locale)}
								className="px-3 py-2 rounded-xl border border-teal-200 text-sm font-medium bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
							>
								{locales.map((locale) => (
									<option key={locale} value={locale}>
										{localeNames[locale]}
									</option>
								))}
							</select>
						</div>
					</div>
				</div>
			</header>

			{/* Hero Section */}
			<section className="relative pt-32 sm:pt-40 pb-8 sm:pb-12 px-4 sm:px-6 lg:px-8">
				<div className="max-w-6xl mx-auto text-center relative z-10">
					{/* Cute Badge with Animation */}
					<div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200/50 mb-6 sm:mb-8 backdrop-blur-sm shadow-lg shadow-teal-500/10 animate-bounce-slow">
						<Sparkles className="w-4 h-4 text-teal-600 animate-pulse" />
						<span className="text-sm font-semibold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
							Powered by Sui & Walrus 🐋
						</span>
					</div>

					{/* Main Heading with Gradient */}
					<h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 leading-tight tracking-tight">
						<span className="bg-gradient-to-r from-teal-600 via-cyan-500 to-teal-500 bg-clip-text text-transparent inline-block animate-gradient">
							{t("tagline")}
						</span>
					</h1>

					<p className="text-lg sm:text-xl md:text-2xl text-gray-700 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed px-4 font-medium">
						{t("landing.about.description")}
					</p>

					{/* CTA Button with Glassmorphism */}
					<div className="relative inline-block group mb-6 sm:mb-8">
						<div className="absolute -inset-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-500 rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition duration-300 animate-gradient-slow"></div>
						<button
							type="button"
							onClick={handleConnect}
							disabled={isConnecting}
							className="relative inline-flex items-center gap-3 px-8 sm:px-12 py-4 sm:py-5 text-base sm:text-lg font-bold text-white bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl shadow-xl shadow-teal-500/30 hover:shadow-2xl hover:shadow-teal-500/50 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
						>
							<Zap className="w-5 h-5" />
							<span>{isConnecting ? t("wallet.connecting") : "Start App"}</span>
							<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
						</button>
					</div>

					{/* Trust Indicators - Icon Only */}
					<div className="flex justify-center items-center gap-3 sm:gap-4 max-w-4xl mx-auto">
						{[
							{ icon: Shield, label: "Secure & Private" },
							{ icon: Lock, label: "Encrypted Data" },
							{ icon: GlobeIcon, label: "Global Access" },
						].map((item, index) => (
							<div
								key={item.label}
								className="group relative p-3 sm:p-4 rounded-2xl bg-white/60 backdrop-blur-md border border-teal-100/50 shadow-lg shadow-teal-500/5 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300 hover:scale-110"
								style={{ animationDelay: `${index * 100}ms` }}
								title={item.label}
							>
								<item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Features Section with Glassmorphism Cards */}
			<section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative">
				<div className="max-w-6xl mx-auto relative z-10">
					<div className="text-center mb-12 sm:mb-16">
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
							<span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
								{t("landing.about.title")}
							</span>
						</h2>
						<p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto font-medium">
							Your health data, always with you ✨
						</p>
					</div>

					<div className="grid sm:grid-cols-2 gap-4 sm:gap-8 max-w-4xl mx-auto">
						{(t.raw("landing.about.features") as string[]).map(
							(feature, index) => {
								const icons = [Database, Lock, Heart, Zap];
								const Icon = icons[index % icons.length];
								const gradients = [
									"from-teal-500 to-cyan-500",
									"from-cyan-500 to-blue-500",
									"from-teal-600 to-emerald-500",
									"from-cyan-600 to-teal-600",
								];

								return (
									<div
										key={feature}
										className="group relative p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/70 backdrop-blur-md border-2 border-teal-100/50 hover:border-teal-300/50 shadow-xl shadow-teal-500/5 hover:shadow-2xl hover:shadow-teal-500/10 transition-all duration-300 hover:scale-105 hover:-translate-y-1"
										style={{ animationDelay: `${index * 100}ms` }}
									>
										<div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-100/30 to-cyan-100/30 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

										<div
											className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${gradients[index]} flex items-center justify-center mb-3 sm:mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`}
										>
											<Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
										</div>

										<p className="relative text-sm sm:text-lg text-gray-700 leading-relaxed font-medium">
											{feature}
										</p>
									</div>
								);
							},
						)}
					</div>
				</div>
			</section>

			{/* How It Works Section */}
			<section className="py-12 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-teal-50/30 to-white">
				<div className="max-w-4xl mx-auto">
					<div className="text-center mb-8 sm:mb-16">
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
							<span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
								{t("landing.howToStart.title")}
							</span>
						</h2>
						<p className="text-base sm:text-xl text-gray-600 font-medium">
							Get started in minutes ⚡
						</p>
					</div>

					<div className="space-y-4 sm:space-y-8">
						{[
							{ step: "1", text: t("landing.howToStart.step1"), emoji: "👛" },
							{ step: "2", text: t("landing.howToStart.step2"), emoji: "🎫" },
							{ step: "3", text: t("landing.howToStart.step3"), emoji: "✨" },
						].map((item, index) => (
							<div
								key={item.step}
								className="group relative flex gap-3 sm:gap-6 items-start p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/80 backdrop-blur-sm border-2 border-teal-100/50 hover:border-teal-300/50 shadow-xl shadow-teal-500/5 hover:shadow-2xl hover:shadow-teal-500/10 transition-all duration-300 hover:scale-102 hover:-translate-y-1"
								style={{ animationDelay: `${index * 150}ms` }}
							>
								<div className="hidden sm:block absolute -left-3 -top-3 text-4xl opacity-20 group-hover:opacity-40 transition-opacity">
									{item.emoji}
								</div>

								<div className="flex-shrink-0 relative">
									<div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-xl sm:rounded-2xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
									<div className="relative w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold text-base sm:text-xl shadow-lg shadow-teal-500/30">
										{item.step}
									</div>
								</div>

								<p className="text-sm sm:text-lg text-gray-700 pt-2 sm:pt-3 leading-relaxed font-medium flex-1">
									{item.text}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Final CTA Section with Glassmorphism */}
			<section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-teal-100/30 via-cyan-100/30 to-blue-100/30"></div>
				<div className="absolute top-10 left-10 w-64 h-64 bg-teal-300/30 rounded-full blur-3xl animate-pulse"></div>
				<div
					className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-300/30 rounded-full blur-3xl animate-pulse"
					style={{ animationDelay: "1s" }}
				></div>

				<div className="max-w-4xl mx-auto text-center relative z-10">
					<div className="relative p-8 sm:p-12 rounded-3xl bg-white/40 backdrop-blur-2xl border-2 border-white/60 shadow-2xl shadow-teal-500/20">
						<div className="absolute -top-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full shadow-lg">
							<span className="text-white font-bold text-sm">
								🎉 Join Us Today!
							</span>
						</div>

						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 mt-4">
							<span className="bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
								Ready to take control?
							</span>
						</h2>

						<p className="text-lg sm:text-xl text-gray-700 mb-8 sm:mb-10 max-w-2xl mx-auto font-medium">
							Join the future of healthcare data management 🚀
						</p>

						<div className="relative inline-block group">
							<div className="absolute -inset-2 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-500 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition duration-300 animate-gradient-slow"></div>
							<button
								type="button"
								onClick={handleConnect}
								disabled={isConnecting}
								className="relative inline-flex items-center gap-3 px-10 sm:px-14 py-5 sm:py-6 text-base sm:text-lg font-bold text-white bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
							>
								<Sparkles className="w-5 h-5 animate-pulse" />
								<span>
									{isConnecting ? t("wallet.connecting") : "Start App Now"}
								</span>
								<ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
							</button>
						</div>

						<p className="mt-6 text-sm text-gray-600 font-medium">
							No credit card required • Free to start • Secure & Private 🔒
						</p>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 border-t border-teal-100/50 bg-gradient-to-b from-white to-teal-50/30">
				<div className="max-w-6xl mx-auto text-center">
					<div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 mb-6">
						<div
							className="flex items-center gap-3 group cursor-pointer"
							onClick={() => {
								// フッターのロゴからも /app に遷移
								router.push(`/${selectedLocale}/app`);
							}}
						>
							<div className="relative">
								<div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
								<Image
									src="/icon.png"
									alt="CurePocket"
									width={32}
									height={32}
									className="rounded-xl relative"
								/>
							</div>
							<span className="text-lg font-bold text-gray-800 group-hover:text-teal-600 transition-colors duration-300">
								{t("appName")}
							</span>
						</div>
						<div className="flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-100">
							<span className="text-sm font-medium text-teal-700">
								Powered by Sui & Walrus 🐋
							</span>
						</div>
					</div>
					<p className="text-sm text-gray-600 font-medium">
						© 2025 UnagiLabs. Your health, your data, your control. ✨
					</p>
				</div>
			</footer>

			{/* Custom Animations CSS */}
			<style jsx global>{`
				@keyframes bounce-slow {
					0%, 100% {
						transform: translateY(0);
					}
					50% {
						transform: translateY(-10px);
					}
				}

				@keyframes gradient {
					0% {
						background-position: 0% 50%;
					}
					50% {
						background-position: 100% 50%;
					}
					100% {
						background-position: 0% 50%;
					}
				}

				@keyframes gradient-slow {
					0% {
						background-position: 0% 50%;
					}
					50% {
						background-position: 100% 50%;
					}
					100% {
						background-position: 0% 50%;
					}
				}

				.animate-bounce-slow {
					animation: bounce-slow 3s ease-in-out infinite;
				}

				.animate-gradient {
					background-size: 200% 200%;
					animation: gradient 3s ease infinite;
				}

				.animate-gradient-slow {
					background-size: 200% 200%;
					animation: gradient-slow 5s ease infinite;
				}

				.hover:scale-102:hover {
					transform: scale(1.02);
				}

				.hover:shadow-3xl:hover {
					box-shadow: 0 35px 60px -15px rgba(0, 0, 0, 0.3);
				}
			`}</style>
		</div>
	);
}
