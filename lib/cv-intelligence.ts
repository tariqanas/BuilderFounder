import { env } from "@/lib/env";

export type CvClassification = {
  is_cv: boolean;
  language: "fr" | "en" | "mixed" | "unknown";
  confidence: number;
  reason: string;
  deterministicSignals: string[];
};

export type CvPreprocessResult = {
  normalizedText: string;
  sectionedText: string;
  sections: Record<string, string>;
  extractionQuality: number;
};

export type CvStructuredExtraction = {
  is_cv: boolean;
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
  remote_preference: "remote" | "hybrid" | "onsite" | "unknown";
  short_summary: string;
  rejection_reason: string | null;
  text_excerpt: string;
};

const SECTION_PATTERNS: Array<{ key: string; patterns: RegExp[] }> = [
  { key: "header", patterns: [/^(contact|coordonn[ée]es?|identity|identit[ée]|informations? personnelles?)$/i] },
  { key: "summary", patterns: [/^(summary|profile|about me|professional summary|profil|r[ée]sum[ée]|objectif)$/i] },
  { key: "skills", patterns: [/^(skills|technical skills|competencies|comp[ée]tences|technologies|stack technique|outils)$/i] },
  { key: "experience", patterns: [/^(experience|work experience|professional experience|employment|exp[ée]riences?|parcours professionnel|missions?)$/i] },
  { key: "education", patterns: [/^(education|academic|formation|dipl[oô]mes?|universit[ée]|[ée]cole)$/i] },
  { key: "certifications", patterns: [/^(certifications?|certificates?|certificats?)$/i] },
  { key: "projects", patterns: [/^(projects?|project experience|projets?|r[ée]alisations?|portfolio)$/i] },
  { key: "languages", patterns: [/^(languages?|langues?)$/i] },
];

const CV_SIGNALS: Array<{ name: string; pattern: RegExp }> = [
  { name: "experience", pattern: /\b(experience|employment|exp[ée]rience|missions?|work history|parcours professionnel)\b/i },
  { name: "skills", pattern: /\b(skills|competenc(?:y|ies)|comp[ée]tences|technologies|stack)\b/i },
  { name: "education", pattern: /\b(education|degree|formation|dipl[oô]me|universit[ée])\b/i },
  { name: "cv-word", pattern: /\b(cv|resume|curriculum vitae)\b/i },
  { name: "contact", pattern: /\b(mail|email|t[ée]l[ée]phone|phone|linkedin|github)\b/i },
  { name: "date-ranges", pattern: /\b(19|20)\d{2}\s*[-–]\s*((19|20)\d{2}|present|current|aujourd'hui)\b/i },
];

const NON_CV_SIGNALS = [/invoice/i, /facture/i, /terms and conditions/i, /bank statement/i, /statement/i];

function safeText(value: string): string {
  return value
    .replace(/\r/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]+/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 80000);
}

export function preprocessCvText(raw: string): CvPreprocessResult {
  const normalizedText = safeText(raw);
  const lines = normalizedText.split("\n").map((line) => line.trim());
  const sections: Record<string, string[]> = {
    header: [],
    summary: [],
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    projects: [],
    languages: [],
    other: [],
  };

  let currentSection: keyof typeof sections = "header";

  for (const line of lines) {
    if (!line) continue;
    const compact = line.toLowerCase().replace(/[:\-–|]/g, "").trim();
    const matched = SECTION_PATTERNS.find((rule) => rule.patterns.some((p) => p.test(compact)));
    if (matched) {
      currentSection = matched.key as keyof typeof sections;
      continue;
    }
    sections[currentSection].push(line);
  }

  const extractionQuality = (() => {
    const textLength = normalizedText.length;
    const readableChars = (normalizedText.match(/[\p{L}\p{N}\s.,;:()\-+/#@']/gu) ?? []).length;
    const readability = textLength ? readableChars / textLength : 0;
    const linesWithWords = lines.filter((l) => /[\p{L}\p{N}]{2,}/u.test(l)).length;
    const structure = lines.length ? linesWithWords / lines.length : 0;
    return Number(Math.min(1, readability * 0.7 + structure * 0.3).toFixed(3));
  })();

  const sectionedText = Object.entries(sections)
    .filter(([, value]) => value.length)
    .map(([key, value]) => `## ${key}\n${value.join("\n")}`)
    .join("\n\n")
    .slice(0, 60000);

  return {
    normalizedText,
    sectionedText,
    sections: Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.join("\n").trim()])),
    extractionQuality,
  };
}

function detectLanguage(text: string): CvClassification["language"] {
  const frHits = (text.match(/\b(exp[ée]rience|comp[ée]tences|formation|langues|ing[ée]nieur|d[ée]veloppeur|projet)\b/gi) ?? []).length;
  const enHits = (text.match(/\b(experience|skills|education|languages|engineer|developer|project)\b/gi) ?? []).length;
  if (frHits >= 2 && enHits >= 2) return "mixed";
  if (frHits >= 2) return "fr";
  if (enHits >= 2) return "en";
  return "unknown";
}

function deterministicCvClassification(text: string, extractionQuality: number): CvClassification {
  const signals = CV_SIGNALS.filter((s) => s.pattern.test(text)).map((s) => s.name);
  const nonCvHits = NON_CV_SIGNALS.filter((p) => p.test(text)).length;

  let confidence = 0.25 + Math.min(0.55, signals.length * 0.1) + extractionQuality * 0.2 - nonCvHits * 0.2;
  confidence = Math.max(0, Math.min(1, confidence));
  const is_cv = signals.length >= 3 && nonCvHits === 0 && text.length >= 280 && extractionQuality >= 0.6;

  return {
    is_cv,
    language: detectLanguage(text),
    confidence: Number(confidence.toFixed(3)),
    reason: is_cv
      ? `Resume-like document with signals: ${signals.join(", ") || "none"}`
      : `Insufficient CV signals (${signals.length}) or non-CV markers (${nonCvHits}).`,
    deterministicSignals: signals,
  };
}

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "")) as T;
  } catch {
    return null;
  }
}

function truncateForLog(value: string, maxLength = 1600): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}... [truncated ${value.length - maxLength} chars]`;
}

const CV_EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    is_cv: { type: "boolean" },
    language: { type: "string", enum: ["fr", "en", "mixed", "unknown"] },
    extraction_quality: { type: "number", minimum: 0, maximum: 1 },
    title: { type: ["string", "null"] },
    seniority: { type: ["string", "null"] },
    years_experience: { type: ["number", "null"] },
    programming_languages: { type: "array", items: { type: "string" } },
    frameworks: { type: "array", items: { type: "string" } },
    cloud_devops: { type: "array", items: { type: "string" } },
    databases: { type: "array", items: { type: "string" } },
    ai_data_skills: { type: "array", items: { type: "string" } },
    primary_stack: { type: "array", items: { type: "string" } },
    domains: { type: "array", items: { type: "string" } },
    spoken_languages: { type: "array", items: { type: "string" } },
    management_signals: { type: "array", items: { type: "string" } },
    remote_preference: { type: "string", enum: ["remote", "hybrid", "onsite", "unknown"] },
    short_summary: { type: "string" },
    rejection_reason: { type: ["string", "null"] },
    text_excerpt: { type: "string" },
  },
  required: [
    "is_cv",
    "language",
    "extraction_quality",
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
    "rejection_reason",
    "text_excerpt",
  ],
} as const;

function isStructuredExtraction(value: unknown): value is CvStructuredExtraction {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<CvStructuredExtraction>;
  return (
    typeof v.is_cv === "boolean" &&
    typeof v.language === "string" &&
    typeof v.extraction_quality === "number" &&
    Array.isArray(v.programming_languages) &&
    Array.isArray(v.frameworks) &&
    Array.isArray(v.cloud_devops) &&
    Array.isArray(v.databases) &&
    Array.isArray(v.ai_data_skills) &&
    Array.isArray(v.primary_stack) &&
    Array.isArray(v.domains) &&
    Array.isArray(v.spoken_languages) &&
    Array.isArray(v.management_signals) &&
    typeof v.short_summary === "string" &&
    typeof v.text_excerpt === "string"
  );
}

export async function extractCvFromPdfWithOpenAI(pdfBuffer: Buffer, filename = "cv.pdf"): Promise<CvStructuredExtraction | null> {
  if (!env.OPENAI_API_KEY) {
    console.error("[cv-intelligence] OpenAI extraction failed: missing OPENAI_API_KEY");
    return null;
  }

  console.info("[cv-intelligence] OpenAI request start", { filename, size: pdfBuffer.length, model: env.OPENAI_MODEL });

  const form = new FormData();
  form.append("purpose", "user_data");
  form.append("file", new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }), filename);

  const uploadResponse = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: form,
  });

  console.info("[cv-intelligence] OpenAI file upload status", { status: uploadResponse.status, ok: uploadResponse.ok });
  if (!uploadResponse.ok) return null;
  const uploaded = (await uploadResponse.json()) as { id?: string };
  const fileId = uploaded.id;
  if (!fileId) {
    console.error("[cv-intelligence] OpenAI extraction failed: missing uploaded file id");
    return null;
  }

  try {
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
            content:
              "You are the single source of truth CV extraction engine for technical hiring. Read EVERY page of the attached PDF and use the FULL CV content, not only a dedicated skills section. Extract technologies from work experience bullet points, mission descriptions, project details, and responsibilities. Support French, English, and mixed CVs.\n\nCategory boundaries are strict:\n- programming_languages: Java, JavaScript, TypeScript, Python, Shell, SQL, HTML, CSS, etc.\n- frameworks: Spring Boot, Angular, React, Node.js, RabbitMQ, Kafka, REST, Hibernate, etc.\n- cloud_devops: Docker, Kubernetes, Helm, Jenkins, GitLab CI, Bamboo, Terraform, Grafana, Kibana, Splunk, Portainer, Dynatrace, Sonar, Maven, etc.\n- databases: MongoDB, Oracle, PostgreSQL, MySQL, Redis, SQL Server, etc.\n\nExtraction rules:\n- seniority: infer from titles and responsibilities (e.g. Technical Leader or Ingénieur sénior => senior).\n- management_signals: detect role evidence such as responsable, encadrement, pilotage, team lead, tech lead, coordination, mentoring, management.\n- domains: infer from employers, sectors, project context, and client names, never from hobbies/interests.\n- primary_stack: synthesize 2-4 meaningful stack clusters grounded in CV evidence.\n- short_summary: write 2-3 specific sentences grounded in the CV, no generic filler.\n- prefer null over hallucination when evidence is missing.\n- extract from work history, not only the profile headline.\n\nIf the document is not a usable professional CV/resume, return is_cv=false and a rejection_reason.",
          },
          {
            role: "user",
            content: [
              { type: "input_file", file_id: fileId },
              {
                type: "input_text",
                text:
                  "Return strict JSON only following the schema. text_excerpt must include the most relevant extracted CV evidence and stay within 4000 characters.",
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "cv_pdf_extraction",
            strict: true,
            schema: CV_EXTRACTION_SCHEMA,
          },
        },
        max_output_tokens: 3000,
      }),
    });

    console.info("[cv-intelligence] OpenAI response status", { status: response.status, ok: response.ok });
    if (!response.ok) return null;
    const payload = (await response.json()) as { output_text?: string };
    if (!payload.output_text) {
      console.error("[cv-intelligence] Missing output_text", {
        payloadKeys: Object.keys(payload ?? {}),
        openAiResponseOk: response.ok,
      });
      console.error("[cv-intelligence] OpenAI returned a valid HTTP response but invalid structured payload", {
        reason: "missing_output_text",
      });
      return null;
    }

    console.info("[cv-intelligence] OpenAI raw output_text:", truncateForLog(payload.output_text));

    const parsed = parseJson<unknown>(payload.output_text);
    if (!parsed) {
      console.error("[cv-intelligence] JSON parse failed", {
        outputTextPreview: truncateForLog(payload.output_text),
      });
      console.error("[cv-intelligence] OpenAI returned a valid HTTP response but invalid structured payload", {
        reason: "json_parse_failed",
      });
      return null;
    }

    console.info("[cv-intelligence] Parsed OpenAI JSON:", parsed);

    const isValidStructuredExtraction = isStructuredExtraction(parsed);
    console.info("[cv-intelligence] Structured extraction valid:", isValidStructuredExtraction);
    if (!isValidStructuredExtraction) {
      console.error("[cv-intelligence] Structured extraction schema mismatch", { parsed });
      console.error("[cv-intelligence] OpenAI returned a valid HTTP response but invalid structured payload", {
        reason: "structured_extraction_schema_mismatch",
      });
      return null;
    }
    console.info("[cv-intelligence] raw OpenAI extraction", parsed);
    return {
      ...parsed,
      extraction_quality: Number(Math.max(0, Math.min(1, parsed.extraction_quality)).toFixed(3)),
      text_excerpt: parsed.text_excerpt.slice(0, 4000),
      short_summary: parsed.short_summary.slice(0, 220),
      rejection_reason: parsed.rejection_reason?.slice(0, 400) ?? null,
    };
  } catch (error) {
    console.error("[cv-intelligence] OpenAI extraction failure reason", { error });
    return null;
  } finally {
    await fetch(`https://api.openai.com/v1/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    }).catch(() => undefined);
  }
}

async function classifyWithAI(text: string): Promise<Omit<CvClassification, "deterministicSignals"> | null> {
  if (!env.OPENAI_API_KEY) return null;

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      is_cv: { type: "boolean" },
      language: { type: "string", enum: ["fr", "en", "mixed", "unknown"] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      reason: { type: "string" },
    },
    required: ["is_cv", "language", "confidence", "reason"],
  };

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
          content:
            "Classify whether the document is a professional CV/resume. Support French and English. Be strict. Return JSON only.",
        },
        {
          role: "user",
          content: text.slice(0, 12000),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "cv_classification",
          strict: true,
          schema,
        },
      },
      max_output_tokens: 220,
    }),
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as { output_text?: string };
  if (!payload.output_text) return null;
  return parseJson<Omit<CvClassification, "deterministicSignals">>(payload.output_text);
}

export async function classifyCvText(text: string, extractionQuality: number): Promise<CvClassification> {
  const deterministic = deterministicCvClassification(text, extractionQuality);

  try {
    const ai = await classifyWithAI(text);
    if (!ai) return deterministic;

    return {
      is_cv: ai.is_cv,
      language: ai.language !== "unknown" ? ai.language : deterministic.language,
      confidence: Number(Math.max(0, Math.min(1, ai.confidence)).toFixed(3)),
      reason: ai.reason.slice(0, 380),
      deterministicSignals: deterministic.deterministicSignals,
    };
  } catch {
    return deterministic;
  }
}
