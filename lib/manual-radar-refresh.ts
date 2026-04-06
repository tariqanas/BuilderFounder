import { createSupabaseServiceClient } from "@/lib/supabase";

const DAILY_REFRESH_LIMIT = 3;
const WINDOW_MS = 24 * 60 * 60 * 1000;

function refreshKey(userId: string) {
  return `manual_radar_refresh:${userId}`;
}

function parseTimestamps(value: string | null | undefined) {
  if (!value) return [] as string[];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry): entry is string => typeof entry === "string")
      .filter((entry) => Number.isFinite(new Date(entry).getTime()));
  } catch {
    return [];
  }
}

function withinWindow(timestamps: string[], nowMs: number) {
  return timestamps.filter((timestamp) => {
    const timestampMs = new Date(timestamp).getTime();
    return nowMs - timestampMs < WINDOW_MS;
  });
}

async function loadRecentRefreshes(userId: string) {
  const service = createSupabaseServiceClient();
  const key = refreshKey(userId);

  const { data, error } = await service.from("system_state").select("value").eq("key", key).maybeSingle();
  if (error) {
    throw new Error(`manual_refresh_load_failed code=${error.code ?? "n/a"}`);
  }

  const nowMs = Date.now();
  const parsed = parseTimestamps(data?.value);
  const recent = withinWindow(parsed, nowMs);

  if (recent.length !== parsed.length) {
    const { error: upsertError } = await service.from("system_state").upsert(
      {
        key,
        value: JSON.stringify(recent),
      },
      { onConflict: "key" }
    );

    if (upsertError) {
      throw new Error(`manual_refresh_prune_failed code=${upsertError.code ?? "n/a"}`);
    }
  }

  return recent;
}

export async function getManualRefreshStatus(userId: string) {
  const recent = await loadRecentRefreshes(userId);
  const used = recent.length;

  return {
    used,
    remaining: Math.max(0, DAILY_REFRESH_LIMIT - used),
    limit: DAILY_REFRESH_LIMIT,
  };
}

export async function consumeManualRefresh(userId: string) {
  const service = createSupabaseServiceClient();
  const key = refreshKey(userId);
  const recent = await loadRecentRefreshes(userId);

  if (recent.length >= DAILY_REFRESH_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      limit: DAILY_REFRESH_LIMIT,
    } as const;
  }

  const nowIso = new Date().toISOString();
  const next = [...recent, nowIso];

  const { error } = await service.from("system_state").upsert(
    {
      key,
      value: JSON.stringify(next),
    },
    { onConflict: "key" }
  );

  if (error) {
    throw new Error(`manual_refresh_consume_failed code=${error.code ?? "n/a"}`);
  }

  return {
    allowed: true,
    remaining: Math.max(0, DAILY_REFRESH_LIMIT - next.length),
    limit: DAILY_REFRESH_LIMIT,
  } as const;
}
