"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/i18n-provider";
import { type Locale, SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { ItSniperLogoMark } from "@/components/it-sniper-logo-mark";

export function LandingNavbar({ ctaHref }: { ctaHref: string }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();

  const navItems = [
    { href: "#features", label: t("landingPage.nav.features") },
    { href: "#how-it-works", label: t("landingPage.nav.howItWorks") },
    { href: "#pricing", label: t("landingPage.nav.pricing") },
  ] as const;

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
          <ItSniperLogoMark className="shrink-0" />
          <span className="landing-navbar-brand-copy">
            <strong>IT-SNIPER</strong>
            <small>by MiravoxTech</small>
          </span>
        </a>

        <nav className="landing-navbar-links" aria-label={t("landingPage.nav.primaryNavAria")}>
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
          <details className="landing-navbar-dropdown">
            <summary>{t("landingPage.nav.whoMade")}</summary>
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
            <span aria-hidden="true" className="landing-navbar-lang-icon">
              <ItSniperLogoMark className="landing-navbar-lang-logo" />
            </span>
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
            {t("landingPage.actions.startFree")}
          </Link>
        </div>

        <button
          type="button"
          className="landing-navbar-menu-toggle"
          aria-label={isMenuOpen ? t("landingPage.nav.closeMenu") : t("landingPage.nav.openMenu")}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((prev) => !prev)}
        >
          <svg viewBox="0 0 24 24" className="landing-navbar-menu-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {isMenuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      <div className={`landing-navbar-overlay ${isMenuOpen ? "is-open" : ""}`} aria-hidden={!isMenuOpen}>
        <button type="button" onClick={() => setIsMenuOpen(false)} className="landing-navbar-overlay-backdrop" aria-label={t("landingPage.nav.closeOverlay")} />
        <aside className="landing-navbar-drawer">
          <div className="landing-navbar-drawer-header">
            <span>IT-SNIPER</span>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="landing-navbar-menu-toggle"
              aria-label={t("landingPage.nav.closeMenu")}
            >
              <svg viewBox="0 0 24 24" className="landing-navbar-menu-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav className="landing-navbar-drawer-links" aria-label={t("landingPage.nav.mobileNavAria")}>
            {navItems.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)}>
                {item.label}
              </a>
            ))}
            <details className="landing-navbar-dropdown landing-navbar-dropdown-mobile">
              <summary>{t("landingPage.nav.whoMade")}</summary>
              <div className="landing-navbar-dropdown-menu">
                <a href="https://www.miravoxtech.com" target="_blank" rel="noreferrer" onClick={() => setIsMenuOpen(false)}>
                  MiravoxTech
                </a>
              </div>
            </details>
            <label className="landing-navbar-lang landing-navbar-lang-mobile">
              <span className="sr-only">{t("language.switcherLabel")}</span>
              <span aria-hidden="true" className="landing-navbar-lang-icon">
                <ItSniperLogoMark className="landing-navbar-lang-logo" />
              </span>
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
          </nav>

          <Link href={ctaHref} onClick={() => setIsMenuOpen(false)} className="landing-navbar-button landing-navbar-drawer-cta">
            {t("landingPage.actions.startFree")}
          </Link>
        </aside>
      </div>
    </header>
  );
}
