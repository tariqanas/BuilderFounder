"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import ProfileCard from "@/components/ProfileCard";
import { useProfile } from "@/lib/useProfile";

export default function ProfilePage() {
  const router = useRouter();
  const { profile, isLoading } = useProfile();

  useEffect(() => {
    if (!isLoading && profile && !profile.role) {
      router.replace("/profile/setup");
    }
  }, [isLoading, profile, router]);

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Profil
        </p>
        <h1 className="text-3xl font-semibold text-white">Mon profil</h1>
      </div>
      {isLoading ? (
        <p className="text-sm text-slate-400">Chargement...</p>
      ) : (
        <ProfileCard profile={profile} />
      )}
    </section>
  );
}
