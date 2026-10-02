import {
  assertContentOpportunityModelIntegrity,
  type ContentOpportunity,
  type ContentOpportunityAction,
  type ContentOpportunityModelResult,
} from "./content-opportunity-model-contract.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const UGP_RESEARCH_PLAN_VERSION =
  "ugp-7-1-research-plan-v1" as const;

export const UGP_RESEARCH_PLAN_POLICY = Object.freeze({
  maxQuestions: 12,
  maxEvidenceClasses: 12,
  maxDiscoverySteps: 12,
  researchEligibleActions: Object.freeze([
    "create_candidate",
    "refresh_candidate",
    "consolidate_candidate",
  ] as const),
} as const);

export type ResearchEvidenceClass =
  | "search_intent_context"
  | "existing_site_content"
  | "primary_authoritative_sources"
  | "current_secondary_sources"
  | "first_party_business_evidence"
  | "comparative_evidence"
  | "definitions_and_background"
  | "claim_verification"
  | "freshness_and_date_evidence"
  | "measurement_baseline";

export type ResearchDiscoveryChannel =
  | "certified_upstream_evidence"
  | "site_inventory"
  | "official_primary_sources"
  | "reputable_secondary_sources"
  | "standards_or_regulatory_sources"
  | "current_search_context"
  | "first_party_business_sources";

export type ResearchQuestion = Readonly<{
  questionId: string;
  question: string;
  purposeCode: string;
  requiredEvidenceClasses: readonly ResearchEvidenceClass[];
  questionFingerprint: string;
}>;

export type ResearchDiscoveryStep = Readonly<{
  stepId: string;
  order: number;
  channel: ResearchDiscoveryChannel;
  purposeCode: string;
  requiredEvidenceClasses: readonly ResearchEvidenceClass[];
  stopCondition: string;
  stepFingerprint: string;
}>;

export type ResearchPlan = Readonly<{
  version: typeof UGP_RESEARCH_PLAN_VERSION;
  planId: string;
  planFingerprint: string;
  opportunityId: string;
  opportunityFingerprint: string;
  targetTopic: string;
  recommendedAction: Extract<
    ContentOpportunityAction,
    "create_candidate" | "refresh_candidate" | "consolidate_candidate"
  >;
  searchIntent: ContentOpportunity["searchIntent"];
  recommendedContentType: ContentOpportunity["recommendedContentType"];
  objective: string;
  questions: readonly ResearchQuestion[];
  requiredEvidenceClasses: readonly ResearchEvidenceClass[];
  discoveryPlan: readonly ResearchDiscoveryStep[];
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
    readOnly: true;
    deterministic: true;
    planningOnly: true;
    performsNetworkOperation: false;
    performsSourceAcquisition: false;
    performsPersistence: false;
    generatesArticleText: false;
    generatesClaims: false;
    verifiesClaims: false;
    grantsAuthorization: false;
    publicationAuthorized: false;
    executionAuthorized: false;
  }>;
}>;

const SEMANTICS = Object.freeze({
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
});

const ACTIONS = new Set(UGP_RESEARCH_PLAN_POLICY.researchEligibleActions);
const CODE = /^[a-z0-9][a-z0-9._:-]{0,95}$/;

function exactText(value: unknown, field: string, max = 1024): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || value.length < 1
    || value.length > max
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_research_plan_invalid_" + field);
  }
  return value;
}

function exactCode(value: string): string {
  const normalized = exactText(value, "code", 96).toLocaleLowerCase("en-US");
  if (!CODE.test(normalized)) throw new Error("ugp_research_plan_invalid_code");
  return normalized;
}

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("ugp_research_plan_invalid_" + field);
  }
  return value;
}

function evidenceClassesFor(opportunity: ContentOpportunity): readonly ResearchEvidenceClass[] {
  const values = new Set<ResearchEvidenceClass>([
    "search_intent_context",
    "existing_site_content",
    "primary_authoritative_sources",
    "current_secondary_sources",
    "first_party_business_evidence",
    "claim_verification",
    "freshness_and_date_evidence",
    "measurement_baseline",
  ]);

  if (
    opportunity.searchIntent === "commercial"
    || opportunity.recommendedContentType === "comparison_or_category"
  ) {
    values.add("comparative_evidence");
  }

  if (
    opportunity.searchIntent === "informational"
    || opportunity.searchIntent === "unknown"
    || opportunity.searchIntent === "mixed"
  ) {
    values.add("definitions_and_background");
  }

  return Object.freeze([...values].sort());
}

function questionSpecs(opportunity: ContentOpportunity): ReadonlyArray<{
  question: string;
  purposeCode: string;
  requiredEvidenceClasses: readonly ResearchEvidenceClass[];
}> {
  const topic = opportunity.targetTopic;
  const base: Array<{
    question: string;
    purposeCode: string;
    requiredEvidenceClasses: readonly ResearchEvidenceClass[];
  }> = [
    {
      question: `What search intent and user need must content about "${topic}" satisfy?`,
      purposeCode: "establish_search_intent",
      requiredEvidenceClasses: ["search_intent_context"],
    },
    {
      question: `What existing site content already addresses "${topic}", and what must be preserved or differentiated?`,
      purposeCode: "protect_existing_site_coverage",
      requiredEvidenceClasses: ["existing_site_content"],
    },
    {
      question: `Which important factual statements about "${topic}" require support from authoritative primary sources?`,
      purposeCode: "identify_primary_source_claims",
      requiredEvidenceClasses: ["primary_authoritative_sources", "claim_verification"],
    },
    {
      question: `Which current facts or developments about "${topic}" require recent secondary-source confirmation?`,
      purposeCode: "identify_current_secondary_evidence",
      requiredEvidenceClasses: ["current_secondary_sources", "freshness_and_date_evidence"],
    },
    {
      question: `Which business-specific facts are relevant to "${topic}" and must come from first-party business evidence?`,
      purposeCode: "bind_business_context",
      requiredEvidenceClasses: ["first_party_business_evidence"],
    },
    {
      question: `What baseline search measurements should be preserved for later observational evaluation of "${topic}"?`,
      purposeCode: "define_measurement_baseline",
      requiredEvidenceClasses: ["measurement_baseline"],
    },
  ];

  if (
    opportunity.searchIntent === "commercial"
    || opportunity.recommendedContentType === "comparison_or_category"
  ) {
    base.push({
      question: `What comparison dimensions are necessary to address the commercial intent behind "${topic}" without unsupported superiority claims?`,
      purposeCode: "define_comparison_dimensions",
      requiredEvidenceClasses: ["comparative_evidence", "claim_verification"],
    });
  }

  if (
    opportunity.searchIntent === "informational"
    || opportunity.searchIntent === "unknown"
    || opportunity.searchIntent === "mixed"
  ) {
    base.push({
      question: `What definitions, concepts, and background are necessary for a reader to understand "${topic}" accurately?`,
      purposeCode: "establish_background",
      requiredEvidenceClasses: ["definitions_and_background", "primary_authoritative_sources"],
    });
  }

  if (opportunity.recommendedAction === "refresh_candidate") {
    base.push({
      question: `Which parts of the existing coverage for "${topic}" are outdated, incomplete, or insufficiently evidenced?`,
      purposeCode: "identify_refresh_delta",
      requiredEvidenceClasses: [
        "existing_site_content",
        "current_secondary_sources",
        "freshness_and_date_evidence",
      ],
    });
  }

  if (opportunity.recommendedAction === "consolidate_candidate") {
    base.push({
      question: `Where do the competing pages for "${topic}" overlap, diverge, or contain unique evidence that must be retained during consolidation review?`,
      purposeCode: "map_consolidation_overlap",
      requiredEvidenceClasses: [
        "existing_site_content",
        "claim_verification",
      ],
    });
  }

  if (opportunity.recommendedAction === "create_candidate") {
    base.push({
      question: `What evidence is required to create new coverage for "${topic}" without duplicating existing site material?`,
      purposeCode: "define_new_content_evidence_boundary",
      requiredEvidenceClasses: [
        "existing_site_content",
        "primary_authoritative_sources",
        "current_secondary_sources",
      ],
    });
  }

  if (base.length > UGP_RESEARCH_PLAN_POLICY.maxQuestions) {
    throw new Error("ugp_research_plan_question_limit_exceeded");
  }
  return Object.freeze(base);
}

function discoverySpecs(
  opportunity: ContentOpportunity,
): ReadonlyArray<{
  channel: ResearchDiscoveryChannel;
  purposeCode: string;
  requiredEvidenceClasses: readonly ResearchEvidenceClass[];
  stopCondition: string;
}> {
  const steps: Array<{
    channel: ResearchDiscoveryChannel;
    purposeCode: string;
    requiredEvidenceClasses: readonly ResearchEvidenceClass[];
    stopCondition: string;
  }> = [
    {
      channel: "certified_upstream_evidence",
      purposeCode: "freeze_upstream_content_intelligence",
      requiredEvidenceClasses: ["search_intent_context", "measurement_baseline"],
      stopCondition: "Exact UGP-6.4 opportunity lineage and measurement context are captured.",
    },
    {
      channel: "site_inventory",
      purposeCode: opportunity.recommendedAction === "consolidate_candidate"
        ? "map_competing_site_content"
        : "map_existing_site_content",
      requiredEvidenceClasses: ["existing_site_content"],
      stopCondition: "Relevant supplied site pages and their distinct roles are identified without adding uncrawled assumptions.",
    },
    {
      channel: "first_party_business_sources",
      purposeCode: "collect_business_specific_facts",
      requiredEvidenceClasses: ["first_party_business_evidence"],
      stopCondition: "Every planned business-specific claim has an identified first-party evidence requirement or is excluded.",
    },
    {
      channel: "official_primary_sources",
      purposeCode: "collect_primary_authoritative_evidence",
      requiredEvidenceClasses: ["primary_authoritative_sources", "claim_verification"],
      stopCondition: "Important factual claim areas have a primary-source target where such a source is reasonably expected.",
    },
    {
      channel: "reputable_secondary_sources",
      purposeCode: "collect_current_secondary_evidence",
      requiredEvidenceClasses: ["current_secondary_sources", "freshness_and_date_evidence"],
      stopCondition: "Time-sensitive and contextual claim areas have recent independent evidence targets.",
    },
    {
      channel: "current_search_context",
      purposeCode: "validate_current_intent_context",
      requiredEvidenceClasses: ["search_intent_context"],
      stopCondition: "Current search-context evidence is sufficient to confirm or challenge the frozen intent assumptions without changing them silently.",
    },
  ];

  if (
    opportunity.searchIntent === "commercial"
    || opportunity.recommendedContentType === "comparison_or_category"
  ) {
    steps.push({
      channel: "reputable_secondary_sources",
      purposeCode: "collect_comparative_evidence",
      requiredEvidenceClasses: ["comparative_evidence", "claim_verification"],
      stopCondition: "Each planned comparison dimension has an evidence target and unsupported superiority claims are excluded.",
    });
  }

  if (
    opportunity.searchIntent === "informational"
    || opportunity.searchIntent === "unknown"
    || opportunity.searchIntent === "mixed"
  ) {
    steps.push({
      channel: "standards_or_regulatory_sources",
      purposeCode: "collect_definitions_and_background",
      requiredEvidenceClasses: ["definitions_and_background", "primary_authoritative_sources"],
      stopCondition: "Core definitions and background concepts have authoritative evidence targets where applicable.",
    });
  }

  if (steps.length > UGP_RESEARCH_PLAN_POLICY.maxDiscoverySteps) {
    throw new Error("ugp_research_plan_discovery_limit_exceeded");
  }
  return Object.freeze(steps);
}

function objectiveFor(opportunity: ContentOpportunity): string {
  if (opportunity.recommendedAction === "create_candidate") {
    return `Build an evidence plan for new ${opportunity.recommendedContentType} coverage of "${opportunity.targetTopic}" while preserving the UGP-6 cannibalization and coverage guard.`;
  }
  if (opportunity.recommendedAction === "refresh_candidate") {
    return `Build an evidence plan to refresh existing coverage of "${opportunity.targetTopic}" without discarding supported material or fabricating missing evidence.`;
  }
  return `Build an evidence plan for consolidation review of competing coverage for "${opportunity.targetTopic}" while preserving unique supported material and without authorizing page changes.`;
}

export function buildResearchPlan(input: {
  opportunityModel: ContentOpportunityModelResult;
  opportunityId: string;
}): ResearchPlan {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_research_plan_invalid_input");
  }

  assertContentOpportunityModelIntegrity(input.opportunityModel);
  const opportunityId = exactFingerprint(input.opportunityId, "opportunity_id");
  const matches = input.opportunityModel.opportunities.filter(
    (opportunity) => opportunity.opportunityId === opportunityId,
  );
  if (matches.length !== 1) {
    throw new Error("ugp_research_plan_opportunity_not_found");
  }

  const opportunity = matches[0];
  if (!ACTIONS.has(opportunity.recommendedAction as any)) {
    throw new Error("ugp_research_plan_opportunity_not_research_eligible");
  }

  const eligibleAction = opportunity.recommendedAction as Extract<
    ContentOpportunityAction,
    "create_candidate" | "refresh_candidate" | "consolidate_candidate"
  >;

  const questionInputs = questionSpecs(opportunity);
  const questions = Object.freeze(
    questionInputs.map((question, index): ResearchQuestion => {
      const base = {
        question: exactText(question.question, "question"),
        purposeCode: exactCode(question.purposeCode),
        requiredEvidenceClasses: Object.freeze(
          [...new Set(question.requiredEvidenceClasses)].sort(),
        ),
      };
      const questionFingerprint = stableEvidenceHash({
        purpose: "ugp_research_question",
        version: UGP_RESEARCH_PLAN_VERSION,
        opportunityFingerprint: opportunity.opportunityFingerprint,
        ordinal: index + 1,
        ...base,
      });
      return Object.freeze({
        questionId: stableEvidenceHash({
          purpose: "ugp_research_question_id",
          questionFingerprint,
        }),
        ...base,
        questionFingerprint,
      });
    }),
  );

  const requiredEvidenceClasses = evidenceClassesFor(opportunity);
  if (
    requiredEvidenceClasses.length
    > UGP_RESEARCH_PLAN_POLICY.maxEvidenceClasses
  ) {
    throw new Error("ugp_research_plan_evidence_class_limit_exceeded");
  }

  const discoveryInputs = discoverySpecs(opportunity);
  const discoveryPlan = Object.freeze(
    discoveryInputs.map((step, index): ResearchDiscoveryStep => {
      const base = {
        order: index + 1,
        channel: step.channel,
        purposeCode: exactCode(step.purposeCode),
        requiredEvidenceClasses: Object.freeze(
          [...new Set(step.requiredEvidenceClasses)].sort(),
        ),
        stopCondition: exactText(step.stopCondition, "stop_condition"),
      };
      const stepFingerprint = stableEvidenceHash({
        purpose: "ugp_research_discovery_step",
        version: UGP_RESEARCH_PLAN_VERSION,
        opportunityFingerprint: opportunity.opportunityFingerprint,
        ...base,
      });
      return Object.freeze({
        stepId: stableEvidenceHash({
          purpose: "ugp_research_discovery_step_id",
          stepFingerprint,
        }),
        ...base,
        stepFingerprint,
      });
    }),
  );

  const limitations = Object.freeze(
    [...new Set([
      ...opportunity.limitations,
      "source_acquisition_not_performed",
      "claim_verification_not_performed",
      "article_generation_not_performed",
    ])].sort(),
  );

  const provenance = Object.freeze({
    contentOpportunityModelFingerprint:
      input.opportunityModel.opportunityModelFingerprint,
    contentOpportunityFingerprint: opportunity.opportunityFingerprint,
    topicClusteringFingerprint:
      opportunity.evidence.topicClusteringFingerprint,
    coverageAssessmentFingerprint:
      opportunity.evidence.coverageAssessmentFingerprint,
    cannibalizationAssessmentFingerprint:
      opportunity.evidence.cannibalizationAssessmentFingerprint,
    businessRelevanceEvidenceFingerprint:
      opportunity.evidence.businessRelevanceEvidenceFingerprint,
  });

  const base = {
    version: UGP_RESEARCH_PLAN_VERSION,
    opportunityId: opportunity.opportunityId,
    opportunityFingerprint: opportunity.opportunityFingerprint,
    targetTopic: opportunity.targetTopic,
    recommendedAction: eligibleAction,
    searchIntent: opportunity.searchIntent,
    recommendedContentType: opportunity.recommendedContentType,
    objective: objectiveFor(opportunity),
    questions,
    requiredEvidenceClasses,
    discoveryPlan,
    limitations,
    provenance,
    semantics: SEMANTICS,
  };

  const planFingerprint = stableEvidenceHash({
    purpose: "ugp_research_plan",
    ...base,
  });

  return Object.freeze({
    ...base,
    planId: stableEvidenceHash({
      purpose: "ugp_research_plan_id",
      version: UGP_RESEARCH_PLAN_VERSION,
      opportunityId: opportunity.opportunityId,
      planFingerprint,
    }),
    planFingerprint,
  });
}

export function assertResearchPlanIntegrity(result: ResearchPlan): void {
  if (!result || result.version !== UGP_RESEARCH_PLAN_VERSION) {
    throw new Error("ugp_research_plan_version_invalid");
  }
  if (
    result.semantics.readOnly !== true
    || result.semantics.deterministic !== true
    || result.semantics.planningOnly !== true
    || result.semantics.performsNetworkOperation !== false
    || result.semantics.performsSourceAcquisition !== false
    || result.semantics.performsPersistence !== false
    || result.semantics.generatesArticleText !== false
    || result.semantics.generatesClaims !== false
    || result.semantics.verifiesClaims !== false
    || result.semantics.grantsAuthorization !== false
    || result.semantics.publicationAuthorized !== false
    || result.semantics.executionAuthorized !== false
  ) {
    throw new Error("ugp_research_plan_unsafe_semantics");
  }
  if (!ACTIONS.has(result.recommendedAction)) {
    throw new Error("ugp_research_plan_invalid_action");
  }
  if (
    result.questions.length < 1
    || result.questions.length > UGP_RESEARCH_PLAN_POLICY.maxQuestions
    || result.discoveryPlan.length < 1
    || result.discoveryPlan.length > UGP_RESEARCH_PLAN_POLICY.maxDiscoverySteps
    || result.requiredEvidenceClasses.length < 1
    || result.requiredEvidenceClasses.length
      > UGP_RESEARCH_PLAN_POLICY.maxEvidenceClasses
  ) {
    throw new Error("ugp_research_plan_bounds_invalid");
  }

  for (let index = 0; index < result.discoveryPlan.length; index += 1) {
    if (result.discoveryPlan[index].order !== index + 1) {
      throw new Error("ugp_research_plan_discovery_order_invalid");
    }
  }

  exactFingerprint(result.opportunityId, "opportunity_id");
  exactFingerprint(result.opportunityFingerprint, "opportunity_fingerprint");
  exactFingerprint(result.planId, "plan_id");
  exactFingerprint(result.provenance.contentOpportunityModelFingerprint, "content_opportunity_model_fingerprint");
  exactFingerprint(result.provenance.contentOpportunityFingerprint, "content_opportunity_fingerprint");
  exactFingerprint(result.provenance.topicClusteringFingerprint, "topic_clustering_fingerprint");
  exactFingerprint(result.provenance.coverageAssessmentFingerprint, "coverage_assessment_fingerprint");
  exactFingerprint(result.provenance.cannibalizationAssessmentFingerprint, "cannibalization_assessment_fingerprint");
  exactFingerprint(result.provenance.businessRelevanceEvidenceFingerprint, "business_relevance_evidence_fingerprint");

  const {
    planId: _planId,
    planFingerprint,
    ...base
  } = result;
  const expected = stableEvidenceHash({
    purpose: "ugp_research_plan",
    ...base,
  });
  if (
    exactFingerprint(planFingerprint, "plan_fingerprint") !== expected
  ) {
    throw new Error("ugp_research_plan_fingerprint_mismatch");
  }
  const expectedId = stableEvidenceHash({
    purpose: "ugp_research_plan_id",
    version: UGP_RESEARCH_PLAN_VERSION,
    opportunityId: result.opportunityId,
    planFingerprint,
  });
  if (result.planId !== expectedId) {
    throw new Error("ugp_research_plan_id_mismatch");
  }
}
