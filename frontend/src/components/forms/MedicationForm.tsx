'use client';

import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTranslations } from 'next-intl';
import { getTheme } from '@/lib/themes';
import type { Medication, MedicationForm as MedicationFormType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

type MedicationFormProps = {
  onSaved?: (medication: Medication) => void;
  onCancel?: () => void;
};

export function MedicationForm({ onSaved, onCancel }: MedicationFormProps) {
  const t = useTranslations();
  const { settings, addMedication } = useApp();
  const theme = getTheme(settings.theme);

  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    strength: '',
    form: 'tablet' as MedicationFormType,
    dose: '',
    frequency: '',
    startDate: '',
    endDate: '',
    reason: '',
    clinic: '',
    warning: '',
  });

  const handleInputChange = (field: string, value: string | MedicationFormType) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const medication: Medication = {
      id: uuidv4(),
      name: formData.name,
      genericName: formData.genericName || undefined,
      strength: formData.strength || undefined,
      form: formData.form,
      dose: formData.dose || undefined,
      frequency: formData.frequency || undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      reason: formData.reason || undefined,
      clinic: formData.clinic || undefined,
      warning: formData.warning || undefined,
      status: 'active',
    };

    addMedication(medication);
    onSaved?.(medication);
  };

  return (
    <div className="space-y-4 md:max-w-2xl md:mx-auto">
      <div>
        <label
          className="mb-1 block text-sm font-medium"
          style={{ color: theme.colors.text }}
        >
          {t('add.drugName')} *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className="w-full rounded-lg border p-3"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.textSecondary + '40',
            color: theme.colors.text,
          }}
          placeholder={t('add.drugName')}
        />
      </div>

      <div>
        <label
          className="mb-1 block text-sm font-medium"
          style={{ color: theme.colors.text }}
        >
          {t('add.genericName')}
        </label>
        <input
          type="text"
          value={formData.genericName}
          onChange={(e) => handleInputChange('genericName', e.target.value)}
          className="w-full rounded-lg border p-3"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.textSecondary + '40',
            color: theme.colors.text,
          }}
          placeholder={t('add.genericName')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            className="mb-1 block text-sm font-medium md:text-base"
            style={{ color: theme.colors.text }}
          >
            {t('add.strength')}
          </label>
          <input
            type="text"
            value={formData.strength}
            onChange={(e) => handleInputChange('strength', e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + '40',
              color: theme.colors.text,
            }}
            placeholder="5mg"
          />
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t('add.form')}
          </label>
          <select
            value={formData.form}
            onChange={(e) => handleInputChange('form', e.target.value as MedicationFormType)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + '40',
              color: theme.colors.text,
            }}
          >
            <option value="tablet">{t('forms.tablet')}</option>
            <option value="capsule">{t('forms.capsule')}</option>
            <option value="liquid">{t('forms.liquid')}</option>
            <option value="other">{t('forms.other')}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t('add.dose')}
          </label>
          <input
            type="text"
            value={formData.dose}
            onChange={(e) => handleInputChange('dose', e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + '40',
              color: theme.colors.text,
            }}
            placeholder="1 tablet"
          />
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t('add.frequency')}
          </label>
          <input
            type="text"
            value={formData.frequency}
            onChange={(e) => handleInputChange('frequency', e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + '40',
              color: theme.colors.text,
            }}
            placeholder="1日2回"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t('add.startDate')}
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => handleInputChange('startDate', e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + '40',
              color: theme.colors.text,
            }}
          />
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t('add.endDate')}
          </label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => handleInputChange('endDate', e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + '40',
              color: theme.colors.text,
            }}
          />
        </div>
      </div>

      <div>
        <label
          className="mb-1 block text-sm font-medium"
          style={{ color: theme.colors.text }}
        >
          {t('medications.clinic')}
        </label>
        <input
          type="text"
          value={formData.clinic}
          onChange={(e) => handleInputChange('clinic', e.target.value)}
          className="w-full rounded-lg border p-3"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.textSecondary + '40',
            color: theme.colors.text,
          }}
          placeholder={t('medications.clinic')}
        />
      </div>

      <div>
        <label
          className="mb-1 block text-sm font-medium"
          style={{ color: theme.colors.text }}
        >
          {t('add.reason')}
        </label>
        <textarea
          value={formData.reason}
          onChange={(e) => handleInputChange('reason', e.target.value)}
          className="w-full rounded-lg border p-3"
          rows={3}
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.textSecondary + '40',
            color: theme.colors.text,
          }}
          placeholder={t('add.reason')}
        />
      </div>

      <div>
        <label
          className="mb-1 block text-sm font-medium"
          style={{ color: theme.colors.text }}
        >
          {t('medications.warning')}
        </label>
        <input
          type="text"
          value={formData.warning}
          onChange={(e) => handleInputChange('warning', e.target.value)}
          className="w-full rounded-lg border p-3"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.textSecondary + '40',
            color: theme.colors.text,
          }}
          placeholder={t('medications.warning')}
        />
      </div>

      <div className="flex gap-3 md:max-w-md md:mx-auto">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border-2 p-4 font-medium transition-transform active:scale-95 md:p-5 md:text-lg hover:shadow-sm"
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
          disabled={!formData.name}
          className="flex-1 rounded-xl p-4 font-medium text-white transition-transform active:scale-95 disabled:opacity-50 md:p-5 md:text-lg hover:shadow-lg"
          style={{ backgroundColor: theme.colors.primary }}
        >
          {t('actions.save')}
        </button>
      </div>
    </div>
  );
}

