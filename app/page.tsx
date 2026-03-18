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

function ItSniperLogo({ compact = false }: { compact?: boolean }) {
  const size = compact ? 30 : 38;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="IT-Sniper logo"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="radar" x1="10" y1="8" x2="56" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7CF7FF" />
          <stop offset="0.45" stopColor="#5D85FF" />
          <stop offset="1" stopColor="#A46BFF" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="27" stroke="url(#radar)" strokeWidth="2.5" opacity="0.92" />
      <circle cx="32" cy="32" r="18" stroke="url(#radar)" strokeWidth="2.5" opacity="0.65" />
      <circle cx="32" cy="32" r="9" stroke="url(#radar)" strokeWidth="2.5" opacity="0.46" />
      <path d="M32 5v11M59 32H48M32 59V48M5 32h11" stroke="url(#radar)" strokeLinecap="round" strokeWidth="2.5" opacity="0.8" />
      <path d="M32 32L50.5 14.5" stroke="url(#radar)" strokeLinecap="round" strokeWidth="3.2" />
      <circle cx="50.5" cy="14.5" r="4" fill="#7CF7FF" />
      <circle cx="50.5" cy="14.5" r="8" stroke="#7CF7FF" strokeOpacity="0.45" strokeWidth="1.6" />
    </svg>
  );
}

const painPoints = [
  "You waste hours scrolling job boards hoping to find one mission worth pitching.",
  "Great opportunities disappear before you can react.",
  "Cold outreach feels generic, slow, and low-conversion.",
  "Most listings are irrelevant to your real stack and seniority.",
];

const solutionFlow = [
  {
    title: "Upload your CV",
    description: "Drop your profile once. IT-Sniper captures stack depth, mission history, and positioning instantly.",
  },
  {
    title: "AI understands your profile",
    description: "Your technical strengths, target rates, and domain fit become a precise matching fingerprint.",
  },
  {
    title: "Missions are matched + scored",
    description: "Every opportunity is ranked with a confidence score, urgency signal, and fit reasons.",
  },
  {
    title: "Pitch generated in seconds",
    description: "Receive a ready-to-send message tuned to role context, value props, and constraints.",
  },
  {
    title: "Instant notifications",
    description: "Get alerted the moment a high-signal mission appears so you can act first.",
  },
];

const valuePoints = [
  "No manual search loops",
  "Higher-quality mission matching",
  "Faster reaction time on fresh leads",
  "Transparent score + reasons before you apply",
  "AI pitch generation that saves serious hours",
];

export default async function LandingPage() {
  const ctaHref = await resolveStartCtaHref();

  return (
    <main
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "1.2rem 1rem 5rem",
        display: "grid",
        gap: "5.5rem",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 14,
          zIndex: 20,
          border: "1px solid rgba(115,130,190,0.28)",
          borderRadius: 16,
          backdropFilter: "blur(14px)",
          background: "rgba(9,11,18,0.78)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.33)",
          padding: "0.8rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.8rem",
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.7rem" }}>
          <ItSniperLogo compact />
          <span style={{ fontWeight: 700, letterSpacing: "0.01em" }}>IT-Sniper</span>
        </div>
        <Link href={ctaHref} className="btn btn-primary">
          Get Started
        </Link>
      </header>

      <section
        style={{
          display: "grid",
          gap: "1.8rem",
          alignItems: "start",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        }}
      >
        <div style={{ display: "grid", gap: "1.1rem" }}>
          <div className="badge" style={{ width: "fit-content", borderColor: "#3159c7", color: "#b9ccff" }}>
            AI FREELANCE MISSION RADAR
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.9rem" }}>
            <ItSniperLogo />
            <h1 style={{ margin: 0, fontSize: "clamp(2rem,5vw,3.8rem)", lineHeight: 1.04, letterSpacing: "-0.03em" }}>
              Stop searching for freelance missions.
            </h1>
          </div>
          <p className="muted" style={{ margin: 0, maxWidth: 640, fontSize: "1.07rem" }}>
            IT-Sniper scans the market, scores the best opportunities, and gets you ready to apply in minutes.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
            <Link href={ctaHref} className="btn btn-primary" style={{ padding: "0.76rem 1.2rem" }}>
              Get my first missions
            </Link>
            <a href="#how-it-works" className="btn" style={{ padding: "0.76rem 1.2rem" }}>
              See how it works
            </a>
          </div>
        </div>

        <div style={{ display: "grid", gap: "1rem" }}>
          <article
            className="card"
            style={{
              padding: "1.1rem",
              borderColor: "#2d3659",
              boxShadow: "0 30px 70px rgba(7,10,18,0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
              <strong style={{ fontSize: "0.95rem" }}>Pipeline Overview</strong>
              <span className="badge badge-success">+14 new missions</span>
            </div>
            <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
              {["Senior Platform Engineer", "Cloud Architect — FinOps", "Lead DevOps (Kubernetes)"]
                .map((role, index) => (
                  <div
                    key={role}
                    style={{
                      padding: "0.8rem",
                      borderRadius: 12,
                      background: "rgba(9,13,24,0.95)",
                      border: "1px solid #253053",
                      display: "grid",
                      gap: "0.4rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 600 }}>{role}</span>
                      <span className="badge badge-info">Score {92 - index * 5}%</span>
                    </div>
                    <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
                      Fit: AWS, Terraform, microservices migration, rate-compatible.
                    </p>
                  </div>
                ))}
            </div>
          </article>

          <article
            className="card"
            style={{
              padding: "1rem",
              width: "min(310px, 100%)",
              justifySelf: "end",
              borderColor: "#49557e",
              background: "linear-gradient(180deg,#171d35 0%, #0d1224 100%)",
            }}
          >
            <p style={{ margin: 0, color: "#9fb1ea", fontSize: "0.86rem", letterSpacing: "0.08em" }}>IT-SNIPER</p>
            <p style={{ margin: "0.7rem 0 0", fontSize: "0.92rem", color: "#d5ddf7" }}>New mission detected</p>
            <h3 style={{ margin: "0.3rem 0 0", fontSize: "1.1rem" }}>Senior Java AWS Engineer</h3>
            <div style={{ marginTop: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="badge badge-success">Score 87%</span>
              <span className="badge">Open now</span>
            </div>
          </article>
        </div>
      </section>

      <section style={{ display: "grid", gap: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: "clamp(1.5rem,3vw,2rem)" }}>Freelance search is broken for senior engineers.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "0.9rem" }}>
          {painPoints.map((item) => (
            <article key={item} className="card" style={{ padding: "1.1rem", borderColor: "#2d2f43" }}>
              <p style={{ margin: 0, lineHeight: 1.55, color: "#d7dcef" }}>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" style={{ display: "grid", gap: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: "clamp(1.5rem,3vw,2rem)" }}>A precise flow from profile to mission in minutes.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: "0.85rem" }}>
          {solutionFlow.map((item, index) => (
            <article key={item.title} className="card" style={{ padding: "1.1rem", borderColor: "#263659" }}>
              <span className="badge" style={{ borderColor: "#344872", color: "#bfd0ff" }}>
                Step {index + 1}
              </span>
              <h3 style={{ margin: "0.75rem 0 0.4rem" }}>{item.title}</h3>
              <p className="muted" style={{ margin: 0 }}>
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: "1.3rem", borderColor: "#2d4272", display: "grid", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: "clamp(1.5rem,3vw,2rem)" }}>Inside the IT-Sniper command dashboard</h2>
          <span className="badge badge-info">Live scoring engine</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: "0.8rem" }}>
          <article style={{ border: "1px solid #27365c", borderRadius: 14, padding: "0.9rem", background: "#0c101d" }}>
            <strong>Mission</strong>
            <p className="muted" style={{ margin: "0.5rem 0 0" }}>
              Lead SRE — API scale-up / Paris remote-friendly
            </p>
            <div style={{ marginTop: "0.6rem", display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
              <span className="badge badge-success">Score 91%</span>
              <span className="badge">Urgency: High</span>
            </div>
          </article>
          <article style={{ border: "1px solid #27365c", borderRadius: 14, padding: "0.9rem", background: "#0c101d" }}>
            <strong>Why this fits</strong>
            <ul className="muted" style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem", display: "grid", gap: "0.35rem" }}>
              <li>Exact Kubernetes + AWS stack overlap</li>
              <li>Daily rate match probability: high</li>
              <li>Relevant migration projects in your CV</li>
            </ul>
          </article>
          <article style={{ border: "1px solid #27365c", borderRadius: 14, padding: "0.9rem", background: "#0c101d" }}>
            <strong>Generated pitch</strong>
            <p className="muted" style={{ margin: "0.5rem 0 0" }}>
              Hi team — I recently led a container platform migration at comparable scale. I can help secure delivery in your
              first sprint.
            </p>
          </article>
        </div>
      </section>

      <section style={{ display: "grid", gap: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: "clamp(1.5rem,3vw,2rem)" }}>Why IT-Sniper feels like an unfair advantage</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "0.8rem" }}>
          {valuePoints.map((point) => (
            <article key={point} className="card" style={{ padding: "1rem", borderColor: "#2e3c66" }}>
              <p style={{ margin: 0, color: "#e4e9ff", fontWeight: 550 }}>{point}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: "clamp(1.5rem,3vw,2rem)" }}>Pricing</h2>
        <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
          {[
            {
              name: "Free",
              price: "$0",
              note: "For first signals",
              features: ["3 scored missions / month", "Basic AI fit explanation", "Email notifications"],
              featured: false,
            },
            {
              name: "Pro",
              price: "$49",
              note: "Most popular",
              features: ["25 scored missions / month", "Ready-to-send AI pitch", "Instant mission alerts"],
              featured: true,
            },
            {
              name: "Elite",
              price: "$129",
              note: "For top performers",
              features: ["Unlimited high-signal missions", "Priority ranking + fit confidence", "VIP support + playbooks"],
              featured: false,
            },
          ].map((plan) => (
            <article
              key={plan.name}
              className="card"
              style={{
                padding: "1.2rem",
                borderColor: plan.featured ? "#5b7df7" : "#2b314a",
                background: plan.featured
                  ? "linear-gradient(180deg, rgba(30,44,91,0.95), rgba(12,16,30,0.98))"
                  : "linear-gradient(180deg, rgba(21,24,38,0.95), rgba(12,14,23,0.96))",
                transform: plan.featured ? "translateY(-6px)" : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>{plan.name}</h3>
                {plan.featured ? <span className="badge badge-info">Recommended</span> : null}
              </div>
              <p style={{ margin: "0.6rem 0 0", fontSize: "1.9rem", fontWeight: 700 }}>
                {plan.price}
                <span className="muted" style={{ fontSize: "0.95rem", fontWeight: 500 }}>
                  /mo
                </span>
              </p>
              <p className="muted" style={{ margin: "0.2rem 0 0" }}>
                {plan.note}
              </p>
              <ul style={{ margin: "1rem 0 0", paddingLeft: "1.1rem", display: "grid", gap: "0.4rem", color: "#d3dbfa" }}>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section
        className="card"
        style={{
          padding: "2rem 1.2rem",
          borderColor: "#3b4d8e",
          background: "linear-gradient(135deg, rgba(28,38,76,0.92), rgba(12,16,30,0.97))",
          textAlign: "center",
          display: "grid",
          gap: "0.9rem",
          justifyItems: "center",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "clamp(1.6rem,3vw,2.3rem)", maxWidth: 740 }}>
          Your next freelance mission should find you first.
        </h2>
        <p className="muted" style={{ margin: 0, maxWidth: 580 }}>
          Let the radar work for you while you focus on delivering great engineering.
        </p>
        <Link href={ctaHref} className="btn btn-primary" style={{ padding: "0.82rem 1.3rem" }}>
          Start free
        </Link>
      </section>

      <footer style={{ padding: "0.5rem 0", color: "#8f97b7", display: "flex", justifyContent: "space-between", gap: "0.8rem", flexWrap: "wrap" }}>
        <span>© {new Date().getFullYear()} IT-Sniper</span>
        <span>Precision AI for freelance engineers</span>
      </footer>
    </main>
  );
}
