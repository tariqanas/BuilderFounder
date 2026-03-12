import pdfParse from "pdf-parse";

export function isNonEmptyString(value: unknown, max = 255): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

export function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 255;
}

export function isValidUrl(value: unknown, max = 2048): value is string {
  if (typeof value !== "string" || value.length > max) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function isE164Phone(value: unknown): value is string {
  return typeof value === "string" && /^\+[1-9][0-9]{7,14}$/.test(value);
}

export function toInt(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(n)) return null;
  const int = Math.round(n);
  if (int < min || int > max) return null;
  return int;
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parsed = await pdfParse(buffer);

  return (parsed.text ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]+/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 50000);
}

export type CvValidationFailureCode =
  | "CV_NOT_RESUME_LIKE";

export type CvValidationResult =
  | {
      ok: true;
      normalizedText: string;
      signals: string[];
    }
  | {
      ok: false;
      code: CvValidationFailureCode;
      message: string;
      details: {
        textLength: number;
        readableRatio: number;
      };
    };

const CV_SIGNAL_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "experience", pattern: /\b(work experience|experience|employment|professional experience|exp[eé]rience|parcours professionnel|missions?)\b/i },
  { name: "skills", pattern: /\b(skills|technical skills|technologies|competencies|comp[eé]tences|outils|stack technique)\b/i },
  { name: "education", pattern: /\b(education|academic|degree|formation|dipl[oô]me|universit[eé]|[eé]cole|certifications?)\b/i },
  { name: "projects", pattern: /\b(projects|project experience|projets|r[eé]alisations|portfolio)\b/i },
  { name: "summary", pattern: /\b(summary|profile|about me|profil|r[eé]sum[eé]|objectif)\b/i },
  {
    name: "role",
    pattern:
      /\b(developer|engineer|consultant|architect|manager|analyst|d[eé]veloppeur|ing[eé]nieur|consultant|architecte|chef de projet|data scientist)\b/i,
  },
];

export function validateExtractedCvText(raw: string): CvValidationResult {
  const normalized = raw
    .replace(/\r/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const textLength = normalized.length;
  const readableChars = (normalized.match(/[\p{L}\p{N}\s.,;:()\-+/#@']/gu) ?? []).length;
  const alphaNumericChars = (normalized.match(/[\p{L}\p{N}]/gu) ?? []).length;
  const readableRatio = textLength === 0 ? 0 : readableChars / textLength;
  const alphaNumericRatio = textLength === 0 ? 0 : alphaNumericChars / textLength;

  if (textLength < 280) {
    return {
      ok: false,
      code: "CV_NOT_RESUME_LIKE",
      message: "The uploaded file does not look like a French or English CV/resume.",
      details: { textLength, readableRatio: Number(readableRatio.toFixed(3)) },
    };
  }

  if (readableRatio < 0.72 || alphaNumericRatio < 0.45) {
    return {
      ok: false,
      code: "CV_NOT_RESUME_LIKE",
      message: "The uploaded file does not look like a French or English CV/resume.",
      details: { textLength, readableRatio: Number(readableRatio.toFixed(3)) },
    };
  }

  const matchedSignals = CV_SIGNAL_PATTERNS.filter((signal) => signal.pattern.test(normalized)).map((signal) => signal.name);
  const coreResumeSignals = ["experience", "skills", "education", "projects"];
  const hasCoreSignal = matchedSignals.some((signal) => coreResumeSignals.includes(signal));

  if (matchedSignals.length < 2 || !hasCoreSignal) {
    return {
      ok: false,
      code: "CV_NOT_RESUME_LIKE",
      message: "The uploaded file does not look like a French or English CV/resume.",
      details: { textLength, readableRatio: Number(readableRatio.toFixed(3)) },
    };
  }

  return {
    ok: true,
    normalizedText: normalized,
    signals: matchedSignals,
  };
}
