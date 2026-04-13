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

const reasonToChip = (reason: string) => {
  const cleanReason = reason.trim();
  const lower = cleanReason.toLowerCase();

  if (lower.includes("react")) return "React";
  if (lower.includes("node")) return "Node";
  if (lower.includes("aws")) return "AWS";
  if (lower.includes("typescript")) return "TypeScript";
  if (lower.includes("javascript")) return "JavaScript";
  if (lower.includes("python")) return "Python";
  if (lower.includes("devops")) return "DevOps";
  if (lower.includes("cloud")) return "Cloud";
  if (lower.includes("stack") || lower.includes("tech") || lower.includes("skill")) return "Tech fit";

  return cleanReason.length > 18 ? `${cleanReason.slice(0, 18)}…` : cleanReason;
};

const shortDescription = (mission: MissionItem) => {
  const baseText = mission.pitch?.trim() || "Great fit with your profile, remote-friendly setup, and a clear chance to apply quickly.";
  return baseText.replace(/\s+/g, " ");
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
        <p className="muted">Your radar scans the market continuously and updates your signals throughout the day.</p>
      </div>
    );
  }

  return (
    <div className="mission-grid">
      {toast && <p className="badge badge-info toast-badge">{toast}</p>}
      {sortedMissions.map((mission) => {
        const isNew = Date.now() - new Date(mission.createdAt).getTime() <= 24 * 60 * 60 * 1000;
        const metaLine = [mission.company || "Unknown company", mission.remote || "Remote", mission.country || "Global"].join(" • ");
        const techTags = (mission.reasons.length ? mission.reasons : ["React", "Remote", "Cloud"])
          .map(reasonToChip)
          .slice(0, 4);

        return (
          <article key={mission.id} className="mission-card">
            <div className="mission-header">
              <div className="mission-title-wrap">
                <h3>{mission.title}</h3>
                <p className="mission-meta-line">{metaLine}</p>
              </div>
              <div className="mission-badges">
                <span className="mission-score">🔥 {`${mission.score}/100 match`}</span>
                {isNew ? <span className="badge badge-new">NEW</span> : null}
              </div>
            </div>

            <div className="chip-row" aria-label="Tech stack">
              {techTags.map((chip, index) => (
                <span key={`${mission.id}-${chip}-${index}`} className="chip">
                  {chip}
                </span>
              ))}
            </div>

            <p className="mission-description">{shortDescription(mission)}</p>

            <div className="mission-actions">
              {mission.hasValidUrl ? (
                <a className="btn btn-primary" href={mission.url} target="_blank" rel="noreferrer noopener">
                  View mission
                </a>
              ) : (
                <span className="btn btn-primary" aria-disabled="true" style={{ opacity: 0.45, pointerEvents: "none" }}>
                  View mission
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
