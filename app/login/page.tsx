"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const ERROR_MAP: Record<string, string> = {
  "Invalid login credentials": "Invalid email or password.",
  "Email not confirmed": "Please confirm your email before signing in.",
  "Email rate limit exceeded": "Too many attempts. Please wait a few minutes.",
};

function getErrorMessage(raw: string | null | undefined) {
  if (!raw) return "Unable to sign in. Please try again.";
  return ERROR_MAP[raw] ?? raw;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <main className="container" style={{ maxWidth: 460, minHeight: "70vh", display: "grid", alignItems: "center" }}>
      <div className="card" style={{ display: "grid", gap: 14, padding: "1.4rem" }}>
        <h1 style={{ marginBottom: 0 }}>IT Sniper access</h1>
        <p className="muted" style={{ margin: 0 }}>
          Private beta. Secure access.
        </p>

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
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Please wait..." : "Sign in"}
          </button>
          <button type="button" className="btn" onClick={() => submit("signup")} disabled={loading}>
            Create account
          </button>
        </form>
      </div>
    </main>
  );
}
