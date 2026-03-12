import { inflateSync } from "zlib";

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

function collectPdfStreams(buffer: Buffer): Buffer[] {
  const streams: Buffer[] = [];
  let cursor = 0;

  while (cursor < buffer.length) {
    const streamIndex = buffer.indexOf("stream", cursor, "latin1");
    if (streamIndex === -1) break;

    let start = streamIndex + "stream".length;
    if (buffer[start] === 0x0d && buffer[start + 1] === 0x0a) start += 2;
    else if (buffer[start] === 0x0a || buffer[start] === 0x0d) start += 1;

    const end = buffer.indexOf("endstream", start, "latin1");
    if (end === -1) break;

    streams.push(buffer.subarray(start, end));
    cursor = end + "endstream".length;
  }

  return streams;
}

function maybeInflateStream(stream: Buffer): Buffer {
  if (stream.length < 4) return stream;

  const isFlateHeader = stream[0] === 0x78;
  if (!isFlateHeader) return stream;

  try {
    return inflateSync(stream);
  } catch {
    return stream;
  }
}

function decodePdfStringToken(token: string): string {
  let result = "";
  for (let i = 0; i < token.length; i += 1) {
    const char = token[i];
    if (char !== "\\") {
      result += char;
      continue;
    }

    const next = token[i + 1];
    if (!next) break;

    if (next === "n") {
      result += "\n";
      i += 1;
      continue;
    }
    if (next === "r") {
      result += "\r";
      i += 1;
      continue;
    }
    if (next === "t") {
      result += "\t";
      i += 1;
      continue;
    }
    if (next === "b") {
      result += "\b";
      i += 1;
      continue;
    }
    if (next === "f") {
      result += "\f";
      i += 1;
      continue;
    }

    if (/[0-7]/.test(next)) {
      const oct = token.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)?.[0] ?? next;
      result += String.fromCharCode(parseInt(oct, 8));
      i += oct.length;
      continue;
    }

    result += next;
    i += 1;
  }

  return result;
}

function extractTextOperators(content: string): string[] {
  const chunks: string[] = [];
  const textObjects = content.match(/BT[\s\S]*?ET/g) ?? [];

  for (const object of textObjects) {
    const literalStrings = [...object.matchAll(/\(([^()]*)\)\s*T[Jj]/g)].map((match) => decodePdfStringToken(match[1]));
    const hexStrings = [...object.matchAll(/<([0-9A-Fa-f\s]+)>\s*T[Jj]/g)].map((match) => {
      const clean = match[1].replace(/\s+/g, "");
      if (!clean.length || clean.length % 2 !== 0) return "";
      const bytes = Buffer.from(clean, "hex");
      return bytes.toString("utf8");
    });

    const arrStrings = [...object.matchAll(/\[(.*?)\]\s*TJ/g)].flatMap((match) => {
      const arr = match[1];
      return [...arr.matchAll(/\(([^()]*)\)|<([0-9A-Fa-f\s]+)>/g)].map((part) => {
        if (part[1]) return decodePdfStringToken(part[1]);
        const clean = (part[2] ?? "").replace(/\s+/g, "");
        if (!clean.length || clean.length % 2 !== 0) return "";
        return Buffer.from(clean, "hex").toString("utf8");
      });
    });

    const merged = [...literalStrings, ...hexStrings, ...arrStrings].filter(Boolean).join(" ").trim();
    if (merged) chunks.push(merged);
  }

  return chunks;
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const sections = collectPdfStreams(buffer).map((stream) => maybeInflateStream(stream).toString("latin1"));
  sections.push(buffer.toString("latin1"));

  const extracted = sections.flatMap((section) => extractTextOperators(section)).join("\n");

  return extracted
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]+/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 50000);
}

export type CvValidationFailureCode =
  | "CV_TEXT_TOO_SHORT"
  | "CV_TEXT_NOT_READABLE"
  | "CV_TEXT_PDF_INTERNALS"
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
  { name: "experience", pattern: /\b(work experience|experience|employment|professional experience|exp[eé]rience|parcours professionnel)\b/i },
  { name: "skills", pattern: /\b(skills|technical skills|technologies|competencies|comp[eé]tences|outils)\b/i },
  { name: "education", pattern: /\b(education|academic|degree|formation|dipl[oô]me|universit[eé]|[eé]cole)\b/i },
  { name: "projects", pattern: /\b(projects|project experience|projets|r[eé]alisations)\b/i },
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
  const readableChars = (normalized.match(/[\p{L}\p{N}\s.,;:()\-+/#@]/gu) ?? []).length;
  const readableRatio = textLength === 0 ? 0 : readableChars / textLength;

  if (textLength < 400) {
    return {
      ok: false,
      code: "CV_TEXT_TOO_SHORT",
      message: "The uploaded PDF does not contain enough readable text to be used as a CV.",
      details: { textLength, readableRatio: Number(readableRatio.toFixed(3)) },
    };
  }

  if (readableRatio < 0.7) {
    return {
      ok: false,
      code: "CV_TEXT_NOT_READABLE",
      message: "The uploaded PDF text looks corrupted or mostly binary.",
      details: { textLength, readableRatio: Number(readableRatio.toFixed(3)) },
    };
  }

  const pdfInternalsHits = (normalized.match(/\b(pdf-\d\.\d|obj|endobj|stream|endstream|xref|trailer)\b/gi) ?? []).length;
  if (pdfInternalsHits >= 8) {
    return {
      ok: false,
      code: "CV_TEXT_PDF_INTERNALS",
      message: "The uploaded file appears to contain raw PDF internals instead of readable CV content.",
      details: { textLength, readableRatio: Number(readableRatio.toFixed(3)) },
    };
  }

  const matchedSignals = CV_SIGNAL_PATTERNS.filter((signal) => signal.pattern.test(normalized)).map((signal) => signal.name);
  if (matchedSignals.length < 2) {
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
