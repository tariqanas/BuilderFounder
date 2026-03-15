"use client";

import { useState } from "react";

type NotificationsToggleProps = {
  initialEnabled: boolean;
};

export function NotificationsToggle({ initialEnabled }: NotificationsToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onToggle = async () => {
    if (saving) return;

    const nextValue = !enabled;
    setEnabled(nextValue);
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationsEnabled: nextValue }),
      });

      if (!response.ok) {
        setEnabled(!nextValue);
        setError("Unable to save your notification preference.");
      }
    } catch {
      setEnabled(!nextValue);
      setError("Unable to save your notification preference.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="notifications-toggle-wrap">
      <button
        type="button"
        className="notifications-toggle"
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle notifications"
        onClick={onToggle}
        disabled={saving}
      >
        <span className="notifications-toggle-track" data-enabled={enabled} data-saving={saving}>
          <span className="notifications-toggle-thumb" data-enabled={enabled} />
        </span>
        <span className="notifications-toggle-label">{enabled ? "ON" : "OFF"}</span>
      </button>
      {error && <p className="muted notifications-toggle-error">{error}</p>}
    </div>
  );
}
