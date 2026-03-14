import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserClientOrRedirect, requireUser } from "@/lib/server-auth";
import { getOnboardingState } from "@/lib/onboarding-state";
import { type CandidateProfile } from "@/types/candidate-profile";

function toCsv(values: string[] | null | undefined) {
  return (values ?? []).join(", ");
}

export default async function ProfileReviewPage({ searchParams }: { searchParams?: { notice?: string } }) {
  const { user } = await requireUser();
  const supabase = await getUserClientOrRedirect();

  const onboarding = await getOnboardingState(supabase, user.id);
  if (!onboarding.isComplete) redirect("/app/onboarding");
  if (onboarding.profileConfirmed) redirect("/app/dashboard");

  const [{ data: candidateRow }, { data: settings }] = await Promise.all([
    supabase.from("candidate_profiles").select("profile_json").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("user_settings")
      .select("primary_stack,secondary_stack,min_day_rate,remote_preference,countries,notify_email,notify_whatsapp,whatsapp_number,notify_sms,sms_number")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!candidateRow?.profile_json) {
    redirect("/app/dashboard");
  }

  const profile = candidateRow.profile_json as CandidateProfile;

  return (
    <main className="card" style={{ maxWidth: 920, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Review your profile</h1>
        <Link href="/app/onboarding" className="muted">
          Back
        </Link>
      </div>

      <p className="muted" style={{ margin: 0 }}>
        Your CV defines most of your profile. These preferences help refine your mission search.
      </p>


      {searchParams?.notice === "invalid" && <p className="card">Please review your profile fields and preferences.</p>}
      {searchParams?.notice === "missing-profile" && <p className="card">No candidate profile found yet. Please upload your CV first.</p>}
      {searchParams?.notice === "error" && <p className="card">Unable to save your profile right now.</p>}

      <form action="/api/onboarding/profile-review" method="post" style={{ display: "grid", gap: 14 }}>
        <section className="card" style={{ background: "#0f0f18", display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0 }}>Detected from your CV</h2>
          <div><label htmlFor="title">Title</label><input id="title" name="title" defaultValue={profile.title ?? ""} /></div>
          <div><label htmlFor="seniority">Seniority</label><input id="seniority" name="seniority" defaultValue={profile.seniority ?? ""} /></div>
          <div><label htmlFor="yearsExperience">Years experience</label><input id="yearsExperience" name="yearsExperience" type="number" min={0} max={50} defaultValue={profile.years_experience ?? ""} /></div>
          <div><label htmlFor="programmingLanguages">Programming languages (comma separated)</label><input id="programmingLanguages" name="programmingLanguages" defaultValue={toCsv(profile.programming_languages)} /></div>
          <div><label htmlFor="frameworks">Frameworks (comma separated)</label><input id="frameworks" name="frameworks" defaultValue={toCsv(profile.frameworks)} /></div>
          <div><label htmlFor="cloudDevops">Cloud & DevOps (comma separated)</label><input id="cloudDevops" name="cloudDevops" defaultValue={toCsv(profile.cloud_devops)} /></div>
          <div><label htmlFor="databases">Databases (comma separated)</label><input id="databases" name="databases" defaultValue={toCsv(profile.databases)} /></div>
          <div><label htmlFor="aiDataSkills">AI / Data skills (comma separated)</label><input id="aiDataSkills" name="aiDataSkills" defaultValue={toCsv(profile.ai_data_skills)} /></div>
          <div><label htmlFor="primaryStackCv">Primary stack (comma separated)</label><input id="primaryStackCv" name="primaryStackCv" defaultValue={toCsv(profile.primary_stack)} /></div>
          <div><label htmlFor="domains">Domains (comma separated)</label><input id="domains" name="domains" defaultValue={toCsv(profile.domains)} /></div>
          <div><label htmlFor="spokenLanguages">Spoken languages (comma separated)</label><input id="spokenLanguages" name="spokenLanguages" defaultValue={toCsv(profile.spoken_languages)} /></div>
          <div><label htmlFor="managementSignals">Management signals (comma separated)</label><input id="managementSignals" name="managementSignals" defaultValue={toCsv(profile.management_signals)} /></div>
          <div>
            <label htmlFor="cvRemotePreference">Remote preference from CV</label>
            <select id="cvRemotePreference" name="cvRemotePreference" defaultValue={profile.remote_preference ?? "unknown"}>
              <option value="unknown">Unknown</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>
          <div><label htmlFor="shortSummary">Short summary</label><textarea id="shortSummary" name="shortSummary" rows={4} defaultValue={profile.short_summary ?? ""} /></div>
        </section>

        <section className="card" style={{ background: "#0f0f18", display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0 }}>Mission preferences</h2>
          <p className="muted" style={{ margin: 0 }}>
            Additional and optional preferences for mission matching. These are not CV-derived facts.
          </p>
          <div><label htmlFor="remotePreference">Preferred work mode</label>
            <select id="remotePreference" name="remotePreference" defaultValue={settings?.remote_preference ?? "remote"}>
              <option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option>
            </select>
          </div>
          <div><label htmlFor="countries">Target countries (comma separated)</label><input id="countries" name="countries" defaultValue={(settings?.countries ?? []).join(", ")} /></div>
          <div><label htmlFor="minDayRate">Minimum day rate (€)</label><input id="minDayRate" name="minDayRate" type="number" min={1} max={10000} defaultValue={settings?.min_day_rate ?? 650} /></div>
          <div><label htmlFor="primaryStack">Additional primary stack preference (optional)</label><input id="primaryStack" name="primaryStack" defaultValue={settings?.primary_stack ?? ""} /></div>
          <div><label htmlFor="secondaryStack">Additional technologies / secondary stack (optional)</label><input id="secondaryStack" name="secondaryStack" defaultValue={settings?.secondary_stack ?? ""} /></div>

          <fieldset style={{ display: "grid", gap: 8, border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
            <legend style={{ padding: "0 6px" }}>Notification preferences</legend>
            <label htmlFor="notifyEmail" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0 }}><input id="notifyEmail" name="notifyEmail" type="checkbox" defaultChecked={settings?.notify_email ?? true} />Email alerts</label>
            <label htmlFor="notifyWhatsapp" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0 }}><input id="notifyWhatsapp" name="notifyWhatsapp" type="checkbox" defaultChecked={settings?.notify_whatsapp ?? false} />WhatsApp alerts</label>
            <input id="whatsappNumber" name="whatsappNumber" placeholder="+33612345678" defaultValue={settings?.whatsapp_number ?? ""} />
            <label htmlFor="notifySms" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0 }}><input id="notifySms" name="notifySms" type="checkbox" defaultChecked={settings?.notify_sms ?? false} />SMS alerts</label>
            <input id="smsNumber" name="smsNumber" placeholder="+33612345678" defaultValue={settings?.sms_number ?? ""} />
          </fieldset>
        </section>

        <button type="submit" className="btn btn-primary">Confirm profile</button>
      </form>
    </main>
  );
}
