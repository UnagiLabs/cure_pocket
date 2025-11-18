'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useTranslations, useLocale } from 'next-intl';
import { Home, Plus, CreditCard, Settings, Menu } from 'lucide-react';
import { useState } from 'react';
import { getTheme } from '@/lib/themes';

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

  useEffect(() => {
    // Redirect to landing if not connected
    if (!walletAddress) {
      router.push(`/${locale}`);
    }
  }, [walletAddress, router, locale]);

  const navigateTo = (path: string, tab: string) => {
    setActiveTab(tab);
    router.push(`/${locale}${path}`);
  };

  return (
    <div
      className="relative flex h-screen max-w-md mx-auto flex-col overflow-hidden"
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 shadow-sm"
        style={{ backgroundColor: theme.colors.primary }}
      >
        <div className="flex items-center">
          <span className="mr-2 text-2xl">🏥</span>
          <span className="text-xl font-bold text-white">{t('appName')}</span>
        </div>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="rounded-lg p-2 text-white transition-colors hover:bg-white/10"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-20">{children}</div>

      {/* Bottom Navigation */}
      <div
        className="absolute bottom-0 left-0 right-0 border-t"
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

      {/* Menu Overlay */}
      {showMenu && (
        <div
          className="absolute inset-0 z-50 bg-black/50"
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
                <div className="px-3 text-sm" style={{ color: theme.colors.textSecondary }}>
                  <div>{t('settings.walletConnected')}</div>
                  <div className="mt-1 text-xs">
                    {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
