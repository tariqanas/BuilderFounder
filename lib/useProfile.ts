"use client";

import useSWR from "swr";

import { getCurrentUserProfile } from "@/lib/supabase";

export const useProfile = () => {
  const { data, error, isLoading, mutate } = useSWR(
    "current-profile",
    getCurrentUserProfile,
  );

  return {
    profile: data,
    error,
    isLoading,
    mutate,
  };
};
