"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardSections from "@/components/DashboardSections";
import ProfileCard from "@/components/ProfileCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/components/ui/use-toast";
import {
  acceptLike,
  getLikesReceived,
  getMyIdeas,
  getMyMatches,
  getMySentLikes,
  supabase,
} from "@/lib/supabase";
import { playToastSound } from "@/lib/toast-sound";
import { useProfile } from "@/lib/useProfile";
import type {
  DashboardIdea,
  DashboardMatch,
  LikeReceived,
  SentLike,
} from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const { profile, isLoading } = useProfile();
  const [myIdeas, setMyIdeas] = useState<DashboardIdea[]>([]);
  const [likesReceived, setLikesReceived] = useState<LikeReceived[]>([]);
  const [matches, setMatches] = useState<DashboardMatch[]>([]);
  const [sentLikes, setSentLikes] = useState<SentLike[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !profile) {
      router.replace("/login");
    } else if (!isLoading && profile && !profile.role) {
      router.replace("/profile/setup");
    }
  }, [isLoading, profile, router]);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboard = async () => {
      if (!profile?.id || !profile.role) return;
      setIsFetching(true);
      try {
        const [ideas, likes, matchesData, sent] = await Promise.all([
          getMyIdeas(profile.id),
          profile.role === "idea_person"
            ? getLikesReceived(profile.id)
            : Promise.resolve([]),
          getMyMatches(profile.id, profile.role),
          profile.role === "builder"
            ? getMySentLikes(profile.id)
            : Promise.resolve([]),
        ]);

        if (isMounted) {
          setMyIdeas(ideas);
          setLikesReceived(likes);
          setMatches(matchesData);
          setSentLikes(sent);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) {
          setIsFetching(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      isMounted = false;
    };
  }, [profile]);

  useEffect(() => {
    if (!profile?.id || !profile.role) return;

    const likeChannel = supabase
      .channel(`dashboard-likes-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "idea_likes" },
        async (payload) => {
          const ideaId = (payload.new as { idea_id?: string }).idea_id;
          if (!ideaId || profile.role !== "idea_person") return;

          const { data } = await supabase
            .from("ideas")
            .select("title, user_id")
            .eq("id", ideaId)
            .maybeSingle();

          if (data?.user_id === profile.id) {
            const likes = await getLikesReceived(profile.id);
            setLikesReceived(likes);
            toast({
              title: "Nouveau like",
              description: `Nouveau like sur ${data.title}`,
            });
            playToastSound();
          }
        },
      )
      .subscribe();

    const matchChannel = supabase
      .channel(`dashboard-matches-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches" },
        async (payload) => {
          const match = payload.new as DashboardMatch;
          if (profile.role === "builder") {
            if (match.builder_id !== profile.id) return;
            const matchesData = await getMyMatches(profile.id, profile.role);
            setMatches(matchesData);
            toast({
              title: "Match confirmé",
              description: "Ton like a été accepté ! Ouvre le chat.",
              action: (
                <ToastAction
                  altText="Ouvrir le chat"
                  onClick={() => router.push(`/chat/${match.id}`)}
                >
                  Ouvrir le chat
                </ToastAction>
              ),
            });
            playToastSound();
            return;
          }

          const { data } = await supabase
            .from("ideas")
            .select("user_id")
            .eq("id", match.idea_id)
            .maybeSingle();

          if (data?.user_id === profile.id) {
            const matchesData = await getMyMatches(profile.id, profile.role);
            setMatches(matchesData);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likeChannel);
      supabase.removeChannel(matchChannel);
    };
  }, [profile]);

  const handleAccept = async (like: LikeReceived) => {
    if (!like.ideas?.id || !like.profiles?.id) return;
    setActionLoading(like.id);
    try {
      const match = await acceptLike(like.ideas.id, like.profiles.id);
      setLikesReceived((prev) => prev.filter((item) => item.id !== like.id));
      toast({
        title: "Match créé",
        description: "Match créé ! Chat ouvert.",
      });
      playToastSound();
      router.push(`/chat/${match.id}`);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le match pour le moment.",
      });
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
      toast({
        title: "Like ignoré",
        description: "Like ignoré.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible d'ignorer ce like.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const notifications = useMemo(() => {
    const likeNotifications = likesReceived.map((like) => ({
      id: `like-${like.id}`,
      type: "like" as const,
      created_at: like.created_at,
      message: `${like.profiles?.username ?? "Un builder"} a liké ${
        like.ideas?.title ?? "ton idée"
      }.`,
    }));
    const matchNotifications = matches.map((match) => ({
      id: `match-${match.id}`,
      type: "match" as const,
      created_at: match.created_at,
      message: `Match confirmé sur ${
        match.ideas?.title ?? "une idée"
      }.`,
    }));

    return [...likeNotifications, ...matchNotifications]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 6);
  }, [likesReceived, matches]);

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-slate-300">
          Espace protégé pour piloter tes idées, likes et matches.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </div>
      ) : (
        <ProfileCard profile={profile} />
      )}

      {profile?.role &&
        (isFetching ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`dashboard-skeleton-${index}`}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
              >
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-4 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-5/6" />
                <Skeleton className="mt-4 h-8 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <DashboardSections
            role={profile.role}
            myIdeas={myIdeas}
            likesReceived={likesReceived}
            matches={matches}
            sentLikes={sentLikes}
            notifications={notifications}
            onAccept={handleAccept}
            onIgnore={handleIgnore}
            actionLoadingId={actionLoading}
          />
        ))}

      {isFetching && (
        <p className="text-xs text-slate-500">Mise à jour du dashboard...</p>
      )}
    </section>
  );
}
