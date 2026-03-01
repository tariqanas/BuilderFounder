import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { safeCompare } from "@/lib/security";
import { createSupabaseServiceClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const key = request.headers.get("x-health-key");
  if (!safeCompare(env.HEALTH_KEY, key)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const service = createSupabaseServiceClient();
  const { error } = await service.from("profiles").select("user_id", { head: true, count: "exact" }).limit(1);

  if (error) {
    return NextResponse.json({ ok: false, db: "down" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, db: "up" });
}
