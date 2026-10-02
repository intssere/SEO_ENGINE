import {
  assertResearchPlanIntegrity,
  type ResearchPlan,
} from "./research-plan-contract.js";
import {
  assertSourceEvidenceLedgerIntegrity,
  type SourceEvidenceLedger,
} from "./source-evidence-ledger-contract.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const UGP_CONTENT_BRIEF_OUTLINE_VERSION =
  "ugp-7-3-content-brief-outline-v1" as const;

export const UGP_CONTENT_BRIEF_OUTLINE_POLICY = Object.freeze({
  maxSections: 16,
  maxClaimIntents: 64,
  maxEntities: 32,
  maxInternalLinkTargets: 32,
} as const);

export type BriefEntityKind =
  | "product"
  | "business"
  | "service"
  | "organization"
  | "other";

export type BriefEntityInput = Readonly<{
  entityKey: string;
  displayName: string;
  kind: BriefEntityKind;
  supportingEvidenceIds: readonly string[];
}>;

export type InternalLinkTargetInput = Readonly<{
  targetUrl: string;
  targetLabel: string;
  supportingEvidenceIds: readonly string[];
}>;

export type BriefClaimIntent = Readonly<{
  claimKey: string;
  relevance: "direct" | "supporting" | "contextual" | "not_assessed";
  supportingEvidenceIds: readonly string[];
  sourceIds: readonly string[];
  verificationState: "unverified_evidence_linked";
  claimIntentFingerprint: string;
}>;

export type BriefOutlineSection = Readonly<{
  sectionId: string;
  order: number;
  headingIntent: string;
  purposeCode: string;
  questionIds: readonly string[];
  evidenceIds: readonly string[];
  unresolvedEvidenceClasses: readonly string[];
  sectionFingerprint: string;
}>;

export type ContentBriefOutline = Readonly<{
  version: typeof UGP_CONTENT_BRIEF_OUTLINE_VERSION;
  briefId: string;
  briefFingerprint: string;
  researchPlanId: string;
  researchPlanFingerprint: string;
  sourceEvidenceLedgerId: string;
  sourceEvidenceLedgerFingerprint: string;
  opportunityId: string;
  targetTopic: string;
  contentGoal: string;
  audience: string;
  intent: ResearchPlan["searchIntent"];
  recommendedContentType: ResearchPlan["recommendedContentType"];
  recommendedAction: ResearchPlan["recommendedAction"];
  questions: readonly Readonly<{
    questionId: string;
    question: string;
    purposeCode: string;
  }>[];
  claimIntents: readonly BriefClaimIntent[];
  entities: readonly Readonly<{
    entityKey: string;
    displayName: string;
    kind: BriefEntityKind;
    supportingEvidenceIds: readonly string[];
    entityFingerprint: string;
  }>[];
  internalLinkTargets: readonly Readonly<{
    targetUrl: string;
    targetLabel: string;
    supportingEvidenceIds: readonly string[];
    linkTargetFingerprint: string;
  }>[];
  outline: readonly BriefOutlineSection[];
  unresolvedEvidenceClasses: readonly string[];
  limitations: readonly string[];
  provenance: Readonly<{
    contentOpportunityModelFingerprint: string;
    contentOpportunityFingerprint: string;
    topicClusteringFingerprint: string;
    coverageAssessmentFingerprint: string;
    cannibalizationAssessmentFingerprint: string;
    businessRelevanceEvidenceFingerprint: string;
  }>;
  semantics: Readonly<{
    deterministic: true;
    evidenceGrounded: true;
    planningOnly: true;
    claimsRemainUnverified: true;
    performsNetworkOperation: false;
    performsPersistence: false;
    generatesArticleProse: false;
    grantsAuthorization: false;
    publicationAuthorized: false;
    executionAuthorized: false;
  }>;
}>;

const SEMANTICS = Object.freeze({
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
});

const ENTITY_KINDS = new Set<BriefEntityKind>([
  "product", "business", "service", "organization", "other",
]);

function text(value: unknown, field: string, max = 1024): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || value.length < 1
    || value.length > max
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_brief_outline_invalid_" + field);
  }
  return value;
}

function fingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("ugp_brief_outline_invalid_" + field);
  }
  return value;
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function audienceFor(plan: ResearchPlan): string {
  if (plan.searchIntent === "transactional") {
    return "Users evaluating or preparing to act on the target topic.";
  }
  if (plan.searchIntent === "commercial") {
    return "Users comparing options, attributes, or tradeoffs related to the target topic.";
  }
  if (plan.searchIntent === "navigational") {
    return "Users seeking a specific business, product, service, or destination related to the target topic.";
  }
  if (plan.searchIntent === "informational") {
    return "Users seeking accurate, useful understanding of the target topic.";
  }
  return "Users whose intent requires explicit clarification before final article drafting.";
}

function goalFor(plan: ResearchPlan): string {
  if (plan.recommendedAction === "create_candidate") {
    return `Create a research-grounded content specification for new coverage of "${plan.targetTopic}" without duplicating existing supplied site evidence.`;
  }
  if (plan.recommendedAction === "refresh_candidate") {
    return `Create a research-grounded content specification for refreshing existing coverage of "${plan.targetTopic}" while preserving supported material.`;
  }
  return `Create a research-grounded content specification for consolidating competing coverage of "${plan.targetTopic}" while preserving unique supported material.`;
}

function assertLineage(plan: ResearchPlan, ledger: SourceEvidenceLedger): void {
  if (
    ledger.researchPlanId !== plan.planId
    || ledger.researchPlanFingerprint !== plan.planFingerprint
    || ledger.opportunityId !== plan.opportunityId
    || ledger.targetTopic !== plan.targetTopic
  ) {
    throw new Error("ugp_brief_outline_research_lineage_mismatch");
  }
  const keys = [
    "contentOpportunityModelFingerprint",
    "contentOpportunityFingerprint",
    "topicClusteringFingerprint",
    "coverageAssessmentFingerprint",
    "cannibalizationAssessmentFingerprint",
    "businessRelevanceEvidenceFingerprint",
  ] as const;
  for (const key of keys) {
    if (ledger.provenance[key] !== plan.provenance[key]) {
      throw new Error("ugp_brief_outline_provenance_mismatch");
    }
  }
}

function normalizeEvidenceRefs(
  values: readonly string[],
  evidenceIds: ReadonlySet<string>,
  field: string,
): readonly string[] {
  if (!Array.isArray(values) || values.length < 1) {
    throw new Error("ugp_brief_outline_invalid_" + field);
  }
  const normalized = uniqueSorted(values.map((value) => fingerprint(value, field)));
  if (normalized.some((value) => !evidenceIds.has(value))) {
    throw new Error("ugp_brief_outline_unknown_evidence_ref");
  }
  return normalized;
}

export function buildContentBriefOutline(input: {
  researchPlan: ResearchPlan;
  sourceEvidenceLedger: SourceEvidenceLedger;
  entities?: readonly BriefEntityInput[];
  internalLinkTargets?: readonly InternalLinkTargetInput[];
}): ContentBriefOutline {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_brief_outline_invalid_input");
  }

  assertResearchPlanIntegrity(input.researchPlan);
  assertSourceEvidenceLedgerIntegrity(input.sourceEvidenceLedger);
  assertLineage(input.researchPlan, input.sourceEvidenceLedger);

  const evidenceIds = new Set(
    input.sourceEvidenceLedger.evidence.map((item) => item.evidenceId),
  );

  const questions = Object.freeze(
    input.researchPlan.questions.map((question) => Object.freeze({
      questionId: question.questionId,
      question: question.question,
      purposeCode: question.purposeCode,
    })),
  );

  const claimMap = new Map<string, {
    relevance: BriefClaimIntent["relevance"];
    evidenceIds: Set<string>;
    sourceIds: Set<string>;
  }>();
  for (const evidence of input.sourceEvidenceLedger.evidence) {
    for (const claim of evidence.claimRefs) {
      const current = claimMap.get(claim.claimKey) ?? {
        relevance: claim.relevance,
        evidenceIds: new Set<string>(),
        sourceIds: new Set<string>(),
      };
      current.evidenceIds.add(evidence.evidenceId);
      current.sourceIds.add(evidence.sourceId);
      if (current.relevance !== claim.relevance) {
        current.relevance = "not_assessed";
      }
      claimMap.set(claim.claimKey, current);
    }
  }
  if (claimMap.size > UGP_CONTENT_BRIEF_OUTLINE_POLICY.maxClaimIntents) {
    throw new Error("ugp_brief_outline_claim_limit_exceeded");
  }
  const claimIntents = Object.freeze(
    [...claimMap.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([claimKey, value]): BriefClaimIntent => {
        const base = {
          claimKey,
          relevance: value.relevance,
          supportingEvidenceIds: uniqueSorted([...value.evidenceIds]),
          sourceIds: uniqueSorted([...value.sourceIds]),
          verificationState: "unverified_evidence_linked" as const,
        };
        return Object.freeze({
          ...base,
          claimIntentFingerprint: stableEvidenceHash({
            purpose: "ugp_content_brief_claim_intent",
            version: UGP_CONTENT_BRIEF_OUTLINE_VERSION,
            ...base,
          }),
        });
      }),
  );

  const entitiesInput = input.entities ?? [];
  if (entitiesInput.length > UGP_CONTENT_BRIEF_OUTLINE_POLICY.maxEntities) {
    throw new Error("ugp_brief_outline_entity_limit_exceeded");
  }
  const entities = Object.freeze(
    entitiesInput.map((entity) => {
      if (!ENTITY_KINDS.has(entity.kind)) {
        throw new Error("ugp_brief_outline_invalid_entity_kind");
      }
      const base = {
        entityKey: text(entity.entityKey, "entity_key", 256),
        displayName: text(entity.displayName, "entity_display_name", 256),
        kind: entity.kind,
        supportingEvidenceIds: normalizeEvidenceRefs(
          entity.supportingEvidenceIds,
          evidenceIds,
          "entity_evidence_id",
        ),
      };
      return Object.freeze({
        ...base,
        entityFingerprint: stableEvidenceHash({
          purpose: "ugp_content_brief_entity",
          version: UGP_CONTENT_BRIEF_OUTLINE_VERSION,
          ...base,
        }),
      });
    }).sort((left, right) =>
      left.entityKey.localeCompare(right.entityKey)
      || left.entityFingerprint.localeCompare(right.entityFingerprint),
    ),
  );
  if (new Set(entities.map((entity) => entity.entityKey)).size !== entities.length) {
    throw new Error("ugp_brief_outline_duplicate_entity");
  }

  const linksInput = input.internalLinkTargets ?? [];
  if (linksInput.length > UGP_CONTENT_BRIEF_OUTLINE_POLICY.maxInternalLinkTargets) {
    throw new Error("ugp_brief_outline_link_limit_exceeded");
  }
  const internalLinkTargets = Object.freeze(
    linksInput.map((link) => {
      let targetUrl: string;
      try {
        const url = new URL(text(link.targetUrl, "target_url", 2048));
        url.hash = "";
        targetUrl = url.toString();
      } catch {
        throw new Error("ugp_brief_outline_invalid_target_url");
      }
      const base = {
        targetUrl,
        targetLabel: text(link.targetLabel, "target_label", 256),
        supportingEvidenceIds: normalizeEvidenceRefs(
          link.supportingEvidenceIds,
          evidenceIds,
          "link_evidence_id",
        ),
      };
      return Object.freeze({
        ...base,
        linkTargetFingerprint: stableEvidenceHash({
          purpose: "ugp_content_brief_internal_link_target",
          version: UGP_CONTENT_BRIEF_OUTLINE_VERSION,
          ...base,
        }),
      });
    }).sort((left, right) =>
      left.targetUrl.localeCompare(right.targetUrl)
      || left.linkTargetFingerprint.localeCompare(right.linkTargetFingerprint),
    ),
  );
  if (
    new Set(internalLinkTargets.map((link) => link.targetUrl)).size
    !== internalLinkTargets.length
  ) {
    throw new Error("ugp_brief_outline_duplicate_link_target");
  }

  const outline = Object.freeze(
    input.researchPlan.questions.map((question, index): BriefOutlineSection => {
      const matchingEvidence = input.sourceEvidenceLedger.evidence
        .filter((item) => item.questionIds.includes(question.questionId))
        .map((item) => item.evidenceId);
      const observedClasses = new Set(
        input.sourceEvidenceLedger.evidence
          .filter((item) => item.questionIds.includes(question.questionId))
          .flatMap((item) => item.evidenceClasses),
      );
      const unresolvedEvidenceClasses = uniqueSorted(
        question.requiredEvidenceClasses.filter(
          (evidenceClass) => !observedClasses.has(evidenceClass),
        ),
      );
      const base = {
        order: index + 1,
        headingIntent: question.question,
        purposeCode: question.purposeCode,
        questionIds: Object.freeze([question.questionId]),
        evidenceIds: uniqueSorted(matchingEvidence),
        unresolvedEvidenceClasses,
      };
      const sectionFingerprint = stableEvidenceHash({
        purpose: "ugp_content_brief_outline_section",
        version: UGP_CONTENT_BRIEF_OUTLINE_VERSION,
        ...base,
      });
      return Object.freeze({
        sectionId: stableEvidenceHash({
          purpose: "ugp_content_brief_outline_section_id",
          sectionFingerprint,
        }),
        ...base,
        sectionFingerprint,
      });
    }),
  );
  if (outline.length > UGP_CONTENT_BRIEF_OUTLINE_POLICY.maxSections) {
    throw new Error("ugp_brief_outline_section_limit_exceeded");
  }

  const limitations = uniqueSorted([
    ...input.researchPlan.limitations,
    ...input.sourceEvidenceLedger.unresolvedEvidenceClasses.map(
      (value) => "unresolved_evidence_class:" + value,
    ),
    "claims_remain_unverified",
    "article_prose_not_generated",
  ]);

  const base = {
    version: UGP_CONTENT_BRIEF_OUTLINE_VERSION,
    researchPlanId: input.researchPlan.planId,
    researchPlanFingerprint: input.researchPlan.planFingerprint,
    sourceEvidenceLedgerId: input.sourceEvidenceLedger.ledgerId,
    sourceEvidenceLedgerFingerprint: input.sourceEvidenceLedger.ledgerFingerprint,
    opportunityId: input.researchPlan.opportunityId,
    targetTopic: input.researchPlan.targetTopic,
    contentGoal: goalFor(input.researchPlan),
    audience: audienceFor(input.researchPlan),
    intent: input.researchPlan.searchIntent,
    recommendedContentType: input.researchPlan.recommendedContentType,
    recommendedAction: input.researchPlan.recommendedAction,
    questions,
    claimIntents,
    entities,
    internalLinkTargets,
    outline,
    unresolvedEvidenceClasses: input.sourceEvidenceLedger.unresolvedEvidenceClasses,
    limitations,
    provenance: input.researchPlan.provenance,
    semantics: SEMANTICS,
  };

  const briefFingerprint = stableEvidenceHash({
    purpose: "ugp_content_brief_outline",
    ...base,
  });

  return Object.freeze({
    ...base,
    briefId: stableEvidenceHash({
      purpose: "ugp_content_brief_outline_id",
      version: UGP_CONTENT_BRIEF_OUTLINE_VERSION,
      opportunityId: input.researchPlan.opportunityId,
      briefFingerprint,
    }),
    briefFingerprint,
  });
}

export function assertContentBriefOutlineIntegrity(
  result: ContentBriefOutline,
): void {
  if (!result || result.version !== UGP_CONTENT_BRIEF_OUTLINE_VERSION) {
    throw new Error("ugp_brief_outline_version_invalid");
  }
  if (
    result.semantics.deterministic !== true
    || result.semantics.evidenceGrounded !== true
    || result.semantics.planningOnly !== true
    || result.semantics.claimsRemainUnverified !== true
    || result.semantics.performsNetworkOperation !== false
    || result.semantics.performsPersistence !== false
    || result.semantics.generatesArticleProse !== false
    || result.semantics.grantsAuthorization !== false
    || result.semantics.publicationAuthorized !== false
    || result.semantics.executionAuthorized !== false
  ) {
    throw new Error("ugp_brief_outline_unsafe_semantics");
  }
  fingerprint(result.briefId, "brief_id");
  fingerprint(result.briefFingerprint, "brief_fingerprint");
  fingerprint(result.researchPlanId, "research_plan_id");
  fingerprint(result.researchPlanFingerprint, "research_plan_fingerprint");
  fingerprint(result.sourceEvidenceLedgerId, "source_evidence_ledger_id");
  fingerprint(
    result.sourceEvidenceLedgerFingerprint,
    "source_evidence_ledger_fingerprint",
  );

  const { briefId: _briefId, briefFingerprint, ...base } = result;
  const expected = stableEvidenceHash({
    purpose: "ugp_content_brief_outline",
    ...base,
  });
  if (briefFingerprint !== expected) {
    throw new Error("ugp_brief_outline_fingerprint_mismatch");
  }

  const expectedId = stableEvidenceHash({
    purpose: "ugp_content_brief_outline_id",
    version: UGP_CONTENT_BRIEF_OUTLINE_VERSION,
    opportunityId: result.opportunityId,
    briefFingerprint,
  });
  if (result.briefId !== expectedId) {
    throw new Error("ugp_brief_outline_id_mismatch");
  }
}
