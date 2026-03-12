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

type CvSections = Record<string, string>;

type ParseContext = {
  normalizedText: string;
  sectionedText: string;
  sections?: CvSections;
  classification: CvClassification;
  extractionQuality: number;
};

type ParseStrategy = "openai" | "deterministic_fallback";
type Confidence = "low" | "medium" | "high";

type FieldEvidence<T> = {
  value: T;
  confidence: Confidence;
  evidence: string[];
};

type AiEvidencePayload = {
  title: FieldEvidence<string | null>;
  seniority: FieldEvidence<string | null>;
  years_experience: FieldEvidence<number | null>;
  programming_languages: FieldEvidence<string[]>;
  frameworks: FieldEvidence<string[]>;
  cloud_devops: FieldEvidence<string[]>;
  databases: FieldEvidence<string[]>;
  ai_data_skills: FieldEvidence<string[]>;
  primary_stack: FieldEvidence<string[]>;
  domains: FieldEvidence<string[]>;
  spoken_languages: FieldEvidence<string[]>;
  management_signals: FieldEvidence<string[]>;
  remote_preference: FieldEvidence<CandidateRemotePreference>;
  short_summary: FieldEvidence<string>;
  extraction_notes: string[];
};

type DeterministicEvidence = {
  titleCandidates: string[];
  yearsSignals: { years: number; evidence: string; source: "explicit" | "chronology" }[];
  technologyCandidates: {
    programming_languages: string[];
    frameworks: string[];
    cloud_devops: string[];
    databases: string[];
    ai_data_skills: string[];
  };
  seniorityCandidates: string[];
  managementSignals: string[];
  domainSignals: string[];
  spokenLanguages: string[];
  remoteSignals: string[];
};

const SECTION_KEYS = ["header", "summary", "skills", "experience", "education", "certifications", "projects", "languages", "other"] as const;
type SectionKey = (typeof SECTION_KEYS)[number];

const AI_PROFILE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { $ref: "#/$defs/stringOrNullField" },
    seniority: { $ref: "#/$defs/stringOrNullField" },
    years_experience: { $ref: "#/$defs/numberOrNullField" },
    programming_languages: { $ref: "#/$defs/stringArrayField" },
    frameworks: { $ref: "#/$defs/stringArrayField" },
    cloud_devops: { $ref: "#/$defs/stringArrayField" },
    databases: { $ref: "#/$defs/stringArrayField" },
    ai_data_skills: { $ref: "#/$defs/stringArrayField" },
    primary_stack: { $ref: "#/$defs/stringArrayField" },
    domains: { $ref: "#/$defs/stringArrayField" },
    spoken_languages: { $ref: "#/$defs/stringArrayField" },
    management_signals: { $ref: "#/$defs/stringArrayField" },
    remote_preference: { $ref: "#/$defs/remoteField" },
    short_summary: { $ref: "#/$defs/stringField" },
    extraction_notes: { type: "array", items: { type: "string" } },
  },
  required: [
    "title",
    "seniority",
    "years_experience",
    "programming_languages",
    "frameworks",
    "cloud_devops",
    "databases",
    "ai_data_skills",
    "primary_stack",
    "domains",
    "spoken_languages",
    "management_signals",
    "remote_preference",
    "short_summary",
    "extraction_notes",
  ],
  $defs: {
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    evidenceList: { type: "array", items: { type: "string" } },
    stringField: {
      type: "object",
      additionalProperties: false,
      properties: { value: { type: "string" }, confidence: { $ref: "#/$defs/confidence" }, evidence: { $ref: "#/$defs/evidenceList" } },
      required: ["value", "confidence", "evidence"],
    },
    stringOrNullField: {
      type: "object",
      additionalProperties: false,
      properties: { value: { type: ["string", "null"] }, confidence: { $ref: "#/$defs/confidence" }, evidence: { $ref: "#/$defs/evidenceList" } },
      required: ["value", "confidence", "evidence"],
    },
    numberOrNullField: {
      type: "object",
      additionalProperties: false,
      properties: { value: { type: ["number", "null"] }, confidence: { $ref: "#/$defs/confidence" }, evidence: { $ref: "#/$defs/evidenceList" } },
      required: ["value", "confidence", "evidence"],
    },
    stringArrayField: {
      type: "object",
      additionalProperties: false,
      properties: { value: { type: "array", items: { type: "string" } }, confidence: { $ref: "#/$defs/confidence" }, evidence: { $ref: "#/$defs/evidenceList" } },
      required: ["value", "confidence", "evidence"],
    },
    remoteField: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string", enum: ["remote", "hybrid", "onsite", "unknown"] },
        confidence: { $ref: "#/$defs/confidence" },
        evidence: { $ref: "#/$defs/evidenceList" },
      },
      required: ["value", "confidence", "evidence"],
    },
  },
} as const;

const OPENAI_STRUCTURING_PROMPT = [
  "You are an evidence-based CV parser for technical hiring.",
  "Input may be French, English, or mixed.",
  "Use deterministic evidence as primary hints, then validate against sections/text.",
  "Do not hallucinate. If weak evidence, return null or empty arrays.",
  "Title must be grounded in header first, then summary.",
  "Years of experience priority: explicit statement > chronology.",
  "Respect category boundaries: programming languages vs frameworks vs cloud/devops vs databases.",
  "short_summary must describe dominant real positioning only.",
  "Return strict JSON and include concise evidence snippets for each field.",
].join("\n");

const TECH_ONTOLOGY: Array<{ canonical: string; aliases: string[]; category: keyof DeterministicEvidence["technologyCandidates"] }> = [
  { canonical: "JavaScript", aliases: ["javascript", "js"], category: "programming_languages" },
  { canonical: "TypeScript", aliases: ["typescript", "ts"], category: "programming_languages" },
  { canonical: "Python", aliases: ["python"], category: "programming_languages" },
  { canonical: "Java", aliases: ["java"], category: "programming_languages" },
  { canonical: "Go", aliases: ["go", "golang"], category: "programming_languages" },
  { canonical: "C#", aliases: ["c#", "csharp"], category: "programming_languages" },
  { canonical: "PHP", aliases: ["php"], category: "programming_languages" },
  { canonical: "React", aliases: ["react", "reactjs", "react.js"], category: "frameworks" },
  { canonical: "Angular", aliases: ["angular"], category: "frameworks" },
  { canonical: "Vue.js", aliases: ["vue", "vuejs", "vue.js"], category: "frameworks" },
  { canonical: "Node.js", aliases: ["node", "nodejs", "node.js", "node js"], category: "frameworks" },
  { canonical: "Next.js", aliases: ["next", "nextjs", "next.js", "next js"], category: "frameworks" },
  { canonical: "Spring", aliases: ["spring", "spring boot", "springboot"], category: "frameworks" },
  { canonical: "Django", aliases: ["django"], category: "frameworks" },
  { canonical: "AWS", aliases: ["aws", "amazon web services"], category: "cloud_devops" },
  { canonical: "Azure", aliases: ["azure", "microsoft azure"], category: "cloud_devops" },
  { canonical: "GCP", aliases: ["gcp", "google cloud"], category: "cloud_devops" },
  { canonical: "Kubernetes", aliases: ["kubernetes", "k8s"], category: "cloud_devops" },
  { canonical: "Docker", aliases: ["docker"], category: "cloud_devops" },
  { canonical: "Terraform", aliases: ["terraform"], category: "cloud_devops" },
  { canonical: "Azure DevOps", aliases: ["azure devops"], category: "cloud_devops" },
  { canonical: "GitLab CI", aliases: ["gitlab ci", "gitlab-ci"], category: "cloud_devops" },
  { canonical: "GitHub Actions", aliases: ["github actions"], category: "cloud_devops" },
  { canonical: "PostgreSQL", aliases: ["postgres", "postgresql"], category: "databases" },
  { canonical: "MongoDB", aliases: ["mongo", "mongodb"], category: "databases" },
  { canonical: "MySQL", aliases: ["mysql"], category: "databases" },
  { canonical: "SQL Server", aliases: ["sql server", "mssql", "ms sql"], category: "databases" },
  { canonical: "Redis", aliases: ["redis"], category: "databases" },
  { canonical: "BigQuery", aliases: ["bigquery"], category: "databases" },
  { canonical: "Pandas", aliases: ["pandas"], category: "ai_data_skills" },
  { canonical: "Machine Learning", aliases: ["machine learning", "ml"], category: "ai_data_skills" },
  { canonical: "Deep Learning", aliases: ["deep learning", "dl"], category: "ai_data_skills" },
  { canonical: "TensorFlow", aliases: ["tensorflow"], category: "ai_data_skills" },
  { canonical: "PyTorch", aliases: ["pytorch"], category: "ai_data_skills" },
  { canonical: "LLM", aliases: ["llm", "large language model", "large language models"], category: "ai_data_skills" },
  { canonical: "RAG", aliases: ["rag", "retrieval augmented generation"], category: "ai_data_skills" },
];

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

function normalizeLanguages(values: string[]): string[] {
  return uniq(tokenizeList(values).map((value) => LANGUAGE_SYNONYMS[value.toLowerCase().trim()] ?? value.trim())).slice(0, 10);
}

function normalizeDomains(values: string[]): string[] {
  return uniq(tokenizeList(values).map((value) => DOMAIN_SYNONYMS[value.toLowerCase().trim()] ?? value.trim())).slice(0, 15);
}

function normalizeSeniority(value: string | null): string | null {
  if (!value) return null;
  const key = value.toLowerCase().trim();
  return SENIORITY_SYNONYMS[key] ?? (key.includes("senior") ? "senior" : key.includes("lead") ? "lead" : null);
}

function normalizeRemote(remote: string): CandidateRemotePreference {
  const key = remote.toLowerCase();
  if (key.includes("remote") || key.includes("télé") || key.includes("tele")) return "remote";
  if (key.includes("hybrid") || key.includes("hybride")) return "hybrid";
  if (key.includes("onsite") || key.includes("présentiel") || key.includes("presentiel")) return "onsite";
  return "unknown";
}

function normalizeTechList(values: string[]): string[] {
  const canonByAlias = new Map<string, string>();
  for (const tech of TECH_ONTOLOGY) {
    canonByAlias.set(tech.canonical.toLowerCase(), tech.canonical);
    for (const alias of tech.aliases) canonByAlias.set(alias.toLowerCase(), tech.canonical);
  }
  return uniq(tokenizeList(values).map((v) => canonByAlias.get(v.toLowerCase().trim()) ?? v.trim())).slice(0, 30);
}

function buildSections(context: ParseContext, normalized: string): Record<SectionKey, string> {
  const base: Record<SectionKey, string> = Object.fromEntries(SECTION_KEYS.map((k) => [k, ""])) as Record<SectionKey, string>;
  if (context.sections) {
    for (const key of SECTION_KEYS) base[key] = context.sections[key] ?? "";
    return base;
  }

  const parsed = context.sectionedText.matchAll(/##\s*(header|summary|skills|experience|education|certifications|projects|languages|other)\n([\s\S]*?)(?=\n##\s*|$)/gi);
  for (const match of parsed) {
    base[match[1].toLowerCase() as SectionKey] = match[2].trim();
  }
  if (!base.header) {
    base.header = normalized.split("\n").slice(0, 8).join("\n");
  }
  return base;
}

function extractTitleCandidates(header: string): string[] {
  const lines = header.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 8);
  return lines.filter((line) => /engineer|developer|architect|consultant|manager|lead|ing[ée]nieur|d[ée]veloppeur|tech lead|devops/i.test(line)).slice(0, 5);
}

function inferYearsFromSignals(text: string): { years: number; evidence: string; source: "explicit" | "chronology" }[] {
  const out: { years: number; evidence: string; source: "explicit" | "chronology" }[] = [];
  for (const m of text.matchAll(/([^\n]{0,70}\b(\d{1,2})\s*(?:\+|ans?|years?)\s*(?:d['’]\s*)?(?:exp[ée]rience|experience)?[^\n]{0,30})/gi)) {
    const years = Number(m[2]);
    if (years >= 0 && years <= 50) out.push({ years, evidence: m[1].trim(), source: "explicit" });
  }

  const currentYear = new Date().getFullYear();
  for (const m of text.matchAll(/([^\n]{0,20}\b(19\d{2}|20\d{2})\s*[-–]\s*(19\d{2}|20\d{2}|present|current|aujourd'hui)[^\n]{0,20})/gi)) {
    const start = Number(m[2]);
    const endRaw = m[3].toLowerCase();
    const end = /present|current|aujourd'hui/.test(endRaw) ? currentYear : Number(endRaw);
    const years = end - start;
    if (years > 0 && years <= 50) out.push({ years, evidence: m[1].trim(), source: "chronology" });
  }
  return out;
}

function extractTechnologies(text: string): DeterministicEvidence["technologyCandidates"] {
  const tech: DeterministicEvidence["technologyCandidates"] = {
    programming_languages: [],
    frameworks: [],
    cloud_devops: [],
    databases: [],
    ai_data_skills: [],
  };

  const lower = ` ${text.toLowerCase()} `;
  for (const item of TECH_ONTOLOGY) {
    const hit = item.aliases.some((alias) => new RegExp(`(^|[^a-z0-9+#])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^a-z0-9+#])`, "i").test(lower));
    if (hit) tech[item.category].push(item.canonical);
  }

  for (const key of Object.keys(tech) as Array<keyof typeof tech>) tech[key] = uniq(tech[key]);
  return tech;
}

function extractDeterministicEvidence(sections: Record<SectionKey, string>, fullText: string): DeterministicEvidence {
  const scopeTech = [sections.skills, sections.experience, sections.projects, sections.summary].filter(Boolean).join("\n");
  const seniorityCandidates = uniq((fullText.match(/\b(junior|jr|mid|intermediate|confirm[ée]|senior|lead|staff|principal)\b/gi) ?? []).map((s) => s.toLowerCase()));
  const managementSignals = uniq(fullText.match(/\b(team lead|tech lead|management|managed|manager|leadership|mentoring|encadrement|pilotage)\b/gi) ?? []);
  const domainSignals = normalizeDomains(Object.keys(DOMAIN_SYNONYMS).filter((d) => fullText.toLowerCase().includes(d)));
  const spokenLanguages = normalizeLanguages((sections.languages + "\n" + sections.header).match(/\b(francais|français|french|anglais|english|spanish|espagnol|german|allemand|italian|arabe|arabic)\b/gi) ?? []);
  const remoteSignals = uniq(fullText.match(/\b(remote|hybrid|hybride|onsite|présentiel|presentiel|t[ée]l[ée]travail)\b/gi) ?? []);

  return {
    titleCandidates: extractTitleCandidates(sections.header || sections.summary),
    yearsSignals: inferYearsFromSignals(`${sections.summary}\n${sections.experience}\n${fullText}`),
    technologyCandidates: extractTechnologies(scopeTech),
    seniorityCandidates,
    managementSignals,
    domainSignals,
    spokenLanguages,
    remoteSignals,
  };
}

function isEvidencePayload(value: unknown): value is AiEvidencePayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<AiEvidencePayload>;
  return Boolean(v.title && v.years_experience && v.primary_stack && v.short_summary && Array.isArray(v.extraction_notes));
}

async function parseWithAI(input: { cleanedText: string; sections: Record<SectionKey, string>; deterministicEvidence: DeterministicEvidence }): Promise<AiEvidencePayload | null> {
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
        { role: "system", content: OPENAI_STRUCTURING_PROMPT },
        {
          role: "user",
          content: JSON.stringify({ cleaned_text: input.cleanedText.slice(0, 32000), sections: input.sections, deterministic_evidence: input.deterministicEvidence }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "candidate_profile_evidence",
          strict: true,
          schema: AI_PROFILE_SCHEMA,
        },
      },
      max_output_tokens: 2200,
    }),
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as { output_text?: string };
  if (!payload.output_text) return null;
  const parsed = parseJson<unknown>(payload.output_text);
  return isEvidencePayload(parsed) ? parsed : null;
}

function buildProfileFromEvidence(evidence: DeterministicEvidence): CandidateProfile {
  const years = evidence.yearsSignals.find((s) => s.source === "explicit") ?? evidence.yearsSignals[0] ?? null;
  const seniority = normalizeSeniority(evidence.seniorityCandidates[0] ?? null);
  return {
    title: evidence.titleCandidates[0] ?? null,
    seniority,
    years_experience: years?.years ?? null,
    primary_stack: [],
    programming_languages: evidence.technologyCandidates.programming_languages,
    frameworks: evidence.technologyCandidates.frameworks,
    cloud_devops: evidence.technologyCandidates.cloud_devops,
    databases: evidence.technologyCandidates.databases,
    ai_data_skills: evidence.technologyCandidates.ai_data_skills,
    domains: evidence.domainSignals,
    spoken_languages: evidence.spokenLanguages,
    management_signals: evidence.managementSignals,
    remote_preference: normalizeRemote(evidence.remoteSignals[0] ?? "unknown"),
    short_summary: "",
  };
}

function mergeAiProfile(base: CandidateProfile, ai: AiEvidencePayload): CandidateProfile {
  return {
    ...base,
    title: ai.title.value,
    seniority: ai.seniority.value,
    years_experience: ai.years_experience.value,
    primary_stack: ai.primary_stack.value,
    programming_languages: ai.programming_languages.value,
    frameworks: ai.frameworks.value,
    cloud_devops: ai.cloud_devops.value,
    databases: ai.databases.value,
    ai_data_skills: ai.ai_data_skills.value,
    domains: ai.domains.value,
    spoken_languages: ai.spoken_languages.value,
    management_signals: ai.management_signals.value,
    remote_preference: ai.remote_preference.value,
    short_summary: ai.short_summary.value,
  };
}

function computePrimaryStack(profile: CandidateProfile): string[] {
  const all = new Set([...profile.programming_languages, ...profile.frameworks, ...profile.cloud_devops, ...profile.ai_data_skills]);
  const buckets = [
    { label: "JavaScript/TypeScript", keys: ["JavaScript", "TypeScript", "Node.js", "React", "Angular", "Next.js"] },
    { label: "Java/Spring", keys: ["Java", "Spring"] },
    { label: "Python/Data", keys: ["Python", "Pandas", "Machine Learning", "LLM"] },
    { label: "Cloud/DevOps", keys: ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Azure DevOps", "GitLab CI"] },
  ];
  return buckets.filter((bucket) => bucket.keys.some((k) => all.has(k))).map((bucket) => bucket.label);
}

function profileSummary(profile: CandidateProfile): string {
  const role = profile.title ?? "IT candidate";
  const years = profile.years_experience !== null ? `${profile.years_experience} years` : "years not explicit";
  const stack = profile.primary_stack.length ? profile.primary_stack.join(" / ") : "technical stack identified";
  const domain = profile.domains[0] ? ` Domain: ${profile.domains[0]}.` : "";
  return `${role} with ${years}, focused on ${stack}.${domain}`.slice(0, 220);
}

function normalizeProfile(profile: CandidateProfile): CandidateProfile {
  const normalized: CandidateProfile = {
    ...profile,
    title: profile.title?.trim() ?? null,
    seniority: normalizeSeniority(profile.seniority),
    years_experience: profile.years_experience !== null ? Math.max(0, Math.min(50, Math.round(profile.years_experience))) : null,
    primary_stack: normalizeTechList(profile.primary_stack),
    programming_languages: normalizeTechList(profile.programming_languages),
    frameworks: normalizeTechList(profile.frameworks),
    cloud_devops: normalizeTechList(profile.cloud_devops),
    databases: normalizeTechList(profile.databases),
    ai_data_skills: normalizeTechList(profile.ai_data_skills),
    domains: normalizeDomains(profile.domains),
    spoken_languages: normalizeLanguages(profile.spoken_languages),
    management_signals: uniq(profile.management_signals),
    remote_preference: normalizeRemote(profile.remote_preference),
    short_summary: profile.short_summary.trim().slice(0, 220),
  };

  normalized.primary_stack = normalized.primary_stack.length ? normalized.primary_stack : computePrimaryStack(normalized);
  normalized.short_summary = normalized.short_summary || profileSummary(normalized);
  return normalized;
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

function confidenceWeight(level: Confidence): number {
  if (level === "high") return 1;
  if (level === "medium") return 0.65;
  return 0.35;
}

function scoreConfidence(params: {
  profile: CandidateProfile;
  context: ParseContext;
  strategy: ParseStrategy;
  evidence: DeterministicEvidence;
  aiPayload: AiEvidencePayload | null;
}): number {
  let score = 0;
  score += Math.round(params.context.extractionQuality * 25);
  score += Math.round(params.context.classification.confidence * 20);
  score += Math.min(20, params.evidence.yearsSignals.length * 3 + params.evidence.titleCandidates.length * 4 + params.evidence.managementSignals.length * 1);

  if (params.strategy === "openai" && params.aiPayload) {
    const aiSignals = [
      params.aiPayload.title.confidence,
      params.aiPayload.seniority.confidence,
      params.aiPayload.years_experience.confidence,
      params.aiPayload.programming_languages.confidence,
      params.aiPayload.frameworks.confidence,
      params.aiPayload.databases.confidence,
    ];
    score += Math.round((aiSignals.reduce((acc, cur) => acc + confidenceWeight(cur), 0) / aiSignals.length) * 25);
  } else {
    score += 6;
  }

  if (!params.context.classification.is_cv) score -= 25;
  if (params.profile.years_experience !== null && params.profile.seniority === "junior" && params.profile.years_experience > 6) score -= 8;
  return Math.max(0, Math.min(100, score));
}

function hasMinimumUsableSignal(profile: CandidateProfile): boolean {
  const skillSignals = profile.programming_languages.length + profile.frameworks.length + profile.cloud_devops.length + profile.databases.length;
  return Boolean(profile.title) || profile.years_experience !== null || skillSignals >= 3;
}

export async function parseCandidateProfile(context: ParseContext): Promise<CandidateProfileResult> {
  const normalized = normalizeText(context.normalizedText);
  if (!normalized) {
    return { ok: false, error: { code: "CANDIDATE_PROFILE_EMPTY_TEXT", message: "No extracted CV text available for candidate profile parsing." } };
  }

  const sections = buildSections(context, normalized);
  const deterministicEvidence = extractDeterministicEvidence(sections, normalized);
  let profile = buildProfileFromEvidence(deterministicEvidence);
  let aiPayload: AiEvidencePayload | null = null;
  let strategy: ParseStrategy = "deterministic_fallback";

  try {
    aiPayload = await parseWithAI({ cleanedText: normalized, sections, deterministicEvidence });
    if (aiPayload) {
      profile = mergeAiProfile(profile, aiPayload);
      strategy = "openai";
    }
  } catch (error) {
    console.error("[candidate-profile] ai parsing failure", { error });
  }

  profile = normalizeProfile(profile);
  if (!hasMinimumUsableSignal(profile)) {
    return { ok: false, error: { code: "CANDIDATE_PROFILE_LOW_QUALITY", message: "Unable to build a usable candidate profile from the uploaded CV text." } };
  }

  const completenessScore = scoreCompleteness(profile);
  const confidenceScore = scoreConfidence({ profile, context, strategy, evidence: deterministicEvidence, aiPayload });

  console.info("[candidate-profile] evidence-audit", {
    strategy,
    titleCandidates: deterministicEvidence.titleCandidates,
    yearsSignals: deterministicEvidence.yearsSignals.slice(0, 3),
    technologyCandidates: deterministicEvidence.technologyCandidates,
    aiNotes: aiPayload?.extraction_notes?.slice(0, 6) ?? [],
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
}): Promise<CandidateProfileResult> {
  try {
    const parsed = await parseCandidateProfile({
      normalizedText: params.normalizedText,
      sectionedText: params.sectionedText,
      sections: params.sections,
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
      return { ok: false, error: { code: "CANDIDATE_PROFILE_PERSIST_FAILED", message: "Candidate profile parsing succeeded but persistence failed." } };
    }

    return parsed;
  } catch {
    const safeError: CandidateProfileError = { code: "CANDIDATE_PROFILE_UNKNOWN", message: "An unexpected error occurred while building the candidate profile." };
    return { ok: false, error: safeError };
  }
}
