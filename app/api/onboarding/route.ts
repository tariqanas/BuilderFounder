import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { extractPdfText, isE164Phone, isNonEmptyString, toInt } from "@/lib/validators";
import { requireUser } from "@/lib/server-auth";
import { upsertCandidateProfile } from "@/lib/candidate-profile";
import { classifyCvText, preprocessCvText } from "@/lib/cv-intelligence";

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

  let extractedText = "";
  try {
    extractedText = await extractPdfText(fileBuffer);
  } catch (error) {
    console.error("[onboarding] cv extraction failed", { userId: user.id, error });
    return NextResponse.json(
      {
        error: "We could not read text from your PDF CV. Please upload a readable French or English resume.",
        code: "CV_EXTRACTION_FAILED",
      },
      { status: 400 }
    );
  }

  const preprocessedCv = preprocessCvText(extractedText);
  console.info("[onboarding] extraction quality", {
    userId: user.id,
    extractionQuality: preprocessedCv.extractionQuality,
    normalizedLength: preprocessedCv.normalizedText.length,
  });

  const cvClassification = await classifyCvText(preprocessedCv.sectionedText || preprocessedCv.normalizedText, preprocessedCv.extractionQuality);
  console.info("[onboarding] cv classification", {
    userId: user.id,
    isCv: cvClassification.is_cv,
    language: cvClassification.language,
    confidence: cvClassification.confidence,
    reason: cvClassification.reason,
  });

  if (!cvClassification.is_cv || cvClassification.confidence < 0.5) {
    console.warn("[onboarding] cv validation failed", {
      userId: user.id,
      classification: cvClassification,
      extractionQuality: preprocessedCv.extractionQuality,
    });
    return NextResponse.json(
      {
        error: "The uploaded file is not recognized as a professional CV/resume in French or English.",
        code: "CV_NOT_RESUME_LIKE",
        details: {
          language: cvClassification.language,
          confidence: cvClassification.confidence,
          reason: cvClassification.reason,
          extraction_quality: preprocessedCv.extractionQuality,
        },
      },
      { status: 400 }
    );
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

  const { data: cvRow, error: cvError } = await supabase
    .from("cv_files")
    .upsert(
    {
      user_id: user.id,
      storage_path: storagePath,
      extracted_text: preprocessedCv.sectionedText || preprocessedCv.normalizedText,
    },
    { onConflict: "user_id" }
    )
    .select("id")
    .maybeSingle();

  if (cvError) {
    console.error("[upload] cv metadata save failed");
    return NextResponse.json({ error: "CV save failed." }, { status: 500 });
  }

  const profileResult = await upsertCandidateProfile({
    userId: user.id,
    cvFileId: cvRow?.id ?? null,
    normalizedText: preprocessedCv.normalizedText,
    sectionedText: preprocessedCv.sectionedText,
    sections: preprocessedCv.sections,
    extractionQuality: preprocessedCv.extractionQuality,
    classification: cvClassification,
  });

  if (!profileResult.ok) {
    console.error("[upload] candidate profile parsing failed", {
      userId: user.id,
      code: profileResult.error.code,
      message: profileResult.error.message,
    });
  }

  return NextResponse.json({
    ok: true,
    notice: "onboarding-activated",
    candidateProfile: profileResult.ok
      ? {
          status: "ready",
          completeness_score: profileResult.completenessScore,
          confidence_score: profileResult.confidenceScore,
        }
      : {
          status: "failed",
          error: profileResult.error,
        },
  });
}
