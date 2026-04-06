export default function DashboardLoading() {
  return (
    <main className="dashboard-layout">
      <section className="status-grid">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="skeleton" style={{ minHeight: 130 }} />
        ))}
      </section>

      <section className="card mission-section">
        <div className="mission-section-header">
          <h2 style={{ margin: 0 }}>Mission Signals</h2>
        </div>
        <div className="mission-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton" style={{ minHeight: 180 }} />
          ))}
        </div>
      </section>
    </main>
  );
}
