"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import ProfileCard from "@/components/ProfileCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  acceptLike,
  subscribeToMatchUpdates,
  supabase,
} from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";

type LikeReceived = {
  id: string;
  idea_id: string;
  user_id: string;
  created_at: string;
  ideas: {
    id: string;
    title: string;
    user_id: string;
  } | null;
  profiles: {
    id: string;
    username: string | null;
    bio: string | null;
  } | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const { profile, isLoading } = useProfile();
  const [likesReceived, setLikesReceived] = useState<LikeReceived[]>([]);
  const [likesLoading, setLikesLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [matchToast, setMatchToast] = useState<{
    message: string;
    matchId: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && profile && !profile.role) {
      router.replace("/profile/setup");
    }
  }, [isLoading, profile, router]);

  useEffect(() => {
    if (!profile?.id || profile.role !== "idea_person") return;
    let isMounted = true;

    const fetchLikes = async () => {
      setLikesLoading(true);
      const { data, error } = await supabase
        .from("idea_likes")
        .select(
          "id, idea_id, user_id, created_at, ideas ( id, title, user_id ), profiles ( id, username, bio )",
        )
        .eq("ideas.user_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
      }

      if (isMounted) {
        setLikesReceived((data as LikeReceived[]) ?? []);
        setLikesLoading(false);
      }
    };

    fetchLikes();

    return () => {
      isMounted = false;
    };
  }, [profile]);

  useEffect(() => {
    if (!profile?.id || profile.role !== "builder") return;

    const channel = subscribeToMatchUpdates(profile.id, (match) => {
      setMatchToast({
        message: "Ton like a été accepté ! Ouvre le chat.",
        matchId: match.id,
      });
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const handleAccept = async (like: LikeReceived) => {
    if (!like.ideas?.id || !like.profiles?.id) return;
    setActionLoading(like.id);
    try {
      const match = await acceptLike(like.ideas.id, like.profiles.id);
      setLikesReceived((prev) => prev.filter((item) => item.id !== like.id));
      setToastMessage("Match créé ! Chat ouvert.");
      router.push(`/chat/${match.id}`);
    } catch (error) {
      console.error(error);
      setToastMessage("Impossible de créer le match pour le moment.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleIgnore = async (like: LikeReceived) => {
    setActionLoading(like.id);
    try {
      const { error } = await supabase
        .from("idea_likes")
        .delete()
        .eq("id", like.id);

      if (error) {
        throw error;
      }

      setLikesReceived((prev) => prev.filter((item) => item.id !== like.id));
      setToastMessage("Like ignoré.");
    } catch (error) {
      console.error(error);
      setToastMessage("Impossible d'ignorer ce like.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-slate-300">
          Espace protégé. Contenu à venir pour le MVP.
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-slate-400">Chargement...</p>
      ) : (
        <ProfileCard profile={profile} />
      )}

      {profile?.role === "idea_person" && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Likes reçus</h2>
            <p className="text-sm text-slate-400">
              Builders intéressés par tes idées.
            </p>
          </div>
          {likesLoading ? (
            <p className="text-sm text-slate-400">Chargement des likes...</p>
          ) : likesReceived.length === 0 ? (
            <p className="text-sm text-slate-400">
              Aucun like reçu pour le moment.
            </p>
          ) : (
            <div className="space-y-4">
              {likesReceived.map((like) => (
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
                      {new Date(like.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      onClick={() => handleAccept(like)}
                      disabled={actionLoading === like.id}
                    >
                      Accepter
                    </Button>
                    <Button
                      onClick={() => handleIgnore(like)}
                      disabled={actionLoading === like.id}
                      className="border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
                    >
                      Ignorer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 max-w-xs rounded-2xl border border-emerald-400/40 bg-slate-900/90 px-4 py-3 text-sm text-emerald-200 shadow-lg">
          {toastMessage}
        </div>
      )}

      {matchToast && (
        <div className="fixed bottom-24 right-6 max-w-xs rounded-2xl border border-emerald-400/40 bg-slate-900/90 px-4 py-3 text-sm text-emerald-200 shadow-lg">
          <p>{matchToast.message}</p>
          <Button
            className="mt-3 w-full"
            onClick={() => router.push(`/chat/${matchToast.matchId}`)}
          >
            Ouvrir le chat
          </Button>
        </div>
      )}
    </section>
  );
}
