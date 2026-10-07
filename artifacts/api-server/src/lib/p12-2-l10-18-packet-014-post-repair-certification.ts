import { createHash } from "node:crypto";
import {
  P12_2_L10_18_ENVIRONMENT_ID,
  P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT,
  P12_2_L10_18_FAILURE_CHECKPOINT_FINGERPRINT,
  P12_2_L10_18_FAILURE_CHECKPOINT_REVISION,
  P12_2_L10_18_FAILURE_EVENT_FINGERPRINT,
  P12_2_L10_18_FAILURE_URL,
  P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT,
  P12_2_L10_18_FINAL_CHECKPOINT_REVISION,
  P12_2_L10_18_INVENTORY_FINGERPRINT,
  P12_2_L10_18_POSTGRES_SERVICE_ID,
  P12_2_L10_18_PROJECT_ID,
  P12_2_L10_18_VERSION,
  buildP122L1018AccountingReceipt,
  buildP122L1018CompactFinalizationSnapshot,
  buildP122L1018L2Receipt,
} from "./p12-2-l10-18-packet-014-finalization-repair.js";
import {
  P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
  P12_2_L10_15_OBSERVED_AT,
  P12_2_L10_15_RUN_ID,
} from "./p12-2-l10-15-packet-014-full-initial.js";
import { DIAMOND_SHELF_CANONICAL_ORIGIN } from "./first-party-crawl-runtime-bridge.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";

export const P12_2_L10_18_POST_REPAIR_CERT_VERSION =
  "p12-2-l10-18-packet-014-post-repair-readonly-cert-v1" as const;

export type P122L1018PostRepairQuery = {
  id:
    | "database_identity"
    | "invocation_finalization"
    | "checkpoint_preservation"
    | "terminal_failure_preservation"
    | "compact_accounting_snapshot"
    | "completed_run_absence"
    | "recovery_receipt_absence"
    | "compact_semantics"
    | "terminal_outcome_classification"
    | "terminal_outcome_guard";
  sql: string;
};

const SNAPSHOT = buildP122L1018CompactFinalizationSnapshot();
const ACCOUNTING_RECEIPT = buildP122L1018AccountingReceipt(SNAPSHOT);
const L2_RECEIPT = buildP122L1018L2Receipt(ACCOUNTING_RECEIPT);

const FINALIZED_OUTCOME = `
  (
    SELECT count(*)
    FROM first_party_crawl_l2_invocations i
    WHERE i.packet_fingerprint='${P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT}'
      AND i.site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
      AND i.phase='full_initial'
      AND i.run_id='${P12_2_L10_15_RUN_ID}'
      AND i.canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'
      AND i.observed_at='${P12_2_L10_15_OBSERVED_AT}'::timestamptz
      AND i.status='completed'
      AND i.receipt_fingerprint='${L2_RECEIPT.fingerprint}'
      AND i.receipt_payload->>'fingerprint'='${L2_RECEIPT.fingerprint}'
      AND i.receipt_payload->>'invocationAttempt'='1'
      AND i.receipt_payload->>'automaticRetryPerformed'='false'
      AND i.receipt_payload->'result'->>'status'='accounting_complete_uncertified'
      AND i.receipt_payload->'result'->>'checkpointFingerprint'='${P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT}'
      AND (i.receipt_payload->'result'->>'checkpointRevision')::bigint=${P12_2_L10_18_FINAL_CHECKPOINT_REVISION}
      AND i.receipt_payload->'result'->>'accountingSnapshotFingerprint'='${SNAPSHOT.fingerprint}'
      AND (i.receipt_payload->'result'->>'terminalFailures')::integer=1
      AND i.receipt_payload->'result'->>'receiptFingerprint'='${ACCOUNTING_RECEIPT.fingerprint}'
  )=1
  AND (
    SELECT count(*)
    FROM first_party_crawl_checkpoints c
    WHERE c.site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
      AND c.run_id='${P12_2_L10_15_RUN_ID}'
      AND c.canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'
      AND c.execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}'
      AND c.checkpoint_fingerprint='${P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT}'
      AND c.checkpoint_revision=${P12_2_L10_18_FINAL_CHECKPOINT_REVISION}
      AND c.checkpoint_payload->>'fingerprint'=c.checkpoint_fingerprint
      AND c.checkpoint_payload->>'planFingerprint'=c.execution_plan_fingerprint
      AND c.checkpoint_payload->>'inventoryFingerprint'='${P12_2_L10_18_INVENTORY_FINGERPRINT}'
      AND c.checkpoint_payload->>'status'='completed'
      AND jsonb_array_length(c.checkpoint_payload->'pendingCanonicalUrls')=0
      AND (c.checkpoint_payload->'progress'->>'totalUrls')::integer=3044
      AND (c.checkpoint_payload->'progress'->>'finalizedUrls')::integer=3044
      AND (c.checkpoint_payload->'progress'->>'pendingUrls')::integer=0
      AND (c.checkpoint_payload->'progress'->>'completedBatches')::integer=305
      AND (c.checkpoint_payload->'progress'->>'totalBatches')::integer=305
      AND (c.checkpoint_payload->'counters'->>'fetchedSuccessful')::integer=3043
      AND (c.checkpoint_payload->'counters'->>'terminalFailures')::integer=1
  )=1
  AND (
    SELECT count(*)
    FROM first_party_crawl_terminal_failure_events e
    WHERE e.site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
      AND e.run_id='${P12_2_L10_15_RUN_ID}'
      AND e.canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'
      AND e.execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}'
      AND e.canonical_url='${P12_2_L10_18_FAILURE_URL}'
      AND e.event_type='terminal_failure'
      AND e.source_event_fingerprint IS NULL
      AND e.checkpoint_fingerprint='${P12_2_L10_18_FAILURE_CHECKPOINT_FINGERPRINT}'
      AND e.checkpoint_revision=${P12_2_L10_18_FAILURE_CHECKPOINT_REVISION}
      AND e.event_fingerprint='${P12_2_L10_18_FAILURE_EVENT_FINGERPRINT}'
      AND e.event_payload->>'fingerprint'=e.event_fingerprint
  )=1
  AND (
    SELECT count(*)
    FROM first_party_crawl_accounting_snapshots a
    WHERE a.site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
      AND a.run_id='${P12_2_L10_15_RUN_ID}'
      AND a.canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'
      AND a.execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}'
      AND a.checkpoint_fingerprint='${P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT}'
      AND a.checkpoint_revision=${P12_2_L10_18_FINAL_CHECKPOINT_REVISION}
      AND a.snapshot_fingerprint='${SNAPSHOT.fingerprint}'
      AND a.whole_site_certified=false
      AND a.terminal_failure_count=1
      AND a.snapshot_payload->>'version'='${P12_2_L10_18_VERSION}'
      AND a.snapshot_payload->>'kind'='packet_014_compact_accounting_finalization'
      AND a.snapshot_payload->>'fingerprint'=a.snapshot_fingerprint
      AND a.snapshot_payload->>'executionPlanFingerprint'=a.execution_plan_fingerprint
      AND a.snapshot_payload->>'inventoryFingerprint'='${P12_2_L10_18_INVENTORY_FINGERPRINT}'
      AND a.snapshot_payload->'checkpoint'->>'fingerprint'=a.checkpoint_fingerprint
      AND (a.snapshot_payload->'checkpoint'->>'sequence')::bigint=a.checkpoint_revision
      AND a.snapshot_payload->'checkpoint'->>'status'='completed'
      AND (a.snapshot_payload->'checkpoint'->'counters'->>'terminalFailures')::integer=1
      AND a.snapshot_payload->'certification'->'certification'->>'wholeSiteCertified'='false'
      AND a.snapshot_payload->'certification'->'certification'->>'wholeSiteReason'='blocked'
      AND a.snapshot_payload->'reconstruction'->>'fullBridgeSnapshotReconstructed'='false'
      AND a.snapshot_payload->'reconstruction'->>'noNetworkRefetch'='true'
      AND a.snapshot_payload->'reconstruction'->>'noCrawlReplay'='true'
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

export const P12_2_L10_18_POST_REPAIR_QUERIES: readonly P122L1018PostRepairQuery[] = Object.freeze([
  {
    id: "database_identity",
    sql: "SELECT current_database() AS database_name, current_user AS database_user, current_setting('server_version') AS server_version",
  },
  {
    id: "invocation_finalization",
    sql: `SELECT status, receipt_fingerprint,
      receipt_payload->>'fingerprint' AS payload_fingerprint,
      receipt_payload->'result'->>'status' AS result_status,
      receipt_payload->'result'->>'accountingSnapshotFingerprint' AS accounting_snapshot_fingerprint,
      receipt_payload->'result'->>'receiptFingerprint' AS accounting_receipt_fingerprint
      FROM first_party_crawl_l2_invocations
      WHERE packet_fingerprint='${P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT}'
        AND site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_15_RUN_ID}'
        AND canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'`,
  },
  {
    id: "checkpoint_preservation",
    sql: `SELECT execution_plan_fingerprint, checkpoint_fingerprint, checkpoint_revision,
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
    id: "terminal_failure_preservation",
    sql: `SELECT canonical_url, event_type, source_event_fingerprint,
      checkpoint_fingerprint, checkpoint_revision, event_fingerprint
      FROM first_party_crawl_terminal_failure_events
      WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_15_RUN_ID}'
        AND execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}'
      ORDER BY event_id`,
  },
  {
    id: "compact_accounting_snapshot",
    sql: `SELECT checkpoint_fingerprint, checkpoint_revision, snapshot_fingerprint,
      whole_site_certified, terminal_failure_count,
      snapshot_payload->>'version' AS snapshot_version,
      snapshot_payload->>'kind' AS snapshot_kind,
      snapshot_payload->'reconstruction'->>'fullBridgeSnapshotReconstructed' AS full_snapshot_reconstructed,
      snapshot_payload->'reconstruction'->>'noNetworkRefetch' AS no_network_refetch,
      snapshot_payload->'reconstruction'->>'noCrawlReplay' AS no_crawl_replay
      FROM first_party_crawl_accounting_snapshots
      WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_15_RUN_ID}'
        AND execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}'`,
  },
  {
    id: "completed_run_absence",
    sql: `SELECT count(*) AS completed_run_count
      FROM first_party_crawl_completed_runs
      WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_15_RUN_ID}'
        AND canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'`,
  },
  {
    id: "recovery_receipt_absence",
    sql: `SELECT count(*) AS recovery_receipt_count
      FROM first_party_crawl_terminal_failure_recovery_receipts
      WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_15_RUN_ID}'
        AND canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'`,
  },
  {
    id: "compact_semantics",
    sql: `SELECT
      '${SNAPSHOT.fingerprint}' AS expected_snapshot_fingerprint,
      '${ACCOUNTING_RECEIPT.fingerprint}' AS expected_accounting_receipt_fingerprint,
      '${L2_RECEIPT.fingerprint}' AS expected_l2_receipt_fingerprint,
      '${P12_2_L10_18_FAILURE_URL}' AS durable_failed_url,
      '${P12_2_L10_18_FAILURE_EVENT_FINGERPRINT}' AS durable_failure_event_fingerprint`,
  },
  {
    id: "terminal_outcome_classification",
    sql: `SELECT CASE WHEN ${FINALIZED_OUTCOME}
      THEN 'accounting_complete_uncertified_compact_finalized'
      ELSE 'invalid_or_partial_repair'
      END AS packet_014_post_repair_outcome`,
  },
  {
    id: "terminal_outcome_guard",
    sql: `SELECT 1 / CASE WHEN ${FINALIZED_OUTCOME} THEN 1 ELSE 0 END AS terminal_outcome_guard`,
  },
]);

const FORBIDDEN_SQL =
  /\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|comment|vacuum|analyze|refresh|reindex|cluster|copy|call|do|execute|prepare|deallocate|listen|notify|lock)\b/i;

function normalizedSql(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function assertP122L1018PostRepairQueryContract(): void {
  if (P12_2_L10_18_POST_REPAIR_QUERIES.length !== 10) {
    throw new Error("p12_2_l10_18_post_repair_query_count_invalid");
  }
  const ids = P12_2_L10_18_POST_REPAIR_QUERIES.map((query) => query.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("p12_2_l10_18_post_repair_query_id_duplicate");
  }
  for (const query of P12_2_L10_18_POST_REPAIR_QUERIES) {
    const sql = normalizedSql(query.sql);
    if (!/^SELECT\b/i.test(sql)) throw new Error("p12_2_l10_18_post_repair_non_select_forbidden");
    if (FORBIDDEN_SQL.test(sql)) throw new Error("p12_2_l10_18_post_repair_mutation_keyword_forbidden");
    if (sql.includes(";")) throw new Error("p12_2_l10_18_post_repair_multi_statement_forbidden");
  }
}

export function p122L1018PostRepairQuerySetFingerprint(): string {
  assertP122L1018PostRepairQueryContract();
  return createHash("sha256")
    .update(JSON.stringify(P12_2_L10_18_POST_REPAIR_QUERIES.map((query) => ({
      id: query.id,
      sql: normalizedSql(query.sql),
    }))))
    .digest("hex");
}

function requireDeploymentId(value: string): string {
  const normalized = value.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(normalized)) {
    throw new Error("p12_2_l10_18_repair_deployment_id_invalid");
  }
  return normalized;
}

export function p122L1018PostRepairAuthorizationFingerprint(repairDeploymentId: string): string {
  const deploymentId = requireDeploymentId(repairDeploymentId);
  return createHash("sha256").update(JSON.stringify({
    version: P12_2_L10_18_POST_REPAIR_CERT_VERSION,
    projectId: P12_2_L10_18_PROJECT_ID,
    environmentId: P12_2_L10_18_ENVIRONMENT_ID,
    postgresServiceId: P12_2_L10_18_POSTGRES_SERVICE_ID,
    repairVersion: P12_2_L10_18_VERSION,
    repairDeploymentId: deploymentId,
    packetFingerprint: P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
    runId: P12_2_L10_15_RUN_ID,
    executionPlanFingerprint: P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT,
    checkpointFingerprint: P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT,
    checkpointRevision: P12_2_L10_18_FINAL_CHECKPOINT_REVISION,
    failureUrl: P12_2_L10_18_FAILURE_URL,
    failureEventFingerprint: P12_2_L10_18_FAILURE_EVENT_FINGERPRINT,
    expectedSnapshotFingerprint: SNAPSHOT.fingerprint,
    expectedAccountingReceiptFingerprint: ACCOUNTING_RECEIPT.fingerprint,
    expectedL2ReceiptFingerprint: L2_RECEIPT.fingerprint,
    querySetFingerprint: p122L1018PostRepairQuerySetFingerprint(),
    attempts: 1,
    retries: 0,
    fallback: false,
    sessionReadOnly: true,
    networkRequests: false,
    recoveryExecution: false,
  })).digest("hex");
}

export function p122L1018PostRepairAuthorizationLiteral(repairDeploymentId: string): string {
  return `AUTHORIZE:P12_2_L10_18_PACKET_014_POST_REPAIR_READ_ONLY:${p122L1018PostRepairAuthorizationFingerprint(repairDeploymentId)}`;
}

export function p122L1018PostRepairCapability() {
  return Object.freeze({
    version: P12_2_L10_18_POST_REPAIR_CERT_VERSION,
    queryCount: P12_2_L10_18_POST_REPAIR_QUERIES.length,
    querySetFingerprint: p122L1018PostRepairQuerySetFingerprint(),
    expectedSnapshotFingerprint: SNAPSHOT.fingerprint,
    expectedAccountingReceiptFingerprint: ACCOUNTING_RECEIPT.fingerprint,
    expectedL2ReceiptFingerprint: L2_RECEIPT.fingerprint,
    sessionReadOnly: true,
    networkRequests: false,
    crawlExecution: false,
    recoveryExecution: false,
    databaseMutation: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
  } as const);
}
