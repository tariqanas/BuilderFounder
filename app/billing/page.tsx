import { getUserClientOrRedirect, isSubscriptionActive, requireUser } from "@/lib/server-auth";

export default async function BillingPage() {
  const { user } = await requireUser();
  const supabase = await getUserClientOrRedirect();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status,current_period_end,stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const status = subscription?.status ?? "inactive";
  const active = isSubscriptionActive(status);

  return (
    <main className="container" style={{ maxWidth: 700 }}>
      <div className="card" style={{ display: "grid", gap: 14 }}>
        <h1>Billing</h1>
        <p>
          Statut actuel : <strong>{status}</strong>
        </p>
        <p>
          Période en cours jusqu&apos;au : {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "-"}
        </p>

        {!active ? (
          <form action="/api/stripe/checkout" method="post">
            <button type="submit" className="btn btn-primary">
              Start subscription
            </button>
          </form>
        ) : (
          <a
            href="/api/stripe/portal"
            className="btn"
            style={{ width: "fit-content", pointerEvents: subscription?.stripe_customer_id ? "auto" : "none", opacity: subscription?.stripe_customer_id ? 1 : 0.5 }}
            aria-disabled={!subscription?.stripe_customer_id}
          >
            Manage subscription
          </a>
        )}
      </div>
    </main>
  );
}
