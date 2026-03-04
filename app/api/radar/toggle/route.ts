import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { requireUser } from "@/lib/server-auth";

export async function POST(request: Request) {
  const { user } = await requireUser();
  const service = createSupabaseServiceClient();

  const { data: settings } = await service.from("user_settings").select("radar_active").eq("user_id", user.id).maybeSingle();
  const nextValue = !settings?.radar_active;

  const { error } = await service
    .from("user_settings")
    .upsert({ user_id: user.id, radar_active: nextValue }, { onConflict: "user_id" });
  if (error) {
    return NextResponse.redirect(new URL("/app?notice=radar-update-failed", request.url), { status: 303 });
  }

  return NextResponse.redirect(new URL(`/app?notice=${nextValue ? "radar-activated" : "radar-paused"}`, request.url), { status: 303 });
}
