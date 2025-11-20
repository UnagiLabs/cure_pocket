import { getRequestConfig } from "next-intl/server";
import { type Locale, locales } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Ensure the locale is valid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = "en";
  }

  return {
    locale,
    messages: (await import(`../locales/${locale}/common.json`)).default,
  };
});
