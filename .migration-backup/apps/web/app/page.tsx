import { loadDashboardData } from "../lib/dashboard-data";
import { getRuntimeReadiness, loadPerformance, parsePerformanceFilters } from "../lib/operational-data";
import { DashboardShell } from "./components/dashboard-shell";
import { SeoCommand } from "./components/seo-command";

export const dynamic = "force-dynamic";
interface Props { searchParams: Promise<Record<string, string | string[] | undefined>> }

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) { return <span className={`badge ${tone}`}>{children}</span>; }
function riskTone(risk: string) { if (risk === "approval") return "approval"; if (risk === "blocked") return "experiment"; return "verified"; }

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const filters = parsePerformanceFilters(params);
  const readiness = await getRuntimeReadiness();
  const data = readiness.state === "live" ? await loadDashboardData() : null;
  const performance = await loadPerformance(filters);
  const approvalsPending = data?.approvalsPending ?? 0;
  const verificationPct = data && data.verification.total > 0 ? Math.round((data.verification.verified / data.verification.total) * 100) : 0;
  const metrics = data ? data.metrics : [
    { label: "Organic clicks", value: "—", delta: "Awaiting live GSC data" },
    { label: "Impressions", value: "—", delta: "Awaiting live GSC data" },
    { label: "Top-10 keywords", value: "—", delta: "Awaiting live GSC data" },
    { label: "Average position", value: "—", delta: "Awaiting live GSC data" },
    { label: "AI citation rate", value: "—", delta: "Awaiting AI observations" },
    { label: "Open findings", value: "—", delta: "Awaiting baseline" },
  ];
  if (performance.summary) {
    metrics[0] = { label: "Organic clicks", value: performance.summary.clicks.toLocaleString("en-US"), delta: `${filters.days}-day filtered GSC` };
    metrics[1] = { label: "Impressions", value: performance.summary.impressions.toLocaleString("en-US"), delta: `${filters.country === "all" ? "All countries" : filters.country} · ${filters.device}` };
  }

  return <DashboardShell approvalsPending={approvalsPending} dataState={readiness.state}>
    <header className="topbar">
      <div><strong>{data?.siteName ?? "Diamond Shelf"}</strong><span className="muted"> {data?.domain ?? "diamondshelf.us"}</span></div>
      <div className="filters"><a href={`/performance?days=${filters.days}&country=${filters.country}&device=${filters.device}`}>Performance detail</a><Badge tone={readiness.state === "live" ? "verified" : "approval"}>{readiness.state === "live" ? "LIVE DATA" : readiness.state === "setup_required" ? "SETUP REQUIRED" : "DATA UNAVAILABLE"}</Badge></div>
    </header>
    <div className="content">
      <div className={`dataBanner ${readiness.state === "live" ? data?.stale ? "stale" : "live" : readiness.state === "setup_required" ? "stale" : "unavailable"}`}>
        <strong>{readiness.state === "live" ? data?.stale ? "Operational database connected · observations may be stale" : "Operational database connected" : readiness.state === "setup_required" ? "Complete runtime setup" : "Production data unavailable"}</strong>
        <span>{readiness.state === "live" ? `Updated ${data?.dataFreshness ?? "now"}` : readiness.message}</span>
      </div>

      <div className="titleRow"><div><p className="eyebrow">OVERVIEW</p><h1>SEO operations command center</h1><p className="muted">Persisted evidence, decisions, actions and verification. No demo metrics are substituted for missing production data.</p></div><SeoCommand /></div>

      <form className="filterForm overviewFilters" method="get">
        <label>Period<select name="days" defaultValue={String(filters.days)}><option value="7">Last 7 days</option><option value="28">Last 28 days</option><option value="90">Last 90 days</option></select></label>
        <label>Country<select name="country" defaultValue={filters.country}><option value="all">All countries</option><option value="US">US</option><option value="PK">PK</option></select></label>
        <label>Device<select name="device" defaultValue={filters.device}><option value="all">All devices</option><option value="desktop">Desktop</option><option value="mobile">Mobile</option><option value="tablet">Tablet</option></select></label>
        <button type="submit">Apply</button>
      </form>

      <section className="metricGrid">{metrics.map((metric) => <article className="card metric" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small className={readiness.state === "live" ? "positive" : "muted"}>{metric.delta}</small></article>)}</section>

      <section className="engine card">
        <div className="sectionHead"><div><p className="eyebrow">AI SEO ENGINE · LAST 24 HOURS</p><h2>Engine activity</h2></div><Badge tone={readiness.state === "live" ? "verified" : "approval"}>{readiness.state === "live" ? "DATABASE-BACKED" : "NOT READY"}</Badge></div>
        <div className="engineStats"><div><strong>{data?.engine.pagesAnalyzed ?? 0}</strong><span>Pages analyzed</span></div><div><strong>{data?.engine.opportunities ?? 0}</strong><span>Opportunities</span></div><div><strong>{data?.engine.actionsPrepared ?? 0}</strong><span>Actions prepared</span></div><div><strong>{data?.engine.executed ?? 0}</strong><span>Executed</span></div><div><strong>{data?.engine.verified ?? 0}</strong><span>Verified</span></div><div><strong>{data?.engine.regressions ?? 0}</strong><span>Regressions</span></div></div>
      </section>

      <div className="twoCol">
        <section className="card"><div className="sectionHead"><div><p className="eyebrow">DECISION QUEUE</p><h2>Top opportunities</h2></div><a className="linkButton" href="/opportunities">View all →</a></div><div className="tableWrap"><table><thead><tr><th>Opportunity</th><th>Score</th><th>Evidence</th><th>Risk</th><th>State</th></tr></thead><tbody>{data?.opportunities.length ? data.opportunities.map((row) => <tr key={`${row.title}-${row.score}`}><td>{row.title}</td><td>{row.score}</td><td>{row.evidence}</td><td><Badge tone={riskTone(row.risk)}>{row.risk}</Badge></td><td>{row.state}</td></tr>) : <tr><td colSpan={5} className="emptyCell">No persisted opportunities available.</td></tr>}</tbody></table></div></section>
        <section className="card activity"><div className="sectionHead"><div><p className="eyebrow">TRACEABLE AI</p><h2>What changed</h2></div></div>{data?.activity.length ? data.activity.map((item) => <div className="activityItem" key={`${item.title}-${item.detail}`}><span className={`activityDot ${item.tone}`} /><div><strong>{item.title}</strong><p>{item.detail}</p><small>{item.result}</small></div><span>›</span></div>) : <p className="muted">No live activity available.</p>}</section>
      </div>

      <div className="threeCol">
        <section className="card"><p className="eyebrow">VERIFICATION</p><h2>Changes & proof</h2><div className="bigStat">{data?.verification.verified ?? 0} <span>/ {data?.verification.total ?? 0} verified</span></div><div className="progress"><i style={{width:`${verificationPct}%`}} /></div><p className="muted">{data?.verification.pending ?? 0} pending · {data?.verification.rolledBack ?? 0} rolled back · {data?.verification.regressions ?? 0} regressions</p><a className="linkButton" href="/deployments">View deployment proof →</a></section>
        <section className="card"><p className="eyebrow">AI VISIBILITY</p><h2>Generative search</h2><div className="splitStats"><div><strong>{data?.aiVisibility.citationRate ?? "—"}</strong><span>Citation rate</span></div><div><strong>{data?.aiVisibility.brandMentionRate ?? "—"}</strong><span>Brand mentions</span></div><div><strong>{data?.aiVisibility.citationShare ?? "—"}</strong><span>Citation share</span></div></div><a className="linkButton" href="/ai-visibility">Open AI visibility →</a></section>
        <section className="card"><p className="eyebrow">LEARNING ENGINE</p><h2>Evidence becoming signal</h2><div className="learning"><strong>{data?.learning.signalCount ?? 0} persisted signals</strong><Badge tone="verified">{data?.learning.averageConfidence ?? "—"} avg confidence</Badge></div><p className="muted">Learning adjusts prioritization only; official policy and safety remain authoritative.</p><a className="linkButton" href="/learning">Inspect learning →</a></section>
      </div>
    </div>
  </DashboardShell>;
}
