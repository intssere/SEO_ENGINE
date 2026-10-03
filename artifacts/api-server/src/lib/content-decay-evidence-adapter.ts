import { createHash } from "node:crypto";
import {
  buildContentDecayRefreshAssessment,
  type ContentDecayRefreshAssessment,
  type ContentDecayRefreshInput,
  type RankingObservation,
  type SearchPerformanceWindow,
  type SerpChangeObservation,
} from "./content-decay-refresh-detection.js";
import {
  normalizeGscSearchAnalyticsBinding,
  type GscSearchAnalyticsBinding,
} from "./gsc-search-analytics-runner.js";
import {
  dataForSeoSerpAdapterCapability,
  P5_2_DATAFORSEO_SERP_ADAPTER_VERSION,
  type SerpOrganicRankItem,
  type SerpRankingProjection,
} from "./dataforseo-serp-adapter.js";
import {
  SIGNAL_OBSERVATION_NORMALIZATION_VERSION,
  signalObservationNormalizationCapability,
  type NormalizedSignalObservation,
} from "./signal-observation-normalization.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const UGP_DECAY_EVIDENCE_ADAPTER_VERSION =
  "ugp-8-4b-decay-evidence-adapter-v1" as const;

export const UGP_DECAY_SERP_CHANGE_POLICY = Object.freeze({
  topOrganicDepth: 10,
  minimumCommonUrlRankShift: 3,
  minimumTopMembershipChanges: 2,
} as const);

export type GscPageEvidenceSnapshot = Readonly<{
  binding: GscSearchAnalyticsBinding;
  observation: NormalizedSignalObservation;
}>;

export type GscPageEvidencePair = Readonly<{
  before: GscPageEvidenceSnapshot;
  after: GscPageEvidenceSnapshot;
}>;

export type SerpEvidencePair = Readonly<{
  before: SerpRankingProjection;
  after: SerpRankingProjection;
}>;

export type ContentDecayEvidenceAdapterInput = Readonly<{
  pageUrl: string;
  pageIdentityFingerprint: string;
  contentOpportunityFingerprint: string | null;
  gsc?: GscPageEvidencePair | null;
  serp?: SerpEvidencePair | null;
}>;

export type ContentDecayEvidenceAdapterResult = Readonly<{
  version: typeof UGP_DECAY_EVIDENCE_ADAPTER_VERSION;
  pageUrl: string;
  mappedInput: ContentDecayRefreshInput;
  assessment: ContentDecayRefreshAssessment;
  adapterLimitations: readonly string[];
  evidenceBindings: Readonly<{
    gscBeforeObservationFingerprint: string | null;
    gscAfterObservationFingerprint: string | null;
    serpBeforeRankingFingerprint: string | null;
    serpAfterRankingFingerprint: string | null;
  }>;
  semantics: Readonly<{
    deterministic: true;
    readOnly: true;
    evidenceTranslationOnly: true;
    providerAcquisition: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    grantsAuthorization: false;
    publicationAuthorized: false;
    executionAuthorized: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  adapterFingerprint: string;
}>;

const HEX_64 = /^[0-9a-f]{64}$/;
const SEMANTICS = Object.freeze({
  deterministic: true as const,
  readOnly: true as const,
  evidenceTranslationOnly: true as const,
  providerAcquisition: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  grantsAuthorization: false as const,
  publicationAuthorized: false as const,
  executionAuthorized: false as const,
  providerWrites: false as const,
  publicSiteWrites: false as const,
});

function hashJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function requireFingerprint(value: unknown, code: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) throw new Error(code);
  return value;
}

function canonicalPageUrl(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 2048) {
    throw new Error("ugp_decay_adapter_page_url_invalid");
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("ugp_decay_adapter_page_url_invalid");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("ugp_decay_adapter_page_url_invalid");
  }
  parsed.hash = "";
  return parsed.toString();
}

function exactSafety(actual: unknown, expected: unknown, code: string): void {
  if (stableEvidenceHash(actual) !== stableEvidenceHash(expected)) throw new Error(code);
}

function assertNormalizedObservationIntegrity(observation: NormalizedSignalObservation): void {
  if (observation.version !== SIGNAL_OBSERVATION_NORMALIZATION_VERSION) {
    throw new Error("ugp_decay_adapter_gsc_observation_version_invalid");
  }
  requireFingerprint(observation.observationFingerprint, "ugp_decay_adapter_gsc_observation_fingerprint_invalid");
  requireFingerprint(observation.requestFingerprint, "ugp_decay_adapter_gsc_request_fingerprint_invalid");
  requireFingerprint(observation.sourceFingerprint, "ugp_decay_adapter_gsc_source_fingerprint_invalid");
  requireFingerprint(observation.marketFingerprint, "ugp_decay_adapter_gsc_market_fingerprint_invalid");
  requireFingerprint(observation.categoryFingerprint, "ugp_decay_adapter_gsc_category_fingerprint_invalid");

  const expectedStreamFingerprint = hashJson({
    version: SIGNAL_OBSERVATION_NORMALIZATION_VERSION,
    sourceFingerprint: observation.sourceFingerprint,
    marketFingerprint: observation.marketFingerprint,
    categoryFingerprint: observation.categoryFingerprint,
    signalType: observation.signalType,
  });
  if (observation.streamId !== `sos-${expectedStreamFingerprint.slice(0, 24)}`) {
    throw new Error("ugp_decay_adapter_gsc_stream_integrity_invalid");
  }

  const identity = {
    streamId: observation.streamId,
    requestId: observation.requestId,
    requestFingerprint: observation.requestFingerprint,
    sourceId: observation.sourceId,
    sourceFingerprint: observation.sourceFingerprint,
    sourceClass: observation.sourceClass,
    trustClass: observation.trustClass,
    marketFingerprint: observation.marketFingerprint,
    categoryFingerprint: observation.categoryFingerprint,
    signalType: observation.signalType,
    observedAt: observation.observedAt,
    status: observation.status,
    metrics: observation.metrics,
    diagnostics: observation.diagnostics,
    errorCode: observation.errorCode,
    sourceQuality: observation.sourceQuality,
    completeness: observation.completeness,
    confidence: observation.confidence,
    positiveEvidence: observation.positiveEvidence,
  };
  const expectedObservationFingerprint = hashJson({
    version: SIGNAL_OBSERVATION_NORMALIZATION_VERSION,
    ...identity,
  });
  if (expectedObservationFingerprint !== observation.observationFingerprint) {
    throw new Error("ugp_decay_adapter_gsc_observation_integrity_invalid");
  }
  if (observation.observationId !== `sno-${expectedObservationFingerprint.slice(0, 24)}`) {
    throw new Error("ugp_decay_adapter_gsc_observation_id_invalid");
  }
  exactSafety(
    observation.safety,
    signalObservationNormalizationCapability(),
    "ugp_decay_adapter_gsc_observation_safety_invalid",
  );
}

function metricMap(observation: NormalizedSignalObservation): Map<string, { value: number; unit: string | null }> {
  const result = new Map<string, { value: number; unit: string | null }>();
  for (const metric of observation.metrics) {
    if (result.has(metric.key)) throw new Error("ugp_decay_adapter_gsc_duplicate_metric");
    result.set(metric.key, { value: metric.value, unit: metric.unit });
  }
  return result;
}

function requireMetric(
  metrics: Map<string, { value: number; unit: string | null }>,
  key: string,
  unit: string,
): number {
  const metric = metrics.get(key);
  if (!metric || metric.unit !== unit || !Number.isFinite(metric.value)) {
    throw new Error(`ugp_decay_adapter_gsc_metric_invalid:${key}`);
  }
  return metric.value;
}

function mapGscSnapshot(
  pageUrl: string,
  snapshot: GscPageEvidenceSnapshot,
  label: "before" | "after",
): SearchPerformanceWindow {
  const binding = normalizeGscSearchAnalyticsBinding(snapshot.binding);
  const observation = snapshot.observation;
  assertNormalizedObservationIntegrity(observation);

  if (
    observation.sourceClass !== "first_party"
    || observation.trustClass !== "first_party_authoritative"
    || observation.signalType !== "keyword"
    || observation.status !== "success"
    || observation.completeness !== 1
    || observation.positiveEvidence !== true
    || observation.errorCode !== null
    || observation.diagnostics.length !== 0
  ) {
    throw new Error(`ugp_decay_adapter_gsc_${label}_not_exact_success`);
  }
  if (
    binding.sourceFingerprint !== observation.sourceFingerprint
    || binding.requestFingerprint !== observation.requestFingerprint
  ) {
    throw new Error(`ugp_decay_adapter_gsc_${label}_lineage_mismatch`);
  }
  if (binding.dimensions.length !== 0 || binding.filters.length !== 1) {
    throw new Error(`ugp_decay_adapter_gsc_${label}_page_aggregate_required`);
  }
  const filter = binding.filters[0]!;
  if (
    filter.dimension !== "page"
    || filter.operator !== "equals"
    || canonicalPageUrl(filter.expression) !== pageUrl
  ) {
    throw new Error(`ugp_decay_adapter_gsc_${label}_exact_page_filter_required`);
  }

  const metrics = metricMap(observation);
  if (metrics.size !== 4) throw new Error(`ugp_decay_adapter_gsc_${label}_metric_set_invalid`);
  const clicks = requireMetric(metrics, "clicks", "count");
  const impressions = requireMetric(metrics, "impressions", "count");
  const ctr = requireMetric(metrics, "ctr", "ratio");
  const position = requireMetric(metrics, "position", "position");

  return Object.freeze({
    startDate: binding.startDate,
    endDate: binding.endDate,
    clicks,
    impressions,
    ctr,
    position,
    evidenceFingerprint: stableEvidenceHash({
      purpose: "ugp_decay_gsc_page_window_adapter",
      label,
      pageUrl,
      binding: {
        sourceFingerprint: binding.sourceFingerprint,
        requestFingerprint: binding.requestFingerprint,
        property: binding.property,
        startDate: binding.startDate,
        endDate: binding.endDate,
        dimensions: binding.dimensions,
        filters: binding.filters,
      },
      observationFingerprint: observation.observationFingerprint,
      metrics: observation.metrics,
    }),
  });
}

function assertSerpRankingIntegrity(ranking: SerpRankingProjection): void {
  if (ranking.version !== P5_2_DATAFORSEO_SERP_ADAPTER_VERSION) {
    throw new Error("ugp_decay_adapter_serp_version_invalid");
  }
  for (const [value, code] of [
    [ranking.rankingFingerprint, "ranking_fingerprint"],
    [ranking.adapterRequestFingerprint, "adapter_request_fingerprint"],
    [ranking.task68RequestFingerprint, "task68_request_fingerprint"],
    [ranking.sourceFingerprint, "source_fingerprint"],
    [ranking.marketFingerprint, "market_fingerprint"],
    [ranking.categoryFingerprint, "category_fingerprint"],
  ] as const) {
    requireFingerprint(value, `ugp_decay_adapter_serp_${code}_invalid`);
  }
  const identity = {
    providerKey: ranking.providerKey,
    adapterRequestFingerprint: ranking.adapterRequestFingerprint,
    task68RequestFingerprint: ranking.task68RequestFingerprint,
    sourceFingerprint: ranking.sourceFingerprint,
    marketFingerprint: ranking.marketFingerprint,
    categoryFingerprint: ranking.categoryFingerprint,
    keyword: ranking.keyword,
    trackedDomain: ranking.trackedDomain,
    observedAt: ranking.observedAt,
    checkedDepth: ranking.checkedDepth,
    searchEngineResultsCount: ranking.searchEngineResultsCount,
    providerItemsCount: ranking.providerItemsCount,
    organicItems: ranking.organicItems,
    trackedMatches: ranking.trackedMatches,
  };
  const expected = hashJson({
    version: P5_2_DATAFORSEO_SERP_ADAPTER_VERSION,
    ...identity,
  });
  if (expected !== ranking.rankingFingerprint) {
    throw new Error("ugp_decay_adapter_serp_ranking_integrity_invalid");
  }
  if (ranking.rankingId !== `p52-rank-${expected.slice(0, 20)}`) {
    throw new Error("ugp_decay_adapter_serp_ranking_id_invalid");
  }
  exactSafety(
    ranking.safety,
    dataForSeoSerpAdapterCapability(),
    "ugp_decay_adapter_serp_safety_invalid",
  );
}

function exactPageRank(ranking: SerpRankingProjection, pageUrl: string): number | null {
  const matches = ranking.trackedMatches
    .filter((item) => canonicalPageUrl(item.url) === pageUrl)
    .map((item) => item.rankAbsolute);
  return matches.length === 0 ? null : Math.min(...matches);
}

function topOrganicMap(items: readonly SerpOrganicRankItem[]): Map<string, number> {
  const top = new Map<string, number>();
  for (const item of items) {
    if (item.rankAbsolute > UGP_DECAY_SERP_CHANGE_POLICY.topOrganicDepth) continue;
    const url = canonicalPageUrl(item.url);
    const existing = top.get(url);
    if (existing === undefined || item.rankAbsolute < existing) top.set(url, item.rankAbsolute);
  }
  return top;
}

function mapSerpPair(
  pageUrl: string,
  pair: SerpEvidencePair,
  limitations: string[],
): {
  ranking?: Readonly<{ before: RankingObservation; after: RankingObservation }>;
  serpChange: SerpChangeObservation;
} {
  assertSerpRankingIntegrity(pair.before);
  assertSerpRankingIntegrity(pair.after);
  if (
    pair.before.keyword !== pair.after.keyword
    || pair.before.trackedDomain !== pair.after.trackedDomain
    || pair.before.marketFingerprint !== pair.after.marketFingerprint
    || pair.before.categoryFingerprint !== pair.after.categoryFingerprint
    || pair.before.sourceFingerprint !== pair.after.sourceFingerprint
  ) {
    throw new Error("ugp_decay_adapter_serp_pair_scope_mismatch");
  }
  if (Date.parse(pair.after.observedAt) <= Date.parse(pair.before.observedAt)) {
    throw new Error("ugp_decay_adapter_serp_dates_not_ordered");
  }

  const beforeDate = pair.before.observedAt.slice(0, 10);
  const afterDate = pair.after.observedAt.slice(0, 10);
  const beforeRank = exactPageRank(pair.before, pageUrl);
  const afterRank = exactPageRank(pair.after, pageUrl);

  let ranking: Readonly<{ before: RankingObservation; after: RankingObservation }> | undefined;
  if (beforeRank !== null && afterRank !== null) {
    ranking = Object.freeze({
      before: Object.freeze({
        observedDate: beforeDate,
        rank: beforeRank,
        evidenceFingerprint: stableEvidenceHash({
          purpose: "ugp_decay_page_rank_adapter",
          phase: "before",
          pageUrl,
          rankingFingerprint: pair.before.rankingFingerprint,
          rank: beforeRank,
        }),
      }),
      after: Object.freeze({
        observedDate: afterDate,
        rank: afterRank,
        evidenceFingerprint: stableEvidenceHash({
          purpose: "ugp_decay_page_rank_adapter",
          phase: "after",
          pageUrl,
          rankingFingerprint: pair.after.rankingFingerprint,
          rank: afterRank,
        }),
      }),
    });
  } else {
    limitations.push("bounded_serp_cannot_prove_page_unranked");
  }

  const beforeTop = topOrganicMap(pair.before.organicItems);
  const afterTop = topOrganicMap(pair.after.organicItems);
  const urls = [...new Set([...beforeTop.keys(), ...afterTop.keys()])];
  const membershipChanges = urls.filter((url) => beforeTop.has(url) !== afterTop.has(url)).length;
  const commonRankShift = urls.some((url) => {
    const before = beforeTop.get(url);
    const after = afterTop.get(url);
    return before !== undefined
      && after !== undefined
      && Math.abs(after - before) >= UGP_DECAY_SERP_CHANGE_POLICY.minimumCommonUrlRankShift;
  });
  const materiallyChanged =
    membershipChanges >= UGP_DECAY_SERP_CHANGE_POLICY.minimumTopMembershipChanges
    || commonRankShift;

  const serpChange = Object.freeze({
    beforeEvidenceFingerprint: pair.before.rankingFingerprint,
    afterEvidenceFingerprint: pair.after.rankingFingerprint,
    materiallyChanged,
    evidenceFingerprint: stableEvidenceHash({
      purpose: "ugp_decay_serp_change_adapter",
      beforeRankingFingerprint: pair.before.rankingFingerprint,
      afterRankingFingerprint: pair.after.rankingFingerprint,
      topOrganicDepth: UGP_DECAY_SERP_CHANGE_POLICY.topOrganicDepth,
      minimumCommonUrlRankShift: UGP_DECAY_SERP_CHANGE_POLICY.minimumCommonUrlRankShift,
      minimumTopMembershipChanges: UGP_DECAY_SERP_CHANGE_POLICY.minimumTopMembershipChanges,
      membershipChanges,
      commonRankShift,
      materiallyChanged,
    }),
  });

  return { ranking, serpChange };
}

export function buildContentDecayEvidenceAdapterResult(
  input: ContentDecayEvidenceAdapterInput,
): ContentDecayEvidenceAdapterResult {
  const pageUrl = canonicalPageUrl(input.pageUrl);
  requireFingerprint(input.pageIdentityFingerprint, "ugp_decay_adapter_page_identity_fingerprint_invalid");
  if (input.contentOpportunityFingerprint !== null) {
    requireFingerprint(
      input.contentOpportunityFingerprint,
      "ugp_decay_adapter_content_opportunity_fingerprint_invalid",
    );
  }

  const limitations: string[] = [
    "freshness_evidence_adapter_not_available",
    "per_url_content_change_evidence_adapter_not_available",
  ];

  let gsc: ContentDecayRefreshInput["gsc"];
  if (input.gsc) {
    gsc = Object.freeze({
      before: mapGscSnapshot(pageUrl, input.gsc.before, "before"),
      after: mapGscSnapshot(pageUrl, input.gsc.after, "after"),
    });
  } else {
    limitations.push("gsc_evidence_adapter_input_not_supplied");
  }

  let ranking: ContentDecayRefreshInput["ranking"];
  let serpChange: ContentDecayRefreshInput["serpChange"];
  if (input.serp) {
    const mapped = mapSerpPair(pageUrl, input.serp, limitations);
    ranking = mapped.ranking;
    serpChange = mapped.serpChange;
  } else {
    limitations.push("serp_evidence_adapter_input_not_supplied");
  }

  const mappedInput: ContentDecayRefreshInput = Object.freeze({
    pageUrl,
    pageIdentityFingerprint: input.pageIdentityFingerprint,
    contentOpportunityFingerprint: input.contentOpportunityFingerprint,
    gsc,
    ranking,
    serpChange,
  });
  const assessment = buildContentDecayRefreshAssessment(mappedInput);
  const evidenceBindings = Object.freeze({
    gscBeforeObservationFingerprint: input.gsc?.before.observation.observationFingerprint ?? null,
    gscAfterObservationFingerprint: input.gsc?.after.observation.observationFingerprint ?? null,
    serpBeforeRankingFingerprint: input.serp?.before.rankingFingerprint ?? null,
    serpAfterRankingFingerprint: input.serp?.after.rankingFingerprint ?? null,
  });
  const adapterLimitations = Object.freeze([...new Set(limitations)].sort());
  const base = {
    version: UGP_DECAY_EVIDENCE_ADAPTER_VERSION,
    pageUrl,
    mappedInput,
    assessment,
    adapterLimitations,
    evidenceBindings,
    semantics: SEMANTICS,
  };
  return Object.freeze({
    ...base,
    adapterFingerprint: stableEvidenceHash({
      purpose: "ugp_content_decay_evidence_adapter",
      ...base,
    }),
  });
}

export function assertContentDecayEvidenceAdapterIntegrity(
  result: ContentDecayEvidenceAdapterResult,
): void {
  if (result.version !== UGP_DECAY_EVIDENCE_ADAPTER_VERSION) {
    throw new Error("ugp_decay_adapter_version_invalid");
  }
  canonicalPageUrl(result.pageUrl);
  exactSafety(result.semantics, SEMANTICS, "ugp_decay_adapter_semantics_invalid");
  requireFingerprint(result.adapterFingerprint, "ugp_decay_adapter_fingerprint_invalid");
  const { adapterFingerprint, ...base } = result;
  const expected = stableEvidenceHash({
    purpose: "ugp_content_decay_evidence_adapter",
    ...base,
  });
  if (expected !== adapterFingerprint) {
    throw new Error("ugp_decay_adapter_fingerprint_mismatch");
  }
}
