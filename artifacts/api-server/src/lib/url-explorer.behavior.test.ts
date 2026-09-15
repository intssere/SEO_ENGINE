import assert from "node:assert/strict";
import test from "node:test";
import { buildUrlExplorerInventory, buildUrlExplorerTestContext } from "./url-explorer-fixtures.js";
import { assertUrlExplorerResultIntegrity, queryUrlExplorer } from "./url-explorer.js";

const ORIGIN = "https://diamondshelf.us";

test("P2.7 returns deterministic inventory rows with selected, deferred and not-planned recrawl states", () => {
  const { inventory, recrawlPlan } = buildUrlExplorerTestContext();
  const result = queryUrlExplorer({ inventory, recrawlPlan });

  assert.deepEqual(result.items.map((item) => [item.canonicalUrl, item.recrawl.status]), [
    [`${ORIGIN}/a`, "selected"],
    [`${ORIGIN}/b`, "deferred"],
    [`${ORIGIN}/c`, "selected"],
    [`${ORIGIN}/d`, "selected"],
    [`${ORIGIN}/e`, "not_planned"],
  ]);
  assert.deepEqual(result.items.find((item) => item.canonicalUrl === `${ORIGIN}/b`)?.recrawl, {
    status: "deferred",
    priority: "p1_actionable",
    reasons: ["unresolved_issue", "high_value"],
  });
  assert.deepEqual(result.items.find((item) => item.canonicalUrl === `${ORIGIN}/e`)?.recrawl, {
    status: "not_planned",
    priority: null,
    reasons: [],
  });
  assert.ok(result.items.every((item) => item.inventory.member === true));
  assert.ok(result.items.every((item) => item.inventory.sourceSitemaps.includes(`${ORIGIN}/sitemap.xml`)));
  assert.equal(result.source.recrawlPlanFingerprint, recrawlPlan.fingerprint);
  assert.equal(result.authorization.networkExecutionEnabled, false);
  assert.equal(result.authorization.persistenceAuthorized, false);
  assertUrlExplorerResultIntegrity(result);
});

test("P2.7 supports deterministic filters without inventing unavailable per-URL crawl facts", () => {
  const { inventory, recrawlPlan } = buildUrlExplorerTestContext();

  const p0 = queryUrlExplorer({ inventory, recrawlPlan, query: { filters: { recrawlPriority: "p0_change" } } });
  assert.deepEqual(p0.items.map((item) => item.canonicalUrl), [`${ORIGIN}/a`, `${ORIGIN}/c`, `${ORIGIN}/d`]);

  const added = queryUrlExplorer({ inventory, recrawlPlan, query: { filters: { recrawlReason: "inventory_added" } } });
  assert.deepEqual(added.items.map((item) => item.canonicalUrl), [`${ORIGIN}/c`, `${ORIGIN}/d`]);

  const deferred = queryUrlExplorer({ inventory, recrawlPlan, query: { filters: { recrawlStatus: "deferred" } } });
  assert.deepEqual(deferred.items.map((item) => item.canonicalUrl), [`${ORIGIN}/b`]);

  const noLastmod = queryUrlExplorer({ inventory, recrawlPlan, query: { filters: { hasLastmod: false } } });
  assert.deepEqual(noLastmod.items.map((item) => item.canonicalUrl), [`${ORIGIN}/e`]);

  const byPath = queryUrlExplorer({ inventory, recrawlPlan, query: { filters: { pathnamePrefix: "/c" } } });
  assert.deepEqual(byPath.items.map((item) => item.canonicalUrl), [`${ORIGIN}/c`]);

  const byUrl = queryUrlExplorer({ inventory, recrawlPlan, query: { filters: { canonicalUrlPrefix: `${ORIGIN}/d` } } });
  assert.deepEqual(byUrl.items.map((item) => item.canonicalUrl), [`${ORIGIN}/d`]);

  const bySitemap = queryUrlExplorer({ inventory, recrawlPlan, query: { filters: { sourceSitemap: `${ORIGIN}/sitemap.xml` } } });
  assert.equal(bySitemap.page.totalMatched, 5);

  for (const item of p0.items) {
    assert.deepEqual(item.unavailablePerUrlDimensions, [
      "http_status",
      "fetch_result",
      "canonical_target",
      "indexability",
      "content_fingerprint",
    ]);
    assert.equal("httpStatus" in item, false);
    assert.equal("fetchResult" in item, false);
    assert.equal("canonicalTarget" in item, false);
    assert.equal("indexability" in item, false);
    assert.equal("contentFingerprint" in item, false);
  }
});

test("P2.7 pagination cursors are query-lineage bound and deterministic", () => {
  const { inventory, recrawlPlan } = buildUrlExplorerTestContext();
  const first = queryUrlExplorer({
    inventory,
    recrawlPlan,
    query: { sort: { field: "canonical_url", direction: "asc" }, page: { limit: 2 } },
  });
  assert.deepEqual(first.items.map((item) => item.canonicalUrl), [`${ORIGIN}/a`, `${ORIGIN}/b`]);
  assert.equal(first.page.offset, 0);
  assert.equal(first.page.returned, 2);
  assert.equal(first.page.totalMatched, 5);
  assert.equal(first.page.hasMore, true);
  assert.ok(first.page.nextCursor);

  const second = queryUrlExplorer({
    inventory,
    recrawlPlan,
    query: {
      sort: { field: "canonical_url", direction: "asc" },
      page: { limit: 2, cursor: first.page.nextCursor },
    },
  });
  assert.deepEqual(second.items.map((item) => item.canonicalUrl), [`${ORIGIN}/c`, `${ORIGIN}/d`]);
  assert.equal(second.page.offset, 2);
  assert.equal(second.query.fingerprint, first.query.fingerprint);
  assertUrlExplorerResultIntegrity(second);

  assert.throws(
    () => queryUrlExplorer({
      inventory,
      recrawlPlan,
      query: {
        sort: { field: "canonical_url", direction: "desc" },
        page: { limit: 2, cursor: first.page.nextCursor },
      },
    }),
    /url_explorer_cursor_lineage_mismatch/,
  );
  assert.throws(
    () => queryUrlExplorer({ inventory, recrawlPlan, query: { page: { limit: 3, cursor: first.page.nextCursor } } }),
    /url_explorer_cursor_lineage_mismatch/,
  );
});

test("P2.7 sorting remains deterministic with canonical URL tie-breakers", () => {
  const { inventory, recrawlPlan } = buildUrlExplorerTestContext();
  const result = queryUrlExplorer({
    inventory,
    recrawlPlan,
    query: { sort: { field: "recrawl_status", direction: "asc" } },
  });
  assert.deepEqual(result.items.map((item) => [item.canonicalUrl, item.recrawl.status]), [
    [`${ORIGIN}/a`, "selected"],
    [`${ORIGIN}/c`, "selected"],
    [`${ORIGIN}/d`, "selected"],
    [`${ORIGIN}/b`, "deferred"],
    [`${ORIGIN}/e`, "not_planned"],
  ]);
  assertUrlExplorerResultIntegrity(result);
});

test("P2.7 works honestly without a recrawl plan and handles empty inventory", () => {
  const inventory = buildUrlExplorerInventory([
    { path: "/a", lastmod: "2026-09-10" },
    { path: "/b" },
  ]);
  const withoutPlan = queryUrlExplorer({ inventory });
  assert.equal(withoutPlan.source.recrawlPlanFingerprint, null);
  assert.ok(withoutPlan.items.every((item) => item.recrawl.status === "not_planned"));
  assertUrlExplorerResultIntegrity(withoutPlan);

  const empty = queryUrlExplorer({ inventory: buildUrlExplorerInventory([]) });
  assert.deepEqual(empty.items, []);
  assert.equal(empty.page.totalMatched, 0);
  assert.equal(empty.page.returned, 0);
  assert.equal(empty.page.hasMore, false);
  assert.equal(empty.page.nextCursor, null);
  assertUrlExplorerResultIntegrity(empty);
});
