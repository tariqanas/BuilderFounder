import { redirect } from "next/navigation";
import { getUserClientOrRedirect, isSubscriptionActive, requireUser } from "@/lib/server-auth";

export default async function BillingPage({ searchParams }: { searchParams?: { checkout?: string } }) {
  const { user } = await requireUser();
  const supabase = await getUserClientOrRedirect();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status,current_period_end,stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("primary_stack, countries")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: cv } = await supabase.from("cv_files").select("storage_path").eq("user_id", user.id).maybeSingle();

  const status = subscription?.status ?? "inactive";
  const active = isSubscriptionActive(status);
  const hasProfile = Boolean(settings?.primary_stack && settings?.countries?.length && cv?.storage_path);

  if (searchParams?.checkout === "success" && active) {
    redirect(hasProfile ? "/app" : "/app/onboarding");
  }

  return (
    <main className="container" style={{ maxWidth: 760 }}>
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
  );
}
