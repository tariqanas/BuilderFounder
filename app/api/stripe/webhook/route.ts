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
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(parts.v1);
  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

async function resolveUserId(service: ReturnType<typeof createSupabaseServiceClient>, userId?: string, email?: string | null) {
  if (userId) return userId;
  if (!email) return null;
  const { data } = await service.from("profiles").select("user_id").eq("email", email).maybeSingle();
  return data?.user_id ?? null;
}

async function upsertSubscription(
  service: ReturnType<typeof createSupabaseServiceClient>,
  data: {
    user_id: string;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    status: string;
    current_period_end?: string | null;
  }
) {
  await service.from("subscriptions").upsert(data, { onConflict: "user_id" });
}

async function reserveEvent(service: ReturnType<typeof createSupabaseServiceClient>, eventId: string) {
  const key = `stripe_event:${eventId}`;
  await service.from("system_state").upsert({ key, value: "processing" }, { onConflict: "key", ignoreDuplicates: true });

  const { data, error } = await service
    .from("system_state")
    .update({ value: "processed" })
    .eq("key", key)
    .eq("value", "processing")
    .select("key")
    .maybeSingle();

  return !error && !!data;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, request.headers.get("stripe-signature"))) {
    console.error("[stripe-webhook] invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const event = parseWebhookEvent(JSON.parse(rawBody));
    const service = createSupabaseServiceClient();

    if (!event.id) {
      console.error("[stripe-webhook] missing event id");
      return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
    }

    const shouldProcess = await reserveEvent(service, event.id);
    if (!shouldProcess) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    if (event.type === "checkout.session.completed") {
      const session = (event.data ?? {}) as { metadata?: { user_id?: string }; customer_details?: { email?: string | null }; customer_email?: string | null; customer?: string; subscription?: string };
      const userId = await resolveUserId(service, session.metadata?.user_id, session.customer_details?.email ?? session.customer_email);

      if (userId) {
        await upsertSubscription(service, {
          user_id: userId,
          stripe_customer_id: String(session.customer ?? ""),
          stripe_subscription_id: String(session.subscription ?? ""),
          status: "active",
        });
      }
    }

    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      const sub = event.data as StripeSubscription;
      const userId = await resolveUserId(service, sub.metadata?.user_id, sub.customer_email ?? null);

      if (userId) {
        await upsertSubscription(service, {
          user_id: userId,
          stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id,
          status: sub.status,
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        });
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = (event.data ?? {}) as { customer?: string };
      if (invoice.customer) {
        await service.from("subscriptions").update({ status: "past_due" }).eq("stripe_customer_id", String(invoice.customer));
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`[stripe-webhook] processing failure ${(error as Error).message}`);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
