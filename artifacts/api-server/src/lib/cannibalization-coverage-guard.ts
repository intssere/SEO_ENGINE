import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import type {
  TopicCluster,
  TopicClusteringResult,
} from "./topic-clustering-contract.js";

export const UGP_CANNIBALIZATION_COVERAGE_GUARD_VERSION =
  "ugp-6-3a-cannibalization-coverage-guard-v1" as const;

export const UGP_CANNIBALIZATION_COVERAGE_POLICY = Object.freeze({
  maxClusters: 200,
  maxPageObservations: 20_000,
  minContentRelevance: 0.60,
  minObservedImpressions: 10,
  minOwnershipScore: 0.35,
  cannibalizationSecondaryScore: 0.35,
  cannibalizationMaxScoreGap: 0.25,
  contentWeight: 0.45,
  visibilityWeight: 0.35,
  keywordBreadthWeight: 0.20,
});

export type TopicPageObservation = Readonly<{
  clusterFingerprint: string;
  canonicalUrl: string;
  inInventory: boolean;
  contentRelevance: number | null;
  matchedKeywords: readonly string[];
  gsc: Readonly<{
    impressions: number;
    clicks: number;
    weightedPosition: number | null;
  }> | null;
  evidenceFingerprint: string;
}>;

export type TopicPageAssessment = Readonly<{
  canonicalUrl: string;
  inInventory: boolean;
  contentRelevance: number | null;
  matchedKeywords: readonly string[];
  impressions: number;
  clicks: number;
  weightedPosition: number | null;
  visibilityShare: number;
  keywordBreadth: number;
  ownershipScore: number;
  qualifiesAsOwner: boolean;
  reasons: readonly string[];
  assessmentFingerprint: string;
}>;

export type TopicCoverageState =
  | "coverage_gap"
  | "single_owner"
  | "cannibalization_risk"
  | "insufficient_evidence";

export type TopicCoverageAssessment = Readonly<{
  clusterFingerprint: string;
  representativeKeyword: string;
  memberKeywords: readonly string[];
  state: TopicCoverageState;
  primaryUrl: string | null;
  competingUrls: readonly string[];
  pages: readonly TopicPageAssessment[];
  reasons: readonly string[];
  assessmentFingerprint: string;
}>;

export type CannibalizationCoverageGuardResult = Readonly<{
  version: typeof UGP_CANNIBALIZATION_COVERAGE_GUARD_VERSION;
  clusteringFingerprint: string;
  policy: typeof UGP_CANNIBALIZATION_COVERAGE_POLICY;
  assessments: readonly TopicCoverageAssessment[];
  summary: Readonly<{
    coverageGap: number;
    singleOwner: number;
    cannibalizationRisk: number;
    insufficientEvidence: number;
  }>;
  semantics: Readonly<{
    readOnly: true;
    deterministic: true;
    grantsAuthorization: false;
    grantsProviderWrite: false;
    grantsPublicSiteWrite: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    proposesRemediation: false;
  }>;
  guardFingerprint: string;
}>;

const SEMANTICS = Object.freeze({
  readOnly: true as const,
  deterministic: true as const,
  grantsAuthorization: false as const,
  grantsProviderWrite: false as const,
  grantsPublicSiteWrite: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  proposesRemediation: false as const,
});

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("ugp_coverage_guard_invalid_" + field);
  }
  return value;
}

function canonicalUrl(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 4096) {
    throw new Error("ugp_coverage_guard_invalid_url");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("ugp_coverage_guard_invalid_url");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("ugp_coverage_guard_invalid_url_scheme");
  }
  url.hash = "";
  const path = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "");
  return url.protocol.toLowerCase()
    + "//"
    + url.hostname.toLowerCase()
    + (url.port ? ":" + url.port : "")
    + path
    + url.search;
}

function boundedScore(value: unknown, field: string): number {
  if (
    typeof value !== "number"
    || !Number.isFinite(value)
    || value < 0
    || value > 1
  ) {
    throw new Error("ugp_coverage_guard_invalid_" + field);
  }
  return value;
}

function nonNegative(value: unknown, field: string): number {
  if (
    typeof value !== "number"
    || !Number.isFinite(value)
    || value < 0
  ) {
    throw new Error("ugp_coverage_guard_invalid_" + field);
  }
  return value;
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function clusterKeywordSet(cluster: TopicCluster): ReadonlySet<string> {
  return new Set(
    cluster.members.map((member) =>
      member.keyword.toLocaleLowerCase("en-US"),
    ),
  );
}

function observationFingerprint(input: Omit<
  TopicPageObservation,
  "evidenceFingerprint"
>): string {
  return stableEvidenceHash({
    purpose: "ugp_coverage_guard_page_observation",
    version: UGP_CANNIBALIZATION_COVERAGE_GUARD_VERSION,
    ...input,
  });
}

export function buildTopicPageObservation(input: {
  clusterFingerprint: string;
  canonicalUrl: string;
  inInventory: boolean;
  contentRelevance: number | null;
  matchedKeywords: readonly string[];
  gsc: Readonly<{
    impressions: number;
    clicks: number;
    weightedPosition: number | null;
  }> | null;
}): TopicPageObservation {
  const clusterFingerprint = exactFingerprint(
    input.clusterFingerprint,
    "cluster_fingerprint",
  );
  const url = canonicalUrl(input.canonicalUrl);
  if (typeof input.inInventory !== "boolean") {
    throw new Error("ugp_coverage_guard_invalid_inventory_flag");
  }
  const contentRelevance = input.contentRelevance == null
    ? null
    : boundedScore(input.contentRelevance, "content_relevance");

  if (!Array.isArray(input.matchedKeywords)) {
    throw new Error("ugp_coverage_guard_invalid_matched_keywords");
  }
  const matchedKeywords = Object.freeze([
    ...new Set(input.matchedKeywords.map((value) => {
      if (
        typeof value !== "string"
        || value !== value.trim()
        || value.length < 1
        || value.length > 512
      ) {
        throw new Error("ugp_coverage_guard_invalid_matched_keyword");
      }
      return value;
    })),
  ].sort((a, b) => a.localeCompare(b)));

  let gsc: TopicPageObservation["gsc"] = null;
  if (input.gsc != null) {
    const impressions = nonNegative(input.gsc.impressions, "impressions");
    const clicks = nonNegative(input.gsc.clicks, "clicks");
    if (clicks > impressions) {
      throw new Error("ugp_coverage_guard_clicks_exceed_impressions");
    }
    const weightedPosition = input.gsc.weightedPosition == null
      ? null
      : nonNegative(input.gsc.weightedPosition, "weighted_position");
    gsc = Object.freeze({ impressions, clicks, weightedPosition });
  }

  const base = {
    clusterFingerprint,
    canonicalUrl: url,
    inInventory: input.inInventory,
    contentRelevance,
    matchedKeywords,
    gsc,
  };

  return Object.freeze({
    ...base,
    evidenceFingerprint: observationFingerprint(base),
  });
}

function validateObservation(
  observation: TopicPageObservation,
  clusterMap: ReadonlyMap<string, TopicCluster>,
): TopicPageObservation {
  const clusterFingerprint = exactFingerprint(
    observation.clusterFingerprint,
    "cluster_fingerprint",
  );
  if (!clusterMap.has(clusterFingerprint)) {
    throw new Error("ugp_coverage_guard_unknown_cluster");
  }

  const rebuilt = buildTopicPageObservation({
    clusterFingerprint,
    canonicalUrl: observation.canonicalUrl,
    inInventory: observation.inInventory,
    contentRelevance: observation.contentRelevance,
    matchedKeywords: observation.matchedKeywords,
    gsc: observation.gsc,
  });
  exactFingerprint(observation.evidenceFingerprint, "evidence_fingerprint");
  if (rebuilt.evidenceFingerprint !== observation.evidenceFingerprint) {
    throw new Error("ugp_coverage_guard_observation_integrity_failed");
  }

  const keywordSet = clusterKeywordSet(clusterMap.get(clusterFingerprint)!);
  for (const keyword of rebuilt.matchedKeywords) {
    if (!keywordSet.has(keyword.toLocaleLowerCase("en-US"))) {
      throw new Error("ugp_coverage_guard_keyword_outside_cluster");
    }
  }
  return rebuilt;
}

function assessPages(
  cluster: TopicCluster,
  observations: readonly TopicPageObservation[],
): readonly TopicPageAssessment[] {
  const totalImpressions = observations.reduce(
    (sum, row) => sum + (row.gsc?.impressions ?? 0),
    0,
  );
  const memberCount = cluster.members.length;

  return Object.freeze(observations.map((observation) => {
    const impressions = observation.gsc?.impressions ?? 0;
    const clicks = observation.gsc?.clicks ?? 0;
    const weightedPosition = observation.gsc?.weightedPosition ?? null;
    const visibilityShare = totalImpressions > 0
      ? round(impressions / totalImpressions)
      : 0;
    const keywordBreadth = round(
      observation.matchedKeywords.length / Math.max(1, memberCount),
    );

    const hasContentSignal =
      observation.contentRelevance != null
      && observation.contentRelevance
        >= UGP_CANNIBALIZATION_COVERAGE_POLICY.minContentRelevance;
    const hasGscSignal =
      impressions
      >= UGP_CANNIBALIZATION_COVERAGE_POLICY.minObservedImpressions;

    const observedWeights =
      (observation.contentRelevance == null ? 0 : UGP_CANNIBALIZATION_COVERAGE_POLICY.contentWeight)
      + (totalImpressions === 0 ? 0 : UGP_CANNIBALIZATION_COVERAGE_POLICY.visibilityWeight)
      + UGP_CANNIBALIZATION_COVERAGE_POLICY.keywordBreadthWeight;

    const weighted =
      (observation.contentRelevance ?? 0)
        * UGP_CANNIBALIZATION_COVERAGE_POLICY.contentWeight
      + visibilityShare
        * UGP_CANNIBALIZATION_COVERAGE_POLICY.visibilityWeight
      + keywordBreadth
        * UGP_CANNIBALIZATION_COVERAGE_POLICY.keywordBreadthWeight;

    const ownershipScore = observedWeights === 0
      ? 0
      : round(weighted / observedWeights);

    const reasons: string[] = [];
    if (!observation.inInventory) reasons.push("not_in_inventory");
    if (!hasContentSignal) reasons.push("content_signal_below_threshold");
    if (!hasGscSignal) reasons.push("gsc_signal_below_threshold");
    if (
      ownershipScore
      < UGP_CANNIBALIZATION_COVERAGE_POLICY.minOwnershipScore
    ) {
      reasons.push("ownership_score_below_threshold");
    }

    const qualifiesAsOwner =
      (hasContentSignal || hasGscSignal)
      && ownershipScore
        >= UGP_CANNIBALIZATION_COVERAGE_POLICY.minOwnershipScore;

    const base = {
      canonicalUrl: observation.canonicalUrl,
      inInventory: observation.inInventory,
      contentRelevance: observation.contentRelevance,
      matchedKeywords: observation.matchedKeywords,
      impressions,
      clicks,
      weightedPosition,
      visibilityShare,
      keywordBreadth,
      ownershipScore,
      qualifiesAsOwner,
      reasons: Object.freeze(reasons),
    };

    return Object.freeze({
      ...base,
      assessmentFingerprint: stableEvidenceHash({
        purpose: "ugp_coverage_guard_page_assessment",
        version: UGP_CANNIBALIZATION_COVERAGE_GUARD_VERSION,
        clusterFingerprint: cluster.clusterFingerprint,
        ...base,
      }),
    });
  }).sort((left, right) => {
    if (left.ownershipScore !== right.ownershipScore) {
      return right.ownershipScore - left.ownershipScore;
    }
    if (left.impressions !== right.impressions) {
      return right.impressions - left.impressions;
    }
    return left.canonicalUrl.localeCompare(right.canonicalUrl);
  }));
}

function assessCluster(
  cluster: TopicCluster,
  observations: readonly TopicPageObservation[],
): TopicCoverageAssessment {
  const pages = assessPages(cluster, observations);
  const owners = pages.filter((page) => page.qualifiesAsOwner);
  const reasons: string[] = [];

  let state: TopicCoverageState;
  let primaryUrl: string | null = null;
  let competingUrls: readonly string[] = Object.freeze([]);

  if (observations.length === 0) {
    state = "insufficient_evidence";
    reasons.push("no_page_observations");
  } else if (owners.length === 0) {
    const hasAnyMeasuredSignal = observations.some(
      (row) => row.contentRelevance != null || row.gsc != null,
    );
    if (hasAnyMeasuredSignal) {
      state = "coverage_gap";
      reasons.push("no_qualifying_owner");
    } else {
      state = "insufficient_evidence";
      reasons.push("no_measured_topic_signal");
    }
  } else if (owners.length === 1) {
    state = "single_owner";
    primaryUrl = owners[0].canonicalUrl;
  } else {
    const first = owners[0];
    const second = owners[1];
    const scoreGap = round(first.ownershipScore - second.ownershipScore);
    const secondStrongEnough =
      second.ownershipScore
      >= UGP_CANNIBALIZATION_COVERAGE_POLICY.cannibalizationSecondaryScore;
    const gapSmallEnough =
      scoreGap
      <= UGP_CANNIBALIZATION_COVERAGE_POLICY.cannibalizationMaxScoreGap;

    primaryUrl = first.canonicalUrl;
    if (secondStrongEnough && gapSmallEnough) {
      state = "cannibalization_risk";
      competingUrls = Object.freeze(
        owners.slice(1).map((page) => page.canonicalUrl),
      );
      reasons.push("multiple_competing_owners");
      reasons.push("top_owner_score_gap_within_threshold");
    } else {
      state = "single_owner";
      reasons.push("secondary_owner_materially_weaker");
    }
  }

  const memberKeywords = Object.freeze(
    cluster.members.map((member) => member.keyword).sort((a, b) =>
      a.localeCompare(b),
    ),
  );

  const base = {
    clusterFingerprint: cluster.clusterFingerprint,
    representativeKeyword: cluster.representativeKeyword,
    memberKeywords,
    state,
    primaryUrl,
    competingUrls,
    pages,
    reasons: Object.freeze(reasons),
  };

  return Object.freeze({
    ...base,
    assessmentFingerprint: stableEvidenceHash({
      purpose: "ugp_coverage_guard_topic_assessment",
      version: UGP_CANNIBALIZATION_COVERAGE_GUARD_VERSION,
      ...base,
    }),
  });
}

export function evaluateCannibalizationCoverage(input: {
  clustering: TopicClusteringResult;
  observations: readonly TopicPageObservation[];
}): CannibalizationCoverageGuardResult {
  const clusteringFingerprint = exactFingerprint(
    input.clustering.clusteringFingerprint,
    "clustering_fingerprint",
  );
  if (
    input.clustering.semantics.readOnly !== true
    || input.clustering.semantics.deterministic !== true
    || input.clustering.semantics.grantsAuthorization !== false
    || input.clustering.semantics.grantsProviderWrite !== false
    || input.clustering.semantics.grantsPublicSiteWrite !== false
    || input.clustering.semantics.performsNetworkOperation !== false
    || input.clustering.semantics.performsPersistence !== false
  ) {
    throw new Error("ugp_coverage_guard_unsafe_clustering_semantics");
  }
  if (
    !Array.isArray(input.clustering.clusters)
    || input.clustering.clusters.length < 1
    || input.clustering.clusters.length
      > UGP_CANNIBALIZATION_COVERAGE_POLICY.maxClusters
  ) {
    throw new Error("ugp_coverage_guard_invalid_cluster_count");
  }
  if (
    !Array.isArray(input.observations)
    || input.observations.length
      > UGP_CANNIBALIZATION_COVERAGE_POLICY.maxPageObservations
  ) {
    throw new Error("ugp_coverage_guard_invalid_observation_count");
  }

  const clusterMap = new Map<string, TopicCluster>();
  for (const cluster of input.clustering.clusters) {
    exactFingerprint(cluster.clusterFingerprint, "cluster_fingerprint");
    if (clusterMap.has(cluster.clusterFingerprint)) {
      throw new Error("ugp_coverage_guard_duplicate_cluster");
    }
    clusterMap.set(cluster.clusterFingerprint, cluster);
  }

  const dedupe = new Set<string>();
  const normalized = input.observations.map((observation) => {
    const checked = validateObservation(observation, clusterMap);
    const key = checked.clusterFingerprint + "|" + checked.canonicalUrl;
    if (dedupe.has(key)) {
      throw new Error("ugp_coverage_guard_duplicate_page_observation");
    }
    dedupe.add(key);
    return checked;
  });

  const assessments = Object.freeze(
    input.clustering.clusters
      .map((cluster) => assessCluster(
        cluster,
        normalized
          .filter((row) => row.clusterFingerprint === cluster.clusterFingerprint)
          .sort((a, b) => a.canonicalUrl.localeCompare(b.canonicalUrl)),
      ))
      .sort((a, b) =>
        a.representativeKeyword.localeCompare(b.representativeKeyword),
      ),
  );

  const summary = Object.freeze({
    coverageGap: assessments.filter((a) => a.state === "coverage_gap").length,
    singleOwner: assessments.filter((a) => a.state === "single_owner").length,
    cannibalizationRisk:
      assessments.filter((a) => a.state === "cannibalization_risk").length,
    insufficientEvidence:
      assessments.filter((a) => a.state === "insufficient_evidence").length,
  });

  const base = {
    version: UGP_CANNIBALIZATION_COVERAGE_GUARD_VERSION,
    clusteringFingerprint,
    policy: UGP_CANNIBALIZATION_COVERAGE_POLICY,
    assessments,
    summary,
    semantics: SEMANTICS,
  };

  return Object.freeze({
    ...base,
    guardFingerprint: stableEvidenceHash({
      purpose: "ugp_cannibalization_coverage_guard",
      ...base,
    }),
  });
}
