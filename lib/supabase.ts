import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const noStoreFetch: typeof fetch = (input, init = {}) => {
  return fetch(input, { ...init, cache: "no-store", next: { revalidate: 0, ...(init as RequestInit & { next?: { revalidate?: number } }).next } });
};

export function createSupabaseBrowserClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function createSupabaseServiceClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    global: { fetch: noStoreFetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createSupabaseUserServerClient(accessToken: string) {
  return createClient(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: {
      fetch: noStoreFetch,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
