import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { getServerT } from "@/lib/i18n/server";
import { ItSniperLogoMark } from "@/components/it-sniper-logo-mark";

export async function AppShell({
  children,
  authenticated,
  isAdmin,
}: {
  children: React.ReactNode;
  authenticated: boolean;
  isAdmin: boolean;
}) {
  const { t } = await getServerT();

  return (
    <div className="container app-shell">
      <nav className="card top-nav">
        <div className="brand">
          <ItSniperLogoMark className="brand-mark" />
          <strong>IT-Sniper</strong>
        </div>
        <div className="top-nav-links">
          <Link href="/app/dashboard">{t("nav.console")}</Link>
          <Link href="/app/settings">{t("nav.settings")}</Link>
          <Link href="/billing">{t("nav.billing")}</Link>
          {isAdmin ? <Link href="/app/admin/sources">Admin</Link> : null}
          <LanguageSwitcher />
          {authenticated ? <SignOutButton /> : null}
        </div>
      </nav>
      {children}
    </div>
  );
}
