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
  type TerminalFailureRecoveryPersistenceTransition,
} from "./first-party-crawl-runtime-bridge.js";
import {
  assertFullSiteCrawlCheckpointFingerprintIntegrity,
  type FullSiteCrawlCheckpoint,
} from "./full-site-crawl-control.js";
import {
  assertTerminalFailureEventIntegrity,
  assertTerminalFailureRecoveryReceiptIntegrity,
  type TerminalFailureEvent,
  type TerminalFailureRecoveryReceipt,
} from "./first-party-crawl-terminal-recovery.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";

export const P12_2_CRAWL_PERSISTENCE_VERSION = "p12-2-crawl-persistence-v1" as const;
export const P12_2_TABLE_COUNT = 37;
export const P12_2_L2_DURABLE_TABLE_COUNT = 38;
export const P12_2_L10_13B_TABLE_COUNT = 41;
export const P12_2_L10_13B_ENGINEERING_TABLE_COUNT = 47;
export const P12_2_RECOGNIZED_TABLE_COUNTS = Object.freeze([
  37, // P12.2 execution-state baseline
  38, // + durable L2 receipts OR P8.8 W04
  39, // P8.8 W04 + durable L2 receipts
  P12_2_L10_13B_TABLE_COUNT, // 41: Production recovery lineage OR P8.8 W05
  42, // P8.8 W05 + durable L2 receipts
  43, // P8.8 W07
  44, // P8.8 W07 + durable L2 receipts
  P12_2_L10_13B_ENGINEERING_TABLE_COUNT, // 47: engineering chain with P8.8 tables also present
] as const);

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

const L10_13B_EXPECTED_COLUMNS: Record<string, readonly string[]> = Object.freeze({
  first_party_crawl_terminal_failure_events: Object.freeze([
    "event_id",
    "site_id",
    "run_id",
    "canonical_origin",
    "execution_plan_fingerprint",
    "canonical_url",
    "event_type",
    "source_event_fingerprint",
    "checkpoint_fingerprint",
    "checkpoint_revision",
    "observed_at",
    "event_fingerprint",
    "event_payload",
  ]),
  first_party_crawl_accounting_snapshots: Object.freeze([
    "accounting_snapshot_id",
    "site_id",
    "run_id",
    "canonical_origin",
    "execution_plan_fingerprint",
    "checkpoint_fingerprint",
    "checkpoint_revision",
    "snapshot_fingerprint",
    "whole_site_certified",
    "terminal_failure_count",
    "observed_at",
    "snapshot_payload",
  ]),
  first_party_crawl_terminal_failure_recovery_receipts: Object.freeze([
    "recovery_receipt_id",
    "site_id",
    "run_id",
    "canonical_origin",
    "execution_plan_fingerprint",
    "source_checkpoint_fingerprint",
    "source_checkpoint_revision",
    "result_checkpoint_fingerprint",
    "result_checkpoint_revision",
    "recovery_plan_fingerprint",
    "receipt_fingerprint",
    "status",
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

function assertFirstPartyUrlPolicy(value: string, queryAllowed: boolean): string {
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
    (!queryAllowed && parsed.search) ||
    parsed.hash
  ) {
    throw new Error("p12_2_persistence_url_policy_rejected");
  }
  return parsed.toString();
}

export function assertFirstPartyCrawlUrlPolicy(value: string): string {
  return assertFirstPartyUrlPolicy(value, false);
}

export function assertFirstPartySitemapProvenanceUrlPolicy(value: string): string {
  return assertFirstPartyUrlPolicy(value, true);
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
  ]);
  const urlArray = new Set([
    "urls",
    "canonicalurls",
  ]);
  const sitemapProvenanceSingleUrl = new Set([
    "sourcesitemap",
  ]);
  const sitemapProvenanceUrlArray = new Set([
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
  } else if (sitemapProvenanceSingleUrl.has(normalized) && typeof value === "string") {
    assertFirstPartySitemapProvenanceUrlPolicy(value);
  } else if (sitemapProvenanceUrlArray.has(normalized) && Array.isArray(value)) {
    for (const item of value) {
      if (typeof item !== "string") throw new Error("p12_2_persistence_url_array_invalid");
      assertFirstPartySitemapProvenanceUrlPolicy(item);
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
  for (const event of record.terminalFailureEvents) {
    assertTerminalFailureEventIntegrity(event);
    if (
      event.runId !== record.runId ||
      event.siteId !== record.siteId ||
      event.canonicalOrigin !== record.canonicalOrigin ||
      event.executionPlanFingerprint !== record.executionPlanFingerprint ||
      event.checkpointFingerprint !== record.checkpoint.fingerprint ||
      event.checkpointRevision !== record.checkpoint.sequence
    ) throw new Error("p12_2_persistence_terminal_failure_event_lineage_invalid");
  }
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
    const tableCount = Number(counts[0]?.count ?? 0);
    if (!P12_2_RECOGNIZED_TABLE_COUNTS.includes(tableCount as (typeof P12_2_RECOGNIZED_TABLE_COUNTS)[number])) {
      throw new Error("p12_2_persistence_schema_table_count_mismatch");
    }

    const columns = await sql<{ table_name: string; column_name: string }[]>`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN (
          'first_party_crawl_checkpoints',
          'first_party_crawl_completed_runs',
          'first_party_crawl_incremental_receipts',
          'first_party_crawl_terminal_failure_events',
          'first_party_crawl_accounting_snapshots',
          'first_party_crawl_terminal_failure_recovery_receipts'
        )
      ORDER BY table_name, ordinal_position
    `;
    const recoveryTablesPresent = Object.keys(L10_13B_EXPECTED_COLUMNS)
      .every((table) => columns.some((row) => row.table_name === table));
    const expectedTables = recoveryTablesPresent
      ? { ...EXPECTED_COLUMNS, ...L10_13B_EXPECTED_COLUMNS }
      : EXPECTED_COLUMNS;
    for (const [table, expected] of Object.entries(expectedTables)) {
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
        for (const event of record.terminalFailureEvents) {
          const replay = await tx<{
            event_fingerprint: string;
            event_payload: TerminalFailureEvent;
          }[]>`
            SELECT event_fingerprint, event_payload
            FROM first_party_crawl_terminal_failure_events
            WHERE event_fingerprint = ${event.fingerprint}
            FOR UPDATE
          `;
          if (replay[0]) {
            if (stableSerialize(replay[0].event_payload) !== stableSerialize(event)) {
              throw new Error("p12_2_persistence_terminal_failure_event_conflicting_replay");
            }
            continue;
          }

          if (event.sourceEventFingerprint) {
            const source = await tx<{
              event_fingerprint: string;
              canonical_url: string;
            }[]>`
              SELECT event_fingerprint, canonical_url
              FROM first_party_crawl_terminal_failure_events
              WHERE event_fingerprint = ${event.sourceEventFingerprint}
              FOR UPDATE
            `;
            if (!source[0] || source[0].canonical_url !== event.canonicalUrl) {
              throw new Error("p12_2_persistence_terminal_failure_source_missing");
            }
            const consumed = await tx<{ count: number }[]>`
              SELECT COUNT(*)::int AS count
              FROM first_party_crawl_terminal_failure_events
              WHERE source_event_fingerprint = ${event.sourceEventFingerprint}
            `;
            if (Number(consumed[0]?.count ?? 0) !== 0) {
              throw new Error("p12_2_persistence_terminal_failure_source_consumed");
            }
          }

          await tx`
            INSERT INTO first_party_crawl_terminal_failure_events (
              event_id, site_id, run_id, canonical_origin,
              execution_plan_fingerprint, canonical_url, event_type,
              source_event_fingerprint, checkpoint_fingerprint, checkpoint_revision,
              observed_at, event_fingerprint, event_payload
            ) VALUES (
              ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid, ${runId},
              ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${record.executionPlanFingerprint},
              ${event.canonicalUrl}, ${event.eventType}, ${event.sourceEventFingerprint},
              ${event.checkpointFingerprint}, ${event.checkpointRevision}::bigint,
              ${event.observedAt}::timestamptz, ${event.fingerprint}, ${tx.json(event)}
            )
          `;
        }

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

  async loadLatestAccounting(input: {
    version: typeof P12_2_CRAWL_BRIDGE_VERSION;
    runId: string;
    siteId: string;
    canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
    executionPlanFingerprint: string;
  }): Promise<FullSiteCrawlBridgeSnapshot | null> {
    if (input.version !== P12_2_CRAWL_BRIDGE_VERSION) throw new Error("p12_2_persistence_version_mismatch");
    const runId = requireRunId(input.runId);
    requireBinding(input.siteId, input.canonicalOrigin);
    requireHex(input.executionPlanFingerprint, "p12_2_persistence_execution_fingerprint_invalid");

    return this.withSql(async (sql) => {
      const rows = await sql<{
        snapshot_fingerprint: string;
        snapshot_payload: FullSiteCrawlBridgeSnapshot;
      }[]>`
        SELECT snapshot_fingerprint, snapshot_payload
        FROM first_party_crawl_accounting_snapshots
        WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
          AND run_id = ${runId}
          AND canonical_origin = ${DIAMOND_SHELF_CANONICAL_ORIGIN}
          AND execution_plan_fingerprint = ${input.executionPlanFingerprint}
          AND snapshot_payload->>'version' = ${P12_2_CRAWL_BRIDGE_VERSION}
        ORDER BY checkpoint_revision DESC, accounting_snapshot_id DESC
        LIMIT 1
      `;
      const row = rows[0];
      if (!row) return null;
      if (row.snapshot_payload.fingerprint !== row.snapshot_fingerprint) {
        throw new Error("p12_2_persistence_accounting_snapshot_storage_mismatch");
      }
      assertFullSiteCrawlBridgeSnapshotIntegrity(row.snapshot_payload);
      assertNoForbiddenContent(row.snapshot_payload);
      return row.snapshot_payload;
    });
  }

  async loadUnresolvedTerminalFailures(input: {
    version: typeof P12_2_CRAWL_BRIDGE_VERSION;
    runId: string;
    siteId: string;
    canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
    executionPlanFingerprint: string;
  }): Promise<TerminalFailureEvent[]> {
    if (input.version !== P12_2_CRAWL_BRIDGE_VERSION) throw new Error("p12_2_persistence_version_mismatch");
    const runId = requireRunId(input.runId);
    requireBinding(input.siteId, input.canonicalOrigin);
    requireHex(input.executionPlanFingerprint, "p12_2_persistence_execution_fingerprint_invalid");

    return this.withSql(async (sql) => {
      const rows = await sql<{ event_payload: TerminalFailureEvent }[]>`
        SELECT parent.event_payload
        FROM first_party_crawl_terminal_failure_events parent
        WHERE parent.site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
          AND parent.run_id = ${runId}
          AND parent.canonical_origin = ${DIAMOND_SHELF_CANONICAL_ORIGIN}
          AND parent.execution_plan_fingerprint = ${input.executionPlanFingerprint}
          AND parent.event_type IN ('terminal_failure', 'recovery_failure')
          AND NOT EXISTS (
            SELECT 1
            FROM first_party_crawl_terminal_failure_events child
            WHERE child.source_event_fingerprint = parent.event_fingerprint
          )
        ORDER BY parent.canonical_url, parent.observed_at, parent.event_id
      `;
      const events = rows.map((row) => row.event_payload);
      const urls = new Set<string>();
      for (const event of events) {
        assertTerminalFailureEventIntegrity(event);
        assertNoForbiddenContent(event);
        if (
          event.runId !== runId ||
          event.siteId !== DIAMOND_SHELF_SITE_ID ||
          event.canonicalOrigin !== DIAMOND_SHELF_CANONICAL_ORIGIN ||
          event.executionPlanFingerprint !== input.executionPlanFingerprint ||
          urls.has(event.canonicalUrl)
        ) throw new Error("p12_2_persistence_unresolved_terminal_failure_invalid");
        urls.add(event.canonicalUrl);
      }
      return events;
    });
  }

  async saveAccountingRun(snapshot: FullSiteCrawlBridgeSnapshot): Promise<void> {
    requireRunId(snapshot.runId);
    requireObservedAt(snapshot.observedAt);
    requireBinding(snapshot.siteId, snapshot.canonicalOrigin);
    assertFullSiteCrawlBridgeSnapshotIntegrity(snapshot);
    if (snapshot.checkpoint.status !== "completed") {
      throw new Error("p12_2_persistence_accounting_checkpoint_incomplete");
    }
    assertNoForbiddenContent(snapshot);

    await this.withSql(async (sql) => {
      await sql.begin(async (tx) => {
        await tx`
          SELECT pg_advisory_xact_lock(
            hashtext('p12_2_accounting:' || ${DIAMOND_SHELF_SITE_ID}),
            hashtext(${snapshot.runId} || ':' || ${snapshot.executionPlan.fingerprint})
          )
        `;
        const existing = await tx<{
          snapshot_fingerprint: string;
          snapshot_payload: FullSiteCrawlBridgeSnapshot;
        }[]>`
          SELECT snapshot_fingerprint, snapshot_payload
          FROM first_party_crawl_accounting_snapshots
          WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
            AND run_id = ${snapshot.runId}
            AND execution_plan_fingerprint = ${snapshot.executionPlan.fingerprint}
            AND checkpoint_fingerprint = ${snapshot.checkpoint.fingerprint}
          FOR UPDATE
        `;
        if (existing[0]) {
          if (
            existing[0].snapshot_fingerprint === snapshot.fingerprint &&
            stableSerialize(existing[0].snapshot_payload) === stableSerialize(snapshot)
          ) return;
          throw new Error("p12_2_persistence_accounting_conflicting_replay");
        }

        await tx`
          INSERT INTO first_party_crawl_accounting_snapshots (
            accounting_snapshot_id, site_id, run_id, canonical_origin,
            execution_plan_fingerprint, checkpoint_fingerprint, checkpoint_revision,
            snapshot_fingerprint, whole_site_certified, terminal_failure_count,
            observed_at, snapshot_payload
          ) VALUES (
            ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid, ${snapshot.runId},
            ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${snapshot.executionPlan.fingerprint},
            ${snapshot.checkpoint.fingerprint}, ${snapshot.checkpoint.sequence}::bigint,
            ${snapshot.fingerprint}, ${snapshot.certification.certification.wholeSiteCertified},
            ${snapshot.checkpoint.counters.terminalFailures}::integer,
            ${snapshot.observedAt}::timestamptz, ${tx.json(snapshot)}
          )
        `;
      });
    });
  }

  async saveRecoveryReceipt(receipt: TerminalFailureRecoveryReceipt): Promise<void> {
    requireRunId(receipt.runId);
    requireObservedAt(receipt.observedAt);
    requireBinding(receipt.siteId, receipt.canonicalOrigin);
    requireHex(receipt.executionPlanFingerprint, "p12_2_persistence_execution_fingerprint_invalid");
    assertTerminalFailureRecoveryReceiptIntegrity(receipt);
    assertNoForbiddenContent(receipt);

    await this.withSql(async (sql) => {
      await sql.begin(async (tx) => {
        await tx`
          SELECT pg_advisory_xact_lock(
            hashtext('p12_2_recovery:' || ${DIAMOND_SHELF_SITE_ID}),
            hashtext(${receipt.runId} || ':' || ${receipt.executionPlanFingerprint})
          )
        `;
        const existing = await tx<{
          receipt_fingerprint: string;
          receipt_payload: TerminalFailureRecoveryReceipt;
        }[]>`
          SELECT receipt_fingerprint, receipt_payload
          FROM first_party_crawl_terminal_failure_recovery_receipts
          WHERE recovery_plan_fingerprint = ${receipt.recoveryPlanFingerprint}
          FOR UPDATE
        `;
        if (existing[0]) {
          if (
            existing[0].receipt_fingerprint === receipt.fingerprint &&
            stableSerialize(existing[0].receipt_payload) === stableSerialize(receipt)
          ) return;
          throw new Error("p12_2_persistence_recovery_conflicting_replay");
        }

        await tx`
          INSERT INTO first_party_crawl_terminal_failure_recovery_receipts (
            recovery_receipt_id, site_id, run_id, canonical_origin,
            execution_plan_fingerprint, source_checkpoint_fingerprint,
            source_checkpoint_revision, result_checkpoint_fingerprint,
            result_checkpoint_revision, recovery_plan_fingerprint,
            receipt_fingerprint, status, observed_at, receipt_payload
          ) VALUES (
            ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid, ${receipt.runId},
            ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${receipt.executionPlanFingerprint},
            ${receipt.sourceCheckpointFingerprint}, ${receipt.sourceCheckpointRevision}::bigint,
            ${receipt.resultCheckpointFingerprint}, ${receipt.resultCheckpointRevision}::bigint,
            ${receipt.recoveryPlanFingerprint}, ${receipt.fingerprint}, ${receipt.status},
            ${receipt.observedAt}::timestamptz, ${tx.json(receipt)}
          )
        `;
      });
    });
  }

  async saveRecoveryTransition(
    transition: TerminalFailureRecoveryPersistenceTransition,
  ): Promise<void> {
    if (transition.version !== P12_2_CRAWL_BRIDGE_VERSION) {
      throw new Error("p12_2_persistence_version_mismatch");
    }
    requireHex(
      transition.sourceCheckpointFingerprint,
      "p12_2_persistence_recovery_source_checkpoint_invalid",
    );
    assertCheckpointRecord(transition.checkpointRecord);
    assertFullSiteCrawlBridgeSnapshotIntegrity(transition.accountingSnapshot);
    assertTerminalFailureRecoveryReceiptIntegrity(transition.recoveryReceipt);
    assertNoForbiddenContent(transition);

    const record = transition.checkpointRecord;
    const snapshot = transition.accountingSnapshot;
    const receipt = transition.recoveryReceipt;
    const runId = requireRunId(record.runId);
    requireObservedAt(record.observedAt);
    requireBinding(record.siteId, record.canonicalOrigin);

    if (
      receipt.runId !== runId ||
      receipt.siteId !== record.siteId ||
      receipt.canonicalOrigin !== record.canonicalOrigin ||
      receipt.executionPlanFingerprint !== record.executionPlanFingerprint ||
      receipt.sourceCheckpointFingerprint !== transition.sourceCheckpointFingerprint ||
      receipt.resultCheckpointFingerprint !== record.checkpoint.fingerprint ||
      receipt.resultCheckpointRevision !== record.checkpoint.sequence ||
      snapshot.runId !== runId ||
      snapshot.siteId !== record.siteId ||
      snapshot.canonicalOrigin !== record.canonicalOrigin ||
      snapshot.executionPlan.fingerprint !== record.executionPlanFingerprint ||
      snapshot.checkpoint.fingerprint !== record.checkpoint.fingerprint ||
      snapshot.checkpoint.sequence !== record.checkpoint.sequence ||
      snapshot.fingerprint !== receipt.accountingSnapshotFingerprint ||
      transition.completedRunPersisted !== receipt.completedRunPersisted ||
      transition.completedRunPersisted !== snapshot.certification.certification.wholeSiteCertified
    ) {
      throw new Error("p12_2_persistence_recovery_transition_lineage_invalid");
    }

    if (record.terminalFailureEvents.length !== receipt.urlReceipts.length) {
      throw new Error("p12_2_persistence_recovery_transition_event_count_invalid");
    }
    const sourceByUrl = new Map(
      receipt.urlReceipts.map((item) => [item.canonicalUrl, item.sourceEventFingerprint]),
    );
    for (const event of record.terminalFailureEvents) {
      if (
        event.sourceEventFingerprint !== sourceByUrl.get(event.canonicalUrl) ||
        !["recovery_failure", "recovery_resolved"].includes(event.eventType)
      ) throw new Error("p12_2_persistence_recovery_transition_event_invalid");
    }

    await this.withSql(async (sql) => {
      await sql.begin(async (tx) => {
        await tx`
          SELECT pg_advisory_xact_lock(
            hashtext('p12_2_recovery_transition:' || ${DIAMOND_SHELF_SITE_ID}),
            hashtext(${runId} || ':' || ${record.executionPlanFingerprint})
          )
        `;

        const currentRows = await tx<{
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
        const current = currentRows[0];
        if (
          !current ||
          Number(current.checkpoint_revision) !== receipt.sourceCheckpointRevision ||
          current.checkpoint_fingerprint !== transition.sourceCheckpointFingerprint
        ) throw new Error("p12_2_persistence_recovery_source_checkpoint_stale");

        for (const event of record.terminalFailureEvents) {
          const source = await tx<{
            event_fingerprint: string;
            canonical_url: string;
          }[]>`
            SELECT event_fingerprint, canonical_url
            FROM first_party_crawl_terminal_failure_events
            WHERE event_fingerprint = ${event.sourceEventFingerprint}
              AND site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
              AND run_id = ${runId}
              AND execution_plan_fingerprint = ${record.executionPlanFingerprint}
            FOR UPDATE
          `;
          if (!source[0] || source[0].canonical_url !== event.canonicalUrl) {
            throw new Error("p12_2_persistence_terminal_failure_source_missing");
          }

          const replay = await tx<{
            event_fingerprint: string;
            event_payload: TerminalFailureEvent;
          }[]>`
            SELECT event_fingerprint, event_payload
            FROM first_party_crawl_terminal_failure_events
            WHERE source_event_fingerprint = ${event.sourceEventFingerprint}
            FOR UPDATE
          `;
          if (replay[0]) {
            if (
              replay[0].event_fingerprint === event.fingerprint &&
              stableSerialize(replay[0].event_payload) === stableSerialize(event)
            ) continue;
            throw new Error("p12_2_persistence_terminal_failure_source_consumed");
          }

          await tx`
            INSERT INTO first_party_crawl_terminal_failure_events (
              event_id, site_id, run_id, canonical_origin,
              execution_plan_fingerprint, canonical_url, event_type,
              source_event_fingerprint, checkpoint_fingerprint, checkpoint_revision,
              observed_at, event_fingerprint, event_payload
            ) VALUES (
              ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid, ${runId},
              ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${record.executionPlanFingerprint},
              ${event.canonicalUrl}, ${event.eventType}, ${event.sourceEventFingerprint},
              ${event.checkpointFingerprint}, ${event.checkpointRevision}::bigint,
              ${event.observedAt}::timestamptz, ${event.fingerprint}, ${tx.json(event)}
            )
          `;
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

        const accountingExisting = await tx<{
          snapshot_fingerprint: string;
          snapshot_payload: FullSiteCrawlBridgeSnapshot;
        }[]>`
          SELECT snapshot_fingerprint, snapshot_payload
          FROM first_party_crawl_accounting_snapshots
          WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
            AND run_id = ${runId}
            AND execution_plan_fingerprint = ${record.executionPlanFingerprint}
            AND checkpoint_fingerprint = ${record.checkpoint.fingerprint}
          FOR UPDATE
        `;
        if (accountingExisting[0]) {
          if (
            accountingExisting[0].snapshot_fingerprint !== snapshot.fingerprint ||
            stableSerialize(accountingExisting[0].snapshot_payload) !== stableSerialize(snapshot)
          ) throw new Error("p12_2_persistence_accounting_conflicting_replay");
        } else {
          await tx`
            INSERT INTO first_party_crawl_accounting_snapshots (
              accounting_snapshot_id, site_id, run_id, canonical_origin,
              execution_plan_fingerprint, checkpoint_fingerprint, checkpoint_revision,
              snapshot_fingerprint, whole_site_certified, terminal_failure_count,
              observed_at, snapshot_payload
            ) VALUES (
              ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid, ${runId},
              ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${record.executionPlanFingerprint},
              ${record.checkpoint.fingerprint}, ${record.checkpoint.sequence}::bigint,
              ${snapshot.fingerprint}, ${snapshot.certification.certification.wholeSiteCertified},
              ${snapshot.checkpoint.counters.terminalFailures}::integer,
              ${snapshot.observedAt}::timestamptz, ${tx.json(snapshot)}
            )
          `;
        }

        if (transition.completedRunPersisted) {
          if (!snapshot.certification.certification.wholeSiteCertified) {
            throw new Error("p12_2_persistence_completed_run_not_certified");
          }
          const completedExisting = await tx<{
            snapshot_fingerprint: string;
            snapshot_payload: FullSiteCrawlBridgeSnapshot;
          }[]>`
            SELECT snapshot_fingerprint, snapshot_payload
            FROM first_party_crawl_completed_runs
            WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
              AND run_id = ${runId}
            FOR UPDATE
          `;
          if (completedExisting[0]) {
            if (
              completedExisting[0].snapshot_fingerprint !== snapshot.fingerprint ||
              stableSerialize(completedExisting[0].snapshot_payload) !== stableSerialize(snapshot)
            ) throw new Error("p12_2_persistence_completed_run_conflicting_replay");
          } else {
            await tx`
              INSERT INTO first_party_crawl_completed_runs (
                completed_run_id, site_id, run_id, canonical_origin,
                execution_plan_fingerprint, snapshot_fingerprint,
                observed_at, snapshot_payload
              ) VALUES (
                ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid, ${runId},
                ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${record.executionPlanFingerprint},
                ${snapshot.fingerprint}, ${snapshot.observedAt}::timestamptz,
                ${tx.json(snapshot)}
              )
            `;
          }
        }

        const receiptExisting = await tx<{
          receipt_fingerprint: string;
          receipt_payload: TerminalFailureRecoveryReceipt;
        }[]>`
          SELECT receipt_fingerprint, receipt_payload
          FROM first_party_crawl_terminal_failure_recovery_receipts
          WHERE recovery_plan_fingerprint = ${receipt.recoveryPlanFingerprint}
          FOR UPDATE
        `;
        if (receiptExisting[0]) {
          if (
            receiptExisting[0].receipt_fingerprint !== receipt.fingerprint ||
            stableSerialize(receiptExisting[0].receipt_payload) !== stableSerialize(receipt)
          ) throw new Error("p12_2_persistence_recovery_conflicting_replay");
        } else {
          await tx`
            INSERT INTO first_party_crawl_terminal_failure_recovery_receipts (
              recovery_receipt_id, site_id, run_id, canonical_origin,
              execution_plan_fingerprint, source_checkpoint_fingerprint,
              source_checkpoint_revision, result_checkpoint_fingerprint,
              result_checkpoint_revision, recovery_plan_fingerprint,
              receipt_fingerprint, status, observed_at, receipt_payload
            ) VALUES (
              ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid, ${runId},
              ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${receipt.executionPlanFingerprint},
              ${receipt.sourceCheckpointFingerprint}, ${receipt.sourceCheckpointRevision}::bigint,
              ${receipt.resultCheckpointFingerprint}, ${receipt.resultCheckpointRevision}::bigint,
              ${receipt.recoveryPlanFingerprint}, ${receipt.fingerprint}, ${receipt.status},
              ${receipt.observedAt}::timestamptz, ${tx.json(receipt)}
            )
          `;
        }
      });
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
    recognizedPublicTableCounts: P12_2_RECOGNIZED_TABLE_COUNTS,
    lazyDatabaseConnection: true,
    checkpointRevisioned: true,
    completedRunCertifiedOnly: true,
    terminalFailureEventsAppendOnly: true,
    accountingSnapshotsAppendOnly: true,
    terminalFailureRecoveryReceiptsAppendOnly: true,
    exactFailureEvidenceRequiredForRecovery: true,
    atomicRecoveryTransition: true,
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
