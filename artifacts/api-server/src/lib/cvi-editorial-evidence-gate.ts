import { createHash } from "node:crypto";

export const CVI_EDITORIAL_EVIDENCE_GATE_VERSION = "cvi-1c1-editorial-evidence-gate-v1" as const;
export type CviEditorialClaim = Readonly<{
  claimId: string;
  statement: string;
  sourceIds: readonly string[];
  material: boolean;
  status: "supported" | "contested" | "unverified";
}>;
export type CviEditorialSource = Readonly<{
  sourceId: string;
  url: string;
  accessedAt: string;
  independentPublisherId: string;
  evidenceStatus: "verified_excerpt" | "unverified" | "retracted";
  licensingStatus: "cleared" | "restricted" | "unknown";
}>;
export type CviEditorialCandidate = Readonly<{
  candidateId: string;
  siteId: string;
  contentFingerprint: string;
  necessityStatus: "supported" | "unresolved" | "not_necessary";
  factualFreshnessStatus: "current" | "stale" | "unknown";
  originalityStatus: "reviewed" | "unknown" | "failed";
  claims: readonly CviEditorialClaim[];
  sources: readonly CviEditorialSource[];
  humanReview: Readonly<{
    decision: "approved" | "rejected" | "pending";
    reviewerId: string | null;
    decisionAt: string | null;
  }>;
}>;
export type CviEditorialResult = Readonly<{
  version: typeof CVI_EDITORIAL_EVIDENCE_GATE_VERSION;
  status: "REJECT" | "NEEDS_HUMAN_REVIEW" | "READY_FOR_GOVERNED_INTEGRATION_REVIEW";
  reasons: readonly string[];
  candidateFingerprint: string;
  factualTruthIndependentlyProven: false;
  authorizationGranted: false;
  executionAuthorized: false;
  publicationAuthorized: false;
}>;
const HEX = /^[a-f0-9]{64}$/;
const KEY = /^[A-Za-z0-9][A-Za-z0-9_.:@/-]{0,255}$/;
function digest(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

/** Deterministic editorial quality preflight, NOT a fact-checker.
 * Status fields and human approval can be forged by callers. The result
 * NEVER grants provider/site access, publishing rights, or verified truth.
 */
export function assessCviEditorialEvidence(candidate: CviEditorialCandidate): CviEditorialResult {
  const errors: string[] = [];
  const review: string[] = [];
  if (!KEY.test(candidate.candidateId) || !KEY.test(candidate.siteId) ||
      !HEX.test(candidate.contentFingerprint)) errors.push("candidate_identity_invalid");
  if (candidate.necessityStatus === "not_necessary") errors.push("content_not_necessary");
  else if (candidate.necessityStatus !== "supported") review.push("necessity_not_established");
  if (candidate.factualFreshnessStatus === "stale") errors.push("business_facts_stale");
  else if (candidate.factualFreshnessStatus !== "current") review.push("freshness_unverified");
  if (candidate.originalityStatus === "failed") errors.push("originality_failed");
  else if (candidate.originalityStatus !== "reviewed") review.push("originality_unreviewed");
  if (!Array.isArray(candidate.claims) || candidate.claims.length === 0) review.push("no_checkable_claims");
  if (!Array.isArray(candidate.sources) || candidate.sources.length === 0) review.push("no_evidence_sources");

  const sourceById = new Map<string, CviEditorialSource>();
  for (const s of candidate.sources ?? []) {
    if (!KEY.test(s.sourceId) || sourceById.has(s.sourceId) ||
        !KEY.test(s.independentPublisherId) || !s.url.startsWith("https://")) {
      errors.push("source_identity_invalid");
    }
    if (!Number.isFinite(Date.parse(s.accessedAt))) review.push("source_access_time_invalid");
    if (s.evidenceStatus === "retracted") errors.push("source_retracted");
    else if (s.evidenceStatus !== "verified_excerpt") review.push("source_unverified");
    if (s.licensingStatus === "restricted") errors.push("source_rights_restricted");
    else if (s.licensingStatus !== "cleared") review.push("source_rights_unknown");
    sourceById.set(s.sourceId, s);
  }
  const claimIds = new Set<string>();
  for (const c of candidate.claims ?? []) {
    if (!KEY.test(c.claimId) || claimIds.has(c.claimId) || !c.statement.trim())
      errors.push("claim_identity_invalid");
    claimIds.add(c.claimId);
    if (c.status === "contested") errors.push("claim_contested");
    else if (c.status !== "supported") review.push("claim_unverified");
    if (!c.sourceIds.length) review.push("claim_without_source");
    for (const id of c.sourceIds) {
      if (!sourceById.has(id)) errors.push("claim_unknown_source");
    }
    // Material claims require at least two distinct declared publishers.
    // Declared publisher IDs do not independently prove source independence.
    if (c.material) {
      const publishers = new Set(c.sourceIds.map(id => sourceById.get(id)?.independentPublisherId).filter(Boolean));
      if (publishers.size < 2) review.push("material_claim_needs_independent_corroboration");
    }
  }
  if (candidate.humanReview.decision === "rejected") errors.push("human_rejected");
  else if (candidate.humanReview.decision !== "approved" ||
           !candidate.humanReview.reviewerId ||
           !KEY.test(candidate.humanReview.reviewerId) ||
           !candidate.humanReview.decisionAt ||
           !Number.isFinite(Date.parse(candidate.humanReview.decisionAt))) {
    review.push("human_approval_not_verified");
  }
  const reasons = [...new Set([...errors, ...review])].sort();
  return {
    version: CVI_EDITORIAL_EVIDENCE_GATE_VERSION,
    status: errors.length ? "REJECT" : review.length ? "NEEDS_HUMAN_REVIEW" :
      "READY_FOR_GOVERNED_INTEGRATION_REVIEW",
    reasons, candidateFingerprint: digest(candidate),
    factualTruthIndependentlyProven: false,
    authorizationGranted: false, executionAuthorized: false, publicationAuthorized: false,
  };
}
