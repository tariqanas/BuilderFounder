import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { isEmail, isNonEmptyString, isValidUrl, toInt } from "@/lib/validators";

export async function POST(request: Request) {
  if (request.headers.get("x-api-key") !== env.MAKE_INGEST_KEY) {
    return NextResponse.json({ ok: false, error: "Invalid API key" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as any;
  const mission = body?.mission;

  if (
    !isEmail(body?.userEmail) ||
    !mission ||
    !isNonEmptyString(mission.source, 100) ||
    !isNonEmptyString(mission.title, 200) ||
    !isNonEmptyString(mission.company, 200) ||
    !isNonEmptyString(mission.country, 100) ||
    !isNonEmptyString(mission.remote, 50) ||
    toInt(mission.dayRate, 0, 100000) === null ||
    !isValidUrl(mission.url, 2048) ||
    toInt(mission.score, 0, 100) === null ||
    !isNonEmptyString(mission.reasons, 4000) ||
    !isNonEmptyString(mission.pitch, 4000)
  ) {
    return NextResponse.json({ ok: false, error: "Validation failed" }, { status: 400 });
  }

  const service = createSupabaseServiceClient();
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("user_id")
    .eq("email", body.userEmail)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  const { error: insertError } = await service.from("missions").insert({
    user_id: profile.user_id,
    source: mission.source,
    title: mission.title,
    company: mission.company,
    country: mission.country,
    remote: mission.remote,
    day_rate: toInt(mission.dayRate, 0, 100000),
    url: mission.url,
    score: toInt(mission.score, 0, 100),
    reasons: mission.reasons,
    pitch: mission.pitch,
  });

  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
