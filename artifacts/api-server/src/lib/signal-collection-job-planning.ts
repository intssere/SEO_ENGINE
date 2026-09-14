import { createHash } from "node:crypto";
import type { SignalSourceClass, SignalType } from "./market-category-intelligence.js";
import {
  SIGNAL_SOURCE_REGISTRY_VERSION,
  normalizeSignalSourceDescriptor,
  type RefreshPlan,
  type RefreshPlanItem,
  type SignalSourceDescriptor,
} from "./signal-source-registry.js";
import {
  SIGNAL_OBSERVATION_NORMALIZATION_VERSION,
  signalObservationNormalizationCapability,
  type SourceAdapterRequest,
} from "./signal-observation-normalization.js";

export const SIGNAL_COLLECTION_JOB_PLANNING_VERSION = "task69-signal-collection-job-planning-v1" as const;
export const SIGNAL_COLLECTION_JOB_AUTHORIZATION_PREFIX = "AUTHORIZE_SIGNAL_COLLECTION_JOB" as const;
export const DEFAULT_SIGNAL_COLLECTION_JOB_TTL_MINUTES = 30;
export const MAX_SIGNAL_COLLECTION_JOB_TTL_MINUTES = 60;

export type SignalCollectionJobLifecycle = "proposed";
export type SignalCollectionJobPreflightStatus = "authorization_ready" | "expired";

export type SignalCollectionJobPacket = {
  version: typeof SIGNAL_COLLECTION_JOB_PLANNING_VERSION;
  jobId: string;
  jobFingerprint: string;
  replayId: string;
  replayFingerprint: string;
  createdAt: string;
  expiresAt: string;
  ttlMinutes: number;
  lifecycle: SignalCollectionJobLifecycle;
  sourceId: string;
  sourceFingerprint: string;
  sourceClass: SignalSourceClass;
  collectionMode: SignalSourceDescriptor["collectionMode"];
  marketFingerprint: string;
  categoryFingerprint: string;
  signalType: SignalType;
  planId: string;
  planFingerprint: string;
  requestId: string;
  requestFingerprint: string;
  authorization: string;
  safety: ReturnType<typeof signalCollectionJobPlanningCapability>;
};

export type SignalCollectionJobPreflight = {
  version: typeof SIGNAL_COLLECTION_JOB_PLANNING_VERSION;
  jobId: string;
  jobFingerprint: string;
  replayId: string;
  replayFingerprint: string;
  status: SignalCollectionJobPreflightStatus;
  expired: boolean;
  authorizationEligible: boolean;
  authorization: string;
  checkedAt: string;
  safety: ReturnType<typeof signalCollectionJobPlanningCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const SOURCE_ID = /^src-[0-9a-f]{24}$/;
const PLAN_ID = /^srp-[0-9a-f]{24}$/;
const REQUEST_ID = /^sar-[0-9a-f]{24}$/;
const JOB_ID = /^scj-[0-9a-f]{24}$/;
const REPLAY_ID = /^scr-[0-9a-f]{24}$/;

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function isoTimestamp(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 64) throw new Error(`invalid_${name}`);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(`invalid_${name}`);
  return new Date(milliseconds).toISOString();
}

function integer(value: unknown, min: number, max: number, name: string): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) throw new Error(`invalid_${name}`);
  return value as number;
}

function fingerprint(value: unknown, name: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) throw new Error(`invalid_${name}`);
  return value;
}

function exactSafety(actual: unknown, expected: Record<string, unknown>, name: string): void {
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) throw new Error(`invalid_${name}`);
  const record = actual as Record<string, unknown>;
  const actualKeys = Object.keys(record).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) throw new Error(`${name}_mismatch`);
  for (const key of expectedKeys) {
    if (record[key] !== expected[key]) throw new Error(`${name}_mismatch`);
  }
}

function validateSourceIdentity(source: SignalSourceDescriptor): void {
  if (source.version !== SIGNAL_SOURCE_REGISTRY_VERSION) throw new Error("unsupported_source_version");
  if (!SOURCE_ID.test(source.sourceId)) throw new Error("invalid_source_id");
  fingerprint(source.fingerprint, "source_fingerprint");
  const rebuilt = normalizeSignalSourceDescriptor({
    key: source.key,
    name: source.name,
    sourceClass: source.sourceClass,
    signalTypes: source.signalTypes,
    marketFingerprints: source.marketFingerprints,
    categoryFingerprints: source.categoryFingerprints,
    allowAnyMarket: source.allowAnyMarket,
    allowAnyCategory: source.allowAnyCategory,
    trustClass: source.trustClass,
    quality: source.quality,
    provenanceComplete: source.provenanceComplete,
    freshness: source.freshness,
    collectionMode: source.collectionMode,
    manuallyReviewed: source.manuallyReviewed,
  });
  if (rebuilt.sourceId !== source.sourceId || rebuilt.fingerprint !== source.fingerprint) throw new Error("source_identity_mismatch");
}

function planFingerprintIdentity(plan: RefreshPlan) {
  return {
    generatedAt: plan.generatedAt,
    marketFingerprint: plan.marketFingerprint,
    categoryFingerprint: plan.categoryFingerprint,
    requestedSignalTypes: plan.requestedSignalTypes,
    budget: plan.budget,
    selected: plan.selected.map((value) => ({
      sourceFingerprint: value.sourceFingerprint,
      signalType: value.signalType,
      freshnessState: value.freshnessState,
      ageMinutes: value.ageMinutes,
      urgency: value.urgency,
      quality: value.quality,
    })),
    deferred: plan.deferred.map((value) => ({
      sourceFingerprint: value.sourceFingerprint,
      signalType: value.signalType,
      freshnessState: value.freshnessState,
      ageMinutes: value.ageMinutes,
      urgency: value.urgency,
      quality: value.quality,
    })),
    blockers: plan.blockers,
  };
}

function validateRefreshPlan(plan: RefreshPlan): void {
  if (plan.version !== SIGNAL_SOURCE_REGISTRY_VERSION) throw new Error("unsupported_refresh_plan_version");
  if (!PLAN_ID.test(plan.planId)) throw new Error("invalid_plan_id");
  fingerprint(plan.planFingerprint, "plan_fingerprint");
  const expectedFingerprint = hash({ version: SIGNAL_SOURCE_REGISTRY_VERSION, ...planFingerprintIdentity(plan) });
  const expectedId = `srp-${expectedFingerprint.slice(0, 24)}`;
  if (plan.planFingerprint !== expectedFingerprint || plan.planId !== expectedId) throw new Error("refresh_plan_identity_mismatch");
  exactSafety(plan.safety, {
    version: SIGNAL_SOURCE_REGISTRY_VERSION,
    registryPlanningOnly: true,
    networkCollectionAuthorized: false,
    providerEnrollmentAuthorized: false,
    credentialMutationAuthorized: false,
    evidencePersistenceAuthorized: false,
    targetConfigurationMutationAuthorized: false,
    schedulerEnabled: false,
    batchEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    automaticTransition: false,
    schemaMutationRequired: false,
  }, "refresh_plan_safety");
}

function requestFingerprintIdentity(request: SourceAdapterRequest) {
  return {
    sourceId: request.sourceId,
    sourceFingerprint: request.sourceFingerprint,
    sourceClass: request.sourceClass,
    collectionMode: request.collectionMode,
    marketFingerprint: request.marketFingerprint,
    categoryFingerprint: request.categoryFingerprint,
    signalType: request.signalType,
    planId: request.planId,
    planFingerprint: request.planFingerprint,
  };
}

function validateAdapterRequest(request: SourceAdapterRequest): void {
  if (request.version !== SIGNAL_OBSERVATION_NORMALIZATION_VERSION) throw new Error("unsupported_adapter_request_version");
  if (!REQUEST_ID.test(request.requestId)) throw new Error("invalid_request_id");
  fingerprint(request.requestFingerprint, "request_fingerprint");
  const expectedFingerprint = hash({ version: SIGNAL_OBSERVATION_NORMALIZATION_VERSION, ...requestFingerprintIdentity(request) });
  const expectedId = `sar-${expectedFingerprint.slice(0, 24)}`;
  if (request.requestFingerprint !== expectedFingerprint || request.requestId !== expectedId) throw new Error("adapter_request_identity_mismatch");
  exactSafety(request.safety, signalObservationNormalizationCapability() as unknown as Record<string, unknown>, "adapter_request_safety");
}

function selectedItemFor(source: SignalSourceDescriptor, plan: RefreshPlan, request: SourceAdapterRequest): RefreshPlanItem {
  const matches = plan.selected.filter((item) =>
    item.sourceId === source.sourceId
    && item.sourceFingerprint === source.fingerprint
    && item.sourceClass === source.sourceClass
    && item.signalType === request.signalType,
  );
  if (matches.length !== 1) throw new Error("selected_refresh_item_mismatch");
  return matches[0]!;
}

function validateLineage(source: SignalSourceDescriptor, plan: RefreshPlan, request: SourceAdapterRequest): void {
  validateSourceIdentity(source);
  validateRefreshPlan(plan);
  validateAdapterRequest(request);
  if (request.sourceId !== source.sourceId) throw new Error("request_source_id_mismatch");
  if (request.sourceFingerprint !== source.fingerprint) throw new Error("request_source_fingerprint_mismatch");
  if (request.sourceClass !== source.sourceClass) throw new Error("request_source_class_mismatch");
  if (request.collectionMode !== source.collectionMode) throw new Error("request_collection_mode_mismatch");
  if (request.planId === null || request.planFingerprint === null) throw new Error("refresh_plan_lineage_required");
  if (request.planId !== plan.planId || request.planFingerprint !== plan.planFingerprint) throw new Error("request_plan_lineage_mismatch");
  if (request.marketFingerprint !== plan.marketFingerprint) throw new Error("request_market_mismatch");
  if (request.categoryFingerprint !== plan.categoryFingerprint) throw new Error("request_category_mismatch");
  if (!plan.requestedSignalTypes.includes(request.signalType)) throw new Error("request_signal_not_requested");
  selectedItemFor(source, plan, request);
}

function replayIdentity(input: {
  sourceFingerprint: string;
  planFingerprint: string;
  requestFingerprint: string;
  marketFingerprint: string;
  categoryFingerprint: string;
  signalType: SignalType;
  createdAt: string;
  expiresAt: string;
}) {
  const replayFingerprint = hash({
    version: SIGNAL_COLLECTION_JOB_PLANNING_VERSION,
    purpose: "replay_identity",
    ...input,
  });
  return {
    replayId: `scr-${replayFingerprint.slice(0, 24)}`,
    replayFingerprint,
  };
}

function packetIdentity(input: Omit<SignalCollectionJobPacket, "version" | "jobId" | "jobFingerprint" | "authorization">) {
  return input;
}

export function buildSignalCollectionJobPacket(input: {
  source: SignalSourceDescriptor;
  plan: RefreshPlan;
  request: SourceAdapterRequest;
  preparedAt: string;
  ttlMinutes?: number;
}): SignalCollectionJobPacket {
  validateLineage(input.source, input.plan, input.request);
  const createdAt = isoTimestamp(input.preparedAt, "prepared_at");
  const ttlMinutes = integer(
    input.ttlMinutes ?? DEFAULT_SIGNAL_COLLECTION_JOB_TTL_MINUTES,
    1,
    MAX_SIGNAL_COLLECTION_JOB_TTL_MINUTES,
    "ttl_minutes",
  );
  const expiresAt = new Date(Date.parse(createdAt) + ttlMinutes * 60_000).toISOString();
  const replay = replayIdentity({
    sourceFingerprint: input.source.fingerprint,
    planFingerprint: input.plan.planFingerprint,
    requestFingerprint: input.request.requestFingerprint,
    marketFingerprint: input.request.marketFingerprint,
    categoryFingerprint: input.request.categoryFingerprint,
    signalType: input.request.signalType,
    createdAt,
    expiresAt,
  });
  const safety = signalCollectionJobPlanningCapability();
  const identity = packetIdentity({
    replayId: replay.replayId,
    replayFingerprint: replay.replayFingerprint,
    createdAt,
    expiresAt,
    ttlMinutes,
    lifecycle: "proposed",
    sourceId: input.source.sourceId,
    sourceFingerprint: input.source.fingerprint,
    sourceClass: input.source.sourceClass,
    collectionMode: input.source.collectionMode,
    marketFingerprint: input.request.marketFingerprint,
    categoryFingerprint: input.request.categoryFingerprint,
    signalType: input.request.signalType,
    planId: input.plan.planId,
    planFingerprint: input.plan.planFingerprint,
    requestId: input.request.requestId,
    requestFingerprint: input.request.requestFingerprint,
    safety,
  });
  const jobFingerprint = hash({ version: SIGNAL_COLLECTION_JOB_PLANNING_VERSION, ...identity });
  const jobId = `scj-${jobFingerprint.slice(0, 24)}`;
  const authorization = `${SIGNAL_COLLECTION_JOB_AUTHORIZATION_PREFIX}:${jobId}:${jobFingerprint}`;
  return {
    version: SIGNAL_COLLECTION_JOB_PLANNING_VERSION,
    jobId,
    jobFingerprint,
    ...identity,
    authorization,
  };
}

export function preflightSignalCollectionJobPacket(input: {
  packet: SignalCollectionJobPacket;
  source: SignalSourceDescriptor;
  plan: RefreshPlan;
  request: SourceAdapterRequest;
  now: string;
}): SignalCollectionJobPreflight {
  const { packet, source, plan, request } = input;
  if (packet.version !== SIGNAL_COLLECTION_JOB_PLANNING_VERSION) throw new Error("unsupported_collection_job_version");
  if (!JOB_ID.test(packet.jobId)) throw new Error("invalid_job_id");
  if (!REPLAY_ID.test(packet.replayId)) throw new Error("invalid_replay_id");
  fingerprint(packet.jobFingerprint, "job_fingerprint");
  fingerprint(packet.replayFingerprint, "replay_fingerprint");
  if (packet.lifecycle !== "proposed") throw new Error("invalid_job_lifecycle");
  const createdAt = isoTimestamp(packet.createdAt, "created_at");
  const expiresAt = isoTimestamp(packet.expiresAt, "expires_at");
  const ttlMinutes = integer(packet.ttlMinutes, 1, MAX_SIGNAL_COLLECTION_JOB_TTL_MINUTES, "ttl_minutes");
  if (Date.parse(expiresAt) - Date.parse(createdAt) !== ttlMinutes * 60_000) throw new Error("job_ttl_mismatch");
  validateLineage(source, plan, request);

  if (packet.sourceId !== source.sourceId) throw new Error("packet_source_id_mismatch");
  if (packet.sourceFingerprint !== source.fingerprint) throw new Error("packet_source_fingerprint_mismatch");
  if (packet.sourceClass !== source.sourceClass) throw new Error("packet_source_class_mismatch");
  if (packet.collectionMode !== source.collectionMode) throw new Error("packet_collection_mode_mismatch");
  if (packet.marketFingerprint !== request.marketFingerprint) throw new Error("packet_market_mismatch");
  if (packet.categoryFingerprint !== request.categoryFingerprint) throw new Error("packet_category_mismatch");
  if (packet.signalType !== request.signalType) throw new Error("packet_signal_type_mismatch");
  if (packet.planId !== plan.planId || packet.planFingerprint !== plan.planFingerprint) throw new Error("packet_plan_lineage_mismatch");
  if (packet.requestId !== request.requestId || packet.requestFingerprint !== request.requestFingerprint) throw new Error("packet_request_lineage_mismatch");

  exactSafety(packet.safety, signalCollectionJobPlanningCapability() as unknown as Record<string, unknown>, "collection_job_safety");
  const expectedReplay = replayIdentity({
    sourceFingerprint: packet.sourceFingerprint,
    planFingerprint: packet.planFingerprint,
    requestFingerprint: packet.requestFingerprint,
    marketFingerprint: packet.marketFingerprint,
    categoryFingerprint: packet.categoryFingerprint,
    signalType: packet.signalType,
    createdAt,
    expiresAt,
  });
  if (packet.replayId !== expectedReplay.replayId || packet.replayFingerprint !== expectedReplay.replayFingerprint) throw new Error("replay_identity_mismatch");

  const identity = packetIdentity({
    replayId: packet.replayId,
    replayFingerprint: packet.replayFingerprint,
    createdAt,
    expiresAt,
    ttlMinutes,
    lifecycle: packet.lifecycle,
    sourceId: packet.sourceId,
    sourceFingerprint: packet.sourceFingerprint,
    sourceClass: packet.sourceClass,
    collectionMode: packet.collectionMode,
    marketFingerprint: packet.marketFingerprint,
    categoryFingerprint: packet.categoryFingerprint,
    signalType: packet.signalType,
    planId: packet.planId,
    planFingerprint: packet.planFingerprint,
    requestId: packet.requestId,
    requestFingerprint: packet.requestFingerprint,
    safety: packet.safety,
  });
  const expectedJobFingerprint = hash({ version: SIGNAL_COLLECTION_JOB_PLANNING_VERSION, ...identity });
  const expectedJobId = `scj-${expectedJobFingerprint.slice(0, 24)}`;
  if (packet.jobFingerprint !== expectedJobFingerprint || packet.jobId !== expectedJobId) throw new Error("collection_job_identity_mismatch");
  const expectedAuthorization = `${SIGNAL_COLLECTION_JOB_AUTHORIZATION_PREFIX}:${expectedJobId}:${expectedJobFingerprint}`;
  if (packet.authorization !== expectedAuthorization) throw new Error("collection_job_authorization_mismatch");

  const checkedAt = isoTimestamp(input.now, "now");
  if (Date.parse(checkedAt) < Date.parse(createdAt)) throw new Error("preflight_before_job_created");
  const expired = Date.parse(checkedAt) >= Date.parse(expiresAt);
  return {
    version: SIGNAL_COLLECTION_JOB_PLANNING_VERSION,
    jobId: packet.jobId,
    jobFingerprint: packet.jobFingerprint,
    replayId: packet.replayId,
    replayFingerprint: packet.replayFingerprint,
    status: expired ? "expired" : "authorization_ready",
    expired,
    authorizationEligible: !expired,
    authorization: packet.authorization,
    checkedAt,
    safety: signalCollectionJobPlanningCapability(),
  };
}

export function signalCollectionJobPlanningCapability() {
  return Object.freeze({
    version: SIGNAL_COLLECTION_JOB_PLANNING_VERSION,
    planningAndAuthorizationContractOnly: true,
    credentialUseAuthorized: false,
    credentialMutationAuthorized: false,
    transportExecutionAuthorized: false,
    networkCollectionAuthorized: false,
    providerEnrollmentAuthorized: false,
    observationPersistenceAuthorized: false,
    evidencePersistenceAuthorized: false,
    durableJobReservationAuthorized: false,
    targetConfigurationMutationAuthorized: false,
    schedulerEnabled: false,
    batchExecutorEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    task64ExecutionAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
    authorizationConsumed: false,
    executionRouteInvoked: false,
    automaticTransition: false,
    schemaMutationRequired: false,
  });
}
