import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { isSubscriptionActive } from "@/lib/server-auth";
import { retrieveCheckoutSession } from "@/lib/stripe";

type CheckoutVerificationResult = {
  ok: boolean;
  message?: string;
};

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

function logVerification(level: "info" | "warn" | "error", message: string, context: Record<string, unknown>) {
  console[level](`[stripe-verify] ${message}`, context);
}

export async function verifyCheckoutSessionForUser(sessionId: string, userId: string): Promise<CheckoutVerificationResult> {
  if (!sessionId || !userId) {
    return { ok: false, message: "Missing checkout session context." };
  }

  try {
    logVerification("info", "starting checkout verification", { sessionId, userId });
    const session = await retrieveCheckoutSession(sessionId);

    const sessionMetadataUserId = session.metadata?.user_id;
    const subscriptionObject = session.subscription && typeof session.subscription === "object" ? session.subscription : null;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : subscriptionObject?.id;
    const subscriptionStatus = subscriptionObject?.status ?? "";
    const subscriptionMetadataUserId = subscriptionObject?.metadata?.user_id;
    const metadataUserId = sessionMetadataUserId ?? subscriptionMetadataUserId;

    if (metadataUserId && metadataUserId !== userId) {
      logVerification("warn", "checkout session user mismatch", {
        sessionId,
        userId,
        metadataUserId,
      });
      return { ok: false, message: "This checkout session does not belong to the current user." };
    }

    const paymentComplete = session.status === "complete" && session.payment_status === "paid";
    if (!paymentComplete) {
      logVerification("warn", "payment not complete", {
        sessionId,
        userId,
        status: session.status,
        paymentStatus: session.payment_status,
      });
      return { ok: false, message: "Payment confirmation is still pending or invalid." };
    }

    if (!subscriptionId) {
      logVerification("warn", "missing subscription id on checkout session", { sessionId, userId });
      return { ok: false, message: "Checkout completed but no subscription was attached to this session." };
    }

    if (!subscriptionStatus) {
      logVerification("warn", "subscription was not expanded on checkout session", {
        sessionId,
        userId,
        subscriptionId,
      });
      return { ok: false, message: "Subscription details are still syncing. Please retry in a few seconds." };
    }

    if (!ACTIVE_STATUSES.has(subscriptionStatus)) {
      logVerification("warn", "subscription is not active", {
        sessionId,
        userId,
        subscriptionId,
        subscriptionStatus,
      });
      return { ok: false, message: "Subscription is not active yet. Please retry in a few seconds." };
    }

    const service = createSupabaseServiceClient();
    const stripeCustomerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;

    const { error: upsertError } = await service.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscriptionId,
        status: subscriptionStatus,
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      logVerification("error", "failed to upsert subscription", {
        sessionId,
        userId,
        subscriptionId,
        error: upsertError.message,
      });
      throw new Error(`Failed to persist subscription: ${upsertError.message}`);
    }

    const { data: savedSubscription, error: selectError } = await service
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    if (selectError) {
      logVerification("error", "failed to read saved subscription", {
        sessionId,
        userId,
        error: selectError.message,
      });
      throw new Error(`Failed to load subscription after save: ${selectError.message}`);
    }

    if (!isSubscriptionActive(savedSubscription?.status)) {
      logVerification("warn", "saved subscription is not active", {
        sessionId,
        userId,
        status: savedSubscription?.status,
      });
      return { ok: false, message: "Subscription is not active yet. Please refresh in a few seconds." };
    }

    logVerification("info", "checkout verification completed", {
      sessionId,
      userId,
      subscriptionId,
      status: savedSubscription?.status,
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logVerification("error", "unexpected checkout verification error", {
      sessionId,
      userId,
      error: message,
    });
    throw error;
  }
}
