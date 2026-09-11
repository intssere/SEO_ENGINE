import assert from "node:assert/strict";
import test from "node:test";
import {
  assertReadOnlyProviderRequest,
  computeBaselineReadiness,
  crawlSite,
  executePilot,
  ga4ReportBody,
  isSelectedGa4PropertyDiscovered,
  parseShopifyProductCount,
  paginateShopifyCatalog,
  providerFailureCategory,
  sanitizedGoogleFailureCategory,
  type PilotDependencies,
} from "./pilot-runner.js";

const shopify = { ok: true as const, data: { storeVerified: true, productCount: 2, productsObserved: 2, variantCount: 3, inventoryQuantity: 4, truncated: false, complete: true } };
const gsc = { ok: true as const, data: { rows: [{ date: "2026-09-01", query: "q", page: "https://example.test", country: "US", device: "mobile", clicks: 1, impressions: 2, ctr: 0.5, position: 1 }], startDate: "2026-09-01", endDate: "2026-09-01" } };
const ga4 = { ok: true as const, data: { rows: [{ date: "2026-09-01", sessions: 1, users: 1, pageViews: 1 }], startDate: "2026-09-01", endDate: "2026-09-01" } };
const crawl = { ok: true as const, data: { pages: [], discovered: 1, fetched: 1, blockedByRobots: 0, truncated: false } };

function dependencies(overrides: Partial<PilotDependencies> = {}) {
  const calls: string[] = [];
  const deps: PilotDependencies = {
    publicWritesEnabled: false,
    loadContext: async () => ({ siteId: "site", canonicalOrigin: "https://diamondshelf.us", connections: {} as never }),
    createRun: async () => "run",
    readShopify: async () => shopify,
    readGsc: async () => gsc,
    readGa4: async () => ga4,
    crawl: async () => crawl,
    persist: async () => { calls.push("persist"); return { products: 2, catalogProducts: 2, productsObserved: 2, shopifyComplete: true, gscRows: 1, ga4Rows: 1, pages: 1 }; },
    evaluate: async (_run, _context, readiness) => { calls.push(`evaluate:${readiness.state}`); return { findings: 1, opportunities: 1 }; },
    progress: async (_run, phase) => { calls.push(`progress:${phase}`); },
    finish: async () => { calls.push("finish"); },
    fail: async () => { calls.push("fail"); },
    ...overrides,
  };
  return { deps, calls };
}

test("pilot blocks before reading connections when public-site writes are enabled", async () => {
  let loaded = false;
  const { deps } = dependencies({ publicWritesEnabled: true, loadContext: async () => { loaded = true; throw new Error(); } });
  await assert.rejects(() => executePilot(deps), /pilot_blocked_public_site_writes_enabled/);
  assert.equal(loaded, false);
});

test("provider request guard permits only required read-only endpoints", () => {
  assert.doesNotThrow(() => assertReadOnlyProviderRequest("shopify", "GET", "https://store.myshopify.com/admin/api/2025-10/shop.json"));
  assert.doesNotThrow(() => assertReadOnlyProviderRequest("gsc", "POST", "https://www.googleapis.com/webmasters/v3/sites/site/searchAnalytics/query"));
  assert.doesNotThrow(() => assertReadOnlyProviderRequest("ga4", "POST", "https://analyticsdata.googleapis.com/v1beta/properties/1:runReport"));
  assert.doesNotThrow(() => assertReadOnlyProviderRequest("ga4_admin", "GET", "https://analyticsadmin.googleapis.com/v1beta/properties/1"));
  assert.throws(() => assertReadOnlyProviderRequest("shopify", "POST", "https://store.myshopify.com/admin/api/2025-10/products.json"));
  assert.throws(() => assertReadOnlyProviderRequest("gsc", "DELETE", "https://www.googleapis.com/webmasters/v3/sites/site"));
});

test("bounded crawler respects page and depth limits", async () => {
  const fetchImpl = async (input: URL | Request | string) => {
    const url = String(input);
    if (url.endsWith("/robots.txt")) return new Response("User-agent: *\nDisallow: /private", { status: 200 });
    const index = Number(url.match(/page-(\d+)/)?.[1] ?? 0);
    return new Response(`<html><head><title>Page ${index}</title></head><body><h1>Page</h1><a href="/page-${index + 1}">Next</a><a href="/private">Private</a></body></html>`, { status: 200, headers: { "content-type": "text/html" } });
  };
  const result = await crawlSite("https://diamondshelf.us", fetchImpl as typeof fetch, { crawlPages: 2, crawlDepth: 1, responseBytes: 20_000, requestTimeoutMs: 1_000, gscRows: 10, shopifyProducts: 10 });
  assert.equal(result.fetched, 2);
  assert.equal(result.pages.length, 2);
  assert.equal(result.pages.some((page) => page.path === "/private"), false);
});

test("successful provider observations persist and make baseline ready", async () => {
  const { deps, calls } = dependencies();
  const result = await executePilot(deps);
  assert.equal(result.readiness.state, "ready");
  assert.deepEqual(calls, ["progress:provider_reads", "progress:persisting_observations", "persist", "progress:evaluating_baseline", "evaluate:ready", "finish"]);
});

test("partial provider failure persists available evidence but keeps baseline partial", async () => {
  const { deps, calls } = dependencies({ readGa4: async () => ({ ok: false, category: "permission_denied", httpStatus: 403 }) });
  const result = await executePilot(deps);
  assert.equal(result.readiness.state, "partial");
  assert.deepEqual(result.readiness.blockers, ["ga4_permission_denied"]);
  assert.deepEqual(result.readiness.diagnostics.ga4, { status: "failed", category: "permission_denied", httpStatus: 403 });
  assert.deepEqual(calls, ["progress:provider_reads", "progress:persisting_observations", "persist", "progress:partial_evidence", "evaluate:partial", "finish"]);
});

test("GA4 successful-empty is distinct from provider failure", () => {
  const result = computeBaselineReadiness({ shopify, gsc, ga4: { ok: true, data: { ...ga4.data, rows: [] } }, crawl });
  assert.equal(result.state, "partial");
  assert.ok(result.blockers.includes("ga4_evidence_empty"));
  assert.deepEqual(result.diagnostics.ga4, { status: "empty", category: "no_rows", httpStatus: 200 });
});

test("provider failures are mapped to sanitized categories without response payloads", () => {
  assert.equal(providerFailureCategory(401), "authentication_error");
  assert.equal(providerFailureCategory(403), "permission_denied");
  assert.equal(providerFailureCategory(404), "resource_not_found");
  assert.equal(providerFailureCategory(429), "rate_limited");
  assert.equal(providerFailureCategory(503), "provider_unavailable");
  assert.equal(sanitizedGoogleFailureCategory(403, { error: { message: "Google Analytics Data API has not been used in project 123 or it is disabled." } }), "api_not_enabled");
  assert.equal(sanitizedGoogleFailureCategory(403, { error: { status: "PERMISSION_DENIED", message: "User does not have sufficient permissions for this property." } }), "property_access_denied");
});

test("GA4 requires the selected property to belong to authenticated discovery", () => {
  const metadata = { ga4Discovery: { ok: true }, discoveredGa4Properties: [{ propertyId: "551047383" }] };
  assert.equal(isSelectedGa4PropertyDiscovered(metadata, "551047383"), true);
  assert.equal(isSelectedGa4PropertyDiscovered(metadata, "999"), false);
  assert.equal(isSelectedGa4PropertyDiscovered({ ...metadata, ga4Discovery: { ok: false } }, "551047383"), false);
  assert.deepEqual(ga4ReportBody("2026-08-15", "2026-09-10"), {
    dateRanges: [{ startDate: "2026-08-15", endDate: "2026-09-10" }],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }],
    keepEmptyRows: false,
    returnPropertyQuota: false,
    limit: 100,
  });
});

test("Shopify catalog pagination follows read-only cursors and reports completeness", async () => {
  const requests: string[] = [];
  const fetchImpl = async (input: URL | Request | string) => {
    const url = String(input);
    requests.push(url);
    const first = !url.includes("page_info=");
    return new Response(JSON.stringify({ products: first
      ? [{ id: 1, variants: [{ inventory_quantity: 2 }] }, { id: 2, variants: [{ inventory_quantity: 3 }] }]
      : [{ id: 3, variants: [{ inventory_quantity: 4 }] }] }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        ...(first ? { link: '<https://store.myshopify.com/admin/api/2025-10/products.json?page_info=next&limit=250>; rel="next"' } : {}),
      },
    });
  };
  const result = await paginateShopifyCatalog({ base: "https://store.myshopify.com/admin/api/2025-10", accessToken: "test", productCount: 3, fetchImpl: fetchImpl as typeof fetch, limit: 10 });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.productsObserved, 3);
  assert.equal(result.data.complete, true);
  assert.equal(result.data.truncated, false);
  assert.equal(result.data.variantCount, 3);
  assert.equal(result.data.inventoryQuantity, 9);
  assert.equal(requests.length, 2);
  assert.doesNotMatch(requests[0]!, /status=any/);
});

test("Shopify pagination does not trust a false zero count and still observes the catalog", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return new Response(JSON.stringify({ products: [{ id: 1, variants: [] }] }), { status: 200 });
  };
  const result = await paginateShopifyCatalog({ base: "https://store.myshopify.com/admin/api/2025-10", accessToken: "test", productCount: 0, fetchImpl: fetchImpl as typeof fetch, limit: 10 });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(calls, 1);
  assert.equal(result.data.productsObserved, 1);
  assert.equal(result.data.complete, true);
});

test("Shopify count parsing cannot coerce null-like values into a complete empty catalog", () => {
  assert.equal(parseShopifyProductCount(2997), 2997);
  assert.equal(parseShopifyProductCount(0), 0);
  assert.equal(parseShopifyProductCount(null), null);
  assert.equal(parseShopifyProductCount("0"), null);
  assert.equal(parseShopifyProductCount(undefined), null);
});

test("a verified zero-product Shopify result cannot make baseline ready", () => {
  const emptyShopify = { ok: true as const, data: { storeVerified: true, productCount: 0, productsObserved: 0, variantCount: 0, inventoryQuantity: 0, truncated: false, complete: true } };
  const result = computeBaselineReadiness({ shopify: emptyShopify, gsc, ga4, crawl });
  assert.equal(result.state, "partial");
  assert.ok(result.blockers.includes("shopify_evidence_empty"));
  assert.equal(result.coverage.shopify, false);
});

test("Shopify completeness remains partial when the bounded catalog limit is reached", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ products: [{ id: 1, variants: [] }, { id: 2, variants: [] }] }), { status: 200 });
  const paged = await paginateShopifyCatalog({ base: "https://store.myshopify.com/admin/api/2025-10", accessToken: "test", productCount: 3, fetchImpl: fetchImpl as typeof fetch, limit: 2 });
  assert.equal(paged.ok, true);
  if (!paged.ok) return;
  const result = computeBaselineReadiness({ shopify: { ok: true, data: { storeVerified: true, productCount: 3, ...paged.data } }, gsc, ga4, crawl });
  assert.equal(result.state, "partial");
  assert.ok(result.blockers.includes("shopify_catalog_incomplete"));
});

test("pilot records a sanitized failure transition and does not finish after persistence failure", async () => {
  const { deps, calls } = dependencies({
    persist: async () => { calls.push("persist"); throw new Error("database detail that must not escape"); },
  });
  await assert.rejects(() => executePilot(deps, "existing-run"), /pilot_internal_failure/);
  assert.deepEqual(calls, ["progress:provider_reads", "progress:persisting_observations", "persist", "fail"]);
});

test("readiness requires real rows rather than synthetic zero metrics", () => {
  const result = computeBaselineReadiness({ shopify, gsc: { ok: true, data: { ...gsc.data, rows: [] } }, ga4, crawl });
  assert.equal(result.state, "partial");
  assert.ok(result.blockers.includes("gsc_evidence_empty"));
});