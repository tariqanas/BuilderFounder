"use client";

import { useMemo, useState } from "react";

type MissionItem = {
  id: string;
  title: string;
  company: string;
  score: number;
  pitch: string;
  url: string;
  hasValidUrl: boolean;
  reasons: string[];
  createdAt: string;
  country: string;
  remote: string;
  dayRate: number | null;
};

const scoreTier = (score: number) => {
  if (score >= 90) return { label: "Perfect match", tone: "badge-success" };
  if (score >= 80) return { label: "Strong match", tone: "badge-info" };
  return { label: "Good match", tone: "badge-warning" };
};

const reasonToChip = (reason: string) => {
  const cleanReason = reason.trim();
  const lower = cleanReason.toLowerCase();

  if (lower.includes("stack") || lower.includes("tech") || lower.includes("skill")) return "Stack match";
  if (lower.includes("remote")) return "Remote";
  if (lower.includes("country") || lower.includes("location") || lower.includes("france")) return "Country";
  if (lower.includes("rate") || lower.includes("budget") || lower.includes("day")) return "Rate";

  return cleanReason.length > 22 ? `${cleanReason.slice(0, 22)}…` : cleanReason;
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

  const sortedMissions = useMemo(() => [...missions].sort((a, b) => b.score - a.score), [missions]);

  if (!sortedMissions.length) {
    return (
      <div className="empty-state">
        <p>No missions detected yet.</p>
        <p className="muted">Your radar is active and scanning freelance markets.</p>
        <p className="muted">New mission signals will appear automatically.</p>
      </div>
    );
  }

  return (
    <div className="mission-grid">
      {toast && <p className="badge badge-info toast-badge">{toast}</p>}
      {sortedMissions.map((mission) => {
        const missionTier = scoreTier(mission.score);
        const isNew = Date.now() - new Date(mission.createdAt).getTime() <= 24 * 60 * 60 * 1000;
        const locationText = `${mission.country || "Global"} • ${mission.remote || "Remote"}`;
        const reasonChips = (mission.reasons.length ? mission.reasons : ["Stack match", "Remote", "Country", "Rate"])
          .map(reasonToChip)
          .slice(0, 4);

        return (
          <article key={mission.id} className="mission-card">
            <div className="mission-header">
              <div>
                <h3>{mission.title}</h3>
                <p className="muted mission-company">{mission.company}</p>
              </div>
              <div className="mission-badges">
                <span className={`badge ${missionTier.tone}`}>{`${missionTier.label} • Score ${mission.score}`}</span>
                {isNew ? <span className="badge badge-new">NEW</span> : null}
              </div>
            </div>

            <div className="mission-meta">
              <span className="muted">{locationText}</span>
              <span>{mission.dayRate ? `${mission.dayRate}€/day` : "Rate not specified"}</span>
            </div>

            <div className="chip-row">
              {reasonChips.map((chip, index) => (
                <span key={`${mission.id}-${chip}-${index}`} className="chip">
                  {chip}
                </span>
              ))}
            </div>

            <div className="mission-actions">
              {mission.hasValidUrl ? (
                <a className="btn btn-primary" href={mission.url} target="_blank" rel="noreferrer noopener">
                  Open mission
                </a>
              ) : (
                <span className="btn btn-primary" aria-disabled="true" style={{ opacity: 0.45, pointerEvents: "none" }}>
                  Open mission
                </span>
              )}
              <button className="btn" onClick={() => copyPitch(mission.pitch ?? "")}>
                Copy pitch
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
