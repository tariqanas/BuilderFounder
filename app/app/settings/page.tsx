import Link from "next/link";
import { getUserClientOrRedirect, requireUser } from "@/lib/server-auth";

export default async function SettingsPage({ searchParams }: { searchParams?: { notice?: string } }) {
  const { user } = await requireUser();
  const supabase = await getUserClientOrRedirect();
  const { data: settings } = await supabase
    .from("user_settings")
    .select("primary_stack,secondary_stack,min_day_rate,remote_preference,countries,notify_email,notify_whatsapp,whatsapp_number,notify_sms,sms_number")
    .eq("user_id", user.id)
    .maybeSingle();

  const countries = settings?.countries?.join(", ") ?? "";

  return (
    <main className="card" style={{ maxWidth: 760, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Radar settings</h1>
        <Link href="/app" className="muted">
          Back to dashboard
        </Link>
      </div>

      {searchParams?.notice === "saved" && <p className="card">Settings updated.</p>}
      {searchParams?.notice === "invalid" && <p className="card">Please review your inputs.</p>}
      {searchParams?.notice === "error" && <p className="card">Unable to update settings right now.</p>}

      <form action="/api/settings" method="post" style={{ display: "grid", gap: 12 }}>
        <div>
          <label htmlFor="primaryStack">Primary stack</label>
          <input id="primaryStack" name="primaryStack" defaultValue={settings?.primary_stack ?? ""} required />
        </div>
        <div>
          <label htmlFor="secondaryStack">Secondary stack</label>
          <input id="secondaryStack" name="secondaryStack" defaultValue={settings?.secondary_stack ?? ""} />
        </div>
        <div>
          <label htmlFor="minDayRate">Minimum day rate (€)</label>
          <input id="minDayRate" name="minDayRate" type="number" min={1} max={10000} defaultValue={settings?.min_day_rate ?? 650} required />
        </div>
        <div>
          <label htmlFor="remotePreference">Remote preference</label>
          <select id="remotePreference" name="remotePreference" defaultValue={settings?.remote_preference ?? "remote"}>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
        </div>
        <div>
          <label htmlFor="countries">Target countries</label>
          <input id="countries" name="countries" defaultValue={countries} required />
        </div>

        <label htmlFor="notifyEmail" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0 }}>
          <input id="notifyEmail" name="notifyEmail" type="checkbox" defaultChecked={settings?.notify_email ?? true} />
          Email
        </label>

        <label htmlFor="notifyWhatsapp" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0 }}>
          <input id="notifyWhatsapp" name="notifyWhatsapp" type="checkbox" defaultChecked={settings?.notify_whatsapp ?? false} />
          WhatsApp
        </label>
        <input id="whatsappNumber" name="whatsappNumber" placeholder="+33612345678" defaultValue={settings?.whatsapp_number ?? ""} />

        <label htmlFor="notifySms" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0 }}>
          <input id="notifySms" name="notifySms" type="checkbox" defaultChecked={settings?.notify_sms ?? false} />
          SMS
        </label>
        <input id="smsNumber" name="smsNumber" placeholder="+33612345678" defaultValue={settings?.sms_number ?? ""} />

        <button className="btn btn-primary" type="submit">
          Save settings
        </button>
      </form>
    </main>
  );
}
