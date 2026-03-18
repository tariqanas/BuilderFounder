import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getAppUrlFromRequest } from "@/lib/app-url";

type OAuthProvider = "google";

function readRequiredEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value;
  }
  throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
}

function createSupabaseAuthClient() {
  const cookieStore = cookies();
  const supabaseUrl = readRequiredEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]);
  const supabaseAnonKey = readRequiredEnv(["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);

  return createClient(supabaseUrl, supabaseAnonKey, {
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
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { provider?: OAuthProvider } | null;
  if (body?.provider !== "google") {
    return NextResponse.json({ error: "Unsupported OAuth provider" }, { status: 400 });
  }

  const redirectTo = `${getAppUrlFromRequest(request)}/auth/callback`;

  try {
    const supabase = createSupabaseAuthClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: body.provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      return NextResponse.json({ error: error?.message ?? "Unable to start OAuth sign in" }, { status: 400 });
    }

    return NextResponse.json({ url: data.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OAuth initialization failed" },
      { status: 500 },
    );
  }
}
