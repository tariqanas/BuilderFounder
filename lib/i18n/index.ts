import en from "@/locales/en";
import fr from "@/locales/fr";
import es from "@/locales/es";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

const messages = { en, fr, es } as const;

export type Messages = typeof en;

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[part];
  }, obj);
}

export function getMessages(locale: Locale): Messages {
  return (messages[locale] ?? messages[DEFAULT_LOCALE]) as Messages;
}

export function translate(locale: Locale, key: string): string {
  const active = getByPath(getMessages(locale) as unknown as Record<string, unknown>, key);
  if (typeof active === "string") return active;

  const fallback = getByPath(messages[DEFAULT_LOCALE] as unknown as Record<string, unknown>, key);
  return typeof fallback === "string" ? fallback : key;
}
