import * as cheerio from "cheerio";
import { createHash } from "node:crypto";

export interface CrawlOptions {
  maxPages?: number;
  userAgent?: string;
  timeoutMs?: number;
}

export interface InventoryPage {
  url: string;
  normalizedUrl: string;
  path: string;
  statusCode: number | null;
  contentType: string | null;
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  h1: string | null;
  headings: Array<{ level: number; text: string }>;
  links: Array<{ href: string; text: string; internal: boolean; rel: string | null }>;
  images: Array<{ src: string; alt: string | null }>;
  structuredData: unknown[];
  indexable: boolean | null;
  contentHash: string | null;
  error: string | null;
}

export interface CrawlInventory {
  seedUrl: string;
  origin: string;
  pagesDiscovered: number;
  pagesFetched: number;
  pages: InventoryPage[];
}

export function normalizeUrl(input: string, base?: string): string {
  const url = new URL(input, base);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
  }
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }
  if (url.pathname !== "/" && url.pathname.endsWith("/")) url.pathname = url.pathname.slice(0, -1);
  return url.toString();
}

function firstText($: cheerio.CheerioAPI, selector: string): string | null {
  const value = $(selector).first().text().replace(/\s+/g, " ").trim();
  return value || null;
}

function parseJsonLd($: cheerio.CheerioAPI): unknown[] {
  const values: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).text().trim();
    if (!raw) return;
    try {
      values.push(JSON.parse(raw));
    } catch {
      values.push({ parseError: true, raw });
    }
  });
  return values;
}

export function extractPage(html: string, requestedUrl: string, statusCode = 200, contentType = "text/html"): InventoryPage {
  const normalizedUrl = normalizeUrl(requestedUrl);
  const url = new URL(normalizedUrl);
  const $ = cheerio.load(html);
  const canonicalHref = $('link[rel="canonical"]').first().attr("href")?.trim();
  const robots = $('meta[name="robots" i]').first().attr("content")?.trim() ?? null;
  const noindex = robots ? /(^|,)\s*noindex\b/i.test(robots) : false;
  const links: InventoryPage["links"] = [];
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href || /^(mailto:|tel:|javascript:)/i.test(href)) return;
    try {
      const absolute = normalizeUrl(href, normalizedUrl);
      links.push({
        href: absolute,
        text: $(element).text().replace(/\s+/g, " ").trim(),
        internal: new URL(absolute).origin === url.origin,
        rel: $(element).attr("rel")?.trim() ?? null,
      });
    } catch {
      return;
    }
  });

  const headings: InventoryPage["headings"] = [];
  $("h1,h2,h3,h4,h5,h6").each((_, element) => {
    const tag = element.tagName.toLowerCase();
    const level = Number(tag.slice(1));
    const text = $(element).text().replace(/\s+/g, " ").trim();
    if (text) headings.push({ level, text });
  });

  const images: InventoryPage["images"] = [];
  $("img[src]").each((_, element) => {
    const src = $(element).attr("src");
    if (!src) return;
    try {
      images.push({ src: new URL(src, normalizedUrl).toString(), alt: $(element).attr("alt") ?? null });
    } catch {
      return;
    }
  });

  return {
    url: requestedUrl,
    normalizedUrl,
    path: url.pathname,
    statusCode,
    contentType,
    title: firstText($, "title"),
    metaDescription: $('meta[name="description" i]').first().attr("content")?.trim() ?? null,
    canonicalUrl: canonicalHref ? normalizeUrl(canonicalHref, normalizedUrl) : null,
    robots,
    h1: firstText($, "h1"),
    headings,
    links,
    images,
    structuredData: parseJsonLd($),
    indexable: statusCode >= 200 && statusCode < 300 && !noindex,
    contentHash: createHash("sha256").update($("body").text().replace(/\s+/g, " ").trim()).digest("hex"),
    error: null,
  };
}

export async function crawlSite(seed: string, options: CrawlOptions = {}): Promise<CrawlInventory> {
  const seedUrl = normalizeUrl(seed);
  const origin = new URL(seedUrl).origin;
  const maxPages = Math.max(1, Math.min(options.maxPages ?? 5000, 20000));
  const timeoutMs = options.timeoutMs ?? 15000;
  const userAgent = options.userAgent ?? "SEOEngineBot/0.1 (+read-only site inventory)";
  const queue = [seedUrl];
  const discovered = new Set(queue);
  const fetched = new Set<string>();
  const pages: InventoryPage[] = [];

  while (queue.length > 0 && fetched.size < maxPages) {
    const current = queue.shift();
    if (!current || fetched.has(current)) continue;
    fetched.add(current);
    try {
      const response = await fetch(current, {
        method: "GET",
        redirect: "follow",
        headers: { "user-agent": userAgent, accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const contentType = response.headers.get("content-type");
      if (!contentType?.toLowerCase().includes("text/html")) {
        pages.push({
          url: current,
          normalizedUrl: current,
          path: new URL(current).pathname,
          statusCode: response.status,
          contentType,
          title: null,
          metaDescription: null,
          canonicalUrl: null,
          robots: null,
          h1: null,
          headings: [],
          links: [],
          images: [],
          structuredData: [],
          indexable: null,
          contentHash: null,
          error: null,
        });
        continue;
      }
      const html = await response.text();
      const page = extractPage(html, response.url || current, response.status, contentType);
      pages.push(page);
      for (const link of page.links) {
        if (!link.internal) continue;
        const linkUrl = new URL(link.href);
        if (linkUrl.origin !== origin || discovered.has(link.href) || discovered.size >= maxPages) continue;
        discovered.add(link.href);
        queue.push(link.href);
      }
    } catch (error) {
      pages.push({
        url: current,
        normalizedUrl: current,
        path: new URL(current).pathname,
        statusCode: null,
        contentType: null,
        title: null,
        metaDescription: null,
        canonicalUrl: null,
        robots: null,
        h1: null,
        headings: [],
        links: [],
        images: [],
        structuredData: [],
        indexable: null,
        contentHash: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    seedUrl,
    origin,
    pagesDiscovered: discovered.size,
    pagesFetched: fetched.size,
    pages,
  };
}
