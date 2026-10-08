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
  type FullSiteCrawlCertification,
} from "./full-site-crawl-certification.js";
import {
  createTerminalFailureEvent,
  type TerminalFailureEvent,
} from "./first-party-crawl-terminal-recovery.js";
import {
  assertExpectedAbsenceEffectiveCertificationIntegrity,
  buildExpectedAbsenceEffectiveCertification,
  type ExpectedAbsenceDispositionEvidence,
} from "./full-site-crawl-expected-absence-certification.js";

const target = {
  targetClass: "first_party" as const,
  siteId: "diamond-shelf",
  canonicalOrigin: "https://diamondshelf.us" as const,
};

function hex(label: string): string {
  return createHash("sha256").update(label).digest("hex");
}

function fixture(urls: string[], outcomes: SuppliedCrawlUrlOutcome[]) {
  const plan = planFirstPartyCrawl(
    { mode: "full_site", target, hardPageLimit: 20 },
    { absolutePageCeiling: 1_000 },
  );
  const inventory = buildSitemapInventory({
    plan,
    rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
    documents: [{
      url: "https://diamondshelf.us/sitemap.xml",
      xml: "<urlset>" + urls.map((url) => `<url><loc>${url}</loc></url>`).join("") + "</urlset>",
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
  const rawCertification = buildFullSiteCrawlCertification({
    crawlPlan: plan,
    inventory,
    executionPlan,
    checkpoint: completed,
  });
  return { plan, inventory, executionPlan, initial, completed, rawCertification };
}

function terminalEvent(
  source: ReturnType<typeof fixture>,
  canonicalUrl: string,
  httpStatus: 404 | 410 = 404,
): TerminalFailureEvent {
  return createTerminalFailureEvent({
    eventType: "terminal_failure",
    runId: "l10-20-test-run",
    observedAt: "2026-10-08T10:00:00.000Z",
    siteId: target.siteId,
    canonicalOrigin: target.canonicalOrigin,
    executionPlanFingerprint: source.executionPlan.fingerprint,
    canonicalUrl,
    checkpointRevision: source.completed.sequence,
    checkpointFingerprint: source.completed.fingerprint,
    batchId: source.initial.activeBatchId!,
    attempt: source.initial.nextAttempt!,
    sourceEventFingerprint: null,
    outcome: {
      canonicalUrl,
      kind: "failure",
      signal: { kind: "http_status", httpStatus },
    },
    decisionReason: "permanent_http",
  });
}

function disposition(
  source: ReturnType<typeof fixture>,
  event: TerminalFailureEvent,
  overrides: Partial<ExpectedAbsenceDispositionEvidence> = {},
): ExpectedAbsenceDispositionEvidence {
  return {
    version: "first_party_expected_absence_disposition_evidence_v1",
    runId: event.runId,
    siteId: event.siteId,
    canonicalOrigin: event.canonicalOrigin,
    executionPlanFingerprint: source.executionPlan.fingerprint,
    sourceEventFingerprint: event.fingerprint,
    canonicalUrl: event.canonicalUrl,
    historicalAbsenceHttpStatus:
      event.outcome.kind === "failure" &&
      event.outcome.signal.kind === "http_status" &&
      event.outcome.signal.httpStatus === 410
        ? 410
        : 404,
    currentAbsenceHttpStatus: 404,
    freshInventoryFingerprint: source.inventory.fingerprint,
    presentInFreshInventory: true,
    dispositionType: "sitemap_orphan_absence",
    dispositionFingerprint: hex("disposition:" + event.fingerprint),
    ...overrides,
  };
}

test("L10.20 certifies one explicitly disposed permanent absence without rewriting raw certification", () => {
  const source = fixture(
    ["https://diamondshelf.us/a", "https://diamondshelf.us/missing"],
    [
      { canonicalUrl: "https://diamondshelf.us/a", kind: "success" },
      {
        canonicalUrl: "https://diamondshelf.us/missing",
        kind: "failure",
        signal: { kind: "http_status", httpStatus: 404 },
      },
    ],
  );
  const event = terminalEvent(source, "https://diamondshelf.us/missing");
  const rawBefore = structuredClone(source.rawCertification);

  assert.equal(source.rawCertification.ledger.failed, 1);
  assert.equal(source.rawCertification.certification.wholeSiteCertified, false);
  assert.deepEqual(
    source.rawCertification.certification.blockers,
    ["terminal_failures_present"],
  );

  const effective = buildExpectedAbsenceEffectiveCertification({
    rawCertification: source.rawCertification,
    terminalFailureEvents: [event],
    dispositions: [disposition(source, event)],
  });

  assert.deepEqual(source.rawCertification, rawBefore);
  assert.deepEqual(effective.accounting, {
    rawTerminalFailureCount: 1,
    expectedAbsenceCount: 1,
    effectiveUnresolvedTerminalFailureCount: 0,
  });
  assert.equal(effective.certification.legacyWholeSiteCertified, false);
  assert.equal(effective.certification.effectiveWholeSiteCertified, true);
  assert.equal(effective.certification.status, "certified_with_expected_absence");
  assert.deepEqual(effective.certification.blockers, []);
  assert.equal(
    effective.lineage.rawCertificationFingerprint,
    source.rawCertification.fingerprint,
  );
  assert.doesNotThrow(() =>
    assertExpectedAbsenceEffectiveCertificationIntegrity(effective)
  );
});

test("L10.20 keeps every undisposed terminal failure blocking", () => {
  const source = fixture(
    [
      "https://diamondshelf.us/a",
      "https://diamondshelf.us/missing-a",
      "https://diamondshelf.us/missing-b",
    ],
    [
      { canonicalUrl: "https://diamondshelf.us/a", kind: "success" },
      {
        canonicalUrl: "https://diamondshelf.us/missing-a",
        kind: "failure",
        signal: { kind: "http_status", httpStatus: 404 },
      },
      {
        canonicalUrl: "https://diamondshelf.us/missing-b",
        kind: "failure",
        signal: { kind: "http_status", httpStatus: 410 },
      },
    ],
  );
  const first = terminalEvent(source, "https://diamondshelf.us/missing-a", 404);
  const second = terminalEvent(source, "https://diamondshelf.us/missing-b", 410);

  const effective = buildExpectedAbsenceEffectiveCertification({
    rawCertification: source.rawCertification,
    terminalFailureEvents: [first, second],
    dispositions: [disposition(source, first)],
  });

  assert.deepEqual(effective.accounting, {
    rawTerminalFailureCount: 2,
    expectedAbsenceCount: 1,
    effectiveUnresolvedTerminalFailureCount: 1,
  });
  assert.equal(effective.certification.effectiveWholeSiteCertified, false);
  assert.equal(effective.certification.status, "blocked");
  assert.deepEqual(
    effective.certification.blockers,
    ["terminal_failures_present"],
  );
});

test("L10.21 permits mixed terminal failures while keeping undisposed non-absence failures blocking", () => {
  const source = fixture(
    [
      "https://diamondshelf.us/missing",
      "https://diamondshelf.us/server-error",
    ],
    [
      {
        canonicalUrl: "https://diamondshelf.us/missing",
        kind: "failure",
        signal: { kind: "http_status", httpStatus: 404 },
      },
      {
        canonicalUrl: "https://diamondshelf.us/server-error",
        kind: "failure",
        signal: { kind: "http_status", httpStatus: 500 },
      },
    ],
  );
  const disposed = terminalEvent(source, "https://diamondshelf.us/missing", 404);
  const unresolved = createTerminalFailureEvent({
    eventType: "terminal_failure",
    runId: "l10-20-test-run",
    observedAt: "2026-10-08T10:00:00.000Z",
    siteId: target.siteId,
    canonicalOrigin: target.canonicalOrigin,
    executionPlanFingerprint: source.executionPlan.fingerprint,
    canonicalUrl: "https://diamondshelf.us/server-error",
    checkpointRevision: source.completed.sequence,
    checkpointFingerprint: source.completed.fingerprint,
    batchId: source.initial.activeBatchId!,
    attempt: source.initial.nextAttempt!,
    sourceEventFingerprint: null,
    outcome: {
      canonicalUrl: "https://diamondshelf.us/server-error",
      kind: "failure",
      signal: { kind: "http_status", httpStatus: 500 },
    },
    decisionReason: "attempts_exhausted",
  });

  const effective = buildExpectedAbsenceEffectiveCertification({
    rawCertification: source.rawCertification,
    terminalFailureEvents: [disposed, unresolved],
    dispositions: [disposition(source, disposed)],
  });

  assert.deepEqual(effective.accounting, {
    rawTerminalFailureCount: 2,
    expectedAbsenceCount: 1,
    effectiveUnresolvedTerminalFailureCount: 1,
  });
  assert.equal(effective.certification.status, "blocked");
  assert.deepEqual(
    effective.certification.blockers,
    ["terminal_failures_present"],
  );
});

test("L10.20 rejects duplicate dispositions for one terminal event", () => {
  const source = fixture(
    ["https://diamondshelf.us/missing"],
    [{
      canonicalUrl: "https://diamondshelf.us/missing",
      kind: "failure",
      signal: { kind: "http_status", httpStatus: 404 },
    }],
  );
  const event = terminalEvent(source, "https://diamondshelf.us/missing");
  const first = disposition(source, event);
  const second = disposition(source, event, {
    dispositionFingerprint: hex("second-disposition"),
  });

  assert.throws(
    () => buildExpectedAbsenceEffectiveCertification({
      rawCertification: source.rawCertification,
      terminalFailureEvents: [event],
      dispositions: [first, second],
    }),
    /expected_absence_disposition_count_exceeds_failures|expected_absence_disposition_duplicate/,
  );
});

test("L10.20 rejects wrong URL or source-event lineage", () => {
  const source = fixture(
    ["https://diamondshelf.us/missing"],
    [{
      canonicalUrl: "https://diamondshelf.us/missing",
      kind: "failure",
      signal: { kind: "http_status", httpStatus: 404 },
    }],
  );
  const event = terminalEvent(source, "https://diamondshelf.us/missing");

  assert.throws(
    () => buildExpectedAbsenceEffectiveCertification({
      rawCertification: source.rawCertification,
      terminalFailureEvents: [event],
      dispositions: [disposition(source, event, {
        canonicalUrl: "https://diamondshelf.us/other",
      })],
    }),
    /expected_absence_disposition_lineage_mismatch/,
  );

  assert.throws(
    () => buildExpectedAbsenceEffectiveCertification({
      rawCertification: source.rawCertification,
      terminalFailureEvents: [event],
      dispositions: [disposition(source, event, {
        sourceEventFingerprint: hex("wrong-source"),
      })],
    }),
    /expected_absence_disposition_source_event_missing/,
  );
});

test("L10.20 enforces 404/410 and stale-vs-orphan presence semantics", () => {
  const source = fixture(
    ["https://diamondshelf.us/missing"],
    [{
      canonicalUrl: "https://diamondshelf.us/missing",
      kind: "failure",
      signal: { kind: "http_status", httpStatus: 404 },
    }],
  );
  const event = terminalEvent(source, "https://diamondshelf.us/missing");

  assert.throws(
    () => buildExpectedAbsenceEffectiveCertification({
      rawCertification: source.rawCertification,
      terminalFailureEvents: [event],
      dispositions: [disposition(source, event, {
        dispositionType: "stale_inventory_absence",
        presentInFreshInventory: true,
      })],
    }),
    /expected_absence_disposition_semantics_invalid/,
  );

  const invalidStatus = disposition(source, event);
  (invalidStatus as unknown as { currentAbsenceHttpStatus: number })
    .currentAbsenceHttpStatus = 500;
  assert.throws(
    () => buildExpectedAbsenceEffectiveCertification({
      rawCertification: source.rawCertification,
      terminalFailureEvents: [event],
      dispositions: [invalidStatus as ExpectedAbsenceDispositionEvidence],
    }),
    /expected_absence_disposition_http_status_mismatch/,
  );
});

test("L10.20 rejects non-permanent or non-404/410 source failures", () => {
  const source = fixture(
    ["https://diamondshelf.us/missing"],
    [{
      canonicalUrl: "https://diamondshelf.us/missing",
      kind: "failure",
      signal: { kind: "http_status", httpStatus: 500 },
    }],
  );
  const event = createTerminalFailureEvent({
    eventType: "terminal_failure",
    runId: "l10-20-test-run",
    observedAt: "2026-10-08T10:00:00.000Z",
    siteId: target.siteId,
    canonicalOrigin: target.canonicalOrigin,
    executionPlanFingerprint: source.executionPlan.fingerprint,
    canonicalUrl: "https://diamondshelf.us/missing",
    checkpointRevision: source.completed.sequence,
    checkpointFingerprint: source.completed.fingerprint,
    batchId: source.initial.activeBatchId!,
    attempt: source.initial.nextAttempt!,
    sourceEventFingerprint: null,
    outcome: {
      canonicalUrl: "https://diamondshelf.us/missing",
      kind: "failure",
      signal: { kind: "http_status", httpStatus: 500 },
    },
    decisionReason: "attempts_exhausted",
  });

  assert.throws(
    () => buildExpectedAbsenceEffectiveCertification({
      rawCertification: source.rawCertification,
      terminalFailureEvents: [event],
      dispositions: [disposition(source, event)],
    }),
    /expected_absence_terminal_event_not_permanent_http/,
  );
});
