"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import IdeaCard from "@/components/IdeaCard";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { playToastSound } from "@/lib/toast-sound";
import {
  checkIfLiked,
  createLike,
  getAllIdeas,
  supabase,
} from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import type { IdeaWithProfile } from "@/types";

const DEFAULT_NICHES = [
  "AI",
  "SaaS",
  "Productivity",
  "B2B",
  "Fintech",
  "Creator",
  "Health",
  "Web3",
];

const DEFAULT_TAGS = [
  "microSaaS",
  "AI",
  "Productivity",
  "B2B",
  "Fintech",
  "Creator",
  "Health",
  "Web3",
];

const PAGE_LIMIT = 10;

export default function FeedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useProfile();
  const [ideas, setIdeas] = useState<IdeaWithProfile[]>([]);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [likeLoadingId, setLikeLoadingId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const nicheParam = searchParams.get("niche") ?? "";
  const tagParam = searchParams.get("tag") ?? "";

  const filterOptions = useMemo(() => {
    const ideaTags = ideas.flatMap((idea) => idea.tags ?? []);
    const uniqueTags = Array.from(new Set([...DEFAULT_TAGS, ...ideaTags]));
    return {
      niches: DEFAULT_NICHES,
      tags: uniqueTags,
    };
  }, [ideas]);

  const loadIdeas = async (offset = 0, append = false) => {
    const data = await getAllIdeas(PAGE_LIMIT, offset, {
      niche: nicheParam || undefined,
      tag: tagParam || undefined,
    });

    if (append) {
      setIdeas((prev) => [...prev, ...data]);
    } else {
      setIdeas(data);
    }

    setHasMore(data.length === PAGE_LIMIT);
    return data;
  };

  useEffect(() => {
    let isMounted = true;

    const fetchIdeas = async () => {
      setIsLoading(true);
      try {
        const data = await loadIdeas();
        if (profile?.role === "builder" && profile.id) {
          const likedEntries = await Promise.all(
            data.map(async (idea) => ({
              id: idea.id,
              liked: await checkIfLiked(idea.id, profile.id),
            })),
          );
          if (isMounted) {
            setLikedMap(
              likedEntries.reduce<Record<string, boolean>>((acc, entry) => {
                acc[entry.id] = entry.liked;
                return acc;
              }, {}),
            );
          }
        } else if (isMounted) {
          setLikedMap({});
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchIdeas();

    return () => {
      isMounted = false;
    };
  }, [nicheParam, tagParam, profile]);

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel("likes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "idea_likes" },
        async (payload) => {
          const ideaId = (payload.new as { idea_id?: string }).idea_id;
          if (!ideaId) return;

          const { data } = await supabase
            .from("ideas")
            .select("title, user_id")
            .eq("id", ideaId)
            .maybeSingle();

          if (data?.user_id === profile.id) {
            toast({
              title: "Nouveau like",
              description: `Un builder est intéressé par ton idée : ${data.title} !`,
            });
            playToastSound();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const handleLike = async (ideaId: string) => {
    if (likeLoadingId || likedMap[ideaId]) return;
    setLikeLoadingId(ideaId);
    try {
      await createLike(ideaId);
      setLikedMap((prev) => ({ ...prev, [ideaId]: true }));
      toast({
        title: "Like envoyé",
        description: "Intéressé notifié !",
      });
      playToastSound();
    } catch (error) {
      console.error(error);
      toast({
        title: "Oops",
        description: "Impossible de liker pour le moment.",
      });
    } finally {
      setLikeLoadingId(null);
    }
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    try {
      const data = await loadIdeas(ideas.length, true);
      if (profile?.role === "builder" && profile.id) {
        const likedEntries = await Promise.all(
          data.map(async (idea) => ({
            id: idea.id,
            liked: await checkIfLiked(idea.id, profile.id),
          })),
        );
        setLikedMap((prev) => ({
          ...prev,
          ...likedEntries.reduce<Record<string, boolean>>((acc, entry) => {
            acc[entry.id] = entry.liked;
            return acc;
          }, {}),
        }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleFilterChange = (key: "niche" | "tag", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const query = params.toString();
    router.push(query ? `/feed?${query}` : "/feed");
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Feed</h1>
        <p className="text-sm text-slate-300">
          Explore les idées actives et manifeste ton intérêt.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="min-w-[200px] flex-1">
          <label className="mb-2 block text-xs font-semibold text-slate-400">
            Niche
          </label>
          <Select
            value={nicheParam}
            onChange={(event) =>
              handleFilterChange("niche", event.target.value)
            }
          >
            <option value="">Toutes les niches</option>
            {filterOptions.niches.map((niche) => (
              <option key={niche} value={niche}>
                {niche}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-2 block text-xs font-semibold text-slate-400">
            Tags
          </label>
          <Select
            value={tagParam}
            onChange={(event) =>
              handleFilterChange("tag", event.target.value)
            }
          >
            <option value="">Tous les tags</option>
            {filterOptions.tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
            >
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-5/6" />
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="mt-4 h-10 w-32" />
            </div>
          ))}
        </div>
      ) : ideas.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          Aucune idée ne correspond à ces filtres pour le moment.
        </div>
      ) : (
        <div className="grid gap-6">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              isLiked={likedMap[idea.id] ?? false}
              isLoading={likeLoadingId === idea.id}
              canLike={profile?.role === "builder"}
              showLogin={!profile}
              onLike={handleLike}
              onLogin={() => router.push("/login")}
            />
          ))}
        </div>
      )}

      {!isLoading && hasMore && (
        <div className="flex justify-center">
          <Button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingMore ? "Chargement..." : "Charger plus"}
          </Button>
        </div>
      )}

    </section>
  );
}
