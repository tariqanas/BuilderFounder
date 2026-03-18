export const SUPPORTED_LOCALES = ["en", "fr", "es"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "it_sniper_locale";

const LOCALE_ALIASES: Record<string, Locale> = {
  en: "en",
  fr: "fr",
  es: "es",
};

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) return DEFAULT_LOCALE;
  const short = value.toLowerCase().split("-")[0];
  return LOCALE_ALIASES[short] ?? DEFAULT_LOCALE;
}

export function detectLocaleFromHeader(headerValue: string | null | undefined): Locale {
  if (!headerValue) return DEFAULT_LOCALE;
  const candidates = headerValue
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.split(";")[0]?.trim())
    .filter((part): part is string => Boolean(part));

  for (const candidate of candidates) {
    const normalized = normalizeLocale(candidate);
    if (normalized !== DEFAULT_LOCALE || candidate.toLowerCase().startsWith("en")) {
      return normalized;
    }
  }

  return DEFAULT_LOCALE;
}
