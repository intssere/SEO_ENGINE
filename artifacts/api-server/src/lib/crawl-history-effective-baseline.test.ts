import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { planFirstPartyCrawl } from "./crawl-controller.js";
import { buildSitemapInventory } from "./sitemap-inventory.js";
import {
  advanceCrawlCheckpoint,
  createInitialCrawlCheckpoint,
  planFullSiteCrawlExecution,
  type SuppliedCrawlUrlOutcome,
} from "./full-site-crawl-control.js";
import {
  buildFullSiteCrawlCertification,
} from "./full-site-crawl-certification.js";
import {
  createTerminalFailureEvent,
} from "./first-party-crawl-terminal-recovery.js";
import {
  buildExpectedAbsenceEffectiveCertification,
  type ExpectedAbsenceDispositionEvidence,
} from "./full-site-crawl-expected-absence-certification.js";
import {
  assertComparableCrawlHistorySourceIntegrity,
  assertEffectiveComparableCrawlHistoryComparisonIntegrity,
  buildComparableCrawlHistorySource,
  compareComparableCrawlHistory,
} from "./crawl-history-effective-baseline.js";

const target = {
  targetClass: "first_party" as const,
  siteId: "diamond-shelf",
  canonicalOrigin: "https://diamondshelf.us" as const,
};

function hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function fixture(outcomes: SuppliedCrawlUrlOutcome[]) {
  const plan = planFirstPartyCrawl(
    { mode: "full_site", target, hardPageLimit: 20 },
    { absolutePageCeiling: 1_000 },
  );
  const urls = outcomes.map((outcome) => outcome.canonicalUrl);
  const inventory = buildSitemapInventory({
    plan,
    rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
    documents: [{
      url: "https://diamondshelf.us/sitemap.xml",
      xml: "<urlset>" + urls.map((url) =>
        "<url><loc>" + url + "</loc></url>"
      ).join("") + "</urlset>",
    }],
    policy: {
      maxDocuments: 10,
      maxDepth: 3,
      maxDocumentBytes: 20_000,
      maxInventoryUrls: 20,
      maxPathSegments: 20,
    },
  });
  const executionPlan = planFullSiteCrawlExecution(plan, inventory, {
    batchSize: 20,
    concurrency: 2,
    requestsPerMinute: 60,
    requestTimeoutMs: 10_000,
    maxRedirectsPerRequest: 3,
    maxAttemptsPerUrl: 1,
    retryBaseDelayMs: 1_000,
    retryMaxDelayMs: 4_000,
    maxUrlLength: 2_048,
    maxPathSegments: 20,
    maxRepeatedPathSegmentRun: 4,
  });
  const initial = createInitialCrawlCheckpoint(executionPlan);
  const completed = advanceCrawlCheckpoint(executionPlan, initial, {
    expectedCheckpointFingerprint: initial.fingerprint,
    batchId: initial.activeBatchId!,
    attempt: initial.nextAttempt!,
    outcomes,
  });
  const certification = buildFullSiteCrawlCertification({
    crawlPlan: plan,
    inventory,
    executionPlan,
    checkpoint: completed,
  });
  return {
    source: { inventory, certification },
    executionPlan,
    initial,
    completed,
  };
}

function expectedAbsenceFixture() {
  const canonicalUrl = "https://diamondshelf.us/missing";
  const raw = fixture([
    { canonicalUrl: "https://diamondshelf.us/ok", kind: "success" },
    {
      canonicalUrl,
      kind: "failure",
      signal: { kind: "http_status", httpStatus: 404 },
    },
  ]);
  const event = createTerminalFailureEvent({
    eventType: "terminal_failure",
    runId: "l10-22-expected-absence",
    observedAt: "2026-10-08T12:30:00.000Z",
    siteId: target.siteId,
    canonicalOrigin: target.canonicalOrigin,
    executionPlanFingerprint: raw.executionPlan.fingerprint,
    canonicalUrl,
    checkpointRevision: raw.completed.sequence,
    checkpointFingerprint: raw.completed.fingerprint,
    batchId: raw.initial.activeBatchId!,
    attempt: raw.initial.nextAttempt!,
    sourceEventFingerprint: null,
    outcome: {
      canonicalUrl,
      kind: "failure",
      signal: { kind: "http_status", httpStatus: 404 },
    },
    decisionReason: "permanent_http",
  });
  const disposition: ExpectedAbsenceDispositionEvidence = {
    version: "first_party_expected_absence_disposition_evidence_v1",
    runId: event.runId,
    siteId: event.siteId,
    canonicalOrigin: event.canonicalOrigin,
    executionPlanFingerprint: event.executionPlanFingerprint,
    sourceEventFingerprint: event.fingerprint,
    canonicalUrl,
    historicalAbsenceHttpStatus: 404,
    currentAbsenceHttpStatus: 404,
    freshInventoryFingerprint: raw.source.inventory.fingerprint,
    presentInFreshInventory: true,
    dispositionType: "sitemap_orphan_absence",
    dispositionFingerprint: hex("l10-22-disposition:" + event.fingerprint),
  };
  const effective = buildExpectedAbsenceEffectiveCertification({
    rawCertification: raw.source.certification,
    terminalFailureEvents: [event],
    dispositions: [disposition],
  });
  return { ...raw, event, disposition, effective };
}

test("L10.22 accepts a legacy raw-certified history source", () => {
  const raw = fixture([
    { canonicalUrl: "https://diamondshelf.us/ok", kind: "success" },
  ]);
  assert.equal(raw.source.certification.certification.wholeSiteCertified, true);

  const comparable = buildComparableCrawlHistorySource({
    source: raw.source,
  });

  assert.equal(comparable.certificationView.mode, "raw_completed");
  assert.equal(comparable.certificationView.comparableCertified, true);
  assert.equal(comparable.certificationView.rawWholeSiteCertified, true);
  assert.equal(
    comparable.certificationView.effectiveCertificationFingerprint,
    null,
  );
  assert.doesNotThrow(() =>
    assertComparableCrawlHistorySourceIntegrity(comparable)
  );
});

test("L10.22 accepts expected-absence certification without rewriting raw certification", () => {
  const source = expectedAbsenceFixture();
  const rawBefore = structuredClone(source.source.certification);
  assert.equal(
    source.source.certification.certification.wholeSiteCertified,
    false,
  );
  assert.equal(
    source.effective.certification.effectiveWholeSiteCertified,
    true,
  );

  const comparable = buildComparableCrawlHistorySource({
    source: source.source,
    effectiveCertification: source.effective,
  });

  assert.deepEqual(source.source.certification, rawBefore);
  assert.equal(
    comparable.certificationView.mode,
    "expected_absence_effective",
  );
  assert.equal(comparable.certificationView.rawWholeSiteCertified, false);
  assert.equal(
    comparable.certificationView.effectiveCertificationFingerprint,
    source.effective.fingerprint,
  );
  assert.doesNotThrow(() =>
    assertComparableCrawlHistorySourceIntegrity(comparable)
  );
});

test("L10.22 comparable integrity rejects substituted effective evidence", () => {
  const source = expectedAbsenceFixture();
  const other = expectedAbsenceFixture();
  const comparable = buildComparableCrawlHistorySource({
    source: source.source,
    effectiveCertification: source.effective,
  });
  const tampered = structuredClone(comparable);
  tampered.effectiveCertification = {
    ...other.effective,
    lineage: {
      ...other.effective.lineage,
      rawCertificationFingerprint: hex("wrong-raw-certification"),
    },
  };

  assert.throws(
    () => assertComparableCrawlHistorySourceIntegrity(tampered),
    /expected_absence_effective_fingerprint_mismatch|crawl_history_effective_certification_lineage_mismatch/,
  );
});

test("L10.22 rejects raw-uncertified history without effective certification", () => {
  const source = expectedAbsenceFixture();

  assert.throws(
    () => buildComparableCrawlHistorySource({ source: source.source }),
    /crawl_history_effective_certification_required_for_raw_uncertified/,
  );
});

test("L10.22 rejects blocked effective certification", () => {
  const firstUrl = "https://diamondshelf.us/missing-a";
  const secondUrl = "https://diamondshelf.us/missing-b";
  const raw = fixture([
    {
      canonicalUrl: firstUrl,
      kind: "failure",
      signal: { kind: "http_status", httpStatus: 404 },
    },
    {
      canonicalUrl: secondUrl,
      kind: "failure",
      signal: { kind: "http_status", httpStatus: 410 },
    },
  ]);
  const first = createTerminalFailureEvent({
    eventType: "terminal_failure",
    runId: "l10-22-blocked",
    observedAt: "2026-10-08T12:31:00.000Z",
    siteId: target.siteId,
    canonicalOrigin: target.canonicalOrigin,
    executionPlanFingerprint: raw.executionPlan.fingerprint,
    canonicalUrl: firstUrl,
    checkpointRevision: raw.completed.sequence,
    checkpointFingerprint: raw.completed.fingerprint,
    batchId: raw.initial.activeBatchId!,
    attempt: raw.initial.nextAttempt!,
    sourceEventFingerprint: null,
    outcome: {
      canonicalUrl: firstUrl,
      kind: "failure",
      signal: { kind: "http_status", httpStatus: 404 },
    },
    decisionReason: "permanent_http",
  });
  const second = createTerminalFailureEvent({
    eventType: "terminal_failure",
    runId: "l10-22-blocked",
    observedAt: "2026-10-08T12:31:00.000Z",
    siteId: target.siteId,
    canonicalOrigin: target.canonicalOrigin,
    executionPlanFingerprint: raw.executionPlan.fingerprint,
    canonicalUrl: secondUrl,
    checkpointRevision: raw.completed.sequence,
    checkpointFingerprint: raw.completed.fingerprint,
    batchId: raw.initial.activeBatchId!,
    attempt: raw.initial.nextAttempt!,
    sourceEventFingerprint: null,
    outcome: {
      canonicalUrl: secondUrl,
      kind: "failure",
      signal: { kind: "http_status", httpStatus: 410 },
    },
    decisionReason: "permanent_http",
  });
  const disposition: ExpectedAbsenceDispositionEvidence = {
    version: "first_party_expected_absence_disposition_evidence_v1",
    runId: first.runId,
    siteId: first.siteId,
    canonicalOrigin: first.canonicalOrigin,
    executionPlanFingerprint: first.executionPlanFingerprint,
    sourceEventFingerprint: first.fingerprint,
    canonicalUrl: firstUrl,
    historicalAbsenceHttpStatus: 404,
    currentAbsenceHttpStatus: 404,
    freshInventoryFingerprint: raw.source.inventory.fingerprint,
    presentInFreshInventory: true,
    dispositionType: "sitemap_orphan_absence",
    dispositionFingerprint: hex("l10-22-blocked-disposition"),
  };
  const effective = buildExpectedAbsenceEffectiveCertification({
    rawCertification: raw.source.certification,
    terminalFailureEvents: [first, second],
    dispositions: [disposition],
  });
  assert.equal(effective.certification.status, "blocked");

  assert.throws(
    () => buildComparableCrawlHistorySource({
      source: raw.source,
      effectiveCertification: effective,
    }),
    /crawl_history_effective_certification_not_comparable/,
  );
});

test("L10.22 rejects effective certification bound to another raw lineage", () => {
  const source = expectedAbsenceFixture();
  const otherRaw = fixture([
    { canonicalUrl: "https://diamondshelf.us/different", kind: "success" },
    {
      canonicalUrl: "https://diamondshelf.us/missing",
      kind: "failure",
      signal: { kind: "http_status", httpStatus: 404 },
    },
  ]);

  assert.throws(
    () => buildComparableCrawlHistorySource({
      source: otherRaw.source,
      effectiveCertification: source.effective,
    }),
    /crawl_history_effective_certification_lineage_mismatch/,
  );
});

test("L10.22 keeps raw transition separate from effective comparable transition", () => {
  const before = expectedAbsenceFixture();
  const after = fixture([
    { canonicalUrl: "https://diamondshelf.us/ok", kind: "success" },
    { canonicalUrl: "https://diamondshelf.us/missing", kind: "success" },
  ]);

  const beforeComparable = buildComparableCrawlHistorySource({
    source: before.source,
    effectiveCertification: before.effective,
  });
  const afterComparable = buildComparableCrawlHistorySource({
    source: after.source,
  });

  const comparison = compareComparableCrawlHistory({
    before: beforeComparable,
    after: afterComparable,
  });

  assert.equal(
    comparison.rawComparison.certificationTransition.beforeCertified,
    false,
  );
  assert.equal(
    comparison.rawComparison.certificationTransition.afterCertified,
    true,
  );
  assert.equal(
    comparison.rawComparison.certificationTransition.changed,
    true,
  );

  assert.deepEqual(comparison.comparableCertificationTransition, {
    beforeCertified: true,
    afterCertified: true,
    changed: false,
    beforeMode: "expected_absence_effective",
    afterMode: "raw_completed",
    modeChanged: true,
    beforeRawWholeSiteCertified: false,
    afterRawWholeSiteCertified: true,
  });
  assert.equal(comparison.summary.rawCertificationChanged, true);
  assert.equal(comparison.summary.comparableCertificationChanged, false);
  assert.equal(comparison.summary.certificationModeChanged, true);
  assert.doesNotThrow(() =>
    assertEffectiveComparableCrawlHistoryComparisonIntegrity(comparison)
  );
});

test("L10.22 comparable source and comparison fingerprints are deterministic", () => {
  const before = expectedAbsenceFixture();
  const after = fixture([
    { canonicalUrl: "https://diamondshelf.us/ok", kind: "success" },
    { canonicalUrl: "https://diamondshelf.us/missing", kind: "success" },
  ]);

  const build = () => {
    const left = buildComparableCrawlHistorySource({
      source: before.source,
      effectiveCertification: before.effective,
    });
    const right = buildComparableCrawlHistorySource({
      source: after.source,
    });
    return {
      left,
      right,
      comparison: compareComparableCrawlHistory({
        before: left,
        after: right,
      }),
    };
  };

  const first = build();
  const second = build();
  assert.equal(first.left.fingerprint, second.left.fingerprint);
  assert.equal(first.right.fingerprint, second.right.fingerprint);
  assert.equal(
    first.comparison.fingerprint,
    second.comparison.fingerprint,
  );
});
