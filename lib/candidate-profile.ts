import { createSupabaseServiceClient } from "@/lib/supabase";
import { type CvClassification } from "@/lib/cv-intelligence";
import {
  CANDIDATE_PROFILE_PARSER_VERSION,
  type CandidateProfile,
  type CandidateProfileError,
  type CandidateProfileRecord,
  type CandidateProfileResult,
  type CandidateRemotePreference,
} from "@/types/candidate-profile";

type CvSections = Record<string, string>;

type OpenAiCvExtractionInput = {
  language: "fr" | "en" | "mixed" | "unknown";
  extraction_quality: number;
  title: string | null;
  seniority: string | null;
  years_experience: number | null;
  programming_languages: string[];
  frameworks: string[];
  cloud_devops: string[];
  databases: string[];
  ai_data_skills: string[];
  primary_stack: string[];
  domains: string[];
  spoken_languages: string[];
  management_signals: string[];
  remote_preference: CandidateRemotePreference;
  short_summary: string;
  text_excerpt: string;
};

type ParseContext = {
  normalizedText: string;
  sectionedText: string;
  sections?: CvSections;
  classification: CvClassification;
  extractionQuality: number;
  openAiExtraction?: OpenAiCvExtractionInput;
};

const GENERIC_DOMAIN_LABELS = new Set(["information technology", "software", "tech", "engineering"]);
const GENERIC_PRIMARY_STACK_LABELS = new Set(["full stack development", "devops", "web development", "project management"]);
const GENERIC_SUMMARY_SNIPPETS = [/^experienced professional\.?$/i, /^software engineer\.?$/i, /^developer\.?$/i, /^it professional\.?$/i];

function normalizeText(text: string): string {
  return text.replace(/\r/g, "\n").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 80000);
}

function uniq(items: string[]): string[] {
  return [...new Set(items.map((x) => x.trim()).filter(Boolean))];
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function splitListValue(value: string): string[] {
  return value
    .split(/[;,\n]+/)
    .map((part) => normalizeWhitespace(part.replace(/^[•\-–*]+\s*/, "")))
    .filter(Boolean);
}

function normalizeLanguages(values: string[]): string[] {
  return normalizeList(values, 10);
}

function normalizeSeniority(value: string | null): string | null {
  if (!value) return null;
  return normalizeWhitespace(value).slice(0, 40) || null;
}

function normalizeRemote(remote: string): CandidateRemotePreference {
  const key = remote.toLowerCase();
  if (key.includes("remote") || key.includes("télé") || key.includes("tele")) return "remote";
  if (key.includes("hybrid") || key.includes("hybride")) return "hybrid";
  if (key.includes("onsite") || key.includes("présentiel") || key.includes("presentiel")) return "onsite";
  return "unknown";
}

function normalizeList(values: string[], limit: number): string[] {
  return uniq(values.flatMap(splitListValue)).slice(0, limit);
}

function normalizeDomains(values: string[]): string[] {
  return normalizeList(values, 15).filter((value) => !GENERIC_DOMAIN_LABELS.has(value.toLowerCase()));
}

function normalizePrimaryStack(values: string[]): string[] {
  return normalizeList(values, 8).filter((value) => !GENERIC_PRIMARY_STACK_LABELS.has(value.toLowerCase()));
}

function isSummaryTruncated(value: string): boolean {
  return /\.{3,}$/.test(value) || /[,:;\-]\s*$/.test(value);
}

function isSummaryGeneric(value: string): boolean {
  return GENERIC_SUMMARY_SNIPPETS.some((pattern) => pattern.test(value));
}

function buildSummaryFallback(profile: CandidateProfile): string {
  const headlineBits = [profile.title, profile.seniority].filter(Boolean).join(" • ");
  const experience = profile.years_experience !== null ? `${profile.years_experience}+ years of experience` : "";
  const stack = profile.primary_stack[0] ? `focused on ${profile.primary_stack[0]}` : "";
  const domain = profile.domains[0] ? `with strong exposure to ${profile.domains[0]}` : "";

  const sentenceOne = [headlineBits, experience, stack].filter(Boolean).join(", ");
  const sentenceTwo = domain ? `${domain}.` : "";
  return normalizeWhitespace(`${sentenceOne}${sentenceOne ? ". " : ""}${sentenceTwo}`).slice(0, 280);
}

function buildProfileFromOpenAiExtraction(extraction: OpenAiCvExtractionInput): CandidateProfile {
  return {
    title: extraction.title,
    seniority: extraction.seniority,
    years_experience: extraction.years_experience,
    primary_stack: extraction.primary_stack,
    programming_languages: extraction.programming_languages,
    frameworks: extraction.frameworks,
    cloud_devops: extraction.cloud_devops,
    databases: extraction.databases,
    ai_data_skills: extraction.ai_data_skills,
    domains: extraction.domains,
    spoken_languages: extraction.spoken_languages,
    management_signals: extraction.management_signals,
    remote_preference: extraction.remote_preference,
    short_summary: extraction.short_summary,
  };
}

function normalizeProfile(profile: CandidateProfile): CandidateProfile {
  return {
    ...profile,
    title: profile.title?.trim() ?? null,
    seniority: normalizeSeniority(profile.seniority),
    years_experience: profile.years_experience !== null ? Math.max(0, Math.min(50, Math.round(profile.years_experience))) : null,
    primary_stack: normalizePrimaryStack(profile.primary_stack),
    programming_languages: normalizeList(profile.programming_languages, 40),
    frameworks: normalizeList(profile.frameworks, 40),
    cloud_devops: normalizeList(profile.cloud_devops, 40),
    databases: normalizeList(profile.databases, 30),
    ai_data_skills: normalizeList(profile.ai_data_skills, 30),
    domains: normalizeDomains(profile.domains),
    spoken_languages: normalizeLanguages(profile.spoken_languages),
    management_signals: normalizeList(profile.management_signals, 20),
    remote_preference: normalizeRemote(profile.remote_preference),
    short_summary: (() => {
      const summary = normalizeWhitespace(profile.short_summary).slice(0, 280);
      if (!summary || isSummaryTruncated(summary) || isSummaryGeneric(summary)) {
        return buildSummaryFallback(profile);
      }
      return summary;
    })(),
  };
}

function scoreCompleteness(profile: CandidateProfile): number {
  const checks: Array<{ ok: boolean; weight: number }> = [
    { ok: Boolean(profile.title), weight: 10 },
    { ok: Boolean(profile.seniority), weight: 7 },
    { ok: profile.years_experience !== null, weight: 11 },
    { ok: profile.programming_languages.length > 0, weight: 10 },
    { ok: profile.frameworks.length > 0, weight: 10 },
    { ok: profile.cloud_devops.length > 0, weight: 8 },
    { ok: profile.databases.length > 0, weight: 10 },
    { ok: profile.primary_stack.length > 0, weight: 8 },
    { ok: profile.domains.length > 0, weight: 7 },
    { ok: profile.spoken_languages.length > 0, weight: 6 },
    { ok: profile.management_signals.length > 0, weight: 6 },
    { ok: profile.short_summary.length > 45, weight: 7 },
  ];
  return checks.reduce((sum, item) => sum + (item.ok ? item.weight : 0), 0);
}

function scoreConfidence(params: { context: ParseContext }): number {
  let score = 0;
  score += Math.round(params.context.extractionQuality * 45);
  score += Math.round(params.context.classification.confidence * 45);
  score += 10; // openai strategy bonus only
  if (!params.context.classification.is_cv) score -= 30;
  return Math.max(0, Math.min(100, score));
}

export async function parseCandidateProfile(context: ParseContext): Promise<CandidateProfileResult> {
  if (!context.openAiExtraction) {
    return {
      ok: false,
      error: {
        code: "CV_AI_EXTRACTION_FAILED",
        message: "An incident occurred while analyzing your CV. Please try again later.",
      },
    };
  }

  const normalized = normalizeText(context.normalizedText || context.openAiExtraction.text_excerpt || "");
  if (!normalized) {
    return {
      ok: false,
      error: {
        code: "CV_AI_EXTRACTION_FAILED",
        message: "An incident occurred while analyzing your CV. Please try again later.",
      },
    };
  }

  const profile = normalizeProfile(buildProfileFromOpenAiExtraction(context.openAiExtraction));
  const completenessScore = scoreCompleteness(profile);
  const confidenceScore = scoreConfidence({ context });

  console.info("[candidate-profile] raw OpenAI extraction object before post-processing", context.openAiExtraction);
  console.info("[candidate-profile] final profile before persistence", {
    profile,
    completenessScore,
    confidenceScore,
  });

  return { ok: true, profile, completenessScore, confidenceScore };
}

export async function upsertCandidateProfile(params: {
  userId: string;
  cvFileId: string | null;
  normalizedText: string;
  sectionedText: string;
  sections?: CvSections;
  extractionQuality: number;
  classification: CvClassification;
  openAiExtraction?: OpenAiCvExtractionInput;
  profileConfirmed?: boolean;
}): Promise<CandidateProfileResult> {
  try {
    const parsed = await parseCandidateProfile({
      normalizedText: params.normalizedText,
      sectionedText: params.sectionedText,
      sections: params.sections,
      classification: params.classification,
      extractionQuality: params.extractionQuality,
      openAiExtraction: params.openAiExtraction,
    });
    if (!parsed.ok) return parsed;

    const record: CandidateProfileRecord = {
      user_id: params.userId,
      cv_file_id: params.cvFileId,
      parser_version: CANDIDATE_PROFILE_PARSER_VERSION,
      profile_json: parsed.profile,
      normalized_text: normalizeText(params.normalizedText),
      profile_summary: parsed.profile.short_summary,
      completeness_score: parsed.completenessScore,
      confidence_score: parsed.confidenceScore,
      ...(typeof params.profileConfirmed === "boolean" ? { profile_confirmed: params.profileConfirmed } : {}),
    };

    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("candidate_profiles").upsert(record, { onConflict: "user_id" });
    if (error) {
      return { ok: false, error: { code: "CANDIDATE_PROFILE_PERSIST_FAILED", message: "Candidate profile parsing succeeded but persistence failed." } };
    }

    return parsed;
  } catch {
    const safeError: CandidateProfileError = { code: "CANDIDATE_PROFILE_UNKNOWN", message: "An unexpected error occurred while building the candidate profile." };
    return { ok: false, error: safeError };
  }
}
