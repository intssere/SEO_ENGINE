import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { planFirstPartyCrawl } from "./crawl-controller.js";
import { buildSitemapInventory } from "./sitemap-inventory.js";
import {
  advanceCrawlCheckpoint,
  assertFullSiteCrawlCheckpointIntegrity,
  classifyCrawlRetry,
  createInitialCrawlCheckpoint,
  planFullSiteCrawlExecution,
  type FullSiteExecutionPolicy,
} from "./full-site-crawl-control.js";

const target = {
  targetClass: "first_party" as const,
  siteId: "diamond-shelf",
  canonicalOrigin: "https://diamondshelf.us",
};

function policy(): FullSiteExecutionPolicy {
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
  };
}

function plan() {
  const crawlPlan = planFirstPartyCrawl(
    { mode: "full_site", target, hardPageLimit: 10 },
    { absolutePageCeiling: 100 },
  );
  const inventory = buildSitemapInventory({
    plan: crawlPlan,
    rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
    documents: [{
      url: "https://diamondshelf.us/sitemap.xml",
      xml: `<urlset>
        <url><loc>https://diamondshelf.us/a</loc></url>
        <url><loc>https://diamondshelf.us/b</loc></url>
        <url><loc>https://diamondshelf.us/c</loc></url>
      </urlset>`,
    }],
    policy: {
      maxDocuments: 5,
      maxDepth: 2,
      maxDocumentBytes: 20_000,
      maxInventoryUrls: 10,
      maxPathSegments: 20,
    },
  });
  return planFullSiteCrawlExecution(crawlPlan, inventory, policy());
}

test("P2.3 control source contains no built-in network, socket, DNS or persistence transport", () => {
  const source = readFileSync(fileURLToPath(new URL("./full-site-crawl-control.ts", import.meta.url)), "utf8");
  const forbidden = [
    /\bfetch\s*\(/,
    /node:https/,
    /node:http/,
    /node:net/,
    /node:dns/,
    /axios/i,
    /undici/i,
    /\bWebSocket\b/,
    /\bINSERT\s+INTO\b/i,
    /\bUPDATE\s+[A-Za-z_"`][\w."`]*\s+SET\b/i,
    /\bDELETE\s+FROM\b/i,
  ];
  for (const pattern of forbidden) assert.equal(pattern.test(source), false, `forbidden primitive matched ${pattern}`);
});

test("checkpoint semantic counters fail closed independently of checkpoint fingerprint", () => {
  const executionPlan = plan();
  const checkpoint = createInitialCrawlCheckpoint(executionPlan);
  const forged = structuredClone(checkpoint) as any;
  forged.counters.attemptsRecorded = 7;
  assert.throws(
    () => assertFullSiteCrawlCheckpointIntegrity(executionPlan, forged),
    /crawl_checkpoint_attempt_counter_mismatch/,
  );
});

test("checkpoint cannot reopen completed work, reorder pending URLs or widen active-batch scope", () => {
  const executionPlan = plan();
  const checkpoint = createInitialCrawlCheckpoint(executionPlan);

  const reordered = structuredClone(checkpoint) as any;
  reordered.pendingCanonicalUrls.reverse();
  assert.throws(
    () => assertFullSiteCrawlCheckpointIntegrity(executionPlan, reordered),
    /crawl_checkpoint_pending_url_order_invalid/,
  );

  const widened = structuredClone(checkpoint) as any;
  widened.pendingCanonicalUrls.push("https://diamondshelf.us/c");
  assert.throws(
    () => assertFullSiteCrawlCheckpointIntegrity(executionPlan, widened),
    /crawl_checkpoint_pending_url_foreign/,
  );

  const completed = advanceCrawlCheckpoint(executionPlan, checkpoint, {
    expectedCheckpointFingerprint: checkpoint.fingerprint,
    batchId: checkpoint.activeBatchId!,
    attempt: 1,
    outcomes: checkpoint.pendingCanonicalUrls.map((canonicalUrl) => ({ canonicalUrl, kind: "success" as const })),
  });
  assert.equal(completed.activeBatchIndex, 1);
  assert.throws(
    () => advanceCrawlCheckpoint(executionPlan, completed, {
      expectedCheckpointFingerprint: checkpoint.fingerprint,
      batchId: checkpoint.activeBatchId!,
      attempt: 1,
      outcomes: checkpoint.pendingCanonicalUrls.map((canonicalUrl) => ({ canonicalUrl, kind: "success" as const })),
    }),
    /crawl_checkpoint_stale_fingerprint/,
  );
});

test("retry classifier rejects forged unbounded retry policy values", () => {
  assert.throws(
    () => classifyCrawlRetry(
      { kind: "network_timeout" },
      1,
      { maxAttemptsPerUrl: Infinity, retryBaseDelayMs: 1_000, retryMaxDelayMs: 4_000 },
    ),
    /crawl_execution_attempt_limit_invalid/,
  );
  assert.throws(
    () => classifyCrawlRetry(
      { kind: "network_timeout" },
      1,
      { maxAttemptsPerUrl: 3, retryBaseDelayMs: 5_000, retryMaxDelayMs: 1_000 },
    ),
    /crawl_execution_retry_delay_order_invalid/,
  );
});

test("checkpoint authorization cannot be reopened", () => {
  const executionPlan = plan();
  const checkpoint = createInitialCrawlCheckpoint(executionPlan);
  const opened = structuredClone(checkpoint) as any;
  opened.authorization.batchExecutorEnabled = true;
  assert.throws(
    () => assertFullSiteCrawlCheckpointIntegrity(executionPlan, opened),
    /crawl_checkpoint_authorization_must_be_closed/,
  );
});
