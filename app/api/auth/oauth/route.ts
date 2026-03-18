import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getAppUrlFromRequest } from "@/lib/app-url";

type OAuthProvider = "google";

type CookieToSet = { name: string; value: string; options: CookieOptions };

function readRequiredEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value;
  }
  throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
}

function createSupabaseAuthClient(request: NextRequest, pendingCookies: CookieToSet[]) {
  const supabaseUrl = readRequiredEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]);
  const supabaseAnonKey = readRequiredEnv(["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        pendingCookies.push(...cookiesToSet);
      },
    },
    auth: {
      flowType: "pkce",
    },
  });
}

function applyPendingCookies(response: NextResponse, pendingCookies: CookieToSet[]) {
  for (const cookie of pendingCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { provider?: OAuthProvider } | null;
  if (body?.provider !== "google") {
    return NextResponse.json({ error: "Unsupported OAuth provider" }, { status: 400 });
  }

  const redirectTo = `${getAppUrlFromRequest(request)}/auth/callback`;

  try {
    const pendingCookies: CookieToSet[] = [];
    const supabase = createSupabaseAuthClient(request, pendingCookies);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: body.provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      const response = NextResponse.json({ error: error?.message ?? "Unable to start OAuth sign in" }, { status: 400 });
      applyPendingCookies(response, pendingCookies);
      return response;
    }

    const response = NextResponse.json({ url: data.url });
    applyPendingCookies(response, pendingCookies);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OAuth initialization failed" },
      { status: 500 },
    );
  }
}
