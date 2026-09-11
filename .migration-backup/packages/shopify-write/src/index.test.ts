import test from "node:test";
import assert from "node:assert/strict";
import {
  assertExecutionAuthorized,
  executeShopifyWrite,
  prepareShopifyMutation,
  unsupportedShopifyAction,
  type ShopifyWriteConfig,
} from "./index.js";

const config: ShopifyWriteConfig = {
  shopDomain: "example.myshopify.com",
  accessToken: "test-token",
  grantedScopes: ["write_products", "write_files"],
  publicSiteWritesEnabled: true,
};

function withWritesEnabled<T>(fn: () => T): T {
  const previous = process.env.PUBLIC_SITE_WRITES_ENABLED;
  process.env.PUBLIC_SITE_WRITES_ENABLED = "true";
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.PUBLIC_SITE_WRITES_ENABLED;
    else process.env.PUBLIC_SITE_WRITES_ENABLED = previous;
  }
}

test("global kill switch blocks writes even for AUTO actions", () => {
  const previous = process.env.PUBLIC_SITE_WRITES_ENABLED;
  process.env.PUBLIC_SITE_WRITES_ENABLED = "false";
  try {
    assert.throws(
      () => assertExecutionAuthorized(config, { planRiskLevel: "auto", actionDisposition: "auto" }),
      /global kill switch/,
    );
  } finally {
    if (previous === undefined) delete process.env.PUBLIC_SITE_WRITES_ENABLED;
    else process.env.PUBLIC_SITE_WRITES_ENABLED = previous;
  }
});

test("approval plans require explicit approved proof", () => {
  withWritesEnabled(() => {
    assert.throws(
      () => assertExecutionAuthorized(config, { planRiskLevel: "approval", actionDisposition: "auto" }),
      /approval proof/,
    );
    assert.doesNotThrow(() => assertExecutionAuthorized(config, {
      planRiskLevel: "approval",
      actionDisposition: "auto",
      approval: { decision: "approved", actorId: "user-1", approvalId: "approval-1" },
    }));
  });
});

test("blocked plans can never execute", () => {
  withWritesEnabled(() => {
    assert.throws(
      () => assertExecutionAuthorized(config, { planRiskLevel: "blocked", actionDisposition: "auto" }),
      /never execute/,
    );
  });
});

test("prepares fixed product SEO mutation without generic mutation input", () => {
  const prepared = prepareShopifyMutation({
    actionType: "metadata.title",
    productId: "gid://shopify/Product/123",
    value: "Designer Fragrance | Example",
  });
  assert.equal(prepared.operationName, "SeoEngineProductSeoUpdate");
  assert.deepEqual(prepared.variables, {
    product: { id: "gid://shopify/Product/123", seo: { title: "Designer Fragrance | Example" } },
  });
  assert.deepEqual(prepared.requiredScopes, ["write_products"]);
});

test("prepares fixed file alt mutation", () => {
  const prepared = prepareShopifyMutation({
    actionType: "image.alt",
    fileId: "gid://shopify/MediaImage/456",
    value: "Bottle of designer fragrance",
  });
  assert.equal(prepared.operationName, "SeoEngineFileAltUpdate");
  assert.deepEqual(prepared.variables, {
    files: [{ id: "gid://shopify/MediaImage/456", alt: "Bottle of designer fragrance" }],
  });
});

test("executes an authorized product SEO mutation through the fixed endpoint", async () => {
  const previous = process.env.PUBLIC_SITE_WRITES_ENABLED;
  process.env.PUBLIC_SITE_WRITES_ENABLED = "true";
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  try {
    const fakeFetch: typeof fetch = async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return new Response(JSON.stringify({
        data: {
          productUpdate: {
            product: { id: "gid://shopify/Product/123", seo: { title: "New SEO title", description: null } },
            userErrors: [],
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    };

    const result = await executeShopifyWrite(
      config,
      { planRiskLevel: "auto", actionDisposition: "auto" },
      { actionType: "metadata.title", productId: "gid://shopify/Product/123", value: "New SEO title" },
      fakeFetch,
    );

    assert.equal(result.ok, true);
    assert.equal(result.resourceId, "gid://shopify/Product/123");
    assert.match(requestUrl, /\/admin\/api\/2026-07\/graphql\.json$/);
    assert.equal(requestInit?.method, "POST");
    assert.doesNotMatch(requestUrl, /test-token/);
  } finally {
    if (previous === undefined) delete process.env.PUBLIC_SITE_WRITES_ENABLED;
    else process.env.PUBLIC_SITE_WRITES_ENABLED = previous;
  }
});

test("missing Shopify write scope fails closed before network execution", async () => {
  const previous = process.env.PUBLIC_SITE_WRITES_ENABLED;
  process.env.PUBLIC_SITE_WRITES_ENABLED = "true";
  let called = false;
  try {
    await assert.rejects(
      () => executeShopifyWrite(
        { ...config, grantedScopes: [] },
        { planRiskLevel: "auto", actionDisposition: "auto" },
        { actionType: "metadata.description", productId: "gid://shopify/Product/123", value: "Description" },
        async () => { called = true; return new Response("{}", { status: 200 }); },
      ),
      /write_products/,
    );
    assert.equal(called, false);
  } finally {
    if (previous === undefined) delete process.env.PUBLIC_SITE_WRITES_ENABLED;
    else process.env.PUBLIC_SITE_WRITES_ENABLED = previous;
  }
});

test("unsupported actions fail closed", () => {
  assert.throws(() => unsupportedShopifyAction("schema.patch"), /not implemented in V1/);
});
