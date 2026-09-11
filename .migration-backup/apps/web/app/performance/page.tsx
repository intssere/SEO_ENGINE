import { DashboardShell } from "../components/dashboard-shell";
import { SeoCommand } from "../components/seo-command";
import { loadPerformance, parsePerformanceFilters } from "../../lib/operational-data";

export const dynamic = "force-dynamic";
interface Props { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function PerformancePage({ searchParams }: Props) {
  const params = await searchParams;
  const filters = parsePerformanceFilters(params);
  const data = await loadPerformance(filters);
  return <DashboardShell dataState={data.readiness.state}>
    <header className="topbar"><div><strong>Diamond Shelf</strong><span className="muted"> diamondshelf.us</span></div><SeoCommand /></header>
    <div className="content">
      {data.readiness.state !== "live" ? <div className={`dataBanner ${data.readiness.state === "setup_required" ? "stale" : "unavailable"}`}><strong>{data.readiness.state === "setup_required" ? "Setup required" : "Data unavailable"}</strong><span>{data.readiness.message}</span></div> : null}
      <div className="titleRow"><div><p className="eyebrow">SEARCH PERFORMANCE</p><h1>Google Search Console</h1><p className="muted">Filters operate on persisted GSC query dimensions; no synthetic data is used.</p></div></div>
      <form className="filterForm" method="get">
        <label>Period<select name="days" defaultValue={String(filters.days)}><option value="7">Last 7 days</option><option value="28">Last 28 days</option><option value="90">Last 90 days</option></select></label>
        <label>Country<select name="country" defaultValue={filters.country}><option value="all">All countries</option><option value="US">US</option><option value="PK">PK</option></select></label>
        <label>Device<select name="device" defaultValue={filters.device}><option value="all">All devices</option><option value="desktop">Desktop</option><option value="mobile">Mobile</option><option value="tablet">Tablet</option></select></label>
        <button type="submit">Apply filters</button>
      </form>
      <section className="metricGrid compactMetrics"><article className="card metric"><span>Clicks</span><strong>{data.summary ? data.summary.clicks.toLocaleString("en-US") : "—"}</strong></article><article className="card metric"><span>Impressions</span><strong>{data.summary ? data.summary.impressions.toLocaleString("en-US") : "—"}</strong></article><article className="card metric"><span>Queries shown</span><strong>{data.rows.length}</strong></article></section>
      <section className="card"><div className="tableWrap"><table><thead><tr><th>Query</th><th>Country</th><th>Device</th><th>Clicks</th><th>Impressions</th><th>CTR</th><th>Position</th></tr></thead><tbody>{data.rows.length ? data.rows.map((row, i) => <tr key={`${row.query}-${row.country}-${row.device}-${i}`}><td>{row.query}</td><td>{row.country ?? "—"}</td><td>{row.device ?? "—"}</td><td>{Number(row.clicks).toLocaleString("en-US")}</td><td>{Number(row.impressions).toLocaleString("en-US")}</td><td>{(Number(row.ctr) * 100).toFixed(1)}%</td><td>{row.position == null ? "—" : Number(row.position).toFixed(1)}</td></tr>) : <tr><td colSpan={7} className="emptyCell">No persisted GSC data for these filters.</td></tr>}</tbody></table></div></section>
    </div>
  </DashboardShell>;
}
