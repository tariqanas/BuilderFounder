import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { extractPdfText, isE164Phone, isNonEmptyString, toInt } from "@/lib/validators";
import { requireUser } from "@/lib/server-auth";

function isPdf(buffer: Buffer) {
  return buffer.subarray(0, 4).toString() === "%PDF";
}

export async function POST(request: Request) {
  const { user } = await requireUser();
  const supabase = createSupabaseServiceClient();

  const formData = await request.formData();
  const file = formData.get("cv");

  if (!(file instanceof File) || file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Please upload a valid PDF CV (max 5MB)." }, { status: 400 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  if (file.type !== "application/pdf" || !isPdf(fileBuffer)) {
    return NextResponse.json({ error: "Invalid format. PDF only." }, { status: 400 });
  }

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
    (notifySms && !isE164Phone(smsNumber)) ||
    (!notifyWhatsapp && whatsappNumber && String(whatsappNumber).trim().length > 0 && !isE164Phone(whatsappNumber)) ||
    (!notifySms && smsNumber && String(smsNumber).trim().length > 0 && !isE164Phone(smsNumber))
  ) {
    return NextResponse.json({ error: "Please review your criteria and contact details." }, { status: 400 });
  }

  const storagePath = `cv/${user.id}/cv.pdf`;
  const { error: storageError } = await supabase.storage.from("cv").upload(storagePath, fileBuffer, {
    upsert: true,
    contentType: "application/pdf",
  });

  if (storageError) {
    console.error("[upload] cv storage failed");
    return NextResponse.json({ error: "Upload failed. Please retry." }, { status: 500 });
  }

  const extractedText = extractPdfText(fileBuffer);
  const emptyText = !extractedText.length;

  const { error: settingsError } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      primary_stack: primaryStack,
      secondary_stack: secondaryStack || null,
      min_day_rate: minDayRateInt,
      remote_preference: remotePreference,
      countries: String(countries)
        .split(",")
        .map((country) => country.trim())
        .filter(Boolean),
      notify_email: notifyEmail,
      notify_whatsapp: notifyWhatsapp,
      whatsapp_number: notifyWhatsapp ? String(whatsappNumber) : null,
      notify_sms: notifySms,
      sms_number: notifySms ? String(smsNumber) : null,
      radar_active: true,
    },
    { onConflict: "user_id" }
  );

  if (settingsError) {
    console.error("[upload] settings update failed");
    return NextResponse.json({ error: "Settings save failed." }, { status: 500 });
  }

  const { error: cvError } = await supabase.from("cv_files").upsert(
    {
      user_id: user.id,
      storage_path: storagePath,
      extracted_text: extractedText,
    },
    { onConflict: "user_id" }
  );

  if (cvError) {
    console.error("[upload] cv metadata save failed");
    return NextResponse.json({ error: "CV save failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, notice: emptyText ? "cv-empty-text" : "onboarding-activated" });
}
