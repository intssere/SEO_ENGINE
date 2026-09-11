import { createHash } from "node:crypto";
import postgres from "postgres";
import {
  decryptTokenBundle,
  encryptTokenBundle,
  refreshGoogleAccessToken,
  type EncryptedSecretEnvelope,
  type TokenBundle,
} from "@seo-engine/oauth-connection-manager";

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
export type GscObservation = { rows: Array<{ date: string; query: string; page: string; country: string; device: string; clicks: number; impressions: number; ctr: number; position: number | null }>; startDate: string; endDate: string };
export type Ga4Observation = { rows: Array<{ date: string; sessions: number; users: number; pageViews: number }>; startDate: string; endDate: string };
export type CrawlPage = { url: string; path: string; statusCode: number; title: string | null; description: string | null; canonical: string | null; robots: string | null; h1: string | null; contentHash: string; contentText: string; links: string[] };
export type CrawlObservation = { pages: CrawlPage[]; discovered: number; fetched: number; blockedByRobots: number; truncated: boolean };
export type PilotReadiness = {
  state: "ready" | "partial";
  blockers: string[];
  coverage: { shopify: boolean; gsc: boolean; ga4: boolean; crawl: boolean };
  diagnostics: { shopify: ProviderDiagnostic; gsc: ProviderDiagnostic; ga4: ProviderDiagnostic; crawl: ProviderDiagnostic };
};
export type PilotResult = {
  runId: string;
  status: "completed";
  readiness: PilotReadiness;
  counts: { products: number; catalogProducts: number; productsObserved: number; shopifyComplete: boolean; gscRows: number; ga4Rows: number; pages: number; findings: number; opportunities: number };
};

export type ConnectionRecord = { id: string; provider: "shopify" | "google"; secret_ref: string; status: string; scopes: string[]; metadata: Record<string, unknown> };
export type PilotContext = { siteId: string; canonicalOrigin: string; connections: Record<"shopify" | "google", ConnectionRecord> };
type PersistedCounts = { products: number; catalogProducts: number; productsObserved: number; shopifyComplete: boolean; gscRows: number; ga4Rows: number; pages: number };

export interface PilotDependencies {
  publicWritesEnabled: boolean;
  loadContext(): Promise<PilotContext>;
  createRun(siteId: string): Promise<string>;
  readShopify(context: PilotContext): Promise<Outcome<ShopifyObservation>>;
  readGsc(context: PilotContext): Promise<Outcome<GscObservation>>;
  readGa4(context: PilotContext): Promise<Outcome<Ga4Observation>>;
  crawl(origin: string): Promise<Outcome<CrawlObservation>>;
  persist(runId: string, context: PilotContext, observations: { shopify: Outcome<ShopifyObservation>; gsc: Outcome<GscObservation>; ga4: Outcome<Ga4Observation>; crawl: Outcome<CrawlObservation> }): Promise<PersistedCounts>;
  evaluate(runId: string, context: PilotContext, readiness: PilotReadiness): Promise<{ findings: number; opportunities: number }>;
  progress(runId: string, phase: string): Promise<void>;
  finish(runId: string, result: Omit<PilotResult, "runId" | "status">): Promise<void>;
  fail(runId: string, category: string): Promise<void>;
}

type ReadOnlyProvider = "shopify" | "gsc" | "ga4" | "ga4_admin" | "google_token";

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
  if (!input.ga4.ok) blockers.push(`ga4_${input.ga4.category}`);
  else if (input.ga4.data.rows.length === 0) blockers.push("ga4_evidence_empty");
  if (!input.crawl.ok) blockers.push(`crawl_${input.crawl.category}`);
  else if (input.crawl.data.fetched === 0) blockers.push("crawl_evidence_empty");
  const diagnostics = {
    shopify: diagnostic(input.shopify, input.shopify.ok ? input.shopify.data.productsObserved : null),
    gsc: diagnostic(input.gsc, input.gsc.ok ? input.gsc.data.rows.length : null),
    ga4: diagnostic(input.ga4, input.ga4.ok ? input.ga4.data.rows.length : null),
    crawl: diagnostic(input.crawl, input.crawl.ok ? input.crawl.data.fetched : null),
  };
  return {
    state: blockers.length === 0 ? "ready" : "partial",
    blockers,
    coverage: {
      shopify: input.shopify.ok && input.shopify.data.storeVerified && input.shopify.data.productsObserved > 0 && input.shopify.data.complete,
      gsc: input.gsc.ok && input.gsc.data.rows.length > 0,
      ga4: input.ga4.ok && input.ga4.data.rows.length > 0,
      crawl: input.crawl.ok && input.crawl.data.fetched > 0,
    },
    diagnostics,
  };
}

export async function executePilot(deps: PilotDependencies, existingRunId?: string): Promise<PilotResult> {
  let runId = existingRunId;
  const safe = async <T>(category: string, operation: () => Promise<Outcome<T>>): Promise<Outcome<T>> => {
    try { return await operation(); }
    catch { return { ok: false, category, httpStatus: null }; }
  };
  try {
    if (deps.publicWritesEnabled) throw new Error("pilot_blocked_public_site_writes_enabled");
    const context = await deps.loadContext();
    runId ??= await deps.createRun(context.siteId);
    await deps.progress(runId, "provider_reads");
    const [shopify, gsc, ga4, crawl] = await Promise.all([
      safe("shopify_ingestion_failed", () => deps.readShopify(context)),
      safe("gsc_ingestion_failed", () => deps.readGsc(context)),
      safe("ga4_ingestion_failed", () => deps.readGa4(context)),
      safe("crawl_failed", () => deps.crawl(context.canonicalOrigin)),
    ]);
    await deps.progress(runId, "persisting_observations");
    const persisted = await deps.persist(runId, context, { shopify, gsc, ga4, crawl });
    const readiness = computeBaselineReadiness({ shopify, gsc, ga4, crawl });
    await deps.progress(runId, readiness.state === "ready" ? "evaluating_baseline" : "partial_evidence");
    const evaluated = await deps.evaluate(runId, context, readiness);
    const result = { readiness, counts: { ...persisted, ...evaluated } };
    await deps.finish(runId, result);
    return { runId, status: "completed", ...result };
  } catch (error) {
    const category = error instanceof Error && /^pilot_[a-z0-9_]+$/.test(error.message) ? error.message : "pilot_internal_failure";
    if (runId) await deps.fail(runId, category).catch(() => undefined);
    throw new Error(category);
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
      const contentText = html.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 100_000);
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
        try { payload = await response.json(); } catch {}
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
  const reportedCount = Number(count.data.count);
  if (!Number.isInteger(reportedCount) || reportedCount < 0) return { ok: false, category: "invalid_count_response", httpStatus: 200 };
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
  const result = await requestJson<{ rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }> }>(
    "gsc",
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    "POST",
    bundle.accessToken,
    { startDate, endDate, dimensions: ["date", "query", "page", "country", "device"], rowLimit: PILOT_LIMITS.gscRows, dataState: "final" },
  );
  if (!result.ok) return result;
  const rows = (result.data.rows ?? []).flatMap((row) => {
    const [date, query, page, country, device] = row.keys ?? [];
    if (!date || !query || !page || !country || !device) return [];
    return [{ date, query, page, country: country.toUpperCase(), device: device.toLowerCase(), clicks: Number(row.clicks ?? 0), impressions: Number(row.impressions ?? 0), ctr: Number(row.ctr ?? 0), position: Number.isFinite(row.position) ? Number(row.position) : null }];
  });
  return { ok: true, data: { rows, startDate, endDate } };
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
  let products = 0, catalogProducts = 0, productsObserved = 0, shopifyComplete = false, gscRows = 0, ga4Rows = 0, pages = 0;
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
        }
        await tx`INSERT INTO evidence(site_id,source,kind,confidence,payload,provenance) VALUES(${context.siteId}::uuid,'gsc','performance_ingestion',1,${tx.json({ rowCount: gscRows, startDate: observations.gsc.data.startDate, endDate: observations.gsc.data.endDate })},${tx.json({ runId, mode: "read_only" })})`;
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
          pages++;
        }
        await tx`INSERT INTO evidence(site_id,source,kind,confidence,payload,provenance) VALUES(${context.siteId}::uuid,'crawler','crawl_coverage',1,${tx.json({ discovered: observations.crawl.data.discovered, fetched: pages, blockedByRobots: observations.crawl.data.blockedByRobots, truncated: observations.crawl.data.truncated })},${tx.json({ runId, limits: PILOT_LIMITS, mode: "read_only" })})`;
      }
    });
    return { products, catalogProducts, productsObserved, shopifyComplete, gscRows, ga4Rows, pages };
  } finally {
    await sql.end({ timeout: 2 });
  }
}

async function evaluate(runId: string, context: PilotContext, readiness: PilotReadiness) {
  if (readiness.state !== "ready") return { findings: 0, opportunities: 0 };
  const sql = database();
  try {
    const summaryEvidence = await sql<{ id: string }[]>`INSERT INTO evidence(site_id,source,kind,confidence,payload,provenance) VALUES(${context.siteId}::uuid,'seo_engine','baseline_readiness',1,${sql.json(readiness)},${sql.json({ runId, evaluator: "baseline_v1" })}) RETURNING id::text`;
    const evidenceId = summaryEvidence[0]!.id;
    const findingRows = await sql<{ id: string }[]>`
      INSERT INTO findings(site_id,page_id,primary_evidence_id,rule_id,category,severity,title,description)
      SELECT ${context.siteId}::uuid,p.id,${evidenceId}::uuid,
        CASE WHEN ps.title IS NULL THEN 'baseline.missing_title' WHEN ps.meta_description IS NULL THEN 'baseline.missing_description' ELSE 'baseline.missing_h1' END,
        'technical_seo','medium',
        CASE WHEN ps.title IS NULL THEN 'Page title is missing' WHEN ps.meta_description IS NULL THEN 'Meta description is missing' ELSE 'Primary heading is missing' END,
        'Observed in the bounded read-only pilot crawl.'
      FROM pages p
      JOIN LATERAL (SELECT title,meta_description,h1 FROM page_snapshots WHERE page_id=p.id ORDER BY observed_at DESC LIMIT 1) ps ON true
      WHERE p.site_id=${context.siteId}::uuid AND (ps.title IS NULL OR ps.meta_description IS NULL OR ps.h1 IS NULL)
        AND NOT EXISTS (SELECT 1 FROM findings f WHERE f.site_id=${context.siteId}::uuid AND f.page_id=p.id AND f.status='open' AND f.rule_id IN ('baseline.missing_title','baseline.missing_description','baseline.missing_h1'))
      RETURNING id::text`;
    const opportunityRows = await sql<{ id: string }[]>`
      INSERT INTO opportunities(site_id,page_id,opportunity_type,status,score,impact_estimate,effort_estimate,rationale,evidence_ids)
      SELECT ${context.siteId}::uuid,sm.page_id,'organic_ctr','new',
        LEAST(100,20 + ln(1 + SUM(sm.impressions)) * 10),
        ${sql.json({ basis: "persisted_gsc_impressions_and_ctr" })},
        ${sql.json({ level: "review" })},
        'Persisted GSC evidence shows measurable impressions with low click-through rate in the pilot window.',
        ARRAY[${evidenceId}::uuid]
      FROM search_metrics sm JOIN search_queries sq ON sq.id=sm.query_id
      WHERE sq.site_id=${context.siteId}::uuid AND sm.source='gsc' AND sm.metric_date>=current_date-27 AND sm.page_id IS NOT NULL
      GROUP BY sm.page_id
      HAVING SUM(sm.impressions)>=10 AND SUM(sm.clicks)::float/NULLIF(SUM(sm.impressions),0)<0.03 AND AVG(sm.average_position) BETWEEN 4 AND 20
        AND NOT EXISTS (SELECT 1 FROM opportunities o WHERE o.site_id=${context.siteId}::uuid AND o.page_id=sm.page_id AND o.opportunity_type='organic_ctr' AND o.status IN ('new','accepted','planned'))
      RETURNING id::text`;
    return { findings: findingRows.length, opportunities: opportunityRows.length };
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

async function fail(runId: string, category: string) {
  const sql = database();
  try {
    await sql`UPDATE jobs SET status='failed',payload=payload || ${sql.json({ phase: "failed", publicSiteWrites: false })},completed_at=now(),updated_at=now(),last_error=${category} WHERE id=${runId}::uuid`;
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