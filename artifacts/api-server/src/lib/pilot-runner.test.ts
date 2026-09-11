import assert from "node:assert/strict";
import test from "node:test";
import {
  assertReadOnlyProviderRequest,
  assessTechnicalFindingEvidence,
  buildBaselineCertification,
  computeBaselineReadiness,
  crawlSite,
  executePilot,
  ga4ReportBody,
  gscAggregateRequestBody,
  gscDetailedRequestBody,
  isSelectedGa4PropertyDiscovered,
  organicCtrOpportunityValidity,
  parseShopifyProductCount,
  paginateShopifyCatalog,
  PilotExecutionError,
  providerFailureCategory,
  reconcileGscAggregate,
  sanitizePilotFailureDetail,
  sanitizedGoogleFailureCategory,
  type PilotDependencies,
} from "./pilot-runner.js";

const shopify = { ok: true as const, data: { storeVerified: true, productCount: 2, productsObserved: 2, variantCount: 3, inventoryQuantity: 4, truncated: false, complete: true } };
const gscRows = [{ date: "2026-09-01", query: "q", page: "https://example.test", country: "US", device: "mobile", clicks: 1, impressions: 20, ctr: 0.05, position: 12 }];
const gscAggregate = { ok: true as const, data: { clicks: 1, impressions: 20, ctr: 0.05, position: 12 } };
const gsc = { ok: true as const, data: { rows: gscRows, aggregate: gscAggregate, reconciliation: reconcileGscAggregate(gscRows, gscAggregate), startDate: "2026-09-01", endDate: "2026-09-01" } };
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
    persist: async () => { calls.push("persist"); return { products: 2, catalogProducts: 2, productsObserved: 2, shopifyComplete: true, gscRows: 1, gscDetailedRows: 1, ga4Rows: 1, pages: 1 }; },
    evaluate: async (_run, _context, readiness) => {
      calls.push(`evaluate:${readiness.state}`);
      return {
        findings: 1,
        opportunities: 1,
        certification: buildBaselineCertification({ readiness, crawl, technicalFindings: { total: 1, withValidEvidence: 1, valid: true }, gsc }),
      };
    },
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
    return new Response(`<html><head><title>Page ${index}</title><script type="application/ld+json">{"@type":"CollectionPage","description":"Page ${index} includes current catalog items organized by product type for this collection."}</script></head><body><main><h1>Page</h1><h2>Collection details</h2><a href="/page-${index + 1}">Next collection page</a><a href="/private">Private</a></main></body></html>`, { status: 200, headers: { "content-type": "text/html" } });
  };
  const result = await crawlSite("https://diamondshelf.us", fetchImpl as typeof fetch, { crawlPages: 2, crawlDepth: 1, responseBytes: 20_000, requestTimeoutMs: 1_000, gscRows: 10, shopifyProducts: 10 });
  assert.equal(result.fetched, 2);
  assert.equal(result.pages.length, 2);
  assert.equal(result.pages.some((page) => page.path === "/private"), false);
  assert.deepEqual(result.pages[0]?.headings, ["Collection details"]);
  assert.equal(result.pages[0]?.structuredData.length, 1);
  assert.deepEqual(result.pages[0]?.internalAnchors[0], { text: "Next collection page", href: "https://diamondshelf.us/page-1" });
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

test("GSC uses separate property aggregate and dimensional request contracts", () => {
  assert.deepEqual(gscAggregateRequestBody("2026-08-14", "2026-09-10"), {
    startDate: "2026-08-14",
    endDate: "2026-09-10",
    rowLimit: 1,
    dataState: "final",
  });
  assert.deepEqual(gscDetailedRequestBody("2026-08-14", "2026-09-10", 5000), {
    startDate: "2026-08-14",
    endDate: "2026-09-10",
    dimensions: ["date", "query", "page", "country", "device"],
    rowLimit: 5000,
    dataState: "final",
  });
});

test("GSC aggregate reconciliation permits incomplete dimensional rows without replacing headline KPIs", () => {
  const partialRows = [{ ...gscRows[0]!, clicks: 0, impressions: 12 }];
  const aggregate = { ok: true as const, data: { clicks: 5, impressions: 3160, ctr: 0.002, position: 53.5 } };
  const result = reconcileGscAggregate(partialRows, aggregate);
  assert.equal(result.status, "partial_dimensional");
  assert.equal(result.detailedImpressions, 12);
  assert.equal(result.impressionCoverage, 12 / 3160);
  assert.equal(aggregate.data.impressions, 3160);
});

test("GSC aggregate failure is explicit and blocks readiness", () => {
  const failedAggregate = { ok: false as const, category: "provider_unavailable", httpStatus: 503 };
  const failedGsc = { ok: true as const, data: { ...gsc.data, aggregate: failedAggregate, reconciliation: reconcileGscAggregate(gscRows, failedAggregate) } };
  const result = computeBaselineReadiness({ shopify, gsc: failedGsc, ga4, crawl });
  assert.equal(result.state, "partial");
  assert.ok(result.blockers.includes("gsc_aggregate_provider_unavailable"));
  assert.deepEqual(result.diagnostics.gscAggregate, { status: "failed", category: "provider_unavailable", httpStatus: 503 });
});

test("organic CTR opportunity requires supporting property aggregate evidence", () => {
  assert.deepEqual(organicCtrOpportunityValidity({ ok: false, category: "provider_unavailable", httpStatus: 503 }), { valid: false, reason: "gsc_aggregate_unavailable" });
  assert.deepEqual(organicCtrOpportunityValidity({ ok: true, data: { clicks: 5, impressions: 3160, ctr: 0.002, position: 53.5 } }), { valid: false, reason: "aggregate_position_outside_ctr_opportunity_range" });
  assert.deepEqual(organicCtrOpportunityValidity({ ok: true, data: { clicks: 5, impressions: 3160, ctr: 0.002, position: 12 } }), { valid: true, reason: "aggregate_ctr_opportunity_supported" });
});

test("pilot-ready certification never claims whole-site coverage from the bounded crawler", () => {
  const readiness = computeBaselineReadiness({ shopify, gsc, ga4, crawl });
  const certification = buildBaselineCertification({ readiness, crawl: { ok: true, data: { ...crawl.data, fetched: 30, discovered: 120, truncated: true } }, technicalFindings: { total: 15, withValidEvidence: 15, valid: true }, gsc });
  assert.equal(certification.status, "pilot_ready");
  assert.equal(certification.wholeSiteCertified, false);
  assert.equal(certification.wholeSiteReason, "bounded_crawl");
  assert.equal(certification.crawlCoverage.percent, 25);
  assert.equal(certification.technicalFindings.total, 15);
});

test("technical finding integrity requires matching page-level crawler evidence", () => {
  const result = assessTechnicalFindingEvidence([
    { pageId: "page-1", evidencePageId: "page-1", source: "crawler", kind: "technical_page_observation" },
    { pageId: "page-2", evidencePageId: "page-1", source: "crawler", kind: "technical_page_observation" },
  ]);
  assert.deepEqual(result, { total: 2, withValidEvidence: 1, valid: false });
});

test("Shopify catalog pagination follows read-only cursors and reports completeness", async () => {
  const requests: string[] = [];
  const fetchImpl = async (input: URL | Request | string) => {
    const url = String(input);
    requests.push(url);
    const first = !url.includes("page_info=");
    return new Response(JSON.stringify({ products: first
      ? [{ id: 1, title: "Daily Body Lotion", handle: "daily-body-lotion", product_type: "Body Lotion", vendor: "Example Vendor", tags: "body care,lotion", variants: [{ inventory_quantity: 2 }] }, { id: 2, variants: [{ inventory_quantity: 3 }] }]
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
  assert.deepEqual((result.data.semanticResources ?? [])[0], {
    kind: "product",
    path: "/products/daily-body-lotion",
    title: "Daily Body Lotion",
    description: null,
    productType: "Body Lotion",
    vendor: "Example Vendor",
    tags: ["body care", "lotion"],
  });
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
  let failure: unknown[] | null = null;
  const { deps, calls } = dependencies({
    persist: async () => { calls.push("persist"); throw new Error("database detail that must not escape"); },
    fail: async (...args) => { calls.push("fail"); failure = args; },
  });
  await assert.rejects(() => executePilot(deps, "existing-run"), /pilot_internal_failure/);
  assert.deepEqual(calls, ["progress:provider_reads", "progress:persisting_observations", "persist", "fail"]);
  assert.deepEqual(failure, ["existing-run", "pilot_internal_failure", "persisting_observations", "Error"]);
});

test("evaluation failures retain the precise sanitized stage and stable API category", async () => {
  let failure: unknown[] | null = null;
  const { deps, calls } = dependencies({
    evaluate: async (_run, _context, _readiness, _observations, setStage) => {
      calls.push("evaluate");
      setStage?.("evaluate_persist_action_plan");
      throw Object.assign(new Error("constraint contains private provider payload"), { code: "23514" });
    },
    fail: async (...args) => { calls.push("fail"); failure = args; },
  });
  await assert.rejects(
    () => executePilot(deps, "existing-run"),
    (error: unknown) => error instanceof PilotExecutionError
      && error.category === "pilot_internal_failure"
      && error.stage === "evaluate_persist_action_plan"
      && error.detail === "sqlstate_23514",
  );
  assert.deepEqual(failure, ["existing-run", "pilot_internal_failure", "evaluate_persist_action_plan", "sqlstate_23514"]);
  assert.equal(calls.includes("finish"), false);
});

test("failure detail sanitizer emits only bounded allowlisted diagnostics", () => {
  assert.equal(sanitizePilotFailureDetail(Object.assign(new Error("secret row value"), { code: "23505" })), "sqlstate_23505");
  assert.equal(sanitizePilotFailureDetail(new Error("operator does not exist: text = uuid; token=private")), "operator_mismatch");
  const unknown = sanitizePilotFailureDetail(new Error("Bearer secret-token provider payload"));
  assert.equal(unknown, "Error");
  assert.ok(unknown.length <= 160);
  assert.doesNotMatch(unknown, /secret|token|payload/i);
});

test("failed planner persistence does not finish or authorize any provider or public-site write", async () => {
  let providerReads = 0;
  let publicWrites = 0;
  let committedPlannerRows = 0;
  const { deps, calls } = dependencies({
    readShopify: async () => { providerReads++; return shopify; },
    readGsc: async () => { providerReads++; return gsc; },
    readGa4: async () => { providerReads++; return ga4; },
    crawl: async () => { providerReads++; return crawl; },
    evaluate: async (_run, _context, _readiness, _observations, setStage) => {
      const transactionRows = ["opportunity", "plan"];
      setStage?.("evaluate_persist_action_plan");
      assert.equal(transactionRows.length, 2);
      throw new Error("planner transaction rejected");
    },
    finish: async () => { committedPlannerRows++; calls.push("finish"); },
  });
  await assert.rejects(() => executePilot(deps, "existing-run"), /pilot_internal_failure/);
  assert.equal(providerReads, 4);
  assert.equal(publicWrites, 0);
  assert.equal(committedPlannerRows, 0);
  assert.equal(deps.publicWritesEnabled, false);
  assert.deepEqual(calls.slice(-1), ["fail"]);
});

test("readiness requires real rows rather than synthetic zero metrics", () => {
  const result = computeBaselineReadiness({ shopify, gsc: { ok: true, data: { ...gsc.data, rows: [] } }, ga4, crawl });
  assert.equal(result.state, "partial");
  assert.ok(result.blockers.includes("gsc_evidence_empty"));
});