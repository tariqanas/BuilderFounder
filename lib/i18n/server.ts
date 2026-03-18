import { cookies, headers } from "next/headers";
import { detectLocaleFromHeader, LOCALE_COOKIE, normalizeLocale, type Locale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n";

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (cookieLocale) return normalizeLocale(cookieLocale);

  const headerStore = await headers();
  return detectLocaleFromHeader(headerStore.get("accept-language"));
}

export async function getServerT() {
  const locale = await getRequestLocale();
  return {
    locale,
    t: (key: string) => translate(locale, key),
  };
}
