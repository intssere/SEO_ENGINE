import {
  assertKeywordSerpEvidenceSafety,
  stableEvidenceHash,
  type KeywordSerpEvidenceBundle,
  type NormalizedSearchIntent,
  type SearchMarket,
} from "./keyword-serp-evidence-contract.js";

export const UGP_TOPIC_CLUSTERING_VERSION =
  "ugp-6-2a-deterministic-topic-clustering-v1" as const;

export const UGP_TOPIC_CLUSTERING_POLICY = Object.freeze({
  maxCandidates: 200,
  serpWeight: 0.45,
  semanticWeight: 0.35,
  intentWeight: 0.10,
  contextWeight: 0.10,
  minimumAffinity: 0.60,
  intentHardBlockAtOrBelow: 0,
  maxOrganicResultsPerCandidate: 10,
});

export type TopicContext = Readonly<{
  categories: readonly string[];
  entities: readonly string[];
}>;

export type TopicClusteringCandidate = Readonly<{
  evidence: KeywordSerpEvidenceBundle;
  context: TopicContext;
}>;

export type SemanticSimilarityEvidence = Readonly<{
  leftEvidenceFingerprint: string;
  rightEvidenceFingerprint: string;
  similarity: number;
  modelId: string;
  evidenceFingerprint: string;
}>;

export type TopicPairAssessment = Readonly<{
  leftKeyword: string;
  rightKeyword: string;
  leftEvidenceFingerprint: string;
  rightEvidenceFingerprint: string;
  serpOverlap: number;
  semanticSimilarity: number;
  intentCompatibility: number;
  contextSimilarity: number;
  affinity: number;
  eligible: boolean;
  reasons: readonly string[];
  assessmentFingerprint: string;
}>;

export type TopicClusterMember = Readonly<{
  keyword: string;
  evidenceFingerprint: string;
  searchVolume: number | null;
  intent: NormalizedSearchIntent;
}>;

export type TopicCluster = Readonly<{
  clusterFingerprint: string;
  representativeKeyword: string;
  members: readonly TopicClusterMember[];
}>;

export type TopicClusteringResult = Readonly<{
  version: typeof UGP_TOPIC_CLUSTERING_VERSION;
  market: SearchMarket;
  policy: typeof UGP_TOPIC_CLUSTERING_POLICY;
  clusters: readonly TopicCluster[];
  pairAssessments: readonly TopicPairAssessment[];
  semantics: Readonly<{
    readOnly: true;
    deterministic: true;
    grantsAuthorization: false;
    grantsProviderWrite: false;
    grantsPublicSiteWrite: false;
    performsNetworkOperation: false;
    performsPersistence: false;
  }>;
  clusteringFingerprint: string;
}>;

const SEMANTICS = Object.freeze({
  readOnly: true as const,
  deterministic: true as const,
  grantsAuthorization: false as const,
  grantsProviderWrite: false as const,
  grantsPublicSiteWrite: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
});

function exactToken(value: unknown, field: string): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || value.length < 1
    || value.length > 512
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_topic_cluster_invalid_" + field);
  }
  return value;
}

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("ugp_topic_cluster_invalid_" + field);
  }
  return value;
}

function normalizedContextValues(
  values: readonly string[],
  field: string,
): readonly string[] {
  if (!Array.isArray(values)) {
    throw new Error("ugp_topic_cluster_invalid_" + field);
  }
  const normalized = values.map((value) =>
    exactToken(value, field + "_value").toLocaleLowerCase("en-US"),
  );
  return Object.freeze([...new Set(normalized)].sort());
}

function normalizeContext(context: TopicContext): TopicContext {
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    throw new Error("ugp_topic_cluster_invalid_context");
  }
  return Object.freeze({
    categories: normalizedContextValues(context.categories, "categories"),
    entities: normalizedContextValues(context.entities, "entities"),
  });
}

function exactMarketKey(market: SearchMarket): string {
  return [
    market.searchEngine,
    String(market.locationCode),
    market.languageCode,
    market.device,
  ].join("|");
}

function canonicalPairKey(left: string, right: string): string {
  return left < right ? left + "|" + right : right + "|" + left;
}

function semanticEvidenceFingerprint(input: Omit<
  SemanticSimilarityEvidence,
  "evidenceFingerprint"
>): string {
  const left = input.leftEvidenceFingerprint < input.rightEvidenceFingerprint
    ? input.leftEvidenceFingerprint
    : input.rightEvidenceFingerprint;
  const right = input.leftEvidenceFingerprint < input.rightEvidenceFingerprint
    ? input.rightEvidenceFingerprint
    : input.leftEvidenceFingerprint;
  return stableEvidenceHash({
    purpose: "ugp_topic_cluster_semantic_similarity",
    version: UGP_TOPIC_CLUSTERING_VERSION,
    leftEvidenceFingerprint: left,
    rightEvidenceFingerprint: right,
    similarity: input.similarity,
    modelId: input.modelId,
  });
}

export function buildSemanticSimilarityEvidence(input: {
  leftEvidenceFingerprint: string;
  rightEvidenceFingerprint: string;
  similarity: number;
  modelId: string;
}): SemanticSimilarityEvidence {
  const left = exactFingerprint(
    input.leftEvidenceFingerprint,
    "semantic_left_fingerprint",
  );
  const right = exactFingerprint(
    input.rightEvidenceFingerprint,
    "semantic_right_fingerprint",
  );
  if (left === right) {
    throw new Error("ugp_topic_cluster_semantic_self_pair");
  }
  if (
    typeof input.similarity !== "number"
    || !Number.isFinite(input.similarity)
    || input.similarity < 0
    || input.similarity > 1
  ) {
    throw new Error("ugp_topic_cluster_invalid_semantic_similarity");
  }
  const modelId = exactToken(input.modelId, "semantic_model_id");
  const base = {
    leftEvidenceFingerprint: left,
    rightEvidenceFingerprint: right,
    similarity: input.similarity,
    modelId,
  };
  return Object.freeze({
    ...base,
    evidenceFingerprint: semanticEvidenceFingerprint(base),
  });
}

function canonicalUrl(value: string): string {
  try {
    const url = new URL(value);
    const pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "");
    return url.protocol.toLowerCase()
      + "//"
      + url.hostname.toLowerCase()
      + (url.port ? ":" + url.port : "")
      + pathname;
  } catch {
    return value.trim();
  }
}

function organicUrls(candidate: TopicClusteringCandidate): readonly string[] {
  return Object.freeze([
    ...new Set(
      candidate.evidence.serp.rankingUrls
        .filter((row) => row.isOrganic)
        .sort((a, b) => a.rankAbsolute - b.rankAbsolute)
        .slice(0, UGP_TOPIC_CLUSTERING_POLICY.maxOrganicResultsPerCandidate)
        .map((row) => canonicalUrl(row.url)),
    ),
  ]);
}

function overlapCoefficient(
  left: readonly string[],
  right: readonly string[],
): number {
  if (left.length === 0 || right.length === 0) return 0;
  const rightSet = new Set(right);
  let intersection = 0;
  for (const value of left) {
    if (rightSet.has(value)) intersection += 1;
  }
  return intersection / Math.min(left.length, right.length);
}

function jaccard(
  left: readonly string[],
  right: readonly string[],
): number | null {
  if (left.length === 0 && right.length === 0) return null;
  const union = new Set([...left, ...right]);
  const rightSet = new Set(right);
  let intersection = 0;
  for (const value of left) {
    if (rightSet.has(value)) intersection += 1;
  }
  return union.size === 0 ? null : intersection / union.size;
}

function contextSimilarity(
  left: TopicContext,
  right: TopicContext,
): number {
  const category = jaccard(left.categories, right.categories);
  const entity = jaccard(left.entities, right.entities);
  const observed = [category, entity].filter(
    (value): value is number => value != null,
  );
  if (observed.length === 0) return 0.5;
  return observed.reduce((sum, value) => sum + value, 0) / observed.length;
}

function intentCompatibility(
  left: NormalizedSearchIntent,
  right: NormalizedSearchIntent,
): number {
  if (left === right) return 1;
  if (left === "unknown" || right === "unknown") return 0.5;
  const pair = new Set([left, right]);
  if (pair.has("commercial") && pair.has("transactional")) return 0.75;
  if (pair.has("informational") && pair.has("commercial")) return 0.25;
  return 0;
}

function roundScore(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function candidateOrder(
  left: TopicClusteringCandidate,
  right: TopicClusteringCandidate,
): number {
  const byKeyword = left.evidence.keyword.keyword.localeCompare(
    right.evidence.keyword.keyword,
  );
  if (byKeyword !== 0) return byKeyword;
  return left.evidence.evidenceFingerprint.localeCompare(
    right.evidence.evidenceFingerprint,
  );
}

function clusterOrder(
  left: readonly TopicClusteringCandidate[],
  right: readonly TopicClusteringCandidate[],
): number {
  return candidateOrder(left[0], right[0]);
}

function validateCandidates(
  candidates: readonly TopicClusteringCandidate[],
): readonly TopicClusteringCandidate[] {
  if (
    !Array.isArray(candidates)
    || candidates.length < 2
    || candidates.length > UGP_TOPIC_CLUSTERING_POLICY.maxCandidates
  ) {
    throw new Error("ugp_topic_cluster_invalid_candidate_count");
  }

  const normalized = candidates.map((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new Error("ugp_topic_cluster_invalid_candidate");
    }
    assertKeywordSerpEvidenceSafety(candidate.evidence);
    exactFingerprint(candidate.evidence.evidenceFingerprint, "evidence_fingerprint");
    return Object.freeze({
      evidence: candidate.evidence,
      context: normalizeContext(candidate.context),
    });
  }).sort(candidateOrder);

  const fingerprints = new Set<string>();
  const keywords = new Set<string>();
  const marketKey = exactMarketKey(normalized[0].evidence.keyword.market);

  for (const candidate of normalized) {
    if (exactMarketKey(candidate.evidence.keyword.market) !== marketKey) {
      throw new Error("ugp_topic_cluster_mixed_market");
    }
    if (
      exactMarketKey(candidate.evidence.serp.market)
      !== exactMarketKey(candidate.evidence.keyword.market)
    ) {
      throw new Error("ugp_topic_cluster_candidate_market_drift");
    }
    if (fingerprints.has(candidate.evidence.evidenceFingerprint)) {
      throw new Error("ugp_topic_cluster_duplicate_evidence");
    }
    fingerprints.add(candidate.evidence.evidenceFingerprint);

    const keywordKey = candidate.evidence.keyword.keyword.toLocaleLowerCase("en-US");
    if (keywords.has(keywordKey)) {
      throw new Error("ugp_topic_cluster_duplicate_keyword");
    }
    keywords.add(keywordKey);
  }

  return Object.freeze(normalized);
}

function validateSemanticMatrix(input: {
  candidates: readonly TopicClusteringCandidate[];
  semanticSimilarities: readonly SemanticSimilarityEvidence[];
}): ReadonlyMap<string, SemanticSimilarityEvidence> {
  const fingerprints = new Set(
    input.candidates.map((candidate) => candidate.evidence.evidenceFingerprint),
  );
  const expectedPairs =
    input.candidates.length * (input.candidates.length - 1) / 2;

  if (
    !Array.isArray(input.semanticSimilarities)
    || input.semanticSimilarities.length !== expectedPairs
  ) {
    throw new Error("ugp_topic_cluster_incomplete_semantic_matrix");
  }

  const map = new Map<string, SemanticSimilarityEvidence>();

  for (const evidence of input.semanticSimilarities) {
    const left = exactFingerprint(
      evidence.leftEvidenceFingerprint,
      "semantic_left_fingerprint",
    );
    const right = exactFingerprint(
      evidence.rightEvidenceFingerprint,
      "semantic_right_fingerprint",
    );
    if (left === right) {
      throw new Error("ugp_topic_cluster_semantic_self_pair");
    }
    if (!fingerprints.has(left) || !fingerprints.has(right)) {
      throw new Error("ugp_topic_cluster_semantic_unknown_candidate");
    }
    if (
      typeof evidence.similarity !== "number"
      || !Number.isFinite(evidence.similarity)
      || evidence.similarity < 0
      || evidence.similarity > 1
    ) {
      throw new Error("ugp_topic_cluster_invalid_semantic_similarity");
    }
    exactToken(evidence.modelId, "semantic_model_id");
    exactFingerprint(evidence.evidenceFingerprint, "semantic_evidence_fingerprint");
    if (evidence.evidenceFingerprint !== semanticEvidenceFingerprint({
      leftEvidenceFingerprint: left,
      rightEvidenceFingerprint: right,
      similarity: evidence.similarity,
      modelId: evidence.modelId,
    })) {
      throw new Error("ugp_topic_cluster_semantic_evidence_integrity_failed");
    }

    const key = canonicalPairKey(left, right);
    if (map.has(key)) {
      throw new Error("ugp_topic_cluster_duplicate_semantic_pair");
    }
    map.set(key, evidence);
  }

  if (map.size !== expectedPairs) {
    throw new Error("ugp_topic_cluster_incomplete_semantic_matrix");
  }
  return map;
}

function assessPair(input: {
  left: TopicClusteringCandidate;
  right: TopicClusteringCandidate;
  semantic: SemanticSimilarityEvidence;
}): TopicPairAssessment {
  const leftFingerprint = input.left.evidence.evidenceFingerprint;
  const rightFingerprint = input.right.evidence.evidenceFingerprint;
  const serpOverlap = roundScore(overlapCoefficient(
    organicUrls(input.left),
    organicUrls(input.right),
  ));
  const semanticSimilarity = roundScore(input.semantic.similarity);
  const intent = roundScore(intentCompatibility(
    input.left.evidence.keyword.intent,
    input.right.evidence.keyword.intent,
  ));
  const context = roundScore(contextSimilarity(
    input.left.context,
    input.right.context,
  ));
  const affinity = roundScore(
    serpOverlap * UGP_TOPIC_CLUSTERING_POLICY.serpWeight
    + semanticSimilarity * UGP_TOPIC_CLUSTERING_POLICY.semanticWeight
    + intent * UGP_TOPIC_CLUSTERING_POLICY.intentWeight
    + context * UGP_TOPIC_CLUSTERING_POLICY.contextWeight,
  );

  const reasons: string[] = [];
  if (intent <= UGP_TOPIC_CLUSTERING_POLICY.intentHardBlockAtOrBelow) {
    reasons.push("intent_incompatible");
  }
  if (affinity < UGP_TOPIC_CLUSTERING_POLICY.minimumAffinity) {
    reasons.push("affinity_below_threshold");
  }
  const eligible = reasons.length === 0;

  const ordered = candidateOrder(input.left, input.right) <= 0
    ? [input.left, input.right] as const
    : [input.right, input.left] as const;

  const base = {
    leftKeyword: ordered[0].evidence.keyword.keyword,
    rightKeyword: ordered[1].evidence.keyword.keyword,
    leftEvidenceFingerprint: ordered[0].evidence.evidenceFingerprint,
    rightEvidenceFingerprint: ordered[1].evidence.evidenceFingerprint,
    serpOverlap,
    semanticSimilarity,
    intentCompatibility: intent,
    contextSimilarity: context,
    affinity,
    eligible,
    reasons: Object.freeze(reasons),
  };

  return Object.freeze({
    ...base,
    assessmentFingerprint: stableEvidenceHash({
      purpose: "ugp_topic_cluster_pair_assessment",
      version: UGP_TOPIC_CLUSTERING_VERSION,
      ...base,
    }),
  });
}

function clusterCanMerge(
  left: readonly TopicClusteringCandidate[],
  right: readonly TopicClusteringCandidate[],
  assessments: ReadonlyMap<string, TopicPairAssessment>,
): { eligible: boolean; minimumAffinity: number } {
  let minimumAffinity = 1;
  for (const leftCandidate of left) {
    for (const rightCandidate of right) {
      const key = canonicalPairKey(
        leftCandidate.evidence.evidenceFingerprint,
        rightCandidate.evidence.evidenceFingerprint,
      );
      const assessment = assessments.get(key);
      if (!assessment) {
        throw new Error("ugp_topic_cluster_missing_pair_assessment");
      }
      if (!assessment.eligible) {
        return { eligible: false, minimumAffinity: assessment.affinity };
      }
      minimumAffinity = Math.min(minimumAffinity, assessment.affinity);
    }
  }
  return { eligible: true, minimumAffinity };
}

function mergeClusters(
  candidates: readonly TopicClusteringCandidate[],
  assessments: ReadonlyMap<string, TopicPairAssessment>,
): readonly (readonly TopicClusteringCandidate[])[] {
  let clusters: TopicClusteringCandidate[][] = candidates.map(
    (candidate) => [candidate],
  );

  for (;;) {
    let selected:
      | { left: number; right: number; minimumAffinity: number; tieKey: string }
      | null = null;

    for (let left = 0; left < clusters.length; left += 1) {
      for (let right = left + 1; right < clusters.length; right += 1) {
        const decision = clusterCanMerge(
          clusters[left],
          clusters[right],
          assessments,
        );
        if (!decision.eligible) continue;
        const tieKey =
          clusters[left][0].evidence.keyword.keyword
          + "|"
          + clusters[right][0].evidence.keyword.keyword;
        if (
          selected == null
          || decision.minimumAffinity > selected.minimumAffinity
          || (
            decision.minimumAffinity === selected.minimumAffinity
            && tieKey < selected.tieKey
          )
        ) {
          selected = {
            left,
            right,
            minimumAffinity: decision.minimumAffinity,
            tieKey,
          };
        }
      }
    }

    if (selected == null) break;

    const merged = [
      ...clusters[selected.left],
      ...clusters[selected.right],
    ].sort(candidateOrder);

    clusters = clusters.filter(
      (_cluster, index) => index !== selected.left && index !== selected.right,
    );
    clusters.push(merged);
    clusters.sort(clusterOrder);
  }

  return Object.freeze(
    clusters.map((cluster) => Object.freeze([...cluster].sort(candidateOrder))),
  );
}

function representative(
  members: readonly TopicClusteringCandidate[],
): TopicClusteringCandidate {
  return [...members].sort((left, right) => {
    const leftVolume = left.evidence.keyword.searchVolume ?? -1;
    const rightVolume = right.evidence.keyword.searchVolume ?? -1;
    if (leftVolume !== rightVolume) return rightVolume - leftVolume;
    return candidateOrder(left, right);
  })[0];
}

function finalizeCluster(
  members: readonly TopicClusteringCandidate[],
): TopicCluster {
  const ordered = [...members].sort(candidateOrder);
  const primary = representative(ordered);
  const normalizedMembers = Object.freeze(ordered.map((candidate) =>
    Object.freeze({
      keyword: candidate.evidence.keyword.keyword,
      evidenceFingerprint: candidate.evidence.evidenceFingerprint,
      searchVolume: candidate.evidence.keyword.searchVolume,
      intent: candidate.evidence.keyword.intent,
    }),
  ));
  const base = {
    representativeKeyword: primary.evidence.keyword.keyword,
    members: normalizedMembers,
  };
  return Object.freeze({
    clusterFingerprint: stableEvidenceHash({
      purpose: "ugp_topic_cluster",
      version: UGP_TOPIC_CLUSTERING_VERSION,
      ...base,
    }),
    ...base,
  });
}

export function clusterKeywordSerpEvidence(input: {
  candidates: readonly TopicClusteringCandidate[];
  semanticSimilarities: readonly SemanticSimilarityEvidence[];
}): TopicClusteringResult {
  const candidates = validateCandidates(input.candidates);
  const semanticMatrix = validateSemanticMatrix({
    candidates,
    semanticSimilarities: input.semanticSimilarities,
  });

  const assessments = new Map<string, TopicPairAssessment>();

  for (let left = 0; left < candidates.length; left += 1) {
    for (let right = left + 1; right < candidates.length; right += 1) {
      const leftCandidate = candidates[left];
      const rightCandidate = candidates[right];
      const key = canonicalPairKey(
        leftCandidate.evidence.evidenceFingerprint,
        rightCandidate.evidence.evidenceFingerprint,
      );
      const semantic = semanticMatrix.get(key);
      if (!semantic) {
        throw new Error("ugp_topic_cluster_missing_semantic_pair");
      }
      assessments.set(key, assessPair({
        left: leftCandidate,
        right: rightCandidate,
        semantic,
      }));
    }
  }

  const pairAssessments = Object.freeze(
    [...assessments.values()].sort((left, right) => {
      const leftKey = left.leftKeyword + "|" + left.rightKeyword;
      const rightKey = right.leftKeyword + "|" + right.rightKeyword;
      return leftKey.localeCompare(rightKey);
    }),
  );

  const clusters = Object.freeze(
    mergeClusters(candidates, assessments)
      .map(finalizeCluster)
      .sort((left, right) =>
        left.representativeKeyword.localeCompare(right.representativeKeyword),
      ),
  );

  const base = {
    version: UGP_TOPIC_CLUSTERING_VERSION,
    market: candidates[0].evidence.keyword.market,
    policy: UGP_TOPIC_CLUSTERING_POLICY,
    clusters,
    pairAssessments,
    semantics: SEMANTICS,
  };

  return Object.freeze({
    ...base,
    clusteringFingerprint: stableEvidenceHash({
      purpose: "ugp_topic_clustering_result",
      ...base,
    }),
  });
}
