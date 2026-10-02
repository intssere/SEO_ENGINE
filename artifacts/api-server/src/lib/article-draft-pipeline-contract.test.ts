import assert from "node:assert/strict";
import test from "node:test";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import type { SourceEvidenceLedger } from "./source-evidence-ledger-contract.js";
import type { ContentBriefOutline } from "./content-brief-outline-contract.js";
import {
  assertArticleDraftPipelineIntegrity,
  runArticleDraftPipeline,
  type ArticleClaimVerifier,
  type ArticleDraftEvaluator,
  type ArticleFinishingAssetGenerator,
  type ArticleSectionGenerator,
  type BrandVoiceProfile,
} from "./article-draft-pipeline-contract.js";

function ledger(): SourceEvidenceLedger {
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
  const questionId = "b".repeat(64);
  const evidenceBase = {
    sourceId: source.sourceId,
    sourceRecordFingerprint: source.sourceRecordFingerprint,
    extractedEvidence: "The captured source states that structured journaling can be discussed as a reflective practice.",
    questionIds: Object.freeze([questionId]),
    evidenceClasses: Object.freeze(["primary_authoritative_sources"] as const),
    claimRefs: Object.freeze([Object.freeze({
      claimKey: "claim:reflective-practice",
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
  const provenance = Object.freeze({
    contentOpportunityModelFingerprint: "1".repeat(64),
    contentOpportunityFingerprint: "2".repeat(64),
    topicClusteringFingerprint: "3".repeat(64),
    coverageAssessmentFingerprint: "4".repeat(64),
    cannibalizationAssessmentFingerprint: "5".repeat(64),
    businessRelevanceEvidenceFingerprint: "6".repeat(64),
  });
  const base = {
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
    ...base,
  });
  return Object.freeze({
    ...base,
    ledgerId: stableEvidenceHash({
      purpose: "ugp_source_evidence_ledger_id",
      version: "ugp-7-2-source-evidence-ledger-v1",
      researchPlanId: base.researchPlanId,
      ledgerFingerprint,
    }),
    ledgerFingerprint,
  });
}

function brief(sourceLedger: SourceEvidenceLedger, unresolved = false): ContentBriefOutline {
  const evidenceId = sourceLedger.evidence[0].evidenceId;
  const claimBase = {
    claimKey: "claim:reflective-practice",
    relevance: "direct" as const,
    supportingEvidenceIds: Object.freeze([evidenceId]),
    sourceIds: Object.freeze(["official-1"]),
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
  const sectionBase = {
    order: 1,
    headingIntent: "What does the evidence support about reflective journaling?",
    purposeCode: "establish_background",
    questionIds: Object.freeze(["b".repeat(64)]),
    evidenceIds: Object.freeze([evidenceId]),
    unresolvedEvidenceClasses: unresolved
      ? Object.freeze(["definitions_and_background"])
      : Object.freeze([] as string[]),
  };
  const sectionFingerprint = stableEvidenceHash({
    purpose: "ugp_content_brief_outline_section",
    version: "ugp-7-3-content-brief-outline-v1",
    ...sectionBase,
  });
  const outline = Object.freeze([Object.freeze({
    sectionId: stableEvidenceHash({
      purpose: "ugp_content_brief_outline_section_id",
      sectionFingerprint,
    }),
    ...sectionBase,
    sectionFingerprint,
  })]);
  const base = {
    version: "ugp-7-3-content-brief-outline-v1" as const,
    researchPlanId: sourceLedger.researchPlanId,
    researchPlanFingerprint: sourceLedger.researchPlanFingerprint,
    sourceEvidenceLedgerId: sourceLedger.ledgerId,
    sourceEvidenceLedgerFingerprint: sourceLedger.ledgerFingerprint,
    opportunityId: sourceLedger.opportunityId,
    targetTopic: sourceLedger.targetTopic,
    contentGoal: 'Create a research-grounded content specification for new coverage of "stress relief journal".',
    audience: "Users seeking accurate, useful understanding of the target topic.",
    intent: "informational" as const,
    recommendedContentType: "article_or_guide" as const,
    recommendedAction: "create_candidate" as const,
    questions: Object.freeze([Object.freeze({
      questionId: "b".repeat(64),
      question: "What does the evidence support about reflective journaling?",
      purposeCode: "establish_background",
    })]),
    claimIntents: Object.freeze([claimIntent]),
    entities: Object.freeze([]),
    internalLinkTargets: Object.freeze([]),
    outline,
    unresolvedEvidenceClasses: unresolved
      ? Object.freeze(["definitions_and_background"])
      : Object.freeze([] as string[]),
    limitations: Object.freeze([
      "claims_remain_unverified",
      "article_prose_not_generated",
      ...(unresolved ? ["unresolved_evidence_class:definitions_and_background"] : []),
    ].sort()),
    provenance: sourceLedger.provenance,
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
    ...base,
  });
  return Object.freeze({
    ...base,
    briefId: stableEvidenceHash({
      purpose: "ugp_content_brief_outline_id",
      version: "ugp-7-3-content-brief-outline-v1",
      opportunityId: base.opportunityId,
      briefFingerprint,
    }),
    briefFingerprint,
  });
}

const brandVoice: BrandVoiceProfile = Object.freeze({
  profileId: "brand-voice-v1",
  evidenceFingerprint: "c".repeat(64),
  guidelines: Object.freeze([
    "Use precise, restrained language.",
    "Avoid unsupported promotional superlatives.",
  ]),
});

function adapters(overrides: {
  generateSection?: ArticleSectionGenerator;
  verifyClaim?: ArticleClaimVerifier;
  evaluateDraft?: ArticleDraftEvaluator;
  generateFinishingAssets?: ArticleFinishingAssetGenerator;
} = {}) {
  const generateSection: ArticleSectionGenerator = overrides.generateSection ?? (async (request) => ({
    heading: "Reflective journaling and the evidence",
    text: "Structured journaling can be described as a reflective practice when the statement is kept within the supplied evidence.",
    citationEvidenceIds: [request.evidence[0].evidenceId],
    claims: [{
      claimKey: "claim:reflective-practice",
      claimText: "Structured journaling can be described as a reflective practice.",
      evidenceIds: [request.evidence[0].evidenceId],
    }],
  }));
  const verifyClaim: ArticleClaimVerifier = overrides.verifyClaim ?? (async (request) => ({
    status: "verified",
    evidenceIds: request.requestedEvidenceIds,
    summary: "The claim is supported within the bounded supplied evidence.",
  }));
  const evaluateDraft: ArticleDraftEvaluator = overrides.evaluateDraft ?? (async (request) => ({
    dimension: request.dimension,
    status: "pass",
    score: 95,
    summary: request.dimension + " passed synthetic evaluation.",
  }));
  const generateFinishingAssets: ArticleFinishingAssetGenerator =
    overrides.generateFinishingAssets ?? (async () => ({
      metadata: {
        title: "Stress Relief Journal: Evidence-Grounded Guide",
        metaDescription: "An evidence-grounded guide to reflective journaling, structured around verified source support.",
      },
      schemaPlan: ["Article"],
      mediaPlan: [{
        purpose: "Support the reflective journaling explanation.",
        placement: "After the introductory section.",
        sourceRequirement: "Use an original or properly licensed neutral journaling visual.",
      }],
    }));
  return { generateSection, verifyClaim, evaluateDraft, generateFinishingAssets };
}

test("UGP-7.4 completes a staged evidence-bound article draft", async () => {
  const sourceLedger = ledger();
  const contentBrief = brief(sourceLedger);
  const result = await runArticleDraftPipeline({
    brief: contentBrief,
    sourceEvidenceLedger: sourceLedger,
    brandVoice,
    ...adapters(),
  });

  assert.equal(result.status, "draft_complete");
  assert.match(result.articleBody ?? "", /Reflective journaling and the evidence/);
  assert.equal(result.sections[0]?.claims[0]?.verificationStatus, "verified");
  assert.equal(result.finishingAssets?.schemaPlan[0], "Article");
  assert.equal(result.semantics.publicationAuthorized, false);
  assert.equal(result.semantics.requiresUGP75QualityGate, true);
  assertArticleDraftPipelineIntegrity(result);
});

test("UGP-7.4 blocks unresolved sections before calling the generator", async () => {
  const sourceLedger = ledger();
  const contentBrief = brief(sourceLedger, true);
  let calls = 0;
  const result = await runArticleDraftPipeline({
    brief: contentBrief,
    sourceEvidenceLedger: sourceLedger,
    brandVoice,
    ...adapters({
      generateSection: async () => {
        calls += 1;
        throw new Error("should_not_run");
      },
    }),
  });

  assert.equal(calls, 0);
  assert.equal(result.status, "incomplete_evidence");
  assert.equal(result.sections[0]?.generationStatus, "blocked_unresolved_evidence");
  assert.equal(result.articleBody, null);
});

test("UGP-7.4 rejects citations outside the section evidence boundary", async () => {
  const sourceLedger = ledger();
  const contentBrief = brief(sourceLedger);
  const result = await runArticleDraftPipeline({
    brief: contentBrief,
    sourceEvidenceLedger: sourceLedger,
    brandVoice,
    ...adapters({
      generateSection: async () => ({
        heading: "Bad citation",
        text: "This draft attempts to cite evidence outside the certified section boundary.",
        citationEvidenceIds: ["0".repeat(64)],
        claims: [],
      }),
    }),
  });

  assert.equal(result.status, "generation_failed");
  assert.equal(result.sections[0]?.generationStatus, "failed");
  assert.ok(result.blockers.some((item) => item.includes("ugp_article_draft_out_of_scope_citation")));
});

test("UGP-7.4 blocks downstream stages when claim verification is not verified", async () => {
  const sourceLedger = ledger();
  const contentBrief = brief(sourceLedger);
  let evaluations = 0;
  const result = await runArticleDraftPipeline({
    brief: contentBrief,
    sourceEvidenceLedger: sourceLedger,
    brandVoice,
    ...adapters({
      verifyClaim: async (request) => ({
        status: "conflicting",
        evidenceIds: request.requestedEvidenceIds,
        summary: "The bounded evidence contains a conflict.",
      }),
      evaluateDraft: async (request) => {
        evaluations += 1;
        return {
          dimension: request.dimension,
          status: "pass",
          score: 100,
          summary: "should not run",
        };
      },
    }),
  });

  assert.equal(evaluations, 0);
  assert.equal(result.status, "verification_blocked");
  assert.equal(result.finishingAssets, null);
  assert.equal(
    result.stages.find((stage) => stage.stage === "fact_verification")?.status,
    "fail",
  );
});

test("UGP-7.4 requires explicit brand voice evidence for a complete pipeline", async () => {
  const sourceLedger = ledger();
  const contentBrief = brief(sourceLedger);
  const result = await runArticleDraftPipeline({
    brief: contentBrief,
    sourceEvidenceLedger: sourceLedger,
    brandVoice: null,
    ...adapters(),
  });

  assert.equal(result.status, "evaluation_failed");
  assert.ok(result.blockers.includes("missing_brand_voice_profile"));
  assert.equal(
    result.stages.find((stage) => stage.stage === "brand_voice")?.status,
    "blocked",
  );
  assert.equal(result.finishingAssets, null);
});

test("UGP-7.4 preserves evaluator failure as a draft blocker", async () => {
  const sourceLedger = ledger();
  const contentBrief = brief(sourceLedger);
  const result = await runArticleDraftPipeline({
    brief: contentBrief,
    sourceEvidenceLedger: sourceLedger,
    brandVoice,
    ...adapters({
      evaluateDraft: async (request) => ({
        dimension: request.dimension,
        status: request.dimension === "originality" ? "fail" : "pass",
        score: request.dimension === "originality" ? 20 : 95,
        summary: request.dimension + " synthetic result.",
      }),
    }),
  });

  assert.equal(result.status, "evaluation_failed");
  assert.ok(result.blockers.includes("draft_evaluation_failed:originality"));
  assert.equal(result.finishingAssets, null);
});

test("UGP-7.4 is deterministic for frozen inputs and frozen adapter outputs", async () => {
  const sourceLedger = ledger();
  const contentBrief = brief(sourceLedger);
  const first = await runArticleDraftPipeline({
    brief: contentBrief,
    sourceEvidenceLedger: sourceLedger,
    brandVoice,
    ...adapters(),
  });
  const second = await runArticleDraftPipeline({
    brief: contentBrief,
    sourceEvidenceLedger: sourceLedger,
    brandVoice,
    ...adapters(),
  });

  assert.deepEqual(first, second);
  assert.equal(first.draftFingerprint, second.draftFingerprint);
});

test("UGP-7.4 integrity rejects draft fingerprint mutation", async () => {
  const sourceLedger = ledger();
  const contentBrief = brief(sourceLedger);
  const result = await runArticleDraftPipeline({
    brief: contentBrief,
    sourceEvidenceLedger: sourceLedger,
    brandVoice,
    ...adapters(),
  });

  assert.throws(() => assertArticleDraftPipelineIntegrity({
    ...result,
    draftFingerprint: "0".repeat(64),
  }), /ugp_article_draft_fingerprint_mismatch/);
});
