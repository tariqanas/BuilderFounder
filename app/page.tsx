import Link from "next/link";
import { LandingNavbar } from "@/components/landing-navbar";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { getAccessToken } from "@/lib/server-auth";

async function resolveStartCtaHref() {
  const token = getAccessToken();
  if (!token) return "/login";

  const service = createSupabaseServiceClient();
  const { data, error } = await service.auth.getUser(token);
  return !error && data.user ? "/billing" : "/login";
}

const problems = ["You waste hours searching for missions", "You miss high-quality opportunities", "You apply too late"];

const steps = [
  "We scan job sources",
  "We score the best opportunities with AI",
  "We generate your pitch instantly",
  "You get notified and act fast",
];

const features = [
  ["AI-powered matching", "Only relevant missions hit your radar."],
  ["Automatic pitch generation", "Get a ready-to-send message in seconds."],
  ["Daily mission alerts", "Receive fresh opportunities before others."],
  ["No manual searching", "Stop scrolling. Focus on closing clients."],
] as const;

const pricingPlans = [
  {
    name: "Free",
    price: "0€",
    subtitle: "Forever",
    features: ["Unlimited profile setup", "Basic mission discovery", "Email support"],
    border: "1px solid rgba(148,163,184,0.45)",
    background: "linear-gradient(160deg, rgba(30,41,59,.9), rgba(15,23,42,.72))",
    popular: false,
  },
  {
    name: "Pro",
    price: "39€",
    subtitle: "3 missions per week",
    features: ["AI-ranked opportunities", "Weekly shortlist delivery", "Pitch templates included"],
    border: "1px solid rgba(96,165,250,0.52)",
    background: "linear-gradient(160deg, rgba(30,58,138,.85), rgba(15,23,42,.72))",
    popular: false,
  },
  {
    name: "Realtime",
    price: "49€",
    subtitle: "Realtime",
    features: ["Instant mission alerts", "Priority scoring and matching", "Fast-track support"],
    border: "1px solid rgba(250,204,21,0.75)",
    background: "linear-gradient(155deg, rgba(161,98,7,.35), rgba(30,64,175,.82))",
    popular: true,
  },
] as const;

export default async function LandingPage() {
  const ctaHref = await resolveStartCtaHref();

  return (
    <main
      className="landing-bg"
      style={{
        position: "relative",
        overflowX: "hidden",
        background: "#070B14",
        color: "#f8fbff",
      }}
    >
      <div aria-hidden="true" className="landing-bg-grid" />
      <div aria-hidden="true" className="landing-bg-nodes" />
      <div aria-hidden="true" className="landing-bg-pulse" />
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 8%, rgba(59,130,246,.22), transparent 37%), radial-gradient(circle at 78% 2%, rgba(37,99,235,.18), transparent 40%)",
        }}
      />

      <LandingNavbar ctaHref={ctaHref} />

      <div
        style={{
          position: "relative",
          maxWidth: 1180,
          margin: "0 auto",
          padding: "2rem 1rem 5rem",
          display: "grid",
          gap: "5rem",
        }}
      >
        <section style={{ display: "grid", gap: "1.4rem", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 310px),1fr))", alignItems: "center" }}>
          <div style={{ display: "grid", gap: "1.05rem" }}>
            <span
              style={{
                display: "inline-flex",
                width: "fit-content",
                borderRadius: 999,
                border: "1px solid rgba(96,165,250,.4)",
                background: "rgba(59,130,246,.12)",
                color: "#bfdbfe",
                padding: "0.32rem 0.78rem",
                fontSize: "0.73rem",
                fontWeight: 650,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              AI radar for freelance consultants
            </span>
            <h1 style={{ margin: 0, maxWidth: 760, fontSize: "clamp(2.1rem,5.8vw,4.15rem)", lineHeight: 1.02, letterSpacing: "-0.03em" }}>
              Find freelance missions automatically with AI
            </h1>
            <p style={{ margin: 0, maxWidth: 680, color: "#cbd5e1", fontSize: "clamp(1rem,2vw,1.16rem)", lineHeight: 1.6 }}>
              IT-SNIPER scans the internet, scores opportunities, and generates your pitch — so you never miss high-value missions.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.72rem", marginTop: "0.35rem" }}>
              <Link href={ctaHref} className="btn btn-primary" style={{ padding: "0.8rem 1.25rem", borderRadius: 12 }}>
                Start free
              </Link>
              <a href="#how-it-works" className="btn" style={{ padding: "0.8rem 1.25rem", borderRadius: 12 }}>
                See how it works
              </a>
            </div>
            <div style={{ marginTop: "0.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 150px),1fr))", gap: "0.62rem", maxWidth: 620 }}>
              {[
                ["24/7", "mission scanning"],
                ["Top-fit", "AI ranking first"],
                ["1-click", "pitch generation"],
              ].map(([title, caption]) => (
                <div key={title} style={{ borderRadius: 12, border: "1px solid #1e293b", background: "rgba(15,23,42,.6)", padding: "0.78rem" }}>
                  <p style={{ margin: 0, fontSize: "1.48rem", fontWeight: 700 }}>{title}</p>
                  <p style={{ margin: "0.16rem 0 0", color: "#94a3b8", fontSize: "0.88rem" }}>{caption}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderRadius: 22, border: "1px solid #1e293b", background: "rgba(2,6,23,.86)", padding: "1rem", boxShadow: "0 30px 80px rgba(2,6,23,.6)" }}>
            <div style={{ borderRadius: 16, border: "1px solid #1e293b", background: "#0f172a", padding: "0.95rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.7rem", alignItems: "center", marginBottom: "0.8rem" }}>
                <p style={{ margin: 0, fontWeight: 650, fontSize: "0.92rem", color: "#e2e8f0" }}>Live mission radar</p>
                <span className="badge badge-success" style={{ borderRadius: 999 }}>3 new now</span>
              </div>
              <div style={{ display: "grid", gap: "0.65rem" }}>
                {[
                  { role: "Senior DevOps Lead", score: "95%", rate: "€780/day", badge: "High urgency" },
                  { role: "Cloud Architect - FinTech", score: "91%", rate: "€850/day", badge: "Fresh mission" },
                  { role: "Kubernetes Platform Engineer", score: "88%", rate: "€730/day", badge: "Great fit" },
                ].map((mission) => (
                  <article key={mission.role} style={{ border: "1px solid #1e293b", borderRadius: 12, background: "rgba(2,6,23,0.8)", padding: "0.78rem" }}>
                    <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: "0.6rem" }}>
                      <h3 style={{ margin: 0, fontSize: "0.95rem" }}>{mission.role}</h3>
                      <span className="badge badge-info">Score {mission.score}</span>
                    </div>
                    <p style={{ margin: "0.45rem 0 0", color: "#94a3b8", fontSize: "0.85rem" }}>
                      {mission.rate} · {mission.badge}
                    </p>
                    <p style={{ margin: "0.48rem 0 0", color: "#cbd5e1", fontSize: "0.83rem" }}>
                      AI pitch ready: “I delivered this stack in production and can onboard fast.”
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" style={{ display: "grid", gap: "1rem" }}>
          <div style={{ textAlign: "center", display: "grid", gap: "0.45rem" }}>
            <p style={{ margin: 0, color: "#bfdbfe", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.11em", fontWeight: 650 }}>The problem</p>
            <h2 style={{ margin: 0, fontSize: "clamp(1.5rem,3.8vw,2.5rem)", letterSpacing: "-0.02em" }}>Searching is killing your momentum</h2>
          </div>
          <div style={{ display: "grid", gap: "0.8rem", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 230px),1fr))" }}>
            {problems.map((problem) => (
              <article key={problem} style={{ borderRadius: 14, border: "1px solid #1e293b", background: "rgba(15,23,42,.62)", padding: "1rem" }}>
                <p style={{ margin: 0, color: "#f1f5f9", fontWeight: 530, fontSize: "1.04rem" }}>{problem}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" style={{ display: "grid", gap: "1rem" }}>
          <div style={{ textAlign: "center", display: "grid", gap: "0.45rem" }}>
            <p style={{ margin: 0, color: "#bfdbfe", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.11em", fontWeight: 650 }}>How it works</p>
            <h2 style={{ margin: 0, fontSize: "clamp(1.5rem,3.8vw,2.5rem)", letterSpacing: "-0.02em" }}>From search chaos to daily inbound missions</h2>
          </div>
          <div style={{ display: "grid", gap: "0.8rem", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 210px),1fr))" }}>
            {steps.map((step, index) => (
              <article key={step} style={{ borderRadius: 14, border: "1px solid #1e293b", background: "rgba(15,23,42,.62)", padding: "1rem" }}>
                <span className="badge" style={{ borderColor: "rgba(96,165,250,0.35)", background: "rgba(59,130,246,0.1)", color: "#bfdbfe" }}>
                  Step {index + 1}
                </span>
                <p style={{ margin: "0.72rem 0 0", fontSize: "1.03rem", color: "#f1f5f9", fontWeight: 530 }}>{step}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={{ display: "grid", gap: "1rem" }}>
          <div style={{ textAlign: "center", display: "grid", gap: "0.45rem" }}>
            <p style={{ margin: 0, color: "#bfdbfe", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.11em", fontWeight: 650 }}>Value</p>
            <h2 style={{ margin: 0, fontSize: "clamp(1.5rem,3.8vw,2.5rem)", letterSpacing: "-0.02em" }}>Everything you need to win faster</h2>
          </div>
          <div style={{ display: "grid", gap: "0.8rem", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 220px),1fr))" }}>
            {features.map(([title, description]) => (
              <article key={title} style={{ borderRadius: 14, border: "1px solid #1e293b", background: "rgba(15,23,42,.62)", padding: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.18rem" }}>{title}</h3>
                <p style={{ margin: "0.4rem 0 0", color: "#cbd5e1", lineHeight: 1.55 }}>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" style={{ display: "grid", gap: "1rem" }}>
          <div style={{ textAlign: "center", display: "grid", gap: "0.45rem" }}>
            <p style={{ margin: 0, color: "#bfdbfe", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.11em", fontWeight: 650 }}>Pricing</p>
            <h2 style={{ margin: 0, fontSize: "clamp(1.5rem,3.8vw,2.5rem)", letterSpacing: "-0.02em" }}>Choose the plan that matches your pace</h2>
          </div>
          <div style={{ display: "grid", gap: "0.8rem", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 220px),1fr))" }}>
            {pricingPlans.map((plan) => (
              <article
                key={plan.name}
                style={{
                  borderRadius: 16,
                  border: plan.border,
                  background: plan.background,
                  padding: "1rem",
                  boxShadow: plan.popular ? "0 18px 52px rgba(250,204,21,.24)" : "0 14px 34px rgba(2,6,23,.45)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "0.7rem" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.2rem" }}>{plan.name}</h3>
                    <p style={{ margin: "0.4rem 0 0", color: "#cbd5e1", fontSize: "0.92rem" }}>{plan.subtitle}</p>
                  </div>
                  {plan.popular ? (
                    <span className="badge" style={{ borderColor: "rgba(250,204,21,.7)", background: "rgba(250,204,21,.2)", color: "#fde68a" }}>
                      Most popular
                    </span>
                  ) : null}
                </div>
                <p style={{ margin: "0.8rem 0 0", fontSize: "2rem", fontWeight: 700 }}>{plan.price}</p>
                <ul style={{ margin: "0.75rem 0 0", paddingLeft: "1.1rem", color: "#e2e8f0", display: "grid", gap: "0.42rem" }}>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section style={{ borderRadius: 18, border: "1px solid #1e293b", background: "rgba(15,23,42,.72)", padding: "1.2rem" }}>
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 260px),1fr))" }}>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <p style={{ margin: 0, color: "#bfdbfe", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.11em", fontWeight: 650 }}>Social proof</p>
              <h2 style={{ margin: 0, fontSize: "clamp(1.45rem,3vw,2.3rem)", letterSpacing: "-0.02em" }}>Used by freelancers across Europe</h2>
            </div>
            <div style={{ display: "grid", gap: "0.6rem" }}>
              <article style={{ border: "1px solid #1e293b", borderRadius: 12, background: "rgba(2,6,23,0.75)", padding: "0.8rem" }}>
                <p style={{ margin: 0, fontSize: "1.02rem", color: "#f8fafc" }}>Find missions faster than ever.</p>
              </article>
              <article style={{ border: "1px solid #1e293b", borderRadius: 12, background: "rgba(2,6,23,0.75)", padding: "0.8rem" }}>
                <p style={{ margin: 0, fontSize: "1.02rem", color: "#f8fafc" }}>Less searching. More client conversations.</p>
              </article>
            </div>
          </div>
        </section>

        <section
          style={{
            borderRadius: 18,
            border: "1px solid rgba(59,130,246,.34)",
            background: "linear-gradient(135deg, rgba(30,58,138,.46), rgba(2,6,23,.95))",
            padding: "2rem 1.2rem",
            textAlign: "center",
            display: "grid",
            gap: "0.9rem",
            justifyItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "clamp(1.65rem,4.4vw,3.2rem)", lineHeight: 1.1, maxWidth: 760, letterSpacing: "-0.03em" }}>
            Stop searching. Start receiving opportunities.
          </h2>
          <p style={{ margin: 0, maxWidth: 690, fontSize: "clamp(0.98rem,2vw,1.15rem)", color: "#dbeafe", lineHeight: 1.6 }}>
            This is not a job board. This is your AI mission radar. Start now and be first on the best freelance deals.
          </p>
          <Link href={ctaHref} className="btn btn-primary" style={{ padding: "0.84rem 1.35rem", borderRadius: 12 }}>
            Start free
          </Link>
        </section>

        <footer style={{ paddingTop: "0.35rem", borderTop: "1px solid #1e293b", color: "#94a3b8", display: "flex", justifyContent: "space-between", gap: "0.8rem", flexWrap: "wrap" }}>
          <span>© {new Date().getFullYear()} IT-SNIPER</span>
          <span>Stop searching. Let opportunities come to you.</span>
        </footer>
      </div>
    </main>
  );
}
