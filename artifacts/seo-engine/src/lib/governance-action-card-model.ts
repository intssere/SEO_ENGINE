import type { GovernanceRow } from "./governance-workspace-model.js";

export type GovernanceActionCard = {
  cardId: string;
  proposalId: string;
  proposalFingerprint: string | null;
  opportunityId: string;
  opportunityTitle: string;
  approvalState: GovernanceRow["approvalState"];
  recordedLifecycle: string;
  target: {
    url: string | null;
    path: string | null;
    field: string;
    actionType: string;
  };
  evidence: {
    count: number;
    sufficient: boolean;
    qualityStatus: string;
    qualityScore: number;
    approvalEligible: boolean;
  };
  risk: {
    opportunity: string;
    evaluator: string;
    planControl: string;
    effectiveExecution: string;
    executionAuthorized: boolean;
    publicSiteWrites: boolean;
    boundedPilot: boolean;
    wholeSiteCoverage: boolean;
  };
  preview: {
    before: string | null;
    proposed: string | null;
    rationale: string;
    expectedBenefit: string;
  };
  verification: {
    detailAvailability: "unavailable";
    reason: string;
  };
  rollback: {
    plan: string;
    planAvailability: "available" | "unavailable";
    statusAvailability: "unavailable";
    reason: string;
  };
};

const VERIFICATION_UNAVAILABLE =
  "Per-action verification evidence/result data is not exposed by the current governance GET contract. Recorded lifecycle is descriptive only and is not verification proof.";
const ROLLBACK_STATUS_UNAVAILABLE =
  "The exposed rollback field is a plan only. It does not mean rollback is authorized, executed, completed, or successful.";

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort((a, b) => a.localeCompare(b))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key])).join(",") + "}";
}

function fingerprint(value: unknown) {
  const input = stableJson(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function requireProposalField<T>(
  value: T | null,
  code: string,
): T {
  if (value === null) throw new Error(code);
  return value;
}

function toCard(row: GovernanceRow): GovernanceActionCard {
  if (row.kind !== "proposal") throw new Error("p8_2_non_proposal_card_source");
  const proposalId = requireProposalField(row.proposalId, "p8_2_missing_proposal_id");
  const lifecycle = requireProposalField(row.lifecycle, "p8_2_missing_lifecycle");
  const evidenceCount = requireProposalField(row.evidenceCount, "p8_2_missing_evidence_count");
  const evidenceSufficient = requireProposalField(row.evidenceSufficient, "p8_2_missing_evidence_sufficient");
  const qualityStatus = requireProposalField(row.qualityStatus, "p8_2_missing_quality_status");
  const qualityScore = requireProposalField(row.qualityScore, "p8_2_missing_quality_score");
  const qualityApprovalEligible = requireProposalField(row.qualityApprovalEligible, "p8_2_missing_quality_approval_eligible");
  const evaluatorRisk = requireProposalField(row.evaluatorRisk, "p8_2_missing_evaluator_risk");
  const planControlRisk = requireProposalField(row.planControlRisk, "p8_2_missing_plan_control_risk");
  const effectiveExecutionRisk = requireProposalField(row.effectiveExecutionRisk, "p8_2_missing_effective_execution_risk");
  const field = requireProposalField(row.field, "p8_2_missing_field");
  const actionType = requireProposalField(row.actionType, "p8_2_missing_action_type");
  const rationale = requireProposalField(row.rationale, "p8_2_missing_rationale");
  const expectedBenefit = requireProposalField(row.expectedBenefit, "p8_2_missing_expected_benefit");
  const rollbackPlan = requireProposalField(row.rollbackPlan, "p8_2_missing_rollback_plan");
  const boundedPilot = requireProposalField(row.boundedPilot, "p8_2_missing_bounded_pilot");
  const wholeSiteCoverage = requireProposalField(row.wholeSiteCoverage, "p8_2_missing_whole_site_coverage");

  if (!Number.isFinite(evidenceCount) || evidenceCount < 0 || !Number.isInteger(evidenceCount)) {
    throw new Error("p8_2_invalid_evidence_count");
  }
  if (!Number.isFinite(qualityScore) || qualityScore < 0 || qualityScore > 100) {
    throw new Error("p8_2_invalid_quality_score");
  }

  return {
    cardId: "action-card:" + proposalId,
    proposalId,
    proposalFingerprint: row.proposalFingerprint,
    opportunityId: row.opportunityId,
    opportunityTitle: row.opportunityTitle,
    approvalState: row.approvalState,
    recordedLifecycle: lifecycle,
    target: {
      url: row.targetUrl,
      path: row.targetPath,
      field,
      actionType,
    },
    evidence: {
      count: evidenceCount,
      sufficient: evidenceSufficient,
      qualityStatus,
      qualityScore,
      approvalEligible: qualityApprovalEligible,
    },
    risk: {
      opportunity: row.opportunityRisk,
      evaluator: evaluatorRisk,
      planControl: planControlRisk,
      effectiveExecution: effectiveExecutionRisk,
      executionAuthorized: row.executionAuthorized,
      publicSiteWrites: row.publicSiteWrites,
      boundedPilot,
      wholeSiteCoverage,
    },
    preview: {
      before: row.beforeValue,
      proposed: row.proposedValue,
      rationale,
      expectedBenefit,
    },
    verification: {
      detailAvailability: "unavailable",
      reason: VERIFICATION_UNAVAILABLE,
    },
    rollback: {
      plan: rollbackPlan,
      planAvailability: rollbackPlan.length > 0 ? "available" : "unavailable",
      statusAvailability: "unavailable",
      reason: ROLLBACK_STATUS_UNAVAILABLE,
    },
  };
}

export function buildGovernanceActionCardModel(rows: readonly GovernanceRow[]) {
  const cards = rows
    .filter((row) => row.kind === "proposal")
    .map(toCard)
    .sort((a, b) =>
      a.opportunityId.localeCompare(b.opportunityId) ||
      a.proposalId.localeCompare(b.proposalId),
    );

  const ids = new Set<string>();
  for (const card of cards) {
    if (ids.has(card.proposalId)) throw new Error("p8_2_duplicate_card_proposal_id");
    ids.add(card.proposalId);
  }

  const semantics = {
    readOnly: true as const,
    verificationInferredFromLifecycle: false as const,
    rollbackPlanIsRollbackState: false as const,
    approvalStateAuthorizesExecution: false as const,
    executionFlagsAreControls: false as const,
    allowsExecution: false as const,
    allowsRollback: false as const,
    orderingImpliesPriority: false as const,
  };
  const counts = {
    cards: cards.length,
    verificationDetailUnavailable: cards.filter(
      (card) => card.verification.detailAvailability === "unavailable",
    ).length,
    rollbackPlanAvailable: cards.filter(
      (card) => card.rollback.planAvailability === "available",
    ).length,
  };

  return {
    modelFingerprint: fingerprint({ cards, counts, semantics }),
    cards,
    counts,
    semantics,
  };
}
