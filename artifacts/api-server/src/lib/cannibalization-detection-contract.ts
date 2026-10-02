import {
  assertSiteOwnershipEvidenceIntegrity,
  type SiteOwnershipEvidence,
} from "./site-ownership-evidence-contract.js";
import {
  stableEvidenceHash,
  type SearchMarket,
} from "./keyword-serp-evidence-contract.js";
import type { TopicClusteringResult } from "./topic-clustering-contract.js";

export const UGP_CANNIBALIZATION_DETECTION_VERSION =
  "ugp-6-3b-deterministic-cannibalization-v1" as const;

export const UGP_CANNIBALIZATION_DETECTION_POLICY = Object.freeze({
  minimumDistinctPages: 2,
  minimumImpressionsPerQueryPage: 10,
  maximumAveragePosition: 20,
} as const);

export type CannibalizationClusterState =
  | "exact_query_collision_detected"
  | "topic_page_dispersion_detected"
  | "no_material_collision_observed_in_supplied_evidence"
  | "no_matching_cluster_query_evidence"
  | "query_page_evidence_not_supplied";

export type CannibalizationPageEvidence = Readonly<{
  url: string;
  pageId: string;
  pageEvidenceFingerprint: string | null;
  queries: readonly string[];
  clicks: number;
  impressions: number;
  bestPosition: number;
  observationCount: number;
}>;

export type CannibalizationClusterAssessment = Readonly<{
  clusterFingerprint: string;
  representativeKeyword: string;
  memberKeywords: readonly string[];
  observedMemberQueries: readonly string[];
  qualifyingMemberQueries: readonly string[];
  competingPages: readonly CannibalizationPageEvidence[];
  exactQueryCollisions: readonly Readonly<{
    query: string;
    pageUrls: readonly string[];
  }>[];
  state: CannibalizationClusterState;
  reasons: readonly string[];
  assessmentFingerprint: string;
}>;

export type CannibalizationFinding = Readonly<{
  clusterFingerprint: string;
  representativeKeyword: string;
  classification: "exact_query_collision" | "topic_page_dispersion";
  competingPages: readonly CannibalizationPageEvidence[];
  exactQueryCollisions: readonly Readonly<{
    query: string;
    pageUrls: readonly string[];
  }>[];
  findingFingerprint: string;
}>;

export type CannibalizationDetectionResult = Readonly<{
  version: typeof UGP_CANNIBALIZATION_DETECTION_VERSION;
  market: SearchMarket;
  policy: typeof UGP_CANNIBALIZATION_DETECTION_POLICY;
  provenance: Readonly<{
    topicClusteringFingerprint: string;
    siteOwnershipEvidenceFingerprint: string;
  }>;
  clusterAssessments: readonly CannibalizationClusterAssessment[];
  findings: readonly CannibalizationFinding[];
  missingEvidence: readonly string[];
  semantics: Readonly<{
    readOnly: true;
    deterministic: true;
    grantsAuthorization: false;
    grantsProviderWrite: false;
    grantsPublicSiteWrite: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    recommendsRemediation: false;
  }>;
  cannibalizationFingerprint: string;
}>;

const SEMANTICS = Object.freeze({
  readOnly: true as const,
  deterministic: true as const,
  grantsAuthorization: false as const,
  grantsProviderWrite: false as const,
  grantsPublicSiteWrite: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  recommendsRemediation: false as const,
});

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("ugp_cannibalization_invalid_" + field);
  }
  return value;
}

function normalizeQuery(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("ugp_cannibalization_invalid_query");
  }
  const normalized = value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
  if (
    normalized.length < 1
    || normalized.length > 512
    || /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw new Error("ugp_cannibalization_invalid_query");
  }
  return normalized;
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
    throw new Error("ugp_cannibalization_topic_clustering_version_invalid");
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
    throw new Error("ugp_cannibalization_topic_clustering_unsafe_semantics");
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
    throw new Error("ugp_cannibalization_topic_clustering_integrity_failed");
  }
}

function roundMetric(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function detectCannibalization(input: {
  clustering: TopicClusteringResult;
  ownership: SiteOwnershipEvidence;
}): CannibalizationDetectionResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_cannibalization_invalid_input");
  }
  assertTopicClusteringIntegrity(input.clustering);
  assertSiteOwnershipEvidenceIntegrity(input.ownership);

  if (marketKey(input.clustering.market) !== marketKey(input.ownership.market)) {
    throw new Error("ugp_cannibalization_market_mismatch");
  }

  const pageFingerprints = new Map(
    input.ownership.pages.map((page) => [
      page.url,
      page.pageEvidenceFingerprint,
    ] as const),
  );

  const seenQueryPage = new Set<string>();
  for (const row of input.ownership.queryPageEvidence) {
    const key = normalizeQuery(row.query) + "\u0001" + row.pageUrl;
    if (seenQueryPage.has(key)) {
      throw new Error("ugp_cannibalization_ambiguous_multi_source_query_page");
    }
    seenQueryPage.add(key);
  }

  const clusterAssessments = input.clustering.clusters
    .map((cluster): CannibalizationClusterAssessment => {
      exactFingerprint(cluster.clusterFingerprint, "cluster_fingerprint");
      const expectedClusterFingerprint = stableEvidenceHash({
        purpose: "ugp_topic_cluster",
        version: "ugp-6-2a-deterministic-topic-clustering-v1",
        representativeKeyword: cluster.representativeKeyword,
        members: cluster.members,
      });
      if (cluster.clusterFingerprint !== expectedClusterFingerprint) {
        throw new Error("ugp_cannibalization_cluster_integrity_failed");
      }
      const memberKeywords = Object.freeze(
        [...new Set(cluster.members.map((member) => normalizeQuery(member.keyword)))]
          .sort(),
      );
      const memberSet = new Set(memberKeywords);
      if (memberSet.size !== cluster.members.length) {
        throw new Error("ugp_cannibalization_duplicate_cluster_member");
      }

      const observedRows = input.ownership.queryPageEvidence
        .filter((row) => memberSet.has(normalizeQuery(row.query)))
        .sort((a, b) =>
          a.query.localeCompare(b.query)
          || a.pageUrl.localeCompare(b.pageUrl),
        );

      const qualifyingRows = observedRows.filter((row) =>
        row.impressions
          >= UGP_CANNIBALIZATION_DETECTION_POLICY.minimumImpressionsPerQueryPage
        && row.position
          <= UGP_CANNIBALIZATION_DETECTION_POLICY.maximumAveragePosition,
      );

      const rowsByPage = new Map<string, typeof qualifyingRows>();
      for (const row of qualifyingRows) {
        const existing = rowsByPage.get(row.pageUrl) ?? [];
        rowsByPage.set(row.pageUrl, [...existing, row]);
      }

      const competingPages = Object.freeze(
        [...rowsByPage.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([url, rows]): CannibalizationPageEvidence => Object.freeze({
            url,
            pageId: rows[0].pageId,
            pageEvidenceFingerprint: pageFingerprints.get(url) ?? null,
            queries: Object.freeze(
              [...new Set(rows.map((row) => normalizeQuery(row.query)))].sort(),
            ),
            clicks: roundMetric(rows.reduce((sum, row) => sum + row.clicks, 0)),
            impressions: roundMetric(
              rows.reduce((sum, row) => sum + row.impressions, 0),
            ),
            bestPosition: roundMetric(
              Math.min(...rows.map((row) => row.position)),
            ),
            observationCount: rows.length,
          })),
      );

      const byQuery = new Map<string, Set<string>>();
      for (const row of qualifyingRows) {
        const query = normalizeQuery(row.query);
        const pages = byQuery.get(query) ?? new Set<string>();
        pages.add(row.pageUrl);
        byQuery.set(query, pages);
      }
      const exactQueryCollisions = Object.freeze(
        [...byQuery.entries()]
          .filter(([, pages]) =>
            pages.size >= UGP_CANNIBALIZATION_DETECTION_POLICY.minimumDistinctPages
          )
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([query, pages]) => Object.freeze({
            query,
            pageUrls: Object.freeze([...pages].sort()),
          })),
      );

      let state: CannibalizationClusterState;
      const reasons: string[] = [];
      if (input.ownership.provenance.queryPageEvidenceAvailability === "not_supplied") {
        state = "query_page_evidence_not_supplied";
        reasons.push("query_page_performance_not_supplied");
      } else if (observedRows.length === 0) {
        state = "no_matching_cluster_query_evidence";
        reasons.push("no_cluster_member_query_observed");
      } else if (exactQueryCollisions.length > 0) {
        state = "exact_query_collision_detected";
        reasons.push("multiple_material_pages_rank_for_same_cluster_member_query");
      } else if (
        competingPages.length
          >= UGP_CANNIBALIZATION_DETECTION_POLICY.minimumDistinctPages
      ) {
        state = "topic_page_dispersion_detected";
        reasons.push("multiple_material_pages_rank_across_same_topic_cluster");
      } else {
        state = "no_material_collision_observed_in_supplied_evidence";
        reasons.push("material_threshold_not_met_for_multiple_pages");
      }

      const base = {
        clusterFingerprint: cluster.clusterFingerprint,
        representativeKeyword: cluster.representativeKeyword,
        memberKeywords,
        observedMemberQueries: Object.freeze(
          [...new Set(observedRows.map((row) => normalizeQuery(row.query)))].sort(),
        ),
        qualifyingMemberQueries: Object.freeze(
          [...new Set(qualifyingRows.map((row) => normalizeQuery(row.query)))].sort(),
        ),
        competingPages,
        exactQueryCollisions,
        state,
        reasons: Object.freeze(reasons),
      };
      return Object.freeze({
        ...base,
        assessmentFingerprint: stableEvidenceHash({
          purpose: "ugp_cannibalization_cluster_assessment",
          version: UGP_CANNIBALIZATION_DETECTION_VERSION,
          ...base,
        }),
      });
    })
    .sort((left, right) =>
      left.representativeKeyword.localeCompare(right.representativeKeyword)
      || left.clusterFingerprint.localeCompare(right.clusterFingerprint),
    );

  const findings = Object.freeze(
    clusterAssessments
      .filter((assessment) =>
        assessment.state === "exact_query_collision_detected"
        || assessment.state === "topic_page_dispersion_detected",
      )
      .map((assessment): CannibalizationFinding => {
        const classification = assessment.state === "exact_query_collision_detected"
          ? "exact_query_collision" as const
          : "topic_page_dispersion" as const;
        const base = {
          clusterFingerprint: assessment.clusterFingerprint,
          representativeKeyword: assessment.representativeKeyword,
          classification,
          competingPages: assessment.competingPages,
          exactQueryCollisions: assessment.exactQueryCollisions,
        };
        return Object.freeze({
          ...base,
          findingFingerprint: stableEvidenceHash({
            purpose: "ugp_cannibalization_finding",
            version: UGP_CANNIBALIZATION_DETECTION_VERSION,
            ...base,
          }),
        });
      }),
  );

  const missingEvidence = Object.freeze([
    ...input.ownership.missingEvidence,
  ].sort());

  const base = {
    version: UGP_CANNIBALIZATION_DETECTION_VERSION,
    market: input.ownership.market,
    policy: UGP_CANNIBALIZATION_DETECTION_POLICY,
    provenance: Object.freeze({
      topicClusteringFingerprint: input.clustering.clusteringFingerprint,
      siteOwnershipEvidenceFingerprint: input.ownership.evidenceFingerprint,
    }),
    clusterAssessments: Object.freeze(clusterAssessments),
    findings,
    missingEvidence,
    semantics: SEMANTICS,
  };

  return Object.freeze({
    ...base,
    cannibalizationFingerprint: stableEvidenceHash({
      purpose: "ugp_cannibalization_detection_result",
      ...base,
    }),
  });
}

export function assertCannibalizationDetectionIntegrity(
  result: CannibalizationDetectionResult,
): void {
  if (
    !result
    || result.version !== UGP_CANNIBALIZATION_DETECTION_VERSION
  ) {
    throw new Error("ugp_cannibalization_version_invalid");
  }
  if (
    result.semantics.readOnly !== true
    || result.semantics.deterministic !== true
    || result.semantics.grantsAuthorization !== false
    || result.semantics.grantsProviderWrite !== false
    || result.semantics.grantsPublicSiteWrite !== false
    || result.semantics.performsNetworkOperation !== false
    || result.semantics.performsPersistence !== false
    || result.semantics.recommendsRemediation !== false
  ) {
    throw new Error("ugp_cannibalization_unsafe_semantics");
  }
  const { cannibalizationFingerprint, ...base } = result;
  const expected = stableEvidenceHash({
    purpose: "ugp_cannibalization_detection_result",
    ...base,
  });
  if (
    exactFingerprint(
      cannibalizationFingerprint,
      "cannibalization_fingerprint",
    ) !== expected
  ) {
    throw new Error("ugp_cannibalization_fingerprint_mismatch");
  }
}
