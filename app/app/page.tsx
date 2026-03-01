import Link from "next/link";
import { getUserClientOrRedirect, requireUser } from "@/lib/server-auth";
import { MissionList } from "@/components/mission-list";

const PAGE_SIZE = 20;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { page?: string; notice?: string };
}) {
  const { user } = await requireUser();
  const supabase = await getUserClientOrRedirect();
  const page = Math.max(1, Number(searchParams?.page ?? "1"));

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

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE;
  const { data: missionsData } = await supabase
    .from("missions")
    .select("id,title,company,score,pitch,url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  const missions = missionsData ?? [];

  const safeMissions = missions.slice(0, PAGE_SIZE).map((m) => ({
    id: m.id,
    title: m.title,
    company: m.company,
    score: Number(m.score ?? 0),
    pitch: m.pitch ?? "",
    url: m.url,
  }));

  const hasMore = missions.length > PAGE_SIZE;

  return (
    <main style={{ display: "grid", gap: 16 }}>
      {searchParams?.notice === "radar-active" && <p className="card">Radar active</p>}
      {searchParams?.notice === "cv-empty-text" && (
        <p className="card">CV enregistré, mais aucun texte exploitable détecté dans le PDF.</p>
      )}
      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h1>Dashboard</h1>
        <p>
          Radar: <strong>{settings?.radar_active ? "ACTIVE" : "INACTIVE"}</strong>
        </p>
        <p>
          Subscription: <strong>{subscription?.status?.toUpperCase() ?? "INACTIVE"}</strong>
        </p>
        <p>
          Missions this week: <strong>{missionsThisWeek ?? 0}</strong>
        </p>
        <p>
          Renouvellement: {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "-"}
        </p>
        <Link href="/billing" className="btn" style={{ width: "fit-content" }}>
          Gérer l&apos;abonnement
        </Link>
      </section>

      <section className="card" style={{ display: "grid", gap: 10 }}>
        <h2>Dernières missions</h2>
        <MissionList missions={safeMissions} />
        {hasMore && (
          <Link href={`/app?page=${page + 1}`} className="btn" style={{ width: "fit-content" }}>
            Load more
          </Link>
        )}
      </section>
    </main>
  );
}
