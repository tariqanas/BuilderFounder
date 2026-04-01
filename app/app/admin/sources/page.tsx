import { checkSourcesHealth } from "@/lib/offers-collector";
import { requireUser } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default async function AdminSourcesPage() {
  const { user } = await requireUser();
  const adminEmails = getAdminEmails();
  const currentEmail = user.email?.toLowerCase() ?? "";

  if (!adminEmails.length || !adminEmails.includes(currentEmail)) {
    redirect("/app");
  }

  const sources = await checkSourcesHealth(15);

  return (
    <main className="dashboard-layout">
      <section className="card mission-section">
        <div className="mission-section-header" style={{ alignItems: "center" }}>
          <div>
            <h2>Source health monitor</h2>
            <p className="muted">Quick reliability check for ingestion sources.</p>
          </div>
          <form action="/app/admin/sources" method="get">
            <button type="submit" className="btn">
              Run check
            </button>
          </form>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.5rem 0" }}>Source name</th>
              <th style={{ textAlign: "left", padding: "0.5rem 0" }}>Status</th>
              <th style={{ textAlign: "left", padding: "0.5rem 0" }}>Last check timestamp</th>
              <th style={{ textAlign: "left", padding: "0.5rem 0" }}>Number of offers fetched</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.source}>
                <td style={{ padding: "0.4rem 0" }}>{source.source}</td>
                <td style={{ padding: "0.4rem 0" }}>{source.status === "up" ? "🟢 up" : "🔴 down"}</td>
                <td style={{ padding: "0.4rem 0" }}>{formatDate(source.lastCheckedAt)}</td>
                <td style={{ padding: "0.4rem 0" }}>{source.offersFetched}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
