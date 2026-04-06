"use client";

import { type Locale, SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { useI18n } from "@/components/i18n/i18n-provider";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const flags: Record<Locale, string> = {
    en: "🇬🇧",
    fr: "🇫🇷",
    es: "🇪🇸",
  };

  return (
    <div className="language-switcher-wrap">
      <label className="language-switcher-select-label">
        <span className="sr-only">{t("language.switcherLabel")}</span>
        <span aria-hidden="true" className="language-switcher-select-icon">
          🌐
        </span>
        <select
          aria-label={t("language.switcherLabel")}
          className="language-switcher-select"
          value={locale}
          onChange={(event) => setLocale(event.target.value as Locale)}
        >
          {SUPPORTED_LOCALES.map((item) => (
            <option key={item} value={item}>
              {t(`language.${item}`)}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="language-switcher-select-chevron">
          ˅
        </span>
      </label>

      <div className="language-switcher language-switcher-mobile" role="group" aria-label={t("language.switcherLabel")}>
        {SUPPORTED_LOCALES.map((item) => (
          <button
            key={item}
            type="button"
            className="language-switcher-btn"
            data-active={locale === item}
            onClick={() => setLocale(item as Locale)}
            aria-label={t(`language.${item}`)}
          >
            <span aria-hidden="true" className="language-switcher-flag">
              {flags[item as Locale]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
