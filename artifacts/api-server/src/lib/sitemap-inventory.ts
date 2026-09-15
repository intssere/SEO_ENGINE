import { createHash } from "node:crypto";
import type { CrawlControllerPlan } from "./crawl-controller.js";

export const SITEMAP_INVENTORY_ABSOLUTE_LIMITS = Object.freeze({
  documents: 1_024,
  depth: 8,
  documentBytes: 50_000_000,
  inventoryUrls: 25_000,
  pathSegments: 64,
} as const);

export const SITEMAP_REJECTION_REASONS = Object.freeze([
  "invalid_url",
  "unsupported_scheme",
  "credentials_not_allowed",
  "cross_origin",
  "fragment_not_allowed",
  "query_not_allowed",
  "excluded_path",
  "path_depth_exceeded",
  "sitemap_depth_exceeded",
  "sitemap_document_limit_reached",
  "inventory_url_limit_reached",
] as const);

export type SitemapRejectionReason = typeof SITEMAP_REJECTION_REASONS[number];

export type SitemapInventoryPolicy = {
  maxDocuments: number;
  maxDepth: number;
  maxDocumentBytes: number;
  maxInventoryUrls: number;
  maxPathSegments: number;
};

export type SuppliedSitemapDocument = {
  url: string;
  xml: string;
};

export type SitemapInventoryInput = {
  plan: CrawlControllerPlan;
  rootSitemapUrl: string;
  documents: SuppliedSitemapDocument[];
  policy: SitemapInventoryPolicy;
};

export type SitemapInventoryEntry = {
  canonicalUrl: string;
  sourceSitemaps: string[];
  lastmod: string | null;
};

export type SitemapInventoryRejection = {
  kind: "sitemap_reference" | "url_entry";
  sourceSitemap: string;
  reason: SitemapRejectionReason;
};

export type SitemapInventoryResult = {
  version: "first_party_sitemap_inventory_v1";
  siteId: string;
  canonicalOrigin: string;
  rootSitemapUrl: string;
  policy: SitemapInventoryPolicy;
  documents: {
    supplied: number;
    processed: number;
    referenced: number;
    missingSupplied: string[];
  };
  inventory: {
    entries: SitemapInventoryEntry[];
    acceptedOccurrences: number;
    duplicateOccurrences: number;
    uniqueUrls: number;
  };
  rejections: SitemapInventoryRejection[];
  rejectionCounts: Record<SitemapRejectionReason, number>;
  completeness: {
    complete: boolean;
    reasons: string[];
    hardLimitReached: boolean;
  };
  authorization: {
    networkFetchingEnabled: false;
    crawlExecutionEnabled: false;
    persistenceAuthorized: false;
    schedulerEnabled: false;
    batchExecutorEnabled: false;
    autonomousWorkerEnabled: false;
    retryLoopEnabled: false;
    competitorCollectionAuthorized: false;
    competitorPersistenceAuthorized: false;
    providerWrites: false;
    publicSiteWrites: false;
  };
  fingerprint: string;
};

type ParsedSitemapDocument = {
  root: "sitemapindex" | "urlset";
  sitemapLocations: string[];
  urlLocations: Array<{ loc: string; lastmod: string | null }>;
};

type UrlPolicyResult =
  | { ok: true; url: string }
  | { ok: false; reason: SitemapRejectionReason };

const EXCLUDED_PATH = /^\/(?:cart|checkout|account|apps)(?:\/|$)/i;
const XML_TOKEN = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]+>|[^<]+/g;

function requireBoundedInteger(value: number, maximum: number, code: string, allowZero = false): number {
  const minimum = allowZero ? 0 : 1;
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < minimum || value > maximum) throw new Error(code);
  return value;
}

function validatePolicy(policy: SitemapInventoryPolicy, plan: CrawlControllerPlan): SitemapInventoryPolicy {
  const normalized = {
    maxDocuments: requireBoundedInteger(policy.maxDocuments, SITEMAP_INVENTORY_ABSOLUTE_LIMITS.documents, "sitemap_max_documents_invalid"),
    maxDepth: requireBoundedInteger(policy.maxDepth, SITEMAP_INVENTORY_ABSOLUTE_LIMITS.depth, "sitemap_max_depth_invalid", true),
    maxDocumentBytes: requireBoundedInteger(policy.maxDocumentBytes, SITEMAP_INVENTORY_ABSOLUTE_LIMITS.documentBytes, "sitemap_max_document_bytes_invalid"),
    maxInventoryUrls: requireBoundedInteger(policy.maxInventoryUrls, SITEMAP_INVENTORY_ABSOLUTE_LIMITS.inventoryUrls, "sitemap_max_inventory_urls_invalid"),
    maxPathSegments: requireBoundedInteger(policy.maxPathSegments, SITEMAP_INVENTORY_ABSOLUTE_LIMITS.pathSegments, "sitemap_max_path_segments_invalid"),
  };
  if (normalized.maxInventoryUrls > plan.limits.pageHardLimit) throw new Error("sitemap_inventory_limit_exceeds_crawl_plan");
  return normalized;
}

function assertFullSitePlan(plan: CrawlControllerPlan): void {
  if (plan.version !== "first_party_crawl_controller_v1" || plan.mode !== "full_site") throw new Error("sitemap_full_site_plan_required");
  if (plan.target.targetClass !== "first_party" || !plan.target.siteId.trim()) throw new Error("sitemap_first_party_plan_required");
  if (plan.inventory.strategy !== "sitemap_first" || !plan.inventory.sitemapDiscoveryRequired) throw new Error("sitemap_inventory_plan_mismatch");
  if (plan.controls.sameOriginOnly !== true || plan.controls.canonicalDeduplication !== "required_before_execution") throw new Error("sitemap_inventory_plan_controls_required");
  if (
    plan.authorization.controllerExecutionEnabled !== false ||
    plan.authorization.persistenceAuthorized !== false ||
    plan.authorization.competitorCollectionAuthorized !== false ||
    plan.authorization.competitorPersistenceAuthorized !== false ||
    plan.authorization.providerWrites !== false ||
    plan.authorization.publicSiteWrites !== false
  ) throw new Error("sitemap_inventory_plan_authorization_must_be_closed");
}

function xmlEntityDecode(value: string): string {
  if (/&(?!#\d+;|#x[0-9a-fA-F]+;|amp;|lt;|gt;|quot;|apos;)/.test(value)) throw new Error("sitemap_xml_entity_unsupported");
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_full, token: string) => {
    if (token === "amp") return "&";
    if (token === "lt") return "<";
    if (token === "gt") return ">";
    if (token === "quot") return '"';
    if (token === "apos") return "'";
    const codePoint = token.startsWith("#x") ? Number.parseInt(token.slice(2), 16) : Number.parseInt(token.slice(1), 10);
    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) throw new Error("sitemap_xml_entity_invalid");
    return String.fromCodePoint(codePoint);
  });
}

function localName(name: string): string {
  return name.toLowerCase().split(":").pop() ?? "";
}

function normalizeLastmod(value: string | null): string | null {
  if (!value) return null;
  const clean = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const parsed = new Date(`${clean}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== clean ? null : clean;
  }
  if (!/^\d{4}-\d{2}-\d{2}T/.test(clean)) return null;
  const parsed = new Date(clean);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function validateAttributes(raw: string): void {
  let remaining = raw.trim();
  while (remaining) {
    const match = remaining.match(/^([A-Za-z_][\w:.-]*)\s*=\s*("[^"]*"|'[^']*')/);
    if (!match) throw new Error("sitemap_xml_malformed_tag");
    remaining = remaining.slice(match[0].length).trimStart();
  }
}

function parseSitemapXml(xmlInput: string): ParsedSitemapDocument {
  const xml = xmlInput.replace(/^\uFEFF/, "");
  if (/<!DOCTYPE\b/i.test(xml) || /<!ENTITY\b/i.test(xml)) throw new Error("sitemap_xml_dtd_or_entity_not_allowed");

  const stack: string[] = [];
  let root: ParsedSitemapDocument["root"] | null = null;
  let rootClosed = false;
  let locText = "";
  let lastmodText = "";
  let locCaptureDepth: number | null = null;
  let lastmodCaptureDepth: number | null = null;
  let currentRecord: "url" | "sitemap" | null = null;
  const sitemapLocations: string[] = [];
  const urlLocations: Array<{ loc: string; lastmod: string | null }> = [];
  let currentUrlLoc: string | null = null;
  let currentUrlLastmod: string | null = null;
  let consumed = 0;

  for (const match of xml.matchAll(XML_TOKEN)) {
    if (match.index !== consumed) throw new Error("sitemap_xml_malformed");
    const token = match[0];
    consumed += token.length;

    if (token.startsWith("<!--") || token.startsWith("<?")) continue;
    if (token.startsWith("<![CDATA[")) {
      const text = token.slice(9, -3);
      if (locCaptureDepth === stack.length && stack.at(-1) === "loc") locText += text;
      if (lastmodCaptureDepth === stack.length && stack.at(-1) === "lastmod") lastmodText += text;
      continue;
    }
    if (!token.startsWith("<")) {
      if (locCaptureDepth === stack.length && stack.at(-1) === "loc") locText += token;
      else if (lastmodCaptureDepth === stack.length && stack.at(-1) === "lastmod") lastmodText += token;
      else if (!stack.length && token.trim()) throw new Error("sitemap_xml_text_outside_root");
      continue;
    }

    const end = token.match(/^<\s*\/\s*([A-Za-z_][\w:.-]*)\s*>$/);
    if (end) {
      const name = localName(end[1]!);
      if (stack.at(-1) !== name) throw new Error("sitemap_xml_malformed_nesting");
      if (name === "loc" && locCaptureDepth === stack.length) {
        const decoded = xmlEntityDecode(locText.trim());
        if (!decoded) throw new Error("sitemap_loc_required");
        if (currentRecord === "url") currentUrlLoc = decoded;
        else if (currentRecord === "sitemap") sitemapLocations.push(decoded);
        locText = "";
        locCaptureDepth = null;
      } else if (name === "lastmod" && lastmodCaptureDepth === stack.length) {
        if (currentRecord === "url") currentUrlLastmod = normalizeLastmod(xmlEntityDecode(lastmodText.trim()));
        lastmodText = "";
        lastmodCaptureDepth = null;
      } else if (name === "url") {
        if (root !== "urlset" || currentRecord !== "url" || !currentUrlLoc) throw new Error("sitemap_url_entry_invalid");
        urlLocations.push({ loc: currentUrlLoc, lastmod: currentUrlLastmod });
        currentRecord = null;
        currentUrlLoc = null;
        currentUrlLastmod = null;
      } else if (name === "sitemap") {
        if (root !== "sitemapindex" || currentRecord !== "sitemap") throw new Error("sitemap_index_entry_invalid");
        currentRecord = null;
      }
      stack.pop();
      if (!stack.length) rootClosed = true;
      continue;
    }

    const start = token.match(/^<\s*([A-Za-z_][\w:.-]*)([\s\S]*?)>$/);
    if (!start) throw new Error("sitemap_xml_malformed_tag");
    const name = localName(start[1]!);
    let rawTail = start[2]!.trim();
    const selfClosing = rawTail.endsWith("/");
    if (selfClosing) rawTail = rawTail.slice(0, -1).trimEnd();
    validateAttributes(rawTail);
    const parent = stack.at(-1) ?? null;

    if (!stack.length) {
      if (rootClosed) throw new Error("sitemap_xml_multiple_roots");
      if (name !== "sitemapindex" && name !== "urlset") throw new Error("sitemap_xml_unsupported_root");
      root = name;
    }
    stack.push(name);

    if (name === "url") {
      if (root !== "urlset" || parent !== "urlset" || currentRecord) throw new Error("sitemap_url_entry_invalid");
      currentRecord = "url";
      currentUrlLoc = null;
      currentUrlLastmod = null;
    } else if (name === "sitemap") {
      if (root !== "sitemapindex" || parent !== "sitemapindex" || currentRecord) throw new Error("sitemap_index_entry_invalid");
      currentRecord = "sitemap";
    } else if (name === "loc" && parent === currentRecord) {
      locText = "";
      locCaptureDepth = stack.length;
    } else if (name === "lastmod" && currentRecord === "url" && parent === "url") {
      lastmodText = "";
      lastmodCaptureDepth = stack.length;
    }

    if (selfClosing) {
      if (name === "loc" && locCaptureDepth === stack.length) throw new Error("sitemap_loc_required");
      if (name === "url" || name === "sitemap") throw new Error("sitemap_entry_loc_required");
      if (locCaptureDepth === stack.length) locCaptureDepth = null;
      if (lastmodCaptureDepth === stack.length) lastmodCaptureDepth = null;
      stack.pop();
      if (!stack.length) rootClosed = true;
    }
  }

  if (consumed !== xml.length || stack.length || !root || !rootClosed || currentRecord || locCaptureDepth !== null || lastmodCaptureDepth !== null) {
    throw new Error("sitemap_xml_malformed");
  }
  return { root, sitemapLocations, urlLocations };
}

function pathSegmentCount(pathname: string): number {
  return pathname.split("/").filter(Boolean).length;
}

function normalizeCandidateUrl(value: string, canonicalOrigin: string, maxPathSegments: number): UrlPolicyResult {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (parsed.protocol !== "https:") return { ok: false, reason: "unsupported_scheme" };
  if (parsed.username || parsed.password) return { ok: false, reason: "credentials_not_allowed" };
  if (parsed.origin !== canonicalOrigin) return { ok: false, reason: "cross_origin" };
  if (parsed.hash) return { ok: false, reason: "fragment_not_allowed" };
  if (parsed.search) return { ok: false, reason: "query_not_allowed" };
  if (EXCLUDED_PATH.test(parsed.pathname)) return { ok: false, reason: "excluded_path" };
  if (pathSegmentCount(parsed.pathname) > maxPathSegments) return { ok: false, reason: "path_depth_exceeded" };

  parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/");
  const normalized = parsed.toString().replace(/\/$/, "") || canonicalOrigin;
  return { ok: true, url: normalized === canonicalOrigin.replace(/\/$/, "") ? canonicalOrigin : normalized };
}

function normalizeDocumentUrl(value: string, canonicalOrigin: string, maxPathSegments: number): string {
  const result = normalizeCandidateUrl(value, canonicalOrigin, maxPathSegments);
  if (!result.ok) throw new Error(`sitemap_document_url_${result.reason}`);
  return result.url;
}

function emptyRejectionCounts(): Record<SitemapRejectionReason, number> {
  return Object.fromEntries(SITEMAP_REJECTION_REASONS.map((reason) => [reason, 0])) as Record<SitemapRejectionReason, number>;
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`).join(",")}}`;
}

function authorizationBoundary(): SitemapInventoryResult["authorization"] {
  return {
    networkFetchingEnabled: false,
    crawlExecutionEnabled: false,
    persistenceAuthorized: false,
    schedulerEnabled: false,
    batchExecutorEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    competitorCollectionAuthorized: false,
    competitorPersistenceAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
  };
}

export function buildSitemapInventory(input: SitemapInventoryInput): SitemapInventoryResult {
  assertFullSitePlan(input.plan);
  const policy = validatePolicy(input.policy, input.plan);
  const canonicalOrigin = input.plan.target.canonicalOrigin;
  const rootSitemapUrl = normalizeDocumentUrl(input.rootSitemapUrl, canonicalOrigin, policy.maxPathSegments);

  if (input.documents.length > policy.maxDocuments) throw new Error("sitemap_supplied_document_count_exceeds_limit");
  const supplied = new Map<string, string>();
  for (const document of input.documents) {
    const url = normalizeDocumentUrl(document.url, canonicalOrigin, policy.maxPathSegments);
    if (supplied.has(url)) throw new Error("sitemap_supplied_document_duplicate");
    if (Buffer.byteLength(document.xml, "utf8") > policy.maxDocumentBytes) throw new Error("sitemap_document_bytes_exceeds_limit");
    supplied.set(url, document.xml);
  }

  const queue: Array<{ url: string; depth: number }> = [{ url: rootSitemapUrl, depth: 0 }];
  const queued = new Set([rootSitemapUrl]);
  const processed = new Set<string>();
  const referenced = new Set<string>();
  const missing = new Set<string>();
  const rejectionCounts = emptyRejectionCounts();
  const rejections: SitemapInventoryRejection[] = [];
  const entries = new Map<string, { sources: Set<string>; lastmods: Set<string> }>();
  let acceptedOccurrences = 0;
  let duplicateOccurrences = 0;
  let hardLimitReached = false;
  const completenessReasons = new Set<string>();

  const reject = (kind: SitemapInventoryRejection["kind"], sourceSitemap: string, reason: SitemapRejectionReason) => {
    rejectionCounts[reason]++;
    rejections.push({ kind, sourceSitemap, reason });
  };

  while (queue.length) {
    queue.sort((a, b) => a.depth - b.depth || a.url.localeCompare(b.url));
    const current = queue.shift()!;
    if (processed.has(current.url)) continue;
    if (current.depth > policy.maxDepth) {
      hardLimitReached = true;
      completenessReasons.add("sitemap_depth_limit_reached");
      reject("sitemap_reference", current.url, "sitemap_depth_exceeded");
      continue;
    }
    const xml = supplied.get(current.url);
    if (xml === undefined) {
      missing.add(current.url);
      completenessReasons.add("missing_supplied_sitemap_document");
      continue;
    }
    processed.add(current.url);
    const parsed = parseSitemapXml(xml);

    if (parsed.root === "sitemapindex") {
      for (const rawChild of [...parsed.sitemapLocations].sort()) {
        const normalized = normalizeCandidateUrl(rawChild, canonicalOrigin, policy.maxPathSegments);
        if (!normalized.ok) {
          reject("sitemap_reference", current.url, normalized.reason);
          completenessReasons.add("rejected_sitemap_reference");
          continue;
        }
        referenced.add(normalized.url);
        if (current.depth + 1 > policy.maxDepth) {
          hardLimitReached = true;
          completenessReasons.add("sitemap_depth_limit_reached");
          reject("sitemap_reference", current.url, "sitemap_depth_exceeded");
          continue;
        }
        if (!queued.has(normalized.url) && !processed.has(normalized.url)) {
          if (queued.size >= policy.maxDocuments) {
            hardLimitReached = true;
            completenessReasons.add("sitemap_document_limit_reached");
            reject("sitemap_reference", current.url, "sitemap_document_limit_reached");
            continue;
          }
          queued.add(normalized.url);
          queue.push({ url: normalized.url, depth: current.depth + 1 });
        }
      }
      continue;
    }

    for (const rawEntry of parsed.urlLocations) {
      const normalized = normalizeCandidateUrl(rawEntry.loc, canonicalOrigin, policy.maxPathSegments);
      if (!normalized.ok) {
        reject("url_entry", current.url, normalized.reason);
        continue;
      }
      const existing = entries.get(normalized.url);
      if (existing) {
        acceptedOccurrences++;
        duplicateOccurrences++;
        existing.sources.add(current.url);
        if (rawEntry.lastmod) existing.lastmods.add(rawEntry.lastmod);
        continue;
      }
      if (entries.size >= policy.maxInventoryUrls) {
        hardLimitReached = true;
        completenessReasons.add("inventory_url_limit_reached");
        reject("url_entry", current.url, "inventory_url_limit_reached");
        continue;
      }
      acceptedOccurrences++;
      entries.set(normalized.url, {
        sources: new Set([current.url]),
        lastmods: new Set(rawEntry.lastmod ? [rawEntry.lastmod] : []),
      });
    }
  }

  const inventoryEntries: SitemapInventoryEntry[] = [...entries.entries()]
    .map(([canonicalUrl, metadata]) => ({
      canonicalUrl,
      sourceSitemaps: [...metadata.sources].sort(),
      lastmod: [...metadata.lastmods].sort().at(-1) ?? null,
    }))
    .sort((a, b) => a.canonicalUrl.localeCompare(b.canonicalUrl));
  const sortedRejections = rejections.sort((a, b) => a.sourceSitemap.localeCompare(b.sourceSitemap) || a.kind.localeCompare(b.kind) || a.reason.localeCompare(b.reason));
  const reasons = [...completenessReasons].sort();
  const complete = missing.size === 0 && !hardLimitReached && !reasons.includes("rejected_sitemap_reference");

  const withoutFingerprint = {
    version: "first_party_sitemap_inventory_v1" as const,
    siteId: input.plan.target.siteId,
    canonicalOrigin,
    rootSitemapUrl,
    policy,
    documents: {
      supplied: supplied.size,
      processed: processed.size,
      referenced: referenced.size,
      missingSupplied: [...missing].sort(),
    },
    inventory: {
      entries: inventoryEntries,
      acceptedOccurrences,
      duplicateOccurrences,
      uniqueUrls: inventoryEntries.length,
    },
    rejections: sortedRejections,
    rejectionCounts,
    completeness: {
      complete,
      reasons,
      hardLimitReached,
    },
    authorization: authorizationBoundary(),
  };
  const fingerprint = createHash("sha256").update(stableSerialize(withoutFingerprint)).digest("hex");
  return { ...withoutFingerprint, fingerprint };
}
