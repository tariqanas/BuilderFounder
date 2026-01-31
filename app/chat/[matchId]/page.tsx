"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import ChatWindow from "@/components/ChatWindow";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";

type MatchDetails = {
  id: string;
  status: string;
  idea_id: string;
  builder_id: string;
  ideas: {
    title: string;
    user_id: string;
    profiles: {
      username: string | null;
    } | null;
  } | null;
  builder: {
    id: string;
    username: string | null;
  } | null;
};

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;
  const { profile, isLoading } = useProfile();
  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchMatch = async () => {
      setIsFetching(true);
      const { data, error } = await supabase
        .from("matches")
        .select(
          "id, status, idea_id, builder_id, ideas ( title, user_id, profiles ( username ) ), builder:profiles ( id, username )",
        )
        .eq("id", matchId)
        .maybeSingle();

      if (error) {
        console.error(error);
      }

      if (isMounted) {
        setMatch((data as MatchDetails | null) ?? null);
        setIsFetching(false);
      }
    };

    if (matchId) {
      fetchMatch();
    }

    return () => {
      isMounted = false;
    };
  }, [matchId]);

  const isReady = !isLoading && !!profile?.id;
  const isBuilder = profile?.id === match?.builder_id;
  const counterpartName = isBuilder
    ? match?.ideas?.profiles?.username ?? "Idea owner"
    : match?.builder?.username ?? "Builder";

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Chat</h1>
          <p className="text-sm text-slate-300">
            Discutez en temps réel avec votre match.
          </p>
        </div>
        <Button
          onClick={() => router.push("/dashboard")}
          className="border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
        >
          Retour
        </Button>
      </div>

      <Card className="space-y-2">
        {isFetching ? (
          <p className="text-sm text-slate-400">Chargement du match...</p>
        ) : match ? (
          <>
            <p className="text-sm text-slate-400">Idée associée</p>
            <p className="text-lg font-semibold text-white">
              {match.ideas?.title ?? "Idée"}
            </p>
            <p className="text-sm text-slate-300">
              Chat avec <span className="text-emerald-300">{counterpartName}</span>
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-400">
            Match introuvable ou accès non autorisé.
          </p>
        )}
      </Card>

      {isReady && match ? (
        <ChatWindow matchId={match.id} currentUserId={profile.id} />
      ) : (
        <Card>
          <p className="text-sm text-slate-400">
            Connecte-toi pour accéder au chat.
          </p>
        </Card>
      )}
    </section>
  );
}
