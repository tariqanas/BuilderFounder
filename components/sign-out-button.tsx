"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    if (loading) return;
    setLoading(true);

    await fetch("/api/auth/logout", { method: "POST" });

    router.push("/login");
    router.refresh();
  };

  return (
    <button type="button" className="btn" onClick={handleSignOut} disabled={loading}>
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}
