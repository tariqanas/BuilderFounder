import { env } from "@/lib/env";
import { safeCompare } from "@/lib/security";

function readApiKey(request: Request) {
  const direct = request.headers.get("x-api-key");
  if (direct) return direct;

  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  return null;
}

export function isAuthorizedJobRequest(request: Request) {
  return safeCompare(env.JOBS_API_KEY, readApiKey(request));
}

export function isAuthorizedMakeRequest(request: Request) {
  return safeCompare(env.MAKE_NOTIFY_KEY, readApiKey(request));
}
