import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

export function AppShell({ children, authenticated }: { children: React.ReactNode; authenticated: boolean }) {
  return (
    <div className="container app-shell">
      <nav className="card top-nav">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <strong>IT-Sniper</strong>
        </div>
        <div className="top-nav-links">
          <Link href="/app/dashboard">Console</Link>
          <Link href="/app/settings">Settings</Link>
          <Link href="/billing">Billing</Link>
          {authenticated ? <SignOutButton /> : null}
        </div>
      </nav>
      {children}
    </div>
  );
}
