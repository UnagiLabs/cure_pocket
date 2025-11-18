'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useTranslations } from 'next-intl';
import { walletService } from '@/lib/walletService';
import { Wallet, Globe } from 'lucide-react';
import { useState } from 'react';
import { locales, localeNames, type Locale } from '@/i18n/config';

export default function LandingPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const currentLocale = (params.locale as Locale) || 'en';
  const { walletAddress, setWalletAddress } = useApp();
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<Locale>(currentLocale);

  useEffect(() => {
    // If already connected, redirect to app
    if (walletAddress) {
      router.push(`/${currentLocale}/app`);
    }
  }, [walletAddress, router, currentLocale]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const address = await walletService.connect();
      setWalletAddress(address);
      router.push(`/${selectedLocale}/app`);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLanguageChange = (newLocale: Locale) => {
    setSelectedLocale(newLocale);
    // Update URL with new locale
    router.push(`/${newLocale}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <main className="flex w-full max-w-md flex-col items-center justify-center px-6 py-12">
        {/* Logo and Title */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center">
            <span className="text-6xl">🏥</span>
          </div>
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            {t('appName')}
          </h1>
          <p className="text-lg text-gray-600">
            {t('tagline')}
          </p>
        </div>

        {/* Features */}
        <div className="mb-8 w-full space-y-4">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center">
              <span className="mr-3 text-2xl">🔒</span>
              <h3 className="font-semibold text-gray-900">Privacy-First</h3>
            </div>
            <p className="text-sm text-gray-600">
              Your medication data is encrypted and stored on Walrus
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center">
              <span className="mr-3 text-2xl">🌍</span>
              <h3 className="font-semibold text-gray-900">Global Access</h3>
            </div>
            <p className="text-sm text-gray-600">
              Access your medication passport anywhere, anytime
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center">
              <span className="mr-3 text-2xl">⛓️</span>
              <h3 className="font-semibold text-gray-900">Blockchain Powered</h3>
            </div>
            <p className="text-sm text-gray-600">
              Built on Sui blockchain for security and transparency
            </p>
          </div>
        </div>

        {/* Connect Wallet Button */}
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="mb-6 flex w-full items-center justify-center rounded-xl bg-blue-500 px-6 py-4 font-semibold text-white shadow-lg transition-all hover:bg-blue-600 active:scale-95 disabled:opacity-50"
        >
          <Wallet className="mr-2 h-5 w-5" />
          {isConnecting ? t('wallet.connecting') : t('actions.connectWallet')}
        </button>

        {/* Language Selector */}
        <div className="w-full">
          <div className="mb-2 flex items-center justify-center text-sm text-gray-600">
            <Globe className="mr-2 h-4 w-4" />
            {t('settings.language')}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {locales.map((locale) => (
              <button
                key={locale}
                onClick={() => handleLanguageChange(locale)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedLocale === locale
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {localeNames[locale]}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>Powered by Sui & Walrus</p>
        </div>
      </main>
    </div>
  );
}
