import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase";

type SeedOffer = {
  source: string;
  title: string;
  company: string;
  country: string;
  remote: "remote" | "hybrid" | "onsite";
  day_rate: number;
  url: string;
  description: string;
  posted_at: string;
};

const seedOffers: SeedOffer[] = [
  { source: "welcome_to_the_jungle", title: "Senior Next.js Engineer - B2B Platform", company: "LumenStack", country: "France", remote: "remote", day_rate: 780, url: "https://jobs.example.com/lumenstack/senior-nextjs-engineer", description: "Build App Router features, optimize SSR performance, and ship TypeScript APIs for a B2B marketplace.", posted_at: "2026-02-27T09:00:00.000Z" },
  { source: "linkedin", title: "React + Node.js Contractor", company: "Nordbyte", country: "Germany", remote: "hybrid", day_rate: 720, url: "https://jobs.example.com/nordbyte/react-node-contractor", description: "Modernize customer portal with React, Node.js services, and observability instrumentation.", posted_at: "2026-02-27T10:00:00.000Z" },
  { source: "indeed", title: "Cloud Engineer (AWS, Terraform)", company: "SkyBridge Tech", country: "Netherlands", remote: "remote", day_rate: 850, url: "https://jobs.example.com/skybridge/cloud-engineer-aws-terraform", description: "Deliver AWS landing zones, IaC modules, and CI/CD hardening for a fintech migration.", posted_at: "2026-02-27T11:00:00.000Z" },
  { source: "malt", title: "Senior Fullstack TypeScript Developer", company: "HexaFlow", country: "Belgium", remote: "remote", day_rate: 760, url: "https://jobs.example.com/hexaflow/fullstack-typescript", description: "Own Next.js frontend and Node backend features for subscription and billing workflows.", posted_at: "2026-02-27T12:00:00.000Z" },
  { source: "remoteok", title: "Freelance DevOps Engineer", company: "PulseOrbit", country: "France", remote: "remote", day_rate: 900, url: "https://jobs.example.com/pulseorbit/devops-engineer", description: "Kubernetes operations, GitHub Actions pipelines, and production incident reduction.", posted_at: "2026-02-27T13:00:00.000Z" },
  { source: "welcometothejungle", title: "Senior Data Engineer (Python, dbt)", company: "DataVanta", country: "France", remote: "hybrid", day_rate: 730, url: "https://jobs.example.com/datavanta/senior-data-engineer-python-dbt", description: "Build ELT pipelines with Python and dbt, model product analytics marts for growth teams.", posted_at: "2026-02-27T14:00:00.000Z" },
  { source: "linkedin", title: "Lead Frontend Engineer (React, Next.js)", company: "Boreal Labs", country: "Spain", remote: "remote", day_rate: 700, url: "https://jobs.example.com/boreallabs/lead-frontend-react-next", description: "Drive component architecture, performance budgets, and accessibility across SaaS dashboards.", posted_at: "2026-02-27T15:00:00.000Z" },
  { source: "indeed", title: "Backend Engineer (Node.js, PostgreSQL)", company: "FlowCart", country: "Portugal", remote: "remote", day_rate: 690, url: "https://jobs.example.com/flowcart/backend-node-postgresql", description: "Scale payment APIs, design event-driven services, and improve SQL query performance.", posted_at: "2026-02-27T16:00:00.000Z" },
  { source: "malt", title: "Platform Engineer - GCP", company: "CloudMotive", country: "France", remote: "hybrid", day_rate: 880, url: "https://jobs.example.com/cloudmotive/platform-engineer-gcp", description: "Build GCP platform foundations with Terraform, IAM guardrails, and internal developer tooling.", posted_at: "2026-02-27T17:00:00.000Z" },
  { source: "remoteok", title: "Senior QA Automation Engineer", company: "Quartzline", country: "United Kingdom", remote: "remote", day_rate: 640, url: "https://jobs.example.com/quartzline/senior-qa-automation", description: "Implement Playwright automation suites and CI quality gates for release confidence.", posted_at: "2026-02-27T18:00:00.000Z" },
  { source: "welcometothejungle", title: "Staff SRE - Reliability Program", company: "InfraAxis", country: "Germany", remote: "remote", day_rate: 920, url: "https://jobs.example.com/infraaxis/staff-sre-reliability", description: "Lead SLO program, observability standards, and multi-region resilience planning.", posted_at: "2026-02-28T09:00:00.000Z" },
  { source: "linkedin", title: "Senior Mobile Engineer (React Native)", company: "SwiftHarbor", country: "France", remote: "hybrid", day_rate: 710, url: "https://jobs.example.com/swiftharbor/senior-mobile-react-native", description: "Ship consumer app features with React Native, analytics, and push notification workflows.", posted_at: "2026-02-28T10:00:00.000Z" },
  { source: "indeed", title: "Principal Backend Engineer - Go", company: "EchoTransit", country: "Netherlands", remote: "remote", day_rate: 870, url: "https://jobs.example.com/echotransit/principal-backend-go", description: "Design low-latency APIs in Go for booking and routing systems under high traffic.", posted_at: "2026-02-28T11:00:00.000Z" },
  { source: "malt", title: "Senior Product Engineer (Next.js, Supabase)", company: "MetricWave", country: "France", remote: "remote", day_rate: 790, url: "https://jobs.example.com/metricwave/senior-product-engineer-next-supabase", description: "Build App Router user flows, Postgres policies, and secure authentication journeys.", posted_at: "2026-02-28T12:00:00.000Z" },
  { source: "remoteok", title: "Security Engineer (AppSec)", company: "TrustForge", country: "Ireland", remote: "remote", day_rate: 860, url: "https://jobs.example.com/trustforge/security-engineer-appsec", description: "Roll out SAST/DAST pipelines, threat modeling workshops, and security remediation playbooks.", posted_at: "2026-02-28T13:00:00.000Z" },
  { source: "welcometothejungle", title: "Senior Java Engineer - Payments", company: "Finloop", country: "France", remote: "onsite", day_rate: 650, url: "https://jobs.example.com/finloop/senior-java-engineer-payments", description: "Build payment orchestration services in Java and Spring, improve reconciliation pipelines.", posted_at: "2026-02-28T14:00:00.000Z" },
  { source: "linkedin", title: "Tech Lead - AI Product Platform", company: "NovaPattern", country: "Belgium", remote: "hybrid", day_rate: 940, url: "https://jobs.example.com/novapattern/tech-lead-ai-product-platform", description: "Lead platform architecture, Python services, and MLOps pipelines for model deployment.", posted_at: "2026-02-28T15:00:00.000Z" },
  { source: "indeed", title: "Senior PHP / Symfony Engineer", company: "UrbanLedger", country: "France", remote: "remote", day_rate: 620, url: "https://jobs.example.com/urbanledger/senior-php-symfony", description: "Improve B2B invoicing product, migrate legacy modules, and add API integrations.", posted_at: "2026-02-28T16:00:00.000Z" },
  { source: "malt", title: "Senior Rust Engineer", company: "CipherRail", country: "Germany", remote: "remote", day_rate: 980, url: "https://jobs.example.com/cipherrail/senior-rust-engineer", description: "Implement high-performance services in Rust for blockchain indexing and fraud checks.", posted_at: "2026-02-28T17:00:00.000Z" },
  { source: "remoteok", title: "Head of Engineering (Hands-on)", company: "AtlasPulse", country: "France", remote: "hybrid", day_rate: 1000, url: "https://jobs.example.com/atlaspulse/head-of-engineering-hands-on", description: "Scale engineering team while remaining hands-on with architecture and platform reliability.", posted_at: "2026-02-28T18:00:00.000Z" },
];

function isAuthorizedDevRequest(request: Request) {
  if (process.env.NODE_ENV === "production") return false;
  const secret = request.headers.get("x-dev-secret");
  return Boolean(secret && secret === env.DEV_SEED_SECRET);
}

function hashOffer(source: string, url: string) {
  return createHash("sha256").update(`${source}:${url}`).digest("hex");
}

export async function POST(request: Request) {
  if (!isAuthorizedDevRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const service = createSupabaseServiceClient();
  const rows = seedOffers.map((offer) => ({ ...offer, hash: hashOffer(offer.source, offer.url) }));

  const { data: existing } = await service
    .from("offers_raw")
    .select("hash")
    .in("hash", rows.map((row) => row.hash));

  const existingHashes = new Set((existing ?? []).map((row) => row.hash));

  const { error } = await service.from("offers_raw").upsert(rows, {
    onConflict: "hash",
    ignoreDuplicates: true,
  });

  if (error) return NextResponse.json({ ok: false, error: "seed_failed" }, { status: 500 });

  const inserted = rows.filter((row) => !existingHashes.has(row.hash)).length;
  const skipped = rows.length - inserted;

  return NextResponse.json({ ok: true, inserted, skipped });
}
