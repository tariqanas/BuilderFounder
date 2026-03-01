import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { authCookieName } from "@/lib/server-auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  if (!body?.email || !body?.password || body.password.length < 8) {
    return NextResponse.json({ error: "Email ou mot de passe invalide" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (error || !data.session) {
    return NextResponse.json({ error: error?.message ?? "Auth failed" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName, data.session.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: data.session.expires_in,
  });
  return response;
}
