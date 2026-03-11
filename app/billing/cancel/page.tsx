import Link from "next/link";

export default function BillingCancelPage() {
  return (
    <main style={{ maxWidth: 640, margin: "3rem auto", padding: "0 1rem" }}>
      <section className="card" style={{ display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Checkout cancelled</h1>
        <p className="muted" style={{ margin: 0 }}>
          No payment was processed. You can return to billing anytime to resume checkout.
        </p>
        <Link href="/billing" className="btn" style={{ width: "fit-content" }}>
          Back to billing
        </Link>
      </section>
    </main>
  );
}
