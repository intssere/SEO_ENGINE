import {
  buildDataForSeoControlledRequest,
  DATAFORSEO_TRANSPORT_POLICY,
  type DataForSeoDataset,
} from "./dataforseo-controlled-transport.js";
import {
  attestCapturedDataForSeoEvidence,
  type CapturedDataForSeoObservation,
  type DataForSeoCapturedCertification,
} from "./dataforseo-captured-certification.js";
import {
  buildDataForSeoLiveCertificationPlan,
  evaluateDataForSeoLiveCertification,
  type DataForSeoLiveCertificationDecision,
  type DataForSeoLiveCertificationPlan,
} from "./dataforseo-live-certification-gate.js";
import {
  buildKeywordSerpEvidenceRequest,
  stableEvidenceHash,
} from "./keyword-serp-evidence-contract.js";

export const UGP_DATAFORSEO_LIVE_EXECUTION_VERSION =
  "ugp-6-1e-dataforseo-live-execution-protocol-v1" as const;

export const UGP_DATAFORSEO_CERTIFICATION_BASIS_COMMIT =
  "9526c9409b9d8ad22dc5759b7e80cc71da6ba718" as const;

const DATASETS = [
  "keyword_overview",
  "related_keywords",
  "serp_advanced",
] as const satisfies readonly DataForSeoDataset[];

export type DataForSeoLiveExecutionAuthorization = Readonly<{
  version: typeof UGP_DATAFORSEO_LIVE_EXECUTION_VERSION;
  authorizationId: string;
  certificationBasisCommitSha: typeof UGP_DATAFORSEO_CERTIFICATION_BASIS_COMMIT;
  planFingerprint: string;
  credentialProfileId: string;
  explicitLiveProviderExecution: true;
  exactThreeCallsAuthorized: true;
  providerCostCeilingAccepted: true;
  zeroPersistenceRequired: true;
  zeroSchedulingRequired: true;
  zeroPublicationRequired: true;
  zeroProviderWritesRequired: true;
  zeroPublicSiteWritesRequired: true;
  authorizationFingerprint: string;
}>;

export type DataForSeoAuthorizedCallExecutor = (input: Readonly<{
  dataset: DataForSeoDataset;
  url: string;
  body: string;
  timeoutMs: number;
  credentialProfileId: string;
}>) => Promise<Readonly<{
  effectiveUrl: string;
  status: number;
  contentType: string | null;
  bodyText: string;
}>>;

export type DataForSeoLiveExecutionReceipt = Readonly<{
  version: typeof UGP_DATAFORSEO_LIVE_EXECUTION_VERSION;
  certificationBasisCommitSha: typeof UGP_DATAFORSEO_CERTIFICATION_BASIS_COMMIT;
  authorizationFingerprint: string;
  planFingerprint: string;
  callCount: 3;
  datasets: readonly DataForSeoDataset[];
  observationFingerprints: readonly string[];
  certification: DataForSeoCapturedCertification;
  decision: DataForSeoLiveCertificationDecision;
  assertions: Readonly<{
    oneShot: true;
    automaticRetry: false;
    maxConcurrency: 1;
    persistence: false;
    scheduling: false;
    publication: false;
    providerWrites: false;
    publicSiteWrites: false;
    credentialsReturned: false;
  }>;
  receiptFingerprint: string;
}>;

function exactAuthorizationId(value: string): string {
  if (
    value !== value.trim()
    || !/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/.test(value)
  ) {
    throw new Error("ugp_dataforseo_live_execution_invalid_authorization_id");
  }
  return value;
}

function exactFingerprint(value: string, field: string): string {
  if (!/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("ugp_dataforseo_live_execution_invalid_" + field);
  }
  return value;
}

export function buildDataForSeoOneShotCertificationPlan(): DataForSeoLiveCertificationPlan {
  const request = buildKeywordSerpEvidenceRequest({
    keyword: "stress relief journal",
    market: {
      searchEngine: "google",
      locationCode: 2840,
      languageCode: "en",
      device: "desktop",
    },
  });
  return buildDataForSeoLiveCertificationPlan({
    sourceCommitSha: UGP_DATAFORSEO_CERTIFICATION_BASIS_COMMIT,
    request,
    credentialProfileId: "dataforseo-primary",
  });
}

export function buildDataForSeoLiveExecutionAuthorization(input: {
  authorizationId: string;
  plan: DataForSeoLiveCertificationPlan;
  explicitLiveProviderExecution: true;
  exactThreeCallsAuthorized: true;
  providerCostCeilingAccepted: true;
  zeroPersistenceRequired: true;
  zeroSchedulingRequired: true;
  zeroPublicationRequired: true;
  zeroProviderWritesRequired: true;
  zeroPublicSiteWritesRequired: true;
}): DataForSeoLiveExecutionAuthorization {
  const authorizationId = exactAuthorizationId(input.authorizationId);
  if (input.plan.sourceCommitSha !== UGP_DATAFORSEO_CERTIFICATION_BASIS_COMMIT) {
    throw new Error("ugp_dataforseo_live_execution_basis_commit_drift");
  }
  exactFingerprint(input.plan.planFingerprint, "plan_fingerprint");

  if (
    input.explicitLiveProviderExecution !== true
    || input.exactThreeCallsAuthorized !== true
    || input.providerCostCeilingAccepted !== true
    || input.zeroPersistenceRequired !== true
    || input.zeroSchedulingRequired !== true
    || input.zeroPublicationRequired !== true
    || input.zeroProviderWritesRequired !== true
    || input.zeroPublicSiteWritesRequired !== true
  ) {
    throw new Error("ugp_dataforseo_live_execution_authorization_incomplete");
  }

  const base = {
    version: UGP_DATAFORSEO_LIVE_EXECUTION_VERSION,
    authorizationId,
    certificationBasisCommitSha: UGP_DATAFORSEO_CERTIFICATION_BASIS_COMMIT,
    planFingerprint: input.plan.planFingerprint,
    credentialProfileId: input.plan.credentialProfileId,
    explicitLiveProviderExecution: true as const,
    exactThreeCallsAuthorized: true as const,
    providerCostCeilingAccepted: true as const,
    zeroPersistenceRequired: true as const,
    zeroSchedulingRequired: true as const,
    zeroPublicationRequired: true as const,
    zeroProviderWritesRequired: true as const,
    zeroPublicSiteWritesRequired: true as const,
  };

  return Object.freeze({
    ...base,
    authorizationFingerprint: stableEvidenceHash({
      purpose: "ugp_dataforseo_live_execution_authorization",
      ...base,
    }),
  });
}

function assertAuthorization(
  plan: DataForSeoLiveCertificationPlan,
  authorization: DataForSeoLiveExecutionAuthorization,
): void {
  if (
    authorization.version !== UGP_DATAFORSEO_LIVE_EXECUTION_VERSION
    || authorization.certificationBasisCommitSha !== UGP_DATAFORSEO_CERTIFICATION_BASIS_COMMIT
    || authorization.planFingerprint !== plan.planFingerprint
    || authorization.credentialProfileId !== plan.credentialProfileId
    || authorization.explicitLiveProviderExecution !== true
    || authorization.exactThreeCallsAuthorized !== true
    || authorization.providerCostCeilingAccepted !== true
    || authorization.zeroPersistenceRequired !== true
    || authorization.zeroSchedulingRequired !== true
    || authorization.zeroPublicationRequired !== true
    || authorization.zeroProviderWritesRequired !== true
    || authorization.zeroPublicSiteWritesRequired !== true
  ) {
    throw new Error("ugp_dataforseo_live_execution_authorization_mismatch");
  }

  const expected = buildDataForSeoLiveExecutionAuthorization({
    authorizationId: authorization.authorizationId,
    plan,
    explicitLiveProviderExecution: true,
    exactThreeCallsAuthorized: true,
    providerCostCeilingAccepted: true,
    zeroPersistenceRequired: true,
    zeroSchedulingRequired: true,
    zeroPublicationRequired: true,
    zeroProviderWritesRequired: true,
    zeroPublicSiteWritesRequired: true,
  });

  if (expected.authorizationFingerprint !== authorization.authorizationFingerprint) {
    throw new Error("ugp_dataforseo_live_execution_authorization_integrity_failed");
  }
}

function parseObservation(input: {
  dataset: DataForSeoDataset;
  expectedUrl: string;
  observed: Awaited<ReturnType<DataForSeoAuthorizedCallExecutor>>;
}): CapturedDataForSeoObservation {
  if (input.observed.effectiveUrl !== input.expectedUrl) {
    throw new Error("ugp_dataforseo_live_execution_effective_url_drift_" + input.dataset);
  }
  if (
    !Number.isInteger(input.observed.status)
    || input.observed.status < 200
    || input.observed.status >= 300
  ) {
    throw new Error("ugp_dataforseo_live_execution_http_status_" + input.dataset);
  }
  if (
    typeof input.observed.contentType !== "string"
    || !/^application\/json(?:\s*;|$)/i.test(input.observed.contentType.trim())
  ) {
    throw new Error("ugp_dataforseo_live_execution_json_required_" + input.dataset);
  }
  const responseBytes = Buffer.byteLength(input.observed.bodyText, "utf8");
  if (
    responseBytes < 2
    || responseBytes > DATAFORSEO_TRANSPORT_POLICY.maxResponseBytes
  ) {
    throw new Error("ugp_dataforseo_live_execution_response_bounds_" + input.dataset);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(input.observed.bodyText);
  } catch {
    throw new Error("ugp_dataforseo_live_execution_invalid_json_" + input.dataset);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("ugp_dataforseo_live_execution_invalid_payload_" + input.dataset);
  }

  return Object.freeze({
    dataset: input.dataset,
    effectiveUrl: input.observed.effectiveUrl,
    status: input.observed.status,
    contentType: input.observed.contentType,
    responseBytes,
    payload,
  });
}

export async function runAuthorizedDataForSeoOneShotCertification(input: {
  plan: DataForSeoLiveCertificationPlan;
  authorization: DataForSeoLiveExecutionAuthorization;
  executor: DataForSeoAuthorizedCallExecutor;
}): Promise<DataForSeoLiveExecutionReceipt> {
  assertAuthorization(input.plan, input.authorization);

  if (
    input.plan.sourceCommitSha !== UGP_DATAFORSEO_CERTIFICATION_BASIS_COMMIT
    || input.plan.maxCalls !== 3
    || input.plan.maxAttemptsPerCall !== 1
    || input.plan.automaticRetry !== false
    || input.plan.maxConcurrency !== 1
    || input.plan.persistence !== false
    || input.plan.scheduling !== false
    || input.plan.publication !== false
    || input.plan.providerWrites !== false
    || input.plan.publicSiteWrites !== false
  ) {
    throw new Error("ugp_dataforseo_live_execution_plan_unsafe");
  }

  const observations: CapturedDataForSeoObservation[] = [];

  for (const dataset of DATASETS) {
    const controlled = buildDataForSeoControlledRequest({
      dataset,
      request: input.plan.request,
    });

    let observed: Awaited<ReturnType<DataForSeoAuthorizedCallExecutor>>;
    try {
      observed = await input.executor({
        dataset,
        url: controlled.url,
        body: controlled.body,
        timeoutMs: DATAFORSEO_TRANSPORT_POLICY.timeoutMs,
        credentialProfileId: input.plan.credentialProfileId,
      });
    } catch {
      throw new Error("ugp_dataforseo_live_execution_transport_failed_" + dataset);
    }

    observations.push(parseObservation({
      dataset,
      expectedUrl: controlled.url,
      observed,
    }));
  }

  const certification = attestCapturedDataForSeoEvidence({
    sourceCommitSha: input.plan.sourceCommitSha,
    request: input.plan.request,
    observations,
  });
  const decision = evaluateDataForSeoLiveCertification({
    plan: input.plan,
    certification,
  });

  const assertions = Object.freeze({
    oneShot: true as const,
    automaticRetry: false as const,
    maxConcurrency: 1 as const,
    persistence: false as const,
    scheduling: false as const,
    publication: false as const,
    providerWrites: false as const,
    publicSiteWrites: false as const,
    credentialsReturned: false as const,
  });

  const base = {
    version: UGP_DATAFORSEO_LIVE_EXECUTION_VERSION,
    certificationBasisCommitSha: UGP_DATAFORSEO_CERTIFICATION_BASIS_COMMIT,
    authorizationFingerprint: input.authorization.authorizationFingerprint,
    planFingerprint: input.plan.planFingerprint,
    callCount: 3 as const,
    datasets: Object.freeze([...DATASETS]),
    observationFingerprints: certification.observationFingerprints,
    certification,
    decision,
    assertions,
  };

  return Object.freeze({
    ...base,
    receiptFingerprint: stableEvidenceHash({
      purpose: "ugp_dataforseo_live_execution_receipt",
      ...base,
    }),
  });
}
