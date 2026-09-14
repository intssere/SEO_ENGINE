import { createHash } from "node:crypto";
import postgres from "postgres";
import { getRuntimeReadiness } from "./operational-data.js";
import {
  normalizeAdapterResult,
  type NormalizedSignalObservation,
  type SourceAdapterRequest,
} from "./signal-observation-normalization.js";
import {
  preflightSignalCollectionJobPacket,
  type SignalCollectionJobPacket,
} from "./signal-collection-job-planning.js";
import type { SignalType } from "./market-category-intelligence.js";
import type { RefreshPlan, SignalSourceDescriptor } from "./signal-source-registry.js";

export const SIGNAL_COLLECTION_EXECUTION_VERSION = "task70-controlled-single-job-signal-collection-execution-v1" as const;
export const SIGNAL_COLLECTION_EXECUTION_JOB_TYPE = "signal_collection_single_job_v1" as const;
export const SIGNAL_COLLECTION_EXECUTION_GATE = "SIGNAL_COLLECTION_SINGLE_JOB_EXECUTION_ENABLED" as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HEX_64_PATTERN = /^[0-9a-f]{64}$/;

type Env = Record<string, string | undefined>;

export type SignalCollectionExecutionConfig = {
  executionEnabled: boolean;
};

export type SignalCollectionSiteContext = {
  siteId: string;
  domain: string;
};

export type SignalCollectionRunnerCapability = {
  version: string;
  configured: boolean;
  credentialReady: boolean;
  networkReady: boolean;
  sourceFingerprint: string | null;
  collectionMode: SignalSourceDescriptor["collectionMode"] | null;
  signalTypes: SignalType[];
};

export type SignalCollectionRunnerOutput = {
  adapterResult: unknown;
  invocationCount: 1;
  responseBytes: number | null;
  providerRequestIdHash: string | null;
};

export type SignalCollectionExecutionReceipt = {
  version: typeof SIGNAL_COLLECTION_EXECUTION_VERSION;
  rowId: string;
  task69JobId: string;
  task69JobFingerprint: string;
  replayId: string;
  replayFingerprint: string;
  requestId: string;
  requestFingerprint: string;
  sourceId: string;
  sourceFingerprint: string;
  marketFingerprint: string;
  categoryFingerprint: string;
  signalType: SignalType;
  actorId: string;
  startedAt: string;
  completedAt: string;
  outcome: "completed" | "failed";
  failureCategory: string | null;
  runnerInvocationCount: 0 | 1;
  responseBytes: number | null;
  providerRequestIdHash: string | null;
  observation: {
    observationId: string;
    observationFingerprint: string;
    streamId: string;
    status: NormalizedSignalObservation["status"];
    metricCount: number;
    confidence: number;
    completeness: number;
    positiveEvidence: boolean;
  } | null;
  rawPayloadRetained: false;
  observationPersisted: false;
  evidencePersisted: false;
  targetConfigurationMutated: false;
  providerWrites: false;
  publicSiteWrites: false;
  automaticTransition: false;
};

export type SignalCollectionExecutionIdentity = {
  rowId: string;
  siteId: string;
  task69JobId: string;
  task69JobFingerprint: string;
  replayId: string;
  replayFingerprint: string;
  requestId: string;
  requestFingerprint: string;
  sourceFingerprint: string;
  actorId: string;
};

export type SignalCollectionExecutionReservation =
  | { state: "reserved" }
  | { state: "already_exists"; status: string }
  | { state: "identity_collision"; status: string | null };

export interface SignalCollectionExecutionStore {
  reserve(identity: SignalCollectionExecutionIdentity): Promise<SignalCollectionExecutionReservation>;
  claim(rowId: string): Promise<boolean>;
  complete(rowId: string, receipt: SignalCollectionExecutionReceipt): Promise<boolean>;
  fail(rowId: string, receipt: SignalCollectionExecutionReceipt): Promise<boolean>;
  close?(): Promise<void>;
}

export type SignalCollectionRunner = (input: {
  packet: SignalCollectionJobPacket;
  source: SignalSourceDescriptor;
  request: SourceAdapterRequest;
}) => Promise<SignalCollectionRunnerOutput>;

export type SignalCollectionExecutionDependencies = {
  runnerCapability(input: {
    packet: SignalCollectionJobPacket;
    source: SignalSourceDescriptor;
    request: SourceAdapterRequest;
  }): SignalCollectionRunnerCapability;
  loadSiteContext(): Promise<SignalCollectionSiteContext | null>;
  createStore(): SignalCollectionExecutionStore | null;
  run: SignalCollectionRunner;
  now(): string;
};

export type SignalCollectionExecutionResult =
  | {
      ok: true;
      mode: "single_job";
      rowId: string;
      consumed: true;
      receipt: SignalCollectionExecutionReceipt;
      observation: NormalizedSignalObservation;
      persistence: {
        observationAttempted: false;
        evidenceAttempted: false;
      };
    }
  | {
      ok: false;
      reason: string;
      rowId: string | null;
      consumed: boolean;
      receipt?: SignalCollectionExecutionReceipt;
    };

function enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function safeActor(value: string): string {
  return value.replace(/[^A-Za-z0-9_.:@-]/g, "").slice(0, 160) || "authenticated_admin";
}

function canonicalTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
}

function boundedFailureCategory(error: unknown, fallback: string): string {
  const candidate = error instanceof Error ? error.message.trim().toLowerCase() : "";
  return /^[a-z0-9_]{1,80}$/.test(candidate) ? candidate : fallback;
}

function boundedResponseBytes(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 100_000_000) {
    throw new Error("invalid_runner_response_bytes");
  }
  return value as number;
}

function boundedProviderRequestIdHash(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !HEX_64_PATTERN.test(value)) throw new Error("invalid_provider_request_id_hash");
  return value;
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function deterministicSignalCollectionExecutionRowId(packet: Pick<SignalCollectionJobPacket, "jobId" | "jobFingerprint" | "replayFingerprint">): string {
  const bytes = sha256(`${SIGNAL_COLLECTION_EXECUTION_VERSION}:${packet.jobId}:${packet.jobFingerprint}:${packet.replayFingerprint}`).subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function loadSignalCollectionExecutionConfig(env: Env = process.env): SignalCollectionExecutionConfig {
  return { executionEnabled: enabled(env[SIGNAL_COLLECTION_EXECUTION_GATE]) };
}

export function defaultSignalCollectionRunnerCapability(): SignalCollectionRunnerCapability {
  return {
    version: SIGNAL_COLLECTION_EXECUTION_VERSION,
    configured: false,
    credentialReady: false,
    networkReady: false,
    sourceFingerprint: null,
    collectionMode: null,
    signalTypes: [],
  };
}

export function signalCollectionExecutionCapability(env: Env = process.env) {
  const config = loadSignalCollectionExecutionConfig(env);
  const runner = defaultSignalCollectionRunnerCapability();
  return {
    version: SIGNAL_COLLECTION_EXECUTION_VERSION,
    executionGateEnabled: config.executionEnabled,
    exactTask69AuthorizationRequired: true,
    authorizationConsumptionImplemented: true,
    durableSingleUseReservationImplemented: true,
    deterministicRowIdentity: true,
    singleJobOnly: true,
    maxJobs: 1,
    maxSources: 1,
    maxMarkets: 1,
    maxCategories: 1,
    maxSignals: 1,
    runtimeRunnerConfigured: runner.configured,
    credentialReady: runner.credentialReady,
    networkCollectionReady: runner.networkReady,
    networkCollectionAuthorized: false,
    rawPayloadRetentionAuthorized: false,
    observationPersistenceAuthorized: false,
    evidencePersistenceAuthorized: false,
    targetConfigurationMutationAuthorized: false,
    schedulerEnabled: false,
    batchEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    automaticTransition: false,
    executionAuthorized: false,
    schemaMutationRequired: false,
  } as const;
}

function database() {
  const url = process.env.DATABASE_URL?.trim();
  return url ? postgres(url, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 2 }) : null;
}

async function loadRuntimeSiteContext(): Promise<SignalCollectionSiteContext | null> {
  const readiness = await getRuntimeReadiness();
  if (readiness.state !== "live" || !readiness.siteId) return null;
  const sql = database();
  if (!sql) return null;
  try {
    const rows = await sql<Array<{ id: string; domain: string }>>`
      SELECT id::text AS id,domain
      FROM sites
      WHERE id=${readiness.siteId}::uuid AND is_active=true
      LIMIT 1`;
    return rows[0] ? { siteId: rows[0].id, domain: rows[0].domain } : null;
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}

function postgresExecutionStore(): SignalCollectionExecutionStore | null {
  const sql = database();
  if (!sql) return null;
  return {
    async reserve(identity) {
      const payload = {
        taskVersion: SIGNAL_COLLECTION_EXECUTION_VERSION,
        task69JobId: identity.task69JobId,
        task69JobFingerprint: identity.task69JobFingerprint,
        replayId: identity.replayId,
        replayFingerprint: identity.replayFingerprint,
        requestId: identity.requestId,
        requestFingerprint: identity.requestFingerprint,
        sourceFingerprint: identity.sourceFingerprint,
        actorId: identity.actorId,
        phase: "reserved",
        rawPayloadRetained: false,
        observationPersisted: false,
        evidencePersisted: false,
        targetConfigurationMutated: false,
        providerWrites: false,
        publicSiteWrites: false,
        automaticTransition: false,
      };
      const inserted = await sql<Array<{ id: string }>>`
        INSERT INTO jobs(id,site_id,job_type,status,priority,payload,attempts)
        VALUES(
          ${identity.rowId}::uuid,
          ${identity.siteId}::uuid,
          ${SIGNAL_COLLECTION_EXECUTION_JOB_TYPE},
          'pending',
          5,
          ${sql.json(payload)},
          0
        )
        ON CONFLICT (id) DO NOTHING
        RETURNING id::text AS id`;
      if (inserted[0]) return { state: "reserved" };

      const rows = await sql<Array<{ site_id: string | null; job_type: string; status: string; payload: Record<string, unknown> }>>`
        SELECT site_id::text AS site_id,job_type,status,payload
        FROM jobs
        WHERE id=${identity.rowId}::uuid
        LIMIT 1`;
      const row = rows[0];
      if (!row) return { state: "identity_collision", status: null };
      const matches = row.site_id === identity.siteId
        && row.job_type === SIGNAL_COLLECTION_EXECUTION_JOB_TYPE
        && row.payload?.taskVersion === SIGNAL_COLLECTION_EXECUTION_VERSION
        && row.payload?.task69JobId === identity.task69JobId
        && row.payload?.task69JobFingerprint === identity.task69JobFingerprint
        && row.payload?.replayId === identity.replayId
        && row.payload?.replayFingerprint === identity.replayFingerprint
        && row.payload?.requestId === identity.requestId
        && row.payload?.requestFingerprint === identity.requestFingerprint
        && row.payload?.sourceFingerprint === identity.sourceFingerprint;
      return matches
        ? { state: "already_exists", status: row.status }
        : { state: "identity_collision", status: row.status };
    },
    async claim(rowId) {
      const rows = await sql<Array<{ id: string }>>`
        UPDATE jobs
        SET status='active',attempts=attempts+1,locked_at=now(),updated_at=now(),
            payload=payload || ${sql.json({ phase: "active" })}
        WHERE id=${rowId}::uuid
          AND job_type=${SIGNAL_COLLECTION_EXECUTION_JOB_TYPE}
          AND status='pending'
        RETURNING id::text AS id`;
      return Boolean(rows[0]);
    },
    async complete(rowId, receipt) {
      const rows = await sql<Array<{ id: string }>>`
        UPDATE jobs
        SET status='completed',completed_at=now(),updated_at=now(),last_error=NULL,
            payload=payload || ${sql.json({ phase: "completed", receipt })}
        WHERE id=${rowId}::uuid
          AND job_type=${SIGNAL_COLLECTION_EXECUTION_JOB_TYPE}
          AND status='active'
        RETURNING id::text AS id`;
      return Boolean(rows[0]);
    },
    async fail(rowId, receipt) {
      const rows = await sql<Array<{ id: string }>>`
        UPDATE jobs
        SET status='failed',completed_at=now(),updated_at=now(),last_error='task70_execution_failed',
            payload=payload || ${sql.json({ phase: "failed", receipt })}
        WHERE id=${rowId}::uuid
          AND job_type=${SIGNAL_COLLECTION_EXECUTION_JOB_TYPE}
          AND status='active'
        RETURNING id::text AS id`;
      return Boolean(rows[0]);
    },
    async close() {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    },
  };
}

async function unavailableRunner(): Promise<SignalCollectionRunnerOutput> {
  throw new Error("signal_collection_runner_unavailable");
}

function defaultDependencies(): SignalCollectionExecutionDependencies {
  return {
    runnerCapability: () => defaultSignalCollectionRunnerCapability(),
    loadSiteContext: loadRuntimeSiteContext,
    createStore: postgresExecutionStore,
    run: unavailableRunner,
    now: () => new Date().toISOString(),
  };
}

function runnerReady(capability: SignalCollectionRunnerCapability, packet: SignalCollectionJobPacket): boolean {
  return capability.configured === true
    && capability.credentialReady === true
    && capability.networkReady === true
    && capability.sourceFingerprint === packet.sourceFingerprint
    && capability.collectionMode === packet.collectionMode
    && capability.signalTypes.includes(packet.signalType);
}

function observationSummary(observation: NormalizedSignalObservation) {
  return {
    observationId: observation.observationId,
    observationFingerprint: observation.observationFingerprint,
    streamId: observation.streamId,
    status: observation.status,
    metricCount: observation.metrics.length,
    confidence: observation.confidence,
    completeness: observation.completeness,
    positiveEvidence: observation.positiveEvidence,
  };
}

function buildReceipt(input: {
  rowId: string;
  packet: SignalCollectionJobPacket;
  actorId: string;
  startedAt: string;
  completedAt: string;
  outcome: "completed" | "failed";
  failureCategory?: string | null;
  runnerInvocationCount: 0 | 1;
  responseBytes?: number | null;
  providerRequestIdHash?: string | null;
  observation?: NormalizedSignalObservation | null;
}): SignalCollectionExecutionReceipt {
  return {
    version: SIGNAL_COLLECTION_EXECUTION_VERSION,
    rowId: input.rowId,
    task69JobId: input.packet.jobId,
    task69JobFingerprint: input.packet.jobFingerprint,
    replayId: input.packet.replayId,
    replayFingerprint: input.packet.replayFingerprint,
    requestId: input.packet.requestId,
    requestFingerprint: input.packet.requestFingerprint,
    sourceId: input.packet.sourceId,
    sourceFingerprint: input.packet.sourceFingerprint,
    marketFingerprint: input.packet.marketFingerprint,
    categoryFingerprint: input.packet.categoryFingerprint,
    signalType: input.packet.signalType,
    actorId: safeActor(input.actorId),
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    outcome: input.outcome,
    failureCategory: input.failureCategory ?? null,
    runnerInvocationCount: input.runnerInvocationCount,
    responseBytes: input.responseBytes ?? null,
    providerRequestIdHash: input.providerRequestIdHash ?? null,
    observation: input.observation ? observationSummary(input.observation) : null,
    rawPayloadRetained: false,
    observationPersisted: false,
    evidencePersisted: false,
    targetConfigurationMutated: false,
    providerWrites: false,
    publicSiteWrites: false,
    automaticTransition: false,
  };
}

function validRunnerOutput(output: SignalCollectionRunnerOutput): { responseBytes: number | null; providerRequestIdHash: string | null } {
  if (!output || typeof output !== "object" || output.invocationCount !== 1) throw new Error("invalid_runner_output");
  return {
    responseBytes: boundedResponseBytes(output.responseBytes),
    providerRequestIdHash: boundedProviderRequestIdHash(output.providerRequestIdHash),
  };
}

export async function executeAuthorizedSignalCollectionJob(
  input: {
    packet: SignalCollectionJobPacket;
    source: SignalSourceDescriptor;
    plan: RefreshPlan;
    request: SourceAdapterRequest;
    authorization: string;
    actorId: string;
    env?: Env;
    now?: string;
  },
  overrides: Partial<SignalCollectionExecutionDependencies> = {},
): Promise<SignalCollectionExecutionResult> {
  const config = loadSignalCollectionExecutionConfig(input.env ?? process.env);
  if (!config.executionEnabled) {
    return { ok: false, reason: "signal_collection_execution_disabled", rowId: null, consumed: false };
  }

  if (!input.packet || typeof input.packet !== "object"
    || !input.source || typeof input.source !== "object"
    || !input.plan || typeof input.plan !== "object"
    || !input.request || typeof input.request !== "object") {
    return { ok: false, reason: "invalid_signal_collection_request", rowId: null, consumed: false };
  }
  if (typeof input.authorization !== "string" || input.authorization !== input.packet.authorization) {
    return { ok: false, reason: "signal_collection_authorization_mismatch", rowId: null, consumed: false };
  }

  const defaults = defaultDependencies();
  const deps: SignalCollectionExecutionDependencies = { ...defaults, ...overrides };
  const requestedNow = input.now ?? deps.now();
  const checkedAt = canonicalTimestamp(requestedNow);
  if (!checkedAt) return { ok: false, reason: "invalid_signal_collection_execution_time", rowId: null, consumed: false };

  let preflight;
  try {
    preflight = preflightSignalCollectionJobPacket({
      packet: input.packet,
      source: input.source,
      plan: input.plan,
      request: input.request,
      now: checkedAt,
    });
  } catch {
    return { ok: false, reason: "signal_collection_preflight_failed", rowId: null, consumed: false };
  }
  if (preflight.status !== "authorization_ready" || preflight.expired || !preflight.authorizationEligible) {
    return { ok: false, reason: "signal_collection_job_expired", rowId: null, consumed: false };
  }
  if (preflight.authorization !== input.authorization) {
    return { ok: false, reason: "signal_collection_authorization_mismatch", rowId: null, consumed: false };
  }

  let runnerCapability: SignalCollectionRunnerCapability;
  try {
    runnerCapability = deps.runnerCapability({ packet: input.packet, source: input.source, request: input.request });
  } catch {
    return { ok: false, reason: "signal_collection_runner_unavailable", rowId: null, consumed: false };
  }
  if (!runnerReady(runnerCapability, input.packet)) {
    return { ok: false, reason: "signal_collection_runner_unavailable", rowId: null, consumed: false };
  }

  const site = await deps.loadSiteContext().catch(() => null);
  if (!site || !UUID_PATTERN.test(site.siteId)) {
    return { ok: false, reason: "operational_site_unavailable", rowId: null, consumed: false };
  }

  const rowId = deterministicSignalCollectionExecutionRowId(input.packet);
  const store = deps.createStore();
  if (!store) return { ok: false, reason: "database_unavailable", rowId, consumed: false };

  try {
    const identity: SignalCollectionExecutionIdentity = {
      rowId,
      siteId: site.siteId,
      task69JobId: input.packet.jobId,
      task69JobFingerprint: input.packet.jobFingerprint,
      replayId: input.packet.replayId,
      replayFingerprint: input.packet.replayFingerprint,
      requestId: input.packet.requestId,
      requestFingerprint: input.packet.requestFingerprint,
      sourceFingerprint: input.packet.sourceFingerprint,
      actorId: safeActor(input.actorId),
    };

    let reservation: SignalCollectionExecutionReservation;
    try {
      reservation = await store.reserve(identity);
    } catch {
      return { ok: false, reason: "signal_collection_execution_store_failed", rowId, consumed: false };
    }
    if (reservation.state === "already_exists") {
      return { ok: false, reason: "signal_collection_authorization_already_consumed", rowId, consumed: true };
    }
    if (reservation.state === "identity_collision") {
      return { ok: false, reason: "signal_collection_execution_identity_collision", rowId, consumed: false };
    }

    let claimed = false;
    try {
      claimed = await store.claim(rowId);
    } catch {
      return { ok: false, reason: "signal_collection_execution_store_failed", rowId, consumed: true };
    }
    if (!claimed) return { ok: false, reason: "signal_collection_claim_failed", rowId, consumed: true };

    const startedAt = checkedAt;
    let runnerOutput: SignalCollectionRunnerOutput;
    try {
      runnerOutput = await deps.run({ packet: input.packet, source: input.source, request: input.request });
    } catch (error) {
      const completedAt = canonicalTimestamp(deps.now()) ?? startedAt;
      const failureCategory = boundedFailureCategory(error, "signal_collection_runner_failed");
      const failureReceipt = buildReceipt({
        rowId,
        packet: input.packet,
        actorId: input.actorId,
        startedAt,
        completedAt,
        outcome: "failed",
        failureCategory,
        runnerInvocationCount: 1,
      });
      const terminal = await store.fail(rowId, failureReceipt).catch(() => false);
      if (!terminal) return { ok: false, reason: "signal_collection_manual_intervention_required", rowId, consumed: true, receipt: failureReceipt };
      return { ok: false, reason: "signal_collection_runner_failed", rowId, consumed: true, receipt: failureReceipt };
    }

    let runnerReceipt: { responseBytes: number | null; providerRequestIdHash: string | null };
    try {
      runnerReceipt = validRunnerOutput(runnerOutput);
    } catch (error) {
      const completedAt = canonicalTimestamp(deps.now()) ?? startedAt;
      const failureReceipt = buildReceipt({
        rowId,
        packet: input.packet,
        actorId: input.actorId,
        startedAt,
        completedAt,
        outcome: "failed",
        failureCategory: boundedFailureCategory(error, "signal_collection_runner_output_invalid"),
        runnerInvocationCount: 1,
      });
      const terminal = await store.fail(rowId, failureReceipt).catch(() => false);
      if (!terminal) return { ok: false, reason: "signal_collection_manual_intervention_required", rowId, consumed: true, receipt: failureReceipt };
      return { ok: false, reason: "signal_collection_runner_output_invalid", rowId, consumed: true, receipt: failureReceipt };
    }

    const normalizedAt = canonicalTimestamp(deps.now()) ?? startedAt;
    let observation: NormalizedSignalObservation;
    try {
      observation = normalizeAdapterResult({
        request: input.request,
        source: input.source,
        result: runnerOutput.adapterResult,
        normalizedAt,
      });
    } catch (error) {
      const failureReceipt = buildReceipt({
        rowId,
        packet: input.packet,
        actorId: input.actorId,
        startedAt,
        completedAt: normalizedAt,
        outcome: "failed",
        failureCategory: boundedFailureCategory(error, "signal_collection_normalization_failed"),
        runnerInvocationCount: 1,
        ...runnerReceipt,
      });
      const terminal = await store.fail(rowId, failureReceipt).catch(() => false);
      if (!terminal) return { ok: false, reason: "signal_collection_manual_intervention_required", rowId, consumed: true, receipt: failureReceipt };
      return { ok: false, reason: "signal_collection_normalization_failed", rowId, consumed: true, receipt: failureReceipt };
    }

    const successReceipt = buildReceipt({
      rowId,
      packet: input.packet,
      actorId: input.actorId,
      startedAt,
      completedAt: normalizedAt,
      outcome: "completed",
      failureCategory: null,
      runnerInvocationCount: 1,
      ...runnerReceipt,
      observation,
    });
    const terminal = await store.complete(rowId, successReceipt).catch(() => false);
    if (!terminal) {
      return { ok: false, reason: "signal_collection_manual_intervention_required", rowId, consumed: true, receipt: successReceipt };
    }

    return {
      ok: true,
      mode: "single_job",
      rowId,
      consumed: true,
      receipt: successReceipt,
      observation,
      persistence: {
        observationAttempted: false,
        evidenceAttempted: false,
      },
    };
  } finally {
    await store.close?.().catch(() => undefined);
  }
}
