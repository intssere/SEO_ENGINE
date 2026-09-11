import postgres from "postgres";
import { PILOT_LIMITS, PilotExecutionError, runProductionPilot, validateProductionPilotPreflight, type BaselineCertification, type PilotFailureStage, type ProviderDiagnostic } from "./pilot-runner";

export type PilotPublicStatus = "not_started" | "queued" | "running" | "completed" | "partial" | "failed";
export type PilotRunStatus = {
  runId: string | null;
  status: PilotPublicStatus;
  phase: string;
  readiness: "not_evaluated" | "ready" | "partial";
  freshness: string | null;
  blockers: string[];
  counts: { products: number; catalogProducts: number; productsObserved: number; shopifyComplete: boolean; gscRows: number; gscDetailedRows: number; ga4Rows: number; pages: number; findings: number; opportunities: number };
  diagnostics: { shopify: ProviderDiagnostic; gsc: ProviderDiagnostic; gscAggregate: ProviderDiagnostic; ga4: ProviderDiagnostic; crawl: ProviderDiagnostic };
  certification: BaselineCertification | null;
  error: string | null;
};

type QueueResult = { accepted: true; runId: string } | { accepted: false; runId: string };
export interface PilotQueueDependencies {
  preflight(): Promise<{ siteId: string }>;
  enqueue(siteId: string): Promise<QueueResult>;
  launch(runId: string): void;
}

function requiredDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("pilot_database_unavailable");
  return value;
}

const emptyCounts = () => ({ products: 0, catalogProducts: 0, productsObserved: 0, shopifyComplete: false, gscRows: 0, gscDetailedRows: 0, ga4Rows: 0, pages: 0, findings: 0, opportunities: 0 });
const emptyDiagnostic = (): ProviderDiagnostic => ({ status: "failed", category: "not_evaluated", httpStatus: null });
const emptyDiagnostics = () => ({ shopify: emptyDiagnostic(), gsc: emptyDiagnostic(), gscAggregate: emptyDiagnostic(), ga4: emptyDiagnostic(), crawl: emptyDiagnostic() });
const numberValue = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

export async function requestPilotRun(deps: PilotQueueDependencies): Promise<QueueResult> {
  const context = await deps.preflight();
  const result = await deps.enqueue(context.siteId);
  if (result.accepted) deps.launch(result.runId);
  return result;
}

async function enqueue(siteId: string): Promise<QueueResult> {
  const sql = postgres(requiredDatabaseUrl(), { max: 1, prepare: false, connect_timeout: 10, idle_timeout: 5 });
  try {
    return await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtext(${'pilot_ingestion_v1:' + siteId}))`;
      await tx`UPDATE jobs SET status='failed',completed_at=now(),updated_at=now(),last_error='pilot_stale_run_recovered',payload=payload || ${tx.json({ phase: "failed", publicSiteWrites: false })} WHERE site_id=${siteId}::uuid AND job_type='pilot_ingestion_v1' AND status='active' AND updated_at < now() - interval '20 minutes'`;
      const active = await tx<{ id: string }[]>`SELECT id::text FROM jobs WHERE site_id=${siteId}::uuid AND job_type='pilot_ingestion_v1' AND status IN ('pending','active') ORDER BY created_at DESC LIMIT 1`;
      if (active[0]) return { accepted: false as const, runId: active[0].id };
      const rows = await tx<{ id: string }[]>`INSERT INTO jobs(site_id,job_type,status,priority,payload,attempts) VALUES(${siteId}::uuid,'pilot_ingestion_v1','pending',10,${tx.json({ phase: "queued", limits: PILOT_LIMITS, publicSiteWrites: false })},0) RETURNING id::text`;
      return { accepted: true as const, runId: rows[0]!.id };
    });
  } finally {
    await sql.end({ timeout: 2 });
  }
}

export async function runQueuedPilot(runId: string) {
  const sql = postgres(requiredDatabaseUrl(), { max: 1, prepare: false, connect_timeout: 10, idle_timeout: 5 });
  try {
    const claimed = await sql<{ id: string }[]>`UPDATE jobs SET status='active',attempts=attempts+1,locked_at=now(),updated_at=now(),payload=payload || ${sql.json({ phase: "preflight", publicSiteWrites: false })} WHERE id=${runId}::uuid AND job_type='pilot_ingestion_v1' AND status='pending' RETURNING id::text`;
    if (!claimed[0]) return;
  } finally {
    await sql.end({ timeout: 2 });
  }
  await runProductionPilot(runId);
}

export function backgroundPilotFailureFields(runId: string, error: unknown): { runId: string; stage: PilotFailureStage | "queue"; category: string } {
  return error instanceof PilotExecutionError
    ? { runId, stage: error.stage, category: error.category }
    : { runId, stage: "queue", category: "pilot_internal_failure" };
}

export function launchQueuedPilot(runId: string) {
  setImmediate(() => {
    void runQueuedPilot(runId).catch((error) => {
      console.error("pilot_background_failure", backgroundPilotFailureFields(runId, error));
    });
  });
}

export async function enqueueProductionPilot() {
  return requestPilotRun({ preflight: validateProductionPilotPreflight, enqueue, launch: launchQueuedPilot });
}

export async function resumeQueuedPilots() {
  const sql = postgres(requiredDatabaseUrl(), { max: 1, prepare: false, connect_timeout: 10, idle_timeout: 5 });
  try {
    await sql`UPDATE jobs SET status='failed',completed_at=now(),updated_at=now(),last_error='pilot_stale_run_recovered',payload=payload || ${sql.json({ phase: "failed", publicSiteWrites: false })} WHERE job_type='pilot_ingestion_v1' AND status='active' AND updated_at < now() - interval '20 minutes'`;
    const rows = await sql<{ id: string }[]>`SELECT id::text FROM jobs WHERE job_type='pilot_ingestion_v1' AND status='pending' ORDER BY created_at LIMIT 1`;
    if (rows[0]) launchQueuedPilot(rows[0].id);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

export async function loadPilotRunStatus(): Promise<PilotRunStatus> {
  const sql = postgres(requiredDatabaseUrl(), { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 2 });
  try {
    const rows = await sql<{ id: string; status: string; payload: Record<string, unknown>; created_at: string; updated_at: string; completed_at: string | null; last_error: string | null }[]>`
      SELECT j.id::text,j.status,j.payload,j.created_at,j.updated_at,j.completed_at,j.last_error
      FROM jobs j JOIN sites s ON s.id=j.site_id
      WHERE j.job_type='pilot_ingestion_v1' AND lower(s.domain)='diamondshelf.us'
      ORDER BY j.created_at DESC LIMIT 1`;
    const row = rows[0];
    if (!row) return { runId: null, status: "not_started", phase: "not_started", readiness: "not_evaluated", freshness: null, blockers: [], counts: emptyCounts(), diagnostics: emptyDiagnostics(), certification: null, error: null };
    const readiness = typeof row.payload.readiness === "object" && row.payload.readiness ? row.payload.readiness as Record<string, unknown> : {};
    const counts = typeof row.payload.counts === "object" && row.payload.counts ? row.payload.counts as Record<string, unknown> : {};
    const rawDiagnostics = typeof readiness.diagnostics === "object" && readiness.diagnostics ? readiness.diagnostics as Record<string, unknown> : {};
    const parseDiagnostic = (provider: string): ProviderDiagnostic => {
      const value = typeof rawDiagnostics[provider] === "object" && rawDiagnostics[provider] ? rawDiagnostics[provider] as Record<string, unknown> : {};
      return {
        status: ["available", "empty", "failed"].includes(String(value.status)) ? value.status as ProviderDiagnostic["status"] : "failed",
        category: typeof value.category === "string" ? value.category : null,
        httpStatus: Number.isInteger(Number(value.httpStatus)) ? Number(value.httpStatus) : null,
      };
    };
    const readinessState = readiness.state === "ready" || readiness.state === "partial" ? readiness.state : "not_evaluated";
    const status: PilotPublicStatus = row.status === "pending" ? "queued" : row.status === "active" ? "running" : row.status === "failed" ? "failed" : readinessState === "partial" ? "partial" : "completed";
    return {
      runId: row.id,
      status,
      phase: typeof row.payload.phase === "string" ? row.payload.phase : status,
      readiness: readinessState,
      freshness: new Date(row.completed_at ?? row.updated_at ?? row.created_at).toISOString(),
      blockers: Array.isArray(readiness.blockers) ? readiness.blockers.filter((item): item is string => typeof item === "string") : [],
      counts: {
        products: numberValue(counts.products),
        catalogProducts: numberValue(counts.catalogProducts ?? counts.products),
        productsObserved: numberValue(counts.productsObserved ?? counts.products),
        shopifyComplete: counts.shopifyComplete === true,
        gscRows: numberValue(counts.gscRows),
        gscDetailedRows: numberValue(counts.gscDetailedRows ?? counts.gscRows),
        ga4Rows: numberValue(counts.ga4Rows),
        pages: numberValue(counts.pages),
        findings: numberValue(counts.findings),
        opportunities: numberValue(counts.opportunities),
      },
      diagnostics: { shopify: parseDiagnostic("shopify"), gsc: parseDiagnostic("gsc"), gscAggregate: parseDiagnostic("gscAggregate"), ga4: parseDiagnostic("ga4"), crawl: parseDiagnostic("crawl") },
      certification: typeof row.payload.certification === "object" && row.payload.certification ? row.payload.certification as BaselineCertification : null,
      error: row.last_error && /^pilot_[a-z0-9_]+$/.test(row.last_error) ? row.last_error : null,
    };
  } finally {
    await sql.end({ timeout: 2 });
  }
}