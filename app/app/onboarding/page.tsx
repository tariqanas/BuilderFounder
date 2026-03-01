"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

function isE164Phone(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false);
  const [notifySms, setNotifySms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const whatsappNumber = String(formData.get("whatsappNumber") ?? "").trim();
    const smsNumber = String(formData.get("smsNumber") ?? "").trim();

    if (notifyWhatsapp && !isE164Phone(whatsappNumber)) {
      setError("WhatsApp number must use international format (ex: +33612345678).");
      return;
    }

    if (notifySms && !isE164Phone(smsNumber)) {
      setError("SMS number must use international format (ex: +33612345678).");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/onboarding", { method: "POST", body: formData });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to save onboarding.");
      return;
    }

    router.push(`/app?notice=${data.notice ?? "onboarding-activated"}`);
    router.refresh();
  };

  return (
    <main className="card" style={{ maxWidth: 760, display: "grid", gap: 14, padding: "1.2rem" }}>
      <h1 style={{ marginBottom: 0 }}>Activate your Radar</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        One setup. Then only qualified signals.
      </p>

      <form onSubmit={onSubmit} encType="multipart/form-data" style={{ display: "grid", gap: 14 }}>
        <section className="card" style={{ background: "#0f0f18", display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0 }}>1. Profile</h2>
          <div>
            <label htmlFor="cv">CV (PDF, max 5MB)</label>
            <input id="cv" name="cv" type="file" accept="application/pdf" required />
          </div>
        </section>

        <section className="card" style={{ background: "#0f0f18", display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0 }}>2. Matching criteria</h2>
          <div>
            <label htmlFor="primaryStack">Primary stack</label>
            <input id="primaryStack" name="primaryStack" maxLength={120} placeholder="AWS, Terraform, Kubernetes" required />
          </div>
          <div>
            <label htmlFor="secondaryStack">Secondary stack (optional)</label>
            <input id="secondaryStack" name="secondaryStack" maxLength={120} placeholder="Python, CI/CD, Observability" />
          </div>
          <div>
            <label htmlFor="minDayRate">Minimum day rate (€)</label>
            <input id="minDayRate" name="minDayRate" type="number" min={1} max={10000} placeholder="650" required />
          </div>
          <div>
            <label htmlFor="remotePreference">Remote preference</label>
            <select id="remotePreference" name="remotePreference" required>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>
          <div>
            <label htmlFor="countries">Target countries</label>
            <input id="countries" name="countries" maxLength={300} placeholder="France, Belgium, Luxembourg" required />
          </div>
        </section>

        <section className="card" style={{ background: "#0f0f18", display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0 }}>3. Notification channels</h2>

          <label htmlFor="notifyEmail" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0 }}>
            <input id="notifyEmail" name="notifyEmail" type="checkbox" defaultChecked />
            Email
          </label>

          <div style={{ display: "grid", gap: 6 }}>
            <label htmlFor="notifyWhatsapp" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0 }}>
              <input
                id="notifyWhatsapp"
                name="notifyWhatsapp"
                type="checkbox"
                checked={notifyWhatsapp}
                onChange={(e) => setNotifyWhatsapp(e.target.checked)}
              />
              WhatsApp
            </label>
            <input
              id="whatsappNumber"
              name="whatsappNumber"
              placeholder="+33612345678"
              maxLength={16}
              disabled={!notifyWhatsapp}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label htmlFor="notifySms" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0 }}>
              <input id="notifySms" name="notifySms" type="checkbox" checked={notifySms} onChange={(e) => setNotifySms(e.target.checked)} />
              SMS
            </label>
            <input id="smsNumber" name="smsNumber" placeholder="+33612345678" maxLength={16} disabled={!notifySms} />
          </div>
        </section>

        <aside className="card" style={{ background: "#111124", display: "grid", gap: 4 }}>
          <strong>What happens next</strong>
          <span className="muted">Radar starts within a few hours</span>
          <span className="muted">You’ll receive up to 3 curated missions per week</span>
        </aside>

        {error && <p style={{ color: "#ff8a8a", margin: 0 }}>{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Activating..." : "Activate Radar"}
        </button>
      </form>
    </main>
  );
}
