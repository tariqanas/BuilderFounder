"use client";

import ProfileForm from "@/components/ProfileForm";
import { useProfile } from "@/lib/useProfile";

export default function ProfileEditPage() {
  const { profile, isLoading } = useProfile();

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Profil
        </p>
        <h1 className="text-3xl font-semibold text-white">Edit Profile</h1>
        <p className="text-sm text-slate-300">
          Complète ton profil pour trouver le bon match.
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-slate-400">Chargement...</p>
      ) : (
        <ProfileForm profile={profile} />
      )}
    </section>
  );
}
