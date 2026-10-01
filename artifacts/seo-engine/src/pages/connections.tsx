import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { StatusBadge } from "../components/status-badge";
import {
  buildConnectionsUiModel,
  type ConnectionCardModel,
  type ConnectionsStatus,
  type DiscoveryStatus,
} from "../lib/connections-ui-model";

type Task53Capability = {
  connected: boolean;
  writeProductsScopePresent: boolean;
  credentialAvailable: boolean;
};

const successMessages: Record<string, string> = {
  shopify: "Shopify connected.",
  task53_shopify_write: "Task #53 credential connected.",
  google: "Google connected.",
  google_pending: "Confirm properties below.",
  google_attention: "Google needs setup.",
};

function discoveryLabel(status?: DiscoveryStatus | null) {
  if (!status) return "Not checked";
  if (status.ok) return "Available";
  if (status.category === "provider_error") {
    return `Provider rejected request${status.httpStatus ? ` (${status.httpStatus})` : ""}`;
  }
  if (status.category === "network_error") return "Provider unavailable";
  return "Invalid provider response";
}

function ConnectionCard({ card, loading }: { card: ConnectionCardModel; loading: boolean }) {
  return (
    <article className="card">
      <div className="sectionHead">
        <div>
          <p className="eyebrow">{card.domain.replaceAll("_", " ")}</p>
          <h2>{card.title}</h2>
        </div>
        <StatusBadge tone={card.tone}>{card.statusLabel}</StatusBadge>
      </div>
      <p className="muted">{card.description}</p>
      <p><strong>Site scope:</strong> {card.scopeLabel}</p>
      <p className="muted">{loading ? "Checking…" : card.detail}</p>
      {card.recoveryHref && card.recoveryLabel ? (
        <a className="linkButton ask" href={card.recoveryHref}>{card.recoveryLabel}</a>
      ) : card.connectHref && card.connectLabel ? (
        card.connectHref.startsWith("/api/") ? (
          <a className="linkButton ask" href={card.connectHref}>{card.connectLabel}</a>
        ) : (
          <Link className="linkButton ask" href={card.connectHref}>{card.connectLabel}</Link>
        )
      ) : (
        <span className="muted">{card.disabled ? "Not available yet" : "No action"}</span>
      )}
    </article>
  );
}

export default function ConnectionsPage() {
  const searchParams = new URLSearchParams(useSearch());
  const successParam = searchParams.get("success");
  const errorParam = searchParams.get("error");
  const [status, setStatus] = useState<ConnectionsStatus | null>(null);
  const [task53Capability, setTask53Capability] = useState<Task53Capability | null>(null);
  const [loading, setLoading] = useState(true);
  const [shopDomain, setShopDomain] = useState("");

  useEffect(() => {
    fetch("/api/connections/status")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load connection status");
        return res.json();
      })
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));

    fetch("/api/execution")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const capability = data?.task53?.capability;
        if (capability) setTask53Capability(capability);
      })
      .catch(() => undefined);
  }, []);

  const model = useMemo(() => status ? buildConnectionsUiModel(status) : null, [status]);
  const task53WriteConnected = task53Capability?.connected === true
    && task53Capability.writeProductsScopePresent === true
    && task53Capability.credentialAvailable === true;
  const task53EligibleShop = status?.shopify.domain === "vcuxm7-76.myshopify.com";
  const oauthDisabled = status?.readOnly === false;
  const successMessage = successParam ? successMessages[successParam] : null;
  const errorMessage = errorParam ? "Connection failed." : null;

  return (
    <>
      <header className="topbar">
        <div><strong>Settings</strong><span className="muted"> Connections</span></div>
      </header>

      <div className="content">
        <section className="titleRow">
          <div>
            <p className="eyebrow">CONNECTIONS</p>
            <h1>Connect site data</h1>
            <p className="muted">
              Connections are site-scoped.
            </p>
          </div>
          <Link className="linkButton ask" href="/settings/add-website">Add or review website</Link>
        </section>

        {successMessage && <div className="card" role="status" aria-live="polite">{successMessage}</div>}
        {errorMessage && <div className="card" role="alert">{errorMessage}</div>}

        <section className="card" aria-label="Active website scope">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">ACTIVE WEBSITE SCOPE</p>
              <h2>{model?.siteScopeLabel ?? "Checking website scope…"}</h2>
              <p className="muted">
                Data must match this website.
              </p>
            </div>
            <StatusBadge tone={model?.activeSiteScope ? "success" : "warning"}>
              {model?.activeSiteScope ? "Scope confirmed" : "Scope required"}
            </StatusBadge>
          </div>
        </section>

        <section aria-labelledby="connection-sources-title">
          <div className="sectionHead">
            <div>
              <h2 id="connection-sources-title">Data sources</h2>
              <p className="muted">Status and recovery.</p>
            </div>
          </div>
          {model ? model.cards.map((card) => (
            <ConnectionCard key={card.domain} card={card} loading={loading} />
          )) : (
            <div className="card" role="status" aria-live="polite">
              {loading ? "Loading…" : "Status unavailable."}
            </div>
          )}
        </section>

        {status?.google.needsConfirmation && (
          <section className="card" aria-labelledby="google-setup-title">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">ACTION REQUIRED</p>
                <h2 id="google-setup-title">Confirm properties</h2>
                <p className="muted">Choose properties for this website.</p>
              </div>
              <StatusBadge tone="warning">Needs confirmation</StatusBadge>
            </div>
            <form action="/api/connections/google/select" method="POST">
              <p>
                <label>
                  Search property<br />
                  <select name="gscSiteUrl" required>
                    <option value="">Select a property</option>
                    {status.google.searchConsoleProperties?.map((item) => item.siteUrl
                      ? <option key={item.siteUrl} value={item.siteUrl}>{item.siteUrl}</option>
                      : null)}
                  </select>
                </label>
              </p>
              <p>
                <label>
                  Analytics property<br />
                  <select name="ga4PropertyId" required>
                    <option value="">Select a property</option>
                    {status.google.ga4Properties?.map((item) => item.propertyId ? (
                      <option key={item.propertyId} value={item.propertyId}>
                        {item.displayName ?? "GA4"} · {item.propertyId}
                      </option>
                    ) : null)}
                  </select>
                </label>
              </p>
              <button type="submit" disabled={oauthDisabled} className="linkButton ask">
                Confirm properties
              </button>
            </form>
          </section>
        )}

        {status?.google.authorized && !status.google.connected && !status.google.needsConfirmation && (
          <section className="card" aria-labelledby="google-health-title">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">CONNECTION HEALTH</p>
                <h2 id="google-health-title">Google attention</h2>
              </div>
              <StatusBadge tone="warning">Recoverable</StatusBadge>
            </div>
            <dl>
              <dt>Refresh access</dt>
              <dd>{status.google.hasRefreshToken ? "Ready" : "Reauthorization required"}</dd>
              <dt>Search Console discovery</dt>
              <dd>{discoveryLabel(status.google.searchConsoleDiscovery)}</dd>
              <dt>GA4 discovery</dt>
              <dd>{discoveryLabel(status.google.ga4Discovery)}</dd>
            </dl>
            {!oauthDisabled && <a className="linkButton ask" href="/api/connections/google/start">Reconnect</a>}
          </section>
        )}

        <details className="card">
          <summary>Advanced provider setup</summary>
          <section>
            <h3>Direct Shopify authorization</h3>
            <p className="muted">
              Shopify setup.
            </p>
            {!status?.shopify.connected ? (
              <form action="/api/connections/shopify/start" method="GET">
                <label htmlFor="shopify-domain">Shopify store domain</label><br />
                <input
                  id="shopify-domain"
                  type="text"
                  name="shop"
                  placeholder="my-store.myshopify.com"
                  value={shopDomain}
                  onChange={(event) => setShopDomain(event.target.value)}
                  required
                  disabled={oauthDisabled}
                />
                <button type="submit" disabled={oauthDisabled} className="linkButton ask">Connect Shopify</button>
              </form>
            ) : (
              <p>Connected store: <strong>{status.shopify.domain}</strong></p>
            )}
          </section>

          {status?.shopify.connected && (
            <section>
              <h3>Task #53 credential</h3>
              {task53WriteConnected ? (
                <p>
                  <strong>write_products is connected.</strong> Credential cannot write publicly.
                </p>
              ) : task53EligibleShop && !oauthDisabled ? (
                <form action="/api/connections/shopify/task53-write/start" method="POST">
                  <input type="hidden" name="shop" value="vcuxm7-76.myshopify.com" />
                  <input type="hidden" name="confirmation" value="AUTHORIZE_SHOPIFY_WRITE_SCOPE:write_products" />
                  <p className="muted">
                    Requests isolated <strong>write_products</strong> scope. Execution authorization remains separate.
                  </p>
                  <button type="submit" className="linkButton ask">Authorize Task #53 write_products</button>
                </form>
              ) : (
                <p className="muted">
                  Requires approved store.
                </p>
              )}
            </section>
          )}
        </details>
      </div>
    </>
  );
}
