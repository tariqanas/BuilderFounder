"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  DashboardIdea,
  DashboardMatch,
  LikeReceived,
  SentLike,
} from "@/lib/supabase";

type NotificationItem = {
  id: string;
  message: string;
  created_at: string;
  type: "like" | "match";
};

type DashboardSectionsProps = {
  role: "idea_person" | "builder";
  myIdeas: DashboardIdea[];
  likesReceived: LikeReceived[];
  matches: DashboardMatch[];
  sentLikes: SentLike[];
  notifications: NotificationItem[];
  onAccept: (like: LikeReceived) => void;
  onIgnore: (like: LikeReceived) => void;
  actionLoadingId: string | null;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const IdeaList = ({ ideas }: { ideas: DashboardIdea[] }) => {
  if (!ideas.length) {
    return (
      <p className="text-sm text-slate-400">
        Poste ta première idée pour commencer à matcher !
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {ideas.map((idea) => (
        <div
          key={idea.id}
          className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">{idea.title}</p>
            <Badge className="capitalize">{idea.status}</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Traction: {idea.traction || "En cours"}
          </p>
          <p className="text-xs text-slate-500">
            Publiée le {formatDate(idea.created_at)}
          </p>
        </div>
      ))}
    </div>
  );
};

const LikesReceivedList = ({
  likes,
  onAccept,
  onIgnore,
  actionLoadingId,
}: {
  likes: LikeReceived[];
  onAccept: (like: LikeReceived) => void;
  onIgnore: (like: LikeReceived) => void;
  actionLoadingId: string | null;
}) => {
  if (!likes.length) {
    return (
      <p className="text-sm text-slate-400">
        Tes likes reçus apparaîtront ici.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {likes.map((like) => (
        <div
          key={like.id}
          className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">
              {like.profiles?.username ?? "Builder anonyme"}
            </p>
            <p className="text-xs text-slate-400">
              {like.profiles?.bio ?? "Bio à compléter."}
            </p>
            <p className="text-xs text-slate-500">
              Pour l&apos;idée : {like.ideas?.title ?? "Idée"}
            </p>
            <p className="text-xs text-slate-500">
              {formatDate(like.created_at)}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => onAccept(like)}
              disabled={actionLoadingId === like.id}
            >
              Accepter
            </Button>
            <Button
              onClick={() => onIgnore(like)}
              disabled={actionLoadingId === like.id}
              className="border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
            >
              Ignorer
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

const MatchesList = ({ matches }: { matches: DashboardMatch[] }) => {
  if (!matches.length) {
    return (
      <p className="text-sm text-slate-400">
        Tes matches apparaîtront ici dès qu&apos;ils sont acceptés.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => {
        const builderName =
          match.builder?.username ??
          match.ideas?.profiles?.username ??
          "Builder";
        return (
          <div
            key={match.id}
            className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">{builderName}</p>
              <p className="text-xs text-slate-400">
                Idée : {match.ideas?.title ?? "Idée"}
              </p>
              <p className="text-xs text-slate-500">
                Match le {formatDate(match.created_at)}
              </p>
            </div>
            <Button asChild>
              <Link href={`/chat/${match.id}`}>Ouvrir le chat</Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
};

const SentLikesList = ({ likes }: { likes: SentLike[] }) => {
  if (!likes.length) {
    return (
      <p className="text-sm text-slate-400">
        Like des idées dans le feed pour démarrer des discussions.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {likes.map((like) => (
        <div
          key={like.id}
          className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">
              {like.ideas?.title ?? "Idée"}
            </p>
            <Badge
              className={
                like.matchStatus === "accepted"
                  ? "bg-emerald-500/20 text-emerald-200"
                  : "bg-slate-800 text-slate-300"
              }
            >
              {like.matchStatus === "accepted" ? "Matché" : "En attente"}
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Idea owner : {like.ideas?.profiles?.username ?? "Anonyme"}
          </p>
          <p className="text-xs text-slate-500">
            Like le {formatDate(like.created_at)}
          </p>
        </div>
      ))}
    </div>
  );
};

const NotificationsList = ({
  notifications,
}: {
  notifications: NotificationItem[];
}) => {
  if (!notifications.length) {
    return (
      <p className="text-sm text-slate-400">
        Aucun signal récent. Garde un oeil sur cette section !
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="flex flex-col gap-1 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
        >
          <p className="text-sm text-white">{notification.message}</p>
          <p className="text-xs text-slate-500">
            {formatDate(notification.created_at)}
          </p>
        </div>
      ))}
    </div>
  );
};

export default function DashboardSections({
  role,
  myIdeas,
  likesReceived,
  matches,
  sentLikes,
  notifications,
  onAccept,
  onIgnore,
  actionLoadingId,
}: DashboardSectionsProps) {
  const [activeTab, setActiveTab] = useState("ideas");

  const sections = useMemo(() => {
    const baseSections = [
      {
        key: "ideas",
        label: "Mes idées",
        content: <IdeaList ideas={myIdeas} />,
      },
      ...(role === "idea_person"
        ? [
            {
              key: "likes",
              label: "Likes reçus",
              content: (
                <LikesReceivedList
                  likes={likesReceived}
                  onAccept={onAccept}
                  onIgnore={onIgnore}
                  actionLoadingId={actionLoadingId}
                />
              ),
            },
          ]
        : []),
      ...(role === "builder"
        ? [
            {
              key: "sent-likes",
              label: "Likes envoyés",
              content: <SentLikesList likes={sentLikes} />,
            },
          ]
        : []),
      {
        key: "matches",
        label: "Mes matches",
        content: <MatchesList matches={matches} />,
      },
      {
        key: "notifications",
        label: "Notifications",
        content: <NotificationsList notifications={notifications} />,
      },
    ];

    return baseSections;
  }, [
    actionLoadingId,
    likesReceived,
    matches,
    myIdeas,
    notifications,
    onAccept,
    onIgnore,
    role,
    sentLikes,
  ]);

  const activeSection =
    sections.find((section) => section.key === activeTab) ?? sections[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Tes sections clés
          </h2>
          <p className="text-sm text-slate-400">
            Suis l&apos;activité de tes idées et de tes matches en temps réel.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/post-idea">Poster une nouvelle idée</Link>
          </Button>
          <Button
            asChild
            className="border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
          >
            <Link href="/feed">Voir le feed</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sections.map((section) => (
            <Button
              key={section.key}
              onClick={() => setActiveTab(section.key)}
              className={
                activeTab === section.key
                  ? ""
                  : "border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
              }
            >
              {section.label}
            </Button>
          ))}
        </div>
        <Card>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">
              {activeSection.label}
            </h3>
            {activeSection.content}
          </div>
        </Card>
      </div>

      <div className="hidden grid-cols-1 gap-4 md:grid md:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.key} className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-white">
                {section.label}
              </h3>
            </div>
            {section.content}
          </Card>
        ))}
      </div>
    </div>
  );
}
