import { getAccessToken } from "@/lib/server-auth";
import { createSupabaseUserServerClient } from "@/lib/supabase";

export function createSupabaseServerClient() {
  const token = getAccessToken();
  if (!token) {
    throw new Error("No auth token found");
  }
  return createSupabaseUserServerClient(token);
}
