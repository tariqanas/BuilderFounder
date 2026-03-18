import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { authCookieName } from "@/lib/server-auth";
import { createSupabaseServiceClient } from "@/lib/supabase";

type CookieToSet = { name: string; value: string; options: CookieOptions };

function readRequiredEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value;
  }
  throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
}

function createSupabaseAuthClient(request: NextRequest, pendingCookies: CookieToSet[]) {
  return createServerClient(
    readRequiredEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]),
    readRequiredEnv(["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          pendingCookies.push(...cookiesToSet);
        },
      },
      auth: {
        flowType: "pkce",
      },
    },
  );
}

function applyPendingCookies(response: NextResponse, pendingCookies: CookieToSet[]) {
  for (const cookie of pendingCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    console.error("[oauth/callback] Missing code in callback URL");
    return NextResponse.redirect(new URL("/login?error=oauth-failed", request.url));
  }

  const pendingCookies: CookieToSet[] = [];
  const supabase = createSupabaseAuthClient(request, pendingCookies);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session || !data.user) {
    console.error("[oauth/callback] exchangeCodeForSession failed", error);
    const response = NextResponse.redirect(new URL("/login?error=oauth-failed", request.url));
    applyPendingCookies(response, pendingCookies);
    return response;
  }

  const service = createSupabaseServiceClient();
  await service
    .from("profiles")
    .upsert({ user_id: data.user.id, email: data.user.email ?? null }, { onConflict: "user_id" });

  const response = NextResponse.redirect(new URL("/app", request.url));
  applyPendingCookies(response, pendingCookies);
  response.cookies.set(authCookieName, data.session.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: data.session.expires_in,
  });

  console.info("[oauth/callback] OAuth session exchange succeeded");
  return response;
}
