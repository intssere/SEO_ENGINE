import {
  assertSourceEvidenceLedgerIntegrity,
  type SourceEvidenceLedger,
} from "./source-evidence-ledger-contract.js";
import {
  CVI_NECESSITY_ASSESSMENT_VERSION,
  type CviNecessityAssessment,
} from "./cvi-necessity-assessment-contract.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const CVI_SOURCE_LEDGER_BINDING_VERSION = "cvi-1b1-source-ledger-binding-v1" as const;
export type CviLedgerBindingStatus = "SOURCE_BOUND" | "NEEDS_EVIDENCE";

export type CviSourceLedgerBinding = Readonly<{
  version: typeof CVI_SOURCE_LEDGER_BINDING_VERSION;
  status: CviLedgerBindingStatus;
  sourceAssessmentFingerprint: string;
  sourceOpportunityId: string;
  sourceOpportunityFingerprint: string;
  sourceModelFingerprint: string;
  scope: CviNecessityAssessment["scope"];
  sourceLedgerId: string;
  sourceLedgerFingerprint: string;
  evidenceFingerprints: readonly string[];
  missingEvidenceFingerprints: readonly string[];
  reasonCodes: readonly string[];
  trust: Readonly<{
    sourceLedgerIntegrityChecked: true;
    lineageMatched: true;
    independentlyCertifiedTruth: false;
    tenantAuthorityVerified: false;
    sourceUsageRightsVerified: false;
    verifiedOriginalContribution: false;
  }>;
  semantics: Readonly<{
    deterministic: true;
    readOnly: true;
    performsNetworkOperation: false;
    performsPersistence: false;
    publicationAuthorized: false;
    executionAuthorized: false;
  }>;
  bindingFingerprint: string;
}>;

const HEX64 = /^[a-f0-9]{64}$/;
const TRUST = Object.freeze({
  sourceLedgerIntegrityChecked: true as const,
  lineageMatched: true as const,
  independentlyCertifiedTruth: false as const,
  tenantAuthorityVerified: false as const,
  sourceUsageRightsVerified: false as const,
  verifiedOriginalContribution: false as const,
});
const SEMANTICS = Object.freeze({
  deterministic: true as const,
  readOnly: true as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  publicationAuthorized: false as const,
  executionAuthorized: false as const,
});

function fingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !HEX64.test(value)) {
    throw new Error(`cvi_1b1_invalid_${field}`);
  }
  return value;
}

export function bindCviSourceEvidenceLedger(input: Readonly<{
  assessment: CviNecessityAssessment;
  ledger: SourceEvidenceLedger;
}>): CviSourceLedgerBinding {
  const { assessment, ledger } = input;
  if (!assessment || assessment.version !== CVI_NECESSITY_ASSESSMENT_VERSION
      || assessment.evidenceTrust.independentlyCertified !== false
      || assessment.semantics.publicationAuthorized !== false
      || assessment.semantics.executionAuthorized !== false) {
    throw new Error("cvi_1b1_assessment_untrusted");
  }
  const { assessmentFingerprint, assessmentId, ...assessmentBase } = assessment;
  const expectedAssessmentFingerprint = stableEvidenceHash({
    purpose: CVI_NECESSITY_ASSESSMENT_VERSION,
    ...assessmentBase,
  });
  if (fingerprint(assessmentFingerprint, "assessment_fingerprint") !== expectedAssessmentFingerprint
      || assessmentId !== `cvi1a-${assessmentFingerprint.slice(0, 20)}`) {
    throw new Error("cvi_1b1_assessment_integrity_mismatch");
  }
  assertSourceEvidenceLedgerIntegrity(ledger);
  if (ledger.opportunityId !== assessment.sourceOpportunityId
      || ledger.provenance.contentOpportunityFingerprint !== assessment.sourceOpportunityFingerprint
      || ledger.provenance.contentOpportunityModelFingerprint !== assessment.sourceModelFingerprint) {
    throw new Error("cvi_1b1_cross_artifact_lineage_mismatch");
  }
  if (!Array.isArray(ledger.evidence) || !Array.isArray(ledger.sources)) {
    throw new Error("cvi_1b1_invalid_ledger_shape");
  }
  const sourceRecords = new Map(ledger.sources.map(s => [s.sourceId, s]));
  if (sourceRecords.size !== ledger.sources.length) {
    throw new Error("cvi_1b1_duplicate_source_id");
  }
  const ledgerEvidence = new Set<string>();
  for (const item of ledger.evidence) {
    fingerprint(item.evidenceFingerprint, "ledger_evidence_fingerprint");
    const source = sourceRecords.get(item.sourceId);
    if (!source || source.sourceRecordFingerprint !== item.sourceRecordFingerprint) {
      throw new Error("cvi_1b1_source_evidence_reference_mismatch");
    }
    if (ledgerEvidence.has(item.evidenceFingerprint)) {
      throw new Error("cvi_1b1_duplicate_evidence_fingerprint");
    }
    ledgerEvidence.add(item.evidenceFingerprint);
  }
  const requested = [...new Set(
    assessment.editorialEvidenceFingerprints.map(v => fingerprint(v, "assessment_evidence_fingerprint")),
  )].sort();
  const missingEvidenceFingerprints = requested.filter(v => !ledgerEvidence.has(v));
  const evidenceFingerprints = requested.filter(v => ledgerEvidence.has(v));
  const status: CviLedgerBindingStatus =
    requested.length > 0 && missingEvidenceFingerprints.length === 0
      ? "SOURCE_BOUND" : "NEEDS_EVIDENCE";
  const reasonCodes = status === "SOURCE_BOUND" ? ["all_requested_evidence_bound"]
    : [requested.length === 0 ? "no_requested_evidence" : "requested_evidence_missing"];
  const base = {
    version: CVI_SOURCE_LEDGER_BINDING_VERSION,
    status,
    sourceAssessmentFingerprint: assessmentFingerprint,
    sourceOpportunityId: assessment.sourceOpportunityId,
    sourceOpportunityFingerprint: assessment.sourceOpportunityFingerprint,
    sourceModelFingerprint: assessment.sourceModelFingerprint,
    scope: assessment.scope,
    sourceLedgerId: ledger.ledgerId,
    sourceLedgerFingerprint: ledger.ledgerFingerprint,
    evidenceFingerprints,
    missingEvidenceFingerprints,
    reasonCodes,
    trust: TRUST,
    semantics: SEMANTICS,
  };
  return { ...base, bindingFingerprint: stableEvidenceHash({
    purpose: CVI_SOURCE_LEDGER_BINDING_VERSION,
    ...base,
  }) };
}
