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
  type P88W02MaterializationInput,
} from "./p8-8-governed-proposal-materialization.js";
import {
  P8_8_W03_SYNTHETIC_RESERVATION_VERSION,
  buildP88W03PolicyAuthorization,
  buildP88W03ReservationDescriptor,
  type P88W03PolicyAuthorizationInput,
} from "./p8-8-policy-authorization.js";
import {
  projectP88W04ReservationIntent,
  type P88W04ReservationIntentInput,
} from "./p8-8-reservation-intent.js";
import type { P88W04DurableReservationInput } from "./p8-8-reservation-store.js";

const MARKET = "a".repeat(64);
const CATEGORY = "b".repeat(64);
const SOURCE = "c".repeat(64);
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

function iso(baseMs: number, offsetMinutes: number): string {
  return new Date(baseMs + offsetMinutes * 60_000).toISOString();
}

function evidence(
  kind: UnifiedOpportunityEvidenceInput["kind"],
  fingerprint: string,
  observedAt: string,
): UnifiedOpportunityEvidenceInput {
  return {
    kind,
    fingerprint,
    sourceKey: "synthetic:" + kind,
    observedAt,
    marketFingerprint: MARKET,
    categoryFingerprint: CATEGORY,
  };
}

function opportunityEntry(
  opportunityReference: string,
  evidenceObservedAt: string,
  subjectKey: string,
): OpportunityCollectionEntryInput {
  const opportunity = buildUnifiedOpportunityRecord({
    family: "query",
    kind: "query_gap",
    subjectKey,
    referenceTime: opportunityReference,
    marketFingerprint: MARKET,
    categoryFingerprint: CATEGORY,
    evidence: [
      evidence("gsc_query", fp(10), evidenceObservedAt),
      evidence("serp_ranking", fp(11), evidenceObservedAt),
      evidence("keyword_metrics", fp(12), evidenceObservedAt),
      evidence("trend_context", fp(13), evidenceObservedAt),
      evidence("competitor_gap", fp(14), evidenceObservedAt),
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
        basisCode: "p88.w04.synthetic." + dimension,
        evidenceFingerprints: [fp(10 + index)],
      } satisfies OpportunityScoreComponentInput,
    ]),
  ) as Record<OpportunityScoreDimension, OpportunityScoreComponentInput>;

  return {
    opportunity,
    score: scoreUnifiedOpportunity({ opportunity, components }),
  };
}

function grantInput(
  siteId: string,
  activationTime: string,
  expiryTime: string,
): P88PolicyGrantInput {
  return {
    policyId: "policy.initial-product-meta",
    policyVersion: "v1",
    siteId,
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
    activationTime,
    expiryTime,
    revoked: false,
    revokedAt: null,
    activationActorId: "admin@example.com",
    policyStage: "single_action_canary",
    controlBindingId: "p96-diamondshelf-mutation-control",
  };
}

function candidateFromW02(
  materialization: ReturnType<typeof materializeP88W02GovernedProposal>,
): P88PolicyCandidate {
  return {
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
      wholeSiteCoverage: false,
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
}

export type P88W04TestScenarioOptions = {
  siteId?: string;
  baseTime?: string;
  productId?: string;
  handle?: string;
  currentValue?: string;
  proposedValue?: string;
  subjectSuffix?: string;
  ttlMinutes?: number;
};

export function buildP88W04TestScenario(
  options: P88W04TestScenarioOptions = {},
): {
  input: P88W04DurableReservationInput;
  intentInput: P88W04ReservationIntentInput;
  w03Input: P88W03PolicyAuthorizationInput;
} {
  const siteId =
    options.siteId ?? "eb1da9ee-539c-4200-8f04-f64ccaea7768";
  const baseMs = Date.parse(
    options.baseTime ?? "2026-09-23T12:00:00.000Z",
  );
  if (!Number.isFinite(baseMs)) {
    throw new Error("p88_w04_test_base_time_invalid");
  }

  const productId = options.productId ?? "123456789";
  const handle = options.handle ?? "example-product";
  const currentValue = options.currentValue ?? "Before W04 exact bytes";
  const proposedValue = options.proposedValue ?? "After W04 exact bytes";
  const subjectSuffix = options.subjectSuffix ?? productId;

  const evidenceObservedAt = iso(baseMs, -80);
  const opportunityReference = iso(baseMs, -75);
  const historyReference = iso(baseMs, -60);
  const controlReference = iso(baseMs, -55);
  const workerReference = iso(baseMs, -50);
  const materializationReference = iso(baseMs, -45);
  const evaluationReference = iso(baseMs, -10);
  const evaluationExpiry = iso(baseMs, 10);
  const issuedAt = iso(baseMs, -5);
  const grantActivation = iso(baseMs, -1440);
  const grantExpiry = iso(baseMs, 1440);

  const collection: OpportunityPrioritizationInput = {
    collectionKey: "synthetic:p88-w04:" + subjectSuffix,
    entries: [
      opportunityEntry(
        opportunityReference,
        evidenceObservedAt,
        "query:w04-product-meta:" + subjectSuffix,
      ),
    ],
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
    previews: [
      {
        opportunityFingerprint: item.opportunityFingerprint,
        actionabilityFingerprint: decision.actionabilityFingerprint,
        previewKey: "page.meta",
        fields: [
          {
            fieldKey: "meta_description",
            currentValue,
            proposedValue,
          },
        ],
      },
    ],
  };
  const previewDiff = buildOpportunityPreviewDiff(previewDiffInput);
  const lifecycleInput: OpportunityLifecycleInput = {
    previewDiffInput,
    previewDiff,
    historyReferenceTime: historyReference,
    histories: [],
  };
  const lifecycle = buildOpportunityLifecycle(lifecycleInput);
  const control = normalizeWorkerControlState({
    mode: "running",
    effectiveAt: controlReference,
    reason: "p88_w04_synthetic_control",
  });

  const recommendationWorkerInput = {
    lifecycleInput,
    lifecycle,
    control,
    batchKey: "p88.w04.synthetic." + subjectSuffix,
    referenceTime: workerReference,
  };
  const projection = projectRecommendationGenerationWorker(
    recommendationWorkerInput,
  );
  const recommendation = projection.candidates[0]!;
  const preview = previewDiff.previews[0]!;

  const targetBinding = buildP88W02ProductTargetBinding({
    siteId,
    domain: "diamondshelf.us",
    provider: "shopify",
    resourceKind: "product",
    resourceGid: "gid://shopify/Product/" + productId,
    targetUrl: "https://diamondshelf.us/products/" + handle,
    actionType: "update_meta_description",
    field: "meta_description",
    requiredProviderScope: "write_products",
    sourceSystem: "catalog.snapshot",
    sourceIdentity: "product-binding-" + productId,
    sourceFingerprint: SOURCE,
  });

  const w02Input: P88W02MaterializationInput = {
    recommendationWorkerInput,
    recommendation,
    selectedPreviewFingerprint: preview.previewFingerprint,
    targetBinding,
    referenceTime: materializationReference,
  };
  const w02 = materializeP88W02GovernedProposal(w02Input);

  const grant = buildP88PolicyGrant(
    grantInput(siteId, grantActivation, grantExpiry),
  );
  const w01Input: P88PolicyEvaluationInput = {
    grant,
    referenceTime: evaluationReference,
    evaluationExpiresAt: evaluationExpiry,
    candidate: candidateFromW02(w02),
  };
  const w01 = evaluateP88PolicyAdmission(w01Input);

  const intentInput: P88W04ReservationIntentInput = {
    w01EvaluationInput: w01Input,
    w01Evaluation: w01,
    w02MaterializationInput: w02Input,
    w02Materialization: w02,
  };
  const intent = projectP88W04ReservationIntent(intentInput);

  const reservation = buildP88W03ReservationDescriptor({
    reservationId: intent.reservationId,
    reservationFingerprint: intent.reservationFingerprint,
    reservationState: "reserved_prewrite",
    reservationVersion: P8_8_W03_SYNTHETIC_RESERVATION_VERSION,
    reservationDurable: false,
    reservationSource: "synthetic_test",
  });

  const w03Input: P88W03PolicyAuthorizationInput = {
    w01EvaluationInput: w01Input,
    w01Evaluation: w01,
    w02MaterializationInput: w02Input,
    w02Materialization: w02,
    reservation,
    issuedAt,
    ttlMinutes: options.ttlMinutes ?? 15,
  };
  const w03 = buildP88W03PolicyAuthorization(w03Input);

  return {
    input: {
      intentInput,
      intent,
      w03Input,
      w03Authorization: w03,
    },
    intentInput,
    w03Input,
  };
}
