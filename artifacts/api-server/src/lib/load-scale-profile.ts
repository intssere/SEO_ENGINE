import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

import { planFirstPartyCrawl } from "./crawl-controller.js";
import {
  FULL_SITE_EXECUTION_ABSOLUTE_LIMITS,
  planFullSiteCrawlExecution,
} from "./full-site-crawl-control.js";
import {
  buildSitemapInventory,
  SITEMAP_INVENTORY_ABSOLUTE_LIMITS,
} from "./sitemap-inventory.js";
import { queryUrlExplorer } from "./url-explorer-query-model.js";
import {
  generateOpportunityCandidates,
  type CrawlPageSignal,
  type GscPageQuerySignal,
} from "./opportunity-engine.js";
import {
  buildReadQueueProjection,
  MAX_READ_SCHEDULES_PER_PROJECTION,
  normalizeReadScheduleDefinition,
} from "./read-scheduler-queue.js";
import {
  P11_10_LOAD_SCALE_TARGETS,
  certifyLoadScale,
  loadScaleCapability,
  loadScaleFingerprint,
  type P1110ScaleObservation,
} from "./load-scale-certification.js";

const SITE_ID = "p11-10-scale-site";
const ORIGIN = "https://scale.example";
const ROOT_SITEMAP = ORIGIN + "/sitemap.xml";

function timed<T>(
  scenario: P1110ScaleObservation["scenario"],
  inputRows: number,
  work: () => { result: T; outputRows: number; correctness: unknown },
): { result: T; observation: P1110ScaleObservation } {
  const startedAt = performance.now();
  const value = work();
  const elapsedMs = performance.now() - startedAt;
  const heapUsedBytes = process.memoryUsage().heapUsed;
  return {
    result: value.result,
    observation: {
      scenario,
      inputRows,
      outputRows: value.outputRows,
      elapsedMs,
      heapUsedBytes,
      correctnessFingerprint: loadScaleFingerprint(value.correctness),
    },
  };
}

function padded(index: number): string {
  return String(index).padStart(5, "0");
}

function buildScaleSitemapXml(count: number): string {
  const rows = new Array<string>(count);
  for (let index = 0; index < count; index += 1) {
    rows[index] =
      "<url><loc>" +
      ORIGIN +
      "/products/item-" +
      padded(index) +
      "</loc><lastmod>2026-09-20</lastmod></url>";
  }
  return '<?xml version="1.0" encoding="UTF-8"?><urlset>' + rows.join("") + "</urlset>";
}

const crawlPlan = planFirstPartyCrawl(
  {
    mode: "full_site",
    hardPageLimit: P11_10_LOAD_SCALE_TARGETS.urlsPerSite,
    target: {
      targetClass: "first_party",
      siteId: SITE_ID,
      canonicalOrigin: ORIGIN,
    },
  },
  { absolutePageCeiling: P11_10_LOAD_SCALE_TARGETS.urlsPerSite },
);

const sitemapXml = buildScaleSitemapXml(P11_10_LOAD_SCALE_TARGETS.urlsPerSite);

const inventoryRun = timed(
  "sitemap_inventory",
  P11_10_LOAD_SCALE_TARGETS.urlsPerSite,
  () => {
    const inventory = buildSitemapInventory({
      plan: crawlPlan,
      rootSitemapUrl: ROOT_SITEMAP,
      documents: [{ url: ROOT_SITEMAP, xml: sitemapXml }],
      policy: {
        maxDocuments: 1,
        maxDepth: 0,
        maxDocumentBytes: SITEMAP_INVENTORY_ABSOLUTE_LIMITS.documentBytes,
        maxInventoryUrls: P11_10_LOAD_SCALE_TARGETS.urlsPerSite,
        maxPathSegments: SITEMAP_INVENTORY_ABSOLUTE_LIMITS.pathSegments,
      },
    });
    assert.equal(inventory.completeness.complete, true);
    assert.equal(inventory.completeness.hardLimitReached, false);
    assert.equal(
      inventory.inventory.uniqueUrls,
      P11_10_LOAD_SCALE_TARGETS.urlsPerSite,
    );
    assert.equal(inventory.inventory.duplicateOccurrences, 0);
    return {
      result: inventory,
      outputRows: inventory.inventory.uniqueUrls,
      correctness: {
        fingerprint: inventory.fingerprint,
        uniqueUrls: inventory.inventory.uniqueUrls,
        acceptedOccurrences: inventory.inventory.acceptedOccurrences,
        duplicateOccurrences: inventory.inventory.duplicateOccurrences,
        firstUrl: inventory.inventory.entries[0]?.canonicalUrl ?? null,
        lastUrl: inventory.inventory.entries.at(-1)?.canonicalUrl ?? null,
      },
    };
  },
);

const executionRun = timed(
  "crawl_execution_plan",
  inventoryRun.result.inventory.uniqueUrls,
  () => {
    const plan = planFullSiteCrawlExecution(crawlPlan, inventoryRun.result, {
      batchSize: P11_10_LOAD_SCALE_TARGETS.crawlBatchSize,
      concurrency: FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.concurrency,
      requestsPerMinute: FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.requestsPerMinute,
      requestTimeoutMs: FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.requestTimeoutMs,
      maxRedirectsPerRequest:
        FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.redirectsPerRequest,
      maxAttemptsPerUrl: FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.attemptsPerUrl,
      retryBaseDelayMs:
        FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.retryBaseDelayMs,
      retryMaxDelayMs: FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.retryMaxDelayMs,
      maxUrlLength: FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.urlLength,
      maxPathSegments: FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.pathSegments,
      maxRepeatedPathSegmentRun:
        FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.repeatedPathSegmentRun,
    });
    assert.equal(
      plan.batches.length,
      P11_10_LOAD_SCALE_TARGETS.expectedCrawlBatches,
    );
    assert.equal(
      plan.batches.reduce((sum, batch) => sum + batch.canonicalUrls.length, 0),
      P11_10_LOAD_SCALE_TARGETS.urlsPerSite,
    );
    assert.equal(plan.authorization.networkExecutionEnabled, false);
    return {
      result: plan,
      outputRows: plan.batches.length,
      correctness: {
        fingerprint: plan.fingerprint,
        batches: plan.batches.length,
        firstBatch: plan.batches[0]?.fingerprint ?? null,
        lastBatch: plan.batches.at(-1)?.fingerprint ?? null,
        urls:
          plan.batches.reduce(
            (sum, batch) => sum + batch.canonicalUrls.length,
            0,
          ),
      },
    };
  },
);

const explorerRun = timed(
  "url_explorer",
  inventoryRun.result.inventory.uniqueUrls,
  () => {
    const result = queryUrlExplorer({
      siteId: SITE_ID,
      canonicalOrigin: ORIGIN,
      inventory: inventoryRun.result,
      query: {
        sort: { field: "canonicalUrl", direction: "desc" },
        page: {
          offset: 0,
          limit: P11_10_LOAD_SCALE_TARGETS.urlExplorerPageSize,
        },
      },
    });
    assert.equal(
      result.page.totalMatched,
      P11_10_LOAD_SCALE_TARGETS.urlsPerSite,
    );
    assert.equal(
      result.page.returned,
      P11_10_LOAD_SCALE_TARGETS.urlExplorerPageSize,
    );
    assert.equal(result.authorization.networkExecutionEnabled, false);
    return {
      result,
      outputRows: result.rows.length,
      correctness: {
        fingerprint: result.fingerprint,
        totalMatched: result.page.totalMatched,
        returned: result.page.returned,
        firstUrl: result.rows[0]?.canonicalUrl ?? null,
        lastUrl: result.rows.at(-1)?.canonicalUrl ?? null,
      },
    };
  },
);

const crawlPages: CrawlPageSignal[] = new Array(
  P11_10_LOAD_SCALE_TARGETS.urlsPerSite,
);
for (let index = 0; index < crawlPages.length; index += 1) {
  const suffix = padded(index);
  crawlPages[index] = {
    pageId: "page-" + suffix,
    url: ORIGIN + "/products/item-" + suffix,
    indexable: true,
    title: "Scale product " + suffix,
    description: null,
    h1: "Scale product " + suffix,
    contentText: "bounded synthetic scale fixture",
    links: [],
    evidenceId: "evidence-" + suffix,
  };
}

const gscSignals: GscPageQuerySignal[] = new Array(
  P11_10_LOAD_SCALE_TARGETS.querySignalsPerSite,
);
for (let index = 0; index < gscSignals.length; index += 1) {
  const pageIndex = index % P11_10_LOAD_SCALE_TARGETS.urlsPerSite;
  const suffix = padded(pageIndex);
  const materialize =
    index < P11_10_LOAD_SCALE_TARGETS.maxMaterializedOpportunityCandidates;
  gscSignals[index] = {
    pageId: "page-" + suffix,
    queryId: "query-" + String(index).padStart(6, "0"),
    query: "scale query " + index,
    url: ORIGIN + "/products/item-" + suffix,
    clicks: materialize ? 5 : 0,
    impressions: materialize ? 100 : 1,
    ctr: materialize ? 0.05 : 0,
    position: materialize ? 15 : 1,
  };
}

const opportunityRun = timed(
  "opportunity_engine",
  gscSignals.length,
  () => {
    const candidates = generateOpportunityCandidates({
      pilotReady: true,
      aggregateAvailable: true,
      reconciliation: "consistent",
      crawl: {
        fetched: P11_10_LOAD_SCALE_TARGETS.urlsPerSite,
        discovered: P11_10_LOAD_SCALE_TARGETS.urlsPerSite,
        boundedLimit: P11_10_LOAD_SCALE_TARGETS.urlsPerSite,
        truncated: false,
      },
      gsc: gscSignals,
      crawlPages,
      technicalFindings: [],
    });
    assert.equal(gscSignals.length, P11_10_LOAD_SCALE_TARGETS.querySignalsPerSite);
    assert.equal(
      candidates.length,
      P11_10_LOAD_SCALE_TARGETS.maxMaterializedOpportunityCandidates,
    );
    assert.ok(
      candidates.every(
        (candidate) => candidate.opportunityType === "striking_distance",
      ),
    );
    return {
      result: candidates,
      outputRows: candidates.length,
      correctness: {
        count: candidates.length,
        first: candidates[0]
          ? {
              key: candidates[0].generationKey,
              score: candidates[0].score,
            }
          : null,
        last: candidates.at(-1)
          ? {
              key: candidates.at(-1)!.generationKey,
              score: candidates.at(-1)!.score,
            }
          : null,
        allKeysFingerprint: loadScaleFingerprint(
          candidates.map((candidate) => [
            candidate.generationKey,
            candidate.score,
          ]),
        ),
      },
    };
  },
);

const schedules = Array.from(
  { length: P11_10_LOAD_SCALE_TARGETS.readSchedulesPerProjection },
  (_, index) => ({
    schedule: normalizeReadScheduleDefinition({
      key: "scale-" + String(index).padStart(3, "0"),
      workClass: index % 2 === 0 ? "crawl_refresh" : "signal_refresh",
      scopeFingerprint: loadScaleFingerprint({ scope: index }),
      upstreamLineageFingerprint: loadScaleFingerprint({ upstream: index }),
      startAt: "2026-09-21T00:00:00.000Z",
      cadenceMinutes: 60,
      dueWindowMinutes: 60,
      paused: false,
    }),
  }),
);

const schedulerRun = timed(
  "read_scheduler",
  schedules.length,
  () => {
    assert.equal(
      schedules.length,
      MAX_READ_SCHEDULES_PER_PROJECTION,
    );
    const projection = buildReadQueueProjection({
      schedules,
      now: "2026-09-21T00:30:00.000Z",
    });
    assert.equal(
      projection.counts.schedules,
      P11_10_LOAD_SCALE_TARGETS.readSchedulesPerProjection,
    );
    assert.equal(
      projection.counts.intents,
      P11_10_LOAD_SCALE_TARGETS.readSchedulesPerProjection,
    );
    assert.equal(projection.semantics.schedulerActivated, false);
    return {
      result: projection,
      outputRows: projection.counts.schedules,
      correctness: {
        fingerprint: projection.projectionFingerprint,
        counts: projection.counts,
        firstSchedule: projection.evaluations[0]?.scheduleFingerprint ?? null,
        lastSchedule: projection.evaluations.at(-1)?.scheduleFingerprint ?? null,
      },
    };
  },
);

const observations = [
  inventoryRun.observation,
  executionRun.observation,
  explorerRun.observation,
  opportunityRun.observation,
  schedulerRun.observation,
];

const certification = certifyLoadScale(observations);

assert.equal(
  P11_10_LOAD_SCALE_TARGETS.providerKeywordRequestMax,
  50,
  "P11.10 must not raise the existing DataForSEO request contract",
);
assert.equal(loadScaleCapability().productionLoadAuthorized, false);
assert.equal(loadScaleCapability().providerLoadAuthorized, false);
assert.equal(loadScaleCapability().productionDatabaseBenchmarkAuthorized, false);
assert.equal(loadScaleCapability().schedulerActivationAuthorized, false);
assert.equal(loadScaleCapability().workerActivationAuthorized, false);
assert.equal(loadScaleCapability().deploymentAuthorized, false);
assert.equal(loadScaleCapability().publicationAuthorized, false);

const diagnostics = {
  version: certification.version,
  certifiedSynthetic: certification.certifiedSynthetic,
  certificationFingerprint: certification.certificationFingerprint,
  targets: certification.targets,
  budgets: certification.budgets,
  combinedElapsedMs: certification.combinedElapsedMs,
  scenarios: certification.scenarios.map((scenario) => ({
    scenario: scenario.scenario,
    inputRows: scenario.inputRows,
    outputRows: scenario.outputRows,
    elapsedMs: scenario.elapsedMs,
    heapUsedMiB:
      scenario.heapUsedBytes === null
        ? null
        : Number((scenario.heapUsedBytes / (1024 * 1024)).toFixed(2)),
    passed: scenario.passed,
    blockers: scenario.blockers,
    correctnessFingerprint: scenario.correctnessFingerprint,
  })),
  safety: certification.safety,
};

console.log("P11_10_SCALE_PROFILE " + JSON.stringify(diagnostics));

if (!certification.certifiedSynthetic) {
  throw new Error(
    "p11_10_scale_certification_failed:" +
      certification.scenarios
        .flatMap((scenario) =>
          scenario.blockers.map(
            (blocker) => scenario.scenario + ":" + blocker,
          ),
        )
        .join(","),
  );
}
