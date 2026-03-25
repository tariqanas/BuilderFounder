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
  malt: {
    source: "malt",
    url: "https://www.malt.fr/s?q=developpeur",
  },
  linkedInJobs: {
    source: "linkedin-jobs",
    url: "https://www.linkedin.com/jobs/search?keywords=software%20engineer&location=Europe",
  },
  indeed: {
    source: "indeed",
    url: "https://fr.indeed.com/jobs?q=d%C3%A9veloppeur&l=Europe",
  },
  welcomeToTheJungle: {
    source: "welcometothejungle",
    url: "https://www.welcometothejungle.com/fr/jobs?query=developer",
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

function buildHash(title: string, company: string, url: string) {
  return crypto.createHash("sha256").update(`${title}${company}${url}`).digest("hex");
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

function isValidHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function hasMeaningfulText(text: string | null | undefined) {
  if (!text) return false;
  return stripHtml(text).length >= 30;
}

function extractJobPostingNodesFromHtml(html: string): unknown[] {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const nodes: unknown[] = [];

  for (const block of blocks) {
    const payload = block[1]?.trim();
    if (!payload) continue;

    try {
      const parsed = JSON.parse(payload);
      const stack = Array.isArray(parsed) ? [...parsed] : [parsed];

      while (stack.length) {
        const current = stack.shift();
        if (!current) continue;
        nodes.push(current);

        const graph = (current as { "@graph"?: unknown[] })["@graph"];
        if (Array.isArray(graph)) {
          stack.push(...graph);
        }
      }
    } catch {
      continue;
    }
  }

  return nodes;
}

function normalizeJobPostingNodes(nodes: unknown[], source: string, limitPerSource: number): NormalizedOffer[] {
  const offers: NormalizedOffer[] = [];

  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;

    const typedNode = node as Record<string, unknown>;
    if (typedNode["@type"] !== "JobPosting") continue;

    const title = typeof typedNode.title === "string" ? typedNode.title.trim() : "";
    const url = typeof typedNode.url === "string" ? typedNode.url.trim() : "";
    const company =
      typeof (typedNode.hiringOrganization as { name?: unknown })?.name === "string"
        ? ((typedNode.hiringOrganization as { name: string }).name || "").trim()
        : "Unknown";
    const description = typeof typedNode.description === "string" ? stripHtml(typedNode.description).trim() : "";

    const jobLocation = typedNode.jobLocation as { address?: { addressCountry?: string; addressLocality?: string } };
    const locationCountry =
      typeof jobLocation?.address?.addressCountry === "string"
        ? jobLocation.address.addressCountry
        : typeof jobLocation?.address?.addressLocality === "string"
          ? jobLocation.address.addressLocality
          : typeof typedNode.jobLocationType === "string"
            ? typedNode.jobLocationType
            : "Unknown";

    if (!title || !isValidHttpUrl(url) || !hasMeaningfulText(description)) {
      continue;
    }

    offers.push({
      source,
      title: title.slice(0, 300),
      company: company.slice(0, 200) || "Unknown",
      country: locationCountry.slice(0, 100) || "Unknown",
      remote: normalizeRemoteMode([locationCountry, description, title, String(typedNode.jobLocationType ?? "")].join(" ")),
      day_rate: null,
      url,
      description: description.slice(0, 8000),
      posted_at: toIsoDate(typeof typedNode.datePosted === "string" ? typedNode.datePosted : null),
      hash: buildHash(title, company || "Unknown", url),
    });

    if (offers.length >= limitPerSource) break;
  }

  return offers;
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
      const company = "Unknown";
      const remote = normalizeRemoteMode(locationMatch?.[1] ?? item.description);

      return {
        source: SOURCES.weWorkRemotely.source,
        title,
        company,
        country: locationMatch?.[1]?.trim().slice(0, 100) ?? "Unknown",
        remote,
        day_rate: null,
        url,
        description: item.description.slice(0, 8000),
        posted_at: toIsoDate(item.pubDate),
        hash: buildHash(title, company, url),
      };
    });
}

function normalizeRemoteOk(rows: RemoteOkRow[], limitPerSource: number): NormalizedOffer[] {
  return rows
    .filter((row) => row?.position && row?.url)
    .slice(0, limitPerSource)
    .map((row) => {
      const title = String(row.position).slice(0, 300);
      const relativeUrl = String(row.url);
      const url = relativeUrl.startsWith("http") ? relativeUrl : `https://remoteok.com${relativeUrl}`;
      const company = String(row.company || "Unknown").slice(0, 200);
      return {
        source: SOURCES.remoteOk.source,
        title,
        company,
        country: row.location ? String(row.location).slice(0, 100) : "Unknown",
        remote: normalizeRemoteMode(row.location),
        day_rate: null,
        url,
        description: stripHtml(String(row.description || "")).slice(0, 8000),
        posted_at: toIsoDate(row.date),
        hash: buildHash(title, company, url),
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
              : "Unknown";

        const description = typeof node.description === "string" ? stripHtml(node.description) : null;

        offers.push({
          source: SOURCES.freeWork.source,
          title: title.slice(0, 300),
          company: companyName.slice(0, 200),
          country: locationText.slice(0, 100),
          remote: normalizeRemoteMode(locationText),
          day_rate: null,
          url,
          description: description?.slice(0, 8000) ?? null,
          posted_at: toIsoDate(node.datePosted),
          hash: buildHash(title, companyName, url),
        });

        if (offers.length >= limitPerSource) return offers;
      }
    } catch {
      continue;
    }
  }

  return offers;
}

async function fetchMaltJobs(limitPerSource: number) {
  const html = await fetchText(SOURCES.malt.url);
  const nodes = extractJobPostingNodesFromHtml(html);
  return normalizeJobPostingNodes(nodes, SOURCES.malt.source, limitPerSource);
}

async function fetchLinkedInJobs(limitPerSource: number) {
  const html = await fetchText(SOURCES.linkedInJobs.url);
  const nodes = extractJobPostingNodesFromHtml(html);
  return normalizeJobPostingNodes(nodes, SOURCES.linkedInJobs.source, limitPerSource);
}

async function fetchIndeedJobs(limitPerSource: number) {
  const html = await fetchText(SOURCES.indeed.url);
  const nodes = extractJobPostingNodesFromHtml(html);
  return normalizeJobPostingNodes(nodes, SOURCES.indeed.source, limitPerSource);
}

async function fetchWelcomeToTheJungleJobs(limitPerSource: number) {
  const html = await fetchText(SOURCES.welcomeToTheJungle.url);
  const nodes = extractJobPostingNodesFromHtml(html);
  return normalizeJobPostingNodes(nodes, SOURCES.welcomeToTheJungle.source, limitPerSource);
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
  const fetchedBySource: Record<string, number> = {};

  try {
    const freeWorkHtml = await fetchText(SOURCES.freeWork.url);
    const offers = parseFreeWorkJsonLd(freeWorkHtml, limitPerSource);
    fetchedBySource[SOURCES.freeWork.source] = offers.length;
    collected.push(...offers);
  } catch (error) {
    console.error(`[collect] source failed: ${SOURCES.freeWork.source}`, error);
    fetchedBySource[SOURCES.freeWork.source] = 0;
  }

  try {
    const offers = await fetchMaltJobs(limitPerSource);
    fetchedBySource[SOURCES.malt.source] = offers.length;
    if (!offers.length) {
      console.log(`[${SOURCES.malt.source}] skipped (no structured job data)`);
    }
    collected.push(...offers);
  } catch (error) {
    console.error(`[${SOURCES.malt.source}] skipped (blocked or parsing failed)`, error);
    fetchedBySource[SOURCES.malt.source] = 0;
  }

  try {
    const offers = await fetchLinkedInJobs(limitPerSource);
    fetchedBySource[SOURCES.linkedInJobs.source] = offers.length;
    if (!offers.length) {
      console.log(`[${SOURCES.linkedInJobs.source}] skipped (no structured job data)`);
    }
    collected.push(...offers);
  } catch (error) {
    console.error(`[${SOURCES.linkedInJobs.source}] skipped (blocked or parsing failed)`, error);
    fetchedBySource[SOURCES.linkedInJobs.source] = 0;
  }

  try {
    const offers = await fetchIndeedJobs(limitPerSource);
    fetchedBySource[SOURCES.indeed.source] = offers.length;
    if (!offers.length) {
      console.log(`[${SOURCES.indeed.source}] skipped (no structured job data)`);
    }
    collected.push(...offers);
  } catch (error) {
    console.error(`[${SOURCES.indeed.source}] skipped (blocked or parsing failed)`, error);
    fetchedBySource[SOURCES.indeed.source] = 0;
  }

  try {
    const offers = await fetchWelcomeToTheJungleJobs(limitPerSource);
    fetchedBySource[SOURCES.welcomeToTheJungle.source] = offers.length;
    if (!offers.length) {
      console.log(`[${SOURCES.welcomeToTheJungle.source}] skipped (no structured job data)`);
    }
    collected.push(...offers);
  } catch (error) {
    console.error(`[${SOURCES.welcomeToTheJungle.source}] skipped (blocked or parsing failed)`, error);
    fetchedBySource[SOURCES.welcomeToTheJungle.source] = 0;
  }

  try {
    const wwrXml = await fetchText(SOURCES.weWorkRemotely.rssUrl);
    const offers = normalizeWeWorkRemotely(parseRssItems(wwrXml), limitPerSource);
    fetchedBySource[SOURCES.weWorkRemotely.source] = offers.length;
    collected.push(...offers);
  } catch (error) {
    console.error(`[collect] source failed: ${SOURCES.weWorkRemotely.source}`, error);
    fetchedBySource[SOURCES.weWorkRemotely.source] = 0;
  }

  try {
    const remoteOkJson = await fetchJson<RemoteOkRow[]>(SOURCES.remoteOk.url);
    const offers = normalizeRemoteOk(remoteOkJson.filter((row) => typeof row === "object"), limitPerSource);
    fetchedBySource[SOURCES.remoteOk.source] = offers.length;
    collected.push(...offers);
  } catch (error) {
    console.error(`[collect] source failed: ${SOURCES.remoteOk.source}`, error);
    fetchedBySource[SOURCES.remoteOk.source] = 0;
  }

  const all = dedupeByHash(collected);

  if (!all.length) {
    for (const [source, fetched] of Object.entries(fetchedBySource)) {
      console.log(`[${source}] fetched=${fetched} inserted=0`);
    }
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

  const insertedBySource: Record<string, number> = {};
  for (const row of all) {
    if (existingHashes.has(row.hash)) continue;
    insertedBySource[row.source] = (insertedBySource[row.source] ?? 0) + 1;
  }

  for (const [source, fetched] of Object.entries(fetchedBySource)) {
    console.log(`[${source}] fetched=${fetched} inserted=${insertedBySource[source] ?? 0}`);
  }

  const inserted = all.filter((row) => !existingHashes.has(row.hash)).length;
  const skipped = all.length - inserted;

  return { inserted, received: all.length, skipped };
}
