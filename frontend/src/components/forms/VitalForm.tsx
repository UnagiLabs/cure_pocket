'use client';

import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTranslations } from 'next-intl';
import { getTheme } from '@/lib/themes';
import type { VitalSign, VitalSignType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

type VitalFormProps = {
  onSaved?: (vital: VitalSign) => void;
  onCancel?: () => void;
};

export function VitalForm({ onSaved, onCancel }: VitalFormProps) {
  const t = useTranslations();
  const { settings, addVitalSign } = useApp();
  const theme = getTheme(settings.theme);

  const [type, setType] = useState<VitalSignType>('blood-pressure');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [value, setValue] = useState('');
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');

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
    if (type === 'blood-pressure') {
      if (!systolic || !diastolic) {
        alert(t('vitals.validation.bloodPressureRequired'));
        return;
      }
    } else if (!value) {
      alert(t('vitals.validation.valueRequired'));
      return;
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
    onSaved?.(vitalSign);
  };

  return (
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
          onChange={(e) => {
            const nextType = e.target.value as VitalSignType;
            setType(nextType);
            setSystolic('');
            setDiastolic('');
            setValue('');
          }}
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
      {type === 'blood-pressure' ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: theme.colors.text }}
            >
              {t('vitals.systolic')} *
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
              {t('vitals.diastolic')} *
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
        </div>
      ) : (
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {getTypeLabel(type)} *
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + '40',
              color: theme.colors.text,
            }}
            placeholder="0"
          />
        </div>
      )}

      {/* 測定日時 */}
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
          className="w-full rounded-lg border p-3"
          rows={3}
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
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border-2 p-3 font-medium transition-colors"
          style={{
            borderColor: theme.colors.textSecondary + '40',
            color: theme.colors.text,
          }}
        >
          {t('actions.cancel')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 rounded-lg p-3 font-medium text-white transition-colors"
          style={{ backgroundColor: theme.colors.primary }}
        >
          {t('actions.save')}
        </button>
      </div>
    </div>
  );
}

