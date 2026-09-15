import assert from "node:assert/strict";
import test from "node:test";
import { planFirstPartyCrawl } from "./crawl-controller.js";
import { buildSitemapInventory, type SitemapInventoryPolicy } from "./sitemap-inventory.js";
import {
  advanceCrawlCheckpoint,
  createInitialCrawlCheckpoint,
  planFullSiteCrawlExecution,
  type FullSiteExecutionPolicy,
  type SuppliedCrawlUrlOutcome,
} from "./full-site-crawl-control.js";
import { buildFullSiteCrawlCertification } from "./full-site-crawl-certification.js";
import {
  assertCrawlHistoryComparisonIntegrity,
  compareFullSiteCrawlHistory,
  CRAWL_HISTORY_UNAVAILABLE_PER_URL_DIMENSIONS,
} from "./crawl-history-comparison.js";

function sitemapPolicy(maxInventoryUrls = 20): SitemapInventoryPolicy {
  return {
    maxDocuments: 10,
    maxDepth: 3,
    maxDocumentBytes: 20_000,
    maxInventoryUrls,
    maxPathSegments: 20,
  };
}

function executionPolicy(): FullSiteExecutionPolicy {
  return {
    batchSize: 20,
    concurrency: 2,
    requestsPerMinute: 60,
    requestTimeoutMs: 10_000,
    maxRedirectsPerRequest: 3,
    maxAttemptsPerUrl: 3,
    retryBaseDelayMs: 1_000,
    retryMaxDelayMs: 4_000,
    maxUrlLength: 2_048,
    maxPathSegments: 20,
    maxRepeatedPathSegmentRun: 4,
  };
}

function buildSource(input: {
  siteId?: string;
  canonicalOrigin?: string;
  entries: Array<{ path: string; lastmod?: string }>;
  failurePath?: string;
}) {
  const siteId = input.siteId ?? "diamond-shelf";
  const canonicalOrigin = input.canonicalOrigin ?? "https://diamondshelf.us";
  const plan = planFirstPartyCrawl(
    {
      mode: "full_site",
      target: { targetClass: "first_party", siteId, canonicalOrigin },
      hardPageLimit: 20,
    },
    { absolutePageCeiling: 1_000 },
  );
  const body = input.entries
    .map(({ path, lastmod }) => `<url><loc>${canonicalOrigin}${path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`)
    .join("");
  const inventory = buildSitemapInventory({
    plan,
    rootSitemapUrl: `${canonicalOrigin}/sitemap.xml`,
    documents: [{ url: `${canonicalOrigin}/sitemap.xml`, xml: `<urlset>${body}</urlset>` }],
    policy: sitemapPolicy(),
  });
  const executionPlan = planFullSiteCrawlExecution(plan, inventory, executionPolicy());
  const initial = createInitialCrawlCheckpoint(executionPlan);
  assert.ok(initial.activeBatchId);
  assert.ok(initial.nextAttempt);
  const outcomes: SuppliedCrawlUrlOutcome[] = inventory.inventory.entries.map((entry) => {
    if (input.failurePath && entry.canonicalUrl === `${canonicalOrigin}${input.failurePath}`) {
      return { canonicalUrl: entry.canonicalUrl, kind: "failure", signal: { kind: "http_status", httpStatus: 404 } };
    }
    return { canonicalUrl: entry.canonicalUrl, kind: "success" };
  });
  const checkpoint = advanceCrawlCheckpoint(executionPlan, initial, {
    expectedCheckpointFingerprint: initial.fingerprint,
    batchId: initial.activeBatchId,
    attempt: initial.nextAttempt,
    outcomes,
  });
  const certification = buildFullSiteCrawlCertification({
    crawlPlan: plan,
    inventory,
    executionPlan,
    checkpoint,
  });
  return { inventory, certification };
}

test("P2.5 deterministically detects inventory membership and sitemap lastmod changes", () => {
  const before = buildSource({
    entries: [
      { path: "/a", lastmod: "2026-09-01" },
      { path: "/b", lastmod: "2026-09-02" },
    ],
  });
  const after = buildSource({
    entries: [
      { path: "/b", lastmod: "2026-09-10" },
      { path: "/c", lastmod: "2026-09-11" },
    ],
  });

  const first = compareFullSiteCrawlHistory({ before, after });
  const second = compareFullSiteCrawlHistory({ before, after });

  assert.equal(first.fingerprint, second.fingerprint);
  assert.deepEqual(first.inventoryChanges.added, [
    { canonicalUrl: "https://diamondshelf.us/c", lastmod: "2026-09-11" },
  ]);
  assert.deepEqual(first.inventoryChanges.removed, [
    { canonicalUrl: "https://diamondshelf.us/a", lastmod: "2026-09-01" },
  ]);
  assert.deepEqual(first.inventoryChanges.lastmodChanged, [
    {
      canonicalUrl: "https://diamondshelf.us/b",
      beforeLastmod: "2026-09-02",
      afterLastmod: "2026-09-10",
    },
  ]);
  assert.equal(first.inventoryChanges.unchangedMembership, 1);
  assert.equal(first.summary.inventoryMembershipChanged, true);
  assert.equal(first.summary.sitemapLastmodChanged, true);
  assert.equal(first.summary.changeDetected, true);
  assertCrawlHistoryComparisonIntegrity(first);
});

test("identical certified sources produce a no-change comparison", () => {
  const source = buildSource({ entries: [{ path: "/a", lastmod: "2026-09-01" }] });
  const result = compareFullSiteCrawlHistory({ before: source, after: structuredClone(source) });

  assert.deepEqual(result.inventoryChanges.added, []);
  assert.deepEqual(result.inventoryChanges.removed, []);
  assert.deepEqual(result.inventoryChanges.lastmodChanged, []);
  assert.equal(result.inventoryChanges.unchangedMembership, 1);
  assert.ok(Object.values(result.ledgerDeltas).every((delta) => delta === 0));
  assert.equal(result.certificationTransition.changed, false);
  assert.equal(result.lineageChanges.inventoryChanged, false);
  assert.equal(result.lineageChanges.executionPlanChanged, false);
  assert.equal(result.lineageChanges.checkpointChanged, false);
  assert.equal(result.summary.changeDetected, false);
  assertCrawlHistoryComparisonIntegrity(result);
});

test("certification and aggregate ledger transitions are surfaced without inventing per-URL outcome changes", () => {
  const before = buildSource({ entries: [{ path: "/a" }], failurePath: "/a" });
  const after = buildSource({ entries: [{ path: "/a" }] });
  const result = compareFullSiteCrawlHistory({ before, after });

  assert.equal(result.certificationTransition.beforeCertified, false);
  assert.equal(result.certificationTransition.afterCertified, true);
  assert.equal(result.certificationTransition.changed, true);
  assert.deepEqual(result.certificationTransition.blockersAdded, []);
  assert.deepEqual(result.certificationTransition.blockersRemoved, ["terminal_failures_present"]);
  assert.equal(result.ledgerDeltas.failed, -1);
  assert.equal(result.ledgerDeltas.fetchedSuccessful, 1);
  assert.equal(result.capabilities.perUrlOutcomeComparisonAvailable, false);
  assert.deepEqual(
    result.capabilities.unavailablePerUrlDimensions,
    [...CRAWL_HISTORY_UNAVAILABLE_PER_URL_DIMENSIONS],
  );
  assert.ok(Object.values(result.authorization).every((value) => value === false));
  assertCrawlHistoryComparisonIntegrity(result);
});

test("cross-site or cross-origin history comparison fails closed", () => {
  const before = buildSource({ entries: [{ path: "/a" }] });
  const after = buildSource({
    siteId: "other-site",
    canonicalOrigin: "https://example.com",
    entries: [{ path: "/a" }],
  });

  assert.throws(
    () => compareFullSiteCrawlHistory({ before, after }),
    /crawl_history_cross_identity_comparison_denied/,
  );
});

test("tampered upstream inventory fails before comparison", () => {
  const before = buildSource({ entries: [{ path: "/a", lastmod: "2026-09-01" }] });
  const after = buildSource({ entries: [{ path: "/a", lastmod: "2026-09-01" }] });
  const tampered = structuredClone(after);
  tampered.inventory.inventory.entries[0].lastmod = "2026-09-12";

  assert.throws(
    () => compareFullSiteCrawlHistory({ before, after: tampered }),
    /crawl_history_inventory_fingerprint_mismatch/,
  );
});

test("tampered comparison fingerprint or summary fails integrity validation", () => {
  const source = buildSource({ entries: [{ path: "/a" }] });
  const result = compareFullSiteCrawlHistory({ before: source, after: source });

  const badSummary = structuredClone(result);
  badSummary.summary.changeDetected = true;
  assert.throws(
    () => assertCrawlHistoryComparisonIntegrity(badSummary),
    /crawl_history_comparison_summary_mismatch/,
  );

  const badFingerprint = structuredClone(result);
  badFingerprint.fingerprint = "0".repeat(64);
  assert.throws(
    () => assertCrawlHistoryComparisonIntegrity(badFingerprint),
    /crawl_history_comparison_fingerprint_mismatch/,
  );
});
