'use client';

import { useEffect, useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTranslations, useLocale } from 'next-intl';
import {
  Package,
  AlertTriangle,
  FileText,
  FlaskConical,
  Scan,
  Plus,
  AlertCircle,
  Heart,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getTheme } from '@/lib/themes';
import type { Medication } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * ホーム画面（ダッシュボード）
 * 全データタイプのサマリーと最近の更新を表示
 */
export default function HomePage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const {
    medications,
    allergies,
    medicalHistories,
    labResults,
    imagingReports,
    vitalSigns,
    settings,
    profile,
    setMedications,
    walletAddress,
  } = useApp();
  const theme = getTheme(settings.theme);
  
  // ユーザー名をプロフィールから取得、未設定時はGuest表示
  const displayName = profile?.name || null;

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

  const activeMedicationsCount = medications.filter((m) => m.status === 'active').length;
  const importantHistoriesCount = medicalHistories.filter(
    (h) => h.status === 'active' || h.type === 'surgery'
  ).length;

  // 最近の更新を時系列で取得
  const recentUpdates = useMemo(() => {
    const updates: Array<{
      id: string;
      type: 'medication' | 'allergy' | 'history' | 'lab' | 'imaging' | 'vital';
      title: string;
      date: string;
      icon: typeof Package;
    }> = [];

    medications.forEach((med) => {
      updates.push({
        id: med.id,
        type: 'medication',
        title: med.name,
        date: med.startDate || new Date().toISOString(),
        icon: Package,
      });
    });

    allergies.forEach((allergy) => {
      updates.push({
        id: allergy.id,
        type: 'allergy',
        title: allergy.substance,
        date: allergy.onsetDate || new Date().toISOString(),
        icon: AlertTriangle,
      });
    });

    medicalHistories.forEach((history) => {
      updates.push({
        id: history.id,
        type: 'history',
        title: history.diagnosis,
        date: history.diagnosisDate || new Date().toISOString(),
        icon: FileText,
      });
    });

    labResults.forEach((lab) => {
      updates.push({
        id: lab.id,
        type: 'lab',
        title: `${lab.testName}: ${lab.value}${lab.unit || ''}`,
        date: lab.testDate,
        icon: FlaskConical,
      });
    });

    imagingReports.forEach((report) => {
      updates.push({
        id: report.id,
        type: 'imaging',
        title: report.summary.substring(0, 30) + (report.summary.length > 30 ? '...' : ''),
        date: report.examDate,
        icon: Scan,
      });
    });

    // vital.typeから翻訳キーへのマッピング（型安全）
    const vitalTypeToTranslationKey: Record<string, string> = {
      'blood-pressure': 'bloodPressure',
      'heart-rate': 'heartRate',
      'blood-glucose': 'bloodGlucose',
      'temperature': 'temperature',
      'weight': 'weight',
    };

    vitalSigns.forEach((vital) => {
      let title: string;
      
      if (vital.type === 'blood-pressure') {
        title = `${t('vitals.bloodPressure')}: ${vital.systolic}/${vital.diastolic} ${vital.unit}`;
      } else {
        // マッピングから翻訳キーを取得
        const translationKey = vitalTypeToTranslationKey[vital.type] || vital.type;
        title = `${t(`vitals.${translationKey}`)}: ${vital.value} ${vital.unit}`;
      }
      
      updates.push({
        id: vital.id,
        type: 'vital',
        title,
        date: vital.recordedAt,
        icon: Heart,
      });
    });

    return updates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  }, [medications, allergies, medicalHistories, labResults, imagingReports, vitalSigns, t]);

  const summaryCards = [
    {
      id: 'medications',
      icon: Package,
      title: t('dashboard.summary.medications'),
      count: activeMedicationsCount,
      color: theme.colors.primary,
    },
    {
      id: 'allergies',
      icon: AlertTriangle,
      title: t('dashboard.summary.allergies'),
      count: allergies.length,
      color: '#EF4444',
    },
    {
      id: 'histories',
      icon: FileText,
      title: t('dashboard.summary.histories'),
      count: importantHistoriesCount,
      color: '#8B5CF6',
    },
    {
      id: 'labs',
      icon: FlaskConical,
      title: t('dashboard.summary.labs'),
      count: labResults.length,
      color: '#10B981',
    },
    {
      id: 'imaging',
      icon: Scan,
      title: t('dashboard.summary.imaging'),
      count: imagingReports.length,
      color: '#3B82F6',
    },
    {
      id: 'vitals',
      icon: Heart,
      title: t('dashboard.summary.vitals'),
      count: vitalSigns.length,
      color: '#EC4899',
      route: `/${locale}/app/vitals`,
    },
  ];

  return (
    <div className="p-4 md:p-6">
      {/* Greeting */}
      <div className="mb-6 md:mb-8">
        <h2 className="mb-1 text-lg md:text-xl" style={{ color: theme.colors.textSecondary }}>
          {t('home.greeting')}
        </h2>
        <h1 className="text-2xl font-bold md:text-3xl" style={{ color: theme.colors.text }}>
          {displayName
            ? t('home.greetingWithName', { name: displayName })
            : t('home.guestGreeting')}
        </h1>
      </div>

      {/* Profile Setup Banner */}
      {!profile && (
        <div
          className="mb-6 rounded-xl border-2 p-4"
          style={{
            backgroundColor: theme.colors.primary + '10',
            borderColor: theme.colors.primary,
          }}
        >
          <div className="mb-2 flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" style={{ color: theme.colors.primary }} />
            <h3 className="font-bold" style={{ color: theme.colors.text }}>
              {t('home.profileSetupBanner.title')}
            </h3>
          </div>
          <p className="mb-3 text-sm" style={{ color: theme.colors.textSecondary }}>
            {t('home.profileSetupBanner.description')}
          </p>
          <button
            onClick={() => router.push(`/${locale}/app/profile`)}
            className="w-full rounded-lg p-2 text-sm font-medium text-white"
            style={{ backgroundColor: theme.colors.primary }}
          >
            {t('home.profileSetupBanner.button')}
          </button>
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => {
                const paths: Record<string, string> = {
                  medications: `/${locale}/app/medications`,
                  allergies: `/${locale}/app/allergies`,
                  histories: `/${locale}/app/histories`,
                  labs: `/${locale}/app/labs`,
                  imaging: `/${locale}/app/imaging`,
                  vitals: `/${locale}/app/vitals`,
                };
                router.push(paths[card.id] || `/${locale}/app`);
              }}
              className="rounded-xl p-4 shadow-sm transition-transform active:scale-95 md:p-6 md:min-h-[140px]"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <Icon className="mx-auto mb-2 h-8 w-8 md:h-10 md:w-10" style={{ color: card.color }} />
              <span className="block text-xs font-medium md:text-sm" style={{ color: theme.colors.textSecondary }}>
                {card.title}
              </span>
              <div className="mt-1 text-2xl font-bold md:text-3xl" style={{ color: theme.colors.text }}>
                {card.count}
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Action Buttons */}
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <button
          onClick={() => router.push(`/${locale}/app/add`)}
          className="flex w-full items-center justify-center rounded-xl p-4 shadow-md transition-transform active:scale-95 md:p-5"
          style={{ backgroundColor: theme.colors.accent, color: 'white' }}
        >
          <Plus className="mr-2 h-6 w-6" />
          <span className="font-medium md:text-lg">{t('dashboard.addData')}</span>
        </button>

        <button
          onClick={() => router.push(`/${locale}/app/card`)}
          className="flex w-full items-center justify-center rounded-xl border-2 p-4 shadow-sm transition-transform active:scale-95 md:p-5"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: '#FCA5A5',
            color: '#DC2626',
          }}
        >
          <AlertCircle className="mr-2 h-6 w-6" />
          <span className="font-medium md:text-lg">{t('home.emergencyCard')}</span>
        </button>
      </div>

      {/* Recent Updates */}
      {recentUpdates.length > 0 && (
        <div className="mt-6 md:mt-8">
          <h3 className="mb-3 font-bold md:text-lg" style={{ color: theme.colors.text }}>
            {t('dashboard.recentUpdates')}
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {recentUpdates.map((update) => {
              const Icon = update.icon;
              return (
                <div
                  key={update.id}
                  className="rounded-xl p-4 shadow-sm md:p-5"
                  style={{ backgroundColor: theme.colors.surface }}
                >
                  <div className="mb-1 flex items-center">
                    <Icon className="mr-2 h-5 w-5 md:h-6 md:w-6" style={{ color: theme.colors.primary }} />
                    <span className="font-bold md:text-base" style={{ color: theme.colors.text }}>
                      {update.title}
                    </span>
                  </div>
                  <div className="text-xs md:text-sm" style={{ color: theme.colors.textSecondary }}>
                    {t(`dataTypes.${update.type}`)} •{' '}
                    {new Date(update.date).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
