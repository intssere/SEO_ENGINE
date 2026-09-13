import { createHash } from "node:crypto";
import postgres from "postgres";
import {
  acquireCompetitorObservation,
  DEFAULT_COMPETITOR_MAX_REDIRECTS,
  DEFAULT_COMPETITOR_MAX_RESPONSE_BYTES,
  DEFAULT_COMPETITOR_TIMEOUT_MS,
  type AcquisitionResult,
} from "./competitor-acquisition.js";
import { getRuntimeReadiness } from "./operational-data.js";
import {
  expectedOneTargetDryRunAuthorization,
  preflightOneTargetPilotReadiness,
  type OneTargetPilotPlan,
  type SecureTransportCapabilitySnapshot,
} from "./competitor-pilot-readiness.js";
import type { TargetRegistrationProposal } from "./competitor-target-registration.js";
import {
  createSecureCompetitorRuntimeDependencies,
  secureCompetitorTransportCapability,
} from "./secure-competitor-transport.js";

export const COMPETITOR_PILOT_EXECUTION_VERSION = "task64-one-target-dry-run-execution-v1" as const;
export const COMPETITOR_PILOT_EXECUTION_JOB_TYPE = "competitor_one_target_dry_run_v1" as const;
export const COMPETITOR_PILOT_EXECUTION_GATE = "COMPETITOR_ONE_TARGET_DRY_RUN_EXECUTION_ENABLED" as const;

const HEX_64_PATTERN = /^[0-9a-f]{64}$/;
const PILOT_ID_PATTERN = /^cpr-[0-9a-f]{24}$/;

type Env = Record<string, string | undefined>;
type RegistrationReviewDecision = "pending" | "approved" | "rejected";

export type CompetitorPilotExecutionConfig = {
  executionEnabled: boolean;
};

export type CompetitorPilotSiteContext = {
  siteId: string;
  domain: string;
};

export type CompetitorPilotExecutionReceipt = {
  version: typeof COMPETITOR_PILOT_EXECUTION_VERSION;
  jobId: string;
  pilotId: string;
  pilotFingerprint: string;
  targetId: string;
  actorId: string;
  startedAt: string;
  completedAt: string;
  outcome: "completed" | "failed";
  failureCategory: string | null;
  request: {
    redirects: number;
    responseBytes: number;
    finalUrl: string;
    contentType: string;
  } | null;
  observationFingerprint: string | null;
  rawContentRetained: false;
  evidencePersisted: false;
  targetConfigurationMutated: false;
  publicSiteWrites: false;
  automaticTransition: false;
};

export type CompetitorPilotExecutionIdentity = {
  jobId: string;
  siteId: string;
  pilotId: string;
  pilotFingerprint: string;
  targetId: string;
  actorId: string;
};

export type CompetitorPilotExecutionReservation =
  | { state: "reserved" }
  | { state: "already_exists"; status: string }
  | { state: "identity_collision"; status: string | null };

export interface CompetitorPilotExecutionStore {
  reserve(identity: CompetitorPilotExecutionIdentity): Promise<CompetitorPilotExecutionReservation>;
  claim(jobId: string): Promise<boolean>;
  complete(jobId: string, receipt: CompetitorPilotExecutionReceipt): Promise<boolean>;
  fail(jobId: string, receipt: CompetitorPilotExecutionReceipt): Promise<boolean>;
  close?(): Promise<void>;
}

export type CompetitorPilotAcquisitionRunner = (input: {
  plan: OneTargetPilotPlan;
  ownDomain: string;
  observedAt: string;
}) => Promise<AcquisitionResult>;

export type CompetitorPilotExecutionDependencies = {
  transportCapability(): SecureTransportCapabilitySnapshot;
  loadSiteContext(): Promise<CompetitorPilotSiteContext | null>;
  createStore(): CompetitorPilotExecutionStore | null;
  acquire: CompetitorPilotAcquisitionRunner;
  now(): string;
};

export type CompetitorPilotExecutionResult =
  | {
      ok: true;
      mode: "dry_run";
      jobId: string;
      consumed: true;
      receipt: CompetitorPilotExecutionReceipt;
      acquisition: AcquisitionResult;
      persistence: { attempted: false; inserted: false; id: null };
    }
  | {
      ok: false;
      reason: string;
      jobId: string | null;
      consumed: boolean;
      receipt?: CompetitorPilotExecutionReceipt;
    };

function enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function canonicalTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function safeActor(value: string): string {
  return value.replace(/[^A-Za-z0-9_.:@-]/g, "").slice(0, 160) || "authenticated_admin";
}

function boundedFailureCategory(error: unknown): string {
  const candidate = error instanceof Error ? error.message.trim().toLowerCase() : "";
  return /^[a-z0-9_]{1,80}$/.test(candidate) ? candidate : "competitor_acquisition_failed";
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function deterministicCompetitorPilotExecutionJobId(pilotId: string, pilotFingerprint: string): string {
  const bytes = sha256(`${COMPETITOR_PILOT_EXECUTION_VERSION}:${pilotId}:${pilotFingerprint}`).subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function loadCompetitorPilotExecutionConfig(env: Env = process.env): CompetitorPilotExecutionConfig {
  return { executionEnabled: enabled(env[COMPETITOR_PILOT_EXECUTION_GATE]) };
}

export function competitorPilotExecutionCapability(env: Env = process.env) {
  const config = loadCompetitorPilotExecutionConfig(env);
  return {
    version: COMPETITOR_PILOT_EXECUTION_VERSION,
    executionGateEnabled: config.executionEnabled,
    exactAuthorizationRequired: true,
    authorizationConsumptionImplemented: true,
    liveDryRunExecutionPathImplemented: true,
    durableReplayLockImplemented: true,
    deterministicJobIdentity: true,
    maxTargets: 1,
    maxRuns: 1,
    persistenceAllowed: false,
    evidencePersistenceAuthorized: false,
    activeTargetConfigurationRequired: false,
    targetConfigurationMutationAuthorized: false,
    networkCollectionReady: config.executionEnabled,
    networkCollectionAuthorized: false,
    schedulerEnabled: false,
    batchEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
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

async function loadRuntimeSiteContext(): Promise<CompetitorPilotSiteContext | null> {
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

function postgresExecutionStore(): CompetitorPilotExecutionStore | null {
  const sql = database();
  if (!sql) return null;
  return {
    async reserve(identity) {
      const payload = {
        taskVersion: COMPETITOR_PILOT_EXECUTION_VERSION,
        pilotId: identity.pilotId,
        pilotFingerprint: identity.pilotFingerprint,
        targetId: identity.targetId,
        actorId: identity.actorId,
        phase: "reserved",
        dryRunOnly: true,
        rawContentRetained: false,
        evidencePersisted: false,
        targetConfigurationMutated: false,
        publicSiteWrites: false,
        automaticTransition: false,
      };
      const inserted = await sql<Array<{ id: string }>>`
        INSERT INTO jobs(id,site_id,job_type,status,priority,payload,attempts)
        VALUES(
          ${identity.jobId}::uuid,
          ${identity.siteId}::uuid,
          ${COMPETITOR_PILOT_EXECUTION_JOB_TYPE},
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
        WHERE id=${identity.jobId}::uuid
        LIMIT 1`;
      const row = rows[0];
      if (!row) return { state: "identity_collision", status: null };
      const matches = row.site_id === identity.siteId
        && row.job_type === COMPETITOR_PILOT_EXECUTION_JOB_TYPE
        && row.payload?.taskVersion === COMPETITOR_PILOT_EXECUTION_VERSION
        && row.payload?.pilotId === identity.pilotId
        && row.payload?.pilotFingerprint === identity.pilotFingerprint
        && row.payload?.targetId === identity.targetId;
      return matches
        ? { state: "already_exists", status: row.status }
        : { state: "identity_collision", status: row.status };
    },
    async claim(jobId) {
      const rows = await sql<Array<{ id: string }>>`
        UPDATE jobs
        SET status='active',attempts=attempts+1,locked_at=now(),updated_at=now(),
            payload=payload || ${sql.json({ phase: "active" })}
        WHERE id=${jobId}::uuid
          AND job_type=${COMPETITOR_PILOT_EXECUTION_JOB_TYPE}
          AND status='pending'
        RETURNING id::text AS id`;
      return Boolean(rows[0]);
    },
    async complete(jobId, receipt) {
      const rows = await sql<Array<{ id: string }>>`
        UPDATE jobs
        SET status='completed',completed_at=now(),updated_at=now(),last_error=NULL,
            payload=payload || ${sql.json({ phase: "completed", receipt })}
        WHERE id=${jobId}::uuid
          AND job_type=${COMPETITOR_PILOT_EXECUTION_JOB_TYPE}
          AND status='active'
        RETURNING id::text AS id`;
      return Boolean(rows[0]);
    },
    async fail(jobId, receipt) {
      const rows = await sql<Array<{ id: string }>>`
        UPDATE jobs
        SET status='failed',completed_at=now(),updated_at=now(),last_error='task64_execution_failed',
            payload=payload || ${sql.json({ phase: "failed", receipt })}
        WHERE id=${jobId}::uuid
          AND job_type=${COMPETITOR_PILOT_EXECUTION_JOB_TYPE}
          AND status='active'
        RETURNING id::text AS id`;
      return Boolean(rows[0]);
    },
    async close() {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    },
  };
}

async function secureAcquisition(input: {
  plan: OneTargetPilotPlan;
  ownDomain: string;
  observedAt: string;
}): Promise<AcquisitionResult> {
  const secureDeps = createSecureCompetitorRuntimeDependencies();
  return acquireCompetitorObservation({
    target: input.plan.target,
    ownDomain: input.ownDomain,
    config: {
      timeoutMs: DEFAULT_COMPETITOR_TIMEOUT_MS,
      maxResponseBytes: DEFAULT_COMPETITOR_MAX_RESPONSE_BYTES,
      maxRedirects: DEFAULT_COMPETITOR_MAX_REDIRECTS,
    },
    deps: secureDeps,
    observedAt: input.observedAt,
  });
}

function defaultDependencies(): CompetitorPilotExecutionDependencies {
  return {
    transportCapability: secureCompetitorTransportCapability,
    loadSiteContext: loadRuntimeSiteContext,
    createStore: postgresExecutionStore,
    acquire: secureAcquisition,
    now: () => new Date().toISOString(),
  };
}

function receipt(input: {
  jobId: string;
  plan: OneTargetPilotPlan;
  actorId: string;
  startedAt: string;
  completedAt: string;
  outcome: "completed" | "failed";
  failureCategory?: string | null;
  acquisition?: AcquisitionResult | null;
}): CompetitorPilotExecutionReceipt {
  const acquisition = input.acquisition ?? null;
  return {
    version: COMPETITOR_PILOT_EXECUTION_VERSION,
    jobId: input.jobId,
    pilotId: input.plan.pilotId,
    pilotFingerprint: input.plan.pilotFingerprint,
    targetId: input.plan.target.id,
    actorId: safeActor(input.actorId),
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    outcome: input.outcome,
    failureCategory: input.failureCategory ?? null,
    request: acquisition ? {
      redirects: acquisition.request.redirects,
      responseBytes: acquisition.request.responseBytes,
      finalUrl: acquisition.request.finalUrl.slice(0, 2048),
      contentType: acquisition.request.contentType.slice(0, 120),
    } : null,
    observationFingerprint: acquisition?.record.payload.fingerprint ?? null,
    rawContentRetained: false,
    evidencePersisted: false,
    targetConfigurationMutated: false,
    publicSiteWrites: false,
    automaticTransition: false,
  };
}

function validPilotIdentity(plan: OneTargetPilotPlan): boolean {
  return Boolean(plan)
    && typeof plan === "object"
    && typeof plan.pilotId === "string"
    && PILOT_ID_PATTERN.test(plan.pilotId)
    && typeof plan.pilotFingerprint === "string"
    && HEX_64_PATTERN.test(plan.pilotFingerprint)
    && typeof plan.target?.id === "string"
    && plan.target.id.length > 0;
}

export async function executeAuthorizedCompetitorPilotDryRun(
  input: {
    plan: OneTargetPilotPlan;
    sourceProposal: TargetRegistrationProposal;
    registrationReviewDecision: RegistrationReviewDecision;
    authorization: string;
    actorId: string;
    env?: Env;
    now?: string;
  },
  overrides: Partial<CompetitorPilotExecutionDependencies> = {},
): Promise<CompetitorPilotExecutionResult> {
  const config = loadCompetitorPilotExecutionConfig(input.env ?? process.env);
  if (!config.executionEnabled) {
    return { ok: false, reason: "competitor_pilot_execution_disabled", jobId: null, consumed: false };
  }
  if (!validPilotIdentity(input.plan) || !input.sourceProposal || typeof input.sourceProposal !== "object") {
    return { ok: false, reason: "invalid_competitor_pilot", jobId: null, consumed: false };
  }
  const expectedAuthorization = expectedOneTargetDryRunAuthorization(input.plan);
  if (typeof input.authorization !== "string" || input.authorization !== expectedAuthorization) {
    return { ok: false, reason: "competitor_pilot_authorization_mismatch", jobId: null, consumed: false };
  }
  if (input.registrationReviewDecision !== "approved") {
    return { ok: false, reason: "competitor_pilot_source_not_approved", jobId: null, consumed: false };
  }

  const defaults = defaultDependencies();
  const deps: CompetitorPilotExecutionDependencies = { ...defaults, ...overrides };
  const requestedNow = input.now ?? deps.now();
  const checkedAt = canonicalTimestamp(requestedNow);
  if (!checkedAt) return { ok: false, reason: "invalid_execution_timestamp", jobId: null, consumed: false };

  let transportCapability: SecureTransportCapabilitySnapshot;
  try {
    transportCapability = deps.transportCapability();
    const preflight = preflightOneTargetPilotReadiness(input.plan, {
      sourceProposal: input.sourceProposal,
      registrationReviewDecision: input.registrationReviewDecision,
      transportCapability,
      now: checkedAt,
    });
    if (!preflight.ok
      || preflight.lifecycle !== "authorization_ready"
      || !preflight.eligibleForDryRunAuthorization
      || preflight.expectedAuthorization !== input.authorization) {
      return { ok: false, reason: "competitor_pilot_preflight_rejected", jobId: null, consumed: false };
    }
  } catch {
    return { ok: false, reason: "competitor_pilot_preflight_rejected", jobId: null, consumed: false };
  }

  let site: CompetitorPilotSiteContext | null;
  try {
    site = await deps.loadSiteContext();
  } catch {
    site = null;
  }
  if (!site) return { ok: false, reason: "operational_site_unavailable", jobId: null, consumed: false };

  const jobId = deterministicCompetitorPilotExecutionJobId(input.plan.pilotId, input.plan.pilotFingerprint);
  const store = deps.createStore();
  if (!store) return { ok: false, reason: "database_unavailable", jobId, consumed: false };

  const identity: CompetitorPilotExecutionIdentity = {
    jobId,
    siteId: site.siteId,
    pilotId: input.plan.pilotId,
    pilotFingerprint: input.plan.pilotFingerprint,
    targetId: input.plan.target.id,
    actorId: safeActor(input.actorId),
  };

  try {
    const reservation = await store.reserve(identity);
    if (reservation.state === "identity_collision") {
      return { ok: false, reason: "competitor_pilot_execution_identity_collision", jobId, consumed: true };
    }
    if (reservation.state === "already_exists") {
      return { ok: false, reason: "competitor_pilot_authorization_already_consumed", jobId, consumed: true };
    }

    const claimed = await store.claim(jobId);
    if (!claimed) {
      return { ok: false, reason: "competitor_pilot_claim_failed", jobId, consumed: true };
    }

    let acquisition: AcquisitionResult;
    try {
      acquisition = await deps.acquire({ plan: input.plan, ownDomain: site.domain, observedAt: checkedAt });
    } catch (error) {
      const completedAt = canonicalTimestamp(deps.now()) ?? checkedAt;
      const failedReceipt = receipt({
        jobId,
        plan: input.plan,
        actorId: input.actorId,
        startedAt: checkedAt,
        completedAt,
        outcome: "failed",
        failureCategory: boundedFailureCategory(error),
      });
      const written = await store.fail(jobId, failedReceipt).catch(() => false);
      return {
        ok: false,
        reason: written ? "competitor_pilot_acquisition_failed" : "competitor_pilot_manual_intervention_required",
        jobId,
        consumed: true,
        receipt: failedReceipt,
      };
    }

    const completedAt = canonicalTimestamp(deps.now()) ?? checkedAt;
    const completedReceipt = receipt({
      jobId,
      plan: input.plan,
      actorId: input.actorId,
      startedAt: checkedAt,
      completedAt,
      outcome: "completed",
      acquisition,
    });
    const written = await store.complete(jobId, completedReceipt).catch(() => false);
    if (!written) {
      return {
        ok: false,
        reason: "competitor_pilot_manual_intervention_required",
        jobId,
        consumed: true,
        receipt: completedReceipt,
      };
    }

    return {
      ok: true,
      mode: "dry_run",
      jobId,
      consumed: true,
      receipt: completedReceipt,
      acquisition,
      persistence: { attempted: false, inserted: false, id: null },
    };
  } catch {
    return { ok: false, reason: "competitor_pilot_execution_store_failed", jobId, consumed: false };
  } finally {
    await store.close?.().catch(() => undefined);
  }
}
