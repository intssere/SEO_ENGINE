import { notFound } from "next/navigation";
import { DashboardShell } from "../components/dashboard-shell";
import { SeoCommand } from "../components/seo-command";
import { getRuntimeReadiness } from "../../lib/operational-data";

export const dynamic = "force-dynamic";

const sections: Record<string, { eyebrow: string; title: string; description: string; source: string }> = {
  rankings: { eyebrow: "RANK INTELLIGENCE", title: "Rankings", description: "Ranking intelligence will populate from persisted GSC and provider observations.", source: "GSC + SEO data provider" },
  "technical-seo": { eyebrow: "TECHNICAL SEO", title: "Technical SEO", description: "Crawl-derived findings, indexability and technical defects are surfaced from persisted evidence.", source: "Crawler + findings" },
  "internal-links": { eyebrow: "INTERNAL AUTHORITY", title: "Internal Links", description: "Internal link graph, orphan detection and authority opportunities will appear here after a baseline crawl.", source: "Crawl graph + opportunity engine" },
  "ai-visibility": { eyebrow: "GEO / AIO", title: "AI Visibility", description: "Brand mentions, citations, citation share and provider observations are shown only from persisted AI-response evidence.", source: "AI visibility observations" },
  experiments: { eyebrow: "EXPERIMENT ENGINE", title: "Experiments", description: "Controlled treatment/control SEO experiments and measured outcomes live here.", source: "Experiments + outcomes" },
  "search-intelligence": { eyebrow: "SEARCH INTELLIGENCE", title: "Search Intelligence", description: "Official policy changes, versioned rules and algorithm-update mode will be presented here.", source: "Policy sources + rules" },
  learning: { eyebrow: "LEARNING ENGINE", title: "Learning", description: "Bounded learning signals influence prioritization but never override policy or safety.", source: "Learning signals" },
  impact: { eyebrow: "VERIFIED IMPACT", title: "Impact", description: "Verified optimizations, experiments, regressions and rollbacks are summarized from persisted outcomes.", source: "Verification + outcomes" },
  settings: { eyebrow: "CONTROL PLANE", title: "Settings", description: "Runtime safety and connection configuration belong here. Public-site writes remain disabled unless separately authorized.", source: "Runtime configuration" },
};

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const config = sections[section];
  if (!config) notFound();
  const readiness = await getRuntimeReadiness();
  return <DashboardShell dataState={readiness.state}>
    <header className="topbar"><div><strong>Diamond Shelf</strong><span className="muted"> diamondshelf.us</span></div><SeoCommand /></header>
    <div className="content">
      {readiness.state !== "live" ? <div className={`dataBanner ${readiness.state === "setup_required" ? "stale" : "unavailable"}`}><strong>{readiness.state === "setup_required" ? "Setup required" : "Data unavailable"}</strong><span>{readiness.message}</span></div> : null}
      <div className="titleRow"><div><p className="eyebrow">{config.eyebrow}</p><h1>{config.title}</h1><p className="muted">{config.description}</p></div><SeoCommand /></div>
      <section className="card readinessCard"><h2>{readiness.state === "live" ? "Data source ready" : "Waiting for operational data"}</h2><p>{config.source}</p><p className="muted">This route is live and connected to the SEO ENGINE operational state. It does not display demo fixtures.</p>{config.title === "Technical SEO" ? <a className="linkButton" href="/opportunities">View prioritized opportunities →</a> : null}{config.title === "Settings" ? <a className="linkButton" href="/connections">Manage connections →</a> : null}</section>
    </div>
  </DashboardShell>;
}
