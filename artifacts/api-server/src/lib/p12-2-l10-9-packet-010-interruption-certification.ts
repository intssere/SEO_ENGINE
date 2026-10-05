import { createHash } from "node:crypto";

export const P12_2_L10_9_VERSION = "p12-2-l10-9-packet-010-interruption-cert-v1" as const;
export const P12_2_L10_9_PROJECT_ID = "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const P12_2_L10_9_ENVIRONMENT_ID = "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const P12_2_L10_9_POSTGRES_SERVICE_ID = "b69e0633-7ab9-40ab-85f3-c9edd6acb031" as const;
export const P12_2_L10_9_SITE_ID = "eb1da9ee-539c-4200-8f04-f64ccaea7768" as const;
export const P12_2_L10_9_ORIGIN = "https://diamondshelf.us" as const;
export const P12_2_L10_9_PACKET_FINGERPRINT = "a93b76b252ecb9b9ac063675fcc99b5c70ad5af9c40092b5c2d8574476d1f6d6" as const;
export const P12_2_L10_9_RUN_ID = "p12-2-diamond-shelf-full-interrupt-010" as const;
export const P12_2_L10_9_OBSERVED_AT = "2026-10-05T09:22:00.000Z" as const;
export const P12_2_L10_9_PHASE = "full_interrupt" as const;
export const P12_2_L10_9_INTERRUPTION_REVISION = 3 as const;

export type P122L109Query = {
  id:
    | "database_identity"
    | "packet_identity_guard"
    | "invocation_receipt"
    | "checkpoint_state"
    | "completed_run_state"
    | "interruption_binding_guard"
    | "checkpoint_integrity_guard"
    | "durable_interruption_guard";
  sql: string;
};

export const P12_2_L10_9_QUERIES: readonly P122L109Query[] = Object.freeze([
  {
    id: "database_identity",
    sql: "SELECT current_database() AS database_name, current_user AS database_user, current_setting('server_version') AS server_version",
  },
  {
    id: "packet_identity_guard",
    sql: `SELECT 1 / CASE WHEN (
      SELECT count(*) FROM first_party_crawl_l2_invocations
      WHERE packet_fingerprint='${P12_2_L10_9_PACKET_FINGERPRINT}'
        AND site_id='${P12_2_L10_9_SITE_ID}'::uuid
        AND phase='${P12_2_L10_9_PHASE}'
        AND run_id='${P12_2_L10_9_RUN_ID}'
        AND canonical_origin='${P12_2_L10_9_ORIGIN}'
        AND observed_at='${P12_2_L10_9_OBSERVED_AT}'::timestamptz
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
      receipt_payload->'result'->>'checkpointRevision' AS checkpoint_revision,
      receipt_payload->'result'->>'checkpointFingerprint' AS checkpoint_fingerprint,
      receipt_payload->'result'->>'executionPlanFingerprint' AS execution_plan_fingerprint,
      receipt_payload->'result'->>'receiptFingerprint' AS crawl_receipt_fingerprint,
      receipt_payload->>'fingerprint' AS stored_receipt_fingerprint
    FROM first_party_crawl_l2_invocations
    WHERE packet_fingerprint='${P12_2_L10_9_PACKET_FINGERPRINT}'`,
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
      checkpoint_payload->>'inventoryFingerprint' AS inventory_fingerprint,
      checkpoint_payload->>'sequence' AS payload_sequence,
      checkpoint_payload->>'status' AS checkpoint_status,
      checkpoint_payload->>'activeBatchIndex' AS active_batch_index,
      checkpoint_payload->>'nextAttempt' AS next_attempt,
      jsonb_array_length(checkpoint_payload->'pendingCanonicalUrls') AS pending_url_count,
      jsonb_array_length(checkpoint_payload->'completedBatchIds') AS completed_batch_count,
      checkpoint_payload->'counters'->>'attemptsRecorded' AS attempts_recorded,
      checkpoint_payload->'counters'->>'fetchedSuccessful' AS fetched_successful,
      checkpoint_payload->'counters'->>'redirects' AS redirects,
      checkpoint_payload->'counters'->>'robotsExcluded' AS robots_excluded,
      checkpoint_payload->'counters'->>'noindex' AS noindex,
      checkpoint_payload->'counters'->>'terminalFailures' AS terminal_failures,
      checkpoint_payload->'counters'->>'retryScheduled' AS retry_scheduled,
      checkpoint_payload->'progress'->>'totalUrls' AS total_urls,
      checkpoint_payload->'progress'->>'finalizedUrls' AS finalized_urls,
      checkpoint_payload->'progress'->>'pendingUrls' AS pending_urls,
      checkpoint_payload->'progress'->>'completedBatches' AS completed_batches,
      checkpoint_payload->'progress'->>'totalBatches' AS total_batches,
      checkpoint_payload->'progress'->>'wholeSiteCertified' AS whole_site_certified
    FROM first_party_crawl_checkpoints
    WHERE site_id='${P12_2_L10_9_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_9_RUN_ID}'
      AND canonical_origin='${P12_2_L10_9_ORIGIN}'
    ORDER BY checkpoint_revision DESC`,
  },
  {
    id: "completed_run_state",
    sql: `SELECT count(*)::int AS completed_run_count
      FROM first_party_crawl_completed_runs
      WHERE site_id='${P12_2_L10_9_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_9_RUN_ID}'
        AND canonical_origin='${P12_2_L10_9_ORIGIN}'`,
  },
  {
    id: "interruption_binding_guard",
    sql: `SELECT 1 / CASE WHEN EXISTS (
      SELECT 1
      FROM first_party_crawl_l2_invocations i
      JOIN first_party_crawl_checkpoints c
        ON c.site_id=i.site_id
       AND c.run_id=i.run_id
       AND c.canonical_origin=i.canonical_origin
      WHERE i.packet_fingerprint='${P12_2_L10_9_PACKET_FINGERPRINT}'
        AND i.site_id='${P12_2_L10_9_SITE_ID}'::uuid
        AND i.phase='${P12_2_L10_9_PHASE}'
        AND i.run_id='${P12_2_L10_9_RUN_ID}'
        AND i.canonical_origin='${P12_2_L10_9_ORIGIN}'
        AND i.observed_at='${P12_2_L10_9_OBSERVED_AT}'::timestamptz
        AND i.status='completed'
        AND i.receipt_payload->'result'->>'status'='intentional_interruption'
        AND i.receipt_payload->'result'->>'checkpointRevision'='${P12_2_L10_9_INTERRUPTION_REVISION}'
        AND i.receipt_payload->'result'->>'checkpointFingerprint'=c.checkpoint_fingerprint
        AND i.receipt_payload->'result'->>'executionPlanFingerprint'=c.execution_plan_fingerprint
        AND c.checkpoint_revision=${P12_2_L10_9_INTERRUPTION_REVISION}
    ) THEN 1 ELSE 0 END AS interruption_binding_guard`,
  },
  {
    id: "checkpoint_integrity_guard",
    sql: `SELECT 1 / CASE WHEN EXISTS (
      SELECT 1
      FROM first_party_crawl_checkpoints
      WHERE site_id='${P12_2_L10_9_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_9_RUN_ID}'
        AND canonical_origin='${P12_2_L10_9_ORIGIN}'
        AND checkpoint_revision=${P12_2_L10_9_INTERRUPTION_REVISION}
        AND checkpoint_fingerprint ~ '^[0-9a-f]{64}$'
        AND execution_plan_fingerprint ~ '^[0-9a-f]{64}$'
        AND checkpoint_payload->>'version'='first_party_full_site_crawl_checkpoint_v1'
        AND checkpoint_payload->>'fingerprint'=checkpoint_fingerprint
        AND checkpoint_payload->>'planFingerprint'=execution_plan_fingerprint
        AND checkpoint_payload->>'siteId'='${P12_2_L10_9_SITE_ID}'
        AND checkpoint_payload->>'canonicalOrigin'='${P12_2_L10_9_ORIGIN}'
        AND checkpoint_payload->>'sequence'='${P12_2_L10_9_INTERRUPTION_REVISION}'
        AND checkpoint_payload->>'status'='pending'
        AND jsonb_typeof(checkpoint_payload->'pendingCanonicalUrls')='array'
        AND jsonb_typeof(checkpoint_payload->'completedBatchIds')='array'
        AND jsonb_typeof(checkpoint_payload->'counters')='object'
        AND jsonb_typeof(checkpoint_payload->'progress')='object'
        AND checkpoint_payload->'progress'->>'wholeSiteCertified'='false'
        AND checkpoint_payload->'authorization'->>'networkExecutionEnabled'='false'
        AND checkpoint_payload->'authorization'->>'crawlExecutionAuthorized'='false'
        AND checkpoint_payload->'authorization'->>'persistenceAuthorized'='false'
        AND checkpoint_payload->'authorization'->>'schedulerEnabled'='false'
        AND checkpoint_payload->'authorization'->>'batchExecutorEnabled'='false'
        AND checkpoint_payload->'authorization'->>'autonomousWorkerEnabled'='false'
        AND checkpoint_payload->'authorization'->>'retryLoopEnabled'='false'
        AND checkpoint_payload->'authorization'->>'competitorCollectionAuthorized'='false'
        AND checkpoint_payload->'authorization'->>'competitorPersistenceAuthorized'='false'
        AND checkpoint_payload->'authorization'->>'providerWrites'='false'
        AND checkpoint_payload->'authorization'->>'publicSiteWrites'='false'
    ) THEN 1 ELSE 0 END AS checkpoint_integrity_guard`,
  },
  {
    id: "durable_interruption_guard",
    sql: `SELECT 1 / CASE WHEN EXISTS (
      SELECT 1
      FROM first_party_crawl_l2_invocations i
      JOIN first_party_crawl_checkpoints c
        ON c.site_id=i.site_id
       AND c.run_id=i.run_id
       AND c.canonical_origin=i.canonical_origin
      WHERE i.packet_fingerprint='${P12_2_L10_9_PACKET_FINGERPRINT}'
        AND i.site_id='${P12_2_L10_9_SITE_ID}'::uuid
        AND i.phase='${P12_2_L10_9_PHASE}'
        AND i.run_id='${P12_2_L10_9_RUN_ID}'
        AND i.canonical_origin='${P12_2_L10_9_ORIGIN}'
        AND i.observed_at='${P12_2_L10_9_OBSERVED_AT}'::timestamptz
        AND i.status='completed'
        AND i.receipt_fingerprint ~ '^[0-9a-f]{64}$'
        AND i.receipt_payload->>'packetFingerprint'='${P12_2_L10_9_PACKET_FINGERPRINT}'
        AND i.receipt_payload->>'phase'='${P12_2_L10_9_PHASE}'
        AND i.receipt_payload->>'runId'='${P12_2_L10_9_RUN_ID}'
        AND i.receipt_payload->>'invocationAttempt'='1'
        AND i.receipt_payload->>'automaticRetryPerformed'='false'
        AND i.receipt_payload->'result'->>'status'='intentional_interruption'
        AND i.receipt_payload->'result'->>'checkpointRevision'='${P12_2_L10_9_INTERRUPTION_REVISION}'
        AND i.receipt_payload->'result'->>'checkpointFingerprint'=c.checkpoint_fingerprint
        AND i.receipt_payload->'result'->>'executionPlanFingerprint'=c.execution_plan_fingerprint
        AND i.receipt_payload->'result'->>'receiptFingerprint' ~ '^[0-9a-f]{64}$'
        AND i.receipt_payload->>'fingerprint'=i.receipt_fingerprint
        AND c.checkpoint_revision=${P12_2_L10_9_INTERRUPTION_REVISION}
        AND c.checkpoint_payload->>'fingerprint'=c.checkpoint_fingerprint
        AND c.checkpoint_payload->>'planFingerprint'=c.execution_plan_fingerprint
        AND c.checkpoint_payload->>'status'='pending'
        AND NOT EXISTS (
          SELECT 1 FROM first_party_crawl_completed_runs r
          WHERE r.site_id=i.site_id
            AND r.run_id=i.run_id
            AND r.canonical_origin=i.canonical_origin
        )
        AND NOT EXISTS (
          SELECT 1 FROM first_party_crawl_incremental_receipts ir
          WHERE ir.site_id=i.site_id
            AND ir.run_id=i.run_id
            AND ir.canonical_origin=i.canonical_origin
        )
    ) THEN 1 ELSE 0 END AS durable_interruption_guard`,
  },
]);

const FORBIDDEN_SQL = /\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|comment|vacuum|analyze|refresh|reindex|cluster|copy|call|do|execute|prepare|deallocate|listen|notify|lock)\b/i;

function normalizedSql(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function assertP122L109QueryContract(): void {
  if (P12_2_L10_9_QUERIES.length !== 8) throw new Error("p12_2_l10_9_query_count_invalid");
  const ids = P12_2_L10_9_QUERIES.map((query) => query.id);
  if (new Set(ids).size !== ids.length) throw new Error("p12_2_l10_9_query_id_duplicate");
  for (const query of P12_2_L10_9_QUERIES) {
    const sql = normalizedSql(query.sql);
    if (!/^SELECT\b/i.test(sql)) throw new Error("p12_2_l10_9_non_select_forbidden");
    if (FORBIDDEN_SQL.test(sql)) throw new Error("p12_2_l10_9_mutation_keyword_forbidden");
    if (sql.includes(";")) throw new Error("p12_2_l10_9_multi_statement_forbidden");
  }
}

export function p122L109QuerySetFingerprint(): string {
  assertP122L109QueryContract();
  return createHash("sha256")
    .update(JSON.stringify(P12_2_L10_9_QUERIES.map((query) => ({ id: query.id, sql: normalizedSql(query.sql) }))))
    .digest("hex");
}

export function p122L109AuthorizationFingerprint(): string {
  return createHash("sha256")
    .update(JSON.stringify({
      version: P12_2_L10_9_VERSION,
      projectId: P12_2_L10_9_PROJECT_ID,
      environmentId: P12_2_L10_9_ENVIRONMENT_ID,
      postgresServiceId: P12_2_L10_9_POSTGRES_SERVICE_ID,
      siteId: P12_2_L10_9_SITE_ID,
      canonicalOrigin: P12_2_L10_9_ORIGIN,
      packetFingerprint: P12_2_L10_9_PACKET_FINGERPRINT,
      runId: P12_2_L10_9_RUN_ID,
      observedAt: P12_2_L10_9_OBSERVED_AT,
      phase: P12_2_L10_9_PHASE,
      interruptionRevision: P12_2_L10_9_INTERRUPTION_REVISION,
      querySetFingerprint: p122L109QuerySetFingerprint(),
      attempts: 1,
      retries: 0,
      fallback: false,
      sessionReadOnly: true,
      crawlExecutionPossible: false,
    }))
    .digest("hex");
}

export function p122L109AuthorizationLiteral(): string {
  return `AUTHORIZE:P12_2_L10_9_PACKET_010_READ_ONLY:${p122L109AuthorizationFingerprint()}`;
}
