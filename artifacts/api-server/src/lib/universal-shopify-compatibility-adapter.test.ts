import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateExecutionAuthorization,
  executionStateFingerprint,
  type AuthorizationEnvelope,
} from "./execution-foundation.js";
import {
  TASK53_RESOURCE_RESOLVER_API_VERSION,
  TASK53_RESOURCE_RESOLVER_REQUIRED_SCOPE,
  TASK53_RESOURCE_RESOLVER_VERSION,
  type Task53ResolverResult,
} from "./task53-resource-resolver.js";
import {
  TASK53_REQUIRED_WRITE_SCOPE,
  TASK53_SHOPIFY_API_VERSION,
  TASK53_VERSION,
  type Task53ProviderState,
} from "./task53-production-pilot.js";
import {
  findUniversalCapability,
} from "./universal-capability-registry.js";
import {
  SHOPIFY_TASK53_PRODUCTION_API_VERSION,
  SHOPIFY_TASK53_PRODUCTION_VERSION,
  SHOPIFY_TASK53_READ_ONLY_API_VERSION,
  SHOPIFY_TASK53_READ_ONLY_VERSION,
  SHOPIFY_TASK53_READ_SCOPE,
  SHOPIFY_TASK53_WRITE_SCOPE,
  buildTask53ProductionShopifyCompatibilityAdapter,
  buildTask53ReadOnlyShopifyCompatibilityAdapter,
  mapShopifyResourceToUniversalLocator,
  projectTask53AuthorizedMutation,
  projectTask53ProviderState,
  projectTask53ResolverResult,
  shopifyFieldToUniversalCapability,
} from "./universal-shopify-compatibility-adapter.js";

const SITE_ID = "eb1da9ee-539c-4200-8f04-f64ccaea7768";
const ORIGIN = "https://diamondshelf.us";
const SHOP_DOMAIN = "vcuxm7-76.myshopify.com";
const OBSERVED_AT = "2026-09-23T12:30:00.000Z";

function readOnlyAdapter() {
  return buildTask53ReadOnlyShopifyCompatibilityAdapter({
    siteId: SITE_ID,
    canonicalOrigin: ORIGIN,
    connectionId: "shopify-read-only-primary",
    shopDomain: SHOP_DOMAIN,
    credentialProfileId: "ordinary-read-only-shopify",
    connectorId: "shopify-task53-read-only",
  });
}

function productionAdapter() {
  return buildTask53ProductionShopifyCompatibilityAdapter({
    siteId: SITE_ID,
    canonicalOrigin: ORIGIN,
    connectionId: "shopify-task53-write-primary",
    shopDomain: SHOP_DOMAIN,
    credentialProfileId: "task53-write-products-profile",
    connectorId: "shopify-task53-production-pilot",
  });
}

function approvedEnvelope(
  field: "title" | "meta_description" = "meta_description",
): AuthorizationEnvelope {
  const result = evaluateExecutionAuthorization({
    planId: "11111111-1111-4111-8111-111111111111",
    pageId: "22222222-2222-4222-8222-222222222222",
    pageUrl: "https://diamondshelf.us/products/example-product",
    actionType:
      field === "title"
        ? "update_seo_title"
        : "update_meta_description",
    field,
    beforeValue:
      field === "title"
        ? "Old title"
        : "Old description",
    afterValue:
      field === "title"
        ? "New title"
        : "New description",
    currentValue:
      field === "title"
        ? "Old title"
        : "Old description",
    supportingEvidenceIds: [
      "33333333-3333-4333-8333-333333333333",
      "44444444-4444-4444-8444-444444444444",
    ],
    persistedEvidenceCount: 2,
    proposalFingerprint: "proposal-fingerprint",
    lifecycle: "approved_proposal",
    approvalDecision: "approved",
    approvedAt: "2026-09-23T12:00:00.000Z",
    qualityEligible: true,
    riskClassification: "low",
    priorActionCount: 0,
    publicSiteWritesEnabled: false,
    now: "2026-09-23T12:05:00.000Z",
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.reason);
  return result.envelope;
}

test("UGP-1.4 pins compatibility constants to the existing Shopify contracts", () => {
  assert.equal(
    SHOPIFY_TASK53_READ_ONLY_VERSION,
    TASK53_RESOURCE_RESOLVER_VERSION,
  );
  assert.equal(
    SHOPIFY_TASK53_READ_ONLY_API_VERSION,
    TASK53_RESOURCE_RESOLVER_API_VERSION,
  );
  assert.equal(
    SHOPIFY_TASK53_READ_SCOPE,
    TASK53_RESOURCE_RESOLVER_REQUIRED_SCOPE,
  );
  assert.equal(
    SHOPIFY_TASK53_PRODUCTION_VERSION,
    TASK53_VERSION,
  );
  assert.equal(
    SHOPIFY_TASK53_PRODUCTION_API_VERSION,
    TASK53_SHOPIFY_API_VERSION,
  );
  assert.equal(
    SHOPIFY_TASK53_WRITE_SCOPE,
    TASK53_REQUIRED_WRITE_SCOPE,
  );
});

test("UGP-1.4 read-only adapter is deterministic and advertises no mutation capability", () => {
  const first = readOnlyAdapter();
  const replay = readOnlyAdapter();

  assert.deepEqual(first, replay);
  assert.equal(first.profile, "task53_read_only");
  assert.equal(first.descriptor.provider, "shopify");
  assert.equal(first.connection.externalAccountId, SHOP_DOMAIN);
  assert.equal(first.adminApiVersion, "2026-07");
  assert.deepEqual(
    first.supportedLiveResourceKinds,
    ["product", "collection"],
  );
  assert.equal(
    findUniversalCapability(
      first.descriptor.registry,
      "read.resource",
      "product",
    )?.requiredProviderScopes[0],
    "read_products",
  );
  assert.equal(
    findUniversalCapability(
      first.descriptor.registry,
      "write.meta_description",
      "product",
    ),
    null,
  );
  assert.deepEqual(first.authority, {
    compatibilityOnly: true,
    grantsExecutionAuthorization: false,
    grantsProviderWrite: false,
    grantsPublicSiteWrite: false,
    producesUniversalExecuteRequest: false,
    preservesExistingShopifyGates: true,
  });
  assert.equal(
    first.descriptor.registry.semantics.grantsAuthorization,
    false,
  );
  assert.equal(
    first.descriptor.registry.semantics.grantsProviderWrite,
    false,
  );
});

test("UGP-1.4 production profile mirrors Task53 Product/Collection capability without adding Page live authority", () => {
  const adapter = productionAdapter();

  assert.equal(adapter.profile, "task53_production_pilot");
  assert.equal(adapter.adminApiVersion, "2025-10");
  assert.deepEqual(
    adapter.supportedLiveResourceKinds,
    ["product", "collection"],
  );

  for (const kind of ["product", "collection"] as const) {
    assert.ok(
      findUniversalCapability(
        adapter.descriptor.registry,
        "write.seo_title",
        kind,
      ),
    );
    assert.ok(
      findUniversalCapability(
        adapter.descriptor.registry,
        "write.meta_description",
        kind,
      ),
    );
    assert.ok(
      findUniversalCapability(
        adapter.descriptor.registry,
        "verify.change",
        kind,
      ),
    );
    assert.ok(
      findUniversalCapability(
        adapter.descriptor.registry,
        "rollback.change",
        kind,
      ),
    );
  }

  assert.equal(
    findUniversalCapability(
      adapter.descriptor.registry,
      "write.meta_description",
      "page",
    ),
    null,
  );
  assert.equal(
    adapter.descriptor.registry.semantics.grantsPublicSiteWrite,
    false,
  );
  assert.equal(
    adapter.descriptor.registry.semantics.automaticTransition,
    false,
  );
});

test("UGP-1.4 maps Product, Collection, and OnlineStorePage identities losslessly", () => {
  const adapter = productionAdapter();
  const cases = [
    {
      resource: {
        kind: "product" as const,
        gid: "gid://shopify/Product/8864713441479",
      },
      url: "https://diamondshelf.us/products/example-product",
    },
    {
      resource: {
        kind: "collection" as const,
        gid: "gid://shopify/Collection/123456789",
      },
      url: "https://diamondshelf.us/collections/fragrance",
    },
    {
      resource: {
        kind: "page" as const,
        gid: "gid://shopify/OnlineStorePage/987654321",
      },
      url: "https://diamondshelf.us/pages/about-us",
    },
  ];

  for (const item of cases) {
    const locator = mapShopifyResourceToUniversalLocator({
      adapter,
      resource: item.resource,
      canonicalUrl: item.url,
    });
    assert.equal(locator.kind, item.resource.kind);
    assert.equal(locator.externalId, item.resource.gid);
    assert.equal(locator.canonicalUrl, item.url);
    assert.equal(locator.provider, "shopify");
    assert.equal(
      locator.connectionIdentityFingerprint,
      adapter.connection.connectionIdentityFingerprint,
    );
  }
});

test("UGP-1.4 rejects Shopify GID-kind and canonical URL-kind mismatches", () => {
  const adapter = productionAdapter();

  assert.throws(
    () => mapShopifyResourceToUniversalLocator({
      adapter,
      resource: {
        kind: "product",
        gid: "gid://shopify/Collection/123",
      },
      canonicalUrl: "https://diamondshelf.us/products/example",
    }),
    /ugp_shopify_resource_identity_invalid/,
  );

  assert.throws(
    () => mapShopifyResourceToUniversalLocator({
      adapter,
      resource: {
        kind: "product",
        gid: "gid://shopify/Product/123",
      },
      canonicalUrl: "https://diamondshelf.us/collections/example",
    }),
    /ugp_shopify_resource_url_kind_mismatch/,
  );

  assert.throws(
    () => mapShopifyResourceToUniversalLocator({
      adapter,
      resource: {
        kind: "page",
        gid: "gid://shopify/OnlineStorePage/123",
      },
      canonicalUrl: "https://other.example/pages/about",
    }),
    /ugp_shopify_resource_url_kind_mismatch/,
  );
});

test("UGP-1.4 projects current Task53 read-only resolver state without write authority", () => {
  const adapter = readOnlyAdapter();
  const result: Task53ResolverResult = {
    version: TASK53_RESOURCE_RESOLVER_VERSION,
    mode: "read_only",
    admin_api_version: TASK53_RESOURCE_RESOLVER_API_VERSION,
    provider: "shopify",
    required_scope: TASK53_RESOURCE_RESOLVER_REQUIRED_SCOPE,
    provider_write_dispatch_enabled: false,
    database_mutations: 0,
    target_url:
      "https://diamondshelf.us/collections/home-fragrance",
    resource: {
      kind: "collection",
      handle: "home-fragrance",
      gid: "gid://shopify/Collection/123456789",
    },
    seo: {
      title: "Home Fragrance",
      description: null,
    },
    provider_request_id: "resolver-request-123",
  };

  const first = projectTask53ResolverResult({
    adapter,
    result,
    observedAt: OBSERVED_AT,
  });
  const replay = projectTask53ResolverResult({
    adapter,
    result,
    observedAt: OBSERVED_AT,
  });

  assert.deepEqual(first, replay);
  assert.equal(
    first.locator.externalId,
    "gid://shopify/Collection/123456789",
  );
  assert.equal(first.locator.canonicalUrl, result.target_url);
  assert.match(first.identity.stateFingerprint, /^[0-9a-f]{64}$/);
  assert.deepEqual(first.artifact.payload, {
    version: result.version,
    mode: result.mode,
    admin_api_version: result.admin_api_version,
    provider: result.provider,
    required_scope: result.required_scope,
    provider_write_dispatch_enabled: false,
    database_mutations: 0,
    target_url: result.target_url,
    resource: {
      kind: "collection",
      handle: "home-fragrance",
      gid: "gid://shopify/Collection/123456789",
    },
    seo: {
      title: "Home Fragrance",
      description: null,
    },
    provider_request_id: "resolver-request-123",
  });
  assert.equal(adapter.authority.grantsProviderWrite, false);
});

test("UGP-1.4 fails closed if read-only resolver semantics claim a write or DB mutation", () => {
  const adapter = readOnlyAdapter();
  const base: Task53ResolverResult = {
    version: TASK53_RESOURCE_RESOLVER_VERSION,
    mode: "read_only",
    admin_api_version: TASK53_RESOURCE_RESOLVER_API_VERSION,
    provider: "shopify",
    required_scope: TASK53_RESOURCE_RESOLVER_REQUIRED_SCOPE,
    provider_write_dispatch_enabled: false,
    database_mutations: 0,
    target_url: "https://diamondshelf.us/products/example",
    resource: {
      kind: "product",
      handle: "example",
      gid: "gid://shopify/Product/123",
    },
    seo: {
      title: "Example",
      description: "Example description",
    },
    provider_request_id: null,
  };

  assert.throws(
    () => projectTask53ResolverResult({
      adapter,
      result: {
        ...base,
        provider_write_dispatch_enabled: true,
      } as Task53ResolverResult,
      observedAt: OBSERVED_AT,
    }),
    /ugp_shopify_resolver_semantics_mismatch/,
  );

  assert.throws(
    () => projectTask53ResolverResult({
      adapter,
      result: {
        ...base,
        database_mutations: 1,
      } as Task53ResolverResult,
      observedAt: OBSERVED_AT,
    }),
    /ugp_shopify_resolver_semantics_mismatch/,
  );
});

test("UGP-1.4 projects current Task53 provider state with its exact field fingerprint", () => {
  const adapter = productionAdapter();
  const state: Task53ProviderState = {
    resource: {
      kind: "product",
      gid: "gid://shopify/Product/8864713441479",
    },
    field: "meta_description",
    value: "Current description",
    fingerprint: executionStateFingerprint(
      "meta_description",
      "Current description",
    ),
    seoTitle: "Current title",
    seoDescription: "Current description",
    providerRequestId: "shopify-request-abc",
  };

  const projection = projectTask53ProviderState({
    adapter,
    state,
    canonicalUrl:
      "https://diamondshelf.us/products/example-product",
    observedAt: OBSERVED_AT,
  });

  assert.equal(
    projection.identity.stateFingerprint,
    state.fingerprint,
  );
  assert.equal(
    projection.locator.externalId,
    state.resource.gid,
  );
  assert.deepEqual(projection.artifact.payload, {
    resource: {
      kind: "product",
      gid: "gid://shopify/Product/8864713441479",
    },
    field: "meta_description",
    value: "Current description",
    fingerprint: state.fingerprint,
    seoTitle: "Current title",
    seoDescription: "Current description",
    providerRequestId: "shopify-request-abc",
  });

  assert.throws(
    () => projectTask53ProviderState({
      adapter,
      state: {
        ...state,
        fingerprint: "a".repeat(64),
      },
      canonicalUrl:
        "https://diamondshelf.us/products/example-product",
      observedAt: OBSERVED_AT,
    }),
    /ugp_shopify_provider_state_fingerprint_mismatch/,
  );
});

test("UGP-1.4 maps existing executable fields to universal capabilities exactly", () => {
  assert.equal(
    shopifyFieldToUniversalCapability("title"),
    "write.seo_title",
  );
  assert.equal(
    shopifyFieldToUniversalCapability("meta_description"),
    "write.meta_description",
  );
});

test("UGP-1.4 projects approved Task53 mutation state without producing a new execute authorization", () => {
  const adapter = productionAdapter();
  const envelope = approvedEnvelope("meta_description");
  const projection = projectTask53AuthorizedMutation({
    adapter,
    actionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    envelope,
    resource: {
      kind: "product",
      gid: "gid://shopify/Product/8864713441479",
    },
  });

  assert.equal(
    projection.capability,
    "write.meta_description",
  );
  assert.equal(
    projection.mutation.expectedStateFingerprint,
    envelope.expectedCurrentState.fingerprint,
  );
  assert.equal(
    projection.mutation.proposedStateFingerprint,
    envelope.proposedState.fingerprint,
  );
  assert.equal(
    projection.sourceAuthorization.envelopeFingerprint,
    envelope.envelopeFingerprint,
  );
  assert.equal(
    projection.sourceAuthorization.providerWriteAllowed,
    false,
  );
  assert.equal(
    projection.sourceAuthorization.publicSiteWrites,
    false,
  );
  assert.equal(
    projection.sourceAuthorization.automaticTransition,
    false,
  );
  assert.equal(projection.universalExecuteRequest, null);
  assert.equal(
    projection.authority.grantsExecutionAuthorization,
    false,
  );
  assert.equal(projection.authority.grantsProviderWrite, false);
  assert.equal(projection.authority.grantsPublicSiteWrite, false);
  assert.deepEqual(projection.existingGateRequirements, [
    "task53_preflight",
    "public_site_write_gate",
    "exact_execution_confirmation",
    "authorization_freshness",
    "provider_state_match",
    "write_products_scope",
    "duplicate_execution_guard",
    "single_active_execution_guard",
  ]);
});

test("UGP-1.4 production mutation projection does not expand Task53 to OnlineStorePage", () => {
  const adapter = productionAdapter();
  const envelope = {
    ...approvedEnvelope("title"),
    target: {
      ...approvedEnvelope("title").target,
      url: "https://diamondshelf.us/pages/about-us",
    },
  };

  assert.throws(
    () => projectTask53AuthorizedMutation({
      adapter,
      actionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      envelope,
      resource: {
        kind: "page",
        gid: "gid://shopify/OnlineStorePage/123456789",
      },
    }),
    /ugp_shopify_live_resource_kind_not_supported/,
  );
});

test("UGP-1.4 rejects tampered current authorization state or expanded write flags", () => {
  const adapter = productionAdapter();
  const envelope = approvedEnvelope("title");

  assert.throws(
    () => projectTask53AuthorizedMutation({
      adapter,
      actionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      envelope: {
        ...envelope,
        expectedCurrentState: {
          ...envelope.expectedCurrentState,
          fingerprint: "a".repeat(64),
        },
      },
      resource: {
        kind: "product",
        gid: "gid://shopify/Product/123456789",
      },
    }),
    /ugp_shopify_authorized_state_fingerprint_mismatch/,
  );

  assert.throws(
    () => projectTask53AuthorizedMutation({
      adapter,
      actionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      envelope: {
        ...envelope,
        authorization: {
          ...envelope.authorization,
          providerWriteAllowed: true as false,
        },
      },
      resource: {
        kind: "product",
        gid: "gid://shopify/Product/123456789",
      },
    }),
    /ugp_shopify_authorization_semantics_mismatch/,
  );
});

test("UGP-1.4 compatibility operations remain pure and invoke no fetch", () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    throw new Error("network call not allowed");
  }) as typeof fetch;

  try {
    const readAdapter = readOnlyAdapter();
    const production = productionAdapter();

    mapShopifyResourceToUniversalLocator({
      adapter: readAdapter,
      resource: {
        kind: "product",
        gid: "gid://shopify/Product/123456789",
      },
      canonicalUrl:
        "https://diamondshelf.us/products/example-product",
    });

    projectTask53AuthorizedMutation({
      adapter: production,
      actionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      envelope: approvedEnvelope("meta_description"),
      resource: {
        kind: "product",
        gid: "gid://shopify/Product/123456789",
      },
    });

    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
