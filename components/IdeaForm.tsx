"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createIdea } from "@/lib/supabase";
import type { IdeaFormData } from "@/types";

const REQUIRED_FIELDS: Array<keyof IdeaFormData> = [
  "title",
  "niche_problem",
  "what_i_bring",
  "what_i_seek",
];

type IdeaFormProps = {
  availableTags: string[];
  onSuccess?: () => void;
};

const toggleTag = (tag: string, tags: string[]) => {
  if (tags.includes(tag)) {
    return tags.filter((item) => item !== tag);
  }
  return [...tags, tag];
};

export default function IdeaForm({ availableTags, onSuccess }: IdeaFormProps) {
  const [form, setForm] = useState<IdeaFormData>({
    title: "",
    niche_problem: "",
    traction: "",
    what_i_bring: "",
    what_i_seek: "",
    tags: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableTagOptions = useMemo(
    () => Array.from(new Set(availableTags.map((tag) => tag.trim()).filter(Boolean))),
    [availableTags],
  );

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagToggle = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: toggleTag(tag, prev.tags) }));
  };

  const validateForm = () => {
    for (const field of REQUIRED_FIELDS) {
      if (!form[field].trim()) {
        return "Merci de compléter tous les champs requis.";
      }
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      await createIdea({
        title: form.title.trim(),
        niche_problem: form.niche_problem.trim(),
        traction: form.traction.trim(),
        what_i_bring: form.what_i_bring.trim(),
        what_i_seek: form.what_i_seek.trim(),
        tags: form.tags,
      });
      setForm({
        title: "",
        niche_problem: "",
        traction: "",
        what_i_bring: "",
        what_i_seek: "",
        tags: [],
      });
      onSuccess?.();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Impossible de poster l'idée pour le moment.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="title">Titre</Label>
          <Input
            id="title"
            name="title"
            placeholder="ex: CRM minimaliste pour freelances"
            value={form.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="niche_problem">Problème / niche</Label>
          <Textarea
            id="niche_problem"
            name="niche_problem"
            placeholder="Décris le problème précis que tu veux résoudre"
            rows={4}
            value={form.niche_problem}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="traction">Traction (optionnel)</Label>
          <Input
            id="traction"
            name="traction"
            placeholder="ex: 450 waitlist, 0"
            value={form.traction}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="what_i_bring">Ce que j'apporte</Label>
          <Textarea
            id="what_i_bring"
            name="what_i_bring"
            placeholder="Vision, domaine, communauté, etc."
            rows={3}
            value={form.what_i_bring}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="what_i_seek">Ce que je cherche</Label>
          <Textarea
            id="what_i_seek"
            name="what_i_seek"
            placeholder="ex: co-founder 50/50 equity"
            rows={3}
            value={form.what_i_seek}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-3">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2">
            {availableTagOptions.map((tag) => {
              const isSelected = form.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    isSelected
                      ? "border-emerald-300 bg-emerald-400/10 text-emerald-200"
                      : "border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          {form.tags.length > 0 && (
            <p className="text-xs text-slate-400">
              {form.tags.length} tag{form.tags.length > 1 ? "s" : ""} sélectionné
              {form.tags.length > 1 ? "s" : ""}.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            Les champs marqués comme requis sont indispensables pour publier.
          </p>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Publication..." : "Post Idea"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
