import { createHash } from "node:crypto";
import { normalizeBacklinkDomain } from "./backlink-fixture-normalization.js";
import {
  assertDataForSeoBacklinkAdapterIntegrity,
  normalizeCapturedDataForSeoBacklinks,
  type DataForSeoBacklinkAdapterResult,
  type DataForSeoBacklinkRankScale,
} from "./dataforseo-backlink-adapter.js";

export const UGP_DATAFORSEO_BACKLINK_ACQUISITION_VERSION =
  "ugp-9-1c-dataforseo-backlink-controlled-acquisition-v1" as const;

export const DATAFORSEO_BACKLINK_ENDPOINT =
  "/v3/backlinks/backlinks/live" as const;

export const DATAFORSEO_BACKLINK_ACQUISITION_POLICY = Object.freeze({
  origin: "https://api.dataforseo.com",
  method: "POST" as const,
  credentialProfileId: "dataforseo-primary" as const,
  maxCalls: 1 as const,
  maxAttemptsPerCall: 1 as const,
  automaticRetry: false as const,
  maxConcurrency: 1 as const,
  timeoutMs: 15_000 as const,
  maxResponseBytes: 5_000_000 as const,
  maxProviderReportedCostUsd: 1.0 as const,
  mode: "as_is" as const,
  backlinksStatusType: "all" as const,
  includeSubdomains: true as const,
  excludeInternalBacklinks: true as const,
  offset: 0 as const,
  limit: 100 as const,
  providerWrites: false as const,
  publicSiteWrites: false as const,
  persistence: false as const,
  scheduling: false as const,
  autonomousExecution: false as const,
  outreach: false as const,
});

export type DataForSeoBacklinkControlledRequest = Readonly<{
  version: typeof UGP_DATAFORSEO_BACKLINK_ACQUISITION_VERSION;
  url: string;
  body: string;
  targetDomain: string;
  rankScale: DataForSeoBacklinkRankScale;
  limit: 100;
  requestFingerprint: string;
}>;

export type DataForSeoBacklinkCertificationPlan = Readonly<{
  version: typeof UGP_DATAFORSEO_BACKLINK_ACQUISITION_VERSION;
  sourceCommitSha: string;
  credentialProfileId: "dataforseo-primary";
  sourceFingerprint: string;
  evidenceRequestFingerprint: string;
  marketFingerprint: string;
  categoryFingerprint: string;
  controlledRequest: DataForSeoBacklinkControlledRequest;
  maxProviderReportedCostUsd: 1;
  maxCalls: 1;
  maxAttemptsPerCall: 1;
  automaticRetry: false;
  maxConcurrency: 1;
  persistence: false;
  scheduling: false;
  autonomousExecution: false;
  outreach: false;
  providerWrites: false;
  publicSiteWrites: false;
  planFingerprint: string;
}>;

export type DataForSeoBacklinkExecutionAuthorization = Readonly<{
  version: typeof UGP_DATAFORSEO_BACKLINK_ACQUISITION_VERSION;
  authorizationId: string;
  sourceCommitSha: string;
  planFingerprint: string;
  credentialProfileId: "dataforseo-primary";
  explicitLiveProviderExecution: true;
  exactOneCallAuthorized: true;
  providerCostCeilingAccepted: true;
  zeroPersistenceRequired: true;
  zeroSchedulingRequired: true;
  zeroAutonomousExecutionRequired: true;
  zeroOutreachRequired: true;
  zeroProviderWritesRequired: true;
  zeroPublicSiteWritesRequired: true;
  authorizationFingerprint: string;
}>;

export type DataForSeoBacklinkAuthorizedExecutor = (
  input: Readonly<{
    url: string;
    body: string;
    timeoutMs: number;
    credentialProfileId: "dataforseo-primary";
  }>,
) => Promise<Readonly<{
  effectiveUrl: string;
  status: number;
  contentType: string | null;
  bodyText: string;
  observedAt: string;
}>>;

export type DataForSeoBacklinkAcquisitionReceipt = Readonly<{
  version: typeof UGP_DATAFORSEO_BACKLINK_ACQUISITION_VERSION;
  sourceCommitSha: string;
  planFingerprint: string;
  authorizationFingerprint: string;
  controlledRequestFingerprint: string;
  callCount: 1;
  providerReportedCostUsd: number;
  evidence: DataForSeoBacklinkAdapterResult;
  assertions: Readonly<{
    oneShot: true;
    automaticRetry: false;
    maxConcurrency: 1;
    persistence: false;
    scheduling: false;
    autonomousExecution: false;
    outreach: false;
    providerWrites: false;
    publicSiteWrites: false;
    credentialsReturned: false;
  }>;
  receiptFingerprint: string;
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

function hash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function exactSha(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value)) {
    throw new Error("ugp_dataforseo_backlink_acquisition_invalid_source_sha");
  }
  return value;
}

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("ugp_dataforseo_backlink_acquisition_invalid_" + field);
  }
  return value;
}

function exactAuthorizationId(value: unknown): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || !/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/.test(value)
  ) {
    throw new Error("ugp_dataforseo_backlink_acquisition_invalid_authorization_id");
  }
  return value;
}

function canonicalTimestamp(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 64) {
    throw new Error("ugp_dataforseo_backlink_acquisition_invalid_observed_at");
  }
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) {
    throw new Error("ugp_dataforseo_backlink_acquisition_invalid_observed_at");
  }
  return new Date(ms).toISOString();
}

function providerTask(input: {
  targetDomain: string;
  rankScale: DataForSeoBacklinkRankScale;
}): Record<string, unknown> {
  return {
    target: input.targetDomain,
    mode: DATAFORSEO_BACKLINK_ACQUISITION_POLICY.mode,
    backlinks_status_type:
      DATAFORSEO_BACKLINK_ACQUISITION_POLICY.backlinksStatusType,
    include_subdomains:
      DATAFORSEO_BACKLINK_ACQUISITION_POLICY.includeSubdomains,
    exclude_internal_backlinks:
      DATAFORSEO_BACKLINK_ACQUISITION_POLICY.excludeInternalBacklinks,
    offset: DATAFORSEO_BACKLINK_ACQUISITION_POLICY.offset,
    limit: DATAFORSEO_BACKLINK_ACQUISITION_POLICY.limit,
    rank_scale: input.rankScale,
  };
}

export function buildDataForSeoBacklinkControlledRequest(input: {
  targetDomain: string;
  rankScale: DataForSeoBacklinkRankScale;
  evidenceRequestFingerprint: string;
}): DataForSeoBacklinkControlledRequest {
  const targetDomain = normalizeBacklinkDomain(input.targetDomain, {
    allowUrl: true,
  });
  if (
    input.rankScale !== "one_hundred"
    && input.rankScale !== "one_thousand"
  ) {
    throw new Error("ugp_dataforseo_backlink_acquisition_invalid_rank_scale");
  }
  const evidenceRequestFingerprint = exactFingerprint(
    input.evidenceRequestFingerprint,
    "evidence_request_fingerprint",
  );
  const url =
    DATAFORSEO_BACKLINK_ACQUISITION_POLICY.origin
    + DATAFORSEO_BACKLINK_ENDPOINT;
  const body = stableJson([
    providerTask({
      targetDomain,
      rankScale: input.rankScale,
    }),
  ]);
  return Object.freeze({
    version: UGP_DATAFORSEO_BACKLINK_ACQUISITION_VERSION,
    url,
    body,
    targetDomain,
    rankScale: input.rankScale,
    limit: DATAFORSEO_BACKLINK_ACQUISITION_POLICY.limit,
    requestFingerprint: hash({
      purpose: "ugp_dataforseo_backlink_controlled_request",
      version: UGP_DATAFORSEO_BACKLINK_ACQUISITION_VERSION,
      evidenceRequestFingerprint,
      url,
      body,
    }),
  });
}

export function buildDataForSeoBacklinkCertificationPlan(input: {
  sourceCommitSha: string;
  targetDomain: string;
  rankScale: DataForSeoBacklinkRankScale;
  sourceFingerprint: string;
  evidenceRequestFingerprint: string;
  marketFingerprint: string;
  categoryFingerprint: string;
}): DataForSeoBacklinkCertificationPlan {
  const sourceCommitSha = exactSha(input.sourceCommitSha);
  const sourceFingerprint = exactFingerprint(
    input.sourceFingerprint,
    "source_fingerprint",
  );
  const evidenceRequestFingerprint = exactFingerprint(
    input.evidenceRequestFingerprint,
    "evidence_request_fingerprint",
  );
  const marketFingerprint = exactFingerprint(
    input.marketFingerprint,
    "market_fingerprint",
  );
  const categoryFingerprint = exactFingerprint(
    input.categoryFingerprint,
    "category_fingerprint",
  );
  const controlledRequest = buildDataForSeoBacklinkControlledRequest({
    targetDomain: input.targetDomain,
    rankScale: input.rankScale,
    evidenceRequestFingerprint,
  });

  const base = {
    version: UGP_DATAFORSEO_BACKLINK_ACQUISITION_VERSION,
    sourceCommitSha,
    credentialProfileId:
      DATAFORSEO_BACKLINK_ACQUISITION_POLICY.credentialProfileId,
    sourceFingerprint,
    evidenceRequestFingerprint,
    marketFingerprint,
    categoryFingerprint,
    controlledRequest,
    maxProviderReportedCostUsd:
      DATAFORSEO_BACKLINK_ACQUISITION_POLICY.maxProviderReportedCostUsd,
    maxCalls: DATAFORSEO_BACKLINK_ACQUISITION_POLICY.maxCalls,
    maxAttemptsPerCall:
      DATAFORSEO_BACKLINK_ACQUISITION_POLICY.maxAttemptsPerCall,
    automaticRetry:
      DATAFORSEO_BACKLINK_ACQUISITION_POLICY.automaticRetry,
    maxConcurrency:
      DATAFORSEO_BACKLINK_ACQUISITION_POLICY.maxConcurrency,
    persistence: false as const,
    scheduling: false as const,
    autonomousExecution: false as const,
    outreach: false as const,
    providerWrites: false as const,
    publicSiteWrites: false as const,
  };

  return Object.freeze({
    ...base,
    planFingerprint: hash({
      purpose: "ugp_dataforseo_backlink_certification_plan",
      ...base,
    }),
  });
}

export function buildDataForSeoBacklinkExecutionAuthorization(input: {
  authorizationId: string;
  plan: DataForSeoBacklinkCertificationPlan;
  explicitLiveProviderExecution: true;
  exactOneCallAuthorized: true;
  providerCostCeilingAccepted: true;
  zeroPersistenceRequired: true;
  zeroSchedulingRequired: true;
  zeroAutonomousExecutionRequired: true;
  zeroOutreachRequired: true;
  zeroProviderWritesRequired: true;
  zeroPublicSiteWritesRequired: true;
}): DataForSeoBacklinkExecutionAuthorization {
  const authorizationId = exactAuthorizationId(input.authorizationId);
  assertDataForSeoBacklinkCertificationPlanIntegrity(input.plan);

  if (
    input.explicitLiveProviderExecution !== true
    || input.exactOneCallAuthorized !== true
    || input.providerCostCeilingAccepted !== true
    || input.zeroPersistenceRequired !== true
    || input.zeroSchedulingRequired !== true
    || input.zeroAutonomousExecutionRequired !== true
    || input.zeroOutreachRequired !== true
    || input.zeroProviderWritesRequired !== true
    || input.zeroPublicSiteWritesRequired !== true
  ) {
    throw new Error(
      "ugp_dataforseo_backlink_acquisition_authorization_incomplete",
    );
  }

  const base = {
    version: UGP_DATAFORSEO_BACKLINK_ACQUISITION_VERSION,
    authorizationId,
    sourceCommitSha: input.plan.sourceCommitSha,
    planFingerprint: input.plan.planFingerprint,
    credentialProfileId: input.plan.credentialProfileId,
    explicitLiveProviderExecution: true as const,
    exactOneCallAuthorized: true as const,
    providerCostCeilingAccepted: true as const,
    zeroPersistenceRequired: true as const,
    zeroSchedulingRequired: true as const,
    zeroAutonomousExecutionRequired: true as const,
    zeroOutreachRequired: true as const,
    zeroProviderWritesRequired: true as const,
    zeroPublicSiteWritesRequired: true as const,
  };
  return Object.freeze({
    ...base,
    authorizationFingerprint: hash({
      purpose: "ugp_dataforseo_backlink_execution_authorization",
      ...base,
    }),
  });
}

export function assertDataForSeoBacklinkCertificationPlanIntegrity(
  plan: DataForSeoBacklinkCertificationPlan,
): void {
  if (!plan || plan.version !== UGP_DATAFORSEO_BACKLINK_ACQUISITION_VERSION) {
    throw new Error("ugp_dataforseo_backlink_acquisition_plan_version_invalid");
  }
  exactSha(plan.sourceCommitSha);
  exactFingerprint(plan.sourceFingerprint, "source_fingerprint");
  exactFingerprint(
    plan.evidenceRequestFingerprint,
    "evidence_request_fingerprint",
  );
  exactFingerprint(plan.marketFingerprint, "market_fingerprint");
  exactFingerprint(plan.categoryFingerprint, "category_fingerprint");
  exactFingerprint(plan.planFingerprint, "plan_fingerprint");

  if (
    plan.credentialProfileId
      !== DATAFORSEO_BACKLINK_ACQUISITION_POLICY.credentialProfileId
    || plan.maxProviderReportedCostUsd
      !== DATAFORSEO_BACKLINK_ACQUISITION_POLICY.maxProviderReportedCostUsd
    || plan.maxCalls !== 1
    || plan.maxAttemptsPerCall !== 1
    || plan.automaticRetry !== false
    || plan.maxConcurrency !== 1
    || plan.persistence !== false
    || plan.scheduling !== false
    || plan.autonomousExecution !== false
    || plan.outreach !== false
    || plan.providerWrites !== false
    || plan.publicSiteWrites !== false
  ) {
    throw new Error("ugp_dataforseo_backlink_acquisition_plan_unsafe");
  }

  const rebuiltRequest = buildDataForSeoBacklinkControlledRequest({
    targetDomain: plan.controlledRequest.targetDomain,
    rankScale: plan.controlledRequest.rankScale,
    evidenceRequestFingerprint: plan.evidenceRequestFingerprint,
  });
  if (
    JSON.stringify(rebuiltRequest) !== JSON.stringify(plan.controlledRequest)
  ) {
    throw new Error(
      "ugp_dataforseo_backlink_acquisition_controlled_request_mismatch",
    );
  }

  const { planFingerprint, ...base } = plan;
  const expected = hash({
    purpose: "ugp_dataforseo_backlink_certification_plan",
    ...base,
  });
  if (planFingerprint !== expected) {
    throw new Error(
      "ugp_dataforseo_backlink_acquisition_plan_fingerprint_mismatch",
    );
  }
}

function assertAuthorization(
  plan: DataForSeoBacklinkCertificationPlan,
  authorization: DataForSeoBacklinkExecutionAuthorization,
): void {
  assertDataForSeoBacklinkCertificationPlanIntegrity(plan);
  if (
    authorization.version !== UGP_DATAFORSEO_BACKLINK_ACQUISITION_VERSION
    || authorization.sourceCommitSha !== plan.sourceCommitSha
    || authorization.planFingerprint !== plan.planFingerprint
    || authorization.credentialProfileId !== plan.credentialProfileId
    || authorization.explicitLiveProviderExecution !== true
    || authorization.exactOneCallAuthorized !== true
    || authorization.providerCostCeilingAccepted !== true
    || authorization.zeroPersistenceRequired !== true
    || authorization.zeroSchedulingRequired !== true
    || authorization.zeroAutonomousExecutionRequired !== true
    || authorization.zeroOutreachRequired !== true
    || authorization.zeroProviderWritesRequired !== true
    || authorization.zeroPublicSiteWritesRequired !== true
  ) {
    throw new Error(
      "ugp_dataforseo_backlink_acquisition_authorization_mismatch",
    );
  }

  const expected = buildDataForSeoBacklinkExecutionAuthorization({
    authorizationId: authorization.authorizationId,
    plan,
    explicitLiveProviderExecution: true,
    exactOneCallAuthorized: true,
    providerCostCeilingAccepted: true,
    zeroPersistenceRequired: true,
    zeroSchedulingRequired: true,
    zeroAutonomousExecutionRequired: true,
    zeroOutreachRequired: true,
    zeroProviderWritesRequired: true,
    zeroPublicSiteWritesRequired: true,
  });
  if (
    expected.authorizationFingerprint !== authorization.authorizationFingerprint
  ) {
    throw new Error(
      "ugp_dataforseo_backlink_acquisition_authorization_integrity_failed",
    );
  }
}

function providerReportedCost(payload: unknown): number {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(
      "ugp_dataforseo_backlink_acquisition_invalid_provider_payload",
    );
  }
  const envelope = payload as Record<string, unknown>;
  if (!Array.isArray(envelope.tasks) || envelope.tasks.length !== 1) {
    throw new Error(
      "ugp_dataforseo_backlink_acquisition_exactly_one_task_required",
    );
  }
  const task = envelope.tasks[0] as Record<string, unknown>;
  const cost = task?.cost;
  if (
    typeof cost !== "number"
    || !Number.isFinite(cost)
    || cost < 0
  ) {
    throw new Error(
      "ugp_dataforseo_backlink_acquisition_provider_cost_missing",
    );
  }
  return cost;
}

export async function runAuthorizedDataForSeoBacklinkOneShot(
  input: {
    plan: DataForSeoBacklinkCertificationPlan;
    authorization: DataForSeoBacklinkExecutionAuthorization;
    executor: DataForSeoBacklinkAuthorizedExecutor;
  },
): Promise<DataForSeoBacklinkAcquisitionReceipt> {
  assertAuthorization(input.plan, input.authorization);

  let observed: Awaited<ReturnType<DataForSeoBacklinkAuthorizedExecutor>>;
  try {
    observed = await input.executor({
      url: input.plan.controlledRequest.url,
      body: input.plan.controlledRequest.body,
      timeoutMs: DATAFORSEO_BACKLINK_ACQUISITION_POLICY.timeoutMs,
      credentialProfileId: input.plan.credentialProfileId,
    });
  } catch {
    throw new Error(
      "ugp_dataforseo_backlink_acquisition_transport_failed",
    );
  }

  if (observed.effectiveUrl !== input.plan.controlledRequest.url) {
    throw new Error(
      "ugp_dataforseo_backlink_acquisition_effective_url_drift",
    );
  }
  if (
    !Number.isInteger(observed.status)
    || observed.status < 200
    || observed.status >= 300
  ) {
    throw new Error(
      "ugp_dataforseo_backlink_acquisition_http_status_invalid",
    );
  }
  if (
    typeof observed.contentType !== "string"
    || !/^application\/json(?:\s*;|$)/i.test(observed.contentType.trim())
  ) {
    throw new Error(
      "ugp_dataforseo_backlink_acquisition_json_required",
    );
  }
  const responseBytes = Buffer.byteLength(observed.bodyText, "utf8");
  if (
    responseBytes < 2
    || responseBytes
      > DATAFORSEO_BACKLINK_ACQUISITION_POLICY.maxResponseBytes
  ) {
    throw new Error(
      "ugp_dataforseo_backlink_acquisition_response_bounds",
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(observed.bodyText);
  } catch {
    throw new Error(
      "ugp_dataforseo_backlink_acquisition_invalid_json",
    );
  }

  const providerReportedCostUsd = providerReportedCost(payload);
  if (
    providerReportedCostUsd
      > input.plan.maxProviderReportedCostUsd
  ) {
    throw new Error(
      "ugp_dataforseo_backlink_acquisition_cost_ceiling_exceeded",
    );
  }

  const evidence = normalizeCapturedDataForSeoBacklinks({
    targetDomain: input.plan.controlledRequest.targetDomain,
    sourceFingerprint: input.plan.sourceFingerprint,
    requestFingerprint: input.plan.evidenceRequestFingerprint,
    marketFingerprint: input.plan.marketFingerprint,
    categoryFingerprint: input.plan.categoryFingerprint,
    observedAt: canonicalTimestamp(observed.observedAt),
    rankScale: input.plan.controlledRequest.rankScale,
    provided: payload,
  });
  assertDataForSeoBacklinkAdapterIntegrity(evidence);

  const assertions = Object.freeze({
    oneShot: true as const,
    automaticRetry: false as const,
    maxConcurrency: 1 as const,
    persistence: false as const,
    scheduling: false as const,
    autonomousExecution: false as const,
    outreach: false as const,
    providerWrites: false as const,
    publicSiteWrites: false as const,
    credentialsReturned: false as const,
  });

  const base = {
    version: UGP_DATAFORSEO_BACKLINK_ACQUISITION_VERSION,
    sourceCommitSha: input.plan.sourceCommitSha,
    planFingerprint: input.plan.planFingerprint,
    authorizationFingerprint:
      input.authorization.authorizationFingerprint,
    controlledRequestFingerprint:
      input.plan.controlledRequest.requestFingerprint,
    callCount: 1 as const,
    providerReportedCostUsd,
    evidence,
    assertions,
  };

  return Object.freeze({
    ...base,
    receiptFingerprint: hash({
      purpose: "ugp_dataforseo_backlink_acquisition_receipt",
      ...base,
    }),
  });
}
