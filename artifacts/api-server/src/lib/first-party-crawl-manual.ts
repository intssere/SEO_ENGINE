import {
  DIAMOND_SHELF_CANONICAL_ORIGIN,
  runFullSiteCrawlBridge,
  runIncrementalCrawlBridge,
  type FullSiteCrawlBridgeRunInput,
  type IncrementalCrawlBridgeRunInput,
} from "./first-party-crawl-runtime-bridge.js";
import {
  FULL_SITE_EXECUTION_ABSOLUTE_LIMITS,
  type FullSiteExecutionPolicy,
} from "./full-site-crawl-control.js";
import {
  SITEMAP_INVENTORY_ABSOLUTE_LIMITS,
  type SitemapInventoryPolicy,
} from "./sitemap-inventory.js";
import { INCREMENTAL_RECRAWL_ABSOLUTE_LIMITS } from "./incremental-recrawl-planner.js";
import {
  DIAMOND_SHELF_SITE_ID,
  P12_2_ABSOLUTE_TRANSIENT_PAGE_BYTES,
  P12_2_DEFAULT_TRANSIENT_PAGE_BYTES,
  createFirstPartyPageTransport,
  createFirstPartyRobotsEvaluator,
  createFirstPartySitemapAcquirer,
  firstPartyCrawlClock,
  firstPartyLiveAdapterCapability,
  type FirstPartyLiveAdapterOptions,
} from "./first-party-live-adapters.js";
import {
  FirstPartyCrawlPersistence,
  firstPartyCrawlPersistenceCapability,
} from "./first-party-crawl-persistence.js";

export const P12_2_OPERATION = "P12_2_LIVE_CRAWL" as const;
export const P12_2_EXECUTION_CONFIRMATION =
  "AUTHORIZE:P12_2_LIVE_CRAWL:eb1da9ee-539c-4200-8f04-f64ccaea7768" as const;
export const P12_2_MAX_PAGE_CEILING = 25_000;

export type P12_2IncrementalLimits = {
  maxPlanUrls: number;
  batchSize: number;
};

export type P12_2ManualLimits = {
  hardPageLimit: number;
  absolutePageCeiling: number;
  sitemapPolicy: SitemapInventoryPolicy;
  executionPolicy: FullSiteExecutionPolicy;
  incremental: P12_2IncrementalLimits;
  maxTransientPageBytes: number;
};

export type P12_2ManualConfig = {
  siteId: string;
  canonicalOrigin: string;
  rootSitemapUrl: string;
  confirmation: string;
  networkReady: boolean;
  liveExecutionAuthorized: boolean;
  persistenceReady: boolean;
  persistenceAuthorized: boolean;
  limits: P12_2ManualLimits;
};

export type P12_2ManualInspection = {
  version: "p12-2-manual-runtime-v1";
  operation: typeof P12_2_OPERATION;
  siteId: typeof DIAMOND_SHELF_SITE_ID;
  canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  configured: boolean;
  confirmationValid: boolean;
  networkReady: boolean;
  liveExecutionAuthorized: boolean;
  persistenceReady: boolean;
  persistenceAuthorized: boolean;
  executable: boolean;
  schedulerEnabled: false;
  autonomousWorkerEnabled: false;
  providerWrites: false;
  publicSiteWrites: false;
  deploymentAuthorized: false;
  publicationAuthorized: false;
  executed: false;
};

export type P12_2ManualDependencies = {
  databaseUrl?: string | null;
  liveAdapterOptions?: Omit<FirstPartyLiveAdapterOptions, "maxTransientPageBytes">;
};

function positiveInt(value: number, max: number, code: string): number {
  if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(code);
  return value;
}

function nonNegativeInt(value: number, max: number, code: string): number {
  if (!Number.isInteger(value) || value < 0 || value > max) throw new Error(code);
  return value;
}

function validateRootSitemap(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("p12_2_manual_root_sitemap_invalid");
  }
  if (
    url.protocol !== "https:" ||
    url.origin !== DIAMOND_SHELF_CANONICAL_ORIGIN ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) throw new Error("p12_2_manual_root_sitemap_invalid");
  return url.toString();
}

function validateLimits(limits: P12_2ManualLimits): void {
  positiveInt(limits.hardPageLimit, P12_2_MAX_PAGE_CEILING, "p12_2_manual_hard_page_limit_invalid");
  positiveInt(limits.absolutePageCeiling, P12_2_MAX_PAGE_CEILING, "p12_2_manual_absolute_page_ceiling_invalid");
  if (limits.hardPageLimit > limits.absolutePageCeiling) {
    throw new Error("p12_2_manual_page_limit_order_invalid");
  }

  positiveInt(limits.sitemapPolicy.maxDocuments, SITEMAP_INVENTORY_ABSOLUTE_LIMITS.documents, "p12_2_manual_sitemap_documents_invalid");
  nonNegativeInt(limits.sitemapPolicy.maxDepth, SITEMAP_INVENTORY_ABSOLUTE_LIMITS.depth, "p12_2_manual_sitemap_depth_invalid");
  positiveInt(limits.sitemapPolicy.maxDocumentBytes, SITEMAP_INVENTORY_ABSOLUTE_LIMITS.documentBytes, "p12_2_manual_sitemap_bytes_invalid");
  positiveInt(limits.sitemapPolicy.maxInventoryUrls, SITEMAP_INVENTORY_ABSOLUTE_LIMITS.inventoryUrls, "p12_2_manual_sitemap_inventory_invalid");
  positiveInt(limits.sitemapPolicy.maxPathSegments, SITEMAP_INVENTORY_ABSOLUTE_LIMITS.pathSegments, "p12_2_manual_sitemap_path_segments_invalid");
  if (limits.sitemapPolicy.maxInventoryUrls > limits.hardPageLimit) {
    throw new Error("p12_2_manual_sitemap_inventory_exceeds_page_limit");
  }

  const policy = limits.executionPolicy;
  positiveInt(policy.batchSize, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.batchSize, "p12_2_manual_batch_size_invalid");
  positiveInt(policy.concurrency, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.concurrency, "p12_2_manual_concurrency_invalid");
  positiveInt(policy.requestsPerMinute, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.requestsPerMinute, "p12_2_manual_rate_invalid");
  positiveInt(policy.requestTimeoutMs, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.requestTimeoutMs, "p12_2_manual_timeout_invalid");
  nonNegativeInt(policy.maxRedirectsPerRequest, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.redirectsPerRequest, "p12_2_manual_redirects_invalid");
  positiveInt(policy.maxAttemptsPerUrl, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.attemptsPerUrl, "p12_2_manual_attempts_invalid");
  positiveInt(policy.retryBaseDelayMs, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.retryBaseDelayMs, "p12_2_manual_retry_base_invalid");
  positiveInt(policy.retryMaxDelayMs, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.retryMaxDelayMs, "p12_2_manual_retry_max_invalid");
  positiveInt(policy.maxUrlLength, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.urlLength, "p12_2_manual_url_length_invalid");
  positiveInt(policy.maxPathSegments, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.pathSegments, "p12_2_manual_path_segments_invalid");
  positiveInt(policy.maxRepeatedPathSegmentRun, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.repeatedPathSegmentRun, "p12_2_manual_repeated_segment_invalid");
  if (policy.batchSize > limits.hardPageLimit || policy.concurrency > policy.batchSize) {
    throw new Error("p12_2_manual_execution_shape_invalid");
  }
  if (policy.retryMaxDelayMs < policy.retryBaseDelayMs) {
    throw new Error("p12_2_manual_retry_order_invalid");
  }

  positiveInt(limits.incremental.maxPlanUrls, INCREMENTAL_RECRAWL_ABSOLUTE_LIMITS.urls, "p12_2_manual_incremental_urls_invalid");
  positiveInt(limits.incremental.batchSize, INCREMENTAL_RECRAWL_ABSOLUTE_LIMITS.batchSize, "p12_2_manual_incremental_batch_invalid");
  if (limits.incremental.batchSize > limits.incremental.maxPlanUrls) {
    throw new Error("p12_2_manual_incremental_shape_invalid");
  }

  positiveInt(
    limits.maxTransientPageBytes,
    P12_2_ABSOLUTE_TRANSIENT_PAGE_BYTES,
    "p12_2_manual_transient_page_bytes_invalid",
  );
}

function validateConfig(config: P12_2ManualConfig): void {
  if (config.siteId !== DIAMOND_SHELF_SITE_ID) throw new Error("p12_2_manual_site_id_mismatch");
  if (config.canonicalOrigin !== DIAMOND_SHELF_CANONICAL_ORIGIN) throw new Error("p12_2_manual_origin_mismatch");
  validateRootSitemap(config.rootSitemapUrl);
  validateLimits(config.limits);
}

export function inspectP12_2Manual(config: P12_2ManualConfig): P12_2ManualInspection {
  validateConfig(config);
  const confirmationValid = config.confirmation === P12_2_EXECUTION_CONFIRMATION;
  const configured = true;
  const executable =
    confirmationValid &&
    config.networkReady === true &&
    config.liveExecutionAuthorized === true &&
    config.persistenceReady === true &&
    config.persistenceAuthorized === true;

  return Object.freeze({
    version: "p12-2-manual-runtime-v1",
    operation: P12_2_OPERATION,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    configured,
    confirmationValid,
    networkReady: config.networkReady === true,
    liveExecutionAuthorized: config.liveExecutionAuthorized === true,
    persistenceReady: config.persistenceReady === true,
    persistenceAuthorized: config.persistenceAuthorized === true,
    executable,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    deploymentAuthorized: false,
    publicationAuthorized: false,
    executed: false,
  });
}

function requireExecutable(config: P12_2ManualConfig): void {
  const readiness = inspectP12_2Manual(config);
  if (!readiness.confirmationValid) throw new Error("p12_2_manual_confirmation_required");
  if (!readiness.networkReady) throw new Error("p12_2_manual_network_not_ready");
  if (!readiness.liveExecutionAuthorized) throw new Error("p12_2_manual_execution_not_authorized");
  if (!readiness.persistenceReady) throw new Error("p12_2_manual_persistence_not_ready");
  if (!readiness.persistenceAuthorized) throw new Error("p12_2_manual_persistence_not_authorized");
}

function compose(config: P12_2ManualConfig, dependencies: P12_2ManualDependencies) {
  requireExecutable(config);
  const adapterOptions: FirstPartyLiveAdapterOptions = {
    ...(dependencies.liveAdapterOptions ?? {}),
    maxTransientPageBytes: config.limits.maxTransientPageBytes,
  };
  return {
    sitemapAcquirer: createFirstPartySitemapAcquirer(adapterOptions),
    robotsEvaluator: createFirstPartyRobotsEvaluator(adapterOptions),
    pageTransport: createFirstPartyPageTransport(adapterOptions),
    clock: firstPartyCrawlClock,
    persistence: new FirstPartyCrawlPersistence({ databaseUrl: dependencies.databaseUrl }),
    networkReady: true,
    liveExecutionAuthorized: true,
    persistenceReady: true,
    persistenceAuthorized: true,
  } as const;
}

export async function executeP12_2FullCrawl(input: {
  config: P12_2ManualConfig;
  dependencies: P12_2ManualDependencies;
  runId: string;
  observedAt: string;
  resumeCheckpoint?: FullSiteCrawlBridgeRunInput["resumeCheckpoint"];
  compareToPrevious?: boolean;
}) {
  const { config } = input;
  const options = compose(config, input.dependencies);
  return runFullSiteCrawlBridge({
    runId: input.runId,
    observedAt: input.observedAt,
    binding: {
      siteId: DIAMOND_SHELF_SITE_ID,
      canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
      rootSitemapUrl: validateRootSitemap(config.rootSitemapUrl),
    },
    hardPageLimit: config.limits.hardPageLimit,
    absolutePageCeiling: config.limits.absolutePageCeiling,
    sitemapPolicy: config.limits.sitemapPolicy,
    executionPolicy: config.limits.executionPolicy,
    resumeCheckpoint: input.resumeCheckpoint,
    compareToPrevious: input.compareToPrevious,
  }, options);
}

export async function executeP12_2IncrementalCrawl(input: {
  config: P12_2ManualConfig;
  dependencies: P12_2ManualDependencies;
  run: IncrementalCrawlBridgeRunInput;
}) {
  const options = compose(input.config, input.dependencies);
  if (input.run.plan.limits.maxPlanUrls > input.config.limits.incremental.maxPlanUrls) {
    throw new Error("p12_2_manual_incremental_plan_exceeds_selected_limit");
  }
  if (input.run.plan.limits.batchSize > input.config.limits.incremental.batchSize) {
    throw new Error("p12_2_manual_incremental_batch_exceeds_selected_limit");
  }
  return runIncrementalCrawlBridge(input.run, options);
}

export function defaultP12_2InspectionConfig(): P12_2ManualConfig {
  return {
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    rootSitemapUrl: DIAMOND_SHELF_CANONICAL_ORIGIN + "/sitemap.xml",
    confirmation: "",
    networkReady: false,
    liveExecutionAuthorized: false,
    persistenceReady: false,
    persistenceAuthorized: false,
    limits: {
      hardPageLimit: 30,
      absolutePageCeiling: P12_2_MAX_PAGE_CEILING,
      sitemapPolicy: {
        maxDocuments: 100,
        maxDepth: 4,
        maxDocumentBytes: 5_000_000,
        maxInventoryUrls: 30,
        maxPathSegments: 32,
      },
      executionPolicy: {
        batchSize: 10,
        concurrency: 1,
        requestsPerMinute: 30,
        requestTimeoutMs: 10_000,
        maxRedirectsPerRequest: 3,
        maxAttemptsPerUrl: 3,
        retryBaseDelayMs: 10_000,
        retryMaxDelayMs: 60_000,
        maxUrlLength: 2_048,
        maxPathSegments: 32,
        maxRepeatedPathSegmentRun: 3,
      },
      incremental: {
        maxPlanUrls: 30,
        batchSize: 10,
      },
      maxTransientPageBytes: P12_2_DEFAULT_TRANSIENT_PAGE_BYTES,
    },
  };
}

export function p12_2ManualCapability() {
  return Object.freeze({
    operation: P12_2_OPERATION,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    confirmationRequired: true,
    exactConfirmation: P12_2_EXECUTION_CONFIRMATION,
    liveAdapters: firstPartyLiveAdapterCapability(),
    persistence: firstPartyCrawlPersistenceCapability(),
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    deploymentAuthorized: false,
    publicationAuthorized: false,
  });
}
