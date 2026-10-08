import { createHash } from "node:crypto";
import {
  compareFullSiteCrawlHistory,
  type CrawlHistoryComparison,
  type CrawlHistorySource,
} from "./crawl-history-comparison.js";
import {
  assertFullSiteCrawlCertificationIntegrity,
} from "./full-site-crawl-certification.js";
import {
  assertExpectedAbsenceEffectiveCertificationIntegrity,
  type ExpectedAbsenceEffectiveCertification,
} from "./full-site-crawl-expected-absence-certification.js";

export const CRAWL_HISTORY_COMPARABLE_SOURCE_VERSION =
  "first_party_crawl_history_comparable_source_v1" as const;
export const CRAWL_HISTORY_EFFECTIVE_COMPARISON_VERSION =
  "first_party_crawl_history_effective_comparison_v1" as const;

export type ComparableCertificationMode =
  | "raw_completed"
  | "expected_absence_effective";

export type ComparableCrawlHistorySource = {
  version: typeof CRAWL_HISTORY_COMPARABLE_SOURCE_VERSION;
  source: CrawlHistorySource;
  certificationView: {
    mode: ComparableCertificationMode;
    comparableCertified: true;
    rawWholeSiteCertified: boolean;
    rawCertificationFingerprint: string;
    effectiveCertificationFingerprint: string | null;
    effectiveStatus:
      | "raw_completed"
      | "certified_with_expected_absence";
    effectiveBlockers: [];
  };
  fingerprint: string;
};

export type EffectiveComparableCrawlHistoryComparison = {
  version: typeof CRAWL_HISTORY_EFFECTIVE_COMPARISON_VERSION;
  siteId: string;
  canonicalOrigin: string;
  source: {
    beforeComparableFingerprint: string;
    afterComparableFingerprint: string;
    rawComparisonFingerprint: string;
  };
  rawComparison: CrawlHistoryComparison;
  comparableCertificationTransition: {
    beforeCertified: true;
    afterCertified: true;
    changed: false;
    beforeMode: ComparableCertificationMode;
    afterMode: ComparableCertificationMode;
    modeChanged: boolean;
    beforeRawWholeSiteCertified: boolean;
    afterRawWholeSiteCertified: boolean;
  };
  summary: {
    rawChangeDetected: boolean;
    rawCertificationChanged: boolean;
    comparableCertificationChanged: false;
    certificationModeChanged: boolean;
  };
  authorization: CrawlHistoryComparison["authorization"];
  fingerprint: string;
};

function stableSerialize(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableSerialize).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort()
    .map((key) => JSON.stringify(key) + ":" + stableSerialize(object[key]))
    .join(",") + "}";
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

function requireSha256(value: string, code: string): string {
  if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(code);
  return value;
}

function assertRawSource(source: CrawlHistorySource): void {
  assertFullSiteCrawlCertificationIntegrity(source.certification);
  compareFullSiteCrawlHistory({ before: source, after: source });
}

function assertEffectiveBinding(
  source: CrawlHistorySource,
  effective: ExpectedAbsenceEffectiveCertification,
): void {
  assertExpectedAbsenceEffectiveCertificationIntegrity(effective);
  if (
    effective.siteId !== source.certification.siteId ||
    effective.canonicalOrigin !== source.certification.canonicalOrigin ||
    effective.lineage.rawCertificationFingerprint !== source.certification.fingerprint ||
    effective.lineage.executionPlanFingerprint !==
      source.certification.lineage.executionPlanFingerprint ||
    effective.lineage.checkpointFingerprint !==
      source.certification.lineage.checkpointFingerprint
  ) {
    throw new Error("crawl_history_effective_certification_lineage_mismatch");
  }
  if (
    effective.certification.effectiveWholeSiteCertified !== true ||
    effective.certification.status !== "certified_with_expected_absence" ||
    effective.certification.blockers.length !== 0
  ) {
    throw new Error("crawl_history_effective_certification_not_comparable");
  }
}

export function buildComparableCrawlHistorySource(input: {
  source: CrawlHistorySource;
  effectiveCertification?: ExpectedAbsenceEffectiveCertification | null;
}): ComparableCrawlHistorySource {
  assertRawSource(input.source);
  const rawCertified =
    input.source.certification.certification.wholeSiteCertified;

  let certificationView: ComparableCrawlHistorySource["certificationView"];
  if (rawCertified) {
    if (input.effectiveCertification) {
      throw new Error(
        "crawl_history_effective_certification_unexpected_for_raw_completed",
      );
    }
    certificationView = {
      mode: "raw_completed",
      comparableCertified: true,
      rawWholeSiteCertified: true,
      rawCertificationFingerprint: input.source.certification.fingerprint,
      effectiveCertificationFingerprint: null,
      effectiveStatus: "raw_completed",
      effectiveBlockers: [],
    };
  } else {
    const effective = input.effectiveCertification;
    if (!effective) {
      throw new Error(
        "crawl_history_effective_certification_required_for_raw_uncertified",
      );
    }
    assertEffectiveBinding(input.source, effective);
    certificationView = {
      mode: "expected_absence_effective",
      comparableCertified: true,
      rawWholeSiteCertified: false,
      rawCertificationFingerprint: input.source.certification.fingerprint,
      effectiveCertificationFingerprint: effective.fingerprint,
      effectiveStatus: "certified_with_expected_absence",
      effectiveBlockers: [],
    };
  }

  const withoutFingerprint: Omit<
    ComparableCrawlHistorySource,
    "fingerprint"
  > = {
    version: CRAWL_HISTORY_COMPARABLE_SOURCE_VERSION,
    source: input.source,
    certificationView,
  };
  return {
    ...withoutFingerprint,
    fingerprint: fingerprint(withoutFingerprint),
  };
}

export function assertComparableCrawlHistorySourceIntegrity(
  comparable: ComparableCrawlHistorySource,
): void {
  if (comparable.version !== CRAWL_HISTORY_COMPARABLE_SOURCE_VERSION) {
    throw new Error("crawl_history_comparable_source_version_invalid");
  }
  assertRawSource(comparable.source);
  requireSha256(
    comparable.certificationView.rawCertificationFingerprint,
    "crawl_history_comparable_source_fingerprint_invalid",
  );
  if (
    comparable.certificationView.rawCertificationFingerprint !==
    comparable.source.certification.fingerprint
  ) {
    throw new Error("crawl_history_comparable_source_raw_lineage_mismatch");
  }

  if (comparable.certificationView.mode === "raw_completed") {
    if (
      comparable.source.certification.certification.wholeSiteCertified !== true ||
      comparable.certificationView.rawWholeSiteCertified !== true ||
      comparable.certificationView.effectiveCertificationFingerprint !== null ||
      comparable.certificationView.effectiveStatus !== "raw_completed"
    ) {
      throw new Error("crawl_history_comparable_raw_semantics_invalid");
    }
  } else if (
    comparable.certificationView.mode === "expected_absence_effective"
  ) {
    if (
      comparable.source.certification.certification.wholeSiteCertified !== false ||
      comparable.certificationView.rawWholeSiteCertified !== false ||
      comparable.certificationView.effectiveStatus !==
        "certified_with_expected_absence" ||
      !comparable.certificationView.effectiveCertificationFingerprint
    ) {
      throw new Error("crawl_history_comparable_effective_semantics_invalid");
    }
    requireSha256(
      comparable.certificationView.effectiveCertificationFingerprint,
      "crawl_history_comparable_effective_fingerprint_invalid",
    );
  } else {
    throw new Error("crawl_history_comparable_mode_invalid");
  }

  if (
    comparable.certificationView.comparableCertified !== true ||
    comparable.certificationView.effectiveBlockers.length !== 0
  ) {
    throw new Error("crawl_history_comparable_certification_invalid");
  }

  requireSha256(
    comparable.fingerprint,
    "crawl_history_comparable_fingerprint_invalid",
  );
  const { fingerprint: actual, ...withoutFingerprint } = comparable;
  if (actual !== fingerprint(withoutFingerprint)) {
    throw new Error("crawl_history_comparable_fingerprint_mismatch");
  }
}

export function compareComparableCrawlHistory(input: {
  before: ComparableCrawlHistorySource;
  after: ComparableCrawlHistorySource;
}): EffectiveComparableCrawlHistoryComparison {
  assertComparableCrawlHistorySourceIntegrity(input.before);
  assertComparableCrawlHistorySourceIntegrity(input.after);

  const rawComparison = compareFullSiteCrawlHistory({
    before: input.before.source,
    after: input.after.source,
  });
  const modeChanged =
    input.before.certificationView.mode !==
    input.after.certificationView.mode;

  const withoutFingerprint: Omit<
    EffectiveComparableCrawlHistoryComparison,
    "fingerprint"
  > = {
    version: CRAWL_HISTORY_EFFECTIVE_COMPARISON_VERSION,
    siteId: rawComparison.siteId,
    canonicalOrigin: rawComparison.canonicalOrigin,
    source: {
      beforeComparableFingerprint: input.before.fingerprint,
      afterComparableFingerprint: input.after.fingerprint,
      rawComparisonFingerprint: rawComparison.fingerprint,
    },
    rawComparison,
    comparableCertificationTransition: {
      beforeCertified: true,
      afterCertified: true,
      changed: false,
      beforeMode: input.before.certificationView.mode,
      afterMode: input.after.certificationView.mode,
      modeChanged,
      beforeRawWholeSiteCertified:
        input.before.certificationView.rawWholeSiteCertified,
      afterRawWholeSiteCertified:
        input.after.certificationView.rawWholeSiteCertified,
    },
    summary: {
      rawChangeDetected: rawComparison.summary.changeDetected,
      rawCertificationChanged:
        rawComparison.certificationTransition.changed,
      comparableCertificationChanged: false,
      certificationModeChanged: modeChanged,
    },
    authorization: rawComparison.authorization,
  };
  return {
    ...withoutFingerprint,
    fingerprint: fingerprint(withoutFingerprint),
  };
}

export function assertEffectiveComparableCrawlHistoryComparisonIntegrity(
  comparison: EffectiveComparableCrawlHistoryComparison,
): void {
  if (
    comparison.version !==
    CRAWL_HISTORY_EFFECTIVE_COMPARISON_VERSION
  ) {
    throw new Error("crawl_history_effective_comparison_version_invalid");
  }
  requireSha256(
    comparison.source.beforeComparableFingerprint,
    "crawl_history_effective_comparison_source_fingerprint_invalid",
  );
  requireSha256(
    comparison.source.afterComparableFingerprint,
    "crawl_history_effective_comparison_source_fingerprint_invalid",
  );
  requireSha256(
    comparison.source.rawComparisonFingerprint,
    "crawl_history_effective_comparison_source_fingerprint_invalid",
  );
  if (
    comparison.source.rawComparisonFingerprint !==
    comparison.rawComparison.fingerprint ||
    comparison.siteId !== comparison.rawComparison.siteId ||
    comparison.canonicalOrigin !== comparison.rawComparison.canonicalOrigin
  ) {
    throw new Error("crawl_history_effective_comparison_raw_lineage_mismatch");
  }
  if (
    comparison.comparableCertificationTransition.beforeCertified !== true ||
    comparison.comparableCertificationTransition.afterCertified !== true ||
    comparison.comparableCertificationTransition.changed !== false ||
    comparison.summary.comparableCertificationChanged !== false ||
    comparison.comparableCertificationTransition.modeChanged !==
      comparison.summary.certificationModeChanged ||
    comparison.rawComparison.certificationTransition.changed !==
      comparison.summary.rawCertificationChanged ||
    comparison.rawComparison.summary.changeDetected !==
      comparison.summary.rawChangeDetected
  ) {
    throw new Error(
      "crawl_history_effective_comparison_transition_invalid",
    );
  }
  if (
    Object.values(comparison.authorization).some((value) => value !== false)
  ) {
    throw new Error(
      "crawl_history_effective_comparison_authorization_must_be_closed",
    );
  }

  requireSha256(
    comparison.fingerprint,
    "crawl_history_effective_comparison_fingerprint_invalid",
  );
  const { fingerprint: actual, ...withoutFingerprint } = comparison;
  if (actual !== fingerprint(withoutFingerprint)) {
    throw new Error("crawl_history_effective_comparison_fingerprint_mismatch");
  }
}
