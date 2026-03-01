import Link from "next/link";
import { getUserClientOrRedirect, requireUser } from "@/lib/server-auth";
import { MissionList } from "@/components/mission-list";

export default async function DashboardPage() {
  const { user } = await requireUser();
  const supabase = await getUserClientOrRedirect();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("radar_active")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status,current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: missions } = await supabase
    .from("missions")
    .select("id,title,company,score,pitch,url,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const safeMissions = (missions ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    company: m.company,
    score: Number(m.score ?? 0),
    pitch: m.pitch ?? "",
    url: m.url,
  }));

  return (
    <main style={{ display: "grid", gap: 16 }}>
      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h1>Dashboard</h1>
        <p>
          Radar: <strong>{settings?.radar_active ? "Actif" : "Inactif"}</strong>
        </p>
        <p>
          Abonnement: <strong>{subscription?.status ?? "Aucun"}</strong>
        </p>
        <p>
          Renouvellement: {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "-"}
        </p>
        <Link href="/billing" className="btn" style={{ width: "fit-content" }}>
          Gérer l&apos;abonnement
        </Link>
      </section>

      <section className="card">
        <h2>20 dernières missions</h2>
        <MissionList missions={safeMissions} />
      </section>
    </main>
  );
}
