import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import {
  assertResearchPlanIntegrity, UGP_RESEARCH_PLAN_VERSION, type ResearchPlan,
} from "./research-plan-contract.js";
import {
  CVI_EDITORIAL_REPORT_BRIDGE_VERSION, type CviEditorialBridgeResult,
} from "./cvi-editorial-report-bridge.js";

export const CVI_UGP_RESEARCH_HANDOFF_VERSION = "cvi-1c3-ugp-research-handoff-v1" as const;
export type CviUgpResearchHandoff = Readonly<{
  version: typeof CVI_UGP_RESEARCH_HANDOFF_VERSION;
  status: "BLOCKED" | "RESEARCH_PLANNING_REVIEW_ONLY";
  reasons: readonly string[];
  tenantId: string;
  siteId: string;
  opportunityId: string;
  researchPlanFingerprint: string;
  editorialBridgeFingerprint: string;
  missingEvidenceClasses: readonly string[];
  handoffFingerprint: string;
  planningOnly: true;
  authenticatedProviderEvidenceVerified: false;
  independentlyVerifiedBusinessTruth: false;
  trustedHumanApprovalVerified: false;
  executionAuthorized: false;
  publicationAuthorized: false;
}>;

const HEX = /^[a-f0-9]{64}$/;
const SAFE = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/;

/** Deterministically assembles a research-only packet from previously created
 * UGP-7.1 and CVI-1C.2 artifacts. Inputs are not authenticated receipts.
 * No output is a request to execute the research plan or publish content.
 */
export function prepareCviUgpResearchHandoff(input: Readonly<{
  tenantId: string;
  siteId: string;
  expectedOpportunityId: string;
  expectedOpportunityFingerprint: string;
  expectedEditorialBridgeFingerprint: string;
  researchPlan: ResearchPlan;
  editorialBridge: CviEditorialBridgeResult;
  documentedEvidenceClasses: readonly string[];
}>): CviUgpResearchHandoff {
  const reasons: string[] = [];
  if (!SAFE.test(input.tenantId) || !SAFE.test(input.siteId)) reasons.push("invalid_tenant_site");
  if (!HEX.test(input.expectedOpportunityId) || !HEX.test(input.expectedOpportunityFingerprint))
    reasons.push("invalid_opportunity_identity");
  try { assertResearchPlanIntegrity(input.researchPlan); }
  catch { reasons.push("research_plan_integrity_invalid"); }
  if (input.researchPlan.version !== UGP_RESEARCH_PLAN_VERSION ||
    input.researchPlan.opportunityId !== input.expectedOpportunityId ||
    input.researchPlan.opportunityFingerprint !== input.expectedOpportunityFingerprint ||
    input.researchPlan.provenance.contentOpportunityFingerprint !== input.expectedOpportunityFingerprint)
    reasons.push("research_opportunity_mismatch");

  const e = input.editorialBridge;
  if (e?.version !== CVI_EDITORIAL_REPORT_BRIDGE_VERSION ||
    e?.status !== "RESEARCH_AND_HUMAN_REVIEW_ONLY" ||
    e?.reasons?.length !== 0 ||
    e?.executionAuthorized !== false || e?.publicationAuthorized !== false ||
    e?.externalFactsIndependentlyVerified !== false ||
    e?.tenantAccessIndependentlyVerified !== false ||
    !HEX.test(e?.outputFingerprint ?? "") ||
    e?.outputFingerprint !== input.expectedEditorialBridgeFingerprint)
    reasons.push("editorial_bridge_not_ready_or_mismatched");
  if (!Array.isArray(input.documentedEvidenceClasses) ||
    input.documentedEvidenceClasses.some(s => typeof s !== "string" || s.length > 128))
    reasons.push("documented_evidence_classes_invalid");
  const supplied = new Set(input.documentedEvidenceClasses ?? []);
  const required = input.researchPlan.requiredEvidenceClasses ?? [];
  const missing = [...new Set(required.filter(x => !supplied.has(x)))].sort();
  if (missing.length > 0) reasons.push("research_evidence_classes_missing");
  // Declared evidence classes cannot prove their sources were acquired or licensed.
  const uniqueReasons = [...new Set(reasons)].sort();
  const base = {
    version: CVI_UGP_RESEARCH_HANDOFF_VERSION,
    status: uniqueReasons.length ? "BLOCKED" as const : "RESEARCH_PLANNING_REVIEW_ONLY" as const,
    reasons: uniqueReasons, tenantId: input.tenantId, siteId: input.siteId,
    opportunityId: input.expectedOpportunityId,
    researchPlanFingerprint: input.researchPlan.planFingerprint,
    editorialBridgeFingerprint: e.outputFingerprint,
    missingEvidenceClasses: missing,
    planningOnly: true as const,
    authenticatedProviderEvidenceVerified: false as const,
    independentlyVerifiedBusinessTruth: false as const,
    trustedHumanApprovalVerified: false as const,
    executionAuthorized: false as const, publicationAuthorized: false as const,
  };
  return {
    ...base,
    handoffFingerprint: stableEvidenceHash({ purpose: CVI_UGP_RESEARCH_HANDOFF_VERSION, ...base }),
  };
}
