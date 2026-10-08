import { createHash } from "node:crypto";
import {
  CRAWL_CERTIFICATION_BLOCKERS,
  assertFullSiteCrawlCertificationIntegrity,
  type CrawlCertificationBlocker,
  type FullSiteCrawlCertification,
} from "./full-site-crawl-certification.js";
import {
  assertTerminalFailureEventIntegrity,
  type TerminalFailureEvent,
} from "./first-party-crawl-terminal-recovery.js";

export const EXPECTED_ABSENCE_EFFECTIVE_CERTIFICATION_VERSION =
  "first_party_expected_absence_effective_certification_v1" as const;

export type ExpectedAbsenceDispositionType =
  | "stale_inventory_absence"
  | "sitemap_orphan_absence";

export type ExpectedAbsenceDispositionEvidence = {
  version: "first_party_expected_absence_disposition_evidence_v1";
  runId: string;
  siteId: string;
  canonicalOrigin: string;
  executionPlanFingerprint: string;
  sourceEventFingerprint: string;
  canonicalUrl: string;
  historicalAbsenceHttpStatus: 404 | 410;
  currentAbsenceHttpStatus: 404 | 410;
  freshInventoryFingerprint: string;
  presentInFreshInventory: boolean;
  dispositionType: ExpectedAbsenceDispositionType;
  dispositionFingerprint: string;
};

export type ExpectedAbsenceEffectiveCertification = {
  version: typeof EXPECTED_ABSENCE_EFFECTIVE_CERTIFICATION_VERSION;
  siteId: string;
  canonicalOrigin: string;
  lineage: {
    rawCertificationFingerprint: string;
    executionPlanFingerprint: string;
    checkpointFingerprint: string;
    terminalFailureEventFingerprints: string[];
    dispositionFingerprints: string[];
  };
  accounting: {
    rawTerminalFailureCount: number;
    expectedAbsenceCount: number;
    effectiveUnresolvedTerminalFailureCount: number;
  };
  certification: {
    status: "certified_with_expected_absence" | "blocked";
    effectiveWholeSiteCertified: boolean;
    legacyWholeSiteCertified: boolean;
    blockers: CrawlCertificationBlocker[];
    assertsCompletenessOnly: true;
    assertsSeoHealth: false;
  };
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

function requireCanonicalUrl(value: string, origin: string, code: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(code);
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.origin !== origin ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) throw new Error(code);
  return parsed.toString();
}

function requireAcceptedAbsenceStatus(value: number, code: string): 404 | 410 {
  if (value !== 404 && value !== 410) throw new Error(code);
  return value;
}

function terminalEventAbsenceStatus(event: TerminalFailureEvent): 404 | 410 {
  assertTerminalFailureEventIntegrity(event);
  if (
    event.eventType === "recovery_resolved" ||
    event.outcome.kind !== "failure" ||
    event.decisionReason !== "permanent_http" ||
    event.outcome.signal.kind !== "http_status"
  ) {
    throw new Error("expected_absence_terminal_event_not_permanent_http");
  }
  return requireAcceptedAbsenceStatus(
    event.outcome.signal.httpStatus,
    "expected_absence_terminal_event_http_status_invalid",
  );
}

function validateDisposition(
  raw: FullSiteCrawlCertification,
  event: TerminalFailureEvent,
  disposition: ExpectedAbsenceDispositionEvidence,
): void {
  if (disposition.version !== "first_party_expected_absence_disposition_evidence_v1") {
    throw new Error("expected_absence_disposition_version_invalid");
  }
  requireSha256(
    disposition.executionPlanFingerprint,
    "expected_absence_disposition_execution_fingerprint_invalid",
  );
  requireSha256(
    disposition.sourceEventFingerprint,
    "expected_absence_disposition_source_event_fingerprint_invalid",
  );
  requireSha256(
    disposition.freshInventoryFingerprint,
    "expected_absence_disposition_inventory_fingerprint_invalid",
  );
  requireSha256(
    disposition.dispositionFingerprint,
    "expected_absence_disposition_fingerprint_invalid",
  );
  requireCanonicalUrl(
    disposition.canonicalUrl,
    raw.canonicalOrigin,
    "expected_absence_disposition_url_invalid",
  );
  const historicalStatus = terminalEventAbsenceStatus(event);
  if (
    disposition.runId !== event.runId ||
    disposition.siteId !== raw.siteId ||
    disposition.siteId !== event.siteId ||
    disposition.canonicalOrigin !== raw.canonicalOrigin ||
    disposition.canonicalOrigin !== event.canonicalOrigin ||
    disposition.executionPlanFingerprint !== raw.lineage.executionPlanFingerprint ||
    disposition.executionPlanFingerprint !== event.executionPlanFingerprint ||
    disposition.sourceEventFingerprint !== event.fingerprint ||
    disposition.canonicalUrl !== event.canonicalUrl
  ) {
    throw new Error("expected_absence_disposition_lineage_mismatch");
  }
  if (
    disposition.historicalAbsenceHttpStatus !== historicalStatus ||
    ![404, 410].includes(disposition.currentAbsenceHttpStatus)
  ) {
    throw new Error("expected_absence_disposition_http_status_mismatch");
  }
  if (
    (disposition.dispositionType === "stale_inventory_absence" &&
      disposition.presentInFreshInventory !== false) ||
    (disposition.dispositionType === "sitemap_orphan_absence" &&
      disposition.presentInFreshInventory !== true) ||
    !["stale_inventory_absence", "sitemap_orphan_absence"].includes(
      disposition.dispositionType,
    )
  ) {
    throw new Error("expected_absence_disposition_semantics_invalid");
  }
}

function sortedUnique(values: string[], duplicateCode: string): string[] {
  const sorted = [...values].sort();
  if (new Set(sorted).size !== sorted.length) throw new Error(duplicateCode);
  return sorted;
}

export function buildExpectedAbsenceEffectiveCertification(input: {
  rawCertification: FullSiteCrawlCertification;
  terminalFailureEvents: TerminalFailureEvent[];
  dispositions: ExpectedAbsenceDispositionEvidence[];
}): ExpectedAbsenceEffectiveCertification {
  const raw = input.rawCertification;
  assertFullSiteCrawlCertificationIntegrity(raw);

  if (raw.ledger.failed <= 0) {
    throw new Error("expected_absence_raw_terminal_failure_required");
  }
  if (!raw.certification.blockers.includes("terminal_failures_present")) {
    throw new Error("expected_absence_raw_terminal_blocker_missing");
  }
  if (input.dispositions.length === 0) {
    throw new Error("expected_absence_disposition_required");
  }
  if (input.terminalFailureEvents.length !== raw.ledger.failed) {
    throw new Error("expected_absence_terminal_event_count_mismatch");
  }
  if (input.dispositions.length > input.terminalFailureEvents.length) {
    throw new Error("expected_absence_disposition_count_exceeds_failures");
  }

  const eventsByFingerprint = new Map<string, TerminalFailureEvent>();
  const eventUrls = new Set<string>();
  for (const event of input.terminalFailureEvents) {
    terminalEventAbsenceStatus(event);
    if (
      event.siteId !== raw.siteId ||
      event.canonicalOrigin !== raw.canonicalOrigin ||
      event.executionPlanFingerprint !== raw.lineage.executionPlanFingerprint
    ) {
      throw new Error("expected_absence_terminal_event_lineage_mismatch");
    }
    if (eventsByFingerprint.has(event.fingerprint) || eventUrls.has(event.canonicalUrl)) {
      throw new Error("expected_absence_terminal_event_duplicate");
    }
    eventsByFingerprint.set(event.fingerprint, event);
    eventUrls.add(event.canonicalUrl);
  }

  const dispositionFingerprints: string[] = [];
  const dispositionSources = new Set<string>();
  const dispositionUrls = new Set<string>();
  for (const disposition of input.dispositions) {
    const event = eventsByFingerprint.get(disposition.sourceEventFingerprint);
    if (!event) throw new Error("expected_absence_disposition_source_event_missing");
    validateDisposition(raw, event, disposition);
    if (
      dispositionSources.has(disposition.sourceEventFingerprint) ||
      dispositionUrls.has(disposition.canonicalUrl)
    ) {
      throw new Error("expected_absence_disposition_duplicate");
    }
    dispositionSources.add(disposition.sourceEventFingerprint);
    dispositionUrls.add(disposition.canonicalUrl);
    dispositionFingerprints.push(disposition.dispositionFingerprint);
  }

  const rawTerminalFailureCount = raw.ledger.failed;
  const expectedAbsenceCount = input.dispositions.length;
  const effectiveUnresolvedTerminalFailureCount =
    rawTerminalFailureCount - expectedAbsenceCount;

  const blockers = new Set<CrawlCertificationBlocker>(raw.certification.blockers);
  if (effectiveUnresolvedTerminalFailureCount === 0) {
    blockers.delete("terminal_failures_present");
  } else {
    blockers.add("terminal_failures_present");
  }
  const effectiveBlockers = [...blockers].sort();
  const effectiveWholeSiteCertified = effectiveBlockers.length === 0;
  const status = effectiveWholeSiteCertified
    ? "certified_with_expected_absence"
    : "blocked";

  const withoutFingerprint: Omit<
    ExpectedAbsenceEffectiveCertification,
    "fingerprint"
  > = {
    version: EXPECTED_ABSENCE_EFFECTIVE_CERTIFICATION_VERSION,
    siteId: raw.siteId,
    canonicalOrigin: raw.canonicalOrigin,
    lineage: {
      rawCertificationFingerprint: raw.fingerprint,
      executionPlanFingerprint: raw.lineage.executionPlanFingerprint,
      checkpointFingerprint: raw.lineage.checkpointFingerprint,
      terminalFailureEventFingerprints: sortedUnique(
        input.terminalFailureEvents.map((event) => event.fingerprint),
        "expected_absence_terminal_event_duplicate",
      ),
      dispositionFingerprints: sortedUnique(
        dispositionFingerprints,
        "expected_absence_disposition_fingerprint_duplicate",
      ),
    },
    accounting: {
      rawTerminalFailureCount,
      expectedAbsenceCount,
      effectiveUnresolvedTerminalFailureCount,
    },
    certification: {
      status,
      effectiveWholeSiteCertified,
      legacyWholeSiteCertified: raw.certification.wholeSiteCertified,
      blockers: effectiveBlockers,
      assertsCompletenessOnly: true,
      assertsSeoHealth: false,
    },
  };
  const result = {
    ...withoutFingerprint,
    fingerprint: fingerprint(withoutFingerprint),
  };
  assertExpectedAbsenceEffectiveCertificationIntegrity(result);
  return result;
}

export function assertExpectedAbsenceEffectiveCertificationIntegrity(
  certification: ExpectedAbsenceEffectiveCertification,
): void {
  if (
    certification.version !==
    EXPECTED_ABSENCE_EFFECTIVE_CERTIFICATION_VERSION
  ) throw new Error("expected_absence_effective_version_invalid");
  if (!certification.siteId.trim() || !certification.canonicalOrigin.trim()) {
    throw new Error("expected_absence_effective_identity_invalid");
  }
  requireSha256(
    certification.lineage.rawCertificationFingerprint,
    "expected_absence_effective_lineage_fingerprint_invalid",
  );
  requireSha256(
    certification.lineage.executionPlanFingerprint,
    "expected_absence_effective_lineage_fingerprint_invalid",
  );
  requireSha256(
    certification.lineage.checkpointFingerprint,
    "expected_absence_effective_lineage_fingerprint_invalid",
  );
  const eventFingerprints = sortedUnique(
    certification.lineage.terminalFailureEventFingerprints.map((value) =>
      requireSha256(value, "expected_absence_effective_event_fingerprint_invalid")
    ),
    "expected_absence_effective_event_fingerprint_duplicate",
  );
  const dispositionFingerprints = sortedUnique(
    certification.lineage.dispositionFingerprints.map((value) =>
      requireSha256(
        value,
        "expected_absence_effective_disposition_fingerprint_invalid",
      )
    ),
    "expected_absence_effective_disposition_fingerprint_duplicate",
  );
  if (
    stableSerialize(eventFingerprints) !==
      stableSerialize(certification.lineage.terminalFailureEventFingerprints) ||
    stableSerialize(dispositionFingerprints) !==
      stableSerialize(certification.lineage.dispositionFingerprints)
  ) {
    throw new Error("expected_absence_effective_lineage_order_invalid");
  }

  const accounting = certification.accounting;
  for (const value of [
    accounting.rawTerminalFailureCount,
    accounting.expectedAbsenceCount,
    accounting.effectiveUnresolvedTerminalFailureCount,
  ]) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error("expected_absence_effective_accounting_invalid");
    }
  }
  if (
    accounting.rawTerminalFailureCount < 1 ||
    accounting.expectedAbsenceCount < 1 ||
    accounting.expectedAbsenceCount > accounting.rawTerminalFailureCount ||
    accounting.effectiveUnresolvedTerminalFailureCount !==
      accounting.rawTerminalFailureCount - accounting.expectedAbsenceCount ||
    eventFingerprints.length !== accounting.rawTerminalFailureCount ||
    dispositionFingerprints.length !== accounting.expectedAbsenceCount
  ) {
    throw new Error("expected_absence_effective_accounting_mismatch");
  }

  if (
    certification.certification.legacyWholeSiteCertified !== false ||
    certification.certification.assertsCompletenessOnly !== true ||
    certification.certification.assertsSeoHealth !== false
  ) {
    throw new Error("expected_absence_effective_legacy_semantics_invalid");
  }
  if (
    new Set(certification.certification.blockers).size !==
      certification.certification.blockers.length ||
    certification.certification.blockers.some(
      (blocker) => !CRAWL_CERTIFICATION_BLOCKERS.includes(blocker),
    )
  ) {
    throw new Error("expected_absence_effective_blocker_invalid");
  }
  const sortedBlockers = [...certification.certification.blockers].sort();
  if (
    stableSerialize(sortedBlockers) !==
    stableSerialize(certification.certification.blockers)
  ) {
    throw new Error("expected_absence_effective_blocker_order_invalid");
  }

  const shouldHaveTerminalBlocker =
    accounting.effectiveUnresolvedTerminalFailureCount > 0;
  if (
    certification.certification.blockers.includes(
      "terminal_failures_present",
    ) !== shouldHaveTerminalBlocker
  ) {
    throw new Error("expected_absence_effective_terminal_blocker_mismatch");
  }
  const expectedCertified = certification.certification.blockers.length === 0;
  if (
    certification.certification.effectiveWholeSiteCertified !==
      expectedCertified ||
    certification.certification.status !==
      (expectedCertified ? "certified_with_expected_absence" : "blocked")
  ) {
    throw new Error("expected_absence_effective_status_mismatch");
  }

  requireSha256(
    certification.fingerprint,
    "expected_absence_effective_fingerprint_invalid",
  );
  const { fingerprint: actual, ...withoutFingerprint } = certification;
  if (actual !== fingerprint(withoutFingerprint)) {
    throw new Error("expected_absence_effective_fingerprint_mismatch");
  }
}
