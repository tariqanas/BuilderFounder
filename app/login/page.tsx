"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";

const ERROR_MAP: Record<string, string> = {
  "Invalid login credentials": "Invalid email or password.",
  "Email not confirmed": "Please confirm your email before signing in.",
  "Email rate limit exceeded": "Too many attempts. Please wait a few minutes.",
};

function getErrorMessage(raw: string | null | undefined) {
  if (!raw) return "Unable to sign in. Please try again.";
  return ERROR_MAP[raw] ?? raw;
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.9 2.4 2.8 6.5 2.8 11.6S6.9 20.8 12 20.8c6.9 0 8.6-4.8 8.6-7.3 0-.5-.1-.9-.1-1.3H12Z"
      />
      <path fill="#34A853" d="M3.7 7.9l3.2 2.3c.8-2.4 2.8-4.1 5.1-4.1 1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4c-3.7 0-6.9 2.1-8.3 5.5Z" />
      <path fill="#4A90E2" d="M12 20.8c2.5 0 4.6-.8 6.1-2.3l-2.8-2.3c-.8.6-1.8 1-3.3 1-3.9 0-5.1-2.6-5.4-3.9l-3.1 2.4c1.4 3.4 4.6 5.1 8.5 5.1Z" />
      <path fill="#FBBC05" d="M3.7 15.7c-.3-.9-.5-1.9-.5-2.9s.2-2 .5-2.9l3.2 2.3a6.6 6.6 0 0 0 0 1.3l-3.2 2.3Z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const submit = async (mode: "login" | "signup") => {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(getErrorMessage(data.error));
      return;
    }

    router.push("/app");
    router.refresh();
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submit("login");
  };

  const onGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (oauthError) {
      setGoogleLoading(false);
      setError(getErrorMessage(oauthError.message));
    }
  };

  return (
    <main className="container" style={{ maxWidth: 460, minHeight: "70vh", display: "grid", alignItems: "center" }}>
      <div className="card" style={{ display: "grid", gap: 14, padding: "1.4rem" }}>
        <h1 style={{ marginBottom: 0 }}>IT Sniper access</h1>
        <p className="muted" style={{ margin: 0 }}>
          Private beta. Secure access.
        </p>

        <button
          type="button"
          className="btn"
          onClick={onGoogleSignIn}
          disabled={loading || googleLoading}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <GoogleIcon />
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </button>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </div>
          {error && <p style={{ color: "#ff8a8a", margin: 0 }}>{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading || googleLoading}>
            {loading ? "Please wait..." : "Sign in"}
          </button>
          <button type="button" className="btn" onClick={() => submit("signup")} disabled={loading || googleLoading}>
            Create account
          </button>
        </form>
      </div>
    </main>
  );
}
