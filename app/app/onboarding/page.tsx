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

    router.push(data.notice === "profile-review-required" ? "/app/onboarding/profile-review" : `/app?notice=${data.notice ?? "onboarding-activated"}`);
    router.refresh();
  };

  return (
    <main className="card" style={{ maxWidth: 760, display: "grid", gap: 14, padding: "1.2rem" }}>
      <h1 style={{ marginBottom: 0 }}>Activate your Radar</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        We first detect your core profile from your CV, then you can add optional mission preferences.
      </p>

      <form onSubmit={onSubmit} encType="multipart/form-data" style={{ display: "grid", gap: 14 }}>
        <section className="card" style={{ background: "#0f0f18", display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0 }}>1. Detected from your CV</h2>
          <p className="muted" style={{ margin: 0 }}>
            Upload your CV. We use AI to detect your core candidate profile from it.
          </p>
          <div>
            <label htmlFor="cv">CV (PDF, max 5MB)</label>
            <input id="cv" name="cv" type="file" accept="application/pdf" required />
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            <strong style={{ fontSize: "0.95rem" }}>Detected profile fields include:</strong>
            <span className="muted" style={{ fontSize: "0.95rem" }}>
              title, seniority, years of experience, programming languages, frameworks, cloud/devops, databases,
              domains, management signals, primary stack, summary.
            </span>
          </div>
        </section>

        <section className="card" style={{ background: "#0f0f18", display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0 }}>2. Mission preferences</h2>
          <p className="muted" style={{ margin: 0 }}>
            These fields are optional mission-search preferences. They do not overwrite CV-detected profile data.
          </p>
          <div>
            <label htmlFor="primaryStack">Additional primary stack preference (optional)</label>
            <input id="primaryStack" name="primaryStack" maxLength={120} placeholder="AWS, Terraform, Kubernetes" />
          </div>
          <div>
            <label htmlFor="secondaryStack">Additional secondary stack preference (optional)</label>
            <input id="secondaryStack" name="secondaryStack" maxLength={120} placeholder="Python, CI/CD, Observability" />
          </div>
          <div>
            <label htmlFor="minDayRate">Minimum day rate (€)</label>
            <input id="minDayRate" name="minDayRate" type="number" min={1} max={10000} placeholder="650" required />
          </div>
          <div>
            <label htmlFor="remotePreference">Preferred work mode</label>
            <select id="remotePreference" name="remotePreference" required>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
            <span className="muted" style={{ fontSize: "0.9rem" }}>
              Saved as a mission preference only.
            </span>
          </div>
          <div>
            <label htmlFor="countries">Target countries (optional)</label>
            <input id="countries" name="countries" maxLength={300} placeholder="France, Belgium, Luxembourg" />
          </div>
          <fieldset style={{ display: "grid", gap: 8, border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
            <legend style={{ padding: "0 6px" }}>Notification preferences (optional)</legend>

            <label htmlFor="notifyEmail" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0 }}>
              <input id="notifyEmail" name="notifyEmail" type="checkbox" defaultChecked />
              Email alerts
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
                WhatsApp alerts
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
                SMS alerts
              </label>
              <input id="smsNumber" name="smsNumber" placeholder="+33612345678" maxLength={16} disabled={!notifySms} />
            </div>
          </fieldset>
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
