import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServiceClient, createSupabaseUserServerClient } from "@/lib/supabase";

const AUTH_COOKIE = "it_sniper_access_token";
const ACTIVE_SUBSCRIPTION = new Set(["active", "trialing"]);

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

export async function getUserIfAuthenticated() {
  const token = getAccessToken();
  if (!token) return null;

  const service = createSupabaseServiceClient();
  const { data, error } = await service.auth.getUser(token);

  if (error || !data.user) return null;

  return { user: data.user, token };
}

export async function getUserClientOrRedirect() {
  const { token } = await requireUser();
  return createSupabaseUserServerClient(token);
}

export async function requireActiveSubscription(userId: string) {
  const service = createSupabaseServiceClient();
  const { data: subscription, error } = await service
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  if (error || !subscription || !ACTIVE_SUBSCRIPTION.has(subscription.status)) {
    redirect("/billing");
  }

  return subscription;
}

export function isSubscriptionActive(status: string | null | undefined) {
  return !!status && ACTIVE_SUBSCRIPTION.has(status);
}

export const authCookieName = AUTH_COOKIE;
