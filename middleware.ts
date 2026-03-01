import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const AUTH_COOKIE = "it_sniper_access_token";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(AUTH_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
