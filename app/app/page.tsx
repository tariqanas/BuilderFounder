import { redirect } from "next/navigation";
import { getOnboardingRedirectPath, getOnboardingState } from "@/lib/onboarding-state";
import { getUserClientOrRedirect, requireUser } from "@/lib/server-auth";

export default async function AppEntryPage() {
  const { user } = await requireUser();
  const supabase = await getUserClientOrRedirect();
  const onboarding = await getOnboardingState(supabase, user.id);

  redirect(getOnboardingRedirectPath(onboarding));
}
