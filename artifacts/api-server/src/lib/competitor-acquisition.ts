import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import postgres from "postgres";
import {
  COMPETITOR_EVIDENCE_KIND,
  normalizeCompetitorObservation,
  type CompetitorEvidenceEnvelope,
  type CompetitorObservationInput,
} from "./competitor-intelligence.js";
import { getRuntimeReadiness } from "./operational-data.js";

export const COMPETITOR_ACQUISITION_VERSION = "task59-bounded-competitor-acquisition-v1" as const;
export const DEFAULT_COMPETITOR_TIMEOUT_MS = 5_000;
export const DEFAULT_COMPETITOR_MAX_RESPONSE_BYTES = 1_048_576;
export const DEFAULT_COMPETITOR_MAX_REDIRECTS = 3;
export const DEFAULT_ROBOTS_MAX_RESPONSE_BYTES = 131_072;
export const COMPETITOR_RESEARCH_USER_AGENT = "SEO-ENGINE-Competitor-Research/1.0";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const HTML_CONTENT_TYPES = ["text/html", "application/xhtml+xml"];
const MAX_TARGETS = 50;
const MAX_HINTS = 50;

type Env = Record<string, string | undefined>;

export type CompetitorCollectionTarget = {
  id: string;
  url: string;
  source: string;
  allowedPathPrefix: string;
  confidence: number;
  pageType: string | null;
  keywordThemes: string[];
  taxonomyLabels: string[];
  entityTypes: string[];
  internalLinkPatterns: string[];
};

export type CompetitorAcquisitionConfig = {
  collectionEnabled: boolean;
  persistenceEnabled: boolean;
  timeoutMs: number;
  maxResponseBytes: number;
  maxRedirects: number;
  targets: CompetitorCollectionTarget[];
  configurationIssues: string[];
};

export type ResolveHost = (hostname: string) => Promise<string[]>;
export type PolicyChecker = (url: URL, target: CompetitorCollectionTarget, deps: RuntimeAcquisitionDependencies) => Promise<boolean>;

export type RuntimeAcquisitionDependencies = {
  fetchImpl: typeof fetch;
  resolveHost: ResolveHost;
  policyChecker: PolicyChecker;
};

export type EvidenceInsert = {
  id: string;
  siteId: string;
  pageId: string | null;
  source: string;
  kind: typeof COMPETITOR_EVIDENCE_KIND;
  observedAt: string;
  confidence: number;
  payload: CompetitorEvidenceEnvelope["payload"];
  provenance: CompetitorEvidenceEnvelope["provenance"];
};

export type EvidenceStore = {
  insertIfAbsent(input: EvidenceInsert): Promise<"inserted" | "exists">;
  getById(id: string): Promise<{ id: string; kind: string; fingerprint: string | null } | null>;
  close?(): Promise<void>;
};

export type AcquisitionResult = {
  targetId: string;
  record: CompetitorEvidenceEnvelope;
  request: {
    redirects: number;
    responseBytes: number;
    finalUrl: string;
    contentType: string;
  };
  safety: {
    version: typeof COMPETITOR_ACQUISITION_VERSION;
    boundedTarget: true;
    policyAllowed: true;
    rawContentRetained: false;
    executionAuthorized: false;
    publicSiteWrites: false;
    automaticTransition: false;
  };
};

export type AcquisitionRunResult =
  | { ok: true; mode: "dry_run"; acquisition: AcquisitionResult; persistence: { attempted: false; inserted: false; id: null } }
  | { ok: true; mode: "persist"; acquisition: AcquisitionResult; persistence: { attempted: true; inserted: boolean; id: string } }
  | { ok: false; reason: string };

function enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function positiveInt(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= max ? parsed : fallback;
}

function normalizeHintList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const normalized = item.normalize("NFKC").trim().replace(/\s+/g, " ");
    if (!normalized || normalized.length > 120) continue;
    seen.add(normalized);
    if (seen.size >= MAX_HINTS) break;
  }
  return [...seen];
}

function canonicalConfiguredUrl(value: unknown): URL | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password || url.search || url.hash) return null;
    if (!url.hostname.includes(".")) return null;
    return url;
  } catch {
    return null;
  }
}

function parseTarget(input: unknown): CompetitorCollectionTarget | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const source = typeof value.source === "string" ? value.source.normalize("NFKC").trim().replace(/\s+/g, " ") : "";
  const url = canonicalConfiguredUrl(value.url);
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(id) || !source || source.length > 80 || !url) return null;

  const configuredPrefix = typeof value.allowedPathPrefix === "string" ? value.allowedPathPrefix.trim() : url.pathname;
  if (!configuredPrefix.startsWith("/") || configuredPrefix.includes("?") || configuredPrefix.includes("#")) return null;
  const confidence = value.confidence == null ? 0.5 : Number(value.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null;
  const pageType = typeof value.pageType === "string" && value.pageType.trim() ? value.pageType.trim() : null;

  return {
    id,
    url: url.toString(),
    source,
    allowedPathPrefix: configuredPrefix,
    confidence,
    pageType,
    keywordThemes: normalizeHintList(value.keywordThemes),
    taxonomyLabels: normalizeHintList(value.taxonomyLabels),
    entityTypes: normalizeHintList(value.entityTypes),
    internalLinkPatterns: normalizeHintList(value.internalLinkPatterns),
  };
}

export function loadCompetitorAcquisitionConfig(env: Env = process.env): CompetitorAcquisitionConfig {
  const issues: string[] = [];
  const targets: CompetitorCollectionTarget[] = [];
  const raw = env.COMPETITOR_COLLECTION_TARGETS_JSON?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        issues.push("COMPETITOR_COLLECTION_TARGETS_JSON_not_array");
      } else if (parsed.length > MAX_TARGETS) {
        issues.push("COMPETITOR_COLLECTION_TARGETS_JSON_too_many_targets");
      } else {
        const ids = new Set<string>();
        for (const item of parsed) {
          const target = parseTarget(item);
          if (!target || ids.has(target.id)) {
            issues.push("COMPETITOR_COLLECTION_TARGETS_JSON_invalid_target");
            continue;
          }
          ids.add(target.id);
          targets.push(target);
        }
      }
    } catch {
      issues.push("COMPETITOR_COLLECTION_TARGETS_JSON_invalid_json");
    }
  }

  return {
    collectionEnabled: enabled(env.COMPETITOR_COLLECTION_ENABLED),
    persistenceEnabled: enabled(env.COMPETITOR_EVIDENCE_PERSISTENCE_ENABLED),
    timeoutMs: positiveInt(env.COMPETITOR_COLLECTION_TIMEOUT_MS, DEFAULT_COMPETITOR_TIMEOUT_MS, 30_000),
    maxResponseBytes: positiveInt(env.COMPETITOR_COLLECTION_MAX_RESPONSE_BYTES, DEFAULT_COMPETITOR_MAX_RESPONSE_BYTES, 5 * 1024 * 1024),
    maxRedirects: positiveInt(env.COMPETITOR_COLLECTION_MAX_REDIRECTS, DEFAULT_COMPETITOR_MAX_REDIRECTS, 5),
    targets,
    configurationIssues: issues,
  };
}

function isOwnedDomain(candidate: string, ownDomain: string): boolean {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  const candidateDomain = normalize(candidate);
  const owned = normalize(ownDomain);
  return candidateDomain === owned || candidateDomain.endsWith(`.${owned}`);
}

function pathAllowed(pathname: string, prefix: string): boolean {
  if (pathname === prefix) return true;
  const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
  return pathname.startsWith(normalizedPrefix);
}

function ipv4Public(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 0 || b === 168)) return false;
  if (a === 192 && b === 0 && parts[2] === 2) return false;
  if (a === 198 && (b === 18 || b === 19 || b === 51 && parts[2] === 100)) return false;
  if (a === 203 && b === 0 && parts[2] === 113) return false;
  return true;
}

function ipv6Public(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0] ?? "";
  const mapped = normalized.match(/(?:^|:)ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mapped) return ipv4Public(mapped);
  if (normalized === "::" || normalized === "::1") return false;
  if (/^f[cd]/.test(normalized)) return false;
  if (/^fe[89ab]/.test(normalized)) return false;
  if (/^ff/.test(normalized)) return false;
  if (/^2001:db8(?::|$)/.test(normalized)) return false;
  return true;
}

export function isPublicNetworkAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return ipv4Public(address);
  if (version === 6) return ipv6Public(address);
  return false;
}

async function validatePublicHost(hostname: string, resolveHost: ResolveHost): Promise<boolean> {
  if (isIP(hostname)) return isPublicNetworkAddress(hostname);
  const addresses = await resolveHost(hostname).catch(() => []);
  return addresses.length > 0 && addresses.every(isPublicNetworkAddress);
}

function validateHop(url: URL, target: CompetitorCollectionTarget, ownDomain: string): string | null {
  if (url.protocol !== "https:" && url.protocol !== "http:") return "unsupported_scheme";
  if (url.username || url.password) return "credential_bearing_url";
  const configured = new URL(target.url);
  if (url.hostname.toLowerCase() !== configured.hostname.toLowerCase()) return "redirect_host_escape";
  if (!pathAllowed(url.pathname, target.allowedPathPrefix)) return "path_not_allowlisted";
  if (isOwnedDomain(url.hostname, ownDomain)) return "own_domain_target";
  return null;
}

async function defaultResolveHost(hostname: string): Promise<string[]> {
  if (isIP(hostname)) return [hostname];
  const results = await lookup(hostname, { all: true, verbatim: true });
  return results.map((result) => result.address);
}

async function readBoundedText(response: Response, maxBytes: number): Promise<{ text: string; bytes: number }> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error("response_too_large");
  if (!response.body) return { text: "", bytes: 0 };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new Error("response_too_large");
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return { text, bytes: total };
}

function robotsRuleMatch(path: string, rule: string): boolean {
  if (!rule) return false;
  const withoutEnd = rule.endsWith("$") ? rule.slice(0, -1) : rule;
  const escaped = withoutEnd.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const regex = new RegExp(`^${escaped}${rule.endsWith("$") ? "$" : ""}`);
  return regex.test(path);
}

export function robotsAllows(robotsText: string, path: string, userAgent = COMPETITOR_RESEARCH_USER_AGENT): boolean {
  const agentToken = userAgent.split("/")[0]?.toLowerCase() ?? "seo-engine-competitor-research";
  const lines = robotsText.split(/\r?\n/).map((line) => line.replace(/#.*$/, "").trim()).filter(Boolean);
  let active = false;
  let groupMatched = false;
  const rules: Array<{ allow: boolean; value: string }> = [];

  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") {
      if (groupMatched && rules.length > 0) active = false;
      const normalized = value.toLowerCase();
      const matches = normalized === "*" || normalized === agentToken;
      if (matches) {
        active = true;
        groupMatched = true;
      } else if (!groupMatched) {
        active = false;
      }
      continue;
    }
    if (!active || (key !== "allow" && key !== "disallow")) continue;
    if (value) rules.push({ allow: key === "allow", value });
  }

  let winner: { allow: boolean; length: number } | null = null;
  for (const rule of rules) {
    if (!robotsRuleMatch(path, rule.value)) continue;
    const length = rule.value.replace(/[\*$]/g, "").length;
    if (!winner || length > winner.length || (length === winner.length && rule.allow)) winner = { allow: rule.allow, length };
  }
  return winner?.allow ?? true;
}

async function fetchRobots(url: URL, target: CompetitorCollectionTarget, deps: RuntimeAcquisitionDependencies): Promise<boolean> {
  const robots = new URL("/robots.txt", url.origin);
  if (!(await validatePublicHost(robots.hostname, deps.resolveHost))) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_COMPETITOR_TIMEOUT_MS);
  try {
    const response = await deps.fetchImpl(robots, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { "user-agent": COMPETITOR_RESEARCH_USER_AGENT, accept: "text/plain,*/*;q=0.1" },
    });
    if (response.status === 404 || response.status === 410) return true;
    if (!response.ok || REDIRECT_STATUSES.has(response.status)) return false;
    const { text } = await readBoundedText(response, DEFAULT_ROBOTS_MAX_RESPONSE_BYTES);
    return robotsAllows(text, url.pathname);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  const regex = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(tag))) {
    const key = match[1]?.toLowerCase();
    if (!key) continue;
    result[key] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return result;
}

function stripMarkup(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function collectJsonLdTypes(value: unknown, output: Set<string>): void {
  if (!value || output.size >= MAX_HINTS) return;
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdTypes(item, output);
    return;
  }
  if (typeof value !== "object") return;
  const object = value as Record<string, unknown>;
  const type = object["@type"];
  if (typeof type === "string" && type.trim()) output.add(type.trim());
  if (Array.isArray(type)) for (const item of type) if (typeof item === "string" && item.trim()) output.add(item.trim());
  for (const child of Object.values(object)) collectJsonLdTypes(child, output);
}

function deriveStructuralSignals(html: string, finalUrl: URL, target: CompetitorCollectionTarget): Omit<CompetitorObservationInput, "source" | "sourceUrl" | "competitorDomain" | "observedAt" | "confidence"> {
  const title = stripMarkup(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const h1 = stripMarkup(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  let metaDescription = "";
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag);
    if ((attrs.name ?? "").toLowerCase() === "description") {
      metaDescription = attrs.content ?? "";
      break;
    }
  }

  const schemaTypes = new Set<string>();
  const scriptRegex = /<script\b[^>]*type\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi;
  let scriptMatch: RegExpExecArray | null;
  while ((scriptMatch = scriptRegex.exec(html))) {
    try {
      collectJsonLdTypes(JSON.parse(scriptMatch[1] ?? "null"), schemaTypes);
    } catch {
      // Malformed third-party JSON-LD is ignored; raw content is never retained.
    }
  }

  const internalPatterns = new Set(target.internalLinkPatterns);
  for (const tag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const href = attributes(tag).href;
    if (!href) continue;
    try {
      const linked = new URL(href, finalUrl);
      if (linked.hostname.toLowerCase() !== finalUrl.hostname.toLowerCase()) continue;
      internalPatterns.add("same-host-internal-link");
      if (linked.pathname.includes("/products/")) internalPatterns.add("collection-to-product");
      if (linked.pathname.includes("/collections/")) internalPatterns.add("collection-to-collection");
    } catch {
      // Ignore malformed third-party links.
    }
  }

  const visibleText = stripMarkup(html);
  const wordCount = visibleText ? visibleText.split(" ").length : 0;
  return {
    title,
    metaDescription,
    h1,
    wordCount,
    pageType: target.pageType,
    keywordThemes: target.keywordThemes,
    taxonomyLabels: target.taxonomyLabels,
    schemaTypes: [...schemaTypes],
    entityTypes: target.entityTypes,
    internalLinkPatterns: [...internalPatterns],
  };
}

async function fetchTargetHtml(input: {
  target: CompetitorCollectionTarget;
  ownDomain: string;
  config: Pick<CompetitorAcquisitionConfig, "timeoutMs" | "maxResponseBytes" | "maxRedirects">;
  deps: RuntimeAcquisitionDependencies;
}): Promise<{ html: string; bytes: number; redirects: number; finalUrl: URL; contentType: string }> {
  let current = new URL(input.target.url);
  let redirects = 0;
  while (true) {
    const invalid = validateHop(current, input.target, input.ownDomain);
    if (invalid) throw new Error(invalid);
    if (!(await validatePublicHost(current.hostname, input.deps.resolveHost))) throw new Error("non_public_network_target");
    if (!(await input.deps.policyChecker(current, input.target, input.deps))) throw new Error("policy_disallowed");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.config.timeoutMs);
    let response: Response;
    try {
      response = await input.deps.fetchImpl(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": COMPETITOR_RESEARCH_USER_AGENT,
          accept: "text/html,application/xhtml+xml;q=0.9",
        },
      });
    } catch (error) {
      if (controller.signal.aborted) throw new Error("request_timeout");
      throw new Error("request_failed", { cause: error });
    } finally {
      clearTimeout(timer);
    }

    if (REDIRECT_STATUSES.has(response.status)) {
      if (redirects >= input.config.maxRedirects) throw new Error("redirect_limit_exceeded");
      const location = response.headers.get("location");
      if (!location) throw new Error("redirect_location_missing");
      const next = new URL(location, current);
      if (current.protocol === "https:" && next.protocol === "http:") throw new Error("https_downgrade_redirect");
      current = next;
      redirects += 1;
      continue;
    }

    if (!response.ok) throw new Error(`http_status_${response.status}`);
    const contentType = (response.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
    if (!HTML_CONTENT_TYPES.includes(contentType)) throw new Error("non_html_response");
    const { text, bytes } = await readBoundedText(response, input.config.maxResponseBytes);
    return { html: text, bytes, redirects, finalUrl: current, contentType };
  }
}

export async function acquireCompetitorObservation(input: {
  target: CompetitorCollectionTarget;
  ownDomain: string;
  config: Pick<CompetitorAcquisitionConfig, "timeoutMs" | "maxResponseBytes" | "maxRedirects">;
  deps?: Partial<RuntimeAcquisitionDependencies>;
  observedAt?: string;
}): Promise<AcquisitionResult> {
  const deps: RuntimeAcquisitionDependencies = {
    fetchImpl: input.deps?.fetchImpl ?? fetch,
    resolveHost: input.deps?.resolveHost ?? defaultResolveHost,
    policyChecker: input.deps?.policyChecker ?? fetchRobots,
  };
  const fetched = await fetchTargetHtml({ target: input.target, ownDomain: input.ownDomain, config: input.config, deps });
  const structural = deriveStructuralSignals(fetched.html, fetched.finalUrl, input.target);
  const normalized = normalizeCompetitorObservation({
    source: input.target.source,
    sourceUrl: fetched.finalUrl.toString(),
    competitorDomain: fetched.finalUrl.hostname,
    observedAt: input.observedAt ?? new Date().toISOString(),
    confidence: input.target.confidence,
    ...structural,
  }, input.ownDomain);
  if (!normalized.ok) throw new Error(`normalization_${normalized.reason}`);

  return {
    targetId: input.target.id,
    record: normalized.record,
    request: {
      redirects: fetched.redirects,
      responseBytes: fetched.bytes,
      finalUrl: normalized.record.payload.sourceUrl,
      contentType: fetched.contentType,
    },
    safety: {
      version: COMPETITOR_ACQUISITION_VERSION,
      boundedTarget: true,
      policyAllowed: true,
      rawContentRetained: false,
      executionAuthorized: false,
      publicSiteWrites: false,
      automaticTransition: false,
    },
  };
}

export function deterministicCompetitorEvidenceId(siteId: string, fingerprint: string): string {
  const bytes = createHash("sha256").update(`${COMPETITOR_ACQUISITION_VERSION}:${siteId}:${fingerprint}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function persistCompetitorEvidence(input: {
  siteId: string;
  record: CompetitorEvidenceEnvelope;
  store: EvidenceStore;
}): Promise<{ id: string; inserted: boolean }> {
  const id = deterministicCompetitorEvidenceId(input.siteId, input.record.payload.fingerprint);
  const row: EvidenceInsert = {
    id,
    siteId: input.siteId,
    pageId: null,
    source: input.record.source,
    kind: COMPETITOR_EVIDENCE_KIND,
    observedAt: input.record.observedAt,
    confidence: input.record.confidence,
    payload: input.record.payload,
    provenance: input.record.provenance,
  };
  const result = await input.store.insertIfAbsent(row);
  if (result === "inserted") return { id, inserted: true };
  const existing = await input.store.getById(id);
  if (!existing || existing.kind !== COMPETITOR_EVIDENCE_KIND || existing.fingerprint !== input.record.payload.fingerprint) {
    throw new Error("competitor_evidence_id_collision");
  }
  return { id, inserted: false };
}

function database() {
  const url = process.env.DATABASE_URL?.trim();
  return url ? postgres(url, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 2 }) : null;
}

function postgresEvidenceStore(sql: ReturnType<typeof postgres>): EvidenceStore {
  return {
    async insertIfAbsent(input) {
      const rows = await sql<Array<{ id: string }>>`
        INSERT INTO evidence(id,site_id,page_id,source,kind,observed_at,confidence,payload,provenance)
        VALUES(
          ${input.id}::uuid,
          ${input.siteId}::uuid,
          ${input.pageId}::uuid,
          ${input.source},
          ${input.kind},
          ${input.observedAt}::timestamptz,
          ${input.confidence},
          ${sql.json(input.payload as never)},
          ${sql.json(input.provenance as never)}
        )
        ON CONFLICT (id) DO NOTHING
        RETURNING id::text AS id`;
      return rows.length > 0 ? "inserted" : "exists";
    },
    async getById(id) {
      const rows = await sql<Array<{ id: string; kind: string; fingerprint: string | null }>>`
        SELECT id::text AS id,kind,payload->>'fingerprint' AS fingerprint
        FROM evidence
        WHERE id=${id}::uuid
        LIMIT 1`;
      return rows[0] ?? null;
    },
    async close() {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    },
  };
}

async function loadSiteContext(): Promise<{ siteId: string; domain: string } | null> {
  const readiness = await getRuntimeReadiness();
  if (readiness.state !== "live" || !readiness.siteId) return null;
  const sql = database();
  if (!sql) return null;
  try {
    const rows = await sql<Array<{ id: string; domain: string }>>`
      SELECT id::text AS id,domain
      FROM sites
      WHERE id=${readiness.siteId}::uuid AND is_active=true
      LIMIT 1`;
    return rows[0] ? { siteId: rows[0].id, domain: rows[0].domain } : null;
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}

export function competitorAcquisitionCapability(env: Env = process.env) {
  const config = loadCompetitorAcquisitionConfig(env);
  return {
    version: COMPETITOR_ACQUISITION_VERSION,
    collectionEnabled: config.collectionEnabled,
    persistenceEnabled: config.persistenceEnabled,
    configuredTargets: config.targets.length,
    configurationIssues: [...config.configurationIssues],
    adminOnlyMutation: true,
    csrfRequired: true,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    publicSiteWrites: false,
    executionAuthorized: false,
  };
}

export async function runConfiguredCompetitorAcquisition(input: {
  targetId: string;
  mode: "dry_run" | "persist";
  env?: Env;
  deps?: Partial<RuntimeAcquisitionDependencies>;
  store?: EvidenceStore;
  observedAt?: string;
}): Promise<AcquisitionRunResult> {
  const config = loadCompetitorAcquisitionConfig(input.env ?? process.env);
  if (config.configurationIssues.length > 0) return { ok: false, reason: "competitor_acquisition_configuration_invalid" };
  if (!config.collectionEnabled) return { ok: false, reason: "competitor_collection_disabled" };
  if (input.mode === "persist" && !config.persistenceEnabled) return { ok: false, reason: "competitor_persistence_disabled" };
  const target = config.targets.find((candidate) => candidate.id === input.targetId);
  if (!target) return { ok: false, reason: "competitor_target_not_allowlisted" };
  const site = await loadSiteContext();
  if (!site) return { ok: false, reason: "operational_site_unavailable" };

  try {
    const acquisition = await acquireCompetitorObservation({
      target,
      ownDomain: site.domain,
      config,
      deps: input.deps,
      observedAt: input.observedAt,
    });
    if (input.mode === "dry_run") {
      return { ok: true, mode: "dry_run", acquisition, persistence: { attempted: false, inserted: false, id: null } };
    }

    const ownedStore = input.store ? null : database();
    const store = input.store ?? (ownedStore ? postgresEvidenceStore(ownedStore) : null);
    if (!store) return { ok: false, reason: "database_unavailable" };
    try {
      const persisted = await persistCompetitorEvidence({ siteId: site.siteId, record: acquisition.record, store });
      return { ok: true, mode: "persist", acquisition, persistence: { attempted: true, inserted: persisted.inserted, id: persisted.id } };
    } finally {
      if (!input.store) await store.close?.();
    }
  } catch (error) {
    const reason = error instanceof Error && error.message ? error.message : "competitor_acquisition_failed";
    return { ok: false, reason };
  }
}
