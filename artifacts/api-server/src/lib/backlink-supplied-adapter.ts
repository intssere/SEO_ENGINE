import { createHash } from "node:crypto";
import type { CategoryContext, MarketProfile } from "./market-category-intelligence.js";
import type { SignalSourceDescriptor } from "./signal-source-registry.js";
import type { SourceAdapterRequest } from "./signal-observation-normalization.js";
import {
  normalizeBacklinkDomain,
  normalizeBacklinkFixtureBundle,
  type BacklinkFixtureBundle,
  type BacklinkFixtureBundleInput,
  type BacklinkMeasurementBasisInput,
  type AnchorClassification,
} from "./backlink-fixture-normalization.js";

export const P5_5_SUPPLIED_BACKLINK_ADAPTER_VERSION = "p5.5-supplied-backlink-adapter-v1" as const;
export const P5_5_SUPPLIED_BACKLINK_SOURCE_KEY = "supplied-backlink-fixture" as const;
export const P5_5_SUPPLIED_BACKLINK_METHOD = "supplied_backlink_fixture_v1" as const;

export type SuppliedBacklinkRequestContract = {
  version: typeof P5_5_SUPPLIED_BACKLINK_ADAPTER_VERSION;
  adapterRequestId: string;
  adapterRequestFingerprint: string;
  sourceId: string;
  sourceFingerprint: string;
  task68RequestId: string;
  task68RequestFingerprint: string;
  marketFingerprint: string;
  categoryFingerprint: string;
  ownedDomain: string;
  competitorDomains: string[];
  authorityBasis: {
    providerKey: string;
    providerMethod: string;
    metricName: string;
    min: number;
    max: number;
    crossProviderComparable: false;
  };
  safety: ReturnType<typeof suppliedBacklinkAdapterCapability>;
};

export type Task68BacklinkAdapterResult = {
  requestFingerprint: string;
  sourceId: string;
  sourceFingerprint: string;
  sourceClass: "external";
  marketFingerprint: string;
  categoryFingerprint: string;
  signalType: "backlink";
  observedAt: string;
  status: "success";
  metrics: Array<{ key: string; value: number; unit: string | null }>;
  diagnostics: string[];
  errorCode: null;
  completeness: 1;
};

export type SuppliedBacklinkNormalization = {
  version: typeof P5_5_SUPPLIED_BACKLINK_ADAPTER_VERSION;
  bundle: BacklinkFixtureBundle;
  adapterResult: Task68BacklinkAdapterResult;
  safety: ReturnType<typeof suppliedBacklinkAdapterCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const SOURCE_ID = /^src-[0-9a-f]{24}$/;
const REQUEST_ID = /^sar-[0-9a-f]{24}$/;
const KEY = /^[a-z0-9][a-z0-9._:-]{0,95}$/;

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function cleanText(value: unknown, name: string, max: number): string {
  if (typeof value !== "string") throw new Error(`invalid_${name}`);
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > max || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error(`invalid_${name}`);
  }
  return normalized;
}

function finiteNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`invalid_${name}`);
  return value;
}

function normalizeAuthorityBasis(input: {
  providerKey: string;
  providerMethod: string;
  metricName: string;
  min: number;
  max: number;
  crossProviderComparable: false;
}) {
  const providerKey = cleanText(input.providerKey, "provider_key", 80).toLowerCase();
  const providerMethod = cleanText(input.providerMethod, "provider_method", 96).toLowerCase();
  const metricName = cleanText(input.metricName, "authority_metric_name", 80).toLowerCase();
  if (![providerKey, providerMethod, metricName].every((value) => KEY.test(value))) {
    throw new Error("invalid_authority_basis");
  }
  const min = finiteNumber(input.min, "authority_metric_min");
  const max = finiteNumber(input.max, "authority_metric_max");
  if (min >= max) throw new Error("invalid_authority_metric_range");
  if (input.crossProviderComparable !== false) throw new Error("cross_provider_authority_comparison_not_allowed");
  return { providerKey, providerMethod, metricName, min, max, crossProviderComparable: false as const };
}

function validateTask68Lineage(input: {
  source: SignalSourceDescriptor;
  request: SourceAdapterRequest;
  market: MarketProfile;
  category: CategoryContext;
}): void {
  const { source, request, market, category } = input;
  if (source.key !== P5_5_SUPPLIED_BACKLINK_SOURCE_KEY) throw new Error("supplied_backlink_source_key_required");
  if (source.sourceClass !== "external" || request.sourceClass !== "external") throw new Error("external_source_required");
  if (source.collectionMode !== "manual_import" || request.collectionMode !== "manual_import") {
    throw new Error("manual_import_collection_mode_required");
  }
  if (request.signalType !== "backlink" || !source.signalTypes.includes("backlink")) {
    throw new Error("backlink_signal_required");
  }
  if (!SOURCE_ID.test(request.sourceId) || request.sourceId !== source.sourceId) throw new Error("source_id_mismatch");
  if (!HEX_64.test(request.sourceFingerprint) || request.sourceFingerprint !== source.fingerprint) {
    throw new Error("source_fingerprint_mismatch");
  }
  if (!REQUEST_ID.test(request.requestId) || !HEX_64.test(request.requestFingerprint)) {
    throw new Error("invalid_task68_request_identity");
  }
  if (request.marketFingerprint !== market.fingerprint) throw new Error("market_fingerprint_mismatch");
  if (request.categoryFingerprint !== category.fingerprint) throw new Error("category_fingerprint_mismatch");
}

function contractIdentity(
  contract: Omit<SuppliedBacklinkRequestContract, "adapterRequestId" | "adapterRequestFingerprint" | "safety">,
) {
  return {
    sourceId: contract.sourceId,
    sourceFingerprint: contract.sourceFingerprint,
    task68RequestId: contract.task68RequestId,
    task68RequestFingerprint: contract.task68RequestFingerprint,
    marketFingerprint: contract.marketFingerprint,
    categoryFingerprint: contract.categoryFingerprint,
    ownedDomain: contract.ownedDomain,
    competitorDomains: contract.competitorDomains,
    authorityBasis: contract.authorityBasis,
  };
}

function validateContract(contract: SuppliedBacklinkRequestContract): void {
  if (contract.version !== P5_5_SUPPLIED_BACKLINK_ADAPTER_VERSION) {
    throw new Error("unsupported_p5_5_adapter_version");
  }
  const fingerprint = hash({
    version: P5_5_SUPPLIED_BACKLINK_ADAPTER_VERSION,
    ...contractIdentity(contract),
  });
  if (fingerprint !== contract.adapterRequestFingerprint) throw new Error("adapter_request_fingerprint_mismatch");
  if (contract.adapterRequestId !== `p55-backlink-${fingerprint.slice(0, 20)}`) {
    throw new Error("adapter_request_id_mismatch");
  }
}

export function buildSuppliedBacklinkRequestContract(input: {
  source: SignalSourceDescriptor;
  request: SourceAdapterRequest;
  market: MarketProfile;
  category: CategoryContext;
  ownedDomain: string;
  competitorDomains: string[];
  authorityBasis: {
    providerKey: string;
    providerMethod: string;
    metricName: string;
    min: number;
    max: number;
    crossProviderComparable: false;
  };
}): SuppliedBacklinkRequestContract {
  validateTask68Lineage(input);
  const ownedDomain = normalizeBacklinkDomain(input.ownedDomain, { allowUrl: true });
  if (!Array.isArray(input.competitorDomains) || input.competitorDomains.length < 1 || input.competitorDomains.length > 10) {
    throw new Error("invalid_competitors");
  }
  const competitorDomains = input.competitorDomains
    .map((domain) => normalizeBacklinkDomain(domain, { allowUrl: true }))
    .sort((a, b) => a.localeCompare(b));
  if (new Set(competitorDomains).size !== competitorDomains.length) throw new Error("duplicate_competitor_domain");
  if (competitorDomains.includes(ownedDomain)) throw new Error("owned_domain_in_competitor_set");
  const authorityBasis = normalizeAuthorityBasis(input.authorityBasis);

  const base = {
    version: P5_5_SUPPLIED_BACKLINK_ADAPTER_VERSION,
    sourceId: input.source.sourceId,
    sourceFingerprint: input.source.fingerprint,
    task68RequestId: input.request.requestId,
    task68RequestFingerprint: input.request.requestFingerprint,
    marketFingerprint: input.market.fingerprint,
    categoryFingerprint: input.category.fingerprint,
    ownedDomain,
    competitorDomains,
    authorityBasis,
  } as const;
  const adapterRequestFingerprint = hash({
    version: P5_5_SUPPLIED_BACKLINK_ADAPTER_VERSION,
    ...contractIdentity(base),
  });
  return {
    ...base,
    adapterRequestId: `p55-backlink-${adapterRequestFingerprint.slice(0, 20)}`,
    adapterRequestFingerprint,
    safety: suppliedBacklinkAdapterCapability(),
  };
}

function task68Base(
  contract: SuppliedBacklinkRequestContract,
  request: SourceAdapterRequest,
  observedAt: string,
): Omit<Task68BacklinkAdapterResult, "status" | "metrics" | "diagnostics" | "errorCode" | "completeness"> {
  if (contract.task68RequestId !== request.requestId || contract.task68RequestFingerprint !== request.requestFingerprint) {
    throw new Error("task68_request_lineage_mismatch");
  }
  if (contract.sourceId !== request.sourceId || contract.sourceFingerprint !== request.sourceFingerprint) {
    throw new Error("task68_source_lineage_mismatch");
  }
  if (contract.marketFingerprint !== request.marketFingerprint || contract.categoryFingerprint !== request.categoryFingerprint) {
    throw new Error("task68_scope_lineage_mismatch");
  }
  if (request.signalType !== "backlink" || request.sourceClass !== "external") {
    throw new Error("task68_backlink_external_required");
  }
  return {
    requestFingerprint: request.requestFingerprint,
    sourceId: request.sourceId,
    sourceFingerprint: request.sourceFingerprint,
    sourceClass: "external",
    marketFingerprint: request.marketFingerprint,
    categoryFingerprint: request.categoryFingerprint,
    signalType: "backlink",
    observedAt,
  };
}

function metric(key: string, value: number, unit: string | null) {
  return { key, value, unit };
}

function anchorRatios(bundle: BacklinkFixtureBundle): Array<{ key: string; value: number; unit: string | null }> {
  const counts = new Map<AnchorClassification, number>();
  let total = 0;
  for (const row of bundle.owned.referringDomains) {
    for (const anchor of row.anchors) {
      counts.set(anchor.classification, (counts.get(anchor.classification) ?? 0) + anchor.count);
      total += anchor.count;
    }
  }
  if (total === 0) return [];
  const selected: AnchorClassification[] = ["brand", "exact", "partial", "url", "generic"];
  return selected.map((classification) =>
    metric(
      `backlink.anchor_${classification}_ratio`,
      Number(((counts.get(classification) ?? 0) / total).toFixed(6)),
      "ratio",
    ),
  );
}

function freshnessMetrics(bundle: BacklinkFixtureBundle) {
  const states = ["fresh", "recent", "aging", "stale", "unavailable"] as const;
  return states.map((state) =>
    metric(
      `backlink.owned_${state}_referring_domain_count`,
      bundle.owned.referringDomains.filter((row) => row.freshnessState === state).length,
      "count",
    ),
  );
}

export function normalizeSuppliedBacklinkFixture(input: {
  contract: SuppliedBacklinkRequestContract;
  request: SourceAdapterRequest;
  provided: BacklinkFixtureBundleInput;
}): SuppliedBacklinkNormalization {
  validateContract(input.contract);
  const suppliedBasis: BacklinkMeasurementBasisInput = {
    providerKey: input.contract.authorityBasis.providerKey,
    providerMethod: input.contract.authorityBasis.providerMethod,
    sourceFingerprint: input.contract.sourceFingerprint,
    marketFingerprint: input.contract.marketFingerprint,
    categoryFingerprint: input.contract.categoryFingerprint,
    authorityMetric: {
      name: input.contract.authorityBasis.metricName,
      min: input.contract.authorityBasis.min,
      max: input.contract.authorityBasis.max,
      crossProviderComparable: false,
    },
  };

  if (JSON.stringify(input.provided.basis) !== JSON.stringify(suppliedBasis)) {
    throw new Error("fixture_basis_lineage_mismatch");
  }

  const bundle = normalizeBacklinkFixtureBundle(input.provided);
  if (bundle.owned.targetDomain !== input.contract.ownedDomain) throw new Error("owned_domain_mismatch");
  const actualCompetitors = bundle.competitors.map((profile) => profile.targetDomain);
  if (JSON.stringify(actualCompetitors) !== JSON.stringify(input.contract.competitorDomains)) {
    throw new Error("competitor_domain_mismatch");
  }

  const diagnostics: string[] = [];
  if (bundle.owned.summary.authority === null) diagnostics.push("owned_authority_unavailable");
  if (bundle.owned.referringDomains.some((row) => row.authority === null)) {
    diagnostics.push("referring_domain_authority_unavailable");
  }
  if (bundle.owned.referringDomains.some((row) => row.freshnessState === "unavailable")) {
    diagnostics.push("referring_domain_freshness_unavailable");
  }

  const metrics = [
    metric("backlink.owned_referring_domain_count", bundle.owned.summary.referringDomains, "count"),
    metric("backlink.owned_backlink_count", bundle.owned.summary.backlinks, "count"),
    metric("backlink.unique_observed_referring_domain_count", bundle.summary.uniqueObservedReferringDomains, "count"),
    metric("backlink.gap_candidate_count", bundle.summary.gapCandidateCount, "count"),
    metric("backlink.single_competitor_gap_count", bundle.summary.singleCompetitorGapCount, "count"),
    metric("backlink.shared_competitor_gap_count", bundle.summary.sharedCompetitorGapCount, "count"),
    metric("backlink.universal_competitor_gap_count", bundle.summary.universalCompetitorGapCount, "count"),
    metric("backlink.shared_coverage_count", bundle.summary.sharedCoverageCount, "count"),
    metric("backlink.owned_exclusive_count", bundle.summary.ownedExclusiveCount, "count"),
    metric(
      "backlink.avg_gap_competitor_coverage_ratio",
      bundle.summary.averageGapCompetitorCoverageRatio,
      "ratio",
    ),
    ...freshnessMetrics(bundle),
    ...anchorRatios(bundle),
  ];
  if (bundle.owned.summary.authority !== null) {
    metrics.push(metric("backlink.owned_authority", bundle.owned.summary.authority, "provider_scale"));
  }

  return {
    version: P5_5_SUPPLIED_BACKLINK_ADAPTER_VERSION,
    bundle,
    adapterResult: {
      ...task68Base(input.contract, input.request, bundle.observedAt),
      status: "success",
      metrics: metrics.sort((a, b) => a.key.localeCompare(b.key)),
      diagnostics: [...new Set(diagnostics)].sort(),
      errorCode: null,
      completeness: 1,
    },
    safety: suppliedBacklinkAdapterCapability(),
  };
}

export function suppliedBacklinkAdapterCapability() {
  return Object.freeze({
    version: P5_5_SUPPLIED_BACKLINK_ADAPTER_VERSION,
    sourceKeyContract: P5_5_SUPPLIED_BACKLINK_SOURCE_KEY,
    method: P5_5_SUPPLIED_BACKLINK_METHOD,
    manualImportContractOnly: true,
    deterministicSuppliedFixturesOnly: true,
    liveProviderMappingCandidateReviewed: "dataforseo_backlinks",
    liveProviderTransportAuthorized: false,
    providerEnrollmentAuthorized: false,
    providerPurchaseAuthorized: false,
    credentialCreationAuthorized: false,
    credentialUseAuthorized: false,
    networkRequestAuthorized: false,
    providerSdkAuthorized: false,
    sourceRegistryAdmissionAuthorized: false,
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
