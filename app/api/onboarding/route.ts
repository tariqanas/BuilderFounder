import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { extractPdfText, isEmail, isNonEmptyString, toInt } from "@/lib/validators";
import { requireUser } from "@/lib/server-auth";

export async function POST(request: Request) {
  const { user } = await requireUser();
  const supabase = createSupabaseServiceClient();

  const formData = await request.formData();
  const file = formData.get("cv");

  if (!(file instanceof File) || file.type !== "application/pdf" || file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "CV PDF invalide (max 8MB)." }, { status: 400 });
  }

  const primaryStack = formData.get("primaryStack");
  const secondaryStack = formData.get("secondaryStack");
  const minDayRate = formData.get("minDayRate");
  const remotePreference = formData.get("remotePreference");
  const countries = formData.get("countries");
  const notifyEmail = formData.get("notifyEmail");

  const minDayRateInt = toInt(minDayRate, 0, 10000);
  const allowedRemote = remotePreference === "remote" || remotePreference === "hybrid" || remotePreference === "onsite";

  if (
    !isNonEmptyString(primaryStack, 120) ||
    (secondaryStack && !isNonEmptyString(secondaryStack, 120)) ||
    minDayRateInt === null ||
    !allowedRemote ||
    !isNonEmptyString(countries, 300) ||
    !isEmail(notifyEmail)
  ) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const storagePath = `cv/${user.id}/cv.pdf`;

  const { error: storageError } = await supabase.storage.from("cv").upload(storagePath, fileBuffer, {
    upsert: true,
    contentType: "application/pdf",
  });

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const extractedText = extractPdfText(fileBuffer);

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
      radar_active: true,
    },
    { onConflict: "user_id" }
  );

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  const { error: cvError } = await supabase.from("cv_files").insert({
    user_id: user.id,
    storage_path: storagePath,
    extracted_text: extractedText,
  });

  if (cvError) {
    return NextResponse.json({ error: cvError.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/app", request.url), { status: 303 });
}
