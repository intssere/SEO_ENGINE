import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import postgres from "postgres";
import {
  DIAMOND_SHELF_CANONICAL_ORIGIN,
  P12_2_CRAWL_BRIDGE_VERSION,
  runFullSiteCrawlBridgeAccountingAware,
  type FirstPartyCrawlBridgeOptions,
} from "./first-party-crawl-runtime-bridge.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";
import { FirstPartyCrawlPersistence } from "./first-party-crawl-persistence.js";

function databaseUrl(): string | null {
  const raw = process.env.P12_2_L10_21_EPHEMERAL_DATABASE_URL?.trim();
  if (!raw) return null;
  const parsed = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) throw new Error("p12_2_l10_21_ephemeral_database_must_be_localhost");
  if (parsed.pathname.replace(/^\//, "") !== "seo_engine_p12_2_prod_lineage_test") throw new Error("p12_2_l10_21_ephemeral_database_name_invalid");
  return raw;
}

function hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function input(runId: string, observedAt: string) {
  return {
    runId, observedAt, compareToPrevious: false,
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
  const xml = "<urlset>" + paths.map((path) => "<url><loc>" + DIAMOND_SHELF_CANONICAL_ORIGIN + path + "</loc></url>").join("") + "</urlset>";
  return {
    sitemapAcquirer: { async load(request) { return [{ url: request.rootSitemapUrl, xml }]; } },
    robotsEvaluator: { async evaluate() { return { allowed: true }; } },
    pageTransport: {
      async get(request) {
        const path = new URL(request.canonicalUrl).pathname;
        const status = statuses[path];
        if (status !== undefined) return { kind: "failure", signal: { kind: "http_status", httpStatus: status } };
        return { kind: "success" };
      },
    },
    clock: { async sleep() {} },
    persistence,
    networkReady: true, liveExecutionAuthorized: true,
    persistenceReady: true, persistenceAuthorized: true,
  };
}

async function seedAccounting(
  url: string,
  paths: string[],
  statuses: Record<string, number>,
) {
  const persistence = new FirstPartyCrawlPersistence({ databaseUrl: url });
  const runId = "p12-2-l10-21-" + randomUUID();
  const observedAt = "2026-10-08T10:30:00.000Z";
  const result = await runFullSiteCrawlBridgeAccountingAware(
    input(runId, observedAt),
    options(persistence, paths, statuses),
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
  return { persistence, runId, observedAt, executionPlanFingerprint, accounting, events };
}

async function insertDisposition(
  sql: ReturnType<typeof postgres>,
  seeded: Awaited<ReturnType<typeof seedAccounting>>,
  eventIndex: number,
  payloadCanonicalUrl?: string,
) {
  const event = seeded.events[eventIndex];
  assert.ok(event);
  assert.equal(event.outcome.kind, "failure");
  const status = event.outcome.kind === "failure" && event.outcome.signal.kind === "http_status"
    ? event.outcome.signal.httpStatus : 0;
  assert.ok(status === 404 || status === 410);
  const dispositionFingerprint = hex("l10-21-disposition:" + event.fingerprint);
  const verifierDeploymentId = randomUUID();
  const verifierImage = "ghcr.io/intssere/seo-engine-l10-21-test@sha256:" + hex("image");
  const payload = {
    version: "p12-2-l10-21-test-disposition-v1",
    runId: seeded.runId,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    executionPlanFingerprint: seeded.executionPlanFingerprint,
    sourceEventFingerprint: event.fingerprint,
    canonicalUrl: payloadCanonicalUrl ?? event.canonicalUrl,
    historicalAbsenceHttpStatus: status,
    currentAbsenceHttpStatus: status,
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
      ${event.fingerprint}, ${event.canonicalUrl}, 'sitemap_orphan_absence', ${status},
      ${seeded.accounting.inventory.fingerprint}, true, ${verifierImage},
      ${verifierDeploymentId}::uuid, ${seeded.observedAt}::timestamptz,
      ${dispositionFingerprint}, ${sql.json(payload)}
    )
  `;
}

test("L10.21 loads durable disposition evidence and certifies one expected absence", async (t) => {
  const url = databaseUrl();
  if (!url) { t.skip("P12_2_L10_21_EPHEMERAL_DATABASE_URL is not configured"); return; }
  const sql = postgres(url, { max: 1, prepare: false });
  t.after(async () => { await sql.end({ timeout: 1 }).catch(() => undefined); });
  const seeded = await seedAccounting(url, ["/ok", "/missing"], { "/missing": 404 });
  assert.equal(seeded.events.length, 1);
  await insertDisposition(sql, seeded, 0);
  const effective = await seeded.persistence.loadExpectedAbsenceEffectiveCertification({
    version: P12_2_CRAWL_BRIDGE_VERSION, runId: seeded.runId, siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN, executionPlanFingerprint: seeded.executionPlanFingerprint,
  });
  assert.ok(effective);
  assert.equal(effective.certification.status, "certified_with_expected_absence");
  assert.equal(effective.certification.effectiveWholeSiteCertified, true);
  assert.equal(effective.certification.legacyWholeSiteCertified, false);
  assert.deepEqual(effective.accounting, {
    rawTerminalFailureCount: 1, expectedAbsenceCount: 1, effectiveUnresolvedTerminalFailureCount: 0,
  });
  assert.equal(seeded.accounting.certification.certification.wholeSiteCertified, false);
});

test("L10.21 leaves partial disposition blocked", async (t) => {
  const url = databaseUrl();
  if (!url) { t.skip("P12_2_L10_21_EPHEMERAL_DATABASE_URL is not configured"); return; }
  const sql = postgres(url, { max: 1, prepare: false });
  t.after(async () => { await sql.end({ timeout: 1 }).catch(() => undefined); });
  const seeded = await seedAccounting(url, ["/missing-a", "/missing-b"], { "/missing-a": 404, "/missing-b": 410 });
  assert.equal(seeded.events.length, 2);
  await insertDisposition(sql, seeded, 0);
  const effective = await seeded.persistence.loadExpectedAbsenceEffectiveCertification({
    version: P12_2_CRAWL_BRIDGE_VERSION, runId: seeded.runId, siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN, executionPlanFingerprint: seeded.executionPlanFingerprint,
  });
  assert.ok(effective);
  assert.equal(effective.certification.status, "blocked");
  assert.deepEqual(effective.certification.blockers, ["terminal_failures_present"]);
  assert.equal(effective.accounting.effectiveUnresolvedTerminalFailureCount, 1);
});

test("L10.21 fails closed on disposition row/payload drift", async (t) => {
  const url = databaseUrl();
  if (!url) { t.skip("P12_2_L10_21_EPHEMERAL_DATABASE_URL is not configured"); return; }
  const sql = postgres(url, { max: 1, prepare: false });
  t.after(async () => { await sql.end({ timeout: 1 }).catch(() => undefined); });
  const seeded = await seedAccounting(url, ["/missing"], { "/missing": 404 });
  await insertDisposition(sql, seeded, 0, DIAMOND_SHELF_CANONICAL_ORIGIN + "/different");
  await assert.rejects(
    seeded.persistence.loadExpectedAbsenceCertificationEvidence({
      version: P12_2_CRAWL_BRIDGE_VERSION, runId: seeded.runId, siteId: DIAMOND_SHELF_SITE_ID,
      canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN, executionPlanFingerprint: seeded.executionPlanFingerprint,
    }),
    /p12_2_expected_absence_disposition_row_payload_mismatch/,
  );
});
