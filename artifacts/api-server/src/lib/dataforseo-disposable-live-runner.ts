import {
  DATAFORSEO_TRANSPORT_POLICY,
  type DataForSeoDataset,
} from "./dataforseo-controlled-transport.js";
import {
  resolveDataForSeoCredentialProfile,
} from "./dataforseo-credential-profile.js";
import {
  buildDataForSeoLiveExecutionAuthorization,
  buildDataForSeoOneShotCertificationPlan,
  runAuthorizedDataForSeoOneShotCertification,
  type DataForSeoLiveExecutionReceipt,
} from "./dataforseo-live-execution-protocol.js";

export const UGP_DATAFORSEO_DISPOSABLE_RUNNER_VERSION =
  "ugp-6-1g-dataforseo-disposable-live-runner-v1" as const;

export const UGP_DATAFORSEO_DISPOSABLE_AUTHORIZATION_ID =
  "ugp-6.1g-one-shot-2026-10-01" as const;

const EXPECTED_DATASETS = [
  "keyword_overview",
  "related_keywords",
  "serp_advanced",
] as const satisfies readonly DataForSeoDataset[];

export type DataForSeoDisposableEnvironment = Readonly<{
  DATAFORSEO_PRIMARY_LOGIN?: string;
  DATAFORSEO_PRIMARY_PASSWORD?: string;
}>;

export type DataForSeoDisposableFetch = (
  input: string,
  init: Readonly<{
    method: "POST";
    headers: Readonly<Record<string, string>>;
    body: string;
    redirect: "error";
    signal: AbortSignal;
  }>,
) => Promise<Readonly<{
  url: string;
  status: number;
  headers: Readonly<{ get(name: string): string | null }>;
  text(): Promise<string>;
}>>;

export type DataForSeoDisposableResult = Readonly<{
  runnerVersion: typeof UGP_DATAFORSEO_DISPOSABLE_RUNNER_VERSION;
  runnerSourceInitiativeCommit: "e8c82694007ff41a69732113e3d9e025c3381e1f";
  callCountObserved: 3;
  providerReportedCostUsd: number;
  receipt: DataForSeoLiveExecutionReceipt;
}>;

function exactCredential(value: string | undefined, field: string): string {
  if (
    typeof value !== "string"
    || value.length < 1
    || value.length > 2048
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_dataforseo_disposable_invalid_" + field);
  }
  return value;
}

function parseOneTaskCost(bodyText: string, dataset: DataForSeoDataset): number {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    throw new Error("ugp_dataforseo_disposable_invalid_json_" + dataset);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("ugp_dataforseo_disposable_invalid_envelope_" + dataset);
  }
  const tasks = (parsed as { tasks?: unknown }).tasks;
  if (!Array.isArray(tasks) || tasks.length !== 1) {
    throw new Error("ugp_dataforseo_disposable_expected_one_task_" + dataset);
  }
  const task = tasks[0];
  if (!task || typeof task !== "object" || Array.isArray(task)) {
    throw new Error("ugp_dataforseo_disposable_invalid_task_" + dataset);
  }
  const cost = (task as { cost?: unknown }).cost;
  if (typeof cost !== "number" || !Number.isFinite(cost) || cost < 0) {
    throw new Error("ugp_dataforseo_disposable_invalid_cost_" + dataset);
  }
  return cost;
}

export async function executeDataForSeoDisposableLiveCertification(input: {
  env: DataForSeoDisposableEnvironment;
  fetchImpl: DataForSeoDisposableFetch;
}): Promise<DataForSeoDisposableResult> {
  const plan = buildDataForSeoOneShotCertificationPlan();

  const credentials = await resolveDataForSeoCredentialProfile({
    profileId: plan.credentialProfileId,
    lookupSecret: (name) => {
      if (name === "DATAFORSEO_PRIMARY_LOGIN") {
        return input.env.DATAFORSEO_PRIMARY_LOGIN;
      }
      if (name === "DATAFORSEO_PRIMARY_PASSWORD") {
        return input.env.DATAFORSEO_PRIMARY_PASSWORD;
      }
      return undefined;
    },
  });

  const login = exactCredential(credentials.login, "login");
  const password = exactCredential(credentials.password, "password");
  const authorizationHeader =
    "Basic " + Buffer.from(login + ":" + password, "utf8").toString("base64");

  const authorization = buildDataForSeoLiveExecutionAuthorization({
    authorizationId: UGP_DATAFORSEO_DISPOSABLE_AUTHORIZATION_ID,
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

  let callIndex = 0;
  let cumulativeCostUsd = 0;

  const receipt = await runAuthorizedDataForSeoOneShotCertification({
    plan,
    authorization,
    executor: async (request) => {
      if (callIndex >= EXPECTED_DATASETS.length) {
        throw new Error("ugp_dataforseo_disposable_call_limit_exceeded");
      }
      if (request.dataset !== EXPECTED_DATASETS[callIndex]) {
        throw new Error("ugp_dataforseo_disposable_dataset_order_drift");
      }
      if (request.timeoutMs !== DATAFORSEO_TRANSPORT_POLICY.timeoutMs) {
        throw new Error("ugp_dataforseo_disposable_timeout_drift");
      }

      callIndex += 1;

      const response = await input.fetchImpl(request.url, {
        method: "POST",
        headers: Object.freeze({
          authorization: authorizationHeader,
          "content-type": "application/json",
          accept: "application/json",
        }),
        body: request.body,
        redirect: "error",
        signal: AbortSignal.timeout(DATAFORSEO_TRANSPORT_POLICY.timeoutMs),
      });

      const bodyText = await response.text();
      const responseBytes = Buffer.byteLength(bodyText, "utf8");
      if (
        responseBytes < 2
        || responseBytes > DATAFORSEO_TRANSPORT_POLICY.maxResponseBytes
      ) {
        throw new Error(
          "ugp_dataforseo_disposable_response_bounds_" + request.dataset,
        );
      }

      const costUsd = parseOneTaskCost(bodyText, request.dataset);
      cumulativeCostUsd += costUsd;
      if (cumulativeCostUsd > plan.maxProviderReportedCostUsd) {
        throw new Error("ugp_dataforseo_disposable_cost_ceiling_exceeded");
      }

      return Object.freeze({
        effectiveUrl: response.url || request.url,
        status: response.status,
        contentType: response.headers.get("content-type"),
        bodyText,
      });
    },
  });

  if (callIndex !== 3) {
    throw new Error("ugp_dataforseo_disposable_incomplete_call_count");
  }
  if (!receipt.decision.pass) {
    throw new Error(
      "ugp_dataforseo_disposable_certification_failed:"
      + receipt.decision.reasons.join(","),
    );
  }
  if (
    receipt.decision.totalProviderReportedCostUsd == null
    || receipt.decision.totalProviderReportedCostUsd !== cumulativeCostUsd
  ) {
    throw new Error("ugp_dataforseo_disposable_cost_attestation_mismatch");
  }

  return Object.freeze({
    runnerVersion: UGP_DATAFORSEO_DISPOSABLE_RUNNER_VERSION,
    runnerSourceInitiativeCommit:
      "e8c82694007ff41a69732113e3d9e025c3381e1f" as const,
    callCountObserved: 3 as const,
    providerReportedCostUsd: cumulativeCostUsd,
    receipt,
  });
}
