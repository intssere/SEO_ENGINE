import assert from "node:assert/strict";
import test from "node:test";
import { compareFullSiteCrawlHistory } from "./crawl-history-comparison.js";
import {
  assertIncrementalRecrawlPlanIntegrity,
  buildIncrementalRecrawlPlan,
} from "./incremental-recrawl-planner.js";
import { buildIncrementalRecrawlTestSource } from "./incremental-recrawl-planner-fixtures.js";

test("P2.6 deterministically selects changed and trusted current-inventory URLs", () => {
  const before = buildIncrementalRecrawlTestSource({
    entries: [
      { path: "/a", lastmod: "2026-09-01" },
      { path: "/b", lastmod: "2026-09-02" },
    ],
  });
  const after = buildIncrementalRecrawlTestSource({
    entries: [
      { path: "/a", lastmod: "2026-09-10" },
      { path: "/b", lastmod: "2026-09-02" },
      { path: "/c", lastmod: "2026-09-11" },
      { path: "/d", lastmod: "2026-09-12" },
    ],
  });
  const comparison = compareFullSiteCrawlHistory({ before, after });

  const result = buildIncrementalRecrawlPlan({
    comparison,
    before,
    after,
    policy: { maxPlanUrls: 10, batchSize: 2 },
    trustedCandidates: [
      { canonicalUrl: "https://diamondshelf.us/b", signals: ["high_value", "stale"] },
      { canonicalUrl: "https://diamondshelf.us/c", signals: ["recent_execution"] },
      { canonicalUrl: "https://diamondshelf.us/b", signals: ["unresolved_issue"] },
    ],
  });

  assert.deepEqual(result.items, [
    { canonicalUrl: "https://diamondshelf.us/a", priority: "p0_change", reasons: ["sitemap_lastmod_changed"] },
    { canonicalUrl: "https://diamondshelf.us/c", priority: "p0_change", reasons: ["inventory_added", "recent_execution"] },
    { canonicalUrl: "https://diamondshelf.us/d", priority: "p0_change", reasons: ["inventory_added"] },
    {
      canonicalUrl: "https://diamondshelf.us/b",
      priority: "p1_actionable",
      reasons: ["unresolved_issue", "high_value", "stale"],
    },
  ]);
  assert.deepEqual(result.batches, [
    {
      batchId: "incremental-0001",
      sequence: 0,
      urls: ["https://diamondshelf.us/a", "https://diamondshelf.us/c"],
    },
    {
      batchId: "incremental-0002",
      sequence: 1,
      urls: ["https://diamondshelf.us/d", "https://diamondshelf.us/b"],
    },
  ]);
  assert.equal(result.accounting.candidateUrls, 4);
  assert.equal(result.accounting.selectedUrls, 4);
  assert.equal(result.authorization.networkExecutionEnabled, false);
  assert.equal(result.authorization.persistenceAuthorized, false);
  assert.equal(result.capabilities.perUrlOutcomeComparisonAvailable, false);
  assertIncrementalRecrawlPlanIntegrity(result);
});

test("finite plan budget defers lower-ranked URLs and enforces upstream page fuse", () => {
  const before = buildIncrementalRecrawlTestSource({ entries: [{ path: "/a", lastmod: "2026-09-01" }] });
  const after = buildIncrementalRecrawlTestSource({
    entries: [
      { path: "/a", lastmod: "2026-09-10" },
      { path: "/b", lastmod: "2026-09-11" },
      { path: "/c", lastmod: "2026-09-12" },
    ],
  });
  const comparison = compareFullSiteCrawlHistory({ before, after });
  const result = buildIncrementalRecrawlPlan({
    comparison,
    before,
    after,
    policy: { maxPlanUrls: 2, batchSize: 1 },
  });

  assert.deepEqual(result.items.map((item) => item.canonicalUrl), [
    "https://diamondshelf.us/a",
    "https://diamondshelf.us/b",
  ]);
  assert.deepEqual(result.deferred.map((item) => item.canonicalUrl), ["https://diamondshelf.us/c"]);
  assert.equal(result.accounting.deferredUrls, 1);
  assert.throws(
    () => buildIncrementalRecrawlPlan({ comparison, before, after, policy: { maxPlanUrls: 21, batchSize: 1 } }),
    /incremental_recrawl_plan_limit_exceeds_upstream_ceiling/,
  );
  assertIncrementalRecrawlPlanIntegrity(result);
});

test("aggregate regression without URL-level evidence recommends full reconciliation", () => {
  const before = buildIncrementalRecrawlTestSource({ entries: [{ path: "/a" }] });
  const after = buildIncrementalRecrawlTestSource({ entries: [{ path: "/a" }], failurePath: "/a" });
  const comparison = compareFullSiteCrawlHistory({ before, after });
  const result = buildIncrementalRecrawlPlan({
    comparison,
    before,
    after,
    policy: { maxPlanUrls: 10, batchSize: 5 },
  });

  assert.deepEqual(result.items, []);
  assert.equal(result.fallback.fullReconciliationRecommended, true);
  assert.equal(result.fallback.reason, "aggregate_regression_without_url_level_evidence");
  assertIncrementalRecrawlPlanIntegrity(result);
});

test("unchanged history with no trusted candidates produces an empty safe plan", () => {
  const source = buildIncrementalRecrawlTestSource({ entries: [{ path: "/a", lastmod: "2026-09-01" }] });
  const comparison = compareFullSiteCrawlHistory({ before: source, after: structuredClone(source) });
  const result = buildIncrementalRecrawlPlan({
    comparison,
    before: source,
    after: structuredClone(source),
    policy: { maxPlanUrls: 10, batchSize: 5 },
  });

  assert.deepEqual(result.items, []);
  assert.deepEqual(result.deferred, []);
  assert.equal(result.fallback.fullReconciliationRecommended, false);
  assert.equal(result.fallback.reason, "none");
  assertIncrementalRecrawlPlanIntegrity(result);
});
