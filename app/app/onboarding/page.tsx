export default function OnboardingPage() {
  return (
    <main className="card" style={{ maxWidth: 760 }}>
      <h1>Onboarding</h1>
      <p style={{ color: "#b8b8cc" }}>Uploadez votre CV, vos critères et vos canaux de notification.</p>

      <form action="/api/onboarding" method="post" encType="multipart/form-data" style={{ display: "grid", gap: 12 }}>
        <div>
          <label htmlFor="cv">CV PDF</label>
          <input id="cv" name="cv" type="file" accept="application/pdf" required />
        </div>
        <div>
          <label htmlFor="primaryStack">Stack principale</label>
          <input id="primaryStack" name="primaryStack" maxLength={120} required />
        </div>
        <div>
          <label htmlFor="secondaryStack">Stack secondaire</label>
          <input id="secondaryStack" name="secondaryStack" maxLength={120} />
        </div>
        <div>
          <label htmlFor="minDayRate">TJM minimum (€)</label>
          <input id="minDayRate" name="minDayRate" type="number" min={0} max={10000} required />
        </div>
        <div>
          <label htmlFor="remotePreference">Préférence remote</label>
          <select id="remotePreference" name="remotePreference" required>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybride</option>
            <option value="onsite">On-site</option>
          </select>
        </div>
        <div>
          <label htmlFor="countries">Pays ciblés (séparés par des virgules)</label>
          <input id="countries" name="countries" maxLength={300} required />
        </div>

        <fieldset style={{ border: "1px solid #2b2d3c", borderRadius: 8, padding: 12 }}>
          <legend>Notifications</legend>

          <div>
            <label htmlFor="notifyEmail" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input id="notifyEmail" name="notifyEmail" type="checkbox" defaultChecked />
              Email (obligatoire recommandé)
            </label>
          </div>

          <div>
            <label htmlFor="notifyWhatsapp" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input id="notifyWhatsapp" name="notifyWhatsapp" type="checkbox" />
              WhatsApp
            </label>
            <input id="whatsappNumber" name="whatsappNumber" placeholder="+33612345678" maxLength={16} />
          </div>

          <div>
            <label htmlFor="notifySms" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input id="notifySms" name="notifySms" type="checkbox" />
              SMS
            </label>
            <input id="smsNumber" name="smsNumber" placeholder="+33612345678" maxLength={16} />
          </div>
        </fieldset>

        <button type="submit" className="btn btn-primary">
          Enregistrer
        </button>
      </form>
    </main>
  );
}
