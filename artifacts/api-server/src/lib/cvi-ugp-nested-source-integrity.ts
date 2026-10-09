import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import {
  UGP_SOURCE_EVIDENCE_LEDGER_VERSION, type SourceEvidenceLedger,
} from "./source-evidence-ledger-contract.js";
import { type CviCapturedSourceHandoff, CVI_UGP_CAPTURED_SOURCE_HANDOFF_VERSION } from "./cvi-ugp-captured-source-handoff.js";

export const CVI_NESTED_SOURCE_INTEGRITY_VERSION = "cvi-1c5-nested-source-integrity-v1" as const;
export type CviNestedSourceIntegrityResult = Readonly<{
  version: typeof CVI_NESTED_SOURCE_INTEGRITY_VERSION;
  status: "BLOCKED" | "INTEGRITY_REVIEW_ONLY";
  reasons: readonly string[];
  ledgerFingerprint: string;
  resultFingerprint: string;
  nestedRecordFingerprintsVerified: boolean;
  sourceAuthenticityIndependentlyVerified: false;
  factualAccuracyIndependentlyVerified: false;
  licensingIndependentlyVerified: false;
  executionAuthorized: false;
  publicationAuthorized: false;
}>;

const HEX = /^[0-9a-f]{64}$/;

/** Recompute every nested UGP-7.2 hash rather than relying on a rehashed
 * outer envelope. SHA256 consistency is NOT provider signature/custody proof.
 * Never authorizes a read, generation, publication, or external operation.
 */
export function inspectCviNestedSourceIntegrity(input: Readonly<{
  ledger: SourceEvidenceLedger;
  capturedHandoff: CviCapturedSourceHandoff;
}>): CviNestedSourceIntegrityResult {
  const reasons: string[] = [];
  const { ledger, capturedHandoff: handoff } = input;
  const sources = Array.isArray(ledger?.sources) ? ledger.sources : [];
  const evidence = Array.isArray(ledger?.evidence) ? ledger.evidence : [];
  const bySource = new Map(sources.map(s => [s.sourceId, s]));
  const byEvidence = new Set<string>();
  if (bySource.size !== sources.length) reasons.push("duplicate_source_identity");
  for (const s of sources) {
    if (!s || !HEX.test(s.sourceFingerprint) || !HEX.test(s.sourceRecordFingerprint)) {
      reasons.push("source_fingerprint_malformed"); continue;
    }
    const { sourceRecordFingerprint, ...record } = s;
    const expected = stableEvidenceHash({
      purpose: "ugp_research_source_record",
      version: UGP_SOURCE_EVIDENCE_LEDGER_VERSION, ...record,
    });
    if (sourceRecordFingerprint !== expected) reasons.push("source_record_integrity_mismatch");
    if (s.qualitySignals.publicationDateAvailable !== (s.publishedAt !== null) ||
        s.qualitySignals.updateDateAvailable !== (s.updatedAt !== null))
      reasons.push("source_date_signal_mismatch");
    const acquired = Date.parse(s.acquiredAt);
    if (!Number.isFinite(acquired) ||
      (s.publishedAt !== null && Date.parse(s.publishedAt) > acquired) ||
      (s.updatedAt !== null && Date.parse(s.updatedAt) > acquired))
      reasons.push("source_time_window_invalid");
  }
  for (const item of evidence) {
    if (!item || !HEX.test(item.evidenceFingerprint) || !HEX.test(item.evidenceId))
    { reasons.push("evidence_fingerprint_malformed"); continue; }
    if (byEvidence.has(item.evidenceFingerprint)) reasons.push("duplicate_evidence_fingerprint");
    byEvidence.add(item.evidenceFingerprint);
    const source = bySource.get(item.sourceId);
    if (!source || source.sourceRecordFingerprint !== item.sourceRecordFingerprint)
      reasons.push("evidence_source_reference_mismatch");
    const { evidenceId, evidenceFingerprint, ...record } = item;
    const expected = stableEvidenceHash({
      purpose: "ugp_research_evidence_record",
      version: UGP_SOURCE_EVIDENCE_LEDGER_VERSION, ...record,
    });
    if (expected !== evidenceFingerprint) reasons.push("evidence_record_integrity_mismatch");
    const expectedId = stableEvidenceHash({
      purpose: "ugp_research_evidence_id", evidenceFingerprint,
    });
    if (expectedId !== evidenceId) reasons.push("evidence_id_integrity_mismatch");
    if (!Array.isArray(item.questionIds) || item.questionIds.length === 0 ||
        !Array.isArray(item.evidenceClasses) || item.evidenceClasses.length === 0)
      reasons.push("evidence_linkage_missing");
  }
  for (const coverage of ledger?.coverage ?? []) {
    const matching = evidence.filter(e => e.evidenceClasses.includes(coverage.requiredEvidenceClass));
    if (coverage.evidenceCount !== matching.length ||
        coverage.sourceCount !== new Set(matching.map(e => e.sourceId)).size ||
        coverage.status !== (matching.length ? "observed" : "missing"))
      reasons.push("evidence_coverage_inconsistent");
  }
  const expectedUnresolved = (ledger?.coverage ?? [])
    .filter(c => c.status === "missing")
    .map(c => c.requiredEvidenceClass).sort();
  if (JSON.stringify([...(ledger?.unresolvedEvidenceClasses ?? [])].sort()) !==
      JSON.stringify(expectedUnresolved))
    reasons.push("unresolved_evidence_classes_mismatch");
  if (!handoff || handoff.version !== CVI_UGP_CAPTURED_SOURCE_HANDOFF_VERSION ||
      handoff.status !== "CAPTURED_EVIDENCE_REVIEW_ONLY" ||
      handoff.reasons?.length !== 0 ||
      handoff.sourceLedgerFingerprint !== ledger?.ledgerFingerprint ||
      handoff.executionAuthorized !== false || handoff.publicationAuthorized !== false ||
      handoff.sourceTransportAuthenticated !== false ||
      handoff.sourceFactsIndependentlyVerified !== false ||
      handoff.sourceLicensingVerified !== false ||
      handoff.humanApprovalAuthenticated !== false)
    reasons.push("captured_handoff_not_safe");
  const unique = [...new Set(reasons)].sort();
  const status = unique.length ? "BLOCKED" as const : "INTEGRITY_REVIEW_ONLY" as const;
  const base = {
    version: CVI_NESTED_SOURCE_INTEGRITY_VERSION, status, reasons: unique,
    ledgerFingerprint: ledger?.ledgerFingerprint ?? "",
    nestedRecordFingerprintsVerified: unique.length === 0,
    sourceAuthenticityIndependentlyVerified: false as const,
    factualAccuracyIndependentlyVerified: false as const,
    licensingIndependentlyVerified: false as const,
    executionAuthorized: false as const, publicationAuthorized: false as const,
  };
  return {...base, resultFingerprint:stableEvidenceHash({
    purpose:CVI_NESTED_SOURCE_INTEGRITY_VERSION,...base,
  })};
}
