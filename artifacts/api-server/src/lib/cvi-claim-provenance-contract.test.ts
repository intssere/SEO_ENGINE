import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import { bindCviSourceEvidenceLedger } from "./cvi-source-ledger-binding-contract.js";
import { evaluateCviClaimProvenance } from "./cvi-claim-provenance-contract.js";
import { CVI_NECESSITY_ASSESSMENT_VERSION, type CviNecessityAssessment } from "./cvi-necessity-assessment-contract.js";
import { UGP_SOURCE_EVIDENCE_LEDGER_VERSION, type SourceEvidenceLedger } from "./source-evidence-ledger-contract.js";

const fp = (n: number) => n.toString(16).padStart(64, "0");

function assessment(evidence: readonly string[] = [fp(20)]): CviNecessityAssessment {
  const base = {
    version: CVI_NECESSITY_ASSESSMENT_VERSION,
    sourceModelFingerprint: fp(1),
    sourceOpportunityId: "opportunity-1",
    sourceOpportunityFingerprint: fp(2),
    sourceRecommendedAction: "create_candidate" as const,
    scope: { tenantId: "tenant-1", siteId: "site-1", siteBindingEvidenceFingerprint: fp(3) },
    editorialEvidenceFingerprints: [...evidence].sort(),
    assessmentInputs: {
      hasVerifiedOriginalContribution: true,
      hasVerifiedBusinessTruth: true,
      unresolvedConflicts: false,
    },
    evidenceTrust: {
      assertionProvenance: "caller_supplied_unverified" as const,
      independentlyCertified: false as const,
      mustRevalidateBeforeGenerationOrPublication: true as const,
    },
    disposition: "PROCEED_TO_RESEARCH" as const,
    reasonCodes: ["upstream_action_candidate_evidence_sufficient_for_research"],
    blockers: [] as string[],
    policyVersion: CVI_NECESSITY_ASSESSMENT_VERSION,
    semantics: {
      readOnly: true as const,
      deterministic: true as const,
      publicationAuthorized: false as const,
      executionAuthorized: false as const,
      performsNetworkOperation: false as const,
      performsPersistence: false as const,
      requiresSeparateAuthorization: true as const,
    },
  };
  const assessmentFingerprint = stableEvidenceHash({ purpose: CVI_NECESSITY_ASSESSMENT_VERSION, ...base });
  return {
    ...base,
    assessmentFingerprint,
    assessmentId: `cvi1a-${assessmentFingerprint.slice(0, 20)}`,
  };
}

function ledger(evidenceFingerprint: string = fp(20)): SourceEvidenceLedger {
  const source = {
    sourceId: "source-1",
    sourceKind: "official_primary" as const,
    acquisitionMethod: "manual_import" as const,
    locator: "https://example.org/source",
    canonicalLocator: null,
    title: "Reference",
    publisher: "Reference publisher",
    author: null,
    publishedAt: null,
    updatedAt: null,
    acquiredAt: "2026-10-08T00:00:00.000Z",
    sourceFingerprint: fp(4),
    qualitySignals: {
      publisherIdentityKnown: true,
      authorIdentityKnown: false,
      publicationDateAvailable: false,
      updateDateAvailable: false,
      provenanceComplete: true,
      firstPartyOrOfficial: true,
      independentlyProduced: true,
    },
    supportTier: "supported" as const,
    sourceRecordFingerprint: fp(5),
  };
  const item = {
    evidenceId: fp(6),
    sourceId: source.sourceId,
    sourceRecordFingerprint: source.sourceRecordFingerprint,
    extractedEvidence: "Verified capture of source text, not truth certification.",
    questionIds: ["question-1"],
    evidenceClasses: [] as SourceEvidenceLedger["unresolvedEvidenceClasses"],
    claimRefs: [{ claimKey: "policy.returns", relevance: "direct" as const }],
    evidenceFingerprint,
  };
  const base = {
    version: UGP_SOURCE_EVIDENCE_LEDGER_VERSION,
    researchPlanId: fp(7),
    researchPlanFingerprint: fp(8),
    opportunityId: "opportunity-1",
    targetTopic: "reference topic",
    sources: [source],
    evidence: [item],
    coverage: [],
    unresolvedEvidenceClasses: [],
    provenance: {
      contentOpportunityModelFingerprint: fp(1),
      contentOpportunityFingerprint: fp(2),
      topicClusteringFingerprint: fp(9),
      coverageAssessmentFingerprint: fp(10),
      cannibalizationAssessmentFingerprint: fp(11),
      businessRelevanceEvidenceFingerprint: fp(12),
    },
    semantics: {
      deterministic: true as const,
      capturedAcquisitionOnly: true as const,
      performsNetworkOperation: false as const,
      performsLiveSourceAcquisition: false as const,
      performsPersistence: false as const,
      extractedEvidenceIsNotVerifiedClaim: true as const,
      conflictingEvidenceMayCoexist: true as const,
      sourceQualityDoesNotEstablishTruth: true as const,
      generatesArticleText: false as const,
      publicationAuthorized: false as const,
      executionAuthorized: false as const,
      providerWrites: false as const,
      publicSiteWrites: false as const,
    },
  };
  const ledgerFingerprint = stableEvidenceHash({ purpose: "ugp_source_evidence_ledger", ...base });
  return {
    ...base,
    ledgerFingerprint,
    ledgerId: stableEvidenceHash({
      purpose: "ugp_source_evidence_ledger_id",
      version: UGP_SOURCE_EVIDENCE_LEDGER_VERSION,
      researchPlanId: base.researchPlanId,
      ledgerFingerprint,
    }),
  };
}


function fixture() {
  const evidenceLedger = ledger();
  const evidenceBinding = bindCviSourceEvidenceLedger({ assessment: assessment(), ledger: evidenceLedger });
  return { binding: evidenceBinding, ledger: evidenceLedger };
}
function claim() {
  return {
    claimKey: "policy.returns",
    evidenceFingerprints: [fp(20)],
    conflictsKnown: false,
    contributionClaimed: true,
    contributionEvidenceFingerprints: [fp(20)],
  };
}
test("linked claim is not independently verified, originality only candidate", () => {
  const result = evaluateCviClaimProvenance({ ...fixture(), claims: [claim()] });
  assert.equal(result.disposition, "RESEARCH_REVIEW_ONLY");
  assert.equal(result.claims[0]?.evidenceStatus, "REFERENCE_LINKED");
  assert.equal(result.claims[0]?.contributionStatus, "DOCUMENTED_CANDIDATE");
  assert.equal(result.trust.claimsIndependentlyVerified, false);
  assert.equal(result.trust.originalityIndependentlyVerified, false);
  assert.equal(result.trust.tenantAuthorityVerified, false);
  assert.equal(result.semantics.publicationAuthorized, false);
});
test("unlinked source, absent claim references or source omission block", () => {
  const fx = fixture();
  const a = evaluateCviClaimProvenance({ ...fx, claims: [{ ...claim(), evidenceFingerprints: [fp(23)] }] });
  assert.equal(a.disposition, "BLOCKED");
  assert.deepEqual(a.claims[0]?.missingEvidenceFingerprints, [fp(23)]);
  const b = evaluateCviClaimProvenance({ ...fx, claims: [{ ...claim(), claimKey: "different.claim" }] });
  assert.equal(b.disposition, "BLOCKED");
});
test("conflict forces independent review and blocks claim", () => {
  const result = evaluateCviClaimProvenance({ ...fixture(), claims: [{ ...claim(), conflictsKnown: true }] });
  assert.equal(result.disposition, "BLOCKED");
  assert.equal(result.claims[0]?.evidenceStatus, "CONFLICT_REVIEW");
  assert.equal(result.claims[0]?.contributionStatus, "REVIEW_REQUIRED");
});
test("rejects changed lineage, tampering and duplicate claim keys", () => {
  const fx = fixture();
  assert.throws(() => evaluateCviClaimProvenance({
    ...fx, binding: { ...fx.binding, bindingFingerprint: fp(99) }, claims: [claim()],
  }));
  assert.throws(() => evaluateCviClaimProvenance({
    ...fx, ledger: { ...fx.ledger, ledgerFingerprint: fp(99) }, claims: [claim()],
  }));
  assert.throws(() => evaluateCviClaimProvenance({ ...fx, claims: [claim(), claim()] }));
});
test("fingerprint invariant under claim ordering", () => {
  const fx = fixture();
  const first = { ...claim(), claimKey: "other", conflictsKnown: true };
  const a = evaluateCviClaimProvenance({ ...fx, claims: [claim(), first] });
  const b = evaluateCviClaimProvenance({ ...fx, claims: [first, claim()] });
  assert.equal(a.reportFingerprint, b.reportFingerprint);
});
test("side-effect-free source contract", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(here, "cvi-claim-provenance-contract.ts"), "utf8");
  assert.doesNotMatch(source, /\\bfetch\\s*\\(|XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(source, /process\\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(source, /setTimeout|setInterval|queueMicrotask|Date\\.now|Math\\.random/);
});
