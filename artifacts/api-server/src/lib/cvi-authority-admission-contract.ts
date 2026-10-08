import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import {
  CVI_CLAIM_PROVENANCE_VERSION,
  type CviClaimProvenanceReport,
} from "./cvi-claim-provenance-contract.js";
import {
  CVI_BUSINESS_TRUTH_FRESHNESS_VERSION,
  type CviBusinessTruthFreshnessReport,
} from "./cvi-business-truth-freshness-contract.js";

export const CVI_AUTHORITY_ADMISSION_VERSION = "cvi-1b4-authority-admission-v1" as const;
export type CviAuthorityOutcome = "DENY" | "REQUEST_EVIDENCE" | "HUMAN_REVIEW_REQUIRED";

export type CviAuthorityAccessEvaluation = Readonly<{
  principalSubject: string;
  sessionExpiresAt: string;
  checkedAt: string;
  tenantId: string;
  siteId: string;
  siteBindingFingerprint: string;
  access: "DENIED" | "NOT_RESOLVED" | "VERIFIED_READ";
  accessSource: "trusted_backend_resolver" | "unresolved";
  connectionAccess: "DENIED" | "NOT_RESOLVED" | "VERIFIED_READ";
  tenantMembershipSource: "verified_server_side_record" | "unresolved";
}>;

export type CviAuthorityAdmissionReport = Readonly<{
  version: typeof CVI_AUTHORITY_ADMISSION_VERSION;
  claimReportFingerprint: string;
  businessReportFingerprint: string;
  evaluatedAt: string;
  tenantId: string;
  siteId: string;
  outcome: CviAuthorityOutcome;
  reasonCodes: readonly string[];
  semantics: Readonly<{
    readOnly: true;
    deterministic: true;
    delegatedAuthorizationRequired: true;
    independentEvidenceTruthVerified: false;
    publicationAuthorized: false;
    executionAuthorized: false;
    performsNetworkOperation: false;
    performsPersistence: false;
  }>;
  reportFingerprint: string;
}>;

const SHA = /^[a-f0-9]{64}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
function instant(value: string): number {
  if (typeof value !== "string" || !ISO.test(value)) throw new Error("cvi_1b4_invalid_timestamp");
  const n = Date.parse(value);
  if (!Number.isFinite(n) || new Date(n).toISOString() !== value) throw new Error("cvi_1b4_invalid_timestamp");
  return n;
}
function checkHash(value: string): boolean { return typeof value === "string" && SHA.test(value); }
function reportFingerprintValid<T extends { reportFingerprint: string }>(
  report: T, version: string,
): boolean {
  if (!report || !checkHash(report.reportFingerprint)) return false;
  const { reportFingerprint, ...body } = report;
  return reportFingerprint === stableEvidenceHash({ purpose: version, ...body });
}
const SEMANTICS = Object.freeze({
  readOnly: true as const,
  deterministic: true as const,
  delegatedAuthorizationRequired: true as const,
  independentEvidenceTruthVerified: false as const,
  publicationAuthorized: false as const,
  executionAuthorized: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
});

/** This is a pure decision gate, NOT an authority resolver.
 * The caller is responsible for obtaining accessEvaluation from a trusted, authenticated
 * backend service. Public API routes must not deserialize user JSON into this type.
 * Until a trusted resolver is integrated, always provide access=NOT_RESOLVED.
 */
export function evaluateCviAuthorityAdmission(input: Readonly<{
  claimReport: CviClaimProvenanceReport;
  businessReport: CviBusinessTruthFreshnessReport;
  accessEvaluation: CviAuthorityAccessEvaluation;
  evaluatedAt: string;
}>): CviAuthorityAdmissionReport {
  const { claimReport, businessReport, accessEvaluation } = input;
  if (!claimReport || claimReport.version !== CVI_CLAIM_PROVENANCE_VERSION
    || !reportFingerprintValid(claimReport, CVI_CLAIM_PROVENANCE_VERSION)
    || claimReport.trust.claimsIndependentlyVerified !== false
    || claimReport.semantics.executionAuthorized !== false
    || claimReport.semantics.publicationAuthorized !== false) {
    throw new Error("cvi_1b4_untrusted_claim_report");
  }
  if (!businessReport || businessReport.version !== CVI_BUSINESS_TRUTH_FRESHNESS_VERSION
    || !reportFingerprintValid(businessReport, CVI_BUSINESS_TRUTH_FRESHNESS_VERSION)
    || businessReport.trust.tenantAuthorityIndependentlyVerified !== false
    || businessReport.semantics.executionAuthorized !== false
    || businessReport.semantics.publicationAuthorized !== false) {
    throw new Error("cvi_1b4_untrusted_business_report");
  }
  if (!accessEvaluation || typeof accessEvaluation.principalSubject !== "string"
    || !accessEvaluation.principalSubject.trim()
    || typeof accessEvaluation.tenantId !== "string" || !accessEvaluation.tenantId
    || typeof accessEvaluation.siteId !== "string" || !accessEvaluation.siteId
    || !checkHash(accessEvaluation.siteBindingFingerprint)) {
    throw new Error("cvi_1b4_invalid_access_context");
  }
  const now = instant(input.evaluatedAt);
  const checked = instant(accessEvaluation.checkedAt);
  const expiry = instant(accessEvaluation.sessionExpiresAt);
  if (checked > now || expiry <= checked) throw new Error("cvi_1b4_invalid_session_window");
  const reasons: string[] = [];
  if (expiry <= now) reasons.push("session_expired");
  if (businessReport.scope.tenantId !== accessEvaluation.tenantId
    || businessReport.scope.siteId !== accessEvaluation.siteId
    || businessReport.scope.siteBindingEvidenceFingerprint !== accessEvaluation.siteBindingFingerprint) {
    reasons.push("tenant_site_binding_mismatch");
  }
  if (claimReport.sourceBindingFingerprint !== businessReport.bindingFingerprint) reasons.push("artifact_lineage_mismatch");
  if (accessEvaluation.access !== "VERIFIED_READ"
    || accessEvaluation.accessSource !== "trusted_backend_resolver"
    || accessEvaluation.connectionAccess !== "VERIFIED_READ"
    || accessEvaluation.tenantMembershipSource !== "verified_server_side_record") {
    reasons.push("independent_site_access_unavailable");
  }
  if (businessReport.status !== "RESEARCH_REVIEW_ONLY" || claimReport.disposition !== "RESEARCH_REVIEW_ONLY") {
    reasons.push("content_evidence_blocked");
  }
  // A signed/authenticated evidence-truth and expert-approval service is not yet integrated.
  // Even a valid authenticated read scope may enter review only, never generation/publishing.
  const outcome: CviAuthorityOutcome = reasons.some(x =>
    x === "session_expired" || x === "tenant_site_binding_mismatch"
    || x === "artifact_lineage_mismatch") ? "DENY"
    : reasons.includes("independent_site_access_unavailable") ? "REQUEST_EVIDENCE"
    : "HUMAN_REVIEW_REQUIRED";
  if (outcome === "HUMAN_REVIEW_REQUIRED") reasons.push("independent_truth_and_editorial_authority_not_verified");
  const base = {
    version: CVI_AUTHORITY_ADMISSION_VERSION,
    claimReportFingerprint: claimReport.reportFingerprint,
    businessReportFingerprint: businessReport.reportFingerprint,
    evaluatedAt: input.evaluatedAt,
    tenantId: accessEvaluation.tenantId,
    siteId: accessEvaluation.siteId,
    outcome,
    reasonCodes: reasons.sort(),
    semantics: SEMANTICS,
  };
  return { ...base, reportFingerprint: stableEvidenceHash({ purpose: CVI_AUTHORITY_ADMISSION_VERSION, ...base }) };
}
