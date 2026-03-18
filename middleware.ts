import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { detectLocaleFromHeader, LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n/config";

const AUTH_COOKIE = "it_sniper_access_token";
const PUBLIC_BILLING_ROUTES = new Set(["/billing/success", "/billing/cancel"]);

function ensureLocaleCookie(request: NextRequest, response: NextResponse) {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = cookieLocale
    ? normalizeLocale(cookieLocale)
    : detectLocaleFromHeader(request.headers.get("accept-language"));

  if (!cookieLocale || cookieLocale !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/app") && !pathname.startsWith("/billing")) {
    return ensureLocaleCookie(request, NextResponse.next());
  }

  if (PUBLIC_BILLING_ROUTES.has(pathname)) {
    return ensureLocaleCookie(request, NextResponse.next());
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return ensureLocaleCookie(request, NextResponse.redirect(new URL("/login", request.url)));
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing required environment variable: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(AUTH_COOKIE);
    return ensureLocaleCookie(request, response);
  }

  return ensureLocaleCookie(request, NextResponse.next());
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
