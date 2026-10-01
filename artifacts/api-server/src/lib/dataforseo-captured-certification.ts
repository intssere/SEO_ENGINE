import {
  buildDataForSeoControlledRequest,
  DATAFORSEO_TRANSPORT_POLICY,
  type DataForSeoDataset,
} from "./dataforseo-controlled-transport.js";
import {
  normalizeDataForSeoKeywordSerpFixtures,
} from "./dataforseo-keyword-serp-adapter.js";
import {
  stableEvidenceHash,
  type KeywordSerpEvidenceBundle,
  type KeywordSerpEvidenceRequest,
} from "./keyword-serp-evidence-contract.js";

export const UGP_DATAFORSEO_CAPTURED_CERT_VERSION =
  "ugp-6-1c-dataforseo-captured-certification-v1" as const;

export type CapturedDataForSeoObservation = Readonly<{
  dataset: DataForSeoDataset;
  effectiveUrl: string;
  status: number;
  contentType: string;
  responseBytes: number;
  payload: unknown;
}>;

export type DataForSeoCapturedCertification = Readonly<{
  version: typeof UGP_DATAFORSEO_CAPTURED_CERT_VERSION;
  sourceCommitSha: string;
  requestFingerprint: string;
  marketFingerprint: string;
  endpointFingerprints: Readonly<Record<DataForSeoDataset, string>>;
  evidence: KeywordSerpEvidenceBundle;
  observationFingerprints: readonly string[];
  assertions: Readonly<{
    offlineOnly: true;
    networkCalls: false;
    credentialsPresent: false;
    providerWrites: false;
    publicSiteWrites: false;
    persistence: false;
    scheduling: false;
    autonomousExecution: false;
  }>;
  certificationFingerprint: string;
}>;

const DATASETS = [
  "keyword_overview",
  "related_keywords",
  "serp_advanced",
] as const satisfies readonly DataForSeoDataset[];

function exactSourceSha(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value)) {
    throw new Error("ugp_dataforseo_cert_invalid_source_sha");
  }
  return value;
}

function expectedUrl(dataset: DataForSeoDataset, request: KeywordSerpEvidenceRequest) {
  return buildDataForSeoControlledRequest({ dataset, request }).url;
}

function normalizePayload(value: unknown, dataset: DataForSeoDataset) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("ugp_dataforseo_cert_invalid_payload_" + dataset);
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new Error("ugp_dataforseo_cert_non_json_payload_" + dataset);
  }
  if (Buffer.byteLength(serialized, "utf8") > DATAFORSEO_TRANSPORT_POLICY.maxResponseBytes) {
    throw new Error("ugp_dataforseo_cert_payload_too_large_" + dataset);
  }
  return value as Record<string, unknown>;
}

export function attestCapturedDataForSeoEvidence(input: {
  sourceCommitSha: string;
  request: KeywordSerpEvidenceRequest;
  observations: readonly CapturedDataForSeoObservation[];
}): DataForSeoCapturedCertification {
  const sourceCommitSha = exactSourceSha(input.sourceCommitSha);
  if (input.observations.length !== 3) {
    throw new Error("ugp_dataforseo_cert_exact_three_observations_required");
  }

  const byDataset = new Map(
    input.observations.map((observation) => [observation.dataset, observation] as const),
  );
  if (byDataset.size !== 3 || DATASETS.some((dataset) => !byDataset.has(dataset))) {
    throw new Error("ugp_dataforseo_cert_dataset_set_required");
  }

  const endpointFingerprints = {} as Record<DataForSeoDataset, string>;
  const observationFingerprints: string[] = [];
  const providerPayloads = {} as Record<DataForSeoDataset, Record<string, unknown>>;

  for (const dataset of DATASETS) {
    const observation = byDataset.get(dataset)!;
    const url = expectedUrl(dataset, input.request);
    if (observation.effectiveUrl !== url) {
      throw new Error("ugp_dataforseo_cert_effective_url_drift_" + dataset);
    }
    if (!Number.isInteger(observation.status) || observation.status < 200 || observation.status >= 300) {
      throw new Error("ugp_dataforseo_cert_http_status_" + dataset);
    }
    if (!/^application\/json(?:\s*;|$)/i.test(observation.contentType.trim())) {
      throw new Error("ugp_dataforseo_cert_json_required_" + dataset);
    }
    if (
      !Number.isSafeInteger(observation.responseBytes)
      || observation.responseBytes < 2
      || observation.responseBytes > DATAFORSEO_TRANSPORT_POLICY.maxResponseBytes
    ) {
      throw new Error("ugp_dataforseo_cert_response_bounds_" + dataset);
    }

    const payload = normalizePayload(observation.payload, dataset);
    providerPayloads[dataset] = payload;
    endpointFingerprints[dataset] = stableEvidenceHash({
      purpose: "ugp_dataforseo_cert_endpoint",
      dataset,
      url,
      requestFingerprint: input.request.requestFingerprint,
    });
    observationFingerprints.push(stableEvidenceHash({
      purpose: "ugp_dataforseo_cert_observation",
      dataset,
      effectiveUrl: observation.effectiveUrl,
      status: observation.status,
      contentType: observation.contentType,
      responseBytes: observation.responseBytes,
      payload,
    }));
  }

  const evidence = normalizeDataForSeoKeywordSerpFixtures({
    request: input.request,
    keywordOverview: providerPayloads.keyword_overview,
    relatedKeywords: providerPayloads.related_keywords,
    serpAdvanced: providerPayloads.serp_advanced,
  });

  const assertions = Object.freeze({
    offlineOnly: true as const,
    networkCalls: false as const,
    credentialsPresent: false as const,
    providerWrites: false as const,
    publicSiteWrites: false as const,
    persistence: false as const,
    scheduling: false as const,
    autonomousExecution: false as const,
  });

  const base = {
    version: UGP_DATAFORSEO_CAPTURED_CERT_VERSION,
    sourceCommitSha,
    requestFingerprint: input.request.requestFingerprint,
    marketFingerprint: stableEvidenceHash(input.request.market),
    endpointFingerprints: Object.freeze({ ...endpointFingerprints }),
    evidence,
    observationFingerprints: Object.freeze([...observationFingerprints]),
    assertions,
  };

  return Object.freeze({
    ...base,
    certificationFingerprint: stableEvidenceHash({
      purpose: "ugp_dataforseo_captured_certification",
      ...base,
    }),
  });
}
