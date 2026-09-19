export type GovernanceApprovalState =
  | "not_ready"
  | "pending"
  | "approved"
  | "rejected"
  | "revision_requested";

export type GovernanceOpportunityInput = {
  id: string;
  title: string;
  opportunity_type: string;
  score: number;
  confidence: number;
  risk_classification: string;
};

export type GovernanceProposalInput = {
  id: string;
  opportunity_id: string;
  proposal_fingerprint: string | null;
  lifecycle: string;
  decision: string | null;
  revision_requested: boolean;
  evaluatorRisk: string;
  planControlRisk: string;
  effectiveExecutionRisk: string;
  execution_authorized: boolean;
  public_site_writes: boolean;
  quality_status: string;
  quality_approval_eligible: boolean;
  before_value: string | null;
  after_value: string | null;
  evidence_count: number;
  confidence: number;
  title: string;
  field: string;
  action_type: string;
};

export type GovernanceRow = {
  rowId: string;
  kind: "opportunity_only" | "proposal";
  opportunityId: string;
  opportunityTitle: string;
  opportunityType: string;
  opportunityScore: number;
  opportunityConfidence: number;
  opportunityRisk: string;
  proposalId: string | null;
  proposalFingerprint: string | null;
  lifecycle: string | null;
  approvalState: GovernanceApprovalState;
  beforeValue: string | null;
  proposedValue: string | null;
  evidenceCount: number | null;
  proposalConfidence: number | null;
  evaluatorRisk: string | null;
  planControlRisk: string | null;
  effectiveExecutionRisk: string | null;
  executionAuthorized: boolean;
  publicSiteWrites: boolean;
  qualityStatus: string | null;
  qualityApprovalEligible: boolean | null;
  field: string | null;
  actionType: string | null;
};

const CONTROL_FIELDS: Array<keyof GovernanceProposalInput> = [
  "opportunity_id", "proposal_fingerprint", "lifecycle", "decision",
  "revision_requested", "evaluatorRisk", "planControlRisk",
  "effectiveExecutionRisk", "execution_authorized", "public_site_writes",
  "quality_status", "quality_approval_eligible",
];
const DISPLAY_FIELDS: Array<keyof GovernanceProposalInput> = [
  ...CONTROL_FIELDS, "before_value", "after_value", "evidence_count",
  "confidence", "title", "field", "action_type",
];

function uniqueById<T extends { id: string }>(rows: readonly T[], code: string) {
  const out = new Map<string, T>();
  for (const row of rows) {
    if (!row || typeof row.id !== "string" || row.id.length === 0 || out.has(row.id)) {
      throw new Error(code);
    }
    out.set(row.id, row);
  }
  return out;
}

function reconcile(
  proposal: GovernanceProposalInput | undefined,
  approval: GovernanceProposalInput | undefined,
) {
  const row = proposal ?? approval;
  if (!row) throw new Error("missing_governance_proposal");
  if (proposal && approval) {
    for (const field of DISPLAY_FIELDS) {
      if (!Object.is(proposal[field], approval[field])) {
        throw new Error(
          CONTROL_FIELDS.includes(field)
            ? "governance_control_lineage_conflict"
            : "governance_projected_field_conflict",
        );
      }
    }
  }
  return row;
}

function reviewState(row: GovernanceProposalInput): GovernanceApprovalState {
  if (row.revision_requested) return "revision_requested";
  if (row.decision === "approved") return "approved";
  if (row.decision === "rejected") return "rejected";
  if (
    row.lifecycle === "approval_ready" &&
    row.quality_status === "pass" &&
    row.quality_approval_eligible
  ) return "pending";
  return "not_ready";
}

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

export function buildGovernanceWorkspaceModel(input: {
  opportunities: readonly GovernanceOpportunityInput[];
  proposals: readonly GovernanceProposalInput[];
  approvals: readonly GovernanceProposalInput[];
}) {
  const opportunities = uniqueById(input.opportunities, "duplicate_governance_opportunity_id");
  const proposals = uniqueById(input.proposals, "duplicate_governance_proposal_id");
  const approvals = uniqueById(input.approvals, "duplicate_governance_approval_id");

  for (const row of [...proposals.values(), ...approvals.values()]) {
    if (!opportunities.has(row.opportunity_id)) throw new Error("governance_missing_opportunity");
  }

  const proposalIds = [...new Set([...proposals.keys(), ...approvals.keys()])]
    .sort((a, b) => a.localeCompare(b));

  const rows: GovernanceRow[] = proposalIds.map((id) => {
    const proposal = reconcile(proposals.get(id), approvals.get(id));
    const opportunity = opportunities.get(proposal.opportunity_id);
    if (!opportunity) throw new Error("governance_missing_opportunity");
    return {
      rowId: "proposal:" + proposal.id,
      kind: "proposal",
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      opportunityType: opportunity.opportunity_type,
      opportunityScore: opportunity.score,
      opportunityConfidence: opportunity.confidence,
      opportunityRisk: opportunity.risk_classification,
      proposalId: proposal.id,
      proposalFingerprint: proposal.proposal_fingerprint,
      lifecycle: proposal.lifecycle,
      approvalState: reviewState(proposal),
      beforeValue: proposal.before_value,
      proposedValue: proposal.after_value,
      evidenceCount: proposal.evidence_count,
      proposalConfidence: proposal.confidence,
      evaluatorRisk: proposal.evaluatorRisk,
      planControlRisk: proposal.planControlRisk,
      effectiveExecutionRisk: proposal.effectiveExecutionRisk,
      executionAuthorized: proposal.execution_authorized,
      publicSiteWrites: proposal.public_site_writes,
      qualityStatus: proposal.quality_status,
      qualityApprovalEligible: proposal.quality_approval_eligible,
      field: proposal.field,
      actionType: proposal.action_type,
    };
  });

  const linked = new Set(rows.map((row) => row.opportunityId));
  for (const opportunity of [...opportunities.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    if (linked.has(opportunity.id)) continue;
    rows.push({
      rowId: "opportunity:" + opportunity.id,
      kind: "opportunity_only",
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      opportunityType: opportunity.opportunity_type,
      opportunityScore: opportunity.score,
      opportunityConfidence: opportunity.confidence,
      opportunityRisk: opportunity.risk_classification,
      proposalId: null,
      proposalFingerprint: null,
      lifecycle: null,
      approvalState: "not_ready",
      beforeValue: null,
      proposedValue: null,
      evidenceCount: null,
      proposalConfidence: null,
      evaluatorRisk: null,
      planControlRisk: null,
      effectiveExecutionRisk: null,
      executionAuthorized: false,
      publicSiteWrites: false,
      qualityStatus: null,
      qualityApprovalEligible: null,
      field: null,
      actionType: null,
    });
  }

  rows.sort((a, b) =>
    a.opportunityId.localeCompare(b.opportunityId) ||
    (a.proposalId ?? "").localeCompare(b.proposalId ?? ""),
  );

  const counts = {
    opportunities: opportunities.size,
    proposals: proposalIds.length,
    pending: rows.filter((row) => row.approvalState === "pending").length,
    recordedReviews: rows.filter((row) =>
      ["approved", "rejected", "revision_requested"].includes(row.approvalState),
    ).length,
  };
  const semantics = {
    readOnly: true as const,
    approvalDisplayIsAuthority: false as const,
    approvedAuthorizesExecution: false as const,
    executionAuthorizedIsControl: false as const,
    publicSiteWritesIsPermissionGrant: false as const,
    orderingImpliesPriority: false as const,
  };
  return {
    modelFingerprint: fingerprint({ counts, rows, semantics }),
    counts,
    rows,
    semantics,
  };
}
