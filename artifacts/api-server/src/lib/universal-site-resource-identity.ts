import { createHash } from "node:crypto";

export const UGP_UNIVERSAL_IDENTITY_VERSION =
  "ugp-1-1-universal-site-resource-identity-v1" as const;

export const UNIVERSAL_RESOURCE_KINDS = [
  "homepage",
  "page",
  "product",
  "collection",
  "category",
  "article",
  "blog_post",
  "landing_page",
  "template",
  "navigation",
  "media",
  "structured_data",
  "source_file",
  "other",
] as const;

export type UniversalResourceKind =
  (typeof UNIVERSAL_RESOURCE_KINDS)[number];

export type UniversalSiteIdentityInput = {
  siteId: string;
  canonicalOrigin: string;
};

export type UniversalSiteIdentity = Readonly<{
  version: typeof UGP_UNIVERSAL_IDENTITY_VERSION;
  siteId: string;
  canonicalOrigin: string;
  hostname: string;
  siteIdentityFingerprint: string;
}>;

export type UniversalConnectionIdentityInput = {
  site: UniversalSiteIdentity;
  connectionId: string;
  provider: string;
  externalAccountId?: string | null;
  connectionMode?: string | null;
};

export type UniversalConnectionIdentity = Readonly<{
  version: typeof UGP_UNIVERSAL_IDENTITY_VERSION;
  siteId: string;
  siteIdentityFingerprint: string;
  connectionId: string;
  provider: string;
  externalAccountId: string | null;
  connectionMode: string | null;
  connectionIdentityFingerprint: string;
}>;

export type UniversalResourceLocatorInput = {
  site: UniversalSiteIdentity;
  connection?: UniversalConnectionIdentity | null;
  provider: string;
  kind: UniversalResourceKind;
  externalId?: string | null;
  canonicalUrl?: string | null;
  locale?: string | null;
};

export type UniversalResourceLocator = Readonly<{
  version: typeof UGP_UNIVERSAL_IDENTITY_VERSION;
  siteId: string;
  siteIdentityFingerprint: string;
  connectionId: string | null;
  connectionIdentityFingerprint: string | null;
  provider: string;
  kind: UniversalResourceKind;
  externalId: string | null;
  canonicalUrl: string | null;
  locale: string | null;
  resourceLocatorFingerprint: string;
}>;

export type UniversalResourceIdentityInput = {
  locator: UniversalResourceLocator;
  stateFingerprint: string;
  observedAt: string;
  parent?: UniversalResourceLocator | null;
  relationship?: string | null;
};

export type UniversalResourceIdentity = Readonly<{
  version: typeof UGP_UNIVERSAL_IDENTITY_VERSION;
  locator: UniversalResourceLocator;
  stateFingerprint: string;
  observedAt: string;
  parent: UniversalResourceLocator | null;
  relationship: string | null;
  resourceIdentityFingerprint: string;
}>;

export type ShopifyUniversalResourceKind = "product" | "collection" | "page";

export type ShopifyUniversalResourceIdentityInput = {
  site: UniversalSiteIdentity;
  connection: UniversalConnectionIdentity;
  kind: ShopifyUniversalResourceKind;
  gid: string;
  canonicalUrl: string;
  stateFingerprint: string;
  observedAt: string;
  locale?: string | null;
  parent?: UniversalResourceLocator | null;
  relationship?: string | null;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const SAFE_KEY = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/;
const PROVIDER_KEY = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const LOCALE = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/;
const PRINTABLE_IDENTITY_MAX = 1024;

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
    .join(",") + "}";
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function exactKey(value: unknown, field: string): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || !SAFE_KEY.test(value)
  ) {
    throw new Error("ugp_identity_invalid_" + field);
  }
  return value;
}

function exactProvider(value: unknown): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || !PROVIDER_KEY.test(value)
  ) {
    throw new Error("ugp_identity_invalid_provider");
  }
  return value;
}

function exactOpaqueIdentity(
  value: unknown,
  field: string,
  allowNull: boolean,
): string | null {
  if (value == null && allowNull) return null;
  if (
    typeof value !== "string"
    || value.length < 1
    || value.length > PRINTABLE_IDENTITY_MAX
    || value !== value.trim()
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_identity_invalid_" + field);
  }
  return value;
}

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) {
    throw new Error("ugp_identity_invalid_" + field);
  }
  return value;
}

function canonicalTimestamp(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 64) {
    throw new Error("ugp_identity_invalid_" + field);
  }
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) {
    throw new Error("ugp_identity_invalid_" + field);
  }
  const canonical = new Date(millis).toISOString();
  if (canonical !== value) {
    throw new Error("ugp_identity_noncanonical_" + field);
  }
  return canonical;
}

function canonicalOrigin(value: unknown): {
  origin: string;
  hostname: string;
} {
  if (typeof value !== "string" || value.length < 1 || value.length > 2048) {
    throw new Error("ugp_identity_invalid_canonical_origin");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("ugp_identity_invalid_canonical_origin");
  }
  if (
    (url.protocol !== "https:" && url.protocol !== "http:")
    || url.username
    || url.password
    || url.pathname !== "/"
    || url.search
    || url.hash
    || value !== url.origin
  ) {
    throw new Error("ugp_identity_noncanonical_origin");
  }
  return { origin: url.origin, hostname: url.hostname };
}

function canonicalResourceUrl(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string" || value.length < 1 || value.length > 4096) {
    throw new Error("ugp_identity_invalid_canonical_url");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("ugp_identity_invalid_canonical_url");
  }
  if (
    (url.protocol !== "https:" && url.protocol !== "http:")
    || url.username
    || url.password
    || url.hash
    || url.toString() !== value
  ) {
    throw new Error("ugp_identity_noncanonical_url");
  }
  return value;
}

function exactLocale(value: unknown): string | null {
  if (value == null) return null;
  if (
    typeof value !== "string"
    || value !== value.trim()
    || !LOCALE.test(value)
  ) {
    throw new Error("ugp_identity_invalid_locale");
  }
  return value;
}

function assertSiteIntegrity(site: UniversalSiteIdentity): void {
  const rebuilt = buildUniversalSiteIdentity({
    siteId: site.siteId,
    canonicalOrigin: site.canonicalOrigin,
  });
  if (stableJson(rebuilt) !== stableJson(site)) {
    throw new Error("ugp_identity_site_integrity_failed");
  }
}

function assertConnectionIntegrity(
  connection: UniversalConnectionIdentity,
  site: UniversalSiteIdentity,
): void {
  if (
    connection.siteId !== site.siteId
    || connection.siteIdentityFingerprint !== site.siteIdentityFingerprint
  ) {
    throw new Error("ugp_identity_connection_site_mismatch");
  }
  const rebuilt = buildUniversalConnectionIdentity({
    site,
    connectionId: connection.connectionId,
    provider: connection.provider,
    externalAccountId: connection.externalAccountId,
    connectionMode: connection.connectionMode,
  });
  if (stableJson(rebuilt) !== stableJson(connection)) {
    throw new Error("ugp_identity_connection_integrity_failed");
  }
}

export function buildUniversalSiteIdentity(
  input: UniversalSiteIdentityInput,
): UniversalSiteIdentity {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_identity_invalid_site_input");
  }
  const siteId = exactKey(input.siteId, "site_id");
  const origin = canonicalOrigin(input.canonicalOrigin);
  const base = {
    version: UGP_UNIVERSAL_IDENTITY_VERSION,
    siteId,
    canonicalOrigin: origin.origin,
    hostname: origin.hostname,
  };
  return deepFreeze({
    ...base,
    siteIdentityFingerprint: stableHash({
      purpose: "ugp_site_identity",
      ...base,
    }),
  });
}

export function buildUniversalConnectionIdentity(
  input: UniversalConnectionIdentityInput,
): UniversalConnectionIdentity {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_identity_invalid_connection_input");
  }
  assertSiteIntegrity(input.site);
  const base = {
    version: UGP_UNIVERSAL_IDENTITY_VERSION,
    siteId: input.site.siteId,
    siteIdentityFingerprint: input.site.siteIdentityFingerprint,
    connectionId: exactKey(input.connectionId, "connection_id"),
    provider: exactProvider(input.provider),
    externalAccountId: exactOpaqueIdentity(
      input.externalAccountId ?? null,
      "external_account_id",
      true,
    ),
    connectionMode: input.connectionMode == null
      ? null
      : exactKey(input.connectionMode, "connection_mode"),
  };
  return deepFreeze({
    ...base,
    connectionIdentityFingerprint: stableHash({
      purpose: "ugp_connection_identity",
      ...base,
    }),
  });
}

export function buildUniversalResourceLocator(
  input: UniversalResourceLocatorInput,
): UniversalResourceLocator {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_identity_invalid_resource_locator_input");
  }
  assertSiteIntegrity(input.site);
  const provider = exactProvider(input.provider);
  const connection = input.connection ?? null;
  if (connection) {
    assertConnectionIntegrity(connection, input.site);
    if (connection.provider !== provider) {
      throw new Error("ugp_identity_resource_provider_connection_mismatch");
    }
  }

  if (!UNIVERSAL_RESOURCE_KINDS.includes(input.kind)) {
    throw new Error("ugp_identity_invalid_resource_kind");
  }

  const externalId = exactOpaqueIdentity(
    input.externalId ?? null,
    "external_id",
    true,
  );
  const canonicalUrl = canonicalResourceUrl(input.canonicalUrl ?? null);
  if (externalId === null && canonicalUrl === null) {
    throw new Error("ugp_identity_resource_anchor_missing");
  }

  if (canonicalUrl !== null) {
    const url = new URL(canonicalUrl);
    if (url.origin !== input.site.canonicalOrigin) {
      throw new Error("ugp_identity_resource_site_origin_mismatch");
    }
  }

  const base = {
    version: UGP_UNIVERSAL_IDENTITY_VERSION,
    siteId: input.site.siteId,
    siteIdentityFingerprint: input.site.siteIdentityFingerprint,
    connectionId: connection?.connectionId ?? null,
    connectionIdentityFingerprint:
      connection?.connectionIdentityFingerprint ?? null,
    provider,
    kind: input.kind,
    externalId,
    canonicalUrl,
    locale: exactLocale(input.locale ?? null),
  };

  return deepFreeze({
    ...base,
    resourceLocatorFingerprint: stableHash({
      purpose: "ugp_resource_locator",
      ...base,
    }),
  });
}

export function assertUniversalResourceLocatorIntegrity(
  locator: UniversalResourceLocator,
): void {
  const site = buildUniversalSiteIdentityFromLocator(locator);
  const connection = locator.connectionId === null
    ? null
    : buildUniversalConnectionIdentityFromLocator(locator, site);
  const rebuilt = buildUniversalResourceLocator({
    site,
    connection,
    provider: locator.provider,
    kind: locator.kind,
    externalId: locator.externalId,
    canonicalUrl: locator.canonicalUrl,
    locale: locator.locale,
  });
  if (stableJson(rebuilt) !== stableJson(locator)) {
    throw new Error("ugp_identity_resource_locator_integrity_failed");
  }
}

function buildUniversalSiteIdentityFromLocator(
  locator: UniversalResourceLocator,
): UniversalSiteIdentity {
  const canonicalUrl = locator.canonicalUrl;
  if (!canonicalUrl) {
    throw new Error(
      "ugp_identity_locator_site_rebuild_requires_canonical_url",
    );
  }
  const origin = new URL(canonicalUrl).origin;
  const site = buildUniversalSiteIdentity({
    siteId: locator.siteId,
    canonicalOrigin: origin,
  });
  if (site.siteIdentityFingerprint !== locator.siteIdentityFingerprint) {
    throw new Error("ugp_identity_resource_site_fingerprint_mismatch");
  }
  return site;
}

function buildUniversalConnectionIdentityFromLocator(
  locator: UniversalResourceLocator,
  site: UniversalSiteIdentity,
): UniversalConnectionIdentity {
  if (
    locator.connectionId === null
    || locator.connectionIdentityFingerprint === null
  ) {
    throw new Error("ugp_identity_resource_connection_incomplete");
  }
  throw new Error(
    "ugp_identity_locator_connection_rebuild_requires_connection_context",
  );
}

export function buildUniversalResourceIdentity(
  input: UniversalResourceIdentityInput,
): UniversalResourceIdentity {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_identity_invalid_resource_identity_input");
  }

  const locator = input.locator;
  const stateFingerprint = exactFingerprint(
    input.stateFingerprint,
    "state_fingerprint",
  );
  const observedAt = canonicalTimestamp(input.observedAt, "observed_at");
  const parent = input.parent ?? null;
  const relationship = input.relationship == null
    ? null
    : exactKey(input.relationship, "relationship");

  if ((parent === null) !== (relationship === null)) {
    throw new Error("ugp_identity_parent_relationship_pair_required");
  }

  if (parent) {
    if (
      parent.siteId !== locator.siteId
      || parent.siteIdentityFingerprint !== locator.siteIdentityFingerprint
    ) {
      throw new Error("ugp_identity_parent_site_mismatch");
    }
    if (parent.provider !== locator.provider) {
      throw new Error("ugp_identity_parent_provider_mismatch");
    }
    if (
      parent.connectionIdentityFingerprint
      !== locator.connectionIdentityFingerprint
    ) {
      throw new Error("ugp_identity_parent_connection_mismatch");
    }
  }

  const base = {
    version: UGP_UNIVERSAL_IDENTITY_VERSION,
    locator,
    stateFingerprint,
    observedAt,
    parent,
    relationship,
  };
  return deepFreeze({
    ...base,
    resourceIdentityFingerprint: stableHash({
      purpose: "ugp_resource_identity",
      locatorFingerprint: locator.resourceLocatorFingerprint,
      stateFingerprint,
      observedAt,
      parentLocatorFingerprint:
        parent?.resourceLocatorFingerprint ?? null,
      relationship,
    }),
  });
}

export function buildShopifyUniversalResourceIdentity(
  input: ShopifyUniversalResourceIdentityInput,
): UniversalResourceIdentity {
  if (input.connection.provider !== "shopify") {
    throw new Error("ugp_identity_shopify_connection_required");
  }

  const expectedShopifyType =
    input.kind === "product"
      ? "Product"
      : input.kind === "collection"
        ? "Collection"
        : "OnlineStorePage";
  const gidPattern = new RegExp(
    `^gid://shopify/${expectedShopifyType}/[1-9][0-9]*$`,
  );
  if (!gidPattern.test(input.gid)) {
    throw new Error("ugp_identity_invalid_shopify_gid");
  }

  const locator = buildUniversalResourceLocator({
    site: input.site,
    connection: input.connection,
    provider: "shopify",
    kind: input.kind,
    externalId: input.gid,
    canonicalUrl: input.canonicalUrl,
    locale: input.locale ?? null,
  });

  return buildUniversalResourceIdentity({
    locator,
    stateFingerprint: input.stateFingerprint,
    observedAt: input.observedAt,
    parent: input.parent ?? null,
    relationship: input.relationship ?? null,
  });
}
