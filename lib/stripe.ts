import { env } from "@/lib/env";
import { getAppUrl } from "@/lib/app-url";

type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  current_period_end?: number | null;
  metadata?: { user_id?: string };
  customer_email?: string | null;
};

type StripeEvent = {
  id: string;
  type: string;
  data: unknown;
};

type StripeCheckoutSession = {
  id: string;
  status?: string;
  payment_status?: string;
  mode?: string;
  customer?: string | { id?: string } | null;
  metadata?: { user_id?: string };
  subscription?:
    | string
    | {
        id: string;
        status?: string;
        current_period_end?: number | null;
        metadata?: { user_id?: string };
      }
    | null;
};

function formEncode(input: Record<string, string>) {
  return new URLSearchParams(input).toString();
}

async function stripeRequest<T>(path: string, body: Record<string, string>) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formEncode(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stripe error ${response.status}: ${text}`);
  }

  return (await response.json()) as T;
}

async function stripeGetRequest<T>(path: string, searchParams?: URLSearchParams) {
  const query = searchParams?.toString();
  const url = `https://api.stripe.com/v1/${path}${query ? `?${query}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stripe error ${response.status}: ${text}`);
  }

  return (await response.json()) as T;
}

export async function createCustomer(email: string, userId: string) {
  const customer = await stripeRequest<{ id: string }>("customers", {
    email,
    "metadata[user_id]": userId,
  });
  return customer.id;
}

export async function createCheckoutSession(customerId: string, userId: string) {
  const appUrl = getAppUrl();

  return stripeRequest<{ url: string }>("checkout/sessions", {
    mode: "subscription",
    customer: customerId,
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/billing/cancel`,
    "line_items[0][price]": env.STRIPE_PRICE_ID,
    "line_items[0][quantity]": "1",
    "allow_promotion_codes": "true",
    "metadata[user_id]": userId,
    "subscription_data[metadata][user_id]": userId,
  });
}

export async function retrieveCheckoutSession(sessionId: string) {
  const searchParams = new URLSearchParams();
  searchParams.append("expand[]", "subscription");
  return stripeGetRequest<StripeCheckoutSession>(`checkout/sessions/${sessionId}`, searchParams);
}

export async function retrieveSubscription(subscriptionId: string) {
  return stripeGetRequest<StripeSubscription>(`subscriptions/${subscriptionId}`);
}

export async function createPortalSession(customerId: string) {
  const appUrl = getAppUrl();

  return stripeRequest<{ url: string }>("billing_portal/sessions", {
    customer: customerId,
    return_url: `${appUrl}/billing`,
  });
}

export function parseWebhookEvent(payload: unknown): StripeEvent {
  const parsed = (payload ?? {}) as { id?: string; type?: string; data?: { object?: unknown } };
  return { id: parsed.id ?? "", type: parsed.type ?? "", data: parsed.data?.object ?? {} };
}

export type { StripeSubscription, StripeEvent };
