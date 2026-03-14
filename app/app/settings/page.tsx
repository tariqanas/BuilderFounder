import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserClientOrRedirect, requireUser } from "@/lib/server-auth";
import { getOnboardingRedirectPath, getOnboardingState } from "@/lib/onboarding-state";

export default async function SettingsPage({ searchParams }: { searchParams?: { notice?: string } }) {
  const { user } = await requireUser();
  const supabase = await getUserClientOrRedirect();
  const onboarding = await getOnboardingState(supabase, user.id);
  const onboardingRedirectPath = getOnboardingRedirectPath(onboarding);
  if (onboardingRedirectPath !== "/app/dashboard") {
    redirect(onboardingRedirectPath);
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("primary_stack,secondary_stack,min_day_rate,remote_preference,countries,notify_email,notify_whatsapp,whatsapp_number,notify_sms,sms_number")
    .eq("user_id", user.id)
    .maybeSingle();

  const countries = settings?.countries?.join(", ") ?? "";

  return (
    <main className="card" style={{ maxWidth: 760, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Mission preferences</h1>
        <Link href="/app/dashboard" className="muted">
          Back to dashboard
        </Link>
      </div>

      <p className="muted" style={{ margin: 0 }}>
        Your CV already defines most of your profile. These preferences help refine your mission search.
      </p>

      {searchParams?.notice === "saved" && <p className="card">Settings updated.</p>}
      {searchParams?.notice === "invalid" && <p className="card">Please review your inputs.</p>}
      {searchParams?.notice === "error" && <p className="card">Unable to update settings right now.</p>}

      <form action="/api/settings" method="post" style={{ display: "grid", gap: 12 }}>
        <div>
          <label htmlFor="primaryStack">Additional primary stack</label>
          <input id="primaryStack" name="primaryStack" defaultValue={settings?.primary_stack ?? ""} />
        </div>
        <div>
          <label htmlFor="secondaryStack">Additional secondary stack</label>
          <input id="secondaryStack" name="secondaryStack" defaultValue={settings?.secondary_stack ?? ""} />
        </div>
        <div>
          <label htmlFor="minDayRate">Minimum day rate</label>
          <input id="minDayRate" name="minDayRate" type="number" min={1} max={10000} defaultValue={settings?.min_day_rate ?? 650} required />
        </div>
        <div>
          <label htmlFor="remotePreference">Preferred work mode</label>
          <select id="remotePreference" name="remotePreference" defaultValue={settings?.remote_preference ?? "remote"}>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
        </div>
        <div>
          <label htmlFor="countries">Target countries (optional)</label>
          <input id="countries" name="countries" defaultValue={countries} />
        </div>

        <fieldset style={{ display: "grid", gap: 8, border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
          <legend style={{ padding: "0 6px" }}>Optional notification channels</legend>
          <p className="muted" style={{ margin: "0 0 4px" }}>
            Choose alert channels if you want mission notifications outside the dashboard.
          </p>
          <label htmlFor="notifyEmail" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0 }}>
            <input id="notifyEmail" name="notifyEmail" type="checkbox" defaultChecked={settings?.notify_email ?? true} />
            Email alerts (optional)
          </label>

          <label htmlFor="notifyWhatsapp" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0 }}>
            <input id="notifyWhatsapp" name="notifyWhatsapp" type="checkbox" defaultChecked={settings?.notify_whatsapp ?? false} />
            WhatsApp alerts (optional)
          </label>
          <input id="whatsappNumber" name="whatsappNumber" placeholder="+33612345678" defaultValue={settings?.whatsapp_number ?? ""} />

          <label htmlFor="notifySms" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0 }}>
            <input id="notifySms" name="notifySms" type="checkbox" defaultChecked={settings?.notify_sms ?? false} />
            SMS alerts (optional)
          </label>
          <input id="smsNumber" name="smsNumber" placeholder="+33612345678" defaultValue={settings?.sms_number ?? ""} />
        </fieldset>

        <button className="btn btn-primary" type="submit">
          Save settings
        </button>
      </form>
    </main>
  );
}
