import {
  buildActionAuditLedger,
  type ActionAuditLedger,
} from "./action-audit-ledger.js";
import {
  buildP88PolicyGrant,
  evaluateP88PolicyAdmission,
  type P88PolicyCandidate,
  type P88PolicyGrantInput,
} from "./p8-8-policy-grant-evaluation.js";
import {
  computeP88W09SourceFingerprint,
  type P88W09ShadowItemInput,
  type P88W09SourceProvenance,
} from "./p8-8-stage-0-shadow-certification.js";
import type { UnifiedTimelineSourceEventInput } from "./unified-change-timeline.js";

const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);
const D = "d".repeat(64);

export function buildP88W09GrantInput(
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
    mutationQuota: { maxActions: 1, windowHours: 24 },
    sameTargetCooldownHours: 336,
    activationTime: "2026-09-23T00:00:00.000Z",
    expiryTime: "2026-10-23T00:00:00.000Z",
    revoked: false,
    revokedAt: null,
    activationActorId: "admin@example.com",
    policyStage: "shadow",
    controlBindingId: "p96-diamondshelf-mutation-control",
    ...overrides,
  };
}

export function buildP88W09Candidate(
  overrides: Partial<P88PolicyCandidate> = {},
): P88PolicyCandidate {
  const base: P88PolicyCandidate = {
    recommendation: {
      recommendationClass: "proposal_review",
      recommendationFingerprint: A,
      recommendationIdempotencyKey: "rgk-w09-product-meta",
      lineageMaterialized: true,
      changedPreviewPresent: true,
      deterministic: true,
      aiAssisted: false,
      humanEditedAfterCertification: false,
      lifecycleEligible: true,
      proposalGenerationMethod: "p9.7_deterministic_preview",
    },
    proposal: {
      proposalFingerprint: B,
      boundedPilot: true,
      wholeSiteCoverage: false,
    },
    evidence: {
      ids: ["evidence-b", "evidence-a"],
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
      provider: "shopify",
      domain: "diamondshelf.us",
      resourceKind: "product",
      resourceGid: "gid://shopify/Product/123456789",
      targetUrl: "https://diamondshelf.us/products/example-product",
      actionType: "update_meta_description",
      field: "meta_description",
      requiredProviderScope: "write_products",
      beforeFingerprint: C,
      afterFingerprint: D,
    },
    currentState: {
      providerObservedBeforeFingerprint: C,
      priorDeploymentCount: 0,
      otherActiveSiteMutationCount: 0,
      sameTargetCooldownSatisfied: true,
      mutationQuotaRemaining: 1,
      unresolvedManualIntervention: false,
      unresolvedUncertainProviderWrite: false,
      unresolvedRollbackFailure: false,
      mutationControlMode: "running",
      mutationControlFingerprint: A,
    },
  };

  return {
    ...base,
    ...overrides,
    recommendation: { ...base.recommendation, ...(overrides.recommendation ?? {}) },
    proposal: { ...base.proposal, ...(overrides.proposal ?? {}) },
    evidence: { ...base.evidence, ...(overrides.evidence ?? {}) },
    quality: { ...base.quality, ...(overrides.quality ?? {}) },
    risk: { ...base.risk, ...(overrides.risk ?? {}) },
    target: { ...base.target, ...(overrides.target ?? {}) },
    currentState: { ...base.currentState, ...(overrides.currentState ?? {}) },
  };
}

function timelineEvent(input: {
  actionId: string;
  eventId: string;
  eventKind: "action_authorized" | "proposal_rejected";
  target: ReturnType<typeof buildP88W09Candidate>["target"];
}): UnifiedTimelineSourceEventInput {
  return {
    occurredAt: "2026-09-23T06:05:00.000Z",
    eventClass: input.eventKind === "proposal_rejected" ? "proposal" : "execution",
    eventKind: input.eventKind,
    source: {
      system: "p88w09-human-fixture",
      version: "v1",
      eventId: input.eventId,
      eventFingerprint: null,
    },
    site: {
      siteId: "eb1da9ee-539c-4200-8f04-f64ccaea7768",
      domain: "diamondshelf.us",
    },
    lineage: {
      opportunityId: null,
      opportunityFingerprint: null,
      relatedOpportunityFingerprint: null,
      recommendationId: null,
      recommendationFingerprint: null,
      actionPlanId: "plan-w09-human",
      proposalFingerprint: B,
      approvalId: input.eventKind === "action_authorized" ? "approval-w09-human" : null,
      actionId: input.actionId,
      authorizationFingerprint: input.eventKind === "action_authorized" ? A : null,
      deploymentId: null,
      verificationId: null,
      rollbackId: null,
    },
    target: {
      pageId: null,
      url: input.target.targetUrl,
      resourceKind: input.target.resourceKind,
      resourceId: input.target.resourceGid,
      field: input.target.field,
      beforeFingerprint: input.target.beforeFingerprint,
      afterFingerprint: input.target.afterFingerprint,
    },
    associations: { query: null, category: null },
    state: {
      terminal: input.eventKind === "proposal_rejected",
      providerMutationOccurred: false,
      verification: null,
      rollback: null,
      changeRetainedLive: null,
      manualInterventionRequired: false,
      measurementEligibility: null,
    },
    sourceLineage: [],
  };
}

export function buildP88W09HumanLedger(options: {
  candidate?: P88PolicyCandidate;
  eventKind?: "action_authorized" | "proposal_rejected";
  resourceKind?: "product" | "collection";
  targetUrl?: string;
  resourceGid?: string;
} = {}): ActionAuditLedger {
  const candidate = options.candidate ?? buildP88W09Candidate();
  const actionId = "action-w09-human";
  const resourceKind = options.resourceKind ?? "product";
  const targetUrl = options.targetUrl ?? candidate.target.targetUrl;
  const resourceGid = options.resourceGid ?? candidate.target.resourceGid;
  const targetCandidate = {
    ...candidate.target,
    resourceKind,
    targetUrl,
    resourceGid,
  };
  return buildActionAuditLedger({
    actionId,
    referenceTime: "2026-09-23T06:10:00.000Z",
    target: {
      mutationClass:
        resourceKind === "product"
          ? "shopify_product_seo_meta_description"
          : "shopify_collection_seo_meta_description",
      resource: { kind: resourceKind, gid: resourceGid },
      targetUrl,
      field: "meta_description",
      beforeFingerprint: candidate.target.beforeFingerprint,
      afterFingerprint: candidate.target.afterFingerprint,
    },
    timelineEvents: [
      timelineEvent({
        actionId,
        eventId: "human-event-1",
        eventKind: options.eventKind ?? "action_authorized",
        target: targetCandidate as P88PolicyCandidate["target"],
      }),
    ],
  });
}

export function buildP88W09TestFixture(options: {
  sourceId?: string;
  provenance?: P88W09SourceProvenance;
  grantOverrides?: Partial<P88PolicyGrantInput>;
  candidateOverrides?: Partial<P88PolicyCandidate>;
  humanLedger?: ActionAuditLedger | null;
  referenceTime?: string;
  evaluationExpiresAt?: string;
} = {}) {
  const grant = buildP88PolicyGrant(buildP88W09GrantInput(options.grantOverrides));
  const candidate = buildP88W09Candidate(options.candidateOverrides);
  const referenceTime = options.referenceTime ?? "2026-09-23T06:00:00.000Z";
  const evaluationExpiresAt =
    options.evaluationExpiresAt ?? "2026-09-23T06:15:00.000Z";
  const evaluation = evaluateP88PolicyAdmission({
    grant,
    candidate,
    referenceTime,
    evaluationExpiresAt,
  });
  const sourceBase = {
    system: "p88w09-test-source",
    version: "v1",
    sourceId: options.sourceId ?? "shadow-source-1",
    provenance: options.provenance ?? "synthetic_fixture",
  } as const;
  const sourceFingerprint = computeP88W09SourceFingerprint({
    source: sourceBase,
    grant,
    candidate,
    referenceTime,
    evaluationExpiresAt,
  });
  const input: P88W09ShadowItemInput = {
    source: { ...sourceBase, sourceFingerprint },
    grant,
    candidate,
    referenceTime,
    evaluationExpiresAt,
    evaluation,
    humanLedger: options.humanLedger ?? null,
  };
  return Object.freeze({ grant, candidate, evaluation, input });
}
