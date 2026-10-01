import {
  buildDataForSeoControlledRequest,
  DATAFORSEO_ENDPOINTS,
  DATAFORSEO_TRANSPORT_POLICY,
  type DataForSeoDataset,
} from "./dataforseo-controlled-transport.js";
import {
  stableEvidenceHash,
  type KeywordSerpEvidenceRequest,
} from "./keyword-serp-evidence-contract.js";
import type {
  DataForSeoCapturedCertification,
} from "./dataforseo-captured-certification.js";

export const UGP_DATAFORSEO_LIVE_GATE_VERSION =
  "ugp-6-1d-dataforseo-live-certification-gate-v1" as const;

export const UGP_DATAFORSEO_LIVE_SCOPE = Object.freeze({
  keyword: "stress relief journal",
  market: Object.freeze({
    searchEngine: "google" as const,
    locationCode: 2840,
    languageCode: "en",
    device: "desktop" as const,
  }),
  credentialProfileId: "dataforseo-primary",
  maxProviderReportedCostUsd: 1.0,
  maxCalls: 3,
  maxAttemptsPerCall: 1,
  automaticRetry: false as const,
  maxConcurrency: 1,
});

export type DataForSeoLiveCertificationPlan = Readonly<{
  version: typeof UGP_DATAFORSEO_LIVE_GATE_VERSION;
  sourceCommitSha: string;
  request: KeywordSerpEvidenceRequest;
  credentialProfileId: string;
  datasets: readonly DataForSeoDataset[];
  endpointFingerprints: Readonly<Record<DataForSeoDataset, string>>;
  maxProviderReportedCostUsd: number;
  maxCalls: 3;
  maxAttemptsPerCall: 1;
  automaticRetry: false;
  maxConcurrency: 1;
  providerWrites: false;
  publicSiteWrites: false;
  persistence: false;
  scheduling: false;
  autonomousExecution: false;
  publication: false;
  planFingerprint: string;
}>;

export type DataForSeoLiveCertificationDecision = Readonly<{
  pass: boolean;
  reasons: readonly string[];
  totalProviderReportedCostUsd: number | null;
  planFingerprint: string;
  certificationFingerprint: string | null;
}>;

const DATASETS = [
  "keyword_overview",
  "related_keywords",
  "serp_advanced",
] as const satisfies readonly DataForSeoDataset[];

function exactSha(value: string): string {
  if (!/^[0-9a-f]{40}$/.test(value)) {
    throw new Error("ugp_dataforseo_live_plan_invalid_source_sha");
  }
  return value;
}

function exactProfile(value: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/.test(value)) {
    throw new Error("ugp_dataforseo_live_plan_invalid_credential_profile");
  }
  return value;
}

export function buildDataForSeoLiveCertificationPlan(input: {
  sourceCommitSha: string;
  request: KeywordSerpEvidenceRequest;
  credentialProfileId?: string;
}): DataForSeoLiveCertificationPlan {
  const sourceCommitSha = exactSha(input.sourceCommitSha);
  const credentialProfileId = exactProfile(
    input.credentialProfileId ?? UGP_DATAFORSEO_LIVE_SCOPE.credentialProfileId,
  );

  if (
    input.request.keyword !== UGP_DATAFORSEO_LIVE_SCOPE.keyword
    || input.request.market.searchEngine !== UGP_DATAFORSEO_LIVE_SCOPE.market.searchEngine
    || input.request.market.locationCode !== UGP_DATAFORSEO_LIVE_SCOPE.market.locationCode
    || input.request.market.languageCode !== UGP_DATAFORSEO_LIVE_SCOPE.market.languageCode
    || input.request.market.device !== UGP_DATAFORSEO_LIVE_SCOPE.market.device
  ) {
    throw new Error("ugp_dataforseo_live_plan_scope_drift");
  }

  const endpointFingerprints = {} as Record<DataForSeoDataset, string>;
  for (const dataset of DATASETS) {
    const controlled = buildDataForSeoControlledRequest({
      dataset,
      request: input.request,
    });
    endpointFingerprints[dataset] = stableEvidenceHash({
      purpose: "ugp_dataforseo_live_plan_endpoint",
      dataset,
      url: controlled.url,
      body: controlled.body,
      requestFingerprint: controlled.requestFingerprint,
    });
  }

  const base = {
    version: UGP_DATAFORSEO_LIVE_GATE_VERSION,
    sourceCommitSha,
    request: input.request,
    credentialProfileId,
    datasets: Object.freeze([...DATASETS]),
    endpointFingerprints: Object.freeze({ ...endpointFingerprints }),
    maxProviderReportedCostUsd: UGP_DATAFORSEO_LIVE_SCOPE.maxProviderReportedCostUsd,
    maxCalls: 3 as const,
    maxAttemptsPerCall: 1 as const,
    automaticRetry: false as const,
    maxConcurrency: 1 as const,
    providerWrites: false as const,
    publicSiteWrites: false as const,
    persistence: false as const,
    scheduling: false as const,
    autonomousExecution: false as const,
    publication: false as const,
  };

  return Object.freeze({
    ...base,
    planFingerprint: stableEvidenceHash({
      purpose: "ugp_dataforseo_live_certification_plan",
      ...base,
    }),
  });
}

export function evaluateDataForSeoLiveCertification(input: {
  plan: DataForSeoLiveCertificationPlan;
  certification: DataForSeoCapturedCertification;
}): DataForSeoLiveCertificationDecision {
  const reasons: string[] = [];
  const { plan, certification } = input;

  if (certification.sourceCommitSha !== plan.sourceCommitSha) {
    reasons.push("source_commit_mismatch");
  }
  if (certification.requestFingerprint !== plan.request.requestFingerprint) {
    reasons.push("request_fingerprint_mismatch");
  }

  for (const dataset of DATASETS) {
    if (certification.endpointFingerprints[dataset] !== plan.endpointFingerprints[dataset]) {
      reasons.push("endpoint_fingerprint_mismatch:" + dataset);
    }
  }

  if (
    certification.assertions.offlineOnly !== true
    || certification.assertions.networkCalls !== false
    || certification.assertions.credentialsPresent !== false
    || certification.assertions.providerWrites !== false
    || certification.assertions.publicSiteWrites !== false
    || certification.assertions.persistence !== false
    || certification.assertions.scheduling !== false
    || certification.assertions.autonomousExecution !== false
  ) {
    reasons.push("unsafe_attestation_assertions");
  }

  const costs = certification.evidence.provenance.map((p) => p.costUsd);
  const totalProviderReportedCostUsd = costs.every((cost): cost is number =>
    typeof cost === "number" && Number.isFinite(cost) && cost >= 0
  )
    ? costs.reduce((sum, cost) => sum + cost, 0)
    : null;

  if (totalProviderReportedCostUsd == null) {
    reasons.push("provider_cost_missing_or_invalid");
  } else if (totalProviderReportedCostUsd > plan.maxProviderReportedCostUsd) {
    reasons.push("provider_cost_ceiling_exceeded");
  }

  if (certification.evidence.provenance.length !== 3) {
    reasons.push("unexpected_provider_task_count");
  }

  const pass = reasons.length === 0;
  return Object.freeze({
    pass,
    reasons: Object.freeze(reasons),
    totalProviderReportedCostUsd,
    planFingerprint: plan.planFingerprint,
    certificationFingerprint: pass ? certification.certificationFingerprint : null,
  });
}

export function assertDataForSeoLiveTransportPolicy(): void {
  if (
    DATAFORSEO_TRANSPORT_POLICY.origin !== "https://api.dataforseo.com"
    || DATAFORSEO_TRANSPORT_POLICY.method !== "POST"
    || DATAFORSEO_TRANSPORT_POLICY.maxTasksPerRequest !== 1
    || DATAFORSEO_TRANSPORT_POLICY.maxCallsPerAcquisition !== 3
    || DATAFORSEO_TRANSPORT_POLICY.maxConcurrency !== 1
    || DATAFORSEO_TRANSPORT_POLICY.maxAttemptsPerCall !== 1
    || DATAFORSEO_TRANSPORT_POLICY.automaticRetry !== false
    || DATAFORSEO_ENDPOINTS.keyword_overview !== "/v3/dataforseo_labs/google/keyword_overview/live"
    || DATAFORSEO_ENDPOINTS.related_keywords !== "/v3/dataforseo_labs/google/related_keywords/live"
    || DATAFORSEO_ENDPOINTS.serp_advanced !== "/v3/serp/google/organic/live/advanced"
  ) {
    throw new Error("ugp_dataforseo_live_transport_policy_drift");
  }
}
