import { createHash } from "node:crypto";
import { executionStateFingerprint, type AuthorizationEnvelope, type ExecutableField } from "./execution-foundation.js";

export const task52OperatorStates = [
  "write_blocked",
  "execution_ready",
  "verification_pending",
  "verified",
  "verification_failed",
  "rollback_ready",
  "rollback_verified",
  "manual_intervention_required",
] as const;
export type Task52OperatorState = typeof task52OperatorStates[number];

export type ShopifyWritableResourceKind = "product" | "collection" | "page";
export type ShopifyWriteMode = "dry_run" | "live";

export type ShopifyProviderResource = {
  kind: ShopifyWritableResourceKind;
  gid: string;
};

export type ShopifyMutationRequest = {
  version: "shopify_write_connector_v1";
  provider: "shopify";
  mode: ShopifyWriteMode;
  method: "POST";
  path: "/admin/api/2025-10/graphql.json";
  operation: "seo_field_update";
  actionId: string;
  planId: string;
  resource: ShopifyProviderResource;
  field: ExecutableField;
  value: string | null;
  expectedCurrentFingerprint: string;
  authorizationFingerprint: string;
  idempotencyKey: string;
  graphql: {
    operationName: string;
    query: string;
    variables: Record<string, unknown>;
  };
  requestFingerprint: string;
};

export type ShopifyMutationReceipt = {
  provider: "shopify";
  mode: ShopifyWriteMode;
  requestFingerprint: string;
  idempotencyKey: string;
  status: "simulated" | "accepted" | "failed";
  providerReference: string | null;
  httpStatus: number | null;
  errorCategory: string | null;
  publicWriteOccurred: boolean;
};

export type VerificationOutcome = {
  status: "passed" | "failed";
  expectedValue: string | null;
  observedValue: string | null;
  expectedFingerprint: string;
  observedFingerprint: string;
  matched: boolean;
};

export type ProviderWriteAuthorizationInput = {
  actionId: string;
  envelope: AuthorizationEnvelope;
  executionConfirmation: string;
  publicSiteWritesEnabled: boolean;
  providerConnectionWritable: boolean;
  priorDeploymentCount: number;
  now: string;
  mode: ShopifyWriteMode;
};

export type ProviderWriteAuthorization =
  | { ok: true; providerWriteAllowed: boolean; dispatchAllowed: boolean; state: "execution_ready"; reason: null }
  | { ok: false; providerWriteAllowed: false; dispatchAllowed: false; state: "write_blocked"; reason: string };

export type DryRunInput = {
  actionId: string;
  envelope: AuthorizationEnvelope;
  providerResource: ShopifyProviderResource;
  executionConfirmation: string;
  observedAfterWrite?: string | null;
  observedAfterRollback?: string | null;
  providerFailure?: { httpStatus?: number | null; code?: string | null } | null;
  now: string;
};

export type DryRunResult = {
  mode: "dry_run";
  providerDispatchAttempted: false;
  publicWriteOccurred: false;
  mutationRequest: ShopifyMutationRequest;
  mutationReceipt: ShopifyMutationReceipt;
  verification: VerificationOutcome;
  rollbackRequest: ShopifyMutationRequest | null;
  rollbackVerification: VerificationOutcome | null;
  operatorStates: Task52OperatorState[];
  finalState: Task52OperatorState;
  persistence: Task52PersistenceContract;
};

export type Task52PersistenceContract = {
  action: {
    id: string;
    status: "pending" | "executing" | "completed" | "failed" | "rolled_back";
    beforeState: { field: ExecutableField; value: string | null; fingerprint: string };
    expectedAfterState: { field: ExecutableField; value: string | null; fingerprint: string };
    operatorState: Task52OperatorState;
  };
  deployment: {
    provider: "shopify";
    providerReference: string | null;
    status: "pending" | "deployed" | "failed" | "rolled_back";
    requestPayload: Record<string, unknown>;
    responsePayload: Record<string, unknown>;
  };
  verifications: Array<{
    verificationType: "read_after_write" | "rollback_read_after_write";
    status: "pending" | "passed" | "failed";
    expected: Record<string, unknown>;
    observed: Record<string, unknown>;
  }>;
};

const normalize = (value: string | null | undefined) => value == null ? null : value.replace(/\s+/g, " ").trim();
const hash = (value: unknown) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");

function resourceInput(resource: ShopifyProviderResource, field: ExecutableField, value: string | null) {
  const seo = field === "title" ? { title: normalize(value) } : { description: normalize(value) };
  if (resource.kind === "product") {
    return {
      operationName: "SeoEngineTask52ProductUpdate",
      query: "mutation SeoEngineTask52ProductUpdate($product: ProductUpdateInput!) { productUpdate(product: $product) { product { id seo { title description } } userErrors { field message } } }",
      variables: { product: { id: resource.gid, seo } },
    };
  }
  if (resource.kind === "collection") {
    return {
      operationName: "SeoEngineTask52CollectionUpdate",
      query: "mutation SeoEngineTask52CollectionUpdate($input: CollectionInput!) { collectionUpdate(input: $input) { collection { id seo { title description } } userErrors { field message } } }",
      variables: { input: { id: resource.gid, seo } },
    };
  }
  return {
    operationName: "SeoEngineTask52PageUpdate",
    query: "mutation SeoEngineTask52PageUpdate($page: PageUpdateInput!) { pageUpdate(page: $page) { page { id seo { title description } } userErrors { field message } } }",
    variables: { page: { id: resource.gid, seo } },
  };
}

function validShopifyGid(resource: ShopifyProviderResource) {
  const expected = resource.kind === "product" ? "Product" : resource.kind === "collection" ? "Collection" : "OnlineStorePage";
  return new RegExp(`^gid://shopify/${expected}/[0-9]+$`).test(resource.gid);
}

function ensureRequestIdentity(actionId: string, envelope: AuthorizationEnvelope, resource: ShopifyProviderResource) {
  if (!actionId) throw new Error("task52_action_identity_missing");
  if (!envelope.envelopeFingerprint || !envelope.planId) throw new Error("task52_authorization_identity_missing");
  if (!validShopifyGid(resource)) throw new Error("task52_shopify_resource_invalid");
}

export function evaluateProviderWriteAuthorization(input: ProviderWriteAuthorizationInput): ProviderWriteAuthorization {
  const now = Date.parse(input.now);
  const expiresAt = Date.parse(input.envelope.authorization.expiresAt);
  if (!Number.isFinite(now) || !Number.isFinite(expiresAt) || now >= expiresAt) {
    return { ok: false, providerWriteAllowed: false, dispatchAllowed: false, state: "write_blocked", reason: "authorization_expired_or_invalid" };
  }
  if (!input.envelope.authorization.executionAuthorized) {
    return { ok: false, providerWriteAllowed: false, dispatchAllowed: false, state: "write_blocked", reason: "execution_not_authorized" };
  }
  if (input.executionConfirmation !== `EXECUTE:${input.actionId}:${input.envelope.envelopeFingerprint}`) {
    return { ok: false, providerWriteAllowed: false, dispatchAllowed: false, state: "write_blocked", reason: "explicit_provider_execution_confirmation_required" };
  }
  if (input.priorDeploymentCount > 0) {
    return { ok: false, providerWriteAllowed: false, dispatchAllowed: false, state: "write_blocked", reason: "duplicate_provider_execution_blocked" };
  }
  if (input.mode === "live" && !input.publicSiteWritesEnabled) {
    return { ok: false, providerWriteAllowed: false, dispatchAllowed: false, state: "write_blocked", reason: "public_site_write_gate_disabled" };
  }
  if (input.mode === "live" && !input.providerConnectionWritable) {
    return { ok: false, providerWriteAllowed: false, dispatchAllowed: false, state: "write_blocked", reason: "shopify_connection_not_write_capable" };
  }
  return {
    ok: true,
    providerWriteAllowed: input.mode === "live",
    dispatchAllowed: input.mode === "live",
    state: "execution_ready",
    reason: null,
  };
}

export function buildShopifyMutationRequest(input: {
  actionId: string;
  envelope: AuthorizationEnvelope;
  providerResource: ShopifyProviderResource;
  mode: ShopifyWriteMode;
  value?: string | null;
  purpose?: "forward" | "rollback";
}): ShopifyMutationRequest {
  ensureRequestIdentity(input.actionId, input.envelope, input.providerResource);
  const purpose = input.purpose ?? "forward";
  const value = normalize(input.value === undefined
    ? (purpose === "rollback" ? input.envelope.rollback.value : input.envelope.proposedState.value)
    : input.value);
  const graphql = resourceInput(input.providerResource, input.envelope.target.field, value);
  const identity = {
    version: "shopify_write_connector_v1",
    actionId: input.actionId,
    planId: input.envelope.planId,
    resource: input.providerResource,
    field: input.envelope.target.field,
    value,
    expectedCurrentFingerprint: purpose === "rollback"
      ? input.envelope.proposedState.fingerprint
      : input.envelope.expectedCurrentState.fingerprint,
    authorizationFingerprint: input.envelope.envelopeFingerprint,
    purpose,
  };
  const requestFingerprint = hash(identity);
  return {
    version: "shopify_write_connector_v1",
    provider: "shopify",
    mode: input.mode,
    method: "POST",
    path: "/admin/api/2025-10/graphql.json",
    operation: "seo_field_update",
    actionId: input.actionId,
    planId: input.envelope.planId,
    resource: input.providerResource,
    field: input.envelope.target.field,
    value,
    expectedCurrentFingerprint: identity.expectedCurrentFingerprint,
    authorizationFingerprint: input.envelope.envelopeFingerprint,
    idempotencyKey: `seo-engine:${input.actionId}:${purpose}:${requestFingerprint.slice(0, 24)}`,
    graphql,
    requestFingerprint,
  };
}

export function classifyShopifyProviderError(input: { httpStatus?: number | null; code?: string | null; networkError?: boolean; timeout?: boolean }): string {
  if (input.timeout) return "provider_timeout";
  if (input.networkError) return "provider_network_error";
  const status = input.httpStatus ?? null;
  if (status === 400) return "provider_invalid_request";
  if (status === 401) return "provider_authentication_error";
  if (status === 403) return "provider_permission_denied";
  if (status === 404) return "provider_resource_not_found";
  if (status === 409) return "provider_conflict";
  if (status === 422) return "provider_validation_error";
  if (status === 429) return "provider_rate_limited";
  if (status !== null && status >= 500) return "provider_unavailable";
  if (input.code) return `provider_${input.code.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "error"}`;
  return "provider_error";
}

export function verifyExecutionState(field: ExecutableField, expectedValue: string | null, observedValue: string | null): VerificationOutcome {
  const expected = normalize(expectedValue);
  const observed = normalize(observedValue);
  const expectedFingerprint = executionStateFingerprint(field, expected);
  const observedFingerprint = executionStateFingerprint(field, observed);
  const matched = expectedFingerprint === observedFingerprint;
  return { status: matched ? "passed" : "failed", expectedValue: expected, observedValue: observed, expectedFingerprint, observedFingerprint, matched };
}

export function buildRollbackRequest(input: {
  actionId: string;
  envelope: AuthorizationEnvelope;
  providerResource: ShopifyProviderResource;
  mode: ShopifyWriteMode;
}) {
  return buildShopifyMutationRequest({ ...input, value: input.envelope.rollback.value, purpose: "rollback" });
}

export function deriveTask52OperatorState(input: {
  actionStatus: string;
  deploymentStatus?: string | null;
  verificationStatus?: string | null;
  rollbackVerificationStatus?: string | null;
  rollbackEligible?: boolean;
  publicSiteWrites?: boolean;
  publicWriteOccurred?: boolean;
}): Task52OperatorState {
  if (input.rollbackVerificationStatus === "passed") return "rollback_verified";
  if (input.actionStatus === "failed" && !input.rollbackEligible) return "manual_intervention_required";
  if (input.verificationStatus === "failed" && input.rollbackEligible) return "rollback_ready";
  if (input.verificationStatus === "failed") return "verification_failed";
  if (input.verificationStatus === "passed") return "verified";
  if (input.deploymentStatus === "deployed" || input.publicWriteOccurred) return "verification_pending";
  if (input.publicSiteWrites === false) return "write_blocked";
  return "execution_ready";
}

function persistenceContract(input: {
  actionId: string;
  envelope: AuthorizationEnvelope;
  mutationRequest: ShopifyMutationRequest;
  mutationReceipt: ShopifyMutationReceipt;
  verification: VerificationOutcome;
  rollbackRequest: ShopifyMutationRequest | null;
  rollbackVerification: VerificationOutcome | null;
  finalState: Task52OperatorState;
}): Task52PersistenceContract {
  const rollbackComplete = input.rollbackVerification?.status === "passed";
  const failed = input.mutationReceipt.status === "failed" || input.finalState === "manual_intervention_required";
  const actionStatus = rollbackComplete ? "rolled_back" : failed ? "failed" : input.verification.status === "passed" ? "completed" : "executing";
  const deploymentStatus = rollbackComplete ? "rolled_back" : input.mutationReceipt.status === "failed" ? "failed" : input.mutationReceipt.status === "accepted" ? "deployed" : "pending";
  const verifications: Task52PersistenceContract["verifications"] = [{
    verificationType: "read_after_write",
    status: input.mutationReceipt.status === "failed" ? "failed" : input.verification.status,
    expected: { field: input.envelope.target.field, value: input.verification.expectedValue, fingerprint: input.verification.expectedFingerprint },
    observed: { value: input.verification.observedValue, fingerprint: input.verification.observedFingerprint, simulated: true },
  }];
  if (input.rollbackRequest && input.rollbackVerification) {
    verifications.push({
      verificationType: "rollback_read_after_write",
      status: input.rollbackVerification.status,
      expected: { field: input.envelope.target.field, value: input.rollbackVerification.expectedValue, fingerprint: input.rollbackVerification.expectedFingerprint },
      observed: { value: input.rollbackVerification.observedValue, fingerprint: input.rollbackVerification.observedFingerprint, simulated: true },
    });
  }
  return {
    action: {
      id: input.actionId,
      status: actionStatus,
      beforeState: { field: input.envelope.target.field, value: input.envelope.expectedCurrentState.value, fingerprint: input.envelope.expectedCurrentState.fingerprint },
      expectedAfterState: { field: input.envelope.target.field, value: input.envelope.proposedState.value, fingerprint: input.envelope.proposedState.fingerprint },
      operatorState: input.finalState,
    },
    deployment: {
      provider: "shopify",
      providerReference: input.mutationReceipt.providerReference,
      status: deploymentStatus,
      requestPayload: { request: input.mutationRequest, rollbackRequest: input.rollbackRequest, dryRun: true },
      responsePayload: { receipt: input.mutationReceipt, publicWriteOccurred: false, simulated: true },
    },
    verifications,
  };
}

export function runShopifyWriteDryRun(input: DryRunInput): DryRunResult {
  const authorization = evaluateProviderWriteAuthorization({
    actionId: input.actionId,
    envelope: input.envelope,
    executionConfirmation: input.executionConfirmation,
    publicSiteWritesEnabled: false,
    providerConnectionWritable: false,
    priorDeploymentCount: 0,
    now: input.now,
    mode: "dry_run",
  });
  if (!authorization.ok) throw new Error(authorization.reason);

  const mutationRequest = buildShopifyMutationRequest({
    actionId: input.actionId,
    envelope: input.envelope,
    providerResource: input.providerResource,
    mode: "dry_run",
  });
  const providerFailure = input.providerFailure ? classifyShopifyProviderError(input.providerFailure) : null;
  const mutationReceipt: ShopifyMutationReceipt = {
    provider: "shopify",
    mode: "dry_run",
    requestFingerprint: mutationRequest.requestFingerprint,
    idempotencyKey: mutationRequest.idempotencyKey,
    status: providerFailure ? "failed" : "simulated",
    providerReference: null,
    httpStatus: input.providerFailure?.httpStatus ?? null,
    errorCategory: providerFailure,
    publicWriteOccurred: false,
  };

  const operatorStates: Task52OperatorState[] = ["execution_ready"];
  if (providerFailure) {
    operatorStates.push("manual_intervention_required");
    const verification = verifyExecutionState(input.envelope.target.field, input.envelope.proposedState.value, input.envelope.expectedCurrentState.value);
    const finalState: Task52OperatorState = "manual_intervention_required";
    return {
      mode: "dry_run",
      providerDispatchAttempted: false,
      publicWriteOccurred: false,
      mutationRequest,
      mutationReceipt,
      verification,
      rollbackRequest: null,
      rollbackVerification: null,
      operatorStates,
      finalState,
      persistence: persistenceContract({ actionId: input.actionId, envelope: input.envelope, mutationRequest, mutationReceipt, verification, rollbackRequest: null, rollbackVerification: null, finalState }),
    };
  }

  operatorStates.push("verification_pending");
  const observedAfterWrite = input.observedAfterWrite === undefined ? input.envelope.proposedState.value : input.observedAfterWrite;
  const verification = verifyExecutionState(input.envelope.target.field, input.envelope.proposedState.value, observedAfterWrite);
  if (verification.matched) {
    operatorStates.push("verified");
    const finalState: Task52OperatorState = "verified";
    return {
      mode: "dry_run",
      providerDispatchAttempted: false,
      publicWriteOccurred: false,
      mutationRequest,
      mutationReceipt,
      verification,
      rollbackRequest: null,
      rollbackVerification: null,
      operatorStates,
      finalState,
      persistence: persistenceContract({ actionId: input.actionId, envelope: input.envelope, mutationRequest, mutationReceipt, verification, rollbackRequest: null, rollbackVerification: null, finalState }),
    };
  }

  operatorStates.push("verification_failed", "rollback_ready");
  const rollbackRequest = buildRollbackRequest({ actionId: input.actionId, envelope: input.envelope, providerResource: input.providerResource, mode: "dry_run" });
  const observedAfterRollback = input.observedAfterRollback === undefined ? input.envelope.rollback.value : input.observedAfterRollback;
  const rollbackVerification = verifyExecutionState(input.envelope.target.field, input.envelope.rollback.value, observedAfterRollback);
  const finalState: Task52OperatorState = rollbackVerification.matched ? "rollback_verified" : "manual_intervention_required";
  operatorStates.push(finalState);
  return {
    mode: "dry_run",
    providerDispatchAttempted: false,
    publicWriteOccurred: false,
    mutationRequest,
    mutationReceipt,
    verification,
    rollbackRequest,
    rollbackVerification,
    operatorStates,
    finalState,
    persistence: persistenceContract({ actionId: input.actionId, envelope: input.envelope, mutationRequest, mutationReceipt, verification, rollbackRequest, rollbackVerification, finalState }),
  };
}
