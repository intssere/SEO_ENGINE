import {
  normalizeDataForSeoKeywordSerpFixtures,
} from "./dataforseo-keyword-serp-adapter.js";
import {
  stableEvidenceHash,
  type KeywordSerpEvidenceBundle,
  type KeywordSerpEvidenceRequest,
} from "./keyword-serp-evidence-contract.js";

export const UGP_DATAFORSEO_TRANSPORT_VERSION =
  "ugp-6-1b-dataforseo-controlled-transport-v1" as const;

export type DataForSeoDataset =
  | "keyword_overview"
  | "related_keywords"
  | "serp_advanced";

export const DATAFORSEO_ENDPOINTS = Object.freeze({
  keyword_overview: "/v3/dataforseo_labs/google/keyword_overview/live",
  related_keywords: "/v3/dataforseo_labs/google/related_keywords/live",
  serp_advanced: "/v3/serp/google/organic/live/advanced",
} satisfies Record<DataForSeoDataset, string>);

export const DATAFORSEO_TRANSPORT_POLICY = Object.freeze({
  origin: "https://api.dataforseo.com",
  method: "POST" as const,
  authScheme: "Basic" as const,
  maxTasksPerRequest: 1,
  maxCallsPerAcquisition: 3,
  maxConcurrency: 1,
  maxAttemptsPerCall: 1,
  automaticRetry: false as const,
  timeoutMs: 15_000,
  maxResponseBytes: 5_000_000,
  grantsAuthorization: false as const,
  grantsProviderWrite: false as const,
  grantsPublicSiteWrite: false as const,
  returnsCredentialMaterial: false as const,
});

export type DataForSeoCredentialMaterial = Readonly<{
  login: string;
  password: string;
}>;

export type DataForSeoCredentialResolver = (
  credentialProfileId: string,
) => Promise<DataForSeoCredentialMaterial>;

export type DataForSeoHttpResponse = Readonly<{
  status: number;
  contentType: string | null;
  bodyText: string;
}>;

export type DataForSeoHttpClient = (input: Readonly<{
  url: string;
  method: "POST";
  headers: Readonly<Record<string, string>>;
  body: string;
  timeoutMs: number;
}>) => Promise<DataForSeoHttpResponse>;

export type DataForSeoLiveCertificationGate = Readonly<{
  version: typeof UGP_DATAFORSEO_TRANSPORT_VERSION;
  certificationId: string;
  commercialUseAccepted: true;
  credentialInjectionReviewed: true;
  endpointAllowlistCertified: true;
  costBoundaryAccepted: true;
  providerWriteSeparationCertified: true;
  enabled: true;
  gateFingerprint: string;
}>;

export type DataForSeoControlledRequest = Readonly<{
  version: typeof UGP_DATAFORSEO_TRANSPORT_VERSION;
  dataset: DataForSeoDataset;
  url: string;
  body: string;
  requestFingerprint: string;
}>;

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
    .join(",") + "}";
}

function exactCredentialProfileId(value: unknown): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || !/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/.test(value)
  ) {
    throw new Error("ugp_dataforseo_invalid_credential_profile_id");
  }
  return value;
}

function exactCredential(value: unknown, field: string): string {
  if (
    typeof value !== "string"
    || value.length < 1
    || value.length > 2048
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_dataforseo_invalid_" + field);
  }
  return value;
}

function assertGate(gate: DataForSeoLiveCertificationGate): void {
  if (
    !gate
    || gate.version !== UGP_DATAFORSEO_TRANSPORT_VERSION
    || gate.enabled !== true
    || gate.commercialUseAccepted !== true
    || gate.credentialInjectionReviewed !== true
    || gate.endpointAllowlistCertified !== true
    || gate.costBoundaryAccepted !== true
    || gate.providerWriteSeparationCertified !== true
    || !/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/.test(gate.certificationId)
  ) {
    throw new Error("ugp_dataforseo_live_gate_closed");
  }
  const expected = stableEvidenceHash({
    purpose: "ugp_dataforseo_live_certification_gate",
    version: gate.version,
    certificationId: gate.certificationId,
    commercialUseAccepted: true,
    credentialInjectionReviewed: true,
    endpointAllowlistCertified: true,
    costBoundaryAccepted: true,
    providerWriteSeparationCertified: true,
    enabled: true,
  });
  if (gate.gateFingerprint !== expected) {
    throw new Error("ugp_dataforseo_live_gate_integrity_failed");
  }
}

export function buildDataForSeoLiveCertificationGate(input: {
  certificationId: string;
  commercialUseAccepted: true;
  credentialInjectionReviewed: true;
  endpointAllowlistCertified: true;
  costBoundaryAccepted: true;
  providerWriteSeparationCertified: true;
}): DataForSeoLiveCertificationGate {
  const base = {
    version: UGP_DATAFORSEO_TRANSPORT_VERSION,
    certificationId: input.certificationId,
    commercialUseAccepted: input.commercialUseAccepted,
    credentialInjectionReviewed: input.credentialInjectionReviewed,
    endpointAllowlistCertified: input.endpointAllowlistCertified,
    costBoundaryAccepted: input.costBoundaryAccepted,
    providerWriteSeparationCertified: input.providerWriteSeparationCertified,
    enabled: true as const,
  };
  return Object.freeze({
    ...base,
    gateFingerprint: stableEvidenceHash({
      purpose: "ugp_dataforseo_live_certification_gate",
      ...base,
    }),
  });
}

function providerTask(
  dataset: DataForSeoDataset,
  request: KeywordSerpEvidenceRequest,
): Record<string, unknown> {
  if (request.keyword.length > 80) {
    throw new Error("ugp_dataforseo_keyword_too_long");
  }
  const scope = {
    location_code: request.market.locationCode,
    language_code: request.market.languageCode,
  };
  if (dataset === "keyword_overview") {
    return {
      keywords: [request.keyword],
      ...scope,
    };
  }
  if (dataset === "related_keywords") {
    return {
      keyword: request.keyword,
      ...scope,
      depth: 1,
      limit: 100,
      include_seed_keyword: false,
      include_serp_info: false,
    };
  }
  return {
    keyword: request.keyword,
    ...scope,
    device: request.market.device,
    depth: 10,
  };
}

export function buildDataForSeoControlledRequest(input: {
  dataset: DataForSeoDataset;
  request: KeywordSerpEvidenceRequest;
}): DataForSeoControlledRequest {
  const path = DATAFORSEO_ENDPOINTS[input.dataset];
  if (!path) throw new Error("ugp_dataforseo_endpoint_not_allowed");
  const body = stableJson([providerTask(input.dataset, input.request)]);
  const url = DATAFORSEO_TRANSPORT_POLICY.origin + path;
  return Object.freeze({
    version: UGP_DATAFORSEO_TRANSPORT_VERSION,
    dataset: input.dataset,
    url,
    body,
    requestFingerprint: stableEvidenceHash({
      purpose: "ugp_dataforseo_controlled_request",
      version: UGP_DATAFORSEO_TRANSPORT_VERSION,
      dataset: input.dataset,
      evidenceRequestFingerprint: input.request.requestFingerprint,
      url,
      body,
    }),
  });
}

function assertResponse(
  response: DataForSeoHttpResponse,
  dataset: DataForSeoDataset,
): Record<string, unknown> {
  if (!Number.isInteger(response.status) || response.status < 200 || response.status >= 300) {
    throw new Error("ugp_dataforseo_http_failed_" + dataset);
  }
  if (
    typeof response.contentType !== "string"
    || !/^application\/json(?:\s*;|$)/i.test(response.contentType)
  ) {
    throw new Error("ugp_dataforseo_non_json_" + dataset);
  }
  const bytes = Buffer.byteLength(response.bodyText, "utf8");
  if (bytes < 2 || bytes > DATAFORSEO_TRANSPORT_POLICY.maxResponseBytes) {
    throw new Error("ugp_dataforseo_response_size_" + dataset);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(response.bodyText);
  } catch {
    throw new Error("ugp_dataforseo_invalid_json_" + dataset);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("ugp_dataforseo_invalid_envelope_" + dataset);
  }
  return parsed as Record<string, unknown>;
}

async function executeOne(input: {
  controlled: DataForSeoControlledRequest;
  credentialProfileId: string;
  resolveCredentials: DataForSeoCredentialResolver;
  httpClient: DataForSeoHttpClient;
}): Promise<Record<string, unknown>> {
  const credentialProfileId = exactCredentialProfileId(input.credentialProfileId);
  const credentials = await input.resolveCredentials(credentialProfileId);
  const login = exactCredential(credentials.login, "login");
  const password = exactCredential(credentials.password, "password");
  const authorization = "Basic " + Buffer.from(login + ":" + password, "utf8").toString("base64");

  let response: DataForSeoHttpResponse;
  try {
    response = await input.httpClient({
      url: input.controlled.url,
      method: "POST",
      headers: Object.freeze({
        authorization,
        "content-type": "application/json",
        accept: "application/json",
      }),
      body: input.controlled.body,
      timeoutMs: DATAFORSEO_TRANSPORT_POLICY.timeoutMs,
    });
  } catch {
    throw new Error("ugp_dataforseo_transport_failed_" + input.controlled.dataset);
  }

  return assertResponse(response, input.controlled.dataset);
}

export async function acquireDataForSeoKeywordSerpEvidence(input: {
  request: KeywordSerpEvidenceRequest;
  credentialProfileId: string;
  gate: DataForSeoLiveCertificationGate;
  resolveCredentials: DataForSeoCredentialResolver;
  httpClient: DataForSeoHttpClient;
}): Promise<KeywordSerpEvidenceBundle> {
  assertGate(input.gate);

  const overview = buildDataForSeoControlledRequest({
    dataset: "keyword_overview",
    request: input.request,
  });
  const related = buildDataForSeoControlledRequest({
    dataset: "related_keywords",
    request: input.request,
  });
  const serp = buildDataForSeoControlledRequest({
    dataset: "serp_advanced",
    request: input.request,
  });

  // Sequential by design: max concurrency 1, exactly one attempt per paid call.
  const keywordOverview = await executeOne({
    controlled: overview,
    credentialProfileId: input.credentialProfileId,
    resolveCredentials: input.resolveCredentials,
    httpClient: input.httpClient,
  });
  const relatedKeywords = await executeOne({
    controlled: related,
    credentialProfileId: input.credentialProfileId,
    resolveCredentials: input.resolveCredentials,
    httpClient: input.httpClient,
  });
  const serpAdvanced = await executeOne({
    controlled: serp,
    credentialProfileId: input.credentialProfileId,
    resolveCredentials: input.resolveCredentials,
    httpClient: input.httpClient,
  });

  return normalizeDataForSeoKeywordSerpFixtures({
    request: input.request,
    keywordOverview,
    relatedKeywords,
    serpAdvanced,
  });
}
