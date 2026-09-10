import postgres from "postgres";

export type PerformanceFilters = { days: 7 | 28 | 90; country: string; device: "all" | "desktop" | "mobile" | "tablet" };
export type RuntimeReadiness = { state: "live" | "setup_required" | "unavailable"; message: string; siteId: string | null };

function database() {
  const url = process.env.DATABASE_URL?.trim();
  return url ? postgres(url, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 2 }) : null;
}
export function parsePerformanceFilters(input: Record<string, unknown>): PerformanceFilters {
  const value = (key: string) => Array.isArray(input[key]) ? input[key][0] : input[key];
  const days = ([7, 28, 90] as const).includes(Number(value("days")) as 7 | 28 | 90) ? Number(value("days")) as 7 | 28 | 90 : 28;
  const country = typeof value("country") === "string" && /^[A-Za-z]{2,3}$/.test(value("country") as string) ? (value("country") as string).toUpperCase() : "all";
  const rawDevice = String(value("device") ?? "").toLowerCase();
  return { days, country, device: ["desktop", "mobile", "tablet"].includes(rawDevice) ? rawDevice as PerformanceFilters["device"] : "all" };
}
export async function getRuntimeReadiness(): Promise<RuntimeReadiness> {
  const sql = database();
  if (!sql) return { state: "unavailable", message: "Database connection is not configured.", siteId: null };
  try {
    const tables = await sql<{ sites: string | null; connections: string | null }[]>`SELECT to_regclass('public.sites')::text sites, to_regclass('public.connections')::text connections`;
    if (!tables[0]?.sites || !tables[0]?.connections) return { state: "setup_required", message: "Database schema has not been initialized.", siteId: null };
    const rows = await sql<{ id: string }[]>`SELECT id::text FROM sites WHERE lower(domain)='diamondshelf.us' AND is_active=true ORDER BY updated_at DESC LIMIT 1`;
    return rows[0] ? { state: "live", message: "Operational database ready.", siteId: rows[0].id } : { state: "setup_required", message: "Diamond Shelf site record has not been initialized.", siteId: null };
  } catch { return { state: "unavailable", message: "Operational database is currently unavailable.", siteId: null }; }
  finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
}
export async function loadPerformance(filters: PerformanceFilters) {
  const readiness = await getRuntimeReadiness();
  if (readiness.state !== "live" || !readiness.siteId) return { readiness, rows: [], summary: null };
  const sql = database()!;
  try {
    const rows = await sql`SELECT sq.query, sq.country, sq.device, SUM(sm.clicks)::int clicks, SUM(sm.impressions)::int impressions, CASE WHEN SUM(sm.impressions)>0 THEN SUM(sm.clicks)::float/SUM(sm.impressions) ELSE 0 END ctr, AVG(sm.average_position) position FROM search_metrics sm JOIN search_queries sq ON sq.id=sm.query_id WHERE sq.site_id=${readiness.siteId}::uuid AND sm.source='gsc' AND sm.metric_date >= current_date - ${filters.days - 1} AND (${filters.country}='all' OR upper(coalesce(sq.country,''))=${filters.country}) AND (${filters.device}='all' OR lower(coalesce(sq.device,''))=${filters.device}) GROUP BY sq.query,sq.country,sq.device ORDER BY impressions DESC, clicks DESC LIMIT 250`;
    const summary = rows.reduce((a, r) => ({ clicks: a.clicks + Number(r.clicks ?? 0), impressions: a.impressions + Number(r.impressions ?? 0) }), { clicks: 0, impressions: 0 });
    return { readiness, rows, summary };
  } catch { return { readiness: { state: "unavailable" as const, message: "Performance data could not be loaded.", siteId: readiness.siteId }, rows: [], summary: null }; }
  finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
}
export async function loadOperationalList(kind: "opportunities" | "actions" | "approvals" | "deployments" | "findings") {
  const readiness = await getRuntimeReadiness();
  if (readiness.state !== "live" || !readiness.siteId) return { readiness, rows: [] as Record<string, unknown>[] };
  const sql = database()!;
  try {
    const queries = {
      opportunities: sql`SELECT o.id::text,o.opportunity_type title,o.score,o.status,o.rationale,cardinality(o.evidence_ids) evidence_count,p.url FROM opportunities o LEFT JOIN pages p ON p.id=o.page_id WHERE o.site_id=${readiness.siteId}::uuid ORDER BY o.score DESC,o.created_at DESC LIMIT 200`,
      actions: sql`SELECT a.id::text,a.action_type title,a.status,ap.risk_level,ap.rationale,p.url FROM actions a JOIN action_plans ap ON ap.id=a.action_plan_id LEFT JOIN pages p ON p.id=a.page_id WHERE ap.site_id=${readiness.siteId}::uuid ORDER BY a.created_at DESC LIMIT 200`,
      approvals: sql`SELECT ap.id::text,ap.risk_level,ap.status,ap.rationale,coalesce(a.decision,'pending') decision,a.decided_at FROM action_plans ap LEFT JOIN LATERAL (SELECT decision,decided_at FROM approvals WHERE action_plan_id=ap.id ORDER BY decided_at DESC LIMIT 1) a ON true WHERE ap.site_id=${readiness.siteId}::uuid AND ap.risk_level='approval' ORDER BY ap.created_at DESC LIMIT 200`,
      deployments: sql`SELECT d.id::text,d.provider,d.status,d.deployed_at,ap.risk_level,ap.rationale,v.status verification_status FROM deployments d JOIN action_plans ap ON ap.id=d.action_plan_id LEFT JOIN LATERAL (SELECT status FROM verifications WHERE deployment_id=d.id ORDER BY created_at DESC LIMIT 1) v ON true WHERE ap.site_id=${readiness.siteId}::uuid ORDER BY d.created_at DESC LIMIT 200`,
      findings: sql`SELECT f.id::text,f.title,f.category,f.severity,f.status,f.description,p.url FROM findings f LEFT JOIN pages p ON p.id=f.page_id WHERE f.site_id=${readiness.siteId}::uuid ORDER BY f.detected_at DESC LIMIT 200`,
    };
    return { readiness, rows: await queries[kind] };
  } catch { return { readiness: { state: "unavailable" as const, message: "Operational records could not be loaded.", siteId: readiness.siteId }, rows: [] as Record<string, unknown>[] }; }
  finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
}
export async function answerOperationalQuestion(question: string) {
  const q = question.toLowerCase();
  const readiness = await getRuntimeReadiness();
  if (q.includes("database") || q.includes("setup") || readiness.state !== "live") return readiness.message;
  if (q.includes("approval")) { const d = await loadOperationalList("approvals"); const n = d.rows.filter(r => r.decision === "pending").length; return n ? `${n} approval-required plan${n === 1 ? " is" : "s are"} awaiting a decision.` : "No approval-required plans are currently awaiting a decision."; }
  if (q.includes("opportun")) { const d = await loadOperationalList("opportunities"); return d.rows.length ? d.rows.slice(0, 5).map((r, i) => `${i + 1}. ${String(r.title).replaceAll("_", " ")} — score ${Number(r.score ?? 0).toFixed(1)}`).join("\n") : "No persisted opportunities are available yet."; }
  return "I can answer read-only questions about approvals, opportunities, ranking queries, and runtime readiness.";
}