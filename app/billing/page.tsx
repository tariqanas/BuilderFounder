import { redirect } from "next/navigation";
import { getUserClientOrRedirect, isSubscriptionActive, requireUser } from "@/lib/server-auth";
import { AppShell } from "@/components/app-shell";
import { getOnboardingState } from "@/lib/onboarding-state";

export const dynamic = "force-dynamic";

const CHECKOUT_RETRY_ATTEMPTS = 3;
const CHECKOUT_RETRY_DELAY_MS = 800;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function BillingPage({ searchParams }: { searchParams?: { checkout?: string } }) {
  const { user } = await requireUser();
  const supabase = await getUserClientOrRedirect();

  let { data: subscription } = await supabase
    .from("subscriptions")
    .select("status,current_period_end,stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (searchParams?.checkout === "success" && !isSubscriptionActive(subscription?.status)) {
    for (let attempt = 0; attempt < CHECKOUT_RETRY_ATTEMPTS; attempt += 1) {
      await sleep(CHECKOUT_RETRY_DELAY_MS);
      const { data: refreshedSubscription } = await supabase
        .from("subscriptions")
        .select("status,current_period_end,stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      subscription = refreshedSubscription ?? subscription;
      if (isSubscriptionActive(subscription?.status)) break;
    }
  }

  const onboarding = await getOnboardingState(supabase, user.id);

  const status = subscription?.status ?? "inactive";
  const active = isSubscriptionActive(status);

  if (searchParams?.checkout === "success" && active) {
    redirect(onboarding.isComplete ? "/app" : "/app/onboarding");
  }

  return (
    <AppShell authenticated={Boolean(user)}>
      <main style={{ maxWidth: 760 }}>
        <div className="card" style={{ display: "grid", gap: 14, padding: "1.4rem" }}>
        <h1 style={{ marginBottom: 0 }}>Billing</h1>
        <p style={{ marginTop: 0 }}>
          Status{" "}
          <span className="badge" style={{ borderColor: active ? "#4255a8" : "#57465c" }}>
            {status.toUpperCase()}
          </span>
        </p>

        {!active ? (
          <section className="card" style={{ display: "grid", gap: 10, background: "#0f0f19" }}>
            <h2 style={{ margin: 0 }}>Beta Access — €49/month</h2>
            <p className="muted" style={{ margin: 0 }}>
              Weekly top signals, scored matches, pitch ready.
            </p>
            <form action="/api/stripe/checkout" method="post">
              <button type="submit" className="btn btn-primary">
                Subscribe now
              </button>
            </form>
          </section>
        ) : (
          <section className="card" style={{ display: "grid", gap: 10, background: "#0f0f19" }}>
            <p style={{ margin: 0 }}>
              Next billing date: {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "Pending confirmation"}
            </p>
            <a
              href="/api/stripe/portal"
              className="btn"
              style={{ width: "fit-content", pointerEvents: subscription?.stripe_customer_id ? "auto" : "none", opacity: subscription?.stripe_customer_id ? 1 : 0.5 }}
              aria-disabled={!subscription?.stripe_customer_id}
            >
              Manage subscription
            </a>
          </section>
        )}

          <div className="muted" style={{ display: "grid", gap: 4, fontSize: "0.92rem" }}>
            <span>• Stripe secured payments</span>
            <span>• Cancel anytime</span>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
