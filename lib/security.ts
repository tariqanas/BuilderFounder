import crypto from "node:crypto";

export function safeCompare(secret: string, provided: string | null): boolean {
  if (!provided) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

type RateLimiterEntry = { count: number; resetAt: number };
const memoryStore = new Map<string, RateLimiterEntry>();

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  memoryStore.set(key, entry);
  return { ok: true, remaining: Math.max(0, limit - entry.count) };
}
