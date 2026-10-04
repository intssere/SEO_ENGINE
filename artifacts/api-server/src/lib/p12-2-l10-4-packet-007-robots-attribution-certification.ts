import { createHash } from "node:crypto";

export const P12_2_L10_4_VERSION = "p12-2-l10-4-packet-007-robots-attribution-cert-v1" as const;
export const P12_2_L10_4_PROJECT_ID = "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const P12_2_L10_4_ENVIRONMENT_ID = "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const P12_2_L10_4_POSTGRES_SERVICE_ID = "b69e0633-7ab9-40ab-85f3-c9edd6acb031" as const;
export const P12_2_L10_4_SITE_ID = "eb1da9ee-539c-4200-8f04-f64ccaea7768" as const;
export const P12_2_L10_4_ORIGIN = "https://diamondshelf.us" as const;
export const P12_2_L10_4_PACKET_FINGERPRINT = "dffb4db56c41d024f97fef80fd37e2f93adeb260136cbcd9554fefe6c43706a1" as const;
export const P12_2_L10_4_RUN_ID = "p12-2-diamond-shelf-bounded-pilot-007" as const;
export const P12_2_L10_4_OBSERVED_AT = "2026-10-04T15:39:52.448Z" as const;
export const P12_2_L10_4_PHASE = "bounded_pilot" as const;

export const P12_2_L10_4_ROBOTS_REASONS = Object.freeze([
  "http_unavailable",
  "redirect_limit",
  "response_oversize",
  "malformed_policy",
  "scope_validation",
  "secure_transport_rejection",
  "transport_error",
  "unclassified",
] as const);

export type P122L104Query = {
  id:
    | "database_identity"
    | "packet_identity_guard"
    | "invocation_receipt"
    | "checkpoint_state"
    | "completed_run_state"
    | "robots_attribution_state"
    | "bounded_persistence_guard"
    | "robots_reason_guard"
    | "durable_attribution_guard";
  sql: string;
};

const ROBOTS_REASON_SQL = P12_2_L10_4_ROBOTS_REASONS.map((reason) => `'${reason}'`).join(", ");

export const P12_2_L10_4_QUERIES: readonly P122L104Query[] = Object.freeze([
  {
    id: "database_identity",
    sql: "SELECT current_database() AS database_name, current_user AS database_user, current_setting('server_version') AS server_version",
  },
  {
    id: "packet_identity_guard",
    sql: `SELECT 1 / CASE WHEN (
      SELECT count(*) FROM first_party_crawl_l2_invocations
      WHERE packet_fingerprint='${P12_2_L10_4_PACKET_FINGERPRINT}'
        AND site_id='${P12_2_L10_4_SITE_ID}'::uuid
        AND phase='${P12_2_L10_4_PHASE}'
        AND run_id='${P12_2_L10_4_RUN_ID}'
        AND canonical_origin='${P12_2_L10_4_ORIGIN}'
        AND observed_at='${P12_2_L10_4_OBSERVED_AT}'::timestamptz
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
    WHERE packet_fingerprint='${P12_2_L10_4_PACKET_FINGERPRINT}'`,
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
    WHERE site_id='${P12_2_L10_4_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_4_RUN_ID}'
      AND canonical_origin='${P12_2_L10_4_ORIGIN}'
    ORDER BY checkpoint_revision DESC`,
  },
  {
    id: "completed_run_state",
    sql: `SELECT count(*)::int AS completed_run_count
      FROM first_party_crawl_completed_runs
      WHERE site_id='${P12_2_L10_4_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_4_RUN_ID}'
        AND canonical_origin='${P12_2_L10_4_ORIGIN}'`,
  },
  {
    id: "robots_attribution_state",
    sql: `SELECT
      receipt_payload->'result'->'boundedPilotFailureAttribution'->>'terminalFailures' AS attributed_terminal_failures,
      receipt_payload->'result'->'boundedPilotFailureAttribution'->>'policyRejections' AS policy_rejections,
      receipt_payload->'result'->'boundedPilotFailureAttribution'->'robotsPolicyRejections'->>'total' AS robots_policy_rejections,
      receipt_payload->'result'->'boundedPilotFailureAttribution'->'robotsPolicyRejections'->'reasons' AS robots_policy_rejection_reasons,
      receipt_payload->'result'->'boundedPilotFailureAttribution'->>'otherPolicyRejections' AS other_policy_rejections,
      receipt_payload->'result'->'boundedPilotFailureAttribution'->'permanentHttp' AS permanent_http,
      receipt_payload->'result'->'boundedPilotFailureAttribution'->'attemptsExhausted'->>'networkTimeout' AS exhausted_network_timeout,
      receipt_payload->'result'->'boundedPilotFailureAttribution'->'attemptsExhausted'->>'connectionReset' AS exhausted_connection_reset,
      receipt_payload->'result'->'boundedPilotFailureAttribution'->'attemptsExhausted'->>'transportUnavailable' AS exhausted_transport_unavailable,
      receipt_payload->'result'->'boundedPilotFailureAttribution'->'attemptsExhausted'->'http' AS exhausted_http
    FROM first_party_crawl_l2_invocations
    WHERE packet_fingerprint='${P12_2_L10_4_PACKET_FINGERPRINT}'`,
  },
  {
    id: "bounded_persistence_guard",
    sql: `SELECT 1 / CASE WHEN
      EXISTS (
        SELECT 1 FROM first_party_crawl_checkpoints
        WHERE site_id='${P12_2_L10_4_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_4_RUN_ID}'
          AND canonical_origin='${P12_2_L10_4_ORIGIN}'
          AND checkpoint_payload->>'fingerprint'=checkpoint_fingerprint
      )
      AND NOT EXISTS (
        SELECT 1 FROM first_party_crawl_completed_runs
        WHERE site_id='${P12_2_L10_4_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_4_RUN_ID}'
          AND canonical_origin='${P12_2_L10_4_ORIGIN}'
      )
      THEN 1 ELSE 0 END AS bounded_persistence_guard`,
  },
  {
    id: "robots_reason_guard",
    sql: `SELECT 1 / CASE WHEN EXISTS (
      SELECT 1
      FROM first_party_crawl_l2_invocations
      WHERE packet_fingerprint='${P12_2_L10_4_PACKET_FINGERPRINT}'
        AND jsonb_typeof(receipt_payload->'result'->'boundedPilotFailureAttribution'->'robotsPolicyRejections')='object'
        AND (receipt_payload->'result'->'boundedPilotFailureAttribution'->'robotsPolicyRejections'->>'total') ~ '^[0-9]+$'
        AND jsonb_typeof(receipt_payload->'result'->'boundedPilotFailureAttribution'->'robotsPolicyRejections'->'reasons')='array'
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(receipt_payload->'result'->'boundedPilotFailureAttribution'->'robotsPolicyRejections'->'reasons') AS item
          WHERE jsonb_typeof(item) <> 'object'
            OR item->>'reason' NOT IN (${ROBOTS_REASON_SQL})
            OR COALESCE(item->>'count', '') !~ '^[1-9][0-9]*$'
        )
        AND (
          SELECT count(*)
          FROM jsonb_array_elements(receipt_payload->'result'->'boundedPilotFailureAttribution'->'robotsPolicyRejections'->'reasons')
        ) = (
          SELECT count(DISTINCT item->>'reason')
          FROM jsonb_array_elements(receipt_payload->'result'->'boundedPilotFailureAttribution'->'robotsPolicyRejections'->'reasons') AS item
        )
        AND COALESCE((
          SELECT sum((item->>'count')::int)
          FROM jsonb_array_elements(receipt_payload->'result'->'boundedPilotFailureAttribution'->'robotsPolicyRejections'->'reasons') AS item
        ), 0) = (receipt_payload->'result'->'boundedPilotFailureAttribution'->'robotsPolicyRejections'->>'total')::int
        AND (
          (receipt_payload->'result'->'boundedPilotFailureAttribution'->'robotsPolicyRejections'->>'total')::int
          + (receipt_payload->'result'->'boundedPilotFailureAttribution'->>'otherPolicyRejections')::int
        ) = (receipt_payload->'result'->'boundedPilotFailureAttribution'->>'policyRejections')::int
    ) THEN 1 ELSE 0 END AS robots_reason_guard`,
  },
  {
    id: "durable_attribution_guard",
    sql: `SELECT 1 / CASE WHEN EXISTS (
      SELECT 1 FROM first_party_crawl_l2_invocations
      WHERE packet_fingerprint='${P12_2_L10_4_PACKET_FINGERPRINT}'
        AND site_id='${P12_2_L10_4_SITE_ID}'::uuid
        AND phase='${P12_2_L10_4_PHASE}'
        AND run_id='${P12_2_L10_4_RUN_ID}'
        AND canonical_origin='${P12_2_L10_4_ORIGIN}'
        AND observed_at='${P12_2_L10_4_OBSERVED_AT}'::timestamptz
        AND status='completed'
        AND receipt_fingerprint ~ '^[0-9a-f]{64}$'
        AND receipt_payload->>'packetFingerprint'='${P12_2_L10_4_PACKET_FINGERPRINT}'
        AND receipt_payload->>'phase'='${P12_2_L10_4_PHASE}'
        AND receipt_payload->>'runId'='${P12_2_L10_4_RUN_ID}'
        AND receipt_payload->>'invocationAttempt'='1'
        AND receipt_payload->>'automaticRetryPerformed'='false'
        AND receipt_payload->'result'->>'status'='completed'
        AND receipt_payload->'result'->>'receiptFingerprint' ~ '^[0-9a-f]{64}$'
        AND receipt_payload->>'fingerprint'=receipt_fingerprint
        AND jsonb_typeof(receipt_payload->'result'->'boundedPilotFailureAttribution')='object'
        AND (receipt_payload->'result'->'boundedPilotFailureAttribution'->>'terminalFailures') ~ '^[0-9]+$'
        AND (receipt_payload->'result'->'boundedPilotFailureAttribution'->>'policyRejections') ~ '^[0-9]+$'
        AND (receipt_payload->'result'->'boundedPilotFailureAttribution'->>'otherPolicyRejections') ~ '^[0-9]+$'
        AND jsonb_typeof(receipt_payload->'result'->'boundedPilotFailureAttribution'->'permanentHttp')='array'
        AND jsonb_typeof(receipt_payload->'result'->'boundedPilotFailureAttribution'->'attemptsExhausted')='object'
        AND (receipt_payload->'result'->'boundedPilotFailureAttribution'->'attemptsExhausted'->>'networkTimeout') ~ '^[0-9]+$'
        AND (receipt_payload->'result'->'boundedPilotFailureAttribution'->'attemptsExhausted'->>'connectionReset') ~ '^[0-9]+$'
        AND (receipt_payload->'result'->'boundedPilotFailureAttribution'->'attemptsExhausted'->>'transportUnavailable') ~ '^[0-9]+$'
        AND jsonb_typeof(receipt_payload->'result'->'boundedPilotFailureAttribution'->'attemptsExhausted'->'http')='array'
        AND (
          (receipt_payload->'result'->'boundedPilotFailureAttribution'->>'policyRejections')::int
          + COALESCE((SELECT sum((item->>'count')::int) FROM jsonb_array_elements(receipt_payload->'result'->'boundedPilotFailureAttribution'->'permanentHttp') AS item), 0)
          + (receipt_payload->'result'->'boundedPilotFailureAttribution'->'attemptsExhausted'->>'networkTimeout')::int
          + (receipt_payload->'result'->'boundedPilotFailureAttribution'->'attemptsExhausted'->>'connectionReset')::int
          + (receipt_payload->'result'->'boundedPilotFailureAttribution'->'attemptsExhausted'->>'transportUnavailable')::int
          + COALESCE((SELECT sum((item->>'count')::int) FROM jsonb_array_elements(receipt_payload->'result'->'boundedPilotFailureAttribution'->'attemptsExhausted'->'http') AS item), 0)
        ) = (receipt_payload->'result'->'boundedPilotFailureAttribution'->>'terminalFailures')::int
        AND (receipt_payload->'result'->'boundedPilotFailureAttribution'->>'terminalFailures')::int = (
          SELECT (checkpoint_payload->'counters'->>'terminalFailures')::int
          FROM first_party_crawl_checkpoints
          WHERE site_id='${P12_2_L10_4_SITE_ID}'::uuid
            AND run_id='${P12_2_L10_4_RUN_ID}'
            AND canonical_origin='${P12_2_L10_4_ORIGIN}'
          ORDER BY checkpoint_revision DESC
          LIMIT 1
        )
        AND NOT EXISTS (
          SELECT 1 FROM first_party_crawl_completed_runs
          WHERE site_id='${P12_2_L10_4_SITE_ID}'::uuid
            AND run_id='${P12_2_L10_4_RUN_ID}'
            AND canonical_origin='${P12_2_L10_4_ORIGIN}'
        )
    ) THEN 1 ELSE 0 END AS durable_attribution_guard`,
  },
]);

const FORBIDDEN_SQL = /\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|comment|vacuum|analyze|refresh|reindex|cluster|copy|call|do|execute|prepare|deallocate|listen|notify|lock)\b/i;
function normalizedSql(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function assertP122L104QueryContract(): void {
  if (P12_2_L10_4_QUERIES.length !== 9) throw new Error("p12_2_l10_4_query_count_invalid");
  const ids = P12_2_L10_4_QUERIES.map((query) => query.id);
  if (new Set(ids).size !== ids.length) throw new Error("p12_2_l10_4_query_id_duplicate");
  for (const query of P12_2_L10_4_QUERIES) {
    const sql = normalizedSql(query.sql);
    if (!/^SELECT\b/i.test(sql)) throw new Error("p12_2_l10_4_non_select_forbidden");
    if (FORBIDDEN_SQL.test(sql)) throw new Error("p12_2_l10_4_mutation_keyword_forbidden");
    if (sql.includes(";")) throw new Error("p12_2_l10_4_multi_statement_forbidden");
  }
}

export function p122L104QuerySetFingerprint(): string {
  assertP122L104QueryContract();
  return createHash("sha256")
    .update(JSON.stringify(P12_2_L10_4_QUERIES.map((query) => ({ id: query.id, sql: normalizedSql(query.sql) }))))
    .digest("hex");
}

export function p122L104AuthorizationFingerprint(): string {
  return createHash("sha256")
    .update(JSON.stringify({
      version: P12_2_L10_4_VERSION,
      projectId: P12_2_L10_4_PROJECT_ID,
      environmentId: P12_2_L10_4_ENVIRONMENT_ID,
      postgresServiceId: P12_2_L10_4_POSTGRES_SERVICE_ID,
      siteId: P12_2_L10_4_SITE_ID,
      canonicalOrigin: P12_2_L10_4_ORIGIN,
      packetFingerprint: P12_2_L10_4_PACKET_FINGERPRINT,
      runId: P12_2_L10_4_RUN_ID,
      observedAt: P12_2_L10_4_OBSERVED_AT,
      phase: P12_2_L10_4_PHASE,
      querySetFingerprint: p122L104QuerySetFingerprint(),
      attempts: 1,
      retries: 0,
      fallback: false,
      sessionReadOnly: true,
      crawlExecutionPossible: false,
    }))
    .digest("hex");
}

export function p122L104AuthorizationLiteral(): string {
  return `AUTHORIZE:P12_2_L10_4_PACKET_007_READ_ONLY:${p122L104AuthorizationFingerprint()}`;
}
