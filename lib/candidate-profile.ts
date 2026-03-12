import { env } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase";
import {
  CANDIDATE_PROFILE_PARSER_VERSION,
  type CandidateProfile,
  type CandidateProfileError,
  type CandidateProfileRecord,
  type CandidateProfileResult,
  type CandidateRemotePreference,
} from "@/types/candidate-profile";

const ROLE_PATTERNS: Array<{ role: string; patterns: RegExp[] }> = [
  { role: "Full-stack Developer", patterns: [/\bfull[ -]?stack\b/i, /\bd[eé]veloppeur full[ -]?stack\b/i] },
  { role: "Frontend Developer", patterns: [/\bfront[ -]?end\b/i, /\bd[eé]veloppeur front\b/i] },
  { role: "Backend Developer", patterns: [/\bback[ -]?end\b/i, /\bd[eé]veloppeur back\b/i] },
  { role: "DevOps Engineer", patterns: [/\bdevops\b/i, /\bsre\b/i] },
  { role: "Data Engineer", patterns: [/\bdata engineer\b/i, /\bing[eé]nieur data\b/i] },
  { role: "Data Scientist", patterns: [/\bdata scientist\b/i] },
  { role: "AI Engineer", patterns: [/\bai engineer\b/i, /\bing[eé]nieur ia\b/i, /\bllm\b/i] },
];

const SENIORITY_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "principal", pattern: /\bprincipal\b/i },
  { label: "staff", pattern: /\bstaff\b/i },
  { label: "lead", pattern: /\blead\b/i },
  { label: "senior", pattern: /\bsenior\b|\bsr\.?\b/i },
  { label: "mid", pattern: /\bmid(?:dle)?\b|\bintermediate\b|\bconfirm[eé]\b/i },
  { label: "junior", pattern: /\bjunior\b|\bjr\.?\b/i },
];

const SKILL_CATALOG = {
  programming_languages: ["TypeScript", "JavaScript", "Python", "Java", "C#", "Go", "PHP", "Ruby", "Kotlin", "Swift", "Rust"],
  frameworks: ["React", "Next.js", "Vue", "Angular", "Node.js", "NestJS", "Express", "Django", "Flask", "Spring", "Laravel", "FastAPI"],
  cloud_devops: ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible", "GitHub Actions", "GitLab CI", "Jenkins"],
  databases: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB", "Snowflake", "BigQuery"],
  ai_data_skills: ["Machine Learning", "Deep Learning", "LLM", "RAG", "NLP", "Computer Vision", "Pandas", "PyTorch", "TensorFlow", "Data Analysis"],
  domains: ["Fintech", "Healthcare", "E-commerce", "SaaS", "Cybersecurity", "Telecom", "Automotive", "Banking", "Insurance", "Retail", "Public Sector"],
} as const;

const STACK_GROUPS: Array<{ stack: string; members: string[] }> = [
  { stack: "JavaScript/TypeScript", members: ["JavaScript", "TypeScript", "Node.js", "React", "Next.js", "Vue", "Angular"] },
  { stack: "Python", members: ["Python", "Django", "Flask", "FastAPI"] },
  { stack: "Java", members: ["Java", "Spring", "Kotlin"] },
  { stack: "C#/.NET", members: ["C#"] },
  { stack: "PHP", members: ["PHP", "Laravel"] },
  { stack: "Go", members: ["Go"] },
  { stack: "Data/AI", members: ["Machine Learning", "LLM", "Pandas", "PyTorch", "TensorFlow", "Data Analysis"] },
  { stack: "Cloud/DevOps", members: ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform"] },
];

const AI_PROFILE_PROMPT = `You extract structured candidate profile data from CV text in English or French.
Return strict JSON only with this schema:
{"title":string|null,"seniority":string|null,"years_experience":number|null,"primary_stack":string[],"programming_languages":string[],"frameworks":string[],"cloud_devops":string[],"databases":string[],"ai_data_skills":string[],"domains":string[],"remote_preference":"remote"|"hybrid"|"onsite"|"unknown","short_summary":string}
Rules:
- Use only evidence from the CV text. No hallucinations.
- Keep arrays concise and technical.
- short_summary max 220 chars, factual.
- Support French and English wording.
- If unknown, use null/[]/"unknown".`;

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 50000);
}

function detectRole(text: string): string | null {
  for (const rule of ROLE_PATTERNS) {
    if (rule.patterns.some((pattern) => pattern.test(text))) return rule.role;
  }
  return null;
}

function detectSeniority(text: string): string | null {
  const match = SENIORITY_PATTERNS.find((item) => item.pattern.test(text));
  return match?.label ?? null;
}

function detectYearsExperience(text: string): number | null {
  const matches = [...text.matchAll(/(\d{1,2})\+?\s*(?:years|year|yrs|ans|an)\s+(?:of\s+)?(?:experience|exp)/gi)];
  const values = matches.map((match) => Number(match[1])).filter((value) => Number.isFinite(value) && value >= 0 && value <= 50);
  if (!values.length) return null;
  return Math.max(...values);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectSkills<T extends readonly string[]>(text: string, catalog: T): string[] {
  return catalog.filter((item) => {
    const pattern = new RegExp(`\\b${escapeRegex(item).replace(/\\\./g, "(?:\\.|\\s)")}\\b`, "i");
    return pattern.test(text);
  });
}

function detectPrimaryStack(profile: Pick<CandidateProfile, "programming_languages" | "frameworks" | "cloud_devops" | "ai_data_skills">): string[] {
  const matched = new Set([...profile.programming_languages, ...profile.frameworks, ...profile.cloud_devops, ...profile.ai_data_skills]);
  return STACK_GROUPS.filter((group) => group.members.some((member) => matched.has(member))).map((group) => group.stack);
}

function inferRemotePreference(text: string): CandidateRemotePreference {
  if (/\bremote\b|\btelecommute\b|\bwork from home\b|\bt[eé]l[eé]travail\b/i.test(text)) return "remote";
  if (/\bhybrid\b|\bhybride\b/i.test(text)) return "hybrid";
  if (/\bonsite\b|\bon-site\b|\bon site\b|\bpr[eé]sentiel\b/i.test(text)) return "onsite";
  return "unknown";
}

function buildSummary(profile: Omit<CandidateProfile, "short_summary">): string {
  const title = profile.title ?? "Candidate";
  const seniority = profile.seniority ? `${profile.seniority} ` : "";
  const years = profile.years_experience ? `${profile.years_experience}+ years` : "undisclosed experience";
  const focus = profile.primary_stack.length ? profile.primary_stack.join(", ") : "generalist stack";
  return `${title} (${seniority}${years}) with focus on ${focus}.`.slice(0, 220);
}

function scoreCompleteness(profile: Omit<CandidateProfile, "short_summary">): number {
  let score = 0;
  if (profile.title) score += 15;
  if (profile.seniority) score += 10;
  if (profile.years_experience !== null) score += 10;
  if (profile.primary_stack.length) score += 15;
  if (profile.programming_languages.length) score += 10;
  if (profile.frameworks.length) score += 10;
  if (profile.cloud_devops.length) score += 8;
  if (profile.databases.length) score += 8;
  if (profile.ai_data_skills.length) score += 6;
  if (profile.domains.length) score += 4;
  if (profile.remote_preference !== "unknown") score += 4;
  return Math.min(100, score);
}

function scoreConfidence(text: string, profile: Omit<CandidateProfile, "short_summary">): number {
  let score = 20;
  if (text.length >= 500) score += 20;
  if (profile.title) score += 10;
  if (profile.seniority) score += 10;
  if (profile.years_experience !== null) score += 10;
  const skillsCount =
    profile.programming_languages.length + profile.frameworks.length + profile.cloud_devops.length + profile.databases.length + profile.ai_data_skills.length;
  score += Math.min(25, skillsCount * 3);
  if (profile.primary_stack.length) score += 5;
  return Math.min(100, score);
}

function buildDeterministicProfile(normalized: string): CandidateProfile {
  const baseProfile = {
    title: detectRole(normalized),
    seniority: detectSeniority(normalized),
    years_experience: detectYearsExperience(normalized),
    primary_stack: [] as string[],
    programming_languages: detectSkills(normalized, SKILL_CATALOG.programming_languages),
    frameworks: detectSkills(normalized, SKILL_CATALOG.frameworks),
    cloud_devops: detectSkills(normalized, SKILL_CATALOG.cloud_devops),
    databases: detectSkills(normalized, SKILL_CATALOG.databases),
    ai_data_skills: detectSkills(normalized, SKILL_CATALOG.ai_data_skills),
    domains: detectSkills(normalized, SKILL_CATALOG.domains),
    remote_preference: inferRemotePreference(normalized),
  } as const;

  const withStack = {
    ...baseProfile,
    primary_stack: detectPrimaryStack(baseProfile),
  };

  return {
    ...withStack,
    short_summary: buildSummary(withStack),
  };
}

function parseCandidateProfileJson(raw: string): CandidateProfile | null {
  try {
    const parsed = JSON.parse(raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "")) as Partial<CandidateProfile>;
    if (!parsed || typeof parsed !== "object") return null;

    const ensureStringArray = (value: unknown) => (Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean).slice(0, 20) : []);
    const remote = parsed.remote_preference;
    const remote_preference: CandidateRemotePreference = remote === "remote" || remote === "hybrid" || remote === "onsite" ? remote : "unknown";

    return {
      title: parsed.title ? String(parsed.title).trim().slice(0, 120) : null,
      seniority: parsed.seniority ? String(parsed.seniority).trim().slice(0, 60) : null,
      years_experience:
        typeof parsed.years_experience === "number" && Number.isFinite(parsed.years_experience)
          ? Math.max(0, Math.min(50, Math.round(parsed.years_experience)))
          : null,
      primary_stack: ensureStringArray(parsed.primary_stack),
      programming_languages: ensureStringArray(parsed.programming_languages),
      frameworks: ensureStringArray(parsed.frameworks),
      cloud_devops: ensureStringArray(parsed.cloud_devops),
      databases: ensureStringArray(parsed.databases),
      ai_data_skills: ensureStringArray(parsed.ai_data_skills),
      domains: ensureStringArray(parsed.domains),
      remote_preference,
      short_summary: parsed.short_summary ? String(parsed.short_summary).trim().slice(0, 220) : "",
    };
  } catch {
    return null;
  }
}

async function parseCandidateProfileWithAI(normalizedText: string): Promise<CandidateProfile | null> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      input: [
        { role: "system", content: AI_PROFILE_PROMPT },
        { role: "user", content: normalizedText.slice(0, 25000) },
      ],
      max_output_tokens: 700,
    }),
  });

  if (!response.ok) {
    console.error("[candidate-profile] ai parsing http error", { status: response.status });
    return null;
  }

  const payload = (await response.json()) as { output_text?: string };
  if (!payload.output_text) return null;

  return parseCandidateProfileJson(payload.output_text);
}

export async function parseCandidateProfile(rawText: string): Promise<CandidateProfileResult> {
  const normalized = normalizeText(rawText);

  if (!normalized) {
    return {
      ok: false,
      error: {
        code: "CANDIDATE_PROFILE_EMPTY_TEXT",
        message: "No extracted CV text available for candidate profile parsing.",
      },
    };
  }

  let profile = buildDeterministicProfile(normalized);

  try {
    const aiProfile = await parseCandidateProfileWithAI(normalized);
    if (aiProfile) {
      profile = {
        ...profile,
        ...aiProfile,
        short_summary: aiProfile.short_summary || buildSummary(aiProfile),
      };
    } else if (env.OPENAI_API_KEY) {
      console.error("[candidate-profile] ai parsing failed, fallback to deterministic profile");
    }
  } catch (error) {
    console.error("[candidate-profile] ai parsing failure", error);
  }

  const withoutSummary: Omit<CandidateProfile, "short_summary"> = {
    title: profile.title,
    seniority: profile.seniority,
    years_experience: profile.years_experience,
    primary_stack: profile.primary_stack,
    programming_languages: profile.programming_languages,
    frameworks: profile.frameworks,
    cloud_devops: profile.cloud_devops,
    databases: profile.databases,
    ai_data_skills: profile.ai_data_skills,
    domains: profile.domains,
    remote_preference: profile.remote_preference,
  };

  return {
    ok: true,
    profile,
    completenessScore: scoreCompleteness(withoutSummary),
    confidenceScore: scoreConfidence(normalized, withoutSummary),
  };
}

export async function upsertCandidateProfile(params: {
  userId: string;
  cvFileId: string | null;
  extractedText: string;
}): Promise<CandidateProfileResult> {
  try {
    const parsed = await parseCandidateProfile(params.extractedText);
    if (!parsed.ok) return parsed;

    const normalizedText = normalizeText(params.extractedText);

    const record: CandidateProfileRecord = {
      user_id: params.userId,
      cv_file_id: params.cvFileId,
      parser_version: CANDIDATE_PROFILE_PARSER_VERSION,
      profile_json: parsed.profile,
      normalized_text: normalizedText,
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
