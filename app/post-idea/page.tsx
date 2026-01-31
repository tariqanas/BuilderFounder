"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import IdeaForm from "@/components/IdeaForm";
import { useProfile } from "@/lib/useProfile";

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

export default function PostIdeaPage() {
  const router = useRouter();
  const { profile, isLoading } = useProfile();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!profile) {
      router.replace("/login");
      return;
    }
    if (profile.role !== "idea_person") {
      router.replace("/dashboard");
    }
  }, [isLoading, profile, router]);

  const availableTags = useMemo(() => {
    const profileTags = profile?.niches_tags ?? [];
    return profileTags.length > 0 ? profileTags : DEFAULT_TAGS;
  }, [profile]);

  const handleSuccess = () => {
    setToastMessage("Idée publiée ! Redirection vers le feed...");
    setTimeout(() => {
      router.push("/feed");
    }, 1200);
  };

  if (isLoading || !profile) {
    return (
      <section className="mx-auto w-full max-w-4xl space-y-4">
        <h1 className="text-3xl font-semibold text-white">Post Idea</h1>
        <p className="text-sm text-slate-300">Chargement de ton espace...</p>
      </section>
    );
  }

  if (profile.role !== "idea_person") {
    return (
      <section className="mx-auto w-full max-w-4xl space-y-4">
        <h1 className="text-3xl font-semibold text-white">Post Idea</h1>
        <p className="text-sm text-slate-300">
          Cette page est réservée aux Idea Persons.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Post Idea</h1>
        <p className="text-sm text-slate-300">
          Partage ton idée et trouve un builder aligné.
        </p>
      </div>

      <IdeaForm availableTags={availableTags} onSuccess={handleSuccess} />

      {toastMessage && (
        <div className="fixed bottom-6 right-6 rounded-2xl border border-emerald-400/40 bg-slate-900/90 px-4 py-3 text-sm text-emerald-200 shadow-lg">
          {toastMessage}
        </div>
      )}
    </section>
  );
}
