import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { requireUser } from "@/lib/server-auth";
import { type CandidateProfile, type CandidateRemotePreference } from "@/types/candidate-profile";
import { isE164Phone, isNonEmptyString, toInt } from "@/lib/validators";
import { runMatchingForUser } from "@/lib/matching-engine";

function csvToList(value: FormDataEntryValue | null, maxItems: number) {
  return String(value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeRemote(value: FormDataEntryValue | null, allowUnknown = false): CandidateRemotePreference | null {
  const normalized = String(value ?? "").trim();
  if (normalized === "remote" || normalized === "hybrid" || normalized === "onsite") return normalized;
  if (allowUnknown && normalized === "unknown") return "unknown";
  return null;
}

export async function POST(request: Request) {
  const { user } = await requireUser();
  const supabase = createSupabaseServiceClient();
  const formData = await request.formData();

  const title = String(formData.get("title") ?? "").trim() || null;
  const seniority = String(formData.get("seniority") ?? "").trim() || null;
  const yearsExperience = toInt(formData.get("yearsExperience"), 0, 50);
  const cvRemotePreference = normalizeRemote(formData.get("cvRemotePreference"), true);
  const shortSummary = String(formData.get("shortSummary") ?? "").trim();

  const remotePreference = normalizeRemote(formData.get("remotePreference"));
  const minDayRateInt = toInt(formData.get("minDayRate"), 1, 10000);
  const countries = csvToList(formData.get("countries"), 20);
  const primaryStack = formData.get("primaryStack");
  const secondaryStack = formData.get("secondaryStack");
  const notifyEmail = formData.get("notifyEmail") === "on";
  const notifyWhatsapp = formData.get("notifyWhatsapp") === "on";
  const whatsappNumber = formData.get("whatsappNumber");
  const notifySms = formData.get("notifySms") === "on";
  const smsNumber = formData.get("smsNumber");

  if (
    (title && !isNonEmptyString(title, 120)) ||
    (seniority && !isNonEmptyString(seniority, 60)) ||
    yearsExperience === null ||
    !cvRemotePreference ||
    !isNonEmptyString(shortSummary, 500) ||
    !remotePreference ||
    minDayRateInt === null ||
    (primaryStack && !isNonEmptyString(primaryStack, 120)) ||
    (secondaryStack && !isNonEmptyString(secondaryStack, 120)) ||
    (notifyWhatsapp && !isE164Phone(whatsappNumber)) ||
    (notifySms && !isE164Phone(smsNumber))
  ) {
    return NextResponse.redirect(new URL("/app/onboarding/profile-review?notice=invalid", request.url), { status: 303 });
  }

  const { data: existingRow } = await supabase
    .from("candidate_profiles")
    .select("id,profile_json")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingRow?.id || !existingRow.profile_json) {
    return NextResponse.redirect(new URL("/app/onboarding/profile-review?notice=missing-profile", request.url), { status: 303 });
  }

  const nextProfile: CandidateProfile = {
    title,
    seniority,
    years_experience: yearsExperience,
    programming_languages: csvToList(formData.get("programmingLanguages"), 40),
    frameworks: csvToList(formData.get("frameworks"), 40),
    cloud_devops: csvToList(formData.get("cloudDevops"), 40),
    databases: csvToList(formData.get("databases"), 30),
    ai_data_skills: csvToList(formData.get("aiDataSkills"), 30),
    primary_stack: csvToList(formData.get("primaryStackCv"), 12),
    domains: csvToList(formData.get("domains"), 15),
    spoken_languages: csvToList(formData.get("spokenLanguages"), 12),
    management_signals: csvToList(formData.get("managementSignals"), 20),
    remote_preference: cvRemotePreference,
    short_summary: shortSummary.slice(0, 500),
  };

  const [{ error: profileError }, { error: settingsError }] = await Promise.all([
    supabase
      .from("candidate_profiles")
      .update({
        profile_json: nextProfile,
        profile_summary: nextProfile.short_summary,
        profile_confirmed: true,
      })
      .eq("user_id", user.id),
    supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        primary_stack: isNonEmptyString(primaryStack, 120) ? String(primaryStack).trim() : null,
        secondary_stack: isNonEmptyString(secondaryStack, 120) ? String(secondaryStack).trim() : null,
        min_day_rate: minDayRateInt,
        remote_preference: remotePreference,
        countries: countries.length ? countries : null,
        notify_email: notifyEmail,
        notify_whatsapp: notifyWhatsapp,
        whatsapp_number: notifyWhatsapp ? String(whatsappNumber) : null,
        notify_sms: notifySms,
        sms_number: notifySms ? String(smsNumber) : null,
      },
      { onConflict: "user_id" }
    ),
  ]);

  if (profileError || settingsError) {
    return NextResponse.redirect(new URL("/app/onboarding/profile-review?notice=error", request.url), { status: 303 });
  }

  try {
    await runMatchingForUser(user.id);
  } catch (error) {
    console.error("[onboarding] instant_user_matching_failed", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return NextResponse.redirect(new URL("/app/dashboard?notice=profile-confirmed", request.url), { status: 303 });
}
