 'use client';

import { useMemo, useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { getTheme } from '@/lib/themes';
import { MedicationForm } from '@/components/forms/MedicationForm';

/**
 * 薬一覧ページ
 * 登録された薬を一覧表示し、同一画面で追加も行う
 */
export default function MedicationsPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { medications, settings } = useApp();
  const theme = getTheme(settings.theme);

  const [isAddOpen, setIsAddOpen] = useState(false);

  // URL の mode=add が付いている場合はフォームを開いた状態で表示
  useEffect(() => {
    setIsAddOpen(searchParams.get('mode') === 'add');
  }, [searchParams]);

  // アクティブな薬のみ表示
  const activeMedications = useMemo(() => {
    return medications.filter((med) => med.status === 'active');
  }, [medications]);

  // 開始日順にソート（新しい順）
  const sortedMedications = useMemo(() => {
    return [...activeMedications].sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [activeMedications]);

  const openAdd = () => {
    setIsAddOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', 'add');
    router.replace(`/${locale}/app/medications?${params.toString()}`);
  };

  const closeAdd = () => {
    setIsAddOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('mode');
    const query = params.toString();
    router.replace(`/${locale}/app/medications${query ? `?${query}` : ''}`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between md:mb-4">
        <h1 className="text-xl font-bold md:text-2xl" style={{ color: theme.colors.text }}>
          {t('medications.title')}
        </h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
          style={{ backgroundColor: theme.colors.primary }}
        >
          <Plus className="h-4 w-4" />
          {t('add.title')}
        </button>
      </div>

      {/* Medications List */}
      {sortedMedications.length === 0 ? (
        <div
          className="flex h-64 items-center justify-center rounded-lg"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <p style={{ color: theme.colors.textSecondary }}>{t('medications.noMedications')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedMedications.map((medication) => {
            const startDate = medication.startDate
              ? new Date(medication.startDate).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : null;

            return (
              <div
                key={medication.id}
                className="rounded-lg border-2 p-4"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.textSecondary + '40',
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 font-semibold text-lg" style={{ color: theme.colors.text }}>
                      {medication.name}
                    </div>
                    {medication.genericName && (
                      <div className="mb-2 text-sm" style={{ color: theme.colors.textSecondary }}>
                        {t('add.genericName')}: {medication.genericName}
                      </div>
                    )}
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                      {medication.strength && (
                        <span style={{ color: theme.colors.textSecondary }}>
                          {medication.strength}
                        </span>
                      )}
                      {medication.dose && (
                        <span style={{ color: theme.colors.textSecondary }}>
                          {medication.dose}
                        </span>
                      )}
                      {medication.frequency && (
                        <span style={{ color: theme.colors.textSecondary }}>
                          {medication.frequency}
                        </span>
                      )}
                      {medication.timing && (
                        <span
                          className="rounded px-2 py-0.5 text-xs"
                          style={{
                            backgroundColor: theme.colors.primary + '20',
                            color: theme.colors.primary,
                          }}
                        >
                          {t(`medications.${medication.timing}`)}
                        </span>
                      )}
                    </div>
                    {startDate && (
                      <div className="mb-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                        {t('add.startDate')}: {startDate}
                      </div>
                    )}
                    {medication.reason && (
                      <div className="mt-2 text-sm" style={{ color: theme.colors.textSecondary }}>
                        {t('add.reason')}: {medication.reason}
                      </div>
                    )}
                    {medication.clinic && (
                      <div className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                        {t('medications.clinic')}: {medication.clinic}
                      </div>
                    )}
                    {medication.warning && (
                      <div
                        className="mt-2 rounded px-2 py-1 text-xs"
                        style={{
                          backgroundColor: '#FEE2E2',
                          color: '#DC2626',
                        }}
                      >
                        {t('medications.warning')}: {medication.warning}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Medication Form (inline panel) */}
      {isAddOpen && (
        <div
          className="fixed inset-x-0 bottom-0 z-20 rounded-t-2xl border-t bg-white p-4 shadow-lg md:static md:rounded-xl md:border md:p-6"
          style={{
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.textSecondary + '20',
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold md:text-xl" style={{ color: theme.colors.text }}>
              {t('add.title')}
            </h2>
            <button
              type="button"
              onClick={closeAdd}
              className="rounded-full p-2"
              style={{ color: theme.colors.textSecondary }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <MedicationForm
            onSaved={() => {
              closeAdd();
            }}
            onCancel={closeAdd}
          />
        </div>
      )}
    </div>
  );
}
