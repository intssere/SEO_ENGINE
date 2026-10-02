import assert from "node:assert/strict";
import test from "node:test";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import type { ResearchPlan } from "./research-plan-contract.js";
import type { SourceEvidenceLedger } from "./source-evidence-ledger-contract.js";
import {
  assertContentBriefOutlineIntegrity,
  buildContentBriefOutline,
} from "./content-brief-outline-contract.js";

function plan(): ResearchPlan {
  const questionBase = {
    question: 'What evidence is needed for "stress relief journal"?',
    purposeCode: "establish_background",
    requiredEvidenceClasses: Object.freeze(["definitions_and_background", "primary_authoritative_sources"] as const),
  };
  const questionFingerprint = stableEvidenceHash({
    purpose: "ugp_research_question",
    version: "ugp-7-1-research-plan-v1",
    opportunityFingerprint: "1".repeat(64),
    ordinal: 1,
    ...questionBase,
  });
  const question = Object.freeze({
    questionId: stableEvidenceHash({
      purpose: "ugp_research_question_id",
      questionFingerprint,
    }),
    ...questionBase,
    questionFingerprint,
  });
  const base = {
    version: "ugp-7-1-research-plan-v1" as const,
    opportunityId: "2".repeat(64),
    opportunityFingerprint: "1".repeat(64),
    targetTopic: "stress relief journal",
    recommendedAction: "create_candidate" as const,
    searchIntent: "informational" as const,
    recommendedContentType: "article_or_guide" as const,
    objective: "Build an evidence plan.",
    questions: Object.freeze([question]),
    requiredEvidenceClasses: Object.freeze(["definitions_and_background", "primary_authoritative_sources"] as const),
    discoveryPlan: Object.freeze([{
      stepId: "3".repeat(64),
      order: 1,
      channel: "official_primary_sources" as const,
      purposeCode: "collect_primary_authoritative_evidence",
      requiredEvidenceClasses: Object.freeze(["primary_authoritative_sources"] as const),
      stopCondition: "A primary source target is identified.",
      stepFingerprint: "4".repeat(64),
    }]),
    limitations: Object.freeze(["article_generation_not_performed"]),
    provenance: Object.freeze({
      contentOpportunityModelFingerprint: "5".repeat(64),
      contentOpportunityFingerprint: "1".repeat(64),
      topicClusteringFingerprint: "6".repeat(64),
      coverageAssessmentFingerprint: "7".repeat(64),
      cannibalizationAssessmentFingerprint: "8".repeat(64),
      businessRelevanceEvidenceFingerprint: "9".repeat(64),
    }),
    semantics: Object.freeze({
      readOnly: true as const,
      deterministic: true as const,
      planningOnly: true as const,
      performsNetworkOperation: false as const,
      performsSourceAcquisition: false as const,
      performsPersistence: false as const,
      generatesArticleText: false as const,
      generatesClaims: false as const,
      verifiesClaims: false as const,
      grantsAuthorization: false as const,
      publicationAuthorized: false as const,
      executionAuthorized: false as const,
    }),
  };
  const planFingerprint = stableEvidenceHash({ purpose: "ugp_research_plan", ...base });
  return Object.freeze({
    ...base,
    planId: stableEvidenceHash({
      purpose: "ugp_research_plan_id",
      version: "ugp-7-1-research-plan-v1",
      opportunityId: base.opportunityId,
      planFingerprint,
    }),
    planFingerprint,
  });
}

function ledger(researchPlan: ResearchPlan): SourceEvidenceLedger {
  const sourceBase = {
    sourceId: "official-1",
    sourceKind: "official_primary" as const,
    acquisitionMethod: "captured_http" as const,
    locator: "https://authority.example/guide",
    canonicalLocator: "https://authority.example/guide",
    title: "Official Guide",
    publisher: "Authority",
    author: "Office",
    publishedAt: "2026-08-01T00:00:00.000Z",
    updatedAt: null,
    acquiredAt: "2026-10-01T00:00:00.000Z",
    sourceFingerprint: "a".repeat(64),
    qualitySignals: Object.freeze({
      publisherIdentityKnown: true,
      authorIdentityKnown: true,
      publicationDateAvailable: true,
      updateDateAvailable: false,
      provenanceComplete: true,
      firstPartyOrOfficial: true,
      independentlyProduced: true,
    }),
    supportTier: "strong" as const,
  };
  const source = Object.freeze({
    ...sourceBase,
    sourceRecordFingerprint: stableEvidenceHash({
      purpose: "ugp_research_source_record",
      version: "ugp-7-2-source-evidence-ledger-v1",
      ...sourceBase,
    }),
  });
  const evidenceBase = {
    sourceId: source.sourceId,
    sourceRecordFingerprint: source.sourceRecordFingerprint,
    extractedEvidence: "Captured evidence supports background research.",
    questionIds: Object.freeze([researchPlan.questions[0].questionId]),
    evidenceClasses: Object.freeze(["primary_authoritative_sources"] as const),
    claimRefs: Object.freeze([Object.freeze({
      claimKey: "claim:background",
      relevance: "direct" as const,
    })]),
  };
  const evidenceFingerprint = stableEvidenceHash({
    purpose: "ugp_research_evidence_record",
    version: "ugp-7-2-source-evidence-ledger-v1",
    ...evidenceBase,
  });
  const evidence = Object.freeze({
    evidenceId: stableEvidenceHash({
      purpose: "ugp_research_evidence_id",
      evidenceFingerprint,
    }),
    ...evidenceBase,
    evidenceFingerprint,
  });
  const base = {
    version: "ugp-7-2-source-evidence-ledger-v1" as const,
    researchPlanId: researchPlan.planId,
    researchPlanFingerprint: researchPlan.planFingerprint,
    opportunityId: researchPlan.opportunityId,
    targetTopic: researchPlan.targetTopic,
    sources: Object.freeze([source]),
    evidence: Object.freeze([evidence]),
    coverage: Object.freeze([
      Object.freeze({
        requiredEvidenceClass: "definitions_and_background" as const,
        evidenceCount: 0,
        sourceCount: 0,
        status: "missing" as const,
      }),
      Object.freeze({
        requiredEvidenceClass: "primary_authoritative_sources" as const,
        evidenceCount: 1,
        sourceCount: 1,
        status: "observed" as const,
      }),
    ]),
    unresolvedEvidenceClasses: Object.freeze(["definitions_and_background"] as const),
    provenance: researchPlan.provenance,
    semantics: Object.freeze({
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
    }),
  };
  const ledgerFingerprint = stableEvidenceHash({
    purpose: "ugp_source_evidence_ledger",
    ...base,
  });
  return Object.freeze({
    ...base,
    ledgerId: stableEvidenceHash({
      purpose: "ugp_source_evidence_ledger_id",
      version: "ugp-7-2-source-evidence-ledger-v1",
      researchPlanId: researchPlan.planId,
      ledgerFingerprint,
    }),
    ledgerFingerprint,
  });
}

test("UGP-7.3 builds evidence-grounded brief, claims, entities, links, and outline", () => {
  const researchPlan = plan();
  const sourceLedger = ledger(researchPlan);
  const evidenceId = sourceLedger.evidence[0].evidenceId;
  const result = buildContentBriefOutline({
    researchPlan,
    sourceEvidenceLedger: sourceLedger,
    entities: [{
      entityKey: "business:authority",
      displayName: "Authority",
      kind: "organization",
      supportingEvidenceIds: [evidenceId],
    }],
    internalLinkTargets: [{
      targetUrl: "https://example.com/existing#section",
      targetLabel: "Existing guide",
      supportingEvidenceIds: [evidenceId],
    }],
  });

  assert.equal(result.targetTopic, "stress relief journal");
  assert.equal(result.claimIntents[0]?.claimKey, "claim:background");
  assert.equal(result.claimIntents[0]?.verificationState, "unverified_evidence_linked");
  assert.equal(result.entities[0]?.displayName, "Authority");
  assert.equal(result.internalLinkTargets[0]?.targetUrl, "https://example.com/existing");
  assert.equal(result.outline[0]?.evidenceIds[0], evidenceId);
  assert.equal(result.semantics.generatesArticleProse, false);
  assertContentBriefOutlineIntegrity(result);
});

test("UGP-7.3 rejects entities and links without ledger evidence", () => {
  const researchPlan = plan();
  const sourceLedger = ledger(researchPlan);
  assert.throws(() => buildContentBriefOutline({
    researchPlan,
    sourceEvidenceLedger: sourceLedger,
    entities: [{
      entityKey: "product:invented",
      displayName: "Invented Product",
      kind: "product",
      supportingEvidenceIds: ["0".repeat(64)],
    }],
  }), /ugp_brief_outline_unknown_evidence_ref/);
});

test("UGP-7.3 preserves unresolved evidence by section and brief", () => {
  const researchPlan = plan();
  const sourceLedger = ledger(researchPlan);
  const result = buildContentBriefOutline({
    researchPlan,
    sourceEvidenceLedger: sourceLedger,
  });
  assert.deepEqual(result.unresolvedEvidenceClasses, ["definitions_and_background"]);
  assert.deepEqual(result.outline[0]?.unresolvedEvidenceClasses, ["definitions_and_background"]);
});

test("UGP-7.3 rejects research-plan and ledger lineage mismatch", () => {
  const researchPlan = plan();
  const sourceLedger = ledger(researchPlan);
  assert.throws(() => buildContentBriefOutline({
    researchPlan: { ...researchPlan, opportunityId: "f".repeat(64) },
    sourceEvidenceLedger: sourceLedger,
  }), /ugp_research_plan_fingerprint_mismatch/);
});

test("UGP-7.3 output is deterministic and non-authorizing", () => {
  const researchPlan = plan();
  const sourceLedger = ledger(researchPlan);
  const first = buildContentBriefOutline({ researchPlan, sourceEvidenceLedger: sourceLedger });
  const second = buildContentBriefOutline({ researchPlan, sourceEvidenceLedger: sourceLedger });
  assert.deepEqual(first, second);
  assert.deepEqual(first.semantics, {
    deterministic: true,
    evidenceGrounded: true,
    planningOnly: true,
    claimsRemainUnverified: true,
    performsNetworkOperation: false,
    performsPersistence: false,
    generatesArticleProse: false,
    grantsAuthorization: false,
    publicationAuthorized: false,
    executionAuthorized: false,
  });
});

test("UGP-7.3 integrity rejects brief fingerprint mutation", () => {
  const researchPlan = plan();
  const sourceLedger = ledger(researchPlan);
  const result = buildContentBriefOutline({ researchPlan, sourceEvidenceLedger: sourceLedger });
  assert.throws(() => assertContentBriefOutlineIntegrity({
    ...result,
    briefFingerprint: "0".repeat(64),
  }), /ugp_brief_outline_fingerprint_mismatch/);
});
