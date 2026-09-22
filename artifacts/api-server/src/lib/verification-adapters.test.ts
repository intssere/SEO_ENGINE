import test from "node:test";
import assert from "node:assert/strict";
import { executionStateFingerprint } from "./execution-foundation.js";
import {
  P8_4_VERIFICATION_ADAPTER_VERSION,
  resolveVerificationMutationClass,
  supportedVerificationMutationClasses,
  verificationAdapterCapability,
  verificationAdapterRegistry,
  verifyCertifiedMutation,
  type VerificationAdapterInput,
} from "./verification-adapters.js";
import type {
  Task53ProviderState,
  Task53ShopifyCredential,
  Task53StorefrontVerification,
} from "./task53-production-pilot.js";

const credential: Task53ShopifyCredential = {
  shopDomain: "vcuxm7-76.myshopify.com",
  accessToken: "network-free-test-token",
  scopes: ["read_products"],
};

const product = { kind: "product", gid: "gid://shopify/Product/123456789" };
const collection = { kind: "collection", gid: "gid://shopify/Collection/987654321" };

function input(
  resource: { kind: string; gid: string },
  field: string,
  expectedValue: string | null,
): VerificationAdapterInput {
  const plural = resource.kind === "collection" ? "collections" : "products";
  return {
    resource,
    targetUrl: `https://diamondshelf.us/${plural}/example`,
    field,
    expectedValue,
    expectedFingerprint: executionStateFingerprint(field, expectedValue),
    credential,
  };
}

function providerState(
  resource: { kind: "product" | "collection"; gid: string },
  field: "title" | "meta_description",
  value: string | null,
): Task53ProviderState {
  return {
    resource,
    field,
    value,
    fingerprint: executionStateFingerprint(field, value),
    seoTitle: field === "title" ? value : null,
    seoDescription: field === "meta_description" ? value : null,
    providerRequestId: "provider-read-network-free",
  };
}

function storefrontState(
  field: "title" | "meta_description",
  expectedValue: string | null,
  observedValue: string | null = expectedValue,
  errorCategory: string | null = null,
): Task53StorefrontVerification {
  const expectedFingerprint = executionStateFingerprint(field, expectedValue);
  const observedFingerprint = observedValue === null
    ? executionStateFingerprint(field, null)
    : executionStateFingerprint(field, observedValue);
  return {
    ok: errorCategory === null && expectedFingerprint === observedFingerprint,
    statusCode: errorCategory?.startsWith("storefront_http_") ? Number(errorCategory.split("_").at(-1)) : 200,
    expectedValue,
    observedValue,
    expectedFingerprint,
    observedFingerprint,
    errorCategory,
  };
}

test("registry is closed to the four certified product/collection SEO mutation classes", () => {
  assert.equal(P8_4_VERIFICATION_ADAPTER_VERSION, "p8-4-verification-adapter-v1");
  assert.deepEqual(
    verificationAdapterRegistry.map((entry) => entry.mutationClass),
    [...supportedVerificationMutationClasses],
  );
  assert.equal(verificationAdapterRegistry.length, 4);
  assert.equal(resolveVerificationMutationClass("product", "title")?.mutationClass, "shopify_product_seo_title");
  assert.equal(resolveVerificationMutationClass("product", "meta_description")?.mutationClass, "shopify_product_seo_meta_description");
  assert.equal(resolveVerificationMutationClass("collection", "title")?.mutationClass, "shopify_collection_seo_title");
  assert.equal(resolveVerificationMutationClass("collection", "meta_description")?.mutationClass, "shopify_collection_seo_meta_description");
  assert.equal(resolveVerificationMutationClass("product", "handle"), null);
  assert.equal(resolveVerificationMutationClass("media", "alt"), null);
  const capability = verificationAdapterCapability();
  assert.equal(capability.providerWritePerformed, false);
  assert.equal(capability.databaseMutationPerformed, false);
  assert.equal(capability.automaticTransition, false);
  assert.equal(capability.mediaAltImplemented, false);
  assert.equal(capability.writeFilesScopeRequired, false);
});

for (const scenario of [
  { resource: product, field: "title" as const, expected: "Product SEO title", mutationClass: "shopify_product_seo_title" },
  { resource: product, field: "meta_description" as const, expected: "Product SEO description", mutationClass: "shopify_product_seo_meta_description" },
  { resource: collection, field: "title" as const, expected: "Collection SEO title", mutationClass: "shopify_collection_seo_title" },
  { resource: collection, field: "meta_description" as const, expected: "Collection SEO description", mutationClass: "shopify_collection_seo_meta_description" },
]) {
  test(`${scenario.mutationClass} verifies only after independent provider and storefront agreement`, async () => {
    const request = input(scenario.resource, scenario.field, scenario.expected);
    const result = await verifyCertifiedMutation(request, {
      readProvider: async () => providerState(
        scenario.resource as { kind: "product" | "collection"; gid: string },
        scenario.field,
        scenario.expected,
      ),
      verifyStorefront: async () => storefrontState(scenario.field, scenario.expected),
    });
    assert.equal(result.status, "verified");
    assert.equal(result.mutationClass, scenario.mutationClass);
    assert.equal(result.providerVerified, true);
    assert.equal(result.storefrontVerified, true);
    assert.equal(result.provider.observedFingerprint, request.expectedFingerprint);
    assert.equal(result.storefront.observedFingerprint, request.expectedFingerprint);
    assert.deepEqual(result.failureCategories, []);
    assert.equal(result.providerWritePerformed, false);
    assert.equal(result.databaseMutationPerformed, false);
    assert.equal(result.automaticTransition, false);
    assert.match(result.adapterFingerprint ?? "", /^[0-9a-f]{64}$/);
    assert.match(result.resultFingerprint, /^[0-9a-f]{64}$/);
  });
}

test("unsupported mutation class fails closed before any read surface is invoked", async () => {
  let reads = 0;
  const request = input(product, "handle", "example-handle");
  const result = await verifyCertifiedMutation(request, {
    readProvider: async () => {
      reads += 1;
      throw new Error("must not run");
    },
    verifyStorefront: async () => {
      reads += 1;
      throw new Error("must not run");
    },
  });
  assert.equal(result.status, "failed");
  assert.equal(result.mutationClass, null);
  assert.deepEqual(result.failureCategories, ["unsupported_mutation_class"]);
  assert.equal(reads, 0);
});

test("expected fingerprint mismatch fails closed before network/read work", async () => {
  let reads = 0;
  const request = input(product, "title", "Expected title");
  request.expectedFingerprint = executionStateFingerprint("title", "Different title");
  const result = await verifyCertifiedMutation(request, {
    readProvider: async () => {
      reads += 1;
      throw new Error("must not run");
    },
    verifyStorefront: async () => {
      reads += 1;
      throw new Error("must not run");
    },
  });
  assert.equal(result.status, "failed");
  assert.deepEqual(result.failureCategories, ["expected_fingerprint_mismatch"]);
  assert.equal(reads, 0);
});

test("invalid resource GID and target URL mismatch fail closed before provider reads", async () => {
  let reads = 0;
  const badResource = input({ kind: "product", gid: "gid://shopify/Collection/123" }, "title", "Expected");
  const resourceResult = await verifyCertifiedMutation(badResource, {
    readProvider: async () => {
      reads += 1;
      throw new Error("must not run");
    },
  });
  assert.equal(resourceResult.status, "failed");
  assert.ok(resourceResult.failureCategories.includes("provider_task53_resource_identity_invalid"));

  const badTarget = input(product, "title", "Expected");
  badTarget.targetUrl = "https://diamondshelf.us/collections/example";
  const targetResult = await verifyCertifiedMutation(badTarget, {
    readProvider: async () => {
      reads += 1;
      throw new Error("must not run");
    },
  });
  assert.equal(targetResult.status, "failed");
  assert.ok(targetResult.failureCategories.includes("provider_task53_resource_url_kind_mismatch"));
  assert.equal(reads, 0);
});

test("provider unavailable state returns unavailable and never calls storefront verifier", async () => {
  let storefrontReads = 0;
  const request = input(product, "meta_description", "Expected");
  const result = await verifyCertifiedMutation(request, {
    readProvider: async () => {
      throw new Error("network offline");
    },
    verifyStorefront: async () => {
      storefrontReads += 1;
      return storefrontState("meta_description", "Expected");
    },
  });
  assert.equal(result.status, "unavailable");
  assert.deepEqual(result.failureCategories, ["provider_unavailable_unknown_error"]);
  assert.equal(storefrontReads, 0);
});

test("provider identity mismatch is an authoritative failure", async () => {
  const request = input(product, "title", "Expected");
  const result = await verifyCertifiedMutation(request, {
    readProvider: async () => providerState(
      { kind: "product", gid: "gid://shopify/Product/999999" },
      "title",
      "Expected",
    ),
    verifyStorefront: async () => storefrontState("title", "Expected"),
  });
  assert.equal(result.status, "failed");
  assert.ok(result.failureCategories.includes("provider_resource_identity_mismatch"));
  assert.equal(result.providerVerified, false);
});

test("provider mismatch is failed even when storefront agrees with expected state", async () => {
  const request = input(product, "meta_description", "Expected");
  const result = await verifyCertifiedMutation(request, {
    readProvider: async () => providerState(product as { kind: "product"; gid: string }, "meta_description", "Provider old value"),
    verifyStorefront: async () => storefrontState("meta_description", "Expected"),
  });
  assert.equal(result.status, "failed");
  assert.ok(result.failureCategories.includes("provider_state_mismatch"));
  assert.ok(result.failureCategories.includes("provider_storefront_disagreement"));
  assert.equal(result.providerVerified, false);
  assert.equal(result.storefrontVerified, true);
});

test("storefront authoritative mismatch is failed and disagreement is explicit", async () => {
  const request = input(collection, "title", "Expected collection title");
  const result = await verifyCertifiedMutation(request, {
    readProvider: async () => providerState(collection as { kind: "collection"; gid: string }, "title", "Expected collection title"),
    verifyStorefront: async () => storefrontState("title", "Expected collection title", "Stale storefront title", "storefront_state_mismatch"),
  });
  assert.equal(result.status, "failed");
  assert.ok(result.failureCategories.includes("storefront_state_mismatch"));
  assert.ok(result.failureCategories.includes("provider_storefront_disagreement"));
  assert.equal(result.providerVerified, true);
  assert.equal(result.storefrontVerified, false);
});

test("storefront transport unavailability is unavailable when provider state matches", async () => {
  const request = input(collection, "meta_description", "Expected collection description");
  const result = await verifyCertifiedMutation(request, {
    readProvider: async () => providerState(collection as { kind: "collection"; gid: string }, "meta_description", "Expected collection description"),
    verifyStorefront: async () => ({
      ok: false,
      statusCode: null,
      expectedValue: "Expected collection description",
      observedValue: null,
      expectedFingerprint: request.expectedFingerprint,
      observedFingerprint: null,
      errorCategory: "storefront_network_error",
    }),
  });
  assert.equal(result.status, "unavailable");
  assert.deepEqual(result.failureCategories, ["storefront_unavailable_storefront_network_error"]);
  assert.equal(result.providerVerified, true);
  assert.equal(result.storefrontVerified, false);
});

test("provider/storefront result classification and fingerprint are deterministic", async () => {
  const request = input(product, "title", "Expected");
  const dependencies = {
    readProvider: async () => providerState(product as { kind: "product"; gid: string }, "title", "Different"),
    verifyStorefront: async () => storefrontState("title", "Expected", "Also different", "storefront_state_mismatch"),
  };
  const first = await verifyCertifiedMutation(request, dependencies);
  const second = await verifyCertifiedMutation(request, dependencies);
  assert.deepEqual(first.failureCategories, [...first.failureCategories].sort());
  assert.deepEqual(first, second);
  assert.equal(first.resultFingerprint, second.resultFingerprint);
  assert.equal(first.providerWritePerformed, false);
  assert.equal(first.databaseMutationPerformed, false);
  assert.equal(first.automaticTransition, false);
});

test("real Task53 read primitives can be exercised through an injected network-free fetch transport", async () => {
  const request = input(product, "meta_description", "Expected description");
  let providerReads = 0;
  let storefrontReads = 0;
  request.fetchImpl = (async (url: URL | RequestInfo, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    if (method === "POST") {
      providerReads += 1;
      return new Response(JSON.stringify({
        data: {
          node: {
            __typename: "Product",
            id: product.gid,
            seo: {
              title: "Other title",
              description: "Expected description",
            },
          },
        },
      }), {
        status: 200,
        headers: { "x-request-id": "provider-read-real-wrapper" },
      });
    }
    storefrontReads += 1;
    assert.equal(String(url), "https://diamondshelf.us/products/example");
    return new Response(
      '<!doctype html><html><head><title>Other title</title><meta name="description" content="Expected description"></head></html>',
      { status: 200, headers: { "content-type": "text/html" } },
    );
  }) as typeof fetch;

  const result = await verifyCertifiedMutation(request);
  assert.equal(result.status, "verified");
  assert.equal(result.provider.requestId, "provider-read-real-wrapper");
  assert.equal(providerReads, 1);
  assert.equal(storefrontReads, 1);
});
