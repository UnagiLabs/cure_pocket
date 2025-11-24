import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "./src/i18n/config";

export const runtime = "edge";

export default createMiddleware({
	locales,
	defaultLocale,
	localePrefix: "always",
});

export const config = {
	matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
