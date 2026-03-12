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
      is_cv: deterministic.is_cv || (ai.is_cv && ai.confidence >= 0.55),
      language: ai.language !== "unknown" ? ai.language : deterministic.language,
      confidence: Number(((deterministic.confidence * 0.45 + ai.confidence * 0.55)).toFixed(3)),
      reason: `${deterministic.reason} AI: ${ai.reason}`.slice(0, 380),
      deterministicSignals: deterministic.deterministicSignals,
    };
  } catch {
    return deterministic;
  }
}
