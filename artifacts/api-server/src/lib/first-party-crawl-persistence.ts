import postgres from "postgres";
import {
  DIAMOND_SHELF_CANONICAL_ORIGIN,
  P12_2_CRAWL_BRIDGE_VERSION,
  assertFullSiteCrawlBridgeSnapshotIntegrity,
  assertIncrementalCrawlBridgeReceiptIntegrity,
  type CrawlCheckpointPersistenceRecord,
  type FirstPartyCrawlPersistence,
  type FullSiteCrawlBridgeSnapshot,
  type IncrementalCrawlBridgeReceipt,
} from "./first-party-crawl-runtime-bridge.js";
import type { FullSiteCrawlCheckpoint } from "./full-site-crawl-control.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";

export const P12_2_CRAWL_PERSISTENCE_VERSION = "p12-2-crawl-persistence-v1" as const;

type Sql = ReturnType<typeof postgres>;

const HEX_64 = /^[0-9a-f]{64}$/;
const FORBIDDEN_CONTENT_KEYS = new Set([
  "rawresponsebody",
  "responsebody",
  "rawsitemapxml",
  "sitemapxml",
  "pagecontent",
  "contenttext",
  "html",
  "xml",
  "bodytext",
  "rawbody",
  "documentxml",
]);

const EXPECTED_SCHEMA: Record<string, readonly string[]> = Object.freeze({
  first_party_crawl_checkpoint_revisions: Object.freeze([
    "site_id",
    "run_id",
    "bridge_version",
    "canonical_origin",
    "observed_at",
    "execution_plan_fingerprint",
    "checkpoint_sequence",
    "checkpoint_fingerprint",
    "checkpoint_status",
    "checkpoint_payload",
  ]),
  first_party_crawl_completed_runs: Object.freeze([
    "site_id",
    "run_id",
    "bridge_version",
    "canonical_origin",
    "observed_at",
    "execution_plan_fingerprint",
    "inventory_fingerprint",
    "checkpoint_fingerprint",
    "certification_fingerprint",
    "snapshot_fingerprint",
    "whole_site_certified",
    "snapshot_payload",
  ]),
  first_party_crawl_incremental_receipts: Object.freeze([
    "site_id",
    "run_id",
    "bridge_version",
    "canonical_origin",
    "observed_at",
    "incremental_plan_fingerprint",
    "execution_plan_fingerprint",
    "receipt_fingerprint",
    "selected_urls",
    "receipt_payload",
  ]),
});

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

export function assertNoForbiddenCrawlContent(value: unknown): void {
  const seen = new Set<object>();
  const visit = (node: unknown): void => {
    if (node === null || typeof node !== "object") return;
    if (seen.has(node as object)) throw new Error("p12_2_persistence_cyclic_payload");
    seen.add(node as object);
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      seen.delete(node);
      return;
    }
    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
      if (FORBIDDEN_CONTENT_KEYS.has(normalized)) {
        throw new Error("p12_2_persistence_forbidden_content_key");
      }
      visit(child);
    }
    seen.delete(node);
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
  const checkpoint = record.checkpoint;
  if (
    checkpoint.siteId !== record.siteId ||
    checkpoint.canonicalOrigin !== record.canonicalOrigin ||
    checkpoint.planFingerprint !== record.executionPlanFingerprint ||
    !Number.isInteger(checkpoint.sequence) ||
    checkpoint.sequence < 0
  ) throw new Error("p12_2_persistence_checkpoint_lineage_invalid");
  requireHex(checkpoint.fingerprint, "p12_2_persistence_checkpoint_fingerprint_invalid");
  assertNoForbiddenCrawlContent(record);
}

export type PostgresFirstPartyCrawlPersistenceOptions = {
  databaseUrl?: string | null;
  sqlFactory?: ((databaseUrl: string) => Sql) | null;
};

export class PostgresFirstPartyCrawlPersistence implements FirstPartyCrawlPersistence {
  readonly version = P12_2_CRAWL_PERSISTENCE_VERSION;
  private readonly databaseUrl: string;
  private readonly sqlFactory: (databaseUrl: string) => Sql;

  constructor(options: PostgresFirstPartyCrawlPersistenceOptions = {}) {
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
    const columns = await sql<{ table_name: string; column_name: string }[]>`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN (
          'first_party_crawl_checkpoint_revisions',
          'first_party_crawl_completed_runs',
          'first_party_crawl_incremental_receipts'
        )
      ORDER BY table_name, ordinal_position
    `;
    for (const [table, expected] of Object.entries(EXPECTED_SCHEMA)) {
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
      const rows = await sql<{ checkpoint_payload: FullSiteCrawlCheckpoint; checkpoint_fingerprint: string }[]>`
        SELECT checkpoint_payload, checkpoint_fingerprint
        FROM first_party_crawl_checkpoint_revisions
        WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
          AND run_id = ${runId}
          AND canonical_origin = ${DIAMOND_SHELF_CANONICAL_ORIGIN}
          AND execution_plan_fingerprint = ${input.executionPlanFingerprint}
        ORDER BY checkpoint_sequence DESC
        LIMIT 1
      `;
      const row = rows[0];
      if (!row) return null;
      if (row.checkpoint_payload.fingerprint !== row.checkpoint_fingerprint) {
        throw new Error("p12_2_persistence_checkpoint_storage_mismatch");
      }
      assertNoForbiddenCrawlContent(row.checkpoint_payload);
      return row.checkpoint_payload;
    });
  }

  async saveCheckpoint(record: CrawlCheckpointPersistenceRecord): Promise<void> {
    assertCheckpointRecord(record);
    const runId = requireRunId(record.runId);
    await this.withSql(async (sql) => {
      await sql.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(hashtext('p12_2_checkpoint'), hashtext(${runId}))`;
        const latest = await tx<{
          checkpoint_sequence: number;
          checkpoint_fingerprint: string;
          execution_plan_fingerprint: string;
        }[]>`
          SELECT checkpoint_sequence, checkpoint_fingerprint, execution_plan_fingerprint
          FROM first_party_crawl_checkpoint_revisions
          WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid AND run_id = ${runId}
          ORDER BY checkpoint_sequence DESC
          LIMIT 1
          FOR UPDATE
        `;
        const current = latest[0];
        if (!current) {
          if (record.checkpoint.sequence !== 0) throw new Error("p12_2_persistence_checkpoint_initial_sequence_invalid");
        } else {
          if (current.execution_plan_fingerprint !== record.executionPlanFingerprint) {
            throw new Error("p12_2_persistence_checkpoint_plan_conflict");
          }
          if (record.checkpoint.sequence === current.checkpoint_sequence) {
            if (record.checkpoint.fingerprint === current.checkpoint_fingerprint) return;
            throw new Error("p12_2_persistence_checkpoint_conflicting_replay");
          }
          if (record.checkpoint.sequence !== current.checkpoint_sequence + 1) {
            throw new Error("p12_2_persistence_checkpoint_stale_or_out_of_order");
          }
        }
        await tx`
          INSERT INTO first_party_crawl_checkpoint_revisions (
            site_id, run_id, bridge_version, canonical_origin, observed_at,
            execution_plan_fingerprint, checkpoint_sequence, checkpoint_fingerprint,
            checkpoint_status, checkpoint_payload
          ) VALUES (
            ${DIAMOND_SHELF_SITE_ID}::uuid, ${runId}, ${record.version},
            ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${record.observedAt}::timestamptz,
            ${record.executionPlanFingerprint}, ${record.checkpoint.sequence},
            ${record.checkpoint.fingerprint}, ${record.checkpoint.status},
            ${tx.json(record.checkpoint)}
          )
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
      const rows = await sql<{ snapshot_payload: FullSiteCrawlBridgeSnapshot; snapshot_fingerprint: string }[]>`
        SELECT snapshot_payload, snapshot_fingerprint
        FROM first_party_crawl_completed_runs
        WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
          AND canonical_origin = ${DIAMOND_SHELF_CANONICAL_ORIGIN}
          AND whole_site_certified = true
        ORDER BY observed_at DESC, run_id DESC
        LIMIT 1
      `;
      const row = rows[0];
      if (!row) return null;
      if (row.snapshot_payload.fingerprint !== row.snapshot_fingerprint) {
        throw new Error("p12_2_persistence_snapshot_storage_mismatch");
      }
      assertNoForbiddenCrawlContent(row.snapshot_payload);
      assertFullSiteCrawlBridgeSnapshotIntegrity(row.snapshot_payload);
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
    assertNoForbiddenCrawlContent(snapshot);
    await this.withSql(async (sql) => {
      await sql.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(hashtext('p12_2_completed'), hashtext(${snapshot.runId}))`;
        const existing = await tx<{ snapshot_fingerprint: string }[]>`
          SELECT snapshot_fingerprint
          FROM first_party_crawl_completed_runs
          WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid AND run_id = ${snapshot.runId}
          FOR UPDATE
        `;
        if (existing[0]) {
          if (existing[0].snapshot_fingerprint === snapshot.fingerprint) return;
          throw new Error("p12_2_persistence_completed_run_conflicting_replay");
        }
        await tx`
          INSERT INTO first_party_crawl_completed_runs (
            site_id, run_id, bridge_version, canonical_origin, observed_at,
            execution_plan_fingerprint, inventory_fingerprint, checkpoint_fingerprint,
            certification_fingerprint, snapshot_fingerprint, whole_site_certified,
            snapshot_payload
          ) VALUES (
            ${DIAMOND_SHELF_SITE_ID}::uuid, ${snapshot.runId}, ${snapshot.version},
            ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${snapshot.observedAt}::timestamptz,
            ${snapshot.executionPlan.fingerprint}, ${snapshot.inventory.fingerprint},
            ${snapshot.checkpoint.fingerprint}, ${snapshot.certification.fingerprint},
            ${snapshot.fingerprint}, true, ${tx.json(snapshot)}
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
    assertNoForbiddenCrawlContent(receipt);
    await this.withSql(async (sql) => {
      await sql.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(hashtext('p12_2_incremental'), hashtext(${receipt.runId}))`;
        const existing = await tx<{ receipt_fingerprint: string }[]>`
          SELECT receipt_fingerprint
          FROM first_party_crawl_incremental_receipts
          WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid AND run_id = ${receipt.runId}
          FOR UPDATE
        `;
        if (existing[0]) {
          if (existing[0].receipt_fingerprint === receipt.fingerprint) return;
          throw new Error("p12_2_persistence_incremental_conflicting_replay");
        }
        await tx`
          INSERT INTO first_party_crawl_incremental_receipts (
            site_id, run_id, bridge_version, canonical_origin, observed_at,
            incremental_plan_fingerprint, execution_plan_fingerprint,
            receipt_fingerprint, selected_urls, receipt_payload
          ) VALUES (
            ${DIAMOND_SHELF_SITE_ID}::uuid, ${receipt.runId}, ${receipt.version},
            ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${receipt.observedAt}::timestamptz,
            ${receipt.incrementalPlanFingerprint}, ${receipt.executionPlanFingerprint},
            ${receipt.fingerprint}, ${receipt.selectedUrls}, ${tx.json(receipt)}
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
    schemaRequired: true,
    lazyDatabaseConnection: true,
    checkpointRevisioned: true,
    checkpointOptimisticConflictDetection: true,
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
