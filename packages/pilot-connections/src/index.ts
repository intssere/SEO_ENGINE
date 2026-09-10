export type ConnectionState = "ready" | "missing" | "invalid";

export interface ReadOnlyConnectionConfig {
  shopDomain?: string;
  shopAccessToken?: string;
  shopApiVersion?: string;
  gscSiteUrl?: string;
  ga4PropertyId?: string;
  googleAccessToken?: string;
  seoProviderConfigured?: boolean;
  publicSiteWritesEnabled?: string;
}

export interface ConnectionCheck {
  id: "shopify" | "gsc" | "ga4" | "seo_provider" | "write_gate";
  state: ConnectionState;
  detail: string;
}

function present(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function validateDiamondShelfReadOnlyConnections(config: ReadOnlyConnectionConfig): ConnectionCheck[] {
  const shopDomain = config.shopDomain?.trim().toLowerCase();
  const gscSiteUrl = config.gscSiteUrl?.trim();
  const ga4PropertyId = config.ga4PropertyId?.trim().replace(/^properties\//, "");
  const writesEnabled = config.publicSiteWritesEnabled === "true";

  const shopify: ConnectionCheck = !present(shopDomain) || !present(config.shopAccessToken)
    ? { id: "shopify", state: "missing", detail: "Shop domain or access token is missing." }
    : !shopDomain?.endsWith(".myshopify.com")
      ? { id: "shopify", state: "invalid", detail: "Shopify must use the permanent *.myshopify.com domain." }
      : { id: "shopify", state: "ready", detail: `Configured for ${shopDomain}; live identity/scope verification is still required.` };

  const gsc: ConnectionCheck = !present(gscSiteUrl) || !present(config.googleAccessToken)
    ? { id: "gsc", state: "missing", detail: "GSC property URL or Google access token is missing." }
    : !/^https:\/\/diamondshelf\.us\/?$/i.test(gscSiteUrl!)
      ? { id: "gsc", state: "invalid", detail: "Pilot GSC property must resolve to https://diamondshelf.us/." }
      : { id: "gsc", state: "ready", detail: "Diamond Shelf GSC configuration is present; live read probe is still required." };

  const ga4: ConnectionCheck = !present(ga4PropertyId) || !present(config.googleAccessToken)
    ? { id: "ga4", state: "missing", detail: "GA4 property ID or Google access token is missing." }
    : !/^\d+$/.test(ga4PropertyId!)
      ? { id: "ga4", state: "invalid", detail: "GA4 property ID must be numeric." }
      : { id: "ga4", state: "ready", detail: `GA4 property ${ga4PropertyId} is configured; live read probe is still required.` };

  const seoProvider: ConnectionCheck = config.seoProviderConfigured
    ? { id: "seo_provider", state: "ready", detail: "SEO data provider transport is configured; live tool mapping validation remains required." }
    : { id: "seo_provider", state: "missing", detail: "SEO data provider transport is not configured." };

  const writeGate: ConnectionCheck = writesEnabled
    ? { id: "write_gate", state: "invalid", detail: "Read-only pilot certification requires PUBLIC_SITE_WRITES_ENABLED=false." }
    : { id: "write_gate", state: "ready", detail: "Public-site writes are disabled." };

  return [shopify, gsc, ga4, seoProvider, writeGate];
}

export function readOnlyConfigurationReady(checks: ConnectionCheck[]): boolean {
  return checks.every((check) => check.state === "ready");
}

export function fromEnvironment(env: NodeJS.ProcessEnv = process.env): ReadOnlyConnectionConfig {
  return {
    shopDomain: env.SHOPIFY_SHOP_DOMAIN,
    shopAccessToken: env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    shopApiVersion: env.SHOPIFY_ADMIN_API_VERSION,
    gscSiteUrl: env.GOOGLE_SEARCH_CONSOLE_SITE_URL,
    ga4PropertyId: env.GA4_PROPERTY_ID,
    googleAccessToken: env.GOOGLE_OAUTH_ACCESS_TOKEN,
    seoProviderConfigured: Boolean(env.OPENSEO_BASE_URL?.trim() && env.OPENSEO_API_KEY?.trim()),
    publicSiteWritesEnabled: env.PUBLIC_SITE_WRITES_ENABLED,
  };
}
