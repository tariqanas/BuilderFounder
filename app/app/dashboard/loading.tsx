export default function DashboardLoading() {
  return (
    <main className="dashboard-layout">
      <section className="card dashboard-header">
        <div className="dashboard-header-main">
          <div className="skeleton skeleton-line" style={{ width: "40%", height: 26 }} />
          <div className="skeleton skeleton-line" style={{ width: "64%", height: 14 }} />
          <div className="skeleton skeleton-line" style={{ width: 110, height: 26, borderRadius: 999 }} />
        </div>
        <div className="dashboard-header-action">
          <div className="skeleton skeleton-line" style={{ width: "100%", height: 42, borderRadius: 10 }} />
        </div>
      </section>

      <section className="kpi-strip">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="skeleton" style={{ minHeight: 96 }} />
        ))}
      </section>

      <section className="status-grid">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="skeleton" style={{ minHeight: 130 }} />
        ))}
      </section>

      <section className="card mission-section">
        <div className="mission-section-header">
          <div className="skeleton skeleton-line" style={{ width: 160, height: 28 }} />
        </div>
        <div className="mission-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="mission-card-skeleton">
              <div className="mission-card-skeleton-header">
                <div>
                  <div className="skeleton skeleton-line" style={{ width: 240, height: 22 }} />
                  <div className="skeleton skeleton-line" style={{ width: 180, height: 12, marginTop: 8 }} />
                </div>
                <div className="skeleton skeleton-line" style={{ width: 120, height: 28, borderRadius: 999 }} />
              </div>
              <div className="chip-row">
                <div className="skeleton skeleton-line" style={{ width: 52, height: 24, borderRadius: 999 }} />
                <div className="skeleton skeleton-line" style={{ width: 64, height: 24, borderRadius: 999 }} />
                <div className="skeleton skeleton-line" style={{ width: 56, height: 24, borderRadius: 999 }} />
              </div>
              <div className="skeleton skeleton-line" style={{ width: "100%", height: 14 }} />
              <div className="skeleton skeleton-line" style={{ width: "88%", height: 14 }} />
              <div className="mission-actions">
                <div className="skeleton skeleton-line" style={{ width: 124, height: 38, borderRadius: 10 }} />
                <div className="skeleton skeleton-line" style={{ width: 108, height: 38, borderRadius: 10 }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
