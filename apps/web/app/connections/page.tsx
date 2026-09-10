import { listConnectionSummaries } from "../../lib/oauth-connections";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function text(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function ConnectionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const connections = await listConnectionSummaries();
  const shopify = connections.find((item) => item.provider === "shopify");
  const google = connections.find((item) => item.provider === "google");
  const error = text(params.error);
  const connected = text(params.connected);
  const needsConfirmation = google?.metadata.needsConfirmation === true;
  const gscOptions = Array.isArray(google?.metadata.discoveredSearchConsoleProperties)
    ? google.metadata.discoveredSearchConsoleProperties as Array<{ siteUrl?: string; permissionLevel?: string | null }>
    : [];
  const ga4Options = Array.isArray(google?.metadata.discoveredGa4Properties)
    ? google.metadata.discoveredGa4Properties as Array<{ propertyId?: string; displayName?: string | null }>
    : [];

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "48px 24px", fontFamily: "system-ui, sans-serif" }}>
      <p style={{ margin: 0, color: "#666", fontSize: 13, letterSpacing: 1 }}>SEO ENGINE · DIAMOND SHELF</p>
      <h1 style={{ marginTop: 8 }}>Connections</h1>
      <p style={{ color: "#555", maxWidth: 720 }}>
        Authorize accounts once. SEO ENGINE stores credentials server-side in encrypted form, discovers the correct properties, refreshes Google access automatically, and keeps the pilot read-only.
      </p>

      {error ? <div style={{ padding: 14, border: "1px solid #b42318", borderRadius: 8, margin: "20px 0" }}>Connection error: {error}</div> : null}
      {connected ? <div style={{ padding: 14, border: "1px solid #16803c", borderRadius: 8, margin: "20px 0" }}>{connected === "google" ? "Google" : "Shopify"} authorization completed.</div> : null}

      <section style={{ display: "grid", gap: 18, marginTop: 28 }}>
        <article style={{ border: "1px solid #ddd", borderRadius: 12, padding: 22 }}>
          <h2 style={{ marginTop: 0 }}>Shopify</h2>
          <p>Status: <strong>{shopify?.status ?? "not connected"}</strong></p>
          {shopify ? (
            <p style={{ color: "#555" }}>Store: {shopify.externalAccountId} · Read-only scopes: {shopify.scopes.join(", ") || "—"}</p>
          ) : (
            <form action="/api/connections/shopify/start" method="get" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input name="shop" required placeholder="your-store.myshopify.com" style={{ minWidth: 280, padding: "10px 12px", border: "1px solid #bbb", borderRadius: 7 }} />
              <button type="submit" style={{ padding: "10px 16px", borderRadius: 7, border: "1px solid #111", cursor: "pointer" }}>Connect Shopify</button>
            </form>
          )}
        </article>

        <article style={{ border: "1px solid #ddd", borderRadius: 12, padding: 22 }}>
          <h2 style={{ marginTop: 0 }}>Google Search Console + GA4</h2>
          <p>Status: <strong>{google?.status ?? "not connected"}</strong></p>
          {!google ? (
            <a href="/api/connections/google/start" style={{ display: "inline-block", padding: "10px 16px", border: "1px solid #111", borderRadius: 7, color: "inherit", textDecoration: "none" }}>Connect Google</a>
          ) : needsConfirmation ? (
            <form action="/api/connections/google/select" method="post" style={{ display: "grid", gap: 12, maxWidth: 620 }}>
              <p style={{ color: "#555", marginBottom: 0 }}>Multiple properties were found. Confirm the Diamond Shelf properties before activation.</p>
              <label>
                Search Console property
                <select name="gscSiteUrl" required style={{ display: "block", width: "100%", marginTop: 6, padding: 10 }}>
                  <option value="">Select…</option>
                  {gscOptions.map((item) => item.siteUrl ? <option key={item.siteUrl} value={item.siteUrl}>{item.siteUrl}</option> : null)}
                </select>
              </label>
              <label>
                GA4 property
                <select name="ga4PropertyId" required style={{ display: "block", width: "100%", marginTop: 6, padding: 10 }}>
                  <option value="">Select…</option>
                  {ga4Options.map((item) => item.propertyId ? <option key={item.propertyId} value={item.propertyId}>{item.displayName ?? "GA4"} · {item.propertyId}</option> : null)}
                </select>
              </label>
              <button type="submit" style={{ width: "fit-content", padding: "10px 16px", borderRadius: 7, border: "1px solid #111", cursor: "pointer" }}>Confirm Google properties</button>
            </form>
          ) : (
            <div style={{ color: "#555" }}>
              <p>Search Console: {String(google.metadata.gscSiteUrl ?? "connected")}</p>
              <p>GA4: {String(google.metadata.ga4PropertyId ?? "connected")}</p>
              <p>Refresh token retained securely: {google.metadata.hasRefreshToken === true ? "yes" : "no"}</p>
            </div>
          )}
        </article>
      </section>

      <p style={{ marginTop: 28, color: "#666" }}>Public-site writes remain disabled. OAuth authorization does not grant SEO ENGINE permission to publish changes.</p>
    </main>
  );
}
