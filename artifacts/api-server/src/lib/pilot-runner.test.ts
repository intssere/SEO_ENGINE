import assert from "node:assert/strict";
import test from "node:test";
import {
  assertReadOnlyProviderRequest,
  computeBaselineReadiness,
  crawlSite,
  executePilot,
  type PilotDependencies,
} from "./pilot-runner.js";

const shopify = { ok: true as const, data: { storeVerified: true, productCount: 2, productsObserved: 2, variantCount: 3, inventoryQuantity: 4, truncated: false } };
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
    persist: async () => { calls.push("persist"); return { products: 2, gscRows: 1, ga4Rows: 1, pages: 1 }; },
    evaluate: async (_run, _context, readiness) => { calls.push(`evaluate:${readiness.state}`); return { findings: 1, opportunities: 1 }; },
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
  assert.deepEqual(calls, ["persist", "evaluate:ready", "finish"]);
});

test("partial provider failure persists available evidence but keeps baseline partial", async () => {
  const { deps, calls } = dependencies({ readGa4: async () => ({ ok: false, category: "provider_error", httpStatus: 403 }) });
  const result = await executePilot(deps);
  assert.equal(result.readiness.state, "partial");
  assert.deepEqual(result.readiness.blockers, ["ga4_evidence_unavailable"]);
  assert.deepEqual(calls, ["persist", "evaluate:partial", "finish"]);
});

test("readiness requires real rows rather than synthetic zero metrics", () => {
  const result = computeBaselineReadiness({ shopify, gsc: { ok: true, data: { ...gsc.data, rows: [] } }, ga4, crawl });
  assert.equal(result.state, "partial");
  assert.ok(result.blockers.includes("gsc_evidence_unavailable"));
});