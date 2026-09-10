import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "../components/layout";
import { useSearch } from "wouter";

type ConnectionsStatus = {
  readOnly?: boolean;
  shopify: { connected: boolean; domain?: string };
  google: {
    connected: boolean;
    email?: string;
    needsConfirmation?: boolean;
    searchConsoleProperties?: Array<{ siteUrl?: string; permissionLevel?: string | null }>;
    ga4Properties?: Array<{ propertyId?: string; displayName?: string | null }>;
  };
};

export default function ConnectionsPage() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const successParam = searchParams.get("success");
  const errorParam = searchParams.get("error");

  const [status, setStatus] = useState<ConnectionsStatus | null>(null);
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
  }, []);

  const oauthDisabled = status?.readOnly === false;

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

        {successParam && (
          <div className="mb-6 p-4 bg-[#e7f8ef] border border-[#bfead2] text-[#14764a] rounded-md text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Connection established successfully.
          </div>
        )}

        {errorParam && (
          <div className="mb-6 p-4 bg-[#fff3dc] border border-[#f1d49b] text-[#8d5c0d] rounded-md text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {errorParam}
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
              <Badge tone={status?.google.connected ? "verified" : "neutral"}>
                {status?.google.connected ? "CONNECTED" : "DISCONNECTED"}
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
                <p className="text-sm text-[#455168] mb-1">Authenticated account:</p>
                <p className="font-bold text-[#172033]">{status.google.email}</p>
                <div className="mt-4 pt-4 border-t border-[#e5e9f0]">
                  <p className="text-xs text-[#77839a]">Read-only access granted. Engine relies on this for impact verification.</p>
                </div>
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
