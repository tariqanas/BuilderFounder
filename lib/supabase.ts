import { createClient } from "@supabase/supabase-js";

import type { Idea, IdeaFormData, IdeaWithProfile, Match, Message } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ProfileRole = "idea_person" | "builder";

export type Profile = {
  id: string;
  username: string | null;
  bio: string | null;
  role: ProfileRole | null;
  niches_tags: string[] | null;
  stack_tags: string[] | null;
  created_at: string;
  updated_at: string;
};

export type ProfileUpdate = {
  username?: string;
  bio?: string;
  role?: ProfileRole;
  niches_tags?: string[];
  stack_tags?: string[];
};

export type DashboardIdea = Pick<
  Idea,
  "id" | "title" | "traction" | "status" | "created_at"
>;

export type LikeReceived = {
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

export type DashboardMatch = Match & {
  ideas: {
    id: string;
    title: string;
    user_id: string;
    profiles?: {
      id: string;
      username: string | null;
    } | null;
  } | null;
  builder?: {
    id: string;
    username: string | null;
  } | null;
};

export type SentLike = {
  id: string;
  idea_id: string;
  user_id: string;
  created_at: string;
  ideas: {
    id: string;
    title: string;
    user_id: string;
    profiles: {
      id: string;
      username: string | null;
    } | null;
  } | null;
  matchStatus: "accepted" | "pending";
};

export const getCurrentUserProfile = async () => {
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData.user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data as Profile | null;
};

export const updateProfile = async (profile: ProfileUpdate) => {
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("User not authenticated");
  }

  const payload: Record<string, string | string[] | null> = {
    id: authData.user.id,
    updated_at: new Date().toISOString(),
  };

  if (profile.username !== undefined) payload.username = profile.username;
  if (profile.bio !== undefined) payload.bio = profile.bio;
  if (profile.role !== undefined) payload.role = profile.role;
  if (profile.niches_tags !== undefined)
    payload.niches_tags = profile.niches_tags;
  if (profile.stack_tags !== undefined)
    payload.stack_tags = profile.stack_tags;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Profile;
};

export const createIdea = async (data: IdeaFormData): Promise<void> => {
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("User not authenticated");
  }

  const payload = {
    user_id: authData.user.id,
    title: data.title,
    niche_problem: data.niche_problem,
    traction: data.traction,
    what_i_bring: data.what_i_bring,
    what_i_seek: data.what_i_seek,
    tags: data.tags,
  };

  const { error } = await supabase.from("ideas").insert(payload);

  if (error) {
    throw error;
  }
};

export const getUserIdeas = async (userId: string): Promise<Idea[]> => {
  const { data, error } = await supabase
    .from("ideas")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Idea[];
};

export type IdeaFilters = {
  niche?: string;
  tag?: string;
};

export const getAllIdeas = async (
  limit = 10,
  offset = 0,
  filters: IdeaFilters = {},
): Promise<IdeaWithProfile[]> => {
  let query = supabase
    .from("ideas")
    .select(
      "id, user_id, title, niche_problem, traction, what_i_bring, what_i_seek, tags, status, created_at, updated_at, profiles ( username, bio )",
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.niche) {
    query = query.ilike("niche_problem", `%${filters.niche}%`);
  }

  if (filters.tag) {
    query = query.contains("tags", [filters.tag]);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as IdeaWithProfile[];
};

export const getMyIdeas = async (userId: string): Promise<DashboardIdea[]> => {
  const { data, error } = await supabase
    .from("ideas")
    .select("id, title, traction, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as DashboardIdea[];
};

export const getLikesReceived = async (
  userId: string,
): Promise<LikeReceived[]> => {
  const { data, error } = await supabase
    .from("idea_likes")
    .select(
      "id, idea_id, user_id, created_at, ideas ( id, title, user_id ), profiles ( id, username, bio )",
    )
    .eq("ideas.user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as LikeReceived[];
};

export const getMyMatches = async (
  userId: string,
  role: ProfileRole,
): Promise<DashboardMatch[]> => {
  let query = supabase
    .from("matches")
    .select(
      "id, idea_id, builder_id, status, created_at, updated_at, ideas ( id, title, user_id, profiles ( id, username ) ), builder:profiles ( id, username )",
    )
    .eq("status", "accepted")
    .order("created_at", { ascending: false });

  if (role === "builder") {
    query = query.eq("builder_id", userId);
  } else {
    query = query.eq("ideas.user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as DashboardMatch[];
};

export const getMySentLikes = async (
  userId: string,
): Promise<SentLike[]> => {
  const { data, error } = await supabase
    .from("idea_likes")
    .select(
      "id, idea_id, user_id, created_at, ideas ( id, title, user_id, profiles ( id, username ) )",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const likes = (data ?? []) as Omit<SentLike, "matchStatus">[];
  const ideaIds = likes.map((like) => like.idea_id);

  if (ideaIds.length === 0) {
    return likes.map((like) => ({ ...like, matchStatus: "pending" }));
  }

  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .select("idea_id")
    .eq("builder_id", userId)
    .eq("status", "accepted")
    .in("idea_id", ideaIds);

  if (matchError) {
    throw matchError;
  }

  const matchedIdeas = new Set(
    (matchData ?? []).map((match) => match.idea_id as string),
  );

  return likes.map((like) => ({
    ...like,
    matchStatus: matchedIdeas.has(like.idea_id) ? "accepted" : "pending",
  }));
};

export const checkIfLiked = async (
  ideaId: string,
  userId: string,
): Promise<boolean> => {
  const { data, error } = await supabase
    .from("idea_likes")
    .select("id")
    .eq("idea_id", ideaId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return Boolean(data);
};

export const createLike = async (ideaId: string): Promise<void> => {
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("User not authenticated");
  }

  const payload = {
    idea_id: ideaId,
    user_id: authData.user.id,
  };

  const { error } = await supabase.from("idea_likes").insert(payload);

  if (error) {
    throw error;
  }
};

export const createMatch = async (
  ideaId: string,
  builderId: string,
): Promise<Match> => {
  const { data, error } = await supabase
    .from("matches")
    .insert({ idea_id: ideaId, builder_id: builderId, status: "accepted" })
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Match creation failed");
  }

  return data as Match;
};

export const acceptLike = async (
  ideaId: string,
  builderId: string,
): Promise<Match> => {
  const match = await createMatch(ideaId, builderId);

  const { error } = await supabase
    .from("idea_likes")
    .delete()
    .eq("idea_id", ideaId)
    .eq("user_id", builderId);

  if (error) {
    throw error;
  }

  return match;
};

export const getMessages = async (matchId: string): Promise<Message[]> => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Message[];
};

export const sendMessage = async (
  matchId: string,
  content: string,
): Promise<Message> => {
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      match_id: matchId,
      user_id: authData.user.id,
      content,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Message send failed");
  }

  return data as Message;
};

export const subscribeToMatchUpdates = (
  builderId: string,
  onMatchAccepted: (match: Match) => void,
) =>
  supabase
    .channel(`matches-${builderId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "matches",
        filter: `builder_id=eq.${builderId}`,
      },
      (payload) => {
        onMatchAccepted(payload.new as Match);
      },
    )
    .subscribe();

export const subscribeToMessages = (
  matchId: string,
  onMessage: (message: Message) => void,
) =>
  supabase
    .channel(`messages-${matchId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        onMessage(payload.new as Message);
      },
    )
    .subscribe();
