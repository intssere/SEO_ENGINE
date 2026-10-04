import { createHash } from "node:crypto";
import {
  assertBacklinkEvidenceDatasetIntegrity,
  type BacklinkEvidenceDataset,
  type ReferringDomainEvidence,
} from "./backlink-evidence-contract.js";
import type {
  BacklinkFixtureBundle,
  BacklinkGapCandidate,
} from "./backlink-fixture-normalization.js";

export const UGP_AUTHORITY_DASHBOARD_PROJECTION_VERSION =
  "ugp-9-2a-authority-dashboard-projection-v1" as const;

export type AuthorityTrendDirection =
  | "up"
  | "down"
  | "flat"
  | "unavailable";

export type AuthorityDashboardTrendMetric = Readonly<{
  current: number;
  previous: number | null;
  delta: number | null;
  direction: AuthorityTrendDirection;
}>;

export type AuthorityDashboardReferringDomain = Readonly<{
  domain: string;
  backlinkCount: number;
  activeBacklinkCount: number;
  normalizedLostBacklinkCount: number;
  providerReportedLostBacklinkCount: number;
  providerReportedNewBacklinkCount: number;
  targetUrls: readonly string[];
  anchorTexts: readonly string[];
  followStates: readonly string[];
  rel: readonly string[];
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  providerAuthority: number | null;
  providerAuthorityMetricKey: string | null;
  providerAuthorityMetricMin: number | null;
  providerAuthorityMetricMax: number | null;
  authorityCrossProviderComparable: false;
  referringDomainFingerprint: string;
}>;

export type AuthorityDashboardLinkedPage = Readonly<{
  targetUrl: string;
  backlinkCount: number;
  referringDomainCount: number;
  activeBacklinkCount: number;
  providerReportedLostBacklinkCount: number;
  providerReportedNewBacklinkCount: number;
  topReferringDomains: readonly string[];
  pageFingerprint: string;
}>;

export type AuthorityDashboardAnchor = Readonly<{
  anchorText: string;
  backlinkCount: number;
  referringDomainCount: number;
  share: number;
  anchorFingerprint: string;
}>;

export type AuthorityDashboardCompetitorGap = Readonly<{
  referringDomain: string;
  classification: BacklinkGapCandidate["classification"];
  competitorPresenceCount: number;
  competitorCoverageRatio: number;
  providerAuthority: number | null;
  latestLastSeenAt: string | null;
  freshnessState: BacklinkGapCandidate["freshnessState"];
  competitorDomains: readonly string[];
  gapFingerprint: string;
}>;

export type AuthorityDashboardProjection = Readonly<{
  version: typeof UGP_AUTHORITY_DASHBOARD_PROJECTION_VERSION;
  targetDomain: string;
  generatedFromObservedAt: string;
  currentDatasetFingerprint: string;
  previousDatasetFingerprint: string | null;
  competitorGapBundleFingerprint: string | null;
  provider: Readonly<{
    providerKey: string;
    providerDataset: string;
    authorityMetricKey: string | null;
    authorityMetricMin: number | null;
    authorityMetricMax: number | null;
    authorityCrossProviderComparable: false;
  }>;
  summary: Readonly<{
    backlinkCount: number;
    activeBacklinkCount: number;
    normalizedLostBacklinkCount: number;
    providerReportedLostBacklinkCount: number;
    providerReportedNewBacklinkCount: number;
    referringDomainCount: number;
    activeReferringDomainCount: number;
    linkedPageCount: number;
    anchorCount: number;
  }>;
  trend: Readonly<{
    backlinks: AuthorityDashboardTrendMetric;
    referringDomains: AuthorityDashboardTrendMetric;
    activeBacklinks: AuthorityDashboardTrendMetric;
    providerReportedNewBacklinks: AuthorityDashboardTrendMetric;
    providerReportedLostBacklinks: AuthorityDashboardTrendMetric;
  }>;
  referringDomains: readonly AuthorityDashboardReferringDomain[];
  linkedPages: readonly AuthorityDashboardLinkedPage[];
  anchors: readonly AuthorityDashboardAnchor[];
  competitorGaps: readonly AuthorityDashboardCompetitorGap[];
  limitations: readonly string[];
  semantics: Readonly<{
    deterministic: true;
    readOnlyProjection: true;
    providerAuthorityNotUniversal: true;
    crossProviderAuthorityComparable: false;
    currentAndPreviousMustShareMeasurementBasis: true;
    competitorGapDescriptiveOnly: true;
    opportunityScoringPerformed: false;
    prospectQualificationPerformed: false;
    outreachAuthorized: false;
    liveAcquisitionAuthorized: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    schedulerEnabled: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  projectionFingerprint: string;
}>;

const SEMANTICS = Object.freeze({
  deterministic: true as const,
  readOnlyProjection: true as const,
  providerAuthorityNotUniversal: true as const,
  crossProviderAuthorityComparable: false as const,
  currentAndPreviousMustShareMeasurementBasis: true as const,
  competitorGapDescriptiveOnly: true as const,
  opportunityScoringPerformed: false as const,
  prospectQualificationPerformed: false as const,
  outreachAuthorized: false as const,
  liveAcquisitionAuthorized: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  schedulerEnabled: false as const,
  providerWrites: false as const,
  publicSiteWrites: false as const,
});

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
    .join(",") + "}";
}

function hash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function metricValue(
  row: { providerMetrics: readonly { key: string; value: number }[] },
  key: string,
): number | null {
  const metric = row.providerMetrics.find((value) => value.key === key);
  return metric ? metric.value : null;
}

function countProviderBoolean(
  rows: readonly {
    providerMetrics: readonly { key: string; value: number }[];
  }[],
  key: string,
): number {
  return rows.filter((row) => metricValue(row, key) === 1).length;
}

function round6(value: number): number {
  return Number(value.toFixed(6));
}

function trend(current: number, previous: number | null): AuthorityDashboardTrendMetric {
  if (previous === null) {
    return Object.freeze({
      current,
      previous: null,
      delta: null,
      direction: "unavailable",
    });
  }
  const delta = current - previous;
  return Object.freeze({
    current,
    previous,
    delta,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  });
}

function measurementBasis(dataset: BacklinkEvidenceDataset) {
  return {
    providerKey: dataset.source.providerKey,
    providerDataset: dataset.source.providerDataset,
    sourceFingerprint: dataset.source.sourceFingerprint,
    marketFingerprint: dataset.source.marketFingerprint,
    categoryFingerprint: dataset.source.categoryFingerprint,
    authorityMetric: dataset.source.authorityMetric,
  };
}

function assertComparableSnapshots(
  current: BacklinkEvidenceDataset,
  previous: BacklinkEvidenceDataset | null,
): void {
  if (!previous) return;
  assertBacklinkEvidenceDatasetIntegrity(previous);
  if (previous.targetDomain !== current.targetDomain) {
    throw new Error("ugp_authority_dashboard_previous_target_domain_mismatch");
  }
  if (
    stableJson(measurementBasis(previous))
      !== stableJson(measurementBasis(current))
  ) {
    throw new Error("ugp_authority_dashboard_measurement_basis_mismatch");
  }
  if (
    Date.parse(previous.source.observedAt)
      >= Date.parse(current.source.observedAt)
  ) {
    throw new Error("ugp_authority_dashboard_previous_not_earlier");
  }
}

function referringDomainProjection(
  row: ReferringDomainEvidence,
  dataset: BacklinkEvidenceDataset,
): AuthorityDashboardReferringDomain {
  const backlinks = dataset.backlinks.filter(
    (backlink) => backlink.sourceDomain === row.domain,
  );
  const authority = dataset.source.authorityMetric;
  const base = {
    domain: row.domain,
    backlinkCount: row.backlinkCount,
    activeBacklinkCount: row.activeBacklinkCount,
    normalizedLostBacklinkCount: row.lostBacklinkCount,
    providerReportedLostBacklinkCount:
      countProviderBoolean(backlinks, "is_lost"),
    providerReportedNewBacklinkCount:
      countProviderBoolean(backlinks, "is_new"),
    targetUrls: row.targetUrls,
    anchorTexts: row.anchorTexts,
    followStates: row.followStates,
    rel: row.rel,
    firstSeenAt: row.firstSeenAt,
    lastSeenAt: row.lastSeenAt,
    providerAuthority: row.providerAuthority,
    providerAuthorityMetricKey: authority?.key ?? null,
    providerAuthorityMetricMin: authority?.min ?? null,
    providerAuthorityMetricMax: authority?.max ?? null,
    authorityCrossProviderComparable: false as const,
  };
  return Object.freeze({
    ...base,
    referringDomainFingerprint: hash({
      purpose: "ugp_authority_dashboard_referring_domain",
      version: UGP_AUTHORITY_DASHBOARD_PROJECTION_VERSION,
      datasetFingerprint: dataset.datasetFingerprint,
      ...base,
    }),
  });
}

function linkedPages(
  dataset: BacklinkEvidenceDataset,
): readonly AuthorityDashboardLinkedPage[] {
  const byTarget = new Map<string, typeof dataset.backlinks[number][]>();
  for (const backlink of dataset.backlinks) {
    const rows = byTarget.get(backlink.targetUrl) ?? [];
    byTarget.set(backlink.targetUrl, [...rows, backlink]);
  }

  return Object.freeze(
    [...byTarget.entries()]
      .map(([targetUrl, backlinks]) => {
        const domains = [...new Set(backlinks.map((row) => row.sourceDomain))]
          .sort((a, b) => a.localeCompare(b));
        const base = {
          targetUrl,
          backlinkCount: backlinks.length,
          referringDomainCount: domains.length,
          activeBacklinkCount:
            backlinks.filter((row) => row.state === "active").length,
          providerReportedLostBacklinkCount:
            countProviderBoolean(backlinks, "is_lost"),
          providerReportedNewBacklinkCount:
            countProviderBoolean(backlinks, "is_new"),
          topReferringDomains: Object.freeze(domains.slice(0, 10)),
        };
        return Object.freeze({
          ...base,
          pageFingerprint: hash({
            purpose: "ugp_authority_dashboard_linked_page",
            version: UGP_AUTHORITY_DASHBOARD_PROJECTION_VERSION,
            datasetFingerprint: dataset.datasetFingerprint,
            ...base,
          }),
        });
      })
      .sort((a, b) =>
        b.backlinkCount - a.backlinkCount
        || b.referringDomainCount - a.referringDomainCount
        || a.targetUrl.localeCompare(b.targetUrl)
      ),
  );
}

function anchors(
  dataset: BacklinkEvidenceDataset,
): readonly AuthorityDashboardAnchor[] {
  const byAnchor = new Map<
    string,
    { backlinkCount: number; domains: Set<string> }
  >();
  for (const backlink of dataset.backlinks) {
    if (backlink.anchorText === null) continue;
    const current = byAnchor.get(backlink.anchorText)
      ?? { backlinkCount: 0, domains: new Set<string>() };
    current.backlinkCount += 1;
    current.domains.add(backlink.sourceDomain);
    byAnchor.set(backlink.anchorText, current);
  }
  const denominator = [...byAnchor.values()]
    .reduce((sum, row) => sum + row.backlinkCount, 0);

  return Object.freeze(
    [...byAnchor.entries()]
      .map(([anchorText, value]) => {
        const base = {
          anchorText,
          backlinkCount: value.backlinkCount,
          referringDomainCount: value.domains.size,
          share: denominator === 0
            ? 0
            : round6(value.backlinkCount / denominator),
        };
        return Object.freeze({
          ...base,
          anchorFingerprint: hash({
            purpose: "ugp_authority_dashboard_anchor",
            version: UGP_AUTHORITY_DASHBOARD_PROJECTION_VERSION,
            datasetFingerprint: dataset.datasetFingerprint,
            ...base,
          }),
        });
      })
      .sort((a, b) =>
        b.backlinkCount - a.backlinkCount
        || b.referringDomainCount - a.referringDomainCount
        || a.anchorText.localeCompare(b.anchorText)
      ),
  );
}

function competitorGaps(input: {
  current: BacklinkEvidenceDataset;
  bundle: BacklinkFixtureBundle | null;
}): readonly AuthorityDashboardCompetitorGap[] {
  if (!input.bundle) return Object.freeze([]);
  if (input.bundle.owned.targetDomain !== input.current.targetDomain) {
    throw new Error("ugp_authority_dashboard_competitor_gap_target_mismatch");
  }
  if (
    input.bundle.basis.providerKey !== input.current.source.providerKey
    || input.bundle.basis.sourceFingerprint
      !== input.current.source.sourceFingerprint
    || input.bundle.basis.marketFingerprint
      !== input.current.source.marketFingerprint
    || input.bundle.basis.categoryFingerprint
      !== input.current.source.categoryFingerprint
  ) {
    throw new Error("ugp_authority_dashboard_competitor_gap_basis_mismatch");
  }
  const currentAuthority = input.current.source.authorityMetric;
  const gapAuthority = input.bundle.basis.authorityMetric;
  if (
    !currentAuthority
    || gapAuthority.name !== currentAuthority.key
    || gapAuthority.min !== currentAuthority.min
    || gapAuthority.max !== currentAuthority.max
    || gapAuthority.crossProviderComparable !== false
  ) {
    throw new Error(
      "ugp_authority_dashboard_competitor_gap_authority_basis_mismatch",
    );
  }

  return Object.freeze(
    input.bundle.gapCandidates
      .filter((candidate) =>
        !candidate.ownedPresent && candidate.competitorPresenceCount > 0
      )
      .map((candidate) => {
        const competitorDomains = candidate.competitors
          .filter((value) => value.present)
          .map((value) => value.targetDomain)
          .sort((a, b) => a.localeCompare(b));
        const base = {
          referringDomain: candidate.referringDomain,
          classification: candidate.classification,
          competitorPresenceCount: candidate.competitorPresenceCount,
          competitorCoverageRatio: candidate.competitorCoverageRatio,
          providerAuthority: candidate.authority,
          latestLastSeenAt: candidate.latestLastSeenAt,
          freshnessState: candidate.freshnessState,
          competitorDomains: Object.freeze(competitorDomains),
        };
        return Object.freeze({
          ...base,
          gapFingerprint: hash({
            purpose: "ugp_authority_dashboard_competitor_gap",
            version: UGP_AUTHORITY_DASHBOARD_PROJECTION_VERSION,
            bundleFingerprint: input.bundle!.bundleFingerprint,
            ...base,
          }),
        });
      })
      .sort((a, b) =>
        b.competitorPresenceCount - a.competitorPresenceCount
        || b.competitorCoverageRatio - a.competitorCoverageRatio
        || a.referringDomain.localeCompare(b.referringDomain)
      ),
  );
}

export function buildAuthorityDashboardProjection(input: {
  current: BacklinkEvidenceDataset;
  previous?: BacklinkEvidenceDataset | null;
  competitorGapBundle?: BacklinkFixtureBundle | null;
}): AuthorityDashboardProjection {
  assertBacklinkEvidenceDatasetIntegrity(input.current);
  const previous = input.previous ?? null;
  assertComparableSnapshots(input.current, previous);

  const referringDomains = Object.freeze(
    input.current.referringDomains
      .map((row) => referringDomainProjection(row, input.current))
      .sort((a, b) =>
        b.backlinkCount - a.backlinkCount
        || (b.providerAuthority ?? -Infinity)
          - (a.providerAuthority ?? -Infinity)
        || a.domain.localeCompare(b.domain)
      ),
  );
  const pages = linkedPages(input.current);
  const anchorRows = anchors(input.current);
  const gaps = competitorGaps({
    current: input.current,
    bundle: input.competitorGapBundle ?? null,
  });

  const providerReportedNewBacklinkCount = countProviderBoolean(
    input.current.backlinks,
    "is_new",
  );
  const providerReportedLostBacklinkCount = countProviderBoolean(
    input.current.backlinks,
    "is_lost",
  );
  const previousProviderReportedNewBacklinkCount = previous
    ? countProviderBoolean(previous.backlinks, "is_new")
    : null;
  const previousProviderReportedLostBacklinkCount = previous
    ? countProviderBoolean(previous.backlinks, "is_lost")
    : null;

  const summary = Object.freeze({
    backlinkCount: input.current.summary.backlinkCount,
    activeBacklinkCount: input.current.summary.activeBacklinkCount,
    normalizedLostBacklinkCount: input.current.summary.lostBacklinkCount,
    providerReportedLostBacklinkCount,
    providerReportedNewBacklinkCount,
    referringDomainCount: input.current.summary.referringDomainCount,
    activeReferringDomainCount:
      input.current.summary.activeReferringDomainCount,
    linkedPageCount: pages.length,
    anchorCount: anchorRows.length,
  });

  const trendProjection = Object.freeze({
    backlinks: trend(
      summary.backlinkCount,
      previous?.summary.backlinkCount ?? null,
    ),
    referringDomains: trend(
      summary.referringDomainCount,
      previous?.summary.referringDomainCount ?? null,
    ),
    activeBacklinks: trend(
      summary.activeBacklinkCount,
      previous?.summary.activeBacklinkCount ?? null,
    ),
    providerReportedNewBacklinks: trend(
      providerReportedNewBacklinkCount,
      previousProviderReportedNewBacklinkCount,
    ),
    providerReportedLostBacklinks: trend(
      providerReportedLostBacklinkCount,
      previousProviderReportedLostBacklinkCount,
    ),
  });

  const limitations = new Set<string>();
  if (!previous) {
    limitations.add("authority_trend_previous_snapshot_not_supplied");
  }
  if (!input.competitorGapBundle) {
    limitations.add("authority_competitor_gap_bundle_not_supplied");
  }
  if (
    input.current.backlinks.some(
      (row) => metricValue(row, "is_lost") === 1 && row.lostAt === null,
    )
  ) {
    limitations.add(
      "provider_reported_lost_not_equivalent_to_normalized_exact_loss",
    );
  }
  if (input.current.source.authorityMetric) {
    limitations.add(
      "provider_authority_metric_not_cross_provider_comparable",
    );
  }

  const authorityMetric = input.current.source.authorityMetric;
  const base = {
    version: UGP_AUTHORITY_DASHBOARD_PROJECTION_VERSION,
    targetDomain: input.current.targetDomain,
    generatedFromObservedAt: input.current.source.observedAt,
    currentDatasetFingerprint: input.current.datasetFingerprint,
    previousDatasetFingerprint: previous?.datasetFingerprint ?? null,
    competitorGapBundleFingerprint:
      input.competitorGapBundle?.bundleFingerprint ?? null,
    provider: Object.freeze({
      providerKey: input.current.source.providerKey,
      providerDataset: input.current.source.providerDataset,
      authorityMetricKey: authorityMetric?.key ?? null,
      authorityMetricMin: authorityMetric?.min ?? null,
      authorityMetricMax: authorityMetric?.max ?? null,
      authorityCrossProviderComparable: false as const,
    }),
    summary,
    trend: trendProjection,
    referringDomains,
    linkedPages: pages,
    anchors: anchorRows,
    competitorGaps: gaps,
    limitations: Object.freeze([...limitations].sort()),
    semantics: SEMANTICS,
  };

  return Object.freeze({
    ...base,
    projectionFingerprint: hash({
      purpose: "ugp_authority_dashboard_projection",
      ...base,
    }),
  });
}

export function assertAuthorityDashboardProjectionIntegrity(
  result: AuthorityDashboardProjection,
): void {
  if (
    !result
    || result.version !== UGP_AUTHORITY_DASHBOARD_PROJECTION_VERSION
  ) {
    throw new Error("ugp_authority_dashboard_version_invalid");
  }
  if (
    result.provider.authorityCrossProviderComparable !== false
    || result.semantics.deterministic !== true
    || result.semantics.readOnlyProjection !== true
    || result.semantics.providerAuthorityNotUniversal !== true
    || result.semantics.crossProviderAuthorityComparable !== false
    || result.semantics.currentAndPreviousMustShareMeasurementBasis !== true
    || result.semantics.competitorGapDescriptiveOnly !== true
    || result.semantics.opportunityScoringPerformed !== false
    || result.semantics.prospectQualificationPerformed !== false
    || result.semantics.outreachAuthorized !== false
    || result.semantics.liveAcquisitionAuthorized !== false
    || result.semantics.performsNetworkOperation !== false
    || result.semantics.performsPersistence !== false
    || result.semantics.schedulerEnabled !== false
    || result.semantics.providerWrites !== false
    || result.semantics.publicSiteWrites !== false
  ) {
    throw new Error("ugp_authority_dashboard_unsafe_semantics");
  }
  if (!/^[0-9a-f]{64}$/.test(result.projectionFingerprint)) {
    throw new Error("ugp_authority_dashboard_projection_fingerprint_invalid");
  }
  const { projectionFingerprint, ...base } = result;
  const expected = hash({
    purpose: "ugp_authority_dashboard_projection",
    ...base,
  });
  if (projectionFingerprint !== expected) {
    throw new Error(
      "ugp_authority_dashboard_projection_fingerprint_mismatch",
    );
  }
}
