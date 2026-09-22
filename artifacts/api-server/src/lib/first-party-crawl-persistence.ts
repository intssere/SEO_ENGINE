import { randomUUID } from "node:crypto";
import postgres from "postgres";
import {
  DIAMOND_SHELF_CANONICAL_ORIGIN,
  P12_2_CRAWL_BRIDGE_VERSION,
  assertFullSiteCrawlBridgeSnapshotIntegrity,
  assertIncrementalCrawlBridgeReceiptIntegrity,
  type CrawlCheckpointPersistenceRecord,
  type FirstPartyCrawlPersistence as FirstPartyCrawlPersistenceContract,
  type FullSiteCrawlBridgeSnapshot,
  type IncrementalCrawlBridgeReceipt,
} from "./first-party-crawl-runtime-bridge.js";
import {
  assertFullSiteCrawlCheckpointFingerprintIntegrity,
  type FullSiteCrawlCheckpoint,
} from "./full-site-crawl-control.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";

export const P12_2_CRAWL_PERSISTENCE_VERSION = "p12-2-crawl-persistence-v1" as const;
export const P12_2_TABLE_COUNT = 37;

type Sql = ReturnType<typeof postgres>;

const HEX_64 = /^[0-9a-f]{64}$/;
const FORBIDDEN_CONTENT_KEYS = new Set([
  "rawresponsebody",
  "rawsitemapxml",
  "rawpage",
  "pagecontent",
  "content",
  "contenttext",
  "html",
  "xml",
  "responsebody",
  "bodytext",
]);

const EXPECTED_COLUMNS: Record<string, readonly string[]> = Object.freeze({
  first_party_crawl_checkpoints: Object.freeze([
    "checkpoint_id",
    "site_id",
    "run_id",
    "canonical_origin",
    "execution_plan_fingerprint",
    "checkpoint_fingerprint",
    "checkpoint_revision",
    "observed_at",
    "checkpoint_payload",
  ]),
  first_party_crawl_completed_runs: Object.freeze([
    "completed_run_id",
    "site_id",
    "run_id",
    "canonical_origin",
    "execution_plan_fingerprint",
    "snapshot_fingerprint",
    "observed_at",
    "snapshot_payload",
  ]),
  first_party_crawl_incremental_receipts: Object.freeze([
    "receipt_id",
    "site_id",
    "run_id",
    "canonical_origin",
    "incremental_plan_fingerprint",
    "execution_plan_fingerprint",
    "observed_at",
    "receipt_payload",
  ]),
});

function stableSerialize(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableSerialize).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort()
    .map((key) => JSON.stringify(key) + ":" + stableSerialize(object[key]))
    .join(",") + "}";
}

function requireRunId(value: string): string {
  const normalized = value.normalize("NFKC").trim();
  if (!normalized || normalized.length > 128 || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error("p12_2_persistence_run_id_invalid");
  }
  return normalized;
}

function requireHex(value: string, code: string): string {
  if (!HEX_64.test(value)) throw new Error(code);
  return value;
}

function requireObservedAt(value: string): string {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error("p12_2_persistence_observed_at_invalid");
  }
  return value;
}

function requireBinding(siteId: string, canonicalOrigin: string): void {
  if (siteId !== DIAMOND_SHELF_SITE_ID) throw new Error("p12_2_persistence_site_id_mismatch");
  if (canonicalOrigin !== DIAMOND_SHELF_CANONICAL_ORIGIN) {
    throw new Error("p12_2_persistence_origin_mismatch");
  }
}

export function assertFirstPartyCrawlUrlPolicy(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("p12_2_persistence_url_invalid");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.origin !== DIAMOND_SHELF_CANONICAL_ORIGIN ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("p12_2_persistence_url_policy_rejected");
  }
  return parsed.toString();
}

function isPersistedStatusKey(key: string): boolean {
  return key.toLowerCase().endsWith("persisted");
}

function validatePotentialUrl(key: string, value: unknown): void {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (normalized === "canonicalorigin") {
    if (value !== DIAMOND_SHELF_CANONICAL_ORIGIN) {
      throw new Error("p12_2_persistence_origin_mismatch");
    }
    return;
  }

  const singleUrl = new Set([
    "url",
    "canonicalurl",
    "rootsitemapurl",
    "redirecttarget",
    "sourcesitemap",
  ]);
  const urlArray = new Set([
    "urls",
    "canonicalurls",
    "sourcesitemaps",
    "missingsupplied",
  ]);

  if (singleUrl.has(normalized) && typeof value === "string") {
    assertFirstPartyCrawlUrlPolicy(value);
  } else if (urlArray.has(normalized) && Array.isArray(value)) {
    for (const item of value) {
      if (typeof item !== "string") throw new Error("p12_2_persistence_url_array_invalid");
      assertFirstPartyCrawlUrlPolicy(item);
    }
  }
}

export function assertNoForbiddenContent(value: unknown): void {
  const seen = new Set<object>();
  const visit = (node: unknown, key = ""): void => {
    if (node === null || typeof node !== "object") {
      validatePotentialUrl(key, node);
      return;
    }
    if (seen.has(node as object)) throw new Error("p12_2_persistence_cyclic_payload");
    seen.add(node as object);
    if (Array.isArray(node)) {
      validatePotentialUrl(key, node);
      for (const item of node) visit(item);
      seen.delete(node as object);
      return;
    }
    for (const [childKey, child] of Object.entries(node as Record<string, unknown>)) {
      const normalized = childKey.replace(/[^a-z0-9]/gi, "").toLowerCase();
      if (FORBIDDEN_CONTENT_KEYS.has(normalized) && !isPersistedStatusKey(childKey)) {
        throw new Error("p12_2_persistence_forbidden_content_key");
      }
      validatePotentialUrl(childKey, child);
      visit(child, childKey);
    }
    seen.delete(node as object);
  };
  visit(value);
}

function assertCheckpointRecord(record: CrawlCheckpointPersistenceRecord): void {
  if (record.version !== P12_2_CRAWL_BRIDGE_VERSION) throw new Error("p12_2_persistence_version_mismatch");
  requireRunId(record.runId);
  requireObservedAt(record.observedAt);
  requireBinding(record.siteId, record.canonicalOrigin);
  requireHex(record.executionPlanFingerprint, "p12_2_persistence_execution_fingerprint_invalid");
  if (record.rawResponseBodyPersisted !== false || record.rawSitemapXmlPersisted !== false) {
    throw new Error("p12_2_persistence_raw_content_forbidden");
  }
  if (
    record.checkpoint.siteId !== record.siteId ||
    record.checkpoint.canonicalOrigin !== record.canonicalOrigin ||
    record.checkpoint.planFingerprint !== record.executionPlanFingerprint
  ) throw new Error("p12_2_persistence_checkpoint_lineage_invalid");
  assertFullSiteCrawlCheckpointFingerprintIntegrity(record.checkpoint);
  assertNoForbiddenContent(record);
}

export type FirstPartyCrawlPersistenceOptions = {
  databaseUrl?: string | null;
  sqlFactory?: ((databaseUrl: string) => Sql) | null;
};

export class FirstPartyCrawlPersistence implements FirstPartyCrawlPersistenceContract {
  readonly version = P12_2_CRAWL_PERSISTENCE_VERSION;
  private readonly databaseUrl: string;
  private readonly sqlFactory: (databaseUrl: string) => Sql;

  constructor(options: FirstPartyCrawlPersistenceOptions = {}) {
    this.databaseUrl = options.databaseUrl?.trim() ?? "";
    this.sqlFactory = options.sqlFactory ?? ((databaseUrl) => postgres(databaseUrl, {
      max: 1,
      prepare: false,
      connect_timeout: 8,
      idle_timeout: 2,
    }));
  }

  private async withSql<T>(operation: (sql: Sql) => Promise<T>): Promise<T> {
    if (!this.databaseUrl) throw new Error("p12_2_persistence_database_unconfigured");
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await this.assertSchemaAndIdentity(sql);
      return await operation(sql);
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  private async assertSchemaAndIdentity(sql: Sql): Promise<void> {
    const counts = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    if (Number(counts[0]?.count ?? 0) !== P12_2_TABLE_COUNT) {
      throw new Error("p12_2_persistence_schema_table_count_mismatch");
    }

    const columns = await sql<{ table_name: string; column_name: string }[]>`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN (
          'first_party_crawl_checkpoints',
          'first_party_crawl_completed_runs',
          'first_party_crawl_incremental_receipts'
        )
      ORDER BY table_name, ordinal_position
    `;
    for (const [table, expected] of Object.entries(EXPECTED_COLUMNS)) {
      const actual = columns.filter((row) => row.table_name === table).map((row) => row.column_name);
      if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) {
        throw new Error("p12_2_persistence_schema_mismatch");
      }
    }

    const identity = await sql<{ id: string }[]>`
      SELECT id::text AS id
      FROM sites
      WHERE id = ${DIAMOND_SHELF_SITE_ID}::uuid
        AND lower(domain) = 'diamondshelf.us'
        AND canonical_origin = ${DIAMOND_SHELF_CANONICAL_ORIGIN}
        AND is_active = true
      LIMIT 1
    `;
    if (identity[0]?.id !== DIAMOND_SHELF_SITE_ID) {
      throw new Error("p12_2_persistence_site_identity_mismatch");
    }
  }

  async loadCheckpoint(input: {
    version: typeof P12_2_CRAWL_BRIDGE_VERSION;
    runId: string;
    siteId: string;
    canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
    executionPlanFingerprint: string;
  }): Promise<FullSiteCrawlCheckpoint | null> {
    if (input.version !== P12_2_CRAWL_BRIDGE_VERSION) throw new Error("p12_2_persistence_version_mismatch");
    const runId = requireRunId(input.runId);
    requireBinding(input.siteId, input.canonicalOrigin);
    requireHex(input.executionPlanFingerprint, "p12_2_persistence_execution_fingerprint_invalid");

    return this.withSql(async (sql) => {
      const rows = await sql<{
        checkpoint_fingerprint: string;
        checkpoint_payload: FullSiteCrawlCheckpoint;
      }[]>`
        SELECT checkpoint_fingerprint, checkpoint_payload
        FROM first_party_crawl_checkpoints
        WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
          AND run_id = ${runId}
          AND canonical_origin = ${DIAMOND_SHELF_CANONICAL_ORIGIN}
          AND execution_plan_fingerprint = ${input.executionPlanFingerprint}
        LIMIT 1
      `;
      const row = rows[0];
      if (!row) return null;
      if (row.checkpoint_payload.fingerprint !== row.checkpoint_fingerprint) {
        throw new Error("p12_2_persistence_checkpoint_storage_mismatch");
      }
      assertFullSiteCrawlCheckpointFingerprintIntegrity(row.checkpoint_payload);
      assertNoForbiddenContent(row.checkpoint_payload);
      return row.checkpoint_payload;
    });
  }

  async saveCheckpoint(record: CrawlCheckpointPersistenceRecord): Promise<void> {
    assertCheckpointRecord(record);
    const runId = requireRunId(record.runId);

    await this.withSql(async (sql) => {
      await sql.begin(async (tx) => {
        await tx`
          SELECT pg_advisory_xact_lock(
            hashtext('p12_2_checkpoint:' || ${DIAMOND_SHELF_SITE_ID}),
            hashtext(${runId})
          )
        `;
        const existing = await tx<{
          checkpoint_revision: number;
          checkpoint_fingerprint: string;
          checkpoint_payload: FullSiteCrawlCheckpoint;
        }[]>`
          SELECT checkpoint_revision, checkpoint_fingerprint, checkpoint_payload
          FROM first_party_crawl_checkpoints
          WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
            AND run_id = ${runId}
            AND execution_plan_fingerprint = ${record.executionPlanFingerprint}
          FOR UPDATE
        `;
        const current = existing[0];
        if (!current) {
          await tx`
            INSERT INTO first_party_crawl_checkpoints (
              checkpoint_id, site_id, run_id, canonical_origin,
              execution_plan_fingerprint, checkpoint_fingerprint,
              checkpoint_revision, observed_at, checkpoint_payload
            ) VALUES (
              ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid, ${runId},
              ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${record.executionPlanFingerprint},
              ${record.checkpoint.fingerprint}, ${record.checkpoint.sequence}::bigint,
              ${record.observedAt}::timestamptz, ${tx.json(record.checkpoint)}
            )
          `;
          return;
        }

        const exactReplay =
          Number(current.checkpoint_revision) === record.checkpoint.sequence &&
          current.checkpoint_fingerprint === record.checkpoint.fingerprint &&
          stableSerialize(current.checkpoint_payload) === stableSerialize(record.checkpoint);
        if (exactReplay) return;
        if (record.checkpoint.sequence <= Number(current.checkpoint_revision)) {
          throw new Error("p12_2_persistence_checkpoint_stale_or_conflicting");
        }

        await tx`
          UPDATE first_party_crawl_checkpoints
          SET checkpoint_fingerprint = ${record.checkpoint.fingerprint},
              checkpoint_revision = ${record.checkpoint.sequence}::bigint,
              observed_at = ${record.observedAt}::timestamptz,
              checkpoint_payload = ${tx.json(record.checkpoint)}
          WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
            AND run_id = ${runId}
            AND execution_plan_fingerprint = ${record.executionPlanFingerprint}
        `;
      });
    });
  }

  async loadLatestCompleted(input: {
    version: typeof P12_2_CRAWL_BRIDGE_VERSION;
    siteId: string;
    canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  }): Promise<FullSiteCrawlBridgeSnapshot | null> {
    if (input.version !== P12_2_CRAWL_BRIDGE_VERSION) throw new Error("p12_2_persistence_version_mismatch");
    requireBinding(input.siteId, input.canonicalOrigin);

    return this.withSql(async (sql) => {
      const rows = await sql<{
        snapshot_fingerprint: string;
        snapshot_payload: FullSiteCrawlBridgeSnapshot;
      }[]>`
        SELECT snapshot_fingerprint, snapshot_payload
        FROM first_party_crawl_completed_runs
        WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
          AND canonical_origin = ${DIAMOND_SHELF_CANONICAL_ORIGIN}
        ORDER BY observed_at DESC, completed_run_id DESC
        LIMIT 1
      `;
      const row = rows[0];
      if (!row) return null;
      if (row.snapshot_payload.fingerprint !== row.snapshot_fingerprint) {
        throw new Error("p12_2_persistence_snapshot_storage_mismatch");
      }
      assertFullSiteCrawlBridgeSnapshotIntegrity(row.snapshot_payload);
      assertNoForbiddenContent(row.snapshot_payload);
      return row.snapshot_payload;
    });
  }

  async saveCompletedRun(snapshot: FullSiteCrawlBridgeSnapshot): Promise<void> {
    requireRunId(snapshot.runId);
    requireObservedAt(snapshot.observedAt);
    requireBinding(snapshot.siteId, snapshot.canonicalOrigin);
    assertFullSiteCrawlBridgeSnapshotIntegrity(snapshot);
    if (!snapshot.certification.certification.wholeSiteCertified) {
      throw new Error("p12_2_persistence_completed_run_not_certified");
    }
    assertNoForbiddenContent(snapshot);

    await this.withSql(async (sql) => {
      await sql.begin(async (tx) => {
        await tx`
          SELECT pg_advisory_xact_lock(
            hashtext('p12_2_completed:' || ${DIAMOND_SHELF_SITE_ID}),
            hashtext(${snapshot.runId})
          )
        `;
        const existing = await tx<{
          snapshot_fingerprint: string;
          snapshot_payload: FullSiteCrawlBridgeSnapshot;
        }[]>`
          SELECT snapshot_fingerprint, snapshot_payload
          FROM first_party_crawl_completed_runs
          WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
            AND run_id = ${snapshot.runId}
          FOR UPDATE
        `;
        if (existing[0]) {
          if (
            existing[0].snapshot_fingerprint === snapshot.fingerprint &&
            stableSerialize(existing[0].snapshot_payload) === stableSerialize(snapshot)
          ) return;
          throw new Error("p12_2_persistence_completed_run_conflicting_replay");
        }

        await tx`
          INSERT INTO first_party_crawl_completed_runs (
            completed_run_id, site_id, run_id, canonical_origin,
            execution_plan_fingerprint, snapshot_fingerprint,
            observed_at, snapshot_payload
          ) VALUES (
            ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid, ${snapshot.runId},
            ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${snapshot.executionPlan.fingerprint},
            ${snapshot.fingerprint}, ${snapshot.observedAt}::timestamptz,
            ${tx.json(snapshot)}
          )
        `;
      });
    });
  }

  async saveIncrementalRun(receipt: IncrementalCrawlBridgeReceipt): Promise<void> {
    requireRunId(receipt.runId);
    requireObservedAt(receipt.observedAt);
    requireBinding(receipt.siteId, receipt.canonicalOrigin);
    assertIncrementalCrawlBridgeReceiptIntegrity(receipt);
    assertNoForbiddenContent(receipt);

    await this.withSql(async (sql) => {
      await sql.begin(async (tx) => {
        await tx`
          SELECT pg_advisory_xact_lock(
            hashtext('p12_2_incremental:' || ${DIAMOND_SHELF_SITE_ID}),
            hashtext(${receipt.runId} || ':' || ${receipt.incrementalPlanFingerprint})
          )
        `;
        const existing = await tx<{
          receipt_payload: IncrementalCrawlBridgeReceipt;
        }[]>`
          SELECT receipt_payload
          FROM first_party_crawl_incremental_receipts
          WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
            AND run_id = ${receipt.runId}
            AND incremental_plan_fingerprint = ${receipt.incrementalPlanFingerprint}
          FOR UPDATE
        `;
        if (existing[0]) {
          if (stableSerialize(existing[0].receipt_payload) === stableSerialize(receipt)) return;
          throw new Error("p12_2_persistence_incremental_conflicting_replay");
        }

        await tx`
          INSERT INTO first_party_crawl_incremental_receipts (
            receipt_id, site_id, run_id, canonical_origin,
            incremental_plan_fingerprint, execution_plan_fingerprint,
            observed_at, receipt_payload
          ) VALUES (
            ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid, ${receipt.runId},
            ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${receipt.incrementalPlanFingerprint},
            ${receipt.executionPlanFingerprint}, ${receipt.observedAt}::timestamptz,
            ${tx.json(receipt)}
          )
        `;
      });
    });
  }
}

export function firstPartyCrawlPersistenceCapability() {
  return Object.freeze({
    version: P12_2_CRAWL_PERSISTENCE_VERSION,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    expectedPublicTableCount: P12_2_TABLE_COUNT,
    lazyDatabaseConnection: true,
    checkpointRevisioned: true,
    completedRunCertifiedOnly: true,
    incrementalReceiptsIdempotent: true,
    rawResponseBodyPersistence: false,
    rawSitemapXmlPersistence: false,
    pageContentPersistence: false,
    persistenceReady: false,
    persistenceAuthorized: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
  });
}
