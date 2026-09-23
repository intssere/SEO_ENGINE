import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildUnifiedOpportunityRecord,
  type UnifiedOpportunityEvidenceInput,
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
} from "./opportunity-preview-diff.js";
import {
  buildOpportunityLifecycle,
  type OpportunityLifecycleInput,
} from "./opportunity-lifecycle.js";
import {
  normalizeWorkerControlState,
} from "./worker-control-observability.js";
import {
  projectRecommendationGenerationWorker,
} from "./recommendation-generation-worker.js";
import {
  buildP88PolicyGrant,
  evaluateP88PolicyAdmission,
  type P88PolicyCandidate,
  type P88PolicyEvaluationInput,
  type P88PolicyGrantInput,
} from "./p8-8-policy-grant-evaluation.js";
import {
  buildP88W02ProductTargetBinding,
  materializeP88W02GovernedProposal,
  type P88W02GovernedProposalMaterialization,
  type P88W02MaterializationInput,
} from "./p8-8-governed-proposal-materialization.js";
import {
  P8_8_W03_POLICY_AUTHORIZATION_VERSION,
  P8_8_W03_SYNTHETIC_RESERVATION_VERSION,
  assertP88W03ReplayCompatible,
  assertP88W03ReservationIntegrity,
  buildP88W03PolicyAuthorization,
  buildP88W03ReservationDescriptor,
  p88W03ReservationIntegrityIssues,
  type P88W03PolicyAuthorizationInput,
  type P88W03ReservationDescriptor,
} from "./p8-8-policy-authorization.js";

const OPPORTUNITY_REFERENCE = "2026-09-23T05:00:00.000Z";
const HISTORY_REFERENCE = "2026-09-23T05:30:00.000Z";
const CONTROL_REFERENCE = "2026-09-23T05:40:00.000Z";
const WORKER_REFERENCE = "2026-09-23T05:45:00.000Z";
const MATERIALIZATION_REFERENCE = "2026-09-23T05:50:00.000Z";
const EVALUATION_REFERENCE = "2026-09-23T06:00:00.000Z";
const EVALUATION_EXPIRY = "2026-09-23T06:15:00.000Z";
const ISSUED_AT = "2026-09-23T06:05:00.000Z";
const MARKET = "a".repeat(64);
const CATEGORY = "b".repeat(64);
const SOURCE = "c".repeat(64);
const RESERVATION = "d".repeat(64);
const CONTROL_FP = "e".repeat(64);

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
    observedAt: "2026-09-23T04:30:00.000Z",
    marketFingerprint: MARKET,
    categoryFingerprint: CATEGORY,
  };
}

function opportunityEntry(): OpportunityCollectionEntryInput {
  const opportunity = buildUnifiedOpportunityRecord({
    family: "query",
    kind: "query_gap",
    subjectKey: "query:w03-product-meta",
    referenceTime: OPPORTUNITY_REFERENCE,
    marketFingerprint: MARKET,
    categoryFingerprint: CATEGORY,
    evidence: [
      evidence("gsc_query", fp(10)),
      evidence("serp_ranking", fp(11)),
      evidence("keyword_metrics", fp(12)),
      evidence("trend_context", fp(13)),
      evidence("competitor_gap", fp(14)),
    ],
  });

  const components = Object.fromEntries(
    DIMENSIONS.map((dimension, index) => [
      dimension,
      {
        value:
          dimension === "risk"
            ? 0.1
            : dimension === "effort"
              ? 0.2
              : 0.9,
        basisCode: "p88.w03.synthetic." + dimension,
        evidenceFingerprints: [fp(10 + index)],
      } satisfies OpportunityScoreComponentInput,
    ]),
  ) as Record<OpportunityScoreDimension, OpportunityScoreComponentInput>;

  return {
    opportunity,
    score: scoreUnifiedOpportunity({ opportunity, components }),
  };
}

function buildW02Fixture(input?: {
  gid?: string;
  url?: string;
}): {
  w02Input: P88W02MaterializationInput;
  materialization: P88W02GovernedProposalMaterialization;
} {
  const collection: OpportunityPrioritizationInput = {
    collectionKey: "synthetic:p88-w03",
    entries: [opportunityEntry()],
  };
  const prioritization = prioritizeUnifiedOpportunities(collection);
  const explanationInput: OpportunityExplanationInput = {
    collection,
    prioritization,
  };
  const explanation = explainPrioritizedOpportunities(explanationInput);
  const item = explanation.items[0]!;
  const policy: OpportunityActionabilityPolicyInput = {
    opportunityFingerprint: item.opportunityFingerprint,
    recommendationAllowed: false,
    approvalRequired: true,
    blockCodes: [],
  };
  const actionabilityInput: OpportunityActionabilityInput = {
    explanationInput,
    explanation,
    policies: [policy],
  };
  const actionability = classifyOpportunityActionability(actionabilityInput);
  const decision = actionability.decisions[0]!;

  const previewDiffInput: OpportunityPreviewDiffInput = {
    actionabilityInput,
    actionability,
    previews: [{
      opportunityFingerprint: item.opportunityFingerprint,
      actionabilityFingerprint: decision.actionabilityFingerprint,
      previewKey: "page.meta",
      fields: [{
        fieldKey: "meta_description",
        currentValue: "Before W03 exact bytes",
        proposedValue: "After W03 exact bytes",
      }],
    }],
  };
  const previewDiff = buildOpportunityPreviewDiff(previewDiffInput);
  const lifecycleInput: OpportunityLifecycleInput = {
    previewDiffInput,
    previewDiff,
    historyReferenceTime: HISTORY_REFERENCE,
    histories: [],
  };
  const lifecycle = buildOpportunityLifecycle(lifecycleInput);
  const control = normalizeWorkerControlState({
    mode: "running",
    effectiveAt: CONTROL_REFERENCE,
    reason: "p88_w03_synthetic_control",
  });

  const recommendationWorkerInput = {
    lifecycleInput,
    lifecycle,
    control,
    batchKey: "p88.w03.synthetic",
    referenceTime: WORKER_REFERENCE,
  };
  const projection = projectRecommendationGenerationWorker(
    recommendationWorkerInput,
  );
  const recommendation = projection.candidates[0]!;
  const preview = previewDiff.previews[0]!;

  const targetBinding = buildP88W02ProductTargetBinding({
    siteId: "eb1da9ee-539c-4200-8f04-f64ccaea7768",
    domain: "diamondshelf.us",
    provider: "shopify",
    resourceKind: "product",
    resourceGid: input?.gid ?? "gid://shopify/Product/123456789",
    targetUrl:
      input?.url ?? "https://diamondshelf.us/products/example-product",
    actionType: "update_meta_description",
    field: "meta_description",
    requiredProviderScope: "write_products",
    sourceSystem: "catalog.snapshot",
    sourceIdentity: "product-binding-123456789",
    sourceFingerprint: SOURCE,
  });

  const w02Input: P88W02MaterializationInput = {
    recommendationWorkerInput,
    recommendation,
    selectedPreviewFingerprint: preview.previewFingerprint,
    targetBinding,
    referenceTime: MATERIALIZATION_REFERENCE,
  };
  const materialization = materializeP88W02GovernedProposal(w02Input);

  return { w02Input, materialization };
}

function grantInput(
  overrides: Partial<P88PolicyGrantInput> = {},
): P88PolicyGrantInput {
  return {
    policyId: "policy.initial-product-meta",
    policyVersion: "v1",
    siteId: "eb1da9ee-539c-4200-8f04-f64ccaea7768",
    allowedDomain: "diamondshelf.us",
    provider: "shopify",
    credentialProfileId: "shopify-task53-write-products",
    requiredProviderScope: "write_products",
    allowedResourceKind: "product",
    allowedActionType: "update_meta_description",
    allowedField: "meta_description",
    allowedProposalGenerationMethod: "p9.7_deterministic_preview",
    maximumEffectiveRisk: "low",
    minimumEvidenceRefs: 2,
    minimumQualityScore: 90,
    concurrencyLimit: 1,
    mutationQuota: {
      maxActions: 1,
      windowHours: 24,
    },
    sameTargetCooldownHours: 336,
    activationTime: "2026-09-23T00:00:00.000Z",
    expiryTime: "2026-09-24T00:00:00.000Z",
    revoked: false,
    revokedAt: null,
    activationActorId: "admin@example.com",
    policyStage: "single_action_canary",
    controlBindingId: "p96-diamondshelf-mutation-control",
    ...overrides,
  };
}

function candidateFromW02(
  materialization: P88W02GovernedProposalMaterialization,
  overrides: Partial<P88PolicyCandidate> = {},
): P88PolicyCandidate {
  const base: P88PolicyCandidate = {
    recommendation: {
      recommendationClass: materialization.w01Facts.recommendationClass,
      recommendationFingerprint:
        materialization.w01Facts.recommendationFingerprint,
      recommendationIdempotencyKey:
        materialization.w01Facts.recommendationIdempotencyKey,
      lineageMaterialized: materialization.w01Facts.lineageMaterialized,
      changedPreviewPresent: materialization.w01Facts.changedPreviewPresent,
      deterministic: materialization.w01Facts.deterministic,
      aiAssisted: materialization.w01Facts.aiAssisted,
      humanEditedAfterCertification:
        materialization.w01Facts.humanEditedAfterCertification,
      lifecycleEligible: materialization.w01Facts.lifecycleEligible,
      proposalGenerationMethod:
        materialization.w01Facts.proposalGenerationMethod,
    },
    proposal: {
      proposalFingerprint: materialization.proposalFingerprint,
      boundedPilot: true,
      wholeSiteCoverage: materialization.w01Facts.wholeSiteCoverage,
    },
    evidence: {
      ids: ["evidence-a", "evidence-b"],
      missingEvidence: [],
    },
    quality: {
      status: "pass",
      approvalEligible: true,
      score: 100,
      blockingReasons: [],
      warnings: [],
    },
    risk: {
      classification: "low",
    },
    target: {
      provider: materialization.w01Facts.provider,
      domain: materialization.w01Facts.domain,
      resourceKind: materialization.w01Facts.resourceKind,
      resourceGid: materialization.w01Facts.resourceGid,
      targetUrl: materialization.w01Facts.targetUrl,
      actionType: materialization.w01Facts.actionType,
      field: materialization.w01Facts.field,
      requiredProviderScope:
        materialization.w01Facts.requiredProviderScope,
      beforeFingerprint: materialization.before.fingerprint,
      afterFingerprint: materialization.after.fingerprint,
    },
    currentState: {
      providerObservedBeforeFingerprint: materialization.before.fingerprint,
      priorDeploymentCount: 0,
      otherActiveSiteMutationCount: 0,
      sameTargetCooldownSatisfied: true,
      mutationQuotaRemaining: 1,
      unresolvedManualIntervention: false,
      unresolvedUncertainProviderWrite: false,
      unresolvedRollbackFailure: false,
      mutationControlMode: "running",
      mutationControlFingerprint: CONTROL_FP,
    },
  };

  return {
    ...base,
    ...overrides,
    recommendation: {
      ...base.recommendation,
      ...(overrides.recommendation ?? {}),
    },
    proposal: {
      ...base.proposal,
      ...(overrides.proposal ?? {}),
    },
    evidence: {
      ...base.evidence,
      ...(overrides.evidence ?? {}),
    },
    quality: {
      ...base.quality,
      ...(overrides.quality ?? {}),
    },
    risk: {
      ...base.risk,
      ...(overrides.risk ?? {}),
    },
    target: {
      ...base.target,
      ...(overrides.target ?? {}),
    },
    currentState: {
      ...base.currentState,
      ...(overrides.currentState ?? {}),
    },
  };
}

function buildW01Fixture(
  materialization: P88W02GovernedProposalMaterialization,
  input?: {
    grant?: Partial<P88PolicyGrantInput>;
    candidate?: Partial<P88PolicyCandidate>;
    evaluationExpiresAt?: string;
  },
) {
  const grant = buildP88PolicyGrant(grantInput(input?.grant));
  const candidate = candidateFromW02(materialization, input?.candidate);
  const w01Input: P88PolicyEvaluationInput = {
    grant,
    referenceTime: EVALUATION_REFERENCE,
    evaluationExpiresAt: input?.evaluationExpiresAt ?? EVALUATION_EXPIRY,
    candidate,
  };
  const evaluation = evaluateP88PolicyAdmission(w01Input);
  return { w01Input, evaluation };
}

function reservation(input?: {
  id?: string;
  fingerprint?: string;
}) {
  return buildP88W03ReservationDescriptor({
    reservationId: input?.id ?? "reservation.synthetic.001",
    reservationFingerprint: input?.fingerprint ?? RESERVATION,
    reservationState: "reserved_prewrite",
    reservationVersion: P8_8_W03_SYNTHETIC_RESERVATION_VERSION,
    reservationDurable: false,
    reservationSource: "synthetic_test",
  });
}

function authorizationInput(input?: {
  w02?: ReturnType<typeof buildW02Fixture>;
  w01?: ReturnType<typeof buildW01Fixture>;
  reservation?: P88W03ReservationDescriptor;
  issuedAt?: string;
  ttlMinutes?: number;
}): P88W03PolicyAuthorizationInput {
  const w02 = input?.w02 ?? buildW02Fixture();
  const w01 = input?.w01 ?? buildW01Fixture(w02.materialization);

  return {
    w01EvaluationInput: w01.w01Input,
    w01Evaluation: w01.evaluation,
    w02MaterializationInput: w02.w02Input,
    w02Materialization: w02.materialization,
    reservation: input?.reservation ?? reservation(),
    issuedAt: input?.issuedAt ?? ISSUED_AT,
    ttlMinutes: input?.ttlMinutes ?? 10,
  };
}

test("W03 deterministically creates provenance-distinct non-dispatchable policy authorization", () => {
  const result = buildP88W03PolicyAuthorization(authorizationInput());

  assert.equal(result.version, P8_8_W03_POLICY_AUTHORIZATION_VERSION);
  assert.equal(result.authorizationProvenance, "policy_authorization");
  assert.equal(result.persistedActionId, null);
  assert.equal(result.persistedActionCreated, false);
  assert.equal(result.authorization.policyAuthorizationGranted, true);
  assert.equal(result.authorization.policyAwarePreflightEligible, true);
  assert.equal(result.authorization.providerWriteAllowed, false);
  assert.equal(result.authorization.providerDispatchAuthorized, false);
  assert.equal(result.authorization.publicSiteWrites, false);
  assert.equal(result.authorization.automaticTransition, false);
  assert.equal(result.authorization.task51Compatible, false);
  assert.equal(result.authorization.task54HumanConfirmationCompatible, false);
  assert.equal(result.authorization.humanApprovalPresent, false);
  assert.equal(result.authorization.dispatchEligible, false);
  assert.equal(result.safety.databaseReadPerformed, false);
  assert.equal(result.safety.databaseWritePerformed, false);
  assert.equal(result.safety.providerNetworkReadPerformed, false);
  assert.equal(result.safety.providerWritePerformed, false);
  assert.equal(result.safety.approvalRowCreated, false);
  assert.equal(result.safety.durableReservationCreated, false);
  assert.equal(result.safety.task51ExecutionPerformed, false);
  assert.equal(result.safety.task53ExecutionPerformed, false);
  assert.equal(result.safety.task54ExecutionPerformed, false);
  assert.equal(result.safety.task54HumanConfirmationGenerated, false);
  assert.equal(result.safety.providerDispatchAuthorized, false);
  assert.equal(result.safety.autonomousLiveExecutionAuthorized, false);

  assert.match(result.policyActionId, /^p88w03-action-[0-9a-f]{24}$/);
  assert.match(
    result.policyAuthorizationId,
    /^p88w03-authorization-[0-9a-f]{24}$/,
  );
  assert.match(result.policyAuthorizationFingerprint, /^[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.authorization), true);
  assert.equal(Object.isFrozen(result.safety), true);
});

test("exact replay returns identical W03 identities", () => {
  const input = authorizationInput();
  const first = buildP88W03PolicyAuthorization(input);
  const second = buildP88W03PolicyAuthorization(input);

  assert.equal(first.policyActionId, second.policyActionId);
  assert.equal(
    first.policyAuthorizationId,
    second.policyAuthorizationId,
  );
  assert.equal(
    first.policyAuthorizationFingerprint,
    second.policyAuthorizationFingerprint,
  );
  assert.doesNotThrow(() => assertP88W03ReplayCompatible(first, second));
});

test("W03 reservation descriptor is integrity-bound and remains synthetic/non-durable before W04", () => {
  const descriptor = reservation();
  assert.equal(descriptor.reservationDurable, false);
  assert.equal(descriptor.reservationSource, "synthetic_test");
  assert.deepEqual(p88W03ReservationIntegrityIssues(descriptor), []);
  assert.doesNotThrow(() => assertP88W03ReservationIntegrity(descriptor));

  const tampered = {
    ...descriptor,
    reservationFingerprint: fp(999),
  } as P88W03ReservationDescriptor;
  assert.deepEqual(
    p88W03ReservationIntegrityIssues(tampered),
    ["p88_w03_reservation_descriptor_fingerprint_mismatch"],
  );

  assert.throws(
    () =>
      buildP88W03ReservationDescriptor({
        reservationId: "reservation.real.001",
        reservationFingerprint: RESERVATION,
        reservationState: "reserved_prewrite",
        reservationVersion: P8_8_W03_SYNTHETIC_RESERVATION_VERSION,
        reservationDurable: true,
        reservationSource: "synthetic_test",
      }),
    /p88_w03_durable_reservation_not_supported_before_w04/,
  );
});

test("W01 reject cannot become W03 policy authorization", () => {
  const w02 = buildW02Fixture();
  const w01 = buildW01Fixture(w02.materialization, {
    candidate: {
      risk: { classification: "medium" },
    },
  });
  assert.equal(w01.evaluation.decision, "reject");

  assert.throws(
    () =>
      buildP88W03PolicyAuthorization(
        authorizationInput({ w02, w01 }),
      ),
    /p88_w03_w01_not_admitted/,
  );
});

test("tampered W01 evaluation fails canonical rebuild", () => {
  const input = authorizationInput();
  const tampered = {
    ...input.w01Evaluation,
    evaluationId: "p88w01-eval-deadbeefdeadbeefdeadbeef",
  };

  assert.throws(
    () =>
      buildP88W03PolicyAuthorization({
        ...input,
        w01Evaluation: tampered,
      }),
    /p88_w03_w01_evaluation_integrity_mismatch/,
  );
});

test("tampered W02 materialization fails canonical rebuild", () => {
  const input = authorizationInput();
  const tampered = {
    ...input.w02Materialization,
    proposalId: "p88w02-proposal-deadbeefdeadbeefdeadbeef",
  };

  assert.throws(
    () =>
      buildP88W03PolicyAuthorization({
        ...input,
        w02Materialization: tampered,
      }),
    /p88_w03_w02_materialization_integrity_mismatch/,
  );
});

test("W01 and W02 proposal mismatch fails cross-lineage equality", () => {
  const w02 = buildW02Fixture();
  const w01 = buildW01Fixture(w02.materialization, {
    candidate: {
      proposal: {
        proposalFingerprint: fp(777),
        boundedPilot: true,
        wholeSiteCoverage: false,
      },
    },
  });
  assert.equal(w01.evaluation.decision, "admit");

  assert.throws(
    () =>
      buildP88W03PolicyAuthorization(
        authorizationInput({ w02, w01 }),
      ),
    /p88_w03_cross_lineage_mismatch:proposal_fingerprint/,
  );
});

test("W01 and W02 target or state mismatch fails cross-lineage equality", () => {
  const w02 = buildW02Fixture();
  const targetMismatch = buildW01Fixture(w02.materialization, {
    candidate: {
      target: {
        provider: "shopify",
        domain: "diamondshelf.us",
        resourceKind: "product",
        resourceGid: "gid://shopify/Product/987654321",
        targetUrl: "https://diamondshelf.us/products/other-product",
        actionType: "update_meta_description",
        field: "meta_description",
        requiredProviderScope: "write_products",
        beforeFingerprint: w02.materialization.before.fingerprint,
        afterFingerprint: w02.materialization.after.fingerprint,
      },
      currentState: {
        providerObservedBeforeFingerprint:
          w02.materialization.before.fingerprint,
        priorDeploymentCount: 0,
        otherActiveSiteMutationCount: 0,
        sameTargetCooldownSatisfied: true,
        mutationQuotaRemaining: 1,
        unresolvedManualIntervention: false,
        unresolvedUncertainProviderWrite: false,
        unresolvedRollbackFailure: false,
        mutationControlMode: "running",
        mutationControlFingerprint: CONTROL_FP,
      },
    },
  });
  assert.equal(targetMismatch.evaluation.decision, "admit");
  assert.throws(
    () =>
      buildP88W03PolicyAuthorization(
        authorizationInput({ w02, w01: targetMismatch }),
      ),
    /p88_w03_cross_lineage_mismatch:resource_gid/,
  );

  const stateMismatch = buildW01Fixture(w02.materialization, {
    candidate: {
      target: {
        ...candidateFromW02(w02.materialization).target,
        afterFingerprint: fp(778),
      },
    },
  });
  assert.equal(stateMismatch.evaluation.decision, "admit");
  assert.throws(
    () =>
      buildP88W03PolicyAuthorization(
        authorizationInput({ w02, w01: stateMismatch }),
      ),
    /p88_w03_cross_lineage_mismatch:after_fingerprint/,
  );
});

test("W03 rejects expired evaluation and invalid TTLs", () => {
  const base = authorizationInput();

  assert.throws(
    () =>
      buildP88W03PolicyAuthorization({
        ...base,
        issuedAt: EVALUATION_EXPIRY,
      }),
    /p88_w03_w01_evaluation_expired/,
  );

  assert.throws(
    () =>
      buildP88W03PolicyAuthorization({
        ...base,
        ttlMinutes: 16,
      }),
    /p88_w03_invalid_ttl_minutes/,
  );

  assert.throws(
    () =>
      buildP88W03PolicyAuthorization({
        ...base,
        ttlMinutes: 0,
      }),
    /p88_w03_invalid_ttl_minutes/,
  );
});

test("W03 expiry is clamped to the W01 evaluation window", () => {
  const w02 = buildW02Fixture();
  const w01 = buildW01Fixture(w02.materialization, {
    evaluationExpiresAt: "2026-09-23T06:08:00.000Z",
  });
  const result = buildP88W03PolicyAuthorization(
    authorizationInput({
      w02,
      w01,
      issuedAt: ISSUED_AT,
      ttlMinutes: 15,
    }),
  );

  assert.equal(result.expiresAt, "2026-09-23T06:08:00.000Z");
});

test("W03 rejects human approval or Task #54 confirmation fields even via untyped input", () => {
  const input = authorizationInput();

  assert.throws(
    () =>
      buildP88W03PolicyAuthorization({
        ...input,
        approvalId: "human-approval-1",
      } as unknown as P88W03PolicyAuthorizationInput),
    /p88_w03_human_authorization_field_forbidden:approvalId/,
  );

  assert.throws(
    () =>
      buildP88W03PolicyAuthorization({
        ...input,
        task54Confirmation: "APPLY_AND_VERIFY_TASK54:anything",
      } as unknown as P88W03PolicyAuthorizationInput),
    /p88_w03_human_authorization_field_forbidden:task54Confirmation/,
  );
});

test("W03 artifact is structurally incompatible with human Task #51/Task #54 authorization", () => {
  const result = buildP88W03PolicyAuthorization(authorizationInput());
  const artifact = result as unknown as Record<string, unknown>;

  assert.notEqual(result.version, "controlled_execution_foundation_v1");
  assert.equal(Object.prototype.hasOwnProperty.call(artifact, "planId"), false);
  assert.equal(
    Object.prototype.hasOwnProperty.call(artifact, "envelopeFingerprint"),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(result.authorization, "executionAuthorized"),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(artifact, "approvalId"),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(artifact, "approvalDecision"),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(artifact, "approvalActor"),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(artifact, "task54Confirmation"),
    false,
  );
});

test("conflicting replay with same W01/W02 lineage but different reservation or issuance fails closed", () => {
  const base = authorizationInput();
  const first = buildP88W03PolicyAuthorization(base);
  const reservationConflict = buildP88W03PolicyAuthorization({
    ...base,
    reservation: reservation({
      id: "reservation.synthetic.002",
      fingerprint: fp(990),
    }),
  });
  const timeConflict = buildP88W03PolicyAuthorization({
    ...base,
    issuedAt: "2026-09-23T06:06:00.000Z",
  });

  assert.throws(
    () => assertP88W03ReplayCompatible(first, reservationConflict),
    /p88_w03_conflicting_replay_identity/,
  );
  assert.throws(
    () => assertP88W03ReplayCompatible(first, timeConflict),
    /p88_w03_conflicting_replay_identity/,
  );
});

test("W03 source has no DB, HTTP, provider SDK, route, Task runtime, worker dispatch, or environment binding", async () => {
  const source = await readFile(
    new URL("./p8-8-policy-authorization.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /from "node:crypto"/);
  assert.match(source, /p8-8-policy-grant-evaluation/);
  assert.match(source, /p8-8-governed-proposal-materialization/);
  assert.doesNotMatch(source, /execution-foundation/);
  assert.doesNotMatch(source, /task51-action-renewal/);
  assert.doesNotMatch(source, /task53-read-only-resource-resolver/);
  assert.doesNotMatch(source, /task54-persistent-apply/);
  assert.doesNotMatch(source, /from "postgres"/);
  assert.doesNotMatch(source, /drizzle-orm/);
  assert.doesNotMatch(source, /DATABASE_URL/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /https?\.request/);
  assert.doesNotMatch(source, /express\s*\(/);
  assert.doesNotMatch(source, /router\./);
  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /scheduler.*dispatch/i);
  assert.doesNotMatch(source, /worker.*dispatch/i);
});
