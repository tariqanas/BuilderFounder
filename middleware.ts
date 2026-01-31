import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/dashboard", "/feed", "/post-idea"];

const hasSupabaseCookie = (request: NextRequest) => {
  const cookies = request.cookies.getAll();
  return cookies.some((cookie) => {
    const name = cookie.name;
    return (
      name === "sb-access-token" ||
      name === "sb-refresh-token" ||
      (name.startsWith("sb-") && name.endsWith("-auth-token"))
    );
  });
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!hasSupabaseCookie(request)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/feed/:path*", "/post-idea/:path*"],
};
