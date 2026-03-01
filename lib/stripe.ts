import { env } from "@/lib/env";

type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  current_period_end: number;
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

export async function createCustomer(email: string, userId: string) {
  const customer = await stripeRequest<{ id: string }>("customers", {
    email,
    "metadata[user_id]": userId,
  });
  return customer.id;
}

export async function createCheckoutSession(customerId: string, userId: string) {
  return stripeRequest<{ url: string }>("checkout/sessions", {
    mode: "subscription",
    customer: customerId,
    success_url: `${env.APP_URL}/app`,
    cancel_url: `${env.APP_URL}/billing`,
    "line_items[0][price]": env.STRIPE_PRICE_ID,
    "line_items[0][quantity]": "1",
    "allow_promotion_codes": "true",
    "metadata[user_id]": userId,
  });
}

export async function createPortalSession(customerId: string) {
  return stripeRequest<{ url: string }>("billing_portal/sessions", {
    customer: customerId,
    return_url: `${env.APP_URL}/billing`,
  });
}

export function parseWebhookEvent(payload: any): { type: string; data: any } {
  return { type: payload?.type ?? "", data: payload?.data?.object ?? {} };
}

export type { StripeSubscription };
