'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getTheme } from '@/lib/themes';
import type { LabResult } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import {
    labTestDefinitions,
    getLabTestsByCategory,
    getLabTestById,
    type LabTestCategory,
} from '@/lib/labTests';

/**
 * 検査値の追加フォームページ
 */
export default function AddLabPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { settings, addLabResult } = useApp();
  const theme = getTheme(settings.theme);

  const [selectedCategory, setSelectedCategory] = useState<LabTestCategory | 'all'>('all');
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [value, setValue] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [testedBy, setTestedBy] = useState('');
  const [notes, setNotes] = useState('');

  // カテゴリ別の検査項目を取得
  const testsByCategory = useMemo(() => getLabTestsByCategory(), []);

  // 選択されたカテゴリの検査項目
  const availableTests = useMemo(() => {
    if (selectedCategory === 'all') {
      return labTestDefinitions;
    }
    return testsByCategory[selectedCategory];
  }, [selectedCategory, testsByCategory]);

  // 選択された検査項目の定義
  const selectedTest = useMemo(() => {
    if (!selectedTestId) return null;
    return getLabTestById(selectedTestId);
  }, [selectedTestId]);

  // カテゴリのラベルを取得
  const getCategoryLabel = (category: LabTestCategory): string => {
    const labels: Record<LabTestCategory, string> = {
        CBC: t('labs.categories.CBC'),
        electrolyte: t('labs.categories.electrolyte'),
        renal: t('labs.categories.renal'),
        glucose: t('labs.categories.glucose'),
        liver: t('labs.categories.liver'),
        inflammation: t('labs.categories.inflammation'),
        endocrine: t('labs.categories.endocrine'),
        urine: t('labs.categories.urine'),
    };
    return labels[category];
  };

  // 検査項目名を取得（現在のロケールに応じて）
  const getTestName = (testId: string): string => {
    const test = getLabTestById(testId);
    if (!test) return '';
    return locale === 'ja' ? test.nameJa : test.nameEn;
  };

  const handleTestSelect = (testId: string) => {
    setSelectedTestId(testId);
    // 検査項目を選択したら、値フィールドをクリア
    setValue('');
  };

  const handleSave = () => {
    if (!selectedTestId || !value || !selectedTest) {
        alert(t('labs.validation.required'));
        return;
    }

    const result: LabResult = {
      id: uuidv4(),
      testName: getTestName(selectedTestId),
      value: value,
      unit: selectedTest.unit,
      referenceRange: selectedTest.referenceRange,
      testDate: testDate || new Date().toISOString().split('T')[0],
      testedBy: testedBy || undefined,
      category: getCategoryLabel(selectedTest.category),
      notes: notes || undefined,
    };

    addLabResult(result);
    router.push(`/${locale}/app`);
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center md:mb-8">
        <button
          onClick={() => router.push(`/${locale}/app/add`)}
          className="mr-3 rounded-lg p-2 transition-colors hover:bg-gray-100"
        >
          <ChevronLeft className="h-6 w-6" style={{ color: theme.colors.text }} />
        </button>
        <h1 className="text-lg font-bold md:text-2xl" style={{ color: theme.colors.text }}>
          {t('labs.add')}
        </h1>
      </div>

      {/* Form */}
      <div className="space-y-4 md:max-w-2xl md:mx-auto">
        {/* カテゴリ選択 */}
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t('labs.category')} *
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedTestId('');
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'text-white'
                  : 'border-2'
              }`}
              style={
                selectedCategory === 'all'
                  ? { backgroundColor: theme.colors.primary }
                  : {
                        borderColor: theme.colors.textSecondary + '40',
                        color: theme.colors.text,
                    }
              }
            >
              {t('labs.allCategories')}
            </button>
            {(['CBC', 'electrolyte', 'renal', 'glucose', 'liver', 'inflammation', 'endocrine', 'urine'] as LabTestCategory[]).map((category) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  setSelectedTestId('');
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'text-white'
                    : 'border-2'
                }`}
                style={
                  selectedCategory === category
                    ? { backgroundColor: theme.colors.primary }
                    : {
                          borderColor: theme.colors.textSecondary + '40',
                          color: theme.colors.text,
                      }
                }
              >
                {getCategoryLabel(category)}
              </button>
            ))}
          </div>
        </div>

        {/* 検査項目選択 */}
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t('labs.testName')} *
          </label>
          <select
            value={selectedTestId}
            onChange={(e) => handleTestSelect(e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + '40',
              color: theme.colors.text,
            }}
          >
            <option value="">{t('labs.selectTest')}</option>
            {availableTests.map((test) => (
              <option key={test.id} value={test.id}>
                {locale === 'ja' ? test.nameJa : test.nameEn} ({test.id})
              </option>
            ))}
          </select>
        </div>

        {/* 選択された検査項目の情報表示 */}
        {selectedTest && (
          <div
            className="rounded-lg border-2 p-4"
            style={{
              backgroundColor: theme.colors.primary + '10',
              borderColor: theme.colors.primary,
            }}
          >
            <div className="mb-2 text-sm font-medium" style={{ color: theme.colors.text }}>
              {t('labs.referenceRange')}: {selectedTest.referenceRange}
            </div>
            <div className="text-xs" style={{ color: theme.colors.textSecondary }}>
              {t('labs.unit')}: {selectedTest.unit}
            </div>
            {selectedTest.notes && (
              <div className="mt-2 text-xs" style={{ color: theme.colors.textSecondary }}>
                {selectedTest.notes}
              </div>
            )}
          </div>
        )}

        {/* 値入力 */}
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t('labs.value')} *
            {selectedTest && (
              <span className="ml-2 text-xs" style={{ color: theme.colors.textSecondary }}>
                ({selectedTest.unit})
              </span>
            )}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + '40',
              color: theme.colors.text,
            }}
            placeholder={t('labs.valuePlaceholder')}
          />
        </div>

        {/* 検査日 */}
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t('labs.testDate')} *
          </label>
          <input
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + '40',
              color: theme.colors.text,
            }}
          />
        </div>

        {/* 検査機関 */}
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t('labs.testedBy')}
          </label>
          <input
            type="text"
            value={testedBy}
            onChange={(e) => setTestedBy(e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + '40',
              color: theme.colors.text,
            }}
            placeholder={t('labs.testedBy')}
          />
        </div>

        {/* メモ */}
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t('labs.notes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border p-3"
            rows={3}
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + '40',
              color: theme.colors.text,
            }}
            placeholder={t('labs.notes')}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={() => router.push(`/${locale}/app/add`)}
            className="flex-1 rounded-lg border-2 p-3 font-medium transition-colors"
            style={{
              borderColor: theme.colors.textSecondary + '40',
              color: theme.colors.text,
            }}
          >
            {t('actions.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedTestId || !value}
            className="flex-1 rounded-lg p-3 font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: theme.colors.primary }}
          >
            {t('actions.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

