import { createHash } from "node:crypto";
import postgres from "postgres";
import {
  decryptTokenBundle,
  encryptTokenBundle,
  refreshGoogleAccessToken,
  type EncryptedSecretEnvelope,
  type TokenBundle,
} from "@seo-engine/oauth-connection-manager";
import {
  generateOpportunityCandidates,
  reconcileManagedOpportunities,
  type CrawlPageSignal,
  type GscPageQuerySignal,
  type TechnicalFindingSignal,
} from "./opportunity-engine.js";
import { createDryRunProposal, invalidateDryRunProposal } from "./action-planner.js";
import { applyProposalQualityGate, evaluateProposalQuality } from "./proposal-quality.js";
import { extractSemanticPageText } from "./proposal-content.js";

export const PILOT_LIMITS = {
  crawlPages: 30,
  crawlDepth: 2,
  responseBytes: 750_000,
  requestTimeoutMs: 10_000,
  gscRows: 5_000,
  shopifyProducts: 5_000,
} as const;
export type CrawlLimits = {
  crawlPages: number;
  crawlDepth: number;
  responseBytes: number;
  requestTimeoutMs: number;
  gscRows: number;
  shopifyProducts: number;
};

export type Outcome<T> = { ok: true; data: T } | { ok: false; category: string; httpStatus: number | null };
export type ProviderDiagnostic = { status: "available" | "empty" | "failed"; category: string | null; httpStatus: number | null };
export type ShopifyObservation = { storeVerified: boolean; productCount: number; productsObserved: number; variantCount: number; inventoryQuantity: number | null; truncated: boolean; complete: boolean };
export type GscAggregateMetrics = { clicks: number; impressions: number; ctr: number; position: number | null };
export type GscReconciliation = {
  status: "consistent" | "partial_dimensional" | "inconsistent" | "aggregate_unavailable";
  detailedClicks: number;
  detailedImpressions: number;
  clickCoverage: number | null;
  impressionCoverage: number | null;
};
export type GscObservation = {
  rows: Array<{ date: string; query: string; page: string; country: string; device: string; clicks: number; impressions: number; ctr: number; position: number | null }>;
  aggregate: Outcome<GscAggregateMetrics>;
  reconciliation: GscReconciliation;
  startDate: string;
  endDate: string;
};
export type Ga4Observation = { rows: Array<{ date: string; sessions: number; users: number; pageViews: number }>; startDate: string; endDate: string };
export type CrawlPage = { url: string; path: string; statusCode: number; title: string | null; description: string | null; canonical: string | null; robots: string | null; h1: string | null; contentHash: string; contentText: string; links: string[] };
export type CrawlObservation = { pages: CrawlPage[]; discovered: number; fetched: number; blockedByRobots: number; truncated: boolean };
export type BaselineCertification = {
  status: "pilot_ready" | "partial";
  wholeSiteCertified: false;
  wholeSiteReason: "bounded_crawl";
  crawlCoverage: { fetched: number; discovered: number; percent: number; boundedLimit: number; truncated: boolean };
  technicalFindings: { total: number; withValidEvidence: number; valid: boolean };
  gscAggregate: { status: "available" | "failed"; metrics: GscAggregateMetrics | null; reconciliation: GscReconciliation };
};
export type PilotReadiness = {
  state: "ready" | "partial";
  blockers: string[];
  coverage: { shopify: boolean; gsc: boolean; ga4: boolean; crawl: boolean };
  diagnostics: { shopify: ProviderDiagnostic; gsc: ProviderDiagnostic; gscAggregate: ProviderDiagnostic; ga4: ProviderDiagnostic; crawl: ProviderDiagnostic };
};
export type PilotResult = {
  runId: string;
  status: "completed";
  readiness: PilotReadiness;
  counts: { products: number; catalogProducts: number; productsObserved: number; shopifyComplete: boolean; gscRows: number; gscDetailedRows: number; ga4Rows: number; pages: number; findings: number; opportunities: number };
  certification: BaselineCertification;
};

export const pilotFailureStages = [
  "preflight",
  "provider_reads",
  "persisting_observations",
  "evaluate_load_signals",
  "evaluate_reconcile",
  "evaluate_persist_opportunity",
  "evaluate_persist_action_plan",
  "certification",
  "finish",
] as const;
export type PilotFailureStage = typeof pilotFailureStages[number];

export class PilotExecutionError extends Error {
  readonly category: string;
  readonly stage: PilotFailureStage;
  readonly detail: string;

  constructor(category: string, stage: PilotFailureStage, detail: string) {
    super(category);
    this.name = "PilotExecutionError";
    this.category = category;
    this.stage = stage;
    this.detail = detail;
  }
}

export type ConnectionRecord = { id: string; provider: "shopify" | "google"; secret_ref: string; status: string; scopes: string[]; metadata: Record<string, unknown> };
export type PilotContext = { siteId: string; canonicalOrigin: string; connections: Record<"shopify" | "google", ConnectionRecord> };
type PersistedCounts = { products: number; catalogProducts: number; productsObserved: number; shopifyComplete: boolean; gscRows: number; gscDetailedRows: number; ga4Rows: number; pages: number };

export interface PilotDependencies {
  publicWritesEnabled: boolean;
  loadContext(): Promise<PilotContext>;
  createRun(siteId: string): Promise<string>;
  readShopify(context: PilotContext): Promise<Outcome<ShopifyObservation>>;
  readGsc(context: PilotContext): Promise<Outcome<GscObservation>>;
  readGa4(context: PilotContext): Promise<Outcome<Ga4Observation>>;
  crawl(origin: string): Promise<Outcome<CrawlObservation>>;
  persist(runId: string, context: PilotContext, observations: { shopify: Outcome<ShopifyObservation>; gsc: Outcome<GscObservation>; ga4: Outcome<Ga4Observation>; crawl: Outcome<CrawlObservation> }): Promise<PersistedCounts>;
  evaluate(runId: string, context: PilotContext, readiness: PilotReadiness, observations: { shopify: Outcome<ShopifyObservation>; gsc: Outcome<GscObservation>; ga4: Outcome<Ga4Observation>; crawl: Outcome<CrawlObservation> }, setStage?: (stage: PilotFailureStage) => void): Promise<{ findings: number; opportunities: number; certification: BaselineCertification }>;
  progress(runId: string, phase: string): Promise<void>;
  finish(runId: string, result: Omit<PilotResult, "runId" | "status">): Promise<void>;
  fail(runId: string, category: string, stage: PilotFailureStage, detail: string): Promise<void>;
}

type ReadOnlyProvider = "shopify" | "gsc" | "ga4" | "ga4_admin" | "google_token";

const safeFailureDetail = (value: string) => value
  .replace(/[\u0000-\u001f\u007f]/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 160);

export function sanitizePilotFailureDetail(error: unknown): string {
  if (error && typeof error === "object") {
    const record = error as { code?: unknown; name?: unknown; message?: unknown };
    if (typeof record.code === "string" && /^[0-9A-Z]{5}$/.test(record.code)) return `sqlstate_${record.code}`;
    if (record.name === "AbortError") return "abort_error";
    if (typeof record.message === "string") {
      const message = record.message.toLowerCase();
      const known = [
        ["duplicate key", "duplicate_key"],
        ["violates foreign key", "foreign_key_violation"],
        ["violates not-null", "not_null_violation"],
        ["violates check", "check_violation"],
        ["invalid input syntax", "invalid_input"],
        ["operator does not exist", "operator_mismatch"],
        ["connection", "database_connection"],
        ["timeout", "timeout"],
        ["json", "json_error"],
      ] as const;
      const match = known.find(([needle]) => message.includes(needle));
      if (match) return match[1];
      return safeFailureDetail(String(record.name ?? "runtime_error"));
    }
  }
  return "unknown_error";
}

export function assertReadOnlyProviderRequest(provider: ReadOnlyProvider, method: string, url: string) {
  const parsed = new URL(url);
  const allowed =
    (provider === "shopify" && method === "GET" && parsed.hostname.endsWith(".myshopify.com") && parsed.pathname.startsWith("/admin/api/"))
    || (provider === "gsc" && method === "POST" && parsed.hostname === "www.googleapis.com" && parsed.pathname.includes("/searchAnalytics/query"))
    || (provider === "ga4" && method === "POST" && parsed.hostname === "analyticsdata.googleapis.com" && parsed.pathname.endsWith(":runReport"))
    || (provider === "ga4_admin" && method === "GET" && parsed.hostname === "analyticsadmin.googleapis.com" && /^\/v1beta\/properties\/\d+$/.test(parsed.pathname))
    || (provider === "google_token" && method === "POST" && parsed.hostname === "oauth2.googleapis.com" && parsed.pathname === "/token");
  if (!allowed) throw new Error("pilot_read_only_request_blocked");
}

export function providerFailureCategory(httpStatus: number): string {
  if (httpStatus === 401) return "authentication_error";
  if (httpStatus === 403) return "permission_denied";
  if (httpStatus === 404) return "resource_not_found";
  if (httpStatus === 429) return "rate_limited";
  if (httpStatus >= 500) return "provider_unavailable";
  return "provider_error";
}

function diagnostic<T>(outcome: Outcome<T>, rowCount: number | null = null): ProviderDiagnostic {
  if (!outcome.ok) return { status: "failed", category: outcome.category, httpStatus: outcome.httpStatus };
  if (rowCount === 0) return { status: "empty", category: "no_rows", httpStatus: 200 };
  return { status: "available", category: null, httpStatus: 200 };
}

export function computeBaselineReadiness(input: { shopify: Outcome<ShopifyObservation>; gsc: Outcome<GscObservation>; ga4: Outcome<Ga4Observation>; crawl: Outcome<CrawlObservation> }): PilotReadiness {
  const blockers: string[] = [];
  if (!input.shopify.ok) blockers.push(`shopify_${input.shopify.category}`);
  else if (!input.shopify.data.storeVerified) blockers.push("shopify_identity_unavailable");
  else if (input.shopify.data.productsObserved === 0) blockers.push("shopify_evidence_empty");
  else if (!input.shopify.data.complete) blockers.push("shopify_catalog_incomplete");
  if (!input.gsc.ok) blockers.push(`gsc_${input.gsc.category}`);
  else if (input.gsc.data.rows.length === 0) blockers.push("gsc_evidence_empty");
  else if (!input.gsc.data.aggregate.ok) blockers.push(`gsc_aggregate_${input.gsc.data.aggregate.category}`);
  else if (input.gsc.data.reconciliation.status === "inconsistent") blockers.push("gsc_reconciliation_inconsistent");
  if (!input.ga4.ok) blockers.push(`ga4_${input.ga4.category}`);
  else if (input.ga4.data.rows.length === 0) blockers.push("ga4_evidence_empty");
  if (!input.crawl.ok) blockers.push(`crawl_${input.crawl.category}`);
  else if (input.crawl.data.fetched === 0) blockers.push("crawl_evidence_empty");
  const diagnostics = {
    shopify: diagnostic(input.shopify, input.shopify.ok ? input.shopify.data.productsObserved : null),
    gsc: diagnostic(input.gsc, input.gsc.ok ? input.gsc.data.rows.length : null),
    gscAggregate: input.gsc.ok ? diagnostic(input.gsc.data.aggregate, input.gsc.data.aggregate.ok ? 1 : null) : diagnostic(input.gsc),
    ga4: diagnostic(input.ga4, input.ga4.ok ? input.ga4.data.rows.length : null),
    crawl: diagnostic(input.crawl, input.crawl.ok ? input.crawl.data.fetched : null),
  };
  return {
    state: blockers.length === 0 ? "ready" : "partial",
    blockers,
    coverage: {
      shopify: input.shopify.ok && input.shopify.data.storeVerified && input.shopify.data.productsObserved > 0 && input.shopify.data.complete,
      gsc: input.gsc.ok && input.gsc.data.rows.length > 0 && input.gsc.data.aggregate.ok && input.gsc.data.reconciliation.status !== "inconsistent",
      ga4: input.ga4.ok && input.ga4.data.rows.length > 0,
      crawl: input.crawl.ok && input.crawl.data.fetched > 0,
    },
    diagnostics,
  };
}

export async function executePilot(deps: PilotDependencies, existingRunId?: string): Promise<PilotResult> {
  let runId = existingRunId;
  let stage: PilotFailureStage = "preflight";
  const safe = async <T>(category: string, operation: () => Promise<Outcome<T>>): Promise<Outcome<T>> => {
    try { return await operation(); }
    catch { return { ok: false, category, httpStatus: null }; }
  };
  try {
    if (deps.publicWritesEnabled) throw new Error("pilot_blocked_public_site_writes_enabled");
    const context = await deps.loadContext();
    runId ??= await deps.createRun(context.siteId);
    stage = "provider_reads";
    await deps.progress(runId, "provider_reads");
    const [shopify, gsc, ga4, crawl] = await Promise.all([
      safe("shopify_ingestion_failed", () => deps.readShopify(context)),
      safe("gsc_ingestion_failed", () => deps.readGsc(context)),
      safe("ga4_ingestion_failed", () => deps.readGa4(context)),
      safe("crawl_failed", () => deps.crawl(context.canonicalOrigin)),
    ]);
    stage = "persisting_observations";
    await deps.progress(runId, "persisting_observations");
    const persisted = await deps.persist(runId, context, { shopify, gsc, ga4, crawl });
    const readiness = computeBaselineReadiness({ shopify, gsc, ga4, crawl });
    stage = "evaluate_load_signals";
    await deps.progress(runId, readiness.state === "ready" ? "evaluating_baseline" : "partial_evidence");
    const evaluated = await deps.evaluate(runId, context, readiness, { shopify, gsc, ga4, crawl }, (nextStage) => { stage = nextStage; });
    const result = { readiness, counts: { ...persisted, findings: evaluated.findings, opportunities: evaluated.opportunities }, certification: evaluated.certification };
    stage = "finish";
    await deps.finish(runId, result);
    return { runId, status: "completed", ...result };
  } catch (error) {
    const category = error instanceof Error && /^pilot_[a-z0-9_]+$/.test(error.message) ? error.message : "pilot_internal_failure";
    const detail = error instanceof PilotExecutionError ? error.detail : sanitizePilotFailureDetail(error);
    const failureStage = error instanceof PilotExecutionError ? error.stage : stage;
    if (runId) await deps.fail(runId, category, failureStage, detail).catch(() => undefined);
    throw new PilotExecutionError(category, failureStage, detail);
  }
}

function normalizeCrawlUrl(value: string, base: string): string | null {
  try {
    const url = new URL(value, base);
    if (!["http:", "https:"].includes(url.protocol) || !["diamondshelf.us", "www.diamondshelf.us"].includes(url.hostname.toLowerCase())) return null;
    if (/\/(?:cart|checkout|account|apps)(?:\/|$)/i.test(url.pathname)) return null;
    url.protocol = "https:";
    url.hash = "";
    url.search = "";
    url.hostname = "diamondshelf.us";
    url.pathname = url.pathname.replace(/\/{2,}/g, "/");
    return url.toString().replace(/\/$/, "") || "https://diamondshelf.us";
  } catch {
    return null;
  }
}

function htmlValue(html: string, pattern: RegExp): string | null {
  const value = html.match(pattern)?.[1]?.replace(/\s+/g, " ").trim();
  return value || null;
}

async function boundedText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("crawl_response_too_large");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

function robotsDisallows(robots: string, path: string) {
  let applies = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (key?.toLowerCase() === "user-agent") applies = value === "*";
    if (applies && key?.toLowerCase() === "disallow" && value && path.startsWith(value)) return true;
  }
  return false;
}

export async function crawlSite(seedOrigin: string, fetchImpl: typeof fetch = fetch, limits: CrawlLimits = PILOT_LIMITS): Promise<CrawlObservation> {
  const seed = normalizeCrawlUrl(seedOrigin, seedOrigin);
  if (!seed) throw new Error("crawl_seed_not_allowed");
  let robots = "";
  try {
    const response = await fetchImpl(`${seed}/robots.txt`, { method: "GET", headers: { "User-Agent": "SEO-ENGINE-Pilot/1.0" }, signal: AbortSignal.timeout(limits.requestTimeoutMs) });
    if (response.ok) robots = await boundedText(response, Math.min(limits.responseBytes, 100_000));
  } catch {}
  const queue: Array<{ url: string; depth: number }> = [{ url: seed, depth: 0 }];
  const seen = new Set<string>();
  const pages: CrawlPage[] = [];
  let blockedByRobots = 0;
  while (queue.length && pages.length < limits.crawlPages) {
    const next = queue.shift()!;
    if (seen.has(next.url)) continue;
    seen.add(next.url);
    const parsed = new URL(next.url);
    if (robotsDisallows(robots, parsed.pathname)) {
      blockedByRobots++;
      continue;
    }
    try {
      const response = await fetchImpl(next.url, { method: "GET", redirect: "follow", headers: { "User-Agent": "SEO-ENGINE-Pilot/1.0", Accept: "text/html,application/xhtml+xml" }, signal: AbortSignal.timeout(limits.requestTimeoutMs) });
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) continue;
      const html = await boundedText(response, limits.responseBytes);
      const actualUrl = normalizeCrawlUrl(response.url || next.url, next.url) ?? next.url;
      const links = [...html.matchAll(/<a\b[^>]*\bhref=["']([^"'#]+)["']/gi)]
        .map((match) => normalizeCrawlUrl(match[1]!, actualUrl))
        .filter((value): value is string => Boolean(value));
      const uniqueLinks = [...new Set(links)].slice(0, 200);
      const contentText = extractSemanticPageText(html);
      pages.push({
        url: actualUrl,
        path: new URL(actualUrl).pathname,
        statusCode: response.status,
        title: htmlValue(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
        description: htmlValue(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ?? htmlValue(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i),
        canonical: htmlValue(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i),
        robots: htmlValue(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i),
        h1: htmlValue(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)?.replace(/<[^>]+>/g, " ").trim() ?? null,
        contentHash: createHash("sha256").update(html).digest("hex"),
        contentText,
        links: uniqueLinks,
      });
      if (next.depth < limits.crawlDepth) for (const link of uniqueLinks) if (!seen.has(link)) queue.push({ url: link, depth: next.depth + 1 });
    } catch {}
  }
  return { pages, discovered: seen.size + queue.length, fetched: pages.length, blockedByRobots, truncated: queue.length > 0 };
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`pilot_missing_${name.toLowerCase()}`);
  return value;
}

function database() {
  return postgres(required("DATABASE_URL"), { max: 1, prepare: false, connect_timeout: 10, idle_timeout: 5 });
}

function tokenFromConnection(connection: ConnectionRecord): TokenBundle {
  if (!connection.secret_ref.startsWith("enc:v1:")) throw new Error("pilot_invalid_credential_envelope");
  const envelope = JSON.parse(Buffer.from(connection.secret_ref.slice(7), "base64url").toString()) as EncryptedSecretEnvelope;
  return decryptTokenBundle(envelope, required("OAUTH_CREDENTIAL_ENCRYPTION_KEY"));
}

export function sanitizedGoogleFailureCategory(httpStatus: number, payload: unknown): string {
  if (httpStatus !== 403) return providerFailureCategory(httpStatus);
  const error = typeof payload === "object" && payload ? (payload as { error?: unknown }).error : null;
  const record = typeof error === "object" && error ? error as { message?: unknown; status?: unknown; details?: unknown } : {};
  const message = typeof record.message === "string" ? record.message.toLowerCase().slice(0, 2_000) : "";
  const details = Array.isArray(record.details) ? JSON.stringify(record.details).toLowerCase().slice(0, 4_000) : "";
  if (message.includes("has not been used") || message.includes("is disabled") || details.includes("service_disabled")) return "api_not_enabled";
  if (message.includes("permission") || message.includes("access") || record.status === "PERMISSION_DENIED") return "property_access_denied";
  return "permission_denied";
}

async function requestJson<T>(provider: Exclude<ReadOnlyProvider, "google_token">, url: string, method: "GET" | "POST", accessToken: string, body?: unknown, fetchImpl: typeof fetch = fetch): Promise<Outcome<T>> {
  assertReadOnlyProviderRequest(provider, method, url);
  try {
    const authHeaders = provider === "shopify"
      ? { "X-Shopify-Access-Token": accessToken }
      : { Authorization: `Bearer ${accessToken}` };
    const response = await fetchImpl(url, {
      method,
      headers: { Accept: "application/json", ...authHeaders, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      let payload: unknown = null;
      if (provider === "ga4" || provider === "ga4_admin") {
        try { payload = JSON.parse(await boundedText(response, 16_000)); } catch {}
      }
      return {
        ok: false,
        category: provider === "ga4" || provider === "ga4_admin"
          ? sanitizedGoogleFailureCategory(response.status, payload)
          : providerFailureCategory(response.status),
        httpStatus: response.status,
      };
    }
    return { ok: true, data: await response.json() as T };
  } catch {
    return { ok: false, category: "network_error", httpStatus: null };
  }
}

type ShopifyProduct = { id?: number; variants?: Array<{ inventory_quantity?: number }> };

function nextShopifyLink(value: string | null): string | null {
  if (!value) return null;
  for (const part of value.split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="?next"?/i);
    if (match?.[1]) return match[1];
  }
  return null;
}

export async function paginateShopifyCatalog(options: {
  base: string;
  accessToken: string;
  productCount: number;
  fetchImpl?: typeof fetch;
  limit?: number;
}): Promise<Outcome<Omit<ShopifyObservation, "storeVerified" | "productCount">>> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const limit = Math.max(0, Math.floor(options.limit ?? PILOT_LIMITS.shopifyProducts));
  let url: string | null = limit > 0
    ? `${options.base}/products.json?limit=${Math.min(250, limit)}&fields=id,variants`
    : null;
  let productsObserved = 0;
  let variantCount = 0;
  let inventoryQuantity = 0;
  let inventoryAvailable = true;
  let exhausted = limit === 0;
  const seen = new Set<string>();
  while (url && productsObserved < limit && !seen.has(url)) {
    seen.add(url);
    assertReadOnlyProviderRequest("shopify", "GET", url);
    try {
      const response = await fetchImpl(url, {
        method: "GET",
        headers: { Accept: "application/json", "X-Shopify-Access-Token": options.accessToken },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) return { ok: false, category: providerFailureCategory(response.status), httpStatus: response.status };
      const data = await response.json() as { products?: ShopifyProduct[] };
      const remaining = limit - productsObserved;
      const products = (data.products ?? []).slice(0, remaining);
      productsObserved += products.length;
      for (const product of products) {
        for (const variant of product.variants ?? []) {
          variantCount++;
          if (typeof variant.inventory_quantity === "number") inventoryQuantity += variant.inventory_quantity;
          else inventoryAvailable = false;
        }
      }
      if (products.length === 0) {
        exhausted = true;
        break;
      }
      const next = nextShopifyLink(response.headers.get("link"));
      if (!next) {
        exhausted = true;
        break;
      }
      if (productsObserved >= limit) break;
      const parsed = new URL(next);
      if (parsed.origin !== new URL(options.base).origin) return { ok: false, category: "pagination_resource_mismatch", httpStatus: null };
      url = parsed.toString();
    } catch {
      return { ok: false, category: "network_error", httpStatus: null };
    }
  }
  const complete = exhausted && productsObserved >= options.productCount;
  return { ok: true, data: { productsObserved, variantCount, inventoryQuantity: inventoryAvailable ? inventoryQuantity : null, truncated: !complete, complete } };
}

export function isSelectedGa4PropertyDiscovered(metadata: Record<string, unknown>, propertyId: string): boolean {
  if ((metadata.ga4Discovery as { ok?: unknown } | undefined)?.ok !== true) return false;
  const properties = Array.isArray(metadata.discoveredGa4Properties)
    ? metadata.discoveredGa4Properties as Array<{ propertyId?: unknown }>
    : [];
  return properties.some((property) => property.propertyId === propertyId);
}

export function ga4ReportBody(startDate: string, endDate: string) {
  return {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }],
    keepEmptyRows: false,
    returnPropertyQuota: false,
    limit: 100,
  };
}

export function gscAggregateRequestBody(startDate: string, endDate: string) {
  return { startDate, endDate, rowLimit: 1, dataState: "final" };
}

export function gscDetailedRequestBody(startDate: string, endDate: string, rowLimit = PILOT_LIMITS.gscRows) {
  return { startDate, endDate, dimensions: ["date", "query", "page", "country", "device"], rowLimit, dataState: "final" };
}

export function parseGscAggregate(row: { clicks?: unknown; impressions?: unknown; ctr?: unknown; position?: unknown } | undefined): GscAggregateMetrics | null {
  const clicks = Number(row?.clicks ?? 0);
  const impressions = Number(row?.impressions ?? 0);
  const ctr = Number(row?.ctr ?? 0);
  const position = row?.position == null ? null : Number(row.position);
  if (![clicks, impressions, ctr].every((value) => Number.isFinite(value) && value >= 0)) return null;
  if (position !== null && (!Number.isFinite(position) || position < 0)) return null;
  return { clicks, impressions, ctr, position };
}

export function reconcileGscAggregate(rows: GscObservation["rows"], aggregate: Outcome<GscAggregateMetrics>): GscReconciliation {
  const detailedClicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const detailedImpressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  if (!aggregate.ok) return { status: "aggregate_unavailable", detailedClicks, detailedImpressions, clickCoverage: null, impressionCoverage: null };
  const clickCoverage = aggregate.data.clicks > 0 ? detailedClicks / aggregate.data.clicks : detailedClicks === 0 ? 1 : null;
  const impressionCoverage = aggregate.data.impressions > 0 ? detailedImpressions / aggregate.data.impressions : detailedImpressions === 0 ? 1 : null;
  const clickTolerance = Math.max(1, aggregate.data.clicks * 0.02);
  const impressionTolerance = Math.max(1, aggregate.data.impressions * 0.02);
  if (detailedClicks > aggregate.data.clicks + clickTolerance || detailedImpressions > aggregate.data.impressions + impressionTolerance) {
    return { status: "inconsistent", detailedClicks, detailedImpressions, clickCoverage, impressionCoverage };
  }
  const partial = (clickCoverage !== null && clickCoverage < 0.98) || (impressionCoverage !== null && impressionCoverage < 0.98);
  return { status: partial ? "partial_dimensional" : "consistent", detailedClicks, detailedImpressions, clickCoverage, impressionCoverage };
}

export function organicCtrOpportunityValidity(aggregate: Outcome<GscAggregateMetrics>): { valid: boolean; reason: string } {
  if (!aggregate.ok) return { valid: false, reason: "gsc_aggregate_unavailable" };
  if (aggregate.data.impressions < 10) return { valid: false, reason: "insufficient_aggregate_impressions" };
  if (aggregate.data.ctr >= 0.03) return { valid: false, reason: "aggregate_ctr_not_low" };
  if (aggregate.data.position === null || aggregate.data.position < 4 || aggregate.data.position > 20) return { valid: false, reason: "aggregate_position_outside_ctr_opportunity_range" };
  return { valid: true, reason: "aggregate_ctr_opportunity_supported" };
}

export function assessTechnicalFindingEvidence(rows: Array<{ pageId: string | null; evidencePageId: string | null; source: string | null; kind: string | null }>) {
  const withValidEvidence = rows.filter((row) => Boolean(row.pageId) && row.pageId === row.evidencePageId && row.source === "crawler" && row.kind === "technical_page_observation").length;
  return { total: rows.length, withValidEvidence, valid: withValidEvidence === rows.length };
}

export function buildBaselineCertification(input: {
  readiness: PilotReadiness;
  crawl: Outcome<CrawlObservation>;
  technicalFindings: { total: number; withValidEvidence: number; valid: boolean };
  gsc: Outcome<GscObservation>;
}): BaselineCertification {
  const crawl = input.crawl.ok ? input.crawl.data : { fetched: 0, discovered: 0, truncated: true };
  const discovered = Math.max(crawl.discovered, crawl.fetched);
  const percent = discovered > 0 ? Math.min(100, (crawl.fetched / discovered) * 100) : 0;
  const aggregate = input.gsc.ok ? input.gsc.data.aggregate : { ok: false as const, category: input.gsc.category, httpStatus: input.gsc.httpStatus };
  const reconciliation = input.gsc.ok
    ? input.gsc.data.reconciliation
    : { status: "aggregate_unavailable" as const, detailedClicks: 0, detailedImpressions: 0, clickCoverage: null, impressionCoverage: null };
  return {
    status: input.readiness.state === "ready" && input.technicalFindings.valid ? "pilot_ready" : "partial",
    wholeSiteCertified: false,
    wholeSiteReason: "bounded_crawl",
    crawlCoverage: { fetched: crawl.fetched, discovered, percent, boundedLimit: PILOT_LIMITS.crawlPages, truncated: crawl.truncated },
    technicalFindings: input.technicalFindings,
    gscAggregate: { status: aggregate.ok ? "available" : "failed", metrics: aggregate.ok ? aggregate.data : null, reconciliation },
  };
}

export function parseShopifyProductCount(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function isoDate(daysAgo: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

async function refreshGoogleIfNeeded(context: PilotContext): Promise<TokenBundle> {
  const connection = context.connections.google;
  let bundle = tokenFromConnection(connection);
  const expires = bundle.expiresAt ? Date.parse(bundle.expiresAt) : 0;
  if (expires > Date.now() + 60_000) return bundle;
  if (!bundle.refreshToken) throw new Error("pilot_google_refresh_unavailable");
  const url = "https://oauth2.googleapis.com/token";
  assertReadOnlyProviderRequest("google_token", "POST", url);
  bundle = await refreshGoogleAccessToken({
    clientId: required("GOOGLE_OAUTH_CLIENT_ID"),
    clientSecret: required("GOOGLE_OAUTH_CLIENT_SECRET"),
    redirectUri: `${required("APP_ORIGIN")}/api/connections/google/callback`,
  }, bundle.refreshToken);
  const envelope = encryptTokenBundle(bundle, required("OAUTH_CREDENTIAL_ENCRYPTION_KEY"));
  const secretRef = `enc:v1:${Buffer.from(JSON.stringify(envelope)).toString("base64url")}`;
  const sql = database();
  try {
    await sql`UPDATE connections SET secret_ref=${secretRef},metadata=${sql.json({ ...connection.metadata, hasRefreshToken: true, tokenExpiresAt: bundle.expiresAt })},updated_at=now() WHERE id=${connection.id}::uuid`;
  } finally {
    await sql.end({ timeout: 2 });
  }
  return bundle;
}

export async function loadProductionPilotContext(): Promise<PilotContext> {
  const sql = database();
  try {
    const sites = await sql<{ id: string; canonical_origin: string }[]>`SELECT id::text,canonical_origin FROM sites WHERE lower(domain)='diamondshelf.us' AND is_active=true ORDER BY updated_at DESC LIMIT 1`;
    const site = sites[0];
    if (!site) throw new Error("pilot_site_missing");
    const rows = await sql<ConnectionRecord[]>`SELECT id::text,provider,secret_ref,status,scopes,metadata FROM connections WHERE site_id=${site.id}::uuid AND provider IN ('shopify','google') ORDER BY updated_at DESC`;
    const shopify = rows.find((row) => row.provider === "shopify");
    const google = rows.find((row) => row.provider === "google");
    if (!shopify || !google || shopify.status !== "connected" || google.status !== "connected" || !shopify.secret_ref || !google.secret_ref) throw new Error("pilot_required_connections_missing");
    const context = { siteId: site.id, canonicalOrigin: site.canonical_origin, connections: { shopify, google } };
    const origin = new URL(context.canonicalOrigin);
    if (origin.protocol !== "https:" || !["diamondshelf.us", "www.diamondshelf.us"].includes(origin.hostname.toLowerCase())) throw new Error("pilot_site_identity_mismatch");
    const shopifyBundle = tokenFromConnection(shopify);
    const googleBundle = tokenFromConnection(google);
    if (!shopifyBundle.accessToken || !googleBundle.accessToken) throw new Error("pilot_credentials_unavailable");
    if (typeof shopify.metadata.shopDomain !== "string" || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shopify.metadata.shopDomain)) throw new Error("pilot_shopify_resource_incomplete");
    if (typeof google.metadata.gscSiteUrl !== "string" || typeof google.metadata.ga4PropertyId !== "string") throw new Error("pilot_google_resources_incomplete");
    if (google.metadata.connectionState !== "connected" || google.metadata.needsConfirmation === true) throw new Error("pilot_google_connection_incomplete");
    return context;
  } finally {
    await sql.end({ timeout: 2 });
  }
}

async function createRun(siteId: string) {
  const sql = database();
  try {
    return await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtext(${'pilot_ingestion_v1:' + siteId}))`;
      const active = await tx<{ id: string }[]>`SELECT id::text FROM jobs WHERE site_id=${siteId}::uuid AND job_type='pilot_ingestion_v1' AND status IN ('pending','active') LIMIT 1`;
      if (active[0]) throw new Error("pilot_run_already_active");
      const rows = await tx<{ id: string }[]>`INSERT INTO jobs(site_id,job_type,status,priority,payload,locked_at,attempts) VALUES(${siteId}::uuid,'pilot_ingestion_v1','active',10,${tx.json({ phase: "provider_reads", limits: PILOT_LIMITS, publicSiteWrites: false })},now(),1) RETURNING id::text`;
      return rows[0]!.id;
    });
  } finally {
    await sql.end({ timeout: 2 });
  }
}

async function progress(runId: string, phase: string) {
  const sql = database();
  try {
    await sql`UPDATE jobs SET status='active',payload=payload || ${sql.json({ phase, publicSiteWrites: false })},locked_at=COALESCE(locked_at,now()),updated_at=now() WHERE id=${runId}::uuid AND status IN ('pending','active')`;
  } finally {
    await sql.end({ timeout: 2 });
  }
}

async function readShopify(context: PilotContext): Promise<Outcome<ShopifyObservation>> {
  const connection = context.connections.shopify;
  const token = tokenFromConnection(connection);
  const shopDomain = typeof connection.metadata.shopDomain === "string" ? connection.metadata.shopDomain : "";
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shopDomain)) return { ok: false, category: "shop_domain_missing", httpStatus: null };
  const base = `https://${shopDomain}/admin/api/2025-10`;
  const [shop, count] = await Promise.all([
    requestJson<{ shop?: { domain?: string; myshopify_domain?: string } }>("shopify", `${base}/shop.json?fields=domain,myshopify_domain`, "GET", token.accessToken),
    requestJson<{ count?: number }>("shopify", `${base}/products/count.json`, "GET", token.accessToken),
  ]);
  if (!shop.ok) return shop;
  if (!count.ok) return count;
  const reportedCount = parseShopifyProductCount(count.data.count);
  if (reportedCount === null) return { ok: false, category: "invalid_count_response", httpStatus: 200 };
  const catalog = await paginateShopifyCatalog({ base, accessToken: token.accessToken, productCount: reportedCount });
  if (!catalog.ok) return catalog;
  const productCount = Math.max(reportedCount, catalog.data.productsObserved);
  const complete = catalog.data.complete && catalog.data.productsObserved >= productCount;
  const verifiedDomain = [shop.data.shop?.domain, shop.data.shop?.myshopify_domain].some((value) => typeof value === "string" && (value === shopDomain || /diamondshelf\.us$/i.test(value)));
  return { ok: true, data: { storeVerified: verifiedDomain, productCount, ...catalog.data, complete, truncated: !complete } };
}

async function readGsc(context: PilotContext): Promise<Outcome<GscObservation>> {
  const bundle = await refreshGoogleIfNeeded(context);
  const siteUrl = typeof context.connections.google.metadata.gscSiteUrl === "string" ? context.connections.google.metadata.gscSiteUrl : "";
  if (!siteUrl) return { ok: false, category: "property_missing", httpStatus: null };
  const startDate = isoDate(27);
  const endDate = isoDate(1);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  type GscResponse = { rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }> };
  const [aggregateResult, detailedResult] = await Promise.all([
    requestJson<GscResponse>("gsc", url, "POST", bundle.accessToken, gscAggregateRequestBody(startDate, endDate)),
    requestJson<GscResponse>("gsc", url, "POST", bundle.accessToken, gscDetailedRequestBody(startDate, endDate)),
  ]);
  if (!detailedResult.ok) return detailedResult;
  const rows = (detailedResult.data.rows ?? []).flatMap((row) => {
    const [date, query, page, country, device] = row.keys ?? [];
    if (!date || !query || !page || !country || !device) return [];
    return [{ date, query, page, country: country.toUpperCase(), device: device.toLowerCase(), clicks: Number(row.clicks ?? 0), impressions: Number(row.impressions ?? 0), ctr: Number(row.ctr ?? 0), position: Number.isFinite(row.position) ? Number(row.position) : null }];
  });
  const aggregate: Outcome<GscAggregateMetrics> = aggregateResult.ok
    ? (() => {
      const metrics = parseGscAggregate(aggregateResult.data.rows?.[0]);
      return metrics ? { ok: true as const, data: metrics } : { ok: false as const, category: "invalid_aggregate_response", httpStatus: 200 };
    })()
    : aggregateResult;
  return { ok: true, data: { rows, aggregate, reconciliation: reconcileGscAggregate(rows, aggregate), startDate, endDate } };
}

async function readGa4(context: PilotContext): Promise<Outcome<Ga4Observation>> {
  const bundle = await refreshGoogleIfNeeded(context);
  const propertyId = typeof context.connections.google.metadata.ga4PropertyId === "string" ? context.connections.google.metadata.ga4PropertyId : "";
  if (!/^\d+$/.test(propertyId)) return { ok: false, category: "property_missing", httpStatus: null };
  if (!isSelectedGa4PropertyDiscovered(context.connections.google.metadata, propertyId)) return { ok: false, category: "property_not_discovered", httpStatus: null };
  const startDate = isoDate(27);
  const endDate = isoDate(1);
  const property = await requestJson<{ name?: string }>(
    "ga4_admin",
    `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}`,
    "GET",
    bundle.accessToken,
  );
  if (!property.ok) return property;
  if (property.data.name !== `properties/${propertyId}`) return { ok: false, category: "property_validation_failed", httpStatus: 200 };
  const result = await requestJson<{ rows?: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }> }>(
    "ga4",
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    "POST",
    bundle.accessToken,
    ga4ReportBody(startDate, endDate),
  );
  if (!result.ok) return result;
  const rows = (result.data.rows ?? []).flatMap((row) => {
    const dateRaw = row.dimensionValues?.[0]?.value;
    if (!dateRaw || !/^\d{8}$/.test(dateRaw)) return [];
    const date = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6)}`;
    return [{ date, sessions: Number(row.metricValues?.[0]?.value ?? 0), users: Number(row.metricValues?.[1]?.value ?? 0), pageViews: Number(row.metricValues?.[2]?.value ?? 0) }];
  });
  return { ok: true, data: { rows, startDate, endDate } };
}

async function persist(runId: string, context: PilotContext, observations: { shopify: Outcome<ShopifyObservation>; gsc: Outcome<GscObservation>; ga4: Outcome<Ga4Observation>; crawl: Outcome<CrawlObservation> }): Promise<PersistedCounts> {
  const sql = database();
  let products = 0, catalogProducts = 0, productsObserved = 0, shopifyComplete = false, gscRows = 0, gscDetailedRows = 0, ga4Rows = 0, pages = 0;
  try {
    await sql.begin(async (tx) => {
      if (observations.shopify.ok) {
        products = observations.shopify.data.productsObserved;
        productsObserved = observations.shopify.data.productsObserved;
        catalogProducts = observations.shopify.data.productCount;
        shopifyComplete = observations.shopify.data.complete;
        await tx`INSERT INTO evidence(site_id,source,kind,confidence,payload,provenance) VALUES(${context.siteId}::uuid,'shopify','catalog_baseline',1,${tx.json(observations.shopify.data)},${tx.json({ runId, mode: "read_only" })})`;
      }
      if (observations.gsc.ok) {
        for (const row of observations.gsc.data.rows) {
          const pageRows = await tx<{ id: string }[]>`INSERT INTO pages(site_id,url,normalized_url,path,last_seen_at) VALUES(${context.siteId}::uuid,${row.page},${row.page.replace(/\/$/, "").toLowerCase()},${new URL(row.page).pathname},now()) ON CONFLICT(site_id,normalized_url) DO UPDATE SET last_seen_at=now() RETURNING id::text`;
          const queryRows = await tx<{ id: string }[]>`INSERT INTO search_queries(site_id,query,country,device,last_seen_at) VALUES(${context.siteId}::uuid,${row.query},${row.country},${row.device},now()) ON CONFLICT(site_id,query,country,device) DO UPDATE SET last_seen_at=now() RETURNING id::text`;
          await tx`INSERT INTO search_metrics(query_id,page_id,metric_date,source,impressions,clicks,ctr,average_position) VALUES(${queryRows[0]!.id}::uuid,${pageRows[0]!.id}::uuid,${row.date}::date,'gsc',${row.impressions},${row.clicks},${row.ctr},${row.position}) ON CONFLICT(query_id,page_id,metric_date,source) DO UPDATE SET impressions=EXCLUDED.impressions,clicks=EXCLUDED.clicks,ctr=EXCLUDED.ctr,average_position=EXCLUDED.average_position`;
          gscRows++;
          gscDetailedRows++;
        }
        await tx`INSERT INTO evidence(site_id,source,kind,confidence,payload,provenance) VALUES(${context.siteId}::uuid,'gsc','performance_ingestion',1,${tx.json({ detailedRowCount: gscDetailedRows, startDate: observations.gsc.data.startDate, endDate: observations.gsc.data.endDate, reconciliation: observations.gsc.data.reconciliation })},${tx.json({ runId, mode: "read_only", dataset: "dimensional" })})`;
        if (observations.gsc.data.aggregate.ok) {
          await tx`INSERT INTO evidence(site_id,source,kind,confidence,payload,provenance) VALUES(${context.siteId}::uuid,'gsc','performance_aggregate',1,${tx.json({ status: "available", metrics: observations.gsc.data.aggregate.data, startDate: observations.gsc.data.startDate, endDate: observations.gsc.data.endDate, reconciliation: observations.gsc.data.reconciliation })},${tx.json({ runId, mode: "read_only", dataset: "property_aggregate" })})`;
        } else {
          await tx`INSERT INTO evidence(site_id,source,kind,confidence,payload,provenance) VALUES(${context.siteId}::uuid,'gsc','performance_aggregate',1,${tx.json({ status: "failed", category: observations.gsc.data.aggregate.category, httpStatus: observations.gsc.data.aggregate.httpStatus, startDate: observations.gsc.data.startDate, endDate: observations.gsc.data.endDate, reconciliation: observations.gsc.data.reconciliation })},${tx.json({ runId, mode: "read_only", dataset: "property_aggregate", sanitized: true })})`;
        }
      }
      if (observations.ga4.ok) {
        ga4Rows = observations.ga4.data.rows.length;
        await tx`INSERT INTO evidence(site_id,source,kind,confidence,payload,provenance) VALUES(${context.siteId}::uuid,'ga4','traffic_baseline',1,${tx.json({ rows: observations.ga4.data.rows, startDate: observations.ga4.data.startDate, endDate: observations.ga4.data.endDate })},${tx.json({ runId, mode: "read_only" })})`;
      } else {
        const propertyId = typeof context.connections.google.metadata.ga4PropertyId === "string" ? context.connections.google.metadata.ga4PropertyId : null;
        await tx`INSERT INTO evidence(site_id,source,kind,confidence,payload,provenance) VALUES(${context.siteId}::uuid,'ga4','provider_diagnostic',1,${tx.json({ status: "failed", category: observations.ga4.category, httpStatus: observations.ga4.httpStatus, propertyId, startDate: isoDate(27), endDate: isoDate(1) })},${tx.json({ runId, mode: "read_only", sanitized: true })})`;
      }
      if (observations.crawl.ok) {
        const crawlRows = await tx<{ id: string }[]>`INSERT INTO crawl_runs(site_id,status,started_at,completed_at,seed_url,pages_discovered,pages_fetched,metadata) VALUES(${context.siteId}::uuid,'completed',now(),now(),${context.canonicalOrigin},${observations.crawl.data.discovered},${observations.crawl.data.fetched},${tx.json({ runId, limits: PILOT_LIMITS, blockedByRobots: observations.crawl.data.blockedByRobots, truncated: observations.crawl.data.truncated, mode: "read_only" })}) RETURNING id::text`;
        for (const page of observations.crawl.data.pages) {
          const pageRows = await tx<{ id: string }[]>`INSERT INTO pages(site_id,url,normalized_url,path,indexable,last_seen_at) VALUES(${context.siteId}::uuid,${page.url},${page.url.replace(/\/$/, "").toLowerCase()},${page.path},${page.statusCode >= 200 && page.statusCode < 400 && !/noindex/i.test(page.robots ?? "")},now()) ON CONFLICT(site_id,normalized_url) DO UPDATE SET url=EXCLUDED.url,path=EXCLUDED.path,indexable=EXCLUDED.indexable,last_seen_at=now() RETURNING id::text`;
          await tx`INSERT INTO page_snapshots(page_id,crawl_run_id,status_code,title,meta_description,canonical_url,robots,h1,content_hash,content_text,links,raw_signals) VALUES(${pageRows[0]!.id}::uuid,${crawlRows[0]!.id}::uuid,${page.statusCode},${page.title},${page.description},${page.canonical},${page.robots},${page.h1},${page.contentHash},${page.contentText},${tx.json(page.links)},${tx.json({ runId, readOnly: true })})`;
          await tx`INSERT INTO evidence(site_id,source,kind,confidence,payload,provenance) VALUES(${context.siteId}::uuid,'crawler','technical_page_observation',1,${tx.json({ pageId: pageRows[0]!.id, url: page.url, statusCode: page.statusCode, titlePresent: page.title !== null, descriptionPresent: page.description !== null, h1Present: page.h1 !== null, contentHash: page.contentHash })},${tx.json({ runId, mode: "read_only", crawlRunId: crawlRows[0]!.id })})`;
          pages++;
        }
        await tx`INSERT INTO evidence(site_id,source,kind,confidence,payload,provenance) VALUES(${context.siteId}::uuid,'crawler','crawl_coverage',1,${tx.json({ discovered: observations.crawl.data.discovered, fetched: pages, blockedByRobots: observations.crawl.data.blockedByRobots, truncated: observations.crawl.data.truncated })},${tx.json({ runId, limits: PILOT_LIMITS, mode: "read_only" })})`;
      }
    });
    return { products, catalogProducts, productsObserved, shopifyComplete, gscRows, gscDetailedRows, ga4Rows, pages };
  } finally {
    await sql.end({ timeout: 2 });
  }
}

async function evaluate(runId: string, context: PilotContext, readiness: PilotReadiness, observations: { shopify: Outcome<ShopifyObservation>; gsc: Outcome<GscObservation>; ga4: Outcome<Ga4Observation>; crawl: Outcome<CrawlObservation> }, setStage: (stage: PilotFailureStage) => void = () => undefined) {
  const sql = database();
  try {
    setStage("evaluate_load_signals");
    const summaryEvidence = await sql<{ id: string }[]>`INSERT INTO evidence(site_id,source,kind,confidence,payload,provenance) VALUES(${context.siteId}::uuid,'seo_engine','baseline_readiness',1,${sql.json(readiness)},${sql.json({ runId, evaluator: "baseline_v2" })}) RETURNING id::text`;
    const evidenceId = summaryEvidence[0]!.id;
    const findingRows = readiness.state === "ready" ? await sql<{ id: string }[]>`
      INSERT INTO findings(site_id,page_id,primary_evidence_id,rule_id,category,severity,title,description)
      SELECT ${context.siteId}::uuid,p.id,pe.id,
        CASE WHEN ps.title IS NULL THEN 'baseline.missing_title' WHEN ps.meta_description IS NULL THEN 'baseline.missing_description' ELSE 'baseline.missing_h1' END,
        'technical_seo','medium',
        CASE WHEN ps.title IS NULL THEN 'Page title is missing' WHEN ps.meta_description IS NULL THEN 'Meta description is missing' ELSE 'Primary heading is missing' END,
        'Observed in the bounded read-only pilot crawl with page-level source evidence.'
      FROM pages p
      JOIN LATERAL (SELECT title,meta_description,h1 FROM page_snapshots WHERE page_id=p.id ORDER BY observed_at DESC LIMIT 1) ps ON true
      JOIN LATERAL (SELECT id FROM evidence WHERE site_id=p.site_id AND source='crawler' AND kind='technical_page_observation' AND payload->>'pageId'=p.id::text AND provenance->>'runId'=${runId} ORDER BY observed_at DESC LIMIT 1) pe ON true
      WHERE p.site_id=${context.siteId}::uuid AND (ps.title IS NULL OR ps.meta_description IS NULL OR ps.h1 IS NULL)
        AND NOT EXISTS (SELECT 1 FROM findings f WHERE f.site_id=${context.siteId}::uuid AND f.page_id=p.id AND f.status='open' AND f.rule_id IN ('baseline.missing_title','baseline.missing_description','baseline.missing_h1'))
      RETURNING id::text`
      : [];
    await sql`
      UPDATE findings f SET primary_evidence_id=latest.id
      FROM (
        SELECT DISTINCT ON (payload->>'pageId') id,payload->>'pageId' AS page_id
        FROM evidence
        WHERE site_id=${context.siteId}::uuid AND source='crawler' AND kind='technical_page_observation' AND provenance->>'runId'=${runId}
        ORDER BY payload->>'pageId',observed_at DESC
      ) latest
      WHERE f.site_id=${context.siteId}::uuid AND f.status='open' AND f.category='technical_seo' AND f.page_id::text=latest.page_id`;
    const technicalEvidenceRows = await sql<{ pageId: string | null; evidencePageId: string | null; source: string | null; kind: string | null }[]>`
      SELECT f.page_id::text AS "pageId",e.payload->>'pageId' AS "evidencePageId",e.source,e.kind
      FROM findings f LEFT JOIN evidence e ON e.id=f.primary_evidence_id
      WHERE f.site_id=${context.siteId}::uuid AND f.status='open' AND f.category='technical_seo'`;
    const technicalFindings = assessTechnicalFindingEvidence(technicalEvidenceRows);
    const certification = buildBaselineCertification({ readiness, crawl: observations.crawl, technicalFindings, gsc: observations.gsc });

    const [crawlPageRows, gscSignalRows, technicalSignalRows, existingRows, activeProposalRows, providerEvidenceRows] = await Promise.all([
      sql<Array<{ pageId: string; url: string; indexable: boolean; title: string | null; description: string | null; h1: string | null; contentText: string | null; links: unknown; evidenceId: string }>>`
        SELECT p.id::text AS "pageId",p.url,p.indexable,ps.title,ps.meta_description AS description,ps.h1,ps.content_text AS "contentText",ps.links,e.id::text AS "evidenceId"
        FROM evidence e
        JOIN pages p ON p.id=(e.payload->>'pageId')::uuid
        JOIN LATERAL (
          SELECT title,meta_description,h1,content_text,links FROM page_snapshots
          WHERE page_id=p.id AND raw_signals->>'runId'=${runId}
          ORDER BY observed_at DESC LIMIT 1
        ) ps ON true
        WHERE e.site_id=${context.siteId}::uuid AND e.source='crawler' AND e.kind='technical_page_observation' AND e.provenance->>'runId'=${runId}`,
      sql<Array<{ pageId: string; queryId: string; query: string; url: string; clicks: unknown; impressions: unknown; ctr: unknown; position: unknown }>>`
        SELECT sm.page_id::text AS "pageId",sm.query_id::text AS "queryId",sq.query,p.url,
          SUM(sm.clicks)::float AS clicks,SUM(sm.impressions)::float AS impressions,
          SUM(sm.clicks)::float/NULLIF(SUM(sm.impressions),0) AS ctr,
          SUM(sm.average_position*sm.impressions)::float/NULLIF(SUM(sm.impressions) FILTER (WHERE sm.average_position IS NOT NULL),0) AS position
        FROM search_metrics sm
        JOIN search_queries sq ON sq.id=sm.query_id
        JOIN pages p ON p.id=sm.page_id
        WHERE sq.site_id=${context.siteId}::uuid AND sm.source='gsc' AND sm.metric_date>=current_date-27 AND sm.page_id IS NOT NULL
        GROUP BY sm.page_id,sm.query_id,sq.query,p.url`,
      sql<TechnicalFindingSignal[]>`
        SELECT f.id::text AS "findingId",f.page_id::text AS "pageId",f.title,f.severity,e.id::text AS "evidenceId"
        FROM findings f JOIN evidence e ON e.id=f.primary_evidence_id
        WHERE f.site_id=${context.siteId}::uuid AND f.status='open' AND f.category='technical_seo'
          AND e.source='crawler' AND e.kind='technical_page_observation' AND e.provenance->>'runId'=${runId}`,
      sql<Array<{ id: string; status: string; generationKey: string | null }>>`
        SELECT id::text,status,impact_estimate->>'generationKey' AS "generationKey"
        FROM opportunities
        WHERE site_id=${context.siteId}::uuid AND status IN ('new','accepted','planned')
          AND (impact_estimate->>'engine'='opportunity_engine_v1' OR opportunity_type='organic_ctr')`,
      sql<Array<{ generationKey: string; value: string }>>`
        SELECT o.impact_estimate->>'generationKey' AS "generationKey",
          ap.expected_outcome->'proposal'->>'afterValue' AS value
        FROM action_plans ap JOIN opportunities o ON o.id=ap.opportunity_id
        WHERE ap.site_id=${context.siteId}::uuid AND ap.status='pending'
          AND o.status IN ('new','accepted','planned')
          AND o.impact_estimate->>'engine'='opportunity_engine_v1'
          AND ap.expected_outcome->>'planner'='dry_run_action_planner_v1'
          AND COALESCE(ap.expected_outcome->'proposal'->>'afterValue','')<>''`,
      sql<Array<{ source: "shopify" | "gsc"; id: string }>>`
        SELECT DISTINCT ON (source) source,id::text
        FROM evidence
        WHERE site_id=${context.siteId}::uuid
          AND ((source='shopify' AND kind='catalog_baseline') OR (source='gsc' AND kind='performance_aggregate'))
        ORDER BY source,observed_at DESC,created_at DESC`,
    ]);

    const crawlPages: CrawlPageSignal[] = crawlPageRows.map((row) => ({
      ...row,
      contentText: row.contentText ?? "",
      links: Array.isArray(row.links) ? row.links.filter((item): item is string => typeof item === "string") : [],
    }));
    const crawlPagesById = new Map(crawlPages.map((page) => [page.pageId, page]));
    const gscSignals: GscPageQuerySignal[] = gscSignalRows.map((row) => ({
      pageId: row.pageId,
      queryId: row.queryId,
      query: row.query,
      url: row.url,
      clicks: Number(row.clicks ?? 0),
      impressions: Number(row.impressions ?? 0),
      ctr: Number(row.ctr ?? 0),
      position: row.position == null ? null : Number(row.position),
    }));
    setStage("evaluate_reconcile");
    const aggregateAvailable = observations.gsc.ok && observations.gsc.data.aggregate.ok;
    const reconciliation = observations.gsc.ok ? observations.gsc.data.reconciliation.status : "aggregate_unavailable";
    const candidates = generateOpportunityCandidates({
      pilotReady: certification.status === "pilot_ready",
      aggregateAvailable,
      reconciliation,
      crawl: certification.crawlCoverage,
      gsc: gscSignals,
      crawlPages,
      technicalFindings: technicalSignalRows,
    });
    const preliminaryProposals = candidates.map((candidate) => ({
      generationKey: candidate.generationKey,
      proposal: createDryRunProposal(candidate, crawlPagesById.get(candidate.pageId), candidate.sourceEvidenceIds),
    }));
    const currentProposalValues = preliminaryProposals
      .map(({ generationKey, proposal }) => ({ generationKey, value: proposal.expectedOutcome.proposal.afterValue ?? "" }))
      .filter((item) => item.value.length > 0);
    const providerEvidence = new Map(providerEvidenceRows.map((row) => [row.source, row.id]));
    const reconciliationResult = reconcileManagedOpportunities(existingRows, candidates);

    setStage("evaluate_persist_opportunity");
    await sql.begin(async (tx) => {
      setStage("evaluate_persist_opportunity");
      await tx`
        UPDATE opportunities SET status='dismissed',
          rationale='Superseded by Opportunity Engine v1 because the legacy page-level CTR candidate lacks current query-level eligibility evidence.',
          updated_at=now()
        WHERE site_id=${context.siteId}::uuid AND opportunity_type='organic_ctr' AND status IN ('new','accepted','planned')
          AND COALESCE(impact_estimate->>'engine','')<>'opportunity_engine_v1'`;
      if (reconciliationResult.staleIds.length > 0) {
        setStage("evaluate_persist_opportunity");
        await tx`
          UPDATE opportunities SET status='dismissed',
            rationale='Superseded by Opportunity Engine v1 after the page or current evidence no longer met indexability and organic-remediation eligibility guardrails.',
            updated_at=now()
          WHERE id=ANY(${reconciliationResult.staleIds}::uuid[])`;
        setStage("evaluate_persist_action_plan");
        await tx`
          UPDATE action_plans SET status='cancelled',
            expected_outcome=expected_outcome || ${tx.json({ planner: "dry_run_action_planner_v1", lifecycleStage: "invalidated", executionAuthorized: false, publicSiteWrites: false, invalidatedReason: "source_opportunity_stale_or_ineligible", invalidatedAtReconciliation: true })},
            updated_at=now()
          WHERE opportunity_id=ANY(${reconciliationResult.staleIds}::uuid[])
            AND (expected_outcome->>'planner'='dry_run_action_planner_v1' OR expected_outcome->>'dryRun'='true')`;
      }

      for (const item of candidates) {
        setStage("evaluate_persist_opportunity");
        const signalRows = await tx<{ id: string }[]>`
          INSERT INTO evidence(site_id,page_id,source,kind,confidence,payload,provenance)
          VALUES(${context.siteId}::uuid,${item.pageId}::uuid,'seo_engine','opportunity_signal',${item.confidence},
            ${tx.json({ generationKey: item.generationKey, opportunityType: item.opportunityType, queryId: item.queryId, query: item.query, metrics: item.metrics, score: item.score, scoreComponents: item.scoreComponents, riskClassification: item.risk, whyQualified: item.rationale })},
            ${tx.json({ runId, evaluator: "opportunity_engine_v1", dimensionalGsc: item.queryId !== null, boundedCrawl: true, reconciliation })})
          RETURNING id::text`;
        const page = crawlPagesById.get(item.pageId);
        const relevantProviderEvidenceIds = [
          item.queryId ? providerEvidence.get("gsc") : null,
          /\/products?\//i.test(page?.url ?? "") ? providerEvidence.get("shopify") : null,
        ].filter((value): value is string => Boolean(value));
        const sourceEvidenceIds = [...new Set([signalRows[0]!.id, ...item.sourceEvidenceIds, ...relevantProviderEvidenceIds])];
        const impact = {
          engine: "opportunity_engine_v1",
          generationKey: item.generationKey,
          title: item.title,
          confidence: item.confidence,
          scoreComponents: item.scoreComponents,
          riskClassification: item.risk,
          whyQualified: item.rationale,
          metrics: item.metrics,
          coverage: certification.crawlCoverage,
          reconciliation,
          wholeSiteCoverage: false,
        };
        const effort = { dryRun: true, executionAuthorized: false, publicSiteWrites: false, recommendation: item.recommendation };
        const existing = existingRows.find((row) => row.generationKey === item.generationKey);
        const opportunityRows = existing
          ? await tx<{ id: string }[]>`
              UPDATE opportunities SET page_id=${item.pageId}::uuid,query_id=${item.queryId}::uuid,opportunity_type=${item.opportunityType},
                score=${item.score},impact_estimate=${tx.json(impact)},effort_estimate=${tx.json(effort)},rationale=${item.rationale},
                evidence_ids=${sourceEvidenceIds}::uuid[],updated_at=now()
              WHERE id=${existing.id}::uuid RETURNING id::text`
          : await tx<{ id: string }[]>`
              INSERT INTO opportunities(site_id,page_id,query_id,opportunity_type,status,score,impact_estimate,effort_estimate,rationale,evidence_ids)
              VALUES(${context.siteId}::uuid,${item.pageId}::uuid,${item.queryId}::uuid,${item.opportunityType},'new',${item.score},
                ${tx.json(impact)},${tx.json(effort)},${item.rationale},${sourceEvidenceIds}::uuid[])
              RETURNING id::text`;
        const opportunityId = opportunityRows[0]!.id;
        const basePlan = createDryRunProposal(item, page, sourceEvidenceIds);
        const qualityGate = evaluateProposalQuality({
          proposal: basePlan,
          candidate: item,
          page,
          activeProposalValues: [
            ...activeProposalRows.filter((proposal) => proposal.generationKey !== item.generationKey),
            ...currentProposalValues,
          ],
          evidence: {
            crawl: page?.evidenceId,
            shopify: providerEvidence.get("shopify"),
            gsc: providerEvidence.get("gsc"),
            opportunity: signalRows[0]!.id,
          },
        });
        const plan = applyProposalQualityGate(basePlan, qualityGate, item.generationKey);
        const latestPlanRows = await tx<Array<{ id: string; status: string; expectedOutcome: Record<string, unknown> }>>`
          SELECT id::text,status,expected_outcome AS "expectedOutcome"
          FROM action_plans WHERE opportunity_id=${opportunityId}::uuid
          ORDER BY created_at DESC LIMIT 1`;
        const latestPlan = latestPlanRows[0];
        const latestFingerprint = typeof latestPlan?.expectedOutcome?.proposalFingerprint === "string" ? latestPlan.expectedOutcome.proposalFingerprint : null;
        const latestDecision = latestPlan?.expectedOutcome?.reviewDecision && typeof latestPlan.expectedOutcome.reviewDecision === "object"
          ? latestPlan.expectedOutcome.reviewDecision as Record<string, unknown>
          : null;
        const explicitlyRequestedRevision = latestDecision?.decision === "rejected" && latestDecision.revisionRequested === true;
        if (latestPlan && latestPlan.status !== "pending" && latestFingerprint === plan.expectedOutcome.proposalFingerprint && !explicitlyRequestedRevision) continue;
        setStage("evaluate_persist_action_plan");
        const updatedPlans = await tx<{ id: string }[]>`
          UPDATE action_plans SET status=${plan.status},risk_level=${plan.riskLevel},rationale=${plan.rationale},
            expected_outcome=${tx.json(plan.expectedOutcome)},updated_at=now()
          WHERE opportunity_id=${opportunityId}::uuid
            AND status='pending'
            AND risk_level='blocked'
            AND COALESCE(expected_outcome->>'executionAuthorized','false')='false'
            AND COALESCE(expected_outcome->>'planner','dry_run_action_planner_v1')='dry_run_action_planner_v1'
          RETURNING id::text`;
        if (updatedPlans.length === 0) {
          await tx`
            INSERT INTO action_plans(site_id,opportunity_id,status,risk_level,rationale,expected_outcome)
            VALUES(${context.siteId}::uuid,${opportunityId}::uuid,${plan.status},${plan.riskLevel},${plan.rationale},${tx.json(plan.expectedOutcome)})`;
        }
      }
    });

    setStage("certification");
    const activeOpportunityRows = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM opportunities
      WHERE site_id=${context.siteId}::uuid AND status IN ('new','accepted','planned')
        AND impact_estimate->>'engine'='opportunity_engine_v1'`;
    await sql`INSERT INTO evidence(site_id,source,kind,confidence,payload,provenance) VALUES(${context.siteId}::uuid,'seo_engine','production_baseline_certification',1,${sql.json(certification)},${sql.json({ runId, evaluator: "certification_v1", publicSiteWrites: false })})`;
    return { findings: findingRows.length, opportunities: Number(activeOpportunityRows[0]?.count ?? 0), certification };
  } finally {
    await sql.end({ timeout: 2 });
  }
}

async function finish(runId: string, result: Omit<PilotResult, "runId" | "status">) {
  const sql = database();
  try {
    await sql`UPDATE jobs SET status='completed',payload=${sql.json({ phase: "completed", ...result, limits: PILOT_LIMITS, publicSiteWrites: false })},completed_at=now(),updated_at=now(),last_error=NULL WHERE id=${runId}::uuid`;
  } finally {
    await sql.end({ timeout: 2 });
  }
}

async function fail(runId: string, category: string, stage: PilotFailureStage, detail: string) {
  const sql = database();
  try {
    await sql`UPDATE jobs SET status='failed',payload=payload || ${sql.json({ phase: "failed", failure: { stage, category, detail: safeFailureDetail(detail) }, publicSiteWrites: false })},completed_at=now(),updated_at=now(),last_error=${category} WHERE id=${runId}::uuid`;
  } finally {
    await sql.end({ timeout: 2 });
  }
}

export function productionPilotDependencies(): PilotDependencies {
  return {
    publicWritesEnabled: process.env.PUBLIC_SITE_WRITES_ENABLED?.trim().toLowerCase() === "true",
    loadContext: loadProductionPilotContext,
    createRun,
    readShopify,
    readGsc,
    readGa4,
    crawl: async (origin) => {
      try { return { ok: true, data: await crawlSite(origin) }; }
      catch { return { ok: false, category: "crawl_failed", httpStatus: null }; }
    },
    persist,
    evaluate,
    progress,
    finish,
    fail,
  };
}

export async function validateProductionPilotPreflight() {
  const deps = productionPilotDependencies();
  if (deps.publicWritesEnabled) throw new Error("pilot_blocked_public_site_writes_enabled");
  return deps.loadContext();
}

export async function runProductionPilot(existingRunId?: string) {
  return executePilot(productionPilotDependencies(), existingRunId);
}