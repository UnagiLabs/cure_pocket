'use client';

import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getTheme } from '@/lib/themes';
import type { VitalSign, VitalSignType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * バイタルデータ追加フォームページ
 * 血圧、心拍数、血糖値、体温、体重を記録できる
 */
export default function AddVitalPage() {
    const t = useTranslations();
    const router = useRouter();
    const locale = useLocale();
    const { settings, addVitalSign } = useApp();
    const theme = getTheme(settings.theme);

    const [type, setType] = useState<VitalSignType>('blood-pressure');
    const [systolic, setSystolic] = useState('');
    const [diastolic, setDiastolic] = useState('');
    const [value, setValue] = useState('');
    const [recordedAt, setRecordedAt] = useState(
        new Date().toISOString().slice(0, 16)
    );
    const [notes, setNotes] = useState('');

    // タイプに応じた単位を取得
    const getUnit = (vitalType: VitalSignType): string => {
        switch (vitalType) {
            case 'blood-pressure':
                return 'mmHg';
            case 'heart-rate':
                return 'bpm';
            case 'blood-glucose':
                return 'mg/dL';
            case 'temperature':
                return '°C';
            case 'weight':
                return 'kg';
            default:
                return '';
        }
    };

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

    const handleSave = () => {
        // バリデーション
        if (type === 'blood-pressure') {
            if (!systolic || !diastolic) {
                alert('最高血圧と最低血圧を入力してください');
                return;
            }
        } else {
            if (!value) {
                alert('値を入力してください');
                return;
            }
        }

        const vitalSign: VitalSign = {
            id: uuidv4(),
            type,
            recordedAt: new Date(recordedAt).toISOString(),
            unit: getUnit(type),
            notes: notes || undefined,
        };

        if (type === 'blood-pressure') {
            vitalSign.systolic = Number.parseFloat(systolic);
            vitalSign.diastolic = Number.parseFloat(diastolic);
        } else {
            vitalSign.value = Number.parseFloat(value);
        }

        addVitalSign(vitalSign);
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
                    {t('vitals.add')}
                </h1>
            </div>

            {/* Form */}
            <div className="space-y-4 md:max-w-2xl md:mx-auto">
                {/* タイプ選択 */}
                <div>
                    <label
                        className="mb-1 block text-sm font-medium"
                        style={{ color: theme.colors.text }}
                    >
                        {t('vitals.type')} *
                    </label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value as VitalSignType)}
                        className="w-full rounded-lg border p-3"
                        style={{
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.textSecondary + '40',
                            color: theme.colors.text,
                        }}
                    >
                        <option value="blood-pressure">{t('vitals.bloodPressure')}</option>
                        <option value="heart-rate">{t('vitals.heartRate')}</option>
                        <option value="blood-glucose">{t('vitals.bloodGlucose')}</option>
                        <option value="temperature">{t('vitals.temperature')}</option>
                        <option value="weight">{t('vitals.weight')}</option>
                    </select>
                </div>

                {/* 血圧の場合 */}
                {type === 'blood-pressure' && (
                    <>
                        <div>
                            <label
                                className="mb-1 block text-sm font-medium"
                                style={{ color: theme.colors.text }}
                            >
                                {t('vitals.systolic')} (mmHg) *
                            </label>
                            <input
                                type="number"
                                value={systolic}
                                onChange={(e) => setSystolic(e.target.value)}
                                className="w-full rounded-lg border p-3"
                                style={{
                                    backgroundColor: theme.colors.surface,
                                    borderColor: theme.colors.textSecondary + '40',
                                    color: theme.colors.text,
                                }}
                                placeholder="120"
                            />
                        </div>
                        <div>
                            <label
                                className="mb-1 block text-sm font-medium"
                                style={{ color: theme.colors.text }}
                            >
                                {t('vitals.diastolic')} (mmHg) *
                            </label>
                            <input
                                type="number"
                                value={diastolic}
                                onChange={(e) => setDiastolic(e.target.value)}
                                className="w-full rounded-lg border p-3"
                                style={{
                                    backgroundColor: theme.colors.surface,
                                    borderColor: theme.colors.textSecondary + '40',
                                    color: theme.colors.text,
                                }}
                                placeholder="80"
                            />
                        </div>
                    </>
                )}

                {/* その他のタイプ */}
                {type !== 'blood-pressure' && (
                    <div>
                        <label
                            className="mb-1 block text-sm font-medium"
                            style={{ color: theme.colors.text }}
                        >
                            {t('vitals.value')} ({getUnit(type)}) *
                        </label>
                        <input
                            type="number"
                            step={type === 'temperature' ? '0.1' : '1'}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-full rounded-lg border p-3"
                            style={{
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.textSecondary + '40',
                                color: theme.colors.text,
                            }}
                            placeholder={
                                type === 'heart-rate'
                                    ? '70'
                                    : type === 'blood-glucose'
                                      ? '100'
                                      : type === 'temperature'
                                        ? '36.5'
                                        : '60'
                            }
                        />
                    </div>
                )}

                {/* 記録日時 */}
                <div>
                    <label
                        className="mb-1 block text-sm font-medium"
                        style={{ color: theme.colors.text }}
                    >
                        {t('vitals.recordedAt')} *
                    </label>
                    <input
                        type="datetime-local"
                        value={recordedAt}
                        onChange={(e) => setRecordedAt(e.target.value)}
                        className="w-full rounded-lg border p-3"
                        style={{
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.textSecondary + '40',
                            color: theme.colors.text,
                        }}
                    />
                </div>

                {/* メモ */}
                <div>
                    <label
                        className="mb-1 block text-sm font-medium"
                        style={{ color: theme.colors.text }}
                    >
                        {t('vitals.notes')}
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border p-3"
                        style={{
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.textSecondary + '40',
                            color: theme.colors.text,
                        }}
                        placeholder={t('vitals.notes')}
                    />
                </div>

                {/* 保存ボタン */}
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
                        className="flex-1 rounded-lg p-3 font-medium text-white transition-colors"
                        style={{ backgroundColor: theme.colors.primary }}
                    >
                        {t('actions.save')}
                    </button>
                </div>
            </div>
        </div>
    );
}

