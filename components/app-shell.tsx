import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="container" style={{ display: "grid", gap: 16 }}>
      <nav className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>IT Sniper</strong>
        <div style={{ display: "flex", gap: 14 }}>
          <Link href="/app">Dashboard</Link>
          <Link href="/app/onboarding">Onboarding</Link>
          <Link href="/billing">Billing</Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
