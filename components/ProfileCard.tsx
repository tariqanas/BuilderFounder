import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Profile } from "@/lib/supabase";

const formatRole = (role: Profile["role"]) => {
  if (role === "idea_person") return "Idea Person";
  if (role === "builder") return "Builder";
  return "Non défini";
};

type ProfileCardProps = {
  profile: Profile | null;
};

export default function ProfileCard({ profile }: ProfileCardProps) {
  if (!profile) {
    return (
      <Card className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-emerald-300">
            Profil introuvable
          </p>
          <p className="text-sm text-slate-300">
            Crée ton profil pour accéder au réseau BuilderFounder.
          </p>
        </div>
        <Link
          href="/profile/setup"
          className="inline-flex w-full items-center justify-center rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 sm:w-auto"
        >
          Créer mon profil
        </Link>
      </Card>
    );
  }

  const tags = profile.role === "builder" ? profile.stack_tags : profile.niches_tags;

  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Profil
          </p>
          <h2 className="text-2xl font-semibold text-white">
            {profile.username || "Sans pseudo"}
          </h2>
        </div>
        <p className="text-sm text-slate-300">
          {profile.bio || "Ajoute une bio pour présenter ton projet."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge>{formatRole(profile.role)}</Badge>
        {tags?.length
          ? tags.map((tag) => <Badge key={tag}>{tag}</Badge>)
          : null}
      </div>

      <Link
        href="/profile/edit"
        className="inline-flex w-full items-center justify-center rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 sm:w-auto"
      >
        Edit Profile
      </Link>
    </Card>
  );
}
