import { createHash } from "node:crypto";
import {
  P12_2_L10_19_A_ACCOUNTING_SNAPSHOT_FINGERPRINT,
  P12_2_L10_19_A_CHECKPOINT_FINGERPRINT,
  P12_2_L10_19_A_CHECKPOINT_REVISION,
  P12_2_L10_19_A_ENVIRONMENT_ID,
  P12_2_L10_19_A_EXECUTION_PLAN_FINGERPRINT,
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
import {
  P12_2_L10_19_RECONCILIATION_VERSION,
  P12_2_L10_19_VERSION,
} from "./p12-2-l10-19-packet-014-expected-absence-disposition.js";

export const P12_2_L10_19_C_VERSION =
  "p12-2-l10-19-c-packet-014-post-disposition-readonly-cert-v1" as const;

const VERIFIER_IMAGE_PREFIX =
  "ghcr.io/intssere/seo-engine-p12-2-l10-19-packet-014-expected-absence-disposition@sha256:";
const HEX64 = /^[0-9a-f]{64}$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireVerifierImage(value: string): string {
  const normalized = value.trim();
  if (
    !normalized.startsWith(VERIFIER_IMAGE_PREFIX) ||
    !HEX64.test(normalized.slice(VERIFIER_IMAGE_PREFIX.length))
  ) throw new Error("p12_2_l10_19_c_verifier_image_invalid");
  return normalized;
}

function requireDeploymentId(value: string): string {
  const normalized = value.trim();
  if (!UUID.test(normalized)) throw new Error("p12_2_l10_19_c_disposition_deployment_id_invalid");
  return normalized;
}

export type P122L1019CQuery = {
  id:
    | "database_identity"
    | "disposition_identity"
    | "reconciliation_identity"
    | "historical_checkpoint_preserved"
    | "historical_failure_preserved"
    | "historical_accounting_preserved"
    | "l2_finalization_preserved"
    | "completion_recovery_absence"
    | "terminal_classification"
    | "terminal_guard";
  sql: string;
};

function validState(dispositionDeploymentId: string, verifierImage: string): string {
  return `
    (
      SELECT count(*)
      FROM first_party_crawl_terminal_failure_dispositions d
      WHERE d.site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
        AND d.run_id='${P12_2_L10_19_A_RUN_ID}'
        AND d.canonical_origin='${P12_2_L10_19_A_ORIGIN}'
        AND d.execution_plan_fingerprint='${P12_2_L10_19_A_EXECUTION_PLAN_FINGERPRINT}'
        AND d.source_event_fingerprint='${P12_2_L10_19_A_FAILURE_EVENT_FINGERPRINT}'
        AND d.canonical_url='${P12_2_L10_19_A_FAILURE_URL}'
        AND d.absence_http_status IN (404,410)
        AND d.verifier_image='${verifierImage}'
        AND d.verifier_deployment_id='${dispositionDeploymentId}'::uuid
        AND d.disposition_payload->>'version'='${P12_2_L10_19_VERSION}'
        AND d.disposition_payload->>'packetFingerprint'='${P12_2_L10_19_A_PACKET_FINGERPRINT}'
        AND d.disposition_payload->>'runId'='${P12_2_L10_19_A_RUN_ID}'
        AND d.disposition_payload->>'sourceEventFingerprint'='${P12_2_L10_19_A_FAILURE_EVENT_FINGERPRINT}'
        AND d.disposition_payload->>'canonicalUrl'='${P12_2_L10_19_A_FAILURE_URL}'
        AND d.disposition_payload->>'verifierImage'='${verifierImage}'
        AND d.disposition_payload->>'verifierDeploymentId'='${dispositionDeploymentId}'
        AND d.disposition_payload->>'fingerprint'=d.disposition_fingerprint
        AND (d.disposition_payload->>'historicalAbsenceHttpStatus')::integer IN (404,410)
        AND (d.disposition_payload->>'currentAbsenceHttpStatus')::integer=d.absence_http_status
        AND d.disposition_payload->>'freshInventoryFingerprint'=d.fresh_inventory_fingerprint
        AND (d.disposition_payload->>'presentInFreshInventory')::boolean=d.present_in_fresh_inventory
        AND d.disposition_payload->>'dispositionType'=d.disposition_type
        AND (
          (d.disposition_type='stale_inventory_absence' AND d.present_in_fresh_inventory=false)
          OR
          (d.disposition_type='sitemap_orphan_absence' AND d.present_in_fresh_inventory=true)
        )
        AND d.disposition_payload->'evidence'->>'historicalTerminalFailurePreserved'='true'
        AND d.disposition_payload->'evidence'->>'finalCheckpointPreserved'='true'
        AND d.disposition_payload->'evidence'->>'currentUrlReadMethod'='GET'
        AND d.disposition_payload->'evidence'->>'freshSitemapReadOnly'='true'
        AND d.disposition_payload->'evidence'->>'rawResponseBodyPersisted'='false'
        AND d.disposition_payload->'evidence'->>'rawSitemapXmlPersisted'='false'
        AND d.disposition_payload->'evidence'->>'pageContentPersisted'='false'
        AND d.disposition_payload->'evidence'->>'crawlReplayPerformed'='false'
        AND d.disposition_payload->'evidence'->>'recoveryExecutionPerformed'='false'
        AND d.disposition_payload->'evidence'->>'providerWrites'='false'
        AND d.disposition_payload->'evidence'->>'publicSiteWrites'='false'
    )=1
    AND (
      SELECT count(*)
      FROM first_party_crawl_terminal_failure_reconciliation_receipts r
      JOIN first_party_crawl_terminal_failure_dispositions d
        ON d.disposition_fingerprint=r.disposition_fingerprint
      WHERE r.site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
        AND r.run_id='${P12_2_L10_19_A_RUN_ID}'
        AND r.canonical_origin='${P12_2_L10_19_A_ORIGIN}'
        AND r.execution_plan_fingerprint='${P12_2_L10_19_A_EXECUTION_PLAN_FINGERPRINT}'
        AND r.source_accounting_snapshot_fingerprint='${P12_2_L10_19_A_ACCOUNTING_SNAPSHOT_FINGERPRINT}'
        AND r.raw_terminal_failure_count=1
        AND r.expected_absence_count=1
        AND r.effective_unresolved_terminal_failure_count=0
        AND r.status='certified_with_expected_absence'
        AND r.receipt_payload->>'version'='${P12_2_L10_19_RECONCILIATION_VERSION}'
        AND r.receipt_payload->>'packetFingerprint'='${P12_2_L10_19_A_PACKET_FINGERPRINT}'
        AND r.receipt_payload->>'sourceEventFingerprint'='${P12_2_L10_19_A_FAILURE_EVENT_FINGERPRINT}'
        AND r.receipt_payload->>'sourceAccountingSnapshotFingerprint'='${P12_2_L10_19_A_ACCOUNTING_SNAPSHOT_FINGERPRINT}'
        AND r.receipt_payload->>'dispositionFingerprint'=r.disposition_fingerprint
        AND r.receipt_payload->>'fingerprint'=r.receipt_fingerprint
        AND (r.receipt_payload->>'rawTerminalFailureCount')::integer=1
        AND (r.receipt_payload->>'expectedAbsenceCount')::integer=1
        AND (r.receipt_payload->>'effectiveUnresolvedTerminalFailureCount')::integer=0
        AND r.receipt_payload->>'status'='certified_with_expected_absence'
        AND r.receipt_payload->>'legacyWholeSiteCertified'='false'
        AND r.receipt_payload->>'completedRunPersisted'='false'
        AND r.receipt_payload->>'recoveryReceiptPersisted'='false'
        AND d.verifier_deployment_id='${dispositionDeploymentId}'::uuid
        AND d.verifier_image='${verifierImage}'
    )=1
    AND EXISTS (
      SELECT 1 FROM first_party_crawl_checkpoints
      WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_19_A_RUN_ID}'
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
    AND EXISTS (
      SELECT 1 FROM first_party_crawl_l2_invocations
      WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
        AND packet_fingerprint='${P12_2_L10_19_A_PACKET_FINGERPRINT}'
        AND run_id='${P12_2_L10_19_A_RUN_ID}'
        AND status='completed'
        AND receipt_fingerprint='${P12_2_L10_19_A_L2_RECEIPT_FINGERPRINT}'
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
}

export function buildP122L1019CQueries(input: {
  dispositionDeploymentId: string;
  verifierImage: string;
}): readonly P122L1019CQuery[] {
  const dispositionDeploymentId = requireDeploymentId(input.dispositionDeploymentId);
  const verifierImage = requireVerifierImage(input.verifierImage);
  const valid = validState(dispositionDeploymentId, verifierImage);
  return Object.freeze([
    {
      id: "database_identity",
      sql: "SELECT current_database() AS database_name, current_user AS database_user, current_setting('server_version') AS server_version",
    },
    {
      id: "disposition_identity",
      sql: `SELECT disposition_type, absence_http_status, fresh_inventory_fingerprint,
        present_in_fresh_inventory, verifier_image, verifier_deployment_id::text,
        disposition_fingerprint
        FROM first_party_crawl_terminal_failure_dispositions
        WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_19_A_RUN_ID}'
          AND source_event_fingerprint='${P12_2_L10_19_A_FAILURE_EVENT_FINGERPRINT}'`,
    },
    {
      id: "reconciliation_identity",
      sql: `SELECT status, raw_terminal_failure_count, expected_absence_count,
        effective_unresolved_terminal_failure_count,
        disposition_fingerprint, receipt_fingerprint
        FROM first_party_crawl_terminal_failure_reconciliation_receipts
        WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_19_A_RUN_ID}'`,
    },
    {
      id: "historical_checkpoint_preserved",
      sql: `SELECT checkpoint_fingerprint, checkpoint_revision,
        checkpoint_payload->>'status' AS status,
        checkpoint_payload->'counters'->>'terminalFailures' AS terminal_failures
        FROM first_party_crawl_checkpoints
        WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_19_A_RUN_ID}'
          AND execution_plan_fingerprint='${P12_2_L10_19_A_EXECUTION_PLAN_FINGERPRINT}'`,
    },
    {
      id: "historical_failure_preserved",
      sql: `SELECT canonical_url, event_type, source_event_fingerprint, event_fingerprint
        FROM first_party_crawl_terminal_failure_events
        WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_19_A_RUN_ID}'
          AND execution_plan_fingerprint='${P12_2_L10_19_A_EXECUTION_PLAN_FINGERPRINT}'`,
    },
    {
      id: "historical_accounting_preserved",
      sql: `SELECT snapshot_fingerprint, whole_site_certified, terminal_failure_count
        FROM first_party_crawl_accounting_snapshots
        WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_19_A_RUN_ID}'
          AND execution_plan_fingerprint='${P12_2_L10_19_A_EXECUTION_PLAN_FINGERPRINT}'`,
    },
    {
      id: "l2_finalization_preserved",
      sql: `SELECT status, receipt_fingerprint
        FROM first_party_crawl_l2_invocations
        WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
          AND packet_fingerprint='${P12_2_L10_19_A_PACKET_FINGERPRINT}'
          AND run_id='${P12_2_L10_19_A_RUN_ID}'`,
    },
    {
      id: "completion_recovery_absence",
      sql: `SELECT
        (SELECT count(*)::int FROM first_party_crawl_completed_runs WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid AND run_id='${P12_2_L10_19_A_RUN_ID}') AS completed_run_count,
        (SELECT count(*)::int FROM first_party_crawl_terminal_failure_recovery_receipts WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid AND run_id='${P12_2_L10_19_A_RUN_ID}') AS recovery_receipt_count`,
    },
    {
      id: "terminal_classification",
      sql: `SELECT CASE WHEN ${valid}
        THEN 'certified_with_expected_absence'
        ELSE 'invalid_or_partial_disposition'
        END AS packet_014_disposition_outcome`,
    },
    {
      id: "terminal_guard",
      sql: `SELECT 1 / CASE WHEN ${valid} THEN 1 ELSE 0 END AS terminal_guard`,
    },
  ]);
}

const FORBIDDEN_SQL =
  /\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|comment|vacuum|analyze|refresh|reindex|cluster|copy|call|do|execute|prepare|deallocate|listen|notify|lock)\b/i;

function normalizedSql(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function assertP122L1019CQueryContract(queries: readonly P122L1019CQuery[]): void {
  if (queries.length !== 10) throw new Error("p12_2_l10_19_c_query_count_invalid");
  const ids = queries.map((query) => query.id);
  if (new Set(ids).size !== ids.length) throw new Error("p12_2_l10_19_c_query_id_duplicate");
  for (const query of queries) {
    const sql = normalizedSql(query.sql);
    if (!/^SELECT\b/i.test(sql)) throw new Error("p12_2_l10_19_c_non_select_forbidden");
    if (FORBIDDEN_SQL.test(sql)) throw new Error("p12_2_l10_19_c_mutation_keyword_forbidden");
    if (sql.includes(";")) throw new Error("p12_2_l10_19_c_multi_statement_forbidden");
  }
}

export function p122L1019CQuerySetFingerprint(input: {
  dispositionDeploymentId: string;
  verifierImage: string;
}): string {
  const queries = buildP122L1019CQueries(input);
  assertP122L1019CQueryContract(queries);
  return createHash("sha256").update(JSON.stringify(
    queries.map((query) => ({ id: query.id, sql: normalizedSql(query.sql) })),
  )).digest("hex");
}

export function p122L1019CAuthorizationFingerprint(input: {
  dispositionDeploymentId: string;
  verifierImage: string;
}): string {
  const dispositionDeploymentId = requireDeploymentId(input.dispositionDeploymentId);
  const verifierImage = requireVerifierImage(input.verifierImage);
  return createHash("sha256").update(JSON.stringify({
    version: P12_2_L10_19_C_VERSION,
    projectId: P12_2_L10_19_A_PROJECT_ID,
    environmentId: P12_2_L10_19_A_ENVIRONMENT_ID,
    postgresServiceId: P12_2_L10_19_A_POSTGRES_SERVICE_ID,
    dispositionDeploymentId,
    verifierImage,
    packetFingerprint: P12_2_L10_19_A_PACKET_FINGERPRINT,
    runId: P12_2_L10_19_A_RUN_ID,
    querySetFingerprint: p122L1019CQuerySetFingerprint({
      dispositionDeploymentId,
      verifierImage,
    }),
    allowedOutcome: "certified_with_expected_absence",
    sessionReadOnly: true,
    attempts: 1,
    retries: 0,
    fallback: false,
    recoveryExecution: false,
    crawlExecution: false,
  })).digest("hex");
}

export function p122L1019CAuthorizationLiteral(input: {
  dispositionDeploymentId: string;
  verifierImage: string;
}): string {
  return `AUTHORIZE:P12_2_L10_19_PACKET_014_POST_DISPOSITION_READ_ONLY:${p122L1019CAuthorizationFingerprint(input)}`;
}
