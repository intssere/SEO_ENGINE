import { createHash } from "node:crypto";
import {
  P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
  P12_2_L10_15_OBSERVED_AT,
  P12_2_L10_15_RUN_ID,
} from "./p12-2-l10-15-packet-014-full-initial.js";
import {
  P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT,
  P12_2_L10_18_FAILURE_EVENT_FINGERPRINT,
  P12_2_L10_18_FAILURE_URL,
  P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT,
  P12_2_L10_18_FINAL_CHECKPOINT_REVISION,
  P12_2_L10_18_POSTGRES_SERVICE_ID,
  P12_2_L10_18_PROJECT_ID,
  P12_2_L10_18_ENVIRONMENT_ID,
  buildP122L1018CompactFinalizationSnapshot,
  buildP122L1018L2Receipt,
} from "./p12-2-l10-18-packet-014-finalization-repair.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";
import { DIAMOND_SHELF_CANONICAL_ORIGIN } from "./first-party-crawl-runtime-bridge.js";

export const P12_2_L10_19_PREFLIGHT_VERSION =
  "p12-2-l10-19-packet-014-expected-absence-preflight-v1" as const;
export const P12_2_L10_19_PREFLIGHT_PROJECT_ID = P12_2_L10_18_PROJECT_ID;
export const P12_2_L10_19_PREFLIGHT_ENVIRONMENT_ID = P12_2_L10_18_ENVIRONMENT_ID;
export const P12_2_L10_19_PREFLIGHT_POSTGRES_SERVICE_ID = P12_2_L10_18_POSTGRES_SERVICE_ID;
export const P12_2_L10_19_PREFLIGHT_EXPECTED_TABLE_COUNT = 41 as const;
export const P12_2_L10_19_PREFLIGHT_ACCOUNTING_SNAPSHOT_FINGERPRINT =
  buildP122L1018CompactFinalizationSnapshot().fingerprint;
export const P12_2_L10_19_PREFLIGHT_L2_RECEIPT_FINGERPRINT =
  buildP122L1018L2Receipt().fingerprint;

export type P122L1019PreflightQuery = {
  id:
    | "database_identity"
    | "schema_lineage"
    | "l2_finalization"
    | "checkpoint_preservation"
    | "accounting_snapshot"
    | "historical_failure_event"
    | "historical_absence_status"
    | "completed_and_recovery_absence"
    | "site_binding"
    | "terminal_guard";
  sql: string;
};

const HISTORICAL_EVENT_PREDICATE = `
  site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
  AND run_id='${P12_2_L10_15_RUN_ID}'
  AND canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'
  AND execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}'
  AND canonical_url='${P12_2_L10_18_FAILURE_URL}'
  AND event_type='terminal_failure'
  AND source_event_fingerprint IS NULL
  AND event_fingerprint='${P12_2_L10_18_FAILURE_EVENT_FINGERPRINT}'
  AND event_payload->>'fingerprint'=event_fingerprint
  AND event_payload->>'eventType'='terminal_failure'
  AND event_payload->>'decisionReason'='permanent_http'
  AND event_payload->'outcome'->>'kind'='failure'
  AND event_payload->'outcome'->'signal'->>'kind'='http_status'
  AND (event_payload->'outcome'->'signal'->>'httpStatus')::integer IN (404,410)
`;

const TERMINAL_GUARD = `
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE')=${P12_2_L10_19_PREFLIGHT_EXPECTED_TABLE_COUNT}
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public'
      AND table_name IN (
        'policy_mutation_reservations',
        'policy_mutation_control_state',
        'policy_mutation_control_events',
        'policy_mutation_claims',
        'policy_mutation_dispatches',
        'policy_mutation_dispatch_events',
        'first_party_crawl_terminal_failure_dispositions',
        'first_party_crawl_terminal_failure_reconciliation_receipts'
      )
  )
  AND (
    SELECT count(*) FROM information_schema.tables
    WHERE table_schema='public'
      AND table_name IN (
        'first_party_crawl_terminal_failure_events',
        'first_party_crawl_accounting_snapshots',
        'first_party_crawl_terminal_failure_recovery_receipts'
      )
  )=3
  AND (
    SELECT count(*) FROM first_party_crawl_l2_invocations
    WHERE packet_fingerprint='${P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT}'
      AND site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
      AND phase='full_initial'
      AND run_id='${P12_2_L10_15_RUN_ID}'
      AND canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'
      AND observed_at='${P12_2_L10_15_OBSERVED_AT}'::timestamptz
      AND status='completed'
      AND receipt_fingerprint='${P12_2_L10_19_PREFLIGHT_L2_RECEIPT_FINGERPRINT}'
      AND receipt_payload->>'fingerprint'='${P12_2_L10_19_PREFLIGHT_L2_RECEIPT_FINGERPRINT}'
      AND receipt_payload->'result'->>'status'='accounting_complete_uncertified'
  )=1
  AND (
    SELECT count(*) FROM first_party_crawl_checkpoints
    WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_15_RUN_ID}'
      AND canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'
      AND execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}'
      AND checkpoint_fingerprint='${P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT}'
      AND checkpoint_revision=${P12_2_L10_18_FINAL_CHECKPOINT_REVISION}
      AND checkpoint_payload->>'status'='completed'
      AND (checkpoint_payload->'progress'->>'totalUrls')::integer=3044
      AND (checkpoint_payload->'progress'->>'finalizedUrls')::integer=3044
      AND (checkpoint_payload->'progress'->>'pendingUrls')::integer=0
      AND (checkpoint_payload->'counters'->>'terminalFailures')::integer=1
  )=1
  AND (
    SELECT count(*) FROM first_party_crawl_accounting_snapshots
    WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_15_RUN_ID}'
      AND canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'
      AND execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}'
      AND snapshot_fingerprint='${P12_2_L10_19_PREFLIGHT_ACCOUNTING_SNAPSHOT_FINGERPRINT}'
      AND whole_site_certified=false
      AND terminal_failure_count=1
      AND snapshot_payload->>'kind'='packet_014_compact_accounting_finalization'
  )=1
  AND (
    SELECT count(*) FROM first_party_crawl_terminal_failure_events
    WHERE ${HISTORICAL_EVENT_PREDICATE}
  )=1
  AND (
    SELECT count(*) FROM first_party_crawl_completed_runs
    WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_15_RUN_ID}'
      AND canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'
  )=0
  AND (
    SELECT count(*) FROM first_party_crawl_terminal_failure_recovery_receipts
    WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_15_RUN_ID}'
      AND canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'
  )=0
`;

export const P12_2_L10_19_PREFLIGHT_QUERIES: readonly P122L1019PreflightQuery[] = Object.freeze([
  {
    id: "database_identity",
    sql: "SELECT current_database() AS database_name, current_user AS database_user, current_setting('server_version') AS server_version",
  },
  {
    id: "schema_lineage",
    sql: `SELECT
      (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS public_table_count,
      (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('policy_mutation_reservations','policy_mutation_control_state','policy_mutation_control_events','policy_mutation_claims','policy_mutation_dispatches','policy_mutation_dispatch_events')) AS engineering_policy_table_count,
      to_regclass('public.first_party_crawl_terminal_failure_dispositions') IS NOT NULL AS disposition_table_present,
      to_regclass('public.first_party_crawl_terminal_failure_reconciliation_receipts') IS NOT NULL AS reconciliation_table_present`,
  },
  {
    id: "l2_finalization",
    sql: `SELECT status,receipt_fingerprint,
      receipt_payload->'result'->>'status' AS result_status,
      receipt_payload->'result'->>'accountingSnapshotFingerprint' AS accounting_snapshot_fingerprint
      FROM first_party_crawl_l2_invocations
      WHERE packet_fingerprint='${P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT}'
        AND site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_15_RUN_ID}'`,
  },
  {
    id: "checkpoint_preservation",
    sql: `SELECT checkpoint_fingerprint,checkpoint_revision,
      checkpoint_payload->>'status' AS checkpoint_status,
      checkpoint_payload->'progress'->>'totalUrls' AS total_urls,
      checkpoint_payload->'progress'->>'finalizedUrls' AS finalized_urls,
      checkpoint_payload->'progress'->>'pendingUrls' AS pending_urls,
      checkpoint_payload->'counters'->>'terminalFailures' AS terminal_failures
      FROM first_party_crawl_checkpoints
      WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_15_RUN_ID}'
        AND execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}'`,
  },
  {
    id: "accounting_snapshot",
    sql: `SELECT snapshot_fingerprint,whole_site_certified,terminal_failure_count,
      snapshot_payload->>'kind' AS snapshot_kind
      FROM first_party_crawl_accounting_snapshots
      WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_15_RUN_ID}'
        AND execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}'`,
  },
  {
    id: "historical_failure_event",
    sql: `SELECT event_fingerprint,checkpoint_fingerprint,checkpoint_revision,
      event_payload->>'decisionReason' AS decision_reason,
      event_payload->'outcome'->>'kind' AS outcome_kind,
      event_payload->'outcome'->'signal'->>'kind' AS signal_kind,
      event_payload->'outcome'->'signal'->>'httpStatus' AS http_status
      FROM first_party_crawl_terminal_failure_events
      WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_15_RUN_ID}'
        AND event_fingerprint='${P12_2_L10_18_FAILURE_EVENT_FINGERPRINT}'`,
  },
  {
    id: "historical_absence_status",
    sql: `SELECT (event_payload->'outcome'->'signal'->>'httpStatus')::int AS historical_absence_http_status
      FROM first_party_crawl_terminal_failure_events
      WHERE ${HISTORICAL_EVENT_PREDICATE}`,
  },
  {
    id: "completed_and_recovery_absence",
    sql: `SELECT
      (SELECT count(*)::int FROM first_party_crawl_completed_runs
       WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid AND run_id='${P12_2_L10_15_RUN_ID}') AS completed_run_count,
      (SELECT count(*)::int FROM first_party_crawl_terminal_failure_recovery_receipts
       WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid AND run_id='${P12_2_L10_15_RUN_ID}') AS recovery_receipt_count`,
  },
  {
    id: "site_binding",
    sql: `SELECT id::text AS id,domain,canonical_origin,is_active
      FROM sites WHERE id='${DIAMOND_SHELF_SITE_ID}'::uuid`,
  },
  {
    id: "terminal_guard",
    sql: `SELECT 1 / CASE WHEN ${TERMINAL_GUARD} THEN 1 ELSE 0 END AS terminal_guard`,
  },
]);

const FORBIDDEN_SQL =
  /\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|comment|vacuum|analyze|refresh|reindex|cluster|copy|call|do|execute|prepare|deallocate|listen|notify|lock)\b/i;

function normalizedSql(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function assertP122L1019PreflightQueryContract(): void {
  if (P12_2_L10_19_PREFLIGHT_QUERIES.length !== 10) {
    throw new Error("p12_2_l10_19_preflight_query_count_invalid");
  }
  const ids = P12_2_L10_19_PREFLIGHT_QUERIES.map((query) => query.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("p12_2_l10_19_preflight_query_id_duplicate");
  }
  for (const query of P12_2_L10_19_PREFLIGHT_QUERIES) {
    const sql = normalizedSql(query.sql);
    if (!/^SELECT\b/i.test(sql)) {
      throw new Error("p12_2_l10_19_preflight_non_select_forbidden");
    }
    if (FORBIDDEN_SQL.test(sql)) {
      throw new Error("p12_2_l10_19_preflight_mutation_keyword_forbidden");
    }
    if (sql.includes(";")) {
      throw new Error("p12_2_l10_19_preflight_multi_statement_forbidden");
    }
  }
}

export function p122L1019PreflightQuerySetFingerprint(): string {
  assertP122L1019PreflightQueryContract();
  return createHash("sha256")
    .update(JSON.stringify(P12_2_L10_19_PREFLIGHT_QUERIES.map((query) => ({
      id: query.id,
      sql: normalizedSql(query.sql),
    }))))
    .digest("hex");
}

export function p122L1019PreflightAuthorizationFingerprint(): string {
  return createHash("sha256").update(JSON.stringify({
    version: P12_2_L10_19_PREFLIGHT_VERSION,
    projectId: P12_2_L10_19_PREFLIGHT_PROJECT_ID,
    environmentId: P12_2_L10_19_PREFLIGHT_ENVIRONMENT_ID,
    postgresServiceId: P12_2_L10_19_PREFLIGHT_POSTGRES_SERVICE_ID,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    packetFingerprint: P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
    runId: P12_2_L10_15_RUN_ID,
    executionPlanFingerprint: P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT,
    checkpointFingerprint: P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT,
    checkpointRevision: P12_2_L10_18_FINAL_CHECKPOINT_REVISION,
    sourceEventFingerprint: P12_2_L10_18_FAILURE_EVENT_FINGERPRINT,
    failureUrl: P12_2_L10_18_FAILURE_URL,
    acceptedHistoricalHttpStatuses: [404,410],
    sourceAccountingSnapshotFingerprint: P12_2_L10_19_PREFLIGHT_ACCOUNTING_SNAPSHOT_FINGERPRINT,
    sourceL2ReceiptFingerprint: P12_2_L10_19_PREFLIGHT_L2_RECEIPT_FINGERPRINT,
    querySetFingerprint: p122L1019PreflightQuerySetFingerprint(),
    attempts: 1,
    retries: 0,
    fallback: false,
    sessionReadOnly: true,
    migrationExecution: false,
    liveNetworkReads: false,
  })).digest("hex");
}

export function p122L1019PreflightAuthorizationLiteral(): string {
  return `AUTHORIZE:P12_2_L10_19_PACKET_014_PRE_EXEC_READ_ONLY:${p122L1019PreflightAuthorizationFingerprint()}`;
}

export function p122L1019PreflightCapability() {
  return Object.freeze({
    version: P12_2_L10_19_PREFLIGHT_VERSION,
    queryCount: P12_2_L10_19_PREFLIGHT_QUERIES.length,
    querySetFingerprint: p122L1019PreflightQuerySetFingerprint(),
    historicalAbsenceHttpStatuses: [404,410] as const,
    sessionReadOnly: true,
    migrationExecution: false,
    liveNetworkReads: false,
    databaseMutation: false,
    crawlExecution: false,
    recoveryExecution: false,
    providerWrites: false,
    publicSiteWrites: false,
  } as const);
}
