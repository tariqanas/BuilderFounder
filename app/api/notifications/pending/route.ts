import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { isAuthorizedMakeRequest } from "@/lib/jobs-auth";

type PendingQueryRow = {
  id: string;
  channel: "email" | "whatsapp" | "sms";
  to: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  missions:
    | {
        title: string;
        company: string;
        url: string;
        pitch: string | null;
        score: number | null;
      }
    | null;
};

export async function GET(request: Request) {
  if (!isAuthorizedMakeRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.max(1, Math.min(20, Number(searchParams.get("limit")) || 10));

  const service = createSupabaseServiceClient();
  const { data, error } = await service
    .from("notification_queue")
    .select("id, channel, to, payload, created_at, missions(title, company, url, pitch, score)")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit)
    .returns<PendingQueryRow[]>();

  if (error) {
    console.error("[notifications-pending] queue fetch failed");
    return NextResponse.json({ ok: false, error: "Queue fetch failed" }, { status: 500 });
  }

  const items = (data ?? []).map((row) => ({
    id: row.id,
    channel: row.channel,
    to: row.to,
    created_at: row.created_at,
    title: row.missions?.title ?? null,
    company: row.missions?.company ?? null,
    url: row.missions?.url ?? null,
    pitch: row.missions?.pitch ?? null,
    score: row.missions?.score ?? null,
    payload: row.payload,
  }));

  return NextResponse.json({ ok: true, items });
}
