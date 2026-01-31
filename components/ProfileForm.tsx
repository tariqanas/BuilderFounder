"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase, updateProfile, type Profile } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";

const NICHE_OPTIONS = [
  "microSaaS",
  "AI",
  "Productivity",
  "B2B",
  "Fintech",
  "Creator",
  "Health",
  "Web3",
];

const STACK_OPTIONS = [
  "Next.js",
  "React",
  "Python",
  "No-code",
  "React Native",
  "Node.js",
  "Supabase",
  "Flutter",
];

const MAX_BIO_LENGTH = 150;

type ProfileFormProps = {
  mode?: "edit" | "setup";
  profile: Profile | null;
};

const toggleTag = (tag: string, current: string[]) => {
  if (current.includes(tag)) {
    return current.filter((item) => item !== tag);
  }
  return [...current, tag];
};

export default function ProfileForm({ mode = "edit", profile }: ProfileFormProps) {
  const router = useRouter();
  const { mutate } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: profile?.username ?? "",
    bio: profile?.bio ?? "",
    role: profile?.role ?? "",
    nichesTags: profile?.niches_tags ?? [],
    stackTags: profile?.stack_tags ?? [],
  });

  const roleLocked = Boolean(profile?.role);

  useEffect(() => {
    setForm({
      username: profile?.username ?? "",
      bio: profile?.bio ?? "",
      role: profile?.role ?? "",
      nichesTags: profile?.niches_tags ?? [],
      stackTags: profile?.stack_tags ?? [],
    });
  }, [profile]);

  const remainingBio = useMemo(
    () => MAX_BIO_LENGTH - form.bio.length,
    [form.bio.length],
  );

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    if (name === "bio" && value.length > MAX_BIO_LENGTH) return;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleSelect = (role: Profile["role"]) => {
    if (roleLocked) return;
    setForm((prev) => ({ ...prev, role: role ?? "" }));
  };

  const handleTagToggle = (tag: string, type: "niche" | "stack") => {
    setForm((prev) => ({
      ...prev,
      nichesTags: type === "niche" ? toggleTag(tag, prev.nichesTags) : prev.nichesTags,
      stackTags: type === "stack" ? toggleTag(tag, prev.stackTags) : prev.stackTags,
    }));
  };

  const checkUsernameUnique = async () => {
    if (!form.username.trim()) {
      setUsernameError("Le pseudo est requis.");
      return false;
    }

    if (profile?.username === form.username.trim()) {
      setUsernameError(null);
      return true;
    }

    const { data, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", form.username.trim())
      .limit(1);

    if (checkError) {
      setUsernameError("Impossible de vérifier le pseudo pour le moment.");
      return false;
    }

    if (data && data.length > 0 && data[0].id !== profile?.id) {
      setUsernameError("Ce pseudo est déjà utilisé.");
      return false;
    }

    setUsernameError(null);
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.role) {
      setError("Choisis un rôle pour continuer.");
      return;
    }

    if (!form.username.trim()) {
      setError("Le pseudo est requis.");
      return;
    }

    const isUsernameValid = await checkUsernameUnique();
    if (!isUsernameValid || usernameError) {
      setError(usernameError ?? "Pseudo indisponible.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        username: form.username.trim(),
        bio: form.bio.trim(),
        role: form.role as Profile["role"],
        niches_tags: form.nichesTags,
        stack_tags: form.stackTags,
      };

      await updateProfile(payload);
      await mutate();
      router.push("/profile");
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Erreur lors de la mise à jour du profil.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showNiches = form.role === "idea_person";
  const showStack = form.role === "builder";

  return (
    <Card>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="username">Pseudo</Label>
          <Input
            id="username"
            name="username"
            value={form.username}
            onChange={handleChange}
            onBlur={checkUsernameUnique}
            placeholder="ex: buildwithalex"
            required
          />
          {usernameError && (
            <p className="text-xs text-red-300">{usernameError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            name="bio"
            value={form.bio}
            onChange={handleChange}
            placeholder="Explique en une phrase ce que tu construis."
            maxLength={MAX_BIO_LENGTH}
          />
          <p className="text-xs text-slate-400">
            {remainingBio} caractères restants
          </p>
        </div>

        <div className="space-y-3">
          <Label>Rôle</Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            {(["idea_person", "builder"] as Profile["role"][]).map((role) => (
              <button
                key={role}
                type="button"
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  form.role === role
                    ? "border-emerald-400/80 bg-emerald-400/10 text-emerald-100"
                    : "border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-500"
                } ${roleLocked ? "cursor-not-allowed opacity-60" : ""}`}
                onClick={() => handleRoleSelect(role)}
                disabled={roleLocked}
              >
                <p className="text-sm font-semibold">
                  {role === "idea_person" ? "Idea Person" : "Builder"}
                </p>
                <p className="text-xs text-slate-400">
                  {role === "idea_person"
                    ? "Je cherche un builder pour lancer mon idée."
                    : "Je construis avec un stack spécifique."}
                </p>
              </button>
            ))}
          </div>
          {roleLocked && (
            <p className="text-xs text-slate-400">
              Le rôle est verrouillé après la première sélection pour le MVP.
            </p>
          )}
        </div>

        {showNiches && (
          <div className="space-y-3">
            <Label>Tags niches</Label>
            <div className="flex flex-wrap gap-2">
              {NICHE_OPTIONS.map((tag) => {
                const isSelected = form.nichesTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                      isSelected
                        ? "border-emerald-400/80 bg-emerald-400/10 text-emerald-100"
                        : "border-slate-700 text-slate-300 hover:border-slate-500"
                    }`}
                    onClick={() => handleTagToggle(tag, "niche")}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {showStack && (
          <div className="space-y-3">
            <Label>Stack</Label>
            <div className="flex flex-wrap gap-2">
              {STACK_OPTIONS.map((tag) => {
                const isSelected = form.stackTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                      isSelected
                        ? "border-emerald-400/80 bg-emerald-400/10 text-emerald-100"
                        : "border-slate-700 text-slate-300 hover:border-slate-500"
                    }`}
                    onClick={() => handleTagToggle(tag, "stack")}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Sauvegarde..."
              : mode === "setup"
                ? "Enregistrer mon profil"
                : "Enregistrer"}
          </Button>
          <Button
            type="button"
            className="border border-slate-700 bg-transparent text-white hover:border-slate-500 hover:bg-slate-900"
            onClick={() => router.push("/profile")}
          >
            Annuler
          </Button>
        </div>
      </form>
    </Card>
  );
}
