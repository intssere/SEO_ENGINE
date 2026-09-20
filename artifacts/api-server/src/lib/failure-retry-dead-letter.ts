import { createHash } from "node:crypto";
import {
  READ_SCHEDULER_QUEUE_VERSION,
  readSchedulerQueueCapability,
  type ReadWorkClass,
  type ReadWorkIntent,
} from "./read-scheduler-queue.js";
import {
  FIRST_PARTY_REFRESH_MATERIALIZATION_VERSION,
  firstPartyRefreshMaterializationCapability,
  type FirstPartyRefreshCandidate,
} from "./first-party-refresh-materialization.js";
import {
  SCHEDULED_CRAWL_POLICY_VERSION,
  scheduledCrawlPolicyCapability,
  type ScheduledCrawlPolicyCandidate,
} from "./scheduled-crawl-policy.js";
import {
  EXTERNAL_INTELLIGENCE_REFRESH_VERSION,
  externalIntelligenceRefreshCapability,
  type ExternalIntelligenceRefreshCandidate,
} from "./external-intelligence-refresh.js";

export const FAILURE_RETRY_DEAD_LETTER_VERSION =
  "p9-5-failure-retry-dead-letter-idempotency-v1" as const;

export const FAILURE_CONTROL_MAX_ATTEMPTS = 8;
export const FAILURE_CONTROL_MAX_BACKOFF_MINUTES = 10_080;
export const FAILURE_CONTROL_MAX_SUPPLIED_ATTEMPT_RECORDS = 32;

export type FailureControlArtifactKind =
  | "p9_1_read_work_intent"
  | "p9_2_first_party_refresh_candidate"
  | "p9_3_scheduled_crawl_candidate"
  | "p9_4_external_intelligence_candidate";

export type FailureControlArtifactInput =
  | {
      kind: "p9_1_read_work_intent";
      intent: ReadWorkIntent;
    }
  | {
      kind: "p9_2_first_party_refresh_candidate";
      intent: ReadWorkIntent;
      candidate: FirstPartyRefreshCandidate;
    }
  | {
      kind: "p9_3_scheduled_crawl_candidate";
      intent: ReadWorkIntent;
      candidate: ScheduledCrawlPolicyCandidate;
    }
  | {
      kind: "p9_4_external_intelligence_candidate";
      intent: ReadWorkIntent;
      candidate: ExternalIntelligenceRefreshCandidate;
    };

export type FailureControlArtifactReference = {
  kind: FailureControlArtifactKind;
  artifactVersion: string;
  artifactId: string;
  artifactFingerprint: string;
  artifactReferenceFingerprint: string;
  idempotencyKey: string;
  idempotencyFingerprint: string;
  workClass: ReadWorkClass;
  scheduleId: string;
  scheduleFingerprint: string;
  intentId: string;
  intentFingerprint: string;
  slotAt: string;
  expiresAt: string;
};

export type FailureControlFailureCode =
  | "transport_timeout"
  | "provider_rate_limited"
  | "provider_unavailable"
  | "dependency_unavailable"
  | "runner_failed"
  | "normalization_failed"
  | "stale_lineage"
  | "authorization_closed"
  | "invalid_input"
  | "identity_collision"
  | "claim_failed"
  | "manual_intervention_required"
  | "window_expired"
  | "unsupported_operation"
  | "already_consumed"
  | "unknown_failure";

export type FailureControlFailureClass =
  | "transient"
  | "throttled"
  | "integrity"
  | "stale_lineage"
  | "authorization_closed"
  | "invalid_input"
  | "manual_intervention"
  | "expired"
  | "permanent"
  | "idempotent_terminal"
  | "unknown";

export type FailureControlPolicy = {
  maxAttempts: number;
  baseBackoffMinutes: number;
  backoffMultiplier: number;
  maxBackoffMinutes: number;
};

export type FailureControlAttemptRecord = {
  version: typeof FAILURE_RETRY_DEAD_LETTER_VERSION;
  attemptId: string;
  attemptFingerprint: string;
  idempotencyKey: string;
  attemptNumber: number;
  attemptedAt: string;
  outcome: "succeeded" | "failed";
  failureCode: FailureControlFailureCode | null;
  failureClass: FailureControlFailureClass | null;
  retryable: boolean;
  safety: ReturnType<typeof failureRetryDeadLetterCapability>;
};

export type FailureControlRetryReviewIntent = {
  version: typeof FAILURE_RETRY_DEAD_LETTER_VERSION;
  retryIntentId: string;
  retryIntentFingerprint: string;
  lifecycle: "proposed_review";
  artifactReferenceFingerprint: string;
  idempotencyKey: string;
  previousAttemptId: string;
  previousAttemptFingerprint: string;
  previousAttemptNumber: number;
  nextAttemptNumber: number;
  failureCode: FailureControlFailureCode;
  failureClass: FailureControlFailureClass;
  backoffMinutes: number;
  eligibleAt: string;
  expiresAt: string;
  eligibility: "waiting" | "eligible_for_review";
  safety: ReturnType<typeof failureRetryDeadLetterCapability>;
};

export type FailureControlDeadLetterReason =
  | "work_window_expired_unattempted"
  | "non_retryable_failure"
  | "attempt_budget_exhausted"
  | "retry_window_expired";

export type FailureControlDeadLetterReview = {
  version: typeof FAILURE_RETRY_DEAD_LETTER_VERSION;
  deadLetterId: string;
  deadLetterFingerprint: string;
  lifecycle: "proposed_review";
  artifactReferenceFingerprint: string;
  idempotencyKey: string;
  reason: FailureControlDeadLetterReason;
  attemptCount: number;
  lastAttemptId: string | null;
  lastAttemptFingerprint: string | null;
  lastFailureCode: FailureControlFailureCode | null;
  lastFailureClass: FailureControlFailureClass | null;
  checkedAt: string;
  safety: ReturnType<typeof failureRetryDeadLetterCapability>;
};

export type FailureControlProjectionState =
  | "unattempted"
  | "succeeded"
  | "retry_review"
  | "dead_letter_review";

const HEX_64 = /^[0-9a-f]{64}$/;
const SCHEDULE_ID = /^rsq-[0-9a-f]{24}$/;
const INTENT_ID = /^rqi-[0-9a-f]{24}$/;
const SOURCE_ID = /^src-[0-9a-f]{24}$/;
const PLAN_ID = /^srp-[0-9a-f]{24}$/;
const REQUEST_ID = /^sar-[0-9a-f]{24}$/;
const WORK_CLASSES = new Set<ReadWorkClass>(["signal_refresh", "crawl_refresh"]);

const FAILURE_CLASSIFICATION: Record<
  FailureControlFailureCode,
  { failureClass: FailureControlFailureClass; retryable: boolean }
> = {
  transport_timeout: { failureClass: "transient", retryable: true },
  provider_rate_limited: { failureClass: "throttled", retryable: true },
  provider_unavailable: { failureClass: "transient", retryable: true },
  dependency_unavailable: { failureClass: "transient", retryable: true },
  runner_failed: { failureClass: "unknown", retryable: false },
  normalization_failed: { failureClass: "integrity", retryable: false },
  stale_lineage: { failureClass: "stale_lineage", retryable: false },
  authorization_closed: { failureClass: "authorization_closed", retryable: false },
  invalid_input: { failureClass: "invalid_input", retryable: false },
  identity_collision: { failureClass: "integrity", retryable: false },
  claim_failed: { failureClass: "manual_intervention", retryable: false },
  manual_intervention_required: { failureClass: "manual_intervention", retryable: false },
  window_expired: { failureClass: "expired", retryable: false },
  unsupported_operation: { failureClass: "permanent", retryable: false },
  already_consumed: { failureClass: "idempotent_terminal", retryable: false },
  unknown_failure: { failureClass: "unknown", retryable: false },
};

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort((a, b) => a.localeCompare(b))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key])).join(",") + "}";
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function timestamp(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 64) {
    throw new Error("invalid_" + field);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error("invalid_" + field);
  return new Date(milliseconds).toISOString();
}

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) throw new Error("invalid_" + field);
  return value;
}

function integer(value: unknown, min: number, max: number, field: string): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new Error("invalid_" + field);
  }
  return value as number;
}

function exactSafety(actual: unknown, expected: unknown, field: string): void {
  if (stableJson(actual) !== stableJson(expected)) throw new Error(field + "_mismatch");
}

function exactStringArray(actual: unknown, expected: string[], field: string): void {
  if (
    !Array.isArray(actual)
    || actual.some((value) => typeof value !== "string")
    || stableJson(actual) !== stableJson(expected)
  ) {
    throw new Error(field + "_mismatch");
  }
}

function validateCommonIntentIdentity(input: {
  scheduleId: unknown;
  scheduleFingerprint: unknown;
  intentId: unknown;
  intentFingerprint: unknown;
  slotAt: unknown;
  expiresAt: unknown;
}) {
  if (typeof input.scheduleId !== "string" || !SCHEDULE_ID.test(input.scheduleId)) {
    throw new Error("invalid_schedule_id");
  }
  exactFingerprint(input.scheduleFingerprint, "schedule_fingerprint");
  if (typeof input.intentId !== "string" || !INTENT_ID.test(input.intentId)) {
    throw new Error("invalid_intent_id");
  }
  exactFingerprint(input.intentFingerprint, "intent_fingerprint");
  const slotAt = timestamp(input.slotAt, "slot_at");
  const expiresAt = timestamp(input.expiresAt, "expires_at");
  if (slotAt !== input.slotAt || expiresAt !== input.expiresAt) {
    throw new Error("noncanonical_work_window_timestamp");
  }
  if (Date.parse(expiresAt) <= Date.parse(slotAt)) throw new Error("invalid_work_window");
  return { slotAt, expiresAt };
}

function validateReadWorkIntent(intent: ReadWorkIntent): ReadWorkIntent {
  if (!intent || typeof intent !== "object") throw new Error("invalid_read_work_intent");
  if (intent.version !== READ_SCHEDULER_QUEUE_VERSION) {
    throw new Error("unsupported_read_work_intent_version");
  }
  if (intent.lifecycle !== "proposed") throw new Error("invalid_read_work_intent_lifecycle");
  if (!WORK_CLASSES.has(intent.workClass)) throw new Error("invalid_read_work_class");
  if (typeof intent.key !== "string" || !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(intent.key)) {
    throw new Error("invalid_read_work_key");
  }
  validateCommonIntentIdentity(intent);
  exactFingerprint(intent.scopeFingerprint, "scope_fingerprint");
  exactFingerprint(intent.upstreamLineageFingerprint, "upstream_lineage_fingerprint");
  exactSafety(intent.safety, readSchedulerQueueCapability(), "read_work_intent_safety");

  const identity = {
    scheduleId: intent.scheduleId,
    scheduleFingerprint: intent.scheduleFingerprint,
    key: intent.key,
    workClass: intent.workClass,
    scopeFingerprint: intent.scopeFingerprint,
    upstreamLineageFingerprint: intent.upstreamLineageFingerprint,
    slotAt: intent.slotAt,
    expiresAt: intent.expiresAt,
    lifecycle: intent.lifecycle,
    safety: intent.safety,
  };
  const expectedFingerprint = stableHash({
    version: READ_SCHEDULER_QUEUE_VERSION,
    purpose: "read_work_intent",
    ...identity,
  });
  const expectedId = "rqi-" + expectedFingerprint.slice(0, 24);
  if (
    intent.intentFingerprint !== expectedFingerprint
    || intent.intentId !== expectedId
  ) {
    throw new Error("read_work_intent_identity_mismatch");
  }
  return intent;
}

function validateCandidateEnvelope(input: {
  candidate: {
    version: string;
    candidateId: string;
    candidateFingerprint: string;
    lifecycle: string;
    safety: unknown;
  } & Record<string, unknown>;
  version: string;
  idPrefix: string;
  purpose: string;
  expectedSafety: unknown;
}) {
  const candidate = input.candidate;
  if (candidate.version !== input.version) throw new Error("unsupported_candidate_version");
  if (candidate.lifecycle !== "proposed_review") throw new Error("invalid_candidate_lifecycle");
  if (
    typeof candidate.candidateId !== "string"
    || !new RegExp("^" + input.idPrefix + "-[0-9a-f]{24}$").test(candidate.candidateId)
  ) throw new Error("invalid_candidate_id");
  exactFingerprint(candidate.candidateFingerprint, "candidate_fingerprint");
  exactSafety(candidate.safety, input.expectedSafety, "candidate_safety");

  const {
    version: _version,
    candidateId: _candidateId,
    candidateFingerprint: _candidateFingerprint,
    ...identity
  } = candidate;
  const expectedFingerprint = stableHash({
    version: input.version,
    purpose: input.purpose,
    ...identity,
  });
  const expectedId = input.idPrefix + "-" + expectedFingerprint.slice(0, 24);
  if (
    candidate.candidateFingerprint !== expectedFingerprint
    || candidate.candidateId !== expectedId
  ) {
    throw new Error("candidate_identity_mismatch");
  }
}

function validateCandidateIntentBinding(
  candidate: {
    scheduleId: string;
    scheduleFingerprint: string;
    intentId: string;
    intentFingerprint: string;
    slotAt: string;
    expiresAt: string;
  },
  intent: ReadWorkIntent,
  expectedWorkClass: ReadWorkClass,
): void {
  if (intent.workClass !== expectedWorkClass) throw new Error("candidate_work_class_mismatch");
  validateCommonIntentIdentity(candidate);
  if (
    candidate.scheduleId !== intent.scheduleId
    || candidate.scheduleFingerprint !== intent.scheduleFingerprint
    || candidate.intentId !== intent.intentId
    || candidate.intentFingerprint !== intent.intentFingerprint
    || candidate.slotAt !== intent.slotAt
    || candidate.expiresAt !== intent.expiresAt
  ) {
    throw new Error("candidate_intent_lineage_mismatch");
  }
}

function validateP92Candidate(
  candidate: FirstPartyRefreshCandidate,
  intent: ReadWorkIntent,
): FirstPartyRefreshCandidate {
  validateCandidateEnvelope({
    candidate: candidate as FirstPartyRefreshCandidate & Record<string, unknown>,
    version: FIRST_PARTY_REFRESH_MATERIALIZATION_VERSION,
    idPrefix: "fpr",
    purpose: "first_party_refresh_materialization_review",
    expectedSafety: firstPartyRefreshMaterializationCapability(),
  });
  validateCandidateIntentBinding(candidate, intent, "signal_refresh");
  if (typeof candidate.sourceId !== "string" || !SOURCE_ID.test(candidate.sourceId)) {
    throw new Error("invalid_first_party_source_id");
  }
  exactFingerprint(candidate.sourceFingerprint, "first_party_source_fingerprint");
  if (typeof candidate.planId !== "string" || !PLAN_ID.test(candidate.planId)) {
    throw new Error("invalid_first_party_plan_id");
  }
  exactFingerprint(candidate.planFingerprint, "first_party_plan_fingerprint");
  if (typeof candidate.requestId !== "string" || !REQUEST_ID.test(candidate.requestId)) {
    throw new Error("invalid_first_party_request_id");
  }
  exactFingerprint(candidate.requestFingerprint, "first_party_request_fingerprint");

  if (candidate.channel === "gsc_search_analytics") {
    if (candidate.runnerFoundationStatus !== "runner_foundation_available") {
      throw new Error("gsc_runner_foundation_status_mismatch");
    }
    exactStringArray(candidate.blockers, [], "gsc_runner_blockers");
  } else if (candidate.channel === "analytics") {
    if (candidate.runnerFoundationStatus !== "runner_foundation_unavailable") {
      throw new Error("analytics_runner_foundation_status_mismatch");
    }
    exactStringArray(
      candidate.blockers,
      ["task70_compatible_analytics_runner_unavailable"],
      "analytics_runner_blockers",
    );
  } else if (candidate.channel === "catalog") {
    if (candidate.runnerFoundationStatus !== "runner_foundation_unavailable") {
      throw new Error("catalog_runner_foundation_status_mismatch");
    }
    exactStringArray(
      candidate.blockers,
      ["task70_compatible_catalog_runner_unavailable"],
      "catalog_runner_blockers",
    );
  } else {
    throw new Error("unsupported_first_party_candidate_channel");
  }
  return candidate;
}

function validateP93Candidate(
  candidate: ScheduledCrawlPolicyCandidate,
  intent: ReadWorkIntent,
): ScheduledCrawlPolicyCandidate {
  validateCandidateEnvelope({
    candidate: candidate as ScheduledCrawlPolicyCandidate & Record<string, unknown>,
    version: SCHEDULED_CRAWL_POLICY_VERSION,
    idPrefix: "crp",
    purpose: "scheduled_crawl_policy_review",
    expectedSafety: scheduledCrawlPolicyCapability(),
  });
  validateCandidateIntentBinding(candidate, intent, "crawl_refresh");

  const fullReasons = new Set([
    "scheduled_full_reconciliation",
    "current_full_site_not_certified",
    "incremental_evidence_unavailable",
    "aggregate_regression_without_url_level_evidence",
    "lineage_change_without_url_level_evidence",
  ]);
  if (candidate.selection === "full_reconciliation") {
    if (!fullReasons.has(candidate.reason)) throw new Error("crawl_full_reason_mismatch");
    if (!candidate.work.requiresWholeSiteCertification) {
      throw new Error("crawl_full_certification_requirement_mismatch");
    }
  } else if (candidate.selection === "incremental") {
    if (
      candidate.reason !== "incremental_candidates_available"
      || candidate.work.selectedUrlCount < 1
      || candidate.work.requiresWholeSiteCertification
    ) throw new Error("crawl_incremental_semantics_mismatch");
  } else if (candidate.selection === "no_work") {
    if (
      candidate.reason !== "no_incremental_candidates"
      || candidate.work.selectedUrlCount !== 0
      || candidate.work.deferredUrlCount !== 0
      || candidate.work.batchCount !== 0
      || candidate.work.requiresWholeSiteCertification
    ) throw new Error("crawl_no_work_semantics_mismatch");
  } else {
    throw new Error("unsupported_crawl_policy_selection");
  }

  integer(candidate.slotIndex, 0, Number.MAX_SAFE_INTEGER, "crawl_slot_index");
  integer(
    candidate.fullReconciliationEverySlots,
    1,
    720,
    "crawl_full_reconciliation_interval",
  );
  integer(candidate.work.selectedUrlCount, 0, Number.MAX_SAFE_INTEGER, "crawl_selected_url_count");
  integer(candidate.work.deferredUrlCount, 0, Number.MAX_SAFE_INTEGER, "crawl_deferred_url_count");
  integer(candidate.work.batchCount, 0, Number.MAX_SAFE_INTEGER, "crawl_batch_count");
  return candidate;
}

function validateP94Candidate(
  candidate: ExternalIntelligenceRefreshCandidate,
  intent: ReadWorkIntent,
): ExternalIntelligenceRefreshCandidate {
  validateCandidateEnvelope({
    candidate: candidate as ExternalIntelligenceRefreshCandidate & Record<string, unknown>,
    version: EXTERNAL_INTELLIGENCE_REFRESH_VERSION,
    idPrefix: "eir",
    purpose: "external_intelligence_refresh_review",
    expectedSafety: externalIntelligenceRefreshCapability(),
  });
  validateCandidateIntentBinding(candidate, intent, "signal_refresh");
  if (
    candidate.suppliedResultFoundationStatus !== "available"
    || candidate.liveRuntimeStatus !== "unavailable"
    || !Array.isArray(candidate.liveRuntimeBlockers)
    || candidate.liveRuntimeBlockers.length < 1
  ) {
    throw new Error("external_runtime_boundary_mismatch");
  }

  const providerExpected =
    candidate.adapterKind === "supplied_backlink_fixture" ? null : "dataforseo";
  if (
    ![
      "dataforseo_serp",
      "dataforseo_keyword",
      "dataforseo_trend",
      "supplied_backlink_fixture",
    ].includes(candidate.adapterKind)
    || candidate.providerKey !== providerExpected
  ) {
    throw new Error("external_adapter_provider_mismatch");
  }

  if (candidate.reviewDisposition === "deferred_review") {
    if (candidate.reviewBlockers.length < 1) throw new Error("external_deferred_review_without_blocker");
  } else if (
    candidate.reviewDisposition === "supplied_review_ready"
    || candidate.reviewDisposition === "supplied_review_caution"
  ) {
    if (candidate.reviewBlockers.length !== 0) throw new Error("external_non_deferred_review_has_blocker");
  } else {
    throw new Error("invalid_external_review_disposition");
  }

  if (typeof candidate.sourceId !== "string" || !SOURCE_ID.test(candidate.sourceId)) {
    throw new Error("invalid_external_source_id");
  }
  exactFingerprint(candidate.sourceFingerprint, "external_source_fingerprint");
  if (typeof candidate.planId !== "string" || !PLAN_ID.test(candidate.planId)) {
    throw new Error("invalid_external_plan_id");
  }
  exactFingerprint(candidate.planFingerprint, "external_plan_fingerprint");
  if (typeof candidate.requestId !== "string" || !REQUEST_ID.test(candidate.requestId)) {
    throw new Error("invalid_external_request_id");
  }
  exactFingerprint(candidate.requestFingerprint, "external_request_fingerprint");
  exactFingerprint(
    candidate.adapterCapabilityFingerprint,
    "external_adapter_capability_fingerprint",
  );
  exactFingerprint(candidate.telemetry.reportFingerprint, "telemetry_report_fingerprint");
  exactFingerprint(candidate.telemetry.streamFingerprint, "telemetry_stream_fingerprint");
  return candidate;
}

function artifactReference(input: {
  kind: FailureControlArtifactKind;
  artifactVersion: string;
  artifactId: string;
  artifactFingerprint: string;
  intent: ReadWorkIntent;
}): FailureControlArtifactReference {
  const base = {
    kind: input.kind,
    artifactVersion: input.artifactVersion,
    artifactId: input.artifactId,
    artifactFingerprint: input.artifactFingerprint,
    workClass: input.intent.workClass,
    scheduleId: input.intent.scheduleId,
    scheduleFingerprint: input.intent.scheduleFingerprint,
    intentId: input.intent.intentId,
    intentFingerprint: input.intent.intentFingerprint,
    slotAt: input.intent.slotAt,
    expiresAt: input.intent.expiresAt,
  };
  const artifactReferenceFingerprint = stableHash({
    version: FAILURE_RETRY_DEAD_LETTER_VERSION,
    purpose: "failure_control_artifact_reference",
    ...base,
  });
  const idempotencyFingerprint = stableHash({
    version: FAILURE_RETRY_DEAD_LETTER_VERSION,
    purpose: "failure_control_idempotency_identity",
    artifactReferenceFingerprint,
    artifactFingerprint: input.artifactFingerprint,
    intentFingerprint: input.intent.intentFingerprint,
  });
  return {
    ...base,
    artifactReferenceFingerprint,
    idempotencyKey: "idk-" + idempotencyFingerprint.slice(0, 24),
    idempotencyFingerprint,
  };
}

export function normalizeFailureControlArtifact(
  input: FailureControlArtifactInput,
): FailureControlArtifactReference {
  const intent = validateReadWorkIntent(input.intent);
  if (input.kind === "p9_1_read_work_intent") {
    return artifactReference({
      kind: input.kind,
      artifactVersion: intent.version,
      artifactId: intent.intentId,
      artifactFingerprint: intent.intentFingerprint,
      intent,
    });
  }
  if (input.kind === "p9_2_first_party_refresh_candidate") {
    const candidate = validateP92Candidate(input.candidate, intent);
    return artifactReference({
      kind: input.kind,
      artifactVersion: candidate.version,
      artifactId: candidate.candidateId,
      artifactFingerprint: candidate.candidateFingerprint,
      intent,
    });
  }
  if (input.kind === "p9_3_scheduled_crawl_candidate") {
    const candidate = validateP93Candidate(input.candidate, intent);
    return artifactReference({
      kind: input.kind,
      artifactVersion: candidate.version,
      artifactId: candidate.candidateId,
      artifactFingerprint: candidate.candidateFingerprint,
      intent,
    });
  }
  if (input.kind === "p9_4_external_intelligence_candidate") {
    const candidate = validateP94Candidate(input.candidate, intent);
    return artifactReference({
      kind: input.kind,
      artifactVersion: candidate.version,
      artifactId: candidate.candidateId,
      artifactFingerprint: candidate.candidateFingerprint,
      intent,
    });
  }
  throw new Error("unsupported_failure_control_artifact");
}

export function classifyFailureCode(code: FailureControlFailureCode) {
  const classification = FAILURE_CLASSIFICATION[code];
  if (!classification) throw new Error("unsupported_failure_code");
  return { ...classification };
}

export function normalizeFailureControlPolicy(
  policy: FailureControlPolicy,
): FailureControlPolicy {
  const maxAttempts = integer(
    policy.maxAttempts,
    1,
    FAILURE_CONTROL_MAX_ATTEMPTS,
    "failure_control_max_attempts",
  );
  const baseBackoffMinutes = integer(
    policy.baseBackoffMinutes,
    1,
    1_440,
    "failure_control_base_backoff_minutes",
  );
  const backoffMultiplier = integer(
    policy.backoffMultiplier,
    1,
    4,
    "failure_control_backoff_multiplier",
  );
  const maxBackoffMinutes = integer(
    policy.maxBackoffMinutes,
    baseBackoffMinutes,
    FAILURE_CONTROL_MAX_BACKOFF_MINUTES,
    "failure_control_max_backoff_minutes",
  );
  return {
    maxAttempts,
    baseBackoffMinutes,
    backoffMultiplier,
    maxBackoffMinutes,
  };
}

function attemptIdentity(
  attempt: Omit<
    FailureControlAttemptRecord,
    "version" | "attemptId" | "attemptFingerprint"
  >,
) {
  return attempt;
}

export function buildFailureControlAttemptRecord(input: {
  artifact: FailureControlArtifactInput;
  attemptNumber: number;
  attemptedAt: string;
  outcome: "succeeded" | "failed";
  failureCode?: FailureControlFailureCode | null;
}): FailureControlAttemptRecord {
  const artifact = normalizeFailureControlArtifact(input.artifact);
  const attemptNumber = integer(
    input.attemptNumber,
    1,
    FAILURE_CONTROL_MAX_SUPPLIED_ATTEMPT_RECORDS,
    "attempt_number",
  );
  const attemptedAt = timestamp(input.attemptedAt, "attempted_at");
  if (Date.parse(attemptedAt) < Date.parse(artifact.slotAt)) {
    throw new Error("attempt_before_original_slot");
  }
  if (Date.parse(attemptedAt) >= Date.parse(artifact.expiresAt)) {
    throw new Error("attempt_outside_original_work_window");
  }

  let failureCode: FailureControlFailureCode | null = null;
  let failureClass: FailureControlFailureClass | null = null;
  let retryable = false;
  if (input.outcome === "failed") {
    if (!input.failureCode) throw new Error("failed_attempt_requires_failure_code");
    const classification = classifyFailureCode(input.failureCode);
    failureCode = input.failureCode;
    failureClass = classification.failureClass;
    retryable = classification.retryable;
  } else if (input.outcome === "succeeded") {
    if (input.failureCode !== undefined && input.failureCode !== null) {
      throw new Error("successful_attempt_cannot_have_failure_code");
    }
  } else {
    throw new Error("invalid_attempt_outcome");
  }

  const safety = failureRetryDeadLetterCapability();
  const identity = attemptIdentity({
    idempotencyKey: artifact.idempotencyKey,
    attemptNumber,
    attemptedAt,
    outcome: input.outcome,
    failureCode,
    failureClass,
    retryable,
    safety,
  });
  const attemptFingerprint = stableHash({
    version: FAILURE_RETRY_DEAD_LETTER_VERSION,
    purpose: "failure_control_attempt_record",
    ...identity,
  });
  return {
    version: FAILURE_RETRY_DEAD_LETTER_VERSION,
    attemptId: "fra-" + attemptFingerprint.slice(0, 24),
    attemptFingerprint,
    ...identity,
  };
}

function validateAttemptRecord(
  record: FailureControlAttemptRecord,
  artifact: FailureControlArtifactReference,
): FailureControlAttemptRecord {
  if (record.version !== FAILURE_RETRY_DEAD_LETTER_VERSION) {
    throw new Error("unsupported_attempt_record_version");
  }
  if (typeof record.attemptId !== "string" || !/^fra-[0-9a-f]{24}$/.test(record.attemptId)) {
    throw new Error("invalid_attempt_id");
  }
  exactFingerprint(record.attemptFingerprint, "attempt_fingerprint");
  if (record.idempotencyKey !== artifact.idempotencyKey) {
    throw new Error("attempt_idempotency_key_mismatch");
  }
  integer(
    record.attemptNumber,
    1,
    FAILURE_CONTROL_MAX_SUPPLIED_ATTEMPT_RECORDS,
    "attempt_number",
  );
  const attemptedAt = timestamp(record.attemptedAt, "attempted_at");
  if (attemptedAt !== record.attemptedAt) throw new Error("noncanonical_attempt_timestamp");
  if (Date.parse(attemptedAt) < Date.parse(artifact.slotAt)) {
    throw new Error("attempt_before_original_slot");
  }
  if (Date.parse(attemptedAt) >= Date.parse(artifact.expiresAt)) {
    throw new Error("attempt_outside_original_work_window");
  }

  if (record.outcome === "succeeded") {
    if (
      record.failureCode !== null
      || record.failureClass !== null
      || record.retryable !== false
    ) throw new Error("successful_attempt_failure_semantics_mismatch");
  } else if (record.outcome === "failed") {
    if (!record.failureCode) throw new Error("failed_attempt_requires_failure_code");
    const expected = classifyFailureCode(record.failureCode);
    if (
      record.failureClass !== expected.failureClass
      || record.retryable !== expected.retryable
    ) throw new Error("failure_classification_mismatch");
  } else {
    throw new Error("invalid_attempt_outcome");
  }

  exactSafety(record.safety, failureRetryDeadLetterCapability(), "attempt_safety");
  const identity = attemptIdentity({
    idempotencyKey: record.idempotencyKey,
    attemptNumber: record.attemptNumber,
    attemptedAt: record.attemptedAt,
    outcome: record.outcome,
    failureCode: record.failureCode,
    failureClass: record.failureClass,
    retryable: record.retryable,
    safety: record.safety,
  });
  const expectedFingerprint = stableHash({
    version: FAILURE_RETRY_DEAD_LETTER_VERSION,
    purpose: "failure_control_attempt_record",
    ...identity,
  });
  if (
    record.attemptFingerprint !== expectedFingerprint
    || record.attemptId !== "fra-" + expectedFingerprint.slice(0, 24)
  ) throw new Error("attempt_record_identity_mismatch");
  return record;
}

function normalizeAttemptHistory(input: {
  records: FailureControlAttemptRecord[];
  artifact: FailureControlArtifactReference;
  checkedAt: string;
  policy: FailureControlPolicy;
}) {
  if (
    !Array.isArray(input.records)
    || input.records.length > FAILURE_CONTROL_MAX_SUPPLIED_ATTEMPT_RECORDS
  ) throw new Error("invalid_supplied_attempt_record_count");

  const byNumber = new Map<number, FailureControlAttemptRecord>();
  let duplicateCount = 0;
  for (const raw of input.records) {
    const record = validateAttemptRecord(raw, input.artifact);
    if (Date.parse(record.attemptedAt) > Date.parse(input.checkedAt)) {
      throw new Error("attempt_record_in_future");
    }
    const existing = byNumber.get(record.attemptNumber);
    if (existing) {
      if (existing.attemptFingerprint !== record.attemptFingerprint) {
        throw new Error("conflicting_attempt_number_replay");
      }
      duplicateCount += 1;
      continue;
    }
    byNumber.set(record.attemptNumber, record);
  }

  const records = [...byNumber.values()].sort(
    (a, b) => a.attemptNumber - b.attemptNumber,
  );
  if (records.length > input.policy.maxAttempts) {
    throw new Error("attempt_history_exceeds_policy");
  }
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]!;
    if (record.attemptNumber !== index + 1) {
      throw new Error("non_contiguous_attempt_history");
    }
    if (
      index > 0
      && Date.parse(record.attemptedAt) <= Date.parse(records[index - 1]!.attemptedAt)
    ) throw new Error("attempt_timestamps_not_strictly_increasing");
    if (
      index < records.length - 1
      && record.outcome === "succeeded"
    ) throw new Error("attempt_after_terminal_success");
  }
  return { records, duplicateCount };
}

function retryBackoffMinutes(
  previousAttemptNumber: number,
  policy: FailureControlPolicy,
): number {
  let value = policy.baseBackoffMinutes;
  for (let index = 1; index < previousAttemptNumber; index += 1) {
    value = Math.min(policy.maxBackoffMinutes, value * policy.backoffMultiplier);
  }
  return Math.min(value, policy.maxBackoffMinutes);
}

function buildRetryReview(input: {
  artifact: FailureControlArtifactReference;
  lastAttempt: FailureControlAttemptRecord;
  policy: FailureControlPolicy;
  checkedAt: string;
}): FailureControlRetryReviewIntent {
  if (
    input.lastAttempt.outcome !== "failed"
    || input.lastAttempt.failureCode === null
    || input.lastAttempt.failureClass === null
    || !input.lastAttempt.retryable
  ) throw new Error("retry_review_requires_retryable_failure");

  const backoffMinutes = retryBackoffMinutes(
    input.lastAttempt.attemptNumber,
    input.policy,
  );
  const eligibleAt = new Date(
    Date.parse(input.lastAttempt.attemptedAt) + backoffMinutes * 60_000,
  ).toISOString();
  if (Date.parse(eligibleAt) >= Date.parse(input.artifact.expiresAt)) {
    throw new Error("retry_review_outside_original_window");
  }

  const safety = failureRetryDeadLetterCapability();
  const identity = {
    lifecycle: "proposed_review" as const,
    artifactReferenceFingerprint: input.artifact.artifactReferenceFingerprint,
    idempotencyKey: input.artifact.idempotencyKey,
    previousAttemptId: input.lastAttempt.attemptId,
    previousAttemptFingerprint: input.lastAttempt.attemptFingerprint,
    previousAttemptNumber: input.lastAttempt.attemptNumber,
    nextAttemptNumber: input.lastAttempt.attemptNumber + 1,
    failureCode: input.lastAttempt.failureCode,
    failureClass: input.lastAttempt.failureClass,
    backoffMinutes,
    eligibleAt,
    expiresAt: input.artifact.expiresAt,
    eligibility: Date.parse(input.checkedAt) >= Date.parse(eligibleAt)
      ? "eligible_for_review" as const
      : "waiting" as const,
    safety,
  };
  const retryIntentFingerprint = stableHash({
    version: FAILURE_RETRY_DEAD_LETTER_VERSION,
    purpose: "failure_control_retry_review",
    ...identity,
  });
  return {
    version: FAILURE_RETRY_DEAD_LETTER_VERSION,
    retryIntentId: "frr-" + retryIntentFingerprint.slice(0, 24),
    retryIntentFingerprint,
    ...identity,
  };
}

function buildDeadLetterReview(input: {
  artifact: FailureControlArtifactReference;
  reason: FailureControlDeadLetterReason;
  records: FailureControlAttemptRecord[];
  checkedAt: string;
}): FailureControlDeadLetterReview {
  const lastAttempt = input.records[input.records.length - 1] ?? null;
  const safety = failureRetryDeadLetterCapability();
  const identity = {
    lifecycle: "proposed_review" as const,
    artifactReferenceFingerprint: input.artifact.artifactReferenceFingerprint,
    idempotencyKey: input.artifact.idempotencyKey,
    reason: input.reason,
    attemptCount: input.records.length,
    lastAttemptId: lastAttempt?.attemptId ?? null,
    lastAttemptFingerprint: lastAttempt?.attemptFingerprint ?? null,
    lastFailureCode: lastAttempt?.failureCode ?? null,
    lastFailureClass: lastAttempt?.failureClass ?? null,
    checkedAt: input.checkedAt,
    safety,
  };
  const deadLetterFingerprint = stableHash({
    version: FAILURE_RETRY_DEAD_LETTER_VERSION,
    purpose: "failure_control_dead_letter_review",
    ...identity,
  });
  return {
    version: FAILURE_RETRY_DEAD_LETTER_VERSION,
    deadLetterId: "dlr-" + deadLetterFingerprint.slice(0, 24),
    deadLetterFingerprint,
    ...identity,
  };
}

export function projectFailureRetryDeadLetterControl(input: {
  artifact: FailureControlArtifactInput;
  attempts?: FailureControlAttemptRecord[];
  policy: FailureControlPolicy;
  now: string;
}) {
  const artifact = normalizeFailureControlArtifact(input.artifact);
  const policy = normalizeFailureControlPolicy(input.policy);
  const checkedAt = timestamp(input.now, "failure_control_now");
  if (Date.parse(checkedAt) < Date.parse(artifact.slotAt)) {
    throw new Error("failure_control_before_original_slot");
  }

  const history = normalizeAttemptHistory({
    records: input.attempts ?? [],
    artifact,
    checkedAt,
    policy,
  });
  const lastAttempt = history.records[history.records.length - 1] ?? null;
  const safety = failureRetryDeadLetterCapability();

  let state: FailureControlProjectionState;
  let retryIntent: FailureControlRetryReviewIntent | null = null;
  let deadLetterReview: FailureControlDeadLetterReview | null = null;
  let terminalReplaySuppressed = false;

  if (!lastAttempt) {
    if (Date.parse(checkedAt) >= Date.parse(artifact.expiresAt)) {
      state = "dead_letter_review";
      deadLetterReview = buildDeadLetterReview({
        artifact,
        reason: "work_window_expired_unattempted",
        records: history.records,
        checkedAt,
      });
    } else {
      state = "unattempted";
    }
  } else if (lastAttempt.outcome === "succeeded") {
    state = "succeeded";
    terminalReplaySuppressed = true;
  } else if (!lastAttempt.retryable) {
    state = "dead_letter_review";
    deadLetterReview = buildDeadLetterReview({
      artifact,
      reason: "non_retryable_failure",
      records: history.records,
      checkedAt,
    });
  } else if (history.records.length >= policy.maxAttempts) {
    state = "dead_letter_review";
    deadLetterReview = buildDeadLetterReview({
      artifact,
      reason: "attempt_budget_exhausted",
      records: history.records,
      checkedAt,
    });
  } else {
    const backoffMinutes = retryBackoffMinutes(lastAttempt.attemptNumber, policy);
    const eligibleAt = new Date(
      Date.parse(lastAttempt.attemptedAt) + backoffMinutes * 60_000,
    ).toISOString();
    if (
      Date.parse(checkedAt) >= Date.parse(artifact.expiresAt)
      || Date.parse(eligibleAt) >= Date.parse(artifact.expiresAt)
    ) {
      state = "dead_letter_review";
      deadLetterReview = buildDeadLetterReview({
        artifact,
        reason: "retry_window_expired",
        records: history.records,
        checkedAt,
      });
    } else {
      state = "retry_review";
      retryIntent = buildRetryReview({
        artifact,
        lastAttempt,
        policy,
        checkedAt,
      });
    }
  }

  const projectionFingerprint = stableHash({
    version: FAILURE_RETRY_DEAD_LETTER_VERSION,
    checkedAt,
    artifact,
    policy,
    attempts: history.records,
    duplicateAttemptCount: history.duplicateCount,
    state,
    retryIntent,
    deadLetterReview,
    terminalReplaySuppressed,
    safety,
  });

  return {
    version: FAILURE_RETRY_DEAD_LETTER_VERSION,
    projectionFingerprint,
    checkedAt,
    artifact,
    policy,
    attemptCount: history.records.length,
    duplicateAttemptCount: history.duplicateCount,
    attempts: history.records,
    state,
    retryIntent,
    deadLetterReview,
    terminalReplaySuppressed,
    safety,
  };
}

export function failureRetryDeadLetterCapability() {
  return Object.freeze({
    version: FAILURE_RETRY_DEAD_LETTER_VERSION,
    architectureOnly: true as const,
    deterministicProjectionOnly: true as const,
    suppliedAttemptRecordsOnly: true as const,
    retryReviewOnly: true as const,
    deadLetterReviewOnly: true as const,
    idempotencyProjectionOnly: true as const,
    exactDuplicateAttemptSuppression: true as const,
    conflictingReplayFailsClosed: true as const,
    originalWorkWindowPreserved: true as const,
    nonRetryableFailureFailsClosed: true as const,
    genericRunnerFailureAutomaticallyRetryable: false as const,
    normalizationFailureAutomaticallyRetryable: false as const,
    unknownFailureAutomaticallyRetryable: false as const,
    orderingImpliesPriority: false as const,
    wallClockAccess: false as const,
    timerActivated: false as const,
    schedulerActivated: false as const,
    liveRetryLoopEnabled: false as const,
    durableEnqueueAuthorized: false as const,
    queueReservationAuthorized: false as const,
    durableDeadLetterStoreAuthorized: false as const,
    workerEnabled: false as const,
    batchExecutorEnabled: false as const,
    task69PacketMaterializationAuthorized: false as const,
    task70ExecutionAuthorized: false as const,
    credentialUseAuthorized: false as const,
    oauthUseAuthorized: false as const,
    providerNetworkReadAuthorized: false as const,
    crawlNetworkReadAuthorized: false as const,
    crawlExecutionAuthorized: false as const,
    observationPersistenceAuthorized: false as const,
    evidencePersistenceAuthorized: false as const,
    productionDbReadAuthorized: false as const,
    productionDbWriteAuthorized: false as const,
    providerWrites: false as const,
    publicSiteWrites: false as const,
    task53ExecutionAuthorized: false as const,
    task54ExecutionAuthorized: false as const,
    automaticTransition: false as const,
    publicationAuthorized: false as const,
  });
}
