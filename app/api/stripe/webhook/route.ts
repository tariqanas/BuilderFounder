import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { parseWebhookEvent, StripeSubscription } from "@/lib/stripe";

function verifyStripeSignature(rawBody: string, signatureHeader: string | null) {
  if (!signatureHeader) return false;
  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split("=");
    if (k && v) acc[k] = v;
    return acc;
  }, {});

  if (!parts.t || !parts.v1) return false;
  const signedPayload = `${parts.t}.${rawBody}`;
  const expected = crypto.createHmac("sha256", env.STRIPE_WEBHOOK_SECRET).update(signedPayload, "utf8").digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!verifyStripeSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const payload = JSON.parse(rawBody);
  const event = parseWebhookEvent(payload);
  const service = createSupabaseServiceClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data;
    const userId = session.metadata?.user_id;

    if (userId && session.customer && session.subscription) {
      await service.from("subscriptions").upsert(
        {
          user_id: String(userId),
          stripe_customer_id: String(session.customer),
          stripe_subscription_id: String(session.subscription),
          status: "active",
        },
        { onConflict: "user_id" }
      );
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data as StripeSubscription;

    await service
      .from("subscriptions")
      .update({
        status: sub.status,
        stripe_subscription_id: sub.id,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      })
      .eq("stripe_customer_id", sub.customer);
  }

  return NextResponse.json({ ok: true });
}
