'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTranslations, useLocale } from 'next-intl';
import { Package, QrCode, Camera, Calendar, Shield, AlertCircle, Sun, Cloud, Moon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getTheme } from '@/lib/themes';
import type { Medication, TimingOfDay } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export default function HomePage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { medications, settings, setMedications, walletAddress } = useApp();
  const theme = getTheme(settings.theme);
  const [userName] = useState('沼水'); // Demo user name

  useEffect(() => {
    // Load demo medications if empty
    if (medications.length === 0 && walletAddress) {
      const demoMedications: Medication[] = [
        {
          id: uuidv4(),
          name: 'ロスバスタチン',
          dose: '5mg',
          frequency: '1日1回',
          timing: 'morning',
          clinic: '○○内科',
          form: 'tablet',
          status: 'active',
        },
        {
          id: uuidv4(),
          name: 'メトホルミン',
          dose: '500mg',
          frequency: '1日2回',
          timing: 'afternoon',
          clinic: '△△クリニック',
          form: 'tablet',
          warning: '食直前',
          status: 'active',
        },
        {
          id: uuidv4(),
          name: 'アムロジピン',
          dose: '5mg',
          frequency: '1日1回',
          timing: 'morning',
          clinic: '○○内科',
          form: 'tablet',
          status: 'active',
        },
      ];
      setMedications(demoMedications);
    }
  }, [medications.length, walletAddress, setMedications]);

  const activeCount = medications.filter((m) => m.status === 'active').length;

  const getTimingIcon = (timing?: TimingOfDay) => {
    switch (timing) {
      case 'morning':
        return <Sun className="mr-2 h-5 w-5 text-orange-400" />;
      case 'afternoon':
        return <Cloud className="mr-2 h-5 w-5 text-blue-400" />;
      case 'evening':
        return <Sun className="mr-2 h-5 w-5 text-orange-600" />;
      case 'night':
        return <Moon className="mr-2 h-5 w-5 text-indigo-400" />;
      default:
        return null;
    }
  };

  const medicationsByTiming = medications.reduce((acc, med) => {
    const timing = med.timing || 'asNeeded';
    if (!acc[timing]) acc[timing] = [];
    acc[timing].push(med);
    return acc;
  }, {} as Record<string, Medication[]>);

  return (
    <div className="p-4">
      {/* Greeting */}
      <div className="mb-6">
        <h2 className="mb-1 text-lg" style={{ color: theme.colors.textSecondary }}>
          {t('home.greeting')}
        </h2>
        <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>
          {userName}さん
        </h1>
      </div>

      {/* Active Medications Card */}
      <div
        className="mb-6 rounded-2xl p-6 shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center">
            <Package className="mr-3 h-8 w-8 text-white" />
            <span className="text-lg font-medium text-white">
              {t('home.activeMedications')}
            </span>
          </div>
        </div>
        <div className="text-3xl font-bold text-white">{activeCount}種類</div>
        <div className="mt-1 text-sm text-white/80">最終更新: 2分前</div>
      </div>

      {/* Quick Actions */}
      <button
        onClick={() => router.push(`/${locale}/app/add`)}
        className="mb-6 flex w-full items-center justify-center rounded-xl p-4 shadow-md transition-transform active:scale-95"
        style={{ backgroundColor: theme.colors.accent, color: 'white' }}
      >
        <QrCode className="mr-2 h-6 w-6" />
        <span className="font-medium">{t('home.addWithQR')}</span>
        <Camera className="ml-2 h-5 w-5" />
      </button>

      {/* Quick Nav Grid */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <button
          onClick={() => router.push(`/${locale}/app`)}
          className="rounded-xl p-4 shadow-sm transition-transform active:scale-95"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Package className="mx-auto mb-2 h-8 w-8" style={{ color: theme.colors.primary }} />
          <span className="text-xs font-medium" style={{ color: theme.colors.text }}>
            {t('tabs.medications')}
          </span>
        </button>
        <button className="rounded-xl p-4 shadow-sm transition-transform active:scale-95"
          style={{ backgroundColor: theme.colors.surface }}>
          <Calendar className="mx-auto mb-2 h-8 w-8" style={{ color: theme.colors.accent }} />
          <span className="text-xs font-medium" style={{ color: theme.colors.text }}>
            {t('home.history')}
          </span>
        </button>
        <button
          onClick={() => router.push(`/${locale}/app/card`)}
          className="rounded-xl p-4 shadow-sm transition-transform active:scale-95"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Shield className="mx-auto mb-2 h-8 w-8 text-purple-500" />
          <span className="text-xs font-medium" style={{ color: theme.colors.text }}>
            {t('home.share')}
          </span>
        </button>
      </div>

      {/* Emergency Card Button */}
      <button
        onClick={() => router.push(`/${locale}/app/card`)}
        className="flex w-full items-center justify-center rounded-xl border-2 p-4 shadow-sm transition-transform active:scale-95"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: '#FCA5A5',
          color: '#DC2626',
        }}
      >
        <AlertCircle className="mr-2 h-6 w-6" />
        <span className="font-medium">{t('home.emergencyCard')}</span>
      </button>

      {/* Recent Medications Preview */}
      {medications.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 font-bold" style={{ color: theme.colors.text }}>
            最近の薬
          </h3>
          <div className="space-y-3">
            {medications.slice(0, 3).map((med) => (
              <div
                key={med.id}
                className="rounded-xl p-4 shadow-sm"
                style={{ backgroundColor: theme.colors.surface }}
              >
                <div className="mb-1 flex items-center">
                  <span className="mr-2 text-2xl">💊</span>
                  <span className="font-bold" style={{ color: theme.colors.text }}>
                    {med.name}
                  </span>
                </div>
                <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                  {med.dose} / {med.frequency}
                </div>
                {med.warning && (
                  <div className="mt-1 flex items-center text-sm font-medium text-orange-600">
                    <AlertCircle className="mr-1 h-4 w-4" />
                    {med.warning}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
