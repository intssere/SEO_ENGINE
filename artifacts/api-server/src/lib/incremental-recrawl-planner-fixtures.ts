import assert from "node:assert/strict";
import { planFirstPartyCrawl } from "./crawl-controller.js";
import { buildSitemapInventory, type SitemapInventoryPolicy } from "./sitemap-inventory.js";
import {
  advanceCrawlCheckpoint,
  createInitialCrawlCheckpoint,
  planFullSiteCrawlExecution,
  type FullSiteExecutionPolicy,
  type SuppliedCrawlUrlOutcome,
} from "./full-site-crawl-control.js";
import { buildFullSiteCrawlCertification } from "./full-site-crawl-certification.js";

function sitemapPolicy(maxInventoryUrls = 20): SitemapInventoryPolicy {
  return {
    maxDocuments: 10,
    maxDepth: 3,
    maxDocumentBytes: 20_000,
    maxInventoryUrls,
    maxPathSegments: 20,
  };
}

function executionPolicy(): FullSiteExecutionPolicy {
  return {
    batchSize: 20,
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

export function buildIncrementalRecrawlTestSource(input: {
  siteId?: string;
  canonicalOrigin?: string;
  entries: Array<{ path: string; lastmod?: string }>;
  failurePath?: string;
}) {
  const siteId = input.siteId ?? "diamond-shelf";
  const canonicalOrigin = input.canonicalOrigin ?? "https://diamondshelf.us";
  const plan = planFirstPartyCrawl(
    {
      mode: "full_site",
      target: { targetClass: "first_party", siteId, canonicalOrigin },
      hardPageLimit: 20,
    },
    { absolutePageCeiling: 1_000 },
  );
  const body = input.entries
    .map(({ path, lastmod }) => `<url><loc>${canonicalOrigin}${path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`)
    .join("");
  const inventory = buildSitemapInventory({
    plan,
    rootSitemapUrl: `${canonicalOrigin}/sitemap.xml`,
    documents: [{ url: `${canonicalOrigin}/sitemap.xml`, xml: `<urlset>${body}</urlset>` }],
    policy: sitemapPolicy(),
  });
  const executionPlan = planFullSiteCrawlExecution(plan, inventory, executionPolicy());
  const initial = createInitialCrawlCheckpoint(executionPlan);
  assert.ok(initial.activeBatchId);
  assert.ok(initial.nextAttempt);
  const outcomes: SuppliedCrawlUrlOutcome[] = inventory.inventory.entries.map((entry) => {
    if (input.failurePath && entry.canonicalUrl === `${canonicalOrigin}${input.failurePath}`) {
      return { canonicalUrl: entry.canonicalUrl, kind: "failure", signal: { kind: "http_status", httpStatus: 404 } };
    }
    return { canonicalUrl: entry.canonicalUrl, kind: "success" };
  });
  const checkpoint = advanceCrawlCheckpoint(executionPlan, initial, {
    expectedCheckpointFingerprint: initial.fingerprint,
    batchId: initial.activeBatchId,
    attempt: initial.nextAttempt,
    outcomes,
  });
  const certification = buildFullSiteCrawlCertification({ crawlPlan: plan, inventory, executionPlan, checkpoint });
  return { inventory, certification };
}
