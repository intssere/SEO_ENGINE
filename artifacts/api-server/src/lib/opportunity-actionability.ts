import { createHash } from "node:crypto";
import {
  P6_4_OPPORTUNITY_EXPLANATION_VERSION,
  explainPrioritizedOpportunities,
  type OpportunityExplanationInput,
  type OpportunityExplanationReport,
} from "./opportunity-explanation.js";

export const P6_5_OPPORTUNITY_ACTIONABILITY_VERSION = "p6.5-opportunity-actionability-v1" as const;
export const P6_5_MAX_POLICIES = 256 as const;
export const P6_5_MAX_BLOCK_CODES = 8 as const;

export type OpportunityActionabilityClass =
  | "informational"
  | "recommend"
  | "approval"
  | "blocked";

export type OpportunityActionabilityReason =
  | "explicit_block"
  | "p63_suppressed"
  | "approval_required"
  | "recommendation_allowed"
  | "informational_only";

export type OpportunityActionabilityPolicyInput = {
  opportunityFingerprint: string;
  recommendationAllowed: boolean;
  approvalRequired: boolean;
  blockCodes: string[];
};

export type OpportunityActionabilityInput = {
  explanationInput: OpportunityExplanationInput;
  explanation: OpportunityExplanationReport;
  policies: OpportunityActionabilityPolicyInput[];
};

export type OpportunityActionabilityDecision = {
  actionabilityId: string;
  actionabilityFingerprint: string;
  opportunityId: string;
  opportunityFingerprint: string;
  explanationId: string;
  explanationFingerprint: string;
  classification: OpportunityActionabilityClass;
  reasons: OpportunityActionabilityReason[];
  governance: {
    recommendationAllowed: boolean;
    approvalRequired: boolean;
    blockCodes: string[];
    approvalGranted: false;
    executionAuthorized: false;
    automaticTransitionAuthorized: false;
  };
  inheritedDecision: {
    status: "eligible" | "suppressed";
    priorityRank: number | null;
    priorityTieCount: number | null;
    conflictKey: string | null;
    explicitSuppressionCodes: string[];
    systemSuppressionReasons: Array<
      "unscorable_score" |
      "explicit_suppression" |
      "conflict_lower_score" |
      "conflict_top_score_tie"
    >;
  };
};

export type OpportunityActionabilityReport = {
  version: typeof P6_5_OPPORTUNITY_ACTIONABILITY_VERSION;
  reportId: string;
  reportFingerprint: string;
  collectionKey: string;
  referenceTime: string;
  scope: OpportunityExplanationReport["scope"];
  explanationReportFingerprint: string;
  counts: {
    total: number;
    informational: number;
    recommend: number;
    approval: number;
    blocked: number;
  };
  decisions: OpportunityActionabilityDecision[];
  semantics: ReturnType<typeof opportunityActionabilitySemantics>;
  safety: ReturnType<typeof opportunityActionabilityCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const BLOCK_CODE = /^[a-z0-9][a-z0-9._:-]{0,95}$/;

function canonicalJson(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined";
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

function hash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalExplanation(
  explanationInput: OpportunityExplanationInput,
  supplied: OpportunityExplanationReport,
): OpportunityExplanationReport {
  if (!supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
    throw new Error("invalid_p64_explanation_report");
  }
  if (supplied.version !== P6_4_OPPORTUNITY_EXPLANATION_VERSION) {
    throw new Error("unsupported_p64_explanation_version");
  }
  const rebuilt = explainPrioritizedOpportunities(explanationInput);
  if (canonicalJson(rebuilt) !== canonicalJson(supplied)) {
    throw new Error("p64_explanation_integrity_mismatch");
  }
  return rebuilt;
}

function normalizeBlockCodes(input: unknown): string[] {
  if (!Array.isArray(input)) throw new Error("invalid_block_codes");
  if (input.length > P6_5_MAX_BLOCK_CODES) throw new Error("block_code_limit_exceeded");
  return [...new Set(input.map((value) => {
    if (typeof value !== "string") throw new Error("invalid_block_code");
    const normalized = value.normalize("NFKC").trim().toLowerCase();
    if (!BLOCK_CODE.test(normalized)) throw new Error("invalid_block_code");
    return normalized;
  }))].sort((a, b) => a.localeCompare(b));
}

function normalizePolicies(
  policies: OpportunityActionabilityPolicyInput[],
  explanation: OpportunityExplanationReport,
): Map<string, OpportunityActionabilityPolicyInput> {
  if (!Array.isArray(policies)) throw new Error("invalid_actionability_policies");
  if (policies.length > P6_5_MAX_POLICIES) throw new Error("actionability_policy_limit_exceeded");

  const known = new Set(explanation.items.map((item) => item.opportunityFingerprint));
  const output = new Map<string, OpportunityActionabilityPolicyInput>();

  for (const policy of policies) {
    if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
      throw new Error("invalid_actionability_policy");
    }
    if (typeof policy.opportunityFingerprint !== "string" || !HEX_64.test(policy.opportunityFingerprint)) {
      throw new Error("invalid_policy_opportunity_fingerprint");
    }
    if (!known.has(policy.opportunityFingerprint)) throw new Error("unknown_policy_opportunity");
    if (output.has(policy.opportunityFingerprint)) throw new Error("duplicate_policy_opportunity");
    if (typeof policy.recommendationAllowed !== "boolean") {
      throw new Error("invalid_recommendation_allowed");
    }
    if (typeof policy.approvalRequired !== "boolean") throw new Error("invalid_approval_required");

    output.set(policy.opportunityFingerprint, {
      opportunityFingerprint: policy.opportunityFingerprint,
      recommendationAllowed: policy.recommendationAllowed,
      approvalRequired: policy.approvalRequired,
      blockCodes: normalizeBlockCodes(policy.blockCodes),
    });
  }

  if (output.size !== explanation.items.length) throw new Error("incomplete_actionability_policy_coverage");
  return output;
}

function classify(
  item: OpportunityExplanationReport["items"][number],
  policy: OpportunityActionabilityPolicyInput,
): { classification: OpportunityActionabilityClass; reasons: OpportunityActionabilityReason[] } {
  const blockedByPolicy = policy.blockCodes.length > 0;
  const blockedByP63 = item.decision.status === "suppressed";

  if (blockedByPolicy || blockedByP63) {
    const reasons: OpportunityActionabilityReason[] = [];
    if (blockedByPolicy) reasons.push("explicit_block");
    if (blockedByP63) reasons.push("p63_suppressed");
    return { classification: "blocked", reasons };
  }

  if (policy.approvalRequired) {
    return { classification: "approval", reasons: ["approval_required"] };
  }

  if (policy.recommendationAllowed) {
    return { classification: "recommend", reasons: ["recommendation_allowed"] };
  }

  return { classification: "informational", reasons: ["informational_only"] };
}

function buildDecision(
  item: OpportunityExplanationReport["items"][number],
  policy: OpportunityActionabilityPolicyInput,
): OpportunityActionabilityDecision {
  if (item.opportunityFingerprint !== policy.opportunityFingerprint) {
    throw new Error("policy_opportunity_lineage_mismatch");
  }

  const classified = classify(item, policy);
  const governance = {
    recommendationAllowed: policy.recommendationAllowed,
    approvalRequired: policy.approvalRequired,
    blockCodes: [...policy.blockCodes],
    approvalGranted: false as const,
    executionAuthorized: false as const,
    automaticTransitionAuthorized: false as const,
  };
  const inheritedDecision = {
    status: item.decision.status,
    priorityRank: item.decision.priorityRank,
    priorityTieCount: item.decision.priorityTieCount,
    conflictKey: item.decision.conflictKey,
    explicitSuppressionCodes: [...item.decision.explicitSuppressionCodes],
    systemSuppressionReasons: [...item.decision.systemSuppressionReasons],
  };
  const identity = {
    version: P6_5_OPPORTUNITY_ACTIONABILITY_VERSION,
    opportunityId: item.opportunityId,
    opportunityFingerprint: item.opportunityFingerprint,
    explanationId: item.explanationId,
    explanationFingerprint: item.explanationFingerprint,
    classification: classified.classification,
    reasons: classified.reasons,
    governance,
    inheritedDecision,
  };
  const actionabilityFingerprint = hash(identity);

  return {
    actionabilityId: `p65-actionability-${actionabilityFingerprint.slice(0, 20)}`,
    actionabilityFingerprint,
    opportunityId: item.opportunityId,
    opportunityFingerprint: item.opportunityFingerprint,
    explanationId: item.explanationId,
    explanationFingerprint: item.explanationFingerprint,
    classification: classified.classification,
    reasons: classified.reasons,
    governance,
    inheritedDecision,
  };
}

export function opportunityActionabilitySemantics() {
  return Object.freeze({
    explicitPolicyRequired: true,
    completePolicyCoverageRequired: true,
    p63SuppressionClassifiesBlocked: true,
    explicitBlockPrecedesAllOtherStates: true,
    approvalPrecedesRecommend: true,
    approvalMeansRequiredNotGranted: true,
    recommendIsAdvisoryOnly: true,
    informationalHasNoImplicitEscalation: true,
    scoreOrRankInferencePerformed: false,
    familyKindOrSubjectInferencePerformed: false,
    evidenceTextInferencePerformed: false,
    recommendationContentGenerated: false,
    currentVsProposedPreviewGenerated: false,
    lifecycleInferred: false,
    automaticTransitionEnabled: false,
    executionAuthorized: false,
  });
}

export function opportunityActionabilityCapability() {
  return Object.freeze({
    deterministicClassificationOnly: true,
    legacyOpportunityEngineMutationEnabled: false,
    openApiMutationEnabled: false,
    liveProviderReadsAuthorized: false,
    providerCredentialUseAuthorized: false,
    aiModelCallsAuthorized: false,
    sourceRegistryAdmissionAuthorized: false,
    refreshPlanReorderingEnabled: false,
    task64ExecutionAuthorized: false,
    task70ExecutionAuthorized: false,
    observationPersistenceAuthorized: false,
    evidencePersistenceAuthorized: false,
    scorePersistenceAuthorized: false,
    prioritizationPersistenceAuthorized: false,
    explanationPersistenceAuthorized: false,
    actionabilityPersistenceAuthorized: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    schemaMutationAuthorized: false,
    schedulerEnabled: false,
    workerEnabled: false,
    retryLoopEnabled: false,
    approvalGrantAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
    automaticTransitionEnabled: false,
    publicationAuthorized: false,
  });
}

export function classifyOpportunityActionability(
  input: OpportunityActionabilityInput,
): OpportunityActionabilityReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_actionability_input");
  }
  if (!input.explanationInput || typeof input.explanationInput !== "object" || Array.isArray(input.explanationInput)) {
    throw new Error("invalid_actionability_explanation_input");
  }

  const explanation = canonicalExplanation(input.explanationInput, input.explanation);
  const policies = normalizePolicies(input.policies, explanation);
  const decisions = explanation.items.map((item) => {
    const policy = policies.get(item.opportunityFingerprint);
    if (!policy) throw new Error("missing_actionability_policy");
    return buildDecision(item, policy);
  });

  const counts = {
    total: decisions.length,
    informational: decisions.filter((item) => item.classification === "informational").length,
    recommend: decisions.filter((item) => item.classification === "recommend").length,
    approval: decisions.filter((item) => item.classification === "approval").length,
    blocked: decisions.filter((item) => item.classification === "blocked").length,
  };
  const semantics = opportunityActionabilitySemantics();
  const identity = {
    version: P6_5_OPPORTUNITY_ACTIONABILITY_VERSION,
    collectionKey: explanation.collectionKey,
    referenceTime: explanation.referenceTime,
    scope: explanation.scope,
    explanationReportFingerprint: explanation.reportFingerprint,
    counts,
    decisions,
    semantics,
  };
  const reportFingerprint = hash(identity);

  return {
    version: P6_5_OPPORTUNITY_ACTIONABILITY_VERSION,
    reportId: `p65-report-${reportFingerprint.slice(0, 20)}`,
    reportFingerprint,
    collectionKey: explanation.collectionKey,
    referenceTime: explanation.referenceTime,
    scope: { ...explanation.scope },
    explanationReportFingerprint: explanation.reportFingerprint,
    counts,
    decisions,
    semantics,
    safety: opportunityActionabilityCapability(),
  };
}
