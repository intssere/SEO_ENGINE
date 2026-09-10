import test from "node:test";
import assert from "node:assert/strict";
import { assertNoWholeSiteClaim, evaluateDiamondShelfBaseline } from "./index.js";

test("marks a well-covered real baseline ready", () => {
  const result = evaluateDiamondShelfBaseline({
    expectedUrlCount: 3000,
    pagesDiscovered: 3012,
    pagesFetched: 2960,
    gscRows: 5000,
    ga4Rows: 800,
    shopifyInventoryCount: 2997,
    aiVisibilityObservations: 50,
    technicalFindingCount: 120,
    internalLinkEdgeCount: 12000,
  });
  assert.equal(result.state, "ready");
  assert.ok(result.coverageRatio >= 0.95);
  assert.doesNotThrow(() => assertNoWholeSiteClaim(result));
});

test("blocks baseline when crawl or primary search data is absent", () => {
  const result = evaluateDiamondShelfBaseline({
    expectedUrlCount: 3000,
    pagesDiscovered: 0,
    pagesFetched: 0,
    gscRows: 0,
    ga4Rows: 0,
    shopifyInventoryCount: 0,
    aiVisibilityObservations: 0,
    technicalFindingCount: 0,
    internalLinkEdgeCount: 0,
  });
  assert.equal(result.state, "blocked");
});

test("partial crawl cannot be represented as whole-site coverage", () => {
  const result = evaluateDiamondShelfBaseline({
    expectedUrlCount: 3000,
    pagesDiscovered: 1900,
    pagesFetched: 1800,
    gscRows: 100,
    ga4Rows: 100,
    shopifyInventoryCount: 2997,
    aiVisibilityObservations: 10,
    technicalFindingCount: 20,
    internalLinkEdgeCount: 5000,
  });
  assert.equal(result.state, "partial");
  assert.throws(() => assertNoWholeSiteClaim(result), /95%/);
});

test("optional enrichment gaps remain partial rather than fabricating data", () => {
  const result = evaluateDiamondShelfBaseline({
    expectedUrlCount: 100,
    pagesDiscovered: 100,
    pagesFetched: 100,
    gscRows: 20,
    ga4Rows: 0,
    shopifyInventoryCount: 95,
    aiVisibilityObservations: 0,
    technicalFindingCount: 0,
    internalLinkEdgeCount: 0,
  });
  assert.equal(result.state, "partial");
});
