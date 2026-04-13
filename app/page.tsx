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

const problems = [
  {
    title: "Too much time searching",
    description: "You jump between platforms for hours just to find a few real leads.",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.2 4.2" />
      </svg>
    ),
  },
  {
    title: "Missed opportunities",
    description: "The best missions are gone before you even see them.",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 4v8l5 3" />
        <circle cx="12" cy="12" r="8.5" />
      </svg>
    ),
  },
  {
    title: "Too slow to act",
    description: "Manual applications drain your energy and kill your momentum.",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 3v7l3.5 3.5" />
        <path d="M5.5 8.5A8.5 8.5 0 1 1 4 13" />
      </svg>
    ),
  },
] as const;

const steps = [
  {
    title: "Scan the web",
    description: "We collect freelance missions from multiple sources.",
  },
  {
    title: "Find the best matches",
    description: "IT-SNIPER ranks opportunities based on your profile.",
  },
  {
    title: "Generate your pitch",
    description: "Get a ready-to-send personalized message.",
  },
  {
    title: "Act fast",
    description: "Apply before everyone else.",
  },
] as const;

const features = [
  {
    title: "Find better missions faster",
    description: "Stop wasting hours across job boards and focus only on high-fit opportunities.",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.2 4.2" />
      </svg>
    ),
  },
  {
    title: "Be first on the best opportunities",
    description: "Reach new missions early so you can apply before the inbox gets crowded.",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 4v8l5 3" />
        <circle cx="12" cy="12" r="8.5" />
      </svg>
    ),
  },
  {
    title: "Save hours every single week",
    description: "Cut repetitive searching and outreach tasks so you can spend more time billing clients.",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 3v7l3.5 3.5" />
        <path d="M5.5 8.5A8.5 8.5 0 1 1 4 13" />
      </svg>
    ),
  },
  {
    title: "Win more missions with stronger pitches",
    description: "Send tailored applications faster to stand out and improve your chances of getting hired.",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 12.5 9 17l11-11" />
      </svg>
    ),
  },
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
    <main className="landing-bg relative min-h-screen overflow-x-hidden" style={{ background: "#070B14", color: "#f8fbff" }}>
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
          padding: "6.5rem 1rem 5rem",
          display: "grid",
          gap: "5rem",
        }}
      >
        <section style={{ display: "grid", gap: "1.4rem", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 320px),1fr))", alignItems: "center" }}>
          <div style={{ display: "grid", gap: "0.95rem" }}>
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
              Freelance mission radar
            </span>
            <h1 style={{ margin: 0, maxWidth: 760, fontSize: "clamp(2.1rem,5.8vw,4.15rem)", lineHeight: 1.02, letterSpacing: "-0.03em" }}>
              Stop searching. Get freelance missions sent to you.
            </h1>
            <p style={{ margin: 0, maxWidth: 680, color: "#cbd5e1", fontSize: "clamp(1rem,2vw,1.12rem)", lineHeight: 1.55 }}>
              We scan new offers, rank your best matches, and draft your pitch so you can apply before everyone else.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.72rem", marginTop: "0.5rem" }}>
              <Link
                href={ctaHref}
                className="btn btn-primary"
                style={{
                  padding: "0.95rem 1.5rem",
                  borderRadius: 13,
                  fontSize: "1.03rem",
                  fontWeight: 700,
                  boxShadow: "0 14px 34px rgba(59,130,246,.35)",
                }}
              >
                Start free
              </Link>
              <a href="#how-it-works" className="btn" style={{ padding: "0.8rem 1.25rem", borderRadius: 12 }}>
                See how it works
              </a>
            </div>
            <p style={{ margin: "0.2rem 0 0", color: "#99f6e4", fontSize: "0.9rem", fontWeight: 560 }}>
              New missions detected daily — don&apos;t miss your next opportunity.
            </p>
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

          <div style={{ display: "grid", gap: "0.8rem" }}>
            <aside
              style={{
                borderRadius: 16,
                border: "1px solid rgba(45,212,191,.44)",
                background:
                  "linear-gradient(130deg, rgba(20,184,166,.26), rgba(37,99,235,.32) 54%, rgba(2,6,23,.9) 95%)",
                padding: "0.85rem 0.92rem",
                boxShadow: "0 14px 36px rgba(20,184,166,.18), inset 0 0 0 1px rgba(147,197,253,.12)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.56rem", marginBottom: "0.44rem" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "1.9rem",
                    height: "1.9rem",
                    borderRadius: "50%",
                    background: "rgba(34,197,94,.24)",
                    color: "#86efac",
                    boxShadow: "0 0 22px rgba(34,197,94,.4)",
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                    <path d="M20.5 3.5A11 11 0 0 0 3.67 17.1L2 22l5.02-1.6A11 11 0 1 0 20.5 3.5Zm-8.49 18a9.2 9.2 0 0 1-4.7-1.28l-.33-.2-2.98.95.96-2.9-.22-.34a9.2 9.2 0 1 1 7.27 3.77Zm5.05-6.89c-.28-.14-1.68-.83-1.94-.93-.26-.1-.45-.14-.65.14-.2.28-.74.93-.91 1.12-.17.2-.33.22-.61.08-.28-.14-1.17-.43-2.24-1.37-.83-.73-1.4-1.63-1.56-1.9-.17-.28-.02-.43.12-.57.12-.12.28-.33.41-.49.14-.16.18-.28.28-.47.1-.2.05-.37-.02-.51-.08-.14-.65-1.57-.89-2.15-.23-.56-.47-.49-.65-.5h-.56c-.2 0-.51.07-.78.37-.26.3-1 1-1 2.45 0 1.45 1.05 2.84 1.2 3.04.14.2 2.06 3.14 5 4.4.7.3 1.25.47 1.68.6.7.22 1.35.19 1.86.12.57-.08 1.68-.68 1.92-1.34.24-.67.24-1.23.17-1.34-.06-.12-.24-.19-.51-.33Z" />
                  </svg>
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "1.9rem",
                    height: "1.9rem",
                    borderRadius: "50%",
                    background: "rgba(96,165,250,.26)",
                    color: "#bfdbfe",
                    boxShadow: "0 0 22px rgba(96,165,250,.36)",
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                    <path d="M2 6.6A2.6 2.6 0 0 1 4.6 4h14.8A2.6 2.6 0 0 1 22 6.6v10.8A2.6 2.6 0 0 1 19.4 20H4.6A2.6 2.6 0 0 1 2 17.4V6.6Zm2.6-.8a.8.8 0 0 0-.54.21L12 12.8 19.94 6a.8.8 0 0 0-.54-.21H4.6Zm15.6 2.08-6.98 5.98a1.8 1.8 0 0 1-2.36 0L3.8 7.88v9.52c0 .44.36.8.8.8h14.8a.8.8 0 0 0 .8-.8V7.88Z" />
                  </svg>
                </span>
                <span className="badge" style={{ borderColor: "rgba(45,212,191,.6)", background: "rgba(45,212,191,.18)", color: "#99f6e4" }}>
                  Instant alerts
                </span>
              </div>
              <p style={{ margin: 0, color: "#ecfeff", fontSize: "0.95rem", fontWeight: 620, lineHeight: 1.45 }}>
                Be the first to receive alerts on new business opportunities in your chosen area.
              </p>
            </aside>

            <div style={{ borderRadius: 22, border: "1px solid #1e293b", background: "rgba(2,6,23,.86)", padding: "1rem", boxShadow: "0 30px 80px rgba(2,6,23,.6)" }}>
              <div style={{ borderRadius: 16, border: "1px solid #1e293b", background: "#0f172a", padding: "0.95rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.7rem", alignItems: "center", marginBottom: "0.8rem" }}>
                  <p style={{ margin: 0, fontWeight: 650, fontSize: "0.92rem", color: "#e2e8f0" }}>Live mission radar</p>
                  <span className="badge badge-success" style={{ borderRadius: 999 }}>3 new now</span>
                </div>
                <div style={{ display: "grid", gap: "0.65rem" }}>
                  {[
                    {
                      role: "Senior DevOps Lead",
                      score: "95%",
                      rate: "€780/day",
                      badge: "Apply in 2h",
                      company: "Scale-up · Paris · Remote 3d/w",
                    },
                    {
                      role: "Cloud Architect - FinTech",
                      score: "91%",
                      rate: "€850/day",
                      badge: "Posted 45 min ago",
                      company: "FinTech group · Brussels · Hybrid",
                    },
                    {
                      role: "Kubernetes Platform Engineer",
                      score: "88%",
                      rate: "€730/day",
                      badge: "2 similar wins",
                      company: "Consulting firm · Lyon · Remote",
                    },
                  ].map((mission) => (
                    <article key={mission.role} style={{ border: "1px solid #1e293b", borderRadius: 12, background: "rgba(2,6,23,0.8)", padding: "0.78rem" }}>
                      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: "0.6rem" }}>
                        <h3 style={{ margin: 0, fontSize: "0.95rem" }}>{mission.role}</h3>
                        <span className="badge badge-info">Score {mission.score}</span>
                      </div>
                      <p style={{ margin: "0.45rem 0 0", color: "#94a3b8", fontSize: "0.85rem" }}>
                        {mission.rate} · {mission.company}
                      </p>
                      <p style={{ margin: "0.42rem 0 0", color: "#fcd34d", fontSize: "0.8rem", fontWeight: 570 }}>
                        {mission.badge}
                      </p>
                      <p style={{ margin: "0.48rem 0 0", color: "#cbd5e1", fontSize: "0.83rem" }}>
                        Pitch draft ready: “I&apos;ve shipped this stack in production and can start quickly.”
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" style={{ display: "grid", gap: "1rem" }}>
          <div style={{ textAlign: "center", display: "grid", gap: "0.45rem" }}>
            <p style={{ margin: 0, color: "#bfdbfe", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.11em", fontWeight: 650 }}>The problem</p>
            <h2 style={{ margin: 0, fontSize: "clamp(1.5rem,3.8vw,2.5rem)", letterSpacing: "-0.02em" }}>You&apos;re losing freelance opportunities every day</h2>
          </div>
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 240px),1fr))" }}>
            {problems.map((problem) => (
              <article key={problem.title} style={{ borderRadius: 14, border: "1px solid #1e293b", background: "rgba(15,23,42,.62)", padding: "1rem", display: "grid", gap: "0.6rem" }}>
                <span
                  style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(96,165,250,.35)",
                    color: "#bfdbfe",
                    background: "rgba(59,130,246,.12)",
                  }}
                >
                  {problem.icon}
                </span>
                <p style={{ margin: 0, color: "#f8fafc", fontWeight: 620, fontSize: "1.04rem" }}>{problem.title}</p>
                <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.45, fontSize: "0.94rem" }}>{problem.description}</p>
              </article>
            ))}
          </div>
          <p style={{ margin: "0.2rem 0 0", textAlign: "center", color: "#99f6e4", fontWeight: 560, fontSize: "1rem" }}>There is a better way.</p>
        </section>

        <section id="how-it-works" style={{ display: "grid", gap: "1rem" }}>
          <div style={{ textAlign: "center", display: "grid", gap: "0.45rem" }}>
            <p style={{ margin: 0, color: "#bfdbfe", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.11em", fontWeight: 650 }}>How IT-SNIPER works</p>
            <h2 style={{ margin: 0, fontSize: "clamp(1.5rem,3.8vw,2.5rem)", letterSpacing: "-0.02em" }}>From discovery to application in seconds</h2>
          </div>
          <div style={{ display: "grid", gap: "0.8rem", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 235px),1fr))" }}>
            {steps.map((step, index) => (
              <article key={step.title} style={{ borderRadius: 14, border: "1px solid #1e293b", background: "rgba(15,23,42,.62)", padding: "1rem", display: "grid", gap: "0.55rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                  <span className="badge" style={{ borderColor: "rgba(96,165,250,0.35)", background: "rgba(59,130,246,0.1)", color: "#bfdbfe" }}>
                    {index + 1}
                  </span>
                  {index < steps.length - 1 ? (
                    <span style={{ color: "#60a5fa", fontSize: "1rem", fontWeight: 700 }} aria-hidden="true">
                      →
                    </span>
                  ) : null}
                </div>
                <p style={{ margin: 0, fontSize: "1.02rem", color: "#f1f5f9", fontWeight: 600 }}>{step.title}</p>
                <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.93rem", lineHeight: 1.4 }}>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={{ display: "grid", gap: "1rem" }}>
          <div style={{ textAlign: "center", display: "grid", gap: "0.45rem" }}>
            <p style={{ margin: 0, color: "#bfdbfe", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.11em", fontWeight: 650 }}>Why freelancers use IT-SNIPER</p>
            <h2 style={{ margin: 0, fontSize: "clamp(1.5rem,3.8vw,2.5rem)", letterSpacing: "-0.02em" }}>Get more missions with less effort</h2>
          </div>
          <div style={{ display: "grid", gap: "0.85rem", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 250px),1fr))" }}>
            {features.map((feature) => (
              <article key={feature.title} style={{ borderRadius: 14, border: "1px solid rgba(148,163,184,0.28)", background: "linear-gradient(160deg, rgba(15,23,42,.72), rgba(15,23,42,.56))", padding: "1rem", display: "grid", gap: "0.6rem" }}>
                <span
                  style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(96,165,250,.4)",
                    color: "#bfdbfe",
                    background: "rgba(59,130,246,.12)",
                  }}
                >
                  {feature.icon}
                </span>
                <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#f8fafc" }}>{feature.title}</h3>
                <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.93rem", lineHeight: 1.45 }}>{feature.description}</p>
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
