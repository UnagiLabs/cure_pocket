'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useTranslations } from 'next-intl';
import { useConnectWallet, useCurrentAccount, useWallets } from '@mysten/dapp-kit';
import { Wallet, Globe } from 'lucide-react';
import { useState } from 'react';
import { locales, localeNames, type Locale } from '@/i18n/config';

export default function LandingPage() {
    const t = useTranslations();
    const router = useRouter();
    const params = useParams();
    const currentLocale = (params.locale as Locale) || 'en';
    const { walletAddress } = useApp();
    const [selectedLocale, setSelectedLocale] = useState<Locale>(currentLocale);

    // Mysten dApp Kitのフック
    const { mutate: connectWallet, isPending: isConnecting } = useConnectWallet();
    const currentAccount = useCurrentAccount();
    const wallets = useWallets();

    useEffect(() => {
        // If already connected, redirect to app
        if (walletAddress || currentAccount) {
            router.push(`/${currentLocale}/app`);
        }
    }, [walletAddress, currentAccount, router, currentLocale]);

    const handleConnect = () => {
        // 利用可能なウォレットのうち、最初のものを選択
        // 通常はSui Walletが利用可能
        const availableWallet = wallets[0];
        
        if (!availableWallet) {
            // ウォレットがインストールされていない場合
            alert(t('wallet.notInstalled'));
            return;
        }

        // 接続中の場合は処理をスキップ
        if (isConnecting) {
            return;
        }

        try {
            connectWallet(
                {
                    wallet: availableWallet,
                },
                {
                    onSuccess: () => {
                        // 接続成功後、アプリにリダイレクト
                        router.push(`/${selectedLocale}/app`);
                    },
                    onError: (error) => {
                        // エラーメッセージを取得
                        const errorMessage = error?.message || String(error) || '';
                        const errorString = errorMessage.toLowerCase();
                        
                        // ユーザーがリクエストを拒否した場合や、キャンセルした場合は静かに処理
                        if (
                            errorString.includes('user rejected') ||
                            errorString.includes('rejected') ||
                            errorString.includes('cancel') ||
                            errorString.includes('denied') ||
                            errorMessage === '' ||
                            errorMessage === '{}'
                        ) {
                            // ユーザーが意図的に拒否/キャンセルした場合は、エラーログを出力しない
                            return;
                        }
                        
                        // その他のエラーの場合のみ、エラーメッセージを表示
                        // ただし、ウォレット拡張機能の内部エラーは無視
                        if (!errorString.includes('dapp.connect') && !errorString.includes('query')) {
                            console.error('Failed to connect wallet:', error);
                            alert(t('wallet.connectionFailed'));
                        }
                    },
                },
            );
        } catch (error) {
            // 予期しないエラーをキャッチ
            const errorMessage = String(error || '').toLowerCase();
            if (!errorMessage.includes('dapp.connect') && !errorMessage.includes('query')) {
                console.error('Unexpected error during wallet connection:', error);
            }
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
              <h3 className="font-semibold text-gray-900">{t('landing.features.privacy.title')}</h3>
            </div>
            <p className="text-sm text-gray-600">
              {t('landing.features.privacy.description')}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center">
              <span className="mr-3 text-2xl">🌍</span>
              <h3 className="font-semibold text-gray-900">{t('landing.features.global.title')}</h3>
            </div>
            <p className="text-sm text-gray-600">
              {t('landing.features.global.description')}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center">
              <span className="mr-3 text-2xl">⛓️</span>
              <h3 className="font-semibold text-gray-900">{t('landing.features.blockchain.title')}</h3>
            </div>
            <p className="text-sm text-gray-600">
              {t('landing.features.blockchain.description')}
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
