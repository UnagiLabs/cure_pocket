 'use client';

import { useMemo, useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { getTheme } from '@/lib/themes';
import { LabForm } from '@/components/forms/LabForm';

/**
 * 検査値一覧ページ
 * 登録された検査値を一覧表示し、同一画面で追加も行う
 */
export default function LabsPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { labResults, settings } = useApp();
  const theme = getTheme(settings.theme);

  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    setIsAddOpen(searchParams.get('mode') === 'add');
  }, [searchParams]);

  // 日付順にソート（新しい順）
  const sortedResults = useMemo(() => {
    return [...labResults].sort(
      (a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime()
    );
  }, [labResults]);

  const openAdd = () => {
    setIsAddOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', 'add');
    router.replace(`/${locale}/app/labs?${params.toString()}`);
  };

  const closeAdd = () => {
    setIsAddOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('mode');
    const query = params.toString();
    router.replace(`/${locale}/app/labs${query ? `?${query}` : ''}`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between md:mb-4">
        <h1 className="text-xl font-bold md:text-2xl" style={{ color: theme.colors.text }}>
          {t('labs.title')}
        </h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
          style={{ backgroundColor: theme.colors.primary }}
        >
          <Plus className="h-4 w-4" />
          {t('labs.add')}
        </button>
      </div>

      {/* Results List */}
      {sortedResults.length === 0 ? (
        <div
          className="flex h-64 items-center justify-center rounded-lg"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <p style={{ color: theme.colors.textSecondary }}>{t('labs.noResults')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedResults.map((result) => {
            const date = new Date(result.testDate);
            const dateStr = date.toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={result.id}
                className="rounded-lg border-2 p-4"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.textSecondary + '40',
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 font-semibold" style={{ color: theme.colors.text }}>
                      {result.testName}
                    </div>
                    <div className="mb-2 flex items-center gap-4 text-sm">
                      <span style={{ color: theme.colors.textSecondary }}>
                        {dateStr}
                      </span>
                      {result.category && (
                        <span
                          className="rounded px-2 py-0.5 text-xs"
                          style={{
                            backgroundColor: theme.colors.primary + '20',
                            color: theme.colors.primary,
                          }}
                        >
                          {result.category}
                        </span>
                      )}
                    </div>
                    {result.testedBy && (
                      <div className="mb-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                        {t('labs.testedBy')}: {result.testedBy}
                      </div>
                    )}
                    {result.notes && (
                      <div className="mt-2 text-sm" style={{ color: theme.colors.textSecondary }}>
                        {result.notes}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 text-right">
                    <div className="mb-1 font-bold text-lg" style={{ color: theme.colors.primary }}>
                      {result.value} {result.unit || ''}
                    </div>
                    {result.referenceRange && (
                      <div className="text-xs" style={{ color: theme.colors.textSecondary }}>
                        {t('labs.referenceRange')}: {result.referenceRange}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Lab Form (inline panel) */}
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
              {t('labs.add')}
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
          <LabForm
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
