export const LIVE_ACTIVATION_SITE = "diamondshelf.us" as const;

export type LiveProbeId = "shopify" | "gsc" | "ga4" | "seo_provider" | "write_gate";
export type LiveProbeState = "ready" | "failed" | "blocked";

export interface LiveActivationConfig {
  siteDomain: string;
  shopDomain: string;
  shopAccessToken: string;
  shopApiVersion?: string;
  gscSiteUrl: string;
  ga4PropertyId: string;
  googleAccessToken: string;
  publicSiteWritesEnabled?: string;
}

export interface LiveProbeResult {
  id: LiveProbeId;
  state: LiveProbeState;
  detail: string;
}

export interface LiveActivationResult {
  status: "blocked" | "ready";
  probes: LiveProbeResult[];
  blockers: string[];
  readOnlyReady: boolean;
}

export interface LiveActivationOptions {
  fetchImpl?: typeof fetch;
  seoProviderProbe: () => Promise<{ ok: boolean; detail?: string }>;
}

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

function blocked(id: LiveProbeId, detail: string): LiveProbeResult {
  return { id, state: "blocked", detail };
}

function failed(id: LiveProbeId, detail: string): LiveProbeResult {
  return { id, state: "failed", detail };
}

function ready(id: LiveProbeId, detail: string): LiveProbeResult {
  return { id, state: "ready", detail };
}

function requiredConfig(config: LiveActivationConfig): string[] {
  const blockers: string[] = [];
  if (clean(config.siteDomain).toLowerCase() !== LIVE_ACTIVATION_SITE) blockers.push("Task #31 is locked to diamondshelf.us");
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(clean(config.shopDomain))) blockers.push("valid permanent Shopify *.myshopify.com domain is required");
  if (!clean(config.shopAccessToken)) blockers.push("Shopify access token is required in the secure runtime");
  if (!/^https:\/\/diamondshelf\.us\/?$/i.test(clean(config.gscSiteUrl))) blockers.push("GSC property must be https://diamondshelf.us/");
  if (!/^\d+$/.test(clean(config.ga4PropertyId).replace(/^properties\//, ""))) blockers.push("numeric GA4 property ID is required");
  if (!clean(config.googleAccessToken)) blockers.push("Google OAuth access token is required in the secure runtime");
  if (config.publicSiteWritesEnabled === "true") blockers.push("read-only activation requires PUBLIC_SITE_WRITES_ENABLED=false");
  return blockers;
}

async function probeShopify(config: LiveActivationConfig, fetchImpl: typeof fetch): Promise<LiveProbeResult> {
  const version = clean(config.shopApiVersion) || "2026-07";
  const response = await fetchImpl(`https://${clean(config.shopDomain)}/admin/api/${encodeURIComponent(version)}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": config.shopAccessToken,
    },
    body: JSON.stringify({ query: "query SeoEngineReadOnlyIdentity { shop { name myshopifyDomain } }" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return failed("shopify", `Shopify read probe failed with HTTP ${response.status}.`);
  const payload = await response.json() as { data?: { shop?: { myshopifyDomain?: string | null } | null }; errors?: Array<{ message?: string }> };
  if (payload.errors?.length) return failed("shopify", "Shopify GraphQL read probe returned errors.");
  const observed = clean(payload.data?.shop?.myshopifyDomain ?? "").toLowerCase();
  if (!observed || observed !== clean(config.shopDomain).toLowerCase()) return failed("shopify", "Shopify identity did not match the configured permanent domain.");
  return ready("shopify", `Verified Shopify identity ${observed}.`);
}

async function probeGsc(config: LiveActivationConfig, fetchImpl: typeof fetch): Promise<LiveProbeResult> {
  const response = await fetchImpl("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${config.googleAccessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return failed("gsc", `GSC read probe failed with HTTP ${response.status}.`);
  const payload = await response.json() as { siteEntry?: Array<{ siteUrl?: string; permissionLevel?: string }> };
  const target = clean(config.gscSiteUrl).replace(/\/$/, "").toLowerCase();
  const match = (payload.siteEntry ?? []).find((entry) => clean(entry.siteUrl).replace(/\/$/, "").toLowerCase() === target);
  if (!match) return failed("gsc", "Configured Diamond Shelf Search Console property was not returned by the account.");
  return ready("gsc", `Verified Search Console property access (${clean(match.permissionLevel) || "permission available"}).`);
}

async function probeGa4(config: LiveActivationConfig, fetchImpl: typeof fetch): Promise<LiveProbeResult> {
  const propertyId = clean(config.ga4PropertyId).replace(/^properties\//, "");
  const response = await fetchImpl(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}/metadata`, {
    headers: { Authorization: `Bearer ${config.googleAccessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return failed("ga4", `GA4 metadata probe failed with HTTP ${response.status}.`);
  const payload = await response.json() as { name?: string };
  if (!clean(payload.name).includes(`properties/${propertyId}`)) return failed("ga4", "GA4 metadata response did not match the configured property.");
  return ready("ga4", `Verified GA4 property ${propertyId}.`);
}

export async function runSecureReadOnlyActivation(
  config: LiveActivationConfig,
  options: LiveActivationOptions,
): Promise<LiveActivationResult> {
  const blockers = requiredConfig(config);
  if (blockers.length) {
    return {
      status: "blocked",
      blockers,
      readOnlyReady: false,
      probes: [
        blocked("shopify", "Live probes were not attempted because configuration safety checks failed."),
        blocked("gsc", "Live probes were not attempted because configuration safety checks failed."),
        blocked("ga4", "Live probes were not attempted because configuration safety checks failed."),
        blocked("seo_provider", "Live probes were not attempted because configuration safety checks failed."),
        blocked("write_gate", blockers.some((item) => item.includes("PUBLIC_SITE_WRITES_ENABLED")) ? "Public-site writes are enabled." : "Read-only gate configuration must pass first."),
      ],
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const probes: LiveProbeResult[] = [];
  probes.push(ready("write_gate", "Public-site writes are disabled for the activation run."));

  try { probes.push(await probeShopify(config, fetchImpl)); }
  catch { probes.push(failed("shopify", "Shopify read probe raised an exception.")); }

  try { probes.push(await probeGsc(config, fetchImpl)); }
  catch { probes.push(failed("gsc", "GSC read probe raised an exception.")); }

  try { probes.push(await probeGa4(config, fetchImpl)); }
  catch { probes.push(failed("ga4", "GA4 read probe raised an exception.")); }

  try {
    const provider = await options.seoProviderProbe();
    probes.push(provider.ok ? ready("seo_provider", clean(provider.detail) || "SEO provider read probe succeeded.") : failed("seo_provider", clean(provider.detail) || "SEO provider read probe failed."));
  } catch {
    probes.push(failed("seo_provider", "SEO provider read probe raised an exception."));
  }

  const failedProbes = probes.filter((probe) => probe.state !== "ready");
  return {
    status: failedProbes.length ? "blocked" : "ready",
    blockers: failedProbes.map((probe) => `${probe.id}: ${probe.detail}`),
    readOnlyReady: failedProbes.length === 0,
    probes,
  };
}
