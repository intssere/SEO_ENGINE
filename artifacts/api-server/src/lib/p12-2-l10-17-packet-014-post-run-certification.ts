import { createHash } from "node:crypto";

export const P12_2_L10_17_VERSION =
  "p12-2-l10-17-packet-014-post-run-durable-outcome-cert-v1" as const;

export const P12_2_L10_17_PROJECT_ID =
  "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const P12_2_L10_17_ENVIRONMENT_ID =
  "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const P12_2_L10_17_POSTGRES_SERVICE_ID =
  "b69e0633-7ab9-40ab-85f3-c9edd6acb031" as const;
export const P12_2_L10_17_SITE_ID =
  "eb1da9ee-539c-4200-8f04-f64ccaea7768" as const;
export const P12_2_L10_17_ORIGIN =
  "https://diamondshelf.us" as const;

export const P12_2_L10_17_PACKET_FINGERPRINT =
  "b853dcc4d1cbc383e5f9a1185085b6bc77ac42394a33db9c1380a6e511e7a560" as const;
export const P12_2_L10_17_RUN_ID =
  "p12-2-diamond-shelf-post-0010-full-014" as const;
export const P12_2_L10_17_OBSERVED_AT =
  "2026-10-06T16:15:00.000Z" as const;
export const P12_2_L10_17_PHASE = "full_initial" as const;

export const P12_2_L10_17_EXECUTION_IMAGE =
  "ghcr.io/intssere/seo-engine@sha256:afa1e3f7bc2b38b59b0fa36aa9eb4d0ed2a533122439d5d9647ed48ee63ecf93" as const;
export const P12_2_L10_17_EXECUTION_DEPLOYMENT_ID =
  "30e3ab20-20ce-4d22-acd6-39d7a3575597" as const;

export type P122L1017Query = {
  id:
    | "database_identity"
    | "packet_identity_guard"
    | "invocation_receipt"
    | "checkpoint_state"
    | "completed_run_state"
    | "terminal_failure_evidence"
    | "accounting_snapshot_state"
    | "recovery_receipt_state"
    | "terminal_outcome_classification"
    | "terminal_outcome_guard";
  sql: string;
};

const INVOCATION_SCOPE = `
  packet_fingerprint='${P12_2_L10_17_PACKET_FINGERPRINT}'
  AND site_id='${P12_2_L10_17_SITE_ID}'::uuid
  AND phase='${P12_2_L10_17_PHASE}'
  AND run_id='${P12_2_L10_17_RUN_ID}'
  AND canonical_origin='${P12_2_L10_17_ORIGIN}'
  AND observed_at='${P12_2_L10_17_OBSERVED_AT}'::timestamptz
`;

const CLEAN_OUTCOME = `
  (
    SELECT count(*) FROM first_party_crawl_l2_invocations
    WHERE ${INVOCATION_SCOPE}
      AND status='completed'
      AND receipt_fingerprint ~ '^[0-9a-f]{64}$'
      AND receipt_payload->>'packetFingerprint'='${P12_2_L10_17_PACKET_FINGERPRINT}'
      AND receipt_payload->>'phase'='${P12_2_L10_17_PHASE}'
      AND receipt_payload->>'runId'='${P12_2_L10_17_RUN_ID}'
      AND receipt_payload->>'invocationAttempt'='1'
      AND receipt_payload->>'automaticRetryPerformed'='false'
      AND receipt_payload->'result'->>'status'='completed'
      AND receipt_payload->>'fingerprint'=receipt_fingerprint
  )=1
  AND (
    SELECT count(*)
    FROM first_party_crawl_checkpoints c
    WHERE c.site_id='${P12_2_L10_17_SITE_ID}'::uuid
      AND c.run_id='${P12_2_L10_17_RUN_ID}'
      AND c.canonical_origin='${P12_2_L10_17_ORIGIN}'
      AND c.checkpoint_payload->>'status'='completed'
      AND c.checkpoint_payload->>'fingerprint'=c.checkpoint_fingerprint
      AND c.checkpoint_payload->>'planFingerprint'=c.execution_plan_fingerprint
      AND jsonb_array_length(c.checkpoint_payload->'pendingCanonicalUrls')=0
      AND (c.checkpoint_payload->'progress'->>'pendingUrls')::integer=0
      AND (c.checkpoint_payload->'progress'->>'finalizedUrls')::integer=(c.checkpoint_payload->'progress'->>'totalUrls')::integer
      AND (c.checkpoint_payload->'counters'->>'terminalFailures')::integer=0
  )=1
  AND (
    SELECT count(*)
    FROM first_party_crawl_accounting_snapshots a
    JOIN first_party_crawl_checkpoints c
      ON c.site_id=a.site_id
     AND c.run_id=a.run_id
     AND c.canonical_origin=a.canonical_origin
     AND c.execution_plan_fingerprint=a.execution_plan_fingerprint
     AND c.checkpoint_fingerprint=a.checkpoint_fingerprint
    WHERE a.site_id='${P12_2_L10_17_SITE_ID}'::uuid
      AND a.run_id='${P12_2_L10_17_RUN_ID}'
      AND a.canonical_origin='${P12_2_L10_17_ORIGIN}'
      AND a.whole_site_certified=true
      AND a.terminal_failure_count=0
      AND a.snapshot_payload->>'fingerprint'=a.snapshot_fingerprint
      AND a.snapshot_payload->'checkpoint'->>'fingerprint'=a.checkpoint_fingerprint
      AND a.snapshot_payload->'checkpoint'->>'status'='completed'
      AND a.snapshot_payload->'certification'->'certification'->>'wholeSiteCertified'='true'
      AND a.snapshot_payload->'certification'->'certification'->>'wholeSiteReason'='certified_complete_accounting'
  )=1
  AND (
    SELECT count(*)
    FROM first_party_crawl_completed_runs r
    JOIN first_party_crawl_accounting_snapshots a
      ON a.site_id=r.site_id
     AND a.run_id=r.run_id
     AND a.canonical_origin=r.canonical_origin
     AND a.execution_plan_fingerprint=r.execution_plan_fingerprint
     AND a.snapshot_fingerprint=r.snapshot_fingerprint
    WHERE r.site_id='${P12_2_L10_17_SITE_ID}'::uuid
      AND r.run_id='${P12_2_L10_17_RUN_ID}'
      AND r.canonical_origin='${P12_2_L10_17_ORIGIN}'
      AND r.snapshot_payload->>'fingerprint'=r.snapshot_fingerprint
      AND r.snapshot_payload->'checkpoint'->>'status'='completed'
      AND r.snapshot_payload->'certification'->'certification'->>'wholeSiteCertified'='true'
      AND r.snapshot_payload->'certification'->'certification'->>'wholeSiteReason'='certified_complete_accounting'
  )=1
  AND (
    SELECT count(*) FROM first_party_crawl_terminal_failure_events
    WHERE site_id='${P12_2_L10_17_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_17_RUN_ID}'
      AND canonical_origin='${P12_2_L10_17_ORIGIN}'
  )=0
  AND (
    SELECT count(*) FROM first_party_crawl_terminal_failure_recovery_receipts
    WHERE site_id='${P12_2_L10_17_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_17_RUN_ID}'
      AND canonical_origin='${P12_2_L10_17_ORIGIN}'
  )=0
`;

const ACCOUNTING_FAILURE_OUTCOME = `
  (
    SELECT count(*) FROM first_party_crawl_l2_invocations
    WHERE ${INVOCATION_SCOPE}
      AND status='completed'
      AND receipt_fingerprint ~ '^[0-9a-f]{64}$'
      AND receipt_payload->>'packetFingerprint'='${P12_2_L10_17_PACKET_FINGERPRINT}'
      AND receipt_payload->>'phase'='${P12_2_L10_17_PHASE}'
      AND receipt_payload->>'runId'='${P12_2_L10_17_RUN_ID}'
      AND receipt_payload->>'invocationAttempt'='1'
      AND receipt_payload->>'automaticRetryPerformed'='false'
      AND receipt_payload->'result'->>'status'='accounting_complete_uncertified'
      AND (receipt_payload->'result'->>'terminalFailures')::integer > 0
      AND receipt_payload->'result'->>'checkpointFingerprint' ~ '^[0-9a-f]{64}$'
      AND receipt_payload->'result'->>'accountingSnapshotFingerprint' ~ '^[0-9a-f]{64}$'
      AND receipt_payload->>'fingerprint'=receipt_fingerprint
  )=1
  AND (
    SELECT count(*)
    FROM first_party_crawl_checkpoints c
    JOIN first_party_crawl_l2_invocations i
      ON i.site_id=c.site_id
     AND i.run_id=c.run_id
     AND i.canonical_origin=c.canonical_origin
    WHERE i.packet_fingerprint='${P12_2_L10_17_PACKET_FINGERPRINT}'
      AND c.site_id='${P12_2_L10_17_SITE_ID}'::uuid
      AND c.run_id='${P12_2_L10_17_RUN_ID}'
      AND c.canonical_origin='${P12_2_L10_17_ORIGIN}'
      AND c.checkpoint_payload->>'status'='completed'
      AND c.checkpoint_payload->>'fingerprint'=c.checkpoint_fingerprint
      AND c.checkpoint_payload->>'planFingerprint'=c.execution_plan_fingerprint
      AND jsonb_array_length(c.checkpoint_payload->'pendingCanonicalUrls')=0
      AND (c.checkpoint_payload->'progress'->>'pendingUrls')::integer=0
      AND (c.checkpoint_payload->'progress'->>'finalizedUrls')::integer=(c.checkpoint_payload->'progress'->>'totalUrls')::integer
      AND (c.checkpoint_payload->'counters'->>'terminalFailures')::integer > 0
      AND c.checkpoint_fingerprint=i.receipt_payload->'result'->>'checkpointFingerprint'
      AND c.checkpoint_revision=(i.receipt_payload->'result'->>'checkpointRevision')::bigint
  )=1
  AND (
    SELECT count(*)
    FROM first_party_crawl_accounting_snapshots a
    JOIN first_party_crawl_l2_invocations i
      ON i.site_id=a.site_id
     AND i.run_id=a.run_id
     AND i.canonical_origin=a.canonical_origin
    JOIN first_party_crawl_checkpoints c
      ON c.site_id=a.site_id
     AND c.run_id=a.run_id
     AND c.canonical_origin=a.canonical_origin
     AND c.execution_plan_fingerprint=a.execution_plan_fingerprint
     AND c.checkpoint_fingerprint=a.checkpoint_fingerprint
    WHERE i.packet_fingerprint='${P12_2_L10_17_PACKET_FINGERPRINT}'
      AND a.site_id='${P12_2_L10_17_SITE_ID}'::uuid
      AND a.run_id='${P12_2_L10_17_RUN_ID}'
      AND a.canonical_origin='${P12_2_L10_17_ORIGIN}'
      AND a.whole_site_certified=false
      AND a.terminal_failure_count > 0
      AND a.terminal_failure_count=(c.checkpoint_payload->'counters'->>'terminalFailures')::integer
      AND a.snapshot_fingerprint=i.receipt_payload->'result'->>'accountingSnapshotFingerprint'
      AND a.snapshot_payload->>'fingerprint'=a.snapshot_fingerprint
      AND a.snapshot_payload->'checkpoint'->>'fingerprint'=a.checkpoint_fingerprint
      AND a.snapshot_payload->'certification'->'certification'->>'wholeSiteCertified'='false'
  )=1
  AND (
    SELECT count(*)
    FROM first_party_crawl_completed_runs
    WHERE site_id='${P12_2_L10_17_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_17_RUN_ID}'
      AND canonical_origin='${P12_2_L10_17_ORIGIN}'
  )=0
  AND (
    SELECT count(*)
    FROM first_party_crawl_terminal_failure_events e
    JOIN first_party_crawl_accounting_snapshots a
      ON a.site_id=e.site_id
     AND a.run_id=e.run_id
     AND a.canonical_origin=e.canonical_origin
     AND a.execution_plan_fingerprint=e.execution_plan_fingerprint
    WHERE e.site_id='${P12_2_L10_17_SITE_ID}'::uuid
      AND e.run_id='${P12_2_L10_17_RUN_ID}'
      AND e.canonical_origin='${P12_2_L10_17_ORIGIN}'
      AND e.event_type='terminal_failure'
      AND e.source_event_fingerprint IS NULL
      AND e.checkpoint_fingerprint=a.checkpoint_fingerprint
  )=(
    SELECT terminal_failure_count
    FROM first_party_crawl_accounting_snapshots
    WHERE site_id='${P12_2_L10_17_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_17_RUN_ID}'
      AND canonical_origin='${P12_2_L10_17_ORIGIN}'
  )
  AND (
    SELECT count(DISTINCT e.canonical_url)
    FROM first_party_crawl_terminal_failure_events e
    WHERE e.site_id='${P12_2_L10_17_SITE_ID}'::uuid
      AND e.run_id='${P12_2_L10_17_RUN_ID}'
      AND e.canonical_origin='${P12_2_L10_17_ORIGIN}'
      AND e.event_type='terminal_failure'
      AND e.source_event_fingerprint IS NULL
  )=(
    SELECT terminal_failure_count
    FROM first_party_crawl_accounting_snapshots
    WHERE site_id='${P12_2_L10_17_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_17_RUN_ID}'
      AND canonical_origin='${P12_2_L10_17_ORIGIN}'
  )
  AND (
    SELECT count(*) FROM first_party_crawl_terminal_failure_recovery_receipts
    WHERE site_id='${P12_2_L10_17_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_17_RUN_ID}'
      AND canonical_origin='${P12_2_L10_17_ORIGIN}'
  )=0
`;

export const P12_2_L10_17_QUERIES: readonly P122L1017Query[] = Object.freeze([
  {
    id: "database_identity",
    sql: "SELECT current_database() AS database_name, current_user AS database_user, current_setting('server_version') AS server_version",
  },
  {
    id: "packet_identity_guard",
    sql: `SELECT 1 / CASE WHEN (
      SELECT count(*) FROM first_party_crawl_l2_invocations
      WHERE ${INVOCATION_SCOPE}
    )=1 THEN 1 ELSE 0 END AS packet_identity_guard`,
  },
  {
    id: "invocation_receipt",
    sql: `SELECT
      invocation_id::text AS invocation_id,
      packet_fingerprint,
      phase,
      run_id,
      canonical_origin,
      observed_at,
      status,
      receipt_fingerprint,
      receipt_payload->>'fingerprint' AS payload_fingerprint,
      receipt_payload->>'invocationAttempt' AS invocation_attempt,
      receipt_payload->>'automaticRetryPerformed' AS automatic_retry_performed,
      receipt_payload->'result'->>'status' AS result_status,
      receipt_payload->'result'->>'checkpointRevision' AS checkpoint_revision,
      receipt_payload->'result'->>'checkpointFingerprint' AS checkpoint_fingerprint,
      receipt_payload->'result'->>'receiptFingerprint' AS completed_run_receipt_fingerprint,
      receipt_payload->'result'->>'accountingSnapshotFingerprint' AS accounting_snapshot_fingerprint,
      receipt_payload->'result'->>'terminalFailures' AS terminal_failures
    FROM first_party_crawl_l2_invocations
    WHERE ${INVOCATION_SCOPE}`,
  },
  {
    id: "checkpoint_state",
    sql: `SELECT
      checkpoint_id::text AS checkpoint_id,
      run_id,
      canonical_origin,
      execution_plan_fingerprint,
      checkpoint_fingerprint,
      checkpoint_revision,
      observed_at,
      checkpoint_payload->>'fingerprint' AS payload_fingerprint,
      checkpoint_payload->>'planFingerprint' AS payload_plan_fingerprint,
      checkpoint_payload->>'inventoryFingerprint' AS execution_inventory_fingerprint,
      checkpoint_payload->>'status' AS checkpoint_status,
      jsonb_array_length(checkpoint_payload->'pendingCanonicalUrls') AS pending_url_count,
      checkpoint_payload->'progress'->>'totalUrls' AS total_urls,
      checkpoint_payload->'progress'->>'finalizedUrls' AS finalized_urls,
      checkpoint_payload->'progress'->>'pendingUrls' AS pending_urls,
      checkpoint_payload->'progress'->>'completedBatches' AS completed_batches,
      checkpoint_payload->'progress'->>'totalBatches' AS total_batches,
      checkpoint_payload->'counters'->>'fetchedSuccessful' AS fetched_successful,
      checkpoint_payload->'counters'->>'redirects' AS redirects,
      checkpoint_payload->'counters'->>'robotsExcluded' AS robots_excluded,
      checkpoint_payload->'counters'->>'noindex' AS noindex,
      checkpoint_payload->'counters'->>'terminalFailures' AS terminal_failures,
      checkpoint_payload->'counters'->>'attemptsRecorded' AS attempts_recorded,
      checkpoint_payload->'counters'->>'retryScheduled' AS retry_scheduled
    FROM first_party_crawl_checkpoints
    WHERE site_id='${P12_2_L10_17_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_17_RUN_ID}'
      AND canonical_origin='${P12_2_L10_17_ORIGIN}'
    ORDER BY checkpoint_revision DESC`,
  },
  {
    id: "completed_run_state",
    sql: `SELECT
      completed_run_id::text AS completed_run_id,
      run_id,
      canonical_origin,
      execution_plan_fingerprint,
      snapshot_fingerprint,
      observed_at,
      snapshot_payload->>'fingerprint' AS payload_fingerprint,
      snapshot_payload->'checkpoint'->>'fingerprint' AS checkpoint_fingerprint,
      snapshot_payload->'checkpoint'->>'status' AS checkpoint_status,
      snapshot_payload->'certification'->'certification'->>'wholeSiteCertified' AS whole_site_certified,
      snapshot_payload->'certification'->'certification'->>'wholeSiteReason' AS whole_site_reason
    FROM first_party_crawl_completed_runs
    WHERE site_id='${P12_2_L10_17_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_17_RUN_ID}'
      AND canonical_origin='${P12_2_L10_17_ORIGIN}'`,
  },
  {
    id: "terminal_failure_evidence",
    sql: `SELECT
      event_id::text AS event_id,
      execution_plan_fingerprint,
      canonical_url,
      event_type,
      source_event_fingerprint,
      checkpoint_fingerprint,
      checkpoint_revision,
      observed_at,
      event_fingerprint,
      event_payload->>'fingerprint' AS payload_fingerprint,
      event_payload->>'attempt' AS terminal_attempt,
      event_payload->>'failureCode' AS failure_code
    FROM first_party_crawl_terminal_failure_events
    WHERE site_id='${P12_2_L10_17_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_17_RUN_ID}'
      AND canonical_origin='${P12_2_L10_17_ORIGIN}'
    ORDER BY canonical_url, observed_at, event_id`,
  },
  {
    id: "accounting_snapshot_state",
    sql: `SELECT
      accounting_snapshot_id::text AS accounting_snapshot_id,
      execution_plan_fingerprint,
      checkpoint_fingerprint,
      checkpoint_revision,
      snapshot_fingerprint,
      whole_site_certified,
      terminal_failure_count,
      observed_at,
      snapshot_payload->>'fingerprint' AS payload_fingerprint,
      snapshot_payload->'checkpoint'->>'fingerprint' AS payload_checkpoint_fingerprint,
      snapshot_payload->'checkpoint'->'counters'->>'terminalFailures' AS payload_terminal_failures,
      snapshot_payload->'certification'->'certification'->>'wholeSiteCertified' AS payload_whole_site_certified,
      snapshot_payload->'certification'->'certification'->>'wholeSiteReason' AS whole_site_reason
    FROM first_party_crawl_accounting_snapshots
    WHERE site_id='${P12_2_L10_17_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_17_RUN_ID}'
      AND canonical_origin='${P12_2_L10_17_ORIGIN}'
    ORDER BY checkpoint_revision DESC, accounting_snapshot_id DESC`,
  },
  {
    id: "recovery_receipt_state",
    sql: `SELECT
      recovery_receipt_id::text AS recovery_receipt_id,
      execution_plan_fingerprint,
      source_checkpoint_fingerprint,
      source_checkpoint_revision,
      result_checkpoint_fingerprint,
      result_checkpoint_revision,
      recovery_plan_fingerprint,
      receipt_fingerprint,
      status,
      observed_at
    FROM first_party_crawl_terminal_failure_recovery_receipts
    WHERE site_id='${P12_2_L10_17_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_17_RUN_ID}'
      AND canonical_origin='${P12_2_L10_17_ORIGIN}'
    ORDER BY observed_at, recovery_receipt_id`,
  },
  {
    id: "terminal_outcome_classification",
    sql: `SELECT CASE
      WHEN ${CLEAN_OUTCOME} THEN 'clean_certified'
      WHEN ${ACCOUNTING_FAILURE_OUTCOME} THEN 'accounting_complete_uncertified'
      ELSE 'invalid_or_nonterminal'
    END AS packet_014_terminal_outcome`,
  },
  {
    id: "terminal_outcome_guard",
    sql: `SELECT 1 / CASE WHEN
      (${CLEAN_OUTCOME}) OR (${ACCOUNTING_FAILURE_OUTCOME})
      THEN 1 ELSE 0 END AS terminal_outcome_guard`,
  },
]);

const FORBIDDEN_SQL =
  /\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|comment|vacuum|analyze|refresh|reindex|cluster|copy|call|do|execute|prepare|deallocate|listen|notify|lock)\b/i;

function normalizedSql(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function assertP122L1017QueryContract(): void {
  if (P12_2_L10_17_QUERIES.length !== 10) {
    throw new Error("p12_2_l10_17_query_count_invalid");
  }
  const ids = P12_2_L10_17_QUERIES.map((query) => query.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("p12_2_l10_17_query_id_duplicate");
  }
  for (const query of P12_2_L10_17_QUERIES) {
    const sql = normalizedSql(query.sql);
    if (!/^SELECT\b/i.test(sql)) {
      throw new Error("p12_2_l10_17_non_select_forbidden");
    }
    if (FORBIDDEN_SQL.test(sql)) {
      throw new Error("p12_2_l10_17_mutation_keyword_forbidden");
    }
    if (sql.includes(";")) {
      throw new Error("p12_2_l10_17_multi_statement_forbidden");
    }
  }
}

export function p122L1017QuerySetFingerprint(): string {
  assertP122L1017QueryContract();
  return createHash("sha256")
    .update(JSON.stringify(P12_2_L10_17_QUERIES.map((query) => ({
      id: query.id,
      sql: normalizedSql(query.sql),
    }))))
    .digest("hex");
}

export function p122L1017AuthorizationFingerprint(): string {
  return createHash("sha256")
    .update(JSON.stringify({
      version: P12_2_L10_17_VERSION,
      projectId: P12_2_L10_17_PROJECT_ID,
      environmentId: P12_2_L10_17_ENVIRONMENT_ID,
      postgresServiceId: P12_2_L10_17_POSTGRES_SERVICE_ID,
      siteId: P12_2_L10_17_SITE_ID,
      canonicalOrigin: P12_2_L10_17_ORIGIN,
      packetFingerprint: P12_2_L10_17_PACKET_FINGERPRINT,
      runId: P12_2_L10_17_RUN_ID,
      observedAt: P12_2_L10_17_OBSERVED_AT,
      phase: P12_2_L10_17_PHASE,
      executionImage: P12_2_L10_17_EXECUTION_IMAGE,
      executionDeploymentId: P12_2_L10_17_EXECUTION_DEPLOYMENT_ID,
      allowedTerminalOutcomes: [
        "clean_certified",
        "accounting_complete_uncertified",
      ],
      querySetFingerprint: p122L1017QuerySetFingerprint(),
      attempts: 1,
      retries: 0,
      fallback: false,
      sessionReadOnly: true,
      crawlExecutionPossible: false,
      recoveryExecutionPossible: false,
    }))
    .digest("hex");
}

export function p122L1017AuthorizationLiteral(): string {
  return `AUTHORIZE:P12_2_L10_17_PACKET_014_POST_RUN_READ_ONLY:${p122L1017AuthorizationFingerprint()}`;
}

export function p122L1017Capability() {
  return Object.freeze({
    version: P12_2_L10_17_VERSION,
    packetFingerprint: P12_2_L10_17_PACKET_FINGERPRINT,
    runId: P12_2_L10_17_RUN_ID,
    executionImage: P12_2_L10_17_EXECUTION_IMAGE,
    executionDeploymentId: P12_2_L10_17_EXECUTION_DEPLOYMENT_ID,
    queryCount: P12_2_L10_17_QUERIES.length,
    allowedTerminalOutcomes: Object.freeze([
      "clean_certified",
      "accounting_complete_uncertified",
    ]),
    attempts: 1,
    retries: 0,
    fallback: false,
    sessionReadOnly: true,
    crawlExecutionPossible: false,
    recoveryExecutionPossible: false,
    railwayMutationAuthorized: false,
    providerOrPublicSiteWriteAuthorized: false,
    schedulerWorkerActivationAuthorized: false,
  } as const);
}
