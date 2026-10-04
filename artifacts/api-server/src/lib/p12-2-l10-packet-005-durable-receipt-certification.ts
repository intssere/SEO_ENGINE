import { createHash } from "node:crypto";

export const P12_2_L10_VERSION = "p12-2-l10-packet-005-durable-receipt-cert-v1" as const;
export const P12_2_L10_PROJECT_ID = "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const P12_2_L10_ENVIRONMENT_ID = "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const P12_2_L10_POSTGRES_SERVICE_ID = "b69e0633-7ab9-40ab-85f3-c9edd6acb031" as const;
export const P12_2_L10_SITE_ID = "eb1da9ee-539c-4200-8f04-f64ccaea7768" as const;
export const P12_2_L10_ORIGIN = "https://diamondshelf.us" as const;
export const P12_2_L10_PACKET_FINGERPRINT = "669a9120f744e3470d1f106d7a094b414015d25b5da8f37ac2864765f4254f85" as const;
export const P12_2_L10_RUN_ID = "p12-2-diamond-shelf-bounded-pilot-005" as const;
export const P12_2_L10_OBSERVED_AT = "2026-10-04T10:34:36.551Z" as const;
export const P12_2_L10_PHASE = "bounded_pilot" as const;

export type P122L10Query = {
  id:
    | "database_identity"
    | "packet_identity_guard"
    | "invocation_receipt"
    | "checkpoint_state"
    | "completed_run_state"
    | "bounded_persistence_guard"
    | "durable_completion_guard";
  sql: string;
};

export const P12_2_L10_QUERIES: readonly P122L10Query[] = Object.freeze([
  {
    id: "database_identity",
    sql: "SELECT current_database() AS database_name, current_user AS database_user, current_setting('server_version') AS server_version",
  },
  {
    id: "packet_identity_guard",
    sql: `SELECT 1 / CASE WHEN (
      SELECT count(*) FROM first_party_crawl_l2_invocations
      WHERE packet_fingerprint='${P12_2_L10_PACKET_FINGERPRINT}'
        AND site_id='${P12_2_L10_SITE_ID}'::uuid
        AND phase='${P12_2_L10_PHASE}'
        AND run_id='${P12_2_L10_RUN_ID}'
        AND canonical_origin='${P12_2_L10_ORIGIN}'
        AND observed_at='${P12_2_L10_OBSERVED_AT}'::timestamptz
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
      receipt_payload->'result'->>'receiptFingerprint' AS bounded_crawl_receipt_fingerprint,
      receipt_payload->>'fingerprint' AS stored_receipt_fingerprint
    FROM first_party_crawl_l2_invocations
    WHERE packet_fingerprint='${P12_2_L10_PACKET_FINGERPRINT}'`,
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
      checkpoint_payload->'counters'->>'fetchedSuccessful' AS fetched_successful,
      checkpoint_payload->'counters'->>'noindex' AS noindex,
      checkpoint_payload->'counters'->>'redirects' AS redirects,
      checkpoint_payload->'counters'->>'robotsExcluded' AS robots_excluded,
      checkpoint_payload->'counters'->>'terminalFailures' AS terminal_failures
    FROM first_party_crawl_checkpoints
    WHERE site_id='${P12_2_L10_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_RUN_ID}'
      AND canonical_origin='${P12_2_L10_ORIGIN}'
    ORDER BY checkpoint_revision DESC`,
  },
  {
    id: "completed_run_state",
    sql: `SELECT count(*)::int AS completed_run_count
      FROM first_party_crawl_completed_runs
      WHERE site_id='${P12_2_L10_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_RUN_ID}'
        AND canonical_origin='${P12_2_L10_ORIGIN}'`,
  },
  {
    id: "bounded_persistence_guard",
    sql: `SELECT 1 / CASE WHEN
      EXISTS (
        SELECT 1 FROM first_party_crawl_checkpoints
        WHERE site_id='${P12_2_L10_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_RUN_ID}'
          AND canonical_origin='${P12_2_L10_ORIGIN}'
          AND checkpoint_payload->>'fingerprint'=checkpoint_fingerprint
      )
      AND NOT EXISTS (
        SELECT 1 FROM first_party_crawl_completed_runs
        WHERE site_id='${P12_2_L10_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_RUN_ID}'
          AND canonical_origin='${P12_2_L10_ORIGIN}'
      )
      THEN 1 ELSE 0 END AS bounded_persistence_guard`,
  },
  {
    id: "durable_completion_guard",
    sql: `SELECT 1 / CASE WHEN EXISTS (
      SELECT 1 FROM first_party_crawl_l2_invocations
      WHERE packet_fingerprint='${P12_2_L10_PACKET_FINGERPRINT}'
        AND site_id='${P12_2_L10_SITE_ID}'::uuid
        AND phase='${P12_2_L10_PHASE}'
        AND run_id='${P12_2_L10_RUN_ID}'
        AND canonical_origin='${P12_2_L10_ORIGIN}'
        AND observed_at='${P12_2_L10_OBSERVED_AT}'::timestamptz
        AND status='completed'
        AND receipt_fingerprint ~ '^[0-9a-f]{64}$'
        AND receipt_payload->>'packetFingerprint'='${P12_2_L10_PACKET_FINGERPRINT}'
        AND receipt_payload->>'phase'='${P12_2_L10_PHASE}'
        AND receipt_payload->>'runId'='${P12_2_L10_RUN_ID}'
        AND receipt_payload->>'invocationAttempt'='1'
        AND receipt_payload->>'automaticRetryPerformed'='false'
        AND receipt_payload->'result'->>'status'='completed'
        AND receipt_payload->'result'->>'receiptFingerprint' ~ '^[0-9a-f]{64}$'
        AND receipt_payload->>'fingerprint'=receipt_fingerprint
    ) THEN 1 ELSE 0 END AS durable_completion_guard`,
  },
]);

const FORBIDDEN_SQL = /\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|comment|vacuum|analyze|refresh|reindex|cluster|copy|call|do|execute|prepare|deallocate|listen|notify|lock)\b/i;
function normalizedSql(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function assertP122L10QueryContract(): void {
  if (P12_2_L10_QUERIES.length !== 7) throw new Error("p12_2_l10_query_count_invalid");
  const ids = P12_2_L10_QUERIES.map((query) => query.id);
  if (new Set(ids).size !== ids.length) throw new Error("p12_2_l10_query_id_duplicate");
  for (const query of P12_2_L10_QUERIES) {
    const sql = normalizedSql(query.sql);
    if (!/^SELECT\b/i.test(sql)) throw new Error("p12_2_l10_non_select_forbidden");
    if (FORBIDDEN_SQL.test(sql)) throw new Error("p12_2_l10_mutation_keyword_forbidden");
    if (sql.includes(";")) throw new Error("p12_2_l10_multi_statement_forbidden");
  }
}

export function p122L10QuerySetFingerprint(): string {
  assertP122L10QueryContract();
  return createHash("sha256")
    .update(JSON.stringify(P12_2_L10_QUERIES.map((query) => ({ id: query.id, sql: normalizedSql(query.sql) }))))
    .digest("hex");
}

export function p122L10AuthorizationFingerprint(): string {
  return createHash("sha256")
    .update(JSON.stringify({
      version: P12_2_L10_VERSION,
      projectId: P12_2_L10_PROJECT_ID,
      environmentId: P12_2_L10_ENVIRONMENT_ID,
      postgresServiceId: P12_2_L10_POSTGRES_SERVICE_ID,
      siteId: P12_2_L10_SITE_ID,
      canonicalOrigin: P12_2_L10_ORIGIN,
      packetFingerprint: P12_2_L10_PACKET_FINGERPRINT,
      runId: P12_2_L10_RUN_ID,
      observedAt: P12_2_L10_OBSERVED_AT,
      phase: P12_2_L10_PHASE,
      querySetFingerprint: p122L10QuerySetFingerprint(),
      attempts: 1,
      retries: 0,
      fallback: false,
      sessionReadOnly: true,
    }))
    .digest("hex");
}

export function p122L10AuthorizationLiteral(): string {
  return `AUTHORIZE:P12_2_L10_PACKET_005_READ_ONLY:${p122L10AuthorizationFingerprint()}`;
}
