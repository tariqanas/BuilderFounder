import { createSupabaseServiceClient, createSupabaseUserServerClient } from "@/lib/supabase";

type OnboardingStateClient = ReturnType<typeof createSupabaseServiceClient> | ReturnType<typeof createSupabaseUserServerClient>;

export type OnboardingState = {
  isComplete: boolean;
  hasRequiredSettings: boolean;
  hasCvFile: boolean;
  hasCandidateProfile: boolean;
};

export async function getOnboardingState(client: OnboardingStateClient, userId: string): Promise<OnboardingState> {
  const [{ data: settings }, { data: cv }, { data: candidateProfile }] = await Promise.all([
    client.from("user_settings").select("primary_stack,countries").eq("user_id", userId).maybeSingle(),
    client.from("cv_files").select("storage_path").eq("user_id", userId).maybeSingle(),
    client.from("candidate_profiles").select("id").eq("user_id", userId).maybeSingle(),
  ]);

  const hasRequiredSettings = Boolean(settings?.primary_stack && settings?.countries?.length);
  const hasCvFile = Boolean(cv?.storage_path);
  const hasCandidateProfile = Boolean(candidateProfile?.id);

  return {
    // Candidate profile generation is currently best-effort in onboarding; missing profile data
    // should not block account activation while settings and CV are already present.
    isComplete: hasRequiredSettings && hasCvFile,
    hasRequiredSettings,
    hasCvFile,
    hasCandidateProfile,
  };
}
