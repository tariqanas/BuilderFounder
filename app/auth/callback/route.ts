import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { authCookieName } from "@/lib/server-auth";

function readRequiredEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value;
  }
  throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
}

export async function GET(request: Request) {
  const cookieStore = cookies();
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth-code-missing", request.url));
  }

  const supabase = createClient(
    readRequiredEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]),
    readRequiredEnv(["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        flowType: "pkce",
        storageKey: "it-sniper-oauth",
        storage: {
          getItem: (key: string) => cookieStore.get(key)?.value ?? null,
          setItem: (key: string, value: string) => {
            cookieStore.set(key, value, {
              path: "/",
              httpOnly: true,
              secure: true,
              sameSite: "lax",
              maxAge: 60 * 10,
            });
          },
          removeItem: (key: string) => {
            cookieStore.delete(key);
          },
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session || !data.user) {
    return NextResponse.redirect(new URL("/login?error=oauth-failed", request.url));
  }

  await supabase.from("profiles").upsert({ user_id: data.user.id, email: data.user.email ?? null }, { onConflict: "user_id" });

  const response = NextResponse.redirect(new URL("/app", request.url));
  response.cookies.set(authCookieName, data.session.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: data.session.expires_in,
  });

  return response;
}
