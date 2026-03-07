import "server-only";

type EnvSchema = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_ID: string;
  MAKE_INGEST_KEY: string;
  MAKE_NOTIFY_KEY: string;
  JOBS_API_KEY: string;
  CRON_KEY: string;
  HEALTH_KEY: string;
  APP_URL: string;
  DEV_SEED_SECRET: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL: string;
  MAX_AI_CALLS_PER_RUN: string;
  SIMULATE_USERS: string;
  MATCH_SCORE_THRESHOLD: string;
};

function readRequired(name: keyof EnvSchema) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readUrl(name: keyof EnvSchema) {
  const value = readRequired(name);
  try {
    new URL(value);
    return value;
  } catch {
    throw new Error(`Environment variable ${name} must be a valid URL`);
  }
}

function readInteger(name: keyof EnvSchema, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Environment variable ${name} must be a non-negative integer`);
  }
  return parsed;
}

export const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: readUrl("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: readRequired("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
};

export const env = {
  ...publicEnv,
  SUPABASE_URL: readUrl("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: readRequired("SUPABASE_SERVICE_ROLE_KEY"),
  STRIPE_SECRET_KEY: readRequired("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: readRequired("STRIPE_WEBHOOK_SECRET"),
  STRIPE_PRICE_ID: readRequired("STRIPE_PRICE_ID"),
  MAKE_INGEST_KEY: readRequired("MAKE_INGEST_KEY"),
  MAKE_NOTIFY_KEY: readRequired("MAKE_NOTIFY_KEY"),
  JOBS_API_KEY: readRequired("JOBS_API_KEY"),
  CRON_KEY: readRequired("CRON_KEY"),
  HEALTH_KEY: readRequired("HEALTH_KEY"),
  APP_URL: readUrl("APP_URL"),
  DEV_SEED_SECRET: readRequired("DEV_SEED_SECRET"),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
  MAX_AI_CALLS_PER_RUN: readInteger("MAX_AI_CALLS_PER_RUN", 300),
  SIMULATE_USERS: readInteger("SIMULATE_USERS", 0),
  MATCH_SCORE_THRESHOLD: readInteger("MATCH_SCORE_THRESHOLD", 70),
} as const;
