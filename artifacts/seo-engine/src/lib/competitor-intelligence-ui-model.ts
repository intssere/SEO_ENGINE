import type { StatusTone } from "./status-grammar";

export const P5_7_COMPETITOR_UI_VERSION = "p5.7-competitor-intelligence-ui-v1" as const;

export type UiAuthority = {
  value: number | null;
  providerKey: string;
  providerMethod: string;
  metricName: string;
  min: number;
  max: number;
  crossProviderComparable: false;
};

export type UiCompetitorVisibilityRow = {
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
  backlinkAuthority: UiAuthority | null;
  backlinkGapReferringDomainCount: number;
  backlinkSharedCoverageReferringDomainCount: number;
};

export type UiKeywordMetricContext = {
  avgMonthlySearchVolume: number | null;
  organicDifficultyScore: number | null;
  organicDifficultyCrossProviderComparable: false;
  cpcAmount: number | null;
  cpcCurrency: string;
  paidCompetitionRatio: number | null;
};

export type UiTrendContext = {
  frameFingerprint: string;
  latestRelativeIndex: number | null;
  signedVelocity: number | null;
  coverageRatio: number;
  direction: "rising" | "falling" | "flat" | "unavailable";
  crossFrameComparable: false;
  absoluteSearchVolume: false;
  zeroMeansInsufficientData: true;
};

export type UiTopicGapRow = {
  topic: string;
  ownedSemanticPresent: boolean;
  competitorSemanticDomains: string[];
  serpMeasured: boolean;
  ownedSerpPresent: boolean;
  ownedBestRank: number | null;
  competitorSerpPresence: Array<{ domain: string; bestRank: number }>;
  competitorBestRank: number | null;
  serpState: "owned_only" | "shared" | "competitor_only" | "neither" | "unmeasured";
  semanticState: "owned_only" | "shared" | "competitor_only" | "neither";
  serpGapObserved: boolean;
  semanticGapObserved: boolean;
  topicGapObserved: boolean;
  keywordMetrics: UiKeywordMetricContext | null;
  trend: UiTrendContext | null;
};

export type UiPageSemanticGapRow = {
  competitorDomain: string;
  sourceUrl: string;
  pageKey: string;
  pageType: string | null;
  observedAt: string;
  confidence: number;
  semanticDifferences: {
    keywordThemes: string[];
    taxonomyLabels: string[];
    schemaTypes: string[];
    entityTypes: string[];
    internalLinkPatterns: string[];
  };
  semanticDifferenceCount: number;
  semanticDifferenceObserved: boolean;
  serpTopicAppearanceCount: number;
  bestObservedOrganicRank: number | null;
  observedSerpTopics: string[];
};

export type UiLinkGapRow = {
  referringDomain: string;
  ownedPresent: boolean;
  competitorPresence: Array<{ domain: string; present: boolean }>;
  competitorPresenceCount: number;
  competitorCoverageRatio: number;
  authority: number | null;
  latestLastSeenAt: string | null;
  freshnessState: "fresh" | "recent" | "aging" | "stale" | "unavailable";
  classification:
    | "owned_exclusive"
    | "shared_coverage"
    | "unlinked_observed_domain"
    | "single_competitor_gap"
    | "shared_competitor_gap"
    | "universal_competitor_gap";
};

export type UiCompetitorReportFixture = {
  version: "p5.6-competitor-visibility-gap-pipeline-v1";
  reportFingerprint: string;
  referenceTime: string;
  marketLabel: string;
  categoryLabel: string;
  ownedDomain: string;
  competitorDomains: string[];
  competitorVisibility: UiCompetitorVisibilityRow[];
  pageSemanticGaps: UiPageSemanticGapRow[];
  topicGaps: UiTopicGapRow[];
  linkGaps: UiLinkGapRow[];
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
  semantics: {
    observedTopicVisibilityRatioIsMarketShare: false;
    pageSemanticDifferenceImpliesMissingOwnedPage: false;
    topicGapImpliesActionGuidance: false;
    backlinkGapImpliesOutreachSuitability: false;
    trendCrossFrameComparable: false;
    crossSignalOpportunityScoreIncluded: false;
    descriptiveOnly: true;
  };
};

export type CompetitorIntelligenceUiModel = {
  version: typeof P5_7_COMPETITOR_UI_VERSION;
  fixtureKind: "synthetic_read_only";
  marketLabel: string;
  categoryLabel: string;
  ownedDomain: string;
  referenceTime: string;
  reportFingerprint: string;
  reportFingerprintShort: string;
  summary: {
    reviewedCompetitors: number;
    serpTopics: number;
    observedTopicGaps: number;
    linkGapReferringDomains: number;
    diagnostics: number;
    opportunityScore: null;
  };
  competitors: UiCompetitorVisibilityRow[];
  topics: UiTopicGapRow[];
  pages: UiPageSemanticGapRow[];
  links: UiLinkGapRow[];
  diagnostics: string[];
  semantics: string[];
  safety: ReturnType<typeof competitorIntelligenceUiCapability>;
};

const FINGERPRINT = /^[0-9a-f]{64}$/;

function cloneSorted<T>(rows: readonly T[], selector: (row: T) => string): T[] {
  return [...rows].sort((a, b) => selector(a).localeCompare(selector(b)));
}

function finiteRatio(value: number, name: string) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`invalid_${name}`);
}

function nonNegativeInteger(value: number, name: string) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`invalid_${name}`);
}

function validateFixture(report: UiCompetitorReportFixture) {
  if (report.version !== "p5.6-competitor-visibility-gap-pipeline-v1") {
    throw new Error("unsupported_p5_6_report");
  }
  if (!FINGERPRINT.test(report.reportFingerprint)) throw new Error("invalid_report_fingerprint");
  if (!Number.isFinite(Date.parse(report.referenceTime))) throw new Error("invalid_reference_time");
  if (!report.marketLabel.trim() || !report.categoryLabel.trim() || !report.ownedDomain.trim()) {
    throw new Error("invalid_scope_labels");
  }
  if (report.competitorDomains.length !== report.coverage.reviewedCompetitorCount) {
    throw new Error("competitor_coverage_mismatch");
  }
  if (new Set(report.competitorDomains).size !== report.competitorDomains.length) {
    throw new Error("duplicate_competitor_domain");
  }
  for (const row of report.competitorVisibility) {
    finiteRatio(row.observedTopicVisibilityRatio, "observed_topic_visibility_ratio");
    for (const [name, value] of Object.entries({
      observedSerpTopicCount: row.observedSerpTopicCount,
      visibleTopicCount: row.visibleTopicCount,
      top10VisibleTopicCount: row.top10VisibleTopicCount,
      top20VisibleTopicCount: row.top20VisibleTopicCount,
      competitorOnlyVisibleTopicCount: row.competitorOnlyVisibleTopicCount,
      sharedOwnedCompetitorVisibleTopicCount: row.sharedOwnedCompetitorVisibleTopicCount,
      pageEvidenceCount: row.pageEvidenceCount,
      visiblePageEvidenceCount: row.visiblePageEvidenceCount,
      semanticDifferencePageCount: row.semanticDifferencePageCount,
      backlinkGapReferringDomainCount: row.backlinkGapReferringDomainCount,
      backlinkSharedCoverageReferringDomainCount: row.backlinkSharedCoverageReferringDomainCount,
    })) nonNegativeInteger(value, name);
    if (row.backlinkAuthority?.crossProviderComparable !== false && row.backlinkAuthority !== null) {
      throw new Error("authority_comparability_mismatch");
    }
  }
  if (report.semantics.observedTopicVisibilityRatioIsMarketShare !== false) {
    throw new Error("visibility_semantics_mismatch");
  }
  if (report.semantics.crossSignalOpportunityScoreIncluded !== false) {
    throw new Error("opportunity_score_semantics_mismatch");
  }
}

export function buildCompetitorIntelligenceUiModel(
  report: UiCompetitorReportFixture,
): CompetitorIntelligenceUiModel {
  validateFixture(report);

  const competitors = cloneSorted(report.competitorVisibility, (row) => row.domain);
  const topics = cloneSorted(report.topicGaps, (row) => row.topic);
  const pages = cloneSorted(
    report.pageSemanticGaps,
    (row) => `${row.competitorDomain}\u0000${row.pageKey}`,
  );
  const links = cloneSorted(report.linkGaps, (row) => row.referringDomain);
  const diagnostics = [...new Set(report.diagnostics)].sort((a, b) => a.localeCompare(b));

  return {
    version: P5_7_COMPETITOR_UI_VERSION,
    fixtureKind: "synthetic_read_only",
    marketLabel: report.marketLabel.trim(),
    categoryLabel: report.categoryLabel.trim(),
    ownedDomain: report.ownedDomain.trim().toLowerCase(),
    referenceTime: new Date(report.referenceTime).toISOString(),
    reportFingerprint: report.reportFingerprint,
    reportFingerprintShort: `${report.reportFingerprint.slice(0, 12)}…`,
    summary: {
      reviewedCompetitors: report.coverage.reviewedCompetitorCount,
      serpTopics: report.coverage.serpTopicCount,
      observedTopicGaps: topics.filter((row) => row.topicGapObserved).length,
      linkGapReferringDomains: links.filter(
        (row) =>
          row.classification === "single_competitor_gap"
          || row.classification === "shared_competitor_gap"
          || row.classification === "universal_competitor_gap",
      ).length,
      diagnostics: diagnostics.length,
      opportunityScore: null,
    },
    competitors,
    topics,
    pages,
    links,
    diagnostics,
    semantics: [
      "Observed-topic visibility is limited to the supplied SERP cohort; it is not market share.",
      "Page semantic differences are structural observations, not proof that an owned page is missing.",
      "Topic gaps are descriptive evidence only; action guidance is not produced in P5.7.",
      "Backlink gaps do not establish link quality or outreach suitability.",
      "Trend relative-index values are request-frame bound and are not comparable across frames.",
      "No cross-signal opportunity score is produced; P6 owns prioritization.",
    ],
    safety: competitorIntelligenceUiCapability(),
  };
}

export function competitorStateTone(
  state: UiTopicGapRow["serpState"] | UiTopicGapRow["semanticState"],
): StatusTone {
  if (state === "competitor_only") return "warning";
  if (state === "shared") return "info";
  if (state === "owned_only") return "success";
  return "neutral";
}

export function linkGapTone(classification: UiLinkGapRow["classification"]): StatusTone {
  if (
    classification === "single_competitor_gap"
    || classification === "shared_competitor_gap"
    || classification === "universal_competitor_gap"
  ) return "warning";
  if (classification === "shared_coverage") return "info";
  if (classification === "owned_exclusive") return "success";
  return "neutral";
}

export function trendTone(direction: UiTrendContext["direction"]): StatusTone {
  if (direction === "rising") return "info";
  if (direction === "falling") return "warning";
  return "neutral";
}

export function formatPercent(value: number): string {
  finiteRatio(value, "ratio");
  return `${(value * 100).toFixed(value === 0 || value === 1 ? 0 : 1)}%`;
}

export function formatNullableNumber(value: number | null, suffix = ""): string {
  return value === null ? "Unavailable" : `${value.toLocaleString("en-US")}${suffix}`;
}

export function competitorIntelligenceUiCapability() {
  return Object.freeze({
    version: P5_7_COMPETITOR_UI_VERSION,
    readOnly: true,
    syntheticFixtureOnly: true,
    defaultOff: true,
    liveProviderReadsAuthorized: false,
    providerWritesAuthorized: false,
    publicSiteReadsAuthorized: false,
    publicSiteWritesAuthorized: false,
    runtimeApiBindingAuthorized: false,
    sourceAdmissionAuthorized: false,
    targetMutationAuthorized: false,
    task64ExecutionAuthorized: false,
    task70ExecutionAuthorized: false,
    persistenceAuthorized: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    schedulerEnabled: false,
    workerEnabled: false,
    opportunityScoringIncluded: false,
    publicationAuthorized: false,
  });
}

export const P5_7_SYNTHETIC_REPORT_FIXTURE: UiCompetitorReportFixture = {
  version: "p5.6-competitor-visibility-gap-pipeline-v1",
  reportFingerprint: "a1".repeat(32),
  referenceTime: "2026-09-18T12:00:00.000Z",
  marketLabel: "United States · Google · English",
  categoryLabel: "Fragrance",
  ownedDomain: "owned.test",
  competitorDomains: ["competitor-a.test", "competitor-b.test"],
  competitorVisibility: [
    {
      domain: "competitor-a.test",
      observedSerpTopicCount: 4,
      visibleTopicCount: 2,
      top10VisibleTopicCount: 2,
      top20VisibleTopicCount: 2,
      bestObservedOrganicRank: 2,
      observedTopicVisibilityRatio: 0.5,
      competitorOnlyVisibleTopicCount: 1,
      sharedOwnedCompetitorVisibleTopicCount: 1,
      pageEvidenceCount: 1,
      visiblePageEvidenceCount: 1,
      semanticDifferencePageCount: 1,
      backlinkAuthority: {
        value: 65,
        providerKey: "synthetic",
        providerMethod: "supplied_backlink_snapshot_v1",
        metricName: "synthetic_authority",
        min: 0,
        max: 100,
        crossProviderComparable: false,
      },
      backlinkGapReferringDomainCount: 1,
      backlinkSharedCoverageReferringDomainCount: 1,
    },
    {
      domain: "competitor-b.test",
      observedSerpTopicCount: 4,
      visibleTopicCount: 2,
      top10VisibleTopicCount: 2,
      top20VisibleTopicCount: 2,
      bestObservedOrganicRank: 5,
      observedTopicVisibilityRatio: 0.5,
      competitorOnlyVisibleTopicCount: 1,
      sharedOwnedCompetitorVisibleTopicCount: 1,
      pageEvidenceCount: 1,
      visiblePageEvidenceCount: 1,
      semanticDifferencePageCount: 1,
      backlinkAuthority: {
        value: null,
        providerKey: "synthetic",
        providerMethod: "supplied_backlink_snapshot_v1",
        metricName: "synthetic_authority",
        min: 0,
        max: 100,
        crossProviderComparable: false,
      },
      backlinkGapReferringDomainCount: 1,
      backlinkSharedCoverageReferringDomainCount: 1,
    },
  ],
  pageSemanticGaps: [
    {
      competitorDomain: "competitor-a.test",
      sourceUrl: "https://competitor-a.test/oud/",
      pageKey: "competitor-a.test/oud",
      pageType: "collection",
      observedAt: "2026-09-18T10:00:00.000Z",
      confidence: 0.9,
      semanticDifferences: {
        keywordThemes: ["oud perfume"],
        taxonomyLabels: ["oud"],
        schemaTypes: [],
        entityTypes: [],
        internalLinkPatterns: [],
      },
      semanticDifferenceCount: 2,
      semanticDifferenceObserved: true,
      serpTopicAppearanceCount: 2,
      bestObservedOrganicRank: 2,
      observedSerpTopics: ["amber perfume", "oud perfume"],
    },
    {
      competitorDomain: "competitor-b.test",
      sourceUrl: "https://competitor-b.test/citrus/",
      pageKey: "competitor-b.test/citrus",
      pageType: "collection",
      observedAt: "2026-09-18T10:00:00.000Z",
      confidence: 0.9,
      semanticDifferences: {
        keywordThemes: ["citrus perfume"],
        taxonomyLabels: ["citrus"],
        schemaTypes: [],
        entityTypes: [],
        internalLinkPatterns: [],
      },
      semanticDifferenceCount: 2,
      semanticDifferenceObserved: true,
      serpTopicAppearanceCount: 2,
      bestObservedOrganicRank: 5,
      observedSerpTopics: ["amber perfume", "citrus perfume"],
    },
  ],
  topicGaps: [
    {
      topic: "amber perfume",
      ownedSemanticPresent: true,
      competitorSemanticDomains: ["competitor-a.test", "competitor-b.test"],
      serpMeasured: true,
      ownedSerpPresent: true,
      ownedBestRank: 4,
      competitorSerpPresence: [
        { domain: "competitor-a.test", bestRank: 2 },
        { domain: "competitor-b.test", bestRank: 9 },
      ],
      competitorBestRank: 2,
      serpState: "shared",
      semanticState: "shared",
      serpGapObserved: false,
      semanticGapObserved: false,
      topicGapObserved: false,
      keywordMetrics: {
        avgMonthlySearchVolume: 1000,
        organicDifficultyScore: 45,
        organicDifficultyCrossProviderComparable: false,
        cpcAmount: 1.25,
        cpcCurrency: "USD",
        paidCompetitionRatio: 0.62,
      },
      trend: {
        frameFingerprint: "b2".repeat(32),
        latestRelativeIndex: 60,
        signedVelocity: 0.2,
        coverageRatio: 1,
        direction: "rising",
        crossFrameComparable: false,
        absoluteSearchVolume: false,
        zeroMeansInsufficientData: true,
      },
    },
    {
      topic: "citrus perfume",
      ownedSemanticPresent: false,
      competitorSemanticDomains: ["competitor-b.test"],
      serpMeasured: true,
      ownedSerpPresent: false,
      ownedBestRank: null,
      competitorSerpPresence: [{ domain: "competitor-b.test", bestRank: 5 }],
      competitorBestRank: 5,
      serpState: "competitor_only",
      semanticState: "competitor_only",
      serpGapObserved: true,
      semanticGapObserved: true,
      topicGapObserved: true,
      keywordMetrics: {
        avgMonthlySearchVolume: 500,
        organicDifficultyScore: 35,
        organicDifficultyCrossProviderComparable: false,
        cpcAmount: 0.85,
        cpcCurrency: "USD",
        paidCompetitionRatio: 0.48,
      },
      trend: {
        frameFingerprint: "c3".repeat(32),
        latestRelativeIndex: 55,
        signedVelocity: 0.275,
        coverageRatio: 1,
        direction: "rising",
        crossFrameComparable: false,
        absoluteSearchVolume: false,
        zeroMeansInsufficientData: true,
      },
    },
    {
      topic: "oud perfume",
      ownedSemanticPresent: false,
      competitorSemanticDomains: ["competitor-a.test"],
      serpMeasured: true,
      ownedSerpPresent: false,
      ownedBestRank: null,
      competitorSerpPresence: [{ domain: "competitor-a.test", bestRank: 3 }],
      competitorBestRank: 3,
      serpState: "competitor_only",
      semanticState: "competitor_only",
      serpGapObserved: true,
      semanticGapObserved: true,
      topicGapObserved: true,
      keywordMetrics: {
        avgMonthlySearchVolume: 800,
        organicDifficultyScore: 55,
        organicDifficultyCrossProviderComparable: false,
        cpcAmount: 1.4,
        cpcCurrency: "USD",
        paidCompetitionRatio: 0.71,
      },
      trend: {
        frameFingerprint: "b2".repeat(32),
        latestRelativeIndex: 80,
        signedVelocity: 0.45,
        coverageRatio: 1,
        direction: "rising",
        crossFrameComparable: false,
        absoluteSearchVolume: false,
        zeroMeansInsufficientData: true,
      },
    },
    {
      topic: "vanilla perfume",
      ownedSemanticPresent: true,
      competitorSemanticDomains: [],
      serpMeasured: true,
      ownedSerpPresent: true,
      ownedBestRank: 7,
      competitorSerpPresence: [],
      competitorBestRank: null,
      serpState: "owned_only",
      semanticState: "owned_only",
      serpGapObserved: false,
      semanticGapObserved: false,
      topicGapObserved: false,
      keywordMetrics: null,
      trend: null,
    },
  ],
  linkGaps: [
    {
      referringDomain: "a-only.example",
      ownedPresent: false,
      competitorPresence: [
        { domain: "competitor-a.test", present: true },
        { domain: "competitor-b.test", present: false },
      ],
      competitorPresenceCount: 1,
      competitorCoverageRatio: 0.5,
      authority: 80,
      latestLastSeenAt: "2026-09-10T00:00:00.000Z",
      freshnessState: "fresh",
      classification: "single_competitor_gap",
    },
    {
      referringDomain: "b-only.example",
      ownedPresent: false,
      competitorPresence: [
        { domain: "competitor-a.test", present: false },
        { domain: "competitor-b.test", present: true },
      ],
      competitorPresenceCount: 1,
      competitorCoverageRatio: 0.5,
      authority: 60,
      latestLastSeenAt: "2026-09-10T00:00:00.000Z",
      freshnessState: "fresh",
      classification: "single_competitor_gap",
    },
    {
      referringDomain: "shared-source.example",
      ownedPresent: true,
      competitorPresence: [
        { domain: "competitor-a.test", present: true },
        { domain: "competitor-b.test", present: true },
      ],
      competitorPresenceCount: 2,
      competitorCoverageRatio: 1,
      authority: 70,
      latestLastSeenAt: "2026-09-10T00:00:00.000Z",
      freshnessState: "fresh",
      classification: "shared_coverage",
    },
  ],
  coverage: {
    reviewedCompetitorCount: 2,
    serpTopicCount: 4,
    keywordMetricTopicCount: 3,
    trendTopicCount: 3,
    competitorPageEvidenceCount: 2,
    backlinkBundleSupplied: true,
    topicUniverseCount: 4,
  },
  diagnostics: [],
  semantics: {
    observedTopicVisibilityRatioIsMarketShare: false,
    pageSemanticDifferenceImpliesMissingOwnedPage: false,
    topicGapImpliesActionGuidance: false,
    backlinkGapImpliesOutreachSuitability: false,
    trendCrossFrameComparable: false,
    crossSignalOpportunityScoreIncluded: false,
    descriptiveOnly: true,
  },
};
