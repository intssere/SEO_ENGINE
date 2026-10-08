import { createHash } from "node:crypto";
import {
  P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
  P12_2_L10_15_RUN_ID,
} from "./p12-2-l10-15-packet-014-full-initial.js";
import {
  P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT,
  P12_2_L10_18_FAILURE_EVENT_FINGERPRINT,
  P12_2_L10_18_FAILURE_URL,
  P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT,
  P12_2_L10_18_FINAL_CHECKPOINT_REVISION,
  buildP122L1018CompactFinalizationSnapshot,
  buildP122L1018L2Receipt,
} from "./p12-2-l10-18-packet-014-finalization-repair.js";
import {
  P12_2_L10_19_ENVIRONMENT_ID,
  P12_2_L10_19_POSTGRES_SERVICE_ID,
  P12_2_L10_19_PROJECT_ID,
  P12_2_L10_19_VERSION,
} from "./p12-2-l10-19-packet-014-expected-absence-disposition.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";
import { DIAMOND_SHELF_CANONICAL_ORIGIN } from "./first-party-crawl-runtime-bridge.js";

export const P12_2_L10_19_C_VERSION =
  "p12-2-l10-19-c-packet-014-post-disposition-readonly-cert-v1" as const;
export const P12_2_L10_19_C_SOURCE_ACCOUNTING_SNAPSHOT_FINGERPRINT =
  buildP122L1018CompactFinalizationSnapshot().fingerprint;
export const P12_2_L10_19_C_SOURCE_L2_RECEIPT_FINGERPRINT =
  buildP122L1018L2Receipt().fingerprint;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMAGE =
  /^ghcr\.io\/intssere\/seo-engine-p12-2-l10-19-packet-014-expected-absence-disposition@sha256:[0-9a-f]{64}$/;

function requireDeploymentId(value: string): string {
  const normalized = value.trim();
  if (!UUID.test(normalized)) throw new Error("p12_2_l10_19_c_disposition_deployment_id_invalid");
  return normalized;
}

function requireVerifierImage(value: string): string {
  const normalized = value.trim();
  if (!IMAGE.test(normalized)) throw new Error("p12_2_l10_19_c_verifier_image_invalid");
  return normalized;
}

export type P122L1019CQuery = {
  id:
    | "database_identity"
    | "schema_shape"
    | "disposition_receipt"
    | "reconciliation_receipt"
    | "historical_event_preserved"
    | "checkpoint_preserved"
    | "accounting_l2_preserved"
    | "completion_recovery_absence"
    | "effective_terminal_state"
    | "terminal_guard";
  sql: string;
};

export function buildP122L1019CQueries(
  dispositionDeploymentId: string,
  verifierImage: string,
): readonly P122L1019CQuery[] {
  const deploymentId = requireDeploymentId(dispositionDeploymentId);
  const image = requireVerifierImage(verifierImage);

  const dispositionPredicate = `
    d.site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
    AND d.run_id='${P12_2_L10_15_RUN_ID}'
    AND d.canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'
    AND d.execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}'
    AND d.source_event_fingerprint='${P12_2_L10_18_FAILURE_EVENT_FINGERPRINT}'
    AND d.canonical_url='${P12_2_L10_18_FAILURE_URL}'
    AND d.disposition_type IN ('stale_inventory_absence','sitemap_orphan_absence')
    AND d.absence_http_status IN (404,410)
    AND d.verifier_image='${image}'
    AND d.verifier_deployment_id='${deploymentId}'::uuid
    AND d.disposition_payload->>'fingerprint'=d.disposition_fingerprint
    AND d.disposition_payload->>'sourceEventFingerprint'=d.source_event_fingerprint
    AND d.disposition_payload->>'canonicalUrl'=d.canonical_url
    AND (d.disposition_payload->>'historicalAbsenceHttpStatus')::integer IN (404,410)
    AND (d.disposition_payload->>'currentAbsenceHttpStatus')::integer=d.absence_http_status
    AND d.disposition_payload->>'verifierImage'=d.verifier_image
    AND d.disposition_payload->>'verifierDeploymentId'=d.verifier_deployment_id::text
    AND (
      (d.disposition_type='stale_inventory_absence' AND d.present_in_fresh_inventory=false)
      OR
      (d.disposition_type='sitemap_orphan_absence' AND d.present_in_fresh_inventory=true)
    )
  `;

  const reconciliationPredicate = `
    r.site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
    AND r.run_id='${P12_2_L10_15_RUN_ID}'
    AND r.canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'
    AND r.execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}'
    AND r.source_accounting_snapshot_fingerprint='${P12_2_L10_19_C_SOURCE_ACCOUNTING_SNAPSHOT_FINGERPRINT}'
    AND r.raw_terminal_failure_count=1
    AND r.expected_absence_count=1
    AND r.effective_unresolved_terminal_failure_count=0
    AND r.status='certified_with_expected_absence'
    AND r.receipt_payload->>'fingerprint'=r.receipt_fingerprint
    AND r.receipt_payload->>'status'='certified_with_expected_absence'
    AND (r.receipt_payload->>'rawTerminalFailureCount')::integer=1
    AND (r.receipt_payload->>'expectedAbsenceCount')::integer=1
    AND (r.receipt_payload->>'effectiveUnresolvedTerminalFailureCount')::integer=0
    AND r.receipt_payload->>'legacyWholeSiteCertified'='false'
    AND r.receipt_payload->>'completedRunPersisted'='false'
    AND r.receipt_payload->>'recoveryReceiptPersisted'='false'
  `;

  const historicalPredicate = `
    e.site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
    AND e.run_id='${P12_2_L10_15_RUN_ID}'
    AND e.canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'
    AND e.execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}'
    AND e.canonical_url='${P12_2_L10_18_FAILURE_URL}'
    AND e.event_type='terminal_failure'
    AND e.source_event_fingerprint IS NULL
    AND e.event_fingerprint='${P12_2_L10_18_FAILURE_EVENT_FINGERPRINT}'
    AND e.event_payload->>'fingerprint'=e.event_fingerprint
    AND e.event_payload->>'decisionReason'='permanent_http'
    AND e.event_payload->'outcome'->>'kind'='failure'
    AND e.event_payload->'outcome'->'signal'->>'kind'='http_status'
    AND (e.event_payload->'outcome'->'signal'->>'httpStatus')::integer IN (404,410)
  `;

  const terminalState = `
    (SELECT count(*) FROM information_schema.tables
      WHERE table_schema='public' AND table_type='BASE TABLE')=43
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public'
        AND table_name IN (
          'policy_mutation_reservations','policy_mutation_control_state','policy_mutation_control_events',
          'policy_mutation_claims','policy_mutation_dispatches','policy_mutation_dispatch_events'
        )
    )
    AND (SELECT count(*) FROM first_party_crawl_terminal_failure_dispositions d WHERE ${dispositionPredicate})=1
    AND (
      SELECT count(*)
      FROM first_party_crawl_terminal_failure_reconciliation_receipts r
      JOIN first_party_crawl_terminal_failure_dispositions d
        ON d.disposition_fingerprint=r.disposition_fingerprint
      WHERE ${reconciliationPredicate} AND ${dispositionPredicate}
    )=1
    AND (SELECT count(*) FROM first_party_crawl_terminal_failure_events e WHERE ${historicalPredicate})=1
    AND (
      SELECT count(*) FROM first_party_crawl_checkpoints
      WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_15_RUN_ID}'
        AND canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'
        AND execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}'
        AND checkpoint_fingerprint='${P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT}'
        AND checkpoint_revision=${P12_2_L10_18_FINAL_CHECKPOINT_REVISION}
        AND checkpoint_payload->>'status'='completed'
        AND (checkpoint_payload->'counters'->>'terminalFailures')::integer=1
        AND (checkpoint_payload->'progress'->>'totalUrls')::integer=3044
        AND (checkpoint_payload->'progress'->>'finalizedUrls')::integer=3044
        AND (checkpoint_payload->'progress'->>'pendingUrls')::integer=0
    )=1
    AND (
      SELECT count(*) FROM first_party_crawl_accounting_snapshots
      WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_15_RUN_ID}'
        AND execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}'
        AND snapshot_fingerprint='${P12_2_L10_19_C_SOURCE_ACCOUNTING_SNAPSHOT_FINGERPRINT}'
        AND whole_site_certified=false
        AND terminal_failure_count=1
    )=1
    AND (
      SELECT count(*) FROM first_party_crawl_l2_invocations
      WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
        AND packet_fingerprint='${P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT}'
        AND run_id='${P12_2_L10_15_RUN_ID}'
        AND status='completed'
        AND receipt_fingerprint='${P12_2_L10_19_C_SOURCE_L2_RECEIPT_FINGERPRINT}'
    )=1
    AND (
      SELECT count(*) FROM first_party_crawl_completed_runs
      WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_15_RUN_ID}'
    )=0
    AND (
      SELECT count(*) FROM first_party_crawl_terminal_failure_recovery_receipts
      WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_15_RUN_ID}'
    )=0
  `;

  return Object.freeze([
    {
      id: "database_identity",
      sql: "SELECT current_database() AS database_name,current_user AS database_user,current_setting('server_version') AS server_version",
    },
    {
      id: "schema_shape",
      sql: `SELECT
        (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS table_count,
        (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('policy_mutation_reservations','policy_mutation_control_state','policy_mutation_control_events','policy_mutation_claims','policy_mutation_dispatches','policy_mutation_dispatch_events')) AS engineering_policy_table_count`,
    },
    {
      id: "disposition_receipt",
      sql: `SELECT disposition_type,absence_http_status,fresh_inventory_fingerprint,
        present_in_fresh_inventory,verifier_image,verifier_deployment_id::text,
        disposition_fingerprint
        FROM first_party_crawl_terminal_failure_dispositions d
        WHERE ${dispositionPredicate}`,
    },
    {
      id: "reconciliation_receipt",
      sql: `SELECT r.status,r.raw_terminal_failure_count,r.expected_absence_count,
        r.effective_unresolved_terminal_failure_count,r.receipt_fingerprint,
        r.disposition_fingerprint
        FROM first_party_crawl_terminal_failure_reconciliation_receipts r
        JOIN first_party_crawl_terminal_failure_dispositions d
          ON d.disposition_fingerprint=r.disposition_fingerprint
        WHERE ${reconciliationPredicate} AND ${dispositionPredicate}`,
    },
    {
      id: "historical_event_preserved",
      sql: `SELECT e.event_fingerprint,e.canonical_url,
        e.event_payload->>'decisionReason' AS decision_reason,
        e.event_payload->'outcome'->'signal'->>'httpStatus' AS historical_http_status
        FROM first_party_crawl_terminal_failure_events e
        WHERE ${historicalPredicate}`,
    },
    {
      id: "checkpoint_preserved",
      sql: `SELECT checkpoint_fingerprint,checkpoint_revision,
        checkpoint_payload->'counters'->>'terminalFailures' AS raw_terminal_failures,
        checkpoint_payload->'progress'->>'pendingUrls' AS pending_urls
        FROM first_party_crawl_checkpoints
        WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_15_RUN_ID}'
          AND execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}'`,
    },
    {
      id: "accounting_l2_preserved",
      sql: `SELECT
        (SELECT snapshot_fingerprint FROM first_party_crawl_accounting_snapshots WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid AND run_id='${P12_2_L10_15_RUN_ID}' AND execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}') AS accounting_snapshot_fingerprint,
        (SELECT receipt_fingerprint FROM first_party_crawl_l2_invocations WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid AND packet_fingerprint='${P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT}') AS l2_receipt_fingerprint`,
    },
    {
      id: "completion_recovery_absence",
      sql: `SELECT
        (SELECT count(*)::int FROM first_party_crawl_completed_runs WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid AND run_id='${P12_2_L10_15_RUN_ID}') AS completed_run_count,
        (SELECT count(*)::int FROM first_party_crawl_terminal_failure_recovery_receipts WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid AND run_id='${P12_2_L10_15_RUN_ID}') AS recovery_receipt_count`,
    },
    {
      id: "effective_terminal_state",
      sql: `SELECT CASE WHEN ${terminalState}
        THEN 'certified_with_expected_absence'
        ELSE 'invalid_or_partial_disposition'
        END AS packet_014_effective_terminal_state`,
    },
    {
      id: "terminal_guard",
      sql: `SELECT 1 / CASE WHEN ${terminalState} THEN 1 ELSE 0 END AS terminal_guard`,
    },
  ] satisfies readonly P122L1019CQuery[]);
}

const FORBIDDEN_SQL =
  /\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|comment|vacuum|analyze|refresh|reindex|cluster|copy|call|do|execute|prepare|deallocate|listen|notify|lock)\b/i;

function normalizedSql(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function assertP122L1019CQueryContract(
  dispositionDeploymentId: string,
  verifierImage: string,
): void {
  const queries = buildP122L1019CQueries(dispositionDeploymentId, verifierImage);
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

export function p122L1019CQuerySetFingerprint(
  dispositionDeploymentId: string,
  verifierImage: string,
): string {
  assertP122L1019CQueryContract(dispositionDeploymentId, verifierImage);
  return createHash("sha256").update(JSON.stringify(
    buildP122L1019CQueries(dispositionDeploymentId, verifierImage).map((query) => ({
      id: query.id,
      sql: normalizedSql(query.sql),
    })),
  )).digest("hex");
}

export function p122L1019CAuthorizationFingerprint(
  dispositionDeploymentId: string,
  verifierImage: string,
): string {
  const deploymentId = requireDeploymentId(dispositionDeploymentId);
  const image = requireVerifierImage(verifierImage);
  return createHash("sha256").update(JSON.stringify({
    version: P12_2_L10_19_C_VERSION,
    projectId: P12_2_L10_19_PROJECT_ID,
    environmentId: P12_2_L10_19_ENVIRONMENT_ID,
    postgresServiceId: P12_2_L10_19_POSTGRES_SERVICE_ID,
    dispositionVersion: P12_2_L10_19_VERSION,
    dispositionDeploymentId: deploymentId,
    verifierImage: image,
    packetFingerprint: P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
    runId: P12_2_L10_15_RUN_ID,
    querySetFingerprint: p122L1019CQuerySetFingerprint(deploymentId, image),
    expectedEffectiveStatus: "certified_with_expected_absence",
    expectedRawTerminalFailures: 1,
    expectedAbsenceCount: 1,
    expectedEffectiveUnresolvedTerminalFailures: 0,
    attempts: 1,
    retries: 0,
    fallback: false,
    sessionReadOnly: true,
    databaseMutation: false,
    liveNetworkReads: false,
    recoveryExecution: false,
  })).digest("hex");
}

export function p122L1019CAuthorizationLiteral(
  dispositionDeploymentId: string,
  verifierImage: string,
): string {
  return `AUTHORIZE:P12_2_L10_19_PACKET_014_POST_DISPOSITION_READ_ONLY:${p122L1019CAuthorizationFingerprint(dispositionDeploymentId, verifierImage)}`;
}

export function p122L1019CAuthorizationDiagnostics(
  providedAuthorizationLiteral: string,
  dispositionDeploymentId: string,
  verifierImage: string,
): {
  dispositionDeploymentId: string;
  verifierImage: string;
  querySetFingerprint: string;
  providedAuthorizationDigest: string;
  expectedAuthorizationDigest: string;
} {
  const deploymentId = requireDeploymentId(dispositionDeploymentId);
  const image = requireVerifierImage(verifierImage);
  const expectedAuthorizationLiteral =
    p122L1019CAuthorizationLiteral(deploymentId, image);
  return Object.freeze({
    dispositionDeploymentId: deploymentId,
    verifierImage: image,
    querySetFingerprint: p122L1019CQuerySetFingerprint(deploymentId, image),
    providedAuthorizationDigest: createHash("sha256")
      .update(providedAuthorizationLiteral)
      .digest("hex"),
    expectedAuthorizationDigest: createHash("sha256")
      .update(expectedAuthorizationLiteral)
      .digest("hex"),
  });
}
