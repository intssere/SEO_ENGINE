import { createHash } from "node:crypto";

export const P12_2_L10_13A_VERSION = "p12-2-l10-13a-packet-013-failure-state-cert-v1" as const;
export const P12_2_L10_13A_PROJECT_ID = "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const P12_2_L10_13A_ENVIRONMENT_ID = "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const P12_2_L10_13A_POSTGRES_SERVICE_ID = "b69e0633-7ab9-40ab-85f3-c9edd6acb031" as const;
export const P12_2_L10_13A_SITE_ID = "eb1da9ee-539c-4200-8f04-f64ccaea7768" as const;
export const P12_2_L10_13A_ORIGIN = "https://diamondshelf.us" as const;

export const P12_2_L10_13A_PACKET_FINGERPRINT =
  "4d3b401a688b4928f42cc31fdde4e57bbc9b390745157fa6cc867b21795559ea" as const;
export const P12_2_L10_13A_RUN_ID = "p12-2-diamond-shelf-full-interrupt-010" as const;
export const P12_2_L10_13A_OBSERVED_AT = "2026-10-05T15:04:49.000Z" as const;
export const P12_2_L10_13A_PHASE = "full_resume" as const;
export const P12_2_L10_13A_DEPLOYMENT_ID = "87389cf3-5aae-4c29-ab10-2023aa7f5aad" as const;
export const P12_2_L10_13A_OPERATOR_FAILURE_CODE =
  "p12_2_persistence_completed_run_not_certified" as const;

export const P12_2_L10_13A_SOURCE_CHECKPOINT_REVISION = 141 as const;
export const P12_2_L10_13A_SOURCE_CHECKPOINT_FINGERPRINT =
  "3ec71dfe067053ec1a8e3d72c93fb998d9f5565ee338741346ca79521759e84b" as const;
export const P12_2_L10_13A_EXECUTION_PLAN_FINGERPRINT =
  "0818612ac8f35d5109cb4901442a0546630b9ca31a7ae6f24f77f8271db650aa" as const;
export const P12_2_L10_13A_EXECUTION_INVENTORY_FINGERPRINT =
  "275af2602679a5f1b3f0d58573d578e3d82d988287cb57933d69586543554545" as const;

export type P122L1013AQuery = {
  id:
    | "database_identity"
    | "packet_identity_guard"
    | "invocation_state"
    | "final_checkpoint_state"
    | "checkpoint_completion_guard"
    | "completed_run_absence_guard"
    | "claimed_consumed_guard"
    | "durable_failure_state_guard";
  sql: string;
};

export const P12_2_L10_13A_QUERIES: readonly P122L1013AQuery[] = Object.freeze([
  {
    id: "database_identity",
    sql: "SELECT current_database() AS database_name, current_user AS database_user, current_setting('server_version') AS server_version",
  },
  {
    id: "packet_identity_guard",
    sql: `SELECT 1 / CASE WHEN (
      SELECT count(*) FROM first_party_crawl_l2_invocations
      WHERE packet_fingerprint='${P12_2_L10_13A_PACKET_FINGERPRINT}'
        AND site_id='${P12_2_L10_13A_SITE_ID}'::uuid
        AND phase='${P12_2_L10_13A_PHASE}'
        AND run_id='${P12_2_L10_13A_RUN_ID}'
        AND canonical_origin='${P12_2_L10_13A_ORIGIN}'
        AND observed_at='${P12_2_L10_13A_OBSERVED_AT}'::timestamptz
    ) = 1 THEN 1 ELSE 0 END AS packet_identity_guard`,
  },
  {
    id: "invocation_state",
    sql: `SELECT
      invocation_id::text AS invocation_id,
      packet_fingerprint,
      phase,
      run_id,
      canonical_origin,
      observed_at,
      status,
      receipt_fingerprint,
      receipt_payload->>'version' AS receipt_version,
      receipt_payload->>'packetFingerprint' AS receipt_packet_fingerprint,
      receipt_payload->'result'->>'status' AS result_status
    FROM first_party_crawl_l2_invocations
    WHERE packet_fingerprint='${P12_2_L10_13A_PACKET_FINGERPRINT}'`,
  },
  {
    id: "final_checkpoint_state",
    sql: `SELECT
      checkpoint_id::text AS checkpoint_id,
      run_id,
      canonical_origin,
      execution_plan_fingerprint,
      checkpoint_fingerprint,
      checkpoint_revision,
      observed_at,
      checkpoint_payload->>'version' AS checkpoint_version,
      checkpoint_payload->>'fingerprint' AS payload_fingerprint,
      checkpoint_payload->>'planFingerprint' AS payload_plan_fingerprint,
      checkpoint_payload->>'inventoryFingerprint' AS execution_inventory_fingerprint,
      checkpoint_payload->>'sequence' AS payload_sequence,
      checkpoint_payload->>'status' AS checkpoint_status,
      jsonb_array_length(checkpoint_payload->'pendingCanonicalUrls') AS pending_url_count,
      jsonb_array_length(checkpoint_payload->'completedBatchIds') AS completed_batch_count,
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
    WHERE site_id='${P12_2_L10_13A_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_13A_RUN_ID}'
      AND canonical_origin='${P12_2_L10_13A_ORIGIN}'
      AND execution_plan_fingerprint='${P12_2_L10_13A_EXECUTION_PLAN_FINGERPRINT}'`,
  },
  {
    id: "checkpoint_completion_guard",
    sql: `SELECT 1 / CASE WHEN EXISTS (
      SELECT 1 FROM first_party_crawl_checkpoints
      WHERE site_id='${P12_2_L10_13A_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_13A_RUN_ID}'
        AND canonical_origin='${P12_2_L10_13A_ORIGIN}'
        AND execution_plan_fingerprint='${P12_2_L10_13A_EXECUTION_PLAN_FINGERPRINT}'
        AND checkpoint_payload->>'status'='completed'
        AND checkpoint_payload->>'fingerprint'=checkpoint_fingerprint
        AND checkpoint_payload->>'planFingerprint'=execution_plan_fingerprint
        AND checkpoint_payload->>'inventoryFingerprint'='${P12_2_L10_13A_EXECUTION_INVENTORY_FINGERPRINT}'
        AND jsonb_array_length(checkpoint_payload->'pendingCanonicalUrls')=0
        AND (checkpoint_payload->'progress'->>'pendingUrls')::integer=0
        AND (checkpoint_payload->'progress'->>'finalizedUrls')::integer=(checkpoint_payload->'progress'->>'totalUrls')::integer
        AND jsonb_array_length(checkpoint_payload->'completedBatchIds')=(checkpoint_payload->'progress'->>'totalBatches')::integer
        AND (checkpoint_payload->'counters'->>'terminalFailures')::integer > 0
    ) THEN 1 ELSE 0 END AS checkpoint_completion_guard`,
  },
  {
    id: "completed_run_absence_guard",
    sql: `SELECT 1 / CASE WHEN (
      SELECT count(*) FROM first_party_crawl_completed_runs
      WHERE site_id='${P12_2_L10_13A_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_13A_RUN_ID}'
        AND canonical_origin='${P12_2_L10_13A_ORIGIN}'
        AND execution_plan_fingerprint='${P12_2_L10_13A_EXECUTION_PLAN_FINGERPRINT}'
    ) = 0 THEN 1 ELSE 0 END AS completed_run_absence_guard`,
  },
  {
    id: "claimed_consumed_guard",
    sql: `SELECT 1 / CASE WHEN (
      SELECT count(*) FROM first_party_crawl_l2_invocations
      WHERE packet_fingerprint='${P12_2_L10_13A_PACKET_FINGERPRINT}'
        AND status='claimed'
        AND receipt_fingerprint IS NULL
        AND receipt_payload IS NULL
    ) = 1 THEN 1 ELSE 0 END AS claimed_consumed_guard`,
  },
  {
    id: "durable_failure_state_guard",
    sql: `SELECT 1 / CASE WHEN
      (
        SELECT count(*) FROM first_party_crawl_l2_invocations
        WHERE packet_fingerprint='${P12_2_L10_13A_PACKET_FINGERPRINT}'
          AND site_id='${P12_2_L10_13A_SITE_ID}'::uuid
          AND phase='${P12_2_L10_13A_PHASE}'
          AND run_id='${P12_2_L10_13A_RUN_ID}'
          AND canonical_origin='${P12_2_L10_13A_ORIGIN}'
          AND observed_at='${P12_2_L10_13A_OBSERVED_AT}'::timestamptz
          AND status='claimed'
          AND receipt_fingerprint IS NULL
          AND receipt_payload IS NULL
      ) = 1
      AND EXISTS (
        SELECT 1 FROM first_party_crawl_checkpoints
        WHERE site_id='${P12_2_L10_13A_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_13A_RUN_ID}'
          AND canonical_origin='${P12_2_L10_13A_ORIGIN}'
          AND execution_plan_fingerprint='${P12_2_L10_13A_EXECUTION_PLAN_FINGERPRINT}'
          AND checkpoint_payload->>'status'='completed'
          AND checkpoint_payload->>'fingerprint'=checkpoint_fingerprint
          AND checkpoint_payload->>'inventoryFingerprint'='${P12_2_L10_13A_EXECUTION_INVENTORY_FINGERPRINT}'
          AND (checkpoint_payload->'progress'->>'pendingUrls')::integer=0
          AND (checkpoint_payload->'counters'->>'terminalFailures')::integer > 0
      )
      AND (
        SELECT count(*) FROM first_party_crawl_completed_runs
        WHERE site_id='${P12_2_L10_13A_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_13A_RUN_ID}'
          AND canonical_origin='${P12_2_L10_13A_ORIGIN}'
          AND execution_plan_fingerprint='${P12_2_L10_13A_EXECUTION_PLAN_FINGERPRINT}'
      ) = 0
    THEN 1 ELSE 0 END AS durable_failure_state_guard`,
  },
]);

const FORBIDDEN_SQL = /\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|comment|vacuum|analyze|refresh|reindex|cluster|copy|call|do|execute|prepare|deallocate|listen|notify|lock)\b/i;

function normalizedSql(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function assertP122L1013AQueryContract(): void {
  if (P12_2_L10_13A_QUERIES.length !== 8) throw new Error("p12_2_l10_13a_query_count_invalid");
  const ids = P12_2_L10_13A_QUERIES.map((query) => query.id);
  if (new Set(ids).size !== ids.length) throw new Error("p12_2_l10_13a_query_id_duplicate");
  for (const query of P12_2_L10_13A_QUERIES) {
    const sql = normalizedSql(query.sql);
    if (!/^SELECT\b/i.test(sql)) throw new Error("p12_2_l10_13a_non_select_forbidden");
    if (FORBIDDEN_SQL.test(sql)) throw new Error("p12_2_l10_13a_mutation_keyword_forbidden");
    if (sql.includes(";")) throw new Error("p12_2_l10_13a_multi_statement_forbidden");
  }
}

export function p122L1013AQuerySetFingerprint(): string {
  assertP122L1013AQueryContract();
  return createHash("sha256")
    .update(JSON.stringify(P12_2_L10_13A_QUERIES.map((query) => ({ id: query.id, sql: normalizedSql(query.sql) }))))
    .digest("hex");
}

export function p122L1013AAuthorizationFingerprint(): string {
  return createHash("sha256")
    .update(JSON.stringify({
      version: P12_2_L10_13A_VERSION,
      projectId: P12_2_L10_13A_PROJECT_ID,
      environmentId: P12_2_L10_13A_ENVIRONMENT_ID,
      postgresServiceId: P12_2_L10_13A_POSTGRES_SERVICE_ID,
      siteId: P12_2_L10_13A_SITE_ID,
      canonicalOrigin: P12_2_L10_13A_ORIGIN,
      packetFingerprint: P12_2_L10_13A_PACKET_FINGERPRINT,
      runId: P12_2_L10_13A_RUN_ID,
      observedAt: P12_2_L10_13A_OBSERVED_AT,
      phase: P12_2_L10_13A_PHASE,
      deploymentId: P12_2_L10_13A_DEPLOYMENT_ID,
      operatorFailureCode: P12_2_L10_13A_OPERATOR_FAILURE_CODE,
      sourceCheckpointRevision: P12_2_L10_13A_SOURCE_CHECKPOINT_REVISION,
      sourceCheckpointFingerprint: P12_2_L10_13A_SOURCE_CHECKPOINT_FINGERPRINT,
      executionPlanFingerprint: P12_2_L10_13A_EXECUTION_PLAN_FINGERPRINT,
      executionInventoryFingerprint: P12_2_L10_13A_EXECUTION_INVENTORY_FINGERPRINT,
      querySetFingerprint: p122L1013AQuerySetFingerprint(),
      attempts: 1,
      retries: 0,
      fallback: false,
      sessionReadOnly: true,
      crawlExecutionPossible: false,
    }))
    .digest("hex");
}

export function p122L1013AAuthorizationLiteral(): string {
  return `AUTHORIZE:P12_2_L10_13A_PACKET_013_READ_ONLY:${p122L1013AAuthorizationFingerprint()}`;
}
