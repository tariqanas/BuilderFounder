import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { getAccessToken } from "@/lib/server-auth";

async function resolveStartCtaHref() {
  const token = getAccessToken();
  if (!token) return "/login";

  const service = createSupabaseServiceClient();
  const { data, error } = await service.auth.getUser(token);
  return !error && data.user ? "/billing" : "/login";
}

export default async function LandingPage() {
  const ctaHref = await resolveStartCtaHref();

  return (
    <main className="container" style={{ display: "grid", gap: 18, paddingTop: "4rem", paddingBottom: "4rem" }}>
      <section className="card" style={{ padding: "2.4rem", display: "grid", gap: 12 }}>
        <span className="badge" style={{ width: "fit-content" }}>
          PRIVATE BETA
        </span>
        <h1 style={{ margin: 0, fontSize: "2.4rem" }}>IT Sniper — Your DevOps Mission Radar</h1>
        <p className="muted" style={{ margin: 0, maxWidth: 700 }}>
          Top 3 qualified missions per week, scored and ready-to-apply.
        </p>
        <div style={{ marginTop: 8 }}>
          <Link href={ctaHref} className="btn btn-primary">
            Start Beta
          </Link>
        </div>
      </section>

      <section className="card" style={{ padding: "1.5rem", display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Beta Access — €49/month</h2>
        <ul className="muted" style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: 6 }}>
          <li>Top 3 missions/week</li>
          <li>Qualification scoring</li>
          <li>Pitch ready for outreach</li>
          <li>Email, WhatsApp, SMS signals</li>
          <li>Cancel anytime</li>
        </ul>
      </section>

      <section className="card" style={{ padding: "1.5rem", display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>How it works</h2>
        <ol className="muted" style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: 6 }}>
          <li>Upload CV + criteria</li>
          <li>Radar scans sources</li>
          <li>You get only the best matches + pitch</li>
        </ol>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
        <article className="card" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>For who</h3>
          <p className="muted" style={{ marginBottom: 0 }}>
            DevOps, Cloud and Platform freelancers who want fewer but stronger signals.
          </p>
        </article>
        <article className="card" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>Not for who</h3>
          <p className="muted" style={{ marginBottom: 0 }}>
            Candidates looking for high-volume job boards or guaranteed outcomes.
          </p>
        </article>
      </section>

      <section className="card" style={{ padding: "1.5rem", display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>FAQ</h2>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <strong>Do you guarantee jobs?</strong>
            <p className="muted" style={{ margin: "0.35rem 0 0" }}>
              No. IT Sniper is a decision tool that helps you act faster on strong matches.
            </p>
          </div>
          <div>
            <strong>Do you scrape LinkedIn?</strong>
            <p className="muted" style={{ margin: "0.35rem 0 0" }}>
              No. LinkedIn is not scraped.
            </p>
          </div>
          <div>
            <strong>How often will I receive alerts?</strong>
            <p className="muted" style={{ margin: "0.35rem 0 0" }}>
              Up to the top 3 qualified missions per week.
            </p>
          </div>
          <div>
            <strong>Can I cancel anytime?</strong>
            <p className="muted" style={{ margin: "0.35rem 0 0" }}>
              Yes, directly from the billing portal.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
