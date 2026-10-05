import { createHash } from "node:crypto";

export const P12_2_L10_12_VERSION = "p12-2-l10-12-packet-012-completion-cert-v1" as const;
export const P12_2_L10_12_PROJECT_ID = "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const P12_2_L10_12_ENVIRONMENT_ID = "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const P12_2_L10_12_POSTGRES_SERVICE_ID = "b69e0633-7ab9-40ab-85f3-c9edd6acb031" as const;
export const P12_2_L10_12_SITE_ID = "eb1da9ee-539c-4200-8f04-f64ccaea7768" as const;
export const P12_2_L10_12_ORIGIN = "https://diamondshelf.us" as const;

export const P12_2_L10_12_PACKET_FINGERPRINT =
  "a0df337a34e9b24d7120d6c3f71b59cfe39b3b69d61de33b59b4c6743fad67e2" as const;
export const P12_2_L10_12_RUN_ID = "p12-2-diamond-shelf-full-interrupt-010" as const;
export const P12_2_L10_12_OBSERVED_AT = "2026-10-05T13:56:42.000Z" as const;
export const P12_2_L10_12_PHASE = "full_resume" as const;

export const P12_2_L10_12_SOURCE_PACKET_FINGERPRINT =
  "a93b76b252ecb9b9ac063675fcc99b5c70ad5af9c40092b5c2d8574476d1f6d6" as const;
export const P12_2_L10_12_SOURCE_CHECKPOINT_REVISION = 3 as const;
export const P12_2_L10_12_SOURCE_CHECKPOINT_FINGERPRINT =
  "8ad8c571cc79492dbbbb2617f894addc2b7ccfa522c870dab189771b5e335a98" as const;
export const P12_2_L10_12_EXECUTION_PLAN_FINGERPRINT =
  "0818612ac8f35d5109cb4901442a0546630b9ca31a7ae6f24f77f8271db650aa" as const;

export type P122L1012Query = {
  id:
    | "database_identity"
    | "packet_identity_guard"
    | "invocation_receipt"
    | "source_interruption_receipt"
    | "checkpoint_state"
    | "completed_run_state"
    | "resume_source_guard"
    | "resume_completion_guard"
    | "dual_lineage_guard"
    | "durable_completion_guard";
  sql: string;
};

export const P12_2_L10_12_QUERIES: readonly P122L1012Query[] = Object.freeze([
  {
    id: "database_identity",
    sql: "SELECT current_database() AS database_name, current_user AS database_user, current_setting('server_version') AS server_version",
  },
  {
    id: "packet_identity_guard",
    sql: `SELECT 1 / CASE WHEN (
      SELECT count(*) FROM first_party_crawl_l2_invocations
      WHERE packet_fingerprint='${P12_2_L10_12_PACKET_FINGERPRINT}'
        AND site_id='${P12_2_L10_12_SITE_ID}'::uuid
        AND phase='${P12_2_L10_12_PHASE}'
        AND run_id='${P12_2_L10_12_RUN_ID}'
        AND canonical_origin='${P12_2_L10_12_ORIGIN}'
        AND observed_at='${P12_2_L10_12_OBSERVED_AT}'::timestamptz
    ) = 1 THEN 1 ELSE 0 END AS packet_identity_guard`,
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
      receipt_payload->>'version' AS receipt_version,
      receipt_payload->>'packetFingerprint' AS receipt_packet_fingerprint,
      receipt_payload->>'phase' AS receipt_phase,
      receipt_payload->>'runId' AS receipt_run_id,
      receipt_payload->>'invocationAttempt' AS invocation_attempt,
      receipt_payload->>'automaticRetryPerformed' AS automatic_retry_performed,
      receipt_payload->'result'->>'status' AS result_status,
      receipt_payload->'result'->>'receiptFingerprint' AS crawl_receipt_fingerprint,
      receipt_payload->>'fingerprint' AS stored_receipt_fingerprint
    FROM first_party_crawl_l2_invocations
    WHERE packet_fingerprint='${P12_2_L10_12_PACKET_FINGERPRINT}'`,
  },
  {
    id: "source_interruption_receipt",
    sql: `SELECT
      packet_fingerprint,
      phase,
      run_id,
      status,
      receipt_payload->'result'->>'status' AS result_status,
      receipt_payload->'result'->>'checkpointRevision' AS checkpoint_revision,
      receipt_payload->'result'->>'checkpointFingerprint' AS checkpoint_fingerprint,
      receipt_payload->'result'->>'executionPlanFingerprint' AS execution_plan_fingerprint
    FROM first_party_crawl_l2_invocations
    WHERE packet_fingerprint='${P12_2_L10_12_SOURCE_PACKET_FINGERPRINT}'`,
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
      checkpoint_payload->'progress'->>'totalBatches' AS total_batches
    FROM first_party_crawl_checkpoints
    WHERE site_id='${P12_2_L10_12_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_12_RUN_ID}'
      AND canonical_origin='${P12_2_L10_12_ORIGIN}'
      AND execution_plan_fingerprint='${P12_2_L10_12_EXECUTION_PLAN_FINGERPRINT}'`,
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
      snapshot_payload->>'version' AS snapshot_version,
      snapshot_payload->>'fingerprint' AS payload_fingerprint,
      snapshot_payload->'executionPlan'->>'fingerprint' AS payload_execution_plan_fingerprint,
      snapshot_payload->'executionPlan'->'source'->>'inventoryFingerprint' AS execution_inventory_fingerprint,
      snapshot_payload->'inventory'->>'fingerprint' AS current_inventory_fingerprint,
      snapshot_payload->'checkpoint'->>'fingerprint' AS final_checkpoint_fingerprint,
      snapshot_payload->'checkpoint'->>'sequence' AS final_checkpoint_sequence,
      snapshot_payload->'checkpoint'->>'status' AS final_checkpoint_status,
      snapshot_payload->'certification'->>'version' AS certification_version,
      snapshot_payload->'certification'->>'fingerprint' AS certification_fingerprint,
      snapshot_payload->'certification'->'lineage'->>'inventoryFingerprint' AS certification_inventory_fingerprint,
      snapshot_payload->'certification'->'lineage'->>'executionInventoryFingerprint' AS certification_execution_inventory_fingerprint,
      snapshot_payload->'certification'->'lineage'->>'executionPlanFingerprint' AS certification_execution_plan_fingerprint,
      snapshot_payload->'certification'->'certification'->>'wholeSiteCertified' AS whole_site_certified,
      snapshot_payload->'certification'->'certification'->>'wholeSiteReason' AS whole_site_reason
    FROM first_party_crawl_completed_runs
    WHERE site_id='${P12_2_L10_12_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_12_RUN_ID}'
      AND canonical_origin='${P12_2_L10_12_ORIGIN}'
      AND execution_plan_fingerprint='${P12_2_L10_12_EXECUTION_PLAN_FINGERPRINT}'`,
  },
  {
    id: "resume_source_guard",
    sql: `SELECT 1 / CASE WHEN EXISTS (
      SELECT 1
      FROM first_party_crawl_l2_invocations source
      JOIN first_party_crawl_l2_invocations resume
        ON resume.site_id=source.site_id
       AND resume.run_id=source.run_id
       AND resume.canonical_origin=source.canonical_origin
      WHERE source.packet_fingerprint='${P12_2_L10_12_SOURCE_PACKET_FINGERPRINT}'
        AND source.site_id='${P12_2_L10_12_SITE_ID}'::uuid
        AND source.phase='full_interrupt'
        AND source.run_id='${P12_2_L10_12_RUN_ID}'
        AND source.canonical_origin='${P12_2_L10_12_ORIGIN}'
        AND source.status='completed'
        AND source.receipt_payload->'result'->>'status'='intentional_interruption'
        AND source.receipt_payload->'result'->>'checkpointRevision'='${P12_2_L10_12_SOURCE_CHECKPOINT_REVISION}'
        AND source.receipt_payload->'result'->>'checkpointFingerprint'='${P12_2_L10_12_SOURCE_CHECKPOINT_FINGERPRINT}'
        AND source.receipt_payload->'result'->>'executionPlanFingerprint'='${P12_2_L10_12_EXECUTION_PLAN_FINGERPRINT}'
        AND resume.packet_fingerprint='${P12_2_L10_12_PACKET_FINGERPRINT}'
        AND resume.phase='${P12_2_L10_12_PHASE}'
        AND resume.observed_at='${P12_2_L10_12_OBSERVED_AT}'::timestamptz
    ) THEN 1 ELSE 0 END AS resume_source_guard`,
  },
  {
    id: "resume_completion_guard",
    sql: `SELECT 1 / CASE WHEN EXISTS (
      SELECT 1
      FROM first_party_crawl_l2_invocations i
      JOIN first_party_crawl_completed_runs r
        ON r.site_id=i.site_id
       AND r.run_id=i.run_id
       AND r.canonical_origin=i.canonical_origin
      WHERE i.packet_fingerprint='${P12_2_L10_12_PACKET_FINGERPRINT}'
        AND i.site_id='${P12_2_L10_12_SITE_ID}'::uuid
        AND i.phase='${P12_2_L10_12_PHASE}'
        AND i.run_id='${P12_2_L10_12_RUN_ID}'
        AND i.canonical_origin='${P12_2_L10_12_ORIGIN}'
        AND i.observed_at='${P12_2_L10_12_OBSERVED_AT}'::timestamptz
        AND i.status='completed'
        AND i.receipt_payload->>'packetFingerprint'='${P12_2_L10_12_PACKET_FINGERPRINT}'
        AND i.receipt_payload->>'phase'='${P12_2_L10_12_PHASE}'
        AND i.receipt_payload->>'runId'='${P12_2_L10_12_RUN_ID}'
        AND i.receipt_payload->>'invocationAttempt'='1'
        AND i.receipt_payload->>'automaticRetryPerformed'='false'
        AND i.receipt_payload->'result'->>'status'='completed'
        AND i.receipt_payload->'result'->>'receiptFingerprint'=r.snapshot_fingerprint
        AND i.receipt_payload->>'fingerprint'=i.receipt_fingerprint
        AND r.execution_plan_fingerprint='${P12_2_L10_12_EXECUTION_PLAN_FINGERPRINT}'
        AND r.snapshot_payload->>'fingerprint'=r.snapshot_fingerprint
        AND r.snapshot_payload->'executionPlan'->>'fingerprint'='${P12_2_L10_12_EXECUTION_PLAN_FINGERPRINT}'
        AND r.snapshot_payload->'checkpoint'->>'status'='completed'
        AND r.snapshot_payload->'checkpoint'->>'planFingerprint'='${P12_2_L10_12_EXECUTION_PLAN_FINGERPRINT}'
        AND r.snapshot_payload->'certification'->'certification'->>'wholeSiteCertified'='true'
    ) THEN 1 ELSE 0 END AS resume_completion_guard`,
  },
  {
    id: "dual_lineage_guard",
    sql: `SELECT 1 / CASE WHEN EXISTS (
      SELECT 1
      FROM first_party_crawl_completed_runs r
      JOIN first_party_crawl_checkpoints c
        ON c.site_id=r.site_id
       AND c.run_id=r.run_id
       AND c.canonical_origin=r.canonical_origin
       AND c.execution_plan_fingerprint=r.execution_plan_fingerprint
      WHERE r.site_id='${P12_2_L10_12_SITE_ID}'::uuid
        AND r.run_id='${P12_2_L10_12_RUN_ID}'
        AND r.canonical_origin='${P12_2_L10_12_ORIGIN}'
        AND r.execution_plan_fingerprint='${P12_2_L10_12_EXECUTION_PLAN_FINGERPRINT}'
        AND c.checkpoint_payload->>'status'='completed'
        AND c.checkpoint_payload->>'fingerprint'=c.checkpoint_fingerprint
        AND c.checkpoint_payload->>'planFingerprint'=c.execution_plan_fingerprint
        AND r.snapshot_payload->'checkpoint'->>'fingerprint'=c.checkpoint_fingerprint
        AND r.snapshot_payload->'checkpoint'->>'planFingerprint'=c.execution_plan_fingerprint
        AND r.snapshot_payload->'executionPlan'->'source'->>'inventoryFingerprint'=c.checkpoint_payload->>'inventoryFingerprint'
        AND r.snapshot_payload->'certification'->'lineage'->>'executionInventoryFingerprint'=c.checkpoint_payload->>'inventoryFingerprint'
        AND r.snapshot_payload->'certification'->'lineage'->>'inventoryFingerprint'=r.snapshot_payload->'inventory'->>'fingerprint'
        AND r.snapshot_payload->'certification'->'lineage'->>'executionPlanFingerprint'='${P12_2_L10_12_EXECUTION_PLAN_FINGERPRINT}'
        AND r.snapshot_payload->'certification'->>'version'='first_party_full_site_crawl_certification_v1'
        AND r.snapshot_payload->'certification'->'certification'->>'wholeSiteCertified'='true'
        AND r.snapshot_payload->'certification'->'certification'->>'wholeSiteReason'='certified_complete_accounting'
    ) THEN 1 ELSE 0 END AS dual_lineage_guard`,
  },
  {
    id: "durable_completion_guard",
    sql: `SELECT 1 / CASE WHEN
      (
        SELECT count(*) FROM first_party_crawl_l2_invocations
        WHERE packet_fingerprint='${P12_2_L10_12_PACKET_FINGERPRINT}'
          AND site_id='${P12_2_L10_12_SITE_ID}'::uuid
          AND phase='${P12_2_L10_12_PHASE}'
          AND run_id='${P12_2_L10_12_RUN_ID}'
          AND canonical_origin='${P12_2_L10_12_ORIGIN}'
          AND observed_at='${P12_2_L10_12_OBSERVED_AT}'::timestamptz
          AND status='completed'
          AND receipt_fingerprint ~ '^[0-9a-f]{64}$'
          AND receipt_payload->>'packetFingerprint'='${P12_2_L10_12_PACKET_FINGERPRINT}'
          AND receipt_payload->>'invocationAttempt'='1'
          AND receipt_payload->>'automaticRetryPerformed'='false'
          AND receipt_payload->'result'->>'status'='completed'
          AND receipt_payload->'result'->>'receiptFingerprint' ~ '^[0-9a-f]{64}$'
          AND receipt_payload->>'fingerprint'=receipt_fingerprint
      ) = 1
      AND (
        SELECT count(*) FROM first_party_crawl_completed_runs
        WHERE site_id='${P12_2_L10_12_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_12_RUN_ID}'
          AND canonical_origin='${P12_2_L10_12_ORIGIN}'
          AND execution_plan_fingerprint='${P12_2_L10_12_EXECUTION_PLAN_FINGERPRINT}'
          AND snapshot_fingerprint ~ '^[0-9a-f]{64}$'
          AND snapshot_payload->>'fingerprint'=snapshot_fingerprint
          AND snapshot_payload->>'version'='p12-2-first-party-crawl-bridge-v1'
          AND snapshot_payload->'checkpoint'->>'status'='completed'
          AND snapshot_payload->'certification'->'certification'->>'wholeSiteCertified'='true'
      ) = 1
      AND (
        SELECT count(*) FROM first_party_crawl_incremental_receipts
        WHERE site_id='${P12_2_L10_12_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_12_RUN_ID}'
          AND canonical_origin='${P12_2_L10_12_ORIGIN}'
      ) = 0
    THEN 1 ELSE 0 END AS durable_completion_guard`,
  },
]);

const FORBIDDEN_SQL = /\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|comment|vacuum|analyze|refresh|reindex|cluster|copy|call|do|execute|prepare|deallocate|listen|notify|lock)\b/i;

function normalizedSql(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function assertP122L1012QueryContract(): void {
  if (P12_2_L10_12_QUERIES.length !== 10) throw new Error("p12_2_l10_12_query_count_invalid");
  const ids = P12_2_L10_12_QUERIES.map((query) => query.id);
  if (new Set(ids).size !== ids.length) throw new Error("p12_2_l10_12_query_id_duplicate");
  for (const query of P12_2_L10_12_QUERIES) {
    const sql = normalizedSql(query.sql);
    if (!/^SELECT\b/i.test(sql)) throw new Error("p12_2_l10_12_non_select_forbidden");
    if (FORBIDDEN_SQL.test(sql)) throw new Error("p12_2_l10_12_mutation_keyword_forbidden");
    if (sql.includes(";")) throw new Error("p12_2_l10_12_multi_statement_forbidden");
  }
}

export function p122L1012QuerySetFingerprint(): string {
  assertP122L1012QueryContract();
  return createHash("sha256")
    .update(JSON.stringify(P12_2_L10_12_QUERIES.map((query) => ({ id: query.id, sql: normalizedSql(query.sql) }))))
    .digest("hex");
}

export function p122L1012AuthorizationFingerprint(): string {
  return createHash("sha256")
    .update(JSON.stringify({
      version: P12_2_L10_12_VERSION,
      projectId: P12_2_L10_12_PROJECT_ID,
      environmentId: P12_2_L10_12_ENVIRONMENT_ID,
      postgresServiceId: P12_2_L10_12_POSTGRES_SERVICE_ID,
      siteId: P12_2_L10_12_SITE_ID,
      canonicalOrigin: P12_2_L10_12_ORIGIN,
      packetFingerprint: P12_2_L10_12_PACKET_FINGERPRINT,
      sourcePacketFingerprint: P12_2_L10_12_SOURCE_PACKET_FINGERPRINT,
      runId: P12_2_L10_12_RUN_ID,
      observedAt: P12_2_L10_12_OBSERVED_AT,
      phase: P12_2_L10_12_PHASE,
      sourceCheckpointRevision: P12_2_L10_12_SOURCE_CHECKPOINT_REVISION,
      sourceCheckpointFingerprint: P12_2_L10_12_SOURCE_CHECKPOINT_FINGERPRINT,
      executionPlanFingerprint: P12_2_L10_12_EXECUTION_PLAN_FINGERPRINT,
      querySetFingerprint: p122L1012QuerySetFingerprint(),
      attempts: 1,
      retries: 0,
      fallback: false,
      sessionReadOnly: true,
      crawlExecutionPossible: false,
    }))
    .digest("hex");
}

export function p122L1012AuthorizationLiteral(): string {
  return `AUTHORIZE:P12_2_L10_12_PACKET_012_READ_ONLY:${p122L1012AuthorizationFingerprint()}`;
}
