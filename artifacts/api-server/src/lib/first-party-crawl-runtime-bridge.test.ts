import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildIncrementalRecrawlPlan } from "./incremental-recrawl-planner.js";
import { compareFullSiteCrawlHistory } from "./crawl-history-comparison.js";
import {
  DIAMOND_SHELF_CANONICAL_ORIGIN,
  firstPartyCrawlBridgeReadiness,
  runFullSiteCrawlBridge,
  runIncrementalCrawlBridge,
  type CrawlCheckpointPersistenceRecord,
  type FirstPartyCrawlBridgeOptions,
  type FullSiteCrawlBridgeSnapshot,
  type IncrementalCrawlBridgeReceipt,
  type PageTransportResult,
} from "./first-party-crawl-runtime-bridge.js";
import type { FullSiteCrawlCheckpoint, FullSiteExecutionPolicy } from "./full-site-crawl-control.js";
import type { SitemapInventoryPolicy, SuppliedSitemapDocument } from "./sitemap-inventory.js";

const OBSERVED_AT = "2026-09-22T00:00:00.000Z";

function sitemapPolicy(maxInventoryUrls = 20): SitemapInventoryPolicy {
  return {
    maxDocuments: 10,
    maxDepth: 3,
    maxDocumentBytes: 1_000_000,
    maxInventoryUrls,
    maxPathSegments: 20,
  };
}

function executionPolicy(): FullSiteExecutionPolicy {
  return {
    batchSize: 2,
    concurrency: 1,
    requestsPerMinute: 120,
    requestTimeoutMs: 5_000,
    maxRedirectsPerRequest: 3,
    maxAttemptsPerUrl: 3,
    retryBaseDelayMs: 10,
    retryMaxDelayMs: 20,
    maxUrlLength: 2_048,
    maxPathSegments: 20,
    maxRepeatedPathSegmentRun: 3,
  };
}

function urlset(entries: Array<{ path: string; lastmod?: string }>): string {
  return `<urlset>${entries.map((entry) =>
    `<url><loc>${DIAMOND_SHELF_CANONICAL_ORIGIN}${entry.path}</loc>${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ""}</url>`
  ).join("")}</urlset>`;
}

class MemoryPersistence {
  checkpoints = new Map<string, FullSiteCrawlCheckpoint>();
  completed: FullSiteCrawlBridgeSnapshot[] = [];
  incremental: IncrementalCrawlBridgeReceipt[] = [];
  checkpointWrites: CrawlCheckpointPersistenceRecord[] = [];

  async loadCheckpoint(input: { runId: string }) {
    return this.checkpoints.get(input.runId) ?? null;
  }

  async saveCheckpoint(record: CrawlCheckpointPersistenceRecord) {
    this.checkpointWrites.push(structuredClone(record));
    this.checkpoints.set(record.runId, structuredClone(record.checkpoint));
  }

  async loadLatestCompleted() {
    return this.completed.at(-1) ? structuredClone(this.completed.at(-1)!) : null;
  }

  async saveCompletedRun(snapshot: FullSiteCrawlBridgeSnapshot) {
    this.completed.push(structuredClone(snapshot));
  }

  async saveIncrementalRun(receipt: IncrementalCrawlBridgeReceipt) {
    this.incremental.push(structuredClone(receipt));
  }
}

function harness(input?: {
  documents?: SuppliedSitemapDocument[];
  robotsDenied?: Set<string>;
  pageResults?: Map<string, PageTransportResult[]>;
}) {
  const persistence = new MemoryPersistence();
  const documents = input?.documents ?? [{
    url: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/sitemap.xml`,
    xml: urlset([{ path: "/a" }]),
  }];
  const robotsDenied = input?.robotsDenied ?? new Set<string>();
  const pageResults = input?.pageResults ?? new Map<string, PageTransportResult[]>();
  const calls = {
    sitemap: 0,
    robots: [] as string[],
    pages: [] as string[],
    sleeps: [] as number[],
  };

  const options: FirstPartyCrawlBridgeOptions = {
    sitemapAcquirer: {
      async load(request) {
        calls.sitemap += 1;
        assert.equal(request.canonicalOrigin, DIAMOND_SHELF_CANONICAL_ORIGIN);
        assert.equal(request.sameOriginOnly, true);
        assert.equal(request.httpsOnly, true);
        assert.equal(request.queryAllowed, false);
        assert.equal(request.fragmentAllowed, false);
        return structuredClone(documents);
      },
    },
    robotsEvaluator: {
      async evaluate(request) {
        calls.robots.push(request.canonicalUrl);
        return { allowed: !robotsDenied.has(request.canonicalUrl) };
      },
    },
    pageTransport: {
      async get(request) {
        calls.pages.push(request.canonicalUrl);
        assert.equal(request.method, "GET");
        assert.equal(request.followRedirects, false);
        assert.equal(request.responseBodyPersistence, false);
        const queue = pageResults.get(request.canonicalUrl);
        if (queue?.length) return queue.shift()!;
        return { kind: "success" };
      },
    },
    clock: {
      async sleep(milliseconds) {
        calls.sleeps.push(milliseconds);
      },
    },
    persistence,
    networkReady: true,
    liveExecutionAuthorized: true,
    persistenceReady: true,
    persistenceAuthorized: true,
  };

  return { options, persistence, documents, calls };
}

function fullInput(runId: string, overrides?: Partial<Parameters<typeof runFullSiteCrawlBridge>[0]>) {
  return {
    runId,
    observedAt: OBSERVED_AT,
    binding: {
      siteId: "diamond-shelf-primary",
      canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
      rootSitemapUrl: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/sitemap.xml`,
    },
    hardPageLimit: 20,
    absolutePageCeiling: 25_000,
    sitemapPolicy: sitemapPolicy(),
    executionPolicy: executionPolicy(),
    ...overrides,
  };
}

test("P12.2 bridge is default-off and advertises no bundled network/database/scheduler/write authority", () => {
  const readiness = firstPartyCrawlBridgeReadiness();
  assert.deepEqual(readiness, {
    version: "p12-2-first-party-crawl-bridge-v1",
    target: "diamond_shelf_first_party",
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    configured: false,
    networkReady: false,
    liveExecutionAuthorized: false,
    persistenceReady: false,
    persistenceAuthorized: false,
    firstPartyReadOnly: true,
    injectedTransportOnly: true,
    injectedPersistenceOnly: true,
    directNetworkClientBundled: false,
    directDatabaseClientBundled: false,
    responseBodyPersistence: false,
    rawSitemapXmlPersistence: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    deploymentAuthorized: false,
    publicationAuthorized: false,
  });
});

test("full-site bridge preserves P2 robots/noindex/redirect accounting and persists lineage without raw content", async () => {
  const documents = [{
    url: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/sitemap.xml`,
    xml: urlset([
      { path: "/a" },
      { path: "/b" },
      { path: "/c" },
    ]),
  }];
  const robotsDenied = new Set([`${DIAMOND_SHELF_CANONICAL_ORIGIN}/b`]);
  const pageResults = new Map<string, PageTransportResult[]>([
    [`${DIAMOND_SHELF_CANONICAL_ORIGIN}/a`, [{ kind: "success", noindex: true }]],
    [`${DIAMOND_SHELF_CANONICAL_ORIGIN}/c`, [{
      kind: "redirect",
      redirectTarget: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/a`,
      redirectCount: 1,
    }]],
  ]);
  const { options, persistence, calls } = harness({ documents, robotsDenied, pageResults });

  const result = await runFullSiteCrawlBridge(fullInput("full-001"), options);

  assert.equal(result.certification.certification.wholeSiteCertified, true);
  assert.equal(result.certification.ledger.eligible, 3);
  assert.equal(result.certification.ledger.fetchedSuccessful, 1);
  assert.equal(result.certification.ledger.noindex, 1);
  assert.equal(result.certification.ledger.redirects, 1);
  assert.equal(result.certification.ledger.robotsExcluded, 1);
  assert.equal(result.certification.ledger.failed, 0);
  assert.equal(result.certification.ledger.coveragePercent, 100);
  assert.equal(result.persistence.rawResponseBodyPersisted, false);
  assert.equal(result.persistence.rawSitemapXmlPersisted, false);
  assert.equal(result.persistence.pageContentPersisted, false);
  assert.equal(calls.pages.length, 2);
  assert.deepEqual(calls.pages, [
    `${DIAMOND_SHELF_CANONICAL_ORIGIN}/a`,
    `${DIAMOND_SHELF_CANONICAL_ORIGIN}/c`,
  ]);
  assert.ok(calls.sleeps.includes(500));
  assert.ok(persistence.checkpointWrites.length >= 2);
  assert.equal(persistence.completed.length, 1);
});

test("retryable transport failure resumes through the exact P2 checkpoint attempt sequence", async () => {
  const url = `${DIAMOND_SHELF_CANONICAL_ORIGIN}/a`;
  const pageResults = new Map<string, PageTransportResult[]>([
    [url, [
      { kind: "failure", signal: { kind: "network_timeout" } },
      { kind: "success" },
    ]],
  ]);
  const { options, persistence, calls } = harness({ pageResults });

  const result = await runFullSiteCrawlBridge(fullInput("retry-001"), options);

  assert.equal(result.certification.certification.wholeSiteCertified, true);
  assert.equal(result.checkpoint.counters.attemptsRecorded, 2);
  assert.equal(result.checkpoint.counters.retryScheduled, 1);
  assert.equal(result.checkpoint.counters.fetchedSuccessful, 1);
  assert.deepEqual(calls.pages, [url, url]);
  assert.ok(calls.sleeps.includes(10));
  assert.ok(calls.sleeps.includes(500));
  assert.ok(persistence.checkpointWrites.some((record) => record.checkpoint.nextAttempt === 2));
});

test("closed readiness gates stop before sitemap/network/persistence adapter activity", async () => {
  const { options, calls, persistence } = harness();
  const closed = { ...options, networkReady: false };

  await assert.rejects(
    runFullSiteCrawlBridge(fullInput("closed-001"), closed),
    /crawl_bridge_network_not_ready/,
  );
  assert.equal(calls.sitemap, 0);
  assert.equal(calls.pages.length, 0);
  assert.equal(persistence.checkpointWrites.length, 0);

  await assert.rejects(
    runFullSiteCrawlBridge(fullInput("closed-002"), { ...options, liveExecutionAuthorized: false }),
    /crawl_bridge_execution_not_authorized/,
  );
  await assert.rejects(
    runFullSiteCrawlBridge(fullInput("closed-003"), { ...options, persistenceAuthorized: false }),
    /crawl_bridge_persistence_not_authorized/,
  );
});

test("Diamond Shelf identity, sitemap origin and redirect target fail closed", async () => {
  const base = harness();

  await assert.rejects(
    runFullSiteCrawlBridge(fullInput("origin-001", {
      binding: {
        siteId: "diamond-shelf-primary",
        canonicalOrigin: "https://example.com",
        rootSitemapUrl: "https://example.com/sitemap.xml",
      },
    }), base.options),
    /crawl_bridge_diamond_shelf_origin_required/,
  );

  const badSitemap = harness({
    documents: [{
      url: "https://example.com/sitemap.xml",
      xml: "<urlset></urlset>",
    }],
  });
  await assert.rejects(
    runFullSiteCrawlBridge(fullInput("origin-002"), badSitemap.options),
    /sitemap_document_url_cross_origin/,
  );

  const badRedirect = harness({
    pageResults: new Map([[
      `${DIAMOND_SHELF_CANONICAL_ORIGIN}/a`,
      [{ kind: "redirect", redirectTarget: "https://example.com/a", redirectCount: 1 }],
    ]]),
  });
  await assert.rejects(
    runFullSiteCrawlBridge(fullInput("origin-003"), badRedirect.options),
    /crawl_bridge_redirect_target_rejected:cross_origin/,
  );
});

test("stored checkpoint is fail-closed when rebuilt inventory/execution lineage changes", async () => {
  const firstHarness = harness();
  const first = await runFullSiteCrawlBridge(fullInput("resume-source"), firstHarness.options);
  const stale = first.checkpoint;

  const changedDocuments = [{
    url: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/sitemap.xml`,
    xml: urlset([{ path: "/a" }, { path: "/new" }]),
  }];
  const secondHarness = harness({ documents: changedDocuments });

  await assert.rejects(
    runFullSiteCrawlBridge(fullInput("resume-target", { resumeCheckpoint: stale }), secondHarness.options),
    /crawl_checkpoint_lineage_mismatch/,
  );
  assert.equal(secondHarness.calls.pages.length, 0);
});

test("repeat crawl produces P2.5 comparison and the same bridge executes the derived P2.6 incremental handoff", async () => {
  const state = harness();
  state.documents[0]!.xml = urlset([{ path: "/a", lastmod: "2026-09-01" }]);

  const first = await runFullSiteCrawlBridge(fullInput("repeat-001"), state.options);
  assert.equal(first.comparisonToPrevious, null);

  state.documents[0]!.xml = urlset([
    { path: "/a", lastmod: "2026-09-10" },
    { path: "/b", lastmod: "2026-09-11" },
  ]);
  const second = await runFullSiteCrawlBridge(fullInput("repeat-002"), state.options);
  assert.ok(second.comparisonToPrevious);
  assert.equal(second.comparisonToPrevious!.summary.inventoryMembershipChanged, true);
  assert.equal(second.comparisonToPrevious!.summary.sitemapLastmodChanged, true);

  const before = { inventory: first.inventory, certification: first.certification };
  const after = { inventory: second.inventory, certification: second.certification };
  const comparison = compareFullSiteCrawlHistory({ before, after });
  const incrementalPlan = buildIncrementalRecrawlPlan({
    comparison,
    before,
    after,
    policy: { maxPlanUrls: 10, batchSize: 2 },
  });
  assert.equal(incrementalPlan.accounting.selectedUrls, 2);

  const receipt = await runIncrementalCrawlBridge({
    runId: "incremental-001",
    observedAt: OBSERVED_AT,
    plan: incrementalPlan,
    currentExecutionPlan: second.executionPlan,
  }, state.options);

  assert.equal(receipt.selectedUrls, 2);
  assert.equal(receipt.summary.fetchedSuccessful, 2);
  assert.equal(receipt.summary.failures, 0);
  assert.equal(receipt.persistence.rawResponseBodyPersisted, false);
  assert.equal(state.persistence.incremental.length, 1);
});

test("incremental bridge preserves P2 retry limits and robots exclusions", async () => {
  const state = harness();
  state.documents[0]!.xml = urlset([{ path: "/a", lastmod: "2026-09-01" }]);
  const first = await runFullSiteCrawlBridge(fullInput("inc-base-001"), state.options);

  state.documents[0]!.xml = urlset([
    { path: "/a", lastmod: "2026-09-10" },
    { path: "/b", lastmod: "2026-09-11" },
  ]);
  const second = await runFullSiteCrawlBridge(fullInput("inc-base-002"), state.options);
  const before = { inventory: first.inventory, certification: first.certification };
  const after = { inventory: second.inventory, certification: second.certification };
  const comparison = compareFullSiteCrawlHistory({ before, after });
  const plan = buildIncrementalRecrawlPlan({
    comparison,
    before,
    after,
    policy: { maxPlanUrls: 10, batchSize: 2 },
  });

  const retryUrl = `${DIAMOND_SHELF_CANONICAL_ORIGIN}/a`;
  const robotsUrl = `${DIAMOND_SHELF_CANONICAL_ORIGIN}/b`;
  state.options.robotsEvaluator = {
    async evaluate(request) {
      return { allowed: request.canonicalUrl !== robotsUrl };
    },
  };
  let incrementalRetryAttempts = 0;
  state.options.pageTransport = {
    async get(request) {
      if (request.canonicalUrl !== retryUrl) return { kind: "success" };
      incrementalRetryAttempts += 1;
      return incrementalRetryAttempts < 3
        ? { kind: "failure", signal: { kind: "http_status", httpStatus: 503 } }
        : { kind: "success" };
    },
  };

  const receipt = await runIncrementalCrawlBridge({
    runId: "incremental-retry-001",
    observedAt: OBSERVED_AT,
    plan,
    currentExecutionPlan: second.executionPlan,
  }, state.options);

  const retryReceipt = receipt.urlReceipts.find((item) => item.canonicalUrl === retryUrl)!;
  const robotsReceipt = receipt.urlReceipts.find((item) => item.canonicalUrl === robotsUrl)!;
  assert.equal(retryReceipt.attempts, 3);
  assert.equal(retryReceipt.outcome.kind, "success");
  assert.equal(robotsReceipt.attempts, 1);
  assert.equal(robotsReceipt.outcome.kind, "robots_excluded");
  assert.equal(receipt.summary.robotsExcluded, 1);
});

test("source contract contains no direct network/database/timer/scheduler implementation", () => {
  const source = readFileSync(
    new URL("./first-party-crawl-runtime-bridge.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /from\s+["']node:(?:http|https|net|tls)["']/);
  assert.doesNotMatch(source, /from\s+["'](?:postgres|drizzle-orm)["']/);
  assert.doesNotMatch(source, /\bglobalThis\.fetch\b|\bfetch\s*\(/);
  assert.doesNotMatch(source, /\bsetInterval\s*\(|\bsetTimeout\s*\(/);
  assert.match(source, /directNetworkClientBundled:\s*false/);
  assert.match(source, /directDatabaseClientBundled:\s*false/);
  assert.match(source, /schedulerEnabled:\s*false/);
  assert.match(source, /autonomousWorkerEnabled:\s*false/);
  assert.match(source, /providerWrites:\s*false/);
  assert.match(source, /publicSiteWrites:\s*false/);
});
