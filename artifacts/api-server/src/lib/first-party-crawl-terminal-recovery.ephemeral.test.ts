import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {
  DIAMOND_SHELF_CANONICAL_ORIGIN,
  runFullSiteCrawlBridgeAccountingAware,
  runTerminalFailureRecoveryBridge,
  type FirstPartyCrawlBridgeOptions,
  type PageTransportResult,
} from "./first-party-crawl-runtime-bridge.js";
import {
  FirstPartyCrawlPersistence,
  P12_2_L10_13B_TABLE_COUNT,
} from "./first-party-crawl-persistence.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";

const RUN_ID = "p12-2-l10-13b-ephemeral-recovery";
const INITIAL_OBSERVED_AT = "2026-10-06T08:00:00.000Z";
const RECOVERY_OBSERVED_AT = "2026-10-06T08:05:00.000Z";
const FAILED_URL = `${DIAMOND_SHELF_CANONICAL_ORIGIN}/l10-13b-ephemeral-failure`;

function dedicatedEphemeralUrl(): string | null {
  const raw = process.env.P12_2_L10_13B_EPHEMERAL_DATABASE_URL?.trim();
  if (!raw) return null;
  const parsed = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error("p12_2_l10_13b_ephemeral_database_must_be_localhost");
  }
  if (parsed.pathname.replace(/^\//, "") !== "seo_engine_p12_2_prod_lineage_test") {
    throw new Error("p12_2_l10_13b_ephemeral_database_name_invalid");
  }
  return raw;
}

function options(
  databaseUrl: string,
  pageResults: Map<string, PageTransportResult[]>,
): FirstPartyCrawlBridgeOptions {
  return {
    sitemapAcquirer: {
      async load() {
        return [{
          url: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/sitemap.xml`,
          xml: `<urlset><url><loc>${FAILED_URL}</loc></url></urlset>`,
        }];
      },
    },
    robotsEvaluator: {
      async evaluate() {
        return { allowed: true };
      },
    },
    pageTransport: {
      async get(request) {
        const queue = pageResults.get(request.canonicalUrl);
        if (queue?.length) return queue.shift()!;
        return { kind: "success" };
      },
    },
    clock: {
      async sleep() {},
    },
    persistence: new FirstPartyCrawlPersistence({ databaseUrl }),
    networkReady: true,
    liveExecutionAuthorized: true,
    persistenceReady: true,
    persistenceAuthorized: true,
  };
}

function runInput() {
  return {
    runId: RUN_ID,
    observedAt: INITIAL_OBSERVED_AT,
    binding: {
      siteId: DIAMOND_SHELF_SITE_ID,
      canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
      rootSitemapUrl: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/sitemap.xml`,
    },
    hardPageLimit: 10,
    absolutePageCeiling: 25_000,
    sitemapPolicy: {
      maxDocuments: 10,
      maxDepth: 3,
      maxDocumentBytes: 1_000_000,
      maxInventoryUrls: 10,
      maxPathSegments: 20,
    },
    executionPolicy: {
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
    },
    compareToPrevious: false,
  } as const;
}

test("P12.2-L10.13B durable failure evidence and recovery promote only after exact URL resolves", async (t) => {
  const databaseUrl = dedicatedEphemeralUrl();
  if (!databaseUrl) {
    t.skip("P12_2_L10_13B_EPHEMERAL_DATABASE_URL is not configured");
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
    WHERE table_schema='public' AND table_type='BASE TABLE'
  `;
  assert.equal(Number(counts[0]?.count ?? 0), P12_2_L10_13B_TABLE_COUNT);

  const prior = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM first_party_crawl_checkpoints
    WHERE site_id=${DIAMOND_SHELF_SITE_ID}::uuid AND run_id=${RUN_ID}
  `;
  assert.equal(Number(prior[0]?.count ?? 0), 0);

  const pageResults = new Map<string, PageTransportResult[]>([
    [FAILED_URL, [{ kind: "failure", signal: { kind: "http_status", httpStatus: 404 } }]],
  ]);
  const bridgeOptions = options(databaseUrl, pageResults);

  const accounting = await runFullSiteCrawlBridgeAccountingAware(runInput(), bridgeOptions);
  assert.equal("status" in accounting ? accounting.status : null, "accounting_complete_uncertified");
  if (!("status" in accounting) || accounting.status !== "accounting_complete_uncertified") {
    throw new Error("expected accounting_complete_uncertified");
  }
  assert.equal(accounting.terminalFailures, 1);

  const durableBefore = await sql<{
    event_count: number;
    accounting_count: number;
    completed_count: number;
  }[]>`
    SELECT
      (SELECT COUNT(*)::int FROM first_party_crawl_terminal_failure_events
        WHERE site_id=${DIAMOND_SHELF_SITE_ID}::uuid AND run_id=${RUN_ID}) AS event_count,
      (SELECT COUNT(*)::int FROM first_party_crawl_accounting_snapshots
        WHERE site_id=${DIAMOND_SHELF_SITE_ID}::uuid AND run_id=${RUN_ID}) AS accounting_count,
      (SELECT COUNT(*)::int FROM first_party_crawl_completed_runs
        WHERE site_id=${DIAMOND_SHELF_SITE_ID}::uuid AND run_id=${RUN_ID}) AS completed_count
  `;
  assert.deepEqual(durableBefore[0], {
    event_count: 1,
    accounting_count: 1,
    completed_count: 0,
  });

  const source = await sql<{
    canonical_url: string;
    event_type: string;
    event_fingerprint: string;
    source_event_fingerprint: string | null;
  }[]>`
    SELECT canonical_url, event_type, event_fingerprint, source_event_fingerprint
    FROM first_party_crawl_terminal_failure_events
    WHERE site_id=${DIAMOND_SHELF_SITE_ID}::uuid AND run_id=${RUN_ID}
  `;
  assert.equal(source.length, 1);
  assert.equal(source[0]?.canonical_url, FAILED_URL);
  assert.equal(source[0]?.event_type, "terminal_failure");
  assert.equal(source[0]?.source_event_fingerprint, null);

  const persistence = new FirstPartyCrawlPersistence({ databaseUrl });
  const accountingSnapshot = await persistence.loadLatestAccounting({
    version: "p12-2-first-party-crawl-bridge-v1",
    runId: RUN_ID,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    executionPlanFingerprint: (await persistence.loadCheckpoint({
      version: "p12-2-first-party-crawl-bridge-v1",
      runId: RUN_ID,
      siteId: DIAMOND_SHELF_SITE_ID,
      canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
      executionPlanFingerprint: (
        await sql<{ execution_plan_fingerprint: string }[]>`
          SELECT execution_plan_fingerprint
          FROM first_party_crawl_checkpoints
          WHERE site_id=${DIAMOND_SHELF_SITE_ID}::uuid AND run_id=${RUN_ID}
        `
      )[0]!.execution_plan_fingerprint,
    }))!.planFingerprint,
  });
  assert.ok(accountingSnapshot);

  pageResults.set(FAILED_URL, [{ kind: "success" }]);
  const recovery = await runTerminalFailureRecoveryBridge(
    {
      runId: RUN_ID,
      observedAt: RECOVERY_OBSERVED_AT,
      siteId: DIAMOND_SHELF_SITE_ID,
      canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
      executionPlanFingerprint: accountingSnapshot!.executionPlan.fingerprint,
    },
    bridgeOptions,
  );
  assert.equal(recovery.recoveryReceipt.status, "resolved");
  assert.equal(recovery.completedRunPersisted, true);
  assert.equal(recovery.accountingSnapshot.certification.certification.wholeSiteCertified, true);

  const durableAfter = await sql<{
    event_count: number;
    accounting_count: number;
    recovery_count: number;
    completed_count: number;
    unresolved_count: number;
  }[]>`
    SELECT
      (SELECT COUNT(*)::int FROM first_party_crawl_terminal_failure_events
        WHERE site_id=${DIAMOND_SHELF_SITE_ID}::uuid AND run_id=${RUN_ID}) AS event_count,
      (SELECT COUNT(*)::int FROM first_party_crawl_accounting_snapshots
        WHERE site_id=${DIAMOND_SHELF_SITE_ID}::uuid AND run_id=${RUN_ID}) AS accounting_count,
      (SELECT COUNT(*)::int FROM first_party_crawl_terminal_failure_recovery_receipts
        WHERE site_id=${DIAMOND_SHELF_SITE_ID}::uuid AND run_id=${RUN_ID}) AS recovery_count,
      (SELECT COUNT(*)::int FROM first_party_crawl_completed_runs
        WHERE site_id=${DIAMOND_SHELF_SITE_ID}::uuid AND run_id=${RUN_ID}) AS completed_count,
      (
        SELECT COUNT(*)::int
        FROM first_party_crawl_terminal_failure_events parent
        WHERE parent.site_id=${DIAMOND_SHELF_SITE_ID}::uuid
          AND parent.run_id=${RUN_ID}
          AND parent.event_type IN ('terminal_failure','recovery_failure')
          AND NOT EXISTS (
            SELECT 1 FROM first_party_crawl_terminal_failure_events child
            WHERE child.source_event_fingerprint=parent.event_fingerprint
          )
      ) AS unresolved_count
  `;
  assert.deepEqual(durableAfter[0], {
    event_count: 2,
    accounting_count: 2,
    recovery_count: 1,
    completed_count: 1,
    unresolved_count: 0,
  });

  const finalCheckpoint = await sql<{
    checkpoint_revision: number;
    terminal_failures: number;
    checkpoint_status: string;
  }[]>`
    SELECT
      checkpoint_revision::int,
      (checkpoint_payload->'counters'->>'terminalFailures')::int AS terminal_failures,
      checkpoint_payload->>'status' AS checkpoint_status
    FROM first_party_crawl_checkpoints
    WHERE site_id=${DIAMOND_SHELF_SITE_ID}::uuid AND run_id=${RUN_ID}
  `;
  assert.equal(finalCheckpoint[0]?.checkpoint_status, "completed");
  assert.equal(finalCheckpoint[0]?.terminal_failures, 0);
  assert.ok(Number(finalCheckpoint[0]?.checkpoint_revision ?? 0) >= 2);
});
