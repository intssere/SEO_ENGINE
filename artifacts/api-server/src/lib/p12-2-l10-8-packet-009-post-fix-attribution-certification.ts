import { createHash } from "node:crypto";

export const P12_2_L10_8_VERSION = "p12-2-l10-8-packet-009-post-fix-attribution-cert-v1" as const;
export const P12_2_L10_8_PROJECT_ID = "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const P12_2_L10_8_ENVIRONMENT_ID = "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const P12_2_L10_8_POSTGRES_SERVICE_ID = "b69e0633-7ab9-40ab-85f3-c9edd6acb031" as const;
export const P12_2_L10_8_SITE_ID = "eb1da9ee-539c-4200-8f04-f64ccaea7768" as const;
export const P12_2_L10_8_ORIGIN = "https://diamondshelf.us" as const;
export const P12_2_L10_8_PACKET_FINGERPRINT = "3f8197a30fea0b17e0d5b765cdbed7cd5dec447b00fe01b87c066e7d6303a342" as const;
export const P12_2_L10_8_RUN_ID = "p12-2-diamond-shelf-bounded-pilot-009" as const;
export const P12_2_L10_8_OBSERVED_AT = "2026-10-05T08:27:00.000Z" as const;
export const P12_2_L10_8_PHASE = "bounded_pilot" as const;

export const P12_2_L10_8_ROBOTS_REASONS = Object.freeze([
  "http_unavailable",
  "redirect_limit",
  "response_oversize",
  "malformed_policy",
  "scope_validation",
  "secure_transport_rejection",
  "transport_error",
  "unclassified",
] as const);

export const P12_2_L10_8_OTHER_POLICY_REASONS = Object.freeze([
  "response_oversize",
  "redirect_validation",
  "scope_validation",
  "secure_transport_rejection",
  "request_validation",
  "unclassified",
] as const);

export type P122L108Query = {
  id:
    | "database_identity"
    | "packet_identity_guard"
    | "invocation_receipt"
    | "checkpoint_state"
    | "completed_run_state"
    | "policy_attribution_state"
    | "bounded_persistence_guard"
    | "robots_reason_guard"
    | "other_policy_reason_guard"
    | "durable_attribution_guard";
  sql: string;
};

const ROBOTS_REASON_SQL = P12_2_L10_8_ROBOTS_REASONS.map((reason) => `'${reason}'`).join(", ");
const OTHER_POLICY_REASON_SQL = P12_2_L10_8_OTHER_POLICY_REASONS.map((reason) => `'${reason}'`).join(", ");

export const P12_2_L10_8_QUERIES: readonly P122L108Query[] = Object.freeze([
  {
    id: "database_identity",
    sql: "SELECT current_database() AS database_name, current_user AS database_user, current_setting('server_version') AS server_version",
  },
  {
    id: "packet_identity_guard",
    sql: `SELECT 1 / CASE WHEN (
      SELECT count(*) FROM first_party_crawl_l2_invocations
      WHERE packet_fingerprint='${P12_2_L10_8_PACKET_FINGERPRINT}'
        AND site_id='${P12_2_L10_8_SITE_ID}'::uuid
        AND phase='${P12_2_L10_8_PHASE}'
        AND run_id='${P12_2_L10_8_RUN_ID}'
        AND canonical_origin='${P12_2_L10_8_ORIGIN}'
        AND observed_at='${P12_2_L10_8_OBSERVED_AT}'::timestamptz
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
    WHERE packet_fingerprint='${P12_2_L10_8_PACKET_FINGERPRINT}'`,
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
    WHERE site_id='${P12_2_L10_8_SITE_ID}'::uuid
      AND run_id='${P12_2_L10_8_RUN_ID}'
      AND canonical_origin='${P12_2_L10_8_ORIGIN}'
    ORDER BY checkpoint_revision DESC`,
  },
  {
    id: "completed_run_state",
    sql: `SELECT count(*)::int AS completed_run_count
      FROM first_party_crawl_completed_runs
      WHERE site_id='${P12_2_L10_8_SITE_ID}'::uuid
        AND run_id='${P12_2_L10_8_RUN_ID}'
        AND canonical_origin='${P12_2_L10_8_ORIGIN}'`,
  },
  {
    id: "policy_attribution_state",
    sql: `SELECT
      receipt_payload->'result'->'boundedPilotFailureAttribution'->>'terminalFailures' AS attributed_terminal_failures,
      receipt_payload->'result'->'boundedPilotFailureAttribution'->>'policyRejections' AS policy_rejections,
      receipt_payload->'result'->'boundedPilotFailureAttribution'->'robotsPolicyRejections'->>'total' AS robots_policy_rejections,
      receipt_payload->'result'->'boundedPilotFailureAttribution'->'robotsPolicyRejections'->'reasons' AS robots_policy_rejection_reasons,
      receipt_payload->'result'->'boundedPilotFailureAttribution'->>'otherPolicyRejections' AS other_policy_rejections,
      receipt_payload->'result'->'boundedPilotFailureAttribution'->'otherPolicyRejectionReasons' AS other_policy_rejection_reasons,
      receipt_payload->'result'->'boundedPilotFailureAttribution'->'permanentHttp' AS permanent_http,
      receipt_payload->'result'->'boundedPilotFailureAttribution'->'attemptsExhausted'->>'networkTimeout' AS exhausted_network_timeout,
      receipt_payload->'result'->'boundedPilotFailureAttribution'->'attemptsExhausted'->>'connectionReset' AS exhausted_connection_reset,
      receipt_payload->'result'->'boundedPilotFailureAttribution'->'attemptsExhausted'->>'transportUnavailable' AS exhausted_transport_unavailable,
      receipt_payload->'result'->'boundedPilotFailureAttribution'->'attemptsExhausted'->'http' AS exhausted_http
    FROM first_party_crawl_l2_invocations
    WHERE packet_fingerprint='${P12_2_L10_8_PACKET_FINGERPRINT}'`,
  },
  {
    id: "bounded_persistence_guard",
    sql: `SELECT 1 / CASE WHEN
      EXISTS (
        SELECT 1 FROM first_party_crawl_checkpoints
        WHERE site_id='${P12_2_L10_8_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_8_RUN_ID}'
          AND canonical_origin='${P12_2_L10_8_ORIGIN}'
          AND checkpoint_payload->>'fingerprint'=checkpoint_fingerprint
      )
      AND NOT EXISTS (
        SELECT 1 FROM first_party_crawl_completed_runs
        WHERE site_id='${P12_2_L10_8_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_8_RUN_ID}'
          AND canonical_origin='${P12_2_L10_8_ORIGIN}'
      )
      THEN 1 ELSE 0 END AS bounded_persistence_guard`,
  },
  {
    id: "robots_reason_guard",
    sql: `SELECT 1 / CASE WHEN EXISTS (
      SELECT 1
      FROM first_party_crawl_l2_invocations
      WHERE packet_fingerprint='${P12_2_L10_8_PACKET_FINGERPRINT}'
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
    id: "other_policy_reason_guard",
    sql: `SELECT 1 / CASE WHEN EXISTS (
      SELECT 1
      FROM first_party_crawl_l2_invocations
      WHERE packet_fingerprint='${P12_2_L10_8_PACKET_FINGERPRINT}'
        AND (receipt_payload->'result'->'boundedPilotFailureAttribution'->>'otherPolicyRejections') ~ '^[0-9]+$'
        AND jsonb_typeof(receipt_payload->'result'->'boundedPilotFailureAttribution'->'otherPolicyRejectionReasons')='array'
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(receipt_payload->'result'->'boundedPilotFailureAttribution'->'otherPolicyRejectionReasons') AS item
          WHERE jsonb_typeof(item) <> 'object'
            OR item->>'reason' NOT IN (${OTHER_POLICY_REASON_SQL})
            OR COALESCE(item->>'count', '') !~ '^[1-9][0-9]*$'
        )
        AND (
          SELECT count(*)
          FROM jsonb_array_elements(receipt_payload->'result'->'boundedPilotFailureAttribution'->'otherPolicyRejectionReasons')
        ) = (
          SELECT count(DISTINCT item->>'reason')
          FROM jsonb_array_elements(receipt_payload->'result'->'boundedPilotFailureAttribution'->'otherPolicyRejectionReasons') AS item
        )
        AND COALESCE((
          SELECT sum((item->>'count')::int)
          FROM jsonb_array_elements(receipt_payload->'result'->'boundedPilotFailureAttribution'->'otherPolicyRejectionReasons') AS item
        ), 0) = (receipt_payload->'result'->'boundedPilotFailureAttribution'->>'otherPolicyRejections')::int
    ) THEN 1 ELSE 0 END AS other_policy_reason_guard`,
  },
  {
    id: "durable_attribution_guard",
    sql: `SELECT 1 / CASE WHEN EXISTS (
      SELECT 1 FROM first_party_crawl_l2_invocations
      WHERE packet_fingerprint='${P12_2_L10_8_PACKET_FINGERPRINT}'
        AND site_id='${P12_2_L10_8_SITE_ID}'::uuid
        AND phase='${P12_2_L10_8_PHASE}'
        AND run_id='${P12_2_L10_8_RUN_ID}'
        AND canonical_origin='${P12_2_L10_8_ORIGIN}'
        AND observed_at='${P12_2_L10_8_OBSERVED_AT}'::timestamptz
        AND status='completed'
        AND receipt_fingerprint ~ '^[0-9a-f]{64}$'
        AND receipt_payload->>'packetFingerprint'='${P12_2_L10_8_PACKET_FINGERPRINT}'
        AND receipt_payload->>'phase'='${P12_2_L10_8_PHASE}'
        AND receipt_payload->>'runId'='${P12_2_L10_8_RUN_ID}'
        AND receipt_payload->>'invocationAttempt'='1'
        AND receipt_payload->>'automaticRetryPerformed'='false'
        AND receipt_payload->'result'->>'status'='completed'
        AND receipt_payload->'result'->>'receiptFingerprint' ~ '^[0-9a-f]{64}$'
        AND receipt_payload->>'fingerprint'=receipt_fingerprint
        AND jsonb_typeof(receipt_payload->'result'->'boundedPilotFailureAttribution')='object'
        AND (receipt_payload->'result'->'boundedPilotFailureAttribution'->>'terminalFailures') ~ '^[0-9]+$'
        AND (receipt_payload->'result'->'boundedPilotFailureAttribution'->>'policyRejections') ~ '^[0-9]+$'
        AND (receipt_payload->'result'->'boundedPilotFailureAttribution'->>'otherPolicyRejections') ~ '^[0-9]+$'
        AND jsonb_typeof(receipt_payload->'result'->'boundedPilotFailureAttribution'->'otherPolicyRejectionReasons')='array'
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
          WHERE site_id='${P12_2_L10_8_SITE_ID}'::uuid
            AND run_id='${P12_2_L10_8_RUN_ID}'
            AND canonical_origin='${P12_2_L10_8_ORIGIN}'
          ORDER BY checkpoint_revision DESC
          LIMIT 1
        )
        AND NOT EXISTS (
          SELECT 1 FROM first_party_crawl_completed_runs
          WHERE site_id='${P12_2_L10_8_SITE_ID}'::uuid
            AND run_id='${P12_2_L10_8_RUN_ID}'
            AND canonical_origin='${P12_2_L10_8_ORIGIN}'
        )
    ) THEN 1 ELSE 0 END AS durable_attribution_guard`,
  },
]);

const FORBIDDEN_SQL = /\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|comment|vacuum|analyze|refresh|reindex|cluster|copy|call|do|execute|prepare|deallocate|listen|notify|lock)\b/i;
function normalizedSql(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function assertP122L108QueryContract(): void {
  if (P12_2_L10_8_QUERIES.length !== 10) throw new Error("p12_2_l10_8_query_count_invalid");
  const ids = P12_2_L10_8_QUERIES.map((query) => query.id);
  if (new Set(ids).size !== ids.length) throw new Error("p12_2_l10_8_query_id_duplicate");
  for (const query of P12_2_L10_8_QUERIES) {
    const sql = normalizedSql(query.sql);
    if (!/^SELECT\b/i.test(sql)) throw new Error("p12_2_l10_8_non_select_forbidden");
    if (FORBIDDEN_SQL.test(sql)) throw new Error("p12_2_l10_8_mutation_keyword_forbidden");
    if (sql.includes(";")) throw new Error("p12_2_l10_8_multi_statement_forbidden");
  }
}

export function p122L108QuerySetFingerprint(): string {
  assertP122L108QueryContract();
  return createHash("sha256")
    .update(JSON.stringify(P12_2_L10_8_QUERIES.map((query) => ({ id: query.id, sql: normalizedSql(query.sql) }))))
    .digest("hex");
}

export function p122L108AuthorizationFingerprint(): string {
  return createHash("sha256")
    .update(JSON.stringify({
      version: P12_2_L10_8_VERSION,
      projectId: P12_2_L10_8_PROJECT_ID,
      environmentId: P12_2_L10_8_ENVIRONMENT_ID,
      postgresServiceId: P12_2_L10_8_POSTGRES_SERVICE_ID,
      siteId: P12_2_L10_8_SITE_ID,
      canonicalOrigin: P12_2_L10_8_ORIGIN,
      packetFingerprint: P12_2_L10_8_PACKET_FINGERPRINT,
      runId: P12_2_L10_8_RUN_ID,
      observedAt: P12_2_L10_8_OBSERVED_AT,
      phase: P12_2_L10_8_PHASE,
      querySetFingerprint: p122L108QuerySetFingerprint(),
      attempts: 1,
      retries: 0,
      fallback: false,
      sessionReadOnly: true,
      crawlExecutionPossible: false,
    }))
    .digest("hex");
}

export function p122L108AuthorizationLiteral(): string {
  return `AUTHORIZE:P12_2_L10_8_PACKET_009_READ_ONLY:${p122L108AuthorizationFingerprint()}`;
}
