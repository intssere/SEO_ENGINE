import {
  assertArticleDraftPipelineIntegrity,
  type ArticleDraftPipelineResult,
} from "./article-draft-pipeline-contract.js";
import {
  assertContentBriefOutlineIntegrity,
  type ContentBriefOutline,
} from "./content-brief-outline-contract.js";
import {
  assertSourceEvidenceLedgerIntegrity,
  type SourceEvidenceLedger,
} from "./source-evidence-ledger-contract.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const UGP_ARTICLE_QUALITY_GATE_VERSION =
  "ugp-7-5-article-quality-gate-v1" as const;

export type ArticleQualityCheckId =
  | "important_claim_support"
  | "citation_integrity"
  | "duplication_cannibalization"
  | "unsafe_prohibited_content"
  | "intent_requirements"
  | "low_value_scaled_content";

export type ArticleQualityCheckStatus = "pass" | "blocked";

export type ExternalQualityAssessment = Readonly<{
  checkId:
    | "duplication_cannibalization"
    | "unsafe_prohibited_content"
    | "low_value_scaled_content";
  status: ArticleQualityCheckStatus;
  summary: string;
  evidenceRefs: readonly string[];
  assessmentFingerprint: string;
}>;

export type ArticleQualityGateResult = Readonly<{
  version: typeof UGP_ARTICLE_QUALITY_GATE_VERSION;
  gateId: string;
  gateFingerprint: string;
  draftId: string;
  draftFingerprint: string;
  briefId: string;
  briefFingerprint: string;
  sourceEvidenceLedgerId: string;
  sourceEvidenceLedgerFingerprint: string;
  status: "pass" | "blocked";
  approvalEligible: boolean;
  checks: readonly Readonly<{
    checkId: ArticleQualityCheckId;
    status: ArticleQualityCheckStatus;
    summary: string;
    evidenceRefs: readonly string[];
    checkFingerprint: string;
  }>[];
  blockingReasons: readonly string[];
  provenance: Readonly<{
    contentBriefFingerprint: string;
    sourceEvidenceLedgerFingerprint: string;
    articleDraftFingerprint: string;
    contentOpportunityFingerprint: string;
    topicClusteringFingerprint: string;
  }>;
  semantics: Readonly<{
    deterministic: true;
    failClosed: true;
    separateFromGeneration: true;
    modelConfidenceIsNotQualityGate: true;
    performsNetworkOperation: false;
    performsPersistence: false;
    publicationAuthorized: false;
    executionAuthorized: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
}>;

const SEMANTICS = Object.freeze({
  deterministic: true as const,
  failClosed: true as const,
  separateFromGeneration: true as const,
  modelConfidenceIsNotQualityGate: true as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  publicationAuthorized: false as const,
  executionAuthorized: false as const,
  providerWrites: false as const,
  publicSiteWrites: false as const,
});

function exactText(value: unknown, field: string, max = 2048): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || value.length < 1
    || value.length > max
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_article_quality_invalid_" + field);
  }
  return value;
}

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("ugp_article_quality_invalid_" + field);
  }
  return value;
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function assertLineage(
  draft: ArticleDraftPipelineResult,
  brief: ContentBriefOutline,
  ledger: SourceEvidenceLedger,
): void {
  if (
    draft.briefId !== brief.briefId
    || draft.briefFingerprint !== brief.briefFingerprint
    || draft.sourceEvidenceLedgerId !== ledger.ledgerId
    || draft.sourceEvidenceLedgerFingerprint !== ledger.ledgerFingerprint
    || brief.sourceEvidenceLedgerId !== ledger.ledgerId
    || brief.sourceEvidenceLedgerFingerprint !== ledger.ledgerFingerprint
  ) {
    throw new Error("ugp_article_quality_lineage_mismatch");
  }
}

function checkRecord(
  checkId: ArticleQualityCheckId,
  status: ArticleQualityCheckStatus,
  summary: string,
  evidenceRefs: readonly string[],
) {
  const base = {
    checkId,
    status,
    summary: exactText(summary, "check_summary", 2048),
    evidenceRefs: uniqueSorted(
      evidenceRefs.map((value) => exactText(value, "evidence_ref", 512)),
    ),
  };
  return Object.freeze({
    ...base,
    checkFingerprint: stableEvidenceHash({
      purpose: "ugp_article_quality_check",
      version: UGP_ARTICLE_QUALITY_GATE_VERSION,
      ...base,
    }),
  });
}

function normalizeExternalAssessments(
  assessments: readonly ExternalQualityAssessment[],
): ReadonlyMap<ExternalQualityAssessment["checkId"], ExternalQualityAssessment> {
  if (!Array.isArray(assessments)) {
    throw new Error("ugp_article_quality_invalid_external_assessments");
  }
  const map = new Map<ExternalQualityAssessment["checkId"], ExternalQualityAssessment>();
  for (const assessment of assessments) {
    if (
      !assessment
      || ![
        "duplication_cannibalization",
        "unsafe_prohibited_content",
        "low_value_scaled_content",
      ].includes(assessment.checkId)
      || !["pass", "blocked"].includes(assessment.status)
    ) {
      throw new Error("ugp_article_quality_invalid_external_assessment");
    }
    if (map.has(assessment.checkId)) {
      throw new Error("ugp_article_quality_duplicate_external_assessment");
    }
    const normalized = Object.freeze({
      checkId: assessment.checkId,
      status: assessment.status,
      summary: exactText(assessment.summary, "external_summary", 2048),
      evidenceRefs: uniqueSorted(
        assessment.evidenceRefs.map((value: string) =>
          exactText(value, "external_evidence_ref", 512),
        ),
      ),
      assessmentFingerprint: exactFingerprint(
        assessment.assessmentFingerprint,
        "external_assessment_fingerprint",
      ),
    });
    const expected = stableEvidenceHash({
      purpose: "ugp_article_quality_external_assessment",
      version: UGP_ARTICLE_QUALITY_GATE_VERSION,
      checkId: normalized.checkId,
      status: normalized.status,
      summary: normalized.summary,
      evidenceRefs: normalized.evidenceRefs,
    });
    if (normalized.assessmentFingerprint !== expected) {
      throw new Error("ugp_article_quality_external_assessment_fingerprint_mismatch");
    }
    map.set(normalized.checkId, normalized);
  }
  return map;
}

function importantClaimSupportCheck(draft: ArticleDraftPipelineResult) {
  if (draft.status !== "draft_complete") {
    return checkRecord(
      "important_claim_support",
      "blocked",
      "The article draft did not complete the UGP-7.4 pipeline.",
      ["draft_status:" + draft.status],
    );
  }
  const bad = draft.sections.flatMap((section) =>
    section.claims.filter((claim) => claim.verificationStatus !== "verified"),
  );
  if (bad.length > 0) {
    return checkRecord(
      "important_claim_support",
      "blocked",
      "One or more generated factual claims are not verified.",
      bad.map((claim) => "claim:" + claim.claimKey + ":" + claim.verificationStatus),
    );
  }
  return checkRecord(
    "important_claim_support",
    "pass",
    "All generated factual claim uses are verified in the frozen UGP-7.4 draft.",
    draft.sections.flatMap((section) =>
      section.claims.map((claim) => "verification:" + claim.verificationFingerprint),
    ),
  );
}

function citationIntegrityCheck(
  draft: ArticleDraftPipelineResult,
  ledger: SourceEvidenceLedger,
) {
  const evidenceIds = new Set(ledger.evidence.map((item) => item.evidenceId));
  const broken: string[] = [];
  for (const section of draft.sections) {
    if (section.generationStatus !== "generated") {
      broken.push("section_not_generated:" + section.sectionId);
      continue;
    }
    for (const citation of section.citationEvidenceIds) {
      if (!evidenceIds.has(citation)) broken.push("unknown_citation:" + citation);
    }
    for (const claim of section.claims) {
      for (const evidenceId of claim.evidenceIds) {
        if (
          !evidenceIds.has(evidenceId)
          || !section.citationEvidenceIds.includes(evidenceId)
        ) {
          broken.push("claim_citation_mismatch:" + claim.claimKey + ":" + evidenceId);
        }
      }
    }
  }
  if (broken.length > 0) {
    return checkRecord(
      "citation_integrity",
      "blocked",
      "Broken or mismatched citation bindings were detected.",
      broken,
    );
  }
  return checkRecord(
    "citation_integrity",
    "pass",
    "Every frozen citation and claim-evidence binding resolves to the certified UGP-7.2 ledger.",
    draft.sections.flatMap((section) =>
      section.citationEvidenceIds.map((id) => "evidence:" + id),
    ),
  );
}

function intentRequirementsCheck(
  draft: ArticleDraftPipelineResult,
  brief: ContentBriefOutline,
) {
  if (!draft.articleBody) {
    return checkRecord(
      "intent_requirements",
      "blocked",
      "Intent requirements cannot pass without a complete article body.",
      ["article_body:missing"],
    );
  }
  const missingQuestions = brief.outline
    .filter((planned) => {
      const generated = draft.sections.find(
        (section) => section.sectionId === planned.sectionId,
      );
      return !generated || generated.generationStatus !== "generated";
    })
    .map((planned) => "missing_section:" + planned.sectionId);

  const stageProblems = draft.stages
    .filter((stage) =>
      ["seo", "aeo_geo", "coherence", "additive_value"].includes(stage.stage)
      && !["pass", "warning"].includes(stage.status),
    )
    .map((stage) => "stage:" + stage.stage + ":" + stage.status);

  const blockers = [...missingQuestions, ...stageProblems];
  if (blockers.length > 0) {
    return checkRecord(
      "intent_requirements",
      "blocked",
      "The draft is missing one or more brief/intent requirements.",
      blockers,
    );
  }

  return checkRecord(
    "intent_requirements",
    "pass",
    "The complete draft covers every planned outline section and cleared the intent-relevant UGP-7.4 draft stages.",
    brief.outline.map((section) => "section:" + section.sectionId),
  );
}

export function buildArticleQualityGate(input: {
  draft: ArticleDraftPipelineResult;
  brief: ContentBriefOutline;
  sourceEvidenceLedger: SourceEvidenceLedger;
  externalAssessments: readonly ExternalQualityAssessment[];
}): ArticleQualityGateResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_article_quality_invalid_input");
  }
  assertArticleDraftPipelineIntegrity(input.draft);
  assertContentBriefOutlineIntegrity(input.brief);
  assertSourceEvidenceLedgerIntegrity(input.sourceEvidenceLedger);
  assertLineage(input.draft, input.brief, input.sourceEvidenceLedger);

  const external = normalizeExternalAssessments(input.externalAssessments);
  const requiredExternal = [
    "duplication_cannibalization",
    "unsafe_prohibited_content",
    "low_value_scaled_content",
  ] as const;
  for (const checkId of requiredExternal) {
    if (!external.has(checkId)) {
      throw new Error("ugp_article_quality_missing_external_assessment:" + checkId);
    }
  }

  const checks = [
    importantClaimSupportCheck(input.draft),
    citationIntegrityCheck(input.draft, input.sourceEvidenceLedger),
    checkRecord(
      "duplication_cannibalization",
      external.get("duplication_cannibalization")!.status,
      external.get("duplication_cannibalization")!.summary,
      [
        "assessment:" + external.get("duplication_cannibalization")!.assessmentFingerprint,
        ...external.get("duplication_cannibalization")!.evidenceRefs,
      ],
    ),
    checkRecord(
      "unsafe_prohibited_content",
      external.get("unsafe_prohibited_content")!.status,
      external.get("unsafe_prohibited_content")!.summary,
      [
        "assessment:" + external.get("unsafe_prohibited_content")!.assessmentFingerprint,
        ...external.get("unsafe_prohibited_content")!.evidenceRefs,
      ],
    ),
    intentRequirementsCheck(input.draft, input.brief),
    checkRecord(
      "low_value_scaled_content",
      external.get("low_value_scaled_content")!.status,
      external.get("low_value_scaled_content")!.summary,
      [
        "assessment:" + external.get("low_value_scaled_content")!.assessmentFingerprint,
        ...external.get("low_value_scaled_content")!.evidenceRefs,
      ],
    ),
  ] as const;

  const blockingReasons = uniqueSorted(
    checks
      .filter((check) => check.status === "blocked")
      .map((check) => check.checkId + ":" + check.summary),
  );
  const status: ArticleQualityGateResult["status"] = blockingReasons.length === 0 ? "pass" : "blocked";
  const base = {
    version: UGP_ARTICLE_QUALITY_GATE_VERSION,
    draftId: input.draft.draftId,
    draftFingerprint: input.draft.draftFingerprint,
    briefId: input.brief.briefId,
    briefFingerprint: input.brief.briefFingerprint,
    sourceEvidenceLedgerId: input.sourceEvidenceLedger.ledgerId,
    sourceEvidenceLedgerFingerprint: input.sourceEvidenceLedger.ledgerFingerprint,
    status,
    approvalEligible: status === "pass",
    checks: Object.freeze([...checks]),
    blockingReasons,
    provenance: Object.freeze({
      contentBriefFingerprint: input.brief.briefFingerprint,
      sourceEvidenceLedgerFingerprint: input.sourceEvidenceLedger.ledgerFingerprint,
      articleDraftFingerprint: input.draft.draftFingerprint,
      contentOpportunityFingerprint: input.brief.provenance.contentOpportunityFingerprint,
      topicClusteringFingerprint: input.brief.provenance.topicClusteringFingerprint,
    }),
    semantics: SEMANTICS,
  };
  const gateFingerprint = stableEvidenceHash({
    purpose: "ugp_article_quality_gate",
    ...base,
  });

  return Object.freeze({
    ...base,
    gateId: stableEvidenceHash({
      purpose: "ugp_article_quality_gate_id",
      version: UGP_ARTICLE_QUALITY_GATE_VERSION,
      draftId: input.draft.draftId,
      gateFingerprint,
    }),
    gateFingerprint,
  });
}

export function assertArticleQualityGateIntegrity(
  result: ArticleQualityGateResult,
): void {
  if (!result || result.version !== UGP_ARTICLE_QUALITY_GATE_VERSION) {
    throw new Error("ugp_article_quality_version_invalid");
  }
  if (
    result.semantics.deterministic !== true
    || result.semantics.failClosed !== true
    || result.semantics.separateFromGeneration !== true
    || result.semantics.modelConfidenceIsNotQualityGate !== true
    || result.semantics.performsNetworkOperation !== false
    || result.semantics.performsPersistence !== false
    || result.semantics.publicationAuthorized !== false
    || result.semantics.executionAuthorized !== false
    || result.semantics.providerWrites !== false
    || result.semantics.publicSiteWrites !== false
  ) {
    throw new Error("ugp_article_quality_unsafe_semantics");
  }
  exactFingerprint(result.gateId, "gate_id");
  exactFingerprint(result.gateFingerprint, "gate_fingerprint");

  const { gateId: _gateId, gateFingerprint, ...base } = result;
  const expected = stableEvidenceHash({
    purpose: "ugp_article_quality_gate",
    ...base,
  });
  if (gateFingerprint !== expected) {
    throw new Error("ugp_article_quality_fingerprint_mismatch");
  }
  const expectedId = stableEvidenceHash({
    purpose: "ugp_article_quality_gate_id",
    version: UGP_ARTICLE_QUALITY_GATE_VERSION,
    draftId: result.draftId,
    gateFingerprint,
  });
  if (result.gateId !== expectedId) {
    throw new Error("ugp_article_quality_id_mismatch");
  }
}
