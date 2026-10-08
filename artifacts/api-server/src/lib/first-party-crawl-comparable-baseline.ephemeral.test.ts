import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import postgres from "postgres";
import {
  DIAMOND_SHELF_CANONICAL_ORIGIN,
  P12_2_CRAWL_BRIDGE_VERSION,
  runFullSiteCrawlBridge,
  runFullSiteCrawlBridgeAccountingAware,
  type FirstPartyCrawlBridgeOptions,
} from "./first-party-crawl-runtime-bridge.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";
import { FirstPartyCrawlPersistence } from "./first-party-crawl-persistence.js";

function databaseUrl(): string | null {
  const raw = process.env.P12_2_L10_23_EPHEMERAL_DATABASE_URL?.trim();
  if (!raw) return null;
  const parsed = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error("p12_2_l10_23_ephemeral_database_must_be_localhost");
  }
  if (parsed.pathname.replace(/^\//, "") !== "seo_engine_p12_2_prod_lineage_test") {
    throw new Error("p12_2_l10_23_ephemeral_database_name_invalid");
  }
  return raw;
}

function hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function input(
  runId: string,
  observedAt: string,
  compareToPrevious = false,
) {
  return {
    runId,
    observedAt,
    compareToPrevious,
    binding: {
      siteId: DIAMOND_SHELF_SITE_ID,
      canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
      rootSitemapUrl: DIAMOND_SHELF_CANONICAL_ORIGIN + "/sitemap.xml",
    },
    hardPageLimit: 10,
    absolutePageCeiling: 25_000,
    sitemapPolicy: {
      maxDocuments: 5, maxDepth: 2, maxDocumentBytes: 100_000,
      maxInventoryUrls: 10, maxPathSegments: 20,
    },
    executionPolicy: {
      batchSize: 10, concurrency: 1, requestsPerMinute: 120,
      requestTimeoutMs: 5_000, maxRedirectsPerRequest: 3, maxAttemptsPerUrl: 1,
      retryBaseDelayMs: 10, retryMaxDelayMs: 20, maxUrlLength: 2_048,
      maxPathSegments: 20, maxRepeatedPathSegmentRun: 3,
    },
  } as const;
}

function options(
  persistence: FirstPartyCrawlPersistence,
  paths: string[],
  statuses: Record<string, number>,
): FirstPartyCrawlBridgeOptions {
  const xml = "<urlset>" + paths.map((path) =>
    "<url><loc>" + DIAMOND_SHELF_CANONICAL_ORIGIN + path + "</loc></url>"
  ).join("") + "</urlset>";
  return {
    sitemapAcquirer: { async load(request) { return [{ url: request.rootSitemapUrl, xml }]; } },
    robotsEvaluator: { async evaluate() { return { allowed: true }; } },
    pageTransport: {
      async get(request) {
        const path = new URL(request.canonicalUrl).pathname;
        const status = statuses[path];
        if (status !== undefined) {
          return { kind: "failure", signal: { kind: "http_status", httpStatus: status } };
        }
        return { kind: "success" };
      },
    },
    clock: { async sleep() {} },
    persistence,
    networkReady: true, liveExecutionAuthorized: true,
    persistenceReady: true, persistenceAuthorized: true,
  };
}

async function seedCompleted(url: string, observedAt: string) {
  const persistence = new FirstPartyCrawlPersistence({ databaseUrl: url });
  const runId = "p12-2-l10-23-completed-" + randomUUID();
  const snapshot = await runFullSiteCrawlBridge(
    input(runId, observedAt),
    options(persistence, ["/ok-" + randomUUID()], {}),
  );
  assert.equal(snapshot.certification.certification.wholeSiteCertified, true);
  return { persistence, runId, snapshot };
}

async function seedExpectedAbsenceAccounting(url: string, observedAt: string) {
  const persistence = new FirstPartyCrawlPersistence({ databaseUrl: url });
  const runId = "p12-2-l10-23-expected-" + randomUUID();
  const missingPath = "/missing-" + randomUUID();
  const result = await runFullSiteCrawlBridgeAccountingAware(
    input(runId, observedAt),
    options(persistence, [missingPath], { [missingPath]: 404 }),
  );
  assert.equal("status" in result ? result.status : "", "accounting_complete_uncertified");
  const executionPlanFingerprint = "executionPlanFingerprint" in result
    ? result.executionPlanFingerprint
    : result.executionPlan.fingerprint;
  const accounting = await persistence.loadLatestAccounting({
    version: P12_2_CRAWL_BRIDGE_VERSION, runId, siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN, executionPlanFingerprint,
  });
  assert.ok(accounting);
  const events = await persistence.loadUnresolvedTerminalFailures({
    version: P12_2_CRAWL_BRIDGE_VERSION, runId, siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN, executionPlanFingerprint,
  });
  assert.equal(events.length, 1);
  return { persistence, runId, observedAt, executionPlanFingerprint, accounting, event: events[0]! };
}

async function insertDispositionAndReconciliation(
  sql: ReturnType<typeof postgres>,
  seeded: Awaited<ReturnType<typeof seedExpectedAbsenceAccounting>>,
  tamperPayload = false,
) {
  const event = seeded.event;
  assert.equal(event.outcome.kind, "failure");
  assert.equal(
    event.outcome.kind === "failure" && event.outcome.signal.kind === "http_status"
      ? event.outcome.signal.httpStatus
      : 0,
    404,
  );
  const dispositionFingerprint = hex("l10-23-disposition:" + event.fingerprint);
  const verifierDeploymentId = randomUUID();
  const verifierImage = "ghcr.io/intssere/seo-engine-l10-23-test@sha256:" + hex("image");
  const dispositionPayload = {
    version: "p12-2-l10-23-test-disposition-v1",
    runId: seeded.runId,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    executionPlanFingerprint: seeded.executionPlanFingerprint,
    sourceEventFingerprint: event.fingerprint,
    canonicalUrl: event.canonicalUrl,
    historicalAbsenceHttpStatus: 404,
    currentAbsenceHttpStatus: 404,
    freshInventoryFingerprint: seeded.accounting.inventory.fingerprint,
    presentInFreshInventory: true,
    sourceSitemaps: [DIAMOND_SHELF_CANONICAL_ORIGIN + "/sitemap.xml"],
    dispositionType: "sitemap_orphan_absence",
    verifierImage, verifierDeploymentId, observedAt: seeded.observedAt,
    fingerprint: dispositionFingerprint,
  };
  await sql`
    INSERT INTO first_party_crawl_terminal_failure_dispositions (
      disposition_id, site_id, run_id, canonical_origin, execution_plan_fingerprint,
      source_event_fingerprint, canonical_url, disposition_type, absence_http_status,
      fresh_inventory_fingerprint, present_in_fresh_inventory, verifier_image,
      verifier_deployment_id, observed_at, disposition_fingerprint, disposition_payload
    ) VALUES (
      ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid, ${seeded.runId},
      ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${seeded.executionPlanFingerprint},
      ${event.fingerprint}, ${event.canonicalUrl}, 'sitemap_orphan_absence', 404,
      ${seeded.accounting.inventory.fingerprint}, true, ${verifierImage},
      ${verifierDeploymentId}::uuid, ${seeded.observedAt}::timestamptz,
      ${dispositionFingerprint}, ${sql.json(dispositionPayload)}
    )
  `;

  const receiptFingerprint = hex("l10-23-reconciliation:" + event.fingerprint);
  const receiptPayload = {
    version: "p12-2-l10-23-test-reconciliation-v1",
    runId: seeded.runId,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    executionPlanFingerprint: seeded.executionPlanFingerprint,
    sourceAccountingSnapshotFingerprint: tamperPayload
      ? hex("wrong-accounting")
      : seeded.accounting.fingerprint,
    sourceCheckpointFingerprint: seeded.accounting.checkpoint.fingerprint,
    sourceCheckpointRevision: seeded.accounting.checkpoint.sequence,
    sourceEventFingerprint: event.fingerprint,
    dispositionFingerprint,
    rawTerminalFailureCount: 1,
    expectedAbsenceCount: 1,
    effectiveUnresolvedTerminalFailureCount: 0,
    status: "certified_with_expected_absence",
    legacyWholeSiteCertified: false,
    completedRunPersisted: false,
    recoveryReceiptPersisted: false,
    observedAt: seeded.observedAt,
    fingerprint: receiptFingerprint,
  };
  await sql`
    INSERT INTO first_party_crawl_terminal_failure_reconciliation_receipts (
      reconciliation_receipt_id, site_id, run_id, canonical_origin,
      execution_plan_fingerprint, source_accounting_snapshot_fingerprint,
      disposition_fingerprint, raw_terminal_failure_count,
      expected_absence_count, effective_unresolved_terminal_failure_count,
      status, observed_at, receipt_fingerprint, receipt_payload
    ) VALUES (
      ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid, ${seeded.runId},
      ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${seeded.executionPlanFingerprint},
      ${seeded.accounting.fingerprint}, ${dispositionFingerprint}, 1, 1, 0,
      'certified_with_expected_absence', ${seeded.observedAt}::timestamptz,
      ${receiptFingerprint}, ${sql.json(receiptPayload)}
    )
  `;
}

test("L10.23/L10.25 selects durable comparable baselines, drives runtime history, and fails closed on tampering", async (t) => {
  const url = databaseUrl();
  if (!url) {
    t.skip("P12_2_L10_23_EPHEMERAL_DATABASE_URL is not configured");
    return;
  }
  const sql = postgres(url, { max: 1, prepare: false });
  t.after(async () => { await sql.end({ timeout: 1 }).catch(() => undefined); });

  const rawOlder = await seedCompleted(url, "2026-10-08T11:00:00.000Z");
  const effectiveNewer = await seedExpectedAbsenceAccounting(url, "2026-10-08T12:00:00.000Z");
  await insertDispositionAndReconciliation(sql, effectiveNewer);

  const selectedEffective = await effectiveNewer.persistence.loadLatestComparableHistoryBaseline({
    version: P12_2_CRAWL_BRIDGE_VERSION,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
  });
  assert.ok(selectedEffective);
  assert.equal(selectedEffective.mode, "expected_absence_effective");
  assert.equal(selectedEffective.snapshot.runId, effectiveNewer.runId);
  assert.equal(selectedEffective.comparableSource.certificationView.comparableCertified, true);
  assert.equal(selectedEffective.comparableSource.certificationView.rawWholeSiteCertified, false);
  assert.ok(selectedEffective.reconciliationReceiptFingerprint);

  const rawNewest = await seedCompleted(url, "2026-10-08T13:00:00.000Z");
  const selectedRaw = await rawNewest.persistence.loadLatestComparableHistoryBaseline({
    version: P12_2_CRAWL_BRIDGE_VERSION,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
  });
  assert.ok(selectedRaw);
  assert.equal(selectedRaw.mode, "raw_completed");
  assert.equal(selectedRaw.snapshot.runId, rawNewest.runId);
  assert.equal(selectedRaw.reconciliationReceiptFingerprint, null);

  const tamperedNewest = await seedExpectedAbsenceAccounting(url, "2026-10-08T14:00:00.000Z");
  await insertDispositionAndReconciliation(sql, tamperedNewest, true);
  await assert.rejects(
    tamperedNewest.persistence.loadLatestComparableHistoryBaseline({
      version: P12_2_CRAWL_BRIDGE_VERSION,
      siteId: DIAMOND_SHELF_SITE_ID,
      canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    }),
    /p12_2_comparable_baseline_reconciliation_row_payload_mismatch/,
  );

  assert.equal(rawOlder.snapshot.certification.certification.wholeSiteCertified, true);
});
