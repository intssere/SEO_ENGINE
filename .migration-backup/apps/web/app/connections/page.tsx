import { listConnectionSummaries } from "../../lib/oauth-connections";
import { getRuntimeReadiness } from "../../lib/operational-data";
import { DashboardShell } from "../components/dashboard-shell";
import { SeoCommand } from "../components/seo-command";

export const dynamic = "force-dynamic";
interface PageProps { searchParams: Promise<Record<string, string | string[] | undefined>> }
function text(value: string | string[] | undefined): string { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function safeConnectionError(value: string): string { return value ? "Connection authorization did not complete. Review the provider configuration and retry." : ""; }

export default async function ConnectionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const readiness = await getRuntimeReadiness();
  const connections = readiness.state === "live" ? await listConnectionSummaries().catch(() => []) : [];
  const shopify = connections.find((item) => item.provider === "shopify");
  const google = connections.find((item) => item.provider === "google");
  const error = safeConnectionError(text(params.error));
  const connected = text(params.connected);
  const needsConfirmation = google?.metadata.needsConfirmation === true;
  const gscOptions = Array.isArray(google?.metadata.discoveredSearchConsoleProperties) ? google.metadata.discoveredSearchConsoleProperties as Array<{ siteUrl?: string; permissionLevel?: string | null }> : [];
  const ga4Options = Array.isArray(google?.metadata.discoveredGa4Properties) ? google.metadata.discoveredGa4Properties as Array<{ propertyId?: string; displayName?: string | null }> : [];

  return <DashboardShell dataState={readiness.state}>
    <header className="topbar"><div><strong>Diamond Shelf</strong><span className="muted"> diamondshelf.us</span></div><SeoCommand /></header>
    <div className="content">
      {readiness.state !== "live" ? <div className={`dataBanner ${readiness.state === "setup_required" ? "stale" : "unavailable"}`}><strong>{readiness.state === "setup_required" ? "Database setup required before OAuth activation" : "Database unavailable"}</strong><span>{readiness.message}</span></div> : null}
      <div className="titleRow"><div><p className="eyebrow">ACCOUNT ACCESS</p><h1>Connections</h1><p className="muted">Authorize accounts once. Credentials remain encrypted server-side and Google access can refresh automatically.</p></div></div>
      {error ? <div className="dataBanner unavailable"><strong>Connection error</strong><span>{error}</span></div> : null}
      {connected ? <div className="dataBanner live"><strong>Authorization completed</strong><span>{connected === "google" ? "Google" : "Shopify"} connection returned successfully.</span></div> : null}
      <div className="twoCol">
        <section className="card"><p className="eyebrow">COMMERCE</p><h2>Shopify</h2><p>Status: <strong>{shopify?.status ?? "not connected"}</strong></p>{shopify ? <p className="muted">Store: {shopify.externalAccountId} · Scopes: {shopify.scopes.join(", ") || "—"}</p> : readiness.state === "live" ? <form action="/api/connections/shopify/start" method="get" className="connectionForm"><input name="shop" required placeholder="your-store.myshopify.com" /><button type="submit">Connect Shopify</button></form> : <p className="muted">Initialize the database first; connection tokens cannot be stored safely until then.</p>}</section>
        <section className="card"><p className="eyebrow">SEARCH + ANALYTICS</p><h2>Google Search Console + GA4</h2><p>Status: <strong>{google?.status ?? "not connected"}</strong></p>{!google ? readiness.state === "live" ? <a className="linkButton" href="/api/connections/google/start">Connect Google →</a> : <p className="muted">Initialize the database first.</p> : needsConfirmation ? <form action="/api/connections/google/select" method="post" className="connectionForm stacked"><label>Search Console property<select name="gscSiteUrl" required><option value="">Select…</option>{gscOptions.map((item) => item.siteUrl ? <option key={item.siteUrl} value={item.siteUrl}>{item.siteUrl}</option> : null)}</select></label><label>GA4 property<select name="ga4PropertyId" required><option value="">Select…</option>{ga4Options.map((item) => item.propertyId ? <option key={item.propertyId} value={item.propertyId}>{item.displayName ?? "GA4"} · {item.propertyId}</option> : null)}</select></label><button type="submit">Confirm properties</button></form> : <div className="muted"><p>Search Console: {String(google.metadata.gscSiteUrl ?? "connected")}</p><p>GA4: {String(google.metadata.ga4PropertyId ?? "connected")}</p><p>Refresh token retained securely: {google.metadata.hasRefreshToken === true ? "yes" : "no"}</p></div>}</section>
      </div>
      <section className="card readinessCard"><h2>Safety state</h2><p>Public-site writes remain disabled. OAuth authorization alone does not authorize SEO ENGINE to publish changes.</p></section>
    </div>
  </DashboardShell>;
}
