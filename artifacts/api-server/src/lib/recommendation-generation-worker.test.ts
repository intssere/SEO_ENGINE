import assert from "node:assert/strict";
import test from "node:test";
import {
  buildUnifiedOpportunityRecord,
  type UnifiedOpportunityEvidenceInput,
  type UnifiedOpportunityFamily,
  type UnifiedOpportunityKind,
} from "./unified-opportunity-types.js";
import {
  scoreUnifiedOpportunity,
  type OpportunityScoreComponentInput,
  type OpportunityScoreDimension,
} from "./opportunity-scoring.js";
import {
  prioritizeUnifiedOpportunities,
  type OpportunityCollectionEntryInput,
  type OpportunityPrioritizationInput,
} from "./opportunity-prioritization.js";
import {
  explainPrioritizedOpportunities,
  type OpportunityExplanationInput,
} from "./opportunity-explanation.js";
import {
  classifyOpportunityActionability,
  type OpportunityActionabilityInput,
  type OpportunityActionabilityPolicyInput,
} from "./opportunity-actionability.js";
import {
  buildOpportunityPreviewDiff,
  type OpportunityPreviewDiffInput,
  type OpportunityPreviewInput,
} from "./opportunity-preview-diff.js";
import {
  buildOpportunityLifecycle,
  type OpportunityLifecycleEventInput,
  type OpportunityLifecycleHistoryInput,
  type OpportunityLifecycleInput,
} from "./opportunity-lifecycle.js";
import {
  normalizeWorkerControlState,
} from "./worker-control-observability.js";
import {
  RECOMMENDATION_GENERATION_WORKER_VERSION,
  projectRecommendationGenerationWorker,
  recommendationGenerationWorkerCapability,
} from "./recommendation-generation-worker.js";

const REFERENCE = "2026-09-20T10:00:00.000Z";
const HISTORY_REFERENCE = "2026-09-20T11:00:00.000Z";
const WORKER_REFERENCE = "2026-09-20T11:30:00.000Z";
const MARKET = "a".repeat(64);
const CATEGORY = "b".repeat(64);
const DIMENSIONS: OpportunityScoreDimension[] = [
  "impact",
  "confidence",
  "risk",
  "effort",
  "freshness",
];

function fp(value: number): string {
  return value.toString(16).padStart(64, "0");
}

function evidence(
  kind: UnifiedOpportunityEvidenceInput["kind"],
  fingerprint: string,
): UnifiedOpportunityEvidenceInput {
  return {
    kind,
    fingerprint,
    sourceKey: "synthetic:" + kind,
    observedAt: "2026-09-20T09:00:00.000Z",
    marketFingerprint: MARKET,
    categoryFingerprint: CATEGORY,
  };
}

function entry(input: {
  subjectKey: string;
  base: number;
  family?: UnifiedOpportunityFamily;
  kind?: UnifiedOpportunityKind;
  suppressionCodes?: string[];
}): OpportunityCollectionEntryInput {
  const family = input.family ?? "query";
  const kind = input.kind ?? "query_gap";
  const evidenceKinds: UnifiedOpportunityEvidenceInput["kind"][] =
    family === "ai"
      ? ["ai_visibility", "source_telemetry", "serp_ranking", "gsc_query", "trend_context"]
      : ["gsc_query", "serp_ranking", "keyword_metrics", "trend_context", "competitor_gap"];
  const opportunity = buildUnifiedOpportunityRecord({
    family,
    kind,
    subjectKey: input.subjectKey,
    referenceTime: REFERENCE,
    marketFingerprint: MARKET,
    categoryFingerprint: CATEGORY,
    evidence: evidenceKinds.map((evidenceKind, index) =>
      evidence(evidenceKind, fp(input.base + index))
    ),
  });
  const components = Object.fromEntries(DIMENSIONS.map((dimension, index) => [
    dimension,
    {
      value: dimension === "risk" ? 0.2 : dimension === "effort" ? 0.25 : 0.8,
      basisCode: "p97.synthetic." + dimension,
      evidenceFingerprints: [fp(input.base + index)],
    } satisfies OpportunityScoreComponentInput,
  ])) as Record<OpportunityScoreDimension, OpportunityScoreComponentInput>;
  return {
    opportunity,
    score: scoreUnifiedOpportunity({ opportunity, components }),
    suppressionCodes: input.suppressionCodes,
  };
}

function policy(
  explanation: ReturnType<typeof explainPrioritizedOpportunities>,
  subjectKey: string,
  overrides: Partial<Omit<OpportunityActionabilityPolicyInput, "opportunityFingerprint">> = {},
): OpportunityActionabilityPolicyInput {
  const item = explanation.items.find((candidate) => candidate.subjectKey === subjectKey);
  assert.ok(item);
  return {
    opportunityFingerprint: item.opportunityFingerprint,
    recommendationAllowed: false,
    approvalRequired: false,
    blockCodes: [],
    ...overrides,
  };
}

function event(
  sequence: number,
  occurredAt: string,
  type: OpportunityLifecycleEventInput["type"],
): OpportunityLifecycleEventInput {
  return {
    sequence,
    occurredAt,
    type,
    reasonCode: null,
    relatedOpportunityFingerprint: null,
  };
}

function buildFixture(input?: {
  controlMode?: "running" | "paused" | "draining" | "drained" | "killed";
  omitApprovalPreview?: boolean;
  changeApprovalPreview?: boolean;
}) {
  const entries = [
    entry({ subjectKey: "query:recommend", base: 10 }),
    entry({ subjectKey: "query:approval", base: 30 }),
    entry({ subjectKey: "query:informational", base: 50 }),
    entry({ subjectKey: "query:blocked", base: 70, suppressionCodes: ["policy.blocked"] }),
    entry({ subjectKey: "query:deferred", base: 90 }),
    entry({ subjectKey: "query:closed", base: 110 }),
    entry({
      subjectKey: "ai:visibility",
      base: 130,
      family: "ai",
      kind: "ai_visibility_gap",
    }),
  ];
  const collection: OpportunityPrioritizationInput = {
    collectionKey: "synthetic:p97",
    entries,
  };
  const prioritization = prioritizeUnifiedOpportunities(collection);
  const explanationInput: OpportunityExplanationInput = { collection, prioritization };
  const explanation = explainPrioritizedOpportunities(explanationInput);
  const policies = [
    policy(explanation, "query:recommend", { recommendationAllowed: true }),
    policy(explanation, "query:approval", { approvalRequired: true }),
    policy(explanation, "query:informational"),
    policy(explanation, "query:blocked"),
    policy(explanation, "query:deferred", { recommendationAllowed: true }),
    policy(explanation, "query:closed", { recommendationAllowed: true }),
    policy(explanation, "ai:visibility", { recommendationAllowed: true }),
  ];
  const actionabilityInput: OpportunityActionabilityInput = {
    explanationInput,
    explanation,
    policies,
  };
  const actionability = classifyOpportunityActionability(actionabilityInput);
  const bySubject = new Map(explanation.items.map((item) => [
    item.subjectKey,
    item.opportunityFingerprint,
  ]));

  const previews: OpportunityPreviewInput[] = [];
  if (!input?.omitApprovalPreview) {
    const opportunityFingerprint = bySubject.get("query:approval");
    assert.ok(opportunityFingerprint);
    const decision = actionability.decisions.find((item) =>
      item.opportunityFingerprint === opportunityFingerprint
    );
    assert.ok(decision);
    previews.push({
      opportunityFingerprint,
      actionabilityFingerprint: decision.actionabilityFingerprint,
      previewKey: "page.meta",
      fields: [{
        fieldKey: "meta_description",
        currentValue: "Current description.",
        proposedValue: input?.changeApprovalPreview === false
          ? "Current description."
          : "Proposed bounded description.",
      }],
    });
  }
  const previewDiffInput: OpportunityPreviewDiffInput = {
    actionabilityInput,
    actionability,
    previews,
  };
  const previewDiff = buildOpportunityPreviewDiff(previewDiffInput);

  const histories: OpportunityLifecycleHistoryInput[] = [];
  for (const [subjectKey, lifecycleEvent] of [
    ["query:deferred", event(1, "2026-09-20T10:30:00.000Z", "defer")],
    ["query:closed", event(1, "2026-09-20T10:40:00.000Z", "close")],
  ] as const) {
    const opportunityFingerprint = bySubject.get(subjectKey);
    assert.ok(opportunityFingerprint);
    const decision = actionability.decisions.find((item) =>
      item.opportunityFingerprint === opportunityFingerprint
    );
    assert.ok(decision);
    histories.push({
      opportunityFingerprint,
      actionabilityFingerprint: decision.actionabilityFingerprint,
      events: [lifecycleEvent],
    });
  }

  const lifecycleInput: OpportunityLifecycleInput = {
    previewDiffInput,
    previewDiff,
    historyReferenceTime: HISTORY_REFERENCE,
    histories,
  };
  const lifecycle = buildOpportunityLifecycle(lifecycleInput);
  const control = normalizeWorkerControlState({
    mode: input?.controlMode ?? "running",
    effectiveAt: "2026-09-20T11:05:00.000Z",
    reason: "p97_synthetic_control",
  });

  return {
    lifecycleInput,
    lifecycle,
    control,
    batchKey: "recommendations.synthetic",
    referenceTime: WORKER_REFERENCE,
  };
}

function itemFor(
  projection: ReturnType<typeof projectRecommendationGenerationWorker>,
  fixture: ReturnType<typeof buildFixture>,
  subjectKey: string,
) {
  const fingerprint = fixture.lifecycleInput.previewDiffInput.actionabilityInput.explanation.items
    .find((item) => item.subjectKey === subjectKey)?.opportunityFingerprint;
  assert.ok(fingerprint);
  const item = projection.items.find((candidate) =>
    candidate.opportunityFingerprint === fingerprint
  );
  assert.ok(item);
  return item;
}

test("running P9.7 generates deterministic advisory/proposal reviews only for eligible observed/active work", () => {
  const fixture = buildFixture();
  const projection = projectRecommendationGenerationWorker(fixture);

  assert.equal(projection.generationState, "mixed_review");
  assert.equal(projection.counts.generated, 3);
  assert.equal(projection.counts.advisoryReview, 2);
  assert.equal(projection.counts.proposalReview, 1);
  assert.equal(itemFor(projection, fixture, "query:recommend").disposition, "generated_review");
  assert.equal(itemFor(projection, fixture, "query:approval").disposition, "generated_review");
  assert.equal(itemFor(projection, fixture, "ai:visibility").disposition, "generated_review");
  assert.equal(itemFor(projection, fixture, "query:informational").disposition, "withheld_informational");
  assert.equal(itemFor(projection, fixture, "query:blocked").disposition, "withheld_blocked");
  assert.equal(itemFor(projection, fixture, "query:deferred").disposition, "held_deferred");
  assert.equal(itemFor(projection, fixture, "query:closed").disposition, "withheld_terminal");

  const approval = projection.candidates.find((item) =>
    item.recommendationClass === "proposal_review"
  );
  assert.ok(approval);
  assert.equal(approval.governanceHandoff.approvalRequired, true);
  assert.equal(approval.governanceHandoff.changedPreviewAvailable, true);
  assert.equal(approval.governanceHandoff.proposalRecordCreated, false);
  assert.equal(approval.governanceHandoff.approvalGranted, false);
  assert.equal(approval.governanceHandoff.executionAuthorized, false);
});

test("P7.6-shaped AI opportunity is accepted only through canonical P6 lineage and keeps conservative AI wording", () => {
  const fixture = buildFixture();
  const projection = projectRecommendationGenerationWorker(fixture);
  const ai = projection.candidates.find((item) => item.lineage.kind === "ai_visibility_gap");
  assert.ok(ai);
  assert.equal(ai.lineage.family, "ai");
  assert.equal(ai.recommendationCode, "review.ai_visibility_gap");
  assert.match(ai.reviewInstruction, /not implied/);
  assert.equal(projection.semantics.p76AiGeoAcceptedOnlyThroughP6Pipeline, true);
});

test("approval-class recommendation requires an exact changed P6.6 preview", () => {
  for (const fixture of [
    buildFixture({ omitApprovalPreview: true }),
    buildFixture({ changeApprovalPreview: false }),
  ]) {
    const projection = projectRecommendationGenerationWorker(fixture);
    const item = itemFor(projection, fixture, "query:approval");
    assert.equal(item.disposition, "withheld_approval_preview_required");
    assert.equal(item.reason, "approval_changed_preview_required");
    assert.equal(
      projection.candidates.some((candidate) =>
        candidate.lineage.opportunityFingerprint === item.opportunityFingerprint
      ),
      false,
    );
  }
});

test("pause, drain, drained and kill suppress otherwise eligible generation without changing terminal semantics", () => {
  for (const mode of ["paused", "draining", "drained", "killed"] as const) {
    const fixture = buildFixture({ controlMode: mode });
    const projection = projectRecommendationGenerationWorker(fixture);
    assert.equal(projection.counts.generated, 0);
    assert.equal(itemFor(projection, fixture, "query:recommend").disposition, "held_by_control");
    assert.equal(itemFor(projection, fixture, "query:approval").disposition, "held_by_control");
    assert.equal(itemFor(projection, fixture, "query:closed").disposition, "withheld_terminal");
    assert.equal(itemFor(projection, fixture, "query:deferred").disposition, "held_deferred");
    assert.equal(projection.controlProjection.generationReviewAllowed, false);
    assert.equal(
      projection.controlProjection.killedRequiresRecoveryReview,
      mode === "killed",
    );
  }
});

test("recommendation identity is stable across observation time and control pause/resume but changes with preview lineage", () => {
  const runningFixture = buildFixture();
  const running = projectRecommendationGenerationWorker(runningFixture);
  const pausedFixture = {
    ...runningFixture,
    control: normalizeWorkerControlState({
      mode: "paused",
      effectiveAt: "2026-09-20T11:10:00.000Z",
      reason: "temporary_pause",
    }),
    referenceTime: "2026-09-20T11:40:00.000Z",
  };
  const paused = projectRecommendationGenerationWorker(pausedFixture);
  assert.equal(paused.candidates.length, 0);

  const resumedFixture = {
    ...runningFixture,
    control: normalizeWorkerControlState({
      mode: "running",
      effectiveAt: "2026-09-20T11:20:00.000Z",
      reason: "resume_after_pause",
    }),
    referenceTime: "2026-09-20T11:45:00.000Z",
  };
  const resumed = projectRecommendationGenerationWorker(resumedFixture);
  const runningIds = running.candidates.map((item) => item.idempotencyKey);
  const resumedIds = resumed.candidates.map((item) => item.idempotencyKey);
  assert.deepEqual(runningIds, resumedIds);

  const changedPreviewFixture = buildFixture();
  const changedPreview = projectRecommendationGenerationWorker(changedPreviewFixture);
  const unchangedPreviewFixture = buildFixture({ changeApprovalPreview: false });
  const unchangedPreview = projectRecommendationGenerationWorker(unchangedPreviewFixture);
  const approvalGenerated = changedPreview.candidates.find((item) =>
    item.recommendationClass === "proposal_review"
  );
  assert.ok(approvalGenerated);
  assert.equal(
    unchangedPreview.candidates.some((item) =>
      item.idempotencyKey === approvalGenerated.idempotencyKey
    ),
    false,
  );
});

test("candidate ordering is fingerprint serialization, not a new P6.3 priority or dispatch order", () => {
  const fixture = buildFixture();
  const projection = projectRecommendationGenerationWorker(fixture);
  const fingerprints = projection.candidates.map((item) =>
    item.lineage.opportunityFingerprint
  );
  assert.deepEqual(fingerprints, [...fingerprints].sort((a, b) => a.localeCompare(b)));
  assert.equal(projection.semantics.orderingCreatesAdditionalPriority, false);
  assert.ok(projection.candidates.every((item) =>
    item.lineage.priorityRank !== null
  ));
});

test("tampered P6.7 lifecycle or P9.6 control fails closed", () => {
  const fixture = buildFixture();
  const tamperedLifecycle = {
    ...fixture.lifecycle,
    counts: {
      ...fixture.lifecycle.counts,
      total: fixture.lifecycle.counts.total + 1,
    },
  };
  assert.throws(() => projectRecommendationGenerationWorker({
    ...fixture,
    lifecycle: tamperedLifecycle,
  }), /p67_lifecycle_integrity_mismatch/);

  assert.throws(() => projectRecommendationGenerationWorker({
    ...fixture,
    control: {
      ...fixture.control,
      reason: "tampered",
    },
  }), /p96_worker_control_integrity_mismatch/);
});

test("reference time is caller-supplied, canonical and cannot precede lifecycle/control state", () => {
  const fixture = buildFixture();
  assert.throws(() => projectRecommendationGenerationWorker({
    ...fixture,
    referenceTime: "2026-09-20T10:59:59.000Z",
  }), /recommendation_reference_before_lifecycle/);
  assert.throws(() => projectRecommendationGenerationWorker({
    ...fixture,
    referenceTime: "2026-09-20T11:30:00+00:00",
  }), /noncanonical_recommendation_reference_time/);
});

test("P9.7 carries evidence/semantic guards and never grants P8/Task execution authority", () => {
  const projection = projectRecommendationGenerationWorker(buildFixture());
  assert.ok(projection.candidates.length > 0);
  for (const candidate of projection.candidates) {
    assert.ok(candidate.lineage.evidenceFingerprints.length > 0);
    assert.ok(candidate.lineage.statementFingerprints.length > 0);
    assert.ok(candidate.lineage.semanticGuards.includes("missing_evidence_not_fabricated"));
    assert.equal(candidate.generation.mode, "deterministic_template");
    assert.equal(candidate.generation.aiAssisted, false);
    assert.equal(candidate.generation.providerModel, null);
    assert.equal(candidate.governanceHandoff.proposalPersistenceAuthorized, false);
    assert.equal(candidate.governanceHandoff.approvalGranted, false);
    assert.equal(candidate.governanceHandoff.task51AuthorizationCreated, false);
    assert.equal(candidate.governanceHandoff.publicSiteWrites, false);
  }
});

test("P9.7 capability remains architecture-only/default-off", () => {
  assert.deepEqual(recommendationGenerationWorkerCapability(), {
    version: RECOMMENDATION_GENERATION_WORKER_VERSION,
    architectureOnly: true,
    deterministicProjectionOnly: true,
    suppliedSyntheticInputsOnly: true,
    recommendationReviewOnly: true,
    deterministicIdempotencyOnly: true,
    p8GovernanceHandoffProjectionOnly: true,
    wallClockAccess: false,
    timerActivated: false,
    schedulerActivated: false,
    liveWorkerEnabled: false,
    liveRetryLoopEnabled: false,
    aiModelCallsAuthorized: false,
    aiProposalGenerationGateActivated: false,
    aiProposalRuntimeAuthorized: false,
    providerCredentialUseAuthorized: false,
    oauthUseAuthorized: false,
    durableEnqueueAuthorized: false,
    queueReservationAuthorized: false,
    recommendationPersistenceAuthorized: false,
    proposalPersistenceAuthorized: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    productionDbReadAuthorized: false,
    productionDbWriteAuthorized: false,
    task69PacketMaterializationAuthorized: false,
    task70ExecutionAuthorized: false,
    providerNetworkReadAuthorized: false,
    crawlNetworkReadAuthorized: false,
    approvalGrantAuthorized: false,
    task51ExecutionAuthorized: false,
    task53ExecutionAuthorized: false,
    task54ExecutionAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
    automaticTransition: false,
    publicationAuthorized: false,
  });
});
