"use client";

import {
	useConnectWallet,
	useCurrentAccount,
	useWallets,
} from "@mysten/dapp-kit";
import { ArrowRight, Shield, Globe as GlobeIcon, Heart, Lock, Sparkles } from "lucide-react";
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
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
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
		<div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
			{/* Floating Header */}
			<header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
				isScrolled ? 'bg-white/80 backdrop-blur-xl shadow-sm' : 'bg-transparent'
			}`}>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16 sm:h-20">
						<div className="flex items-center gap-3">
							<Image
								src="/icon.png"
								alt="CurePocket"
								width={40}
								height={40}
								className="rounded-xl"
							/>
							<span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
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
									className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
										selectedLocale === locale
											? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
											: "text-gray-600 hover:bg-gray-100"
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
								className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
			<section className="relative pt-32 sm:pt-40 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
				{/* Background Decoration */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-blue-100/40 to-transparent rounded-full blur-3xl -z-10" />

				<div className="max-w-4xl mx-auto text-center">
					{/* Badge */}
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-6 sm:mb-8">
						<Sparkles className="w-4 h-4 text-blue-600" />
						<span className="text-sm font-medium text-blue-700">
							Powered by Sui & Walrus
						</span>
					</div>

					{/* Main Heading */}
					<h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight tracking-tight">
						{t("tagline")}
					</h1>

					<p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-4">
						{t("landing.about.description")}
					</p>

					{/* CTA Button */}
					<button
						type="button"
						onClick={handleConnect}
						disabled={isConnecting}
						className="group relative inline-flex items-center gap-3 px-8 sm:px-10 py-4 sm:py-5 text-base sm:text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
					>
						<span>{isConnecting ? t("wallet.connecting") : "Start App"}</span>
						<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
					</button>

					{/* Trust Indicators */}
					<div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 mt-12 sm:mt-16 text-sm text-gray-500">
						<div className="flex items-center gap-2">
							<Shield className="w-4 h-4 text-blue-600" />
							<span>Secure & Private</span>
						</div>
						<div className="flex items-center gap-2">
							<Lock className="w-4 h-4 text-blue-600" />
							<span>Encrypted Data</span>
						</div>
						<div className="flex items-center gap-2">
							<GlobeIcon className="w-4 h-4 text-blue-600" />
							<span>Global Access</span>
						</div>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white">
				<div className="max-w-6xl mx-auto">
					<div className="text-center mb-12 sm:mb-16">
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
							{t("landing.about.title")}
						</h2>
						<p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
							Your health data, always with you
						</p>
					</div>

					<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
						{(t.raw("landing.about.features") as string[]).map((feature, index) => (
							<div
								key={feature}
								className="group p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/50 border border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300"
								style={{ animationDelay: `${index * 100}ms` }}
							>
								<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
									<Heart className="w-6 h-6 text-white" />
								</div>
								<p className="text-base sm:text-lg text-gray-700 leading-relaxed">
									{feature}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* How It Works Section */}
			<section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
				<div className="max-w-4xl mx-auto">
					<div className="text-center mb-12 sm:mb-16">
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
							{t("landing.howToStart.title")}
						</h2>
						<p className="text-lg sm:text-xl text-gray-600">
							Get started in minutes
						</p>
					</div>

					<div className="space-y-6 sm:space-y-8">
						{[
							{ step: "1", text: t("landing.howToStart.step1") },
							{ step: "2", text: t("landing.howToStart.step2") },
							{ step: "3", text: t("landing.howToStart.step3") }
						].map((item, index) => (
							<div
								key={item.step}
								className="flex gap-4 sm:gap-6 items-start p-6 sm:p-8 rounded-2xl bg-white border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300"
								style={{ animationDelay: `${index * 150}ms` }}
							>
								<div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-600/30">
									{item.step}
								</div>
								<p className="text-base sm:text-lg text-gray-700 pt-2 leading-relaxed">
									{item.text}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Final CTA Section */}
			<section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
				<div className="max-w-4xl mx-auto text-center">
					<div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-2xl shadow-blue-600/30">
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6">
							Ready to take control?
						</h2>
						<p className="text-lg sm:text-xl text-blue-100 mb-8 sm:mb-10 max-w-2xl mx-auto">
							Join the future of healthcare data management
						</p>
						<button
							type="button"
							onClick={handleConnect}
							disabled={isConnecting}
							className="inline-flex items-center gap-3 px-8 sm:px-10 py-4 sm:py-5 text-base sm:text-lg font-semibold text-blue-600 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
						>
							<span>{isConnecting ? t("wallet.connecting") : "Start App"}</span>
							<ArrowRight className="w-5 h-5" />
						</button>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
				<div className="max-w-6xl mx-auto text-center">
					<div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 mb-6">
						<div className="flex items-center gap-2">
							<Image
								src="/icon.png"
								alt="CurePocket"
								width={32}
								height={32}
								className="rounded-lg"
							/>
							<span className="text-lg font-bold text-gray-900">
								{t("appName")}
							</span>
						</div>
						<div className="text-sm text-gray-500">
							Powered by Sui & Walrus
						</div>
					</div>
					<p className="text-sm text-gray-500">
						© 2025 CurePocket. Your health, your data, your control.
					</p>
				</div>
			</footer>
		</div>
	);
}
