import {
  assertContentBriefOutlineIntegrity,
  type ContentBriefOutline,
} from "./content-brief-outline-contract.js";
import {
  assertSourceEvidenceLedgerIntegrity,
  type ResearchEvidenceRecord,
  type SourceEvidenceLedger,
} from "./source-evidence-ledger-contract.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const UGP_ARTICLE_DRAFT_PIPELINE_VERSION =
  "ugp-7-4-article-draft-pipeline-v1" as const;

export const UGP_ARTICLE_DRAFT_PIPELINE_POLICY = Object.freeze({
  maxSectionChars: 12000,
  maxHeadingChars: 240,
  maxCitationsPerSection: 24,
  maxClaimsPerSection: 24,
  maxMetadataTitleChars: 120,
  maxMetaDescriptionChars: 320,
  maxSchemaTypes: 12,
  maxMediaItems: 24,
} as const);

export type ArticleDraftStage =
  | "section_drafts"
  | "citation_binding"
  | "fact_verification"
  | "coherence"
  | "originality"
  | "additive_value"
  | "brand_voice"
  | "seo"
  | "aeo_geo"
  | "metadata"
  | "schema_media_plan";

export type ArticleStageStatus =
  | "pass"
  | "warning"
  | "fail"
  | "blocked"
  | "skipped";

export type ArticleEvaluationDimension =
  | "coherence"
  | "originality"
  | "additive_value"
  | "brand_voice"
  | "seo"
  | "aeo_geo";

export type BrandVoiceProfile = Readonly<{
  profileId: string;
  evidenceFingerprint: string;
  guidelines: readonly string[];
}>;

export type GeneratedClaimUse = Readonly<{
  claimKey: string;
  claimText: string;
  evidenceIds: readonly string[];
}>;

export type GeneratedArticleSection = Readonly<{
  heading: string;
  text: string;
  citationEvidenceIds: readonly string[];
  claims: readonly GeneratedClaimUse[];
}>;

export type ArticleSectionGenerationRequest = Readonly<{
  version: typeof UGP_ARTICLE_DRAFT_PIPELINE_VERSION;
  briefId: string;
  briefFingerprint: string;
  sectionId: string;
  sectionOrder: number;
  targetTopic: string;
  contentGoal: string;
  audience: string;
  intent: ContentBriefOutline["intent"];
  headingIntent: string;
  purposeCode: string;
  evidence: readonly Readonly<{
    evidenceId: string;
    sourceId: string;
    sourceKind: string;
    sourceSupportTier: string;
    extractedEvidence: string;
  }>[];
  allowedClaimIntents: readonly Readonly<{
    claimKey: string;
    relevance: string;
    supportingEvidenceIds: readonly string[];
  }>[];
  entities: ContentBriefOutline["entities"];
  internalLinkTargets: ContentBriefOutline["internalLinkTargets"];
  brandVoice: BrandVoiceProfile | null;
  constraints: Readonly<{
    useOnlySuppliedEvidenceForFactualClaims: true;
    citationsMustReferenceEvidenceIds: true;
    doNotInventEntities: true;
    doNotInventInternalLinks: true;
    doNotResolveUnverifiedClaimsSilently: true;
    publicationNotAuthorized: true;
  }>;
}>;

export type ArticleSectionGenerator = (
  request: ArticleSectionGenerationRequest,
) => Promise<GeneratedArticleSection>;

export type ArticleClaimVerificationRequest = Readonly<{
  version: typeof UGP_ARTICLE_DRAFT_PIPELINE_VERSION;
  claimKey: string;
  claimText: string;
  requestedEvidenceIds: readonly string[];
  evidence: readonly Readonly<{
    evidenceId: string;
    sourceId: string;
    sourceSupportTier: string;
    extractedEvidence: string;
  }>[];
}>;

export type ArticleClaimVerificationResult = Readonly<{
  status: "verified" | "unsupported" | "conflicting" | "not_verified";
  evidenceIds: readonly string[];
  summary: string;
}>;

export type ArticleClaimVerifier = (
  request: ArticleClaimVerificationRequest,
) => Promise<ArticleClaimVerificationResult>;

export type ArticleDraftEvaluationRequest = Readonly<{
  version: typeof UGP_ARTICLE_DRAFT_PIPELINE_VERSION;
  dimension: ArticleEvaluationDimension;
  targetTopic: string;
  contentGoal: string;
  audience: string;
  intent: ContentBriefOutline["intent"];
  articleBody: string;
  sections: readonly Readonly<{
    sectionId: string;
    heading: string;
    text: string;
  }>[];
  brandVoice: BrandVoiceProfile | null;
}>;

export type ArticleDraftEvaluationResult = Readonly<{
  dimension: ArticleEvaluationDimension;
  status: "pass" | "warning" | "fail";
  score: number;
  summary: string;
}>;

export type ArticleDraftEvaluator = (
  request: ArticleDraftEvaluationRequest,
) => Promise<ArticleDraftEvaluationResult>;

export type ArticleFinishingAssets = Readonly<{
  metadata: Readonly<{
    title: string;
    metaDescription: string;
  }>;
  schemaPlan: readonly string[];
  mediaPlan: readonly Readonly<{
    purpose: string;
    placement: string;
    sourceRequirement: string;
  }>[];
}>;

export type ArticleFinishingAssetGenerator = (
  request: Readonly<{
    version: typeof UGP_ARTICLE_DRAFT_PIPELINE_VERSION;
    briefId: string;
    targetTopic: string;
    contentGoal: string;
    audience: string;
    intent: ContentBriefOutline["intent"];
    articleBody: string;
    entities: ContentBriefOutline["entities"];
  }>,
) => Promise<ArticleFinishingAssets>;

export type ArticleDraftPipelineResult = Readonly<{
  version: typeof UGP_ARTICLE_DRAFT_PIPELINE_VERSION;
  draftId: string;
  draftFingerprint: string;
  briefId: string;
  briefFingerprint: string;
  sourceEvidenceLedgerId: string;
  sourceEvidenceLedgerFingerprint: string;
  targetTopic: string;
  status:
    | "draft_complete"
    | "incomplete_evidence"
    | "generation_failed"
    | "verification_blocked"
    | "evaluation_failed";
  sections: readonly Readonly<{
    sectionId: string;
    order: number;
    headingIntent: string;
    generationStatus: "generated" | "blocked_unresolved_evidence" | "failed";
    heading: string | null;
    text: string | null;
    citationEvidenceIds: readonly string[];
    claims: readonly Readonly<{
      claimKey: string;
      claimText: string;
      evidenceIds: readonly string[];
      verificationStatus: ArticleClaimVerificationResult["status"];
      verificationSummary: string;
      verificationFingerprint: string;
    }>[];
    sectionFingerprint: string;
  }>[];
  articleBody: string | null;
  stages: readonly Readonly<{
    stage: ArticleDraftStage;
    status: ArticleStageStatus;
    summary: string;
    score: number | null;
    stageFingerprint: string;
  }>[];
  finishingAssets: ArticleFinishingAssets | null;
  blockers: readonly string[];
  warnings: readonly string[];
  provenance: Readonly<{
    contentBriefFingerprint: string;
    researchPlanFingerprint: string;
    sourceEvidenceLedgerFingerprint: string;
    contentOpportunityFingerprint: string;
    topicClusteringFingerprint: string;
  }>;
  semantics: Readonly<{
    evidenceBound: true;
    stageBased: true;
    builtInNetworkTransport: false;
    providerAdapterInjected: true;
    performsPersistence: false;
    publicationAuthorized: false;
    executionAuthorized: false;
    qualityGatePassed: false;
    requiresUGP75QualityGate: true;
    deterministicGivenFrozenInputsAndAdapterOutputs: true;
  }>;
}>;

const SEMANTICS = Object.freeze({
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
});

const EVALUATION_DIMENSIONS: readonly ArticleEvaluationDimension[] = Object.freeze([
  "coherence",
  "originality",
  "additive_value",
  "brand_voice",
  "seo",
  "aeo_geo",
]);

function exactText(value: unknown, field: string, max: number): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || value.length < 1
    || value.length > max
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_article_draft_invalid_" + field);
  }
  return value;
}

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("ugp_article_draft_invalid_" + field);
  }
  return value;
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function normalizeBrandVoice(
  value: BrandVoiceProfile | null | undefined,
): BrandVoiceProfile | null {
  if (value == null) return null;
  const profileId = exactText(value.profileId, "brand_voice_profile_id", 256);
  const evidenceFingerprint = exactFingerprint(
    value.evidenceFingerprint,
    "brand_voice_evidence_fingerprint",
  );
  if (!Array.isArray(value.guidelines) || value.guidelines.length < 1 || value.guidelines.length > 32) {
    throw new Error("ugp_article_draft_invalid_brand_voice_guidelines");
  }
  const guidelines = uniqueSorted(
    value.guidelines.map((item) => exactText(item, "brand_voice_guideline", 512)),
  );
  return Object.freeze({ profileId, evidenceFingerprint, guidelines });
}

function assertLineage(
  brief: ContentBriefOutline,
  ledger: SourceEvidenceLedger,
): void {
  if (
    brief.sourceEvidenceLedgerId !== ledger.ledgerId
    || brief.sourceEvidenceLedgerFingerprint !== ledger.ledgerFingerprint
    || brief.researchPlanFingerprint !== ledger.researchPlanFingerprint
    || brief.opportunityId !== ledger.opportunityId
    || brief.targetTopic !== ledger.targetTopic
  ) {
    throw new Error("ugp_article_draft_lineage_mismatch");
  }
}

function evidenceForSection(
  section: ContentBriefOutline["outline"][number],
  ledger: SourceEvidenceLedger,
) {
  const sourceById = new Map(ledger.sources.map((source) => [source.sourceId, source]));
  return Object.freeze(
    section.evidenceIds
      .map((id) => ledger.evidence.find((item) => item.evidenceId === id))
      .filter((item): item is ResearchEvidenceRecord => Boolean(item))
      .map((item) => {
        const source = sourceById.get(item.sourceId);
        if (!source) throw new Error("ugp_article_draft_missing_source");
        return Object.freeze({
          evidenceId: item.evidenceId,
          sourceId: item.sourceId,
          sourceKind: source.sourceKind,
          sourceSupportTier: source.supportTier,
          extractedEvidence: item.extractedEvidence,
        });
      }),
  );
}

function normalizeGeneratedSection(
  generated: GeneratedArticleSection,
  section: ContentBriefOutline["outline"][number],
  brief: ContentBriefOutline,
): GeneratedArticleSection {
  if (!generated || typeof generated !== "object" || Array.isArray(generated)) {
    throw new Error("ugp_article_draft_invalid_generated_section");
  }
  const heading = exactText(
    generated.heading,
    "generated_heading",
    UGP_ARTICLE_DRAFT_PIPELINE_POLICY.maxHeadingChars,
  );
  const body = exactText(
    generated.text,
    "generated_section_text",
    UGP_ARTICLE_DRAFT_PIPELINE_POLICY.maxSectionChars,
  );
  if (
    !Array.isArray(generated.citationEvidenceIds)
    || generated.citationEvidenceIds.length > UGP_ARTICLE_DRAFT_PIPELINE_POLICY.maxCitationsPerSection
  ) {
    throw new Error("ugp_article_draft_invalid_citations");
  }
  const citationEvidenceIds = uniqueSorted(
    generated.citationEvidenceIds.map((id) => exactFingerprint(id, "citation_evidence_id")),
  );
  const allowedEvidence = new Set(section.evidenceIds);
  if (citationEvidenceIds.some((id) => !allowedEvidence.has(id))) {
    throw new Error("ugp_article_draft_out_of_scope_citation");
  }

  if (
    !Array.isArray(generated.claims)
    || generated.claims.length > UGP_ARTICLE_DRAFT_PIPELINE_POLICY.maxClaimsPerSection
  ) {
    throw new Error("ugp_article_draft_invalid_claims");
  }
  const claimByKey = new Map(brief.claimIntents.map((claim) => [claim.claimKey, claim]));
  const claims = Object.freeze(
    generated.claims.map((claim) => {
      const claimKey = exactText(claim.claimKey, "claim_key", 256);
      const intent = claimByKey.get(claimKey);
      if (!intent) throw new Error("ugp_article_draft_unknown_claim_key");
      const claimText = exactText(claim.claimText, "claim_text", 2000);
      if (!Array.isArray(claim.evidenceIds) || claim.evidenceIds.length < 1) {
        throw new Error("ugp_article_draft_claim_without_evidence");
      }
      const evidenceIds = uniqueSorted(
        claim.evidenceIds.map((id) => exactFingerprint(id, "claim_evidence_id")),
      );
      const allowedClaimEvidence = new Set(intent.supportingEvidenceIds);
      if (
        evidenceIds.some((id) => !allowedEvidence.has(id) || !allowedClaimEvidence.has(id))
      ) {
        throw new Error("ugp_article_draft_out_of_scope_claim_evidence");
      }
      if (evidenceIds.some((id) => !citationEvidenceIds.includes(id))) {
        throw new Error("ugp_article_draft_claim_evidence_not_cited");
      }
      return Object.freeze({ claimKey, claimText, evidenceIds });
    }),
  );

  return Object.freeze({
    heading,
    text: body,
    citationEvidenceIds,
    claims,
  });
}

function stageRecord(
  stage: ArticleDraftStage,
  status: ArticleStageStatus,
  summary: string,
  score: number | null = null,
) {
  if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) {
    throw new Error("ugp_article_draft_invalid_stage_score");
  }
  const base = {
    stage,
    status,
    summary: exactText(summary, "stage_summary", 1024),
    score,
  };
  return Object.freeze({
    ...base,
    stageFingerprint: stableEvidenceHash({
      purpose: "ugp_article_draft_stage",
      version: UGP_ARTICLE_DRAFT_PIPELINE_VERSION,
      ...base,
    }),
  });
}

function validateFinishingAssets(
  value: ArticleFinishingAssets,
): ArticleFinishingAssets {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("ugp_article_draft_invalid_finishing_assets");
  }
  const title = exactText(
    value.metadata?.title,
    "metadata_title",
    UGP_ARTICLE_DRAFT_PIPELINE_POLICY.maxMetadataTitleChars,
  );
  const metaDescription = exactText(
    value.metadata?.metaDescription,
    "meta_description",
    UGP_ARTICLE_DRAFT_PIPELINE_POLICY.maxMetaDescriptionChars,
  );
  if (
    !Array.isArray(value.schemaPlan)
    || value.schemaPlan.length > UGP_ARTICLE_DRAFT_PIPELINE_POLICY.maxSchemaTypes
  ) {
    throw new Error("ugp_article_draft_invalid_schema_plan");
  }
  const schemaPlan = uniqueSorted(
    value.schemaPlan.map((item) => exactText(item, "schema_type", 128)),
  );
  if (
    !Array.isArray(value.mediaPlan)
    || value.mediaPlan.length > UGP_ARTICLE_DRAFT_PIPELINE_POLICY.maxMediaItems
  ) {
    throw new Error("ugp_article_draft_invalid_media_plan");
  }
  const mediaPlan = Object.freeze(
    value.mediaPlan.map((item) => Object.freeze({
      purpose: exactText(item.purpose, "media_purpose", 512),
      placement: exactText(item.placement, "media_placement", 256),
      sourceRequirement: exactText(item.sourceRequirement, "media_source_requirement", 512),
    })),
  );
  return Object.freeze({
    metadata: Object.freeze({ title, metaDescription }),
    schemaPlan,
    mediaPlan,
  });
}

export async function runArticleDraftPipeline(input: {
  brief: ContentBriefOutline;
  sourceEvidenceLedger: SourceEvidenceLedger;
  brandVoice?: BrandVoiceProfile | null;
  generateSection: ArticleSectionGenerator;
  verifyClaim: ArticleClaimVerifier;
  evaluateDraft: ArticleDraftEvaluator;
  generateFinishingAssets: ArticleFinishingAssetGenerator;
}): Promise<ArticleDraftPipelineResult> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_article_draft_invalid_input");
  }
  assertContentBriefOutlineIntegrity(input.brief);
  assertSourceEvidenceLedgerIntegrity(input.sourceEvidenceLedger);
  assertLineage(input.brief, input.sourceEvidenceLedger);

  if (
    typeof input.generateSection !== "function"
    || typeof input.verifyClaim !== "function"
    || typeof input.evaluateDraft !== "function"
    || typeof input.generateFinishingAssets !== "function"
  ) {
    throw new Error("ugp_article_draft_missing_adapter");
  }

  const brandVoice = normalizeBrandVoice(input.brandVoice);
  const sections: Array<ArticleDraftPipelineResult["sections"][number]> = [];
  const blockers: string[] = [];
  const warnings: string[] = [];
  let generationFailed = false;
  let verificationBlocked = false;

  for (const section of input.brief.outline) {
    if (section.unresolvedEvidenceClasses.length > 0) {
      const base = {
        sectionId: section.sectionId,
        order: section.order,
        headingIntent: section.headingIntent,
        generationStatus: "blocked_unresolved_evidence" as const,
        heading: null,
        text: null,
        citationEvidenceIds: Object.freeze([] as string[]),
        claims: Object.freeze([]),
      };
      blockers.push("section_unresolved_evidence:" + section.sectionId);
      sections.push(Object.freeze({
        ...base,
        sectionFingerprint: stableEvidenceHash({
          purpose: "ugp_article_draft_section",
          version: UGP_ARTICLE_DRAFT_PIPELINE_VERSION,
          ...base,
        }),
      }));
      continue;
    }

    const evidence = evidenceForSection(section, input.sourceEvidenceLedger);
    const allowedClaimIntents = Object.freeze(
      input.brief.claimIntents
        .filter((claim) =>
          claim.supportingEvidenceIds.some((id) => section.evidenceIds.includes(id)),
        )
        .map((claim) => Object.freeze({
          claimKey: claim.claimKey,
          relevance: claim.relevance,
          supportingEvidenceIds: claim.supportingEvidenceIds,
        })),
    );
    const request: ArticleSectionGenerationRequest = Object.freeze({
      version: UGP_ARTICLE_DRAFT_PIPELINE_VERSION,
      briefId: input.brief.briefId,
      briefFingerprint: input.brief.briefFingerprint,
      sectionId: section.sectionId,
      sectionOrder: section.order,
      targetTopic: input.brief.targetTopic,
      contentGoal: input.brief.contentGoal,
      audience: input.brief.audience,
      intent: input.brief.intent,
      headingIntent: section.headingIntent,
      purposeCode: section.purposeCode,
      evidence,
      allowedClaimIntents,
      entities: input.brief.entities,
      internalLinkTargets: input.brief.internalLinkTargets,
      brandVoice,
      constraints: Object.freeze({
        useOnlySuppliedEvidenceForFactualClaims: true as const,
        citationsMustReferenceEvidenceIds: true as const,
        doNotInventEntities: true as const,
        doNotInventInternalLinks: true as const,
        doNotResolveUnverifiedClaimsSilently: true as const,
        publicationNotAuthorized: true as const,
      }),
    });

    try {
      const generated = normalizeGeneratedSection(
        await input.generateSection(request),
        section,
        input.brief,
      );
      const verifiedClaims = [];
      for (const claim of generated.claims) {
        const verificationRequest: ArticleClaimVerificationRequest = Object.freeze({
          version: UGP_ARTICLE_DRAFT_PIPELINE_VERSION,
          claimKey: claim.claimKey,
          claimText: claim.claimText,
          requestedEvidenceIds: claim.evidenceIds,
          evidence: Object.freeze(
            claim.evidenceIds.map((id) => {
              const record = input.sourceEvidenceLedger.evidence.find(
                (item) => item.evidenceId === id,
              );
              if (!record) throw new Error("ugp_article_draft_missing_claim_evidence");
              const source = input.sourceEvidenceLedger.sources.find(
                (item) => item.sourceId === record.sourceId,
              );
              if (!source) throw new Error("ugp_article_draft_missing_claim_source");
              return Object.freeze({
                evidenceId: record.evidenceId,
                sourceId: record.sourceId,
                sourceSupportTier: source.supportTier,
                extractedEvidence: record.extractedEvidence,
              });
            }),
          ),
        });
        const verification = await input.verifyClaim(verificationRequest);
        if (
          !verification
          || !["verified", "unsupported", "conflicting", "not_verified"].includes(
            verification.status,
          )
        ) {
          throw new Error("ugp_article_draft_invalid_verification_result");
        }
        if (!Array.isArray(verification.evidenceIds)) {
          throw new Error("ugp_article_draft_invalid_verification_evidence");
        }
        const verificationEvidenceIds = uniqueSorted(
          verification.evidenceIds.map((id) =>
            exactFingerprint(id, "verification_evidence_id"),
          ),
        );
        if (
          verificationEvidenceIds.some((id) => !claim.evidenceIds.includes(id))
          || (verification.status === "verified" && verificationEvidenceIds.length < 1)
        ) {
          throw new Error("ugp_article_draft_verification_evidence_mismatch");
        }
        if (verification.status === "verified") {
          const hasInsufficientSource = verificationEvidenceIds.some((id) => {
            const record = input.sourceEvidenceLedger.evidence.find(
              (item) => item.evidenceId === id,
            );
            const source = input.sourceEvidenceLedger.sources.find(
              (item) => item.sourceId === record?.sourceId,
            );
            return !source || source.supportTier === "insufficient";
          });
          if (hasInsufficientSource) {
            throw new Error("ugp_article_draft_verified_with_insufficient_source");
          }
        } else {
          verificationBlocked = true;
          blockers.push(
            "claim_verification_" + verification.status + ":" + claim.claimKey,
          );
        }
        const summary = exactText(
          verification.summary,
          "verification_summary",
          1024,
        );
        const verificationBase = {
          claimKey: claim.claimKey,
          claimText: claim.claimText,
          evidenceIds: verificationEvidenceIds,
          verificationStatus: verification.status,
          verificationSummary: summary,
        };
        verifiedClaims.push(Object.freeze({
          ...verificationBase,
          verificationFingerprint: stableEvidenceHash({
            purpose: "ugp_article_claim_verification",
            version: UGP_ARTICLE_DRAFT_PIPELINE_VERSION,
            ...verificationBase,
          }),
        }));
      }

      const base = {
        sectionId: section.sectionId,
        order: section.order,
        headingIntent: section.headingIntent,
        generationStatus: "generated" as const,
        heading: generated.heading,
        text: generated.text,
        citationEvidenceIds: generated.citationEvidenceIds,
        claims: Object.freeze(verifiedClaims),
      };
      sections.push(Object.freeze({
        ...base,
        sectionFingerprint: stableEvidenceHash({
          purpose: "ugp_article_draft_section",
          version: UGP_ARTICLE_DRAFT_PIPELINE_VERSION,
          ...base,
        }),
      }));
    } catch (error) {
      generationFailed = true;
      blockers.push(
        "section_generation_failed:" + section.sectionId + ":" +
        (error instanceof Error ? error.message : "unknown"),
      );
      const base = {
        sectionId: section.sectionId,
        order: section.order,
        headingIntent: section.headingIntent,
        generationStatus: "failed" as const,
        heading: null,
        text: null,
        citationEvidenceIds: Object.freeze([] as string[]),
        claims: Object.freeze([]),
      };
      sections.push(Object.freeze({
        ...base,
        sectionFingerprint: stableEvidenceHash({
          purpose: "ugp_article_draft_section",
          version: UGP_ARTICLE_DRAFT_PIPELINE_VERSION,
          ...base,
        }),
      }));
    }
  }

  const orderedSections = Object.freeze(
    [...sections].sort((left, right) => left.order - right.order),
  );
  const allSectionsGenerated = orderedSections.every(
    (section) => section.generationStatus === "generated",
  );
  const articleBody = allSectionsGenerated
    ? orderedSections.map((section) => `## ${section.heading}\n\n${section.text}`).join("\n\n")
    : null;

  const stages = [];
  stages.push(stageRecord(
    "section_drafts",
    allSectionsGenerated ? "pass" : "blocked",
    allSectionsGenerated
      ? "All planned sections were generated."
      : "One or more sections could not be generated because evidence was unresolved or generation failed.",
  ));
  stages.push(stageRecord(
    "citation_binding",
    allSectionsGenerated ? "pass" : "blocked",
    allSectionsGenerated
      ? "All generated citation identifiers were validated against section evidence."
      : "Citation binding is incomplete because the full section set was not generated.",
  ));
  stages.push(stageRecord(
    "fact_verification",
    !allSectionsGenerated ? "blocked" : verificationBlocked ? "fail" : "pass",
    !allSectionsGenerated
      ? "Fact verification is incomplete because the full section set was not generated."
      : verificationBlocked
        ? "One or more generated claim uses were not verified."
        : "Every generated claim use returned a verified result from the injected verifier.",
  ));

  let evaluationFailed = false;
  if (allSectionsGenerated && !verificationBlocked && articleBody !== null) {
    for (const dimension of EVALUATION_DIMENSIONS) {
      if (dimension === "brand_voice" && brandVoice === null) {
        stages.push(stageRecord(
          "brand_voice",
          "blocked",
          "Brand voice evaluation requires an explicit evidence-fingerprinted brand voice profile.",
        ));
        blockers.push("missing_brand_voice_profile");
        evaluationFailed = true;
        continue;
      }
      const evaluation = await input.evaluateDraft(Object.freeze({
        version: UGP_ARTICLE_DRAFT_PIPELINE_VERSION,
        dimension,
        targetTopic: input.brief.targetTopic,
        contentGoal: input.brief.contentGoal,
        audience: input.brief.audience,
        intent: input.brief.intent,
        articleBody,
        sections: Object.freeze(
          orderedSections.map((section) => Object.freeze({
            sectionId: section.sectionId,
            heading: section.heading as string,
            text: section.text as string,
          })),
        ),
        brandVoice,
      }));
      if (
        !evaluation
        || evaluation.dimension !== dimension
        || !["pass", "warning", "fail"].includes(evaluation.status)
        || !Number.isFinite(evaluation.score)
        || evaluation.score < 0
        || evaluation.score > 100
      ) {
        throw new Error("ugp_article_draft_invalid_evaluation_result");
      }
      const mappedStage: ArticleDraftStage = dimension;
      stages.push(stageRecord(
        mappedStage,
        evaluation.status,
        evaluation.summary,
        evaluation.score,
      ));
      if (evaluation.status === "fail") {
        evaluationFailed = true;
        blockers.push("draft_evaluation_failed:" + dimension);
      } else if (evaluation.status === "warning") {
        warnings.push("draft_evaluation_warning:" + dimension);
      }
    }
  } else {
    for (const dimension of EVALUATION_DIMENSIONS) {
      stages.push(stageRecord(
        dimension,
        "skipped",
        "Draft evaluation was skipped because generation or fact verification was incomplete.",
      ));
    }
  }

  let finishingAssets: ArticleFinishingAssets | null = null;
  if (
    allSectionsGenerated
    && !verificationBlocked
    && !evaluationFailed
    && articleBody !== null
  ) {
    finishingAssets = validateFinishingAssets(
      await input.generateFinishingAssets(Object.freeze({
        version: UGP_ARTICLE_DRAFT_PIPELINE_VERSION,
        briefId: input.brief.briefId,
        targetTopic: input.brief.targetTopic,
        contentGoal: input.brief.contentGoal,
        audience: input.brief.audience,
        intent: input.brief.intent,
        articleBody,
        entities: input.brief.entities,
      })),
    );
    stages.push(stageRecord(
      "metadata",
      "pass",
      "Metadata assets were generated and normalized.",
    ));
    stages.push(stageRecord(
      "schema_media_plan",
      "pass",
      "Schema and media plans were generated and normalized.",
    ));
  } else {
    stages.push(stageRecord(
      "metadata",
      "skipped",
      "Metadata generation was skipped because the draft pipeline has unresolved blockers.",
    ));
    stages.push(stageRecord(
      "schema_media_plan",
      "skipped",
      "Schema/media planning was skipped because the draft pipeline has unresolved blockers.",
    ));
  }

  const status: ArticleDraftPipelineResult["status"] =
    input.brief.unresolvedEvidenceClasses.length > 0
      || orderedSections.some((section) => section.generationStatus === "blocked_unresolved_evidence")
      ? "incomplete_evidence"
      : generationFailed
        ? "generation_failed"
        : verificationBlocked
          ? "verification_blocked"
          : evaluationFailed
            ? "evaluation_failed"
            : "draft_complete";

  const base = {
    version: UGP_ARTICLE_DRAFT_PIPELINE_VERSION,
    briefId: input.brief.briefId,
    briefFingerprint: input.brief.briefFingerprint,
    sourceEvidenceLedgerId: input.sourceEvidenceLedger.ledgerId,
    sourceEvidenceLedgerFingerprint: input.sourceEvidenceLedger.ledgerFingerprint,
    targetTopic: input.brief.targetTopic,
    status,
    sections: orderedSections,
    articleBody,
    stages: Object.freeze(stages),
    finishingAssets,
    blockers: uniqueSorted(blockers),
    warnings: uniqueSorted(warnings),
    provenance: Object.freeze({
      contentBriefFingerprint: input.brief.briefFingerprint,
      researchPlanFingerprint: input.brief.researchPlanFingerprint,
      sourceEvidenceLedgerFingerprint: input.sourceEvidenceLedger.ledgerFingerprint,
      contentOpportunityFingerprint: input.brief.provenance.contentOpportunityFingerprint,
      topicClusteringFingerprint: input.brief.provenance.topicClusteringFingerprint,
    }),
    semantics: SEMANTICS,
  };

  const draftFingerprint = stableEvidenceHash({
    purpose: "ugp_article_draft_pipeline",
    ...base,
  });

  return Object.freeze({
    ...base,
    draftId: stableEvidenceHash({
      purpose: "ugp_article_draft_pipeline_id",
      version: UGP_ARTICLE_DRAFT_PIPELINE_VERSION,
      briefId: input.brief.briefId,
      draftFingerprint,
    }),
    draftFingerprint,
  });
}

export function assertArticleDraftPipelineIntegrity(
  result: ArticleDraftPipelineResult,
): void {
  if (!result || result.version !== UGP_ARTICLE_DRAFT_PIPELINE_VERSION) {
    throw new Error("ugp_article_draft_version_invalid");
  }
  if (
    result.semantics.evidenceBound !== true
    || result.semantics.stageBased !== true
    || result.semantics.builtInNetworkTransport !== false
    || result.semantics.providerAdapterInjected !== true
    || result.semantics.performsPersistence !== false
    || result.semantics.publicationAuthorized !== false
    || result.semantics.executionAuthorized !== false
    || result.semantics.qualityGatePassed !== false
    || result.semantics.requiresUGP75QualityGate !== true
    || result.semantics.deterministicGivenFrozenInputsAndAdapterOutputs !== true
  ) {
    throw new Error("ugp_article_draft_unsafe_semantics");
  }
  exactFingerprint(result.draftId, "draft_id");
  exactFingerprint(result.draftFingerprint, "draft_fingerprint");
  exactFingerprint(result.briefId, "brief_id");
  exactFingerprint(result.briefFingerprint, "brief_fingerprint");
  exactFingerprint(result.sourceEvidenceLedgerId, "ledger_id");
  exactFingerprint(result.sourceEvidenceLedgerFingerprint, "ledger_fingerprint");

  const { draftId: _draftId, draftFingerprint, ...base } = result;
  const expected = stableEvidenceHash({
    purpose: "ugp_article_draft_pipeline",
    ...base,
  });
  if (draftFingerprint !== expected) {
    throw new Error("ugp_article_draft_fingerprint_mismatch");
  }
  const expectedId = stableEvidenceHash({
    purpose: "ugp_article_draft_pipeline_id",
    version: UGP_ARTICLE_DRAFT_PIPELINE_VERSION,
    briefId: result.briefId,
    draftFingerprint,
  });
  if (result.draftId !== expectedId) {
    throw new Error("ugp_article_draft_id_mismatch");
  }
}
