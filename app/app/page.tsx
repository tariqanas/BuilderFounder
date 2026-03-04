import Link from "next/link";
import { getUserClientOrRedirect, requireUser } from "@/lib/server-auth";
import { MissionList } from "@/components/mission-list";

function toReasons(value: string | null) {
  return String(value ?? "")
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { notice?: string };
}) {
  const { user } = await requireUser();
  const supabase = await getUserClientOrRedirect();
  const { data: settings } = await supabase.from("user_settings").select("radar_active").eq("user_id", user.id).maybeSingle();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status,current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: missionsThisWeek } = await supabase
    .from("missions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", weekStart);

  const { data: missionsData } = await supabase
    .from("missions")
    .select("id,title,company,score,pitch,url,reasons")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const safeMissions = (missionsData ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    company: m.company,
    score: Number(m.score ?? 0),
    pitch: m.pitch ?? "",
    url: m.url,
    reasons: toReasons(m.reasons),
  }));


  return (
    <main style={{ display: "grid", gap: 16 }}>
            {searchParams?.notice === "onboarding-activated" && <p className="card">Success. Radar is now active.</p>}
      {searchParams?.notice === "radar-activated" && <p className="card">Radar activated.</p>}
      {searchParams?.notice === "radar-paused" && <p className="card">Radar paused.</p>}
      {searchParams?.notice === "radar-update-failed" && <p className="card">Unable to update radar status right now.</p>}
      {searchParams?.notice === "cv-empty-text" && <p className="card">CV saved, but no extractable text was detected in the PDF.</p>}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <article className="card" style={{ display: "grid", gap: 4 }}>
          <span className="muted">Subscription</span>
          <strong>{subscription?.status?.toUpperCase() ?? "INACTIVE"}</strong>
          <Link href="/billing" className="muted" style={{ fontSize: "0.9rem" }}>
            Manage billing
          </Link>
        </article>

        <article className="card" style={{ display: "grid", gap: 8 }}>
          <span className="muted">Radar status</span>
          <strong>{settings?.radar_active ? "ACTIVE" : "INACTIVE"}</strong>
          <form action="/api/radar/toggle" method="post">
            <button className="btn" type="submit">
              {settings?.radar_active ? "Pause Radar" : "Activate Radar"}
            </button>
          </form>
        </article>

        <article className="card" style={{ display: "grid", gap: 4 }}>
          <span className="muted">Missions this week</span>
          <strong>{missionsThisWeek ?? 0}</strong>
          <span className="muted" style={{ fontSize: "0.9rem" }}>
            Renews {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "-"}
          </span>
        </article>
      </section>

      <section className="card" style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0 }}>Mission signals</h2>
          <Link href="/app/settings" className="muted" style={{ fontSize: "0.9rem" }}>
            Settings
          </Link>
        </div>
        <MissionList missions={safeMissions} />
      </section>
    </main>
  );
}
