import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import { CVI_BUSINESS_TRUTH_FRESHNESS_VERSION, type CviBusinessTruthFreshnessReport } from "./cvi-business-truth-freshness-contract.js";
import { CVI_CLAIM_PROVENANCE_VERSION, type CviClaimProvenanceReport } from "./cvi-claim-provenance-contract.js";
import { assessCviEditorialEvidence, type CviEditorialCandidate } from "./cvi-editorial-evidence-gate.js";

export const CVI_EDITORIAL_REPORT_BRIDGE_VERSION = "cvi-1c2-editorial-report-bridge-v1" as const;
export type CviEditorialBridgeResult = Readonly<{
  version: typeof CVI_EDITORIAL_REPORT_BRIDGE_VERSION;
  status: "BLOCKED" | "RESEARCH_AND_HUMAN_REVIEW_ONLY";
  reasons: readonly string[];
  sourceReportFingerprints: readonly string[];
  outputFingerprint: string;
  externalFactsIndependentlyVerified: false;
  tenantAccessIndependentlyVerified: false;
  executionAuthorized: false;
  publicationAuthorized: false;
}>;

/** Checks that editorial declarations agree with upstream CVI report identities.
 * Source reports remain caller-supplied: hashes are consistency checks, not
 * cryptographic authenticity or proof that factual assertions are true.
 * NEVER converts any apparent approval into an authorization capability.
 */
export function bridgeCviEditorialEvidenceReports(input: Readonly<{
  candidate: CviEditorialCandidate;
  businessReport: CviBusinessTruthFreshnessReport;
  provenanceReport: CviClaimProvenanceReport;
  expectedSiteId: string;
  expectedTenantId: string;
  expectedSourceBindingFingerprint: string;
}>): CviEditorialBridgeResult {
  const reasons: string[] = [];
  const { businessReport: business, provenanceReport: provenance } = input;
  const isHash = (value: unknown): value is string =>
    typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
  function verifyHash(value: unknown, version: string, name: string, omitted: string) {
    if (!value || typeof value !== "object") { reasons.push(name + "_invalid"); return; }
    const record = value as Record<string, unknown>;
    const { [omitted]: actual, ...body } = record;
    if (!isHash(actual) || actual !== stableEvidenceHash({ purpose: version, ...body }))
      reasons.push(name + "_integrity_mismatch");
  }
  if (business?.version !== CVI_BUSINESS_TRUTH_FRESHNESS_VERSION)
    reasons.push("business_report_version_mismatch");
  else verifyHash(business,business.version,"business","reportFingerprint");
  if (provenance?.version !== CVI_CLAIM_PROVENANCE_VERSION)
    reasons.push("provenance_report_version_mismatch");
  else verifyHash(provenance,provenance.version,"provenance","reportFingerprint");

  if (!input.expectedSiteId || !input.expectedTenantId ||
    input.candidate.siteId !== input.expectedSiteId ||
    business?.scope?.siteId !== input.expectedSiteId ||
    business?.scope?.tenantId !== input.expectedTenantId)
    reasons.push("candidate_tenant_site_scope_mismatch");
  if (!isHash(input.expectedSourceBindingFingerprint) ||
      business?.bindingFingerprint !== input.expectedSourceBindingFingerprint ||
      provenance?.sourceBindingFingerprint !== input.expectedSourceBindingFingerprint)
    reasons.push("upstream_binding_lineage_mismatch");

  if (business?.status !== "RESEARCH_REVIEW_ONLY" ||
      business?.facts?.some(f => f.status !== "EVIDENCE_LINKED_CURRENT") ||
      business?.trust?.businessTruthIndependentlyVerified !== false ||
      business?.semantics?.publicationAuthorized !== false)
    reasons.push("business_evidence_not_review_ready");
  if (provenance?.disposition !== "RESEARCH_REVIEW_ONLY" ||
      provenance?.claims?.some(c => c.evidenceStatus !== "REFERENCE_LINKED") ||
      provenance?.trust?.claimsIndependentlyVerified !== false ||
      provenance?.semantics?.publicationAuthorized !== false)
    reasons.push("claim_evidence_not_review_ready");

  const knownClaims = new Set(provenance?.claims?.map(c => c.claimKey) ?? []);
  const missing = input.candidate.claims.filter(c => !knownClaims.has(c.claimId));
  if (missing.length || input.candidate.claims.length !== knownClaims.size)
    reasons.push("editorial_claims_not_bound_to_provenance");
  const editorial = assessCviEditorialEvidence(input.candidate);
  if (editorial.status === "REJECT") reasons.push("editorial_rejected");
  if (editorial.status === "NEEDS_HUMAN_REVIEW") reasons.push("editorial_review_incomplete");
  // Even apparent success remains a human research/review packet only.
  const uniqueReasons = [...new Set(reasons)].sort();
  const fingerprints = [business?.reportFingerprint, provenance?.reportFingerprint]
    .filter(isHash).sort();
  const status = uniqueReasons.length ? "BLOCKED" as const : "RESEARCH_AND_HUMAN_REVIEW_ONLY" as const;
  const base = {
    version: CVI_EDITORIAL_REPORT_BRIDGE_VERSION,
    status, reasons: uniqueReasons, sourceReportFingerprints: fingerprints,
    candidateFingerprint: editorial.candidateFingerprint,
    expectedTenantId: input.expectedTenantId,
    expectedSiteId: input.expectedSiteId,
    expectedSourceBindingFingerprint: input.expectedSourceBindingFingerprint,
  };
  return {
    version: CVI_EDITORIAL_REPORT_BRIDGE_VERSION,
    status, reasons: uniqueReasons, sourceReportFingerprints: fingerprints,
    outputFingerprint: stableEvidenceHash({ purpose: CVI_EDITORIAL_REPORT_BRIDGE_VERSION, ...base }),
    externalFactsIndependentlyVerified: false, tenantAccessIndependentlyVerified: false,
    executionAuthorized: false, publicationAuthorized: false,
  };
}
