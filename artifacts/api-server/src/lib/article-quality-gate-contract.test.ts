import assert from "node:assert/strict";
import test from "node:test";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import type { SourceEvidenceLedger } from "./source-evidence-ledger-contract.js";
import type { ContentBriefOutline } from "./content-brief-outline-contract.js";
import type { ArticleDraftPipelineResult } from "./article-draft-pipeline-contract.js";
import {
  UGP_ARTICLE_QUALITY_GATE_VERSION,
  assertArticleQualityGateIntegrity,
  buildArticleQualityGate,
  type ExternalQualityAssessment,
} from "./article-quality-gate-contract.js";

function fixture() {
  const provenance = Object.freeze({
    contentOpportunityModelFingerprint: "1".repeat(64),
    contentOpportunityFingerprint: "2".repeat(64),
    topicClusteringFingerprint: "3".repeat(64),
    coverageAssessmentFingerprint: "4".repeat(64),
    cannibalizationAssessmentFingerprint: "5".repeat(64),
    businessRelevanceEvidenceFingerprint: "6".repeat(64),
  });

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
    extractedEvidence: "Captured evidence supports the bounded claim.",
    questionIds: Object.freeze(["b".repeat(64)]),
    evidenceClasses: Object.freeze(["primary_authoritative_sources"] as const),
    claimRefs: Object.freeze([Object.freeze({
      claimKey: "claim:bounded",
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
  const ledgerBase = {
    version: "ugp-7-2-source-evidence-ledger-v1" as const,
    researchPlanId: "7".repeat(64),
    researchPlanFingerprint: "8".repeat(64),
    opportunityId: "9".repeat(64),
    targetTopic: "stress relief journal",
    sources: Object.freeze([source]),
    evidence: Object.freeze([evidence]),
    coverage: Object.freeze([Object.freeze({
      requiredEvidenceClass: "primary_authoritative_sources" as const,
      evidenceCount: 1,
      sourceCount: 1,
      status: "observed" as const,
    })]),
    unresolvedEvidenceClasses: Object.freeze([]),
    provenance,
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
    ...ledgerBase,
  });
  const ledger = Object.freeze({
    ...ledgerBase,
    ledgerId: stableEvidenceHash({
      purpose: "ugp_source_evidence_ledger_id",
      version: "ugp-7-2-source-evidence-ledger-v1",
      researchPlanId: ledgerBase.researchPlanId,
      ledgerFingerprint,
    }),
    ledgerFingerprint,
  }) as SourceEvidenceLedger;

  const claimBase = {
    claimKey: "claim:bounded",
    relevance: "direct" as const,
    supportingEvidenceIds: Object.freeze([evidence.evidenceId]),
    sourceIds: Object.freeze([source.sourceId]),
    verificationState: "unverified_evidence_linked" as const,
  };
  const claimIntent = Object.freeze({
    ...claimBase,
    claimIntentFingerprint: stableEvidenceHash({
      purpose: "ugp_content_brief_claim_intent",
      version: "ugp-7-3-content-brief-outline-v1",
      ...claimBase,
    }),
  });
  const outlineBase = {
    order: 1,
    headingIntent: "Explain the supported topic.",
    purposeCode: "establish_background",
    questionIds: Object.freeze(["b".repeat(64)]),
    evidenceIds: Object.freeze([evidence.evidenceId]),
    unresolvedEvidenceClasses: Object.freeze([] as string[]),
  };
  const outlineFingerprint = stableEvidenceHash({
    purpose: "ugp_content_brief_outline_section",
    version: "ugp-7-3-content-brief-outline-v1",
    ...outlineBase,
  });
  const outlineSection = Object.freeze({
    sectionId: stableEvidenceHash({
      purpose: "ugp_content_brief_outline_section_id",
      sectionFingerprint: outlineFingerprint,
    }),
    ...outlineBase,
    sectionFingerprint: outlineFingerprint,
  });
  const briefBase = {
    version: "ugp-7-3-content-brief-outline-v1" as const,
    researchPlanId: ledger.researchPlanId,
    researchPlanFingerprint: ledger.researchPlanFingerprint,
    sourceEvidenceLedgerId: ledger.ledgerId,
    sourceEvidenceLedgerFingerprint: ledger.ledgerFingerprint,
    opportunityId: ledger.opportunityId,
    targetTopic: ledger.targetTopic,
    contentGoal: "Create evidence-grounded new coverage.",
    audience: "Users seeking accurate understanding.",
    intent: "informational" as const,
    recommendedContentType: "article_or_guide" as const,
    recommendedAction: "create_candidate" as const,
    questions: Object.freeze([Object.freeze({
      questionId: "b".repeat(64),
      question: "Explain the supported topic.",
      purposeCode: "establish_background",
    })]),
    claimIntents: Object.freeze([claimIntent]),
    entities: Object.freeze([]),
    internalLinkTargets: Object.freeze([]),
    outline: Object.freeze([outlineSection]),
    unresolvedEvidenceClasses: Object.freeze([]),
    limitations: Object.freeze(["article_prose_not_generated", "claims_remain_unverified"]),
    provenance,
    semantics: Object.freeze({
      deterministic: true as const,
      evidenceGrounded: true as const,
      planningOnly: true as const,
      claimsRemainUnverified: true as const,
      performsNetworkOperation: false as const,
      performsPersistence: false as const,
      generatesArticleProse: false as const,
      grantsAuthorization: false as const,
      publicationAuthorized: false as const,
      executionAuthorized: false as const,
    }),
  };
  const briefFingerprint = stableEvidenceHash({
    purpose: "ugp_content_brief_outline",
    ...briefBase,
  });
  const brief = Object.freeze({
    ...briefBase,
    briefId: stableEvidenceHash({
      purpose: "ugp_content_brief_outline_id",
      version: "ugp-7-3-content-brief-outline-v1",
      opportunityId: briefBase.opportunityId,
      briefFingerprint,
    }),
    briefFingerprint,
  }) as ContentBriefOutline;

  const verificationBase = {
    claimKey: "claim:bounded",
    claimText: "The bounded claim is supported.",
    evidenceIds: Object.freeze([evidence.evidenceId]),
    verificationStatus: "verified" as const,
    verificationSummary: "Supported by admitted evidence.",
  };
  const verifiedClaim = Object.freeze({
    ...verificationBase,
    verificationFingerprint: stableEvidenceHash({
      purpose: "ugp_article_claim_verification",
      version: "ugp-7-4-article-draft-pipeline-v1",
      ...verificationBase,
    }),
  });
  const sectionBase = {
    sectionId: outlineSection.sectionId,
    order: 1,
    headingIntent: outlineSection.headingIntent,
    generationStatus: "generated" as const,
    heading: "Evidence-grounded topic",
    text: "The bounded claim is supported.",
    citationEvidenceIds: Object.freeze([evidence.evidenceId]),
    claims: Object.freeze([verifiedClaim]),
  };
  const section = Object.freeze({
    ...sectionBase,
    sectionFingerprint: stableEvidenceHash({
      purpose: "ugp_article_draft_section",
      version: "ugp-7-4-article-draft-pipeline-v1",
      ...sectionBase,
    }),
  });
  const stageNames = [
    "section_drafts","citation_binding","fact_verification","coherence",
    "originality","additive_value","brand_voice","seo","aeo_geo",
    "metadata","schema_media_plan",
  ] as const;
  const stages = Object.freeze(stageNames.map((stage) => {
    const base = {
      stage,
      status: "pass" as const,
      summary: stage + " passed.",
      score: ["coherence","originality","additive_value","brand_voice","seo","aeo_geo"].includes(stage) ? 95 : null,
    };
    return Object.freeze({
      ...base,
      stageFingerprint: stableEvidenceHash({
        purpose: "ugp_article_draft_stage",
        version: "ugp-7-4-article-draft-pipeline-v1",
        ...base,
      }),
    });
  }));
  const draftBase = {
    version: "ugp-7-4-article-draft-pipeline-v1" as const,
    briefId: brief.briefId,
    briefFingerprint: brief.briefFingerprint,
    sourceEvidenceLedgerId: ledger.ledgerId,
    sourceEvidenceLedgerFingerprint: ledger.ledgerFingerprint,
    targetTopic: brief.targetTopic,
    status: "draft_complete" as const,
    sections: Object.freeze([section]),
    articleBody: "## Evidence-grounded topic\n\nThe bounded claim is supported.",
    stages,
    finishingAssets: Object.freeze({
      metadata: Object.freeze({
        title: "Evidence-Grounded Topic",
        metaDescription: "An evidence-grounded article based on verified source support.",
      }),
      schemaPlan: Object.freeze(["Article"]),
      mediaPlan: Object.freeze([]),
    }),
    blockers: Object.freeze([]),
    warnings: Object.freeze([]),
    provenance: Object.freeze({
      contentBriefFingerprint: brief.briefFingerprint,
      researchPlanFingerprint: brief.researchPlanFingerprint,
      sourceEvidenceLedgerFingerprint: ledger.ledgerFingerprint,
      contentOpportunityFingerprint: brief.provenance.contentOpportunityFingerprint,
      topicClusteringFingerprint: brief.provenance.topicClusteringFingerprint,
    }),
    semantics: Object.freeze({
      evidenceBound: true as const,
      stageBased: true as const,
      builtInNetworkTransport: false as const,
      providerAdapterInjected: true as const,
      performsPersistence: false as const,
      publicationAuthorized: false as const,
      executionAuthorized: false as const,
      qualityGatePassed: false as const,
      requiresUGP75QualityGate: true as const,
      deterministicGivenFrozenInputsAndAdapterOutputs: true as const,
    }),
  };
  const draftFingerprint = stableEvidenceHash({
    purpose: "ugp_article_draft_pipeline",
    ...draftBase,
  });
  const draft = Object.freeze({
    ...draftBase,
    draftId: stableEvidenceHash({
      purpose: "ugp_article_draft_pipeline_id",
      version: "ugp-7-4-article-draft-pipeline-v1",
      briefId: brief.briefId,
      draftFingerprint,
    }),
    draftFingerprint,
  }) as ArticleDraftPipelineResult;

  return { ledger, brief, draft };
}

function assessment(
  checkId: ExternalQualityAssessment["checkId"],
  status: "pass" | "blocked" = "pass",
): ExternalQualityAssessment {
  const summary = status === "pass"
    ? checkId + " passed bounded assessment."
    : checkId + " detected a hard blocker.";
  const evidenceRefs = Object.freeze(["synthetic:" + checkId]);
  return Object.freeze({
    checkId,
    status,
    summary,
    evidenceRefs,
    assessmentFingerprint: stableEvidenceHash({
      purpose: "ugp_article_quality_external_assessment",
      version: UGP_ARTICLE_QUALITY_GATE_VERSION,
      checkId,
      status,
      summary,
      evidenceRefs,
    }),
  });
}

function allPass() {
  return [
    assessment("duplication_cannibalization"),
    assessment("unsafe_prohibited_content"),
    assessment("low_value_scaled_content"),
  ] as const;
}

test("UGP-7.5 passes only when all six hard-blocking checks pass", () => {
  const { ledger, brief, draft } = fixture();
  const gate = buildArticleQualityGate({
    draft,
    brief,
    sourceEvidenceLedger: ledger,
    externalAssessments: allPass(),
  });
  assert.equal(gate.status, "pass");
  assert.equal(gate.approvalEligible, true);
  assert.equal(gate.checks.length, 6);
  assert.equal(gate.semantics.publicationAuthorized, false);
  assertArticleQualityGateIntegrity(gate);
});

test("UGP-7.5 blocks unsafe/prohibited content assessment", () => {
  const { ledger, brief, draft } = fixture();
  const gate = buildArticleQualityGate({
    draft,
    brief,
    sourceEvidenceLedger: ledger,
    externalAssessments: [
      assessment("duplication_cannibalization"),
      assessment("unsafe_prohibited_content", "blocked"),
      assessment("low_value_scaled_content"),
    ],
  });
  assert.equal(gate.status, "blocked");
  assert.equal(gate.approvalEligible, false);
  assert.equal(
    gate.checks.find((check) => check.checkId === "unsafe_prohibited_content")?.status,
    "blocked",
  );
});

test("UGP-7.5 fails closed when a required external assessment is missing", () => {
  const { ledger, brief, draft } = fixture();
  assert.throws(() => buildArticleQualityGate({
    draft,
    brief,
    sourceEvidenceLedger: ledger,
    externalAssessments: [
      assessment("duplication_cannibalization"),
      assessment("unsafe_prohibited_content"),
    ],
  }), /ugp_article_quality_missing_external_assessment:low_value_scaled_content/);
});

test("UGP-7.5 rejects tampered external-assessment fingerprints", () => {
  const { ledger, brief, draft } = fixture();
  const bad = { ...assessment("duplication_cannibalization"), assessmentFingerprint: "0".repeat(64) };
  assert.throws(() => buildArticleQualityGate({
    draft,
    brief,
    sourceEvidenceLedger: ledger,
    externalAssessments: [
      bad,
      assessment("unsafe_prohibited_content"),
      assessment("low_value_scaled_content"),
    ],
  }), /ugp_article_quality_external_assessment_fingerprint_mismatch/);
});

test("UGP-7.5 blocks incomplete UGP-7.4 draft status", () => {
  const { ledger, brief, draft } = fixture();
  const mutated = { ...draft, status: "verification_blocked" as const };
  const { draftId: _id, draftFingerprint: _fp, ...base } = mutated;
  const draftFingerprint = stableEvidenceHash({
    purpose: "ugp_article_draft_pipeline",
    ...base,
  });
  const rebuilt = {
    ...base,
    draftId: stableEvidenceHash({
      purpose: "ugp_article_draft_pipeline_id",
      version: "ugp-7-4-article-draft-pipeline-v1",
      briefId: brief.briefId,
      draftFingerprint,
    }),
    draftFingerprint,
  } as ArticleDraftPipelineResult;
  const gate = buildArticleQualityGate({
    draft: rebuilt,
    brief,
    sourceEvidenceLedger: ledger,
    externalAssessments: allPass(),
  });
  assert.equal(gate.status, "blocked");
  assert.equal(
    gate.checks.find((check) => check.checkId === "important_claim_support")?.status,
    "blocked",
  );
});

test("UGP-7.5 output is deterministic for frozen inputs", () => {
  const { ledger, brief, draft } = fixture();
  const input = {
    draft,
    brief,
    sourceEvidenceLedger: ledger,
    externalAssessments: allPass(),
  };
  assert.deepEqual(buildArticleQualityGate(input), buildArticleQualityGate(input));
});

test("UGP-7.5 integrity rejects gate fingerprint mutation", () => {
  const { ledger, brief, draft } = fixture();
  const gate = buildArticleQualityGate({
    draft,
    brief,
    sourceEvidenceLedger: ledger,
    externalAssessments: allPass(),
  });
  assert.throws(() => assertArticleQualityGateIntegrity({
    ...gate,
    gateFingerprint: "0".repeat(64),
  }), /ugp_article_quality_fingerprint_mismatch/);
});
