import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildIncrementalRecrawlPlan } from "./incremental-recrawl-planner.js";
import { compareFullSiteCrawlHistory } from "./crawl-history-comparison.js";
import { buildComparableCrawlHistorySource } from "./crawl-history-effective-baseline.js";
import {
  buildExpectedAbsenceEffectiveCertification,
  type ExpectedAbsenceDispositionEvidence,
} from "./full-site-crawl-expected-absence-certification.js";
import {
  DIAMOND_SHELF_CANONICAL_ORIGIN,
  firstPartyCrawlBridgeReadiness,
  RobotsPolicyEvaluationError,
  runBoundedPilotCrawlBridge,
  runFullSiteCrawlBridge,
  runFullSiteCrawlBridgeAccountingAware,
  runFullSiteCrawlBridgeUntilCheckpoint,
  runIncrementalCrawlBridge,
  runTerminalFailureRecoveryBridge,
  type ComparableHistoryBaselinePersistenceRecord,
  type CrawlCheckpointPersistenceRecord,
  type FirstPartyCrawlBridgeOptions,
  type FullSiteCrawlBridgeSnapshot,
  type IncrementalCrawlBridgeReceipt,
  type PageTransportResult,
  type TerminalFailureRecoveryPersistenceTransition,
} from "./first-party-crawl-runtime-bridge.js";
import type { FullSiteCrawlCheckpoint, FullSiteExecutionPolicy } from "./full-site-crawl-control.js";
import type {
  TerminalFailureEvent,
  TerminalFailureRecoveryReceipt,
} from "./first-party-crawl-terminal-recovery.js";
import type { SitemapInventoryPolicy, SuppliedSitemapDocument } from "./sitemap-inventory.js";

const OBSERVED_AT = "2026-09-22T00:00:00.000Z";

function sitemapPolicy(maxInventoryUrls = 20): SitemapInventoryPolicy {
  return {
    maxDocuments: 10,
    maxDepth: 3,
    maxDocumentBytes: 1_000_000,
    maxInventoryUrls,
    maxPathSegments: 20,
  };
}

function executionPolicy(): FullSiteExecutionPolicy {
  return {
    batchSize: 2,
    concurrency: 1,
    requestsPerMinute: 120,
    requestTimeoutMs: 5_000,
    maxRedirectsPerRequest: 3,
    maxAttemptsPerUrl: 3,
    retryBaseDelayMs: 10,
    retryMaxDelayMs: 20,
    maxUrlLength: 2_048,
    maxPathSegments: 20,
    maxRepeatedPathSegmentRun: 3,
  };
}

function urlset(entries: Array<{ path: string; lastmod?: string }>): string {
  return `<urlset>${entries.map((entry) =>
    `<url><loc>${DIAMOND_SHELF_CANONICAL_ORIGIN}${entry.path}</loc>${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ""}</url>`
  ).join("")}</urlset>`;
}

class MemoryPersistence {
  checkpoints = new Map<string, FullSiteCrawlCheckpoint>();
  comparableBaseline: ComparableHistoryBaselinePersistenceRecord | null = null;
  completed: FullSiteCrawlBridgeSnapshot[] = [];
  accounting: FullSiteCrawlBridgeSnapshot[] = [];
  terminalEvents: TerminalFailureEvent[] = [];
  recoveryReceipts: TerminalFailureRecoveryReceipt[] = [];
  incremental: IncrementalCrawlBridgeReceipt[] = [];
  checkpointWrites: CrawlCheckpointPersistenceRecord[] = [];

  async loadCheckpoint(input: { runId: string }) {
    return this.checkpoints.get(input.runId) ?? null;
  }

  async saveCheckpoint(record: CrawlCheckpointPersistenceRecord) {
    this.checkpointWrites.push(structuredClone(record));
    this.checkpoints.set(record.runId, structuredClone(record.checkpoint));
    for (const event of record.terminalFailureEvents) {
      const existing = this.terminalEvents.find((item) => item.fingerprint === event.fingerprint);
      if (existing) {
        assert.deepEqual(existing, event);
        continue;
      }
      if (
        event.sourceEventFingerprint &&
        this.terminalEvents.some((item) => item.sourceEventFingerprint === event.sourceEventFingerprint)
      ) {
        throw new Error("p12_2_persistence_terminal_failure_source_consumed");
      }
      this.terminalEvents.push(structuredClone(event));
    }
  }

  async loadLatestCompleted() {
    return this.completed.at(-1) ? structuredClone(this.completed.at(-1)!) : null;
  }

  async loadLatestComparableHistoryBaseline() {
    if (this.comparableBaseline) return structuredClone(this.comparableBaseline);
    const latest = this.completed.at(-1);
    if (!latest) return null;
    return structuredClone({
      version: "first_party_crawl_durable_comparable_baseline_v1" as const,
      snapshot: latest,
      comparableSource: buildComparableCrawlHistorySource({
        source: { inventory: latest.inventory, certification: latest.certification },
      }),
      mode: "raw_completed" as const,
      reconciliationReceiptFingerprint: null,
    });
  }

  async loadLatestAccounting(input: { runId: string; executionPlanFingerprint: string }) {
    const found = [...this.accounting].reverse().find((item) =>
      item.runId === input.runId &&
      item.executionPlan.fingerprint === input.executionPlanFingerprint
    );
    return found ? structuredClone(found) : null;
  }

  async loadUnresolvedTerminalFailures(input: { runId: string; executionPlanFingerprint: string }) {
    const consumed = new Set(
      this.terminalEvents
        .map((event) => event.sourceEventFingerprint)
        .filter((value): value is string => typeof value === "string"),
    );
    return this.terminalEvents
      .filter((event) =>
        event.runId === input.runId &&
        event.executionPlanFingerprint === input.executionPlanFingerprint &&
        ["terminal_failure", "recovery_failure"].includes(event.eventType) &&
        !consumed.has(event.fingerprint)
      )
      .sort((a, b) => a.canonicalUrl.localeCompare(b.canonicalUrl))
      .map((event) => structuredClone(event));
  }

  async saveAccountingRun(snapshot: FullSiteCrawlBridgeSnapshot) {
    const existing = this.accounting.find((item) =>
      item.runId === snapshot.runId &&
      item.executionPlan.fingerprint === snapshot.executionPlan.fingerprint &&
      item.checkpoint.fingerprint === snapshot.checkpoint.fingerprint
    );
    if (existing) {
      assert.deepEqual(existing, snapshot);
      return;
    }
    this.accounting.push(structuredClone(snapshot));
  }

  async saveCompletedRun(snapshot: FullSiteCrawlBridgeSnapshot) {
    this.completed.push(structuredClone(snapshot));
  }

  async saveRecoveryReceipt(receipt: TerminalFailureRecoveryReceipt) {
    const existing = this.recoveryReceipts.find(
      (item) => item.recoveryPlanFingerprint === receipt.recoveryPlanFingerprint,
    );
    if (existing) {
      assert.deepEqual(existing, receipt);
      return;
    }
    this.recoveryReceipts.push(structuredClone(receipt));
  }

  async saveRecoveryTransition(transition: TerminalFailureRecoveryPersistenceTransition) {
    const current = this.checkpoints.get(transition.checkpointRecord.runId);
    if (!current || current.fingerprint !== transition.sourceCheckpointFingerprint) {
      throw new Error("p12_2_persistence_recovery_source_checkpoint_stale");
    }
    const stagedEvents = structuredClone(transition.checkpointRecord.terminalFailureEvents);
    for (const event of stagedEvents) {
      if (
        event.sourceEventFingerprint &&
        this.terminalEvents.some((item) => item.sourceEventFingerprint === event.sourceEventFingerprint)
      ) {
        throw new Error("p12_2_persistence_terminal_failure_source_consumed");
      }
      const source = event.sourceEventFingerprint
        ? this.terminalEvents.find((item) => item.fingerprint === event.sourceEventFingerprint)
        : null;
      if (event.sourceEventFingerprint && (!source || source.canonicalUrl !== event.canonicalUrl)) {
        throw new Error("p12_2_persistence_terminal_failure_source_missing");
      }
    }

    this.checkpointWrites.push(structuredClone(transition.checkpointRecord));
    this.checkpoints.set(
      transition.checkpointRecord.runId,
      structuredClone(transition.checkpointRecord.checkpoint),
    );
    this.terminalEvents.push(...stagedEvents);

    await this.saveAccountingRun(transition.accountingSnapshot);
    if (transition.completedRunPersisted) {
      this.completed.push(structuredClone(transition.accountingSnapshot));
    }
    await this.saveRecoveryReceipt(transition.recoveryReceipt);
  }

  async saveIncrementalRun(receipt: IncrementalCrawlBridgeReceipt) {
    this.incremental.push(structuredClone(receipt));
  }
}

function harness(input?: {
  documents?: SuppliedSitemapDocument[];
  robotsDenied?: Set<string>;
  pageResults?: Map<string, PageTransportResult[]>;
}) {
  const persistence = new MemoryPersistence();
  const documents = input?.documents ?? [{
    url: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/sitemap.xml`,
    xml: urlset([{ path: "/a" }]),
  }];
  const robotsDenied = input?.robotsDenied ?? new Set<string>();
  const pageResults = input?.pageResults ?? new Map<string, PageTransportResult[]>();
  const calls = {
    sitemap: 0,
    robots: [] as string[],
    pages: [] as string[],
    sleeps: [] as number[],
  };

  const options: FirstPartyCrawlBridgeOptions = {
    sitemapAcquirer: {
      async load(request) {
        calls.sitemap += 1;
        assert.equal(request.canonicalOrigin, DIAMOND_SHELF_CANONICAL_ORIGIN);
        assert.equal(request.sameOriginOnly, true);
        assert.equal(request.httpsOnly, true);
        assert.equal(request.queryAllowed, false);
        assert.equal(request.fragmentAllowed, false);
        return structuredClone(documents);
      },
    },
    robotsEvaluator: {
      async evaluate(request) {
        calls.robots.push(request.canonicalUrl);
        return { allowed: !robotsDenied.has(request.canonicalUrl) };
      },
    },
    pageTransport: {
      async get(request) {
        calls.pages.push(request.canonicalUrl);
        assert.equal(request.method, "GET");
        assert.equal(request.followRedirects, false);
        assert.equal(request.responseBodyPersistence, false);
        const queue = pageResults.get(request.canonicalUrl);
        if (queue?.length) return queue.shift()!;
        return { kind: "success" };
      },
    },
    clock: {
      async sleep(milliseconds) {
        calls.sleeps.push(milliseconds);
      },
    },
    persistence,
    networkReady: true,
    liveExecutionAuthorized: true,
    persistenceReady: true,
    persistenceAuthorized: true,
  };

  return { options, persistence, documents, calls };
}

function fullInput(runId: string, overrides?: Partial<Parameters<typeof runFullSiteCrawlBridge>[0]>) {
  return {
    runId,
    observedAt: OBSERVED_AT,
    binding: {
      siteId: "diamond-shelf-primary",
      canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
      rootSitemapUrl: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/sitemap.xml`,
    },
    hardPageLimit: 20,
    absolutePageCeiling: 25_000,
    sitemapPolicy: sitemapPolicy(),
    executionPolicy: executionPolicy(),
    ...overrides,
  };
}

test("P12.2 bridge is default-off and advertises no bundled network/database/scheduler/write authority", () => {
  const readiness = firstPartyCrawlBridgeReadiness();
  assert.deepEqual(readiness, {
    version: "p12-2-first-party-crawl-bridge-v1",
    target: "diamond_shelf_first_party",
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    configured: false,
    networkReady: false,
    liveExecutionAuthorized: false,
    persistenceReady: false,
    persistenceAuthorized: false,
    firstPartyReadOnly: true,
    injectedTransportOnly: true,
    injectedPersistenceOnly: true,
    directNetworkClientBundled: false,
    directDatabaseClientBundled: false,
    responseBodyPersistence: false,
    rawSitemapXmlPersistence: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    deploymentAuthorized: false,
    publicationAuthorized: false,
  });
});

test("full-site bridge preserves P2 robots/noindex/redirect accounting and persists lineage without raw content", async () => {
  const documents = [{
    url: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/sitemap.xml`,
    xml: urlset([
      { path: "/a" },
      { path: "/b" },
      { path: "/c" },
    ]),
  }];
  const robotsDenied = new Set([`${DIAMOND_SHELF_CANONICAL_ORIGIN}/b`]);
  const pageResults = new Map<string, PageTransportResult[]>([
    [`${DIAMOND_SHELF_CANONICAL_ORIGIN}/a`, [{ kind: "success", noindex: true }]],
    [`${DIAMOND_SHELF_CANONICAL_ORIGIN}/c`, [{
      kind: "redirect",
      redirectTarget: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/a`,
      redirectCount: 1,
    }]],
  ]);
  const { options, persistence, calls } = harness({ documents, robotsDenied, pageResults });

  const result = await runFullSiteCrawlBridge(fullInput("full-001"), options);

  assert.equal(result.certification.certification.wholeSiteCertified, true);
  assert.equal(result.certification.ledger.eligible, 3);
  assert.equal(result.certification.ledger.fetchedSuccessful, 1);
  assert.equal(result.certification.ledger.noindex, 1);
  assert.equal(result.certification.ledger.redirects, 1);
  assert.equal(result.certification.ledger.robotsExcluded, 1);
  assert.equal(result.certification.ledger.failed, 0);
  assert.equal(result.certification.ledger.coveragePercent, 100);
  assert.equal(result.persistence.rawResponseBodyPersisted, false);
  assert.equal(result.persistence.rawSitemapXmlPersisted, false);
  assert.equal(result.persistence.pageContentPersisted, false);
  assert.equal(calls.pages.length, 2);
  assert.deepEqual(calls.pages, [
    `${DIAMOND_SHELF_CANONICAL_ORIGIN}/a`,
    `${DIAMOND_SHELF_CANONICAL_ORIGIN}/c`,
  ]);
  assert.ok(calls.sleeps.includes(500));
  assert.ok(persistence.checkpointWrites.length >= 2);
  assert.equal(persistence.completed.length, 1);
});

test("bounded pilot executes only the explicitly truncated inventory and never claims whole-site completion", async () => {
  const documents = [{
    url: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/sitemap.xml`,
    xml: urlset([
      { path: "/a" },
      { path: "/b" },
      { path: "/c" },
    ]),
  }];
  const state = harness({ documents });

  await assert.rejects(
    runFullSiteCrawlBridge(fullInput("pilot-full-site-rejected", {
      hardPageLimit: 2,
      sitemapPolicy: sitemapPolicy(2),
    }), state.options),
    /crawl_execution_complete_inventory_required/,
  );
  assert.equal(state.calls.pages.length, 0);

  const pilot = await runBoundedPilotCrawlBridge(fullInput("pilot-001", {
    hardPageLimit: 2,
    sitemapPolicy: sitemapPolicy(2),
  }), state.options);

  assert.equal(pilot.status, "bounded_pilot_completed");
  assert.equal(pilot.selectedUrls, 2);
  assert.equal(pilot.inventoryTruncated, true);
  assert.deepEqual(pilot.truncationReasons, ["inventory_url_limit_reached"]);
  assert.equal(pilot.wholeSiteCertified, false);
  assert.equal(pilot.persistence.completedRunPersisted, false);
  assert.equal(state.persistence.completed.length, 0);
  assert.deepEqual(state.calls.pages, [
    `${DIAMOND_SHELF_CANONICAL_ORIGIN}/a`,
    `${DIAMOND_SHELF_CANONICAL_ORIGIN}/b`,
  ]);
  assert.match(pilot.fingerprint, /^[a-f0-9]{64}$/);
});

test("bounded pilot attributes terminal failures without persisting page content", async () => {
  const documents = [{
    url: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/sitemap.xml`,
    xml: urlset([
      { path: "/policy" },
      { path: "/404" },
      { path: "/timeout" },
      { path: "/503" },
    ]),
  }];
  const policyUrl = `${DIAMOND_SHELF_CANONICAL_ORIGIN}/policy`;
  const notFoundUrl = `${DIAMOND_SHELF_CANONICAL_ORIGIN}/404`;
  const timeoutUrl = `${DIAMOND_SHELF_CANONICAL_ORIGIN}/timeout`;
  const unavailableUrl = `${DIAMOND_SHELF_CANONICAL_ORIGIN}/503`;
  const pageResults = new Map<string, PageTransportResult[]>([
    [policyUrl, [{ kind: "failure", signal: { kind: "policy_rejection" } }]],
    [notFoundUrl, [{ kind: "failure", signal: { kind: "http_status", httpStatus: 404 } }]],
    [timeoutUrl, [
      { kind: "failure", signal: { kind: "network_timeout" } },
      { kind: "failure", signal: { kind: "network_timeout" } },
      { kind: "failure", signal: { kind: "network_timeout" } },
    ]],
    [unavailableUrl, [
      { kind: "failure", signal: { kind: "http_status", httpStatus: 503 } },
      { kind: "failure", signal: { kind: "http_status", httpStatus: 503 } },
      { kind: "failure", signal: { kind: "http_status", httpStatus: 503 } },
    ]],
  ]);
  const state = harness({ documents, pageResults });

  const pilot = await runBoundedPilotCrawlBridge(fullInput("pilot-failure-attribution", {
    hardPageLimit: 3,
    sitemapPolicy: sitemapPolicy(3),
  }), state.options);

  assert.equal(pilot.status, "bounded_pilot_completed");
  assert.equal(pilot.summary.failures, 3);
  assert.equal(pilot.failureAttribution.terminalFailures, 3);
  const categories =
    pilot.failureAttribution.policyRejections +
    pilot.failureAttribution.permanentHttp.reduce((sum, item) => sum + item.count, 0) +
    pilot.failureAttribution.attemptsExhausted.networkTimeout +
    pilot.failureAttribution.attemptsExhausted.connectionReset +
    pilot.failureAttribution.attemptsExhausted.transportUnavailable +
    pilot.failureAttribution.attemptsExhausted.http.reduce((sum, item) => sum + item.count, 0);
  assert.equal(categories, pilot.summary.failures);
  assert.equal(pilot.persistence.rawResponseBodyPersisted, false);
  assert.equal(pilot.persistence.pageContentPersisted, false);
});

test("bounded pilot separates robots policy rejection reasons from other policy rejections", async () => {
  const robotsUrl = `${DIAMOND_SHELF_CANONICAL_ORIGIN}/robots-policy`;
  const pageUrl = `${DIAMOND_SHELF_CANONICAL_ORIGIN}/page-policy`;
  const documents = [{
    url: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/sitemap.xml`,
    xml: urlset([{ path: "/robots-policy" }, { path: "/page-policy" }, { path: "/z-extra" }]),
  }];
  const pageResults = new Map<string, PageTransportResult[]>([
    [pageUrl, [{
      kind: "failure",
      signal: { kind: "policy_rejection" },
      policyRejectionReason: "response_oversize",
    }]],
  ]);
  const state = harness({ documents, pageResults });
  state.options.robotsEvaluator = {
    async evaluate(request) {
      if (request.canonicalUrl === robotsUrl) {
        throw new RobotsPolicyEvaluationError("http_unavailable", "p12_2_live_robots_unavailable");
      }
      return { allowed: true };
    },
  };

  const pilot = await runBoundedPilotCrawlBridge(fullInput("pilot-robots-attribution", {
    hardPageLimit: 2,
    sitemapPolicy: sitemapPolicy(2),
  }), state.options);

  assert.equal(pilot.summary.failures, 2);
  assert.equal(pilot.failureAttribution.policyRejections, 2);
  assert.deepEqual(pilot.failureAttribution.robotsPolicyRejections, {
    total: 1,
    reasons: [{ reason: "http_unavailable", count: 1 }],
  });
  assert.equal(pilot.failureAttribution.otherPolicyRejections, 1);
  assert.deepEqual(pilot.failureAttribution.otherPolicyRejectionReasons, [
    { reason: "response_oversize", count: 1 },
  ]);
  assert.equal(
    pilot.failureAttribution.robotsPolicyRejections.total +
      pilot.failureAttribution.otherPolicyRejections,
    pilot.failureAttribution.policyRejections,
  );
});

test("retryable transport failure resumes through the exact P2 checkpoint attempt sequence", async () => {
  const url = `${DIAMOND_SHELF_CANONICAL_ORIGIN}/a`;
  const pageResults = new Map<string, PageTransportResult[]>([
    [url, [
      { kind: "failure", signal: { kind: "network_timeout" } },
      { kind: "success" },
    ]],
  ]);
  const { options, persistence, calls } = harness({ pageResults });

  const result = await runFullSiteCrawlBridge(fullInput("retry-001"), options);

  assert.equal(result.certification.certification.wholeSiteCertified, true);
  assert.equal(result.checkpoint.counters.attemptsRecorded, 2);
  assert.equal(result.checkpoint.counters.retryScheduled, 1);
  assert.equal(result.checkpoint.counters.fetchedSuccessful, 1);
  assert.deepEqual(calls.pages, [url, url]);
  assert.ok(calls.sleeps.includes(10));
  assert.ok(calls.sleeps.includes(500));
  assert.ok(persistence.checkpointWrites.some((record) => record.checkpoint.nextAttempt === 2));
});

test("closed readiness gates stop before sitemap/network/persistence adapter activity", async () => {
  const { options, calls, persistence } = harness();
  const closed = { ...options, networkReady: false };

  await assert.rejects(
    runFullSiteCrawlBridge(fullInput("closed-001"), closed),
    /crawl_bridge_network_not_ready/,
  );
  assert.equal(calls.sitemap, 0);
  assert.equal(calls.pages.length, 0);
  assert.equal(persistence.checkpointWrites.length, 0);

  await assert.rejects(
    runFullSiteCrawlBridge(fullInput("closed-002"), { ...options, liveExecutionAuthorized: false }),
    /crawl_bridge_execution_not_authorized/,
  );
  await assert.rejects(
    runFullSiteCrawlBridge(fullInput("closed-003"), { ...options, persistenceAuthorized: false }),
    /crawl_bridge_persistence_not_authorized/,
  );
});

test("Diamond Shelf identity, sitemap origin and redirect target fail closed", async () => {
  const base = harness();

  await assert.rejects(
    runFullSiteCrawlBridge(fullInput("origin-001", {
      binding: {
        siteId: "diamond-shelf-primary",
        canonicalOrigin: "https://example.com",
        rootSitemapUrl: "https://example.com/sitemap.xml",
      },
    }), base.options),
    /crawl_bridge_diamond_shelf_origin_required/,
  );

  const badSitemap = harness({
    documents: [{
      url: "https://example.com/sitemap.xml",
      xml: "<urlset></urlset>",
    }],
  });
  await assert.rejects(
    runFullSiteCrawlBridge(fullInput("origin-002"), badSitemap.options),
    /sitemap_document_url_cross_origin/,
  );

  const badRedirect = harness({
    pageResults: new Map([[
      `${DIAMOND_SHELF_CANONICAL_ORIGIN}/a`,
      [{ kind: "redirect", redirectTarget: "https://example.com/a", redirectCount: 1 }],
    ]]),
  });
  await assert.rejects(
    runFullSiteCrawlBridge(fullInput("origin-003"), badRedirect.options),
    /crawl_bridge_redirect_target_rejected:cross_origin/,
  );
});

test("L10.11 resumes a pending checkpoint when only sitemap lastmod metadata changed", async () => {
  const state = harness({
    documents: [{
      url: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/sitemap.xml`,
      xml: urlset([
        { path: "/a", lastmod: "2026-10-01" },
        { path: "/b", lastmod: "2026-10-01" },
        { path: "/c", lastmod: "2026-10-01" },
      ]),
    }],
  });
  const runId = "l10-11-lastmod-resume";

  const interrupted = await runFullSiteCrawlBridgeUntilCheckpoint(
    fullInput(runId),
    1,
    state.options,
  );
  assert.equal(interrupted.status, "intentional_interruption");
  assert.equal(interrupted.checkpointRevision, 1);

  const checkpoint = state.persistence.checkpoints.get(runId);
  assert.ok(checkpoint);
  assert.equal(checkpoint!.status, "pending");
  assert.equal(checkpoint!.progress.finalizedUrls, 2);
  const originalInventoryFingerprint = checkpoint!.inventoryFingerprint;
  const callsBeforeResume = state.calls.pages.length;

  state.documents[0]!.xml = urlset([
    { path: "/a", lastmod: "2026-10-05" },
    { path: "/b", lastmod: "2026-10-04" },
    { path: "/c", lastmod: "2026-10-03" },
  ]);

  const resumed = await runFullSiteCrawlBridge(
    fullInput(runId, { resumeCheckpoint: checkpoint! }),
    state.options,
  );

  assert.equal(resumed.certification.certification.wholeSiteCertified, true);
  assert.equal(resumed.checkpoint.status, "completed");
  assert.equal(resumed.executionPlan.source.inventoryFingerprint, originalInventoryFingerprint);
  assert.equal(resumed.executionPlan.fingerprint, checkpoint!.planFingerprint);
  assert.deepEqual(
    state.calls.pages.slice(callsBeforeResume),
    [`${DIAMOND_SHELF_CANONICAL_ORIGIN}/c`],
  );
});

test("stored checkpoint is fail-closed when rebuilt inventory/execution lineage changes", async () => {
  const firstHarness = harness();
  const first = await runFullSiteCrawlBridge(fullInput("resume-source"), firstHarness.options);
  const stale = first.checkpoint;

  const changedDocuments = [{
    url: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/sitemap.xml`,
    xml: urlset([{ path: "/a" }, { path: "/new" }]),
  }];
  const secondHarness = harness({ documents: changedDocuments });

  await assert.rejects(
    runFullSiteCrawlBridge(fullInput("resume-target", { resumeCheckpoint: stale }), secondHarness.options),
    /crawl_checkpoint_lineage_mismatch/,
  );
  assert.equal(secondHarness.calls.pages.length, 0);
});

test("repeat crawl produces P2.5 comparison and the same bridge executes the derived P2.6 incremental handoff", async () => {
  const state = harness();
  state.documents[0]!.xml = urlset([{ path: "/a", lastmod: "2026-09-01" }]);

  const first = await runFullSiteCrawlBridge(fullInput("repeat-001"), state.options);
  assert.equal(first.comparisonToPrevious, null);

  state.documents[0]!.xml = urlset([
    { path: "/a", lastmod: "2026-09-10" },
    { path: "/b", lastmod: "2026-09-11" },
  ]);
  const second = await runFullSiteCrawlBridge(fullInput("repeat-002"), state.options);
  assert.ok(second.comparisonToPrevious);
  assert.equal(second.comparisonToPrevious!.summary.inventoryMembershipChanged, true);
  assert.equal(second.comparisonToPrevious!.summary.sitemapLastmodChanged, true);

  const before = { inventory: first.inventory, certification: first.certification };
  const after = { inventory: second.inventory, certification: second.certification };
  const comparison = compareFullSiteCrawlHistory({ before, after });
  const incrementalPlan = buildIncrementalRecrawlPlan({
    comparison,
    before,
    after,
    policy: { maxPlanUrls: 10, batchSize: 2 },
  });
  assert.equal(incrementalPlan.accounting.selectedUrls, 2);

  const receipt = await runIncrementalCrawlBridge({
    runId: "incremental-001",
    observedAt: OBSERVED_AT,
    plan: incrementalPlan,
    currentExecutionPlan: second.executionPlan,
  }, state.options);

  assert.equal(receipt.selectedUrls, 2);
  assert.equal(receipt.summary.fetchedSuccessful, 2);
  assert.equal(receipt.summary.failures, 0);
  assert.equal(receipt.persistence.rawResponseBodyPersisted, false);
  assert.equal(state.persistence.incremental.length, 1);
});

test("incremental bridge preserves P2 retry limits and robots exclusions", async () => {
  const state = harness();
  state.documents[0]!.xml = urlset([{ path: "/a", lastmod: "2026-09-01" }]);
  const first = await runFullSiteCrawlBridge(fullInput("inc-base-001"), state.options);

  state.documents[0]!.xml = urlset([
    { path: "/a", lastmod: "2026-09-10" },
    { path: "/b", lastmod: "2026-09-11" },
  ]);
  const second = await runFullSiteCrawlBridge(fullInput("inc-base-002"), state.options);
  const before = { inventory: first.inventory, certification: first.certification };
  const after = { inventory: second.inventory, certification: second.certification };
  const comparison = compareFullSiteCrawlHistory({ before, after });
  const plan = buildIncrementalRecrawlPlan({
    comparison,
    before,
    after,
    policy: { maxPlanUrls: 10, batchSize: 2 },
  });

  const retryUrl = `${DIAMOND_SHELF_CANONICAL_ORIGIN}/a`;
  const robotsUrl = `${DIAMOND_SHELF_CANONICAL_ORIGIN}/b`;
  state.options.robotsEvaluator = {
    async evaluate(request) {
      return { allowed: request.canonicalUrl !== robotsUrl };
    },
  };
  let incrementalRetryAttempts = 0;
  state.options.pageTransport = {
    async get(request) {
      if (request.canonicalUrl !== retryUrl) return { kind: "success" };
      incrementalRetryAttempts += 1;
      return incrementalRetryAttempts < 3
        ? { kind: "failure", signal: { kind: "http_status", httpStatus: 503 } }
        : { kind: "success" };
    },
  };

  const receipt = await runIncrementalCrawlBridge({
    runId: "incremental-retry-001",
    observedAt: OBSERVED_AT,
    plan,
    currentExecutionPlan: second.executionPlan,
  }, state.options);

  const retryReceipt = receipt.urlReceipts.find((item) => item.canonicalUrl === retryUrl)!;
  const robotsReceipt = receipt.urlReceipts.find((item) => item.canonicalUrl === robotsUrl)!;
  assert.equal(retryReceipt.attempts, 3);
  assert.equal(retryReceipt.outcome.kind, "success");
  assert.equal(robotsReceipt.attempts, 1);
  assert.equal(robotsReceipt.outcome.kind, "robots_excluded");
  assert.equal(receipt.summary.robotsExcluded, 1);
});

test("source contract contains no direct network/database/timer/scheduler implementation", () => {
  const source = readFileSync(
    new URL("./first-party-crawl-runtime-bridge.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /from\s+["']node:(?:http|https|net|tls)["']/);
  assert.doesNotMatch(source, /from\s+["'](?:postgres|drizzle-orm)["']/);
  assert.doesNotMatch(source, /\bglobalThis\.fetch\b|\bfetch\s*\(/);
  assert.doesNotMatch(source, /\bsetInterval\s*\(|\bsetTimeout\s*\(/);
  assert.match(source, /directNetworkClientBundled:\s*false/);
  assert.match(source, /directDatabaseClientBundled:\s*false/);
  assert.match(source, /schedulerEnabled:\s*false/);
  assert.match(source, /autonomousWorkerEnabled:\s*false/);
  assert.match(source, /providerWrites:\s*false/);
  assert.match(source, /publicSiteWrites:\s*false/);
});


test("intentional interruption stops only after the exact checkpoint revision is durably persisted", async () => {
  const documents = [{
    url: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/sitemap.xml`,
    xml: urlset([
      { path: "/a" },
      { path: "/b" },
      { path: "/c" },
    ]),
  }];
  const state = harness({ documents });

  const receipt = await runFullSiteCrawlBridgeUntilCheckpoint(
    fullInput("interrupt-001"),
    1,
    state.options,
  );

  assert.equal(receipt.status, "intentional_interruption");
  assert.equal(receipt.checkpointRevision, 1);
  assert.match(receipt.checkpointFingerprint, /^[a-f0-9]{64}$/);
  assert.match(receipt.executionPlanFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(receipt.persistence.checkpointPersisted, true);
  assert.equal(receipt.persistence.completedRunPersisted, false);
  assert.equal(state.persistence.completed.length, 0);
  assert.ok(
    state.persistence.checkpointWrites.some(
      (record) =>
        record.checkpoint.sequence === 1 &&
        record.checkpoint.fingerprint === receipt.checkpointFingerprint,
    ),
  );
});

test("intentional interruption fails closed when the requested checkpoint revision is unreachable", async () => {
  const state = harness({
    documents: [{
      url: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/sitemap.xml`,
      xml: urlset([{ path: "/a" }]),
    }],
  });

  await assert.rejects(
    runFullSiteCrawlBridgeUntilCheckpoint(fullInput("interrupt-unreachable"), 99, state.options),
    /crawl_bridge_interruption_revision_unreachable/,
  );
  assert.equal(state.persistence.completed.length, 1);
});

test("intentional interruption refuses a revision already passed by a supplied checkpoint", async () => {
  const state = harness({
    documents: [{
      url: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/sitemap.xml`,
      xml: urlset([{ path: "/a" }, { path: "/b" }, { path: "/c" }]),
    }],
  });
  const completed = await runFullSiteCrawlBridge(fullInput("interrupt-source"), state.options);

  await assert.rejects(
    runFullSiteCrawlBridgeUntilCheckpoint(
      fullInput("interrupt-target", { resumeCheckpoint: completed.checkpoint }),
      1,
      state.options,
    ),
    /crawl_bridge_interruption_revision_already_passed/,
  );
});


test("L10.13B persists exact terminal-failure evidence and an uncertified accounting snapshot", async () => {
  const failedUrl = `${DIAMOND_SHELF_CANONICAL_ORIGIN}/a`;
  const pageResults = new Map<string, PageTransportResult[]>([
    [failedUrl, [{ kind: "failure", signal: { kind: "http_status", httpStatus: 404 } }]],
  ]);
  const state = harness({ pageResults });

  const result = await runFullSiteCrawlBridgeAccountingAware(
    fullInput("l10-13b-accounting-failure"),
    state.options,
  );

  assert.equal("status" in result ? result.status : null, "accounting_complete_uncertified");
  if (!("status" in result) || result.status !== "accounting_complete_uncertified") {
    throw new Error("expected accounting_complete_uncertified");
  }
  assert.equal(result.terminalFailures, 1);
  assert.equal(result.persistence.accountingSnapshotPersisted, true);
  assert.equal(result.persistence.completedRunPersisted, false);
  assert.equal(result.persistence.terminalFailureEvidencePersisted, true);
  assert.equal(state.persistence.accounting.length, 1);
  assert.equal(state.persistence.completed.length, 0);
  assert.equal(state.persistence.terminalEvents.length, 1);

  const event = state.persistence.terminalEvents[0]!;
  assert.equal(event.eventType, "terminal_failure");
  assert.equal(event.canonicalUrl, failedUrl);
  assert.equal(event.sourceEventFingerprint, null);
  assert.equal(event.decisionReason, "permanent_http");
  assert.equal(event.outcome.kind, "failure");
  if (event.outcome.kind !== "failure" || event.outcome.signal.kind !== "http_status") {
    throw new Error("expected persisted HTTP failure evidence");
  }
  assert.equal(event.outcome.signal.httpStatus, 404);

  const accounting = state.persistence.accounting[0]!;
  assert.equal(accounting.checkpoint.status, "completed");
  assert.equal(accounting.checkpoint.progress.pendingUrls, 0);
  assert.equal(accounting.checkpoint.counters.terminalFailures, 1);
  assert.equal(accounting.certification.certification.wholeSiteCertified, false);
  assert.ok(accounting.certification.certification.blockers.includes("terminal_failures_present"));
});

test("L10.13B recovery refuses legacy counter-only accounting when exact failure evidence is absent", async () => {
  const failedUrl = `${DIAMOND_SHELF_CANONICAL_ORIGIN}/a`;
  const pageResults = new Map<string, PageTransportResult[]>([
    [failedUrl, [{ kind: "failure", signal: { kind: "http_status", httpStatus: 404 } }]],
  ]);
  const state = harness({ pageResults });

  const accountingResult = await runFullSiteCrawlBridgeAccountingAware(
    fullInput("l10-13b-evidence-gap"),
    state.options,
  );
  assert.equal(
    "status" in accountingResult ? accountingResult.status : null,
    "accounting_complete_uncertified",
  );

  state.persistence.terminalEvents.length = 0;
  const accounting = state.persistence.accounting[0]!;
  await assert.rejects(
    runTerminalFailureRecoveryBridge(
      {
        runId: accounting.runId,
        observedAt: "2026-09-22T00:05:00.000Z",
        siteId: accounting.siteId,
        canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
        executionPlanFingerprint: accounting.executionPlan.fingerprint,
      },
      state.options,
    ),
    /crawl_recovery_failure_evidence_incomplete/,
  );
  assert.equal(state.calls.pages.filter((url) => url === failedUrl).length, 1);
  assert.equal(state.persistence.completed.length, 0);
});

test("L10.13B retries only evidenced failed URLs and atomically promotes a resolved run", async () => {
  const failedUrl = `${DIAMOND_SHELF_CANONICAL_ORIGIN}/a`;
  const pageResults = new Map<string, PageTransportResult[]>([
    [failedUrl, [{ kind: "failure", signal: { kind: "http_status", httpStatus: 404 } }]],
  ]);
  const state = harness({ pageResults });

  const accountingResult = await runFullSiteCrawlBridgeAccountingAware(
    fullInput("l10-13b-resolved-recovery"),
    state.options,
  );
  if (!("status" in accountingResult) || accountingResult.status !== "accounting_complete_uncertified") {
    throw new Error("expected accounting_complete_uncertified");
  }
  const sourceAccounting = state.persistence.accounting[0]!;
  const sourceCheckpointRevision = sourceAccounting.checkpoint.sequence;
  const sourceEvent = state.persistence.terminalEvents[0]!;

  pageResults.set(failedUrl, [{ kind: "success" }]);
  const recovery = await runTerminalFailureRecoveryBridge(
    {
      runId: sourceAccounting.runId,
      observedAt: "2026-09-22T00:10:00.000Z",
      siteId: sourceAccounting.siteId,
      canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
      executionPlanFingerprint: sourceAccounting.executionPlan.fingerprint,
    },
    state.options,
  );

  assert.equal(recovery.recoveryPlan.evidence.length, 1);
  assert.equal(recovery.recoveryPlan.evidence[0]?.canonicalUrl, failedUrl);
  assert.equal(recovery.recoveryReceipt.status, "resolved");
  assert.equal(recovery.recoveryReceipt.terminalFailuresBefore, 1);
  assert.equal(recovery.recoveryReceipt.terminalFailuresAfter, 0);
  assert.equal(recovery.completedRunPersisted, true);
  assert.equal(recovery.accountingSnapshot.checkpoint.sequence, sourceCheckpointRevision + 1);
  assert.equal(recovery.accountingSnapshot.checkpoint.counters.terminalFailures, 0);
  assert.equal(recovery.accountingSnapshot.certification.certification.wholeSiteCertified, true);
  assert.equal(state.persistence.accounting.length, 2);
  assert.equal(state.persistence.completed.length, 1);
  assert.equal(state.persistence.recoveryReceipts.length, 1);

  const resolvedEvent = state.persistence.terminalEvents.find(
    (event) => event.eventType === "recovery_resolved",
  );
  assert.ok(resolvedEvent);
  assert.equal(resolvedEvent!.canonicalUrl, failedUrl);
  assert.equal(resolvedEvent!.sourceEventFingerprint, sourceEvent.fingerprint);

  const unresolved = await state.persistence.loadUnresolvedTerminalFailures({
    runId: sourceAccounting.runId,
    executionPlanFingerprint: sourceAccounting.executionPlan.fingerprint,
  });
  assert.equal(unresolved.length, 0);
  assert.deepEqual(
    state.calls.pages.filter((url) => url === failedUrl),
    [failedUrl, failedUrl],
  );
});

test("L10.13B chains an incomplete recovery to new unresolved evidence without certifying the run", async () => {
  const failedUrl = `${DIAMOND_SHELF_CANONICAL_ORIGIN}/a`;
  const pageResults = new Map<string, PageTransportResult[]>([
    [failedUrl, [
      { kind: "failure", signal: { kind: "http_status", httpStatus: 503 } },
      { kind: "failure", signal: { kind: "http_status", httpStatus: 503 } },
      { kind: "failure", signal: { kind: "http_status", httpStatus: 503 } },
    ]],
  ]);
  const state = harness({ pageResults });

  const accountingResult = await runFullSiteCrawlBridgeAccountingAware(
    fullInput("l10-13b-incomplete-recovery"),
    state.options,
  );
  if (!("status" in accountingResult) || accountingResult.status !== "accounting_complete_uncertified") {
    throw new Error("expected accounting_complete_uncertified");
  }
  const sourceAccounting = state.persistence.accounting[0]!;
  const sourceEvent = state.persistence.terminalEvents[0]!;
  assert.equal(sourceEvent.decisionReason, "attempts_exhausted");

  pageResults.set(failedUrl, [
    { kind: "failure", signal: { kind: "http_status", httpStatus: 503 } },
    { kind: "failure", signal: { kind: "http_status", httpStatus: 503 } },
    { kind: "failure", signal: { kind: "http_status", httpStatus: 503 } },
  ]);
  const recovery = await runTerminalFailureRecoveryBridge(
    {
      runId: sourceAccounting.runId,
      observedAt: "2026-09-22T00:15:00.000Z",
      siteId: sourceAccounting.siteId,
      canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
      executionPlanFingerprint: sourceAccounting.executionPlan.fingerprint,
    },
    state.options,
  );

  assert.equal(recovery.recoveryReceipt.status, "incomplete");
  assert.equal(recovery.recoveryReceipt.terminalFailuresAfter, 1);
  assert.equal(recovery.completedRunPersisted, false);
  assert.equal(recovery.accountingSnapshot.certification.certification.wholeSiteCertified, false);
  assert.equal(state.persistence.completed.length, 0);

  const recoveryFailure = state.persistence.terminalEvents.find(
    (event) => event.eventType === "recovery_failure",
  );
  assert.ok(recoveryFailure);
  assert.equal(recoveryFailure!.sourceEventFingerprint, sourceEvent.fingerprint);
  assert.equal(recoveryFailure!.decisionReason, "attempts_exhausted");

  const unresolved = await state.persistence.loadUnresolvedTerminalFailures({
    runId: sourceAccounting.runId,
    executionPlanFingerprint: sourceAccounting.executionPlan.fingerprint,
  });
  assert.equal(unresolved.length, 1);
  assert.equal(unresolved[0]?.fingerprint, recoveryFailure!.fingerprint);
});
