import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { isSubscriptionActive } from "@/lib/server-auth";
import { retrieveCheckoutSession } from "@/lib/stripe";

type CheckoutVerificationResult = {
  ok: boolean;
  message?: string;
};

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export async function verifyCheckoutSessionForUser(sessionId: string, userId: string): Promise<CheckoutVerificationResult> {
  if (!sessionId || !userId) {
    return { ok: false, message: "Missing checkout session context." };
  }

  const session = await retrieveCheckoutSession(sessionId);
  const sessionUserId = session.metadata?.user_id;
  if (sessionUserId && sessionUserId !== userId) {
    return { ok: false, message: "This checkout session does not belong to the current user." };
  }

  const paymentComplete = session.status === "complete" && session.payment_status === "paid";
  const subscriptionId = session.subscription?.id;
  const subscriptionStatus = session.subscription?.status ?? "";

  if (!paymentComplete || !subscriptionId || !ACTIVE_STATUSES.has(subscriptionStatus)) {
    return { ok: false, message: "Payment confirmation is still pending or invalid." };
  }

  const service = createSupabaseServiceClient();

  await service.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: session.customer ? String(session.customer) : undefined,
      stripe_subscription_id: subscriptionId,
      status: subscriptionStatus,
    },
    { onConflict: "user_id" }
  );

  const { data: savedSubscription } = await service
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!isSubscriptionActive(savedSubscription?.status)) {
    return { ok: false, message: "Subscription is not active yet. Please refresh in a few seconds." };
  }

  return { ok: true };
}
