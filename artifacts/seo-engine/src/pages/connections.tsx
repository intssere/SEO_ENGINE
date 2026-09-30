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

function actionClass() {
  return "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#c9dcfa] bg-[#f3f7ff] px-3 py-2 text-xs font-bold text-[#245ea8] no-underline hover:bg-[#e8f1ff]";
}

function ConnectionCard({ card, loading }: { card: ConnectionCardModel; loading: boolean }) {
  return (
    <article className="flex min-w-0 flex-col rounded-xl border border-[#e2e7ef] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden="true"
          className="grid min-h-10 min-w-10 place-items-center rounded-lg bg-[#f1f5fa] px-2 text-[10px] font-extrabold text-[#455168]"
        >
          {domainMark[card.domain]}
        </span>
        <StatusBadge tone={card.tone}>{card.statusLabel}</StatusBadge>
      </div>

      <h2 className="mt-3 text-base font-bold text-[#172033]">{card.title}</h2>
      <p className="mt-1 min-h-10 text-[11px] leading-5 text-[#647087]">{card.description}</p>

      <div className="mt-3 rounded-lg border border-[#edf0f5] bg-[#fbfcfe] p-2.5">
        <span className="block text-[9px] font-extrabold uppercase tracking-wide text-[#5f6d83]">Site scope</span>
        <strong className="mt-1 block break-words text-[10px] text-[#34445d]">{card.scopeLabel}</strong>
      </div>

      <p className="my-3 flex-1 text-[10px] leading-4 text-[#647087]">
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
          <span className="inline-flex min-h-9 items-center text-[10px] leading-4 text-[#5f6d83]">
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

      <div className="content flex min-w-0 flex-col gap-5">
        <section className="flex items-start justify-between gap-6 max-[820px]:flex-col">
          <div className="max-w-[760px]">
            <p className="eyebrow">CONNECTIONS</p>
            <h1 className="m-0 text-3xl font-bold leading-tight tracking-tight text-[#172033] max-[640px]:text-2xl">
              Connect the data sources that explain your site
            </h1>
            <p className="muted mt-2 text-[13px] leading-6">
              Each source is scoped to one website. Connecting a provider makes data available;
              it does not authorize SEO ENGINE to publish or modify your site.
            </p>
          </div>
          <Link className={actionClass() + " shrink-0 max-[820px]:w-full"} href="/settings/add-website">
            Add or review website
          </Link>
        </section>

        {successMessage && (
          <div role="status" aria-live="polite" className="flex items-start gap-2 rounded-lg border border-[var(--status-success-border)] bg-[var(--status-success-bg)] p-3 text-xs font-semibold text-[var(--status-success-fg)]">
            <span aria-hidden="true">✓</span><span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-3 text-xs font-semibold text-[var(--status-danger-fg)]">
            <span aria-hidden="true">!</span><span>{errorMessage}</span>
          </div>
        )}

        <section aria-label="Active website scope" className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border border-[#dce5f3] bg-[#f8fbff] p-4 max-[820px]:grid-cols-[38px_minmax(0,1fr)]">
          <span aria-hidden="true" className="grid h-[38px] w-[38px] place-items-center rounded-lg bg-[#e8f1ff] text-xs font-extrabold text-[#245ea8]">SITE</span>
          <div>
            <span className="block text-[10px] font-extrabold uppercase tracking-wide text-[#647087]">Active website scope</span>
            <strong className="mt-1 block break-words text-sm text-[#172033]">{model?.siteScopeLabel ?? "Checking website scope…"}</strong>
            <p className="mt-1 text-[10px] leading-4 text-[#647087]">
              Search, analytics, CMS, and future authority data must resolve to this same site scope before they are treated as connected.
            </p>
          </div>
          <StatusBadge className="max-[820px]:col-start-2 max-[820px]:justify-self-start" tone={model?.activeSiteScope ? "success" : "warning"}>
            {model?.activeSiteScope ? "Scope confirmed" : "Scope required"}
          </StatusBadge>
        </section>

        <section aria-labelledby="connection-sources-title">
          <div className="sectionHead mb-3">
            <div>
              <h2 id="connection-sources-title">Data sources</h2>
              <p className="muted">Connection health and recovery are visible without exposing credentials.</p>
            </div>
          </div>

          {model ? (
            <div className="grid grid-cols-3 gap-3 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
              {model.cards.map((card) => <ConnectionCard key={card.domain} card={card} loading={loading} />)}
            </div>
          ) : (
            <div className="card flex min-h-[120px] items-center justify-center text-xs text-[#647087]" role="status" aria-live="polite">
              {loading ? "Loading connection status…" : "Connection status is temporarily unavailable."}
            </div>
          )}
        </section>

        {status?.google.needsConfirmation && (
          <section className="card flex flex-col gap-4" aria-labelledby="google-setup-title">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">ACTION REQUIRED</p>
                <h2 id="google-setup-title">Finish Google property setup</h2>
                <p className="muted">Choose the Search Console and GA4 properties that match the active website.</p>
              </div>
              <StatusBadge tone="warning">Needs confirmation</StatusBadge>
            </div>
            <form action="/api/connections/google/select" method="POST" className="grid grid-cols-[1fr_1fr_auto] items-end gap-3 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
              <label className="text-[10px] font-bold text-[#52627a]">
                Search Console property
                <select name="gscSiteUrl" required className="mt-1 min-h-11 w-full rounded-lg border border-[#dce2eb] bg-white px-2.5 text-xs">
                  <option value="">Select a property</option>
                  {status.google.searchConsoleProperties?.map((item) => item.siteUrl ? <option key={item.siteUrl} value={item.siteUrl}>{item.siteUrl}</option> : null)}
                </select>
              </label>
              <label className="text-[10px] font-bold text-[#52627a]">
                GA4 property
                <select name="ga4PropertyId" required className="mt-1 min-h-11 w-full rounded-lg border border-[#dce2eb] bg-white px-2.5 text-xs">
                  <option value="">Select a property</option>
                  {status.google.ga4Properties?.map((item) => item.propertyId ? (
                    <option key={item.propertyId} value={item.propertyId}>{item.displayName ?? "GA4"} · {item.propertyId}</option>
                  ) : null)}
                </select>
              </label>
              <button type="submit" disabled={oauthDisabled} className={actionClass() + " disabled:cursor-not-allowed disabled:opacity-50 max-[1100px]:col-span-2 max-[1100px]:w-fit max-[640px]:col-span-1 max-[640px]:w-full"}>
                Confirm matching properties
              </button>
            </form>
          </section>
        )}

        {status?.google.authorized && !status.google.connected && !status.google.needsConfirmation && (
          <section className="card flex flex-col gap-4" aria-labelledby="google-health-title">
            <div className="sectionHead">
              <div><p className="eyebrow">CONNECTION HEALTH</p><h2 id="google-health-title">Google authorization needs attention</h2></div>
              <StatusBadge tone="warning">Recoverable</StatusBadge>
            </div>
            <dl className="grid grid-cols-3 gap-2 max-[640px]:grid-cols-1">
              {[
                ["Refresh access", status.google.hasRefreshToken ? "Ready" : "Reauthorization required"],
                ["Search Console discovery", discoveryLabel(status.google.searchConsoleDiscovery)],
                ["GA4 discovery", discoveryLabel(status.google.ga4Discovery)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[#edf0f5] bg-[#fbfcfe] p-2.5">
                  <dt className="text-[9px] font-extrabold uppercase tracking-wide text-[#5f6d83]">{label}</dt>
                  <dd className="mt-1 text-[11px] font-bold text-[#34445d]">{value}</dd>
                </div>
              ))}
            </dl>
            {!oauthDisabled && <a className={actionClass() + " w-fit"} href="/api/connections/google/start">Reconnect Google</a>}
          </section>
        )}

        <details className="card overflow-hidden p-0">
          <summary className="flex min-h-12 cursor-pointer items-center px-4 text-xs font-bold text-[#455168]">Advanced provider setup</summary>
          <div className="grid grid-cols-2 gap-4 border-t border-[#edf0f5] p-4 max-[820px]:grid-cols-1">
            <section>
              <h3 className="m-0 text-[13px] font-bold text-[#263249]">Direct Shopify authorization</h3>
              <p className="muted my-2 text-[10px] leading-4">Existing Shopify authorization remains available for compatibility. New customers should normally use the website setup flow.</p>
              {!status?.shopify.connected ? (
                <form action="/api/connections/shopify/start" method="GET">
                  <label htmlFor="shopify-domain" className="mb-1 block text-[10px] font-bold text-[#52627a]">Shopify store domain</label>
                  <div className="flex gap-2 max-[640px]:flex-col">
                    <input
                      id="shopify-domain"
                      type="text"
                      name="shop"
                      placeholder="my-store.myshopify.com"
                      value={shopDomain}
                      onChange={(event) => setShopDomain(event.target.value)}
                      required
                      disabled={oauthDisabled}
                      className="min-h-11 min-w-0 flex-1 rounded-lg border border-[#dce2eb] bg-white px-2.5 text-xs"
                    />
                    <button type="submit" disabled={oauthDisabled} className={actionClass() + " disabled:cursor-not-allowed disabled:opacity-50"}>Connect Shopify</button>
                  </div>
                </form>
              ) : (
                <p className="rounded-lg border border-[#edf0f5] bg-[#fbfcfe] p-2.5 text-[10px] text-[#52627a]">Connected store: <strong>{status.shopify.domain}</strong></p>
              )}
            </section>

            {status?.shopify.connected && (
              <section>
                <h3 className="m-0 text-[13px] font-bold text-[#263249]">Task #53 isolated write credential</h3>
                {task53WriteConnected ? (
                  <p className="rounded-lg border border-[var(--status-success-border)] bg-[var(--status-success-bg)] p-2.5 text-[10px] leading-4 text-[var(--status-success-fg)]">
                    <strong>write_products is connected.</strong> This credential does not enable a public-site write by itself.
                  </p>
                ) : task53EligibleShop && !oauthDisabled ? (
                  <form action="/api/connections/shopify/task53-write/start" method="POST">
                    <input type="hidden" name="shop" value="vcuxm7-76.myshopify.com" />
                    <input type="hidden" name="confirmation" value="AUTHORIZE_SHOPIFY_WRITE_SCOPE:write_products" />
                    <p className="muted my-2 text-[10px] leading-4">Requests only the isolated <strong>write_products</strong> credential. Execution authorization remains separate.</p>
                    <button type="submit" className={actionClass()}>Authorize Task #53 write_products</button>
                  </form>
                ) : (
                  <p className="muted text-[10px] leading-4">The isolated write-scope flow is unavailable unless the approved Diamond Shelf store is connected in read-only mode.</p>
                )}
              </section>
            )}
          </div>
        </details>
      </div>
    </>
  );
}
