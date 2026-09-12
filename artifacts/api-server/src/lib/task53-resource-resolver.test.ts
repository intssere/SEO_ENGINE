import test from "node:test";
import assert from "node:assert/strict";
import {
  TASK53_RESOURCE_RESOLVER_API_VERSION,
  TASK53_RESOURCE_RESOLVER_REQUIRED_SCOPE,
  parseTask53ResolverTarget,
  resolveTask53ShopifyResource,
  task53ResolverOperation,
  validateTask53ReadOnlyCredential,
  Task53ResolverError,
  type Task53ReadOnlyCredential,
} from "./task53-resource-resolver.js";

const credential: Task53ReadOnlyCredential = {
  shopDomain: "vcuxm7-76.myshopify.com",
  accessToken: "read-only-token",
  scopes: ["read_content", "read_online_store_navigation", "read_products"],
};

function response(body: unknown, status = 200, requestId = "resolver-request") {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "x-request-id": requestId },
  });
}

async function category(promise: Promise<unknown>) {
  try {
    await promise;
    assert.fail("expected resolver error");
  } catch (error) {
    assert.ok(error instanceof Task53ResolverError);
    return error.category;
  }
}

test("strictly parses canonical Diamond Shelf product and collection URLs", () => {
  assert.deepEqual(parseTask53ResolverTarget("https://diamondshelf.us/collections/home-fragrance"), {
    kind: "collection",
    handle: "home-fragrance",
    targetUrl: "https://diamondshelf.us/collections/home-fragrance",
  });
  assert.deepEqual(parseTask53ResolverTarget("https://diamondshelf.us/products/example-product/"), {
    kind: "product",
    handle: "example-product",
    targetUrl: "https://diamondshelf.us/products/example-product",
  });
});

test("rejects non-canonical, cross-site, or ambiguous resolver URLs", () => {
  const invalid = [
    "http://diamondshelf.us/collections/home-fragrance",
    "https://www.diamondshelf.us/collections/home-fragrance",
    "https://user@diamondshelf.us/collections/home-fragrance",
    "https://diamondshelf.us:444/collections/home-fragrance",
    "https://diamondshelf.us/collections/home-fragrance?x=1",
    "https://diamondshelf.us/collections/home-fragrance#x",
    "https://diamondshelf.us/collections/home-fragrance/extra",
    "https://diamondshelf.us/pages/home-fragrance",
    "https://diamondshelf.us/collections/Home-Fragrance",
    "https://diamondshelf.us/collections/home_fragrance",
  ];
  for (const value of invalid) assert.throws(() => parseTask53ResolverTarget(value), Task53ResolverError);
});

test("accepts legacy ordinary read-only connection only with exact scope consistency and no write scope", () => {
  const row = {
    externalAccountId: "vcuxm7-76.myshopify.com",
    scopes: ["read_online_store_navigation", "read_products", "read_content"],
    status: "connected",
    metadata: { shopDomain: "vcuxm7-76.myshopify.com" },
  };
  const resolved = validateTask53ReadOnlyCredential(row, {
    accessToken: "token",
    scopes: ["read_products", "read_content", "read_online_store_navigation"],
  });
  assert.equal(resolved.shopDomain, "vcuxm7-76.myshopify.com");
  assert.equal(resolved.scopes.includes(TASK53_RESOURCE_RESOLVER_REQUIRED_SCOPE), true);
  assert.equal(resolved.scopes.some((scope) => scope.startsWith("write_")), false);
});

test("rejects write credentials, write scopes, missing read_products, and scope metadata mismatch", () => {
  const base = {
    externalAccountId: "vcuxm7-76.myshopify.com",
    scopes: ["read_products"],
    status: "connected",
    metadata: { shopDomain: "vcuxm7-76.myshopify.com" } as Record<string, unknown>,
  };
  assert.throws(() => validateTask53ReadOnlyCredential({ ...base, metadata: { ...base.metadata, connectionMode: "task53_write_products" } }, { accessToken: "token", scopes: ["read_products"] }), /task53_resolver_write_credential_rejected/);
  assert.throws(() => validateTask53ReadOnlyCredential({ ...base, scopes: ["read_products", "write_products"] }, { accessToken: "token", scopes: ["read_products", "write_products"] }), /task53_resolver_write_scope_rejected/);
  assert.throws(() => validateTask53ReadOnlyCredential({ ...base, scopes: ["read_content"] }, { accessToken: "token", scopes: ["read_content"] }), /task53_resolver_read_products_scope_missing/);
  assert.throws(() => validateTask53ReadOnlyCredential(base, { accessToken: "token", scopes: ["read_content", "read_products"] }), /task53_resolver_shopify_scope_metadata_mismatch/);
});

test("builds query-only identifier operations pinned to Admin API 2026-07", () => {
  const collection = task53ResolverOperation(parseTask53ResolverTarget("https://diamondshelf.us/collections/home-fragrance"));
  const product = task53ResolverOperation(parseTask53ResolverTarget("https://diamondshelf.us/products/example-product"));
  assert.equal(TASK53_RESOURCE_RESOLVER_API_VERSION, "2026-07");
  assert.match(collection.query, /collectionByIdentifier/);
  assert.match(product.query, /productByIdentifier/);
  assert.equal(/\bmutation\b/i.test(collection.query), false);
  assert.equal(/\bmutation\b/i.test(product.query), false);
});

test("resolves collection GID and current SEO state without database mutation", async () => {
  let observedUrl = "";
  let observedInit: RequestInit | undefined;
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    observedUrl = String(url);
    observedInit = init;
    return response({
      data: {
        collectionByIdentifier: {
          id: "gid://shopify/Collection/1234567890",
          handle: "home-fragrance",
          seo: { title: "Home Fragrance", description: null },
        },
      },
    });
  }) as typeof fetch;
  const result = await resolveTask53ShopifyResource("https://diamondshelf.us/collections/home-fragrance", { credential, fetchImpl });
  assert.equal(result.resource.gid, "gid://shopify/Collection/1234567890");
  assert.equal(result.resource.kind, "collection");
  assert.equal(result.seo.title, "Home Fragrance");
  assert.equal(result.seo.description, null);
  assert.equal(result.provider_write_dispatch_enabled, false);
  assert.equal(result.database_mutations, 0);
  assert.match(observedUrl, /admin\/api\/2026-07\/graphql\.json$/);
  const request = JSON.parse(String(observedInit?.body));
  assert.match(request.query, /^query /);
  assert.equal(/\bmutation\b/i.test(request.query), false);
});

test("fails closed on provider not-found, handle mismatch, GID-kind mismatch, GraphQL error, HTTP error, and invalid JSON", async () => {
  const cases: Array<[string, typeof fetch]> = [
    ["task53_resolver_resource_not_found", (async () => response({ data: { collectionByIdentifier: null } })) as typeof fetch],
    ["task53_resolver_provider_handle_mismatch", (async () => response({ data: { collectionByIdentifier: { id: "gid://shopify/Collection/1", handle: "other", seo: {} } } })) as typeof fetch],
    ["task53_resolver_resource_identity_invalid", (async () => response({ data: { collectionByIdentifier: { id: "gid://shopify/Product/1", handle: "home-fragrance", seo: {} } } })) as typeof fetch],
    ["task53_resolver_shopify_graphql_error", (async () => response({ errors: [{ message: "bad" }] })) as typeof fetch],
    ["task53_resolver_shopify_http_500", (async () => response({ error: "bad" }, 500)) as typeof fetch],
    ["task53_resolver_shopify_invalid_json", (async () => new Response("not-json", { status: 200 })) as typeof fetch],
  ];
  for (const [expected, fetchImpl] of cases) {
    assert.equal(await category(resolveTask53ShopifyResource("https://diamondshelf.us/collections/home-fragrance", { credential, fetchImpl })), expected);
  }
});
