export default function DashboardLoading() {
  return (
    <main className="dashboard-layout">
      <section className="card rounded-2xl border-slate-800 bg-slate-950/80 p-6">
        <div className="skeleton h-5 w-28" />
        <div className="mt-4 skeleton h-10 w-72" />
        <div className="mt-3 skeleton h-4 w-full max-w-xl" />
        <div className="mt-5 skeleton h-10 w-36" />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="skeleton h-28 rounded-2xl" />
        ))}
      </section>

      <section className="card mission-section rounded-2xl border-slate-800 bg-slate-950/80 p-5">
        <div className="mission-section-header">
          <div className="skeleton h-7 w-60" />
        </div>
        <div className="mission-grid grid gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton rounded-2xl p-5" style={{ minHeight: 210 }} />
          ))}
        </div>
      </section>
    </main>
  );
}
