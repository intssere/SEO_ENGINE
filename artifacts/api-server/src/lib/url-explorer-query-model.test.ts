import assert from "node:assert/strict";
import test from "node:test";
import { compareFullSiteCrawlHistory } from "./crawl-history-comparison.js";
import { buildIncrementalRecrawlPlan } from "./incremental-recrawl-planner.js";
import { buildIncrementalRecrawlTestSource } from "./incremental-recrawl-planner-fixtures.js";
import { queryUrlExplorer } from "./url-explorer-query-model.js";

function fixtures() {
  const before = buildIncrementalRecrawlTestSource({
    entries: [
      { path: "/alpha", lastmod: "2026-09-01" },
      { path: "/beta" },
    ],
  });
  const after = buildIncrementalRecrawlTestSource({
    entries: [
      { path: "/alpha", lastmod: "2026-09-10" },
      { path: "/beta" },
      { path: "/gamma", lastmod: "2026-09-11" },
      { path: "/products/delta", lastmod: "2026-09-12" },
    ],
  });
  const comparison = compareFullSiteCrawlHistory({ before, after });
  const plan = buildIncrementalRecrawlPlan({
    comparison,
    before,
    after,
    policy: { maxPlanUrls: 3, batchSize: 2 },
    trustedCandidates: [{ canonicalUrl: "https://diamondshelf.us/beta", signals: ["stale"] }],
  });
  return { before, after, plan };
}

function execute(query: Parameters<typeof queryUrlExplorer>[0]["query"] = undefined) {
  const { after, plan } = fixtures();
  return queryUrlExplorer({
    siteId: "diamond-shelf",
    canonicalOrigin: "https://diamondshelf.us",
    inventory: after.inventory,
    recrawlPlan: plan,
    query,
  });
}

test("P2.7 produces one stable honest row per inventory URL", () => {
  const result = execute();
  assert.equal(result.version, "first_party_url_explorer_query_v1");
  assert.equal(result.page.totalMatched, 4);
  assert.deepEqual(result.rows.map((row) => row.pathname), ["/alpha", "/beta", "/gamma", "/products/delta"]);
  assert.equal(new Set(result.rows.map((row) => row.urlId)).size, 4);
  for (const row of result.rows) {
    assert.deepEqual(row.unavailable, {
      httpStatus: true,
      fetchOutcome: true,
      redirectTarget: true,
      canonicalTarget: true,
      indexability: true,
      contentFingerprint: true,
    });
  }
  assert.equal(result.authorization.networkExecutionEnabled, false);
  assert.equal(result.authorization.persistenceAuthorized, false);
  assert.equal(result.authorization.publicSiteWrites, false);
});

test("P2.7 exposes selected, deferred and not-planned recrawl membership only from P2.6", () => {
  const { after, plan } = fixtures();
  assert.equal(plan.items.length, 3);
  assert.equal(plan.deferred.length, 1);
  const result = queryUrlExplorer({
    siteId: "diamond-shelf",
    canonicalOrigin: "https://diamondshelf.us",
    inventory: after.inventory,
    recrawlPlan: plan,
  });
  const byPath = new Map(result.rows.map((row) => [row.pathname, row.recrawl]));
  assert.equal(byPath.get("/alpha")?.status, "selected");
  assert.equal(byPath.get("/gamma")?.status, "selected");
  assert.equal(byPath.get("/products/delta")?.status, "selected");
  assert.equal(byPath.get("/beta")?.status, "deferred");

  const noPlan = queryUrlExplorer({
    siteId: "diamond-shelf",
    canonicalOrigin: "https://diamondshelf.us",
    inventory: after.inventory,
  });
  assert.ok(noPlan.rows.every((row) => row.recrawl.status === "not_planned" && row.recrawl.priority === null));
});

test("P2.7 filtering, sorting and pagination are deterministic and bounded", () => {
  const a = execute({
    pathPrefix: "/",
    lastmod: "present",
    recrawlStatus: "selected",
    sort: { field: "lastmod", direction: "desc" },
    page: { offset: 1, limit: 1 },
  });
  const b = execute({
    pathPrefix: "/",
    lastmod: "present",
    recrawlStatus: "selected",
    sort: { field: "lastmod", direction: "desc" },
    page: { offset: 1, limit: 1 },
  });
  assert.deepEqual(a, b);
  assert.equal(a.page.totalMatched, 3);
  assert.equal(a.page.returned, 1);
  assert.equal(a.page.hasMore, true);
  assert.equal(a.rows[0]?.pathname, "/gamma");
  assert.throws(() => execute({ page: { offset: 0, limit: 501 } }), /url_explorer_limit_invalid/);
  assert.throws(() => execute({ page: { offset: 25_001, limit: 1 } }), /url_explorer_offset_invalid/);
});

test("P2.7 filters by text, sitemap source, recrawl priority and reason", () => {
  const all = execute();
  const sitemapSource = all.rows[0]?.sourceSitemaps[0];
  assert.ok(sitemapSource);
  assert.equal(execute({ text: "PRODUCTS" }).page.totalMatched, 1);
  assert.equal(execute({ sitemapSource }).page.totalMatched, 4);
  assert.ok(execute({ recrawlPriority: "p0_change" }).page.totalMatched >= 1);
  assert.ok(execute({ recrawlReason: "inventory_added" }).page.totalMatched >= 1);
  assert.equal(execute({ lastmod: "absent" }).rows[0]?.pathname, "/beta");
});

test("P2.7 fails closed on site identity, inventory tampering and recrawl lineage mismatch", () => {
  const { before, after, plan } = fixtures();
  assert.throws(() => queryUrlExplorer({
    siteId: "wrong-site",
    canonicalOrigin: "https://diamondshelf.us",
    inventory: after.inventory,
  }), /url_explorer_inventory_site_identity_mismatch/);

  const tampered = structuredClone(after.inventory);
  tampered.inventory.entries[0]!.lastmod = "2099-01-01";
  assert.throws(() => queryUrlExplorer({
    siteId: "diamond-shelf",
    canonicalOrigin: "https://diamondshelf.us",
    inventory: tampered,
  }), /url_explorer_inventory_fingerprint_mismatch/);

  assert.throws(() => queryUrlExplorer({
    siteId: "diamond-shelf",
    canonicalOrigin: "https://diamondshelf.us",
    inventory: before.inventory,
    recrawlPlan: plan,
  }), /url_explorer_recrawl_inventory_lineage_mismatch/);
});

test("P2.7 rejects malformed query inputs, cross-origin inventory and noncanonical URLs", () => {
  assert.throws(() => execute({ pathPrefix: "products" }), /url_explorer_path_prefix_invalid/);
  assert.throws(() => execute({ sitemapSource: "https://example.com/sitemap.xml" }), /url_explorer_sitemap_source_invalid/);

  const { after } = fixtures();
  const crossOrigin = structuredClone(after.inventory);
  crossOrigin.inventory.entries[0]!.canonicalUrl = "https://example.com/alpha";
  assert.throws(() => queryUrlExplorer({
    siteId: "diamond-shelf",
    canonicalOrigin: "https://diamondshelf.us",
    inventory: crossOrigin,
  }), /url_explorer_inventory_cross_origin_denied/);

  const noncanonical = structuredClone(after.inventory);
  noncanonical.inventory.entries[0]!.canonicalUrl = "https://diamondshelf.us/alpha/";
  assert.throws(() => queryUrlExplorer({
    siteId: "diamond-shelf",
    canonicalOrigin: "https://diamondshelf.us",
    inventory: noncanonical,
  }), /url_explorer_inventory_url_not_canonical/);
});
