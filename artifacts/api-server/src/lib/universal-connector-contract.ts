import { createHash } from "node:crypto";
import {
  assertUniversalCapabilityRegistryIntegrity,
  capabilityIsExternalMutation,
  findUniversalCapability,
  type UniversalCapabilityDefinition,
  type UniversalCapabilityName,
  type UniversalCapabilityRegistry,
} from "./universal-capability-registry.js";
import {
  assertUniversalResourceLocatorIntegrity,
  buildUniversalResourceIdentity,
  type UniversalResourceIdentity,
  type UniversalResourceKind,
  type UniversalResourceLocator,
} from "./universal-site-resource-identity.js";

export const UGP_CONNECTOR_CONTRACT_VERSION =
  "ugp-1-3-universal-connector-contract-v1" as const;

export const UNIVERSAL_CONNECTOR_KINDS = [
  "public_web",
  "native_api",
  "mcp",
  "openapi",
  "git",
  "site_agent",
  "mock",
] as const;

export type UniversalConnectorKind =
  (typeof UNIVERSAL_CONNECTOR_KINDS)[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type UniversalConnectorArtifact = Readonly<{
  version: typeof UGP_CONNECTOR_CONTRACT_VERSION;
  schemaId: string;
  mediaType: "application/json";
  payload: JsonValue;
  payloadBytes: number;
  artifactFingerprint: string;
}>;

export type UniversalConnectorDescriptorInput = {
  connectorId: string;
  connectorKind: UniversalConnectorKind;
  registry: UniversalCapabilityRegistry;
};

export type UniversalConnectorDescriptor = Readonly<{
  version: typeof UGP_CONNECTOR_CONTRACT_VERSION;
  connectorId: string;
  connectorKind: UniversalConnectorKind;
  provider: string;
  connectorVersion: string;
  siteId: string;
  siteIdentityFingerprint: string;
  connectionId: string | null;
  connectionIdentityFingerprint: string | null;
  credentialProfileId: string | null;
  registry: UniversalCapabilityRegistry;
  descriptorFingerprint: string;
}>;

export type UniversalAuthorizationReference = Readonly<{
  authorizationId: string;
  authorizationFingerprint: string;
  authorizedCapability: UniversalCapabilityName;
  resourceLocatorFingerprint: string;
  operationFingerprint: string;
  issuedAt: string;
  expiresAt: string;
}>;

export type UniversalDiscoveryRequest = Readonly<{
  version: typeof UGP_CONNECTOR_CONTRACT_VERSION;
  operation: "discover_resources";
  descriptor: UniversalConnectorDescriptor;
  capability: "read.resource";
  resourceKinds: readonly UniversalResourceKind[];
  cursor: string | null;
  maxResults: number;
  requestFingerprint: string;
}>;

export type UniversalReadRequest = Readonly<{
  version: typeof UGP_CONNECTOR_CONTRACT_VERSION;
  operation: "read_resource";
  descriptor: UniversalConnectorDescriptor;
  capability: UniversalCapabilityName;
  target: UniversalResourceLocator;
  requestFingerprint: string;
}>;

export type UniversalMutationIntent = Readonly<{
  version: typeof UGP_CONNECTOR_CONTRACT_VERSION;
  descriptor: UniversalConnectorDescriptor;
  capability: UniversalCapabilityName;
  target: UniversalResourceLocator;
  artifact: UniversalConnectorArtifact;
  expectedStateFingerprint: string;
  proposedStateFingerprint: string;
  intentFingerprint: string;
}>;

export type UniversalPreviewMutationRequest = Readonly<{
  version: typeof UGP_CONNECTOR_CONTRACT_VERSION;
  operation: "preview_mutation";
  descriptor: UniversalConnectorDescriptor;
  capability: "preview.change";
  mutation: UniversalMutationIntent;
  requestFingerprint: string;
}>;

export type UniversalExecuteMutationRequest = Readonly<{
  version: typeof UGP_CONNECTOR_CONTRACT_VERSION;
  operation: "execute_mutation";
  descriptor: UniversalConnectorDescriptor;
  mutation: UniversalMutationIntent;
  authorization: UniversalAuthorizationReference;
  requestedAt: string;
  requestFingerprint: string;
}>;

export type UniversalMutationReceipt = Readonly<{
  version: typeof UGP_CONNECTOR_CONTRACT_VERSION;
  operation: "execute_mutation_receipt";
  descriptorFingerprint: string;
  executeRequestFingerprint: string;
  mutationIntentFingerprint: string;
  targetLocatorFingerprint: string;
  providerReceiptId: string;
  reportedAt: string;
  providerStateFingerprint: string | null;
  responseArtifact: UniversalConnectorArtifact | null;
  mutationStatus: "reported_applied";
  verified: false;
  receiptFingerprint: string;
}>;

export type UniversalVerifyMutationRequest = Readonly<{
  version: typeof UGP_CONNECTOR_CONTRACT_VERSION;
  operation: "verify_mutation";
  descriptor: UniversalConnectorDescriptor;
  capability: "verify.change";
  mutationReceipt: UniversalMutationReceipt;
  target: UniversalResourceLocator;
  expectedStateFingerprint: string;
  requestFingerprint: string;
}>;

export type UniversalVerificationStatus =
  | "verified"
  | "mismatch"
  | "unavailable";

export type UniversalVerificationResult = Readonly<{
  version: typeof UGP_CONNECTOR_CONTRACT_VERSION;
  operation: "verify_mutation_result";
  descriptorFingerprint: string;
  verificationRequestFingerprint: string;
  mutationReceiptFingerprint: string;
  targetLocatorFingerprint: string;
  status: UniversalVerificationStatus;
  expectedStateFingerprint: string;
  observedStateFingerprint: string | null;
  observedAt: string | null;
  evidenceArtifact: UniversalConnectorArtifact | null;
  verificationFingerprint: string;
}>;

export type UniversalRollbackIntent = Readonly<{
  version: typeof UGP_CONNECTOR_CONTRACT_VERSION;
  descriptor: UniversalConnectorDescriptor;
  capability: "rollback.change";
  target: UniversalResourceLocator;
  originalMutationReceiptFingerprint: string;
  restoreStateFingerprint: string;
  rollbackIntentFingerprint: string;
}>;

export type UniversalRollbackMutationRequest = Readonly<{
  version: typeof UGP_CONNECTOR_CONTRACT_VERSION;
  operation: "rollback_mutation";
  descriptor: UniversalConnectorDescriptor;
  rollback: UniversalRollbackIntent;
  authorization: UniversalAuthorizationReference;
  requestedAt: string;
  requestFingerprint: string;
}>;

export type UniversalRollbackReceipt = Readonly<{
  version: typeof UGP_CONNECTOR_CONTRACT_VERSION;
  operation: "rollback_mutation_receipt";
  descriptorFingerprint: string;
  rollbackRequestFingerprint: string;
  rollbackIntentFingerprint: string;
  targetLocatorFingerprint: string;
  providerReceiptId: string;
  reportedAt: string;
  providerStateFingerprint: string | null;
  rollbackStatus: "reported_applied";
  verified: false;
  receiptFingerprint: string;
}>;

export type UniversalMutationPreview = Readonly<{
  version: typeof UGP_CONNECTOR_CONTRACT_VERSION;
  operation: "preview_mutation_result";
  descriptorFingerprint: string;
  previewRequestFingerprint: string;
  mutationIntentFingerprint: string;
  targetLocatorFingerprint: string;
  summary: string;
  previewArtifact: UniversalConnectorArtifact | null;
  previewFingerprint: string;
}>;

export interface UniversalConnector {
  readonly descriptor: UniversalConnectorDescriptor;

  discoverResources(
    request: UniversalDiscoveryRequest,
  ): Promise<readonly UniversalResourceLocator[]>;

  readResource(
    request: UniversalReadRequest,
  ): Promise<UniversalResourceIdentity>;

  previewMutation(
    request: UniversalPreviewMutationRequest,
  ): Promise<UniversalMutationPreview>;

  executeMutation(
    request: UniversalExecuteMutationRequest,
  ): Promise<UniversalMutationReceipt>;

  verifyMutation(
    request: UniversalVerifyMutationRequest,
  ): Promise<UniversalVerificationResult>;

  rollbackMutation(
    request: UniversalRollbackMutationRequest,
  ): Promise<UniversalRollbackReceipt>;
}

const HEX_64 = /^[0-9a-f]{64}$/;
const SAFE_KEY = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/;
const SCHEMA_KEY = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/;
const PRINTABLE_IDENTITY_MAX = 1024;
const MAX_DISCOVERY_RESULTS = 10_000;

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
    throw new Error("ugp_connector_invalid_" + field);
  }
  return value;
}

function exactPrintable(
  value: unknown,
  field: string,
  allowNull = false,
): string | null {
  if (value == null && allowNull) return null;
  if (
    typeof value !== "string"
    || value.length < 1
    || value.length > PRINTABLE_IDENTITY_MAX
    || value !== value.trim()
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_connector_invalid_" + field);
  }
  return value;
}

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) {
    throw new Error("ugp_connector_invalid_" + field);
  }
  return value;
}

function exactCanonicalTimestamp(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 64) {
    throw new Error("ugp_connector_invalid_" + field);
  }
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) {
    throw new Error("ugp_connector_invalid_" + field);
  }
  const canonical = new Date(millis).toISOString();
  if (canonical !== value) {
    throw new Error("ugp_connector_noncanonical_" + field);
  }
  return canonical;
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
    throw new Error("ugp_connector_invalid_" + field);
  }
  return value;
}

function assertJsonValue(
  value: unknown,
  path = "payload",
  seen = new Set<object>(),
): asserts value is JsonValue {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("ugp_connector_non_json_" + path);
    }
    return;
  }
  if (typeof value !== "object" || value === undefined) {
    throw new Error("ugp_connector_non_json_" + path);
  }

  const objectValue = value as object;
  if (seen.has(objectValue)) {
    throw new Error("ugp_connector_cyclic_" + path);
  }
  seen.add(objectValue);

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      assertJsonValue(value[index], path + "_" + index, seen);
    }
    seen.delete(objectValue);
    return;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("ugp_connector_non_json_" + path);
  }
  for (const [key, nested] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (!SCHEMA_KEY.test(key)) {
      throw new Error("ugp_connector_invalid_payload_key");
    }
    assertJsonValue(nested, path + "_" + key, seen);
  }
  seen.delete(objectValue);
}

function connectorDescriptorPayload(
  input: Omit<UniversalConnectorDescriptor, "descriptorFingerprint">,
) {
  return {
    purpose: "ugp_universal_connector_descriptor",
    ...input,
  };
}

export function buildUniversalConnectorDescriptor(
  input: UniversalConnectorDescriptorInput,
): UniversalConnectorDescriptor {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_connector_invalid_descriptor_input");
  }
  assertUniversalCapabilityRegistryIntegrity(input.registry);
  if (
    !(UNIVERSAL_CONNECTOR_KINDS as readonly string[]).includes(
      input.connectorKind as string,
    )
  ) {
    throw new Error("ugp_connector_invalid_connector_kind");
  }

  const base = {
    version: UGP_CONNECTOR_CONTRACT_VERSION,
    connectorId: exactKey(input.connectorId, "connector_id"),
    connectorKind: input.connectorKind,
    provider: input.registry.provider,
    connectorVersion: input.registry.connectorVersion,
    siteId: input.registry.site.siteId,
    siteIdentityFingerprint:
      input.registry.site.siteIdentityFingerprint,
    connectionId: input.registry.connection?.connectionId ?? null,
    connectionIdentityFingerprint:
      input.registry.connection?.connectionIdentityFingerprint ?? null,
    credentialProfileId: input.registry.credentialProfileId,
    registry: input.registry,
  };

  return deepFreeze({
    ...base,
    descriptorFingerprint: stableHash(connectorDescriptorPayload(base)),
  });
}

export function assertUniversalConnectorDescriptorIntegrity(
  descriptor: UniversalConnectorDescriptor,
): void {
  if (
    !descriptor
    || typeof descriptor !== "object"
    || Array.isArray(descriptor)
  ) {
    throw new Error("ugp_connector_invalid_descriptor");
  }
  if (descriptor.version !== UGP_CONNECTOR_CONTRACT_VERSION) {
    throw new Error("ugp_connector_descriptor_version_mismatch");
  }

  const rebuilt = buildUniversalConnectorDescriptor({
    connectorId: descriptor.connectorId,
    connectorKind: descriptor.connectorKind,
    registry: descriptor.registry,
  });

  if (stableJson(rebuilt) !== stableJson(descriptor)) {
    throw new Error("ugp_connector_descriptor_integrity_failed");
  }
}

function assertLocatorScope(
  descriptor: UniversalConnectorDescriptor,
  locator: UniversalResourceLocator,
): void {
  assertUniversalConnectorDescriptorIntegrity(descriptor);
  assertUniversalResourceLocatorIntegrity(locator);

  if (
    locator.siteId !== descriptor.siteId
    || locator.siteIdentityFingerprint
      !== descriptor.siteIdentityFingerprint
  ) {
    throw new Error("ugp_connector_resource_site_mismatch");
  }
  if (locator.provider !== descriptor.provider) {
    throw new Error("ugp_connector_resource_provider_mismatch");
  }
  if (locator.connectionId !== descriptor.connectionId) {
    throw new Error("ugp_connector_resource_connection_mismatch");
  }
  if (
    locator.connectionIdentityFingerprint
    !== descriptor.connectionIdentityFingerprint
  ) {
    throw new Error(
      "ugp_connector_resource_connection_fingerprint_mismatch",
    );
  }
}

function requireCapability(
  descriptor: UniversalConnectorDescriptor,
  capability: UniversalCapabilityName,
  resourceKind: UniversalResourceKind,
): UniversalCapabilityDefinition {
  const definition = findUniversalCapability(
    descriptor.registry,
    capability,
    resourceKind,
  );
  if (!definition) {
    throw new Error("ugp_connector_capability_not_available");
  }
  return definition;
}

function exactResourceKinds(
  values: readonly UniversalResourceKind[],
): readonly UniversalResourceKind[] {
  if (!Array.isArray(values) || values.length < 1) {
    throw new Error("ugp_connector_resource_kinds_required");
  }
  const normalized = [...values].sort((left, right) =>
    left.localeCompare(right)
  );
  if (new Set(normalized).size !== normalized.length) {
    throw new Error("ugp_connector_duplicate_resource_kind");
  }
  return Object.freeze(normalized);
}

export function buildUniversalConnectorArtifact(input: {
  schemaId: string;
  payload: JsonValue;
}): UniversalConnectorArtifact {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_connector_invalid_artifact_input");
  }
  if (
    typeof input.schemaId !== "string"
    || input.schemaId !== input.schemaId.trim()
    || !SCHEMA_KEY.test(input.schemaId)
  ) {
    throw new Error("ugp_connector_invalid_schema_id");
  }
  assertJsonValue(input.payload);
  const payloadJson = stableJson(input.payload);
  const payloadBytes = Buffer.byteLength(payloadJson, "utf8");
  const base = {
    version: UGP_CONNECTOR_CONTRACT_VERSION,
    schemaId: input.schemaId,
    mediaType: "application/json" as const,
    payload: input.payload,
    payloadBytes,
  };
  return deepFreeze({
    ...base,
    artifactFingerprint: stableHash({
      purpose: "ugp_connector_artifact",
      ...base,
    }),
  });
}

export function buildUniversalDiscoveryRequest(input: {
  descriptor: UniversalConnectorDescriptor;
  resourceKinds: readonly UniversalResourceKind[];
  cursor?: string | null;
  maxResults: number;
}): UniversalDiscoveryRequest {
  assertUniversalConnectorDescriptorIntegrity(input.descriptor);
  const resourceKinds = exactResourceKinds(input.resourceKinds);
  let maxAllowed = MAX_DISCOVERY_RESULTS;
  for (const kind of resourceKinds) {
    const definition = requireCapability(
      input.descriptor,
      "read.resource",
      kind,
    );
    maxAllowed = Math.min(
      maxAllowed,
      definition.limits.maxOperationsPerRequest,
    );
  }
  const maxResults = exactPositiveInteger(
    input.maxResults,
    "max_results",
    maxAllowed,
  );
  const cursor = exactPrintable(
    input.cursor ?? null,
    "discovery_cursor",
    true,
  );

  const base = {
    version: UGP_CONNECTOR_CONTRACT_VERSION,
    operation: "discover_resources" as const,
    descriptor: input.descriptor,
    capability: "read.resource" as const,
    resourceKinds,
    cursor,
    maxResults,
  };
  return deepFreeze({
    ...base,
    requestFingerprint: stableHash({
      purpose: "ugp_discovery_request",
      descriptorFingerprint:
        input.descriptor.descriptorFingerprint,
      resourceKinds,
      cursor,
      maxResults,
    }),
  });
}

export function buildUniversalReadRequest(input: {
  descriptor: UniversalConnectorDescriptor;
  capability: UniversalCapabilityName;
  target: UniversalResourceLocator;
}): UniversalReadRequest {
  assertLocatorScope(input.descriptor, input.target);
  const definition = requireCapability(
    input.descriptor,
    input.capability,
    input.target.kind,
  );
  if (
    !input.capability.startsWith("read.")
    || definition.sideEffect !== "read_only"
  ) {
    throw new Error("ugp_connector_read_requires_read_capability");
  }

  const base = {
    version: UGP_CONNECTOR_CONTRACT_VERSION,
    operation: "read_resource" as const,
    descriptor: input.descriptor,
    capability: input.capability,
    target: input.target,
  };
  return deepFreeze({
    ...base,
    requestFingerprint: stableHash({
      purpose: "ugp_read_request",
      descriptorFingerprint:
        input.descriptor.descriptorFingerprint,
      capability: input.capability,
      targetLocatorFingerprint:
        input.target.resourceLocatorFingerprint,
    }),
  });
}

export function buildUniversalMutationIntent(input: {
  descriptor: UniversalConnectorDescriptor;
  capability: UniversalCapabilityName;
  target: UniversalResourceLocator;
  artifact: UniversalConnectorArtifact;
  expectedStateFingerprint: string;
  proposedStateFingerprint: string;
}): UniversalMutationIntent {
  assertLocatorScope(input.descriptor, input.target);
  if (!capabilityIsExternalMutation(input.capability)) {
    throw new Error(
      "ugp_connector_mutation_requires_external_mutation_capability",
    );
  }
  const definition = requireCapability(
    input.descriptor,
    input.capability,
    input.target.kind,
  );
  if (definition.sideEffect !== "external_mutation") {
    throw new Error("ugp_connector_mutation_side_effect_mismatch");
  }
  if (
    input.artifact.payloadBytes > definition.limits.maxPayloadBytes
  ) {
    throw new Error("ugp_connector_mutation_payload_too_large");
  }
  const expectedStateFingerprint = exactFingerprint(
    input.expectedStateFingerprint,
    "expected_state_fingerprint",
  );
  const proposedStateFingerprint = exactFingerprint(
    input.proposedStateFingerprint,
    "proposed_state_fingerprint",
  );
  if (expectedStateFingerprint === proposedStateFingerprint) {
    throw new Error("ugp_connector_mutation_state_unchanged");
  }

  const base = {
    version: UGP_CONNECTOR_CONTRACT_VERSION,
    descriptor: input.descriptor,
    capability: input.capability,
    target: input.target,
    artifact: input.artifact,
    expectedStateFingerprint,
    proposedStateFingerprint,
  };

  return deepFreeze({
    ...base,
    intentFingerprint: stableHash({
      purpose: "ugp_mutation_intent",
      descriptorFingerprint:
        input.descriptor.descriptorFingerprint,
      capability: input.capability,
      targetLocatorFingerprint:
        input.target.resourceLocatorFingerprint,
      artifactFingerprint: input.artifact.artifactFingerprint,
      expectedStateFingerprint,
      proposedStateFingerprint,
    }),
  });
}

export function buildUniversalPreviewMutationRequest(input: {
  mutation: UniversalMutationIntent;
}): UniversalPreviewMutationRequest {
  const descriptor = input.mutation.descriptor;
  assertUniversalConnectorDescriptorIntegrity(descriptor);
  assertLocatorScope(descriptor, input.mutation.target);
  requireCapability(
    descriptor,
    "preview.change",
    input.mutation.target.kind,
  );

  const base = {
    version: UGP_CONNECTOR_CONTRACT_VERSION,
    operation: "preview_mutation" as const,
    descriptor,
    capability: "preview.change" as const,
    mutation: input.mutation,
  };
  return deepFreeze({
    ...base,
    requestFingerprint: stableHash({
      purpose: "ugp_preview_mutation_request",
      descriptorFingerprint: descriptor.descriptorFingerprint,
      mutationIntentFingerprint:
        input.mutation.intentFingerprint,
    }),
  });
}

export function buildUniversalAuthorizationReference(input: {
  authorizationId: string;
  authorizationFingerprint: string;
  authorizedCapability: UniversalCapabilityName;
  resourceLocatorFingerprint: string;
  operationFingerprint: string;
  issuedAt: string;
  expiresAt: string;
}): UniversalAuthorizationReference {
  const issuedAt = exactCanonicalTimestamp(
    input.issuedAt,
    "authorization_issued_at",
  );
  const expiresAt = exactCanonicalTimestamp(
    input.expiresAt,
    "authorization_expires_at",
  );
  if (Date.parse(expiresAt) <= Date.parse(issuedAt)) {
    throw new Error("ugp_connector_authorization_window_invalid");
  }
  return deepFreeze({
    authorizationId: exactKey(
      input.authorizationId,
      "authorization_id",
    ),
    authorizationFingerprint: exactFingerprint(
      input.authorizationFingerprint,
      "authorization_fingerprint",
    ),
    authorizedCapability: input.authorizedCapability,
    resourceLocatorFingerprint: exactFingerprint(
      input.resourceLocatorFingerprint,
      "authorized_resource_locator_fingerprint",
    ),
    operationFingerprint: exactFingerprint(
      input.operationFingerprint,
      "authorized_operation_fingerprint",
    ),
    issuedAt,
    expiresAt,
  });
}

function assertAuthorizationForOperation(input: {
  authorization: UniversalAuthorizationReference;
  capability: UniversalCapabilityName;
  target: UniversalResourceLocator;
  operationFingerprint: string;
  now: string;
}): void {
  if (
    input.authorization.authorizedCapability !== input.capability
  ) {
    throw new Error("ugp_connector_authorization_capability_mismatch");
  }
  if (
    input.authorization.resourceLocatorFingerprint
    !== input.target.resourceLocatorFingerprint
  ) {
    throw new Error("ugp_connector_authorization_resource_mismatch");
  }
  if (
    input.authorization.operationFingerprint
    !== input.operationFingerprint
  ) {
    throw new Error("ugp_connector_authorization_operation_mismatch");
  }

  const now = exactCanonicalTimestamp(
    input.now,
    "authorization_check_time",
  );
  const nowMillis = Date.parse(now);
  if (
    nowMillis < Date.parse(input.authorization.issuedAt)
    || nowMillis >= Date.parse(input.authorization.expiresAt)
  ) {
    throw new Error("ugp_connector_authorization_not_active");
  }
}

export function buildUniversalExecuteMutationRequest(input: {
  mutation: UniversalMutationIntent;
  authorization: UniversalAuthorizationReference;
  requestedAt: string;
}): UniversalExecuteMutationRequest {
  const descriptor = input.mutation.descriptor;
  assertUniversalConnectorDescriptorIntegrity(descriptor);
  assertLocatorScope(descriptor, input.mutation.target);
  requireCapability(
    descriptor,
    input.mutation.capability,
    input.mutation.target.kind,
  );
  assertAuthorizationForOperation({
    authorization: input.authorization,
    capability: input.mutation.capability,
    target: input.mutation.target,
    operationFingerprint: input.mutation.intentFingerprint,
    now: input.requestedAt,
  });
  const requestedAt = exactCanonicalTimestamp(
    input.requestedAt,
    "requested_at",
  );

  const base = {
    version: UGP_CONNECTOR_CONTRACT_VERSION,
    operation: "execute_mutation" as const,
    descriptor,
    mutation: input.mutation,
    authorization: input.authorization,
    requestedAt,
  };
  return deepFreeze({
    ...base,
    requestFingerprint: stableHash({
      purpose: "ugp_execute_mutation_request",
      descriptorFingerprint: descriptor.descriptorFingerprint,
      mutationIntentFingerprint:
        input.mutation.intentFingerprint,
      authorizationFingerprint:
        input.authorization.authorizationFingerprint,
      requestedAt,
    }),
  });
}

export function buildUniversalMutationPreview(input: {
  request: UniversalPreviewMutationRequest;
  summary: string;
  previewArtifact?: UniversalConnectorArtifact | null;
}): UniversalMutationPreview {
  const summary = exactPrintable(
    input.summary,
    "preview_summary",
    false,
  ) as string;
  const previewArtifact = input.previewArtifact ?? null;
  const base = {
    version: UGP_CONNECTOR_CONTRACT_VERSION,
    operation: "preview_mutation_result" as const,
    descriptorFingerprint:
      input.request.descriptor.descriptorFingerprint,
    previewRequestFingerprint: input.request.requestFingerprint,
    mutationIntentFingerprint:
      input.request.mutation.intentFingerprint,
    targetLocatorFingerprint:
      input.request.mutation.target.resourceLocatorFingerprint,
    summary,
    previewArtifact,
  };
  return deepFreeze({
    ...base,
    previewFingerprint: stableHash({
      purpose: "ugp_mutation_preview",
      ...base,
    }),
  });
}

export function buildUniversalMutationReceipt(input: {
  request: UniversalExecuteMutationRequest;
  providerReceiptId: string;
  reportedAt: string;
  providerStateFingerprint?: string | null;
  responseArtifact?: UniversalConnectorArtifact | null;
}): UniversalMutationReceipt {
  const providerStateFingerprint =
    input.providerStateFingerprint == null
      ? null
      : exactFingerprint(
          input.providerStateFingerprint,
          "provider_state_fingerprint",
        );
  const base = {
    version: UGP_CONNECTOR_CONTRACT_VERSION,
    operation: "execute_mutation_receipt" as const,
    descriptorFingerprint:
      input.request.descriptor.descriptorFingerprint,
    executeRequestFingerprint: input.request.requestFingerprint,
    mutationIntentFingerprint:
      input.request.mutation.intentFingerprint,
    targetLocatorFingerprint:
      input.request.mutation.target.resourceLocatorFingerprint,
    providerReceiptId: exactPrintable(
      input.providerReceiptId,
      "provider_receipt_id",
      false,
    ) as string,
    reportedAt: exactCanonicalTimestamp(
      input.reportedAt,
      "reported_at",
    ),
    providerStateFingerprint,
    responseArtifact: input.responseArtifact ?? null,
    mutationStatus: "reported_applied" as const,
    verified: false as const,
  };
  return deepFreeze({
    ...base,
    receiptFingerprint: stableHash({
      purpose: "ugp_mutation_receipt",
      ...base,
    }),
  });
}

export function buildUniversalVerifyMutationRequest(input: {
  descriptor: UniversalConnectorDescriptor;
  mutationReceipt: UniversalMutationReceipt;
  target: UniversalResourceLocator;
  expectedStateFingerprint: string;
}): UniversalVerifyMutationRequest {
  assertLocatorScope(input.descriptor, input.target);
  requireCapability(
    input.descriptor,
    "verify.change",
    input.target.kind,
  );
  if (
    input.mutationReceipt.descriptorFingerprint
      !== input.descriptor.descriptorFingerprint
  ) {
    throw new Error("ugp_connector_verification_descriptor_mismatch");
  }
  if (
    input.mutationReceipt.targetLocatorFingerprint
      !== input.target.resourceLocatorFingerprint
  ) {
    throw new Error("ugp_connector_verification_target_mismatch");
  }
  const expectedStateFingerprint = exactFingerprint(
    input.expectedStateFingerprint,
    "verification_expected_state_fingerprint",
  );

  const base = {
    version: UGP_CONNECTOR_CONTRACT_VERSION,
    operation: "verify_mutation" as const,
    descriptor: input.descriptor,
    capability: "verify.change" as const,
    mutationReceipt: input.mutationReceipt,
    target: input.target,
    expectedStateFingerprint,
  };
  return deepFreeze({
    ...base,
    requestFingerprint: stableHash({
      purpose: "ugp_verify_mutation_request",
      descriptorFingerprint:
        input.descriptor.descriptorFingerprint,
      mutationReceiptFingerprint:
        input.mutationReceipt.receiptFingerprint,
      targetLocatorFingerprint:
        input.target.resourceLocatorFingerprint,
      expectedStateFingerprint,
    }),
  });
}

export function buildUniversalVerificationResult(input: {
  request: UniversalVerifyMutationRequest;
  status: UniversalVerificationStatus;
  observedStateFingerprint?: string | null;
  observedAt?: string | null;
  evidenceArtifact?: UniversalConnectorArtifact | null;
}): UniversalVerificationResult {
  const observedStateFingerprint =
    input.observedStateFingerprint == null
      ? null
      : exactFingerprint(
          input.observedStateFingerprint,
          "observed_state_fingerprint",
        );
  const observedAt = input.observedAt == null
    ? null
    : exactCanonicalTimestamp(
        input.observedAt,
        "verification_observed_at",
      );

  if (input.status === "verified") {
    if (
      observedStateFingerprint
        !== input.request.expectedStateFingerprint
      || observedAt === null
    ) {
      throw new Error(
        "ugp_connector_verified_result_requires_exact_state",
      );
    }
  } else if (input.status === "mismatch") {
    if (
      observedStateFingerprint === null
      || observedAt === null
      || observedStateFingerprint
        === input.request.expectedStateFingerprint
    ) {
      throw new Error(
        "ugp_connector_mismatch_result_requires_different_state",
      );
    }
  } else if (input.status === "unavailable") {
    if (
      observedStateFingerprint !== null
      || observedAt !== null
    ) {
      throw new Error(
        "ugp_connector_unavailable_result_rejects_observation",
      );
    }
  } else {
    throw new Error("ugp_connector_invalid_verification_status");
  }

  const base = {
    version: UGP_CONNECTOR_CONTRACT_VERSION,
    operation: "verify_mutation_result" as const,
    descriptorFingerprint:
      input.request.descriptor.descriptorFingerprint,
    verificationRequestFingerprint:
      input.request.requestFingerprint,
    mutationReceiptFingerprint:
      input.request.mutationReceipt.receiptFingerprint,
    targetLocatorFingerprint:
      input.request.target.resourceLocatorFingerprint,
    status: input.status,
    expectedStateFingerprint:
      input.request.expectedStateFingerprint,
    observedStateFingerprint,
    observedAt,
    evidenceArtifact: input.evidenceArtifact ?? null,
  };

  return deepFreeze({
    ...base,
    verificationFingerprint: stableHash({
      purpose: "ugp_verification_result",
      ...base,
    }),
  });
}

export function buildUniversalRollbackIntent(input: {
  descriptor: UniversalConnectorDescriptor;
  target: UniversalResourceLocator;
  originalMutationReceipt: UniversalMutationReceipt;
  restoreStateFingerprint: string;
}): UniversalRollbackIntent {
  assertLocatorScope(input.descriptor, input.target);
  requireCapability(
    input.descriptor,
    "rollback.change",
    input.target.kind,
  );
  if (
    input.originalMutationReceipt.descriptorFingerprint
      !== input.descriptor.descriptorFingerprint
    || input.originalMutationReceipt.targetLocatorFingerprint
      !== input.target.resourceLocatorFingerprint
  ) {
    throw new Error("ugp_connector_rollback_receipt_scope_mismatch");
  }
  const restoreStateFingerprint = exactFingerprint(
    input.restoreStateFingerprint,
    "restore_state_fingerprint",
  );

  const base = {
    version: UGP_CONNECTOR_CONTRACT_VERSION,
    descriptor: input.descriptor,
    capability: "rollback.change" as const,
    target: input.target,
    originalMutationReceiptFingerprint:
      input.originalMutationReceipt.receiptFingerprint,
    restoreStateFingerprint,
  };
  return deepFreeze({
    ...base,
    rollbackIntentFingerprint: stableHash({
      purpose: "ugp_rollback_intent",
      descriptorFingerprint:
        input.descriptor.descriptorFingerprint,
      targetLocatorFingerprint:
        input.target.resourceLocatorFingerprint,
      originalMutationReceiptFingerprint:
        input.originalMutationReceipt.receiptFingerprint,
      restoreStateFingerprint,
    }),
  });
}

export function buildUniversalRollbackMutationRequest(input: {
  rollback: UniversalRollbackIntent;
  authorization: UniversalAuthorizationReference;
  requestedAt: string;
}): UniversalRollbackMutationRequest {
  const descriptor = input.rollback.descriptor;
  assertUniversalConnectorDescriptorIntegrity(descriptor);
  assertLocatorScope(descriptor, input.rollback.target);
  assertAuthorizationForOperation({
    authorization: input.authorization,
    capability: "rollback.change",
    target: input.rollback.target,
    operationFingerprint:
      input.rollback.rollbackIntentFingerprint,
    now: input.requestedAt,
  });
  const requestedAt = exactCanonicalTimestamp(
    input.requestedAt,
    "rollback_requested_at",
  );

  const base = {
    version: UGP_CONNECTOR_CONTRACT_VERSION,
    operation: "rollback_mutation" as const,
    descriptor,
    rollback: input.rollback,
    authorization: input.authorization,
    requestedAt,
  };
  return deepFreeze({
    ...base,
    requestFingerprint: stableHash({
      purpose: "ugp_rollback_request",
      descriptorFingerprint: descriptor.descriptorFingerprint,
      rollbackIntentFingerprint:
        input.rollback.rollbackIntentFingerprint,
      authorizationFingerprint:
        input.authorization.authorizationFingerprint,
      requestedAt,
    }),
  });
}

export function buildUniversalRollbackReceipt(input: {
  request: UniversalRollbackMutationRequest;
  providerReceiptId: string;
  reportedAt: string;
  providerStateFingerprint?: string | null;
}): UniversalRollbackReceipt {
  const providerStateFingerprint =
    input.providerStateFingerprint == null
      ? null
      : exactFingerprint(
          input.providerStateFingerprint,
          "rollback_provider_state_fingerprint",
        );
  const base = {
    version: UGP_CONNECTOR_CONTRACT_VERSION,
    operation: "rollback_mutation_receipt" as const,
    descriptorFingerprint:
      input.request.descriptor.descriptorFingerprint,
    rollbackRequestFingerprint: input.request.requestFingerprint,
    rollbackIntentFingerprint:
      input.request.rollback.rollbackIntentFingerprint,
    targetLocatorFingerprint:
      input.request.rollback.target.resourceLocatorFingerprint,
    providerReceiptId: exactPrintable(
      input.providerReceiptId,
      "rollback_provider_receipt_id",
      false,
    ) as string,
    reportedAt: exactCanonicalTimestamp(
      input.reportedAt,
      "rollback_reported_at",
    ),
    providerStateFingerprint,
    rollbackStatus: "reported_applied" as const,
    verified: false as const,
  };
  return deepFreeze({
    ...base,
    receiptFingerprint: stableHash({
      purpose: "ugp_rollback_receipt",
      ...base,
    }),
  });
}

export function buildUniversalMockReadResult(input: {
  request: UniversalReadRequest;
  stateFingerprint: string;
  observedAt: string;
}): UniversalResourceIdentity {
  return buildUniversalResourceIdentity({
    locator: input.request.target,
    stateFingerprint: exactFingerprint(
      input.stateFingerprint,
      "mock_read_state_fingerprint",
    ),
    observedAt: exactCanonicalTimestamp(
      input.observedAt,
      "mock_read_observed_at",
    ),
  });
}
