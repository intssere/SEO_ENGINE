import { evaluateDiamondShelfBaseline, type BaselineInput, type BaselineSummary } from "@seo-engine/pilot-baseline";

export const LIVE_BASELINE_SITE = "diamondshelf.us" as const;

export interface LiveActivationEvidence {
  ready: boolean;
  siteDomain: string;
  shopDomain?: string;
  gscProperty?: string;
  ga4PropertyId?: string;
  seoProvider?: string;
  checkedAt?: string;
}

export interface LiveBaselineObservation extends BaselineInput {
  observedAt: string;
  sourceRunId: string;
  crawlHardLimit: number;
  publicSiteWritesEnabled?: boolean;
}

export interface LiveBaselineRunResult {
  status: "blocked" | "partial" | "ready";
  blockers: string[];
  baseline: BaselineSummary | null;
  sourceRunId: string | null;
  observedAt: string | null;
  wholeSiteClaimAllowed: boolean;
  writesObservedEnabled: boolean;
}

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

function nonNegativeInteger(value: number, field: string, blockers: string[]): void {
  if (!Number.isInteger(value) || value < 0) blockers.push(`${field} must be a non-negative integer`);
}

export function evaluateLiveBaselineRun(
  activation: LiveActivationEvidence,
  observation: LiveBaselineObservation,
): LiveBaselineRunResult {
  const blockers: string[] = [];
  const siteDomain = clean(activation.siteDomain).toLowerCase();
  const writesObservedEnabled = observation.publicSiteWritesEnabled === true || process.env.PUBLIC_SITE_WRITES_ENABLED === "true";

  if (!activation.ready) blockers.push("Task #31 live read-only activation must be verified first");
  if (siteDomain !== LIVE_BASELINE_SITE) blockers.push("Task #32 live baseline is locked to diamondshelf.us");
  if (writesObservedEnabled) blockers.push("live baseline collection requires public-site writes disabled");
  if (!clean(observation.sourceRunId)) blockers.push("sourceRunId is required");
  if (!Number.isFinite(Date.parse(observation.observedAt))) blockers.push("observedAt must be a valid timestamp");
  if (!Number.isInteger(observation.crawlHardLimit) || observation.crawlHardLimit < 1) blockers.push("crawlHardLimit must be a positive integer");

  nonNegativeInteger(observation.expectedUrlCount, "expectedUrlCount", blockers);
  nonNegativeInteger(observation.pagesDiscovered, "pagesDiscovered", blockers);
  nonNegativeInteger(observation.pagesFetched, "pagesFetched", blockers);
  nonNegativeInteger(observation.gscRows, "gscRows", blockers);
  nonNegativeInteger(observation.ga4Rows, "ga4Rows", blockers);
  nonNegativeInteger(observation.shopifyInventoryCount, "shopifyInventoryCount", blockers);
  nonNegativeInteger(observation.aiVisibilityObservations, "aiVisibilityObservations", blockers);
  nonNegativeInteger(observation.technicalFindingCount, "technicalFindingCount", blockers);
  nonNegativeInteger(observation.internalLinkEdgeCount, "internalLinkEdgeCount", blockers);

  if (observation.pagesFetched > observation.crawlHardLimit) blockers.push("pagesFetched exceeds declared crawlHardLimit");
  if (observation.pagesFetched > observation.pagesDiscovered) blockers.push("pagesFetched cannot exceed pagesDiscovered");

  if (blockers.length) {
    return {
      status: "blocked",
      blockers,
      baseline: null,
      sourceRunId: clean(observation.sourceRunId) || null,
      observedAt: Number.isFinite(Date.parse(observation.observedAt)) ? new Date(observation.observedAt).toISOString() : null,
      wholeSiteClaimAllowed: false,
      writesObservedEnabled,
    };
  }

  const baseline = evaluateDiamondShelfBaseline(observation);
  return {
    status: baseline.state,
    blockers: [],
    baseline,
    sourceRunId: clean(observation.sourceRunId),
    observedAt: new Date(observation.observedAt).toISOString(),
    wholeSiteClaimAllowed: baseline.coverageRatio >= 0.95,
    writesObservedEnabled,
  };
}

export function assertLiveBaselineReady(result: LiveBaselineRunResult): void {
  if (result.status !== "ready" || !result.baseline || !result.wholeSiteClaimAllowed) {
    throw new Error("Diamond Shelf live baseline is not ready for downstream opportunity execution.");
  }
}
