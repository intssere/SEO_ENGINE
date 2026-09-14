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
import type { RefreshPlan, SignalSourceDescriptor } from "./signal-source-registry.js";

export const SIGNAL_COLLECTION_EXECUTION_VERSION = "task70-single-job-signal-collection-execution-v1" as const;
export const SIGNAL_COLLECTION_EXECUTION_JOB_TYPE = "signal_collection_single_job_v1" as const;
export const SIGNAL_COLLECTION_EXECUTION_GATE = "SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED" as const;

type Env = Record<string, string | undefined>;

export type SignalCollectionExecutionConfig = {
  executionEnabled: boolean;
};

export type SignalCollectionSiteContext = {
  siteId: string;
  domain: string;
};

export type SignalCollectionRunnerCapability = {
  configured: boolean;
  credentialReady: boolean;
  networkReady: boolean;
  sourceReadOnly: true;
  providerWrites: false;
  publicSiteWrites: false;
};

export interface SignalCollectionSourceRunner {
  capability(input: {
    source: SignalSourceDescriptor;
    request: SourceAdapterRequest;
  }): SignalCollectionRunnerCapability;
  run(input: {
    packet: SignalCollectionJobPacket;
    source: SignalSourceDescriptor;
    request: SourceAdapterRequest;
    observedAt: string;
  }): Promise<unknown>;
}

export type SignalCollectionExecutionObservationReceipt = {
  observationId: string;
  observationFingerprint: string;
  streamId: string;
  status: NormalizedSignalObservation["status"];
  observedAt: string;
  metricCount: number;
  diagnosticCount: number;
  completeness: number;
  confidence: number;
  positiveEvidence: boolean;
};

export type SignalCollectionExecutionReceipt = {
  version: typeof SIGNAL_COLLECTION_EXECUTION_VERSION;
  executionJobId: string;
  task69JobId: string;
  task69JobFingerprint: string;
  replayId: string;
  replayFingerprint: string;
  sourceId: string;
  sourceFingerprint: string;
  marketFingerprint: string;
  categoryFingerprint: string;
  signalType: SignalCollectionJobPacket["signalType"];
  requestId: string;
  requestFingerprint: string;
  actorId: string;
  startedAt: string;
  completedAt: string;
  outcome: "completed" | "failed";
  failureCategory: "runner_failed" | "normalization_failed" | null;
  observation: SignalCollectionExecutionObservationReceipt | null;
  rawPayloadRetained: false;
  observationPersisted: false;
  evidencePersisted: false;
  targetConfigurationMutated: false;
  providerWrites: false;
  publicSiteWrites: false;
  automaticTransition: false;
};

export type SignalCollectionExecutionIdentity = {
  executionJobId: string;
  siteId: string;
  task69JobId: string;
  task69JobFingerprint: string;
  replayFingerprint: string;
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
  claim(executionJobId: string): Promise<boolean>;
  complete(executionJobId: string, receipt: SignalCollectionExecutionReceipt): Promise<boolean>;
  fail(executionJobId: string, receipt: SignalCollectionExecutionReceipt): Promise<boolean>;
  close?(): Promise<void>;
}

export type SignalCollectionExecutionDependencies = {
  loadSiteContext(): Promise<SignalCollectionSiteContext | null>;
  createStore(): SignalCollectionExecutionStore | null;
  runner: SignalCollectionSourceRunner;
  now(): string;
};

export type SignalCollectionExecutionResult =
  | {
      ok: true;
      mode: "single_job";
      executionJobId: string;
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
      executionJobId: string | null;
      consumed: boolean;
      receipt?: SignalCollectionExecutionReceipt;
    };

function enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function canonicalTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
}

function safeActor(value: string): string {
  return value.replace(/[^A-Za-z0-9_.:@-]/g, "").slice(0, 160) || "authenticated_admin";
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function deterministicSignalCollectionExecutionJobId(
  task69JobId: string,
  task69JobFingerprint: string,
  replayFingerprint: string,
): string {
  const bytes = sha256(`${SIGNAL_COLLECTION_EXECUTION_VERSION}:${task69JobId}:${task69JobFingerprint}:${replayFingerprint}`).subarray(0, 16);
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
    configured: false,
    credentialReady: false,
    networkReady: false,
    sourceReadOnly: true,
    providerWrites: false,
    publicSiteWrites: false,
  };
}

export function signalCollectionExecutionCapability(env: Env = process.env) {
  const config = loadSignalCollectionExecutionConfig(env);
  return Object.freeze({
    version: SIGNAL_COLLECTION_EXECUTION_VERSION,
    executionGateEnabled: config.executionEnabled,
    exactAuthorizationRequired: true,
    authorizationConsumptionImplemented: true,
    singleJobExecutionPathImplemented: true,
    durableReplayLockImplemented: true,
    deterministicJobIdentity: true,
    productionRunnerConfigured: false,
    credentialReady: false,
    networkReady: false,
    maxJobs: 1,
    maxSources: 1,
    maxMarkets: 1,
    maxCategories: 1,
    maxSignalTypes: 1,
    networkCollectionAuthorized: false,
    observationPersistenceAuthorized: false,
    evidencePersistenceAuthorized: false,
    rawPayloadRetentionAuthorized: false,
    targetConfigurationMutationAuthorized: false,
    schedulerEnabled: false,
    batchExecutorEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    task64ExecutionAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
    executionAuthorized: false,
    automaticTransition: false,
    schemaMutationRequired: false,
  });
}

const defaultRunner: SignalCollectionSourceRunner = {
  capability: () => defaultSignalCollectionRunnerCapability(),
  async run() {
    throw new Error("signal_collection_runner_unavailable");
  },
};

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
        replayFingerprint: identity.replayFingerprint,
        requestFingerprint: identity.requestFingerprint,
        sourceFingerprint: identity.sourceFingerprint,
        actorId: identity.actorId,
        phase: "reserved",
        scalarOnly: true,
        rawPayloadRetained: false,
        observationPersisted: false,
        evidencePersisted: false,
        providerWrites: false,
        publicSiteWrites: false,
        automaticTransition: false,
      };
      const inserted = await sql<Array<{ id: string }>>`
        INSERT INTO jobs(id,site_id,job_type,status,priority,payload,attempts)
        VALUES(
          ${identity.executionJobId}::uuid,
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
        WHERE id=${identity.executionJobId}::uuid
        LIMIT 1`;
      const row = rows[0];
      if (!row) return { state: "identity_collision", status: null };
      const matches = row.site_id === identity.siteId
        && row.job_type === SIGNAL_COLLECTION_EXECUTION_JOB_TYPE
        && row.payload?.taskVersion === SIGNAL_COLLECTION_EXECUTION_VERSION
        && row.payload?.task69JobId === identity.task69JobId
        && row.payload?.task69JobFingerprint === identity.task69JobFingerprint
        && row.payload?.replayFingerprint === identity.replayFingerprint
        && row.payload?.requestFingerprint === identity.requestFingerprint
        && row.payload?.sourceFingerprint === identity.sourceFingerprint;
      return matches
        ? { state: "already_exists", status: row.status }
        : { state: "identity_collision", status: row.status };
    },
    async claim(executionJobId) {
      const rows = await sql<Array<{ id: string }>>`
        UPDATE jobs
        SET status='active',attempts=attempts+1,locked_at=now(),updated_at=now(),
            payload=payload || ${sql.json({ phase: "active" })}
        WHERE id=${executionJobId}::uuid
          AND job_type=${SIGNAL_COLLECTION_EXECUTION_JOB_TYPE}
          AND status='pending'
        RETURNING id::text AS id`;
      return Boolean(rows[0]);
    },
    async complete(executionJobId, receipt) {
      const rows = await sql<Array<{ id: string }>>`
        UPDATE jobs
        SET status='completed',completed_at=now(),updated_at=now(),last_error=NULL,
            payload=payload || ${sql.json({ phase: "completed", receipt })}
        WHERE id=${executionJobId}::uuid
          AND job_type=${SIGNAL_COLLECTION_EXECUTION_JOB_TYPE}
          AND status='active'
        RETURNING id::text AS id`;
      return Boolean(rows[0]);
    },
    async fail(executionJobId, receipt) {
      const rows = await sql<Array<{ id: string }>>`
        UPDATE jobs
        SET status='failed',completed_at=now(),updated_at=now(),last_error='task70_execution_failed',
            payload=payload || ${sql.json({ phase: "failed", receipt })}
        WHERE id=${executionJobId}::uuid
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

function defaultDependencies(): SignalCollectionExecutionDependencies {
  return {
    loadSiteContext: loadRuntimeSiteContext,
    createStore: postgresExecutionStore,
    runner: defaultRunner,
    now: () => new Date().toISOString(),
  };
}

function runnerReady(capability: SignalCollectionRunnerCapability): boolean {
  return capability.configured === true
    && capability.credentialReady === true
    && capability.networkReady === true
    && capability.sourceReadOnly === true
    && capability.providerWrites === false
    && capability.publicSiteWrites === false;
}

function observationReceipt(observation: NormalizedSignalObservation): SignalCollectionExecutionObservationReceipt {
  return {
    observationId: observation.observationId,
    observationFingerprint: observation.observationFingerprint,
    streamId: observation.streamId,
    status: observation.status,
    observedAt: observation.observedAt,
    metricCount: observation.metrics.length,
    diagnosticCount: observation.diagnostics.length,
    completeness: observation.completeness,
    confidence: observation.confidence,
    positiveEvidence: observation.positiveEvidence,
  };
}

function receipt(input: {
  executionJobId: string;
  packet: SignalCollectionJobPacket;
  actorId: string;
  startedAt: string;
  completedAt: string;
  outcome: "completed" | "failed";
  failureCategory?: "runner_failed" | "normalization_failed" | null;
  observation?: NormalizedSignalObservation | null;
}): SignalCollectionExecutionReceipt {
  return {
    version: SIGNAL_COLLECTION_EXECUTION_VERSION,
    executionJobId: input.executionJobId,
    task69JobId: input.packet.jobId,
    task69JobFingerprint: input.packet.jobFingerprint,
    replayId: input.packet.replayId,
    replayFingerprint: input.packet.replayFingerprint,
    sourceId: input.packet.sourceId,
    sourceFingerprint: input.packet.sourceFingerprint,
    marketFingerprint: input.packet.marketFingerprint,
    categoryFingerprint: input.packet.categoryFingerprint,
    signalType: input.packet.signalType,
    requestId: input.packet.requestId,
    requestFingerprint: input.packet.requestFingerprint,
    actorId: safeActor(input.actorId),
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    outcome: input.outcome,
    failureCategory: input.failureCategory ?? null,
    observation: input.observation ? observationReceipt(input.observation) : null,
    rawPayloadRetained: false,
    observationPersisted: false,
    evidencePersisted: false,
    targetConfigurationMutated: false,
    providerWrites: false,
    publicSiteWrites: false,
    automaticTransition: false,
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
    return { ok: false, reason: "signal_collection_execution_disabled", executionJobId: null, consumed: false };
  }

  if (!input.packet || typeof input.packet !== "object"
    || !input.source || typeof input.source !== "object"
    || !input.plan || typeof input.plan !== "object"
    || !input.request || typeof input.request !== "object") {
    return { ok: false, reason: "invalid_signal_collection_job", executionJobId: null, consumed: false };
  }
  if (typeof input.authorization !== "string" || input.authorization !== input.packet.authorization) {
    return { ok: false, reason: "signal_collection_authorization_mismatch", executionJobId: null, consumed: false };
  }

  const defaults = defaultDependencies();
  const deps: SignalCollectionExecutionDependencies = { ...defaults, ...overrides };
  const checkedAt = canonicalTimestamp(input.now ?? deps.now());
  if (!checkedAt) {
    return { ok: false, reason: "invalid_execution_timestamp", executionJobId: null, consumed: false };
  }

  try {
    const preflight = preflightSignalCollectionJobPacket({
      packet: input.packet,
      source: input.source,
      plan: input.plan,
      request: input.request,
      now: checkedAt,
    });
    if (preflight.status !== "authorization_ready"
      || preflight.expired
      || !preflight.authorizationEligible
      || preflight.authorization !== input.authorization) {
      return { ok: false, reason: "signal_collection_job_preflight_rejected", executionJobId: null, consumed: false };
    }
  } catch {
    return { ok: false, reason: "signal_collection_job_preflight_rejected", executionJobId: null, consumed: false };
  }

  let runnerCapability: SignalCollectionRunnerCapability;
  try {
    runnerCapability = deps.runner.capability({ source: input.source, request: input.request });
  } catch {
    return { ok: false, reason: "signal_collection_runner_unavailable", executionJobId: null, consumed: false };
  }
  if (!runnerReady(runnerCapability)) {
    return { ok: false, reason: "signal_collection_runner_unavailable", executionJobId: null, consumed: false };
  }

  let site: SignalCollectionSiteContext | null;
  try {
    site = await deps.loadSiteContext();
  } catch {
    site = null;
  }
  if (!site) {
    return { ok: false, reason: "operational_site_unavailable", executionJobId: null, consumed: false };
  }

  const executionJobId = deterministicSignalCollectionExecutionJobId(
    input.packet.jobId,
    input.packet.jobFingerprint,
    input.packet.replayFingerprint,
  );
  const store = deps.createStore();
  if (!store) {
    return { ok: false, reason: "database_unavailable", executionJobId, consumed: false };
  }

  const identity: SignalCollectionExecutionIdentity = {
    executionJobId,
    siteId: site.siteId,
    task69JobId: input.packet.jobId,
    task69JobFingerprint: input.packet.jobFingerprint,
    replayFingerprint: input.packet.replayFingerprint,
    requestFingerprint: input.packet.requestFingerprint,
    sourceFingerprint: input.packet.sourceFingerprint,
    actorId: safeActor(input.actorId),
  };

  try {
    let reservation: SignalCollectionExecutionReservation;
    try {
      reservation = await store.reserve(identity);
    } catch {
      return { ok: false, reason: "signal_collection_manual_intervention_required", executionJobId, consumed: true };
    }
    if (reservation.state === "identity_collision") {
      return { ok: false, reason: "signal_collection_execution_identity_collision", executionJobId, consumed: true };
    }
    if (reservation.state === "already_exists") {
      return { ok: false, reason: "signal_collection_authorization_already_consumed", executionJobId, consumed: true };
    }

    const claimed = await store.claim(executionJobId).catch(() => false);
    if (!claimed) {
      return { ok: false, reason: "signal_collection_claim_failed", executionJobId, consumed: true };
    }

    let suppliedResult: unknown;
    try {
      suppliedResult = await deps.runner.run({
        packet: input.packet,
        source: input.source,
        request: input.request,
        observedAt: checkedAt,
      });
    } catch {
      const completedAt = canonicalTimestamp(deps.now()) ?? checkedAt;
      const failedReceipt = receipt({
        executionJobId,
        packet: input.packet,
        actorId: input.actorId,
        startedAt: checkedAt,
        completedAt,
        outcome: "failed",
        failureCategory: "runner_failed",
      });
      const written = await store.fail(executionJobId, failedReceipt).catch(() => false);
      return {
        ok: false,
        reason: written ? "signal_collection_runner_failed" : "signal_collection_manual_intervention_required",
        executionJobId,
        consumed: true,
        receipt: failedReceipt,
      };
    }

    const completedAt = canonicalTimestamp(deps.now()) ?? checkedAt;
    let observation: NormalizedSignalObservation;
    try {
      observation = normalizeAdapterResult({
        request: input.request,
        source: input.source,
        result: suppliedResult,
        normalizedAt: completedAt,
      });
    } catch {
      const failedReceipt = receipt({
        executionJobId,
        packet: input.packet,
        actorId: input.actorId,
        startedAt: checkedAt,
        completedAt,
        outcome: "failed",
        failureCategory: "normalization_failed",
      });
      const written = await store.fail(executionJobId, failedReceipt).catch(() => false);
      return {
        ok: false,
        reason: written ? "signal_collection_normalization_failed" : "signal_collection_manual_intervention_required",
        executionJobId,
        consumed: true,
        receipt: failedReceipt,
      };
    }

    const completedReceipt = receipt({
      executionJobId,
      packet: input.packet,
      actorId: input.actorId,
      startedAt: checkedAt,
      completedAt,
      outcome: "completed",
      observation,
    });
    const written = await store.complete(executionJobId, completedReceipt).catch(() => false);
    if (!written) {
      return {
        ok: false,
        reason: "signal_collection_manual_intervention_required",
        executionJobId,
        consumed: true,
        receipt: completedReceipt,
      };
    }

    return {
      ok: true,
      mode: "single_job",
      executionJobId,
      consumed: true,
      receipt: completedReceipt,
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
