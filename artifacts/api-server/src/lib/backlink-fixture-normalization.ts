import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { domainToASCII } from "node:url";

export const P5_5_BACKLINK_FIXTURE_VERSION = "p5.5-backlink-fixture-v1" as const;
export const P5_5_MAX_REFERRING_DOMAINS = 200 as const;
export const P5_5_MAX_COMPETITORS = 10 as const;
export const P5_5_MAX_ANCHORS_PER_DOMAIN = 100 as const;
export const P5_5_MAX_URLS_PER_DOMAIN = 50 as const;

export type AnchorClassification =
  | "brand"
  | "exact"
  | "partial"
  | "url"
  | "generic"
  | "other"
  | "unclassified";

export type BacklinkFreshnessState = "fresh" | "recent" | "aging" | "stale" | "unavailable";
export type BacklinkChange30d = "new" | "lost" | "unchanged" | "unknown";
export type AnchorCountBasis = "backlink_count" | "provider_aggregate" | "unknown";
export type BacklinkGapClassification =
  | "owned_exclusive"
  | "shared_coverage"
  | "unlinked_observed_domain"
  | "single_competitor_gap"
  | "shared_competitor_gap"
  | "universal_competitor_gap";

export type BacklinkMeasurementBasisInput = {
  providerKey: string;
  providerMethod: string;
  sourceFingerprint: string;
  marketFingerprint: string;
  categoryFingerprint: string;
  authorityMetric: {
    name: string;
    min: number;
    max: number;
    crossProviderComparable: false;
  };
};

export type BacklinkMeasurementBasis = {
  providerKey: string;
  providerMethod: string;
  sourceFingerprint: string;
  marketFingerprint: string;
  categoryFingerprint: string;
  authorityMetric: {
    name: string;
    min: number;
    max: number;
    crossProviderComparable: false;
  };
};

export type BacklinkAnchorInput = {
  text: string;
  count: number;
  classification: AnchorClassification;
};

export type BacklinkAnchor = {
  displayText: string;
  identityText: string;
  count: number;
  classification: AnchorClassification;
};

export type BacklinkRelationEvidenceInput = {
  dofollow: boolean;
  nofollow: boolean;
  sponsored: boolean;
  ugc: boolean;
};

export type BacklinkReferringDomainInput = {
  domain: string;
  authority: number | null;
  backlinks: number;
  relations: BacklinkRelationEvidenceInput;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  lostAt: string | null;
  change30d: BacklinkChange30d;
  anchorCountBasis: AnchorCountBasis;
  anchors: BacklinkAnchorInput[];
  targetUrls: string[];
};

export type BacklinkReferringDomain = {
  domain: string;
  authority: number | null;
  backlinks: number;
  relations: BacklinkRelationEvidenceInput;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  lostAt: string | null;
  change30d: BacklinkChange30d;
  freshnessState: BacklinkFreshnessState;
  ageDays: number | null;
  anchorCountBasis: AnchorCountBasis;
  anchors: BacklinkAnchor[];
  targetUrls: string[];
};

export type BacklinkProfileSummaryInput = {
  authority: number | null;
  referringDomains: number;
  backlinks: number;
  dofollowReferringDomains: number;
  nofollowReferringDomains: number;
  sponsoredReferringDomains: number;
  ugcReferringDomains: number;
  newReferringDomains30d: number | null;
  lostReferringDomains30d: number | null;
};

export type BacklinkProfileInput = {
  targetDomain: string;
  summary: BacklinkProfileSummaryInput;
  referringDomains: BacklinkReferringDomainInput[];
};

export type NormalizedBacklinkProfile = {
  profileId: string;
  profileFingerprint: string;
  targetDomain: string;
  summary: BacklinkProfileSummaryInput;
  referringDomains: BacklinkReferringDomain[];
  validationState: "valid" | "valid_with_unavailable_fields";
};

export type BacklinkGapPresence = {
  targetDomain: string;
  present: boolean;
};

export type BacklinkGapCandidate = {
  referringDomain: string;
  ownedPresent: boolean;
  competitors: BacklinkGapPresence[];
  competitorPresenceCount: number;
  competitorCoverageRatio: number;
  authority: number | null;
  latestLastSeenAt: string | null;
  freshnessState: BacklinkFreshnessState;
  classification: BacklinkGapClassification;
};

export type BacklinkFixtureBundleInput = {
  basis: BacklinkMeasurementBasisInput;
  observedAt: string;
  referenceTime: string;
  owned: BacklinkProfileInput;
  competitors: BacklinkProfileInput[];
};

export type BacklinkFixtureBundle = {
  version: typeof P5_5_BACKLINK_FIXTURE_VERSION;
  bundleId: string;
  bundleFingerprint: string;
  basis: BacklinkMeasurementBasis;
  observedAt: string;
  referenceTime: string;
  owned: NormalizedBacklinkProfile;
  competitors: NormalizedBacklinkProfile[];
  gapCandidates: BacklinkGapCandidate[];
  summary: {
    uniqueObservedReferringDomains: number;
    ownedExclusiveCount: number;
    sharedCoverageCount: number;
    gapCandidateCount: number;
    singleCompetitorGapCount: number;
    sharedCompetitorGapCount: number;
    universalCompetitorGapCount: number;
    averageGapCompetitorCoverageRatio: number;
  };
  safety: ReturnType<typeof backlinkFixtureCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const KEY = /^[a-z0-9][a-z0-9._:-]{0,95}$/;
const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const ANCHOR_CLASSIFICATIONS = new Set<AnchorClassification>([
  "brand",
  "exact",
  "partial",
  "url",
  "generic",
  "other",
  "unclassified",
]);
const CHANGE_STATES = new Set<BacklinkChange30d>(["new", "lost", "unchanged", "unknown"]);
const ANCHOR_BASES = new Set<AnchorCountBasis>(["backlink_count", "provider_aggregate", "unknown"]);

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

function boundedInteger(value: unknown, min: number, max: number, name: string): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new Error(`invalid_${name}`);
  }
  return value as number;
}

function boundedNumber(value: unknown, min: number, max: number, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`invalid_${name}`);
  }
  return value;
}

function nullableAuthority(
  value: unknown,
  basis: BacklinkMeasurementBasis,
  name = "authority",
): number | null {
  if (value === null) return null;
  return boundedNumber(value, basis.authorityMetric.min, basis.authorityMetric.max, name);
}

function canonicalTimestamp(value: unknown, name: string): string {
  const raw = cleanText(value, name, 64);
  const milliseconds = Date.parse(raw);
  if (!Number.isFinite(milliseconds)) throw new Error("invalid_timestamp");
  return new Date(milliseconds).toISOString();
}

function nullableTimestamp(value: unknown, name: string): string | null {
  if (value === null) return null;
  return canonicalTimestamp(value, name);
}

function assertTimestampAtOrBefore(value: string | null, upper: string, code: string): void {
  if (value !== null && Date.parse(value) > Date.parse(upper)) throw new Error(code);
}

function normalizeBasis(input: BacklinkMeasurementBasisInput): BacklinkMeasurementBasis {
  const providerKey = cleanText(input.providerKey, "provider_key", 80).toLowerCase();
  const providerMethod = cleanText(input.providerMethod, "provider_method", 96).toLowerCase();
  if (!KEY.test(providerKey) || !KEY.test(providerMethod)) throw new Error("invalid_authority_basis");

  const sourceFingerprint = cleanText(input.sourceFingerprint, "source_fingerprint", 64).toLowerCase();
  const marketFingerprint = cleanText(input.marketFingerprint, "market_fingerprint", 64).toLowerCase();
  const categoryFingerprint = cleanText(input.categoryFingerprint, "category_fingerprint", 64).toLowerCase();
  if (![sourceFingerprint, marketFingerprint, categoryFingerprint].every((value) => HEX_64.test(value))) {
    throw new Error("invalid_basis_fingerprint");
  }

  const name = cleanText(input.authorityMetric?.name, "authority_metric_name", 80).toLowerCase();
  if (!KEY.test(name)) throw new Error("invalid_authority_metric_name");
  const min = boundedNumber(input.authorityMetric?.min, -1_000_000, 1_000_000, "authority_metric_min");
  const max = boundedNumber(input.authorityMetric?.max, -1_000_000, 1_000_000, "authority_metric_max");
  if (min >= max) throw new Error("invalid_authority_metric_range");
  if (input.authorityMetric?.crossProviderComparable !== false) {
    throw new Error("cross_provider_authority_comparison_not_allowed");
  }

  return {
    providerKey,
    providerMethod,
    sourceFingerprint,
    marketFingerprint,
    categoryFingerprint,
    authorityMetric: { name, min, max, crossProviderComparable: false },
  };
}

export function normalizeBacklinkDomain(value: unknown, options: { allowUrl?: boolean } = {}): string {
  const raw = cleanText(value, "domain", 2048);
  let hostname = raw;

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    if (!options.allowUrl) throw new Error("invalid_domain");
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error("invalid_domain");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("invalid_domain");
    if (parsed.username || parsed.password) throw new Error("invalid_domain");
    hostname = parsed.hostname;
  } else {
    if (/[\s\/@?#:]/.test(raw)) throw new Error("invalid_domain");
  }

  hostname = hostname.toLowerCase().replace(/\.$/, "");
  const ascii = domainToASCII(hostname);
  if (!ascii || ascii.length > 253 || ascii === "localhost" || isIP(ascii) !== 0 || !ascii.includes(".")) {
    throw new Error("invalid_domain");
  }
  const labels = ascii.split(".");
  if (labels.some((label) => !HOST_LABEL.test(label))) throw new Error("invalid_domain");
  return ascii;
}

export function canonicalizeBacklinkUrl(value: unknown): string {
  const raw = cleanText(value, "url", 4096);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("invalid_url");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("invalid_url");
  if (parsed.username || parsed.password) throw new Error("invalid_url");

  parsed.hostname = normalizeBacklinkDomain(parsed.hostname);
  parsed.hash = "";

  const orderedParams = [...parsed.searchParams.entries()].sort(
    ([ak, av], [bk, bv]) => ak.localeCompare(bk) || av.localeCompare(bv),
  );
  parsed.search = "";
  for (const [key, val] of orderedParams) parsed.searchParams.append(key, val);

  return parsed.toString();
}

function freshness(lastSeenAt: string | null, referenceTime: string): { state: BacklinkFreshnessState; ageDays: number | null } {
  if (lastSeenAt === null) return { state: "unavailable", ageDays: null };
  const delta = Date.parse(referenceTime) - Date.parse(lastSeenAt);
  if (delta < 0) throw new Error("provider_timestamp_after_observation");
  const ageDays = Math.floor(delta / 86_400_000);
  const state: BacklinkFreshnessState =
    ageDays <= 30 ? "fresh" : ageDays <= 90 ? "recent" : ageDays <= 180 ? "aging" : "stale";
  return { state, ageDays };
}

function normalizeAnchors(values: unknown, rowBacklinks: number, basis: AnchorCountBasis): BacklinkAnchor[] {
  if (!Array.isArray(values) || values.length > P5_5_MAX_ANCHORS_PER_DOMAIN) throw new Error("invalid_anchors");

  const groups = new Map<string, BacklinkAnchor>();
  const classificationsByIdentity = new Map<string, AnchorClassification>();

  for (const raw of values) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("invalid_anchor");
    const item = raw as BacklinkAnchorInput;
    const displayText = cleanText(item.text, "anchor_text", 512);
    const identityText = displayText.toLowerCase();
    if (!ANCHOR_CLASSIFICATIONS.has(item.classification)) throw new Error("invalid_anchor_classification");
    const count = boundedInteger(item.count, 1, 1_000_000_000, "anchor_count");

    const existingClassification = classificationsByIdentity.get(identityText);
    if (existingClassification && existingClassification !== item.classification) {
      throw new Error("anchor_classification_conflict");
    }
    classificationsByIdentity.set(identityText, item.classification);

    const key = `${identityText}\u0000${item.classification}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count = boundedInteger(existing.count + count, 1, 1_000_000_000, "anchor_count");
      if (displayText.localeCompare(existing.displayText) < 0) existing.displayText = displayText;
    } else {
      groups.set(key, { displayText, identityText, count, classification: item.classification });
    }
  }

  const anchors = [...groups.values()].sort(
    (a, b) => a.identityText.localeCompare(b.identityText) || a.classification.localeCompare(b.classification),
  );

  if (basis === "backlink_count") {
    const count = anchors.reduce((sum, anchor) => sum + anchor.count, 0);
    if (count !== rowBacklinks) throw new Error("anchor_backlink_total_mismatch");
  }
  return anchors;
}

function normalizeRelations(value: unknown): BacklinkRelationEvidenceInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_link_type");
  const record = value as Record<string, unknown>;
  const allowed = new Set(["dofollow", "nofollow", "sponsored", "ugc"]);
  if (Object.keys(record).some((key) => !allowed.has(key))) throw new Error("invalid_link_type");
  const values = {
    dofollow: record.dofollow,
    nofollow: record.nofollow,
    sponsored: record.sponsored,
    ugc: record.ugc,
  };
  if (Object.values(values).some((item) => typeof item !== "boolean")) throw new Error("invalid_link_type");
  return values as BacklinkRelationEvidenceInput;
}

function normalizeTargetUrls(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > P5_5_MAX_URLS_PER_DOMAIN) throw new Error("invalid_target_urls");
  return [...new Set(value.map(canonicalizeBacklinkUrl))].sort((a, b) => a.localeCompare(b));
}

function normalizeReferringDomain(
  input: BacklinkReferringDomainInput,
  basis: BacklinkMeasurementBasis,
  observedAt: string,
  referenceTime: string,
): BacklinkReferringDomain {
  const domain = normalizeBacklinkDomain(input.domain, { allowUrl: true });
  const authority = nullableAuthority(input.authority, basis);
  const backlinks = boundedInteger(input.backlinks, 1, 1_000_000_000, "link_count");
  const relations = normalizeRelations(input.relations);

  const firstSeenAt = nullableTimestamp(input.firstSeenAt, "first_seen_at");
  const lastSeenAt = nullableTimestamp(input.lastSeenAt, "last_seen_at");
  const lostAt = nullableTimestamp(input.lostAt, "lost_at");
  assertTimestampAtOrBefore(firstSeenAt, observedAt, "provider_timestamp_after_observation");
  assertTimestampAtOrBefore(lastSeenAt, observedAt, "provider_timestamp_after_observation");
  assertTimestampAtOrBefore(lostAt, observedAt, "provider_timestamp_after_observation");
  if (firstSeenAt && lastSeenAt && Date.parse(firstSeenAt) > Date.parse(lastSeenAt)) {
    throw new Error("first_seen_after_last_seen");
  }
  if (firstSeenAt && lostAt && Date.parse(firstSeenAt) > Date.parse(lostAt)) {
    throw new Error("first_seen_after_lost");
  }

  if (!CHANGE_STATES.has(input.change30d)) throw new Error("invalid_change_30d");
  if (!ANCHOR_BASES.has(input.anchorCountBasis)) throw new Error("invalid_anchor_count_basis");
  const anchors = normalizeAnchors(input.anchors, backlinks, input.anchorCountBasis);
  const targetUrls = normalizeTargetUrls(input.targetUrls);
  const currentFreshness = freshness(lastSeenAt, referenceTime);

  return {
    domain,
    authority,
    backlinks,
    relations,
    firstSeenAt,
    lastSeenAt,
    lostAt,
    change30d: input.change30d,
    freshnessState: currentFreshness.state,
    ageDays: currentFreshness.ageDays,
    anchorCountBasis: input.anchorCountBasis,
    anchors,
    targetUrls,
  };
}

function normalizeSummary(
  input: BacklinkProfileSummaryInput,
  basis: BacklinkMeasurementBasis,
): BacklinkProfileSummaryInput {
  const nullableCount = (value: unknown, name: string): number | null =>
    value === null ? null : boundedInteger(value, 0, 1_000_000_000, name);

  return {
    authority: nullableAuthority(input.authority, basis),
    referringDomains: boundedInteger(input.referringDomains, 0, P5_5_MAX_REFERRING_DOMAINS, "referring_domains"),
    backlinks: boundedInteger(input.backlinks, 0, 1_000_000_000, "backlinks"),
    dofollowReferringDomains: boundedInteger(
      input.dofollowReferringDomains,
      0,
      P5_5_MAX_REFERRING_DOMAINS,
      "dofollow_referring_domains",
    ),
    nofollowReferringDomains: boundedInteger(
      input.nofollowReferringDomains,
      0,
      P5_5_MAX_REFERRING_DOMAINS,
      "nofollow_referring_domains",
    ),
    sponsoredReferringDomains: boundedInteger(
      input.sponsoredReferringDomains,
      0,
      P5_5_MAX_REFERRING_DOMAINS,
      "sponsored_referring_domains",
    ),
    ugcReferringDomains: boundedInteger(
      input.ugcReferringDomains,
      0,
      P5_5_MAX_REFERRING_DOMAINS,
      "ugc_referring_domains",
    ),
    newReferringDomains30d: nullableCount(input.newReferringDomains30d, "new_referring_domains_30d"),
    lostReferringDomains30d: nullableCount(input.lostReferringDomains30d, "lost_referring_domains_30d"),
  };
}

function normalizeProfile(
  input: BacklinkProfileInput,
  basis: BacklinkMeasurementBasis,
  observedAt: string,
  referenceTime: string,
): NormalizedBacklinkProfile {
  const targetDomain = normalizeBacklinkDomain(input.targetDomain, { allowUrl: true });
  const summary = normalizeSummary(input.summary, basis);
  if (!Array.isArray(input.referringDomains) || input.referringDomains.length > P5_5_MAX_REFERRING_DOMAINS) {
    throw new Error("invalid_referring_domains");
  }

  const referringDomains = input.referringDomains
    .map((row) => normalizeReferringDomain(row, basis, observedAt, referenceTime))
    .sort((a, b) => a.domain.localeCompare(b.domain));

  const seen = new Set<string>();
  for (const row of referringDomains) {
    if (seen.has(row.domain)) throw new Error("duplicate_referring_domain");
    seen.add(row.domain);
  }

  if (summary.referringDomains !== referringDomains.length) throw new Error("referring_domain_total_mismatch");
  const backlinks = referringDomains.reduce((sum, row) => sum + row.backlinks, 0);
  if (summary.backlinks !== backlinks) throw new Error("backlink_total_mismatch");

  const relationCounts = {
    dofollow: referringDomains.filter((row) => row.relations.dofollow).length,
    nofollow: referringDomains.filter((row) => row.relations.nofollow).length,
    sponsored: referringDomains.filter((row) => row.relations.sponsored).length,
    ugc: referringDomains.filter((row) => row.relations.ugc).length,
  };
  if (summary.dofollowReferringDomains !== relationCounts.dofollow) {
    throw new Error("dofollow_referring_domain_total_mismatch");
  }
  if (summary.nofollowReferringDomains !== relationCounts.nofollow) {
    throw new Error("nofollow_referring_domain_total_mismatch");
  }
  if (summary.sponsoredReferringDomains !== relationCounts.sponsored) {
    throw new Error("sponsored_referring_domain_total_mismatch");
  }
  if (summary.ugcReferringDomains !== relationCounts.ugc) {
    throw new Error("ugc_referring_domain_total_mismatch");
  }

  const allChangeKnown = referringDomains.every((row) => row.change30d !== "unknown");
  if (allChangeKnown) {
    const newCount = referringDomains.filter((row) => row.change30d === "new").length;
    const lostCount = referringDomains.filter((row) => row.change30d === "lost").length;
    if (summary.newReferringDomains30d === null || summary.newReferringDomains30d !== newCount) {
      throw new Error("new_referring_domain_total_mismatch");
    }
    if (summary.lostReferringDomains30d === null || summary.lostReferringDomains30d !== lostCount) {
      throw new Error("lost_referring_domain_total_mismatch");
    }
  } else if (summary.newReferringDomains30d !== null || summary.lostReferringDomains30d !== null) {
    throw new Error("new_lost_totals_require_complete_change_evidence");
  }

  const unavailable =
    summary.authority === null
    || referringDomains.some(
      (row) => row.authority === null || row.lastSeenAt === null || row.firstSeenAt === null,
    );

  const identity = {
    targetDomain,
    summary,
    referringDomains,
    validationState: unavailable ? ("valid_with_unavailable_fields" as const) : ("valid" as const),
  };
  const profileFingerprint = hash({
    version: P5_5_BACKLINK_FIXTURE_VERSION,
    basis,
    observedAt,
    referenceTime,
    ...identity,
  });
  return {
    profileId: `p55-profile-${profileFingerprint.slice(0, 20)}`,
    profileFingerprint,
    ...identity,
  };
}

function gapClassification(
  ownedPresent: boolean,
  competitorPresenceCount: number,
  competitorCount: number,
): BacklinkGapClassification {
  if (ownedPresent) return competitorPresenceCount === 0 ? "owned_exclusive" : "shared_coverage";
  if (competitorPresenceCount === 0) return "unlinked_observed_domain";
  if (competitorPresenceCount === competitorCount) return "universal_competitor_gap";
  if (competitorPresenceCount === 1) return "single_competitor_gap";
  return "shared_competitor_gap";
}

function latestTimestamp(values: Array<string | null>): string | null {
  const available = values.filter((value): value is string => value !== null).sort((a, b) => a.localeCompare(b));
  return available.length ? available[available.length - 1]! : null;
}

function gapCandidates(
  owned: NormalizedBacklinkProfile,
  competitors: NormalizedBacklinkProfile[],
  referenceTime: string,
): BacklinkGapCandidate[] {
  const allDomains = new Set<string>();
  for (const row of owned.referringDomains) allDomains.add(row.domain);
  for (const profile of competitors) for (const row of profile.referringDomains) allDomains.add(row.domain);

  return [...allDomains]
    .sort((a, b) => a.localeCompare(b))
    .map((referringDomain) => {
      const ownedRow = owned.referringDomains.find((row) => row.domain === referringDomain) ?? null;
      const competitorRows = competitors.map((profile) => ({
        targetDomain: profile.targetDomain,
        row: profile.referringDomains.find((row) => row.domain === referringDomain) ?? null,
      }));
      const competitorsPresence = competitorRows.map(({ targetDomain, row }) => ({
        targetDomain,
        present: row !== null,
      }));
      const competitorPresenceCount = competitorsPresence.filter((value) => value.present).length;
      const competitorCoverageRatio = round6(competitorPresenceCount / competitors.length);

      const authorityValues = [ownedRow, ...competitorRows.map((value) => value.row)]
        .filter((row): row is BacklinkReferringDomain => row !== null)
        .map((row) => row.authority)
        .filter((value): value is number => value !== null);
      const uniqueAuthorities = [...new Set(authorityValues)];
      if (uniqueAuthorities.length > 1) throw new Error("conflicting_referring_domain_authority");
      const authority = uniqueAuthorities.length ? uniqueAuthorities[0]! : null;

      const latestLastSeenAt = latestTimestamp(
        [ownedRow, ...competitorRows.map((value) => value.row)]
          .filter((row): row is BacklinkReferringDomain => row !== null)
          .map((row) => row.lastSeenAt),
      );
      const currentFreshness = freshness(latestLastSeenAt, referenceTime);

      return {
        referringDomain,
        ownedPresent: ownedRow !== null,
        competitors: competitorsPresence,
        competitorPresenceCount,
        competitorCoverageRatio,
        authority,
        latestLastSeenAt,
        freshnessState: currentFreshness.state,
        classification: gapClassification(ownedRow !== null, competitorPresenceCount, competitors.length),
      };
    });
}

export function normalizeBacklinkFixtureBundle(input: BacklinkFixtureBundleInput): BacklinkFixtureBundle {
  const basis = normalizeBasis(input.basis);
  const observedAt = canonicalTimestamp(input.observedAt, "observed_at");
  const referenceTime = canonicalTimestamp(input.referenceTime, "reference_time");
  if (Date.parse(observedAt) > Date.parse(referenceTime)) throw new Error("observed_after_reference_time");

  const owned = normalizeProfile(input.owned, basis, observedAt, referenceTime);
  if (!Array.isArray(input.competitors) || input.competitors.length < 1 || input.competitors.length > P5_5_MAX_COMPETITORS) {
    throw new Error("invalid_competitors");
  }
  const competitors = input.competitors
    .map((profile) => normalizeProfile(profile, basis, observedAt, referenceTime))
    .sort((a, b) => a.targetDomain.localeCompare(b.targetDomain));

  const competitorSeen = new Set<string>();
  for (const competitor of competitors) {
    if (competitor.targetDomain === owned.targetDomain) throw new Error("owned_domain_in_competitor_set");
    if (competitorSeen.has(competitor.targetDomain)) throw new Error("duplicate_competitor_domain");
    competitorSeen.add(competitor.targetDomain);
  }

  const candidates = gapCandidates(owned, competitors, referenceTime);
  const gaps = candidates.filter((candidate) => !candidate.ownedPresent && candidate.competitorPresenceCount > 0);
  const summary = {
    uniqueObservedReferringDomains: candidates.length,
    ownedExclusiveCount: candidates.filter((candidate) => candidate.classification === "owned_exclusive").length,
    sharedCoverageCount: candidates.filter((candidate) => candidate.classification === "shared_coverage").length,
    gapCandidateCount: gaps.length,
    singleCompetitorGapCount: gaps.filter((candidate) => candidate.classification === "single_competitor_gap").length,
    sharedCompetitorGapCount: gaps.filter((candidate) => candidate.classification === "shared_competitor_gap").length,
    universalCompetitorGapCount: gaps.filter((candidate) => candidate.classification === "universal_competitor_gap").length,
    averageGapCompetitorCoverageRatio:
      gaps.length === 0
        ? 0
        : round6(gaps.reduce((sum, candidate) => sum + candidate.competitorCoverageRatio, 0) / gaps.length),
  };

  const identity = {
    basis,
    observedAt,
    referenceTime,
    owned,
    competitors,
    gapCandidates: candidates,
    summary,
  };
  const bundleFingerprint = hash({ version: P5_5_BACKLINK_FIXTURE_VERSION, ...identity });
  return {
    version: P5_5_BACKLINK_FIXTURE_VERSION,
    bundleId: `p55-bundle-${bundleFingerprint.slice(0, 20)}`,
    bundleFingerprint,
    ...identity,
    safety: backlinkFixtureCapability(),
  };
}

export function backlinkFixtureCapability() {
  return Object.freeze({
    version: P5_5_BACKLINK_FIXTURE_VERSION,
    deterministicNormalization: true,
    suppliedFixturesOnly: true,
    providerNeutralAuthority: true,
    crossProviderAuthorityComparable: false,
    summaryContradictionsFailClosed: true,
    deterministicGapClassification: true,
    opportunityScoringIncluded: false,
    liveCollectionAuthorized: false,
    providerEnrollmentAuthorized: false,
    credentialUseAuthorized: false,
    sourceRegistryAdmissionAuthorized: false,
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
