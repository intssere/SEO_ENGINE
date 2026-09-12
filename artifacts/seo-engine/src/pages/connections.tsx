import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "../components/layout";
import { useSearch } from "wouter";

type ConnectionsStatus = {
  readOnly?: boolean;
  shopify: { connected: boolean; domain?: string };
  google: {
    connected: boolean;
    authorized?: boolean;
    needsConfirmation?: boolean;
    needsAttention?: boolean;
    hasRefreshToken?: boolean;
    searchConsoleDiscovery?: DiscoveryStatus | null;
    ga4Discovery?: DiscoveryStatus | null;
    searchConsoleProperties?: Array<{ siteUrl?: string; permissionLevel?: string | null }>;
    ga4Properties?: Array<{ propertyId?: string; displayName?: string | null }>;
  };
};

type Task53Capability = {
  connected: boolean;
  writeProductsScopePresent: boolean;
  credentialAvailable: boolean;
};

type DiscoveryStatus = {
  ok: boolean;
  httpStatus: number | null;
  category: "ok" | "provider_error" | "network_error" | "invalid_response";
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

function discoveryLabel(status?: DiscoveryStatus | null) {
  if (!status) return "Not checked";
  if (status.ok) return "Available";
  if (status.category === "provider_error") return `Provider rejected request${status.httpStatus ? ` (${status.httpStatus})` : ""}`;
  if (status.category === "network_error") return "Provider unavailable";
  return "Invalid provider response";
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
      .then(res => {
        if (!res.ok) throw new Error("Failed to load connection status");
        return res.json();
      })
      .then(data => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    fetch("/api/execution")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const capability = data?.task53?.capability;
        if (capability) setTask53Capability(capability);
      })
      .catch(() => undefined);
  }, []);

  const oauthDisabled = status?.readOnly === false;
  const task53WriteConnected = task53Capability?.connected === true
    && task53Capability.writeProductsScopePresent === true
    && task53Capability.credentialAvailable === true;
  const task53EligibleShop = status?.shopify.domain === "vcuxm7-76.myshopify.com";
  const successMessage = successParam ? successMessages[successParam] : null;
  const errorMessage = errorParam ? errorMessages[errorParam] ?? "The connection could not be completed safely." : null;

  return (
    <>
      <header className="topbar">
        <div>
          <strong>System Setup</strong>
          <span className="muted"> Connections</span>
        </div>
      </header>

      <div className="content">
        <div className="titleRow">
          <div>
            <p className="eyebrow">INTEGRATIONS</p>
            <h1>External Connections</h1>
            <p className="muted">Authorize secure read-only access to necessary platforms.</p>
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-[#e7f8ef] border border-[#bfead2] text-[#14764a] rounded-md text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-[#fff3dc] border border-[#f1d49b] text-[#8d5c0d] rounded-md text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#95bf47] rounded-md flex items-center justify-center text-white font-bold text-xl">S</div>
                <div>
                  <h3 className="font-bold text-[#172033]">Shopify</h3>
                  <p className="text-xs text-[#77839a]">Storefront & Products</p>
                </div>
              </div>
              <Badge tone={status?.shopify.connected ? "verified" : "neutral"}>
                {status?.shopify.connected ? "CONNECTED" : "DISCONNECTED"}
              </Badge>
            </div>

            {loading ? (
              <div className="flex justify-center p-6 text-[#77839a]">
                <Loader2 className="w-5 h-5 animate-spin text-[#3c82f6]" />
              </div>
            ) : status?.shopify.connected ? (
              <div className="bg-[#f8fafc] p-4 rounded-md border border-[#e5e9f0]">
                <p className="text-sm text-[#455168] mb-1">Authenticated store:</p>
                <p className="font-bold text-[#172033]">{status.shopify.domain}</p>
                <div className="mt-4 pt-4 border-t border-[#e5e9f0]">
                  <p className="text-xs text-[#77839a]">Read-only access granted. Engine cannot modify your live theme without explicit deployment.</p>
                </div>
                <div className="mt-4 pt-4 border-t border-[#e5e9f0]">
                  <p className="text-xs font-semibold text-[#455168] mb-2">Task #53 isolated write credential</p>
                  {task53WriteConnected ? (
                    <div className="text-xs text-[#14764a] flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>write_products is connected for the bounded production pilot. This credential does not enable public-site writes by itself.</span>
                    </div>
                  ) : task53EligibleShop && !oauthDisabled ? (
                    <form action="/api/connections/shopify/task53-write/start" method="POST" className="space-y-3">
                      <input type="hidden" name="shop" value="vcuxm7-76.myshopify.com" />
                      <input type="hidden" name="confirmation" value="AUTHORIZE_SHOPIFY_WRITE_SCOPE:write_products" />
                      <p className="text-xs text-[#77839a]">
                        This requests only the isolated <b>write_products</b> credential. It does not authorize Task #53 execute, a Shopify mutation, or a public-site write.
                      </p>
                      <button type="submit" className="w-full bg-[#172744] text-white px-4 py-2 rounded-md font-medium text-sm transition-colors hover:bg-[#0c1730]">
                        Authorize Task #53 write_products
                      </button>
                    </form>
                  ) : (
                    <p className="text-xs text-[#8d5c0d]">
                      Task #53 write-scope authorization is unavailable unless the approved Diamond Shelf store is connected in read-only mode.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-[#455168] mb-4">Enter your `.myshopify.com` domain to begin authorization.</p>
                <form action="/api/connections/shopify/start" method="GET" className="flex gap-2">
                  <input
                    type="text"
                    name="shop"
                    placeholder="e.g. my-store.myshopify.com"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    className="flex-1 border border-[#dce2eb] rounded-md px-3 py-2 text-sm focus:border-[#3c82f6] outline-none disabled:opacity-50"
                    required
                    disabled={oauthDisabled}
                  />
                  <button type="submit" disabled={oauthDisabled} className="bg-[#172744] text-white px-4 py-2 rounded-md font-medium text-sm transition-colors hover:bg-[#0c1730] disabled:opacity-50">
                    Connect
                  </button>
                </form>
                {oauthDisabled && <p className="text-xs text-[#8d5c0d] mt-2">Connecting disabled in current autonomy mode.</p>}
              </div>
            )}
          </section>

          <section className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#ea4335] rounded-md flex items-center justify-center text-white font-bold text-xl">G</div>
                <div>
                  <h3 className="font-bold text-[#172033]">Google Search Console</h3>
                  <p className="text-xs text-[#77839a]">Search Performance Data</p>
                </div>
              </div>
              <Badge tone={status?.google.connected ? "verified" : status?.google.authorized ? "approval" : "neutral"}>
                {status?.google.connected ? "CONNECTED" : status?.google.authorized ? "AUTHORIZED" : "DISCONNECTED"}
              </Badge>
            </div>

            {loading ? (
              <div className="flex justify-center p-6 text-[#77839a]">
                <Loader2 className="w-5 h-5 animate-spin text-[#3c82f6]" />
              </div>
            ) : status?.google.needsConfirmation ? (
              <form action="/api/connections/google/select" method="POST" className="space-y-4">
                <p className="text-sm text-[#455168]">Confirm the Diamond Shelf properties discovered with read-only access.</p>
                <label className="block text-xs font-semibold text-[#455168]">
                  Search Console property
                  <select name="gscSiteUrl" required className="mt-1 w-full border border-[#dce2eb] rounded-md px-3 py-2 text-sm bg-white">
                    <option value="">Select a property</option>
                    {status.google.searchConsoleProperties?.map((item) => item.siteUrl ? (
                      <option key={item.siteUrl} value={item.siteUrl}>{item.siteUrl}</option>
                    ) : null)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-[#455168]">
                  GA4 property
                  <select name="ga4PropertyId" required className="mt-1 w-full border border-[#dce2eb] rounded-md px-3 py-2 text-sm bg-white">
                    <option value="">Select a property</option>
                    {status.google.ga4Properties?.map((item) => item.propertyId ? (
                      <option key={item.propertyId} value={item.propertyId}>
                        {item.displayName ?? "GA4"} · {item.propertyId}
                      </option>
                    ) : null)}
                  </select>
                </label>
                <button type="submit" disabled={oauthDisabled} className="w-full bg-[#172744] text-white px-4 py-2 rounded-md font-medium text-sm disabled:opacity-50">
                  Confirm properties
                </button>
              </form>
            ) : status?.google.connected ? (
              <div className="bg-[#f8fafc] p-4 rounded-md border border-[#e5e9f0]">
                <p className="font-bold text-[#172033]">Google authorization stored securely</p>
                <div className="mt-4 pt-4 border-t border-[#e5e9f0]">
                  <p className="text-xs text-[#77839a]">Read-only access granted. Engine relies on this for impact verification.</p>
                </div>
              </div>
            ) : status?.google.authorized ? (
              <div className="space-y-4">
                <div className="bg-[#fff8e8] p-4 rounded-md border border-[#f1d49b]">
                  <p className="font-bold text-[#8d5c0d]">Authorization needs attention</p>
                  <dl className="mt-3 space-y-2 text-xs text-[#455168]">
                    <div className="flex justify-between gap-4">
                      <dt>Refresh access</dt>
                      <dd className="font-semibold">{status.google.hasRefreshToken ? "Ready" : "Reauthorization required"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Search Console discovery</dt>
                      <dd className="font-semibold text-right">{discoveryLabel(status.google.searchConsoleDiscovery)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>GA4 discovery</dt>
                      <dd className="font-semibold text-right">{discoveryLabel(status.google.ga4Discovery)}</dd>
                    </div>
                  </dl>
                </div>
                {!oauthDisabled && (
                  <a
                    href="/api/connections/google/start"
                    className="inline-block w-full text-center bg-[#172744] text-white px-4 py-2 rounded-md font-medium text-sm transition-colors hover:bg-[#0c1730]"
                  >
                    Reauthorize Google
                  </a>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm text-[#455168] mb-4">Connect your Google account to import Search Console metrics and track verified impact.</p>
                {oauthDisabled ? (
                  <button disabled className="w-full text-center bg-[#172744] text-white px-4 py-2 rounded-md font-medium text-sm opacity-50 cursor-not-allowed">
                    Authorize Google
                  </button>
                ) : (
                  <a
                    href="/api/connections/google/start"
                    className="inline-block w-full text-center bg-[#172744] text-white px-4 py-2 rounded-md font-medium text-sm transition-colors hover:bg-[#0c1730]"
                  >
                    Authorize Google
                  </a>
                )}
                {oauthDisabled && <p className="text-xs text-[#8d5c0d] mt-2 text-center">Connecting disabled in current autonomy mode.</p>}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
