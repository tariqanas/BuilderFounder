"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ManualScanButtonProps = {
  initialRemaining: number;
  buttonLabel?: string;
  loadingLabel?: string;
};

export function ManualScanButton({
  initialRemaining,
  buttonLabel = "🔄 Manual Scan now",
  loadingLabel = "Scanning...",
}: ManualScanButtonProps) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(initialRemaining);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const triggerScan = async () => {
    if (loading) return;

    setLoading(true);
    setToast(null);

    try {
      const response = await fetch("/api/radar/refresh", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        | { remaining?: unknown; error?: unknown; createdMissions?: unknown }
        | null;

      if (!response.ok) {
        setToast("Limit reached today");
        if (typeof payload?.remaining === "number") {
          setRemaining(payload.remaining);
        }
        return;
      }

      if (typeof payload?.remaining === "number") {
        setRemaining(payload.remaining);
      }

      setToast("New missions loaded");
      router.refresh();
    } catch {
      setToast("Limit reached today");
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 2400);
    }
  };

  return (
    <div className="manual-scan-wrap">
      <button type="button" className="btn" onClick={triggerScan} disabled={loading || remaining <= 0} aria-busy={loading}>
        {loading ? (
          <span className="btn-loading">
            <span className="spinner" aria-hidden="true" />
            {loadingLabel}
          </span>
        ) : (
          buttonLabel
        )}
      </button>
      <p className="muted manual-scan-count">{remaining} manual scans left today</p>
      {toast ? <p className="badge badge-info toast-badge">{toast}</p> : null}
    </div>
  );
}
