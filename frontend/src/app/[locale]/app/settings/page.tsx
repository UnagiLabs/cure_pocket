"use client";

import { Check, Shield, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useApp } from "@/contexts/AppContext";
import { type Locale, localeNames, locales } from "@/i18n/config";
import { getTheme, themes } from "@/lib/themes";
import type { ThemeId } from "@/types";

export default function SettingsPage() {
	const t = useTranslations();
	const router = useRouter();
	const { settings, updateSettings, walletAddress } = useApp();
	const theme = getTheme(settings.theme);

	const handleThemeChange = (themeId: ThemeId) => {
		updateSettings({ theme: themeId });
	};

	const handleLanguageChange = (newLocale: Locale) => {
		updateSettings({ locale: newLocale });
		// Redirect to new locale
		router.push(`/${newLocale}/app/settings`);
	};

	const handleAnalyticsToggle = () => {
		updateSettings({ analyticsOptIn: !settings.analyticsOptIn });
	};

	return (
		<div className="px-4 md:px-8 lg:px-12 py-4 lg:py-8 pb-24 lg:pb-8">
			{/* Theme Section */}
			<div className="mb-8">
				<h2
					className="mb-4 text-lg font-bold md:text-xl"
					style={{ color: theme.colors.text }}
				>
					{t("settings.theme")}
				</h2>
				<div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
					{Object.values(themes).map((themeOption) => {
						const isSelected = settings.theme === themeOption.id;
						return (
							<button
								type="button"
								key={themeOption.id}
								onClick={() => handleThemeChange(themeOption.id)}
								className="relative overflow-hidden rounded-xl p-4 shadow-sm transition-transform active:scale-95 md:p-6 hover:shadow-md"
								style={{
									backgroundColor: themeOption.colors.surface,
									border: isSelected
										? `2px solid ${theme.colors.primary}`
										: `2px solid ${themeOption.colors.textSecondary}20`,
								}}
							>
								{isSelected && (
									<div
										className="absolute right-2 top-2 rounded-full p-1 md:p-1.5"
										style={{ backgroundColor: theme.colors.primary }}
									>
										<Check className="h-4 w-4 text-white md:h-5 md:w-5" />
									</div>
								)}
								<div
									className="mb-3 h-8 rounded-lg md:h-12"
									style={{
										background: `linear-gradient(135deg, ${themeOption.colors.primary}, ${themeOption.colors.secondary})`,
									}}
								/>
								<div
									className="text-sm font-medium md:text-base"
									style={{ color: themeOption.colors.text }}
								>
									{t(`themes.${themeOption.id}`)}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Language Section */}
			<div className="mb-8">
				<h2
					className="mb-4 text-lg font-bold"
					style={{ color: theme.colors.text }}
				>
					{t("settings.language")}
				</h2>
				<div className="space-y-2">
					{locales.map((locale) => {
						const isSelected = settings.locale === locale;
						return (
							<button
								type="button"
								key={locale}
								onClick={() => handleLanguageChange(locale)}
								className="flex w-full items-center justify-between rounded-xl p-4 shadow-sm transition-transform active:scale-95"
								style={{
									backgroundColor: theme.colors.surface,
									border: isSelected
										? `2px solid ${theme.colors.primary}`
										: `2px solid transparent`,
								}}
							>
								<span
									className="font-medium"
									style={{ color: theme.colors.text }}
								>
									{localeNames[locale]}
								</span>
								{isSelected && (
									<div
										className="rounded-full p-1"
										style={{ backgroundColor: theme.colors.primary }}
									>
										<Check className="h-4 w-4 text-white" />
									</div>
								)}
							</button>
						);
					})}
				</div>
			</div>

			{/* Privacy & Analytics Section */}
			<div className="mb-8">
				<h2
					className="mb-4 flex items-center text-lg font-bold"
					style={{ color: theme.colors.text }}
				>
					<TrendingUp
						className="mr-2 h-5 w-5"
						style={{ color: theme.colors.accent }}
					/>
					{t("settings.analyticsOptIn")}
				</h2>
				<div
					className="rounded-xl p-4 shadow-sm"
					style={{ backgroundColor: theme.colors.surface }}
				>
					<div className="mb-3 flex items-center justify-between">
						<span className="font-bold" style={{ color: theme.colors.text }}>
							{t("settings.researchContribution")}
						</span>
						<button
							type="button"
							onClick={handleAnalyticsToggle}
							className={`relative h-7 w-12 rounded-full transition-colors ${
								settings.analyticsOptIn ? "bg-green-500" : "bg-gray-300"
							}`}
						>
							<div
								className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
									settings.analyticsOptIn ? "translate-x-6" : "translate-x-1"
								}`}
							/>
						</button>
					</div>

					{settings.analyticsOptIn && (
						<div
							className="mb-3 rounded-lg p-3"
							style={{ backgroundColor: `${theme.colors.accent}20` }}
						>
							<div className="flex items-center justify-between">
								<span className="text-sm" style={{ color: theme.colors.text }}>
									{t("settings.earnedRewards")}
								</span>
								<span
									className="font-bold"
									style={{ color: theme.colors.accent }}
								>
									125 SUI 💰
								</span>
							</div>
						</div>
					)}

					<p className="text-sm" style={{ color: theme.colors.textSecondary }}>
						{t("settings.analyticsDescription")}
					</p>
				</div>
			</div>

			{/* Walrus Storage Status */}
			<div className="mb-8">
				<h2
					className="mb-4 flex items-center text-lg font-bold"
					style={{ color: theme.colors.text }}
				>
					<span className="mr-2 text-xl">🌐</span>
					{t("settings.walrusStorage")}
				</h2>
				<div
					className="rounded-xl p-4 shadow-sm"
					style={{ backgroundColor: theme.colors.surface }}
				>
					<div className="space-y-2">
						<div className="flex items-center text-sm">
							<div className="mr-2 h-2 w-2 rounded-full bg-green-500" />
							<span style={{ color: theme.colors.text }}>
								{t("settings.encrypted")}
							</span>
						</div>
						<div className="flex items-center text-sm">
							<div className="mr-2 h-2 w-2 rounded-full bg-green-500" />
							<span style={{ color: theme.colors.text }}>
								{t("settings.lastSyncRecent")}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Profile Section */}
			<div className="mb-8">
				<h2
					className="mb-4 text-lg font-bold"
					style={{ color: theme.colors.text }}
				>
					{t("settings.profile")}
				</h2>
				<button
					type="button"
					onClick={() => router.push(`/${settings.locale}/app/profile`)}
					className="flex w-full items-center justify-between rounded-xl p-4 shadow-sm transition-transform active:scale-95"
					style={{ backgroundColor: theme.colors.surface }}
				>
					<span className="font-medium" style={{ color: theme.colors.text }}>
						{t("settings.profileSettings")}
					</span>
					<span
						className="text-sm"
						style={{ color: theme.colors.textSecondary }}
					>
						→
					</span>
				</button>
			</div>

			{/* Wallet Info */}
			<div>
				<h2
					className="mb-4 text-lg font-bold"
					style={{ color: theme.colors.text }}
				>
					{t("settings.walletConnected")}
				</h2>
				<div
					className="rounded-xl p-4 shadow-sm"
					style={{ backgroundColor: theme.colors.surface }}
				>
					<div className="flex items-center">
						<Shield
							className="mr-3 h-6 w-6"
							style={{ color: theme.colors.primary }}
						/>
						<div>
							<div
								className="text-sm font-medium"
								style={{ color: theme.colors.text }}
							>
								{t("wallet.connected")}
							</div>
							<div
								className="text-xs"
								style={{ color: theme.colors.textSecondary }}
							>
								{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
