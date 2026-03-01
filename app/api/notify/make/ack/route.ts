import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { isAuthorizedMakeRequest } from "@/lib/jobs-auth";

type AckBody = {
  id: string;
  status: "sent" | "failed";
  error?: string;
};

export async function POST(request: Request) {
  if (!isAuthorizedMakeRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as AckBody | null;
  if (!body?.id || (body.status !== "sent" && body.status !== "failed")) {
    return NextResponse.json({ ok: false, error: "Validation failed" }, { status: 400 });
  }

  const service = createSupabaseServiceClient();
  const { data: current, error: fetchError } = await service
    .from("notification_queue")
    .select("attempts")
    .eq("id", body.id)
    .maybeSingle();

  if (fetchError || !current) {
    return NextResponse.json({ ok: false, error: "Queue item not found" }, { status: 404 });
  }

  const { error: updateError } = await service
    .from("notification_queue")
    .update({
      status: body.status,
      attempts: (current.attempts ?? 0) + 1,
      last_error: body.status === "failed" ? (body.error ?? "Unknown error").slice(0, 1000) : null,
    })
    .eq("id", body.id);

  if (updateError) {
    return NextResponse.json({ ok: false, error: "Ack update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
