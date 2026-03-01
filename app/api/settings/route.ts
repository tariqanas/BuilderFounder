import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { isE164Phone, isNonEmptyString, toInt } from "@/lib/validators";
import { requireUser } from "@/lib/server-auth";

export async function POST(request: Request) {
  const { user } = await requireUser();
  const service = createSupabaseServiceClient();
  const formData = await request.formData();

  const primaryStack = formData.get("primaryStack");
  const secondaryStack = formData.get("secondaryStack");
  const minDayRate = formData.get("minDayRate");
  const remotePreference = formData.get("remotePreference");
  const countries = formData.get("countries");
  const notifyEmail = formData.get("notifyEmail") === "on";
  const notifyWhatsapp = formData.get("notifyWhatsapp") === "on";
  const whatsappNumber = formData.get("whatsappNumber");
  const notifySms = formData.get("notifySms") === "on";
  const smsNumber = formData.get("smsNumber");

  const minDayRateInt = toInt(minDayRate, 1, 10000);
  const allowedRemote = remotePreference === "remote" || remotePreference === "hybrid" || remotePreference === "onsite";

  if (
    !isNonEmptyString(primaryStack, 120) ||
    (secondaryStack && !isNonEmptyString(secondaryStack, 120)) ||
    minDayRateInt === null ||
    !allowedRemote ||
    !isNonEmptyString(countries, 100) ||
    (notifyWhatsapp && !isE164Phone(whatsappNumber)) ||
    (notifySms && !isE164Phone(smsNumber))
  ) {
    return NextResponse.redirect(new URL("/app/settings?notice=invalid", request.url), { status: 303 });
  }

  const { error } = await service.from("user_settings").upsert(
    {
      user_id: user.id,
      primary_stack: String(primaryStack),
      secondary_stack: secondaryStack ? String(secondaryStack) : null,
      min_day_rate: minDayRateInt,
      remote_preference: String(remotePreference),
      countries: String(countries)
        .split(",")
        .map((country) => country.trim())
        .filter(Boolean),
      notify_email: notifyEmail,
      notify_whatsapp: notifyWhatsapp,
      whatsapp_number: notifyWhatsapp ? String(whatsappNumber) : null,
      notify_sms: notifySms,
      sms_number: notifySms ? String(smsNumber) : null,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.redirect(new URL("/app/settings?notice=error", request.url), { status: 303 });
  }

  return NextResponse.redirect(new URL("/app/settings?notice=saved", request.url), { status: 303 });
}
