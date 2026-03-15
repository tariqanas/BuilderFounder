import { createSupabaseServiceClient } from "@/lib/supabase";

type CandidateProfileSnapshot = {
  primary_stack: string[];
  programming_languages: string[];
  frameworks: string[];
  cloud_devops: string[];
  databases: string[];
  domains: string[];
  years_experience?: number | null;
  seniority?: string | null;
  remote_preference?: "remote" | "hybrid" | "onsite" | "unknown";
};

type UserSettingsSnapshot = {
  primary_stack: string | null;
  secondary_stack: string | null;
  min_day_rate: number | null;
  remote_preference: string | null;
  countries: string[] | null;
};

type MissionLike = {
  id: string;
  title: string;
  company: string;
  country: string | null;
  remote: string | null;
  day_rate: number | null;
  description?: string | null;
};

type MatchResult = {
  score: number;
  reasons: string[];
};

const WEIGHTS = {
  programming_languages: 16,
  frameworks: 16,
  cloud_devops: 10,
  databases: 10,
  domains: 12,
  primary_stack: 14,
  remote_preference: 8,
  countries: 6,
  day_rate: 8,
  seniority_experience: 10,
} as const;

const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((sum, value) => sum + value, 0);

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function uniq(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function explodeStackInput(stack: string | null | undefined) {
  if (!stack) return [] as string[];
  return String(stack)
    .split(/[;,|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function includesKeyword(text: string, keyword: string) {
  const normalizedKeyword = normalize(keyword);
  if (!normalizedKeyword) return false;
  return text.includes(normalizedKeyword);
}

function overlapScore(text: string, values: string[], weight: number) {
  const normalizedValues = uniq(values.map(normalize));
  if (!normalizedValues.length) {
    return { score: 0, overlap: [] as string[] };
  }

  const overlap = normalizedValues.filter((value) => includesKeyword(text, value));
  if (!overlap.length) {
    return { score: 0, overlap };
  }

  const ratio = overlap.length / normalizedValues.length;
  return {
    score: Math.round(weight * Math.min(1, ratio)),
    overlap,
  };
}

function resolveRemotePreference(settings: UserSettingsSnapshot, candidateProfile: CandidateProfileSnapshot | null) {
  if (settings.remote_preference) return normalize(settings.remote_preference);
  if (candidateProfile?.remote_preference && candidateProfile.remote_preference !== "unknown") {
    return normalize(candidateProfile.remote_preference);
  }
  return null;
}

function remoteCompatibilityScore(
  missionRemote: string | null,
  settings: UserSettingsSnapshot,
  candidateProfile: CandidateProfileSnapshot | null
) {
  const preference = resolveRemotePreference(settings, candidateProfile);
  if (!preference) return { score: 0, reason: null as string | null };

  const missionMode = normalize(missionRemote ?? "");
  if (!missionMode) return { score: Math.round(WEIGHTS.remote_preference * 0.5), reason: "Remote mode unspecified" };

  if (preference === "remote" && missionMode.includes("remote")) {
    return { score: WEIGHTS.remote_preference, reason: "Remote-compatible" };
  }

  if (preference === "hybrid" && (missionMode.includes("hybrid") || missionMode.includes("remote"))) {
    return { score: WEIGHTS.remote_preference, reason: "Hybrid/remote-compatible" };
  }

  if (preference === "onsite" && missionMode.includes("onsite")) {
    return { score: WEIGHTS.remote_preference, reason: "Onsite-compatible" };
  }

  return { score: -Math.round(WEIGHTS.remote_preference * 0.75), reason: "Remote preference mismatch" };
}

function countryCompatibilityScore(country: string | null, preferredCountries: string[]) {
  if (!preferredCountries.length) return { score: 0, reason: null as string | null };
  if (!country) return { score: 0, reason: "Country not specified" };

  const normalizedCountry = normalize(country);
  const isMatch = preferredCountries.some((preferred) => normalizedCountry.includes(normalize(preferred)));
  if (!isMatch) {
    return { score: -Math.round(WEIGHTS.countries * 0.5), reason: "Country preference mismatch" };
  }

  return { score: WEIGHTS.countries, reason: "Country preference match" };
}

function dayRateCompatibilityScore(dayRate: number | null, minDayRate: number | null) {
  if (minDayRate === null || minDayRate === undefined) return { score: 0, reason: null as string | null };
  if (dayRate === null || dayRate === undefined) return { score: 0, reason: "Day rate not specified" };
  if (Number(dayRate) >= Number(minDayRate)) return { score: WEIGHTS.day_rate, reason: "Day rate compatible" };
  return { score: -WEIGHTS.day_rate, reason: "Below your minimum day rate" };
}

function parseMissionRequiredYears(text: string) {
  const yearsMatch = text.match(/(\d{1,2})\s*\+?\s*(?:years|ans)/i);
  if (!yearsMatch) return null;
  const parsed = Number.parseInt(yearsMatch[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function seniorityCompatibilityScore(text: string, candidateProfile: CandidateProfileSnapshot | null) {
  if (!candidateProfile) return { score: 0, reason: null as string | null };

  const requiredYears = parseMissionRequiredYears(text);
  if (requiredYears !== null && candidateProfile.years_experience !== null && candidateProfile.years_experience !== undefined) {
    if (candidateProfile.years_experience >= requiredYears) {
      return { score: WEIGHTS.seniority_experience, reason: `Experience level matches (${requiredYears}+ years requested)` };
    }
    return { score: -Math.round(WEIGHTS.seniority_experience * 0.7), reason: `Experience gap (${requiredYears}+ years requested)` };
  }

  const seniority = normalize(candidateProfile.seniority ?? "");
  if (!seniority) return { score: 0, reason: null as string | null };
  if (includesKeyword(text, seniority)) {
    return { score: Math.round(WEIGHTS.seniority_experience * 0.7), reason: "Seniority alignment" };
  }

  return { score: 0, reason: null };
}

export function scoreMissionMatch(params: {
  mission: MissionLike;
  settings: UserSettingsSnapshot;
  candidateProfile: CandidateProfileSnapshot | null;
}): MatchResult {
  const { mission, settings, candidateProfile } = params;
  const missionText = normalize(`${mission.title} ${mission.description ?? ""}`);

  const languages = overlapScore(missionText, candidateProfile?.programming_languages ?? [], WEIGHTS.programming_languages);
  const frameworks = overlapScore(missionText, candidateProfile?.frameworks ?? [], WEIGHTS.frameworks);
  const cloudDevops = overlapScore(missionText, candidateProfile?.cloud_devops ?? [], WEIGHTS.cloud_devops);
  const databases = overlapScore(missionText, candidateProfile?.databases ?? [], WEIGHTS.databases);
  const domains = overlapScore(missionText, candidateProfile?.domains ?? [], WEIGHTS.domains);
  const primaryStack = overlapScore(
    missionText,
    uniq([
      ...explodeStackInput(settings.primary_stack),
      ...explodeStackInput(settings.secondary_stack),
      ...(candidateProfile?.primary_stack ?? []),
    ]),
    WEIGHTS.primary_stack
  );

  const remote = remoteCompatibilityScore(mission.remote, settings, candidateProfile);
  const countries = countryCompatibilityScore(mission.country, settings.countries ?? []);
  const dayRate = dayRateCompatibilityScore(mission.day_rate, settings.min_day_rate);
  const seniority = seniorityCompatibilityScore(missionText, candidateProfile);

  const rawScore =
    languages.score +
    frameworks.score +
    cloudDevops.score +
    databases.score +
    domains.score +
    primaryStack.score +
    remote.score +
    countries.score +
    dayRate.score +
    seniority.score;

  const score = Math.max(0, Math.min(100, Math.round((rawScore / TOTAL_WEIGHT) * 100)));

  const reasons: string[] = [];
  if (primaryStack.overlap.length) reasons.push(`Primary stack overlap: ${primaryStack.overlap.slice(0, 2).join(" / ")}`);
  if (languages.overlap.length) reasons.push(`Programming language match: ${languages.overlap.slice(0, 2).join(" / ")}`);
  if (frameworks.overlap.length) reasons.push(`Framework match: ${frameworks.overlap.slice(0, 2).join(" / ")}`);
  if (cloudDevops.overlap.length) reasons.push(`Cloud/DevOps match: ${cloudDevops.overlap.slice(0, 2).join(" / ")}`);
  if (databases.overlap.length) reasons.push(`Database match: ${databases.overlap.slice(0, 2).join(" / ")}`);
  if (domains.overlap.length) reasons.push(`Domain match: ${domains.overlap.slice(0, 2).join(" / ")}`);
  if (remote.reason) reasons.push(remote.reason);
  if (countries.reason) reasons.push(countries.reason);
  if (dayRate.reason) reasons.push(dayRate.reason);
  if (seniority.reason) reasons.push(seniority.reason);

  const fallbackReason = score >= 70 ? "Strong global profile fit" : score >= 45 ? "Partial technical fit" : "Weak technical fit";

  return {
    score,
    reasons: uniq((reasons.length ? reasons : [fallbackReason]).slice(0, 4)),
  };
}

export async function upsertMissionMatch(params: {
  userId: string;
  missionId: string;
  mission: MissionLike;
  settings: UserSettingsSnapshot;
  candidateProfile: CandidateProfileSnapshot | null;
}) {
  const service = createSupabaseServiceClient();
  const result = scoreMissionMatch({ mission: params.mission, settings: params.settings, candidateProfile: params.candidateProfile });

  const reasons = result.reasons.join(" | ");
  console.log(
    `[matching] mission_match_upsert_start user_id=${params.userId} mission_id=${params.missionId} score=${result.score} reasons=${JSON.stringify(
      result.reasons
    )}`
  );

  const { data, error } = await service
    .from("mission_matches")
    .upsert(
      {
        user_id: params.userId,
        mission_id: params.missionId,
        score: result.score,
        reasons,
      },
      { onConflict: "user_id,mission_id" }
    )
    .select("id,user_id,mission_id,score,reasons")
    .maybeSingle();

  console.log(
    `[matching] mission_match_upsert_response user_id=${params.userId} mission_id=${params.missionId} data=${JSON.stringify(
      data ?? null
    )} error=${error ? JSON.stringify(error) : "null"}`
  );

  if (error) {
    throw new Error(`mission_match_upsert_failed mission_id=${params.missionId} user_id=${params.userId} code=${error.code ?? "n/a"}`);
  }

  if (!data) {
    throw new Error(`mission_match_upsert_empty_response mission_id=${params.missionId} user_id=${params.userId}`);
  }

  return result;
}
