import { createHash } from "node:crypto";
import {
  UNIVERSAL_RESOURCE_KINDS,
  buildUniversalConnectionIdentity,
  buildUniversalSiteIdentity,
  type UniversalConnectionIdentity,
  type UniversalResourceKind,
  type UniversalSiteIdentity,
} from "./universal-site-resource-identity.js";

export const UGP_CAPABILITY_REGISTRY_VERSION =
  "ugp-1-2-universal-capability-registry-v1" as const;

export const UNIVERSAL_CAPABILITIES = [
  "read.resource",
  "read.metadata",
  "read.content",
  "read.structured_data",
  "read.internal_links",
  "write.seo_title",
  "write.meta_description",
  "write.visible_content",
  "write.structured_data",
  "write.internal_links",
  "write.media_alt",
  "write.navigation",
  "create.article",
  "update.article",
  "publish.article",
  "unpublish.article",
  "preview.change",
  "verify.change",
  "rollback.change",
  "git.branch",
  "git.commit",
  "git.pull_request",
  "outreach.draft",
  "outreach.send",
] as const;

export type UniversalCapabilityName =
  (typeof UNIVERSAL_CAPABILITIES)[number];

export type UniversalCapabilitySideEffect =
  | "read_only"
  | "local_prepare"
  | "external_mutation";

export type UniversalCapabilityAssurance =
  | "not_applicable"
  | "unsupported"
  | "supported"
  | "required";

export type UniversalCapabilityLimits = Readonly<{
  maxOperationsPerRequest: number;
  maxPayloadBytes: number;
}>;

export type UniversalCapabilityDefinitionInput = {
  capability: UniversalCapabilityName;
  resourceKinds: readonly UniversalResourceKind[];
  requiredProviderScopes?: readonly string[];
  verification: UniversalCapabilityAssurance;
  rollback: UniversalCapabilityAssurance;
  maxOperationsPerRequest: number;
  maxPayloadBytes: number;
};

export type UniversalCapabilityDefinition = Readonly<{
  version: typeof UGP_CAPABILITY_REGISTRY_VERSION;
  capability: UniversalCapabilityName;
  sideEffect: UniversalCapabilitySideEffect;
  resourceKinds: readonly UniversalResourceKind[];
  requiredProviderScopes: readonly string[];
  verification: UniversalCapabilityAssurance;
  rollback: UniversalCapabilityAssurance;
  limits: UniversalCapabilityLimits;
  capabilityFingerprint: string;
}>;

export type UniversalCapabilityRegistryInput = {
  site: UniversalSiteIdentity;
  connection?: UniversalConnectionIdentity | null;
  provider: string;
  connectorVersion: string;
  credentialProfileId?: string | null;
  capabilities: readonly UniversalCapabilityDefinitionInput[];
};

export type UniversalCapabilityRegistry = Readonly<{
  version: typeof UGP_CAPABILITY_REGISTRY_VERSION;
  site: UniversalSiteIdentity;
  connection: UniversalConnectionIdentity | null;
  provider: string;
  connectorVersion: string;
  credentialProfileId: string | null;
  capabilities: readonly UniversalCapabilityDefinition[];
  semantics: Readonly<{
    availabilityOnly: true;
    grantsAuthorization: false;
    grantsProviderWrite: false;
    grantsPublicSiteWrite: false;
    automaticTransition: false;
  }>;
  registryFingerprint: string;
}>;

const PROVIDER_KEY = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const SCOPE_KEY = /^[A-Za-z0-9][A-Za-z0-9:._/-]{0,255}$/;
const PRINTABLE_IDENTITY_MAX = 512;
const MAX_OPERATIONS_PER_REQUEST = 10_000;
const MAX_PAYLOAD_BYTES = 100_000_000;

const SEMANTICS = Object.freeze({
  availabilityOnly: true as const,
  grantsAuthorization: false as const,
  grantsProviderWrite: false as const,
  grantsPublicSiteWrite: false as const,
  automaticTransition: false as const,
});

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

function exactProvider(value: unknown): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || !PROVIDER_KEY.test(value)
  ) {
    throw new Error("ugp_capability_invalid_provider");
  }
  return value;
}

function exactPrintableIdentity(
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
    throw new Error("ugp_capability_invalid_" + field);
  }
  return value;
}

function exactPositiveInteger(
  value: unknown,
  field: string,
  max: number,
): number {
  if (
    typeof value !== "number"
    || !Number.isSafeInteger(value)
    || value < 1
    || value > max
  ) {
    throw new Error("ugp_capability_invalid_" + field);
  }
  return value;
}

function capabilitySideEffect(
  capability: UniversalCapabilityName,
): UniversalCapabilitySideEffect {
  if (
    capability.startsWith("read.")
    || capability === "verify.change"
  ) {
    return "read_only";
  }
  if (
    capability === "preview.change"
    || capability === "outreach.draft"
  ) {
    return "local_prepare";
  }
  return "external_mutation";
}

function assertSiteIntegrity(site: UniversalSiteIdentity): void {
  const rebuilt = buildUniversalSiteIdentity({
    siteId: site.siteId,
    canonicalOrigin: site.canonicalOrigin,
  });
  if (stableJson(rebuilt) !== stableJson(site)) {
    throw new Error("ugp_capability_site_integrity_failed");
  }
}

function assertConnectionIntegrity(
  connection: UniversalConnectionIdentity,
  site: UniversalSiteIdentity,
  provider: string,
): void {
  if (
    connection.siteId !== site.siteId
    || connection.siteIdentityFingerprint !== site.siteIdentityFingerprint
  ) {
    throw new Error("ugp_capability_connection_site_mismatch");
  }
  if (connection.provider !== provider) {
    throw new Error("ugp_capability_connection_provider_mismatch");
  }
  const rebuilt = buildUniversalConnectionIdentity({
    site,
    connectionId: connection.connectionId,
    provider: connection.provider,
    externalAccountId: connection.externalAccountId,
    connectionMode: connection.connectionMode,
  });
  if (stableJson(rebuilt) !== stableJson(connection)) {
    throw new Error("ugp_capability_connection_integrity_failed");
  }
}

function exactResourceKinds(
  values: readonly UniversalResourceKind[],
): readonly UniversalResourceKind[] {
  if (!Array.isArray(values) || values.length < 1) {
    throw new Error("ugp_capability_resource_kinds_required");
  }
  const normalized = [...values];
  for (const kind of normalized) {
    if (
      !(UNIVERSAL_RESOURCE_KINDS as readonly string[]).includes(
        kind as string,
      )
    ) {
      throw new Error("ugp_capability_invalid_resource_kind");
    }
  }
  normalized.sort((left, right) => left.localeCompare(right));
  if (new Set(normalized).size !== normalized.length) {
    throw new Error("ugp_capability_duplicate_resource_kind");
  }
  return Object.freeze(normalized);
}

function exactProviderScopes(
  values: readonly string[] | undefined,
): readonly string[] {
  const normalized = [...(values ?? [])];
  for (const scope of normalized) {
    if (
      typeof scope !== "string"
      || scope !== scope.trim()
      || !SCOPE_KEY.test(scope)
    ) {
      throw new Error("ugp_capability_invalid_provider_scope");
    }
  }
  normalized.sort((left, right) => left.localeCompare(right));
  if (new Set(normalized).size !== normalized.length) {
    throw new Error("ugp_capability_duplicate_provider_scope");
  }
  return Object.freeze(normalized);
}

function exactAssurance(
  value: unknown,
  field: string,
): UniversalCapabilityAssurance {
  if (
    value !== "not_applicable"
    && value !== "unsupported"
    && value !== "supported"
    && value !== "required"
  ) {
    throw new Error("ugp_capability_invalid_" + field);
  }
  return value;
}

function buildCapabilityDefinition(
  input: UniversalCapabilityDefinitionInput,
): UniversalCapabilityDefinition {
  if (
    !input
    || typeof input !== "object"
    || Array.isArray(input)
    || !(UNIVERSAL_CAPABILITIES as readonly string[]).includes(
      input.capability as string,
    )
  ) {
    throw new Error("ugp_capability_invalid_capability");
  }

  const sideEffect = capabilitySideEffect(input.capability);
  const verification = exactAssurance(
    input.verification,
    "verification_assurance",
  );
  const rollback = exactAssurance(input.rollback, "rollback_assurance");

  if (sideEffect === "external_mutation") {
    if (verification === "not_applicable") {
      throw new Error(
        "ugp_capability_external_mutation_verification_must_be_explicit",
      );
    }
    if (rollback === "not_applicable") {
      throw new Error(
        "ugp_capability_external_mutation_rollback_must_be_explicit",
      );
    }
  } else if (
    verification !== "not_applicable"
    || rollback !== "not_applicable"
  ) {
    throw new Error(
      "ugp_capability_nonmutation_assurance_must_be_not_applicable",
    );
  }

  const base = {
    version: UGP_CAPABILITY_REGISTRY_VERSION,
    capability: input.capability,
    sideEffect,
    resourceKinds: exactResourceKinds(input.resourceKinds),
    requiredProviderScopes: exactProviderScopes(
      input.requiredProviderScopes,
    ),
    verification,
    rollback,
    limits: Object.freeze({
      maxOperationsPerRequest: exactPositiveInteger(
        input.maxOperationsPerRequest,
        "max_operations_per_request",
        MAX_OPERATIONS_PER_REQUEST,
      ),
      maxPayloadBytes: exactPositiveInteger(
        input.maxPayloadBytes,
        "max_payload_bytes",
        MAX_PAYLOAD_BYTES,
      ),
    }),
  };

  return deepFreeze({
    ...base,
    capabilityFingerprint: stableHash({
      purpose: "ugp_capability_definition",
      ...base,
    }),
  });
}

function capabilityRegistryPayload(
  input: Omit<UniversalCapabilityRegistry, "registryFingerprint">,
) {
  return {
    purpose: "ugp_capability_registry",
    ...input,
  };
}

export function buildUniversalCapabilityRegistry(
  input: UniversalCapabilityRegistryInput,
): UniversalCapabilityRegistry {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_capability_invalid_registry_input");
  }

  assertSiteIntegrity(input.site);
  const provider = exactProvider(input.provider);
  const connection = input.connection ?? null;
  const connectorVersion = exactPrintableIdentity(
    input.connectorVersion,
    "connector_version",
    false,
  ) as string;
  const credentialProfileId = exactPrintableIdentity(
    input.credentialProfileId ?? null,
    "credential_profile_id",
    true,
  );

  if (connection) {
    assertConnectionIntegrity(connection, input.site, provider);
    if (credentialProfileId === null) {
      throw new Error(
        "ugp_capability_connected_registry_requires_credential_profile",
      );
    }
  } else if (credentialProfileId !== null) {
    throw new Error(
      "ugp_capability_anonymous_registry_rejects_credential_profile",
    );
  }

  if (!Array.isArray(input.capabilities) || input.capabilities.length < 1) {
    throw new Error("ugp_capability_registry_requires_capabilities");
  }

  const capabilities = input.capabilities
    .map(buildCapabilityDefinition)
    .sort((left, right) => left.capability.localeCompare(right.capability));

  const seen = new Set<string>();
  for (const capability of capabilities) {
    if (seen.has(capability.capability)) {
      throw new Error("ugp_capability_duplicate_capability");
    }
    seen.add(capability.capability);

    if (!connection && capability.sideEffect === "external_mutation") {
      throw new Error(
        "ugp_capability_external_mutation_requires_connection",
      );
    }
    if (
      !connection
      && capability.requiredProviderScopes.length > 0
    ) {
      throw new Error(
        "ugp_capability_anonymous_registry_rejects_provider_scopes",
      );
    }
  }

  const withoutFingerprint = deepFreeze({
    version: UGP_CAPABILITY_REGISTRY_VERSION,
    site: input.site,
    connection,
    provider,
    connectorVersion,
    credentialProfileId,
    capabilities: Object.freeze(capabilities),
    semantics: SEMANTICS,
  });

  return deepFreeze({
    ...withoutFingerprint,
    registryFingerprint: stableHash(
      capabilityRegistryPayload(withoutFingerprint),
    ),
  });
}

export function assertUniversalCapabilityRegistryIntegrity(
  registry: UniversalCapabilityRegistry,
): void {
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    throw new Error("ugp_capability_invalid_registry");
  }
  if (registry.version !== UGP_CAPABILITY_REGISTRY_VERSION) {
    throw new Error("ugp_capability_registry_version_mismatch");
  }

  const rebuilt = buildUniversalCapabilityRegistry({
    site: registry.site,
    connection: registry.connection,
    provider: registry.provider,
    connectorVersion: registry.connectorVersion,
    credentialProfileId: registry.credentialProfileId,
    capabilities: registry.capabilities.map((entry) => ({
      capability: entry.capability,
      resourceKinds: entry.resourceKinds,
      requiredProviderScopes: entry.requiredProviderScopes,
      verification: entry.verification,
      rollback: entry.rollback,
      maxOperationsPerRequest: entry.limits.maxOperationsPerRequest,
      maxPayloadBytes: entry.limits.maxPayloadBytes,
    })),
  });

  if (stableJson(rebuilt) !== stableJson(registry)) {
    throw new Error("ugp_capability_registry_integrity_failed");
  }
}

export function findUniversalCapability(
  registry: UniversalCapabilityRegistry,
  capability: UniversalCapabilityName,
  resourceKind?: UniversalResourceKind,
): UniversalCapabilityDefinition | null {
  assertUniversalCapabilityRegistryIntegrity(registry);
  if (
    !(UNIVERSAL_CAPABILITIES as readonly string[]).includes(
      capability as string,
    )
  ) {
    throw new Error("ugp_capability_invalid_capability");
  }
  if (
    resourceKind !== undefined
    && !(UNIVERSAL_RESOURCE_KINDS as readonly string[]).includes(
      resourceKind as string,
    )
  ) {
    throw new Error("ugp_capability_invalid_resource_kind");
  }

  const match = registry.capabilities.find((entry) =>
    entry.capability === capability
    && (
      resourceKind === undefined
      || entry.resourceKinds.includes(resourceKind)
    )
  );
  return match ?? null;
}

export function capabilityIsExternalMutation(
  capability: UniversalCapabilityName,
): boolean {
  if (
    !(UNIVERSAL_CAPABILITIES as readonly string[]).includes(
      capability as string,
    )
  ) {
    throw new Error("ugp_capability_invalid_capability");
  }
  return capabilitySideEffect(capability) === "external_mutation";
}
