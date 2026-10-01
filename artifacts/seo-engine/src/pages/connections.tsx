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
  shopify: "Shopify connected successfully.",
  task53_shopify_write: "Task #53 isolated Shopify write_products credential connected successfully.",
  google: "Google Search Console and GA4 connected successfully.",
  google_pending: "Google authorization succeeded. Confirm the matching Search Console and GA4 properties below.",
  google_attention: "Google authorization was stored securely, but additional setup is required.",
};

const errorMessages: Record<string, string> = {
  shopify_start: "Unable to start Shopify authorization.",
  shopify_callback: "Shopify authorization could not be completed.",
  google_start: "Unable to start Google authorization.",
  google_state: "Google authorization expired or could not be verified. Please start again.",
  google_token_provider: "Google rejected the token exchange. Check the authorized redirect URI and try again.",
  google_token_network: "Google's token service could not be reached. Please try again.",
  google_persistence: "Google authorization succeeded, but the encrypted connection could not be saved.",
  google_write_gate: "Google authorization is unavailable while public-site writes are enabled.",
  google_configuration: "Google authorization configuration is incomplete.",
  google_selection: "The selected Google properties could not be saved. Please authorize again.",
};

const domainMark: Record<ConnectionCardModel["domain"], string> = {
  website: "W",
  search_console: "SC",
  analytics: "A",
  cms: "CMS",
  backlink_serp: "SERP",
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

const actionClass = () => "connectionAction";

function ConnectionCard({ card, loading }: { card: ConnectionCardModel; loading: boolean }) {
  return (
    <article className="connectionCard">
      <div className="connectionCardHead">
        <span
          aria-hidden="true"
          className="connectionMark"
        >
          {domainMark[card.domain]}
        </span>
        <StatusBadge tone={card.tone}>{card.statusLabel}</StatusBadge>
      </div>

      <h2 className="connectionTitle">{card.title}</h2>
      <p className="connectionSummary">{card.description}</p>

      <div className="connectionScopeBox">
        <span className="connectionLabel">Site scope</span>
        <strong className="connectionValue">{card.scopeLabel}</strong>
      </div>

      <p className="connectionDetail">
        {loading ? "Checking connection state…" : card.detail}
      </p>

      <div>
        {card.recoveryHref && card.recoveryLabel ? (
          <a className={actionClass()} href={card.recoveryHref}>{card.recoveryLabel}</a>
        ) : card.connectHref && card.connectLabel ? (
          card.connectHref.startsWith("/api/") ? (
            <a className={actionClass()} href={card.connectHref}>{card.connectLabel}</a>
          ) : (
            <Link className={actionClass()} href={card.connectHref}>{card.connectLabel}</Link>
          )
        ) : (
          <span className="connectionUnavailable">
            {card.disabled ? "No live connection available in this milestone" : "No action required"}
          </span>
        )}
      </div>
    </article>
  );
}

export default function ConnectionsPage() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
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
      .then((data) => setStatus(data))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));

    fetch("/api/execution")
      .then((res) => (res.ok ? res.json() : null))
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
  const errorMessage = errorParam
    ? errorMessages[errorParam] ?? "The connection could not be completed safely."
    : null;

  return (
    <>
      <header className="topbar">
        <div><strong>Settings</strong><span className="muted"> Connections</span></div>
      </header>

      <div className="content connectionsPage">
        <section className="connectionsHero">
          <div className="connectionsHeroCopy">
            <p className="eyebrow">CONNECTIONS</p>
            <h1 className="connectionsHeading">
              Connect the data sources that explain your site
            </h1>
            <p className="muted connectionsLead">
              Each source is scoped to one website. Connecting a provider makes data available;
              it does not authorize SEO ENGINE to publish or modify your site.
            </p>
          </div>
          <Link className={actionClass() + " connectionHeroAction"} href="/settings/add-website">
            Add or review website
          </Link>
        </section>

        {successMessage && (
          <div role="status" aria-live="polite" className="connectionAlert connectionAlertSuccess">
            <span aria-hidden="true">✓</span><span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div role="alert" className="connectionAlert connectionAlertDanger">
            <span aria-hidden="true">!</span><span>{errorMessage}</span>
          </div>
        )}

        <section aria-label="Active website scope" className="connectionScopeBanner">
          <span aria-hidden="true" className="connectionScopeMark">SITE</span>
          <div>
            <span className="connectionScopeEyebrow">Active website scope</span>
            <strong className="connectionScopeValue">{model?.siteScopeLabel ?? "Checking website scope…"}</strong>
            <p className="connectionScopeHelp">
              Search, analytics, CMS, and future authority data must resolve to this same site scope before they are treated as connected.
            </p>
          </div>
          <StatusBadge className="connectionScopeStatus" tone={model?.activeSiteScope ? "success" : "warning"}>
            {model?.activeSiteScope ? "Scope confirmed" : "Scope required"}
          </StatusBadge>
        </section>

        <section aria-labelledby="connection-sources-title">
          <div className="sectionHead connectionSectionHead">
            <div>
              <h2 id="connection-sources-title">Data sources</h2>
              <p className="muted">Connection health and recovery are visible without exposing credentials.</p>
            </div>
          </div>

          {model ? (
            <div className="connectionsGrid">
              {model.cards.map((card) => <ConnectionCard key={card.domain} card={card} loading={loading} />)}
            </div>
          ) : (
            <div className="card connectionsLoading" role="status" aria-live="polite">
              {loading ? "Loading connection status…" : "Connection status is temporarily unavailable."}
            </div>
          )}
        </section>

        {status?.google.needsConfirmation && (
          <section className="card connectionPanel" aria-labelledby="google-setup-title">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">ACTION REQUIRED</p>
                <h2 id="google-setup-title">Finish Google property setup</h2>
                <p className="muted">Choose the Search Console and GA4 properties that match the active website.</p>
              </div>
              <StatusBadge tone="warning">Needs confirmation</StatusBadge>
            </div>
            <form action="/api/connections/google/select" method="POST" className="connectionPropertyGrid">
              <label className="connectionField">
                Search Console property
                <select name="gscSiteUrl" required className="connectionInput">
                  <option value="">Select a property</option>
                  {status.google.searchConsoleProperties?.map((item) => item.siteUrl ? <option key={item.siteUrl} value={item.siteUrl}>{item.siteUrl}</option> : null)}
                </select>
              </label>
              <label className="connectionField">
                GA4 property
                <select name="ga4PropertyId" required className="connectionInput">
                  <option value="">Select a property</option>
                  {status.google.ga4Properties?.map((item) => item.propertyId ? (
                    <option key={item.propertyId} value={item.propertyId}>{item.displayName ?? "GA4"} · {item.propertyId}</option>
                  ) : null)}
                </select>
              </label>
              <button type="submit" disabled={oauthDisabled} className={actionClass() + " connectionConfirmAction"}>
                Confirm matching properties
              </button>
            </form>
          </section>
        )}

        {status?.google.authorized && !status.google.connected && !status.google.needsConfirmation && (
          <section className="card connectionPanel" aria-labelledby="google-health-title">
            <div className="sectionHead">
              <div><p className="eyebrow">CONNECTION HEALTH</p><h2 id="google-health-title">Google authorization needs attention</h2></div>
              <StatusBadge tone="warning">Recoverable</StatusBadge>
            </div>
            <dl className="connectionHealthGrid">
              {[
                ["Refresh access", status.google.hasRefreshToken ? "Ready" : "Reauthorization required"],
                ["Search Console discovery", discoveryLabel(status.google.searchConsoleDiscovery)],
                ["GA4 discovery", discoveryLabel(status.google.ga4Discovery)],
              ].map(([label, value]) => (
                <div key={label} className="connectionHealthItem">
                  <dt className="connectionLabel">{label}</dt>
                  <dd className="connectionHealthValue">{value}</dd>
                </div>
              ))}
            </dl>
            {!oauthDisabled && <a className={actionClass() + " connectionFitAction"} href="/api/connections/google/start">Reconnect Google</a>}
          </section>
        )}

        <details className="card connectionAdvanced">
          <summary className="connectionAdvancedSummary">Advanced provider setup</summary>
          <div className="connectionAdvancedBody">
            <section>
              <h3 className="connectionSubheading">Direct Shopify authorization</h3>
              <p className="muted connectionFinePrint">Existing Shopify authorization remains available for compatibility. New customers should normally use the website setup flow.</p>
              {!status?.shopify.connected ? (
                <form action="/api/connections/shopify/start" method="GET">
                  <label htmlFor="shopify-domain" className="mb-1 block connectionField">Shopify store domain</label>
                  <div className="connectionInline">
                    <input
                      id="shopify-domain"
                      type="text"
                      name="shop"
                      placeholder="my-store.myshopify.com"
                      value={shopDomain}
                      onChange={(event) => setShopDomain(event.target.value)}
                      required
                      disabled={oauthDisabled}
                      className="connectionInput connectionGrow"
                    />
                    <button type="submit" disabled={oauthDisabled} className={actionClass() + " connectionDisabledAction"}>Connect Shopify</button>
                  </div>
                </form>
              ) : (
                <p className="connectionHealthItem text-[10px] text-[#52627a]">Connected store: <strong>{status.shopify.domain}</strong></p>
              )}
            </section>

            {status?.shopify.connected && (
              <section>
                <h3 className="connectionSubheading">Task #53 isolated write credential</h3>
                {task53WriteConnected ? (
                  <p className="connectionFact connectionFactSuccess">
                    <strong>write_products is connected.</strong> This credential does not enable a public-site write by itself.
                  </p>
                ) : task53EligibleShop && !oauthDisabled ? (
                  <form action="/api/connections/shopify/task53-write/start" method="POST">
                    <input type="hidden" name="shop" value="vcuxm7-76.myshopify.com" />
                    <input type="hidden" name="confirmation" value="AUTHORIZE_SHOPIFY_WRITE_SCOPE:write_products" />
                    <p className="muted connectionFinePrint">Requests only the isolated <strong>write_products</strong> credential. Execution authorization remains separate.</p>
                    <button type="submit" className={actionClass()}>Authorize Task #53 write_products</button>
                  </form>
                ) : (
                  <p className="muted connectionFinePrint">The isolated write-scope flow is unavailable unless the approved Diamond Shelf store is connected in read-only mode.</p>
                )}
              </section>
            )}
          </div>
        </details>
      </div>
    </>
  );
}
