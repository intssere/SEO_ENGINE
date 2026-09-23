import { createHash } from "node:crypto";
import {
  executionStateFingerprint,
  type AuthorizationEnvelope,
  type ExecutableField,
} from "./execution-foundation.js";
import type {
  ShopifyProviderResource,
} from "./shopify-write-foundation.js";
import type {
  Task53ResolverResult,
} from "./task53-resource-resolver.js";
import type {
  Task53ProviderState,
} from "./task53-production-pilot.js";
import {
  buildUniversalCapabilityRegistry,
  findUniversalCapability,
  type UniversalCapabilityName,
} from "./universal-capability-registry.js";
import {
  buildUniversalConnectorArtifact,
  buildUniversalConnectorDescriptor,
  buildUniversalMutationIntent,
  type UniversalConnectorArtifact,
  type UniversalConnectorDescriptor,
  type UniversalMutationIntent,
} from "./universal-connector-contract.js";
import {
  buildUniversalConnectionIdentity,
  buildUniversalResourceIdentity,
  buildUniversalResourceLocator,
  buildUniversalSiteIdentity,
  type UniversalConnectionIdentity,
  type UniversalResourceIdentity,
  type UniversalResourceLocator,
  type UniversalSiteIdentity,
} from "./universal-site-resource-identity.js";

export const UGP_SHOPIFY_COMPATIBILITY_VERSION =
  "ugp-1-4-shopify-compatibility-adapter-v1" as const;

export const SHOPIFY_TASK53_READ_ONLY_VERSION =
  "task53_read_only_resource_resolver_v1" as const;
export const SHOPIFY_TASK53_READ_ONLY_API_VERSION = "2026-07" as const;
export const SHOPIFY_TASK53_READ_SCOPE = "read_products" as const;

export const SHOPIFY_TASK53_PRODUCTION_VERSION =
  "controlled_single_action_production_execution_pilot_v1" as const;
export const SHOPIFY_TASK53_PRODUCTION_API_VERSION = "2025-10" as const;
export const SHOPIFY_TASK53_WRITE_SCOPE = "write_products" as const;

export type ShopifyCompatibilityProfile =
  | "task53_read_only"
  | "task53_production_pilot";

export type ShopifyCompatibilityAuthority = Readonly<{
  compatibilityOnly: true;
  grantsExecutionAuthorization: false;
  grantsProviderWrite: false;
  grantsPublicSiteWrite: false;
  producesUniversalExecuteRequest: false;
  preservesExistingShopifyGates: true;
}>;

export type ShopifyCompatibilityAdapter = Readonly<{
  version: typeof UGP_SHOPIFY_COMPATIBILITY_VERSION;
  profile: ShopifyCompatibilityProfile;
  site: UniversalSiteIdentity;
  connection: UniversalConnectionIdentity;
  descriptor: UniversalConnectorDescriptor;
  adminApiVersion:
    | typeof SHOPIFY_TASK53_READ_ONLY_API_VERSION
    | typeof SHOPIFY_TASK53_PRODUCTION_API_VERSION;
  supportedLiveResourceKinds: readonly ("product" | "collection")[];
  authority: ShopifyCompatibilityAuthority;
  adapterFingerprint: string;
}>;

export type ShopifyReadProjection = Readonly<{
  version: typeof UGP_SHOPIFY_COMPATIBILITY_VERSION;
  profile: ShopifyCompatibilityProfile;
  locator: UniversalResourceLocator;
  identity: UniversalResourceIdentity;
  artifact: UniversalConnectorArtifact;
  sourceVersion: string;
  projectionFingerprint: string;
}>;

export type ShopifyMutationCompatibilityProjection = Readonly<{
  version: typeof UGP_SHOPIFY_COMPATIBILITY_VERSION;
  profile: "task53_production_pilot";
  capability: "write.seo_title" | "write.meta_description";
  target: UniversalResourceLocator;
  mutation: UniversalMutationIntent;
  sourceAuthorization: Readonly<{
    planId: string;
    envelopeFingerprint: string;
    issuedAt: string;
    expiresAt: string;
    executionAuthorized: true;
    providerWriteAllowed: false;
    publicSiteWrites: false;
    automaticTransition: false;
  }>;
  existingGateRequirements: readonly [
    "task53_preflight",
    "public_site_write_gate",
    "exact_execution_confirmation",
    "authorization_freshness",
    "provider_state_match",
    "write_products_scope",
    "duplicate_execution_guard",
    "single_active_execution_guard",
  ];
  universalExecuteRequest: null;
  authority: ShopifyCompatibilityAuthority;
  projectionFingerprint: string;
}>;

const HEX_64 = /^[0-9a-f]{64}$/;
const SHOP_DOMAIN =
  /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i;
const GID_BY_KIND = {
  product: /^gid:\/\/shopify\/Product\/[1-9][0-9]*$/,
  collection: /^gid:\/\/shopify\/Collection\/[1-9][0-9]*$/,
  page: /^gid:\/\/shopify\/OnlineStorePage\/[1-9][0-9]*$/,
} as const;
const PATH_BY_KIND = {
  product: /^\/products\/[^/?#]+$/,
  collection: /^\/collections\/[^/?#]+$/,
  page: /^\/pages\/[^/?#]+$/,
} as const;

const AUTHORITY = Object.freeze({
  compatibilityOnly: true as const,
  grantsExecutionAuthorization: false as const,
  grantsProviderWrite: false as const,
  grantsPublicSiteWrite: false as const,
  producesUniversalExecuteRequest: false as const,
  preservesExistingShopifyGates: true as const,
});

const GATE_REQUIREMENTS = Object.freeze([
  "task53_preflight",
  "public_site_write_gate",
  "exact_execution_confirmation",
  "authorization_freshness",
  "provider_state_match",
  "write_products_scope",
  "duplicate_execution_guard",
  "single_active_execution_guard",
] as const);

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableJson).join(",") + "]";
  }
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
    .join(",") + "}";
}

function stableHash(value: unknown): string {
  return createHash("sha256")
    .update(stableJson(value))
    .digest("hex");
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(
      value as Record<string, unknown>,
    )) {
      deepFreeze(nested);
    }
  }
  return value;
}

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) {
    throw new Error("ugp_shopify_invalid_" + field);
  }
  return value;
}

function exactCanonicalTimestamp(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error("ugp_shopify_invalid_" + field);
  }
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) {
    throw new Error("ugp_shopify_invalid_" + field);
  }
  const canonical = new Date(millis).toISOString();
  if (canonical !== value) {
    throw new Error("ugp_shopify_noncanonical_" + field);
  }
  return canonical;
}

function exactShopDomain(value: unknown): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || !SHOP_DOMAIN.test(value)
  ) {
    throw new Error("ugp_shopify_invalid_shop_domain");
  }
  return value.toLowerCase();
}

function assertShopifyDescriptor(
  adapter: ShopifyCompatibilityAdapter,
): void {
  if (
    !adapter
    || typeof adapter !== "object"
    || adapter.version !== UGP_SHOPIFY_COMPATIBILITY_VERSION
    || adapter.descriptor.provider !== "shopify"
    || adapter.connection.provider !== "shopify"
    || adapter.descriptor.connectionIdentityFingerprint
      !== adapter.connection.connectionIdentityFingerprint
    || adapter.descriptor.siteIdentityFingerprint
      !== adapter.site.siteIdentityFingerprint
  ) {
    throw new Error("ugp_shopify_adapter_integrity_failed");
  }

  const expected = stableHash({
    purpose: "ugp_shopify_compatibility_adapter",
    version: adapter.version,
    profile: adapter.profile,
    siteIdentityFingerprint: adapter.site.siteIdentityFingerprint,
    connectionIdentityFingerprint:
      adapter.connection.connectionIdentityFingerprint,
    descriptorFingerprint:
      adapter.descriptor.descriptorFingerprint,
    adminApiVersion: adapter.adminApiVersion,
    supportedLiveResourceKinds:
      adapter.supportedLiveResourceKinds,
    authority: adapter.authority,
  });

  if (expected !== adapter.adapterFingerprint) {
    throw new Error("ugp_shopify_adapter_integrity_failed");
  }
}

function adapterBase(input: {
  profile: ShopifyCompatibilityProfile;
  siteId: string;
  canonicalOrigin: string;
  connectionId: string;
  shopDomain: string;
  credentialProfileId: string;
  connectorId: string;
}) {
  const site = buildUniversalSiteIdentity({
    siteId: input.siteId,
    canonicalOrigin: input.canonicalOrigin,
  });
  const shopDomain = exactShopDomain(input.shopDomain);
  const connection = buildUniversalConnectionIdentity({
    site,
    connectionId: input.connectionId,
    provider: "shopify",
    externalAccountId: shopDomain,
    connectionMode:
      input.profile === "task53_read_only"
        ? "task53_read_only"
        : "task53_write_products",
  });

  return { site, connection };
}

export function buildTask53ReadOnlyShopifyCompatibilityAdapter(
  input: {
    siteId: string;
    canonicalOrigin: string;
    connectionId: string;
    shopDomain: string;
    credentialProfileId: string;
    connectorId: string;
  },
): ShopifyCompatibilityAdapter {
  const { site, connection } = adapterBase({
    ...input,
    profile: "task53_read_only",
  });
  const registry = buildUniversalCapabilityRegistry({
    site,
    connection,
    provider: "shopify",
    connectorVersion: SHOPIFY_TASK53_READ_ONLY_VERSION,
    credentialProfileId: input.credentialProfileId,
    capabilities: [
      {
        capability: "read.resource",
        resourceKinds: ["product", "collection"],
        requiredProviderScopes: [SHOPIFY_TASK53_READ_SCOPE],
        verification: "not_applicable",
        rollback: "not_applicable",
        maxOperationsPerRequest: 100,
        maxPayloadBytes: 1_000_000,
      },
      {
        capability: "read.metadata",
        resourceKinds: ["product", "collection"],
        requiredProviderScopes: [SHOPIFY_TASK53_READ_SCOPE],
        verification: "not_applicable",
        rollback: "not_applicable",
        maxOperationsPerRequest: 100,
        maxPayloadBytes: 250_000,
      },
    ],
  });
  const descriptor = buildUniversalConnectorDescriptor({
    connectorId: input.connectorId,
    connectorKind: "native_api",
    registry,
  });
  const withoutFingerprint = {
    version: UGP_SHOPIFY_COMPATIBILITY_VERSION,
    profile: "task53_read_only" as const,
    site,
    connection,
    descriptor,
    adminApiVersion: SHOPIFY_TASK53_READ_ONLY_API_VERSION,
    supportedLiveResourceKinds: Object.freeze([
      "product",
      "collection",
    ] as const),
    authority: AUTHORITY,
  };
  return deepFreeze({
    ...withoutFingerprint,
    adapterFingerprint: stableHash({
      purpose: "ugp_shopify_compatibility_adapter",
      version: withoutFingerprint.version,
      profile: withoutFingerprint.profile,
      siteIdentityFingerprint: site.siteIdentityFingerprint,
      connectionIdentityFingerprint:
        connection.connectionIdentityFingerprint,
      descriptorFingerprint: descriptor.descriptorFingerprint,
      adminApiVersion: withoutFingerprint.adminApiVersion,
      supportedLiveResourceKinds:
        withoutFingerprint.supportedLiveResourceKinds,
      authority: withoutFingerprint.authority,
    }),
  });
}

export function buildTask53ProductionShopifyCompatibilityAdapter(
  input: {
    siteId: string;
    canonicalOrigin: string;
    connectionId: string;
    shopDomain: string;
    credentialProfileId: string;
    connectorId: string;
  },
): ShopifyCompatibilityAdapter {
  const { site, connection } = adapterBase({
    ...input,
    profile: "task53_production_pilot",
  });
  const liveKinds = ["product", "collection"] as const;
  const registry = buildUniversalCapabilityRegistry({
    site,
    connection,
    provider: "shopify",
    connectorVersion: SHOPIFY_TASK53_PRODUCTION_VERSION,
    credentialProfileId: input.credentialProfileId,
    capabilities: [
      {
        capability: "read.resource",
        resourceKinds: liveKinds,
        requiredProviderScopes: [SHOPIFY_TASK53_WRITE_SCOPE],
        verification: "not_applicable",
        rollback: "not_applicable",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 1_000_000,
      },
      {
        capability: "read.metadata",
        resourceKinds: liveKinds,
        requiredProviderScopes: [SHOPIFY_TASK53_WRITE_SCOPE],
        verification: "not_applicable",
        rollback: "not_applicable",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 250_000,
      },
      {
        capability: "preview.change",
        resourceKinds: liveKinds,
        verification: "not_applicable",
        rollback: "not_applicable",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 50_000,
      },
      {
        capability: "write.seo_title",
        resourceKinds: liveKinds,
        requiredProviderScopes: [SHOPIFY_TASK53_WRITE_SCOPE],
        verification: "required",
        rollback: "supported",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 50_000,
      },
      {
        capability: "write.meta_description",
        resourceKinds: liveKinds,
        requiredProviderScopes: [SHOPIFY_TASK53_WRITE_SCOPE],
        verification: "required",
        rollback: "supported",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 50_000,
      },
      {
        capability: "verify.change",
        resourceKinds: liveKinds,
        verification: "not_applicable",
        rollback: "not_applicable",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 250_000,
      },
      {
        capability: "rollback.change",
        resourceKinds: liveKinds,
        requiredProviderScopes: [SHOPIFY_TASK53_WRITE_SCOPE],
        verification: "supported",
        rollback: "supported",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 50_000,
      },
    ],
  });
  const descriptor = buildUniversalConnectorDescriptor({
    connectorId: input.connectorId,
    connectorKind: "native_api",
    registry,
  });
  const withoutFingerprint = {
    version: UGP_SHOPIFY_COMPATIBILITY_VERSION,
    profile: "task53_production_pilot" as const,
    site,
    connection,
    descriptor,
    adminApiVersion: SHOPIFY_TASK53_PRODUCTION_API_VERSION,
    supportedLiveResourceKinds: Object.freeze([...liveKinds]),
    authority: AUTHORITY,
  };
  return deepFreeze({
    ...withoutFingerprint,
    adapterFingerprint: stableHash({
      purpose: "ugp_shopify_compatibility_adapter",
      version: withoutFingerprint.version,
      profile: withoutFingerprint.profile,
      siteIdentityFingerprint: site.siteIdentityFingerprint,
      connectionIdentityFingerprint:
        connection.connectionIdentityFingerprint,
      descriptorFingerprint: descriptor.descriptorFingerprint,
      adminApiVersion: withoutFingerprint.adminApiVersion,
      supportedLiveResourceKinds:
        withoutFingerprint.supportedLiveResourceKinds,
      authority: withoutFingerprint.authority,
    }),
  });
}

function assertShopifyResource(
  resource: ShopifyProviderResource,
): void {
  if (
    !resource
    || typeof resource !== "object"
    || !(resource.kind in GID_BY_KIND)
    || !GID_BY_KIND[resource.kind].test(resource.gid)
  ) {
    throw new Error("ugp_shopify_resource_identity_invalid");
  }
}

function assertCanonicalShopifyResourceUrl(
  adapter: ShopifyCompatibilityAdapter,
  kind: ShopifyProviderResource["kind"],
  canonicalUrl: string,
): void {
  let url: URL;
  try {
    url = new URL(canonicalUrl);
  } catch {
    throw new Error("ugp_shopify_resource_url_invalid");
  }
  if (
    url.origin !== adapter.site.canonicalOrigin
    || url.username
    || url.password
    || url.port
    || url.search
    || url.hash
    || !PATH_BY_KIND[kind].test(url.pathname)
    || url.toString() !== canonicalUrl
  ) {
    throw new Error("ugp_shopify_resource_url_kind_mismatch");
  }
}

export function mapShopifyResourceToUniversalLocator(
  input: {
    adapter: ShopifyCompatibilityAdapter;
    resource: ShopifyProviderResource;
    canonicalUrl: string;
    locale?: string | null;
  },
): UniversalResourceLocator {
  assertShopifyDescriptor(input.adapter);
  assertShopifyResource(input.resource);
  assertCanonicalShopifyResourceUrl(
    input.adapter,
    input.resource.kind,
    input.canonicalUrl,
  );

  return buildUniversalResourceLocator({
    site: input.adapter.site,
    connection: input.adapter.connection,
    provider: "shopify",
    kind: input.resource.kind,
    externalId: input.resource.gid,
    canonicalUrl: input.canonicalUrl,
    locale: input.locale ?? null,
  });
}

function resolverStateFingerprint(
  result: Task53ResolverResult,
): string {
  return stableHash({
    purpose: "ugp_shopify_task53_resolver_state",
    resource: result.resource,
    target_url: result.target_url,
    seo: result.seo,
  });
}

export function projectTask53ResolverResult(
  input: {
    adapter: ShopifyCompatibilityAdapter;
    result: Task53ResolverResult;
    observedAt: string;
  },
): ShopifyReadProjection {
  assertShopifyDescriptor(input.adapter);
  if (input.adapter.profile !== "task53_read_only") {
    throw new Error("ugp_shopify_read_only_profile_required");
  }
  if (
    input.result.version !== SHOPIFY_TASK53_READ_ONLY_VERSION
    || input.result.provider !== "shopify"
    || input.result.mode !== "read_only"
    || input.result.admin_api_version
      !== SHOPIFY_TASK53_READ_ONLY_API_VERSION
    || input.result.required_scope !== SHOPIFY_TASK53_READ_SCOPE
    || input.result.provider_write_dispatch_enabled !== false
    || input.result.database_mutations !== 0
  ) {
    throw new Error("ugp_shopify_resolver_semantics_mismatch");
  }
  const observedAt = exactCanonicalTimestamp(
    input.observedAt,
    "resolver_observed_at",
  );
  const locator = mapShopifyResourceToUniversalLocator({
    adapter: input.adapter,
    resource: input.result.resource,
    canonicalUrl: input.result.target_url,
  });
  const stateFingerprint = resolverStateFingerprint(input.result);
  const identity = buildUniversalResourceIdentity({
    locator,
    stateFingerprint,
    observedAt,
  });
  const artifact = buildUniversalConnectorArtifact({
    schemaId: "shopify.task53-read-only-result.v1",
    payload: {
      version: input.result.version,
      mode: input.result.mode,
      admin_api_version: input.result.admin_api_version,
      provider: input.result.provider,
      required_scope: input.result.required_scope,
      provider_write_dispatch_enabled:
        input.result.provider_write_dispatch_enabled,
      database_mutations: input.result.database_mutations,
      target_url: input.result.target_url,
      resource: {
        kind: input.result.resource.kind,
        handle: input.result.resource.handle,
        gid: input.result.resource.gid,
      },
      seo: {
        title: input.result.seo.title,
        description: input.result.seo.description,
      },
      provider_request_id: input.result.provider_request_id,
    },
  });
  const base = {
    version: UGP_SHOPIFY_COMPATIBILITY_VERSION,
    profile: input.adapter.profile,
    locator,
    identity,
    artifact,
    sourceVersion: input.result.version,
  };
  return deepFreeze({
    ...base,
    projectionFingerprint: stableHash({
      purpose: "ugp_shopify_read_projection",
      profile: base.profile,
      locatorFingerprint: locator.resourceLocatorFingerprint,
      resourceIdentityFingerprint:
        identity.resourceIdentityFingerprint,
      artifactFingerprint: artifact.artifactFingerprint,
      sourceVersion: base.sourceVersion,
    }),
  });
}

function fieldCapability(
  field: ExecutableField,
): "write.seo_title" | "write.meta_description" {
  if (field === "title") return "write.seo_title";
  if (field === "meta_description") {
    return "write.meta_description";
  }
  throw new Error("ugp_shopify_field_not_supported");
}

export function projectTask53ProviderState(
  input: {
    adapter: ShopifyCompatibilityAdapter;
    state: Task53ProviderState;
    canonicalUrl: string;
    observedAt: string;
  },
): ShopifyReadProjection {
  assertShopifyDescriptor(input.adapter);
  if (input.adapter.profile !== "task53_production_pilot") {
    throw new Error("ugp_shopify_production_profile_required");
  }
  const observedAt = exactCanonicalTimestamp(
    input.observedAt,
    "provider_state_observed_at",
  );
  const expectedFingerprint = executionStateFingerprint(
    input.state.field,
    input.state.value,
  );
  if (input.state.fingerprint !== expectedFingerprint) {
    throw new Error("ugp_shopify_provider_state_fingerprint_mismatch");
  }
  const locator = mapShopifyResourceToUniversalLocator({
    adapter: input.adapter,
    resource: input.state.resource,
    canonicalUrl: input.canonicalUrl,
  });
  if (
    !input.adapter.supportedLiveResourceKinds.includes(
      input.state.resource.kind,
    )
  ) {
    throw new Error("ugp_shopify_live_resource_kind_not_supported");
  }
  const identity = buildUniversalResourceIdentity({
    locator,
    stateFingerprint: exactFingerprint(
      input.state.fingerprint,
      "provider_state_fingerprint",
    ),
    observedAt,
  });
  const artifact = buildUniversalConnectorArtifact({
    schemaId: "shopify.task53-provider-state.v1",
    payload: {
      resource: {
        kind: input.state.resource.kind,
        gid: input.state.resource.gid,
      },
      field: input.state.field,
      value: input.state.value,
      fingerprint: input.state.fingerprint,
      seoTitle: input.state.seoTitle,
      seoDescription: input.state.seoDescription,
      providerRequestId: input.state.providerRequestId,
    },
  });
  const base = {
    version: UGP_SHOPIFY_COMPATIBILITY_VERSION,
    profile: input.adapter.profile,
    locator,
    identity,
    artifact,
    sourceVersion: SHOPIFY_TASK53_PRODUCTION_VERSION,
  };
  return deepFreeze({
    ...base,
    projectionFingerprint: stableHash({
      purpose: "ugp_shopify_read_projection",
      profile: base.profile,
      locatorFingerprint: locator.resourceLocatorFingerprint,
      resourceIdentityFingerprint:
        identity.resourceIdentityFingerprint,
      artifactFingerprint: artifact.artifactFingerprint,
      sourceVersion: base.sourceVersion,
    }),
  });
}

function assertProductionEnvelope(
  envelope: AuthorizationEnvelope,
): void {
  if (
    envelope.version !== "controlled_execution_foundation_v1"
    || envelope.authorization.executionAuthorized !== true
    || envelope.authorization.providerWriteAllowed !== false
    || envelope.authorization.publicSiteWrites !== false
    || envelope.authorization.automaticTransition !== false
  ) {
    throw new Error("ugp_shopify_authorization_semantics_mismatch");
  }
  exactCanonicalTimestamp(
    envelope.authorization.issuedAt,
    "authorization_issued_at",
  );
  exactCanonicalTimestamp(
    envelope.authorization.expiresAt,
    "authorization_expires_at",
  );
  exactFingerprint(
    envelope.envelopeFingerprint,
    "authorization_envelope_fingerprint",
  );
  const expected = executionStateFingerprint(
    envelope.target.field,
    envelope.expectedCurrentState.value,
  );
  const proposed = executionStateFingerprint(
    envelope.target.field,
    envelope.proposedState.value,
  );
  const rollback = executionStateFingerprint(
    envelope.target.field,
    envelope.rollback.value,
  );
  if (
    envelope.expectedCurrentState.fingerprint !== expected
    || envelope.proposedState.fingerprint !== proposed
    || envelope.rollback.fingerprint !== rollback
    || rollback !== expected
  ) {
    throw new Error("ugp_shopify_authorized_state_fingerprint_mismatch");
  }
}

export function projectTask53AuthorizedMutation(
  input: {
    adapter: ShopifyCompatibilityAdapter;
    actionId: string;
    envelope: AuthorizationEnvelope;
    resource: ShopifyProviderResource;
  },
): ShopifyMutationCompatibilityProjection {
  assertShopifyDescriptor(input.adapter);
  if (input.adapter.profile !== "task53_production_pilot") {
    throw new Error("ugp_shopify_production_profile_required");
  }
  if (
    input.resource.kind === "page"
    || !input.adapter.supportedLiveResourceKinds.includes(
      input.resource.kind,
    )
  ) {
    throw new Error("ugp_shopify_live_resource_kind_not_supported");
  }
  assertProductionEnvelope(input.envelope);
  const capability = fieldCapability(input.envelope.target.field);
  const capabilityDefinition = findUniversalCapability(
    input.adapter.descriptor.registry,
    capability,
    input.resource.kind,
  );
  if (!capabilityDefinition) {
    throw new Error("ugp_shopify_capability_not_available");
  }

  const target = mapShopifyResourceToUniversalLocator({
    adapter: input.adapter,
    resource: input.resource,
    canonicalUrl: input.envelope.target.url,
  });
  const artifact = buildUniversalConnectorArtifact({
    schemaId: "shopify.seo-field-update.v1",
    payload: {
      actionId: input.actionId,
      planId: input.envelope.planId,
      actionType: input.envelope.actionType,
      resource: {
        kind: input.resource.kind,
        gid: input.resource.gid,
      },
      field: input.envelope.target.field,
      value: input.envelope.proposedState.value,
      sourceAuthorizationFingerprint:
        input.envelope.envelopeFingerprint,
    },
  });
  const mutation = buildUniversalMutationIntent({
    descriptor: input.adapter.descriptor,
    capability,
    target,
    artifact,
    expectedStateFingerprint:
      input.envelope.expectedCurrentState.fingerprint,
    proposedStateFingerprint:
      input.envelope.proposedState.fingerprint,
  });

  const sourceAuthorization = deepFreeze({
    planId: input.envelope.planId,
    envelopeFingerprint:
      input.envelope.envelopeFingerprint,
    issuedAt: input.envelope.authorization.issuedAt,
    expiresAt: input.envelope.authorization.expiresAt,
    executionAuthorized: true as const,
    providerWriteAllowed: false as const,
    publicSiteWrites: false as const,
    automaticTransition: false as const,
  });

  const base = {
    version: UGP_SHOPIFY_COMPATIBILITY_VERSION,
    profile: "task53_production_pilot" as const,
    capability,
    target,
    mutation,
    sourceAuthorization,
    existingGateRequirements: GATE_REQUIREMENTS,
    universalExecuteRequest: null,
    authority: AUTHORITY,
  };
  return deepFreeze({
    ...base,
    projectionFingerprint: stableHash({
      purpose: "ugp_shopify_mutation_compatibility_projection",
      capability,
      targetLocatorFingerprint:
        target.resourceLocatorFingerprint,
      mutationIntentFingerprint:
        mutation.intentFingerprint,
      sourceAuthorizationFingerprint:
        sourceAuthorization.envelopeFingerprint,
      existingGateRequirements:
        base.existingGateRequirements,
      authority: base.authority,
    }),
  });
}

export function shopifyFieldToUniversalCapability(
  field: ExecutableField,
): UniversalCapabilityName {
  return fieldCapability(field);
}
