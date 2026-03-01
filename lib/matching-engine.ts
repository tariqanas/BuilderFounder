import { createSupabaseServiceClient } from "@/lib/supabase";

type UserSettingsRow = {
  user_id: string;
  primary_stack: string;
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

type OfferRow = {
  source: string;
  title: string;
  company: string;
  country: string | null;
  remote: string | null;
  day_rate: number | null;
  url: string;
  description: string | null;
  hash: string;
};

const MAX_OFFERS_PER_USER = 20;
const MAX_SCORING_TOTAL = 200;

export const SCORING_PROMPT = `You are a technical staffing scorer.
Return strict JSON only: {"score":number,"decision":"KEEP"|"DROP","reasons":string[],"missing":string[]}
Rules:
- score 0..100
- KEEP only if constraints match and relevance is high
- reasons max 4 short technical points
- missing lists blockers
No markdown.`;

export const PITCH_PROMPT = `You are writing a concise outreach draft for a DevOps/Cloud freelancer.
Return strict JSON only: {"subject":string,"pitch":string}
Rules:
- subject <= 90 chars
- pitch <= 500 chars
- technical, concrete, no generic AI wording.`;

function textContainsAny(haystack: string, needles: string[]) {
  const lower = haystack.toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
}

function truncateForScoring(text: string | null) {
  return (text ?? "").slice(0, 1500);
}

function heuristicScore(offer: OfferRow, stacks: string[]) {
  const corpus = `${offer.title} ${truncateForScoring(offer.description)}`;
  const matches = stacks.filter((stack) => corpus.toLowerCase().includes(stack.toLowerCase()));
  const score = Math.min(60 + matches.length * 12 + ((offer.remote ?? "").toLowerCase().includes("remote") ? 5 : 0), 99);
  const decision: "KEEP" | "DROP" = score >= 75 ? "KEEP" : "DROP";
  return {
    score,
    decision,
    reasons: matches.length
      ? [`Stack match: ${matches.join(", ")}`, offer.remote ? `Mode ${offer.remote}` : "Mode unspecified"]
      : ["Low stack overlap"],
    missing: matches.length ? [] : ["Stack keywords missing in title/description"],
  };
}

function makePitch(offer: OfferRow, reasons: string[]) {
  return {
    subject: `${offer.title} — profil DevOps/Cloud compatible`,
    pitch: `Bonjour, mission ${offer.title} alignée. Raisons: ${reasons.slice(0, 2).join("; ")}. Je peux contribuer rapidement sur le delivery et la fiabilité plateforme.`,
  };
}

function countryMatch(offerCountry: string | null, countries: string[]) {
  if (!countries.length) return true;
  if (!offerCountry) return false;
  return countries.some((country) => offerCountry.toLowerCase().includes(country.toLowerCase()));
}

function remoteMatch(offerRemote: string | null, remotePreference: string | null) {
  const mode = (offerRemote ?? "").toLowerCase();
  if (!remotePreference || remotePreference === "remote") return mode.includes("remote") || mode.length === 0;
  if (remotePreference === "hybrid") return mode.includes("hybrid") || mode.includes("remote");
  return mode.includes("onsite");
}

function weekWindow() {
  const now = new Date();
  const monday = new Date(now);
  const day = monday.getUTCDay();
  monday.setUTCDate(monday.getUTCDate() + (day === 0 ? -6 : 1 - day));
  monday.setUTCHours(0, 0, 0, 0);
  const end = new Date(monday);
  end.setUTCDate(monday.getUTCDate() + 7);
  return { start: monday.toISOString(), end: end.toISOString() };
}

export async function runMatchingEngine() {
  const service = createSupabaseServiceClient();

  const { data: activeSubs, error: subError } = await service
    .from("subscriptions")
    .select("user_id")
    .in("status", ["active", "trialing"]);
  if (subError) throw new Error("matching_subscriptions_failed");

  const eligibleUserIds = (activeSubs ?? []).map((sub) => sub.user_id);
  if (!eligibleUserIds.length) {
    return { users: 0, createdMissions: 0, queuedNotifications: 0, remainingBudget: MAX_SCORING_TOTAL };
  }

  const { data: users, error: usersError } = await service
    .from("user_settings")
    .select(
      "user_id, primary_stack, secondary_stack, min_day_rate, remote_preference, countries, notify_email, notify_whatsapp, whatsapp_number, notify_sms, sms_number"
    )
    .eq("radar_active", true)
    .in("user_id", eligibleUserIds);
  if (usersError) throw new Error("matching_users_failed");

  const { data: profiles } = await service.from("profiles").select("user_id, email").in(
    "user_id",
    (users ?? []).map((u) => u.user_id)
  );
  const emailByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.email]));

  const { data: offerPool, error: offerError } = await service
    .from("offers_raw")
    .select("source, title, company, country, remote, day_rate, url, description, hash")
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(400);
  if (offerError) throw new Error("matching_offers_failed");

  let budget = MAX_SCORING_TOTAL;
  let createdMissions = 0;
  let queuedNotifications = 0;

  for (const user of (users ?? []) as UserSettingsRow[]) {
    if (budget <= 0) break;

    const stacks = [user.primary_stack, user.secondary_stack].filter(Boolean) as string[];
    const filtered = (offerPool ?? [])
      .filter((offer) => countryMatch(offer.country, user.countries ?? []))
      .filter((offer) => remoteMatch(offer.remote, user.remote_preference))
      .filter((offer) => textContainsAny(`${offer.title} ${offer.description ?? ""}`, stacks))
      .slice(0, Math.min(MAX_OFFERS_PER_USER, budget));

    if (!filtered.length) continue;

    const { data: cacheRows } = await service
      .from("user_offer_scores")
      .select("offer_hash, score, decision, reasons, subject, pitch")
      .eq("user_id", user.user_id)
      .in("offer_hash", filtered.map((offer) => offer.hash));

    const cache = new Map((cacheRows ?? []).map((row: any) => [row.offer_hash, row]));
    const scored: Array<{ offer: OfferRow; score: number; decision: "KEEP" | "DROP"; reasons: string; subject: string; pitch: string }> = [];

    for (const offer of filtered as OfferRow[]) {
      const cached = cache.get(offer.hash);
      if (cached) {
        scored.push({
          offer,
          score: Number(cached.score),
          decision: cached.decision,
          reasons: cached.reasons,
          subject: cached.subject,
          pitch: cached.pitch,
        });
        continue;
      }

      const scoredOffer = heuristicScore(offer, stacks);
      const pitch = makePitch(offer, scoredOffer.reasons);
      budget -= 1;

      await service.from("user_offer_scores").upsert(
        {
          user_id: user.user_id,
          offer_hash: offer.hash,
          score: scoredOffer.score,
          decision: scoredOffer.decision,
          reasons: scoredOffer.reasons.join(" | "),
          missing: scoredOffer.missing.join(" | "),
          subject: pitch.subject,
          pitch: pitch.pitch,
        },
        { onConflict: "user_id,offer_hash" }
      );

      scored.push({
        offer,
        score: scoredOffer.score,
        decision: scoredOffer.decision,
        reasons: scoredOffer.reasons.join(" | "),
        subject: pitch.subject,
        pitch: pitch.pitch,
      });

      if (budget <= 0) break;
    }

    const window = weekWindow();
    const { data: currentWeekMissions } = await service
      .from("missions")
      .select("url")
      .eq("user_id", user.user_id)
      .gte("created_at", window.start)
      .lt("created_at", window.end);
    const existingUrls = new Set((currentWeekMissions ?? []).map((mission) => mission.url));

    const selected = scored
      .filter((row) => !existingUrls.has(row.offer.url))
      .sort((a, b) => {
        const aKeep = a.decision === "KEEP" ? 1 : 0;
        const bKeep = b.decision === "KEEP" ? 1 : 0;
        if (aKeep !== bKeep) return bKeep - aKeep;
        return b.score - a.score;
      })
      .filter((row, index) => row.decision === "KEEP" || row.score >= 70 || index < 3)
      .slice(0, 3);

    for (const mission of selected) {
      const { data: insertedMission, error: missionError } = await service
        .from("missions")
        .insert({
          user_id: user.user_id,
          source: mission.offer.source,
          title: mission.offer.title,
          company: mission.offer.company,
          country: mission.offer.country,
          remote: mission.offer.remote,
          day_rate: mission.offer.day_rate,
          url: mission.offer.url,
          score: mission.score,
          reasons: mission.reasons,
          pitch: mission.pitch,
        })
        .select("id")
        .maybeSingle();

      if (missionError || !insertedMission) continue;
      createdMissions += 1;

      await service
        .from("user_offer_scores")
        .update({ mission_id: insertedMission.id })
        .eq("user_id", user.user_id)
        .eq("offer_hash", mission.offer.hash);

      const channels: Array<{ channel: "email" | "whatsapp" | "sms"; to: string | null }> = [
        { channel: "email", to: emailByUserId.get(user.user_id) ?? null },
        { channel: "whatsapp", to: user.notify_whatsapp ? user.whatsapp_number : null },
        { channel: "sms", to: user.notify_sms ? user.sms_number : null },
      ];

      const queueRows = channels
        .filter((channel) => channel.to)
        .map((channel) => ({
          user_id: user.user_id,
          mission_id: insertedMission.id,
          channel: channel.channel,
          to: channel.to!,
          payload: {
            channel: channel.channel,
            to: channel.to,
            subject: mission.subject,
            message: mission.pitch,
            mission_url: mission.offer.url,
            pitch: mission.pitch,
            reasons: mission.reasons,
          },
          status: "pending",
        }));

      if (queueRows.length) {
        const { error: queueError } = await service.from("notification_queue").insert(queueRows);
        if (!queueError) queuedNotifications += queueRows.length;
      }
    }
  }

  return {
    users: users?.length ?? 0,
    createdMissions,
    queuedNotifications,
    remainingBudget: budget,
    limits: { maxPerUser: MAX_OFFERS_PER_USER, maxTotal: MAX_SCORING_TOTAL },
  };
}
