import Link from "next/link";
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

const getFirstName = (user: { email?: string | null; user_metadata?: Record<string, unknown> }) => {
  const directFirstName = typeof user.user_metadata?.first_name === "string" ? user.user_metadata.first_name : null;
  if (directFirstName?.trim()) return directFirstName.trim();

  const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
  if (fullName?.trim()) {
    const [firstToken] = fullName.trim().split(/\s+/);
    if (firstToken) return firstToken;
  }

  const emailPrefix = user.email?.split("@")[0]?.trim();
  return emailPrefix || "there";
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
    .select("primary_stack,secondary_stack,notifications_enabled")
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

  const firstName = getFirstName(user);
  const today = new Date();
  const isToday = (value: string) => {
    const date = new Date(value);
    return (
      date.getUTCFullYear() === today.getUTCFullYear() &&
      date.getUTCMonth() === today.getUTCMonth() &&
      date.getUTCDate() === today.getUTCDate()
    );
  };
  const newToday = safeMissions.filter((mission) => mission.createdAt && isToday(mission.createdAt)).length;

  return (
    <main className="dashboard-layout">
      {searchParams?.notice === "onboarding-activated" && <p className="notice">Success. Radar is now active.</p>}
      {searchParams?.notice === "profile-confirmed" && <p className="notice">Profile confirmed. Welcome to your dashboard.</p>}
      {searchParams?.notice === "cv-empty-text" && <p className="notice">CV saved, but no extractable text was detected in the PDF.</p>}

      <section className="card dashboard-header">
        <div className="dashboard-header-main">
          <p className="dashboard-greeting">Welcome back, {firstName}</p>
          <p className="dashboard-subtext">Your AI radar is scanning freelance missions and surfacing the best matches.</p>
          <span className="radar-status">● Radar active</span>
        </div>
        <div className="dashboard-header-action">
          <ManualScanButton initialRemaining={refreshStatus.remaining} buttonLabel="Refresh radar" loadingLabel="Scanning..." />
        </div>
      </section>

      <section className="kpi-strip" aria-label="Dashboard key metrics">
        <article className="card kpi-card">
          <span className="muted">Missions found</span>
          <strong>{safeMissions.length}</strong>
        </article>
        <article className="card kpi-card">
          <span className="muted">New today</span>
          <strong>{newToday}</strong>
        </article>
        <article className="card kpi-card">
          <span className="muted">Status</span>
          <strong>Active</strong>
        </article>
      </section>

      <section className="status-grid">
        <article className="card status-card">
          <span className="muted">Subscription</span>
          <strong>{subscription?.status?.toUpperCase() ?? "INACTIVE"}</strong>
          <Link href="/billing" className="card-link">
            Manage billing
          </Link>
        </article>

        <article className="card status-card">
          <span className="muted">Notifications</span>
          <strong>{settings?.notifications_enabled ?? true ? "ON" : "OFF"}</strong>
          <p className="muted">Last scan: {timeAgo(latestMatch?.created_at ?? null)}</p>
          <NotificationsToggle initialEnabled={settings?.notifications_enabled ?? true} />
          <p className="muted">Receive alerts when new matching missions are detected.</p>
        </article>

        <article className="card status-card">
          <span className="muted">Mission stats</span>
          <strong>{missionsThisWeek ?? 0} missions this week</strong>
          <span className="muted">Renews {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "-"}</span>
        </article>
      </section>

      <section className="card mission-section">
        <div className="mission-section-header">
          <h2>Mission Signals</h2>
          <Link href="/app/settings" className="card-link">
            Settings
          </Link>
        </div>
        <MissionList missions={safeMissions} />
      </section>
    </main>
  );
}
