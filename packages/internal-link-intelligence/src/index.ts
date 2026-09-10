import { createHash } from "node:crypto";

export interface InternalLinkInput {
  href: string;
  text?: string;
  internal?: boolean;
  rel?: string | null;
}

export interface InternalLinkPageInput {
  siteId: string;
  pageId: string | null;
  url: string;
  statusCode: number | null;
  indexable: boolean | null;
  title?: string | null;
  h1?: string | null;
  headings?: Array<{ level?: number; text?: string }>;
  links?: InternalLinkInput[];
  targetTerms?: string[];
  priorityScore?: number;
  commercialValue?: number;
}

export interface InternalLinkNode {
  siteId: string;
  pageId: string | null;
  url: string;
  inboundLinks: number;
  outboundLinks: number;
  authorityShare: number;
  authorityScore: number;
  orphaned: boolean;
  underlinked: boolean;
}

export type InternalLinkOpportunityType = "orphan_page" | "underlinked_priority_page" | "link_suggestion";

export interface InternalLinkOpportunity {
  siteId: string;
  sourcePageId: string | null;
  targetPageId: string | null;
  type: InternalLinkOpportunityType;
  sourceUrl: string | null;
  targetUrl: string;
  score: number;
  confidence: number;
  recommendedAnchor: string | null;
  rationale: Record<string, number | string | boolean | null>;
  dedupeKey: string;
}

export interface InternalLinkAnalysis {
  nodes: InternalLinkNode[];
  opportunities: InternalLinkOpportunity[];
}

export interface InternalLinkOptions {
  rootUrl?: string;
  damping?: number;
  iterations?: number;
  underlinkedMaxInbound?: number;
  minPriorityScore?: number;
  maxSuggestionsPerTarget?: number;
  minRelevance?: number;
  ignoreNofollow?: boolean;
}

const defaults: Required<Omit<InternalLinkOptions, "rootUrl">> = {
  damping: 0.85,
  iterations: 30,
  underlinkedMaxInbound: 1,
  minPriorityScore: 55,
  maxSuggestionsPerTarget: 3,
  minRelevance: 0.12,
  ignoreNofollow: true,
};

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "it", "of", "on", "or", "that", "the", "this", "to", "with",
]);

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeUrl(value: string, base?: string): string | null {
  try {
    const url = new URL(value, base);
    if (!/^https?:$/.test(url.protocol)) return null;
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = "";
    if (url.pathname !== "/" && url.pathname.endsWith("/")) url.pathname = url.pathname.slice(0, -1);
    return url.toString();
  } catch {
    return null;
  }
}

function eligible(page: InternalLinkPageInput): boolean {
  const success = page.statusCode === null || (page.statusCode >= 200 && page.statusCode < 300);
  return success && page.indexable !== false && normalizeUrl(page.url) !== null;
}

function hasNofollow(rel: string | null | undefined): boolean {
  return !!rel && rel.split(/\s+/).some((token) => token.toLowerCase() === "nofollow");
}

function tokens(values: Array<string | null | undefined>): Set<string> {
  const out = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    for (const token of value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").split(/\s+/)) {
      if (token.length < 2 || STOP_WORDS.has(token)) continue;
      out.add(token);
    }
  }
  return out;
}

function pageTokens(page: InternalLinkPageInput, includeTargetTerms = false): Set<string> {
  const values: Array<string | null | undefined> = [page.title, page.h1, ...(page.headings ?? []).map((h) => h.text)];
  if (includeTargetTerms) values.push(...(page.targetTerms ?? []));
  return tokens(values);
}

function relevance(source: InternalLinkPageInput, target: InternalLinkPageInput): number {
  const a = pageTokens(source);
  const b = pageTokens(target, true);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  if (!overlap) return 0;
  return overlap / Math.sqrt(a.size * b.size);
}

function priorityScore(page: InternalLinkPageInput): number {
  if (typeof page.priorityScore === "number" && Number.isFinite(page.priorityScore)) return clamp(page.priorityScore);
  if (typeof page.commercialValue === "number" && Number.isFinite(page.commercialValue)) return clamp(page.commercialValue * 50);
  return 50;
}

function recommendedAnchor(page: InternalLinkPageInput): string | null {
  const candidates = [page.h1, page.title, ...(page.targetTerms ?? [])];
  for (const candidate of candidates) {
    const text = candidate?.trim();
    if (text) return text.length <= 90 ? text : `${text.slice(0, 87).trimEnd()}...`;
  }
  return null;
}

function makeKey(type: InternalLinkOpportunityType, siteId: string, sourceUrl: string | null, targetUrl: string): string {
  return createHash("sha256").update(`${type}|${siteId}|${sourceUrl ?? ""}|${targetUrl}`).digest("hex");
}

export function analyzeInternalLinks(pages: InternalLinkPageInput[], options: InternalLinkOptions = {}): InternalLinkAnalysis {
  const cfg = { ...defaults, ...options };
  if (!(cfg.damping > 0 && cfg.damping < 1)) throw new Error("damping must be between 0 and 1");
  if (!Number.isInteger(cfg.iterations) || cfg.iterations < 1 || cfg.iterations > 500) throw new Error("iterations must be an integer between 1 and 500");

  const normalizedRoot = options.rootUrl ? normalizeUrl(options.rootUrl) : null;
  const normalizedPages = pages
    .filter(eligible)
    .map((page) => ({ page, url: normalizeUrl(page.url)! }))
    .sort((a, b) => a.url.localeCompare(b.url));

  const byUrl = new Map(normalizedPages.map((entry) => [entry.url, entry]));
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();
  for (const { url } of normalizedPages) {
    outgoing.set(url, new Set());
    incoming.set(url, new Set());
  }

  for (const { page, url: sourceUrl } of normalizedPages) {
    for (const link of page.links ?? []) {
      if (link.internal === false) continue;
      if (cfg.ignoreNofollow && hasNofollow(link.rel)) continue;
      const targetUrl = normalizeUrl(link.href, sourceUrl);
      if (!targetUrl || targetUrl === sourceUrl || !byUrl.has(targetUrl)) continue;
      try {
        if (new URL(targetUrl).origin !== new URL(sourceUrl).origin) continue;
      } catch {
        continue;
      }
      outgoing.get(sourceUrl)!.add(targetUrl);
      incoming.get(targetUrl)!.add(sourceUrl);
    }
  }

  const count = normalizedPages.length;
  const ranks = new Map<string, number>();
  if (count > 0) {
    for (const { url } of normalizedPages) ranks.set(url, 1 / count);
    for (let iteration = 0; iteration < cfg.iterations; iteration += 1) {
      const next = new Map<string, number>();
      const base = (1 - cfg.damping) / count;
      for (const { url } of normalizedPages) next.set(url, base);
      for (const { url: sourceUrl } of normalizedPages) {
        const sourceRank = ranks.get(sourceUrl) ?? 0;
        const targets = outgoing.get(sourceUrl)!;
        if (targets.size === 0) {
          const share = (cfg.damping * sourceRank) / count;
          for (const { url } of normalizedPages) next.set(url, (next.get(url) ?? 0) + share);
        } else {
          const share = (cfg.damping * sourceRank) / targets.size;
          for (const targetUrl of targets) next.set(targetUrl, (next.get(targetUrl) ?? 0) + share);
        }
      }
      ranks.clear();
      for (const [url, value] of next) ranks.set(url, value);
    }
  }

  const maxRank = Math.max(0, ...ranks.values());
  const nodes: InternalLinkNode[] = normalizedPages.map(({ page, url }) => {
    const inboundLinks = incoming.get(url)!.size;
    const outboundLinks = outgoing.get(url)!.size;
    const orphaned = inboundLinks === 0 && url !== normalizedRoot;
    const p = priorityScore(page);
    const underlinked = !orphaned && url !== normalizedRoot && inboundLinks <= cfg.underlinkedMaxInbound && p >= cfg.minPriorityScore;
    const rank = ranks.get(url) ?? 0;
    return {
      siteId: page.siteId,
      pageId: page.pageId,
      url,
      inboundLinks,
      outboundLinks,
      authorityShare: Math.round(rank * 10000) / 100,
      authorityScore: maxRank > 0 ? Math.round((rank / maxRank) * 10000) / 100 : 0,
      orphaned,
      underlinked,
    };
  });

  const nodeByUrl = new Map(nodes.map((node) => [node.url, node]));
  const opportunities: InternalLinkOpportunity[] = [];

  for (const { page: target, url: targetUrl } of normalizedPages) {
    const node = nodeByUrl.get(targetUrl)!;
    const p = priorityScore(target);

    if (node.orphaned) {
      const score = Math.round(clamp(55 + p * 0.35) * 100) / 100;
      opportunities.push({
        siteId: target.siteId,
        sourcePageId: null,
        targetPageId: target.pageId,
        type: "orphan_page",
        sourceUrl: null,
        targetUrl,
        score,
        confidence: 0.98,
        recommendedAnchor: recommendedAnchor(target),
        rationale: { inboundLinks: 0, targetPriority: p, authorityScore: node.authorityScore },
        dedupeKey: makeKey("orphan_page", target.siteId, null, targetUrl),
      });
    } else if (node.underlinked) {
      const score = Math.round(clamp(42 + p * 0.42 + (cfg.underlinkedMaxInbound - node.inboundLinks + 1) * 4) * 100) / 100;
      opportunities.push({
        siteId: target.siteId,
        sourcePageId: null,
        targetPageId: target.pageId,
        type: "underlinked_priority_page",
        sourceUrl: null,
        targetUrl,
        score,
        confidence: 0.94,
        recommendedAnchor: recommendedAnchor(target),
        rationale: { inboundLinks: node.inboundLinks, targetPriority: p, authorityScore: node.authorityScore },
        dedupeKey: makeKey("underlinked_priority_page", target.siteId, null, targetUrl),
      });
    }

    if (!(node.orphaned || node.underlinked)) continue;

    const candidates = normalizedPages
      .filter(({ page: source, url: sourceUrl }) => {
        if (sourceUrl === targetUrl || source.siteId !== target.siteId) return false;
        if (outgoing.get(sourceUrl)!.has(targetUrl)) return false;
        return true;
      })
      .map(({ page: source, url: sourceUrl }) => {
        const rel = relevance(source, target);
        const sourceAuthority = nodeByUrl.get(sourceUrl)?.authorityScore ?? 0;
        const need = node.orphaned ? 1 : Math.max(0, 1 - node.inboundLinks / Math.max(cfg.underlinkedMaxInbound + 1, 1));
        const score = clamp(rel * 55 + (sourceAuthority / 100) * 20 + (p / 100) * 15 + need * 10);
        return { source, sourceUrl, rel, sourceAuthority, score };
      })
      .filter((candidate) => candidate.rel >= cfg.minRelevance)
      .sort((a, b) => b.score - a.score || b.rel - a.rel || a.sourceUrl.localeCompare(b.sourceUrl))
      .slice(0, cfg.maxSuggestionsPerTarget);

    for (const candidate of candidates) {
      opportunities.push({
        siteId: target.siteId,
        sourcePageId: candidate.source.pageId,
        targetPageId: target.pageId,
        type: "link_suggestion",
        sourceUrl: candidate.sourceUrl,
        targetUrl,
        score: Math.round(candidate.score * 100) / 100,
        confidence: Math.round(clamp(0.72 + candidate.rel * 0.24, 0, 1) * 1000) / 1000,
        recommendedAnchor: recommendedAnchor(target),
        rationale: {
          semanticRelevance: Math.round(candidate.rel * 1000) / 1000,
          sourceAuthority: candidate.sourceAuthority,
          targetPriority: p,
          targetInboundLinks: node.inboundLinks,
        },
        dedupeKey: makeKey("link_suggestion", target.siteId, candidate.sourceUrl, targetUrl),
      });
    }
  }

  const seen = new Set<string>();
  const uniqueOpportunities = opportunities
    .filter((item) => {
      if (seen.has(item.dedupeKey)) return false;
      seen.add(item.dedupeKey);
      return true;
    })
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence || a.dedupeKey.localeCompare(b.dedupeKey));

  return {
    nodes: nodes.sort((a, b) => b.authorityScore - a.authorityScore || a.url.localeCompare(b.url)),
    opportunities: uniqueOpportunities,
  };
}

export function toOpportunityInsert(item: InternalLinkOpportunity) {
  return {
    siteId: item.siteId,
    pageId: item.targetPageId,
    type: `internal_link.${item.type}`,
    status: "open" as const,
    score: item.score,
    confidence: item.confidence,
    title: item.type === "link_suggestion" ? `Add internal link to ${item.targetUrl}` : `${item.type.replaceAll("_", " ")}: ${item.targetUrl}`,
    rationale: {
      ...item.rationale,
      sourcePageId: item.sourcePageId,
      sourceUrl: item.sourceUrl,
      targetUrl: item.targetUrl,
      recommendedAnchor: item.recommendedAnchor,
      dedupeKey: item.dedupeKey,
    },
  };
}
