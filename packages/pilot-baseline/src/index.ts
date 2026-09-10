export type BaselineState = "ready" | "partial" | "blocked";

export interface BaselineInput {
  expectedUrlCount: number;
  pagesDiscovered: number;
  pagesFetched: number;
  gscRows: number;
  ga4Rows: number;
  shopifyInventoryCount: number;
  aiVisibilityObservations: number;
  technicalFindingCount: number;
  internalLinkEdgeCount: number;
}

export interface BaselineCheck {
  id:
    | "crawl_coverage"
    | "gsc"
    | "ga4"
    | "shopify_inventory"
    | "ai_visibility"
    | "technical_findings"
    | "internal_links";
  state: BaselineState;
  detail: string;
}

export interface BaselineSummary {
  state: BaselineState;
  coverageRatio: number;
  checks: BaselineCheck[];
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.min(1, Math.max(0, numerator / denominator));
}

export function evaluateDiamondShelfBaseline(input: BaselineInput): BaselineSummary {
  const coverageRatio = ratio(input.pagesFetched, input.expectedUrlCount);
  const crawlState: BaselineState =
    input.pagesFetched === 0 || input.pagesDiscovered === 0
      ? "blocked"
      : coverageRatio >= 0.95
        ? "ready"
        : "partial";

  const checks: BaselineCheck[] = [
    {
      id: "crawl_coverage",
      state: crawlState,
      detail: `Fetched ${input.pagesFetched} of ${input.expectedUrlCount} expected URLs (${(coverageRatio * 100).toFixed(1)}%).`,
    },
    {
      id: "gsc",
      state: input.gscRows > 0 ? "ready" : "blocked",
      detail: `${input.gscRows} Google Search Console rows available.`,
    },
    {
      id: "ga4",
      state: input.ga4Rows > 0 ? "ready" : "partial",
      detail: `${input.ga4Rows} GA4 landing-page rows available.`,
    },
    {
      id: "shopify_inventory",
      state: input.shopifyInventoryCount > 0 ? "ready" : "blocked",
      detail: `${input.shopifyInventoryCount} Shopify inventory records available.`,
    },
    {
      id: "ai_visibility",
      state: input.aiVisibilityObservations > 0 ? "ready" : "partial",
      detail: `${input.aiVisibilityObservations} AI visibility observations available.`,
    },
    {
      id: "technical_findings",
      state: input.technicalFindingCount >= 0 ? "ready" : "blocked",
      detail: `${Math.max(0, input.technicalFindingCount)} technical findings recorded.`,
    },
    {
      id: "internal_links",
      state: input.internalLinkEdgeCount > 0 ? "ready" : "partial",
      detail: `${input.internalLinkEdgeCount} internal-link edges available.`,
    },
  ];

  const state: BaselineState = checks.some((check) => check.state === "blocked")
    ? "blocked"
    : checks.some((check) => check.state === "partial")
      ? "partial"
      : "ready";

  return { state, coverageRatio, checks };
}

export function assertNoWholeSiteClaim(summary: BaselineSummary): void {
  if (summary.coverageRatio < 0.95) {
    throw new Error("Whole-site baseline cannot be claimed below 95% reconciled crawl coverage.");
  }
}
