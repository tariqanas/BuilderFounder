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
  { role: "Full-stack Developer", patterns: [/\bfull[ -]?stack\b/i] },
  { role: "Frontend Developer", patterns: [/\bfront[ -]?end\b/i, /\breact developer\b/i] },
  { role: "Backend Developer", patterns: [/\bback[ -]?end\b/i, /\bnode(?:\.js)? developer\b/i, /\bjava developer\b/i] },
  { role: "DevOps Engineer", patterns: [/\bdevops\b/i, /\bsre\b/i, /\bsite reliability\b/i] },
  { role: "Data Engineer", patterns: [/\bdata engineer\b/i, /\betl\b/i] },
  { role: "Data Scientist", patterns: [/\bdata scientist\b/i, /\bmachine learning engineer\b/i] },
  { role: "AI Engineer", patterns: [/\bai engineer\b/i, /\bllm\b/i, /\bgenerative ai\b/i] },
];

const SENIORITY_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "principal", pattern: /\bprincipal\b/i },
  { label: "staff", pattern: /\bstaff\b/i },
  { label: "lead", pattern: /\blead\b/i },
  { label: "senior", pattern: /\bsenior\b|\bsr\.?\b/i },
  { label: "mid", pattern: /\bmid(?:dle)?\b|\bintermediate\b/i },
  { label: "junior", pattern: /\bjunior\b|\bjr\.?\b/i },
];

const SKILL_CATALOG = {
  programming_languages: ["TypeScript", "JavaScript", "Python", "Java", "C#", "Go", "PHP", "Ruby", "Kotlin", "Swift", "Rust"],
  frameworks: ["React", "Next.js", "Vue", "Angular", "Node.js", "NestJS", "Express", "Django", "Flask", "Spring", "Laravel", "FastAPI"],
  cloud_devops: ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible", "GitHub Actions", "GitLab CI", "Jenkins"],
  databases: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB", "Snowflake", "BigQuery"],
  ai_data_skills: ["Machine Learning", "Deep Learning", "LLM", "RAG", "NLP", "Computer Vision", "Pandas", "PyTorch", "TensorFlow", "Data Analysis"],
  domains: [
    "Fintech",
    "Healthcare",
    "E-commerce",
    "SaaS",
    "Cybersecurity",
    "Telecom",
    "Automotive",
    "Banking",
    "Insurance",
    "Retail",
    "Public Sector",
  ],
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
  const values = matches
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 50);
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
  if (/\bremote\b|\btelecommute\b|\bwork from home\b/i.test(text)) return "remote";
  if (/\bhybrid\b/i.test(text)) return "hybrid";
  if (/\bonsite\b|\bon-site\b|\bon site\b/i.test(text)) return "onsite";
  return "unknown";
}

function buildSummary(profile: Omit<CandidateProfile, "short_summary">): string {
  const title = profile.title ?? "Candidate";
  const seniority = profile.seniority ? `${profile.seniority} ` : "";
  const years = profile.years_experience ? `${profile.years_experience}+ years` : "undisclosed experience";
  const focus = profile.primary_stack.length ? profile.primary_stack.join(", ") : "generalist stack";
  return `${title} (${seniority}${years}) with focus on ${focus}.`;
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

export function parseCandidateProfile(rawText: string): CandidateProfileResult {
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

  const short_summary = buildSummary(withStack);
  const profile: CandidateProfile = {
    ...withStack,
    short_summary,
  };

  return {
    ok: true,
    profile,
    completenessScore: scoreCompleteness(withStack),
    confidenceScore: scoreConfidence(normalized, withStack),
  };
}

export async function upsertCandidateProfile(params: {
  userId: string;
  cvFileId: string | null;
  extractedText: string;
}): Promise<CandidateProfileResult> {
  try {
    const parsed = parseCandidateProfile(params.extractedText);
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
