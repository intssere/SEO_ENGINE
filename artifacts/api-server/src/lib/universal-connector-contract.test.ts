import assert from "node:assert/strict";
import test from "node:test";
import {
  buildUniversalAuthorizationReference,
  buildUniversalConnectorArtifact,
  buildUniversalConnectorDescriptor,
  buildUniversalDiscoveryRequest,
  buildUniversalExecuteMutationRequest,
  buildUniversalMockReadResult,
  buildUniversalMutationIntent,
  buildUniversalMutationPreview,
  buildUniversalMutationReceipt,
  buildUniversalPreviewMutationRequest,
  buildUniversalReadRequest,
  buildUniversalRollbackIntent,
  buildUniversalRollbackMutationRequest,
  buildUniversalRollbackReceipt,
  buildUniversalVerificationResult,
  buildUniversalVerifyMutationRequest,
  type UniversalConnector,
} from "./universal-connector-contract.js";
import {
  buildUniversalCapabilityRegistry,
} from "./universal-capability-registry.js";
import {
  buildUniversalConnectionIdentity,
  buildUniversalResourceLocator,
  buildUniversalSiteIdentity,
} from "./universal-site-resource-identity.js";

const STATE_A = "a".repeat(64);
const STATE_B = "b".repeat(64);
const STATE_C = "c".repeat(64);
const AUTH_FP = "d".repeat(64);
const ISSUED_AT = "2026-09-23T12:00:00.000Z";
const REQUESTED_AT = "2026-09-23T12:05:00.000Z";
const EXPIRES_AT = "2026-09-23T12:15:00.000Z";
const REPORTED_AT = "2026-09-23T12:06:00.000Z";
const VERIFIED_AT = "2026-09-23T12:07:00.000Z";

function publicWebDescriptor() {
  const site = buildUniversalSiteIdentity({
    siteId: "public-example",
    canonicalOrigin: "https://example.com",
  });
  const registry = buildUniversalCapabilityRegistry({
    site,
    provider: "public_web",
    connectorVersion: "public-web-v1",
    capabilities: [
      {
        capability: "read.resource",
        resourceKinds: ["homepage", "page"],
        verification: "not_applicable",
        rollback: "not_applicable",
        maxOperationsPerRequest: 50,
        maxPayloadBytes: 1_000_000,
      },
      {
        capability: "read.metadata",
        resourceKinds: ["homepage", "page"],
        verification: "not_applicable",
        rollback: "not_applicable",
        maxOperationsPerRequest: 50,
        maxPayloadBytes: 250_000,
      },
    ],
  });
  return {
    site,
    descriptor: buildUniversalConnectorDescriptor({
      connectorId: "public-web-primary",
      connectorKind: "public_web",
      registry,
    }),
  };
}

function shopifyDescriptor() {
  const site = buildUniversalSiteIdentity({
    siteId: "eb1da9ee-539c-4200-8f04-f64ccaea7768",
    canonicalOrigin: "https://diamondshelf.us",
  });
  const connection = buildUniversalConnectionIdentity({
    site,
    connectionId: "shopify-primary",
    provider: "shopify",
    externalAccountId: "diamond-shelf.myshopify.com",
    connectionMode: "native_api",
  });
  const registry = buildUniversalCapabilityRegistry({
    site,
    connection,
    provider: "shopify",
    connectorVersion: "native-shopify-v1",
    credentialProfileId: "task53-write-products-profile",
    capabilities: [
      {
        capability: "read.resource",
        resourceKinds: ["product"],
        requiredProviderScopes: ["read_products"],
        verification: "not_applicable",
        rollback: "not_applicable",
        maxOperationsPerRequest: 20,
        maxPayloadBytes: 1_000_000,
      },
      {
        capability: "read.metadata",
        resourceKinds: ["product"],
        requiredProviderScopes: ["read_products"],
        verification: "not_applicable",
        rollback: "not_applicable",
        maxOperationsPerRequest: 20,
        maxPayloadBytes: 250_000,
      },
      {
        capability: "preview.change",
        resourceKinds: ["product"],
        requiredProviderScopes: ["write_products"],
        verification: "not_applicable",
        rollback: "not_applicable",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 50_000,
      },
      {
        capability: "write.meta_description",
        resourceKinds: ["product"],
        requiredProviderScopes: ["write_products"],
        verification: "required",
        rollback: "supported",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 50_000,
      },
      {
        capability: "verify.change",
        resourceKinds: ["product"],
        requiredProviderScopes: ["read_products"],
        verification: "not_applicable",
        rollback: "not_applicable",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 50_000,
      },
      {
        capability: "rollback.change",
        resourceKinds: ["product"],
        requiredProviderScopes: ["write_products"],
        verification: "supported",
        rollback: "supported",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 50_000,
      },
    ],
  });
  const descriptor = buildUniversalConnectorDescriptor({
    connectorId: "shopify-native-primary",
    connectorKind: "native_api",
    registry,
  });
  const product = buildUniversalResourceLocator({
    site,
    connection,
    provider: "shopify",
    kind: "product",
    externalId: "gid://shopify/Product/8864713441479",
    canonicalUrl:
      "https://diamondshelf.us/products/yves-saint-laurent-myslf-eau-de-parfum-spray-for-men",
  });
  return { site, connection, registry, descriptor, product };
}

function mutationFixture() {
  const context = shopifyDescriptor();
  const artifact = buildUniversalConnectorArtifact({
    schemaId: "seo.meta-description.v1",
    payload: {
      field: "meta_description",
      value: "A concise evidence-backed product description.",
    },
  });
  const mutation = buildUniversalMutationIntent({
    descriptor: context.descriptor,
    capability: "write.meta_description",
    target: context.product,
    artifact,
    expectedStateFingerprint: STATE_A,
    proposedStateFingerprint: STATE_B,
  });
  return { ...context, artifact, mutation };
}

test("UGP-1.3 builds deterministic public-web connector descriptors", () => {
  const first = publicWebDescriptor().descriptor;
  const second = publicWebDescriptor().descriptor;

  assert.deepEqual(first, second);
  assert.equal(first.connectorKind, "public_web");
  assert.equal(first.provider, "public_web");
  assert.equal(first.connectionId, null);
  assert.match(first.descriptorFingerprint, /^[0-9a-f]{64}$/);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.registry));
});

test("UGP-1.3 discovery is capability and limit bounded", () => {
  const { descriptor } = publicWebDescriptor();
  const first = buildUniversalDiscoveryRequest({
    descriptor,
    resourceKinds: ["page", "homepage"],
    maxResults: 25,
  });
  const replay = buildUniversalDiscoveryRequest({
    descriptor,
    resourceKinds: ["homepage", "page"],
    maxResults: 25,
  });

  assert.deepEqual(first, replay);
  assert.deepEqual(first.resourceKinds, ["homepage", "page"]);
  assert.equal(first.capability, "read.resource");

  assert.throws(
    () => buildUniversalDiscoveryRequest({
      descriptor,
      resourceKinds: ["page"],
      maxResults: 51,
    }),
    /ugp_connector_invalid_max_results/,
  );
});

test("UGP-1.3 read requests require exact read capability and resource scope", () => {
  const { site, descriptor } = publicWebDescriptor();
  const page = buildUniversalResourceLocator({
    site,
    provider: "public_web",
    kind: "page",
    canonicalUrl: "https://example.com/guides/test",
  });
  const request = buildUniversalReadRequest({
    descriptor,
    capability: "read.metadata",
    target: page,
  });
  assert.equal(request.operation, "read_resource");
  assert.equal(request.target.resourceLocatorFingerprint, page.resourceLocatorFingerprint);

  assert.throws(
    () => buildUniversalReadRequest({
      descriptor,
      capability: "verify.change",
      target: page,
    }),
    /ugp_connector_capability_not_available|ugp_connector_read_requires_read_capability/,
  );

  const otherSite = buildUniversalSiteIdentity({
    siteId: "other",
    canonicalOrigin: "https://other.example",
  });
  const wrongPage = buildUniversalResourceLocator({
    site: otherSite,
    provider: "public_web",
    kind: "page",
    canonicalUrl: "https://other.example/page",
  });
  assert.throws(
    () => buildUniversalReadRequest({
      descriptor,
      capability: "read.metadata",
      target: wrongPage,
    }),
    /ugp_connector_resource_site_mismatch/,
  );
});

test("UGP-1.3 connector artifacts are deterministic JSON-only values", () => {
  const first = buildUniversalConnectorArtifact({
    schemaId: "seo.meta-description.v1",
    payload: { value: "hello", count: 1, active: true },
  });
  const replay = buildUniversalConnectorArtifact({
    schemaId: "seo.meta-description.v1",
    payload: { active: true, count: 1, value: "hello" },
  });

  assert.equal(first.artifactFingerprint, replay.artifactFingerprint);
  assert.ok(first.payloadBytes > 0);
  assert.ok(Object.isFrozen(first));

  assert.throws(
    () => buildUniversalConnectorArtifact({
      schemaId: "invalid schema",
      payload: {},
    }),
    /ugp_connector_invalid_schema_id/,
  );
  assert.throws(
    () => buildUniversalConnectorArtifact({
      schemaId: "test.v1",
      payload: { value: Number.NaN },
    }),
    /ugp_connector_non_json_payload_value/,
  );
});

test("UGP-1.3 mutation intent is bounded by registry capability and state", () => {
  const { mutation, descriptor, product } = mutationFixture();

  assert.equal(mutation.capability, "write.meta_description");
  assert.equal(mutation.target.resourceLocatorFingerprint, product.resourceLocatorFingerprint);
  assert.equal(mutation.expectedStateFingerprint, STATE_A);
  assert.equal(mutation.proposedStateFingerprint, STATE_B);

  const artifact = buildUniversalConnectorArtifact({
    schemaId: "seo.meta-description.v1",
    payload: { field: "meta_description", value: "same" },
  });
  assert.throws(
    () => buildUniversalMutationIntent({
      descriptor,
      capability: "write.meta_description",
      target: product,
      artifact,
      expectedStateFingerprint: STATE_A,
      proposedStateFingerprint: STATE_A,
    }),
    /ugp_connector_mutation_state_unchanged/,
  );

  assert.throws(
    () => buildUniversalMutationIntent({
      descriptor,
      capability: "read.metadata",
      target: product,
      artifact,
      expectedStateFingerprint: STATE_A,
      proposedStateFingerprint: STATE_B,
    }),
    /ugp_connector_mutation_requires_external_mutation_capability/,
  );
});

test("UGP-1.3 preview is separate from mutation authorization", () => {
  const { mutation } = mutationFixture();
  const request = buildUniversalPreviewMutationRequest({ mutation });
  const preview = buildUniversalMutationPreview({
    request,
    summary: "Meta description will be replaced.",
    previewArtifact: buildUniversalConnectorArtifact({
      schemaId: "seo.preview.v1",
      payload: {
        before_state_fingerprint: STATE_A,
        after_state_fingerprint: STATE_B,
      },
    }),
  });

  assert.equal(request.capability, "preview.change");
  assert.equal(preview.mutationIntentFingerprint, mutation.intentFingerprint);
  assert.match(preview.previewFingerprint, /^[0-9a-f]{64}$/);
  assert.equal("authorization" in request, false);
});

test("UGP-1.3 execute mutation requires exact active caller authorization", () => {
  const { mutation, product } = mutationFixture();
  const authorization = buildUniversalAuthorizationReference({
    authorizationId: "policy-auth-123",
    authorizationFingerprint: AUTH_FP,
    authorizedCapability: "write.meta_description",
    resourceLocatorFingerprint: product.resourceLocatorFingerprint,
    operationFingerprint: mutation.intentFingerprint,
    issuedAt: ISSUED_AT,
    expiresAt: EXPIRES_AT,
  });
  const request = buildUniversalExecuteMutationRequest({
    mutation,
    authorization,
    requestedAt: REQUESTED_AT,
  });

  assert.equal(request.authorization.authorizationFingerprint, AUTH_FP);
  assert.equal(request.mutation.intentFingerprint, mutation.intentFingerprint);

  const wrongCapability = buildUniversalAuthorizationReference({
    authorizationId: "policy-auth-124",
    authorizationFingerprint: "e".repeat(64),
    authorizedCapability: "rollback.change",
    resourceLocatorFingerprint: product.resourceLocatorFingerprint,
    operationFingerprint: mutation.intentFingerprint,
    issuedAt: ISSUED_AT,
    expiresAt: EXPIRES_AT,
  });
  assert.throws(
    () => buildUniversalExecuteMutationRequest({
      mutation,
      authorization: wrongCapability,
      requestedAt: REQUESTED_AT,
    }),
    /ugp_connector_authorization_capability_mismatch/,
  );

  assert.throws(
    () => buildUniversalExecuteMutationRequest({
      mutation,
      authorization,
      requestedAt: EXPIRES_AT,
    }),
    /ugp_connector_authorization_not_active/,
  );
});

test("UGP-1.3 provider mutation receipt is explicitly not verification", () => {
  const { mutation, product } = mutationFixture();
  const authorization = buildUniversalAuthorizationReference({
    authorizationId: "policy-auth-123",
    authorizationFingerprint: AUTH_FP,
    authorizedCapability: "write.meta_description",
    resourceLocatorFingerprint: product.resourceLocatorFingerprint,
    operationFingerprint: mutation.intentFingerprint,
    issuedAt: ISSUED_AT,
    expiresAt: EXPIRES_AT,
  });
  const execute = buildUniversalExecuteMutationRequest({
    mutation,
    authorization,
    requestedAt: REQUESTED_AT,
  });
  const receipt = buildUniversalMutationReceipt({
    request: execute,
    providerReceiptId: "shopify-request-abc",
    reportedAt: REPORTED_AT,
    providerStateFingerprint: STATE_B,
  });

  assert.equal(receipt.mutationStatus, "reported_applied");
  assert.equal(receipt.verified, false);
  assert.equal(receipt.providerStateFingerprint, STATE_B);
  assert.match(receipt.receiptFingerprint, /^[0-9a-f]{64}$/);
});

test("UGP-1.3 verification is a separate exact-state result", () => {
  const { descriptor, mutation, product } = mutationFixture();
  const authorization = buildUniversalAuthorizationReference({
    authorizationId: "policy-auth-123",
    authorizationFingerprint: AUTH_FP,
    authorizedCapability: "write.meta_description",
    resourceLocatorFingerprint: product.resourceLocatorFingerprint,
    operationFingerprint: mutation.intentFingerprint,
    issuedAt: ISSUED_AT,
    expiresAt: EXPIRES_AT,
  });
  const execute = buildUniversalExecuteMutationRequest({
    mutation,
    authorization,
    requestedAt: REQUESTED_AT,
  });
  const receipt = buildUniversalMutationReceipt({
    request: execute,
    providerReceiptId: "shopify-request-abc",
    reportedAt: REPORTED_AT,
  });
  const verify = buildUniversalVerifyMutationRequest({
    descriptor,
    mutationReceipt: receipt,
    target: product,
    expectedStateFingerprint: STATE_B,
  });
  const verified = buildUniversalVerificationResult({
    request: verify,
    status: "verified",
    observedStateFingerprint: STATE_B,
    observedAt: VERIFIED_AT,
  });

  assert.equal(verified.status, "verified");
  assert.equal(verified.observedStateFingerprint, STATE_B);

  assert.throws(
    () => buildUniversalVerificationResult({
      request: verify,
      status: "verified",
      observedStateFingerprint: STATE_C,
      observedAt: VERIFIED_AT,
    }),
    /ugp_connector_verified_result_requires_exact_state/,
  );

  const mismatch = buildUniversalVerificationResult({
    request: verify,
    status: "mismatch",
    observedStateFingerprint: STATE_C,
    observedAt: VERIFIED_AT,
  });
  assert.equal(mismatch.status, "mismatch");

  const unavailable = buildUniversalVerificationResult({
    request: verify,
    status: "unavailable",
  });
  assert.equal(unavailable.observedStateFingerprint, null);
});

test("UGP-1.3 rollback requires its own bounded authorization", () => {
  const { descriptor, mutation, product } = mutationFixture();
  const executeAuthorization = buildUniversalAuthorizationReference({
    authorizationId: "policy-auth-123",
    authorizationFingerprint: AUTH_FP,
    authorizedCapability: "write.meta_description",
    resourceLocatorFingerprint: product.resourceLocatorFingerprint,
    operationFingerprint: mutation.intentFingerprint,
    issuedAt: ISSUED_AT,
    expiresAt: EXPIRES_AT,
  });
  const execute = buildUniversalExecuteMutationRequest({
    mutation,
    authorization: executeAuthorization,
    requestedAt: REQUESTED_AT,
  });
  const receipt = buildUniversalMutationReceipt({
    request: execute,
    providerReceiptId: "shopify-request-abc",
    reportedAt: REPORTED_AT,
  });
  const rollback = buildUniversalRollbackIntent({
    descriptor,
    target: product,
    originalMutationReceipt: receipt,
    restoreStateFingerprint: STATE_A,
  });
  const rollbackAuthorization = buildUniversalAuthorizationReference({
    authorizationId: "rollback-auth-123",
    authorizationFingerprint: "f".repeat(64),
    authorizedCapability: "rollback.change",
    resourceLocatorFingerprint: product.resourceLocatorFingerprint,
    operationFingerprint: rollback.rollbackIntentFingerprint,
    issuedAt: ISSUED_AT,
    expiresAt: EXPIRES_AT,
  });
  const request = buildUniversalRollbackMutationRequest({
    rollback,
    authorization: rollbackAuthorization,
    requestedAt: REQUESTED_AT,
  });
  const rollbackReceipt = buildUniversalRollbackReceipt({
    request,
    providerReceiptId: "shopify-rollback-abc",
    reportedAt: REPORTED_AT,
    providerStateFingerprint: STATE_A,
  });

  assert.equal(rollbackReceipt.rollbackStatus, "reported_applied");
  assert.equal(rollbackReceipt.verified, false);

  assert.throws(
    () => buildUniversalRollbackMutationRequest({
      rollback,
      authorization: executeAuthorization,
      requestedAt: REQUESTED_AT,
    }),
    /ugp_connector_authorization_capability_mismatch/,
  );
});

test("UGP-1.3 pure mock connector can satisfy the bounded contract", async () => {
  const { descriptor, mutation, product } = mutationFixture();
  const readRequest = buildUniversalReadRequest({
    descriptor,
    capability: "read.metadata",
    target: product,
  });
  const previewRequest = buildUniversalPreviewMutationRequest({ mutation });
  const executeAuthorization = buildUniversalAuthorizationReference({
    authorizationId: "policy-auth-123",
    authorizationFingerprint: AUTH_FP,
    authorizedCapability: "write.meta_description",
    resourceLocatorFingerprint: product.resourceLocatorFingerprint,
    operationFingerprint: mutation.intentFingerprint,
    issuedAt: ISSUED_AT,
    expiresAt: EXPIRES_AT,
  });
  const executeRequest = buildUniversalExecuteMutationRequest({
    mutation,
    authorization: executeAuthorization,
    requestedAt: REQUESTED_AT,
  });

  const mock: UniversalConnector = {
    descriptor,
    async discoverResources() {
      return [product];
    },
    async readResource(request) {
      return buildUniversalMockReadResult({
        request,
        stateFingerprint: STATE_A,
        observedAt: ISSUED_AT,
      });
    },
    async previewMutation(request) {
      return buildUniversalMutationPreview({
        request,
        summary: "Mock preview",
      });
    },
    async executeMutation(request) {
      return buildUniversalMutationReceipt({
        request,
        providerReceiptId: "mock-receipt",
        reportedAt: REPORTED_AT,
      });
    },
    async verifyMutation(request) {
      return buildUniversalVerificationResult({
        request,
        status: "verified",
        observedStateFingerprint: STATE_B,
        observedAt: VERIFIED_AT,
      });
    },
    async rollbackMutation(request) {
      return buildUniversalRollbackReceipt({
        request,
        providerReceiptId: "mock-rollback",
        reportedAt: VERIFIED_AT,
        providerStateFingerprint: STATE_A,
      });
    },
  };

  const read = await mock.readResource(readRequest);
  assert.equal(read.stateFingerprint, STATE_A);

  const preview = await mock.previewMutation(previewRequest);
  assert.equal(preview.summary, "Mock preview");

  const receipt = await mock.executeMutation(executeRequest);
  assert.equal(receipt.verified, false);

  const verifyRequest = buildUniversalVerifyMutationRequest({
    descriptor,
    mutationReceipt: receipt,
    target: product,
    expectedStateFingerprint: STATE_B,
  });
  const verification = await mock.verifyMutation(verifyRequest);
  assert.equal(verification.status, "verified");

  const rollback = buildUniversalRollbackIntent({
    descriptor,
    target: product,
    originalMutationReceipt: receipt,
    restoreStateFingerprint: STATE_A,
  });
  const rollbackAuthorization = buildUniversalAuthorizationReference({
    authorizationId: "rollback-auth-123",
    authorizationFingerprint: "f".repeat(64),
    authorizedCapability: "rollback.change",
    resourceLocatorFingerprint: product.resourceLocatorFingerprint,
    operationFingerprint: rollback.rollbackIntentFingerprint,
    issuedAt: ISSUED_AT,
    expiresAt: EXPIRES_AT,
  });
  const rollbackRequest = buildUniversalRollbackMutationRequest({
    rollback,
    authorization: rollbackAuthorization,
    requestedAt: REQUESTED_AT,
  });
  const rollbackReceipt = await mock.rollbackMutation(rollbackRequest);
  assert.equal(rollbackReceipt.verified, false);
});

test("UGP-1.3 mock read result remains a UGP-1.1 resource identity", () => {
  const { descriptor, product } = shopifyDescriptor();
  const request = buildUniversalReadRequest({
    descriptor,
    capability: "read.resource",
    target: product,
  });
  const result = buildUniversalMockReadResult({
    request,
    stateFingerprint: STATE_A,
    observedAt: ISSUED_AT,
  });

  assert.equal(result.locator.resourceLocatorFingerprint, product.resourceLocatorFingerprint);
  assert.equal(result.stateFingerprint, STATE_A);
  assert.ok(Object.isFrozen(result));
});
