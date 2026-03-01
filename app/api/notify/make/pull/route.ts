import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { isAuthorizedMakeRequest } from "@/lib/jobs-auth";

export async function POST(request: Request) {
  if (!isAuthorizedMakeRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { limit?: number };
  const limit = Math.max(1, Math.min(50, Number(body.limit) || 20));

  const service = createSupabaseServiceClient();
  const { data, error } = await service
    .from("notification_queue")
    .select("id, user_id, mission_id, channel, to, payload, attempts, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[make-pull] queue fetch failed");
    return NextResponse.json({ ok: false, error: "Queue fetch failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [] });
}
