'use client';

import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTranslations } from 'next-intl';
import { Camera, FileText, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getTheme } from '@/lib/themes';
import type { Medication, MedicationForm } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export default function AddMedicationPage() {
  const t = useTranslations();
  const router = useRouter();
  const { settings, addMedication } = useApp();
  const theme = getTheme(settings.theme);
  const [showManualForm, setShowManualForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    strength: '',
    form: 'tablet' as MedicationForm,
    dose: '',
    frequency: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const handleInputChange = (
    field: string,
    value: string | MedicationForm
  ) => {
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
      status: 'active',
    };

    addMedication(medication);
    router.push('/app');
  };

  if (showManualForm) {
    return (
      <div className="p-4">
        {/* Header */}
        <div className="mb-6 flex items-center">
          <button
            onClick={() => setShowManualForm(false)}
            className="mr-3 rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <ChevronLeft className="h-6 w-6" style={{ color: theme.colors.text }} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: theme.colors.text }}>
            {t('add.manual')}
          </h1>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: theme.colors.text }}>
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
            <label className="mb-1 block text-sm font-medium" style={{ color: theme.colors.text }}>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: theme.colors.text }}>
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
              <label className="mb-1 block text-sm font-medium" style={{ color: theme.colors.text }}>
                {t('add.form')}
              </label>
              <select
                value={formData.form}
                onChange={(e) => handleInputChange('form', e.target.value as MedicationForm)}
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
              <label className="mb-1 block text-sm font-medium" style={{ color: theme.colors.text }}>
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
              <label className="mb-1 block text-sm font-medium" style={{ color: theme.colors.text }}>
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
              <label className="mb-1 block text-sm font-medium" style={{ color: theme.colors.text }}>
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
              <label className="mb-1 block text-sm font-medium" style={{ color: theme.colors.text }}>
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
            <label className="mb-1 block text-sm font-medium" style={{ color: theme.colors.text }}>
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

          <div className="flex gap-3">
            <button
              onClick={() => setShowManualForm(false)}
              className="flex-1 rounded-xl border-2 p-4 font-medium transition-transform active:scale-95"
              style={{
                borderColor: theme.colors.textSecondary + '40',
                color: theme.colors.text,
              }}
            >
              {t('actions.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.name}
              className="flex-1 rounded-xl p-4 font-medium text-white transition-transform active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {t('actions.save')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <p className="mb-6 text-center" style={{ color: theme.colors.textSecondary }}>
        {t('add.subtitle')}
      </p>

      {/* QR Code Scan */}
      <button
        className="mb-4 w-full rounded-xl p-6 shadow-sm transition-transform active:scale-95"
        style={{ backgroundColor: theme.colors.surface }}
      >
        <div className="flex items-center">
          <div
            className="mr-4 rounded-full p-3"
            style={{ backgroundColor: theme.colors.primary + '20' }}
          >
            <Camera className="h-8 w-8" style={{ color: theme.colors.primary }} />
          </div>
          <div className="text-left">
            <div className="mb-1 font-bold" style={{ color: theme.colors.text }}>
              {t('add.qrScan')}
            </div>
            <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
              {t('add.qrDescription')}
            </div>
          </div>
        </div>
      </button>

      {/* Barcode Scan */}
      <button
        className="mb-4 w-full rounded-xl p-6 shadow-sm transition-transform active:scale-95"
        style={{ backgroundColor: theme.colors.surface }}
      >
        <div className="flex items-center">
          <div
            className="mr-4 rounded-full p-3"
            style={{ backgroundColor: theme.colors.accent + '20' }}
          >
            <span className="text-2xl">🔢</span>
          </div>
          <div className="text-left">
            <div className="mb-1 font-bold" style={{ color: theme.colors.text }}>
              {t('add.barcodeScan')}
            </div>
            <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
              {t('add.barcodeDescription')}
            </div>
          </div>
        </div>
      </button>

      {/* Manual Entry */}
      <button
        onClick={() => setShowManualForm(true)}
        className="mb-6 w-full rounded-xl p-6 shadow-sm transition-transform active:scale-95"
        style={{ backgroundColor: theme.colors.surface }}
      >
        <div className="flex items-center">
          <div className="mr-4 rounded-full bg-purple-100 p-3">
            <FileText className="h-8 w-8 text-purple-600" />
          </div>
          <div className="text-left">
            <div className="mb-1 font-bold" style={{ color: theme.colors.text }}>
              {t('add.manual')}
            </div>
            <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
              {t('add.manualDescription')}
            </div>
          </div>
        </div>
      </button>

      {/* Hint */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: theme.colors.primary + '10' }}
      >
        <div className="flex items-start">
          <span className="mr-3 text-2xl">💡</span>
          <div className="text-sm" style={{ color: theme.colors.text }}>
            <p className="mb-1 font-medium">{t('add.hint')}</p>
            <p style={{ color: theme.colors.textSecondary }}>
              {t('add.hintText')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
