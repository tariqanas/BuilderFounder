import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { checkRateLimit, safeCompare } from "@/lib/security";
import { isEmail, isNonEmptyString, isValidUrl, toInt } from "@/lib/validators";

type IngestBody = {
  userEmail: string;
  mission: {
    source: string;
    title: string;
    company: string;
    country: string;
    remote: string;
    dayRate: number;
    url: string;
    score: number;
    reasons: string;
    pitch: string;
  };
};

function parsePayload(payload: unknown): IngestBody | null {
  const body = payload as IngestBody;
  const mission = body?.mission;

  if (
    !isEmail(body?.userEmail) ||
    !mission ||
    !isNonEmptyString(mission.source, 100) ||
    !isNonEmptyString(mission.title, 140) ||
    !isNonEmptyString(mission.company, 200) ||
    !isNonEmptyString(mission.country, 100) ||
    !isNonEmptyString(mission.remote, 50) ||
    toInt(mission.dayRate, 0, 100000) === null ||
    !isValidUrl(mission.url, 2048) ||
    toInt(mission.score, 0, 100) === null ||
    !isNonEmptyString(mission.reasons, 400) ||
    !isNonEmptyString(mission.pitch, 1200)
  ) {
    return null;
  }

  return {
    userEmail: body.userEmail,
    mission: {
      ...mission,
      title: mission.title.trim(),
      reasons: mission.reasons.trim(),
      pitch: mission.pitch.trim(),
      score: toInt(mission.score, 0, 100)!,
      dayRate: toInt(mission.dayRate, 0, 100000)!,
    },
  };
}

export async function POST(request: Request) {
  const key = request.headers.get("x-api-key");
  if (!safeCompare(env.MAKE_INGEST_KEY, key)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const ipKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rate = checkRateLimit(`ingest:${ipKey}`, 60, 60_000);
  if (!rate.ok) {
    return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
  }

  const payload = parsePayload(await request.json().catch(() => null));
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Validation failed" }, { status: 400 });
  }

  const service = createSupabaseServiceClient();
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("user_id")
    .eq("email", payload.userEmail)
    .maybeSingle();

  if (profileError) {
    console.error("[ingest] profile lookup failed");
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  const { data: subscription } = await service
    .from("subscriptions")
    .select("status")
    .eq("user_id", profile.user_id)
    .maybeSingle();

  if (!subscription || !["active", "trialing"].includes(subscription.status)) {
    return NextResponse.json({ ok: false, error: "Subscription required" }, { status: 403 });
  }

  const { error: insertError } = await service.from("missions").insert({
    user_id: profile.user_id,
    source: payload.mission.source,
    title: payload.mission.title,
    company: payload.mission.company,
    country: payload.mission.country,
    remote: payload.mission.remote,
    day_rate: payload.mission.dayRate,
    url: payload.mission.url,
    score: payload.mission.score,
    reasons: payload.mission.reasons,
    pitch: payload.mission.pitch,
  });

  if (insertError) {
    console.error("[ingest] mission insert failed");
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
