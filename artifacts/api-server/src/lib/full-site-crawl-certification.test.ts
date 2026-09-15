import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
import {
  assertFullSiteCrawlCertificationIntegrity,
  buildFullSiteCrawlCertification,
  summarizeFullSiteCrawlAccounting,
} from "./full-site-crawl-certification.js";

const target = {
  targetClass: "first_party" as const,
  siteId: "diamond-shelf",
  canonicalOrigin: "https://diamondshelf.us",
};

function crawlPlan(hardPageLimit = 20) {
  return planFirstPartyCrawl(
    { mode: "full_site", target, hardPageLimit },
    { absolutePageCeiling: 1_000 },
  );
}

function sitemapPolicy(maxInventoryUrls = 20): SitemapInventoryPolicy {
  return {
    maxDocuments: 10,
    maxDepth: 3,
    maxDocumentBytes: 20_000,
    maxInventoryUrls,
    maxPathSegments: 20,
  };
}

function executionPolicy(overrides: Partial<FullSiteExecutionPolicy> = {}): FullSiteExecutionPolicy {
  return {
    batchSize: 4,
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
    ...overrides,
  };
}

function sourceFromXml(xml: string, hardPageLimit = 20) {
  const plan = crawlPlan(hardPageLimit);
  const inventory = buildSitemapInventory({
    plan,
    rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
    documents: [{ url: "https://diamondshelf.us/sitemap.xml", xml }],
    policy: sitemapPolicy(hardPageLimit),
  });
  const executionPlan = planFullSiteCrawlExecution(
    plan,
    inventory,
    executionPolicy({
      batchSize: Math.min(4, hardPageLimit),
      concurrency: Math.min(2, hardPageLimit),
    }),
  );
  const checkpoint = createInitialCrawlCheckpoint(executionPlan);
  return { plan, inventory, executionPlan, checkpoint };
}

function canonicalFixture() {
  return sourceFromXml(`<urlset>
    <url><loc>https://diamondshelf.us/a</loc></url>
    <url><loc>https://diamondshelf.us/b</loc></url>
    <url><loc>https://diamondshelf.us/c</loc></url>
    <url><loc>https://diamondshelf.us/d</loc></url>
    <url><loc>https://diamondshelf.us/a</loc></url>
    <url><loc>https://diamondshelf.us/cart</loc></url>
  </urlset>`);
}

function completeWithOutcomes(
  source: ReturnType<typeof sourceFromXml>,
  outcomes: SuppliedCrawlUrlOutcome[],
) {
  return advanceCrawlCheckpoint(source.executionPlan, source.checkpoint, {
    expectedCheckpointFingerprint: source.checkpoint.fingerprint,
    batchId: source.checkpoint.activeBatchId!,
    attempt: source.checkpoint.nextAttempt!,
    outcomes,
  });
}

function stableSerialize(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`).join(",")}}`;
}

function refingerprint<T extends { fingerprint: string }>(value: T): T {
  const clone = structuredClone(value);
  const withoutFingerprint = { ...clone } as Record<string, unknown>;
  delete withoutFingerprint.fingerprint;
  clone.fingerprint = createHash("sha256").update(stableSerialize(withoutFingerprint)).digest("hex");
  return clone;
}

test("P2.4 certifies complete reconciled accounting while preserving classified redirect, robots and noindex states", () => {
  const source = canonicalFixture();
  const checkpoint = completeWithOutcomes(source, [
    { canonicalUrl: "https://diamondshelf.us/a", kind: "success" },
    { canonicalUrl: "https://diamondshelf.us/b", kind: "noindex" },
    { canonicalUrl: "https://diamondshelf.us/c", kind: "robots_excluded" },
    {
      canonicalUrl: "https://diamondshelf.us/d",
      kind: "redirect",
      redirectTarget: "https://diamondshelf.us/a",
      redirectCount: 1,
    },
  ]);

  const first = buildFullSiteCrawlCertification({
    crawlPlan: source.plan,
    inventory: source.inventory,
    executionPlan: source.executionPlan,
    checkpoint,
  });
  const second = buildFullSiteCrawlCertification({
    crawlPlan: source.plan,
    inventory: source.inventory,
    executionPlan: source.executionPlan,
    checkpoint,
  });

  assert.equal(first.fingerprint, second.fingerprint);
  assert.deepEqual(first.ledger, {
    discovered: 6,
    eligible: 4,
    fetchedSuccessful: 2,
    redirects: 1,
    canonicalizedDeduplicated: 1,
    robotsExcluded: 1,
    inventoryExcluded: 1,
    robotsOrExcluded: 2,
    noindex: 1,
    failed: 0,
    finalized: 4,
    pending: 0,
    coveragePercent: 100,
    hardLimitState: {
      inventoryHardLimitReached: false,
      pageHardLimit: 20,
      absolutePageCeiling: 1_000,
      eligibleAtPageHardLimit: false,
      blockedByHardLimit: false,
    },
  });
  assert.equal(first.certification.wholeSiteCertified, true);
  assert.equal(first.certification.wholeSiteReason, "certified_complete_accounting");
  assert.deepEqual(first.certification.blockers, []);
  assert.equal(first.certification.assertsCompletenessOnly, true);
  assert.equal(first.certification.assertsSeoHealth, false);
  assert.ok(Object.values(first.authorization).every((value) => value === false));
  assertFullSiteCrawlCertificationIntegrity(first);
});

test("noindex is a fetched-success subset and never double-counts finalized coverage", () => {
  const source = sourceFromXml(`<urlset><url><loc>https://diamondshelf.us/a</loc></url></urlset>`);
  const checkpoint = completeWithOutcomes(source, [
    { canonicalUrl: "https://diamondshelf.us/a", kind: "noindex" },
  ]);
  const result = buildFullSiteCrawlCertification({
    crawlPlan: source.plan,
    inventory: source.inventory,
    executionPlan: source.executionPlan,
    checkpoint,
  });

  assert.equal(result.ledger.fetchedSuccessful, 1);
  assert.equal(result.ledger.noindex, 1);
  assert.equal(result.ledger.finalized, 1);
  assert.equal(result.ledger.coveragePercent, 100);
  assert.equal(result.certification.wholeSiteCertified, true);
});

test("terminal failure blocks certification even when finalized coverage is 100 percent", () => {
  const source = sourceFromXml(`<urlset><url><loc>https://diamondshelf.us/a</loc></url></urlset>`);
  const checkpoint = completeWithOutcomes(source, [
    { canonicalUrl: "https://diamondshelf.us/a", kind: "failure", signal: { kind: "http_status", httpStatus: 404 } },
  ]);
  const result = buildFullSiteCrawlCertification({
    crawlPlan: source.plan,
    inventory: source.inventory,
    executionPlan: source.executionPlan,
    checkpoint,
  });

  assert.equal(result.ledger.finalized, 1);
  assert.equal(result.ledger.failed, 1);
  assert.equal(result.ledger.pending, 0);
  assert.equal(result.ledger.coveragePercent, 100);
  assert.equal(result.certification.wholeSiteCertified, false);
  assert.deepEqual(result.certification.blockers, ["terminal_failures_present"]);
  assertFullSiteCrawlCertificationIntegrity(result);
});

test("pending checkpoint reports bounded coverage blockers without claiming whole-site certification", () => {
  const source = canonicalFixture();
  const result = buildFullSiteCrawlCertification({
    crawlPlan: source.plan,
    inventory: source.inventory,
    executionPlan: source.executionPlan,
    checkpoint: source.checkpoint,
  });

  assert.equal(result.ledger.finalized, 0);
  assert.equal(result.ledger.pending, 4);
  assert.equal(result.ledger.coveragePercent, 0);
  assert.equal(result.certification.wholeSiteCertified, false);
  assert.deepEqual(result.certification.blockers, [
    "checkpoint_incomplete",
    "coverage_below_100",
    "pending_urls_remaining",
    "unfinished_batches_remaining",
  ]);
  assertFullSiteCrawlCertificationIntegrity(result);
});

test("empty complete inventory is mathematically covered but explicitly not certifiable", () => {
  const source = sourceFromXml("<urlset></urlset>");
  const result = buildFullSiteCrawlCertification({
    crawlPlan: source.plan,
    inventory: source.inventory,
    executionPlan: source.executionPlan,
    checkpoint: source.checkpoint,
  });

  assert.equal(result.ledger.eligible, 0);
  assert.equal(result.ledger.finalized, 0);
  assert.equal(result.ledger.pending, 0);
  assert.equal(result.ledger.coveragePercent, 100);
  assert.equal(result.certification.wholeSiteCertified, false);
  assert.deepEqual(result.certification.blockers, ["empty_eligible_inventory"]);
  assertFullSiteCrawlCertificationIntegrity(result);
});

test("sitemap-reference rejections do not inflate discovered page URL accounting", () => {
  const source = canonicalFixture();
  const baseline = summarizeFullSiteCrawlAccounting(
    source.plan,
    source.inventory,
    source.executionPlan,
    source.checkpoint,
  );
  const withReferenceRejection = structuredClone(source.inventory);
  withReferenceRejection.rejections.push({
    kind: "sitemap_reference",
    sourceSitemap: "https://diamondshelf.us/sitemap.xml",
    reason: "cross_origin",
  });
  const after = summarizeFullSiteCrawlAccounting(
    source.plan,
    withReferenceRejection,
    source.executionPlan,
    source.checkpoint,
  );

  assert.equal(after.discovered, baseline.discovered);
});

test("P2.4 fails closed on stale/tampered upstream lineage and unexpectedly open authorization", () => {
  const source = canonicalFixture();

  const wrongInventory = structuredClone(source.inventory);
  wrongInventory.siteId = "other-site";
  assert.throws(
    () => buildFullSiteCrawlCertification({
      crawlPlan: source.plan,
      inventory: wrongInventory,
      executionPlan: source.executionPlan,
      checkpoint: source.checkpoint,
    }),
    /crawl_certification_inventory_fingerprint_mismatch|crawl_certification_identity_lineage_mismatch/,
  );

  const staleCheckpoint = structuredClone(source.checkpoint);
  staleCheckpoint.planFingerprint = "0".repeat(64);
  assert.throws(
    () => buildFullSiteCrawlCertification({
      crawlPlan: source.plan,
      inventory: source.inventory,
      executionPlan: source.executionPlan,
      checkpoint: staleCheckpoint,
    }),
    /crawl_checkpoint_lineage_mismatch/,
  );

  const opened = structuredClone(source.executionPlan) as any;
  opened.authorization.networkExecutionEnabled = true;
  assert.throws(
    () => buildFullSiteCrawlCertification({
      crawlPlan: source.plan,
      inventory: source.inventory,
      executionPlan: opened,
      checkpoint: source.checkpoint,
    }),
    /crawl_execution_authorization_must_be_closed/,
  );
});

test("incomplete or hard-limit-truncated inventory cannot enter certification", () => {
  const plan = crawlPlan(2);
  const incomplete = buildSitemapInventory({
    plan,
    rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
    documents: [{
      url: "https://diamondshelf.us/sitemap.xml",
      xml: `<sitemapindex><sitemap><loc>https://diamondshelf.us/child.xml</loc></sitemap></sitemapindex>`,
    }],
    policy: sitemapPolicy(2),
  });
  assert.equal(incomplete.completeness.complete, false);

  const completeSource = sourceFromXml(`<urlset><url><loc>https://diamondshelf.us/a</loc></url></urlset>`, 2);
  assert.throws(
    () => buildFullSiteCrawlCertification({
      crawlPlan: plan,
      inventory: incomplete,
      executionPlan: completeSource.executionPlan,
      checkpoint: completeSource.checkpoint,
    }),
    /crawl_certification_inventory_not_certifiable|crawl_certification_fingerprint_lineage_mismatch/,
  );

  const limited = buildSitemapInventory({
    plan,
    rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
    documents: [{
      url: "https://diamondshelf.us/sitemap.xml",
      xml: `<urlset>
        <url><loc>https://diamondshelf.us/a</loc></url>
        <url><loc>https://diamondshelf.us/b</loc></url>
      </urlset>`,
    }],
    policy: sitemapPolicy(1),
  });
  assert.equal(limited.completeness.hardLimitReached, true);
  assert.throws(
    () => buildFullSiteCrawlCertification({
      crawlPlan: plan,
      inventory: limited,
      executionPlan: completeSource.executionPlan,
      checkpoint: completeSource.checkpoint,
    }),
    /crawl_certification_inventory_not_certifiable|crawl_certification_fingerprint_lineage_mismatch/,
  );
});

test("P2.4 semantic integrity rejects tampering even when the certification fingerprint is recomputed", () => {
  const source = sourceFromXml(`<urlset><url><loc>https://diamondshelf.us/a</loc></url></urlset>`);
  const checkpoint = completeWithOutcomes(source, [
    { canonicalUrl: "https://diamondshelf.us/a", kind: "success" },
  ]);
  const result = buildFullSiteCrawlCertification({
    crawlPlan: source.plan,
    inventory: source.inventory,
    executionPlan: source.executionPlan,
    checkpoint,
  });
  const forged = structuredClone(result);
  forged.ledger.fetchedSuccessful = 0;
  const refingerprinted = refingerprint(forged);

  assert.throws(
    () => assertFullSiteCrawlCertificationIntegrity(refingerprinted),
    /crawl_certification_finalized_count_mismatch/,
  );
});
