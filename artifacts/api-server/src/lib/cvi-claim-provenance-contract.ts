import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import {
  assertSourceEvidenceLedgerIntegrity,
  type SourceEvidenceLedger,
} from "./source-evidence-ledger-contract.js";
import {
  CVI_SOURCE_LEDGER_BINDING_VERSION,
  type CviSourceLedgerBinding,
} from "./cvi-source-ledger-binding-contract.js";

export const CVI_CLAIM_PROVENANCE_VERSION = "cvi-1b3-claim-provenance-v1" as const;
export type CviClaimEvidenceStatus = "REFERENCE_LINKED" | "MISSING_REFERENCE" | "CONFLICT_REVIEW";
export type CviContributionStatus = "DOCUMENTED_CANDIDATE" | "UNSUPPORTED" | "REVIEW_REQUIRED";

export type CviClaimProvenanceInput = Readonly<{
  claimKey: string;
  evidenceFingerprints: readonly string[];
  conflictsKnown: boolean;
  contributionClaimed: boolean;
  contributionEvidenceFingerprints: readonly string[];
}>;

export type CviClaimProvenanceReport = Readonly<{
  version: typeof CVI_CLAIM_PROVENANCE_VERSION;
  sourceBindingFingerprint: string;
  sourceLedgerFingerprint: string;
  claims: readonly Readonly<{
    claimKey: string;
    evidenceStatus: CviClaimEvidenceStatus;
    contributionStatus: CviContributionStatus;
    evidenceFingerprints: readonly string[];
    missingEvidenceFingerprints: readonly string[];
    contributionEvidenceFingerprints: readonly string[];
  }>[];
  disposition: "RESEARCH_REVIEW_ONLY" | "BLOCKED";
  trust: Readonly<{
    sourceReferenceIntegrityChecked: true;
    claimsIndependentlyVerified: false;
    originalityIndependentlyVerified: false;
    licensingIndependentlyVerified: false;
    reviewerAuthorityVerified: false;
    tenantAuthorityVerified: false;
  }>;
  semantics: Readonly<{
    deterministic: true;
    readOnly: true;
    publicationAuthorized: false;
    executionAuthorized: false;
    performsNetworkOperation: false;
    performsPersistence: false;
  }>;
  reportFingerprint: string;
}>;

const FINGERPRINT = /^[0-9a-f]{64}$/;
const CLAIM_KEY = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const TRUST = Object.freeze({
  sourceReferenceIntegrityChecked: true as const,
  claimsIndependentlyVerified: false as const,
  originalityIndependentlyVerified: false as const,
  licensingIndependentlyVerified: false as const,
  reviewerAuthorityVerified: false as const,
  tenantAuthorityVerified: false as const,
});
const SEMANTICS = Object.freeze({
  deterministic: true as const,
  readOnly: true as const,
  publicationAuthorized: false as const,
  executionAuthorized: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
});
function fingerprints(items: readonly string[], name: string): string[] {
  if (!Array.isArray(items) || items.length > 64) throw new Error(`cvi_1b3_invalid_${name}`);
  const validated = items.map(x => {
    if (typeof x !== "string" || !FINGERPRINT.test(x)) throw new Error(`cvi_1b3_invalid_${name}`);
    return x;
  });
  return [...new Set(validated)].sort();
}
export function evaluateCviClaimProvenance(input: Readonly<{
  binding: CviSourceLedgerBinding;
  ledger: SourceEvidenceLedger;
  claims: readonly CviClaimProvenanceInput[];
}>): CviClaimProvenanceReport {
  const { binding, ledger } = input;
  if (!binding || binding.version !== CVI_SOURCE_LEDGER_BINDING_VERSION
    || binding.trust.independentlyCertifiedTruth !== false
    || binding.trust.tenantAuthorityVerified !== false
    || binding.semantics.publicationAuthorized !== false
    || binding.semantics.executionAuthorized !== false) {
    throw new Error("cvi_1b3_unsafe_binding");
  }
  const { bindingFingerprint, ...bindingBase } = binding;
  if (typeof bindingFingerprint !== "string" || !FINGERPRINT.test(bindingFingerprint)
    || bindingFingerprint !== stableEvidenceHash({ purpose: CVI_SOURCE_LEDGER_BINDING_VERSION, ...bindingBase })) {
    throw new Error("cvi_1b3_binding_integrity_mismatch");
  }
  assertSourceEvidenceLedgerIntegrity(ledger);
  if (ledger.ledgerFingerprint !== binding.sourceLedgerFingerprint
    || ledger.ledgerId !== binding.sourceLedgerId
    || ledger.opportunityId !== binding.sourceOpportunityId
    || ledger.provenance.contentOpportunityFingerprint !== binding.sourceOpportunityFingerprint
    || ledger.provenance.contentOpportunityModelFingerprint !== binding.sourceModelFingerprint) {
    throw new Error("cvi_1b3_ledger_lineage_mismatch");
  }
  if (!Array.isArray(input.claims) || input.claims.length < 1 || input.claims.length > 128) {
    throw new Error("cvi_1b3_claim_count_invalid");
  }
  const available = new Map(ledger.evidence.map(x => [x.evidenceFingerprint, x]));
  if (available.size !== ledger.evidence.length) throw new Error("cvi_1b3_duplicate_ledger_evidence");
  const selected = new Set(binding.evidenceFingerprints);
  const knownSources = new Map(ledger.sources.map(s => [s.sourceId, s]));
  const seen = new Set<string>();
  const claims = input.claims.map(claim => {
    if (!claim || typeof claim.claimKey !== "string" || !CLAIM_KEY.test(claim.claimKey)
      || seen.has(claim.claimKey) || typeof claim.conflictsKnown !== "boolean"
      || typeof claim.contributionClaimed !== "boolean") {
      throw new Error("cvi_1b3_invalid_or_duplicate_claim");
    }
    seen.add(claim.claimKey);
    const requested = fingerprints(claim.evidenceFingerprints, "claim_evidence");
    const contribution = fingerprints(claim.contributionEvidenceFingerprints, "contribution_evidence");
    const missingEvidenceFingerprints = requested.filter(x => !selected.has(x) || !available.has(x));
    const referencesMatchClaims = requested.every(fp => {
      const item = available.get(fp);
      return item !== undefined && item.claimRefs.some(ref => ref.claimKey === claim.claimKey);
    });
    const evidenceStatus: CviClaimEvidenceStatus = claim.conflictsKnown ? "CONFLICT_REVIEW"
      : requested.length === 0 || missingEvidenceFingerprints.length > 0 || !referencesMatchClaims
        ? "MISSING_REFERENCE" : "REFERENCE_LINKED";
    const contributionsBound = contribution.length > 0 && contribution.every(fp => {
      const item = available.get(fp);
      const source = item && knownSources.get(item.sourceId);
      return item && selected.has(fp) && source
        && source.qualitySignals.firstPartyOrOfficial
        && item.claimRefs.some(ref => ref.claimKey === claim.claimKey);
    });
    const contributionStatus: CviContributionStatus =
      !claim.contributionClaimed ? "UNSUPPORTED"
      : claim.conflictsKnown ? "REVIEW_REQUIRED"
      : contributionsBound ? "DOCUMENTED_CANDIDATE" : "UNSUPPORTED";
    return {
      claimKey: claim.claimKey,
      evidenceStatus,
      contributionStatus,
      evidenceFingerprints: requested,
      missingEvidenceFingerprints,
      contributionEvidenceFingerprints: contribution,
    };
  }).sort((a,b) => a.claimKey.localeCompare(b.claimKey));
  const disposition = binding.status === "SOURCE_BOUND"
    && claims.every(c => c.evidenceStatus === "REFERENCE_LINKED"
      && c.contributionStatus !== "REVIEW_REQUIRED") ? "RESEARCH_REVIEW_ONLY" as const : "BLOCKED" as const;
  const base = {
    version: CVI_CLAIM_PROVENANCE_VERSION,
    sourceBindingFingerprint: bindingFingerprint,
    sourceLedgerFingerprint: ledger.ledgerFingerprint,
    claims,
    disposition,
    trust: TRUST,
    semantics: SEMANTICS,
  };
  return { ...base, reportFingerprint: stableEvidenceHash({ purpose: CVI_CLAIM_PROVENANCE_VERSION, ...base }) };
}
