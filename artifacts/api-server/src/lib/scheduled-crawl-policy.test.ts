import assert from "node:assert/strict";
import test from "node:test";
import { planFirstPartyCrawl } from "./crawl-controller.js";
import { buildSitemapInventory } from "./sitemap-inventory.js";
import {
  advanceCrawlCheckpoint,
  createInitialCrawlCheckpoint,
  planFullSiteCrawlExecution,
  type FullSiteExecutionPolicy,
  type SuppliedCrawlUrlOutcome,
} from "./full-site-crawl-control.js";
import { buildFullSiteCrawlCertification } from "./full-site-crawl-certification.js";
import { compareFullSiteCrawlHistory } from "./crawl-history-comparison.js";
import { buildIncrementalRecrawlPlan } from "./incremental-recrawl-planner.js";
import {
  MAX_FULL_RECONCILIATION_INTERVAL_SLOTS,
  buildScheduledCrawlRefreshSchedule,
  projectScheduledCrawlPolicyReview,
  scheduledCrawlPolicyCapability,
  type CurrentFullSiteCrawlLineage,
  type IncrementalCrawlEvidence,
} from "./scheduled-crawl-policy.js";

const START_AT = "2026-09-20T00:00:00.000Z";

function executionPolicy(requestsPerMinute = 60): FullSiteExecutionPolicy {
  return {
    batchSize: 20,
    concurrency: 2,
    requestsPerMinute,
    requestTimeoutMs: 10_000,
    maxRedirectsPerRequest: 3,
    maxAttemptsPerUrl: 3,
    retryBaseDelayMs: 1_000,
    retryMaxDelayMs: 4_000,
    maxUrlLength: 2_048,
    maxPathSegments: 20,
    maxRepeatedPathSegmentRun: 4,
  };
}

function fullLineage(input: {
  entries: Array<{ path: string; lastmod?: string }>;
  requestsPerMinute?: number;
  failurePath?: string;
}): CurrentFullSiteCrawlLineage {
  const canonicalOrigin = "https://diamondshelf.us";
  const crawlPlan = planFirstPartyCrawl(
    {
      mode: "full_site",
      target: {
        targetClass: "first_party",
        siteId: "diamond-shelf",
        canonicalOrigin,
      },
      hardPageLimit: 20,
    },
    { absolutePageCeiling: 1_000 },
  );
  const body = input.entries
    .map(({ path, lastmod }) =>
      "<url><loc>" + canonicalOrigin + path + "</loc>"
      + (lastmod ? "<lastmod>" + lastmod + "</lastmod>" : "")
      + "</url>")
    .join("");
  const inventory = buildSitemapInventory({
    plan: crawlPlan,
    rootSitemapUrl: canonicalOrigin + "/sitemap.xml",
    documents: [{
      url: canonicalOrigin + "/sitemap.xml",
      xml: "<urlset>" + body + "</urlset>",
    }],
    policy: {
      maxDocuments: 10,
      maxDepth: 3,
      maxDocumentBytes: 20_000,
      maxInventoryUrls: 20,
      maxPathSegments: 20,
    },
  });
  const executionPlan = planFullSiteCrawlExecution(
    crawlPlan,
    inventory,
    executionPolicy(input.requestsPerMinute ?? 60),
  );
  const initial = createInitialCrawlCheckpoint(executionPlan);
  assert.ok(initial.activeBatchId);
  assert.ok(initial.nextAttempt);
  const outcomes: SuppliedCrawlUrlOutcome[] = inventory.inventory.entries.map((entry) =>
    input.failurePath && entry.canonicalUrl === canonicalOrigin + input.failurePath
      ? {
          canonicalUrl: entry.canonicalUrl,
          kind: "failure",
          signal: { kind: "http_status", httpStatus: 404 },
        }
      : { canonicalUrl: entry.canonicalUrl, kind: "success" },
  );
  const checkpoint = advanceCrawlCheckpoint(executionPlan, initial, {
    expectedCheckpointFingerprint: initial.fingerprint,
    batchId: initial.activeBatchId,
    attempt: initial.nextAttempt,
    outcomes,
  });
  const certification = buildFullSiteCrawlCertification({
    crawlPlan,
    inventory,
    executionPlan,
    checkpoint,
  });
  return { crawlPlan, inventory, executionPlan, checkpoint, certification };
}

function historySource(lineage: CurrentFullSiteCrawlLineage) {
  return {
    inventory: lineage.inventory,
    certification: lineage.certification,
  };
}

function incrementalEvidence(input: {
  before: CurrentFullSiteCrawlLineage;
  after: CurrentFullSiteCrawlLineage;
}): IncrementalCrawlEvidence {
  const before = historySource(input.before);
  const after = historySource(input.after);
  const comparison = compareFullSiteCrawlHistory({ before, after });
  const policy = { maxPlanUrls: 20, batchSize: 10 };
  const plan = buildIncrementalRecrawlPlan({
    comparison,
    before,
    after,
    policy,
    trustedCandidates: [],
  });
  return { before, after, comparison, policy, trustedCandidates: [], plan };
}

function scheduleFixture(input: {
  current: CurrentFullSiteCrawlLineage;
  incremental?: IncrementalCrawlEvidence | null;
  fullEvery?: number;
  paused?: boolean;
}) {
  const policy = { fullReconciliationEverySlots: input.fullEvery ?? 4 };
  const schedule = buildScheduledCrawlRefreshSchedule({
    key: "diamond-shelf-crawl",
    current: input.current,
    incremental: input.incremental,
    policy,
    startAt: START_AT,
    cadenceMinutes: 60,
    dueWindowMinutes: 15,
    paused: input.paused,
  });
  return { policy, schedule };
}

test("P9.3 schedule identity is deterministic and binds exact crawl lineage plus policy", () => {
  const before = fullLineage({
    entries: [{ path: "/a", lastmod: "2026-09-18" }],
  });
  const after = fullLineage({
    entries: [
      { path: "/a", lastmod: "2026-09-18" },
      { path: "/b", lastmod: "2026-09-19" },
    ],
  });
  const incremental = incrementalEvidence({ before, after });
  const one = scheduleFixture({ current: after, incremental });
  const two = scheduleFixture({ current: after, incremental });
  assert.deepEqual(one, two);

  const changedPolicy = scheduleFixture({ current: after, incremental, fullEvery: 5 });
  assert.notEqual(one.schedule.scheduleFingerprint, changedPolicy.schedule.scheduleFingerprint);

  const changedLineage = fullLineage({
    entries: [
      { path: "/a", lastmod: "2026-09-18" },
      { path: "/b", lastmod: "2026-09-19" },
      { path: "/c", lastmod: "2026-09-20" },
    ],
  });
  const changedIncremental = incrementalEvidence({ before: after, after: changedLineage });
  const three = scheduleFixture({ current: changedLineage, incremental: changedIncremental });
  assert.notEqual(one.schedule.scheduleFingerprint, three.schedule.scheduleFingerprint);
});

test("P9.3 performs scheduled full reconciliation on deterministic slot boundaries", () => {
  const current = fullLineage({ entries: [{ path: "/a" }, { path: "/b" }] });
  const incremental = incrementalEvidence({ before: current, after: current });
  const { policy, schedule } = scheduleFixture({ current, incremental, fullEvery: 4 });

  const projection = projectScheduledCrawlPolicyReview({
    schedule,
    current,
    incremental,
    policy,
    now: "2026-09-20T00:05:00Z",
  });
  assert.equal(projection.evaluation.status, "due");
  assert.equal(projection.candidate?.slotIndex, 0);
  assert.equal(projection.candidate?.selection, "full_reconciliation");
  assert.equal(projection.candidate?.reason, "scheduled_full_reconciliation");
  assert.equal(projection.candidate?.work.requiresWholeSiteCertification, true);
  assert.equal(projection.candidate?.work.selectedUrlCount, 2);
});

test("P9.3 selects incremental only from exact safe P2.5/P2.6 lineage", () => {
  const before = fullLineage({
    entries: [{ path: "/a", lastmod: "2026-09-18" }],
  });
  const after = fullLineage({
    entries: [
      { path: "/a", lastmod: "2026-09-18" },
      { path: "/b", lastmod: "2026-09-19" },
    ],
  });
  const incremental = incrementalEvidence({ before, after });
  assert.equal(incremental.plan.fallback.fullReconciliationRecommended, false);
  assert.equal(incremental.plan.accounting.selectedUrls, 1);
  const { policy, schedule } = scheduleFixture({ current: after, incremental, fullEvery: 4 });

  const projection = projectScheduledCrawlPolicyReview({
    schedule,
    current: after,
    incremental,
    policy,
    now: "2026-09-20T01:05:00Z",
  });
  assert.equal(projection.candidate?.slotIndex, 1);
  assert.equal(projection.candidate?.selection, "incremental");
  assert.equal(projection.candidate?.reason, "incremental_candidates_available");
  assert.equal(projection.candidate?.work.selectedUrlCount, 1);
  assert.equal(projection.candidate?.work.requiresWholeSiteCertification, false);
});

test("P9.3 emits explicit no_work when safe incremental evidence has no candidates", () => {
  const current = fullLineage({ entries: [{ path: "/a" }, { path: "/b" }] });
  const incremental = incrementalEvidence({ before: current, after: current });
  assert.equal(incremental.plan.accounting.candidateUrls, 0);
  const { policy, schedule } = scheduleFixture({ current, incremental });

  const projection = projectScheduledCrawlPolicyReview({
    schedule,
    current,
    incremental,
    policy,
    now: "2026-09-20T01:05:00Z",
  });
  assert.equal(projection.candidate?.selection, "no_work");
  assert.equal(projection.candidate?.reason, "no_incremental_candidates");
  assert.equal(projection.candidate?.work.selectedUrlCount, 0);
  assert.equal(projection.candidate?.work.batchCount, 0);
});

test("P9.3 escalates missing incremental evidence to full reconciliation", () => {
  const current = fullLineage({ entries: [{ path: "/a" }] });
  const { policy, schedule } = scheduleFixture({ current, incremental: null });

  const projection = projectScheduledCrawlPolicyReview({
    schedule,
    current,
    incremental: null,
    policy,
    now: "2026-09-20T01:05:00Z",
  });
  assert.equal(projection.candidate?.selection, "full_reconciliation");
  assert.equal(projection.candidate?.reason, "incremental_evidence_unavailable");
});

test("P9.3 preserves the P2.6 lineage-change full-reconciliation fallback", () => {
  const before = fullLineage({
    entries: [{ path: "/a", lastmod: "2026-09-18" }],
    requestsPerMinute: 60,
  });
  const after = fullLineage({
    entries: [{ path: "/a", lastmod: "2026-09-18" }],
    requestsPerMinute: 30,
  });
  const incremental = incrementalEvidence({ before, after });
  assert.equal(incremental.plan.fallback.fullReconciliationRecommended, true);
  assert.equal(incremental.plan.fallback.reason, "lineage_change_without_url_level_evidence");
  const { policy, schedule } = scheduleFixture({ current: after, incremental });

  const projection = projectScheduledCrawlPolicyReview({
    schedule,
    current: after,
    incremental,
    policy,
    now: "2026-09-20T01:05:00Z",
  });
  assert.equal(projection.candidate?.selection, "full_reconciliation");
  assert.equal(projection.candidate?.reason, "lineage_change_without_url_level_evidence");
});

test("P9.3 requires full reconciliation when current whole-site certification is blocked", () => {
  const before = fullLineage({ entries: [{ path: "/a" }, { path: "/b" }] });
  const after = fullLineage({
    entries: [{ path: "/a" }, { path: "/b" }],
    failurePath: "/b",
  });
  assert.equal(after.certification.certification.wholeSiteCertified, false);
  const incremental = incrementalEvidence({ before, after });
  const { policy, schedule } = scheduleFixture({ current: after, incremental });

  const projection = projectScheduledCrawlPolicyReview({
    schedule,
    current: after,
    incremental,
    policy,
    now: "2026-09-20T01:05:00Z",
  });
  assert.equal(projection.candidate?.selection, "full_reconciliation");
  assert.equal(projection.candidate?.reason, "current_full_site_not_certified");
});

test("P9.3 non-due P9.1 states never emit crawl-policy candidates", () => {
  const current = fullLineage({ entries: [{ path: "/a" }] });
  const incremental = incrementalEvidence({ before: current, after: current });
  const active = scheduleFixture({ current, incremental });

  assert.equal(
    projectScheduledCrawlPolicyReview({
      schedule: active.schedule,
      current,
      incremental,
      policy: active.policy,
      now: "2026-09-19T23:59:00Z",
    }).candidate,
    null,
  );
  assert.equal(
    projectScheduledCrawlPolicyReview({
      schedule: active.schedule,
      current,
      incremental,
      policy: active.policy,
      now: "2026-09-20T01:20:00Z",
    }).candidate,
    null,
  );
  assert.equal(
    projectScheduledCrawlPolicyReview({
      schedule: active.schedule,
      current,
      incremental,
      policy: active.policy,
      now: "2026-09-20T01:05:00Z",
      lastMaterializedSlotAt: "2026-09-20T01:00:00Z",
    }).candidate,
    null,
  );

  const paused = scheduleFixture({ current, incremental, paused: true });
  assert.equal(
    projectScheduledCrawlPolicyReview({
      schedule: paused.schedule,
      current,
      incremental,
      policy: paused.policy,
      now: "2026-09-20T01:05:00Z",
    }).candidate,
    null,
  );
});

test("P9.3 fails closed on tampered schedule and incremental lineage", () => {
  const before = fullLineage({ entries: [{ path: "/a" }] });
  const after = fullLineage({ entries: [{ path: "/a" }, { path: "/b" }] });
  const incremental = incrementalEvidence({ before, after });
  const { policy, schedule } = scheduleFixture({ current: after, incremental });

  assert.throws(
    () => projectScheduledCrawlPolicyReview({
      schedule: { ...schedule, cadenceMinutes: 120 },
      current: after,
      incremental,
      policy,
      now: "2026-09-20T01:05:00Z",
    }),
    /scheduled_crawl_schedule_lineage_mismatch/,
  );

  const tampered = {
    ...incremental,
    plan: {
      ...incremental.plan,
      accounting: {
        ...incremental.plan.accounting,
        selectedUrls: incremental.plan.accounting.selectedUrls + 1,
      },
    },
  };
  assert.throws(
    () => buildScheduledCrawlRefreshSchedule({
      key: "diamond-shelf-crawl",
      current: after,
      incremental: tampered,
      policy,
      startAt: START_AT,
      cadenceMinutes: 60,
      dueWindowMinutes: 15,
    }),
    /incremental_recrawl_plan_accounting_mismatch|incremental_recrawl_plan_fingerprint_mismatch/,
  );
});

test("P9.3 policy bounds and capability remain default-off", () => {
  const current = fullLineage({ entries: [{ path: "/a" }] });
  assert.throws(
    () => buildScheduledCrawlRefreshSchedule({
      key: "diamond-shelf-crawl",
      current,
      incremental: null,
      policy: { fullReconciliationEverySlots: 0 },
      startAt: START_AT,
      cadenceMinutes: 60,
      dueWindowMinutes: 15,
    }),
    /invalid_full_reconciliation_interval_slots/,
  );
  assert.throws(
    () => buildScheduledCrawlRefreshSchedule({
      key: "diamond-shelf-crawl",
      current,
      incremental: null,
      policy: { fullReconciliationEverySlots: MAX_FULL_RECONCILIATION_INTERVAL_SLOTS + 1 },
      startAt: START_AT,
      cadenceMinutes: 60,
      dueWindowMinutes: 15,
    }),
    /invalid_full_reconciliation_interval_slots/,
  );

  assert.deepEqual(scheduledCrawlPolicyCapability(), {
    version: "p9-3-scheduled-crawl-policy-v1",
    architectureOnly: true,
    deterministicProjectionOnly: true,
    firstPartyCrawlPolicyOnly: true,
    materializationReviewOnly: true,
    p2SafetyControlsRequired: true,
    fullReconciliationFallbackPreserved: true,
    orderingImpliesPriority: false,
    wallClockAccess: false,
    timerActivated: false,
    schedulerActivated: false,
    durableEnqueueAuthorized: false,
    queueReservationAuthorized: false,
    workerEnabled: false,
    batchExecutorEnabled: false,
    retryLoopEnabled: false,
    sitemapNetworkFetchingAuthorized: false,
    crawlNetworkReadAuthorized: false,
    crawlExecutionAuthorized: false,
    observationPersistenceAuthorized: false,
    evidencePersistenceAuthorized: false,
    productionDbReadAuthorized: false,
    productionDbWriteAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
    task53ExecutionAuthorized: false,
    task54ExecutionAuthorized: false,
    automaticTransition: false,
    publicationAuthorized: false,
  });
});
