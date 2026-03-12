export const CANDIDATE_PROFILE_PARSER_VERSION = "v2.0.0";

export type CandidateRemotePreference = "remote" | "hybrid" | "onsite" | "unknown";

export type CandidateProfile = {
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
  remote_preference: CandidateRemotePreference;
  short_summary: string;
};

export type CandidateProfileRecord = {
  user_id: string;
  cv_file_id: string | null;
  parser_version: string;
  profile_json: CandidateProfile;
  normalized_text: string;
  profile_summary: string;
  completeness_score: number;
  confidence_score: number;
};

export type CandidateProfileErrorCode = "CANDIDATE_PROFILE_EMPTY_TEXT" | "CANDIDATE_PROFILE_PERSIST_FAILED" | "CANDIDATE_PROFILE_UNKNOWN";

export type CandidateProfileError = {
  code: CandidateProfileErrorCode;
  message: string;
};

export type CandidateProfileResult =
  | {
      ok: true;
      profile: CandidateProfile;
      completenessScore: number;
      confidenceScore: number;
    }
  | {
      ok: false;
      error: CandidateProfileError;
    };
