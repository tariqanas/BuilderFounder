import "server-only";

function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function getAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) return normalizeUrl(appUrl);

  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProductionUrl) return normalizeUrl(`https://${vercelProductionUrl}`);

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return normalizeUrl(`https://${vercelUrl}`);

  return "http://localhost:3000";
}

export function getAppUrlFromRequest(requestUrl: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return normalizeUrl(configured);

  const parsedRequestUrl = new URL(requestUrl);
  return normalizeUrl(parsedRequestUrl.origin);
}
