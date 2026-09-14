export const BASELINE_CRAWL_POLICY = Object.freeze({
  pageHardLimit: 30,
  depthLimit: 2,
} as const);

export const CRAWL_COMPLETION_LEDGER_FIELDS = Object.freeze([
  "discovered",
  "eligible",
  "fetchedSuccessful",
  "redirects",
  "canonicalizedDeduplicated",
  "robotsExcluded",
  "noindex",
  "failed",
  "pending",
  "coveragePercent",
  "hardLimitState",
  "wholeSiteCertified",
  "wholeSiteReason",
] as const);

export type CrawlMode = "baseline" | "full_site";

export type FirstPartyCrawlTarget = {
  targetClass: "first_party";
  siteId: string;
  canonicalOrigin: string;
};

export type NonFirstPartyCrawlTarget = {
  targetClass: "competitor" | "external";
  targetId: string;
  canonicalOrigin: string;
};

export type CrawlControllerTarget = FirstPartyCrawlTarget | NonFirstPartyCrawlTarget;

export type CrawlControllerRequest = {
  mode: CrawlMode;
  target: CrawlControllerTarget;
  /** Full-site only. Baseline limits are fixed and cannot be overridden. */
  hardPageLimit?: number;
};

export type FullSitePlanningPolicy = {
  /** Independent deployment/configuration ceiling. It is not an execution grant. */
  absolutePageCeiling: number;
};

export type CrawlControllerPlan = {
  version: "first_party_crawl_controller_v1";
  mode: CrawlMode;
  target: {
    targetClass: "first_party";
    siteId: string;
    canonicalOrigin: string;
  };
  limits: {
    pageHardLimit: number;
    absolutePageCeiling: number;
    depth: number | "inventory_driven";
    unlimited: false;
  };
  inventory: {
    strategy: "bounded_link_bfs" | "sitemap_first";
    sitemapDiscoveryRequired: boolean;
    internalLinkSupplement: boolean;
  };
  controls: {
    sameOriginOnly: true;
    allowedMethods: readonly ["GET"];
    robotsEnforcement: "required";
    canonicalDeduplication: "observe_only" | "required_before_execution";
    queryTrapControls: "strip_all_query" | "required_before_execution";
    boundedBatching: "not_applicable" | "required_before_execution";
    concurrencyLimit: "sequential" | "required_before_execution";
    perOriginRateLimit: "not_applicable" | "required_before_execution";
    checkpointResume: "not_applicable" | "required_before_execution";
  };
  completionLedger: {
    required: boolean;
    fields: typeof CRAWL_COMPLETION_LEDGER_FIELDS;
  };
  authorization: {
    controllerExecutionEnabled: false;
    persistenceAuthorized: false;
    schedulerEnabled: false;
    autonomousWorkerEnabled: false;
    retryLoopEnabled: false;
    competitorCollectionAuthorized: false;
    competitorPersistenceAuthorized: false;
    providerWrites: false;
    publicSiteWrites: false;
  };
};

function requireFinitePositiveInteger(value: number, code: string): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) throw new Error(code);
  return value;
}

function normalizeCanonicalOrigin(value: string): string {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") throw new Error("crawl_origin_must_be_https");
    if (url.username || url.password) throw new Error("crawl_origin_credentials_not_allowed");
    return url.origin;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("crawl_origin_")) throw error;
    throw new Error("crawl_origin_invalid");
  }
}

function requireFirstPartyTarget(target: CrawlControllerTarget): CrawlControllerPlan["target"] {
  if (target.targetClass !== "first_party") throw new Error("crawl_full_site_first_party_only");
  const siteId = target.siteId.trim();
  if (!siteId) throw new Error("crawl_site_id_required");
  return {
    targetClass: "first_party",
    siteId,
    canonicalOrigin: normalizeCanonicalOrigin(target.canonicalOrigin),
  };
}

function authorizationBoundary(): CrawlControllerPlan["authorization"] {
  return {
    controllerExecutionEnabled: false,
    persistenceAuthorized: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    competitorCollectionAuthorized: false,
    competitorPersistenceAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
  };
}

export function planFirstPartyCrawl(
  request: CrawlControllerRequest,
  fullSitePolicy?: FullSitePlanningPolicy,
): CrawlControllerPlan {
  const target = requireFirstPartyTarget(request.target);

  if (request.mode === "baseline") {
    if (request.hardPageLimit !== undefined) throw new Error("crawl_baseline_limits_are_fixed");
    return {
      version: "first_party_crawl_controller_v1",
      mode: "baseline",
      target,
      limits: {
        pageHardLimit: BASELINE_CRAWL_POLICY.pageHardLimit,
        absolutePageCeiling: BASELINE_CRAWL_POLICY.pageHardLimit,
        depth: BASELINE_CRAWL_POLICY.depthLimit,
        unlimited: false,
      },
      inventory: {
        strategy: "bounded_link_bfs",
        sitemapDiscoveryRequired: false,
        internalLinkSupplement: false,
      },
      controls: {
        sameOriginOnly: true,
        allowedMethods: ["GET"],
        robotsEnforcement: "required",
        canonicalDeduplication: "observe_only",
        queryTrapControls: "strip_all_query",
        boundedBatching: "not_applicable",
        concurrencyLimit: "sequential",
        perOriginRateLimit: "not_applicable",
        checkpointResume: "not_applicable",
      },
      completionLedger: {
        required: false,
        fields: CRAWL_COMPLETION_LEDGER_FIELDS,
      },
      authorization: authorizationBoundary(),
    };
  }

  if (!fullSitePolicy) throw new Error("crawl_full_site_policy_required");
  const absolutePageCeiling = requireFinitePositiveInteger(
    fullSitePolicy.absolutePageCeiling,
    "crawl_full_site_absolute_ceiling_invalid",
  );
  if (request.hardPageLimit === undefined) throw new Error("crawl_full_site_hard_page_limit_required");
  const pageHardLimit = requireFinitePositiveInteger(
    request.hardPageLimit,
    "crawl_full_site_hard_page_limit_invalid",
  );
  if (pageHardLimit > absolutePageCeiling) throw new Error("crawl_full_site_hard_page_limit_exceeds_ceiling");

  return {
    version: "first_party_crawl_controller_v1",
    mode: "full_site",
    target,
    limits: {
      pageHardLimit,
      absolutePageCeiling,
      depth: "inventory_driven",
      unlimited: false,
    },
    inventory: {
      strategy: "sitemap_first",
      sitemapDiscoveryRequired: true,
      internalLinkSupplement: true,
    },
    controls: {
      sameOriginOnly: true,
      allowedMethods: ["GET"],
      robotsEnforcement: "required",
      canonicalDeduplication: "required_before_execution",
      queryTrapControls: "required_before_execution",
      boundedBatching: "required_before_execution",
      concurrencyLimit: "required_before_execution",
      perOriginRateLimit: "required_before_execution",
      checkpointResume: "required_before_execution",
    },
    completionLedger: {
      required: true,
      fields: CRAWL_COMPLETION_LEDGER_FIELDS,
    },
    authorization: authorizationBoundary(),
  };
}
