import { NextResponse } from "next/server";
import { runMatchingEngine } from "@/lib/matching-engine";
import { isAuthorizedJobRequest } from "@/lib/jobs-auth";
import { createSupabaseServiceClient } from "@/lib/supabase";

const CRON_LOCK_KEY = "cron_lock";
const LAST_CRON_RUN_KEY = "last_cron_run";

async function acquireCronLock() {
  const service = createSupabaseServiceClient();

  await service.from("system_state").upsert(
    {
      key: CRON_LOCK_KEY,
      value: "unlocked",
    },
    { onConflict: "key", ignoreDuplicates: true }
  );

  const { data, error } = await service
    .from("system_state")
    .update({ value: "locked" })
    .eq("key", CRON_LOCK_KEY)
    .neq("value", "locked")
    .select("key")
    .maybeSingle();

  if (error || !data) return false;
  return true;
}

async function releaseCronLock() {
  const service = createSupabaseServiceClient();
  await service
    .from("system_state")
    .update({ value: "unlocked" })
    .eq("key", CRON_LOCK_KEY);
}

async function writeRunTimestamp(startedAt: string, endedAt: string, status: "ok" | "error") {
  const service = createSupabaseServiceClient();
  await service.from("system_state").upsert(
    {
      key: LAST_CRON_RUN_KEY,
      value: JSON.stringify({ startedAt, endedAt, status }),
    },
    { onConflict: "key" }
  );
}

export async function POST(request: Request) {
  if (!isAuthorizedJobRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  console.log(`[cron] matching_start ts=${startedAt}`);

  const hasLock = await acquireCronLock();
  if (!hasLock) {
    console.log("[cron] matching_skipped reason=lock_already_held");
    return NextResponse.json({ ok: true, skipped: true, reason: "previous_run_not_finished" });
  }

  try {
    const result = await runMatchingEngine();
    const endedAt = new Date().toISOString();
    console.log(`[cron] matching_end ts=${endedAt}`);
    await writeRunTimestamp(startedAt, endedAt, "ok");
    return NextResponse.json({ ok: true, ...result });
  } catch {
    const endedAt = new Date().toISOString();
    console.error(`[cron] matching_failed ts=${endedAt}`);
    await writeRunTimestamp(startedAt, endedAt, "error");
    return NextResponse.json({ ok: false, error: "Matching failed" }, { status: 500 });
  } finally {
    await releaseCronLock();
  }
}

export const GET = POST;
