"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import ProfileForm from "@/components/ProfileForm";
import { useProfile } from "@/lib/useProfile";

export default function ProfileSetupPage() {
  const router = useRouter();
  const { profile, isLoading } = useProfile();

  useEffect(() => {
    if (!isLoading && profile?.role) {
      router.replace("/profile");
    }
  }, [isLoading, profile, router]);

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Onboarding
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Configure ton profil
        </h1>
        <p className="text-sm text-slate-300">
          Choisis ton rôle pour commencer à matcher avec la communauté.
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-slate-400">Chargement...</p>
      ) : (
        <ProfileForm mode="setup" profile={profile} />
      )}
    </section>
  );
}
