import { createClient } from "@supabase/supabase-js";

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
