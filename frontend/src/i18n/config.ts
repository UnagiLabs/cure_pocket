export const locales = ['en', 'ja', 'zh', 'fr', 'pt'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ja: '日本語',
  zh: '中文',
  fr: 'Français',
  pt: 'Português',
};
