import { createHash } from "node:crypto";

export const P5_1_PROVIDER_REVIEW_VERSION = "p5.1-provider-selection-review-v1" as const;
export const P5_1_PROVIDER_REVIEWED_AT = "2026-09-18T00:00:00.000Z" as const;
export const P5_1_REVIEW_TTL_DAYS = 90 as const;

export type ProviderCapability =
  | "serp"
  | "keyword_metrics"
  | "keyword_ideas"
  | "historical_keyword_metrics"
  | "rank_history"
  | "backlinks";

export type PricingModel =
  | "pay_as_you_go"
  | "monthly_search_credits"
  | "subscription_plus_api_units"
  | "platform_quota";

export type ReliabilityEvidenceClass =
  | "public_status_and_sla"
  | "documented_operational_limits"
  | "vendor_documentation_only";

export type CredentialComplexity = "low" | "medium" | "high";
export type InitialAdapterFit = "preferred" | "secondary" | "deferred";
export type RelativeCostClass = "very_low" | "low" | "medium" | "high" | "not_comparable";

export type ProviderEvidence = {
  reviewedAt: string;
  sourceUrls: string[];
  summary: string;
};

export type ProviderPricingSnapshot = ProviderEvidence & {
  model: PricingModel;
  relativeCost: RelativeCostClass;
};

export type ProviderReliabilitySnapshot = ProviderEvidence & {
  evidenceClass: ReliabilityEvidenceClass;
};

export type ProviderCandidate = {
  key: "dataforseo" | "serpapi" | "google_ads_keyword_planner" | "ahrefs" | "semrush";
  name: string;
  capabilities: ProviderCapability[];
  supportsLocationControl: boolean;
  supportsLanguageControl: boolean;
  credentialComplexity: CredentialComplexity;
  officialPlatformSource: boolean;
  broadSuite: boolean;
  initialAdapterFit: InitialAdapterFit;
  pricing: ProviderPricingSnapshot;
  reliability: ProviderReliabilitySnapshot;
  notes: string[];
};

export type ProviderSelectionRole =
  | "dual_purpose_engineering"
  | "serp_benchmark_fallback"
  | "official_keyword_reference";

export type ProviderSelection = {
  role: ProviderSelectionRole;
  providerKey: ProviderCandidate["key"];
  rationale: string[];
};

export type ProviderSelectionReview = {
  version: typeof P5_1_PROVIDER_REVIEW_VERSION;
  reviewId: string;
  fingerprint: string;
  reviewedAt: string;
  reReviewAfter: string;
  candidates: ProviderCandidate[];
  selections: ProviderSelection[];
  deferredBroadSuites: ProviderCandidate["key"][];
  safety: ReturnType<typeof providerSelectionReviewCapability>;
};

const DOC = {
  dataforseoSerpPricing: "https://dataforseo.com/help-center/serp-api-cost-explained",
  dataforseoKeywordPricing: "https://dataforseo.com/pricing/keywords-data/google-ads",
  dataforseoLabsPricing: "https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api",
  dataforseoLabsOverview: "https://docs.dataforseo.com/v3/dataforseo_labs-overview/",
  serpApiPricing: "https://serpapi.com/pricing",
  serpApiHome: "https://serpapi.com/",
  serpApiStatus: "https://status.serpapi.com/",
  googleKeywordPlanning: "https://developers.google.com/google-ads/api/docs/keyword-planning/overview",
  googleHistoricalMetrics: "https://developers.google.com/google-ads/api/docs/keyword-planning/generate-historical-metrics",
  googleQuotas: "https://developers.google.com/google-ads/api/docs/best-practices/quotas",
  ahrefsPricing: "https://ahrefs.com/pricing",
  ahrefsLimits: "https://docs.ahrefs.com/en/api/docs/limits-consumption",
  semrushAccess: "https://developer.semrush.com/api/v3/get-started/api-access/",
  semrushUnits: "https://developer.semrush.com/api/v3/get-started/api-units-balance/",
} as const;

const P5_1_CANDIDATE_INPUTS: ProviderCandidate[] = [
  {
    key: "dataforseo",
    name: "DataForSEO",
    capabilities: ["serp", "keyword_metrics", "keyword_ideas", "historical_keyword_metrics", "rank_history"],
    supportsLocationControl: true,
    supportsLanguageControl: true,
    credentialComplexity: "low",
    officialPlatformSource: false,
    broadSuite: true,
    initialAdapterFit: "preferred",
    pricing: {
      reviewedAt: P5_1_PROVIDER_REVIEWED_AT,
      model: "pay_as_you_go",
      relativeCost: "very_low",
      sourceUrls: [DOC.dataforseoSerpPricing, DOC.dataforseoKeywordPricing, DOC.dataforseoLabsPricing],
      summary:
        "Reviewed public pricing: Google Organic SERP standard base is $0.0006 per 10-result page, priority $0.0012, live $0.002; Google Ads keyword data is $0.06 standard or $0.09 live per task with bulk keyword support; Labs pricing is task-plus-item based.",
    },
    reliability: {
      reviewedAt: P5_1_PROVIDER_REVIEWED_AT,
      evidenceClass: "documented_operational_limits",
      sourceUrls: [DOC.dataforseoLabsOverview, DOC.dataforseoSerpPricing],
      summary:
        "Vendor documentation publishes request concurrency/rate limits and expected turnaround characteristics; no independent uptime percentage is encoded in this review.",
    },
    notes: [
      "Single vendor can cover the first SERP and keyword adapter families.",
      "Sandbox is documented for DataForSEO Labs and supports network-free design planning before any future enrollment.",
      "Selection does not admit the source into Task #67 or authorize credentials/provider traffic.",
    ],
  },
  {
    key: "serpapi",
    name: "SerpApi",
    capabilities: ["serp"],
    supportsLocationControl: true,
    supportsLanguageControl: true,
    credentialComplexity: "low",
    officialPlatformSource: false,
    broadSuite: false,
    initialAdapterFit: "secondary",
    pricing: {
      reviewedAt: P5_1_PROVIDER_REVIEWED_AT,
      model: "monthly_search_credits",
      relativeCost: "medium",
      sourceUrls: [DOC.serpApiPricing],
      summary:
        "Reviewed public plans start at $25/month for 1,000 searches, with higher plans increasing monthly search volume and hourly throughput.",
    },
    reliability: {
      reviewedAt: P5_1_PROVIDER_REVIEWED_AT,
      evidenceClass: "public_status_and_sla",
      sourceUrls: [DOC.serpApiHome, DOC.serpApiStatus],
      summary:
        "Vendor publishes a public status page and advertises uptime SLAs up to 99.97%; engine-specific incidents remain possible and must be handled as partial provider availability.",
    },
    notes: [
      "Strong independent SERP benchmark/fallback candidate.",
      "Not selected as the primary keyword-volume source because this P5.1 review does not establish equivalent keyword metrics/volume coverage.",
    ],
  },
  {
    key: "google_ads_keyword_planner",
    name: "Google Ads API Keyword Planning",
    capabilities: ["keyword_metrics", "keyword_ideas", "historical_keyword_metrics"],
    supportsLocationControl: true,
    supportsLanguageControl: true,
    credentialComplexity: "high",
    officialPlatformSource: true,
    broadSuite: false,
    initialAdapterFit: "secondary",
    pricing: {
      reviewedAt: P5_1_PROVIDER_REVIEWED_AT,
      model: "platform_quota",
      relativeCost: "not_comparable",
      sourceUrls: [DOC.googleKeywordPlanning, DOC.googleQuotas],
      summary:
        "This review treats Keyword Planning as quota/account-governed rather than assigning a per-result vendor price; future use requires a separately reviewed Google Ads account/developer-token/OAuth boundary.",
    },
    reliability: {
      reviewedAt: P5_1_PROVIDER_REVIEWED_AT,
      evidenceClass: "documented_operational_limits",
      sourceUrls: [DOC.googleQuotas, DOC.googleHistoricalMetrics],
      summary:
        "Google documents a 1-request-per-second per-CID limit for key Keyword Planning methods; historical metrics refresh monthly and should be cached rather than repeatedly refreshed.",
    },
    notes: [
      "Official reference source for Google keyword ideas and historical metrics.",
      "No general organic SERP result API is established by this review.",
      "Credential/developer-token/account setup remains separately authorized and out of P5.1 scope.",
    ],
  },
  {
    key: "ahrefs",
    name: "Ahrefs API",
    capabilities: ["serp", "keyword_metrics", "keyword_ideas", "historical_keyword_metrics", "rank_history", "backlinks"],
    supportsLocationControl: true,
    supportsLanguageControl: true,
    credentialComplexity: "medium",
    officialPlatformSource: false,
    broadSuite: true,
    initialAdapterFit: "deferred",
    pricing: {
      reviewedAt: P5_1_PROVIDER_REVIEWED_AT,
      model: "subscription_plus_api_units",
      relativeCost: "high",
      sourceUrls: [DOC.ahrefsPricing, DOC.ahrefsLimits],
      summary:
        "API access is tied to eligible paid plans and API units; paid requests have a documented minimum cost of 50 units, with unit use depending on rows and selected fields.",
    },
    reliability: {
      reviewedAt: P5_1_PROVIDER_REVIEWED_AT,
      evidenceClass: "vendor_documentation_only",
      sourceUrls: [DOC.ahrefsLimits],
      summary:
        "The reviewed public API documentation defines limits/usage behavior, but this P5.1 snapshot does not encode a quantified service uptime SLA.",
    },
    notes: [
      "Broad data surface is valuable for later competitive/backlink validation.",
      "Deferred as the initial P5.2/P5.3 target because the subscription/API-unit economics are heavier than the selected pay-as-you-go candidate.",
    ],
  },
  {
    key: "semrush",
    name: "Semrush API",
    capabilities: ["serp", "keyword_metrics", "keyword_ideas", "historical_keyword_metrics", "rank_history", "backlinks"],
    supportsLocationControl: true,
    supportsLanguageControl: true,
    credentialComplexity: "medium",
    officialPlatformSource: false,
    broadSuite: true,
    initialAdapterFit: "deferred",
    pricing: {
      reviewedAt: P5_1_PROVIDER_REVIEWED_AT,
      model: "subscription_plus_api_units",
      relativeCost: "high",
      sourceUrls: [DOC.semrushAccess, DOC.semrushUnits],
      summary:
        "Semrush analytical API usage is metered in API units purchased separately; example documentation prices live organic-keyword output at 10 units per line and historical output at 50 units per line.",
    },
    reliability: {
      reviewedAt: P5_1_PROVIDER_REVIEWED_AT,
      evidenceClass: "vendor_documentation_only",
      sourceUrls: [DOC.semrushAccess],
      summary:
        "The reviewed public API documentation defines unit/access semantics; this P5.1 snapshot does not encode a quantified service uptime SLA.",
    },
    notes: [
      "Broad comparative analytics source suitable for later validation or category/competitor intelligence.",
      "Deferred from the first adapter target because API-unit procurement and broad-suite economics add unnecessary initial complexity.",
    ],
  },
];

const ROLE_POLICY: Record<ProviderSelectionRole, readonly ProviderCandidate["key"][]> = {
  dual_purpose_engineering: ["dataforseo", "ahrefs", "semrush"],
  serp_benchmark_fallback: ["serpapi", "dataforseo", "ahrefs", "semrush"],
  official_keyword_reference: ["google_ads_keyword_planner"],
};

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizeDate(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error("invalid_review_date");
  return new Date(timestamp).toISOString();
}

function uniqueSorted<T extends string>(values: T[], field: string): T[] {
  if (!Array.isArray(values) || values.length === 0) throw new Error(`invalid_${field}`);
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function validateEvidence(value: ProviderEvidence, field: string): void {
  if (normalizeDate(value.reviewedAt) !== P5_1_PROVIDER_REVIEWED_AT) throw new Error(`stale_or_mismatched_${field}_review_date`);
  const urls = uniqueSorted(value.sourceUrls, `${field}_source_urls`);
  for (const url of urls) {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") throw new Error(`invalid_${field}_source_url`);
  }
  if (!value.summary.trim()) throw new Error(`missing_${field}_summary`);
}

function validateCandidate(candidate: ProviderCandidate): ProviderCandidate {
  validateEvidence(candidate.pricing, "pricing");
  validateEvidence(candidate.reliability, "reliability");
  const capabilities = uniqueSorted(candidate.capabilities, "capabilities");
  const notes = uniqueSorted(candidate.notes, "notes");
  if (!candidate.name.trim()) throw new Error("missing_provider_name");
  return {
    ...candidate,
    capabilities,
    notes,
    pricing: {
      ...candidate.pricing,
      reviewedAt: normalizeDate(candidate.pricing.reviewedAt),
      sourceUrls: uniqueSorted(candidate.pricing.sourceUrls, "pricing_source_urls"),
    },
    reliability: {
      ...candidate.reliability,
      reviewedAt: normalizeDate(candidate.reliability.reviewedAt),
      sourceUrls: uniqueSorted(candidate.reliability.sourceUrls, "reliability_source_urls"),
    },
  };
}

function hasCapabilities(candidate: ProviderCandidate, required: ProviderCapability[]): boolean {
  return required.every((capability) => candidate.capabilities.includes(capability));
}

function selectionFor(
  role: ProviderSelectionRole,
  candidates: ProviderCandidate[],
  required: ProviderCapability[],
  extra: (candidate: ProviderCandidate) => boolean = () => true,
): ProviderSelection {
  const byKey = new Map(candidates.map((candidate) => [candidate.key, candidate]));
  for (const key of ROLE_POLICY[role]) {
    const candidate = byKey.get(key);
    if (!candidate) continue;
    if (!hasCapabilities(candidate, required) || !extra(candidate)) continue;
    return {
      role,
      providerKey: candidate.key,
      rationale:
        role === "dual_purpose_engineering"
          ? [
              "covers_serp_and_keyword_families",
              "dated_pricing_provenance_present",
              "bounded_operational_limits_documented",
              "lowest_initial_adapter_friction_in_review",
            ]
          : role === "serp_benchmark_fallback"
            ? [
                "independent_serp_provider",
                "public_status_and_sla_evidence",
                "simple_search_credit_model",
              ]
            : [
                "official_platform_keyword_source",
                "keyword_planning_limits_documented",
                "separate_credentials_required_before_any_live_use",
              ],
    };
  }
  throw new Error(`no_eligible_provider_for_role:${role}`);
}

export function buildP5_1ProviderSelectionReview(
  inputs: ProviderCandidate[] = P5_1_CANDIDATE_INPUTS,
): ProviderSelectionReview {
  const candidates = inputs.map(validateCandidate).sort((a, b) => a.key.localeCompare(b.key));
  const keys = candidates.map((candidate) => candidate.key);
  if (new Set(keys).size !== keys.length) throw new Error("duplicate_provider_key");

  const reviewedAt = normalizeDate(P5_1_PROVIDER_REVIEWED_AT);
  const reReviewAfter = new Date(
    Date.parse(reviewedAt) + P5_1_REVIEW_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const selections = [
    selectionFor(
      "dual_purpose_engineering",
      candidates,
      ["serp", "keyword_metrics", "keyword_ideas"],
      (candidate) => candidate.initialAdapterFit !== "deferred",
    ),
    selectionFor(
      "serp_benchmark_fallback",
      candidates,
      ["serp"],
      (candidate) => candidate.reliability.evidenceClass === "public_status_and_sla",
    ),
    selectionFor(
      "official_keyword_reference",
      candidates,
      ["keyword_metrics", "keyword_ideas"],
      (candidate) => candidate.officialPlatformSource,
    ),
  ];

  const deferredBroadSuites = candidates
    .filter((candidate) => candidate.broadSuite && candidate.initialAdapterFit === "deferred")
    .map((candidate) => candidate.key)
    .sort();

  const identity = {
    reviewedAt,
    reReviewAfter,
    candidates,
    selections,
    deferredBroadSuites,
  };
  const fingerprint = hash({ version: P5_1_PROVIDER_REVIEW_VERSION, ...identity });

  return {
    version: P5_1_PROVIDER_REVIEW_VERSION,
    reviewId: `p51-${fingerprint.slice(0, 24)}`,
    fingerprint,
    ...identity,
    safety: providerSelectionReviewCapability(),
  };
}

export function classifyP5_1ReviewFreshness(
  review: Pick<ProviderSelectionReview, "reviewedAt" | "reReviewAfter">,
  now: string,
): "fresh" | "stale" {
  const nowMs = Date.parse(now);
  const reviewedMs = Date.parse(review.reviewedAt);
  const reReviewMs = Date.parse(review.reReviewAfter);
  if (![nowMs, reviewedMs, reReviewMs].every(Number.isFinite)) throw new Error("invalid_review_freshness_timestamp");
  if (nowMs < reviewedMs) throw new Error("review_date_in_future");
  return nowMs <= reReviewMs ? "fresh" : "stale";
}

export function providerSelectionReviewCapability() {
  return Object.freeze({
    version: P5_1_PROVIDER_REVIEW_VERSION,
    researchPlanningOnly: true,
    providerEnrollmentAuthorized: false,
    providerPurchaseAuthorized: false,
    credentialCreationAuthorized: false,
    credentialUseAuthorized: false,
    sourceRegistryAdmissionAuthorized: false,
    networkCollectionAuthorized: false,
    task70ExecutionAuthorized: false,
    observationPersistenceAuthorized: false,
    evidencePersistenceAuthorized: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    schemaMutationAuthorized: false,
    schedulerEnabled: false,
    batchEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    publicationAuthorized: false,
    automaticTransition: false,
  });
}

export const P5_1_REVIEWED_PROVIDER_CANDIDATES = Object.freeze(
  P5_1_CANDIDATE_INPUTS.map((candidate) => Object.freeze(candidate)),
);
