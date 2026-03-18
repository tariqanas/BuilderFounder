"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/components/i18n/i18n-provider";

export function SignOutButton() {
  const router = useRouter();
  const { t } = useI18n();
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
      {loading ? t("nav.loggingOut") : t("nav.logout")}
    </button>
  );
}
