"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { IdeaWithProfile } from "@/types";

type IdeaCardProps = {
  idea: IdeaWithProfile;
  isLiked: boolean;
  isLoading: boolean;
  canLike: boolean;
  showLogin: boolean;
  onLike: (ideaId: string) => void;
  onLogin: () => void;
};

export default function IdeaCard({
  idea,
  isLiked,
  isLoading,
  canLike,
  showLogin,
  onLike,
  onLogin,
}: IdeaCardProps) {
  const tags = idea.tags ?? [];
  const username = idea.profiles?.username ?? "BuilderFounder";
  const bio = idea.profiles?.bio ?? "Profil en construction.";

  return (
    <Card className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-white">{idea.title}</h3>
        <p className="text-sm text-slate-300">{idea.niche_problem}</p>
        {idea.traction && (
          <Badge className="border-emerald-400/40 bg-emerald-400/10 text-emerald-200">
            Traction · {idea.traction}
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-200">What I seek</p>
        <p className="text-sm text-slate-300">{idea.what_i_seek}</p>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              className="border-slate-700/60 bg-slate-800/70 text-slate-200"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
        <p className="text-sm font-semibold text-white">{username}</p>
        <p className="text-xs text-slate-400">{bio}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {showLogin ? (
          <Button onClick={onLogin}>Login pour liker</Button>
        ) : (
          <Button
            onClick={() => onLike(idea.id)}
            disabled={!canLike || isLiked || isLoading}
            className={`disabled:cursor-not-allowed disabled:opacity-60 ${
              !canLike ? "bg-slate-600 text-slate-100" : ""
            }`}
          >
            {isLiked ? "Déjà intéressé" : "Intéressé"}
          </Button>
        )}
        {!showLogin && !canLike && (
          <p className="text-xs text-slate-400">
            Réservé aux builders.
          </p>
        )}
      </div>
    </Card>
  );
}
