"use client";

import { type Locale, SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { useI18n } from "@/components/i18n/i18n-provider";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const flags: Record<Locale, string> = {
    en: "🇬🇧",
    fr: "🇫🇷",
  };

  return (
    <div className="language-switcher" role="group" aria-label={t("language.switcherLabel")}>
      {SUPPORTED_LOCALES.map((item) => (
        <button
          key={item}
          type="button"
          className="language-switcher-btn"
          data-active={locale === item}
          onClick={() => setLocale(item as Locale)}
        >
          <span aria-hidden="true" className="language-switcher-flag">
            {flags[item as Locale]}
          </span>{" "}
          {t(`language.${item}`)}
        </button>
      ))}
    </div>
  );
}
