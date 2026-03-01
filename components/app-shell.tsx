import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="container" style={{ display: "grid", gap: 16 }}>
      <nav className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>IT Sniper Radar</strong>
        <div style={{ display: "flex", gap: 14 }}>
          <Link href="/app">Console</Link>
          <Link href="/app/settings">Settings</Link>
          <Link href="/billing">Billing</Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
