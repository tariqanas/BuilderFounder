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

const reasonToTag = (reason: string) => {
  const cleanReason = reason.trim();
  const lower = cleanReason.toLowerCase();

  if (lower.includes("react")) return "React";
  if (lower.includes("next")) return "Next.js";
  if (lower.includes("node")) return "Node";
  if (lower.includes("aws")) return "AWS";
  if (lower.includes("frontend")) return "Frontend";
  if (lower.includes("backend")) return "Backend";
  if (lower.includes("fullstack")) return "Fullstack";
  if (lower.includes("remote")) return "Remote";

  return cleanReason.length > 14 ? `${cleanReason.slice(0, 14)}…` : cleanReason;
};

const scoreTone = (score: number) => {
  if (score >= 90) return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  if (score >= 80) return "border-blue-500/40 bg-blue-500/10 text-blue-200";
  return "border-amber-500/40 bg-amber-500/10 text-amber-200";
};

export function MissionList({ missions }: { missions: MissionItem[] }) {
  const [copiedMissionId, setCopiedMissionId] = useState<string | null>(null);

  const copyPitch = async (missionId: string, pitch: string) => {
    try {
      await navigator.clipboard.writeText(pitch ?? "");
      setCopiedMissionId(missionId);
      setTimeout(() => setCopiedMissionId((current) => (current === missionId ? null : current)), 1800);
    } catch {
      setCopiedMissionId(null);
    }
  };

  const sortedMissions = useMemo(() => [...missions].sort((a, b) => b.score - a.score), [missions]);

  if (!sortedMissions.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-14 text-center">
        <h3 className="m-0 text-xl font-semibold text-white">No missions yet</h3>
        <p className="mx-auto mt-3 mb-0 max-w-lg text-sm text-slate-300">
          Your radar is active. New opportunities will appear after the next scan.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {sortedMissions.map((mission) => {
        const isNew = Date.now() - new Date(mission.createdAt).getTime() <= 24 * 60 * 60 * 1000;
        const locationText = `${mission.company} • ${mission.remote || "Remote"} • ${mission.country || "Global"}`;
        const tags = (mission.reasons.length ? mission.reasons : ["React", "Node", "AWS"]).map(reasonToTag).slice(0, 4);
        const shortDescription = mission.reasons.length
          ? `Strong fit for your profile: ${mission.reasons.slice(0, 2).join(" • ")}`
          : "Solid fit for your profile. Open now and send your pitch quickly.";

        return (
          <article
            key={mission.id}
            className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-sm transition hover:border-slate-600"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="m-0 truncate text-xl font-semibold text-white md:text-2xl">{mission.title}</h3>
                <p className="mt-2 mb-0 truncate text-sm text-slate-400">{locationText}</p>
              </div>
              <div className={`rounded-full border px-3 py-1 text-sm font-semibold ${scoreTone(mission.score)}`}>
                🔥 {mission.score}/100 match
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <span key={`${mission.id}-${tag}-${index}`} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200">
                  {tag}
                </span>
              ))}
              {isNew ? <span className="rounded-full border border-violet-500/50 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">New today</span> : null}
              {mission.dayRate ? (
                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200">{mission.dayRate}€/day</span>
              ) : null}
            </div>

            <p className="mt-4 mb-0 line-clamp-2 text-sm leading-6 text-slate-300">{shortDescription}</p>

            <div className="mt-5 flex flex-wrap gap-3">
              {mission.hasValidUrl ? (
                <a
                  className="btn btn-primary"
                  href={mission.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={(event) => event.stopPropagation()}
                >
                  View mission
                </a>
              ) : (
                <button type="button" className="btn btn-primary" disabled>
                  View mission
                </button>
              )}

              <button type="button" className="btn" onClick={() => copyPitch(mission.id, mission.pitch ?? "")}> 
                {copiedMissionId === mission.id ? "Copied ✓" : "Copy pitch"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
