import crypto from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase";

type NormalizedOffer = {
  source: string;
  title: string;
  company: string;
  country: string | null;
  remote: "remote" | "hybrid" | "onsite" | null;
  day_rate: number | null;
  url: string;
  description: string | null;
  posted_at: string | null;
  hash: string;
};

type RssItem = {
  title: string | null;
  link: string | null;
  description: string;
  pubDate: string | null;
};

type RemoteOkRow = {
  position?: string;
  url?: string;
  date?: string;
  company?: string;
  location?: string;
  description?: string;
};

const SOURCES = {
  freeWork: {
    source: "free-work",
    url: "https://www.free-work.com/fr/tech-it/jobs",
  },
  weWorkRemotely: {
    source: "weworkremotely",
    rssUrl: "https://weworkremotely.com/remote-jobs.rss",
  },
  remoteOk: {
    source: "remoteok",
    url: "https://remoteok.com/api",
  },
} as const;

function stripHtml(text: string) {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function toIsoDate(raw: string | null | undefined) {
  if (!raw) return null;
  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function buildHash(source: string, url: string) {
  return crypto.createHash("sha256").update(`${source}:${url}`).digest("hex");
}

function normalizeRemoteMode(text: string | null | undefined): "remote" | "hybrid" | "onsite" | null {
  if (!text) return null;
  const normalized = text.toLowerCase();
  if (normalized.includes("hybrid")) return "hybrid";
  if (normalized.includes("on-site") || normalized.includes("onsite")) return "onsite";
  if (normalized.includes("remote") || normalized.includes("anywhere") || normalized.includes("worldwide")) return "remote";
  return null;
}

function readTag(input: string, tag: string) {
  const match = input.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1]?.trim() ?? null;
}

function parseRssItems(xml: string): RssItem[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  return items.map((item) => ({
    title: decodeHtmlEntities(readTag(item, "title") ?? ""),
    link: readTag(item, "link"),
    description: stripHtml(decodeHtmlEntities(readTag(item, "description") ?? "")),
    pubDate: readTag(item, "pubDate"),
  }));
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: { "user-agent": "BuilderFounderBot/1.0" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`fetch_failed:${response.status}:${url}`);
  }

  return response.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { "user-agent": "BuilderFounderBot/1.0" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`fetch_failed:${response.status}:${url}`);
  }

  return (await response.json()) as T;
}

function normalizeWeWorkRemotely(items: RssItem[], limitPerSource: number): NormalizedOffer[] {
  return items
    .filter((item) => item.link && item.title)
    .slice(0, limitPerSource)
    .map((item) => {
      const title = String(item.title).slice(0, 300);
      const url = String(item.link);
      const locationMatch = item.description.match(/Location:\s*([^|\n]+)/i);
      const remote = normalizeRemoteMode(locationMatch?.[1] ?? item.description);

      return {
        source: SOURCES.weWorkRemotely.source,
        title,
        company: "Unknown",
        country: locationMatch?.[1]?.trim().slice(0, 100) ?? "Remote",
        remote: remote ?? "remote",
        day_rate: null,
        url,
        description: item.description.slice(0, 8000),
        posted_at: toIsoDate(item.pubDate),
        hash: buildHash(SOURCES.weWorkRemotely.source, url),
      };
    });
}

function normalizeRemoteOk(rows: RemoteOkRow[], limitPerSource: number): NormalizedOffer[] {
  return rows
    .filter((row) => row?.position && row?.url)
    .slice(0, limitPerSource)
    .map((row) => {
      const relativeUrl = String(row.url);
      const url = relativeUrl.startsWith("http") ? relativeUrl : `https://remoteok.com${relativeUrl}`;
      return {
        source: SOURCES.remoteOk.source,
        title: String(row.position).slice(0, 300),
        company: String(row.company || "Unknown").slice(0, 200),
        country: row.location ? String(row.location).slice(0, 100) : "Remote",
        remote: normalizeRemoteMode(row.location) ?? "remote",
        day_rate: null,
        url,
        description: stripHtml(String(row.description || "")).slice(0, 8000),
        posted_at: toIsoDate(row.date),
        hash: buildHash(SOURCES.remoteOk.source, url),
      };
    });
}

function parseFreeWorkJsonLd(html: string, limitPerSource: number): NormalizedOffer[] {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const offers: NormalizedOffer[] = [];

  for (const block of blocks) {
    const payload = block[1]?.trim();
    if (!payload) continue;

    try {
      const parsed = JSON.parse(payload);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];

      for (const node of nodes) {
        if (!node || node["@type"] !== "JobPosting") continue;
        const url = typeof node.url === "string" ? node.url : null;
        const title = typeof node.title === "string" ? node.title : null;
        if (!url || !title) continue;

        const companyName =
          typeof node.hiringOrganization?.name === "string" ? node.hiringOrganization.name : "Unknown";

        const locationText =
          typeof node.jobLocation?.address?.addressCountry === "string"
            ? node.jobLocation.address.addressCountry
            : typeof node.jobLocationType === "string"
              ? node.jobLocationType
              : "Remote";

        const description = typeof node.description === "string" ? stripHtml(node.description) : null;

        offers.push({
          source: SOURCES.freeWork.source,
          title: title.slice(0, 300),
          company: companyName.slice(0, 200),
          country: locationText.slice(0, 100),
          remote: normalizeRemoteMode(locationText) ?? "remote",
          day_rate: null,
          url,
          description: description?.slice(0, 8000) ?? null,
          posted_at: toIsoDate(node.datePosted),
          hash: buildHash(SOURCES.freeWork.source, url),
        });

        if (offers.length >= limitPerSource) return offers;
      }
    } catch {
      continue;
    }
  }

  return offers;
}

function dedupeByHash(rows: NormalizedOffer[]) {
  const unique = new Map<string, NormalizedOffer>();
  for (const row of rows) {
    unique.set(row.hash, row);
  }
  return [...unique.values()];
}

export async function collectOffers(limitPerSource = 50) {
  const collected: NormalizedOffer[] = [];

  try {
    const freeWorkHtml = await fetchText(SOURCES.freeWork.url);
    collected.push(...parseFreeWorkJsonLd(freeWorkHtml, limitPerSource));
  } catch (error) {
    console.error(`[collect] source failed: ${SOURCES.freeWork.source}`, error);
  }

  try {
    const wwrXml = await fetchText(SOURCES.weWorkRemotely.rssUrl);
    collected.push(...normalizeWeWorkRemotely(parseRssItems(wwrXml), limitPerSource));
  } catch (error) {
    console.error(`[collect] source failed: ${SOURCES.weWorkRemotely.source}`, error);
  }

  try {
    const remoteOkJson = await fetchJson<RemoteOkRow[]>(SOURCES.remoteOk.url);
    collected.push(...normalizeRemoteOk(remoteOkJson.filter((row) => typeof row === "object"), limitPerSource));
  } catch (error) {
    console.error(`[collect] source failed: ${SOURCES.remoteOk.source}`, error);
  }

  const all = dedupeByHash(collected);

  if (!all.length) {
    return { inserted: 0, received: 0, skipped: 0 };
  }

  const service = createSupabaseServiceClient();
  const hashes = all.map((row) => row.hash);
  const { data: existing } = await service.from("offers_raw").select("hash").in("hash", hashes);

  const existingHashes = new Set((existing ?? []).map((row) => row.hash));

  const { error } = await service.from("offers_raw").upsert(all, {
    onConflict: "hash",
    ignoreDuplicates: true,
  });

  if (error) {
    console.error("[collect] upsert offers_raw failed", error);
    throw new Error("failed_to_upsert_offers");
  }

  const inserted = all.filter((row) => !existingHashes.has(row.hash)).length;
  const skipped = all.length - inserted;

  return { inserted, received: all.length, skipped };
}
