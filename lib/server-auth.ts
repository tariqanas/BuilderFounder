import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServiceClient, createSupabaseUserServerClient } from "@/lib/supabase";

const AUTH_COOKIE = "it_sniper_access_token";

export function getAccessToken() {
  return cookies().get(AUTH_COOKIE)?.value;
}

export async function requireUser() {
  const token = getAccessToken();
  if (!token) redirect("/login");

  const service = createSupabaseServiceClient();
  const { data, error } = await service.auth.getUser(token);

  if (error || !data.user) redirect("/login");

  return { user: data.user, token };
}

export async function getUserClientOrRedirect() {
  const { token } = await requireUser();
  return createSupabaseUserServerClient(token);
}

export const authCookieName = AUTH_COOKIE;
