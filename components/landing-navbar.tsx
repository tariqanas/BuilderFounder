"use client";

import Link from "next/link";
import { useState } from "react";

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

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between px-4">
        <a href="#" className="inline-flex items-center gap-2">
          <ItSniperLogoMark />
          <span className="text-sm font-semibold tracking-[0.08em] text-slate-900">IT-SNIPER</span>
        </a>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="text-sm font-medium text-slate-600 transition-colors hover:text-black">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <Link
            href={ctaHref}
            className="inline-flex h-10 items-center rounded-lg bg-black px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Start free
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((prev) => !prev)}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {isMenuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      <div className={`fixed inset-0 z-50 md:hidden ${isMenuOpen ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!isMenuOpen}>
        <button
          type="button"
          onClick={() => setIsMenuOpen(false)}
          className={`absolute inset-0 bg-slate-950/45 transition-opacity duration-200 ${isMenuOpen ? "opacity-100" : "opacity-0"}`}
          aria-label="Close menu overlay"
        />
        <aside
          className={`absolute right-0 top-0 flex h-full w-full max-w-xs flex-col bg-white p-6 transition-transform duration-200 ease-out ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold tracking-[0.08em] text-slate-900">IT-SNIPER</span>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700"
              aria-label="Close navigation menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav className="mt-8 grid gap-2" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-black"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <Link
            href={ctaHref}
            onClick={() => setIsMenuOpen(false)}
            className="mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-black px-4 text-base font-semibold text-white"
          >
            Start free
          </Link>
        </aside>
      </div>
    </header>
  );
}
