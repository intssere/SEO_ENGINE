import assert from "node:assert/strict";
import test from "node:test";
import {
  mutateP88W07ShopifyProductSeo,
  verifyP88W07StorefrontMetaDescription,
  type P88W07ShopifyWriteCredential,
} from "./p8-8-policy-single-action-shopify.js";
import {
  projectP88W07DispatchIntent,
} from "./p8-8-policy-single-action-apply.js";
import { buildP88W07TestFixture } from "./p8-8-w07-test-fixture.js";

function response(body: unknown, status = 200, requestId = "w07-req-1"): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
    },
  });
}

function credential(
  siteId: string,
  profileId: string,
): P88W07ShopifyWriteCredential {
  return {
    siteId,
    credentialProfileId: profileId,
    shopDomain: "diamond-shelf-test.myshopify.com",
    accessToken: "synthetic-w07-write-token",
    scopes: ["write_products"],
  };
}

test("W07 Shopify mutation sends exact W02 bytes and only Product SEO description", async () => {
  const fixture = buildP88W07TestFixture();
  const intent = projectP88W07DispatchIntent({
    bundle: fixture.bundle,
    databaseNow: fixture.snapshot.databaseNow,
  });
  let calls = 0;
  let captured = "";
  const receipt = await mutateP88W07ShopifyProductSeo({
    credential: credential(intent.siteId, intent.policy.credentialProfileId),
    expectedCredentialProfileId: intent.policy.credentialProfileId,
    target: fixture.lineage.w02Materialization.target,
    value: intent.state.afterValue,
    fetchImpl: async (_url, init) => {
      calls += 1;
      captured = String(init?.body ?? "");
      return response({
        data: {
          productUpdate: {
            product: { id: intent.target.resourceGid },
            userErrors: [],
          },
        },
      });
    },
  });

  assert.equal(calls, 1);
  assert.equal(receipt.outcome, "accepted");
  assert.equal(receipt.automaticRetryPerformed, false);
  const parsed = JSON.parse(captured) as {
    query: string;
    variables: { product: Record<string, unknown> };
  };
  assert.match(parsed.query, /mutation SeoEngineW07ProductSeoWrite/);
  assert.deepEqual(parsed.variables.product, {
    id: intent.target.resourceGid,
    seo: { description: "After  W07\nbytes" },
  });
  assert.equal(Object.hasOwn(parsed.variables.product, "title"), false);
  assert.equal(Object.hasOwn(parsed.variables.product, "handle"), false);
  assert.equal(Object.hasOwn(parsed.variables.product, "descriptionHtml"), false);
  assert.doesNotMatch(captured, /synthetic-w07-write-token/);
});

test("W07 mutation rejects credential profile or scope mismatch before transport", async () => {
  const fixture = buildP88W07TestFixture();
  const intent = projectP88W07DispatchIntent({
    bundle: fixture.bundle,
    databaseNow: fixture.snapshot.databaseNow,
  });
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return response({});
  };

  await assert.rejects(
    mutateP88W07ShopifyProductSeo({
      credential: credential(intent.siteId, "wrong-profile"),
      expectedCredentialProfileId: intent.policy.credentialProfileId,
      target: fixture.lineage.w02Materialization.target,
      value: intent.state.afterValue,
      fetchImpl,
    }),
    /p88_w07_write_credential_binding_invalid/,
  );
  await assert.rejects(
    mutateP88W07ShopifyProductSeo({
      credential: {
        ...credential(intent.siteId, intent.policy.credentialProfileId),
        scopes: ["read_products"],
      },
      expectedCredentialProfileId: intent.policy.credentialProfileId,
      target: fixture.lineage.w02Materialization.target,
      value: intent.state.afterValue,
      fetchImpl,
    }),
    /p88_w07_write_credential_binding_invalid/,
  );
  assert.equal(calls, 0);
});

test("W07 authoritative Shopify userErrors are rejection, not transport uncertainty", async () => {
  const fixture = buildP88W07TestFixture();
  const intent = projectP88W07DispatchIntent({
    bundle: fixture.bundle,
    databaseNow: fixture.snapshot.databaseNow,
  });
  const receipt = await mutateP88W07ShopifyProductSeo({
    credential: credential(intent.siteId, intent.policy.credentialProfileId),
    expectedCredentialProfileId: intent.policy.credentialProfileId,
    target: fixture.lineage.w02Materialization.target,
    value: intent.state.afterValue,
    fetchImpl: async () => response({
      data: {
        productUpdate: {
          product: null,
          userErrors: [{ field: ["seo", "description"], message: "Rejected" }],
        },
      },
    }),
  });
  assert.equal(receipt.outcome, "rejected");
  assert.equal(receipt.errorCategory, "shopify_user_error");
  assert.equal(receipt.userErrors.length, 1);
});

test("W07 transport ambiguity never retries the provider mutation", async () => {
  const fixture = buildP88W07TestFixture();
  const intent = projectP88W07DispatchIntent({
    bundle: fixture.bundle,
    databaseNow: fixture.snapshot.databaseNow,
  });
  let calls = 0;
  const receipt = await mutateP88W07ShopifyProductSeo({
    credential: credential(intent.siteId, intent.policy.credentialProfileId),
    expectedCredentialProfileId: intent.policy.credentialProfileId,
    target: fixture.lineage.w02Materialization.target,
    value: intent.state.afterValue,
    fetchImpl: async () => {
      calls += 1;
      throw new Error("synthetic connection reset");
    },
  });
  assert.equal(calls, 1);
  assert.equal(receipt.outcome, "uncertain");
  assert.equal(receipt.automaticRetryPerformed, false);
});

test("W07 storefront verification is exact and does not collapse whitespace", async () => {
  const targetUrl = "https://diamondshelf.us/products/w07-single-action";
  const exact = await verifyP88W07StorefrontMetaDescription({
    targetUrl,
    expectedValue: "After  W07\nbytes",
    fetchImpl: async () => new Response(
      '<html><head><meta name="description" content="After  W07\nbytes"></head></html>',
      { status: 200 },
    ),
  });
  assert.equal(exact.outcome, "verified");
  assert.equal(exact.observedValue, "After  W07\nbytes");

  const normalized = await verifyP88W07StorefrontMetaDescription({
    targetUrl,
    expectedValue: "After  W07\nbytes",
    fetchImpl: async () => new Response(
      '<meta name="description" content="After W07 bytes">',
      { status: 200 },
    ),
  });
  assert.equal(normalized.outcome, "mismatch");
});
