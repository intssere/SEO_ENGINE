import postgres from "postgres";

export type RuntimeState = "live" | "setup_required" | "unavailable";
export interface RuntimeReadiness { state: RuntimeState; message: string; siteId: string | null }
export interface PerformanceFilters { days: number; country: string; device: string }

function db() {
  const url = process.env.DATABASE_URL?.trim();
  return url ? postgres(url, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 2 }) : null;
}

export function parsePerformanceFilters(input: Record<string, string | string[] | undefined>): PerformanceFilters {
  const rawDays = Array.isArray(input.days) ? input.days[0] : input.days;
  const parsed = Number(rawDays ?? 28);
  const days = [7, 28, 90].includes(parsed) ? parsed : 28;
  const rawCountry = Array.isArray(input.country) ? input.country[0] : input.country;
  const rawDevice = Array.isArray(input.device) ? input.device[0] : input.device;
  const country = /^[A-Za-z]{2}$/.test(rawCountry ?? "") ? String(rawCountry).toUpperCase() : "all";
  const device = ["desktop", "mobile", "tablet"].includes(String(rawDevice ?? "").toLowerCase()) ? String(rawDevice).toLowerCase() : "all";
  return { days, country, device };
}

export async function getRuntimeReadiness(): Promise<RuntimeReadiness> {
  const sql = db();
  if (!sql) return { state: "unavailable", message: "Database connection is not configured.", siteId: null };
  try {
    const schema = await sql<{ sites: string | null; connections: string | null }[]>`SELECT to_regclass('public.sites')::text AS sites, to_regclass('public.connections')::text AS connections`;
    if (!schema[0]?.sites || !schema[0]?.connections) {
      return { state: "setup_required", message: "Database connected, but the SEO ENGINE schema has not been initialized. Apply the core database migration before connecting data sources.", siteId: null };
    }
    const rows = await sql<{ id: string }[]>`SELECT id::text FROM sites WHERE lower(domain) = 'diamondshelf.us' AND is_active = true ORDER BY updated_at DESC LIMIT 1`;
    if (!rows[0]?.id) return { state: "setup_required", message: "Database schema is ready, but the Diamond Shelf site record has not been initialized.", siteId: null };
    return { state: "live", message: "Operational database ready.", siteId: rows[0].id };
  } catch {
    return { state: "unavailable", message: "Operational database is currently unavailable. Check the database connection and retry.", siteId: null };
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}

export async function loadPerformance(filters: PerformanceFilters) {
  const readiness = await getRuntimeReadiness();
  if (readiness.state !== "live" || !readiness.siteId) return { readiness, rows: [], summary: null };
  const sql = db()!;
  try {
    const rows = await sql<{ query: string; country: string | null; device: string | null; clicks: number; impressions: number; ctr: number; position: number | null }[]>`
      SELECT sq.query, sq.country, sq.device,
        SUM(sm.clicks)::int AS clicks,
        SUM(sm.impressions)::int AS impressions,
        CASE WHEN SUM(sm.impressions) > 0 THEN SUM(sm.clicks)::float / SUM(sm.impressions) ELSE 0 END AS ctr,
        AVG(sm.average_position) AS position
      FROM search_metrics sm
      JOIN search_queries sq ON sq.id = sm.query_id
      WHERE sq.site_id = ${readiness.siteId}::uuid
        AND sm.source = 'gsc'
        AND sm.metric_date >= current_date - ${filters.days - 1}
        AND (${filters.country} = 'all' OR upper(COALESCE(sq.country,'')) = ${filters.country})
        AND (${filters.device} = 'all' OR lower(COALESCE(sq.device,'')) = ${filters.device})
      GROUP BY sq.query, sq.country, sq.device
      ORDER BY impressions DESC, clicks DESC
      LIMIT 250
    `;
    const summary = rows.reduce((acc, row) => {
      acc.clicks += Number(row.clicks ?? 0); acc.impressions += Number(row.impressions ?? 0); return acc;
    }, { clicks: 0, impressions: 0 });
    return { readiness, rows, summary };
  } catch {
    return { readiness: { state: "unavailable" as const, message: "Performance data could not be loaded.", siteId: readiness.siteId }, rows: [], summary: null };
  } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
}

export async function loadOperationalList(kind: "opportunities" | "actions" | "approvals" | "deployments" | "findings") {
  const readiness = await getRuntimeReadiness();
  if (readiness.state !== "live" || !readiness.siteId) return { readiness, rows: [] as Array<Record<string, unknown>> };
  const sql = db()!;
  try {
    if (kind === "opportunities") {
      const rows = await sql`SELECT o.id::text, o.opportunity_type AS title, o.score, o.status, o.rationale, cardinality(o.evidence_ids) AS evidence_count, p.url FROM opportunities o LEFT JOIN pages p ON p.id=o.page_id WHERE o.site_id=${readiness.siteId}::uuid ORDER BY o.score DESC, o.created_at DESC LIMIT 200`;
      return { readiness, rows };
    }
    if (kind === "actions") {
      const rows = await sql`SELECT a.id::text, a.action_type AS title, a.status, ap.risk_level, ap.rationale, p.url FROM actions a JOIN action_plans ap ON ap.id=a.action_plan_id LEFT JOIN pages p ON p.id=a.page_id WHERE ap.site_id=${readiness.siteId}::uuid ORDER BY a.created_at DESC LIMIT 200`;
      return { readiness, rows };
    }
    if (kind === "approvals") {
      const rows = await sql`SELECT ap.id::text, ap.risk_level, ap.status, ap.rationale, COALESCE(a.decision,'pending') AS decision, a.decided_at FROM action_plans ap LEFT JOIN LATERAL (SELECT decision, decided_at FROM approvals WHERE action_plan_id=ap.id ORDER BY decided_at DESC LIMIT 1) a ON true WHERE ap.site_id=${readiness.siteId}::uuid AND ap.risk_level='approval' ORDER BY ap.created_at DESC LIMIT 200`;
      return { readiness, rows };
    }
    if (kind === "deployments") {
      const rows = await sql`SELECT d.id::text, d.provider, d.status, d.deployed_at, ap.risk_level, ap.rationale, v.status AS verification_status FROM deployments d JOIN action_plans ap ON ap.id=d.action_plan_id LEFT JOIN LATERAL (SELECT status FROM verifications WHERE deployment_id=d.id ORDER BY created_at DESC LIMIT 1) v ON true WHERE ap.site_id=${readiness.siteId}::uuid ORDER BY d.created_at DESC LIMIT 200`;
      return { readiness, rows };
    }
    const rows = await sql`SELECT f.id::text, f.title, f.category, f.severity, f.status, f.description, p.url FROM findings f LEFT JOIN pages p ON p.id=f.page_id WHERE f.site_id=${readiness.siteId}::uuid ORDER BY f.detected_at DESC LIMIT 200`;
    return { readiness, rows };
  } catch {
    return { readiness: { state: "unavailable" as const, message: "Operational records could not be loaded.", siteId: readiness.siteId }, rows: [] as Array<Record<string, unknown>> };
  } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
}

export async function answerOperationalQuestion(question: string): Promise<string> {
  const q = question.trim().toLowerCase();
  const readiness = await getRuntimeReadiness();
  if (q.includes("unavailable") || q.includes("database") || q.includes("setup")) return readiness.message;
  if (readiness.state !== "live" || !readiness.siteId) return readiness.message;
  if (q.includes("approval")) {
    const data = await loadOperationalList("approvals");
    const pending = data.rows.filter((row) => row.decision === "pending").length;
    return pending ? `${pending} approval-required plan${pending === 1 ? " is" : "s are"} awaiting a decision. Open Approvals to review evidence and rationale.` : "No approval-required plans are currently awaiting a decision.";
  }
  if (q.includes("opportunit")) {
    const data = await loadOperationalList("opportunities");
    if (!data.rows.length) return "No persisted opportunities are available yet.";
    return data.rows.slice(0, 5).map((row, i) => `${i + 1}. ${String(row.title).replaceAll("_", " ")} — score ${Number(row.score ?? 0).toFixed(1)}`).join("\n");
  }
  if ((q.includes("6") && q.includes("15")) || q.includes("striking")) {
    const perf = await loadPerformance({ days: 28, country: "all", device: "all" });
    const rows = perf.rows.filter((row) => Number(row.position ?? 999) >= 6 && Number(row.position ?? 999) <= 15).slice(0, 10);
    if (!rows.length) return "No persisted GSC queries currently rank between positions 6 and 15.";
    return rows.map((row, i) => `${i + 1}. ${row.query} — position ${Number(row.position).toFixed(1)}, ${Number(row.impressions).toLocaleString("en-US")} impressions`).join("\n");
  }
  return "I can currently answer read-only operational questions about approvals, top opportunities, queries ranking 6–15, and runtime/data readiness.";
}
