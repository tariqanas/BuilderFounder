import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authCookieName } from "@/lib/server-auth";

function readRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth-code-missing", request.url));
  }

  const supabase = createClient(readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"), readRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

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
