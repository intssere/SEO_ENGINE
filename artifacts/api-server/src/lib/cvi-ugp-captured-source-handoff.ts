import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import { assertResearchPlanIntegrity, type ResearchPlan } from "./research-plan-contract.js";
import { assertSourceEvidenceLedgerIntegrity, type SourceEvidenceLedger } from "./source-evidence-ledger-contract.js";
import { type CviUgpResearchHandoff, CVI_UGP_RESEARCH_HANDOFF_VERSION } from "./cvi-ugp-research-handoff.js";

export const CVI_UGP_CAPTURED_SOURCE_HANDOFF_VERSION = "cvi-1c4-captured-source-handoff-v1" as const;
export type CviCapturedSourceHandoff = Readonly<{
  version: typeof CVI_UGP_CAPTURED_SOURCE_HANDOFF_VERSION;
  status: "BLOCKED" | "CAPTURED_EVIDENCE_REVIEW_ONLY";
  reasons: readonly string[];
  researchPlanFingerprint: string;
  sourceLedgerFingerprint: string;
  missingEvidenceClasses: readonly string[];
  handoffFingerprint: string;
  sourceTransportAuthenticated: false;
  sourceFactsIndependentlyVerified: false;
  sourceLicensingVerified: false;
  humanApprovalAuthenticated: false;
  executionAuthorized: false;
  publicationAuthorized: false;
}>;

/** Uses actual UGP-7.2 captured source records, not a caller's list of
 * "documented" evidence classes. Deterministic record integrity is not
 * authenticated provider custody or proof that quoted facts are correct.
 */
export function bindCviCapturedSourcesToResearch(input: Readonly<{
  handoff: CviUgpResearchHandoff;
  researchPlan: ResearchPlan;
  sourceLedger: SourceEvidenceLedger;
}>): CviCapturedSourceHandoff {
  const { handoff, researchPlan: plan, sourceLedger: ledger } = input;
  const reasons: string[] = [];
  try { assertResearchPlanIntegrity(plan); } catch { reasons.push("research_plan_invalid"); }
  try { assertSourceEvidenceLedgerIntegrity(ledger); } catch { reasons.push("source_ledger_invalid"); }

  if (!handoff || handoff.version !== CVI_UGP_RESEARCH_HANDOFF_VERSION ||
    handoff.status !== "RESEARCH_PLANNING_REVIEW_ONLY" ||
    handoff.reasons?.length !== 0 ||
    handoff.executionAuthorized !== false || handoff.publicationAuthorized !== false ||
    handoff.authenticatedProviderEvidenceVerified !== false ||
    handoff.independentlyVerifiedBusinessTruth !== false ||
    handoff.trustedHumanApprovalVerified !== false)
    reasons.push("research_handoff_not_review_ready");
  if (handoff?.researchPlanFingerprint !== plan?.planFingerprint ||
    handoff?.opportunityId !== plan?.opportunityId ||
    ledger?.researchPlanId !== plan?.planId ||
    ledger?.researchPlanFingerprint !== plan?.planFingerprint ||
    ledger?.opportunityId !== plan?.opportunityId ||
    ledger?.provenance?.contentOpportunityFingerprint !== plan?.opportunityFingerprint)
    reasons.push("captured_source_lineage_mismatch");
  const required = new Set(plan?.requiredEvidenceClasses ?? []);
  const covered = new Set<string>();
  for (const evidence of ledger?.evidence ?? []) {
    if (!ledger.sources.some(s => s.sourceId === evidence.sourceId &&
      s.sourceRecordFingerprint === evidence.sourceRecordFingerprint))
      reasons.push("evidence_source_reference_mismatch");
    for (const cls of evidence.evidenceClasses) {
      if (!required.has(cls)) reasons.push("unexpected_evidence_class");
      else covered.add(cls);
    }
  }
  const missing = [...required].filter(cls => !covered.has(cls)).sort();
  if (missing.length || (ledger?.unresolvedEvidenceClasses?.length ?? 0))
    reasons.push("captured_evidence_coverage_incomplete");
  for (const s of ledger?.sources ?? []) {
    // Unknown publisher identity, even when internally consistent, must be
    // escalated for further review rather than treated as a trusted source.
    if (!s.qualitySignals.provenanceComplete || !s.qualitySignals.publisherIdentityKnown ||
      s.supportTier === "insufficient")
      reasons.push("source_provenance_incomplete");
  }
  const unique = [...new Set(reasons)].sort();
  const status = unique.length ? "BLOCKED" as const : "CAPTURED_EVIDENCE_REVIEW_ONLY" as const;
  const base = {
    version: CVI_UGP_CAPTURED_SOURCE_HANDOFF_VERSION, status, reasons: unique,
    researchPlanFingerprint: plan?.planFingerprint ?? "",
    sourceLedgerFingerprint: ledger?.ledgerFingerprint ?? "",
    missingEvidenceClasses: missing,
    sourceTransportAuthenticated: false as const, sourceFactsIndependentlyVerified: false as const,
    sourceLicensingVerified: false as const, humanApprovalAuthenticated: false as const,
    executionAuthorized: false as const, publicationAuthorized: false as const,
  };
  return { ...base, handoffFingerprint: stableEvidenceHash({
    purpose: CVI_UGP_CAPTURED_SOURCE_HANDOFF_VERSION, ...base,
  }) };
}
