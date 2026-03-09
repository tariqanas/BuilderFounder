import { createClient } from "@supabase/supabase-js";

const noStoreFetch: typeof fetch = (input, init = {}) => {
  return fetch(input, {
    ...init,
    cache: "no-store",
    next: { revalidate: 0, ...(init as RequestInit & { next?: { revalidate?: number } }).next },
  });
};

function readRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getPublicSupabaseUrl() {
  return readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
}

function getPublicAnonKey() {
  return readRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

function getServiceRoleKey() {
  return readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function createSupabaseBrowserClient() {
  return createClient(getPublicSupabaseUrl(), getPublicAnonKey());
}

export function createSupabaseServiceClient() {
  return createClient(getPublicSupabaseUrl(), getServiceRoleKey(), {
    global: { fetch: noStoreFetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createSupabaseUserServerClient(accessToken: string) {
  return createClient(getPublicSupabaseUrl(), getPublicAnonKey(), {
    global: {
      fetch: noStoreFetch,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
