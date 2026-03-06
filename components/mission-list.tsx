"use client";

import { useState } from "react";

type MissionItem = {
  id: string;
  title: string;
  company: string;
  score: number;
  pitch: string;
  url: string;
  hasValidUrl: boolean;
  reasons: string[];
};

export function MissionList({ missions }: { missions: MissionItem[] }) {
  const [toast, setToast] = useState<string | null>(null);

  const copyPitch = async (pitch: string) => {
    try {
      await navigator.clipboard.writeText(pitch ?? "");
      setToast("Pitch copied");
    } catch {
      setToast("Clipboard unavailable");
    }
    setTimeout(() => setToast(null), 1800);
  };

  if (!missions.length) {
    return (
      <div className="card" style={{ background: "#0f0f18" }}>
        <p className="muted" style={{ margin: 0 }}>
          Radar active. Waiting for signals…
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {toast && (
        <p className="badge" style={{ width: "fit-content", margin: 0 }}>
          {toast}
        </p>
      )}
      {missions.map((m) => (
        <article key={m.id} className="card" style={{ background: "#0f0f18", display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "1.02rem" }}>{m.title}</h3>
            <span className="badge">Score {m.score}%</span>
          </div>

          <p className="muted" style={{ margin: 0 }}>
            {m.company}
          </p>

          <div>
            <strong style={{ fontSize: "0.9rem" }}>Why it matches</strong>
            <ul className="muted" style={{ margin: "0.4rem 0 0", paddingLeft: "1rem" }}>
              {(m.reasons.length ? m.reasons : ["Strong stack and mission fit"]).slice(0, 3).map((reason, index) => (
                <li key={`${m.id}-${index}`}>{reason}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {m.hasValidUrl ? (
              <a className="btn" href={m.url} target="_blank" rel="noreferrer noopener">
                Open offer
              </a>
            ) : (
              <span
                className="btn"
                aria-disabled="true"
                title="Offer link unavailable"
                style={{ opacity: 0.55, cursor: "not-allowed", pointerEvents: "none" }}
              >
                Open offer
              </span>
            )}
            <button className="btn" onClick={() => copyPitch(m.pitch ?? "")}>
              Copy pitch
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
