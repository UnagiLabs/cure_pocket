'use client';

import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, BarChart3, List, X } from 'lucide-react';
import { getTheme } from '@/lib/themes';
import type { VitalSignType } from '@/types';
import VitalSignChart from '@/components/VitalSignChart';
import { VitalForm } from '@/components/forms/VitalForm';

/**
 * バイタルデータ一覧ページ
 * グラフとリストの両方を表示し、同一画面で追加も行う
 */
export default function VitalsPage() {
    const t = useTranslations();
    const router = useRouter();
    const locale = useLocale();
    const searchParams = useSearchParams();
    const { vitalSigns, settings } = useApp();
    const theme = getTheme(settings.theme);

    const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
    const [selectedType, setSelectedType] = useState<VitalSignType | 'all'>('all');
    const [period, setPeriod] = useState<'week' | 'month' | '3months' | 'year'>('month');
    const [isAddOpen, setIsAddOpen] = useState(false);

    useEffect(() => {
        setIsAddOpen(searchParams.get('mode') === 'add');
    }, [searchParams]);

    // タイプ別にデータをグループ化
    const dataByType = useMemo(() => {
        const grouped: Record<VitalSignType, typeof vitalSigns> = {
            'blood-pressure': [],
            'heart-rate': [],
            'blood-glucose': [],
            temperature: [],
            weight: [],
        };

        vitalSigns.forEach((vital) => {
            if (grouped[vital.type]) {
                grouped[vital.type].push(vital);
            }
        });

        return grouped;
    }, [vitalSigns]);

    // タイプに応じたラベルを取得
    const getTypeLabel = (vitalType: VitalSignType): string => {
        switch (vitalType) {
            case 'blood-pressure':
                return t('vitals.bloodPressure');
            case 'heart-rate':
                return t('vitals.heartRate');
            case 'blood-glucose':
                return t('vitals.bloodGlucose');
            case 'temperature':
                return t('vitals.temperature');
            case 'weight':
                return t('vitals.weight');
            default:
                return '';
        }
    };

    // 表示するデータを取得
    const displayData = useMemo(() => {
        if (selectedType === 'all') {
            return vitalSigns;
        }
        return vitalSigns.filter((vital) => vital.type === selectedType);
    }, [vitalSigns, selectedType]);

    // 期間でフィルタリング
    const periodFilteredData = useMemo(() => {
        const now = new Date();
        const periodMs = {
            week: 7 * 24 * 60 * 60 * 1000,
            month: 30 * 24 * 60 * 60 * 1000,
            '3months': 90 * 24 * 60 * 60 * 1000,
            year: 365 * 24 * 60 * 60 * 1000,
        };

        const cutoff = new Date(now.getTime() - periodMs[period]);

        return displayData.filter((vital) => {
            const recordedDate = new Date(vital.recordedAt);
            return recordedDate >= cutoff;
        });
    }, [displayData, period]);

    // ソート済みデータ
    const sortedData = useMemo(() => {
        return [...periodFilteredData].sort(
            (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
        );
    }, [periodFilteredData]);

    const vitalTypes: VitalSignType[] = [
        'blood-pressure',
        'heart-rate',
        'blood-glucose',
        'temperature',
        'weight',
    ];

    const openAdd = () => {
        setIsAddOpen(true);
        const params = new URLSearchParams(searchParams.toString());
        params.set('mode', 'add');
        router.replace(`/${locale}/app/vitals?${params.toString()}`);
    };

    const closeAdd = () => {
        setIsAddOpen(false);
        const params = new URLSearchParams(searchParams.toString());
        params.delete('mode');
        const query = params.toString();
        router.replace(`/${locale}/app/vitals${query ? `?${query}` : ''}`);
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between md:mb-8">
                <h1 className="text-xl font-bold md:text-2xl" style={{ color: theme.colors.text }}>
                    {t('vitals.title')}
                </h1>
                <button
                    onClick={openAdd}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
                    style={{ backgroundColor: theme.colors.primary }}
                >
                    <Plus className="h-4 w-4" />
                    {t('vitals.add')}
                </button>
            </div>

            {/* Controls */}
            <div className="mb-6 space-y-4 md:flex md:items-center md:justify-between md:gap-4 md:space-y-0">
                {/* タイプ選択 */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedType('all')}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                            selectedType === 'all'
                                ? 'text-white'
                                : 'border-2'
                        }`}
                        style={
                            selectedType === 'all'
                                ? { backgroundColor: theme.colors.primary }
                                : {
                                      borderColor: theme.colors.textSecondary + '40',
                                      color: theme.colors.text,
                                  }
                        }
                    >
                        {t('dataTypes.vital')}
                    </button>
                    {vitalTypes.map((type) => (
                        <button
                            key={type}
                            onClick={() => setSelectedType(type)}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                selectedType === type
                                    ? 'text-white'
                                    : 'border-2'
                            }`}
                            style={
                                selectedType === type
                                    ? { backgroundColor: theme.colors.primary }
                                    : {
                                          borderColor: theme.colors.textSecondary + '40',
                                          color: theme.colors.text,
                                      }
                            }
                        >
                            {getTypeLabel(type)}
                        </button>
                    ))}
                </div>

                {/* 期間選択と表示モード */}
                <div className="flex items-center gap-2">
                    <select
                        value={period}
                        onChange={(e) =>
                            setPeriod(e.target.value as 'week' | 'month' | '3months' | 'year')
                        }
                        className="rounded-lg border-2 p-2 text-sm"
                        style={{
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.textSecondary + '40',
                            color: theme.colors.text,
                        }}
                    >
                        <option value="week">{t('vitals.period.week')}</option>
                        <option value="month">{t('vitals.period.month')}</option>
                        <option value="3months">{t('vitals.period.3months')}</option>
                        <option value="year">{t('vitals.period.year')}</option>
                    </select>

                    <div className="flex rounded-lg border-2" style={{ borderColor: theme.colors.textSecondary + '40' }}>
                        <button
                            onClick={() => setViewMode('graph')}
                            className={`rounded-l-lg p-2 transition-colors ${
                                viewMode === 'graph' ? 'text-white' : ''
                            }`}
                            style={
                                viewMode === 'graph'
                                    ? { backgroundColor: theme.colors.primary }
                                    : {
                                          backgroundColor: theme.colors.surface,
                                          color: theme.colors.text,
                                      }
                            }
                        >
                            <BarChart3 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`rounded-r-lg p-2 transition-colors ${
                                viewMode === 'list' ? 'text-white' : ''
                            }`}
                            style={
                                viewMode === 'list'
                                    ? { backgroundColor: theme.colors.primary }
                                    : {
                                          backgroundColor: theme.colors.surface,
                                          color: theme.colors.text,
                                      }
                            }
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {sortedData.length === 0 ? (
                <div
                    className="flex h-64 items-center justify-center rounded-lg"
                    style={{ backgroundColor: theme.colors.surface }}
                >
                    <p style={{ color: theme.colors.textSecondary }}>{t('vitals.noData')}</p>
                </div>
            ) : viewMode === 'graph' ? (
                <div className="space-y-8">
                    {selectedType === 'all' ? (
                        vitalTypes.map((type) => {
                            if (dataByType[type].length === 0) return null;
                            return (
                                <div
                                    key={type}
                                    className="rounded-xl p-4 shadow-sm md:p-6"
                                    style={{ backgroundColor: theme.colors.surface }}
                                >
                                    <VitalSignChart
                                        vitalSigns={vitalSigns}
                                        type={type}
                                        period={period}
                                        themeId={settings.theme}
                                    />
                                </div>
                            );
                        })
                    ) : (
                        <div
                            className="rounded-xl p-4 shadow-sm md:p-6"
                            style={{ backgroundColor: theme.colors.surface }}
                        >
                            <VitalSignChart
                                vitalSigns={vitalSigns}
                                type={selectedType}
                                period={period}
                                themeId={settings.theme}
                            />
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedData.map((vital) => {
                        const date = new Date(vital.recordedAt);
                        const dateStr = date.toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        });

                        return (
                            <div
                                key={vital.id}
                                className="rounded-lg border-2 p-4"
                                style={{
                                    backgroundColor: theme.colors.surface,
                                    borderColor: theme.colors.textSecondary + '40',
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-semibold" style={{ color: theme.colors.text }}>
                                            {getTypeLabel(vital.type)}
                                        </div>
                                        <div className="mt-1 text-sm" style={{ color: theme.colors.textSecondary }}>
                                            {dateStr}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {vital.type === 'blood-pressure' ? (
                                            <div className="font-bold" style={{ color: theme.colors.primary }}>
                                                {vital.systolic}/{vital.diastolic} {vital.unit}
                                            </div>
                                        ) : (
                                            <div className="font-bold" style={{ color: theme.colors.primary }}>
                                                {vital.value} {vital.unit}
                                            </div>
                                        )}
                                        {vital.notes && (
                                            <div className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                                                {vital.notes}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Vital Form (inline panel) */}
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
                            {t('vitals.add')}
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
                    <VitalForm
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
