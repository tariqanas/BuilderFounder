import { redirect } from "next/navigation";
import { getUserClientOrRedirect, requireUser } from "@/lib/server-auth";

export default async function BillingPage() {
  const { user } = await requireUser();
  const supabase = await getUserClientOrRedirect();

  if (!user) redirect("/login");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status,current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="container" style={{ maxWidth: 700 }}>
      <div className="card" style={{ display: "grid", gap: 14 }}>
        <h1>Billing</h1>
        <p>
          Statut actuel : <strong>{subscription?.status ?? "Aucun abonnement"}</strong>
        </p>
        <p>
          Période en cours jusqu&apos;au : {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "-"}
        </p>

        <form action="/api/stripe/checkout" method="post">
          <button type="submit" className="btn btn-primary">
            Démarrer l&apos;abonnement
          </button>
        </form>

        <a href="/api/stripe/portal" className="btn" style={{ width: "fit-content" }}>
          Ouvrir le portail Stripe
        </a>
      </div>
    </main>
  );
}
