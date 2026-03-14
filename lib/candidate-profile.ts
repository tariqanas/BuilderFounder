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

const LANGUAGE_SYNONYMS: Record<string, string> = {
  fr: "French",
  francais: "French",
  "français": "French",
  french: "French",
  en: "English",
  english: "English",
  anglais: "English",
  spanish: "Spanish",
  espagnol: "Spanish",
  german: "German",
  allemand: "German",
  italian: "Italian",
  arabe: "Arabic",
  arabic: "Arabic",
};

const DOMAIN_SYNONYMS: Record<string, string> = {
  fintech: "Fintech",
  "financial services": "Finance",
  finance: "Finance",
  banking: "Banking",
  banque: "Banking",
  insurance: "Insurance",
  assurance: "Insurance",
  healthcare: "Healthcare",
  sante: "Healthcare",
  "santé": "Healthcare",
  retail: "Retail",
  ecommerce: "E-commerce",
  "e-commerce": "E-commerce",
  telecom: "Telecom",
  saas: "SaaS",
  industry: "Industry",
  industrie: "Industry",
  automotive: "Automotive",
  "public sector": "Public Sector",
};

const SENIORITY_SYNONYMS: Record<string, string> = {
  junior: "junior",
  jr: "junior",
  mid: "mid",
  intermediate: "mid",
  confirmed: "mid",
  "confirmé": "mid",
  senior: "senior",
  "sénior": "senior",
  lead: "lead",
  staff: "staff",
  principal: "principal",
};

function normalizeText(text: string): string {
  return text.replace(/\r/g, "\n").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 80000);
}

function uniq(items: string[]): string[] {
  return [...new Set(items.map((x) => x.trim()).filter(Boolean))];
}

function tokenizeList(values: string[]): string[] {
  return values.flatMap((value) => value.split(/[;,]|\band\b|\bet\b|\//i).map((v) => v.trim())).filter(Boolean);
}

function normalizeLanguages(values: string[]): string[] {
  return uniq(tokenizeList(values).map((value) => LANGUAGE_SYNONYMS[value.toLowerCase().trim()] ?? value.trim())).slice(0, 10);
}

function normalizeDomains(values: string[]): string[] {
  return uniq(tokenizeList(values).map((value) => DOMAIN_SYNONYMS[value.toLowerCase().trim()] ?? value.trim())).slice(0, 15);
}

function normalizeSeniority(value: string | null): string | null {
  if (!value) return null;
  const key = value.toLowerCase().trim();
  return SENIORITY_SYNONYMS[key] ?? (key.includes("senior") ? "senior" : key.includes("lead") ? "lead" : key || null);
}

function normalizeRemote(remote: string): CandidateRemotePreference {
  const key = remote.toLowerCase();
  if (key.includes("remote") || key.includes("télé") || key.includes("tele")) return "remote";
  if (key.includes("hybrid") || key.includes("hybride")) return "hybrid";
  if (key.includes("onsite") || key.includes("présentiel") || key.includes("presentiel")) return "onsite";
  return "unknown";
}

function normalizeList(values: string[], limit: number): string[] {
  return uniq(tokenizeList(values)).slice(0, limit);
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
    primary_stack: normalizeList(profile.primary_stack, 8),
    programming_languages: normalizeList(profile.programming_languages, 40),
    frameworks: normalizeList(profile.frameworks, 40),
    cloud_devops: normalizeList(profile.cloud_devops, 40),
    databases: normalizeList(profile.databases, 30),
    ai_data_skills: normalizeList(profile.ai_data_skills, 30),
    domains: normalizeDomains(profile.domains),
    spoken_languages: normalizeLanguages(profile.spoken_languages),
    management_signals: normalizeList(profile.management_signals, 20),
    remote_preference: normalizeRemote(profile.remote_preference),
    short_summary: profile.short_summary.trim().slice(0, 280),
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
