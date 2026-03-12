import { env } from "@/lib/env";
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

type ParseContext = {
  normalizedText: string;
  sectionedText: string;
  classification: CvClassification;
  extractionQuality: number;
};

type ParseStrategy = "openai" | "deterministic_fallback";

type ParsedCandidateProfilePayload = {
  title: string | null;
  seniority: string | null;
  years_experience: number | null;
  primary_stack: string[];
  programming_languages: string[];
  frameworks: string[];
  cloud_devops: string[];
  databases: string[];
  ai_data_skills: string[];
  domains: string[];
  spoken_languages: string[];
  management_signals: string[];
  remote_preference: CandidateRemotePreference;
  short_summary: string;
  extraction_notes: string[];
};

const AI_PROFILE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: ["string", "null"] },
    seniority: { type: ["string", "null"] },
    years_experience: { type: ["number", "null"] },
    primary_stack: { type: "array", items: { type: "string" } },
    programming_languages: { type: "array", items: { type: "string" } },
    frameworks: { type: "array", items: { type: "string" } },
    cloud_devops: { type: "array", items: { type: "string" } },
    databases: { type: "array", items: { type: "string" } },
    ai_data_skills: { type: "array", items: { type: "string" } },
    domains: { type: "array", items: { type: "string" } },
    spoken_languages: { type: "array", items: { type: "string" } },
    management_signals: { type: "array", items: { type: "string" } },
    remote_preference: { type: "string", enum: ["remote", "hybrid", "onsite", "unknown"] },
    short_summary: { type: "string" },
    extraction_notes: { type: "array", items: { type: "string" } },
  },
  required: [
    "title",
    "seniority",
    "years_experience",
    "primary_stack",
    "programming_languages",
    "frameworks",
    "cloud_devops",
    "databases",
    "ai_data_skills",
    "domains",
    "spoken_languages",
    "management_signals",
    "remote_preference",
    "short_summary",
    "extraction_notes",
  ],
} as const;

const OPENAI_STRUCTURING_PROMPT = [
  "You are a precise CV structuring engine for technical freelance hiring.",
  "Input text can be French, English, or mixed.",
  "Output MUST strictly match the provided JSON schema.",
  "Never include markdown. Never include prose outside JSON.",
  "Quality rules:",
  "- Use only explicit evidence from the CV text.",
  "- Never invent technologies, years, domains, or management signals.",
  "- Prefer null over guessing for missing/ambiguous fields.",
  "- Determine years_experience by priority: (1) explicit years mention, (2) chronology inference.",
  "- title must reflect dominant positioning of the candidate (not aspirations).",
  "- short_summary must be concise and concrete, based on real evidence.",
  "- Keep arrays deduplicated and compact.",
  "- Preserve language names and stack terms as written when possible; normalization is downstream.",
].join("\n");

const TECH_SYNONYMS: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  "node js": "Node.js",
  nodejs: "Node.js",
  "node.js": "Node.js",
  reactjs: "React",
  "react.js": "React",
  nextjs: "Next.js",
  "next js": "Next.js",
  "next.js": "Next.js",
  "vue js": "Vue.js",
  vuejs: "Vue.js",
  mongo: "MongoDB",
  mongodb: "MongoDB",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  "ms sql": "SQL Server",
  mssql: "SQL Server",
  k8s: "Kubernetes",
  "ci/cd": "CI/CD",
  cicd: "CI/CD",
  "gitlab ci": "GitLab CI",
  "github actions": "GitHub Actions",
  kafka: "Kafka",
  java: "Java",
  golang: "Go",
  gcp: "GCP",
};

const LANGUAGE_SYNONYMS: Record<string, string> = {
  fr: "French",
  francais: "French",
  français: "French",
  french: "French",
  en: "English",
  anglais: "English",
  english: "English",
  espagnol: "Spanish",
  spanish: "Spanish",
  allemand: "German",
  german: "German",
  italien: "Italian",
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
  santé: "Healthcare",
  retail: "Retail",
  ecommerce: "E-commerce",
  "e-commerce": "E-commerce",
  telecom: "Telecom",
  saas: "SaaS",
  "public sector": "Public Sector",
  government: "Public Sector",
  automotive: "Automotive",
  industrie: "Industry",
  industry: "Industry",
};

const SENIORITY_SYNONYMS: Record<string, string> = {
  jr: "junior",
  junior: "junior",
  "junior+": "junior",
  confirme: "mid",
  confirmé: "mid",
  confirmed: "mid",
  mid: "mid",
  intermediate: "mid",
  senior: "senior",
  "sénior": "senior",
  lead: "lead",
  staff: "staff",
  principal: "principal",
};

function normalizeText(text: string): string {
  return text.replace(/\r/g, "\n").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 80000);
}

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "")) as T;
  } catch {
    return null;
  }
}

function uniq(items: string[]): string[] {
  return [...new Set(items.map((x) => x.trim()).filter(Boolean))];
}

function tokenizeList(values: string[]): string[] {
  return values.flatMap((value) => value.split(/[;,]|\band\b|\bet\b|\//i).map((v) => v.trim())).filter(Boolean);
}

function normalizeLabel(value: string): string {
  const key = value.toLowerCase().replace(/[+|&]/g, " ").replace(/\s+/g, " ").trim();
  return TECH_SYNONYMS[key] ?? value.trim();
}

function normalizeTechList(values: string[]): string[] {
  return uniq(tokenizeList(values).map((v) => normalizeLabel(v)).filter((v) => v.length > 1)).slice(0, 30);
}

function normalizeLanguages(values: string[]): string[] {
  return uniq(tokenizeList(values).map((value) => {
    const key = value.toLowerCase().trim();
    return LANGUAGE_SYNONYMS[key] ?? value.trim();
  })).slice(0, 10);
}

function normalizeDomains(values: string[]): string[] {
  return uniq(tokenizeList(values).map((value) => {
    const key = value.toLowerCase().trim();
    return DOMAIN_SYNONYMS[key] ?? value.trim();
  })).slice(0, 15);
}

function normalizeRemote(remote: string): CandidateRemotePreference {
  const key = remote.toLowerCase();
  if (key.includes("remote") || key.includes("télé") || key.includes("tele")) return "remote";
  if (key.includes("hybrid") || key.includes("hybride")) return "hybrid";
  if (key.includes("onsite") || key.includes("site") || key.includes("présentiel") || key.includes("presentiel")) return "onsite";
  return "unknown";
}

function normalizeSeniority(value: string | null): string | null {
  if (!value) return null;
  const key = value.toLowerCase().trim();
  return SENIORITY_SYNONYMS[key] ?? (key.includes("senior") ? "senior" : key.includes("lead") ? "lead" : value.trim());
}

function inferYearsFromSignals(text: string): { years: number | null; rationale: string } {
  const explicit = [...text.matchAll(/(?:exp[ée]rience|experience)[^\d]{0,20}(\d{1,2})\s*(?:\+|ans?|years?)/gi)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 50);

  const direct = [...text.matchAll(/\b(\d{1,2})\s*(?:\+|ans?|years?)\s*(?:d['’]\s*)?(?:exp[ée]rience|experience)?\b/gi)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 50);

  const ranges = [...text.matchAll(/\b(19\d{2}|20\d{2})\s*[-–]\s*(19\d{2}|20\d{2}|present|current|aujourd'hui)\b/gi)];
  const currentYear = new Date().getFullYear();
  const inferred = ranges
    .map((m) => {
      const start = Number(m[1]);
      const endRaw = m[2].toLowerCase();
      const end = /present|current|aujourd'hui/.test(endRaw) ? currentYear : Number(endRaw);
      return end >= start && start >= 1980 ? end - start : 0;
    })
    .filter((n) => n > 0 && n <= 50);

  if (explicit.length || direct.length) {
    return { years: Math.max(...explicit, ...direct), rationale: "explicit years signal found" };
  }

  if (inferred.length) {
    return { years: Math.max(...inferred), rationale: "inferred from date ranges" };
  }

  return { years: null, rationale: "no explicit years or reliable date range inference" };
}

function deterministicProfile(text: string): CandidateProfile {
  const years = inferYearsFromSignals(text);
  const titleMatch = text.match(/^(?:##\s*header\n)?([^\n]{4,120}(?:engineer|developer|architect|consultant|manager|ing[ée]nieur|d[ée]veloppeur)[^\n]{0,80})/im);

  const seniority = normalizeSeniority((text.match(/\b(principal|staff|lead|senior|junior|mid|confirm[ée])\b/i)?.[1] ?? null));
  const remote = normalizeRemote(text.match(/\b(remote|hybrid|onsite|hybride|t[ée]l[ée]travail|pr[ée]sentiel)\b/i)?.[1] ?? "unknown");

  return {
    title: titleMatch?.[1]?.trim() ?? null,
    seniority,
    years_experience: years.years,
    primary_stack: [],
    programming_languages: normalizeTechList((text.match(/\b(JavaScript|TypeScript|Python|Java|C#|Go|PHP|Ruby|Rust|Kotlin)\b/gi) ?? [])),
    frameworks: normalizeTechList((text.match(/\b(React|Next\.?js|Vue|Angular|Node\.?js|Nest\.?js|Express|Spring|Django|FastAPI|Laravel)\b/gi) ?? [])),
    cloud_devops: normalizeTechList((text.match(/\b(AWS|Azure|GCP|Docker|Kubernetes|Terraform|GitHub Actions|GitLab CI|Jenkins|CI\/CD|DevOps|Kafka)\b/gi) ?? [])),
    databases: normalizeTechList((text.match(/\b(Postgres(?:ql)?|Mongo(?:db)?|MySQL|Redis|BigQuery|Snowflake|Elasticsearch)\b/gi) ?? [])),
    ai_data_skills: normalizeTechList((text.match(/\b(LLM|RAG|NLP|Machine Learning|Deep Learning|PyTorch|TensorFlow|Pandas|Data Analysis)\b/gi) ?? [])),
    domains: normalizeDomains(text.match(/\b(Fintech|Banking|Insurance|Healthcare|Retail|E-commerce|SaaS|Telecom|Public Sector|Automotive)\b/gi) ?? []),
    spoken_languages: normalizeLanguages(text.match(/\b(French|English|Français|Anglais|Espagnol|Spanish|German|Allemand)\b/gi) ?? []),
    management_signals: uniq(text.match(/\b(team lead|mentoring|managed|management|leadership|encadrement|pilotage|manager)\b/gi) ?? []),
    remote_preference: remote,
    short_summary: "",
  };
}

function computePrimaryStack(profile: CandidateProfile): string[] {
  const buckets: Array<{ label: string; checks: string[] }> = [
    { label: "JavaScript/TypeScript", checks: ["JavaScript", "TypeScript", "Node.js", "React", "Next.js"] },
    { label: "Java/Kafka", checks: ["Java", "Kafka", "Spring"] },
    { label: "Python/Data", checks: ["Python", "LLM", "Machine Learning", "FastAPI"] },
    { label: "Cloud/DevOps", checks: ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD"] },
  ];
  const all = new Set([...profile.programming_languages, ...profile.frameworks, ...profile.cloud_devops, ...profile.ai_data_skills]);
  return buckets.filter((b) => b.checks.some((c) => all.has(c))).map((b) => b.label);
}

function profileSummary(profile: CandidateProfile): string {
  const role = profile.title ?? "Technical candidate";
  const seniority = profile.seniority ? `${profile.seniority} ` : "";
  const years = profile.years_experience !== null ? `${profile.years_experience} years` : "experience not explicitly quantified";
  const stack = profile.primary_stack.length ? profile.primary_stack.join(" / ") : "generalist stack";
  const domains = profile.domains.length ? ` Domain exposure: ${profile.domains.slice(0, 2).join(", ")}.` : "";
  return `${role} (${seniority}${years}) focused on ${stack}.${domains}`.slice(0, 220);
}

function normalizeProfile(profile: CandidateProfile): CandidateProfile {
  const normalized: CandidateProfile = {
    ...profile,
    title: profile.title?.trim() ?? null,
    seniority: normalizeSeniority(profile.seniority),
    years_experience: profile.years_experience !== null ? Math.max(0, Math.min(50, Math.round(profile.years_experience))) : null,
    programming_languages: normalizeTechList(profile.programming_languages),
    frameworks: normalizeTechList(profile.frameworks),
    cloud_devops: normalizeTechList(profile.cloud_devops),
    databases: normalizeTechList(profile.databases),
    ai_data_skills: normalizeTechList(profile.ai_data_skills),
    domains: normalizeDomains(profile.domains),
    spoken_languages: normalizeLanguages(profile.spoken_languages),
    management_signals: uniq(profile.management_signals.map((signal) => signal.trim())).slice(0, 10),
    remote_preference: normalizeRemote(profile.remote_preference),
    primary_stack: normalizeTechList(profile.primary_stack),
    short_summary: profile.short_summary.trim().slice(0, 220),
  };

  normalized.primary_stack = normalized.primary_stack.length ? normalized.primary_stack : computePrimaryStack(normalized);
  normalized.short_summary = normalized.short_summary || profileSummary(normalized);
  return normalized;
}

function toCandidateProfile(payload: ParsedCandidateProfilePayload): CandidateProfile {
  return {
    title: payload.title,
    seniority: payload.seniority,
    years_experience: payload.years_experience,
    primary_stack: payload.primary_stack,
    programming_languages: payload.programming_languages,
    frameworks: payload.frameworks,
    cloud_devops: payload.cloud_devops,
    databases: payload.databases,
    ai_data_skills: payload.ai_data_skills,
    domains: payload.domains,
    spoken_languages: payload.spoken_languages,
    management_signals: payload.management_signals,
    remote_preference: payload.remote_preference,
    short_summary: payload.short_summary,
  };
}

function isStructuringPayload(value: unknown): value is ParsedCandidateProfilePayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<ParsedCandidateProfilePayload>;
  return (
    Array.isArray(v.primary_stack) &&
    Array.isArray(v.programming_languages) &&
    Array.isArray(v.frameworks) &&
    Array.isArray(v.cloud_devops) &&
    Array.isArray(v.databases) &&
    Array.isArray(v.ai_data_skills) &&
    Array.isArray(v.domains) &&
    Array.isArray(v.spoken_languages) &&
    Array.isArray(v.management_signals) &&
    Array.isArray(v.extraction_notes)
  );
}

async function parseWithAI(sectionedText: string): Promise<ParsedCandidateProfilePayload | null> {
  if (!env.OPENAI_API_KEY) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: OPENAI_STRUCTURING_PROMPT,
        },
        {
          role: "user",
          content: `Extract candidate profile fields from this CV content:\n\n${sectionedText.slice(0, 32000)}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "candidate_profile",
          strict: true,
          schema: AI_PROFILE_SCHEMA,
        },
      },
      max_output_tokens: 1400,
    }),
  });

  if (!response.ok) {
    console.error("[candidate-profile] ai parsing http error", { status: response.status });
    return null;
  }

  const payload = (await response.json()) as { output_text?: string };
  if (!payload.output_text) return null;

  const parsed = parseJson<unknown>(payload.output_text);
  if (!isStructuringPayload(parsed)) return null;
  return parsed;
}

function scoreCompleteness(profile: CandidateProfile): number {
  const weighted: Array<{ present: boolean; weight: number }> = [
    { present: Boolean(profile.title), weight: 12 },
    { present: Boolean(profile.seniority), weight: 8 },
    { present: profile.years_experience !== null, weight: 12 },
    { present: profile.primary_stack.length > 0, weight: 10 },
    { present: profile.programming_languages.length > 0, weight: 10 },
    { present: profile.frameworks.length > 0, weight: 8 },
    { present: profile.cloud_devops.length > 0, weight: 8 },
    { present: profile.databases.length > 0, weight: 8 },
    { present: profile.ai_data_skills.length > 0, weight: 6 },
    { present: profile.domains.length > 0, weight: 6 },
    { present: profile.spoken_languages.length > 0, weight: 5 },
    { present: profile.management_signals.length > 0, weight: 5 },
    { present: profile.short_summary.length > 35, weight: 2 },
  ];
  return weighted.reduce((sum, i) => sum + (i.present ? i.weight : 0), 0);
}

function scoreConfidence(profile: CandidateProfile, context: ParseContext, strategy: ParseStrategy): number {
  let score = 8;
  score += Math.round(context.extractionQuality * 26);
  score += Math.round(context.classification.confidence * 22);
  if (strategy === "openai") score += 12;

  const populatedFields = [
    Boolean(profile.title),
    Boolean(profile.seniority),
    profile.years_experience !== null,
    profile.programming_languages.length > 0,
    profile.frameworks.length > 0,
    profile.cloud_devops.length > 0,
    profile.databases.length > 0,
    profile.short_summary.length > 30,
  ].filter(Boolean).length;
  score += populatedFields * 3;

  if (profile.years_experience !== null && profile.seniority === "junior" && profile.years_experience > 6) score -= 8;
  if (profile.years_experience !== null && ["staff", "principal"].includes(profile.seniority ?? "") && profile.years_experience < 5) score -= 10;

  if (!context.classification.is_cv) score -= 28;
  if (context.extractionQuality < 0.65) score -= 12;

  return Math.max(0, Math.min(100, score));
}

function hasMinimumUsableSignal(profile: CandidateProfile): boolean {
  const skillSignals = profile.programming_languages.length + profile.frameworks.length + profile.cloud_devops.length + profile.databases.length;
  return Boolean(profile.title) || profile.years_experience !== null || skillSignals >= 2;
}

export async function parseCandidateProfile(context: ParseContext): Promise<CandidateProfileResult> {
  const normalized = normalizeText(context.normalizedText);

  if (!normalized) {
    return {
      ok: false,
      error: {
        code: "CANDIDATE_PROFILE_EMPTY_TEXT",
        message: "No extracted CV text available for candidate profile parsing.",
      },
    };
  }

  const baseText = context.sectionedText || normalized;
  const deterministic = deterministicProfile(baseText);
  let profile = deterministic;
  let strategy: ParseStrategy = "deterministic_fallback";

  const yearsSignal = inferYearsFromSignals(baseText);
  console.info("[candidate-profile] years_experience signal", { years: yearsSignal.years, rationale: yearsSignal.rationale });

  try {
    const aiProfile = await parseWithAI(baseText);
    if (aiProfile) {
      strategy = "openai";
      profile = {
        ...deterministic,
        ...toCandidateProfile(aiProfile),
      };
      console.info("[candidate-profile] ai parse success", {
        title: aiProfile.title,
        years: aiProfile.years_experience,
        notes: aiProfile.extraction_notes.slice(0, 3),
      });
    } else if (env.OPENAI_API_KEY) {
      console.warn("[candidate-profile] ai parse unavailable, deterministic fallback used");
    }
  } catch (error) {
    console.error("[candidate-profile] ai parsing failure", { error });
  }

  profile = normalizeProfile(profile);

  if (profile.years_experience === null && yearsSignal.years !== null) {
    profile.years_experience = yearsSignal.years;
  }

  if (!hasMinimumUsableSignal(profile)) {
    return {
      ok: false,
      error: {
        code: "CANDIDATE_PROFILE_LOW_QUALITY",
        message: "Unable to build a usable candidate profile from the uploaded CV text.",
      },
    };
  }

  const completenessScore = scoreCompleteness(profile);
  const confidenceScore = scoreConfidence(profile, context, strategy);

  console.info("[candidate-profile] scoring rationale", {
    completenessScore,
    confidenceScore,
    extractionQuality: context.extractionQuality,
    classificationConfidence: context.classification.confidence,
    strategy,
  });

  return {
    ok: true,
    profile,
    completenessScore,
    confidenceScore,
  };
}

export async function upsertCandidateProfile(params: {
  userId: string;
  cvFileId: string | null;
  normalizedText: string;
  sectionedText: string;
  extractionQuality: number;
  classification: CvClassification;
}): Promise<CandidateProfileResult> {
  try {
    const parsed = await parseCandidateProfile({
      normalizedText: params.normalizedText,
      sectionedText: params.sectionedText,
      classification: params.classification,
      extractionQuality: params.extractionQuality,
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
      console.error("[candidate-profile] upsert failed", {
        userId: params.userId,
        cvFileId: params.cvFileId,
        code: error.code,
        message: error.message,
      });
      return {
        ok: false,
        error: {
          code: "CANDIDATE_PROFILE_PERSIST_FAILED",
          message: "Candidate profile parsing succeeded but persistence failed.",
        },
      };
    }

    console.info("[candidate-profile] persistence success", { userId: params.userId, cvFileId: params.cvFileId });
    return parsed;
  } catch (error) {
    console.error("[candidate-profile] unexpected error", {
      userId: params.userId,
      cvFileId: params.cvFileId,
      error,
    });

    const safeError: CandidateProfileError = {
      code: "CANDIDATE_PROFILE_UNKNOWN",
      message: "An unexpected error occurred while building the candidate profile.",
    };

    return {
      ok: false,
      error: safeError,
    };
  }
}
