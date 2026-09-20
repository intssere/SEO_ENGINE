import { createHash } from "node:crypto";
import {
  P6_7_OPPORTUNITY_LIFECYCLE_VERSION,
  buildOpportunityLifecycle,
  type OpportunityLifecycleInput,
  type OpportunityLifecycleReport,
  type OpportunityLifecycleRecord,
} from "./opportunity-lifecycle.js";
import type {
  OpportunityActionabilityDecision,
} from "./opportunity-actionability.js";
import type {
  OpportunityExplanationItem,
} from "./opportunity-explanation.js";
import type {
  OpportunityPreviewDiff,
} from "./opportunity-preview-diff.js";
import {
  WORKER_CONTROL_OBSERVABILITY_VERSION,
  normalizeWorkerControlState,
  type WorkerControlMode,
  type WorkerControlState,
} from "./worker-control-observability.js";

export const RECOMMENDATION_GENERATION_WORKER_VERSION =
  "p9-7-recommendation-generation-worker-v1" as const;

export const RECOMMENDATION_GENERATION_MAX_ITEMS = 256;

export type RecommendationGenerationClass =
  | "advisory_review"
  | "proposal_review";

export type RecommendationGenerationDisposition =
  | "generated_review"
  | "held_by_control"
  | "held_deferred"
  | "withheld_informational"
  | "withheld_blocked"
  | "withheld_terminal"
  | "withheld_approval_preview_required";

export type RecommendationGenerationReason =
  | "recommendation_allowed"
  | "approval_required_with_changed_preview"
  | "control_paused"
  | "control_draining"
  | "control_drained"
  | "control_killed"
  | "lifecycle_deferred"
  | "lifecycle_dismissed"
  | "lifecycle_closed"
  | "lifecycle_superseded"
  | "actionability_informational"
  | "actionability_blocked"
  | "approval_changed_preview_required";

export type RecommendationGenerationCandidate = {
  version: typeof RECOMMENDATION_GENERATION_WORKER_VERSION;
  recommendationId: string;
  recommendationFingerprint: string;
  idempotencyKey: string;
  idempotencyFingerprint: string;
  lifecycle: "proposed_review";
  recommendationClass: RecommendationGenerationClass;
  recommendationCode: string;
  reviewInstruction: string;
  expectedReviewOutcome: string;
  generation: {
    mode: "deterministic_template";
    aiAssisted: false;
    providerModel: null;
    freeformGeneration: false;
  };
  lineage: {
    opportunityId: string;
    opportunityFingerprint: string;
    family: OpportunityExplanationItem["family"];
    kind: OpportunityExplanationItem["kind"];
    subjectKey: string;
    explanationId: string;
    explanationFingerprint: string;
    actionabilityId: string;
    actionabilityFingerprint: string;
    lifecycleId: string;
    lifecycleFingerprint: string;
    lifecycleState: OpportunityLifecycleRecord["currentState"];
    scoreFingerprint: string;
    scoreStatus: OpportunityExplanationItem["score"]["status"];
    score100: number | null;
    priorityRank: number | null;
    priorityTieCount: number | null;
    evidenceFingerprints: string[];
    statementFingerprints: string[];
    missingEvidence: string[];
    semanticGuards: OpportunityExplanationItem["semanticGuards"];
    previewFingerprints: string[];
    changedPreviewFingerprints: string[];
  };
  governanceHandoff: {
    surface: "p8_governance_review";
    previewAvailable: boolean;
    changedPreviewAvailable: boolean;
    approvalRequired: boolean;
    proposalRecordCreated: false;
    proposalPersistenceAuthorized: false;
    approvalGranted: false;
    executionAuthorized: false;
    publicSiteWrites: false;
    automaticTransitionAuthorized: false;
    task51AuthorizationCreated: false;
  };
  safety: ReturnType<typeof recommendationGenerationWorkerCapability>;
};

export type RecommendationGenerationItem = {
  opportunityFingerprint: string;
  actionabilityClassification: OpportunityActionabilityDecision["classification"];
  lifecycleState: OpportunityLifecycleRecord["currentState"];
  disposition: RecommendationGenerationDisposition;
  reason: RecommendationGenerationReason;
  recommendationId: string | null;
  recommendationFingerprint: string | null;
  idempotencyKey: string | null;
};

const BATCH_KEY = /^[a-z0-9][a-z0-9._:-]{0,127}$/;

const TEMPLATE_BY_KIND: Record<
  OpportunityExplanationItem["kind"],
  { code: string; instruction: string }
> = {
  technical_remediation: {
    code: "review.technical_remediation",
    instruction:
      "Review the bounded technical remediation against the cited evidence and any supplied preview before creating a governed proposal.",
  },
  content_alignment: {
    code: "review.content_alignment",
    instruction:
      "Review the bounded content-alignment opportunity against the cited evidence and any supplied preview; do not infer ranking impact.",
  },
  content_gap: {
    code: "review.content_gap",
    instruction:
      "Review whether the evidenced content gap justifies a bounded content proposal; missing evidence must remain explicit.",
  },
  organic_ctr: {
    code: "review.organic_ctr",
    instruction:
      "Review the observed CTR opportunity and any supplied preview without assuming click improvement or search-result impact.",
  },
  striking_distance: {
    code: "review.striking_distance",
    instruction:
      "Review the striking-distance opportunity as advisory evidence only; ranking improvement is not implied.",
  },
  query_gap: {
    code: "review.query_gap",
    instruction:
      "Review the query-gap evidence and decide whether a bounded recommendation should enter governance review.",
  },
  competitor_visibility_gap: {
    code: "review.competitor_visibility_gap",
    instruction:
      "Review the competitor-visibility gap as comparative evidence only; do not infer market share or copy competitor content.",
  },
  competitor_page_gap: {
    code: "review.competitor_page_gap",
    instruction:
      "Review the competitor-page gap for a bounded first-party response; competitor material is evidence, not content to copy.",
  },
  competitor_topic_gap: {
    code: "review.competitor_topic_gap",
    instruction:
      "Review the competitor-topic gap against first-party evidence before considering any bounded content proposal.",
  },
  internal_link: {
    code: "review.internal_link",
    instruction:
      "Review the internal-link opportunity against the cited page evidence; no link placement or site write is authorized.",
  },
  backlink_gap: {
    code: "review.backlink_gap",
    instruction:
      "Review the backlink-gap evidence as provider-relative context only; no outreach, acquisition, or provider action is authorized.",
  },
  ai_visibility_gap: {
    code: "review.ai_visibility_gap",
    instruction:
      "Review the AI-visibility gap against its exact evidence lineage; visibility change, causality, and provider behavior are not implied.",
  },
  ai_citation_gap: {
    code: "review.ai_citation_gap",
    instruction:
      "Review the AI-citation gap against its exact evidence lineage; citation acquisition or model response change is not implied.",
  },
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

function canonicalTimestamp(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 64) {
    throw new Error("invalid_" + field);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error("invalid_" + field);
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) throw new Error("noncanonical_" + field);
  return canonical;
}

function normalizeBatchKey(value: unknown): string {
  if (typeof value !== "string") throw new Error("invalid_recommendation_batch_key");
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  if (!BATCH_KEY.test(normalized)) throw new Error("invalid_recommendation_batch_key");
  return normalized;
}

function canonicalLifecycle(
  input: OpportunityLifecycleInput,
  supplied: OpportunityLifecycleReport,
): OpportunityLifecycleReport {
  if (!supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
    throw new Error("invalid_p67_lifecycle_report");
  }
  if (supplied.version !== P6_7_OPPORTUNITY_LIFECYCLE_VERSION) {
    throw new Error("unsupported_p67_lifecycle_version");
  }
  const rebuilt = buildOpportunityLifecycle(input);
  if (stableJson(rebuilt) !== stableJson(supplied)) {
    throw new Error("p67_lifecycle_integrity_mismatch");
  }
  return rebuilt;
}

function canonicalControl(control: WorkerControlState): WorkerControlState {
  if (!control || typeof control !== "object" || Array.isArray(control)) {
    throw new Error("invalid_p96_worker_control");
  }
  if (control.version !== WORKER_CONTROL_OBSERVABILITY_VERSION) {
    throw new Error("unsupported_p96_worker_control_version");
  }
  const rebuilt = normalizeWorkerControlState({
    mode: control.mode,
    effectiveAt: control.effectiveAt,
    reason: control.reason,
  });
  if (stableJson(rebuilt) !== stableJson(control)) {
    throw new Error("p96_worker_control_integrity_mismatch");
  }
  return rebuilt;
}

function controlReason(mode: Exclude<WorkerControlMode, "running">): RecommendationGenerationReason {
  if (mode === "paused") return "control_paused";
  if (mode === "draining") return "control_draining";
  if (mode === "drained") return "control_drained";
  return "control_killed";
}

function lifecycleReason(
  state: OpportunityLifecycleRecord["currentState"],
): RecommendationGenerationReason | null {
  if (state === "deferred") return "lifecycle_deferred";
  if (state === "dismissed") return "lifecycle_dismissed";
  if (state === "closed") return "lifecycle_closed";
  if (state === "superseded") return "lifecycle_superseded";
  return null;
}

function previewSet(
  previews: OpportunityPreviewDiff[],
  opportunityFingerprint: string,
) {
  const matching = previews
    .filter((preview) => preview.opportunityFingerprint === opportunityFingerprint)
    .sort((a, b) => a.previewFingerprint.localeCompare(b.previewFingerprint));
  return {
    previewFingerprints: matching.map((preview) => preview.previewFingerprint),
    changedPreviewFingerprints: matching
      .filter((preview) => preview.counts.changed > 0)
      .map((preview) => preview.previewFingerprint),
  };
}

function resolveDisposition(input: {
  controlMode: WorkerControlMode;
  record: OpportunityLifecycleRecord;
  decision: OpportunityActionabilityDecision;
  changedPreviewCount: number;
}): {
  disposition: RecommendationGenerationDisposition;
  reason: RecommendationGenerationReason;
  recommendationClass: RecommendationGenerationClass | null;
} {
  const lifecycleBlock = lifecycleReason(input.record.currentState);
  if (lifecycleBlock === "lifecycle_deferred") {
    return {
      disposition: "held_deferred",
      reason: lifecycleBlock,
      recommendationClass: null,
    };
  }
  if (lifecycleBlock !== null) {
    return {
      disposition: "withheld_terminal",
      reason: lifecycleBlock,
      recommendationClass: null,
    };
  }
  if (
    input.record.currentState !== "observed"
    && input.record.currentState !== "active"
  ) {
    throw new Error("unsupported_recommendation_lifecycle_state");
  }

  if (input.decision.classification === "informational") {
    return {
      disposition: "withheld_informational",
      reason: "actionability_informational",
      recommendationClass: null,
    };
  }
  if (input.decision.classification === "blocked") {
    return {
      disposition: "withheld_blocked",
      reason: "actionability_blocked",
      recommendationClass: null,
    };
  }
  if (
    input.decision.classification === "approval"
    && input.changedPreviewCount < 1
  ) {
    return {
      disposition: "withheld_approval_preview_required",
      reason: "approval_changed_preview_required",
      recommendationClass: null,
    };
  }
  if (input.controlMode !== "running") {
    return {
      disposition: "held_by_control",
      reason: controlReason(input.controlMode),
      recommendationClass: null,
    };
  }
  if (input.decision.classification === "approval") {
    return {
      disposition: "generated_review",
      reason: "approval_required_with_changed_preview",
      recommendationClass: "proposal_review",
    };
  }
  if (input.decision.classification === "recommend") {
    return {
      disposition: "generated_review",
      reason: "recommendation_allowed",
      recommendationClass: "advisory_review",
    };
  }
  throw new Error("unsupported_recommendation_actionability");
}

function buildRecommendation(input: {
  explanation: OpportunityExplanationItem;
  decision: OpportunityActionabilityDecision;
  record: OpportunityLifecycleRecord;
  previewFingerprints: string[];
  changedPreviewFingerprints: string[];
  recommendationClass: RecommendationGenerationClass;
}): RecommendationGenerationCandidate {
  if (
    input.explanation.opportunityFingerprint !== input.decision.opportunityFingerprint
    || input.explanation.opportunityFingerprint !== input.record.opportunityFingerprint
    || input.explanation.explanationFingerprint !== input.decision.explanationFingerprint
    || input.decision.actionabilityFingerprint !== input.record.actionabilityFingerprint
  ) {
    throw new Error("recommendation_lineage_mismatch");
  }

  const template = TEMPLATE_BY_KIND[input.explanation.kind];
  if (!template) throw new Error("unsupported_recommendation_kind");
  const evidenceFingerprints = input.explanation.evidence
    .map((item) => item.fingerprint)
    .sort((a, b) => a.localeCompare(b));
  const statementFingerprints = input.explanation.statements
    .map((item) => item.statementFingerprint)
    .sort((a, b) => a.localeCompare(b));

  const lineage = {
    opportunityId: input.explanation.opportunityId,
    opportunityFingerprint: input.explanation.opportunityFingerprint,
    family: input.explanation.family,
    kind: input.explanation.kind,
    subjectKey: input.explanation.subjectKey,
    explanationId: input.explanation.explanationId,
    explanationFingerprint: input.explanation.explanationFingerprint,
    actionabilityId: input.decision.actionabilityId,
    actionabilityFingerprint: input.decision.actionabilityFingerprint,
    lifecycleId: input.record.lifecycleId,
    lifecycleFingerprint: input.record.lifecycleFingerprint,
    lifecycleState: input.record.currentState,
    scoreFingerprint: input.explanation.score.scoreFingerprint,
    scoreStatus: input.explanation.score.status,
    score100: input.explanation.score.score100,
    priorityRank: input.explanation.decision.priorityRank,
    priorityTieCount: input.explanation.decision.priorityTieCount,
    evidenceFingerprints,
    statementFingerprints,
    missingEvidence: [...input.explanation.missingEvidence],
    semanticGuards: [...input.explanation.semanticGuards],
    previewFingerprints: [...input.previewFingerprints],
    changedPreviewFingerprints: [...input.changedPreviewFingerprints],
  };
  const generation = {
    mode: "deterministic_template" as const,
    aiAssisted: false as const,
    providerModel: null,
    freeformGeneration: false as const,
  };
  const governanceHandoff = {
    surface: "p8_governance_review" as const,
    previewAvailable: input.previewFingerprints.length > 0,
    changedPreviewAvailable: input.changedPreviewFingerprints.length > 0,
    approvalRequired: input.recommendationClass === "proposal_review",
    proposalRecordCreated: false as const,
    proposalPersistenceAuthorized: false as const,
    approvalGranted: false as const,
    executionAuthorized: false as const,
    publicSiteWrites: false as const,
    automaticTransitionAuthorized: false as const,
    task51AuthorizationCreated: false as const,
  };
  const expectedReviewOutcome = input.recommendationClass === "proposal_review"
    ? "A governance reviewer may decide whether the exact supplied preview should proceed into the existing proposal workflow; approval is not granted here."
    : "A governance reviewer may accept, defer, dismiss, or request more evidence; no proposal, approval, or site change is implied.";
  const safety = recommendationGenerationWorkerCapability();

  const idempotencyFingerprint = stableHash({
    version: RECOMMENDATION_GENERATION_WORKER_VERSION,
    purpose: "recommendation_generation_idempotency",
    recommendationClass: input.recommendationClass,
    recommendationCode: template.code,
    lineage,
  });
  const idempotencyKey = "rgk-" + idempotencyFingerprint.slice(0, 24);
  const identity = {
    lifecycle: "proposed_review" as const,
    recommendationClass: input.recommendationClass,
    recommendationCode: template.code,
    reviewInstruction: template.instruction,
    expectedReviewOutcome,
    generation,
    lineage,
    governanceHandoff,
    idempotencyKey,
    idempotencyFingerprint,
    safety,
  };
  const recommendationFingerprint = stableHash({
    version: RECOMMENDATION_GENERATION_WORKER_VERSION,
    purpose: "recommendation_generation_review",
    ...identity,
  });

  return {
    version: RECOMMENDATION_GENERATION_WORKER_VERSION,
    recommendationId: "rgr-" + recommendationFingerprint.slice(0, 24),
    recommendationFingerprint,
    ...identity,
  };
}

export function projectRecommendationGenerationWorker(input: {
  lifecycleInput: OpportunityLifecycleInput;
  lifecycle: OpportunityLifecycleReport;
  control: WorkerControlState;
  batchKey: string;
  referenceTime: string;
}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_recommendation_worker_input");
  }
  const lifecycle = canonicalLifecycle(input.lifecycleInput, input.lifecycle);
  const control = canonicalControl(input.control);
  const batchKey = normalizeBatchKey(input.batchKey);
  const referenceTime = canonicalTimestamp(
    input.referenceTime,
    "recommendation_reference_time",
  );
  if (referenceTime < lifecycle.historyReferenceTime) {
    throw new Error("recommendation_reference_before_lifecycle");
  }
  if (referenceTime < control.effectiveAt) {
    throw new Error("recommendation_reference_before_control");
  }
  if (lifecycle.records.length > RECOMMENDATION_GENERATION_MAX_ITEMS) {
    throw new Error("recommendation_item_limit_exceeded");
  }

  const explanation = input.lifecycleInput.previewDiffInput.actionabilityInput.explanation;
  const actionability = input.lifecycleInput.previewDiffInput.actionability;
  const previewDiff = input.lifecycleInput.previewDiff;

  const explanationByOpportunity = new Map(
    explanation.items.map((item) => [item.opportunityFingerprint, item]),
  );
  const decisionByOpportunity = new Map(
    actionability.decisions.map((decision) => [decision.opportunityFingerprint, decision]),
  );

  const recommendationIdentities = new Set<string>();
  const candidates: RecommendationGenerationCandidate[] = [];

  const items: RecommendationGenerationItem[] = lifecycle.records.map((record) => {
    const explanationItem = explanationByOpportunity.get(record.opportunityFingerprint);
    const decision = decisionByOpportunity.get(record.opportunityFingerprint);
    if (!explanationItem || !decision) {
      throw new Error("recommendation_upstream_lineage_missing");
    }
    if (
      record.actionabilityFingerprint !== decision.actionabilityFingerprint
      || record.actionabilityClassification !== decision.classification
      || record.actionabilityId !== decision.actionabilityId
    ) {
      throw new Error("recommendation_actionability_lifecycle_mismatch");
    }

    const previews = previewSet(previewDiff.previews, record.opportunityFingerprint);
    const resolved = resolveDisposition({
      controlMode: control.mode,
      record,
      decision,
      changedPreviewCount: previews.changedPreviewFingerprints.length,
    });

    if (resolved.recommendationClass === null) {
      return {
        opportunityFingerprint: record.opportunityFingerprint,
        actionabilityClassification: decision.classification,
        lifecycleState: record.currentState,
        disposition: resolved.disposition,
        reason: resolved.reason,
        recommendationId: null,
        recommendationFingerprint: null,
        idempotencyKey: null,
      };
    }

    const candidate = buildRecommendation({
      explanation: explanationItem,
      decision,
      record,
      previewFingerprints: previews.previewFingerprints,
      changedPreviewFingerprints: previews.changedPreviewFingerprints,
      recommendationClass: resolved.recommendationClass,
    });
    if (recommendationIdentities.has(candidate.idempotencyKey)) {
      throw new Error("recommendation_idempotency_collision");
    }
    recommendationIdentities.add(candidate.idempotencyKey);
    candidates.push(candidate);
    return {
      opportunityFingerprint: record.opportunityFingerprint,
      actionabilityClassification: decision.classification,
      lifecycleState: record.currentState,
      disposition: resolved.disposition,
      reason: resolved.reason,
      recommendationId: candidate.recommendationId,
      recommendationFingerprint: candidate.recommendationFingerprint,
      idempotencyKey: candidate.idempotencyKey,
    };
  }).sort((a, b) => a.opportunityFingerprint.localeCompare(b.opportunityFingerprint));

  candidates.sort((a, b) =>
    a.lineage.opportunityFingerprint.localeCompare(b.lineage.opportunityFingerprint)
  );

  const counts = {
    total: items.length,
    generated: candidates.length,
    advisoryReview: candidates.filter((item) =>
      item.recommendationClass === "advisory_review"
    ).length,
    proposalReview: candidates.filter((item) =>
      item.recommendationClass === "proposal_review"
    ).length,
    heldByControl: items.filter((item) => item.disposition === "held_by_control").length,
    heldDeferred: items.filter((item) => item.disposition === "held_deferred").length,
    withheldInformational: items.filter((item) =>
      item.disposition === "withheld_informational"
    ).length,
    withheldBlocked: items.filter((item) =>
      item.disposition === "withheld_blocked"
    ).length,
    withheldTerminal: items.filter((item) =>
      item.disposition === "withheld_terminal"
    ).length,
    withheldApprovalPreviewRequired: items.filter((item) =>
      item.disposition === "withheld_approval_preview_required"
    ).length,
  };

  const generationState = candidates.length > 0
    ? (
        candidates.length === items.length
          ? "generated_review"
          : "mixed_review"
      )
    : (
        counts.heldByControl > 0 || counts.heldDeferred > 0
          ? "held"
          : "no_candidates"
      );

  const controlProjection = {
    controlId: control.controlId,
    controlFingerprint: control.controlFingerprint,
    mode: control.mode,
    effectiveAt: control.effectiveAt,
    generationReviewAllowed: control.mode === "running",
    killedRequiresRecoveryReview: control.mode === "killed",
  };
  const semantics = recommendationGenerationWorkerSemantics();
  const safety = recommendationGenerationWorkerCapability();

  const batchIdentity = {
    batchKey,
    lifecycleReportFingerprint: lifecycle.reportFingerprint,
    lifecycleHistoryReferenceTime: lifecycle.historyReferenceTime,
    controlProjection,
    counts,
    items,
    candidateFingerprints: candidates.map((candidate) => candidate.recommendationFingerprint),
    semantics,
  };
  const batchFingerprint = stableHash({
    version: RECOMMENDATION_GENERATION_WORKER_VERSION,
    purpose: "recommendation_generation_batch",
    ...batchIdentity,
  });

  return {
    version: RECOMMENDATION_GENERATION_WORKER_VERSION,
    batchId: "rgb-" + batchFingerprint.slice(0, 24),
    batchFingerprint,
    referenceTime,
    generationState,
    ...batchIdentity,
    candidates,
    safety,
  };
}

export function recommendationGenerationWorkerSemantics() {
  return Object.freeze({
    canonicalP67LineageRequired: true as const,
    p76AiGeoAcceptedOnlyThroughP6Pipeline: true as const,
    deterministicTemplateOnly: true as const,
    freeformGenerationEnabled: false as const,
    p65ActionabilityPreserved: true as const,
    p67LifecyclePreserved: true as const,
    p66PreviewRequiredForApprovalClass: true as const,
    changedPreviewRequiredForApprovalClass: true as const,
    recommendationClassIsNotApproval: true as const,
    previewIsNotClaimedBetterOrSafe: true as const,
    p63PriorityPreservedAsLineageOnly: true as const,
    orderingCreatesAdditionalPriority: false as const,
    missingEvidencePreserved: true as const,
    semanticGuardsPreserved: true as const,
    deadLetterOrTerminalReactivationPerformed: false as const,
    proposalRecordCreated: false as const,
    approvalGranted: false as const,
    executionAuthorized: false as const,
    automaticTransitionEnabled: false as const,
  });
}

export function recommendationGenerationWorkerCapability() {
  return Object.freeze({
    version: RECOMMENDATION_GENERATION_WORKER_VERSION,
    architectureOnly: true as const,
    deterministicProjectionOnly: true as const,
    suppliedSyntheticInputsOnly: true as const,
    recommendationReviewOnly: true as const,
    deterministicIdempotencyOnly: true as const,
    p8GovernanceHandoffProjectionOnly: true as const,
    wallClockAccess: false as const,
    timerActivated: false as const,
    schedulerActivated: false as const,
    liveWorkerEnabled: false as const,
    liveRetryLoopEnabled: false as const,
    aiModelCallsAuthorized: false as const,
    aiProposalGenerationGateActivated: false as const,
    aiProposalRuntimeAuthorized: false as const,
    providerCredentialUseAuthorized: false as const,
    oauthUseAuthorized: false as const,
    durableEnqueueAuthorized: false as const,
    queueReservationAuthorized: false as const,
    recommendationPersistenceAuthorized: false as const,
    proposalPersistenceAuthorized: false as const,
    databaseReadsAuthorized: false as const,
    databaseWritesAuthorized: false as const,
    productionDbReadAuthorized: false as const,
    productionDbWriteAuthorized: false as const,
    task69PacketMaterializationAuthorized: false as const,
    task70ExecutionAuthorized: false as const,
    providerNetworkReadAuthorized: false as const,
    crawlNetworkReadAuthorized: false as const,
    approvalGrantAuthorized: false as const,
    task51ExecutionAuthorized: false as const,
    task53ExecutionAuthorized: false as const,
    task54ExecutionAuthorized: false as const,
    providerWrites: false as const,
    publicSiteWrites: false as const,
    automaticTransition: false as const,
    publicationAuthorized: false as const,
  });
}
