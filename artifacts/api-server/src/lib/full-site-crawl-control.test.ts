import assert from "node:assert/strict";
import test from "node:test";
import { planFirstPartyCrawl } from "./crawl-controller.js";
import { buildSitemapInventory, type SitemapInventoryPolicy } from "./sitemap-inventory.js";
import {
  FULL_SITE_EXECUTION_ABSOLUTE_LIMITS,
  advanceCrawlCheckpoint,
  assertFullSiteCrawlCheckpointIntegrity,
  assertFullSiteCrawlExecutionPlanIntegrity,
  classifyCrawlRetry,
  createInitialCrawlCheckpoint,
  describeCrawlResumeWork,
  evaluateFullSiteExecutionUrl,
  planFullSiteCrawlExecution,
  type FullSiteCrawlExecutionPlan,
  type FullSiteExecutionPolicy,
  type SuppliedCrawlBatchAttempt,
} from "./full-site-crawl-control.js";

const target = {
  targetClass: "first_party" as const,
  siteId: "diamond-shelf",
  canonicalOrigin: "https://diamondshelf.us",
};

function fullSitePlan(hardPageLimit = 20) {
  return planFirstPartyCrawl(
    { mode: "full_site", target, hardPageLimit },
    { absolutePageCeiling: 1_000 },
  );
}

function sitemapPolicy(maxInventoryUrls = 20): SitemapInventoryPolicy {
  return {
    maxDocuments: 10,
    maxDepth: 3,
    maxDocumentBytes: 20_000,
    maxInventoryUrls,
    maxPathSegments: 20,
  };
}

function inventory(urls: string[], hardPageLimit = 20) {
  const crawlPlan = fullSitePlan(hardPageLimit);
  const xml = `<urlset>${urls.map((url) => `<url><loc>${url}</loc></url>`).join("")}</urlset>`;
  const result = buildSitemapInventory({
    plan: crawlPlan,
    rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
    documents: [{ url: "https://diamondshelf.us/sitemap.xml", xml }],
    policy: sitemapPolicy(hardPageLimit),
  });
  return { crawlPlan, result };
}

function executionPolicy(overrides: Partial<FullSiteExecutionPolicy> = {}): FullSiteExecutionPolicy {
  return {
    batchSize: 2,
    concurrency: 2,
    requestsPerMinute: 60,
    requestTimeoutMs: 10_000,
    maxRedirectsPerRequest: 3,
    maxAttemptsPerUrl: 3,
    retryBaseDelayMs: 1_000,
    retryMaxDelayMs: 4_000,
    maxUrlLength: 2_048,
    maxPathSegments: 20,
    maxRepeatedPathSegmentRun: 4,
    ...overrides,
  };
}

function planFor(urls = [
  "https://diamondshelf.us/a",
  "https://diamondshelf.us/b",
  "https://diamondshelf.us/c",
]) {
  const source = inventory(urls);
  return planFullSiteCrawlExecution(source.crawlPlan, source.result, executionPolicy());
}

function attemptFor(
  checkpoint: ReturnType<typeof createInitialCrawlCheckpoint>,
  outcomes: SuppliedCrawlBatchAttempt["outcomes"],
  overrides: Partial<Omit<SuppliedCrawlBatchAttempt, "outcomes">> = {},
): SuppliedCrawlBatchAttempt {
  return {
    expectedCheckpointFingerprint: checkpoint.fingerprint,
    batchId: checkpoint.activeBatchId!,
    attempt: checkpoint.nextAttempt!,
    outcomes,
    ...overrides,
  };
}

test("deterministic inventory-derived batches bind rate controls and keep all execution gates closed", () => {
  const source = inventory([
    "https://diamondshelf.us/d",
    "https://diamondshelf.us/b",
    "https://diamondshelf.us/a",
    "https://diamondshelf.us/c",
    "https://diamondshelf.us/e",
  ]);
  const first = planFullSiteCrawlExecution(source.crawlPlan, source.result, executionPolicy());
  const second = planFullSiteCrawlExecution(source.crawlPlan, source.result, executionPolicy());

  assert.equal(first.fingerprint, second.fingerprint);
  assert.deepEqual(first.batches.map((batch) => batch.canonicalUrls), [
    ["https://diamondshelf.us/a", "https://diamondshelf.us/b"],
    ["https://diamondshelf.us/c", "https://diamondshelf.us/d"],
    ["https://diamondshelf.us/e"],
  ]);
  assert.equal(first.requestControls.minimumRequestStartIntervalMs, 1_000);
  assert.equal(first.requestControls.method, "GET");
  assert.equal(first.requestControls.robotsRequired, true);
  assert.ok(Object.values(first.authorization).every((value) => value === false));
  assert.match(first.fingerprint, /^[a-f0-9]{64}$/);
  assertFullSiteCrawlExecutionPlanIntegrity(first);
});

test("P2.3 rejects baseline, incomplete inventory, identity drift and open upstream authorization", () => {
  const source = inventory(["https://diamondshelf.us/a"]);
  const baseline = planFirstPartyCrawl({ mode: "baseline", target });
  assert.throws(() => planFullSiteCrawlExecution(baseline, source.result, executionPolicy()), /crawl_execution_full_site_plan_required/);

  const incomplete = structuredClone(source.result);
  incomplete.completeness.complete = false;
  incomplete.completeness.reasons = ["missing_supplied_sitemap_document"];
  assert.throws(() => planFullSiteCrawlExecution(source.crawlPlan, incomplete, executionPolicy()), /crawl_execution_complete_inventory_required/);

  const wrongSite = structuredClone(source.result);
  wrongSite.siteId = "other-site";
  assert.throws(() => planFullSiteCrawlExecution(source.crawlPlan, wrongSite, executionPolicy()), /crawl_execution_inventory_identity_mismatch/);

  const opened = structuredClone(source.crawlPlan) as any;
  opened.authorization.controllerExecutionEnabled = true;
  assert.throws(() => planFullSiteCrawlExecution(opened, source.result, executionPolicy()), /crawl_execution_plan_authorization_must_be_closed/);
});

test("all P2.3 execution ceilings are finite and independently bounded", () => {
  const source = inventory(["https://diamondshelf.us/a"], 300);
  const base = executionPolicy({ batchSize: 1, concurrency: 1 });

  const invalidCases: Array<[keyof FullSiteExecutionPolicy, number, RegExp]> = [
    ["batchSize", FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.batchSize + 1, /crawl_execution_batch_size_invalid/],
    ["concurrency", FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.concurrency + 1, /crawl_execution_concurrency_invalid/],
    ["requestsPerMinute", FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.requestsPerMinute + 1, /crawl_execution_rate_invalid/],
    ["requestTimeoutMs", FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.requestTimeoutMs + 1, /crawl_execution_timeout_invalid/],
    ["maxRedirectsPerRequest", FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.redirectsPerRequest + 1, /crawl_execution_redirect_limit_invalid/],
    ["maxAttemptsPerUrl", FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.attemptsPerUrl + 1, /crawl_execution_attempt_limit_invalid/],
    ["retryBaseDelayMs", FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.retryBaseDelayMs + 1, /crawl_execution_retry_base_delay_invalid/],
    ["retryMaxDelayMs", FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.retryMaxDelayMs + 1, /crawl_execution_retry_max_delay_invalid/],
    ["maxUrlLength", FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.urlLength + 1, /crawl_execution_url_length_invalid/],
    ["maxPathSegments", FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.pathSegments + 1, /crawl_execution_path_segments_invalid/],
    ["maxRepeatedPathSegmentRun", FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.repeatedPathSegmentRun + 1, /crawl_execution_repeated_segment_invalid/],
  ];

  for (const [key, value, expected] of invalidCases) {
    assert.throws(
      () => planFullSiteCrawlExecution(source.crawlPlan, source.result, { ...base, [key]: value }),
      expected,
    );
  }
  for (const invalid of [Infinity, Number.NaN, -1, 1.5]) {
    assert.throws(
      () => planFullSiteCrawlExecution(source.crawlPlan, source.result, { ...base, requestsPerMinute: invalid }),
      /crawl_execution_rate_invalid/,
    );
  }
  assert.throws(
    () => planFullSiteCrawlExecution(source.crawlPlan, source.result, { ...base, concurrency: 2, batchSize: 1 }),
    /crawl_execution_concurrency_exceeds_batch_size/,
  );
  assert.throws(
    () => planFullSiteCrawlExecution(source.crawlPlan, source.result, { ...base, retryBaseDelayMs: 2_000, retryMaxDelayMs: 1_000 }),
    /crawl_execution_retry_delay_order_invalid/,
  );
});

test("execution-time URL policy rejects unsafe origins, queries, fragments and trap patterns", () => {
  const policy = executionPolicy();
  const origin = "https://diamondshelf.us";
  const cases: Array<[string, string]> = [
    ["http://diamondshelf.us/a", "unsupported_scheme"],
    ["https://user:pass@diamondshelf.us/a", "credentials_not_allowed"],
    ["https://example.com/a", "cross_origin"],
    ["https://diamondshelf.us/a?q=1", "query_not_allowed"],
    ["https://diamondshelf.us/a#x", "fragment_not_allowed"],
    ["https://diamondshelf.us/cart", "excluded_path"],
    ["https://diamondshelf.us/a%2Fb", "encoded_path_separator_not_allowed"],
    ["https://diamondshelf.us/a/a/a/a/a", "repeated_path_segment_run_exceeded"],
  ];
  for (const [url, reason] of cases) {
    assert.deepEqual(evaluateFullSiteExecutionUrl(url, origin, policy), { safe: false, reason });
  }
  assert.deepEqual(evaluateFullSiteExecutionUrl("https://diamondshelf.us/a", origin, policy), {
    safe: true,
    normalizedUrl: "https://diamondshelf.us/a",
  });
});

test("plan integrity independently rejects reconstructed semantic drift before trusting fingerprint", () => {
  const plan = planFor();
  const unsafeControls = structuredClone(plan) as any;
  unsafeControls.requestControls.robotsRequired = false;
  assert.throws(() => assertFullSiteCrawlExecutionPlanIntegrity(unsafeControls), /crawl_execution_request_controls_invalid/);

  const unsafePolicy = structuredClone(plan) as any;
  unsafePolicy.policy.maxAttemptsPerUrl = FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.attemptsPerUrl + 1;
  assert.throws(() => assertFullSiteCrawlExecutionPlanIntegrity(unsafePolicy), /crawl_execution_attempt_limit_invalid/);

  const arbitraryUrl = structuredClone(plan) as any;
  arbitraryUrl.batches[0].canonicalUrls[0] = "https://diamondshelf.us/search?q=injected";
  assert.throws(() => assertFullSiteCrawlExecutionPlanIntegrity(arbitraryUrl), /crawl_execution_batch_url_invalid/);
});

test("checkpoint resume preserves exact pending work and bounded retry progression", () => {
  const plan = planFor();
  const initial = createInitialCrawlCheckpoint(plan);
  assert.deepEqual(describeCrawlResumeWork(plan, initial).canonicalUrls, [
    "https://diamondshelf.us/a",
    "https://diamondshelf.us/b",
  ]);

  const retry = advanceCrawlCheckpoint(plan, initial, attemptFor(initial, [
    { canonicalUrl: "https://diamondshelf.us/a", kind: "success" },
    { canonicalUrl: "https://diamondshelf.us/b", kind: "failure", signal: { kind: "http_status", httpStatus: 503 } },
  ]));
  assert.equal(retry.activeBatchId, initial.activeBatchId);
  assert.equal(retry.nextAttempt, 2);
  assert.deepEqual(retry.pendingCanonicalUrls, ["https://diamondshelf.us/b"]);
  assert.equal(retry.counters.attemptsRecorded, 2);
  assert.equal(retry.counters.fetchedSuccessful, 1);
  assert.equal(retry.counters.retryScheduled, 1);
  assert.deepEqual(describeCrawlResumeWork(plan, retry).canonicalUrls, ["https://diamondshelf.us/b"]);
  assertFullSiteCrawlCheckpointIntegrity(plan, retry);

  const nextBatch = advanceCrawlCheckpoint(plan, retry, attemptFor(retry, [
    { canonicalUrl: "https://diamondshelf.us/b", kind: "success" },
  ]));
  assert.equal(nextBatch.activeBatchIndex, 1);
  assert.equal(nextBatch.nextAttempt, 1);
  assert.deepEqual(nextBatch.pendingCanonicalUrls, ["https://diamondshelf.us/c"]);
  assert.deepEqual(nextBatch.completedBatchIds, [plan.batches[0]!.batchId]);

  const complete = advanceCrawlCheckpoint(plan, nextBatch, attemptFor(nextBatch, [
    { canonicalUrl: "https://diamondshelf.us/c", kind: "robots_excluded" },
  ]));
  assert.equal(complete.status, "completed");
  assert.equal(complete.progress.finalizedUrls, 3);
  assert.equal(complete.progress.pendingUrls, 0);
  assert.equal(complete.progress.wholeSiteCertified, false);
  assert.equal(complete.counters.attemptsRecorded, 4);
  assertFullSiteCrawlCheckpointIntegrity(plan, complete);
});

test("retry classification is explicit, finite and never retries permanent/policy failures", () => {
  const policy = executionPolicy({ maxAttemptsPerUrl: 3, retryBaseDelayMs: 1_000, retryMaxDelayMs: 2_000 });
  assert.deepEqual(classifyCrawlRetry({ kind: "network_timeout" }, 1, policy), {
    retryable: true,
    reason: "transient_transport",
    nextAttempt: 2,
    delayMs: 1_000,
  });
  assert.deepEqual(classifyCrawlRetry({ kind: "http_status", httpStatus: 429 }, 2, policy), {
    retryable: true,
    reason: "transient_http",
    nextAttempt: 3,
    delayMs: 2_000,
  });
  assert.deepEqual(classifyCrawlRetry({ kind: "http_status", httpStatus: 403 }, 1, policy), {
    retryable: false,
    reason: "permanent_http",
    nextAttempt: null,
    delayMs: null,
  });
  assert.deepEqual(classifyCrawlRetry({ kind: "policy_rejection" }, 1, policy), {
    retryable: false,
    reason: "policy_rejection",
    nextAttempt: null,
    delayMs: null,
  });
  assert.deepEqual(classifyCrawlRetry({ kind: "http_status", httpStatus: 503 }, 3, policy), {
    retryable: false,
    reason: "attempts_exhausted",
    nextAttempt: null,
    delayMs: null,
  });
});

test("retry exhaustion becomes terminal and cannot create an unbounded loop", () => {
  const source = inventory(["https://diamondshelf.us/a"]);
  const plan = planFullSiteCrawlExecution(source.crawlPlan, source.result, executionPolicy({
    batchSize: 1,
    concurrency: 1,
    maxAttemptsPerUrl: 2,
  }));
  const first = createInitialCrawlCheckpoint(plan);
  const retry = advanceCrawlCheckpoint(plan, first, attemptFor(first, [
    { canonicalUrl: "https://diamondshelf.us/a", kind: "failure", signal: { kind: "http_status", httpStatus: 503 } },
  ]));
  assert.equal(retry.nextAttempt, 2);
  const exhausted = advanceCrawlCheckpoint(plan, retry, attemptFor(retry, [
    { canonicalUrl: "https://diamondshelf.us/a", kind: "failure", signal: { kind: "http_status", httpStatus: 503 } },
  ]));
  assert.equal(exhausted.status, "completed");
  assert.equal(exhausted.counters.retryScheduled, 1);
  assert.equal(exhausted.counters.terminalFailures, 1);
  assert.equal(exhausted.counters.attemptsRecorded, 2);
});

test("stale, out-of-order, duplicate, foreign and missing supplied outcomes fail closed", () => {
  const plan = planFor(["https://diamondshelf.us/a", "https://diamondshelf.us/b"]);
  const checkpoint = createInitialCrawlCheckpoint(plan);
  const valid = [
    { canonicalUrl: "https://diamondshelf.us/a", kind: "success" as const },
    { canonicalUrl: "https://diamondshelf.us/b", kind: "success" as const },
  ];

  assert.throws(() => advanceCrawlCheckpoint(plan, checkpoint, attemptFor(checkpoint, valid, {
    expectedCheckpointFingerprint: "0".repeat(64),
  })), /crawl_checkpoint_stale_fingerprint/);
  assert.throws(() => advanceCrawlCheckpoint(plan, checkpoint, attemptFor(checkpoint, valid, {
    batchId: "batch-wrong",
  })), /crawl_checkpoint_batch_out_of_order/);
  assert.throws(() => advanceCrawlCheckpoint(plan, checkpoint, attemptFor(checkpoint, valid, {
    attempt: 2,
  })), /crawl_checkpoint_attempt_out_of_order/);
  assert.throws(() => advanceCrawlCheckpoint(plan, checkpoint, attemptFor(checkpoint, [valid[0]!, valid[0]!])), /crawl_checkpoint_outcome_duplicate_url/);
  assert.throws(() => advanceCrawlCheckpoint(plan, checkpoint, attemptFor(checkpoint, [
    valid[0]!,
    { canonicalUrl: "https://diamondshelf.us/foreign", kind: "success" },
  ])), /crawl_checkpoint_outcome_foreign_url/);
  assert.throws(() => advanceCrawlCheckpoint(plan, checkpoint, attemptFor(checkpoint, [valid[0]!])), /crawl_checkpoint_outcome_count_mismatch/);
});

test("redirect targets are revalidated and noncanonical or cross-origin redirects fail closed", () => {
  const source = inventory(["https://diamondshelf.us/a"]);
  const plan = planFullSiteCrawlExecution(source.crawlPlan, source.result, executionPolicy({ batchSize: 1, concurrency: 1 }));
  const checkpoint = createInitialCrawlCheckpoint(plan);

  assert.throws(() => advanceCrawlCheckpoint(plan, checkpoint, attemptFor(checkpoint, [{
    canonicalUrl: "https://diamondshelf.us/a",
    kind: "redirect",
    redirectTarget: "https://example.com/b",
    redirectCount: 1,
  }])), /crawl_redirect_target_rejected:cross_origin/);

  assert.throws(() => advanceCrawlCheckpoint(plan, checkpoint, attemptFor(checkpoint, [{
    canonicalUrl: "https://diamondshelf.us/a",
    kind: "redirect",
    redirectTarget: "https://diamondshelf.us/b/",
    redirectCount: 1,
  }])), /crawl_redirect_target_not_canonical/);
});

test("checkpoint output is sanitized and ignores supplied body-like extras", () => {
  const source = inventory(["https://diamondshelf.us/a"]);
  const plan = planFullSiteCrawlExecution(source.crawlPlan, source.result, executionPolicy({ batchSize: 1, concurrency: 1 }));
  const checkpoint = createInitialCrawlCheckpoint(plan);
  const marker = "RAW_RESPONSE_SECRET_MARKER";
  const outcome = {
    canonicalUrl: "https://diamondshelf.us/a",
    kind: "success",
    responseBody: marker,
    token: marker,
  } as any;
  const complete = advanceCrawlCheckpoint(plan, checkpoint, attemptFor(checkpoint, [outcome]));
  const serialized = JSON.stringify(complete);
  assert.equal(serialized.includes(marker), false);
  assert.equal(serialized.includes("responseBody"), false);
  assert.ok(Object.values(complete.authorization).every((value) => value === false));
});

test("empty complete inventory yields terminal default-off checkpoint without claiming whole-site certification", () => {
  const source = inventory([]);
  const plan = planFullSiteCrawlExecution(source.crawlPlan, source.result, executionPolicy());
  const checkpoint = createInitialCrawlCheckpoint(plan);
  assert.equal(plan.batches.length, 0);
  assert.equal(checkpoint.status, "completed");
  assert.equal(checkpoint.progress.totalUrls, 0);
  assert.equal(checkpoint.progress.wholeSiteCertified, false);
  assert.equal(describeCrawlResumeWork(plan, checkpoint).executionEnabled, false);
});
