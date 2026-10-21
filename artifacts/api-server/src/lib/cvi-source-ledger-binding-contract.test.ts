import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bindCviSourceEvidenceLedger } from "./cvi-source-ledger-binding-contract.js";
import {
  CVI_NECESSITY_ASSESSMENT_VERSION,
  type CviNecessityAssessment,
} from "./cvi-necessity-assessment-contract.js";
import {
  UGP_SOURCE_EVIDENCE_LEDGER_VERSION,
  type SourceEvidenceLedger,
} from "./source-evidence-ledger-contract.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

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
    claimRefs: [],
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

test("matches source-ledger fingerprints without certifying factual truth", () => {
  const result = bindCviSourceEvidenceLedger({ assessment: assessment(), ledger: ledger() });
  assert.equal(result.status, "SOURCE_BOUND");
  assert.deepEqual(result.evidenceFingerprints, [fp(20)]);
  assert.equal(result.trust.independentlyCertifiedTruth, false);
  assert.equal(result.trust.tenantAuthorityVerified, false);
  assert.equal(result.trust.sourceUsageRightsVerified, false);
  assert.equal(result.semantics.publicationAuthorized, false);
  assert.equal(result.semantics.executionAuthorized, false);
});

test("missing evidence is advisory NEEDS_EVIDENCE, never source-bound", () => {
  const result = bindCviSourceEvidenceLedger({ assessment: assessment([fp(22)]), ledger: ledger() });
  assert.equal(result.status, "NEEDS_EVIDENCE");
  assert.deepEqual(result.missingEvidenceFingerprints, [fp(22)]);
});

test("empty requested evidence is never source-bound", () => {
  assert.equal(
    bindCviSourceEvidenceLedger({ assessment: assessment([]), ledger: ledger() }).status,
    "NEEDS_EVIDENCE",
  );
});

test("rejects cross-opportunity, cross-model and stale ledger lineage", () => {
  const base = ledger();
  for (const field of ["contentOpportunityFingerprint", "contentOpportunityModelFingerprint"] as const) {
    const changed = {
      ...base,
      provenance: { ...base.provenance, [field]: fp(45) },
    };
    const { ledgerId: _id, ledgerFingerprint: _hash, ...fields } = changed;
    const ledgerFingerprint = stableEvidenceHash({ purpose: "ugp_source_evidence_ledger", ...fields });
    const forged: SourceEvidenceLedger = {
      ...fields,
      ledgerFingerprint,
      ledgerId: stableEvidenceHash({
        purpose: "ugp_source_evidence_ledger_id",
        version: UGP_SOURCE_EVIDENCE_LEDGER_VERSION,
        researchPlanId: fields.researchPlanId,
        ledgerFingerprint,
      }),
    };
    assert.throws(
      () => bindCviSourceEvidenceLedger({ assessment: assessment(), ledger: forged }),
      /lineage_mismatch/,
    );
  }
});

test("tampered ledger or assessment integrity fails closed", () => {
  assert.throws(() => bindCviSourceEvidenceLedger({
    assessment: assessment(),
    ledger: { ...ledger(), ledgerFingerprint: fp(99) },
  }));
  assert.throws(() => bindCviSourceEvidenceLedger({
    assessment: { ...assessment(), sourceOpportunityFingerprint: fp(99) },
    ledger: ledger(),
  }), /integrity_mismatch/);
});

test("binding is deterministic for exact identical evidence snapshots", () => {
  const input = { assessment: assessment(), ledger: ledger() };
  assert.equal(bindCviSourceEvidenceLedger(input).bindingFingerprint,
    bindCviSourceEvidenceLedger(input).bindingFingerprint);
});

test("provider-free core has no network, database, timer or random side effects", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(here, "cvi-source-ledger-binding-contract.ts"), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(source, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(source, /setTimeout|setInterval|queueMicrotask|Date\.now|Math\.random/);
});
