import { createHash } from "node:crypto";
import {
  normalizeBacklinkDomain,
  type BacklinkFixtureBundle,
  type BacklinkGapClassification,
  type BacklinkFreshnessState,
} from "./backlink-fixture-normalization.js";
import type {
  CompetitorEvidenceEnvelope,
  OwnedSemanticSignals,
} from "./competitor-intelligence.js";
import type { SerpRankingProjection, SerpOrganicRankItem } from "./dataforseo-serp-adapter.js";
import type { KeywordMetricProjection, PaidCompetitionLevel } from "./keyword-metrics-normalization.js";
import type { CategoryContext, MarketProfile } from "./market-category-intelligence.js";
import type {
  KeywordTrendSummary,
  TrendDirection,
  TrendProjection,
} from "./trend-metrics-normalization.js";

export const P5_6_COMPETITOR_GAP_PIPELINE_VERSION =
  "p5.6-competitor-visibility-gap-pipeline-v1" as const;

export const P5_6_MAX_COMPETITORS = 10 as const;
export const P5_6_MAX_SERP_PROJECTIONS = 500 as const;
export const P5_6_MAX_KEYWORD_PROJECTIONS = 500 as const;
export const P5_6_MAX_TREND_FRAMES = 100 as const;
export const P5_6_MAX_COMPETITOR_PAGES = 1_000 as const;
export const P5_6_MAX_TOPIC_UNIVERSE = 2_000 as const;

const EXPECTED_SERP_VERSION = "p5.2-dataforseo-serp-adapter-v1";
const EXPECTED_KEYWORD_VERSION = "p5.3-keyword-metrics-v1";
const EXPECTED_TREND_VERSION = "p5.4-trend-metrics-v1";
const EXPECTED_BACKLINK_VERSION = "p5.5-backlink-fixture-v1";
const EXPECTED_COMPETITOR_EVIDENCE_KIND = "competitor_page_observation";
const EXPECTED_COMPETITOR_SCHEMA_VERSION = "competitor_page_observation_v1";
const EXPECTED_COMPETITOR_CODE_VERSION = "task58-competitor-evidence-v1";
const HEX_64 = /^[0-9a-f]{64}$/;

export type ReviewedCompetitorInput = {
  domain: string;
  manuallyReviewed: true;
};

export type NormalizedOwnedSemanticSignals = {
  keywordThemes: string[];
  taxonomyLabels: string[];
  schemaTypes: string[];
  entityTypes: string[];
  internalLinkPatterns: string[];
};

export type CompetitorVisibilityPipelineInput = {
  market: MarketProfile;
  category: CategoryContext;
  referenceTime: string;
  ownedDomain: string;
  ownedSignals: OwnedSemanticSignals;
  competitors: ReviewedCompetitorInput[];
  serpRankings?: SerpRankingProjection[];
  keywordMetrics?: KeywordMetricProjection[];
  trends?: TrendProjection[];
  competitorPages?: CompetitorEvidenceEnvelope[];
  backlinks?: BacklinkFixtureBundle | null;
};

export type BacklinkAuthorityView = {
  value: number | null;
  providerKey: string;
  providerMethod: string;
  metricName: string;
  min: number;
  max: number;
  crossProviderComparable: false;
};

export type CompetitorVisibilitySummary = {
  domain: string;
  observedSerpTopicCount: number;
  visibleTopicCount: number;
  top10VisibleTopicCount: number;
  top20VisibleTopicCount: number;
  bestObservedOrganicRank: number | null;
  observedTopicVisibilityRatio: number;
  competitorOnlyVisibleTopicCount: number;
  sharedOwnedCompetitorVisibleTopicCount: number;
  pageEvidenceCount: number;
  visiblePageEvidenceCount: number;
  semanticDifferencePageCount: number;
  backlinkAuthority: BacklinkAuthorityView | null;
  backlinkGapReferringDomainCount: number;
  backlinkSharedCoverageReferringDomainCount: number;
};

export type PageSemanticGapRow = {
  competitorDomain: string;
  sourceUrl: string;
  pageKey: string;
  pageType: string | null;
  observedAt: string;
  confidence: number;
  evidenceFingerprint: string;
  semanticDifferences: NormalizedOwnedSemanticSignals;
  semanticDifferenceCount: number;
  semanticDifferenceObserved: boolean;
  serpTopicAppearanceCount: number;
  bestObservedOrganicRank: number | null;
  observedSerpTopics: string[];
};

export type TopicSerpState =
  | "owned_only"
  | "shared"
  | "competitor_only"
  | "neither"
  | "unmeasured";

export type TopicSemanticState =
  | "owned_only"
  | "shared"
  | "competitor_only"
  | "neither";

export type TopicKeywordMetricContext = {
  projectionFingerprint: string;
  avgMonthlySearchVolume: number | null;
  organicDifficultyScore: number | null;
  organicDifficultyCrossProviderComparable: false;
  cpcAmount: number | null;
  cpcCurrency: string;
  cpcBasis: string;
  paidCompetitionRatio: number | null;
  paidCompetitionIndex: number | null;
  paidCompetitionLevel: PaidCompetitionLevel;
};

export type TopicTrendContext = {
  projectionFingerprint: string;
  frameFingerprint: string;
  latestRelativeIndex: number | null;
  signedVelocity: number | null;
  coverageRatio: number;
  direction: TrendDirection;
  crossFrameComparable: false;
  absoluteSearchVolume: false;
  zeroMeansInsufficientData: true;
};

export type TopicGapRow = {
  topic: string;
  ownedSemanticPresent: boolean;
  competitorSemanticDomains: string[];
  serpMeasured: boolean;
  ownedSerpPresent: boolean;
  ownedBestRank: number | null;
  competitorSerpPresence: Array<{ domain: string; bestRank: number }>;
  competitorBestRank: number | null;
  serpState: TopicSerpState;
  semanticState: TopicSemanticState;
  serpGapObserved: boolean;
  semanticGapObserved: boolean;
  topicGapObserved: boolean;
  keywordMetrics: TopicKeywordMetricContext | null;
  trend: TopicTrendContext | null;
};

export type LinkGapOperationalRow = {
  referringDomain: string;
  ownedPresent: boolean;
  competitorPresence: Array<{ domain: string; present: boolean }>;
  competitorPresenceCount: number;
  competitorCoverageRatio: number;
  authority: number | null;
  latestLastSeenAt: string | null;
  freshnessState: BacklinkFreshnessState;
  classification: BacklinkGapClassification;
};

export type CompetitorVisibilityGapReport = {
  version: typeof P5_6_COMPETITOR_GAP_PIPELINE_VERSION;
  reportId: string;
  reportFingerprint: string;
  referenceTime: string;
  marketFingerprint: string;
  categoryFingerprint: string;
  ownedDomain: string;
  competitorDomains: string[];
  ownedSignals: NormalizedOwnedSemanticSignals;
  competitorVisibility: CompetitorVisibilitySummary[];
  pageSemanticGaps: PageSemanticGapRow[];
  topicGaps: TopicGapRow[];
  linkGaps: LinkGapOperationalRow[];
  coverage: {
    reviewedCompetitorCount: number;
    serpTopicCount: number;
    keywordMetricTopicCount: number;
    trendTopicCount: number;
    competitorPageEvidenceCount: number;
    backlinkBundleSupplied: boolean;
    topicUniverseCount: number;
  };
  diagnostics: string[];
  lineage: {
    serpRankingFingerprints: string[];
    keywordProjectionFingerprints: string[];
    trendProjectionFingerprints: string[];
    trendFrameFingerprints: string[];
    competitorEvidenceFingerprints: string[];
    backlinkBundleFingerprint: string | null;
  };
  semantics: {
    observedTopicVisibilityRatioIsMarketShare: false;
    pageSemanticDifferenceImpliesMissingOwnedPage: false;
    topicGapImpliesRecommendation: false;
    backlinkGapImpliesOutreachSuitability: false;
    trendCrossFrameComparable: false;
    crossSignalOpportunityScoreIncluded: false;
    descriptiveOnly: true;
  };
  safety: ReturnType<typeof competitorVisibilityGapPipelineCapability>;
};

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function round6(value: number): number {
  return Number(value.toFixed(6));
}

function cleanText(value: unknown, name: string, max: number): string {
  if (typeof value !== "string") throw new Error(`invalid_${name}`);
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > max || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error(`invalid_${name}`);
  }
  return normalized;
}

function canonicalTimestamp(value: unknown, name: string): string {
  const raw = cleanText(value, name, 64);
  const milliseconds = Date.parse(raw);
  if (!Number.isFinite(milliseconds)) throw new Error(`invalid_${name}`);
  return new Date(milliseconds).toISOString();
}

function canonicalTopic(value: unknown): string {
  return cleanText(value, "topic", 255).toLowerCase();
}

function normalizedTerms(value: unknown, name: string): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > P5_6_MAX_TOPIC_UNIVERSE) throw new Error(`invalid_${name}`);
  const result = new Set<string>();
  for (const item of value) result.add(canonicalTopic(item));
  return [...result].sort((a, b) => a.localeCompare(b));
}

function sameArray(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function validFingerprint(value: unknown, name: string): string {
  const fingerprint = cleanText(value, name, 64).toLowerCase();
  if (!HEX_64.test(fingerprint)) throw new Error(`invalid_${name}`);
  return fingerprint;
}

function boundedRatio(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`invalid_${name}`);
  }
  return value;
}

function boundedRank(value: unknown, name: string): number {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 10_000) {
    throw new Error(`invalid_${name}`);
  }
  return value as number;
}

export function canonicalVisibilityDomain(value: unknown): string {
  const exact = normalizeBacklinkDomain(value, { allowUrl: true });
  return exact.startsWith("www.") ? exact.slice(4) : exact;
}

export function canonicalVisibilityPageKey(value: unknown): string {
  const raw = cleanText(value, "page_url", 4096);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("invalid_page_url");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("invalid_page_url");
  if (parsed.username || parsed.password) throw new Error("invalid_page_url");
  const domain = canonicalVisibilityDomain(parsed.hostname);
  let pathname = parsed.pathname || "/";
  if (pathname !== "/") pathname = pathname.replace(/\/+$/, "") || "/";
  return `${domain}${pathname}`;
}

function normalizeOwnedSignals(input: OwnedSemanticSignals): NormalizedOwnedSemanticSignals {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_owned_signals");
  return {
    keywordThemes: normalizedTerms(input.keywordThemes ?? [], "owned_keyword_themes"),
    taxonomyLabels: normalizedTerms(input.taxonomyLabels ?? [], "owned_taxonomy_labels"),
    schemaTypes: normalizedTerms(input.schemaTypes ?? [], "owned_schema_types"),
    entityTypes: normalizedTerms(input.entityTypes ?? [], "owned_entity_types"),
    internalLinkPatterns: normalizedTerms(input.internalLinkPatterns ?? [], "owned_internal_link_patterns"),
  };
}

function normalizeCompetitorCohort(
  ownedDomain: string,
  competitors: ReviewedCompetitorInput[],
): string[] {
  if (!Array.isArray(competitors) || competitors.length < 1 || competitors.length > P5_6_MAX_COMPETITORS) {
    throw new Error("invalid_reviewed_competitors");
  }
  const normalized = competitors.map((competitor) => {
    if (!competitor || typeof competitor !== "object" || competitor.manuallyReviewed !== true) {
      throw new Error("manual_review_required");
    }
    return canonicalVisibilityDomain(competitor.domain);
  });
  if (normalized.includes(ownedDomain)) throw new Error("owned_domain_in_competitor_set");
  if (new Set(normalized).size !== normalized.length) throw new Error("duplicate_competitor_domain");
  return normalized.sort((a, b) => a.localeCompare(b));
}

function assertWithinReference(observedAt: string, referenceTime: string, name: string): string {
  const normalized = canonicalTimestamp(observedAt, name);
  if (Date.parse(normalized) > Date.parse(referenceTime)) throw new Error("artifact_observed_after_reference_time");
  return normalized;
}

function bestRank(items: SerpOrganicRankItem[], domain: string): number | null {
  let result: number | null = null;
  for (const item of items) {
    const rank = boundedRank(item.rankGroup, "serp_rank_group");
    if (canonicalVisibilityDomain(item.domain) !== domain) continue;
    if (result === null || rank < result) result = rank;
  }
  return result;
}

function validateSerpProjection(
  projection: SerpRankingProjection,
  marketFingerprint: string,
  categoryFingerprint: string,
  referenceTime: string,
): { topic: string; observedAt: string } {
  if (!projection || typeof projection !== "object" || projection.version !== EXPECTED_SERP_VERSION) {
    throw new Error("unsupported_serp_projection");
  }
  if (projection.marketFingerprint !== marketFingerprint) throw new Error("serp_market_mismatch");
  if (projection.categoryFingerprint !== categoryFingerprint) throw new Error("serp_category_mismatch");
  validFingerprint(projection.rankingFingerprint, "serp_ranking_fingerprint");
  validFingerprint(projection.sourceFingerprint, "serp_source_fingerprint");
  const observedAt = assertWithinReference(projection.observedAt, referenceTime, "serp_observed_at");
  const topic = canonicalTopic(projection.keyword);
  if (!Array.isArray(projection.organicItems)) throw new Error("invalid_serp_organic_items");
  for (const item of projection.organicItems) {
    if (!item || typeof item !== "object") throw new Error("invalid_serp_organic_item");
    boundedRank(item.rankGroup, "serp_rank_group");
    boundedRank(item.rankAbsolute, "serp_rank_absolute");
    canonicalVisibilityDomain(item.domain);
    canonicalVisibilityPageKey(item.url);
  }
  return { topic, observedAt };
}

function validateKeywordProjection(
  projection: KeywordMetricProjection,
  marketFingerprint: string,
  categoryFingerprint: string,
  referenceTime: string,
): string {
  if (!projection || typeof projection !== "object" || projection.version !== EXPECTED_KEYWORD_VERSION) {
    throw new Error("unsupported_keyword_projection");
  }
  if (projection.basis.marketFingerprint !== marketFingerprint) throw new Error("keyword_market_mismatch");
  if (projection.basis.categoryFingerprint !== categoryFingerprint) throw new Error("keyword_category_mismatch");
  validFingerprint(projection.projectionFingerprint, "keyword_projection_fingerprint");
  validFingerprint(projection.basisFingerprint, "keyword_basis_fingerprint");
  assertWithinReference(projection.observedAt, referenceTime, "keyword_observed_at");
  if (projection.organicDifficulty.crossProviderComparable !== false) {
    throw new Error("keyword_difficulty_comparability_mismatch");
  }
  return canonicalTopic(projection.keyword);
}

function validateTrendProjection(
  projection: TrendProjection,
  marketFingerprint: string,
  categoryFingerprint: string,
  referenceTime: string,
): Array<{ topic: string; summary: KeywordTrendSummary }> {
  if (!projection || typeof projection !== "object" || projection.version !== EXPECTED_TREND_VERSION) {
    throw new Error("unsupported_trend_projection");
  }
  if (projection.basis.marketFingerprint !== marketFingerprint) throw new Error("trend_market_mismatch");
  if (projection.basis.categoryFingerprint !== categoryFingerprint) throw new Error("trend_category_mismatch");
  validFingerprint(projection.projectionFingerprint, "trend_projection_fingerprint");
  validFingerprint(projection.frameFingerprint, "trend_frame_fingerprint");
  assertWithinReference(projection.observedAt, referenceTime, "trend_observed_at");
  if (
    projection.semantics.crossFrameComparable !== false
    || projection.semantics.absoluteSearchVolume !== false
    || projection.semantics.zeroMeansInsufficientData !== true
    || projection.semantics.descriptiveOnly !== true
  ) {
    throw new Error("trend_semantics_mismatch");
  }
  if (!Array.isArray(projection.keywordSummaries)) throw new Error("invalid_trend_summaries");
  const seen = new Set<string>();
  return projection.keywordSummaries.map((summary) => {
    const topic = canonicalTopic(summary.keyword);
    if (seen.has(topic)) throw new Error("duplicate_trend_keyword_in_frame");
    seen.add(topic);
    boundedRatio(summary.coverageRatio, "trend_coverage_ratio");
    if (
      summary.direction !== "rising"
      && summary.direction !== "falling"
      && summary.direction !== "flat"
      && summary.direction !== "unavailable"
    ) {
      throw new Error("invalid_trend_direction");
    }
    return { topic, summary };
  });
}

function validateNormalizedSignalList(value: unknown, name: string): string[] {
  if (!Array.isArray(value)) throw new Error(`invalid_${name}`);
  const normalized = normalizedTerms(value, name);
  const supplied = value.map((item) => canonicalTopic(item));
  if (!sameArray(supplied, normalized)) throw new Error("competitor_page_signal_not_normalized");
  return normalized;
}

type ValidatedPage = {
  record: CompetitorEvidenceEnvelope;
  competitorDomain: string;
  pageKey: string;
  keywordThemes: string[];
  taxonomyLabels: string[];
  schemaTypes: string[];
  entityTypes: string[];
  internalLinkPatterns: string[];
};

function validateCompetitorPage(
  record: CompetitorEvidenceEnvelope,
  competitorSet: Set<string>,
  referenceTime: string,
): ValidatedPage {
  if (!record || typeof record !== "object" || record.kind !== EXPECTED_COMPETITOR_EVIDENCE_KIND) {
    throw new Error("unsupported_competitor_evidence");
  }
  const payload = record.payload;
  if (
    payload.schemaVersion !== EXPECTED_COMPETITOR_SCHEMA_VERSION
    || payload.codeVersion !== EXPECTED_COMPETITOR_CODE_VERSION
  ) {
    throw new Error("unsupported_competitor_evidence_version");
  }
  if (
    payload.advisoryOnly !== true
    || payload.causalAttribution !== false
    || payload.executionAuthorized !== false
    || payload.publicSiteWrites !== false
    || payload.automaticTransition !== false
  ) {
    throw new Error("competitor_evidence_safety_mismatch");
  }
  const competitorDomain = canonicalVisibilityDomain(payload.competitorDomain);
  if (!competitorSet.has(competitorDomain)) throw new Error("unreviewed_competitor_page_evidence");
  const pageKey = canonicalVisibilityPageKey(payload.sourceUrl);
  if (!pageKey.startsWith(`${competitorDomain}/`) && pageKey !== competitorDomain) {
    throw new Error("competitor_page_domain_mismatch");
  }
  assertWithinReference(record.observedAt, referenceTime, "competitor_page_observed_at");
  if (typeof record.confidence !== "number" || !Number.isFinite(record.confidence) || record.confidence < 0 || record.confidence > 1) {
    throw new Error("invalid_competitor_page_confidence");
  }
  const fingerprint = validFingerprint(payload.fingerprint, "competitor_evidence_fingerprint");
  if (record.provenance?.contentFingerprint !== fingerprint) throw new Error("competitor_evidence_provenance_mismatch");
  return {
    record,
    competitorDomain,
    pageKey,
    keywordThemes: validateNormalizedSignalList(payload.signals.keywordThemes, "competitor_keyword_themes"),
    taxonomyLabels: validateNormalizedSignalList(payload.signals.taxonomyLabels, "competitor_taxonomy_labels"),
    schemaTypes: validateNormalizedSignalList(payload.signals.schemaTypes, "competitor_schema_types"),
    entityTypes: validateNormalizedSignalList(payload.signals.entityTypes, "competitor_entity_types"),
    internalLinkPatterns: validateNormalizedSignalList(
      payload.signals.internalLinkPatterns,
      "competitor_internal_link_patterns",
    ),
  };
}

function deduplicatePages(pages: ValidatedPage[]): ValidatedPage[] {
  const sorted = [...pages].sort(
    (a, b) =>
      b.record.observedAt.localeCompare(a.record.observedAt)
      || a.record.payload.fingerprint.localeCompare(b.record.payload.fingerprint),
  );
  const seen = new Set<string>();
  const deduplicated = sorted.filter((page) => {
    const fingerprint = page.record.payload.fingerprint;
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
  return deduplicated.sort(
    (a, b) =>
      a.competitorDomain.localeCompare(b.competitorDomain)
      || a.pageKey.localeCompare(b.pageKey)
      || a.record.payload.fingerprint.localeCompare(b.record.payload.fingerprint),
  );
}

function difference(competitorValues: string[], ownedValues: string[]): string[] {
  const owned = new Set(ownedValues);
  return competitorValues.filter((value) => !owned.has(value));
}

function semanticDifferences(
  owned: NormalizedOwnedSemanticSignals,
  page: ValidatedPage,
): NormalizedOwnedSemanticSignals {
  return {
    keywordThemes: difference(page.keywordThemes, owned.keywordThemes),
    taxonomyLabels: difference(page.taxonomyLabels, owned.taxonomyLabels),
    schemaTypes: difference(page.schemaTypes, owned.schemaTypes),
    entityTypes: difference(page.entityTypes, owned.entityTypes),
    internalLinkPatterns: difference(page.internalLinkPatterns, owned.internalLinkPatterns),
  };
}

function semanticDifferenceCount(value: NormalizedOwnedSemanticSignals): number {
  return (
    value.keywordThemes.length
    + value.taxonomyLabels.length
    + value.schemaTypes.length
    + value.entityTypes.length
    + value.internalLinkPatterns.length
  );
}

function pageSerpEvidence(
  pageKey: string,
  serpByTopic: Map<string, SerpRankingProjection>,
): { topics: string[]; bestRank: number | null } {
  const topics: string[] = [];
  let best: number | null = null;
  for (const [topic, projection] of serpByTopic) {
    const matching = projection.organicItems.filter((item) => canonicalVisibilityPageKey(item.url) === pageKey);
    if (matching.length === 0) continue;
    topics.push(topic);
    for (const item of matching) {
      const rank = boundedRank(item.rankGroup, "serp_rank_group");
      if (best === null || rank < best) best = rank;
    }
  }
  return { topics: topics.sort((a, b) => a.localeCompare(b)), bestRank: best };
}

function semanticState(owned: boolean, competitorDomains: string[]): TopicSemanticState {
  const competitor = competitorDomains.length > 0;
  if (owned && competitor) return "shared";
  if (owned) return "owned_only";
  if (competitor) return "competitor_only";
  return "neither";
}

function serpState(
  measured: boolean,
  owned: boolean,
  competitorPresence: Array<{ domain: string; bestRank: number }>,
): TopicSerpState {
  if (!measured) return "unmeasured";
  const competitor = competitorPresence.length > 0;
  if (owned && competitor) return "shared";
  if (owned) return "owned_only";
  if (competitor) return "competitor_only";
  return "neither";
}

function keywordMetricContext(projection: KeywordMetricProjection | undefined): TopicKeywordMetricContext | null {
  if (!projection) return null;
  return {
    projectionFingerprint: projection.projectionFingerprint,
    avgMonthlySearchVolume: projection.searchVolume.avgMonthly,
    organicDifficultyScore: projection.organicDifficulty.score,
    organicDifficultyCrossProviderComparable: false,
    cpcAmount: projection.paid.cpc.amount,
    cpcCurrency: projection.paid.cpc.currency,
    cpcBasis: projection.paid.cpc.basis,
    paidCompetitionRatio: projection.paid.competition.ratio,
    paidCompetitionIndex: projection.paid.competition.index,
    paidCompetitionLevel: projection.paid.competition.level,
  };
}

function trendContext(
  entry: { projection: TrendProjection; summary: KeywordTrendSummary } | undefined,
): TopicTrendContext | null {
  if (!entry) return null;
  return {
    projectionFingerprint: entry.projection.projectionFingerprint,
    frameFingerprint: entry.projection.frameFingerprint,
    latestRelativeIndex: entry.summary.latestRelativeIndex,
    signedVelocity: entry.summary.signedVelocity,
    coverageRatio: entry.summary.coverageRatio,
    direction: entry.summary.direction,
    crossFrameComparable: false,
    absoluteSearchVolume: false,
    zeroMeansInsufficientData: true,
  };
}

function validateBacklinks(
  bundle: BacklinkFixtureBundle,
  input: {
    marketFingerprint: string;
    categoryFingerprint: string;
    referenceTime: string;
    ownedDomain: string;
    competitorDomains: string[];
  },
): void {
  if (!bundle || typeof bundle !== "object" || bundle.version !== EXPECTED_BACKLINK_VERSION) {
    throw new Error("unsupported_backlink_bundle");
  }
  if (bundle.basis.marketFingerprint !== input.marketFingerprint) throw new Error("backlink_market_mismatch");
  if (bundle.basis.categoryFingerprint !== input.categoryFingerprint) throw new Error("backlink_category_mismatch");
  validFingerprint(bundle.bundleFingerprint, "backlink_bundle_fingerprint");
  if (canonicalTimestamp(bundle.referenceTime, "backlink_reference_time") !== input.referenceTime) {
    throw new Error("backlink_reference_time_mismatch");
  }
  assertWithinReference(bundle.observedAt, input.referenceTime, "backlink_observed_at");
  if (canonicalVisibilityDomain(bundle.owned.targetDomain) !== input.ownedDomain) {
    throw new Error("backlink_owned_domain_mismatch");
  }
  const competitors = bundle.competitors
    .map((profile) => canonicalVisibilityDomain(profile.targetDomain))
    .sort((a, b) => a.localeCompare(b));
  if (new Set(competitors).size !== competitors.length) {
    throw new Error("backlink_competitor_alias_collision");
  }
  if (!sameArray(competitors, input.competitorDomains)) throw new Error("backlink_competitor_cohort_mismatch");

  for (const candidate of bundle.gapCandidates) {
    const candidateCompetitors = candidate.competitors
      .map((presence) => canonicalVisibilityDomain(presence.targetDomain))
      .sort((a, b) => a.localeCompare(b));
    if (!sameArray(candidateCompetitors, input.competitorDomains)) {
      throw new Error("backlink_gap_competitor_cohort_mismatch");
    }
  }
}

function buildLinkRows(
  bundle: BacklinkFixtureBundle | null,
): LinkGapOperationalRow[] {
  if (!bundle) return [];
  return bundle.gapCandidates
    .map((candidate) => ({
      referringDomain: candidate.referringDomain,
      ownedPresent: candidate.ownedPresent,
      competitorPresence: candidate.competitors
        .map((presence) => ({
          domain: canonicalVisibilityDomain(presence.targetDomain),
          present: presence.present,
        }))
        .sort((a, b) => a.domain.localeCompare(b.domain)),
      competitorPresenceCount: candidate.competitorPresenceCount,
      competitorCoverageRatio: candidate.competitorCoverageRatio,
      authority: candidate.authority,
      latestLastSeenAt: candidate.latestLastSeenAt,
      freshnessState: candidate.freshnessState,
      classification: candidate.classification,
    }))
    .sort((a, b) => a.referringDomain.localeCompare(b.referringDomain));
}

function backlinkAuthority(
  bundle: BacklinkFixtureBundle | null,
  competitorDomain: string,
): BacklinkAuthorityView | null {
  if (!bundle) return null;
  const profile = bundle.competitors.find(
    (candidate) => canonicalVisibilityDomain(candidate.targetDomain) === competitorDomain,
  );
  if (!profile) return null;
  return {
    value: profile.summary.authority,
    providerKey: bundle.basis.providerKey,
    providerMethod: bundle.basis.providerMethod,
    metricName: bundle.basis.authorityMetric.name,
    min: bundle.basis.authorityMetric.min,
    max: bundle.basis.authorityMetric.max,
    crossProviderComparable: false,
  };
}

function buildCompetitorVisibility(
  competitorDomains: string[],
  ownedDomain: string,
  serpByTopic: Map<string, SerpRankingProjection>,
  pageRows: PageSemanticGapRow[],
  bundle: BacklinkFixtureBundle | null,
): CompetitorVisibilitySummary[] {
  return competitorDomains.map((domain) => {
    let visibleTopicCount = 0;
    let top10VisibleTopicCount = 0;
    let top20VisibleTopicCount = 0;
    let bestObservedOrganicRank: number | null = null;
    let competitorOnlyVisibleTopicCount = 0;
    let sharedOwnedCompetitorVisibleTopicCount = 0;

    for (const projection of serpByTopic.values()) {
      const competitorRank = bestRank(projection.organicItems, domain);
      const ownedRank = bestRank(projection.organicItems, ownedDomain);
      if (competitorRank === null) continue;
      visibleTopicCount += 1;
      if (competitorRank <= 10) top10VisibleTopicCount += 1;
      if (competitorRank <= 20) top20VisibleTopicCount += 1;
      if (bestObservedOrganicRank === null || competitorRank < bestObservedOrganicRank) {
        bestObservedOrganicRank = competitorRank;
      }
      if (ownedRank === null) competitorOnlyVisibleTopicCount += 1;
      else sharedOwnedCompetitorVisibleTopicCount += 1;
    }

    const domainPages = pageRows.filter((row) => row.competitorDomain === domain);
    const gapCount = bundle
      ? bundle.gapCandidates.filter(
          (candidate) =>
            !candidate.ownedPresent
            && candidate.competitors.some(
              (presence) =>
                canonicalVisibilityDomain(presence.targetDomain) === domain
                && presence.present,
            ),
        ).length
      : 0;
    const sharedCoverageCount = bundle
      ? bundle.gapCandidates.filter(
          (candidate) =>
            candidate.ownedPresent
            && candidate.competitors.some(
              (presence) =>
                canonicalVisibilityDomain(presence.targetDomain) === domain
                && presence.present,
            ),
        ).length
      : 0;

    return {
      domain,
      observedSerpTopicCount: serpByTopic.size,
      visibleTopicCount,
      top10VisibleTopicCount,
      top20VisibleTopicCount,
      bestObservedOrganicRank,
      observedTopicVisibilityRatio:
        serpByTopic.size === 0 ? 0 : round6(visibleTopicCount / serpByTopic.size),
      competitorOnlyVisibleTopicCount,
      sharedOwnedCompetitorVisibleTopicCount,
      pageEvidenceCount: domainPages.length,
      visiblePageEvidenceCount: domainPages.filter((row) => row.serpTopicAppearanceCount > 0).length,
      semanticDifferencePageCount: domainPages.filter((row) => row.semanticDifferenceObserved).length,
      backlinkAuthority: backlinkAuthority(bundle, domain),
      backlinkGapReferringDomainCount: gapCount,
      backlinkSharedCoverageReferringDomainCount: sharedCoverageCount,
    };
  });
}

function reportIdentity(input: Omit<
  CompetitorVisibilityGapReport,
  "version" | "reportId" | "reportFingerprint" | "safety"
>) {
  return input;
}

export function buildCompetitorVisibilityGapReport(
  input: CompetitorVisibilityPipelineInput,
): CompetitorVisibilityGapReport {
  if (!input || typeof input !== "object") throw new Error("invalid_pipeline_input");
  const marketFingerprint = validFingerprint(input.market?.fingerprint, "market_fingerprint");
  const categoryFingerprint = validFingerprint(input.category?.fingerprint, "category_fingerprint");
  const referenceTime = canonicalTimestamp(input.referenceTime, "reference_time");
  const ownedDomain = canonicalVisibilityDomain(input.ownedDomain);
  const competitorDomains = normalizeCompetitorCohort(ownedDomain, input.competitors);
  const competitorSet = new Set(competitorDomains);
  const ownedSignals = normalizeOwnedSignals(input.ownedSignals);

  const serpRankings = input.serpRankings ?? [];
  const keywordMetrics = input.keywordMetrics ?? [];
  const trends = input.trends ?? [];
  const competitorPages = input.competitorPages ?? [];
  if (!Array.isArray(serpRankings) || serpRankings.length > P5_6_MAX_SERP_PROJECTIONS) {
    throw new Error("invalid_serp_projection_count");
  }
  if (!Array.isArray(keywordMetrics) || keywordMetrics.length > P5_6_MAX_KEYWORD_PROJECTIONS) {
    throw new Error("invalid_keyword_projection_count");
  }
  if (!Array.isArray(trends) || trends.length > P5_6_MAX_TREND_FRAMES) {
    throw new Error("invalid_trend_frame_count");
  }
  if (!Array.isArray(competitorPages) || competitorPages.length > P5_6_MAX_COMPETITOR_PAGES) {
    throw new Error("invalid_competitor_page_count");
  }

  const serpByTopic = new Map<string, SerpRankingProjection>();
  for (const projection of serpRankings) {
    const { topic } = validateSerpProjection(
      projection,
      marketFingerprint,
      categoryFingerprint,
      referenceTime,
    );
    if (serpByTopic.has(topic)) throw new Error("duplicate_serp_topic");
    serpByTopic.set(topic, projection);
  }

  const keywordByTopic = new Map<string, KeywordMetricProjection>();
  for (const projection of keywordMetrics) {
    const topic = validateKeywordProjection(
      projection,
      marketFingerprint,
      categoryFingerprint,
      referenceTime,
    );
    if (keywordByTopic.has(topic)) throw new Error("duplicate_keyword_metric_topic");
    keywordByTopic.set(topic, projection);
  }

  const trendByTopic = new Map<string, { projection: TrendProjection; summary: KeywordTrendSummary }>();
  for (const projection of trends) {
    for (const entry of validateTrendProjection(
      projection,
      marketFingerprint,
      categoryFingerprint,
      referenceTime,
    )) {
      if (trendByTopic.has(entry.topic)) throw new Error("trend_topic_in_multiple_frames");
      trendByTopic.set(entry.topic, { projection, summary: entry.summary });
    }
  }

  const validatedPages = deduplicatePages(
    competitorPages.map((record) => validateCompetitorPage(record, competitorSet, referenceTime)),
  );

  const backlinkBundle = input.backlinks ?? null;
  if (backlinkBundle) {
    validateBacklinks(backlinkBundle, {
      marketFingerprint,
      categoryFingerprint,
      referenceTime,
      ownedDomain,
      competitorDomains,
    });
  }

  const pageSemanticGaps: PageSemanticGapRow[] = validatedPages.map((page) => {
    const differences = semanticDifferences(ownedSignals, page);
    const count = semanticDifferenceCount(differences);
    const serpEvidence = pageSerpEvidence(page.pageKey, serpByTopic);
    return {
      competitorDomain: page.competitorDomain,
      sourceUrl: page.record.payload.sourceUrl,
      pageKey: page.pageKey,
      pageType: page.record.payload.pageType,
      observedAt: canonicalTimestamp(page.record.observedAt, "competitor_page_observed_at"),
      confidence: page.record.confidence,
      evidenceFingerprint: page.record.payload.fingerprint,
      semanticDifferences: differences,
      semanticDifferenceCount: count,
      semanticDifferenceObserved: count > 0,
      serpTopicAppearanceCount: serpEvidence.topics.length,
      bestObservedOrganicRank: serpEvidence.bestRank,
      observedSerpTopics: serpEvidence.topics,
    };
  });

  const topics = new Set<string>();
  for (const topic of ownedSignals.keywordThemes) topics.add(topic);
  for (const topic of serpByTopic.keys()) topics.add(topic);
  for (const topic of keywordByTopic.keys()) topics.add(topic);
  for (const topic of trendByTopic.keys()) topics.add(topic);
  for (const page of validatedPages) for (const topic of page.keywordThemes) topics.add(topic);
  if (topics.size > P5_6_MAX_TOPIC_UNIVERSE) throw new Error("topic_universe_limit_exceeded");

  const topicGaps: TopicGapRow[] = [...topics]
    .sort((a, b) => a.localeCompare(b))
    .map((topic) => {
      const projection = serpByTopic.get(topic);
      const ownedSemanticPresent = ownedSignals.keywordThemes.includes(topic);
      const competitorSemanticDomains = competitorDomains.filter((domain) =>
        validatedPages.some(
          (page) => page.competitorDomain === domain && page.keywordThemes.includes(topic),
        ),
      );
      const competitorSerpPresence = projection
        ? competitorDomains
            .map((domain) => ({ domain, bestRank: bestRank(projection.organicItems, domain) }))
            .filter(
              (entry): entry is { domain: string; bestRank: number } =>
                entry.bestRank !== null,
            )
        : [];
      const ownedBestRank = projection ? bestRank(projection.organicItems, ownedDomain) : null;
      const currentSerpState = serpState(
        Boolean(projection),
        ownedBestRank !== null,
        competitorSerpPresence,
      );
      const currentSemanticState = semanticState(
        ownedSemanticPresent,
        competitorSemanticDomains,
      );
      const competitorBestRank =
        competitorSerpPresence.length === 0
          ? null
          : Math.min(...competitorSerpPresence.map((entry) => entry.bestRank));
      const serpGapObserved = currentSerpState === "competitor_only";
      const semanticGapObserved = currentSemanticState === "competitor_only";
      return {
        topic,
        ownedSemanticPresent,
        competitorSemanticDomains,
        serpMeasured: Boolean(projection),
        ownedSerpPresent: ownedBestRank !== null,
        ownedBestRank,
        competitorSerpPresence,
        competitorBestRank,
        serpState: currentSerpState,
        semanticState: currentSemanticState,
        serpGapObserved,
        semanticGapObserved,
        topicGapObserved: serpGapObserved || semanticGapObserved,
        keywordMetrics: keywordMetricContext(keywordByTopic.get(topic)),
        trend: trendContext(trendByTopic.get(topic)),
      };
    });

  const linkGaps = buildLinkRows(backlinkBundle);
  const competitorVisibility = buildCompetitorVisibility(
    competitorDomains,
    ownedDomain,
    serpByTopic,
    pageSemanticGaps,
    backlinkBundle,
  );

  const diagnostics: string[] = [];
  if (serpByTopic.size === 0) diagnostics.push("serp_visibility_unavailable");
  if (keywordByTopic.size === 0) diagnostics.push("keyword_metrics_unavailable");
  if (trendByTopic.size === 0) diagnostics.push("trend_context_unavailable");
  if (validatedPages.length === 0) diagnostics.push("competitor_page_evidence_unavailable");
  if (!backlinkBundle) diagnostics.push("backlink_context_unavailable");
  if (ownedSignals.keywordThemes.length === 0) diagnostics.push("owned_keyword_themes_unavailable");

  const lineage = {
    serpRankingFingerprints: [...serpByTopic.values()]
      .map((projection) => projection.rankingFingerprint)
      .sort((a, b) => a.localeCompare(b)),
    keywordProjectionFingerprints: [...keywordByTopic.values()]
      .map((projection) => projection.projectionFingerprint)
      .sort((a, b) => a.localeCompare(b)),
    trendProjectionFingerprints: [...new Set(
      [...trendByTopic.values()].map((entry) => entry.projection.projectionFingerprint),
    )].sort((a, b) => a.localeCompare(b)),
    trendFrameFingerprints: [...new Set(
      [...trendByTopic.values()].map((entry) => entry.projection.frameFingerprint),
    )].sort((a, b) => a.localeCompare(b)),
    competitorEvidenceFingerprints: validatedPages
      .map((page) => page.record.payload.fingerprint)
      .sort((a, b) => a.localeCompare(b)),
    backlinkBundleFingerprint: backlinkBundle?.bundleFingerprint ?? null,
  };

  const identity = reportIdentity({
    referenceTime,
    marketFingerprint,
    categoryFingerprint,
    ownedDomain,
    competitorDomains,
    ownedSignals,
    competitorVisibility,
    pageSemanticGaps,
    topicGaps,
    linkGaps,
    coverage: {
      reviewedCompetitorCount: competitorDomains.length,
      serpTopicCount: serpByTopic.size,
      keywordMetricTopicCount: keywordByTopic.size,
      trendTopicCount: trendByTopic.size,
      competitorPageEvidenceCount: validatedPages.length,
      backlinkBundleSupplied: backlinkBundle !== null,
      topicUniverseCount: topicGaps.length,
    },
    diagnostics: diagnostics.sort((a, b) => a.localeCompare(b)),
    lineage,
    semantics: {
      observedTopicVisibilityRatioIsMarketShare: false,
      pageSemanticDifferenceImpliesMissingOwnedPage: false,
      topicGapImpliesRecommendation: false,
      backlinkGapImpliesOutreachSuitability: false,
      trendCrossFrameComparable: false,
      crossSignalOpportunityScoreIncluded: false,
      descriptiveOnly: true,
    },
  });
  const reportFingerprint = hash({
    version: P5_6_COMPETITOR_GAP_PIPELINE_VERSION,
    ...identity,
  });

  return {
    version: P5_6_COMPETITOR_GAP_PIPELINE_VERSION,
    reportId: `p56-report-${reportFingerprint.slice(0, 20)}`,
    reportFingerprint,
    ...identity,
    safety: competitorVisibilityGapPipelineCapability(),
  };
}

export function competitorVisibilityGapPipelineCapability() {
  return Object.freeze({
    version: P5_6_COMPETITOR_GAP_PIPELINE_VERSION,
    pureCompositionOnly: true,
    suppliedNormalizedArtifactsOnly: true,
    manualCompetitorReviewRequired: true,
    exactKeywordJoinsOnly: true,
    descriptiveOnly: true,
    opportunityScoringIncluded: false,
    competitorRankingIncluded: false,
    liveCollectionAuthorized: false,
    providerEnrollmentAuthorized: false,
    providerPurchaseAuthorized: false,
    credentialCreationAuthorized: false,
    credentialUseAuthorized: false,
    sourceRegistryAdmissionAuthorized: false,
    targetRegistrationAuthorized: false,
    targetConfigurationMutationAuthorized: false,
    task64ExecutionAuthorized: false,
    task70ExecutionAuthorized: false,
    observationPersistenceAuthorized: false,
    evidencePersistenceAuthorized: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    schemaMutationAuthorized: false,
    schedulerEnabled: false,
    batchEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    publicationAuthorized: false,
    automaticTransition: false,
  });
}
