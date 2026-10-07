import { createHash } from "node:crypto";
import {
  P12_2_L10_19_A_ACCOUNTING_SNAPSHOT_FINGERPRINT,
  P12_2_L10_19_A_CHECKPOINT_FINGERPRINT,
  P12_2_L10_19_A_CHECKPOINT_REVISION,
  P12_2_L10_19_A_ENVIRONMENT_ID,
  P12_2_L10_19_A_EXECUTION_PLAN_FINGERPRINT,
  P12_2_L10_19_A_EXPECTED_POST_TABLE_COUNT,
  P12_2_L10_19_A_FAILURE_EVENT_FINGERPRINT,
  P12_2_L10_19_A_FAILURE_URL,
  P12_2_L10_19_A_L2_RECEIPT_FINGERPRINT,
  P12_2_L10_19_A_ORIGIN,
  P12_2_L10_19_A_PACKET_FINGERPRINT,
  P12_2_L10_19_A_POSTGRES_SERVICE_ID,
  P12_2_L10_19_A_PROJECT_ID,
  P12_2_L10_19_A_RUN_ID,
  P12_2_L10_19_A_SITE_ID,
} from "./p12-2-l10-19-a-0011-apply-contract.js";

export const P12_2_L10_19_B_VERSION =
  "p12-2-l10-19-b-0011-post-apply-readonly-cert-v1" as const;

export type P122L1019BQuery = {
  id:
    | "database_identity"
    | "schema_shape"
    | "new_tables_empty"
    | "immutability_triggers"
    | "l2_finalization_preserved"
    | "checkpoint_preserved"
    | "failure_event_preserved"
    | "accounting_snapshot_preserved"
    | "completion_recovery_absence"
    | "terminal_guard";
  sql: string;
};

const VALID_STATE = `
  (
    SELECT count(*)
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  )=${P12_2_L10_19_A_EXPECTED_POST_TABLE_COUNT}
  AND to_regclass('public.first_party_crawl_terminal_failure_dispositions') IS NOT NULL
  AND to_regclass('public.first_party_crawl_terminal_failure_reconciliation_receipts') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public'
      AND table_name IN (
        'policy_mutation_reservations','policy_mutation_control_state',
        'policy_mutation_control_events','policy_mutation_claims',
        'policy_mutation_dispatches','policy_mutation_dispatch_events'
      )
  )
  AND (SELECT count(*) FROM first_party_crawl_terminal_failure_dispositions)=0
  AND (SELECT count(*) FROM first_party_crawl_terminal_failure_reconciliation_receipts)=0
  AND (
    SELECT count(*) FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND NOT t.tgisinternal
      AND t.tgname IN (
        'trg_first_party_crawl_terminal_failure_dispositions_immutable',
        'trg_first_party_crawl_terminal_failure_reconciliation_immutable'
      )
  )=2
  AND EXISTS (
    SELECT 1 FROM first_party_crawl_l2_invocations
    WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
      AND packet_fingerprint='${P12_2_L10_19_A_PACKET_FINGERPRINT}'
      AND run_id='${P12_2_L10_19_A_RUN_ID}'
      AND canonical_origin='${P12_2_L10_19_A_ORIGIN}'
      AND status='completed'
      AND receipt_fingerprint='${P12_2_L10_19_A_L2_RECEIPT_FINGERPRINT}'
  )
  AND EXISTS (
    SELECT 1 FROM first_party_crawl_checkpoints
    WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_19_A_RUN_ID}'
      AND canonical_origin='${P12_2_L10_19_A_ORIGIN}'
      AND execution_plan_fingerprint='${P12_2_L10_19_A_EXECUTION_PLAN_FINGERPRINT}'
      AND checkpoint_fingerprint='${P12_2_L10_19_A_CHECKPOINT_FINGERPRINT}'
      AND checkpoint_revision=${P12_2_L10_19_A_CHECKPOINT_REVISION}
      AND checkpoint_payload->>'status'='completed'
      AND (checkpoint_payload->'progress'->>'totalUrls')::integer=3044
      AND (checkpoint_payload->'progress'->>'finalizedUrls')::integer=3044
      AND (checkpoint_payload->'progress'->>'pendingUrls')::integer=0
      AND (checkpoint_payload->'counters'->>'terminalFailures')::integer=1
  )
  AND EXISTS (
    SELECT 1 FROM first_party_crawl_terminal_failure_events
    WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_19_A_RUN_ID}'
      AND execution_plan_fingerprint='${P12_2_L10_19_A_EXECUTION_PLAN_FINGERPRINT}'
      AND canonical_url='${P12_2_L10_19_A_FAILURE_URL}'
      AND event_type='terminal_failure'
      AND source_event_fingerprint IS NULL
      AND event_fingerprint='${P12_2_L10_19_A_FAILURE_EVENT_FINGERPRINT}'
      AND event_payload->>'fingerprint'=event_fingerprint
      AND event_payload->>'eventType'='terminal_failure'
      AND event_payload->>'decisionReason'='permanent_http'
      AND event_payload->'outcome'->>'kind'='failure'
      AND event_payload->'outcome'->'signal'->>'kind'='http_status'
      AND (event_payload->'outcome'->'signal'->>'httpStatus')::integer IN (404,410)
  )
  AND EXISTS (
    SELECT 1 FROM first_party_crawl_accounting_snapshots
    WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_19_A_RUN_ID}'
      AND execution_plan_fingerprint='${P12_2_L10_19_A_EXECUTION_PLAN_FINGERPRINT}'
      AND snapshot_fingerprint='${P12_2_L10_19_A_ACCOUNTING_SNAPSHOT_FINGERPRINT}'
      AND whole_site_certified=false
      AND terminal_failure_count=1
  )
  AND (
    SELECT count(*) FROM first_party_crawl_completed_runs
    WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_19_A_RUN_ID}'
  )=0
  AND (
    SELECT count(*) FROM first_party_crawl_terminal_failure_recovery_receipts
    WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_19_A_RUN_ID}'
  )=0
`;

export const P12_2_L10_19_B_QUERIES: readonly P122L1019BQuery[] = Object.freeze([
  {
    id: "database_identity",
    sql: "SELECT current_database() AS database_name, current_user AS database_user, current_setting('server_version') AS server_version",
  },
  {
    id: "schema_shape",
    sql: `SELECT
      (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS table_count,
      to_regclass('public.first_party_crawl_terminal_failure_dispositions') IS NOT NULL AS dispositions_present,
      to_regclass('public.first_party_crawl_terminal_failure_reconciliation_receipts') IS NOT NULL AS reconciliations_present,
      (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('policy_mutation_reservations','policy_mutation_control_state','policy_mutation_control_events','policy_mutation_claims','policy_mutation_dispatches','policy_mutation_dispatch_events')) AS policy_table_count`,
  },
  {
    id: "new_tables_empty",
    sql: `SELECT
      (SELECT count(*)::int FROM first_party_crawl_terminal_failure_dispositions) AS disposition_count,
      (SELECT count(*)::int FROM first_party_crawl_terminal_failure_reconciliation_receipts) AS reconciliation_count`,
  },
  {
    id: "immutability_triggers",
    sql: `SELECT count(*)::int AS immutable_trigger_count
      FROM pg_catalog.pg_trigger t
      JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND NOT t.tgisinternal
        AND t.tgname IN ('trg_first_party_crawl_terminal_failure_dispositions_immutable','trg_first_party_crawl_terminal_failure_reconciliation_immutable')`,
  },
  {
    id: "l2_finalization_preserved",
    sql: `SELECT status, receipt_fingerprint
      FROM first_party_crawl_l2_invocations
      WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
        AND packet_fingerprint='${P12_2_L10_19_A_PACKET_FINGERPRINT}'
        AND run_id='${P12_2_L10_19_A_RUN_ID}'
        AND canonical_origin='${P12_2_L10_19_A_ORIGIN}'`,
  },
  {
    id: "checkpoint_preserved",
    sql: `SELECT checkpoint_fingerprint, checkpoint_revision,
      checkpoint_payload->>'status' AS status,
      checkpoint_payload->'progress'->>'totalUrls' AS total_urls,
      checkpoint_payload->'progress'->>'finalizedUrls' AS finalized_urls,
      checkpoint_payload->'progress'->>'pendingUrls' AS pending_urls,
      checkpoint_payload->'counters'->>'terminalFailures' AS terminal_failures
      FROM first_party_crawl_checkpoints
      WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_19_A_RUN_ID}'
        AND execution_plan_fingerprint='${P12_2_L10_19_A_EXECUTION_PLAN_FINGERPRINT}'`,
  },
  {
    id: "failure_event_preserved",
    sql: `SELECT canonical_url, event_type, source_event_fingerprint, event_fingerprint,
      event_payload->>'decisionReason' AS decision_reason,
      event_payload->'outcome'->'signal'->>'kind' AS signal_kind,
      event_payload->'outcome'->'signal'->>'httpStatus' AS http_status
      FROM first_party_crawl_terminal_failure_events
      WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_19_A_RUN_ID}'
        AND execution_plan_fingerprint='${P12_2_L10_19_A_EXECUTION_PLAN_FINGERPRINT}'`,
  },
  {
    id: "accounting_snapshot_preserved",
    sql: `SELECT snapshot_fingerprint, whole_site_certified, terminal_failure_count
      FROM first_party_crawl_accounting_snapshots
      WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_19_A_RUN_ID}'
        AND execution_plan_fingerprint='${P12_2_L10_19_A_EXECUTION_PLAN_FINGERPRINT}'`,
  },
  {
    id: "completion_recovery_absence",
    sql: `SELECT
      (SELECT count(*)::int FROM first_party_crawl_completed_runs WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid AND run_id='${P12_2_L10_19_A_RUN_ID}') AS completed_run_count,
      (SELECT count(*)::int FROM first_party_crawl_terminal_failure_recovery_receipts WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid AND run_id='${P12_2_L10_19_A_RUN_ID}') AS recovery_receipt_count`,
  },
  {
    id: "terminal_guard",
    sql: `SELECT 1 / CASE WHEN ${VALID_STATE} THEN 1 ELSE 0 END AS terminal_guard`,
  },
]);

const FORBIDDEN_SQL =
  /\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|comment|vacuum|analyze|refresh|reindex|cluster|copy|call|do|execute|prepare|deallocate|listen|notify|lock)\b/i;

function normalizedSql(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function assertP122L1019BQueryContract(): void {
  if (P12_2_L10_19_B_QUERIES.length !== 10) {
    throw new Error("p12_2_l10_19_b_query_count_invalid");
  }
  const ids = P12_2_L10_19_B_QUERIES.map((query) => query.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("p12_2_l10_19_b_query_id_duplicate");
  }
  for (const query of P12_2_L10_19_B_QUERIES) {
    const sql = normalizedSql(query.sql);
    if (!/^SELECT\b/i.test(sql)) throw new Error("p12_2_l10_19_b_non_select_forbidden");
    if (FORBIDDEN_SQL.test(sql)) throw new Error("p12_2_l10_19_b_mutation_keyword_forbidden");
    if (sql.includes(";")) throw new Error("p12_2_l10_19_b_multi_statement_forbidden");
  }
}

export function p122L1019BQuerySetFingerprint(): string {
  assertP122L1019BQueryContract();
  return createHash("sha256").update(JSON.stringify(
    P12_2_L10_19_B_QUERIES.map((query) => ({
      id: query.id,
      sql: normalizedSql(query.sql),
    })),
  )).digest("hex");
}

function requireDeploymentId(value: string): string {
  const normalized = value.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized)) {
    throw new Error("p12_2_l10_19_b_apply_deployment_id_invalid");
  }
  return normalized;
}

export function p122L1019BAuthorizationFingerprint(applyDeploymentId: string): string {
  const deploymentId = requireDeploymentId(applyDeploymentId);
  return createHash("sha256").update(JSON.stringify({
    version: P12_2_L10_19_B_VERSION,
    projectId: P12_2_L10_19_A_PROJECT_ID,
    environmentId: P12_2_L10_19_A_ENVIRONMENT_ID,
    postgresServiceId: P12_2_L10_19_A_POSTGRES_SERVICE_ID,
    migrationApplyDeploymentId: deploymentId,
    packetFingerprint: P12_2_L10_19_A_PACKET_FINGERPRINT,
    runId: P12_2_L10_19_A_RUN_ID,
    querySetFingerprint: p122L1019BQuerySetFingerprint(),
    expectedTableCount: P12_2_L10_19_A_EXPECTED_POST_TABLE_COUNT,
    newTablesMustBeEmpty: true,
    sessionReadOnly: true,
    attempts: 1,
    retries: 0,
    fallback: false,
  })).digest("hex");
}

export function p122L1019BAuthorizationLiteral(applyDeploymentId: string): string {
  return `AUTHORIZE:P12_2_L10_19_0011_POST_APPLY_READ_ONLY:${p122L1019BAuthorizationFingerprint(applyDeploymentId)}`;
}
