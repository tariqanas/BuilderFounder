"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;

    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (!profile?.role) {
        router.push("/profile/setup");
        return;
      }
    }

    const redirectTo = searchParams.get("redirect") ?? "/dashboard";
    router.push(redirectTo);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (googleError) {
      setError(googleError.message);
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Connexion
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Content de te revoir 👋
        </h1>
      </div>

      <Card>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="hello@builderfounder.co"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button className="w-full sm:w-auto" disabled={loading} type="submit">
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
            <Button
              className="w-full border border-slate-700 bg-transparent text-white hover:border-slate-500 hover:bg-slate-900 sm:w-auto"
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              Continuer avec Google
            </Button>
          </div>
        </form>
      </Card>

      <p className="text-sm text-slate-400">
        Pas encore de compte ?{" "}
        <Link className="text-emerald-300 hover:text-emerald-200" href="/signup">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
