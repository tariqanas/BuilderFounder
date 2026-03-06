import { isValidUrl } from "@/lib/validators";

type PitchContext = {
  title: string;
  company: string;
  reasons: string[];
  primaryStack?: string | null;
  secondaryStack?: string | null;
};

const PLACEHOLDER_MARKERS = [
  "placeholder",
  "lorem ipsum",
  "mission align",
  "hi, i'm a senior",
  "happy to share details",
  "strong stack and mission fit",
];

export function cleanMissionText(value: string | null | undefined, fallback: string) {
  const cleaned = String(value ?? "").replace(/\s+/g, " ").trim();
  return cleaned || fallback;
}

export function toMissionReasons(value: string | null | undefined) {
  return String(value ?? "")
    .split(/\||;/)
    .map((entry) => entry.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function isMissionUrlUsable(value: string | null | undefined) {
  return isValidUrl(value);
}

export function isPitchUsable(value: string | null | undefined) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length < 80) return false;
  const lc = text.toLowerCase();
  return !PLACEHOLDER_MARKERS.some((marker) => lc.includes(marker));
}

export function buildFallbackPitch({ title, company, reasons, primaryStack, secondaryStack }: PitchContext) {
  const stack = [primaryStack, secondaryStack].filter(Boolean).join(" / ") || "DevOps & Cloud";
  const why = reasons.slice(0, 2).join("; ") || "scope and stack fit";
  const cleanTitle = cleanMissionText(title, "this role");
  const cleanCompany = cleanMissionText(company, "your team");

  return `Hi ${cleanCompany} team — freelance ${stack} engineer here. Your ${cleanTitle} mission looks like a strong fit (${why}). I've shipped similar cloud delivery and reliability projects, and can contribute quickly. Open to a short intro this week?`;
}
