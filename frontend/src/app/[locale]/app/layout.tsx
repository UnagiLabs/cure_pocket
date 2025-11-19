'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useTranslations, useLocale } from 'next-intl';
import { Home, Plus, CreditCard, Settings, Menu, Wallet, LogOut } from 'lucide-react';
import { useState } from 'react';
import { getTheme } from '@/lib/themes';
import { useConnectWallet, useDisconnectWallet, useCurrentAccount, useWallets } from '@mysten/dapp-kit';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { walletAddress, settings } = useApp();
  const [activeTab, setActiveTab] = useState('home');
  const [showMenu, setShowMenu] = useState(false);
  const theme = getTheme(settings.theme);

  // Mysten dApp Kitのフック
  const { mutate: connectWallet, isPending: isConnecting } = useConnectWallet();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const currentAccount = useCurrentAccount();
  const wallets = useWallets();

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

  const handleConnectWallet = () => {
    const availableWallet = wallets[0];
    
    if (!availableWallet) {
      alert('Sui Walletがインストールされていません。\nhttps://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil からインストールしてください。');
      return;
    }

    connectWallet(
      {
        wallet: availableWallet,
      },
      {
        onSuccess: () => {
          // 接続成功
        },
        onError: (error) => {
          console.error('Failed to connect wallet:', error);
          alert('ウォレット接続に失敗しました。もう一度お試しください。');
        },
      },
    );
  };

  const handleDisconnectWallet = () => {
    disconnectWallet();
    router.push(`/${locale}`);
  };

  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 shadow-sm md:px-8"
        style={{ backgroundColor: theme.colors.primary }}
      >
        <div className="flex items-center flex-shrink-0">
          <span className="mr-2 text-2xl md:text-3xl">🏥</span>
          <span className="text-xl font-bold text-white md:text-2xl">{t('appName')}</span>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:gap-2 md:items-center md:flex-shrink-0">
            <button
              onClick={() => navigateTo('/app', 'home')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors whitespace-nowrap ${
                activeTab === 'home' ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
            >
              {t('tabs.home')}
            </button>
            <button
              onClick={() => navigateTo('/app/add', 'add')}
              className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/30 whitespace-nowrap"
            >
              {t('tabs.add')}
            </button>
            <button
              onClick={() => navigateTo('/app/card', 'card')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors whitespace-nowrap ${
                activeTab === 'card' ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
            >
              {t('tabs.card')}
            </button>
            <button
              onClick={() => navigateTo('/app/settings', 'settings')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors whitespace-nowrap ${
                activeTab === 'settings' ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
            >
              {t('tabs.settings')}
            </button>
          </nav>

          {/* Wallet Connect/Disconnect Button (Desktop) */}
          <div className="hidden md:flex md:items-center md:gap-2 md:ml-2 md:flex-shrink-0">
            {isWalletConnected ? (
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-white/20 px-2 py-1.5 text-xs font-medium text-white whitespace-nowrap">
                  {currentAccount?.address.slice(0, 6)}...{currentAccount?.address.slice(-4)}
                </span>
                <button
                  onClick={handleDisconnectWallet}
                  className="flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/30 whitespace-nowrap"
                  title="ウォレットを切断"
                >
                  <LogOut className="h-3 w-3" />
                  <span className="hidden lg:inline">{t('wallet.disconnect')}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/30 disabled:opacity-50 whitespace-nowrap"
              >
                <Wallet className="h-3 w-3" />
                <span className="hidden lg:inline">
                  {isConnecting ? t('wallet.connecting') : t('actions.connectWallet')}
                </span>
                <span className="lg:hidden">
                  {isConnecting ? t('wallet.connecting') : t('wallet.connect')}
                </span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-lg p-2 text-white transition-colors hover:bg-white/10 md:hidden flex-shrink-0"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-2xl">{children}</div>
      </div>

      {/* Bottom Navigation (Mobile Only) */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t md:hidden"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.textSecondary + '20',
        }}
      >
        <div className="flex justify-around py-2">
          <button
            onClick={() => navigateTo('/app', 'home')}
            className={`flex flex-col items-center p-2 transition-colors ${
              activeTab === 'home'
                ? ''
                : 'opacity-50'
            }`}
            style={{
              color: activeTab === 'home' ? theme.colors.primary : theme.colors.textSecondary,
            }}
          >
            <Home className="h-6 w-6" />
            <span className="mt-1 text-xs">{t('tabs.home')}</span>
          </button>

          <button
            onClick={() => navigateTo('/app/add', 'add')}
            className="flex flex-col items-center p-2"
          >
            <div
              className="mb-1 rounded-full p-2"
              style={{ backgroundColor: theme.colors.accent }}
            >
              <Plus className="h-5 w-5 text-white" />
            </div>
            <span
              className="text-xs"
              style={{ color: theme.colors.textSecondary }}
            >
              {t('tabs.add')}
            </span>
          </button>

          <button
            onClick={() => navigateTo('/app/card', 'card')}
            className={`flex flex-col items-center p-2 transition-colors ${
              activeTab === 'card'
                ? ''
                : 'opacity-50'
            }`}
            style={{
              color: activeTab === 'card' ? theme.colors.primary : theme.colors.textSecondary,
            }}
          >
            <CreditCard className="h-6 w-6" />
            <span className="mt-1 text-xs">{t('tabs.card')}</span>
          </button>

          <button
            onClick={() => navigateTo('/app/settings', 'settings')}
            className={`flex flex-col items-center p-2 transition-colors ${
              activeTab === 'settings'
                ? ''
                : 'opacity-50'
            }`}
            style={{
              color: activeTab === 'settings' ? theme.colors.primary : theme.colors.textSecondary,
            }}
          >
            <Settings className="h-6 w-6" />
            <span className="mt-1 text-xs">{t('tabs.settings')}</span>
          </button>
        </div>
      </div>

      {/* Menu Overlay (Mobile Only) */}
      {showMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="absolute right-0 top-20 w-64 rounded-l-xl p-4 shadow-lg"
            style={{ backgroundColor: theme.colors.surface }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              <button className="w-full rounded-lg p-3 text-left transition-colors hover:bg-gray-100">
                <div className="font-medium">{t('settings.profile')}</div>
              </button>
              <button className="w-full rounded-lg p-3 text-left transition-colors hover:bg-gray-100">
                <div className="font-medium">{t('settings.dataExport')}</div>
              </button>
              <button className="w-full rounded-lg p-3 text-left transition-colors hover:bg-gray-100">
                <div className="font-medium">{t('settings.language')}</div>
              </button>
              <div className="border-t pt-3" style={{ borderColor: theme.colors.textSecondary + '20' }}>
                {isWalletConnected ? (
                  <div className="space-y-2">
                    <div className="px-3 text-sm" style={{ color: theme.colors.textSecondary }}>
                      <div>{t('settings.walletConnected')}</div>
                      <div className="mt-1 text-xs font-mono">
                        {currentAccount?.address.slice(0, 8)}...{currentAccount?.address.slice(-6)}
                      </div>
                    </div>
                    <button
                      onClick={handleDisconnectWallet}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 p-2 text-sm font-medium transition-colors"
                      style={{
                        borderColor: theme.colors.textSecondary + '40',
                        color: theme.colors.text,
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      {t('wallet.disconnect')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleConnectWallet}
                    disabled={isConnecting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 p-2 text-sm font-medium transition-colors disabled:opacity-50"
                    style={{
                      borderColor: theme.colors.primary,
                      backgroundColor: theme.colors.primary + '10',
                      color: theme.colors.primary,
                    }}
                  >
                    <Wallet className="h-4 w-4" />
                    {isConnecting ? t('wallet.connecting') : t('actions.connectWallet')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
