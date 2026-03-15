import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { isAuthorizedMakeRequest } from "@/lib/jobs-auth";

type QueueRow = {
  id: string;
  user_id: string;
  mission_id: string;
  channel: "email" | "whatsapp" | "sms";
  to: string;
  payload: Record<string, unknown> | null;
  attempts: number;
  created_at: string;
  user_settings: { notifications_enabled: boolean } | { notifications_enabled: boolean }[] | null;
};

function notificationsEnabled(setting: QueueRow["user_settings"]) {
  if (!setting) return true;
  const row = Array.isArray(setting) ? setting[0] : setting;
  return row?.notifications_enabled !== false;
}

export async function POST(request: Request) {
  if (!isAuthorizedMakeRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { limit?: number };
  const limit = Math.max(1, Math.min(50, Number(body.limit) || 20));

  const service = createSupabaseServiceClient();
  const { data, error } = await service
    .from("notification_queue")
    .select("id, user_id, mission_id, channel, to, payload, attempts, created_at, user_settings!inner(notifications_enabled)")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit)
    .returns<QueueRow[]>();

  if (error) {
    console.error("[make-pull] queue fetch failed");
    return NextResponse.json({ ok: false, error: "Queue fetch failed" }, { status: 500 });
  }

  const queueItems = data ?? [];
  const suppressedIds = queueItems.filter((item) => !notificationsEnabled(item.user_settings)).map((item) => item.id);

  if (suppressedIds.length) {
    await service
      .from("notification_queue")
      .update({
        status: "sent",
        last_error: "suppressed: notifications disabled",
      })
      .in("id", suppressedIds);
  }

  const items = queueItems
    .filter((item) => notificationsEnabled(item.user_settings))
    .map((item) => ({
      id: item.id,
      user_id: item.user_id,
      mission_id: item.mission_id,
      channel: item.channel,
      to: item.to,
      payload: item.payload,
      attempts: item.attempts,
      created_at: item.created_at,
    }));

  return NextResponse.json({ ok: true, items, suppressed: suppressedIds.length });
}
