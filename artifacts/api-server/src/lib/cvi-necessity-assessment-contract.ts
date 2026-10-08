import {
  assertContentOpportunityModelIntegrity,
  type ContentOpportunity,
  type ContentOpportunityModelResult,
} from "./content-opportunity-model-contract.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const CVI_NECESSITY_ASSESSMENT_VERSION = "cvi-1a-necessity-assessment-v1" as const;

export type CviEditorialDisposition =
  | "PROCEED_TO_RESEARCH"
  | "REQUEST_EVIDENCE"
  | "PRESERVE"
  | "NO_ACTION"
  | "REVIEW_REQUIRED";

export type CviNecessityAssessmentInput = Readonly<{
  model: ContentOpportunityModelResult;
  opportunityId: string;
  tenantId: string;
  siteId: string;
  siteBindingEvidenceFingerprint: string;
  editorialEvidenceFingerprints: readonly string[];
  hasVerifiedOriginalContribution: boolean;
  hasVerifiedBusinessTruth: boolean;
  unresolvedConflicts: boolean;
}>;

export type CviNecessityAssessment = Readonly<{
  version: typeof CVI_NECESSITY_ASSESSMENT_VERSION;
  sourceModelFingerprint: string;
  sourceOpportunityId: string;
  sourceOpportunityFingerprint: string;
  sourceRecommendedAction: ContentOpportunity["recommendedAction"];
  scope: Readonly<{ tenantId: string; siteId: string; siteBindingEvidenceFingerprint: string }>;
  editorialEvidenceFingerprints: readonly string[];
  assessmentInputs: Readonly<{ hasVerifiedOriginalContribution: boolean; hasVerifiedBusinessTruth: boolean; unresolvedConflicts: boolean }>;
  disposition: CviEditorialDisposition;
  reasonCodes: readonly string[];
  blockers: readonly string[];
  policyVersion: typeof CVI_NECESSITY_ASSESSMENT_VERSION;
  semantics: Readonly<{
    readOnly: true;
    deterministic: true;
    publicationAuthorized: false;
    executionAuthorized: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    requiresSeparateAuthorization: true;
  }>;
  assessmentFingerprint: string;
  assessmentId: string;
}>;

const FINGERPRINT = /^[0-9a-f]{64}$/;
const SCOPE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SEMANTICS = Object.freeze({
  readOnly: true as const,
  deterministic: true as const,
  publicationAuthorized: false as const,
  executionAuthorized: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  requiresSeparateAuthorization: true as const,
});

function validScope(value: string, field: string): string {
  if (typeof value !== "string" || !SCOPE_ID.test(value)) {
    throw new Error(`cvi_invalid_${field}`);
  }
  return value;
}

function validFingerprint(value: string, field: string): string {
  if (typeof value !== "string" || !FINGERPRINT.test(value)) {
    throw new Error(`cvi_invalid_${field}`);
  }
  return value;
}

export function assessCviContentNecessity(input: CviNecessityAssessmentInput): CviNecessityAssessment {
  assertContentOpportunityModelIntegrity(input.model);
  const tenantId = validScope(input.tenantId, "tenant_id");
  const siteId = validScope(input.siteId, "site_id");
  const siteBindingEvidenceFingerprint = validFingerprint(
    input.siteBindingEvidenceFingerprint, "site_binding_evidence_fingerprint",
  );
  if (typeof input.opportunityId !== "string" || !input.opportunityId) {
    throw new Error("cvi_invalid_opportunity_id");
  }
  if (!Array.isArray(input.editorialEvidenceFingerprints)) {
    throw new Error("cvi_invalid_editorial_evidence");
  }
  const editorialEvidenceFingerprints = [...new Set(
    input.editorialEvidenceFingerprints.map(value => validFingerprint(value, "editorial_evidence_fingerprint")),
  )].sort();
  const opportunity = input.model.opportunities.find(item => item.opportunityId === input.opportunityId);
  if (!opportunity) throw new Error("cvi_opportunity_not_in_verified_model");
  if (input.model.opportunities.filter(item => item.opportunityId === input.opportunityId).length !== 1) {
    throw new Error("cvi_ambiguous_opportunity_identity");
  }
  for (const name of ["hasVerifiedOriginalContribution", "hasVerifiedBusinessTruth", "unresolvedConflicts"] as const) {
    if (typeof input[name] !== "boolean") throw new Error(`cvi_invalid_${name}`);
  }

  let disposition: CviEditorialDisposition;
  let reasonCodes: string[];
  let blockers: string[] = [];
  if (opportunity.recommendedAction === "defer_insufficient_evidence") {
    disposition = "REQUEST_EVIDENCE";
    reasonCodes = ["upstream_evidence_insufficient"];
  } else if (opportunity.recommendedAction === "leave_alone") {
    disposition = opportunity.existingCoverage === "material_search_coverage_observed" ? "PRESERVE" : "NO_ACTION";
    reasonCodes = ["upstream_leave_alone"];
  } else if (input.unresolvedConflicts || opportunity.recommendedAction === "consolidate_candidate") {
    disposition = "REVIEW_REQUIRED";
    reasonCodes = [input.unresolvedConflicts ? "unresolved_evidence_conflict" : "consolidation_needs_review"];
    blockers = [...reasonCodes];
  } else if (!input.hasVerifiedBusinessTruth) {
    disposition = "REQUEST_EVIDENCE";
    reasonCodes = ["business_truth_not_verified"];
  } else if (!input.hasVerifiedOriginalContribution || editorialEvidenceFingerprints.length === 0) {
    disposition = "REQUEST_EVIDENCE";
    reasonCodes = ["original_contribution_not_verified"];
  } else {
    disposition = "PROCEED_TO_RESEARCH";
    reasonCodes = ["upstream_action_candidate_evidence_sufficient_for_research"];
  }
  const base = {
    version: CVI_NECESSITY_ASSESSMENT_VERSION,
    sourceModelFingerprint: input.model.opportunityModelFingerprint,
    sourceOpportunityId: opportunity.opportunityId,
    sourceOpportunityFingerprint: validFingerprint(opportunity.opportunityFingerprint, "opportunity_fingerprint"),
    sourceRecommendedAction: opportunity.recommendedAction,
    scope: { tenantId, siteId, siteBindingEvidenceFingerprint },
    editorialEvidenceFingerprints,
    assessmentInputs: { hasVerifiedOriginalContribution: input.hasVerifiedOriginalContribution, hasVerifiedBusinessTruth: input.hasVerifiedBusinessTruth, unresolvedConflicts: input.unresolvedConflicts },
    disposition,
    reasonCodes,
    blockers,
    policyVersion: CVI_NECESSITY_ASSESSMENT_VERSION,
    semantics: SEMANTICS,
  };
  const assessmentFingerprint = stableEvidenceHash({ purpose: CVI_NECESSITY_ASSESSMENT_VERSION, ...base });
  return {
    ...base,
    assessmentFingerprint,
    assessmentId: `cvi1a-${assessmentFingerprint.slice(0, 20)}`,
  };
}
