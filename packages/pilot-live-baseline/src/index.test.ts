import test from "node:test";
import assert from "node:assert/strict";
import { assertLiveBaselineReady, evaluateLiveBaselineRun } from "./index.js";

const activation = {
  ready: true,
  siteDomain: "diamondshelf.us",
  shopDomain: "vcuxm7-76.myshopify.com",
  gscProperty: "https://diamondshelf.us/",
  ga4PropertyId: "123456789",
  seoProvider: "openseo",
  checkedAt: "2026-09-10T13:40:00Z",
};

const complete = {
  expectedUrlCount: 3000,
  pagesDiscovered: 3000,
  pagesFetched: 2950,
  gscRows: 12000,
  ga4Rows: 2800,
  shopifyInventoryCount: 2997,
  aiVisibilityObservations: 20,
  technicalFindingCount: 42,
  internalLinkEdgeCount: 25000,
  observedAt: "2026-09-10T14:00:00Z",
  sourceRunId: "baseline-2026-09-10-001",
  crawlHardLimit: 3500,
  publicSiteWritesEnabled: false,
};

test("verified activation plus >=95% crawl and required evidence can reach ready", () => {
  const result = evaluateLiveBaselineRun(activation, complete);
  assert.equal(result.status, "ready");
  assert.equal(result.wholeSiteClaimAllowed, true);
  assert.equal(result.baseline?.coverageRatio! >= 0.95, true);
  assert.doesNotThrow(() => assertLiveBaselineReady(result));
});

test("Task #31 activation must be ready first", () => {
  const result = evaluateLiveBaselineRun({ ...activation, ready: false }, complete);
  assert.equal(result.status, "blocked");
  assert.match(result.blockers.join(" "), /Task #31/);
});

test("writes enabled blocks live baseline collection", () => {
  const original = process.env.PUBLIC_SITE_WRITES_ENABLED;
  process.env.PUBLIC_SITE_WRITES_ENABLED = "true";
  try {
    const result = evaluateLiveBaselineRun(activation, complete);
    assert.equal(result.status, "blocked");
    assert.equal(result.writesObservedEnabled, true);
  } finally {
    if (original === undefined) delete process.env.PUBLIC_SITE_WRITES_ENABLED;
    else process.env.PUBLIC_SITE_WRITES_ENABLED = original;
  }
});

test("partial crawl cannot be represented as whole-site baseline", () => {
  const result = evaluateLiveBaselineRun(activation, { ...complete, pagesFetched: 2000 });
  assert.equal(result.status, "partial");
  assert.equal(result.wholeSiteClaimAllowed, false);
  assert.throws(() => assertLiveBaselineReady(result));
});

test("missing GSC evidence blocks baseline readiness", () => {
  const result = evaluateLiveBaselineRun(activation, { ...complete, gscRows: 0 });
  assert.equal(result.status, "blocked");
  assert.equal(result.baseline?.checks.find((check) => check.id === "gsc")?.state, "blocked");
});

test("invalid run accounting fails closed", () => {
  const result = evaluateLiveBaselineRun(activation, { ...complete, pagesDiscovered: 100, pagesFetched: 101 });
  assert.equal(result.status, "blocked");
  assert.match(result.blockers.join(" "), /cannot exceed/);
});
