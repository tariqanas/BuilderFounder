import { checkSourcesHealth } from "@/lib/offers-collector";
import { requireUser } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatFinalStatus(status: "up" | "partial" | "down") {
  if (status === "up") return "🟢 UP";
  if (status === "partial") return "🟡 PARTIAL";
  return "🔴 DOWN";
}

export default async function AdminSourcesPage() {
  const { user } = await requireUser();
  if (!isAdminEmail(user.email)) {
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
              <th style={{ textAlign: "left", padding: "0.5rem 0" }}>Source</th>
              <th style={{ textAlign: "left", padding: "0.5rem 0" }}>Status</th>
              <th style={{ textAlign: "left", padding: "0.5rem 0" }}>Fetch status</th>
              <th style={{ textAlign: "left", padding: "0.5rem 0" }}>Parse status</th>
              <th style={{ textAlign: "left", padding: "0.5rem 0" }}>Offers count</th>
              <th style={{ textAlign: "left", padding: "0.5rem 0" }}>Reason</th>
              <th style={{ textAlign: "left", padding: "0.5rem 0" }}>Last check timestamp</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.source}>
                <td style={{ padding: "0.4rem 0" }}>{source.source}</td>
                <td style={{ padding: "0.4rem 0" }}>{formatFinalStatus(source.status)}</td>
                <td style={{ padding: "0.4rem 0" }}>{source.fetchStatus}</td>
                <td style={{ padding: "0.4rem 0" }}>{source.parseStatus}</td>
                <td style={{ padding: "0.4rem 0" }}>{source.offersFetched}</td>
                <td style={{ padding: "0.4rem 0" }}>{source.reason}</td>
                <td style={{ padding: "0.4rem 0" }}>{formatDate(source.lastCheckedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
