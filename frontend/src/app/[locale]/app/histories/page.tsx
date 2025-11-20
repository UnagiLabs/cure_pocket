 'use client';

import { useMemo, useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { getTheme } from '@/lib/themes';
import { HistoryForm } from '@/components/forms/HistoryForm';

/**
 * 病歴一覧ページ
 * 登録された病歴を一覧表示し、同一画面で追加も行う
 */
export default function HistoriesPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { medicalHistories, settings } = useApp();
  const theme = getTheme(settings.theme);

  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    setIsAddOpen(searchParams.get('mode') === 'add');
  }, [searchParams]);

  // 診断日順にソート（新しい順）
  const sortedHistories = useMemo(() => {
    return [...medicalHistories].sort((a, b) => {
      const dateA = a.diagnosisDate ? new Date(a.diagnosisDate).getTime() : 0;
      const dateB = b.diagnosisDate ? new Date(b.diagnosisDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [medicalHistories]);

  const openAdd = () => {
    setIsAddOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', 'add');
    router.replace(`/${locale}/app/histories?${params.toString()}`);
  };

  const closeAdd = () => {
    setIsAddOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('mode');
    const query = params.toString();
    router.replace(`/${locale}/app/histories${query ? `?${query}` : ''}`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between md:mb-4">
        <h1 className="text-xl font-bold md:text-2xl" style={{ color: theme.colors.text }}>
          {t('histories.title')}
        </h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
          style={{ backgroundColor: theme.colors.primary }}
        >
          <Plus className="h-4 w-4" />
          {t('histories.add')}
        </button>
      </div>

      {/* Histories List */}
      {sortedHistories.length === 0 ? (
        <div
          className="flex h-64 items-center justify-center rounded-lg"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <p style={{ color: theme.colors.textSecondary }}>{t('histories.noHistories')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedHistories.map((history) => {
            const diagnosisDate = history.diagnosisDate
              ? new Date(history.diagnosisDate).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : null;

            return (
              <div
                key={history.id}
                className="rounded-lg border-2 p-4"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.textSecondary + '40',
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="font-semibold text-lg" style={{ color: theme.colors.text }}>
                        {history.diagnosis}
                      </div>
                      <span
                        className="rounded px-2 py-0.5 text-xs"
                        style={{
                          backgroundColor: theme.colors.primary + '20',
                          color: theme.colors.primary,
                        }}
                      >
                        {t(`histories.types.${history.type}`)}
                      </span>
                      {history.status && (
                        <span
                          className="rounded px-2 py-0.5 text-xs"
                          style={{
                            backgroundColor: theme.colors.accent + '20',
                            color: theme.colors.accent,
                          }}
                        >
                          {t(`histories.statuses.${history.status}`)}
                        </span>
                      )}
                    </div>
                    {diagnosisDate && (
                      <div className="mb-2 text-xs" style={{ color: theme.colors.textSecondary }}>
                        {t('histories.diagnosisDate')}: {diagnosisDate}
                      </div>
                    )}
                    {history.diagnosedBy && (
                      <div className="mb-2 text-xs" style={{ color: theme.colors.textSecondary }}>
                        {t('histories.diagnosedBy')}: {history.diagnosedBy}
                      </div>
                    )}
                    {history.description && (
                      <div className="mb-2 text-sm" style={{ color: theme.colors.textSecondary }}>
                        {history.description}
                      </div>
                    )}
                    {history.notes && (
                      <div className="mt-2 text-sm" style={{ color: theme.colors.textSecondary }}>
                        {history.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add History Form (inline panel) */}
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
              {t('histories.add')}
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
          <HistoryForm
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
