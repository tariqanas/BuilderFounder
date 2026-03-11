import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserIfAuthenticated } from "@/lib/server-auth";
import { createSupabaseUserServerClient } from "@/lib/supabase";
import { getOnboardingState } from "@/lib/onboarding-state";
import { verifyCheckoutSessionForUser } from "@/lib/stripe-verification";

export const dynamic = "force-dynamic";

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams?: { session_id?: string };
}) {
  const sessionId = searchParams?.session_id?.trim();
  if (!sessionId) {
    return (
      <main style={{ maxWidth: 640, margin: "3rem auto", padding: "0 1rem" }}>
        <section className="card" style={{ display: "grid", gap: 12 }}>
          <h1 style={{ margin: 0 }}>Unable to confirm payment</h1>
          <p className="muted" style={{ margin: 0 }}>
            Missing checkout session id. Please try again from the billing page.
          </p>
          <Link href="/billing" className="btn" style={{ width: "fit-content" }}>
            Back to billing
          </Link>
        </section>
      </main>
    );
  }

  const auth = await getUserIfAuthenticated();
  if (!auth?.user) {
    return (
      <main style={{ maxWidth: 640, margin: "3rem auto", padding: "0 1rem" }}>
        <section className="card" style={{ display: "grid", gap: 12 }}>
          <h1 style={{ margin: 0 }}>Session expired</h1>
          <p className="muted" style={{ margin: 0 }}>
            Please sign in again to finish confirming your checkout.
          </p>
          <Link href="/login" className="btn btn-primary" style={{ width: "fit-content" }}>
            Go to login
          </Link>
        </section>
      </main>
    );
  }

  let result;
  try {
    result = await verifyCheckoutSessionForUser(sessionId, auth.user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[billing-success] checkout verification crashed", {
      sessionId,
      userId: auth.user.id,
      error: message,
    });

    return (
      <main style={{ maxWidth: 640, margin: "3rem auto", padding: "0 1rem" }}>
        <section className="card" style={{ display: "grid", gap: 12 }}>
          <h1 style={{ margin: 0 }}>Verification error</h1>
          <p className="muted" style={{ margin: 0 }}>
            We hit an issue while verifying this checkout session. Please return to billing and try again.
          </p>
          <Link href="/billing" className="btn" style={{ width: "fit-content" }}>
            Back to billing
          </Link>
        </section>
      </main>
    );
  }

  if (result.ok) {
    const supabase = createSupabaseUserServerClient(auth.token);
    const onboarding = await getOnboardingState(supabase, auth.user.id);
    redirect(onboarding.isComplete ? "/app" : "/app/onboarding");
  }

  return (
    <main style={{ maxWidth: 640, margin: "3rem auto", padding: "0 1rem" }}>
      <section className="card" style={{ display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Payment not confirmed yet</h1>
        <p className="muted" style={{ margin: 0 }}>{result.message ?? "We could not validate your payment status."}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/billing" className="btn" style={{ width: "fit-content" }}>
            Back to billing
          </Link>
          <Link href={`/billing/success?session_id=${encodeURIComponent(sessionId)}`} className="btn btn-primary" style={{ width: "fit-content" }}>
            Retry
          </Link>
        </div>
      </section>
    </main>
  );
}
