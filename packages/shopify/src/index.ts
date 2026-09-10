export const SHOPIFY_ADMIN_API_VERSION = "2026-07" as const;

export const REQUIRED_READ_SCOPES = ["read_products", "read_content"] as const;

export type RequiredReadScope = (typeof REQUIRED_READ_SCOPES)[number];

export interface ShopifyConnectionConfig {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
}

export interface ShopifyShopIdentity {
  id: string;
  name: string;
  myshopifyDomain: string;
  primaryDomain: {
    host: string;
    url: string;
  } | null;
  currencyCode: string;
  ianaTimezone: string;
}

export interface ShopifyConnectionVerification {
  ok: true;
  mode: "read-only";
  apiVersion: string;
  shop: ShopifyShopIdentity;
  grantedScopes: string[];
  requiredReadScopes: string[];
}

interface GraphqlError {
  message: string;
}

interface GraphqlEnvelope<T> {
  data?: T;
  errors?: GraphqlError[];
}

interface ConnectionProbeData {
  shop: ShopifyShopIdentity;
  currentAppInstallation: {
    accessScopes: Array<{ handle: string }>;
  };
}

const CONNECTION_PROBE = `#graphql
  query SeoEngineReadOnlyConnectionProbe {
    shop {
      id
      name
      myshopifyDomain
      primaryDomain {
        host
        url
      }
      currencyCode
      ianaTimezone
    }
    currentAppInstallation {
      accessScopes {
        handle
      }
    }
  }
`;

export function normalizeShopDomain(input: string): string {
  const value = input.trim().toLowerCase();
  if (!value) {
    throw new Error("Shopify shop domain is required.");
  }

  const withoutProtocol = value.replace(/^https?:\/\//, "");
  const host = withoutProtocol.split("/")[0]?.split(":")[0] ?? "";

  if (!host || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(host)) {
    throw new Error("Shopify shop domain must be a valid *.myshopify.com hostname.");
  }

  return host;
}

export function assertReadOnlyScopes(grantedScopes: readonly string[]): void {
  const writeScopes = grantedScopes.filter((scope) => scope.startsWith("write_"));
  if (writeScopes.length > 0) {
    throw new Error(
      `Task #3 requires a read-only Shopify installation. Remove write scopes: ${writeScopes.join(", ")}`,
    );
  }

  const missing = REQUIRED_READ_SCOPES.filter((scope) => !grantedScopes.includes(scope));
  if (missing.length > 0) {
    throw new Error(`Missing required Shopify read scopes: ${missing.join(", ")}`);
  }
}

export async function shopifyGraphql<T>(
  config: ShopifyConnectionConfig,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const shopDomain = normalizeShopDomain(config.shopDomain);
  const apiVersion = config.apiVersion ?? SHOPIFY_ADMIN_API_VERSION;
  const accessToken = config.accessToken.trim();

  if (!accessToken) {
    throw new Error("Shopify Admin API access token is required.");
  }

  const response = await fetch(
    `https://${shopDomain}/admin/api/${encodeURIComponent(apiVersion)}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!response.ok) {
    throw new Error(`Shopify Admin API request failed with HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as GraphqlEnvelope<T>;
  if (payload.errors?.length) {
    throw new Error(`Shopify GraphQL error: ${payload.errors.map((error) => error.message).join("; ")}`);
  }

  if (!payload.data) {
    throw new Error("Shopify GraphQL response did not include data.");
  }

  return payload.data;
}

export async function verifyReadOnlyShopifyConnection(
  config: ShopifyConnectionConfig,
): Promise<ShopifyConnectionVerification> {
  const data = await shopifyGraphql<ConnectionProbeData>(config, CONNECTION_PROBE);
  const grantedScopes = data.currentAppInstallation.accessScopes
    .map((scope) => scope.handle)
    .sort();

  assertReadOnlyScopes(grantedScopes);

  return {
    ok: true,
    mode: "read-only",
    apiVersion: config.apiVersion ?? SHOPIFY_ADMIN_API_VERSION,
    shop: data.shop,
    grantedScopes,
    requiredReadScopes: [...REQUIRED_READ_SCOPES],
  };
}
