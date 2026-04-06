"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/i18n-provider";
import { type Locale, SUPPORTED_LOCALES } from "@/lib/i18n/config";

function ItSniperLogoMark() {
  return (
    <svg width={28} height={28} viewBox="0 0 64 64" fill="none" role="img" aria-label="IT-Sniper logo" className="shrink-0">
      <defs>
        <linearGradient id="radar-nav" x1="10" y1="8" x2="56" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset="0.45" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="27" stroke="url(#radar-nav)" strokeWidth="2.5" opacity="0.95" />
      <circle cx="32" cy="32" r="18" stroke="url(#radar-nav)" strokeWidth="2.5" opacity="0.68" />
      <circle cx="32" cy="32" r="9" stroke="url(#radar-nav)" strokeWidth="2.5" opacity="0.48" />
      <path d="M32 5v11M59 32H48M32 59V48M5 32h11" stroke="url(#radar-nav)" strokeLinecap="round" strokeWidth="2.5" opacity="0.82" />
      <path d="M32 32L50.5 14.5" stroke="url(#radar-nav)" strokeLinecap="round" strokeWidth="3.2" />
      <circle cx="50.5" cy="14.5" r="4" fill="#60A5FA" />
      <circle cx="50.5" cy="14.5" r="8" stroke="#60A5FA" strokeOpacity="0.45" strokeWidth="1.6" />
    </svg>
  );
}

const navItems = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
] as const;

export function LandingNavbar({ ctaHref }: { ctaHref: string }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();
  const flags: Record<Locale, string> = {
    en: "🇬🇧",
    fr: "🇫🇷",
    es: "🇪🇸",
  };

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  return (
    <header className="landing-navbar">
      <div className="landing-navbar-inner">
        <a href="#" className="landing-navbar-brand" onClick={() => setIsMenuOpen(false)}>
          <ItSniperLogoMark />
          <span className="landing-navbar-brand-copy">
            <strong>IT-SNIPER</strong>
            <small>by MiravoxTech</small>
          </span>
        </a>

        <nav className="landing-navbar-links" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
          <details className="landing-navbar-dropdown">
            <summary>Who made IT-SNIPER</summary>
            <div className="landing-navbar-dropdown-menu">
              <a href="https://www.miravoxtech.com" target="_blank" rel="noreferrer">
                MiravoxTech
              </a>
            </div>
          </details>
        </nav>

        <div className="landing-navbar-cta">
          <label className="landing-navbar-lang">
            <span className="sr-only">{t("language.switcherLabel")}</span>
            <select
              aria-label={t("language.switcherLabel")}
              className="landing-navbar-lang-select"
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
            >
              {SUPPORTED_LOCALES.map((item) => (
                <option key={item} value={item}>
                  {t(`language.${item}`)}
                </option>
              ))}
            </select>
          </label>
          <Link href={ctaHref} className="landing-navbar-button">
            Start free
          </Link>
        </div>

        <button
          type="button"
          className="landing-navbar-menu-toggle"
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((prev) => !prev)}
        >
          <svg viewBox="0 0 24 24" className="landing-navbar-menu-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {isMenuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      <div className={`landing-navbar-overlay ${isMenuOpen ? "is-open" : ""}`} aria-hidden={!isMenuOpen}>
        <button type="button" onClick={() => setIsMenuOpen(false)} className="landing-navbar-overlay-backdrop" aria-label="Close menu overlay" />
        <aside className="landing-navbar-drawer">
          <div className="landing-navbar-drawer-header">
            <span>IT-SNIPER</span>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="landing-navbar-menu-toggle"
              aria-label="Close navigation menu"
            >
              <svg viewBox="0 0 24 24" className="landing-navbar-menu-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav className="landing-navbar-drawer-links" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)}>
                {item.label}
              </a>
            ))}
            <details className="landing-navbar-dropdown landing-navbar-dropdown-mobile">
              <summary>Who made IT-SNIPER</summary>
              <div className="landing-navbar-dropdown-menu">
                <a href="https://www.miravoxtech.com" target="_blank" rel="noreferrer" onClick={() => setIsMenuOpen(false)}>
                  MiravoxTech
                </a>
              </div>
            </details>
            <label className="landing-navbar-lang landing-navbar-lang-mobile">
              <span className="sr-only">{t("language.switcherLabel")}</span>
              <select
                aria-label={t("language.switcherLabel")}
                className="landing-navbar-lang-select"
                value={locale}
                onChange={(event) => setLocale(event.target.value as Locale)}
              >
                {SUPPORTED_LOCALES.map((item) => (
                  <option key={item} value={item}>
                    {flags[item]} {t(`language.${item}`)}
                  </option>
                ))}
              </select>
            </label>
          </nav>

          <Link href={ctaHref} onClick={() => setIsMenuOpen(false)} className="landing-navbar-button landing-navbar-drawer-cta">
            Start free
          </Link>
        </aside>
      </div>
    </header>
  );
}
