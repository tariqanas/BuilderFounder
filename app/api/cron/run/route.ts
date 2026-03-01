import { NextResponse } from "next/server";
import { collectOffers } from "@/lib/offers-collector";
import { runMatchingEngine } from "@/lib/matching-engine";
import { isAuthorizedCronRequest } from "@/lib/jobs-auth";
import { createSupabaseServiceClient } from "@/lib/supabase";

const LAST_CRON_RUN_KEY = "last_cron_run";

async function writeRunTimestamp(startedAt: string, endedAt: string, status: "ok" | "error") {
  const service = createSupabaseServiceClient();
  await service
    .from("system_state")
    .upsert({ key: LAST_CRON_RUN_KEY, value: JSON.stringify({ startedAt, endedAt, status }) }, { onConflict: "key" });
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  console.log(`[cron] run_start ts=${startedAt}`);

  try {
    const offers = await collectOffers();
    const matching = await runMatchingEngine();
    const endedAt = new Date().toISOString();

    const summary = {
      ok: true,
      startedAt,
      endedAt,
      offersCollected: offers.inserted,
      offersReceived: offers.received,
      usersProcessed: matching.usersProcessed,
      createdMissions: matching.createdMissions,
      queuedNotifications: matching.queuedNotifications,
      aiCalls: matching.aiCalls,
    };

    await writeRunTimestamp(startedAt, endedAt, "ok");

    console.log(
      `[cron] run_end ts=${endedAt} offers_collected=${summary.offersCollected} users_processed=${summary.usersProcessed} missions=${summary.createdMissions} notifications=${summary.queuedNotifications}`
    );

    return NextResponse.json(summary);
  } catch (error) {
    const endedAt = new Date().toISOString();
    await writeRunTimestamp(startedAt, endedAt, "error");
    console.error(`[cron] run_failed ${(error as Error).message}`);
    return NextResponse.json({ ok: false, error: "Cron run failed" }, { status: 500 });
  }
}
