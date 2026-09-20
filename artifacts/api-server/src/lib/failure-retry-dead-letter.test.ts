import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  evaluateReadSchedule,
  normalizeReadScheduleDefinition,
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
import {
  FAILURE_RETRY_DEAD_LETTER_VERSION,
  buildFailureControlAttemptRecord,
  classifyFailureCode,
  failureRetryDeadLetterCapability,
  normalizeFailureControlArtifact,
  normalizeFailureControlPolicy,
  projectFailureRetryDeadLetterControl,
  type FailureControlArtifactInput,
  type FailureControlPolicy,
} from "./failure-retry-dead-letter.js";

const START = "2026-09-20T08:00:00.000Z";
const EXPIRES = "2026-09-20T08:15:00.000Z";
const POLICY: FailureControlPolicy = {
  maxAttempts: 3,
  baseBackoffMinutes: 2,
  backoffMultiplier: 2,
  maxBackoffMinutes: 10,
};

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort((a, b) => a.localeCompare(b))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key])).join(",") + "}";
}

function hash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function intent(workClass: ReadWorkClass = "signal_refresh", key = "synthetic-work"): ReadWorkIntent {
  const schedule = normalizeReadScheduleDefinition({
    key,
    workClass,
    scopeFingerprint: "1".repeat(64),
    upstreamLineageFingerprint: "2".repeat(64),
    startAt: START,
    cadenceMinutes: 60,
    dueWindowMinutes: 15,
  });
  const evaluation = evaluateReadSchedule({
    schedule,
    now: "2026-09-20T08:01:00.000Z",
  });
  assert.equal(evaluation.status, "due");
  assert.ok(evaluation.intent);
  assert.equal(evaluation.intent!.expiresAt, EXPIRES);
  return evaluation.intent!;
}

function p92Artifact(): FailureControlArtifactInput {
  const readIntent = intent("signal_refresh", "p92-work");
  const identity = {
    lifecycle: "proposed_review" as const,
    channel: "gsc_search_analytics" as const,
    runnerFoundationStatus: "runner_foundation_available" as const,
    blockers: [],
    scheduleId: readIntent.scheduleId,
    scheduleFingerprint: readIntent.scheduleFingerprint,
    intentId: readIntent.intentId,
    intentFingerprint: readIntent.intentFingerprint,
    slotAt: readIntent.slotAt,
    expiresAt: readIntent.expiresAt,
    sourceId: "src-" + "3".repeat(24),
    sourceFingerprint: "3".repeat(64),
    sourceKey: "google-search-console-search-analytics",
    marketFingerprint: "4".repeat(64),
    categoryFingerprint: "5".repeat(64),
    signalType: "keyword" as const,
    planId: "srp-" + "6".repeat(24),
    planFingerprint: "6".repeat(64),
    requestId: "sar-" + "7".repeat(24),
    requestFingerprint: "7".repeat(64),
    safety: firstPartyRefreshMaterializationCapability(),
  };
  const candidateFingerprint = hash({
    version: FIRST_PARTY_REFRESH_MATERIALIZATION_VERSION,
    purpose: "first_party_refresh_materialization_review",
    ...identity,
  });
  const candidate: FirstPartyRefreshCandidate = {
    version: FIRST_PARTY_REFRESH_MATERIALIZATION_VERSION,
    candidateId: "fpr-" + candidateFingerprint.slice(0, 24),
    candidateFingerprint,
    ...identity,
  };
  return {
    kind: "p9_2_first_party_refresh_candidate",
    intent: readIntent,
    candidate,
  };
}

function p93Artifact(selection: "full_reconciliation" | "incremental" | "no_work" = "full_reconciliation"): FailureControlArtifactInput {
  const readIntent = intent("crawl_refresh", "p93-work");
  const decision = selection === "full_reconciliation"
    ? {
        reason: "scheduled_full_reconciliation" as const,
        work: {
          selectedUrlCount: 100,
          deferredUrlCount: 0,
          batchCount: 4,
          requiresWholeSiteCertification: true,
        },
      }
    : selection === "incremental"
      ? {
          reason: "incremental_candidates_available" as const,
          work: {
            selectedUrlCount: 10,
            deferredUrlCount: 2,
            batchCount: 2,
            requiresWholeSiteCertification: false,
          },
        }
      : {
          reason: "no_incremental_candidates" as const,
          work: {
            selectedUrlCount: 0,
            deferredUrlCount: 0,
            batchCount: 0,
            requiresWholeSiteCertification: false,
          },
        };
  const identity = {
    lifecycle: "proposed_review" as const,
    selection,
    reason: decision.reason,
    siteId: "site-synthetic",
    canonicalOrigin: "https://example.com",
    scheduleId: readIntent.scheduleId,
    scheduleFingerprint: readIntent.scheduleFingerprint,
    intentId: readIntent.intentId,
    intentFingerprint: readIntent.intentFingerprint,
    slotAt: readIntent.slotAt,
    expiresAt: readIntent.expiresAt,
    slotIndex: 0,
    fullReconciliationEverySlots: 24,
    current: {
      crawlPlanFingerprint: "8".repeat(64),
      inventoryFingerprint: "9".repeat(64),
      executionPlanFingerprint: "a".repeat(64),
      checkpointFingerprint: "b".repeat(64),
      certificationFingerprint: "c".repeat(64),
      wholeSiteCertified: true,
    },
    incremental: {
      comparisonFingerprint: null,
      planFingerprint: null,
    },
    work: decision.work,
    safety: scheduledCrawlPolicyCapability(),
  };
  const candidateFingerprint = hash({
    version: SCHEDULED_CRAWL_POLICY_VERSION,
    purpose: "scheduled_crawl_policy_review",
    ...identity,
  });
  const candidate: ScheduledCrawlPolicyCandidate = {
    version: SCHEDULED_CRAWL_POLICY_VERSION,
    candidateId: "crp-" + candidateFingerprint.slice(0, 24),
    candidateFingerprint,
    ...identity,
  };
  return {
    kind: "p9_3_scheduled_crawl_candidate",
    intent: readIntent,
    candidate,
  };
}

function p94Artifact(): FailureControlArtifactInput {
  const readIntent = intent("signal_refresh", "p94-work");
  const identity = {
    lifecycle: "proposed_review" as const,
    adapterKind: "dataforseo_serp" as const,
    adapterVersion: "p5.2-dataforseo-serp-adapter-v1",
    adapterCapabilityFingerprint: "d".repeat(64),
    providerKey: "dataforseo" as const,
    suppliedResultFoundationStatus: "available" as const,
    liveRuntimeStatus: "unavailable" as const,
    liveRuntimeBlockers: [
      "provider_enrollment_not_authorized",
      "credential_use_not_authorized",
      "live_network_not_authorized",
      "task70_compatible_external_runner_unavailable",
    ],
    reviewDisposition: "supplied_review_ready" as const,
    reviewBlockers: [],
    reviewDiagnostics: [],
    scheduleId: readIntent.scheduleId,
    scheduleFingerprint: readIntent.scheduleFingerprint,
    intentId: readIntent.intentId,
    intentFingerprint: readIntent.intentFingerprint,
    slotAt: readIntent.slotAt,
    expiresAt: readIntent.expiresAt,
    sourceId: "src-" + "e".repeat(24),
    sourceFingerprint: "e".repeat(64),
    sourceKey: "dataforseo-google-organic-serp",
    marketFingerprint: "f".repeat(64),
    categoryFingerprint: "0".repeat(64),
    signalType: "serp" as const,
    planId: "srp-" + "1".repeat(24),
    planFingerprint: "1".repeat(64),
    requestId: "sar-" + "2".repeat(24),
    requestFingerprint: "2".repeat(64),
    telemetry: {
      reportFingerprint: "3".repeat(64),
      streamFingerprint: "4".repeat(64),
      referenceTime: "2026-09-20T08:00:30.000Z",
      providerReviewStateAtEvaluation: "fresh" as const,
      quality: {
        eventCount: 1,
        successRate: 1,
        usableRate: 1,
        errorRate: 0,
        meanCompleteness: 1,
        meanConfidence: 0.9,
      },
      cost: {
        coverageRatio: 1,
        totalAmount: 0.001,
        currency: "USD",
        totalBillingUnits: 1,
        billingUnit: "request",
        costPerUsableObservation: 0.001,
      },
      rateLimit: {
        state: "available" as const,
        capturedAt: "2026-09-20T08:00:30.000Z",
        freshness: "fresh" as const,
        latestSnapshotFingerprint: "5".repeat(64),
      },
    },
    safety: externalIntelligenceRefreshCapability(),
  };
  const candidateFingerprint = hash({
    version: EXTERNAL_INTELLIGENCE_REFRESH_VERSION,
    purpose: "external_intelligence_refresh_review",
    ...identity,
  });
  const candidate: ExternalIntelligenceRefreshCandidate = {
    version: EXTERNAL_INTELLIGENCE_REFRESH_VERSION,
    candidateId: "eir-" + candidateFingerprint.slice(0, 24),
    candidateFingerprint,
    ...identity,
  };
  return {
    kind: "p9_4_external_intelligence_candidate",
    intent: readIntent,
    candidate,
  };
}

test("P9.5 derives stable idempotency identities for exact P9.1-P9.4 artifacts", () => {
  const inputs: FailureControlArtifactInput[] = [
    { kind: "p9_1_read_work_intent", intent: intent() },
    p92Artifact(),
    p93Artifact(),
    p94Artifact(),
  ];
  for (const input of inputs) {
    const first = normalizeFailureControlArtifact(input);
    const second = normalizeFailureControlArtifact(input);
    assert.deepEqual(first, second);
    assert.match(first.idempotencyKey, /^idk-[0-9a-f]{24}$/);
    assert.match(first.idempotencyFingerprint, /^[0-9a-f]{64}$/);
  }
  const fingerprints = inputs.map((input) =>
    normalizeFailureControlArtifact(input).idempotencyFingerprint
  );
  assert.equal(new Set(fingerprints).size, inputs.length);
});

test("only explicit transient/throttled failures are retryable", () => {
  for (const code of [
    "transport_timeout",
    "provider_rate_limited",
    "provider_unavailable",
    "dependency_unavailable",
  ] as const) {
    assert.equal(classifyFailureCode(code).retryable, true);
  }
  for (const code of [
    "runner_failed",
    "normalization_failed",
    "stale_lineage",
    "authorization_closed",
    "invalid_input",
    "identity_collision",
    "claim_failed",
    "manual_intervention_required",
    "window_expired",
    "unsupported_operation",
    "already_consumed",
    "unknown_failure",
  ] as const) {
    assert.equal(classifyFailureCode(code).retryable, false);
  }
  assert.equal(classifyFailureCode("runner_failed").failureClass, "unknown");
  assert.equal(classifyFailureCode("normalization_failed").failureClass, "integrity");
});

test("transient failure produces bounded retry review with deterministic backoff", () => {
  const artifact = p92Artifact();
  const attempt = buildFailureControlAttemptRecord({
    artifact,
    attemptNumber: 1,
    attemptedAt: "2026-09-20T08:02:00.000Z",
    outcome: "failed",
    failureCode: "transport_timeout",
  });
  const waiting = projectFailureRetryDeadLetterControl({
    artifact,
    attempts: [attempt],
    policy: POLICY,
    now: "2026-09-20T08:03:00.000Z",
  });
  assert.equal(waiting.state, "retry_review");
  assert.equal(waiting.retryIntent?.nextAttemptNumber, 2);
  assert.equal(waiting.retryIntent?.backoffMinutes, 2);
  assert.equal(waiting.retryIntent?.eligibleAt, "2026-09-20T08:04:00.000Z");
  assert.equal(waiting.retryIntent?.eligibility, "waiting");

  const eligible = projectFailureRetryDeadLetterControl({
    artifact,
    attempts: [attempt],
    policy: POLICY,
    now: "2026-09-20T08:04:00.000Z",
  });
  assert.equal(eligible.retryIntent?.eligibility, "eligible_for_review");
  assert.equal(eligible.safety.liveRetryLoopEnabled, false);
  assert.equal(eligible.safety.durableEnqueueAuthorized, false);
});

test("retry backoff grows deterministically and is capped", () => {
  const artifact = p94Artifact();
  const first = buildFailureControlAttemptRecord({
    artifact,
    attemptNumber: 1,
    attemptedAt: "2026-09-20T08:01:00.000Z",
    outcome: "failed",
    failureCode: "provider_unavailable",
  });
  const second = buildFailureControlAttemptRecord({
    artifact,
    attemptNumber: 2,
    attemptedAt: "2026-09-20T08:04:00.000Z",
    outcome: "failed",
    failureCode: "provider_rate_limited",
  });
  const projection = projectFailureRetryDeadLetterControl({
    artifact,
    attempts: [second, first],
    policy: { ...POLICY, maxBackoffMinutes: 3 },
    now: "2026-09-20T08:05:00.000Z",
  });
  assert.equal(projection.retryIntent?.backoffMinutes, 3);
  assert.equal(projection.retryIntent?.eligibleAt, "2026-09-20T08:07:00.000Z");
  assert.equal(projection.retryIntent?.nextAttemptNumber, 3);
});

test("non-retryable failure produces dead-letter review", () => {
  for (const failureCode of [
    "runner_failed",
    "normalization_failed",
    "identity_collision",
    "manual_intervention_required",
    "unknown_failure",
  ] as const) {
    const artifact = p93Artifact("incremental");
    const attempt = buildFailureControlAttemptRecord({
      artifact,
      attemptNumber: 1,
      attemptedAt: "2026-09-20T08:02:00.000Z",
      outcome: "failed",
      failureCode,
    });
    const projection = projectFailureRetryDeadLetterControl({
      artifact,
      attempts: [attempt],
      policy: POLICY,
      now: "2026-09-20T08:03:00.000Z",
    });
    assert.equal(projection.state, "dead_letter_review");
    assert.equal(projection.deadLetterReview?.reason, "non_retryable_failure");
    assert.equal(projection.retryIntent, null);
  }
});

test("attempt budget exhaustion and retry-window expiry dead-letter instead of looping", () => {
  const artifact = { kind: "p9_1_read_work_intent" as const, intent: intent() };
  const first = buildFailureControlAttemptRecord({
    artifact,
    attemptNumber: 1,
    attemptedAt: "2026-09-20T08:01:00.000Z",
    outcome: "failed",
    failureCode: "transport_timeout",
  });
  const second = buildFailureControlAttemptRecord({
    artifact,
    attemptNumber: 2,
    attemptedAt: "2026-09-20T08:04:00.000Z",
    outcome: "failed",
    failureCode: "provider_unavailable",
  });
  const exhausted = projectFailureRetryDeadLetterControl({
    artifact,
    attempts: [first, second],
    policy: { ...POLICY, maxAttempts: 2 },
    now: "2026-09-20T08:05:00.000Z",
  });
  assert.equal(exhausted.deadLetterReview?.reason, "attempt_budget_exhausted");

  const nearExpiry = buildFailureControlAttemptRecord({
    artifact,
    attemptNumber: 1,
    attemptedAt: "2026-09-20T08:14:00.000Z",
    outcome: "failed",
    failureCode: "transport_timeout",
  });
  const expired = projectFailureRetryDeadLetterControl({
    artifact,
    attempts: [nearExpiry],
    policy: POLICY,
    now: "2026-09-20T08:14:30.000Z",
  });
  assert.equal(expired.deadLetterReview?.reason, "retry_window_expired");
});

test("an unattempted artifact becomes dead-letter review after its original window, never catch-up", () => {
  const artifact = p94Artifact();
  const projection = projectFailureRetryDeadLetterControl({
    artifact,
    policy: POLICY,
    now: EXPIRES,
  });
  assert.equal(projection.state, "dead_letter_review");
  assert.equal(
    projection.deadLetterReview?.reason,
    "work_window_expired_unattempted",
  );
  assert.equal(projection.retryIntent, null);
});

test("successful attempt is terminal and suppresses exact replay", () => {
  const artifact = p92Artifact();
  const success = buildFailureControlAttemptRecord({
    artifact,
    attemptNumber: 1,
    attemptedAt: "2026-09-20T08:02:00.000Z",
    outcome: "succeeded",
  });
  const projection = projectFailureRetryDeadLetterControl({
    artifact,
    attempts: [success, success],
    policy: POLICY,
    now: "2026-09-20T08:03:00.000Z",
  });
  assert.equal(projection.state, "succeeded");
  assert.equal(projection.attemptCount, 1);
  assert.equal(projection.duplicateAttemptCount, 1);
  assert.equal(projection.terminalReplaySuppressed, true);
  assert.equal(projection.retryIntent, null);
  assert.equal(projection.deadLetterReview, null);
});

test("exact duplicate failures deduplicate but conflicting replay fails closed", () => {
  const artifact = p92Artifact();
  const attempt = buildFailureControlAttemptRecord({
    artifact,
    attemptNumber: 1,
    attemptedAt: "2026-09-20T08:02:00.000Z",
    outcome: "failed",
    failureCode: "transport_timeout",
  });
  const duplicate = projectFailureRetryDeadLetterControl({
    artifact,
    attempts: [attempt, attempt],
    policy: POLICY,
    now: "2026-09-20T08:03:00.000Z",
  });
  assert.equal(duplicate.attemptCount, 1);
  assert.equal(duplicate.duplicateAttemptCount, 1);

  const conflict = buildFailureControlAttemptRecord({
    artifact,
    attemptNumber: 1,
    attemptedAt: "2026-09-20T08:02:30.000Z",
    outcome: "failed",
    failureCode: "provider_unavailable",
  });
  assert.throws(() => projectFailureRetryDeadLetterControl({
    artifact,
    attempts: [attempt, conflict],
    policy: POLICY,
    now: "2026-09-20T08:03:00.000Z",
  }), /conflicting_attempt_number_replay/);
});

test("non-contiguous, future, post-success, cross-window and cross-artifact attempt histories fail closed", () => {
  const artifact = p92Artifact();
  const attemptTwo = buildFailureControlAttemptRecord({
    artifact,
    attemptNumber: 2,
    attemptedAt: "2026-09-20T08:04:00.000Z",
    outcome: "failed",
    failureCode: "transport_timeout",
  });
  assert.throws(() => projectFailureRetryDeadLetterControl({
    artifact,
    attempts: [attemptTwo],
    policy: POLICY,
    now: "2026-09-20T08:05:00.000Z",
  }), /non_contiguous_attempt_history/);

  const future = buildFailureControlAttemptRecord({
    artifact,
    attemptNumber: 1,
    attemptedAt: "2026-09-20T08:06:00.000Z",
    outcome: "failed",
    failureCode: "transport_timeout",
  });
  assert.throws(() => projectFailureRetryDeadLetterControl({
    artifact,
    attempts: [future],
    policy: POLICY,
    now: "2026-09-20T08:05:00.000Z",
  }), /attempt_record_in_future/);

  const success = buildFailureControlAttemptRecord({
    artifact,
    attemptNumber: 1,
    attemptedAt: "2026-09-20T08:02:00.000Z",
    outcome: "succeeded",
  });
  const afterSuccess = buildFailureControlAttemptRecord({
    artifact,
    attemptNumber: 2,
    attemptedAt: "2026-09-20T08:03:00.000Z",
    outcome: "failed",
    failureCode: "transport_timeout",
  });
  assert.throws(() => projectFailureRetryDeadLetterControl({
    artifact,
    attempts: [success, afterSuccess],
    policy: POLICY,
    now: "2026-09-20T08:04:00.000Z",
  }), /attempt_after_terminal_success/);

  assert.throws(() => buildFailureControlAttemptRecord({
    artifact,
    attemptNumber: 1,
    attemptedAt: EXPIRES,
    outcome: "failed",
    failureCode: "transport_timeout",
  }), /attempt_outside_original_work_window/);

  const otherArtifact = p94Artifact();
  assert.throws(() => projectFailureRetryDeadLetterControl({
    artifact: otherArtifact,
    attempts: [success],
    policy: POLICY,
    now: "2026-09-20T08:04:00.000Z",
  }), /attempt_idempotency_key_mismatch/);
});

test("candidate-to-intent mismatch and tampered candidate identity fail closed", () => {
  const p92 = p92Artifact();
  if (p92.kind !== "p9_2_first_party_refresh_candidate") throw new Error("fixture");
  const wrongIntent = intent("signal_refresh", "wrong-intent");
  assert.throws(() => normalizeFailureControlArtifact({
    ...p92,
    intent: wrongIntent,
  }), /candidate_intent_lineage_mismatch/);

  const tampered = {
    ...p92.candidate,
    sourceKey: "tampered-source",
  };
  assert.throws(() => normalizeFailureControlArtifact({
    ...p92,
    candidate: tampered,
  }), /candidate_identity_mismatch/);
});

test("P9.3 no-work candidate remains valid control-plane lineage but cannot create execution authority", () => {
  const artifact = p93Artifact("no_work");
  const ref = normalizeFailureControlArtifact(artifact);
  assert.equal(ref.workClass, "crawl_refresh");
  const projection = projectFailureRetryDeadLetterControl({
    artifact,
    policy: POLICY,
    now: "2026-09-20T08:02:00.000Z",
  });
  assert.equal(projection.state, "unattempted");
  assert.equal(projection.safety.workerEnabled, false);
  assert.equal(projection.safety.crawlExecutionAuthorized, false);
});

test("policy bounds and capability remain closed", () => {
  assert.deepEqual(normalizeFailureControlPolicy(POLICY), POLICY);
  assert.throws(() => normalizeFailureControlPolicy({
    ...POLICY,
    maxAttempts: 0,
  }), /invalid_failure_control_max_attempts/);
  assert.throws(() => normalizeFailureControlPolicy({
    ...POLICY,
    maxAttempts: 9,
  }), /invalid_failure_control_max_attempts/);
  assert.throws(() => normalizeFailureControlPolicy({
    ...POLICY,
    maxBackoffMinutes: 1,
  }), /invalid_failure_control_max_backoff_minutes/);

  assert.deepEqual(failureRetryDeadLetterCapability(), {
    version: FAILURE_RETRY_DEAD_LETTER_VERSION,
    architectureOnly: true,
    deterministicProjectionOnly: true,
    suppliedAttemptRecordsOnly: true,
    retryReviewOnly: true,
    deadLetterReviewOnly: true,
    idempotencyProjectionOnly: true,
    exactDuplicateAttemptSuppression: true,
    conflictingReplayFailsClosed: true,
    originalWorkWindowPreserved: true,
    nonRetryableFailureFailsClosed: true,
    genericRunnerFailureAutomaticallyRetryable: false,
    normalizationFailureAutomaticallyRetryable: false,
    unknownFailureAutomaticallyRetryable: false,
    orderingImpliesPriority: false,
    wallClockAccess: false,
    timerActivated: false,
    schedulerActivated: false,
    liveRetryLoopEnabled: false,
    durableEnqueueAuthorized: false,
    queueReservationAuthorized: false,
    durableDeadLetterStoreAuthorized: false,
    workerEnabled: false,
    batchExecutorEnabled: false,
    task69PacketMaterializationAuthorized: false,
    task70ExecutionAuthorized: false,
    credentialUseAuthorized: false,
    oauthUseAuthorized: false,
    providerNetworkReadAuthorized: false,
    crawlNetworkReadAuthorized: false,
    crawlExecutionAuthorized: false,
    observationPersistenceAuthorized: false,
    evidencePersistenceAuthorized: false,
    productionDbReadAuthorized: false,
    productionDbWriteAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
    task53ExecutionAuthorized: false,
    task54ExecutionAuthorized: false,
    automaticTransition: false,
    publicationAuthorized: false,
  });
});
