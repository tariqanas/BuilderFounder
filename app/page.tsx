import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="container" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <section className="card" style={{ maxWidth: 720, textAlign: "center", padding: "3rem" }}>
        <p style={{ color: "#b4b4cc", letterSpacing: 1 }}>IT SNIPER</p>
        <h1 style={{ fontSize: "3rem", margin: "0.6rem 0" }}>Mission radar premium pour freelances IT.</h1>
        <p style={{ color: "#c0c0d0", lineHeight: 1.6 }}>
          Auth, paiement et matching brutale­ment efficaces. Vous recevez uniquement des missions qualifiées, avec pitch prêt à copier.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: "1.2rem" }}>
          <Link href="/login" className="btn btn-primary">
            Start Beta
          </Link>
          <Link href="/billing" className="btn">
            Voir abonnement
          </Link>
        </div>
      </section>
    </main>
  );
}
