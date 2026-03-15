import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { buildFallbackPitch, cleanMissionText } from "@/lib/mission-utils";

export const dynamic = "force-dynamic";

type UserSettings = {
  user_id: string;
  primary_stack: string | null;
  secondary_stack: string | null;
  min_day_rate: number | null;
  remote_preference: string | null;
  countries: string[] | null;
  notify_email: boolean;
  notify_whatsapp: boolean;
  whatsapp_number: string | null;
  notify_sms: boolean;
  sms_number: string | null;
};


type CandidateProfileSnapshot = {
  primary_stack: string[];
  remote_preference: "remote" | "hybrid" | "onsite" | "unknown";
};
type Offer = {
  source: string;
  title: string;
  company: string;
  country: string | null;
  remote: string | null;
  day_rate: number | null;
  url: string;
  description: string | null;
  posted_at: string | null;
};

function isAuthorizedDevRequest(request: Request) {
  if (process.env.NODE_ENV === "production") return false;
  const secret = request.headers.get("x-dev-secret");
  return Boolean(secret && secret === env.DEV_SEED_SECRET);
}

function includesKeyword(content: string | null | undefined, keyword: string | null | undefined) {
  if (content == null || keyword == null) return false;
  return content.toLowerCase().includes(keyword.toLowerCase());
}

function nonEmpty(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function explodeStackInput(stack: string | null | undefined) {
  if (!nonEmpty(stack)) return [] as string[];
  return String(stack)
    .split(/[;,|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolvePrimaryStacks(user: UserSettings, candidateProfile: CandidateProfileSnapshot | null) {
  const settingsStacks = [user.primary_stack, user.secondary_stack].flatMap((stack) => explodeStackInput(stack));
  const cvStacks = (candidateProfile?.primary_stack ?? []).filter(nonEmpty).map((stack) => String(stack).trim());
  return [...new Set([...settingsStacks, ...cvStacks])];
}

function resolveSearchRemotePreference(user: UserSettings, candidateProfile: CandidateProfileSnapshot | null) {
  if (nonEmpty(user.remote_preference)) return user.remote_preference;
  if (candidateProfile && candidateProfile.remote_preference !== "unknown") return candidateProfile.remote_preference;
  return null;
}

function remoteMatches(preference: string | null, offerRemote: string | null) {
  if (!preference) return false;
  const normalizedPreference = preference.toLowerCase();
  const normalizedOfferRemote = (offerRemote ?? "").toLowerCase();

  if (normalizedPreference === "remote") return normalizedOfferRemote.includes("remote");
  if (normalizedPreference === "hybrid") return normalizedOfferRemote.includes("hybrid") || normalizedOfferRemote.includes("remote");
  if (normalizedPreference === "onsite") return normalizedOfferRemote.includes("onsite");
  return normalizedOfferRemote.includes(normalizedPreference);
}

function countryMatches(allowedCountries: string[] | null, offerCountry: string | null) {
  if (!allowedCountries || !allowedCountries.length) return false;
  if (!offerCountry) return false;
  const normalizedCountry = offerCountry.toLowerCase();
  return allowedCountries.some((country) => country != null && normalizedCountry.includes(country.toLowerCase()));
}

function buildReasons(reasons: string[]) {
  return reasons.length ? reasons.join("; ") : "General fit";
}

function clampScore(score: number) {
  return Math.min(100, Math.max(0, score));
}

export async function POST(request: Request) {
  if (!isAuthorizedDevRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const service = createSupabaseServiceClient();

  const { data: activeSubs, error: subsError } = await service
    .from("subscriptions")
    .select("user_id")
    .in("status", ["active", "trialing"]);

  if (subsError) return NextResponse.json({ ok: false, error: "subscriptions_failed" }, { status: 500 });

  const eligibleUserIds = (activeSubs ?? []).map((row) => row.user_id);
  if (!eligibleUserIds.length) {
    return NextResponse.json({ ok: true, usersProcessed: 0, offersConsidered: 0, missionsInserted: 0, notificationsQueued: 0 });
  }

  const { data: usersData, error: usersError } = await service
    .from("user_settings")
    .select(
      "user_id, primary_stack, secondary_stack, min_day_rate, remote_preference, countries, notify_email, notify_whatsapp, whatsapp_number, notify_sms, sms_number"
    )
    .eq("radar_active", true)
    .in("user_id", eligibleUserIds);

  if (usersError) return NextResponse.json({ ok: false, error: "users_failed" }, { status: 500 });

  const users = (usersData ?? []) as UserSettings[];

  const { data: candidateProfileRows } = await service
    .from("candidate_profiles")
    .select("user_id, profile_json")
    .in("user_id", users.map((row) => row.user_id));

  const candidateProfileByUserId = new Map<string, CandidateProfileSnapshot>();
  for (const row of candidateProfileRows ?? []) {
    const raw = (row as { user_id: string; profile_json: CandidateProfileSnapshot | null }).profile_json;
    if (!raw) continue;
    candidateProfileByUserId.set((row as { user_id: string }).user_id, raw);
  }

  const { data: profiles } = await service
    .from("profiles")
    .select("user_id, email")
    .in("user_id", users.map((user) => user.user_id));

  const emailByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.email]));

  const { data: offersData, error: offersError } = await service
    .from("offers_raw")
    .select("source, title, company, country, remote, day_rate, url, description, posted_at")
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (offersError) return NextResponse.json({ ok: false, error: "offers_failed" }, { status: 500 });

  const offers = (offersData ?? []) as Offer[];

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  let usersProcessed = 0;
  let missionsInserted = 0;
  let notificationsQueued = 0;

  for (const user of users) {
    const { data: existingWeekMissions } = await service
      .from("missions")
      .select("url")
      .eq("user_id", user.user_id)
      .gte("created_at", weekStart.toISOString());

    const existingUrls = new Set((existingWeekMissions ?? []).map((mission) => mission.url));

    const candidateProfile = candidateProfileByUserId.get(user.user_id) ?? null;
    const stacks = resolvePrimaryStacks(user, candidateProfile);
    const remotePreference = resolveSearchRemotePreference(user, candidateProfile);

    const scored = offers.map((offer) => {
      let score = 0;
      const reasons: string[] = [];
      const text = `${offer.title ?? ""} ${offer.description ?? ""}`;

      if (stacks.some((stack) => includesKeyword(text, stack))) {
        score += 40;
        reasons.push("Stack match");
      }

      if (remoteMatches(remotePreference, offer.remote)) {
        score += 20;
        reasons.push("Remote match");
      }

      if (countryMatches(user.countries, offer.country)) {
        score += 20;
        reasons.push("Country match");
      }

      if (typeof offer.day_rate === "number" && typeof user.min_day_rate === "number" && offer.day_rate >= user.min_day_rate) {
        score += 20;
        reasons.push("Rate match");
      }

      return {
        offer,
        score: clampScore(score),
        reasons: buildReasons(reasons),
      };
    });

    const selected = scored
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.offer.posted_at ?? 0).getTime() - new Date(a.offer.posted_at ?? 0).getTime();
      })
      .slice(0, 3);

    for (const item of selected) {
      if (existingUrls.has(item.offer.url)) continue;

      const pitch = buildFallbackPitch({
        title: cleanMissionText(item.offer.title, "mission"),
        company: cleanMissionText(item.offer.company, "company"),
        reasons: item.reasons.split("|").map((r) => r.trim()).filter(Boolean),
        primaryStack: user.primary_stack ?? candidateProfile?.primary_stack?.[0] ?? "",
        secondaryStack: user.secondary_stack,
      });
      const createdAt = new Date().toISOString();

      const { data: insertedMission, error: missionError } = await service
        .from("missions")
        .insert({
          user_id: user.user_id,
          source: item.offer.source,
          title: item.offer.title,
          company: item.offer.company,
          country: item.offer.country,
          remote: item.offer.remote,
          day_rate: item.offer.day_rate,
          url: item.offer.url,
          score: item.score,
          reasons: item.reasons,
          pitch,
          created_at: createdAt,
        })
        .select("id")
        .maybeSingle();

      if (missionError || !insertedMission) continue;

      await service.from("mission_matches").upsert(
        {
          user_id: user.user_id,
          mission_id: insertedMission.id,
          score: item.score,
          reasons: item.reasons,
        },
        { onConflict: "user_id,mission_id" }
      );

      missionsInserted += 1;
      existingUrls.add(item.offer.url);

      const channels: Array<{ channel: "email" | "whatsapp" | "sms"; enabled: boolean; to: string | null }> = [
        { channel: "email", enabled: user.notify_email, to: emailByUserId.get(user.user_id) ?? null },
        { channel: "whatsapp", enabled: user.notify_whatsapp, to: user.whatsapp_number },
        { channel: "sms", enabled: user.notify_sms, to: user.sms_number },
      ];

      for (const channel of channels) {
        if (!channel.enabled || !channel.to) continue;

        const { error: queueError } = await service.from("notification_queue").insert({
          user_id: user.user_id,
          mission_id: insertedMission.id,
          channel: channel.channel,
          to: channel.to,
          payload: {
            title: item.offer.title,
            company: item.offer.company,
            url: item.offer.url,
            score: item.score,
            reasons: item.reasons,
            pitch,
          },
          status: "pending",
        });

        if (!queueError) notificationsQueued += 1;
      }
    }

    usersProcessed += 1;
  }

  return NextResponse.json({
    ok: true,
    usersProcessed,
    offersConsidered: offers.length,
    missionsInserted,
    notificationsQueued,
  });
}
