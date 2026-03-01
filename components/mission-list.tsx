"use client";

type MissionItem = {
  id: string;
  title: string;
  company: string;
  score: number;
  pitch: string;
  url: string;
};

export function MissionList({ missions }: { missions: MissionItem[] }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {missions.length ? (
        missions.map((m) => (
          <article key={m.id} className="card" style={{ background: "#0f0f18" }}>
            <h3 style={{ marginTop: 0 }}>
              {m.title} — {m.company}
            </h3>
            <p>Score: {m.score}</p>
            <textarea value={m.pitch ?? ""} readOnly rows={4} />
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn" onClick={() => navigator.clipboard.writeText(m.pitch ?? "")}>Copy pitch</button>
              <a className="btn" href={m.url} target="_blank" rel="noreferrer">
                Voir offre
              </a>
            </div>
          </article>
        ))
      ) : (
        <p style={{ color: "#b7b7c9" }}>Aucune mission reçue.</p>
      )}
    </div>
  );
}
