import { getUserClientOrRedirect, requireUser } from "@/lib/server-auth";
import { getOnboardingRedirectPath, getOnboardingState } from "@/lib/onboarding-state";
import { redirect } from "next/navigation";
import { MissionList } from "@/components/mission-list";
import {
  buildFallbackPitch,
  cleanMissionText,
  isMissionUrlUsable,
  isPitchUsable,
  toMissionReasons,
} from "@/lib/mission-utils";
import { NotificationsToggle } from "@/components/dashboard/notifications-toggle";
import { ManualScanButton } from "@/components/dashboard/manual-scan-button";
import { getManualRefreshStatus } from "@/lib/manual-radar-refresh";

const timeAgo = (value: string | null) => {
  if (!value) return "No scan yet";

  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { notice?: string };
}) {
  const { user } = await requireUser();
  const supabase = await getUserClientOrRedirect();
  const onboarding = await getOnboardingState(supabase, user.id);
  const onboardingRedirectPath = getOnboardingRedirectPath(onboarding);
  if (onboardingRedirectPath !== "/app/dashboard") {
    redirect(onboardingRedirectPath);
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("primary_stack,secondary_stack,notifications_enabled,radar_active")
    .eq("user_id", user.id)
    .maybeSingle();

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

  const refreshStatus = await getManualRefreshStatus(user.id);

  const { data: latestMatch } = await supabase
    .from("mission_matches")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: matchesData } = await supabase
    .from("mission_matches")
    .select("score,reasons,mission_id,missions(id,title,company,country,remote,day_rate,url,pitch,reasons,score,created_at)")
    .eq("user_id", user.id)
    .order("score", { ascending: false })
    .limit(20);

  const safeMissions = (matchesData ?? [])
    .map((match) => {
      const mission = Array.isArray(match.missions) ? match.missions[0] : match.missions;
      if (!mission) return null;

      return {
        id: mission.id,
        title: cleanMissionText(mission.title, "Untitled mission"),
        company: cleanMissionText(mission.company, "Unknown company"),
        score: Number(mission.score ?? match.score ?? 0),
        pitch: isPitchUsable(mission.pitch)
          ? mission.pitch
          : buildFallbackPitch({
              title: mission.title,
              company: mission.company,
              reasons: toMissionReasons(match.reasons ?? mission.reasons),
              primaryStack: settings?.primary_stack,
              secondaryStack: settings?.secondary_stack,
            }),
        url: cleanMissionText(mission.url, ""),
        hasValidUrl: isMissionUrlUsable(mission.url),
        reasons: toMissionReasons(match.reasons ?? mission.reasons),
        createdAt: mission.created_at,
        country: cleanMissionText(mission.country, "Global"),
        remote: cleanMissionText(mission.remote, "Remote"),
        dayRate: mission.day_rate,
      };
    })
    .filter((mission): mission is NonNullable<typeof mission> => mission !== null);

  const firstNameRaw =
    (typeof user.user_metadata?.first_name === "string" && user.user_metadata.first_name) ||
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.split(" ")[0]) ||
    user.email?.split("@")[0] ||
    "there";
  const firstName = firstNameRaw.charAt(0).toUpperCase() + firstNameRaw.slice(1);
  const newToday = safeMissions.filter((mission) => Date.now() - new Date(mission.createdAt).getTime() <= 24 * 60 * 60 * 1000).length;
  const radarActive = settings?.radar_active ?? true;

  return (
    <main className="dashboard-layout">
      {searchParams?.notice === "onboarding-activated" && <p className="notice">Radar is now active.</p>}
      {searchParams?.notice === "profile-confirmed" && <p className="notice">Profile saved. You are ready to find missions.</p>}
      {searchParams?.notice === "cv-empty-text" && <p className="notice">CV saved, but we could not read text from the file.</p>}

      <section className="card flex flex-col gap-6 rounded-2xl border-slate-800 bg-slate-950/80 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
            ● Radar active
          </div>
          <h1 className="mt-3 mb-2 text-3xl font-semibold text-white">Welcome back, {firstName}</h1>
          <p className="m-0 max-w-2xl text-sm text-slate-300">
            Your AI radar is scanning freelance missions and surfacing the best matches.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2">
          <ManualScanButton initialRemaining={refreshStatus.remaining} label="Refresh radar" showRemaining={false} />
          <p className="m-0 text-xs text-slate-400">Last refresh: {timeAgo(latestMatch?.created_at ?? null)}</p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="card rounded-2xl border-slate-800 bg-slate-950/80 p-5">
          <p className="m-0 text-sm text-slate-400">Missions found</p>
          <p className="mt-2 mb-0 text-3xl font-semibold text-white">{safeMissions.length}</p>
        </article>
        <article className="card rounded-2xl border-slate-800 bg-slate-950/80 p-5">
          <p className="m-0 text-sm text-slate-400">New today</p>
          <p className="mt-2 mb-0 text-3xl font-semibold text-white">{newToday}</p>
        </article>
        <article className="card rounded-2xl border-slate-800 bg-slate-950/80 p-5">
          <p className="m-0 text-sm text-slate-400">Radar status</p>
          <p className="mt-2 mb-0 text-3xl font-semibold text-white">{radarActive ? "Active" : "Paused"}</p>
          <div className="mt-3">
            <NotificationsToggle initialEnabled={settings?.notifications_enabled ?? true} />
          </div>
        </article>
      </section>

      <section className="card mission-section rounded-2xl border-slate-800 bg-slate-950/80 p-5">
        <div className="mission-section-header flex-col items-start">
          <h2 className="m-0 text-2xl font-semibold text-white">Recommended missions</h2>
          <p className="m-0 text-sm text-slate-400">Best opportunities detected by your AI radar</p>
        </div>
        <MissionList missions={safeMissions} />
        <p className="m-0 text-xs text-slate-500">
          Plan: {subscription?.status?.toUpperCase() ?? "INACTIVE"} • Weekly discoveries: {missionsThisWeek ?? 0} • Renewal{" "}
          {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "-"}
        </p>
      </section>
    </main>
  );
}
