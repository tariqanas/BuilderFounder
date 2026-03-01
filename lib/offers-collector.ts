import crypto from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase";

type NormalizedOffer = {
  source: string;
  title: string;
  company: string;
  country: string | null;
  remote: string | null;
  day_rate: number | null;
  url: string;
  description: string | null;
  posted_at: string | null;
  hash: string;
};

const OFFER_SOURCES = [
  {
    source: "remoteok-devops",
    type: "json" as const,
    url: "https://remoteok.com/api",
  },
  {
    source: "weworkremotely-devops",
    type: "rss" as const,
    url: "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
  },
  {
    source: "jobicy-devops",
    type: "rss" as const,
    url: "https://jobicy.com/feed/job_category/devops-sysadmin",
  },
];

function stripHtml(text: string) {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function buildHash(url: string, title: string, postedAt: string | null) {
  return crypto.createHash("sha256").update(`${url}|${title}|${postedAt ?? ""}`).digest("hex");
}

type RemoteOkRow = {
  position?: string;
  url?: string;
  date?: string;
  company?: string;
  location?: string;
  description?: string;
};

async function fetchJson(url: string) {
  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) return [] as RemoteOkRow[];
  return (await response.json()) as RemoteOkRow[];
}

function readTag(input: string, tag: string) {
  const match = input.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1]?.trim() ?? null;
}

function parseRssItems(xml: string) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  return items.map((item) => ({
    title: readTag(item, "title"),
    link: readTag(item, "link"),
    description: stripHtml(readTag(item, "description") ?? ""),
    pubDate: readTag(item, "pubDate"),
  }));
}

async function fetchRss(url: string) {
  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) return [];
  const xml = await response.text();
  return parseRssItems(xml);
}

function normalizeRemoteOk(rows: RemoteOkRow[]): NormalizedOffer[] {
  return rows
    .filter((row) => row?.position && row?.url)
    .map((row) => {
      const postedAt = row.date ? new Date(row.date).toISOString() : null;
      const url = `https://remoteok.com${row.url}`;
      return {
        source: "remoteok-devops",
        title: String(row.position).slice(0, 300),
        company: String(row.company || "Unknown").slice(0, 200),
        country: row.location ? String(row.location).slice(0, 100) : "EU",
        remote: "remote",
        day_rate: null,
        url,
        description: stripHtml(String(row.description || "")).slice(0, 8000),
        posted_at: postedAt,
        hash: buildHash(url, String(row.position), postedAt),
      };
    });
}

function normalizeRss(source: string, rows: Awaited<ReturnType<typeof fetchRss>>): NormalizedOffer[] {
  return rows
    .filter((row) => row.link && row.title)
    .map((row) => {
      const postedAt = row.pubDate ? new Date(row.pubDate).toISOString() : null;
      const url = String(row.link);
      const title = String(row.title).slice(0, 300);
      return {
        source,
        title,
        company: "Unknown",
        country: "EU",
        remote: "remote",
        day_rate: null,
        url,
        description: row.description.slice(0, 8000),
        posted_at: postedAt,
        hash: buildHash(url, title, postedAt),
      };
    });
}

export async function collectOffers(limitPerSource = 50) {
  const all: NormalizedOffer[] = [];

  for (const source of OFFER_SOURCES) {
    try {
      if (source.type === "json") {
        const rows = (await fetchJson(source.url)).slice(0, limitPerSource + 5);
        all.push(...normalizeRemoteOk(rows).slice(0, limitPerSource));
      } else {
        const rows = (await fetchRss(source.url)).slice(0, limitPerSource);
        all.push(...normalizeRss(source.source, rows));
      }
    } catch {
      console.error(`[collect] source failed: ${source.source}`);
    }
  }

  if (!all.length) {
    return { inserted: 0, received: 0 };
  }

  const service = createSupabaseServiceClient();
  const { error } = await service.from("offers_raw").upsert(all, { onConflict: "hash", ignoreDuplicates: true });

  if (error) {
    console.error("[collect] upsert offers_raw failed");
    throw new Error("failed_to_upsert_offers");
  }

  return { inserted: all.length, received: all.length };
}
