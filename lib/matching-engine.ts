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

type ScoreResult = {
  score: number;
  decision: "KEEP" | "DROP";
  reasons: string[];
  missing: string[];
};

type CachedScoreRow = {
  offer_hash: string;
  score: number;
  decision: "KEEP" | "DROP";
  reasons: string;
  missing: string | null;
  subject: string;
  pitch: string;
};

type AIBudget = {
  maxCalls: number;
  currentCalls: number;
  estimatedTokens: number;
};

// Hard caps to keep matching cost and latency bounded at 100-500 concurrent users.
const MAX_OFFERS_PER_USER = 20;
const MAX_OFFERS_TOTAL = 300;
const WEEKLY_MAX_MISSIONS = 3;

const DEFAULT_MAX_AI_CALLS_PER_RUN = 300;

export const SCORING_PROMPT = `You are a technical staffing scorer.
Return strict JSON only: {"score":number,"decision":"KEEP"|"DROP","reasons":string[],"missing":string[]}
Rules:
- score 0..100 integer
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

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function stripHtml(text: string) {
  return text.replace(/<[^>]*>/g, " ");
}

function cleanDescription(text: string | null) {
  const raw = text ?? "";
  const withoutHtml = stripHtml(raw);
  const normalized = normalizeWhitespace(withoutHtml);
  return normalized.slice(0, 1500);
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function textContains(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function countryMatch(offerCountry: string | null, countries: string[]) {
  if (!countries.length) return true;
  if (!offerCountry) return false;
  const lc = offerCountry.toLowerCase();
  return countries.some((country) => lc.includes(country.toLowerCase()));
}

function remoteMatch(offerRemote: string | null, remotePreference: string | null) {
  const mode = (offerRemote ?? "").toLowerCase();
  if (!remotePreference || remotePreference === "remote") return mode.includes("remote") || mode.length === 0;
  if (remotePreference === "hybrid") return mode.includes("hybrid") || mode.includes("remote");
  return mode.includes("onsite");
}

function dayRateMatch(offerDayRate: number | null, minDayRate: number | null) {
  if (minDayRate === null || minDayRate === undefined) return true;
  if (offerDayRate === null || offerDayRate === undefined) return false;
  return Number(offerDayRate) >= Number(minDayRate);
}

function deterministicPreFilter(user: UserSettingsRow, offerPool: OfferRow[]) {
  // Layer 1: deterministic filter only, no AI calls.
  const searchCorpus = (offer: OfferRow) => `${offer.title} ${offer.description ?? ""}`;
  return offerPool
    .filter((offer) => countryMatch(offer.country, user.countries ?? []))
    .filter((offer) => remoteMatch(offer.remote, user.remote_preference))
    .filter((offer) => textContains(searchCorpus(offer), user.primary_stack))
    .filter((offer) => dayRateMatch(offer.day_rate, user.min_day_rate));
}

function weekWindowParis() {
  const now = new Date();
  const parisDate = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const day = parisDate.getDay() || 7;
  parisDate.setHours(0, 0, 0, 0);
  parisDate.setDate(parisDate.getDate() - day + 1);
  const end = new Date(parisDate);
  end.setDate(parisDate.getDate() + 7);
  return {
    start: parisDate.toISOString(),
    end: end.toISOString(),
  };
}

function fallbackScore(offer: OfferRow, stacks: string[]): ScoreResult {
  const corpus = `${offer.title} ${cleanDescription(offer.description)}`.toLowerCase();
  const matches = stacks.filter((stack) => corpus.includes(stack.toLowerCase()));
  const score = Math.min(55 + matches.length * 15 + ((offer.remote ?? "").toLowerCase().includes("remote") ? 5 : 0), 95);
  return {
    score,
    decision: score >= 70 ? "KEEP" : "DROP",
    reasons: matches.length ? [`Stack overlap: ${matches.join(", ")}`] : ["Weak stack overlap"],
    missing: matches.length ? [] : ["Missing matching stack keywords"],
  };
}

function parseScoreJson(raw: string): ScoreResult | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ScoreResult>;
    if (typeof parsed.score !== "number") return null;
    if (parsed.decision !== "KEEP" && parsed.decision !== "DROP") return null;
    if (!Array.isArray(parsed.reasons) || !Array.isArray(parsed.missing)) return null;
    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score))),
      decision: parsed.decision,
      reasons: parsed.reasons.slice(0, 4).map((r) => normalizeWhitespace(String(r))).filter(Boolean),
      missing: parsed.missing.slice(0, 6).map((m) => normalizeWhitespace(String(m))).filter(Boolean),
    };
  } catch {
    return null;
  }
}

async function scoreWithOpenAI(
  offer: OfferRow,
  stacks: string[],
  user: UserSettingsRow,
  budget: AIBudget
): Promise<ScoreResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (budget.currentCalls >= budget.maxCalls) return null;

  const content = cleanDescription(offer.description);
  const promptBody = {
    user_preferences: {
      primary_stack: user.primary_stack,
      secondary_stack: user.secondary_stack,
      min_day_rate: user.min_day_rate,
      remote_preference: user.remote_preference,
      countries: user.countries ?? [],
    },
    stacks,
    offer: {
      title: offer.title,
      company: offer.company,
      country: offer.country,
      remote: offer.remote,
      day_rate: offer.day_rate,
      description: content,
    },
  };
  const bodyString = JSON.stringify(promptBody);
  const estimated = estimateTokens(bodyString) + estimateTokens(SCORING_PROMPT);
  budget.estimatedTokens += estimated;

  async function doCall() {
    budget.currentCalls += 1;
    console.log(`[matching] ai_call=${budget.currentCalls}/${budget.maxCalls} est_tokens=${estimated}`);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        input: [
          { role: "system", content: SCORING_PROMPT },
          { role: "user", content: bodyString },
        ],
        max_output_tokens: 220,
      }),
    });

    if (!response.ok) {
      console.error(`[matching] ai_http_error status=${response.status}`);
      return null;
    }

    const payload = (await response.json()) as { output_text?: string };
    if (!payload.output_text) return null;
    return parseScoreJson(payload.output_text);
  }

  // Deterministic retry policy: one retry only, then drop the offer.
  const firstTry = await doCall();
  if (firstTry) return firstTry;
  const secondTry = await doCall();
  if (secondTry) return secondTry;

  console.warn(`[matching] drop_offer_after_json_fail offer_hash=${offer.hash} user_id=${user.user_id}`);
  return null;
}

function makePitch(offer: OfferRow, reasons: string[]) {
  return {
    subject: `${offer.title} — profil DevOps/Cloud compatible`,
    pitch: `Bonjour, mission ${offer.title} alignée. Raisons: ${reasons.slice(0, 2).join("; ")}. Je peux contribuer rapidement sur le delivery et la fiabilité plateforme.`,
  };
}

export async function runMatchingEngine() {
  const service = createSupabaseServiceClient();
  const runStarted = Date.now();

  const configuredAiCap = Number(process.env.MAX_AI_CALLS_PER_RUN || DEFAULT_MAX_AI_CALLS_PER_RUN);
  const aiBudget: AIBudget = {
    maxCalls: Number.isFinite(configuredAiCap) && configuredAiCap > 0 ? Math.floor(configuredAiCap) : DEFAULT_MAX_AI_CALLS_PER_RUN,
    currentCalls: 0,
    estimatedTokens: 0,
  };

  const simulateUsers = Number(process.env.SIMULATE_USERS || 0);

  const { data: activeSubs, error: subError } = await service
    .from("subscriptions")
    .select("user_id")
    .in("status", ["active", "trialing"]);
  if (subError) throw new Error("matching_subscriptions_failed");

  const eligibleUserIds = (activeSubs ?? []).map((sub) => sub.user_id);
  if (!eligibleUserIds.length) {
    return { users: 0, createdMissions: 0, queuedNotifications: 0, aiCalls: 0, aiEstimatedTokens: 0 };
  }

  const { data: users, error: usersError } = await service
    .from("user_settings")
    .select(
      "user_id, primary_stack, secondary_stack, min_day_rate, remote_preference, countries, notify_email, notify_whatsapp, whatsapp_number, notify_sms, sms_number"
    )
    .eq("radar_active", true)
    .in("user_id", eligibleUserIds);
  if (usersError) throw new Error("matching_users_failed");

  const runUsers = ((users ?? []) as UserSettingsRow[]);
  const scopedUsers = simulateUsers > 0 ? runUsers.slice(0, Math.max(0, Math.floor(simulateUsers))) : runUsers;

  const { data: profiles } = await service.from("profiles").select("user_id, email").in(
    "user_id",
    scopedUsers.map((u) => u.user_id)
  );
  const emailByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.email]));

  const { data: offerPool, error: offerError } = await service
    .from("offers_raw")
    .select("source, title, company, country, remote, day_rate, url, description, hash")
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(500);
  if (offerError) throw new Error("matching_offers_failed");

  let remainingGlobalCap = MAX_OFFERS_TOTAL;
  let createdMissions = 0;
  let queuedNotifications = 0;
  let usersProcessed = 0;

  for (const user of scopedUsers) {
    if (remainingGlobalCap <= 0) {
      console.warn("[matching] global_offer_cap_reached");
      break;
    }

    const stacks = [user.primary_stack, user.secondary_stack].filter(Boolean) as string[];
    const preFiltered = deterministicPreFilter(user, (offerPool ?? []) as OfferRow[]);
    const candidates = preFiltered.slice(0, Math.min(MAX_OFFERS_PER_USER, remainingGlobalCap));
    remainingGlobalCap -= candidates.length;

    if (!candidates.length) {
      usersProcessed += 1;
      continue;
    }

    const window = weekWindowParis();
    const { data: currentWeekMissions } = await service
      .from("missions")
      .select("id, url")
      .eq("user_id", user.user_id)
      .gte("created_at", window.start)
      .lt("created_at", window.end);

    const sentThisWeek = currentWeekMissions?.length ?? 0;
    if (sentThisWeek >= WEEKLY_MAX_MISSIONS) {
      console.log(`[matching] skip_user_weekly_limit user_id=${user.user_id} sent_this_week=${sentThisWeek}`);
      usersProcessed += 1;
      continue;
    }

    const existingUrls = new Set((currentWeekMissions ?? []).map((mission) => mission.url));

    const { data: cacheRows } = await service
      .from("user_offer_scores")
      .select("offer_hash, score, decision, reasons, missing, subject, pitch")
      .eq("user_id", user.user_id)
      .in("offer_hash", candidates.map((offer) => offer.hash));

    const cache = new Map((cacheRows ?? ([] as CachedScoreRow[])).map((row) => [row.offer_hash, row]));

    const scored: Array<{ offer: OfferRow; score: number; decision: "KEEP" | "DROP"; reasons: string; subject: string; pitch: string }> = [];

    for (const offer of candidates) {
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

      if (aiBudget.currentCalls >= aiBudget.maxCalls) {
        console.warn("[matching] max_ai_calls_reached_stopping_run");
        break;
      }

      const aiScore = await scoreWithOpenAI(offer, stacks, user, aiBudget);
      if (aiBudget.currentCalls > aiBudget.maxCalls) {
        console.warn("[matching] ai_budget_exceeded_hard_stop");
        break;
      }

      // If AI fails (HTTP/parse), drop candidate safely for this user.
      const finalScore = aiScore ?? fallbackScore(offer, stacks);
      if (!aiScore && process.env.OPENAI_API_KEY) {
        continue;
      }

      const pitch = makePitch(offer, finalScore.reasons);
      await service.from("user_offer_scores").upsert(
        {
          user_id: user.user_id,
          offer_hash: offer.hash,
          score: finalScore.score,
          decision: finalScore.decision,
          reasons: finalScore.reasons.join(" | "),
          missing: finalScore.missing.join(" | "),
          subject: pitch.subject,
          pitch: pitch.pitch,
        },
        { onConflict: "user_id,offer_hash" }
      );

      scored.push({
        offer,
        score: finalScore.score,
        decision: finalScore.decision,
        reasons: finalScore.reasons.join(" | "),
        subject: pitch.subject,
        pitch: pitch.pitch,
      });
    }

    if (aiBudget.currentCalls >= aiBudget.maxCalls) {
      console.warn("[matching] hard_stop_due_to_ai_cap");
      break;
    }

    const slotsLeft = Math.max(0, WEEKLY_MAX_MISSIONS - sentThisWeek);
    if (slotsLeft === 0) {
      usersProcessed += 1;
      continue;
    }

    const selected = scored
      .filter((row) => !existingUrls.has(row.offer.url))
      .filter((row) => row.score >= 70)
      .sort((a, b) => b.score - a.score)
      .slice(0, slotsLeft);

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
        { channel: "email", to: user.notify_email ? (emailByUserId.get(user.user_id) ?? null) : null },
        { channel: "whatsapp", to: user.notify_whatsapp ? user.whatsapp_number : null },
        { channel: "sms", to: user.notify_sms ? user.sms_number : null },
      ];

      for (const channel of channels.filter((c) => c.to)) {
        const { data: existingQueue } = await service
          .from("notification_queue")
          .select("id")
          .eq("user_id", user.user_id)
          .eq("mission_id", insertedMission.id)
          .eq("channel", channel.channel)
          .in("status", ["pending", "sent"])
          .limit(1)
          .maybeSingle();

        if (existingQueue) continue;

        const { error: queueError } = await service.from("notification_queue").insert({
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
        });

        if (!queueError) queuedNotifications += 1;
      }
    }

    usersProcessed += 1;
  }

  const durationMs = Date.now() - runStarted;
  const avgAiCallsPerUser = usersProcessed > 0 ? Number((aiBudget.currentCalls / usersProcessed).toFixed(2)) : 0;

  console.log(
    `[matching] finished users_processed=${usersProcessed} missions=${createdMissions} notifications=${queuedNotifications} ai_calls=${aiBudget.currentCalls} estimated_tokens=${aiBudget.estimatedTokens} duration_ms=${durationMs} avg_ai_calls_per_user=${avgAiCallsPerUser}`
  );

  return {
    users: scopedUsers.length,
    usersProcessed,
    createdMissions,
    queuedNotifications,
    aiCalls: aiBudget.currentCalls,
    aiEstimatedTokens: aiBudget.estimatedTokens,
    avgAiCallsPerUser,
    limits: { maxPerUser: MAX_OFFERS_PER_USER, maxTotal: MAX_OFFERS_TOTAL, maxAiCallsPerRun: aiBudget.maxCalls },
    simulation: simulateUsers > 0,
    durationMs,
  };
}
