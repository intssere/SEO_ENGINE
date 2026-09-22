import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {
  DIAMOND_SHELF_CANONICAL_ORIGIN,
  P12_2_CRAWL_BRIDGE_VERSION,
  runFullSiteCrawlBridge,
  runIncrementalCrawlBridge,
  type CrawlCheckpointPersistenceRecord,
  type FirstPartyCrawlBridgeOptions,
} from "./first-party-crawl-runtime-bridge.js";
import { createInitialCrawlCheckpoint } from "./full-site-crawl-control.js";
import { buildIncrementalRecrawlPlan } from "./incremental-recrawl-planner.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";
import { FirstPartyCrawlPersistence, P12_2_TABLE_COUNT } from "./first-party-crawl-persistence.js";

function dedicatedEphemeralUrl(): string | null {
  const raw = process.env.P12_2_EPHEMERAL_DATABASE_URL?.trim();
  if (!raw) return null;
  const parsed = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error("p12_2_ephemeral_database_must_be_localhost");
  }
  if (parsed.pathname.replace(/^\//, "") !== "seo_engine_test") {
    throw new Error("p12_2_ephemeral_database_name_invalid");
  }
  return raw;
}

function sitemapXml(entries: Array<{ path: string; lastmod?: string }>): string {
  return "<urlset>" + entries.map((entry) =>
    "<url><loc>" + DIAMOND_SHELF_CANONICAL_ORIGIN + entry.path + "</loc>" +
    (entry.lastmod ? "<lastmod>" + entry.lastmod + "</lastmod>" : "") +
    "</url>"
  ).join("") + "</urlset>";
}

function bridgeOptions(
  persistence: FirstPartyCrawlPersistence,
  xml: string,
  noindex = false,
): FirstPartyCrawlBridgeOptions {
  return {
    sitemapAcquirer: {
      async load(request) {
        return [{ url: request.rootSitemapUrl, xml }];
      },
    },
    robotsEvaluator: {
      async evaluate() {
        return { allowed: true };
      },
    },
    pageTransport: {
      async get() {
        return noindex ? { kind: "success", noindex: true } : { kind: "success" };
      },
    },
    clock: {
      async sleep() {},
    },
    persistence,
    networkReady: true,
    liveExecutionAuthorized: true,
    persistenceReady: true,
    persistenceAuthorized: true,
  };
}

function fullInput(runId: string, observedAt: string) {
  return {
    runId,
    observedAt,
    binding: {
      siteId: DIAMOND_SHELF_SITE_ID,
      canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
      rootSitemapUrl: DIAMOND_SHELF_CANONICAL_ORIGIN + "/sitemap.xml",
    },
    hardPageLimit: 5,
    absolutePageCeiling: 25_000,
    sitemapPolicy: {
      maxDocuments: 5,
      maxDepth: 2,
      maxDocumentBytes: 100_000,
      maxInventoryUrls: 5,
      maxPathSegments: 20,
    },
    executionPolicy: {
      batchSize: 5,
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
    },
  } as const;
}

test("P12.2 PostgreSQL persistence is revision-safe and replay-idempotent on dedicated ephemeral DB only", async (t) => {
  const databaseUrl = dedicatedEphemeralUrl();
  if (!databaseUrl) {
    t.skip("P12_2_EPHEMERAL_DATABASE_URL is not configured");
    return;
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 8,
    idle_timeout: 2,
  });
  t.after(async () => {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  });

  const counts = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  assert.equal(Number(counts[0]?.count ?? 0), P12_2_TABLE_COUNT);

  await sql`DELETE FROM first_party_crawl_incremental_receipts`;
  await sql`DELETE FROM first_party_crawl_completed_runs`;
  await sql`DELETE FROM first_party_crawl_checkpoints`;

  const siteRows = await sql<{ id: string }[]>`
    SELECT id::text AS id
    FROM sites
    WHERE lower(domain) = 'diamondshelf.us'
    ORDER BY created_at
    LIMIT 1
  `;
  const currentSiteId = siteRows[0]?.id;
  assert.ok(currentSiteId, "ephemeral baseline must contain Diamond Shelf site");
  if (currentSiteId !== DIAMOND_SHELF_SITE_ID) {
    await sql`
      UPDATE sites
      SET id = ${DIAMOND_SHELF_SITE_ID}::uuid
      WHERE id = ${currentSiteId}::uuid
    `;
  }

  const persistence = new FirstPartyCrawlPersistence({ databaseUrl });

  const first = await runFullSiteCrawlBridge(
    { ...fullInput("p12-2-full-001", "2026-09-22T00:00:00.000Z"), compareToPrevious: false },
    bridgeOptions(persistence, sitemapXml([{ path: "/a", lastmod: "2026-09-01" }])),
  );
  assert.equal(first.certification.certification.wholeSiteCertified, true);

  await persistence.saveCompletedRun(first);
  const completedAfterReplay = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM first_party_crawl_completed_runs
  `;
  assert.equal(completedAfterReplay[0]?.count, 1);

  const loadedFirst = await persistence.loadCheckpoint({
    version: P12_2_CRAWL_BRIDGE_VERSION,
    runId: first.runId,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    executionPlanFingerprint: first.executionPlan.fingerprint,
  });
  assert.equal(loadedFirst?.fingerprint, first.checkpoint.fingerprint);

  const second = await runFullSiteCrawlBridge(
    fullInput("p12-2-full-002", "2026-09-22T01:00:00.000Z"),
    bridgeOptions(persistence, sitemapXml([
      { path: "/a", lastmod: "2026-09-10" },
      { path: "/b", lastmod: "2026-09-11" },
    ])),
  );
  assert.ok(second.comparisonToPrevious);
  assert.equal(second.certification.certification.wholeSiteCertified, true);

  const staleCheckpoint = createInitialCrawlCheckpoint(second.executionPlan);
  const staleRecord: CrawlCheckpointPersistenceRecord = {
    version: P12_2_CRAWL_BRIDGE_VERSION,
    runId: second.runId,
    observedAt: second.observedAt,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    executionPlanFingerprint: second.executionPlan.fingerprint,
    checkpoint: staleCheckpoint,
    rawResponseBodyPersisted: false,
    rawSitemapXmlPersisted: false,
  };
  await assert.rejects(
    persistence.saveCheckpoint(staleRecord),
    /p12_2_persistence_checkpoint_stale_or_conflicting/,
  );

  await assert.rejects(
    runFullSiteCrawlBridge(
      { ...fullInput(first.runId, "2026-09-22T02:00:00.000Z"), compareToPrevious: false },
      bridgeOptions(persistence, sitemapXml([{ path: "/a", lastmod: "2026-09-01" }])),
    ),
    /p12_2_persistence_completed_run_conflicting_replay/,
  );

  const comparison = second.comparisonToPrevious!;
  const plan = buildIncrementalRecrawlPlan({
    comparison,
    before: { inventory: first.inventory, certification: first.certification },
    after: { inventory: second.inventory, certification: second.certification },
    policy: { maxPlanUrls: 5, batchSize: 2 },
  });
  assert.ok(plan.accounting.selectedUrls > 0);

  const incremental = await runIncrementalCrawlBridge({
    runId: "p12-2-incremental-001",
    observedAt: "2026-09-22T03:00:00.000Z",
    plan,
    currentExecutionPlan: second.executionPlan,
  }, bridgeOptions(persistence, sitemapXml([])));
  await persistence.saveIncrementalRun(incremental);

  const incrementalCount = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM first_party_crawl_incremental_receipts
  `;
  assert.equal(incrementalCount[0]?.count, 1);

  await assert.rejects(
    runIncrementalCrawlBridge({
      runId: incremental.runId,
      observedAt: incremental.observedAt,
      plan,
      currentExecutionPlan: second.executionPlan,
    }, bridgeOptions(persistence, sitemapXml([]), true)),
    /p12_2_persistence_incremental_conflicting_replay/,
  );

  const latest = await persistence.loadLatestCompleted({
    version: P12_2_CRAWL_BRIDGE_VERSION,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
  });
  assert.equal(latest?.runId, second.runId);
});
