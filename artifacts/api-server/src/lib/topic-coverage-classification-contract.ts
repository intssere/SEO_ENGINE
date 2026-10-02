import {
  assertSiteOwnershipEvidenceIntegrity,
  type SiteOwnershipEvidence,
  type SiteOwnershipPageEvidence,
  type SiteOwnershipQueryPageEvidence,
} from "./site-ownership-evidence-contract.js";
import {
  stableEvidenceHash,
  type SearchMarket,
} from "./keyword-serp-evidence-contract.js";
import type { TopicClusteringResult } from "./topic-clustering-contract.js";

export const UGP_TOPIC_COVERAGE_CLASSIFICATION_VERSION =
  "ugp-6-3c-deterministic-topic-coverage-v1" as const;

export const UGP_TOPIC_COVERAGE_CLASSIFICATION_POLICY = Object.freeze({
  minimumImpressionsForMaterialSearchCoverage: 10,
  maximumAveragePositionForMaterialSearchCoverage: 20,
  requireObservedIndexableSelfCanonicalForMaterialCoverage: true,
} as const);

export type TopicCoverageState =
  | "material_search_coverage_observed"
  | "search_presence_observed_technical_state_unverified"
  | "search_presence_observed_below_materiality"
  | "page_topic_signal_observed_without_search_evidence"
  | "no_matching_topic_evidence_in_supplied_scope"
  | "query_page_evidence_not_supplied";

export type TopicCoveragePageEvidence = Readonly<{
  url: string;
  pageId: string;
  pageEvidenceFingerprint: string;
  crawlAvailability: "observed" | "not_observed";
  indexability: "indexable" | "noindex" | "http_not_indexable" | "unavailable" | null;
  canonicalState: "self" | "same_origin_other" | "external" | "missing" | "unavailable" | null;
  matchedQueries: readonly string[];
  metadataSignals: readonly ("title" | "h1" | "heading")[];
  clicks: number;
  impressions: number;
  bestPosition: number | null;
  qualifiesMaterialSearchCoverage: boolean;
}>;

export type TopicCoverageAssessment = Readonly<{
  clusterFingerprint: string;
  representativeKeyword: string;
  memberKeywords: readonly string[];
  observedMemberQueries: readonly string[];
  materialMemberQueries: readonly string[];
  pages: readonly TopicCoveragePageEvidence[];
  state: TopicCoverageState;
  reasons: readonly string[];
  assessmentFingerprint: string;
}>;

export type TopicCoverageClassificationResult = Readonly<{
  version: typeof UGP_TOPIC_COVERAGE_CLASSIFICATION_VERSION;
  market: SearchMarket;
  policy: typeof UGP_TOPIC_COVERAGE_CLASSIFICATION_POLICY;
  provenance: Readonly<{
    topicClusteringFingerprint: string;
    siteOwnershipEvidenceFingerprint: string;
  }>;
  assessments: readonly TopicCoverageAssessment[];
  summary: Readonly<{
    clusterCount: number;
    materialSearchCoverageObserved: number;
    searchPresenceTechnicalStateUnverified: number;
    searchPresenceBelowMateriality: number;
    pageTopicSignalWithoutSearchEvidence: number;
    noMatchingTopicEvidenceInSuppliedScope: number;
    queryPageEvidenceNotSupplied: number;
    uncoveredClusters: 0;
  }>;
  missingEvidence: readonly string[];
  semantics: Readonly<{
    readOnly: true;
    deterministic: true;
    grantsAuthorization: false;
    grantsProviderWrite: false;
    grantsPublicSiteWrite: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    declaresUncovered: false;
    recommendsRemediation: false;
  }>;
  coverageFingerprint: string;
}>;

const SEMANTICS = Object.freeze({
  readOnly: true as const,
  deterministic: true as const,
  grantsAuthorization: false as const,
  grantsProviderWrite: false as const,
  grantsPublicSiteWrite: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  declaresUncovered: false as const,
  recommendsRemediation: false as const,
});

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("ugp_topic_coverage_invalid_" + field);
  }
  return value;
}

function normalizeQuery(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("ugp_topic_coverage_invalid_query");
  }
  const normalized = value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
  if (
    normalized.length < 1
    || normalized.length > 512
    || /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw new Error("ugp_topic_coverage_invalid_query");
  }
  return normalized;
}

function normalizeMetadata(value: string | null): string {
  return (value ?? "").normalize("NFKC").trim().toLocaleLowerCase("en-US");
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
  if (!result || result.version !== "ugp-6-2a-deterministic-topic-clustering-v1") {
    throw new Error("ugp_topic_coverage_topic_clustering_version_invalid");
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
    throw new Error("ugp_topic_coverage_topic_clustering_unsafe_semantics");
  }
  const { clusteringFingerprint, ...base } = result;
  const expected = stableEvidenceHash({
    purpose: "ugp_topic_clustering_result",
    ...base,
  });
  if (exactFingerprint(clusteringFingerprint, "topic_clustering_fingerprint") !== expected) {
    throw new Error("ugp_topic_coverage_topic_clustering_integrity_failed");
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
      throw new Error("ugp_topic_coverage_cluster_integrity_failed");
    }
  }
}

function metadataSignals(
  page: SiteOwnershipPageEvidence,
  memberKeywords: ReadonlySet<string>,
): readonly ("title" | "h1" | "heading")[] {
  const signals = new Set<"title" | "h1" | "heading">();
  const title = normalizeMetadata(page.crawlEvidence.title);
  const h1 = normalizeMetadata(page.crawlEvidence.h1);
  const headings = page.crawlEvidence.headings.map(normalizeMetadata);

  for (const keyword of memberKeywords) {
    if (title === keyword) signals.add("title");
    if (h1 === keyword) signals.add("h1");
    if (headings.includes(keyword)) signals.add("heading");
  }

  return Object.freeze(
    ["title", "h1", "heading"].filter(
      (signal): signal is "title" | "h1" | "heading" => signals.has(signal as any),
    ),
  );
}

function roundMetric(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function materialRow(row: SiteOwnershipQueryPageEvidence): boolean {
  return (
    row.impressions
      >= UGP_TOPIC_COVERAGE_CLASSIFICATION_POLICY.minimumImpressionsForMaterialSearchCoverage
    && row.position
      <= UGP_TOPIC_COVERAGE_CLASSIFICATION_POLICY.maximumAveragePositionForMaterialSearchCoverage
  );
}

function technicallyEligiblePage(page: SiteOwnershipPageEvidence): boolean {
  return (
    page.crawlEvidence.availability === "observed"
    && page.crawlEvidence.indexability === "indexable"
    && page.crawlEvidence.canonicalState === "self"
  );
}

export function classifyTopicCoverage(input: {
  clustering: TopicClusteringResult;
  ownership: SiteOwnershipEvidence;
}): TopicCoverageClassificationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_topic_coverage_invalid_input");
  }

  assertTopicClusteringIntegrity(input.clustering);
  assertSiteOwnershipEvidenceIntegrity(input.ownership);

  if (marketKey(input.clustering.market) !== marketKey(input.ownership.market)) {
    throw new Error("ugp_topic_coverage_market_mismatch");
  }

  const pagesByUrl = new Map(
    input.ownership.pages.map((page) => [page.url, page] as const),
  );

  const seenQueryPage = new Set<string>();
  for (const row of input.ownership.queryPageEvidence) {
    const key = normalizeQuery(row.query) + "\u0001" + row.pageUrl;
    if (seenQueryPage.has(key)) {
      throw new Error("ugp_topic_coverage_ambiguous_multi_source_query_page");
    }
    seenQueryPage.add(key);
  }

  const assessments = Object.freeze(
    input.clustering.clusters.map((cluster): TopicCoverageAssessment => {
      const memberKeywords = Object.freeze(
        [...new Set(cluster.members.map((member) => normalizeQuery(member.keyword)))].sort(),
      );
      if (memberKeywords.length !== cluster.members.length) {
        throw new Error("ugp_topic_coverage_duplicate_cluster_member");
      }
      const memberSet = new Set(memberKeywords);

      const matchedRows = input.ownership.queryPageEvidence
        .filter((row) => memberSet.has(normalizeQuery(row.query)))
        .sort((a, b) =>
          a.query.localeCompare(b.query) || a.pageUrl.localeCompare(b.pageUrl),
        );
      const materialRows = matchedRows.filter(materialRow);

      const candidateUrls = new Set<string>(matchedRows.map((row) => row.pageUrl));
      for (const page of input.ownership.pages) {
        if (metadataSignals(page, memberSet).length > 0) {
          candidateUrls.add(page.url);
        }
      }

      const pageEvidence = Object.freeze(
        [...candidateUrls]
          .sort()
          .map((url): TopicCoveragePageEvidence => {
            const page = pagesByUrl.get(url);
            if (!page) {
              throw new Error("ugp_topic_coverage_missing_page_evidence");
            }
            const rows = matchedRows.filter((row) => row.pageUrl === url);
            const material = rows.filter(materialRow);
            return Object.freeze({
              url,
              pageId: page.pageId,
              pageEvidenceFingerprint: page.pageEvidenceFingerprint,
              crawlAvailability: page.crawlEvidence.availability,
              indexability: page.crawlEvidence.indexability,
              canonicalState: page.crawlEvidence.canonicalState,
              matchedQueries: Object.freeze(
                [...new Set(rows.map((row) => normalizeQuery(row.query)))].sort(),
              ),
              metadataSignals: metadataSignals(page, memberSet),
              clicks: roundMetric(rows.reduce((sum, row) => sum + row.clicks, 0)),
              impressions: roundMetric(rows.reduce((sum, row) => sum + row.impressions, 0)),
              bestPosition: rows.length > 0
                ? roundMetric(Math.min(...rows.map((row) => row.position)))
                : null,
              qualifiesMaterialSearchCoverage:
                material.length > 0 && technicallyEligiblePage(page),
            });
          }),
      );

      const hasMaterialTechnicalCoverage = pageEvidence.some(
        (page) => page.qualifiesMaterialSearchCoverage,
      );
      const hasMaterialSearchPresence = materialRows.length > 0;
      const hasSearchPresence = matchedRows.length > 0;
      const hasMetadataSignal = pageEvidence.some(
        (page) => page.metadataSignals.length > 0,
      );

      let state: TopicCoverageState;
      const reasons: string[] = [];

      if (hasMaterialTechnicalCoverage) {
        state = "material_search_coverage_observed";
        reasons.push("material_cluster_member_query_ranks_on_observed_indexable_self_canonical_page");
      } else if (hasMaterialSearchPresence) {
        state = "search_presence_observed_technical_state_unverified";
        reasons.push("material_cluster_member_query_ranking_observed");
        reasons.push("ranking_page_not_verified_as_observed_indexable_self_canonical");
      } else if (hasSearchPresence) {
        state = "search_presence_observed_below_materiality";
        reasons.push("cluster_member_query_ranking_observed_below_materiality_policy");
      } else if (hasMetadataSignal) {
        state = "page_topic_signal_observed_without_search_evidence";
        reasons.push("exact_cluster_member_keyword_metadata_signal_observed");
        if (input.ownership.provenance.queryPageEvidenceAvailability === "not_supplied") {
          reasons.push("query_page_performance_not_supplied");
        } else {
          reasons.push("no_matching_cluster_member_query_observed");
        }
      } else if (input.ownership.provenance.queryPageEvidenceAvailability === "not_supplied") {
        state = "query_page_evidence_not_supplied";
        reasons.push("query_page_performance_not_supplied");
        reasons.push("no_positive_page_topic_signal_observed_in_supplied_inventory");
      } else {
        state = "no_matching_topic_evidence_in_supplied_scope";
        reasons.push("no_matching_cluster_member_query_observed");
        reasons.push("no_positive_page_topic_signal_observed_in_supplied_inventory");
        reasons.push("absence_is_not_uncovered_due_to_uncertified_whole_site_scope");
      }

      const base = {
        clusterFingerprint: cluster.clusterFingerprint,
        representativeKeyword: cluster.representativeKeyword,
        memberKeywords,
        observedMemberQueries: Object.freeze(
          [...new Set(matchedRows.map((row) => normalizeQuery(row.query)))].sort(),
        ),
        materialMemberQueries: Object.freeze(
          [...new Set(materialRows.map((row) => normalizeQuery(row.query)))].sort(),
        ),
        pages: pageEvidence,
        state,
        reasons: Object.freeze(reasons),
      };

      return Object.freeze({
        ...base,
        assessmentFingerprint: stableEvidenceHash({
          purpose: "ugp_topic_coverage_assessment",
          version: UGP_TOPIC_COVERAGE_CLASSIFICATION_VERSION,
          ...base,
        }),
      });
    }).sort((left, right) =>
      left.representativeKeyword.localeCompare(right.representativeKeyword)
      || left.clusterFingerprint.localeCompare(right.clusterFingerprint),
    ),
  );

  const count = (state: TopicCoverageState): number =>
    assessments.filter((assessment) => assessment.state === state).length;

  const summary = Object.freeze({
    clusterCount: assessments.length,
    materialSearchCoverageObserved: count("material_search_coverage_observed"),
    searchPresenceTechnicalStateUnverified: count(
      "search_presence_observed_technical_state_unverified",
    ),
    searchPresenceBelowMateriality: count(
      "search_presence_observed_below_materiality",
    ),
    pageTopicSignalWithoutSearchEvidence: count(
      "page_topic_signal_observed_without_search_evidence",
    ),
    noMatchingTopicEvidenceInSuppliedScope: count(
      "no_matching_topic_evidence_in_supplied_scope",
    ),
    queryPageEvidenceNotSupplied: count("query_page_evidence_not_supplied"),
    uncoveredClusters: 0 as const,
  });

  const base = {
    version: UGP_TOPIC_COVERAGE_CLASSIFICATION_VERSION,
    market: input.ownership.market,
    policy: UGP_TOPIC_COVERAGE_CLASSIFICATION_POLICY,
    provenance: Object.freeze({
      topicClusteringFingerprint: input.clustering.clusteringFingerprint,
      siteOwnershipEvidenceFingerprint: input.ownership.evidenceFingerprint,
    }),
    assessments,
    summary,
    missingEvidence: Object.freeze([...input.ownership.missingEvidence].sort()),
    semantics: SEMANTICS,
  };

  return Object.freeze({
    ...base,
    coverageFingerprint: stableEvidenceHash({
      purpose: "ugp_topic_coverage_classification_result",
      ...base,
    }),
  });
}

export function assertTopicCoverageClassificationIntegrity(
  result: TopicCoverageClassificationResult,
): void {
  if (!result || result.version !== UGP_TOPIC_COVERAGE_CLASSIFICATION_VERSION) {
    throw new Error("ugp_topic_coverage_version_invalid");
  }
  if (
    result.semantics.readOnly !== true
    || result.semantics.deterministic !== true
    || result.semantics.grantsAuthorization !== false
    || result.semantics.grantsProviderWrite !== false
    || result.semantics.grantsPublicSiteWrite !== false
    || result.semantics.performsNetworkOperation !== false
    || result.semantics.performsPersistence !== false
    || result.semantics.declaresUncovered !== false
    || result.semantics.recommendsRemediation !== false
    || result.summary.uncoveredClusters !== 0
  ) {
    throw new Error("ugp_topic_coverage_unsafe_semantics");
  }

  const { coverageFingerprint, ...base } = result;
  const expected = stableEvidenceHash({
    purpose: "ugp_topic_coverage_classification_result",
    ...base,
  });
  if (
    exactFingerprint(coverageFingerprint, "coverage_fingerprint") !== expected
  ) {
    throw new Error("ugp_topic_coverage_fingerprint_mismatch");
  }
}
