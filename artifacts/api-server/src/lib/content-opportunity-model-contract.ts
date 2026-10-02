import {
  stableEvidenceHash,
  type NormalizedSearchIntent,
  type SearchMarket,
} from "./keyword-serp-evidence-contract.js";
import {
  assertCannibalizationDetectionIntegrity,
  type CannibalizationDetectionResult,
  type CannibalizationClusterState,
} from "./cannibalization-detection-contract.js";
import {
  assertTopicCoverageClassificationIntegrity,
  type TopicCoverageClassificationResult,
  type TopicCoverageState,
} from "./topic-coverage-classification-contract.js";
import type {
  TopicCluster,
  TopicClusteringResult,
} from "./topic-clustering-contract.js";

export const UGP_CONTENT_OPPORTUNITY_MODEL_VERSION =
  "ugp-6-4-content-opportunity-model-v1" as const;

export const UGP_CONTENT_OPPORTUNITY_MODEL_POLICY = Object.freeze({
  minimumBusinessRelevanceForActionCandidate: 0.5,
  requireCompleteObservedInventoryForCreateCandidate: true,
  requireQueryPageEvidenceForCreateCandidate: true,
} as const);

export type ContentOpportunityAction =
  | "create_candidate"
  | "refresh_candidate"
  | "consolidate_candidate"
  | "leave_alone"
  | "defer_insufficient_evidence";

export type RecommendedContentType =
  | "article_or_guide"
  | "comparison_or_category"
  | "landing_or_product_support"
  | "navigation_or_brand_support"
  | "mixed_or_unknown_intent_review";

export type ContentOpportunityMeasurementMethod =
  | "gsc_query_page_before_after_observational"
  | "ongoing_search_observation"
  | "not_planned_until_evidence_complete";

export type ContentOpportunityBusinessRelevanceEvidence = Readonly<{
  clusterFingerprint: string;
  relevance: number;
  rationaleCode: string;
  sourceId: string;
  sourceFingerprint: string;
  evidenceFingerprint: string;
}>;

export type ContentOpportunity = Readonly<{
  opportunityId: string;
  opportunityFingerprint: string;
  clusterFingerprint: string;
  representativeKeyword: string;
  targetTopic: string;
  searchIntent: NormalizedSearchIntent | "mixed";
  recommendedContentType: RecommendedContentType;
  recommendedAction: ContentOpportunityAction;
  existingCoverage: TopicCoverageState;
  cannibalizationState: CannibalizationClusterState;
  businessRelevance: Readonly<{
    relevance: number;
    rationaleCode: string;
    evidenceFingerprint: string;
  }>;
  evidence: Readonly<{
    topicClusteringFingerprint: string;
    coverageAssessmentFingerprint: string;
    cannibalizationAssessmentFingerprint: string;
    businessRelevanceEvidenceFingerprint: string;
  }>;
  expectedMeasurement: Readonly<{
    method: ContentOpportunityMeasurementMethod;
    causalAttribution: false;
  }>;
  limitations: readonly string[];
  rationale: readonly string[];
}>;

export type ContentOpportunityModelResult = Readonly<{
  version: typeof UGP_CONTENT_OPPORTUNITY_MODEL_VERSION;
  market: SearchMarket;
  policy: typeof UGP_CONTENT_OPPORTUNITY_MODEL_POLICY;
  provenance: Readonly<{
    topicClusteringFingerprint: string;
    siteOwnershipEvidenceFingerprint: string;
    cannibalizationFingerprint: string;
    coverageFingerprint: string;
  }>;
  opportunities: readonly ContentOpportunity[];
  summary: Readonly<Record<ContentOpportunityAction, number>>;
  semantics: Readonly<{
    readOnly: true;
    deterministic: true;
    evidenceBacked: true;
    grantsAuthorization: false;
    grantsProviderWrite: false;
    grantsPublicSiteWrite: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    publicationAuthorized: false;
    executionAuthorized: false;
    causalAttribution: false;
  }>;
  opportunityModelFingerprint: string;
}>;

const SEMANTICS = Object.freeze({
  readOnly: true as const,
  deterministic: true as const,
  evidenceBacked: true as const,
  grantsAuthorization: false as const,
  grantsProviderWrite: false as const,
  grantsPublicSiteWrite: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  publicationAuthorized: false as const,
  executionAuthorized: false as const,
  causalAttribution: false as const,
});

const RATIONALE_CODE = /^[a-z0-9][a-z0-9._:-]{0,95}$/;

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("ugp_content_opportunity_invalid_" + field);
  }
  return value;
}

function exactToken(value: unknown, field: string, max = 160): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || value.length < 1
    || value.length > max
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_content_opportunity_invalid_" + field);
  }
  return value;
}

function marketKey(market: SearchMarket): string {
  return [
    market.searchEngine,
    String(market.locationCode),
    market.languageCode,
    market.device,
  ].join("|");
}

function assertTopicClusteringIntegrity(result: TopicClusteringResult): void {
  if (
    !result
    || result.version !== "ugp-6-2a-deterministic-topic-clustering-v1"
  ) {
    throw new Error("ugp_content_opportunity_topic_clustering_version_invalid");
  }
  if (
    result.semantics.readOnly !== true
    || result.semantics.deterministic !== true
    || result.semantics.grantsAuthorization !== false
    || result.semantics.grantsProviderWrite !== false
    || result.semantics.grantsPublicSiteWrite !== false
    || result.semantics.performsNetworkOperation !== false
    || result.semantics.performsPersistence !== false
  ) {
    throw new Error("ugp_content_opportunity_topic_clustering_unsafe_semantics");
  }

  const { clusteringFingerprint, ...base } = result;
  const expected = stableEvidenceHash({
    purpose: "ugp_topic_clustering_result",
    ...base,
  });
  if (
    exactFingerprint(clusteringFingerprint, "topic_clustering_fingerprint")
    !== expected
  ) {
    throw new Error("ugp_content_opportunity_topic_clustering_integrity_failed");
  }

  for (const cluster of result.clusters) {
    const expectedCluster = stableEvidenceHash({
      purpose: "ugp_topic_cluster",
      version: "ugp-6-2a-deterministic-topic-clustering-v1",
      representativeKeyword: cluster.representativeKeyword,
      members: cluster.members,
    });
    if (
      exactFingerprint(cluster.clusterFingerprint, "cluster_fingerprint")
      !== expectedCluster
    ) {
      throw new Error("ugp_content_opportunity_cluster_integrity_failed");
    }
  }
}

function businessEvidenceFingerprint(
  input: Omit<ContentOpportunityBusinessRelevanceEvidence, "evidenceFingerprint">,
): string {
  return stableEvidenceHash({
    purpose: "ugp_content_opportunity_business_relevance",
    version: UGP_CONTENT_OPPORTUNITY_MODEL_VERSION,
    ...input,
  });
}

export function buildContentOpportunityBusinessRelevanceEvidence(input: {
  clusterFingerprint: string;
  relevance: number;
  rationaleCode: string;
  sourceId: string;
  sourceFingerprint: string;
}): ContentOpportunityBusinessRelevanceEvidence {
  const clusterFingerprint = exactFingerprint(
    input.clusterFingerprint,
    "business_cluster_fingerprint",
  );
  if (
    typeof input.relevance !== "number"
    || !Number.isFinite(input.relevance)
    || input.relevance < 0
    || input.relevance > 1
  ) {
    throw new Error("ugp_content_opportunity_invalid_business_relevance");
  }
  const rationaleCode = exactToken(
    input.rationaleCode,
    "business_rationale_code",
    96,
  ).toLocaleLowerCase("en-US");
  if (!RATIONALE_CODE.test(rationaleCode)) {
    throw new Error("ugp_content_opportunity_invalid_business_rationale_code");
  }
  const sourceId = exactToken(input.sourceId, "business_source_id");
  const sourceFingerprint = exactFingerprint(
    input.sourceFingerprint,
    "business_source_fingerprint",
  );
  const base = {
    clusterFingerprint,
    relevance: Math.round(input.relevance * 1_000_000) / 1_000_000,
    rationaleCode,
    sourceId,
    sourceFingerprint,
  };
  return Object.freeze({
    ...base,
    evidenceFingerprint: businessEvidenceFingerprint(base),
  });
}

function assertBusinessEvidenceIntegrity(
  evidence: ContentOpportunityBusinessRelevanceEvidence,
): void {
  const rebuilt = buildContentOpportunityBusinessRelevanceEvidence(evidence);
  if (rebuilt.evidenceFingerprint !== evidence.evidenceFingerprint) {
    throw new Error("ugp_content_opportunity_business_evidence_integrity_failed");
  }
}

function dominantIntent(cluster: TopicCluster): NormalizedSearchIntent | "mixed" {
  const counts = new Map<NormalizedSearchIntent, number>();
  for (const member of cluster.members) {
    counts.set(member.intent, (counts.get(member.intent) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  );
  if (ranked.length === 0) return "mixed";
  if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) return "mixed";
  return ranked[0][0];
}

function contentTypeForIntent(
  intent: NormalizedSearchIntent | "mixed",
): RecommendedContentType {
  if (intent === "informational") return "article_or_guide";
  if (intent === "commercial") return "comparison_or_category";
  if (intent === "transactional") return "landing_or_product_support";
  if (intent === "navigational") return "navigation_or_brand_support";
  return "mixed_or_unknown_intent_review";
}

function measurementMethod(
  action: ContentOpportunityAction,
): ContentOpportunityMeasurementMethod {
  if (
    action === "create_candidate"
    || action === "refresh_candidate"
    || action === "consolidate_candidate"
  ) {
    return "gsc_query_page_before_after_observational";
  }
  if (action === "leave_alone") return "ongoing_search_observation";
  return "not_planned_until_evidence_complete";
}

function actionFor(input: {
  relevance: number;
  coverage: TopicCoverageState;
  cannibalization: CannibalizationClusterState;
  missingEvidence: readonly string[];
}): {
  action: ContentOpportunityAction;
  rationale: readonly string[];
  limitations: readonly string[];
} {
  const rationale: string[] = [];
  const limitations = [...input.missingEvidence];

  if (
    input.relevance
    < UGP_CONTENT_OPPORTUNITY_MODEL_POLICY.minimumBusinessRelevanceForActionCandidate
  ) {
    rationale.push("business_relevance_below_action_candidate_threshold");
    return {
      action: "leave_alone",
      rationale: Object.freeze(rationale),
      limitations: Object.freeze([...new Set(limitations)].sort()),
    };
  }

  if (
    input.cannibalization === "exact_query_collision_detected"
    || input.cannibalization === "topic_page_dispersion_detected"
  ) {
    rationale.push("multi_page_topic_competition_requires_consolidation_review");
    return {
      action: "consolidate_candidate",
      rationale: Object.freeze(rationale),
      limitations: Object.freeze([...new Set(limitations)].sort()),
    };
  }

  if (input.coverage === "material_search_coverage_observed") {
    rationale.push("material_existing_search_coverage_should_be_protected");
    return {
      action: "leave_alone",
      rationale: Object.freeze(rationale),
      limitations: Object.freeze([...new Set(limitations)].sort()),
    };
  }

  if (
    input.coverage === "search_presence_observed_technical_state_unverified"
    || input.coverage === "search_presence_observed_below_materiality"
    || input.coverage === "page_topic_signal_observed_without_search_evidence"
  ) {
    rationale.push("existing_topic_page_evidence_favors_refresh_over_new_page");
    return {
      action: "refresh_candidate",
      rationale: Object.freeze(rationale),
      limitations: Object.freeze([...new Set(limitations)].sort()),
    };
  }

  if (input.coverage === "no_matching_topic_evidence_in_supplied_scope") {
    const partialInventory = input.missingEvidence.includes("crawl_inventory_partial");
    const noQueryEvidence = input.missingEvidence.includes(
      "query_page_performance_not_supplied",
    );
    if (!partialInventory && !noQueryEvidence) {
      rationale.push("no_matching_topic_evidence_in_complete_observed_inventory_scope");
      limitations.push("whole_site_absence_not_independently_certified");
      return {
        action: "create_candidate",
        rationale: Object.freeze(rationale),
        limitations: Object.freeze([...new Set(limitations)].sort()),
      };
    }
  }

  rationale.push("evidence_insufficient_for_safe_content_action_candidate");
  return {
    action: "defer_insufficient_evidence",
    rationale: Object.freeze(rationale),
    limitations: Object.freeze([...new Set(limitations)].sort()),
  };
}

export function buildContentOpportunityModel(input: {
  clustering: TopicClusteringResult;
  cannibalization: CannibalizationDetectionResult;
  coverage: TopicCoverageClassificationResult;
  businessRelevance: readonly ContentOpportunityBusinessRelevanceEvidence[];
}): ContentOpportunityModelResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_content_opportunity_invalid_input");
  }

  assertTopicClusteringIntegrity(input.clustering);
  assertCannibalizationDetectionIntegrity(input.cannibalization);
  assertTopicCoverageClassificationIntegrity(input.coverage);

  if (
    marketKey(input.clustering.market) !== marketKey(input.cannibalization.market)
    || marketKey(input.clustering.market) !== marketKey(input.coverage.market)
  ) {
    throw new Error("ugp_content_opportunity_market_mismatch");
  }

  if (
    input.cannibalization.provenance.topicClusteringFingerprint
      !== input.clustering.clusteringFingerprint
    || input.coverage.provenance.topicClusteringFingerprint
      !== input.clustering.clusteringFingerprint
  ) {
    throw new Error("ugp_content_opportunity_clustering_lineage_mismatch");
  }

  if (
    input.cannibalization.provenance.siteOwnershipEvidenceFingerprint
      !== input.coverage.provenance.siteOwnershipEvidenceFingerprint
  ) {
    throw new Error("ugp_content_opportunity_ownership_lineage_mismatch");
  }

  if (
    !Array.isArray(input.businessRelevance)
    || input.businessRelevance.length !== input.clustering.clusters.length
  ) {
    throw new Error("ugp_content_opportunity_business_evidence_incomplete");
  }

  const businessByCluster = new Map<string, ContentOpportunityBusinessRelevanceEvidence>();
  for (const evidence of input.businessRelevance) {
    assertBusinessEvidenceIntegrity(evidence);
    if (businessByCluster.has(evidence.clusterFingerprint)) {
      throw new Error("ugp_content_opportunity_duplicate_business_evidence");
    }
    businessByCluster.set(evidence.clusterFingerprint, evidence);
  }

  const coverageByCluster = new Map(
    input.coverage.assessments.map((assessment) => [
      assessment.clusterFingerprint,
      assessment,
    ] as const),
  );
  const cannibalizationByCluster = new Map(
    input.cannibalization.clusterAssessments.map((assessment) => [
      assessment.clusterFingerprint,
      assessment,
    ] as const),
  );

  if (
    coverageByCluster.size !== input.clustering.clusters.length
    || cannibalizationByCluster.size !== input.clustering.clusters.length
  ) {
    throw new Error("ugp_content_opportunity_incomplete_cluster_assessments");
  }

  const opportunities = Object.freeze(
    [...input.clustering.clusters]
      .sort((left, right) =>
        left.representativeKeyword.localeCompare(right.representativeKeyword)
        || left.clusterFingerprint.localeCompare(right.clusterFingerprint),
      )
      .map((cluster): ContentOpportunity => {
        const coverage = coverageByCluster.get(cluster.clusterFingerprint);
        const cannibalization = cannibalizationByCluster.get(
          cluster.clusterFingerprint,
        );
        const business = businessByCluster.get(cluster.clusterFingerprint);
        if (!coverage || !cannibalization || !business) {
          throw new Error("ugp_content_opportunity_cluster_evidence_missing");
        }

        const decision = actionFor({
          relevance: business.relevance,
          coverage: coverage.state,
          cannibalization: cannibalization.state,
          missingEvidence: input.coverage.missingEvidence,
        });
        const searchIntent = dominantIntent(cluster);
        const recommendedContentType = contentTypeForIntent(searchIntent);
        const evidence = Object.freeze({
          topicClusteringFingerprint: input.clustering.clusteringFingerprint,
          coverageAssessmentFingerprint: coverage.assessmentFingerprint,
          cannibalizationAssessmentFingerprint:
            cannibalization.assessmentFingerprint,
          businessRelevanceEvidenceFingerprint: business.evidenceFingerprint,
        });
        const expectedMeasurement = Object.freeze({
          method: measurementMethod(decision.action),
          causalAttribution: false as const,
        });

        const base = {
          clusterFingerprint: cluster.clusterFingerprint,
          representativeKeyword: cluster.representativeKeyword,
          targetTopic: cluster.representativeKeyword,
          searchIntent,
          recommendedContentType,
          recommendedAction: decision.action,
          existingCoverage: coverage.state,
          cannibalizationState: cannibalization.state,
          businessRelevance: Object.freeze({
            relevance: business.relevance,
            rationaleCode: business.rationaleCode,
            evidenceFingerprint: business.evidenceFingerprint,
          }),
          evidence,
          expectedMeasurement,
          limitations: decision.limitations,
          rationale: decision.rationale,
        };

        const opportunityFingerprint = stableEvidenceHash({
          purpose: "ugp_content_opportunity",
          version: UGP_CONTENT_OPPORTUNITY_MODEL_VERSION,
          ...base,
        });

        return Object.freeze({
          opportunityId: stableEvidenceHash({
            purpose: "ugp_content_opportunity_id",
            version: UGP_CONTENT_OPPORTUNITY_MODEL_VERSION,
            clusterFingerprint: cluster.clusterFingerprint,
            opportunityFingerprint,
          }),
          opportunityFingerprint,
          ...base,
        });
      }),
  );

  const count = (action: ContentOpportunityAction): number =>
    opportunities.filter((opportunity) => opportunity.recommendedAction === action).length;

  const summary = Object.freeze({
    create_candidate: count("create_candidate"),
    refresh_candidate: count("refresh_candidate"),
    consolidate_candidate: count("consolidate_candidate"),
    leave_alone: count("leave_alone"),
    defer_insufficient_evidence: count("defer_insufficient_evidence"),
  });

  const base = {
    version: UGP_CONTENT_OPPORTUNITY_MODEL_VERSION,
    market: input.clustering.market,
    policy: UGP_CONTENT_OPPORTUNITY_MODEL_POLICY,
    provenance: Object.freeze({
      topicClusteringFingerprint: input.clustering.clusteringFingerprint,
      siteOwnershipEvidenceFingerprint:
        input.coverage.provenance.siteOwnershipEvidenceFingerprint,
      cannibalizationFingerprint: input.cannibalization.cannibalizationFingerprint,
      coverageFingerprint: input.coverage.coverageFingerprint,
    }),
    opportunities,
    summary,
    semantics: SEMANTICS,
  };

  return Object.freeze({
    ...base,
    opportunityModelFingerprint: stableEvidenceHash({
      purpose: "ugp_content_opportunity_model_result",
      ...base,
    }),
  });
}

export function assertContentOpportunityModelIntegrity(
  result: ContentOpportunityModelResult,
): void {
  if (!result || result.version !== UGP_CONTENT_OPPORTUNITY_MODEL_VERSION) {
    throw new Error("ugp_content_opportunity_version_invalid");
  }
  if (
    result.semantics.readOnly !== true
    || result.semantics.deterministic !== true
    || result.semantics.evidenceBacked !== true
    || result.semantics.grantsAuthorization !== false
    || result.semantics.grantsProviderWrite !== false
    || result.semantics.grantsPublicSiteWrite !== false
    || result.semantics.performsNetworkOperation !== false
    || result.semantics.performsPersistence !== false
    || result.semantics.publicationAuthorized !== false
    || result.semantics.executionAuthorized !== false
    || result.semantics.causalAttribution !== false
  ) {
    throw new Error("ugp_content_opportunity_unsafe_semantics");
  }

  const { opportunityModelFingerprint, ...base } = result;
  const expected = stableEvidenceHash({
    purpose: "ugp_content_opportunity_model_result",
    ...base,
  });
  if (
    exactFingerprint(
      opportunityModelFingerprint,
      "opportunity_model_fingerprint",
    ) !== expected
  ) {
    throw new Error("ugp_content_opportunity_fingerprint_mismatch");
  }
}
