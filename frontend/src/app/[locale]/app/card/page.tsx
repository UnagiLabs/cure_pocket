'use client';

import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTranslations } from 'next-intl';
import { QrCode, Download, Printer, AlertCircle, Clock } from 'lucide-react';
import { getTheme } from '@/lib/themes';

export default function EmergencyCardPage() {
  const t = useTranslations();
  const { medications, settings, walletAddress } = useApp();
  const theme = getTheme(settings.theme);
  const [consentUrl, setConsentUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const activeMedications = medications.filter((m) => m.status === 'active');

  const handleGenerateQR = async () => {
    setIsGenerating(true);
    try {
      // Mock API call - in real implementation, call apiClient.createConsentToken
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockUrl = `https://curepocket.app/view/${walletAddress?.slice(0, 8)}`;
      const mockExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      setConsentUrl(mockUrl);
      setExpiresAt(mockExpires);
    } catch (error) {
      console.error('Failed to generate consent token:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6 flex items-center">
        <AlertCircle className="mr-2 h-5 w-5 text-red-500" />
        <h1 className="text-lg font-bold" style={{ color: theme.colors.text }}>
          {t('card.title')}
        </h1>
      </div>

      <p className="mb-6 text-sm" style={{ color: theme.colors.textSecondary }}>
        {t('card.description')}
      </p>

      {/* QR Code Display */}
      <div
        className="mb-4 rounded-xl p-6 shadow-sm"
        style={{ backgroundColor: theme.colors.surface }}
      >
        <div
          className="mb-4 flex items-center justify-center rounded-xl p-8"
          style={{ backgroundColor: theme.colors.background }}
        >
          <div className="text-center">
            {consentUrl ? (
              <>
                <div className="mb-2 flex h-32 w-32 items-center justify-center rounded-lg border-4 border-gray-300 bg-white">
                  <QrCode className="h-24 w-24 text-gray-600" />
                </div>
                <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                  {t('card.scanToView')}
                </p>
                <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                  {t('card.englishVersion')}
                </p>
              </>
            ) : (
              <>
                <QrCode className="mx-auto mb-2 h-32 w-32 text-gray-400" />
                <p className="text-sm text-gray-600">{t('card.scanToView')}</p>
                <p className="text-sm text-gray-600">{t('card.englishVersion')}</p>
              </>
            )}
          </div>
        </div>

        {expiresAt && (
          <div className="mb-4 flex items-center justify-center text-sm" style={{ color: theme.colors.textSecondary }}>
            <Clock className="mr-1 h-4 w-4" />
            {t('card.validFor', { duration: '24時間' })}
          </div>
        )}

        <button
          onClick={handleGenerateQR}
          disabled={isGenerating}
          className="w-full rounded-lg p-3 font-medium text-white transition-transform active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: theme.colors.primary }}
        >
          {isGenerating ? '生成中...' : t('card.generateQR')}
        </button>
      </div>

      {/* Current Medications List */}
      <div
        className="mb-4 rounded-xl p-4 shadow-sm"
        style={{ backgroundColor: theme.colors.surface }}
      >
        <h3 className="mb-3 font-bold" style={{ color: theme.colors.text }}>
          {t('card.currentMedications')}
        </h3>
        <ul className="space-y-2">
          {activeMedications.length > 0 ? (
            activeMedications.map((med) => (
              <li
                key={med.id}
                className="flex items-center"
                style={{ color: theme.colors.text }}
              >
                <span className="mr-2">•</span>
                {med.name} {med.dose && `${med.dose}`}
              </li>
            ))
          ) : (
            <li style={{ color: theme.colors.textSecondary }}>
              薬が登録されていません
            </li>
          )}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          className="flex w-full items-center justify-center rounded-xl p-4 font-medium text-white shadow-md transition-transform active:scale-95"
          style={{ backgroundColor: theme.colors.primary }}
        >
          <Download className="mr-2 h-5 w-5" />
          <span>{t('card.downloadPDF')}</span>
        </button>
        <button
          className="flex w-full items-center justify-center rounded-xl p-4 font-medium text-white shadow-md transition-transform active:scale-95"
          style={{ backgroundColor: '#374151' }}
        >
          <Printer className="mr-2 h-5 w-5" />
          <span>{t('card.printCard')}</span>
        </button>
      </div>

      {/* Info Section */}
      <div
        className="mt-6 rounded-xl p-4"
        style={{ backgroundColor: theme.colors.primary + '10' }}
      >
        <div className="flex items-start">
          <span className="mr-3 text-2xl">ℹ️</span>
          <div className="text-sm" style={{ color: theme.colors.text }}>
            <p className="mb-1 font-medium">緊急時の使い方</p>
            <p style={{ color: theme.colors.textSecondary }}>
              このQRコードを医療従事者に見せることで、あなたの薬情報を安全に共有できます。
              リンクは24時間後に自動的に無効になります。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
