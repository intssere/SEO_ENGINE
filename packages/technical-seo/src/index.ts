import { createHash } from "node:crypto";

export interface CanonicalEvidenceLike {
  siteId: string;
  pageId: string | null;
  kind: string;
  payload: Record<string, unknown>;
  dedupeKey: string;
}

export type TechnicalSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface TechnicalFinding {
  siteId: string;
  pageId: string | null;
  ruleId: string;
  category: "crawl" | "indexability" | "metadata" | "canonical" | "headings" | "links" | "images";
  severity: TechnicalSeverity;
  title: string;
  description: string;
  evidenceDedupeKeys: string[];
  dedupeKey: string;
}

interface PageSignals {
  evidence: CanonicalEvidenceLike;
  url: string | null;
  statusCode: number | null;
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  h1: string | null;
  headings: Array<Record<string, unknown>>;
  links: Array<Record<string, unknown>>;
  images: Array<Record<string, unknown>>;
  indexable: boolean | null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((v): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v))
    : [];
}

function toPageSignals(evidence: CanonicalEvidenceLike): PageSignals | null {
  if (evidence.kind !== "page_snapshot") return null;
  const p = evidence.payload;
  return {
    evidence,
    url: asString(p.url) ?? asString(p.normalizedUrl),
    statusCode: asNumber(p.statusCode),
    title: asString(p.title),
    metaDescription: asString(p.metaDescription),
    canonicalUrl: asString(p.canonicalUrl),
    robots: asString(p.robots),
    h1: asString(p.h1),
    headings: asRecords(p.headings),
    links: asRecords(p.links),
    images: asRecords(p.images),
    indexable: typeof p.indexable === "boolean" ? p.indexable : null,
  };
}

function finding(input: Omit<TechnicalFinding, "dedupeKey">): TechnicalFinding {
  const evidenceKeys = [...input.evidenceDedupeKeys].sort();
  const material = [input.siteId, input.pageId ?? "", input.ruleId, input.title, ...evidenceKeys].join("|");
  return { ...input, evidenceDedupeKeys: evidenceKeys, dedupeKey: createHash("sha256").update(material).digest("hex") };
}

function pageFinding(
  page: PageSignals,
  ruleId: string,
  category: TechnicalFinding["category"],
  severity: TechnicalSeverity,
  title: string,
  description: string,
): TechnicalFinding {
  return finding({
    siteId: page.evidence.siteId,
    pageId: page.evidence.pageId,
    ruleId,
    category,
    severity,
    title,
    description,
    evidenceDedupeKeys: [page.evidence.dedupeKey],
  });
}

function robotsHasNoindex(robots: string | null): boolean {
  return !!robots && /(?:^|[,\s])noindex(?:$|[,\s])/i.test(robots);
}

function h1Count(page: PageSignals): number {
  const fromHeadings = page.headings.filter((h) => String(h.level ?? h.tag ?? "").toLowerCase() === "h1").length;
  return fromHeadings || (page.h1 ? 1 : 0);
}

function absoluteUrl(value: unknown, base: string | null): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return new URL(value, base ?? undefined).toString();
  } catch {
    return null;
  }
}

export function evaluateTechnicalSeo(evidence: CanonicalEvidenceLike[]): TechnicalFinding[] {
  const pages = evidence.map(toPageSignals).filter((v): v is PageSignals => v !== null);
  const findings: TechnicalFinding[] = [];
  const byUrl = new Map<string, PageSignals>();

  for (const page of pages) {
    if (page.url) byUrl.set(page.url, page);

    if (page.statusCode !== null && page.statusCode >= 500) {
      findings.push(pageFinding(page, "crawl.http_5xx", "crawl", "critical", "Server error response", `Page returned HTTP ${page.statusCode}.`));
    } else if (page.statusCode !== null && page.statusCode >= 400) {
      findings.push(pageFinding(page, "crawl.http_4xx", "crawl", "high", "Client error response", `Page returned HTTP ${page.statusCode}.`));
    }

    const successful = page.statusCode === null || (page.statusCode >= 200 && page.statusCode < 300);
    if (!successful) continue;

    if (!page.title) {
      findings.push(pageFinding(page, "metadata.missing_title", "metadata", "high", "Missing title", "Successful HTML page exposes no document title."));
    }
    if (!page.metaDescription) {
      findings.push(pageFinding(page, "metadata.missing_meta_description", "metadata", "medium", "Missing meta description", "Page has no meta description."));
    }
    if (!page.canonicalUrl) {
      findings.push(pageFinding(page, "canonical.missing", "canonical", "medium", "Missing canonical", "Page does not expose a canonical URL."));
    }
    if (h1Count(page) === 0) {
      findings.push(pageFinding(page, "headings.missing_h1", "headings", "medium", "Missing H1", "Page has no H1 heading."));
    }
    if (h1Count(page) > 1) {
      findings.push(pageFinding(page, "headings.multiple_h1", "headings", "low", "Multiple H1 headings", `Page exposes ${h1Count(page)} H1 headings.`));
    }

    if (robotsHasNoindex(page.robots) && page.indexable === true) {
      findings.push(pageFinding(page, "indexability.noindex_conflict", "indexability", "high", "Noindex conflict", "Crawler signals mark the page indexable while robots directives contain noindex."));
    }

    if (page.url && page.canonicalUrl) {
      const canonical = absoluteUrl(page.canonicalUrl, page.url);
      if (canonical && canonical !== page.url && page.indexable !== false) {
        findings.push(pageFinding(page, "canonical.non_self", "canonical", "medium", "Canonical points elsewhere", `Canonical resolves to ${canonical} instead of the crawled URL.`));
      }
    }

    const missingAlt = page.images.filter((img) => {
      const src = asString(img.src) ?? asString(img.url);
      const alt = img.alt;
      return !!src && (typeof alt !== "string" || !alt.trim());
    }).length;
    if (missingAlt > 0) {
      findings.push(pageFinding(page, "images.missing_alt", "images", "low", "Images missing alt text", `${missingAlt} image${missingAlt === 1 ? "" : "s"} have no non-empty alt attribute.`));
    }
  }

  const titleGroups = new Map<string, PageSignals[]>();
  for (const page of pages) {
    if (!page.title || page.indexable === false) continue;
    const key = page.title.toLocaleLowerCase();
    const group = titleGroups.get(key) ?? [];
    group.push(page);
    titleGroups.set(key, group);
  }
  for (const group of titleGroups.values()) {
    if (group.length < 2) continue;
    for (const page of group) {
      findings.push(pageFinding(page, "metadata.duplicate_title", "metadata", "medium", "Duplicate title", `This title is shared by ${group.length} crawled pages.`));
    }
  }

  for (const source of pages) {
    if (!source.url) continue;
    for (const link of source.links) {
      const href = absoluteUrl(link.href ?? link.url, source.url);
      if (!href) continue;
      const target = byUrl.get(href);
      if (!target || target.statusCode === null || target.statusCode < 400) continue;
      let sameOrigin = false;
      try {
        sameOrigin = new URL(href).origin === new URL(source.url).origin;
      } catch {
        sameOrigin = false;
      }
      if (!sameOrigin) continue;
      findings.push(pageFinding(source, "links.broken_internal", "links", "high", "Broken internal link", `Internal link points to ${href}, which returned HTTP ${target.statusCode}.`));
    }
  }

  const seen = new Set<string>();
  return findings.filter((item) => {
    if (seen.has(item.dedupeKey)) return false;
    seen.add(item.dedupeKey);
    return true;
  });
}

export function toFindingInsert(item: TechnicalFinding) {
  return {
    siteId: item.siteId,
    pageId: item.pageId,
    primaryEvidenceId: null,
    ruleId: item.ruleId,
    category: item.category,
    severity: item.severity,
    status: "open" as const,
    title: item.title,
    description: item.description,
  };
}
