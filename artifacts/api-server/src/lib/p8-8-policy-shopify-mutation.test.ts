import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  mutateP88W07ShopifyProductSeo,
  type P88W07ShopifyWriteCredential,
} from "./p8-8-policy-shopify-mutation.js";
import { buildP88W07TestFixture } from "./p8-8-w07-test-fixture.js";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "x-request-id": "req-w07-test",
    },
  });
}

function credential(
  siteId: string,
  credentialProfileId: string,
): P88W07ShopifyWriteCredential {
  return {
    siteId,
    credentialProfileId,
    shopDomain: "diamond-shelf-test.myshopify.com",
    accessToken: "synthetic-w07-write-token",
    scopes: ["read_products", "write_products"],
  };
}

test("W07 Shopify forward mutation sends exactly Product id + byte-exact W02 after SEO description", async () => {
  const f = buildP88W07TestFixture();
  let calls = 0;
  let capturedBody = "";
  let capturedHeaders: HeadersInit | undefined;
  const fetchImpl: typeof fetch = async (_input, init) => {
    calls += 1;
    capturedBody = String(init?.body ?? "");
    capturedHeaders = init?.headers;
    return response({
      data: {
        productUpdate: {
          product: {
            id: f.executionIntent.target.resourceGid,
            seo: { description: f.executionIntent.state.afterValue },
          },
          userErrors: [],
        },
      },
    });
  };

  const result = await mutateP88W07ShopifyProductSeo({
    intent: f.executionIntent,
    credential: credential(
      f.executionIntent.siteId,
      f.executionIntent.credentialProfileId,
    ),
    purpose: "forward",
    fetchImpl,
  });

  assert.equal(calls, 1);
  assert.equal(result.kind, "accepted");
  assert.equal(result.retryAllowed, false);

  const parsed = JSON.parse(capturedBody) as {
    query: string;
    variables: Record<string, unknown>;
  };
  assert.match(parsed.query, /mutation SeoEngineW07ProductSeoWrite/);
  assert.match(parsed.query, /productUpdate\(product: \$product\)/);
  assert.deepEqual(parsed.variables, {
    product: {
      id: f.executionIntent.target.resourceGid,
      seo: { description: f.executionIntent.state.afterValue },
    },
  });
  assert.equal(capturedBody.includes("title"), false);
  assert.equal(capturedBody.includes("handle"), false);
  assert.equal(capturedBody.includes("descriptionHtml"), false);
  assert.equal(capturedBody.includes("status"), false);
  assert.equal(capturedBody.includes("tags"), false);
  assert.equal(
    JSON.stringify(capturedHeaders).includes("synthetic-w07-write-token"),
    true,
  );
  assert.equal(capturedBody.includes("synthetic-w07-write-token"), false);
});

test("W07 rollback mutation sends exactly the original W02 before bytes and only once", async () => {
  const f = buildP88W07TestFixture();
  let calls = 0;
  let capturedBody = "";
  const result = await mutateP88W07ShopifyProductSeo({
    intent: f.executionIntent,
    credential: credential(
      f.executionIntent.siteId,
      f.executionIntent.credentialProfileId,
    ),
    purpose: "rollback",
    fetchImpl: async (_input, init) => {
      calls += 1;
      capturedBody = String(init?.body ?? "");
      return response({
        data: {
          productUpdate: {
            product: {
              id: f.executionIntent.target.resourceGid,
              seo: { description: f.executionIntent.state.beforeValue },
            },
            userErrors: [],
          },
        },
      });
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.kind, "accepted");
  const parsed = JSON.parse(capturedBody);
  assert.equal(
    parsed.variables.product.seo.description,
    f.executionIntent.state.beforeValue,
  );
});

test("W07 authoritative userErrors are rejected with no retry permission", async () => {
  const f = buildP88W07TestFixture();
  const result = await mutateP88W07ShopifyProductSeo({
    intent: f.executionIntent,
    credential: credential(
      f.executionIntent.siteId,
      f.executionIntent.credentialProfileId,
    ),
    purpose: "forward",
    fetchImpl: async () => response({
      data: {
        productUpdate: {
          product: null,
          userErrors: [
            { field: ["product", "seo", "description"], message: "invalid" },
          ],
        },
      },
    }),
  });
  assert.equal(result.kind, "rejected");
  if (result.kind !== "rejected") throw new Error("expected rejection");
  assert.equal(result.userErrors.length, 1);
  assert.equal(result.retryAllowed, false);
  assert.equal(result.providerWriteOutcomeCertain, true);
});

for (const mode of ["throw", "http", "graphql"] as const) {
  test("W07 " + mode + " ambiguity is uncertain and never retryable", async () => {
    const f = buildP88W07TestFixture();
    const fetchImpl: typeof fetch = async () => {
      if (mode === "throw") throw new Error("synthetic transport failure");
      if (mode === "http") return response({ error: "synthetic" }, 503);
      return response({ errors: [{ message: "synthetic graphql error" }] });
    };
    const result = await mutateP88W07ShopifyProductSeo({
      intent: f.executionIntent,
      credential: credential(
        f.executionIntent.siteId,
        f.executionIntent.credentialProfileId,
      ),
      purpose: "forward",
      fetchImpl,
    });
    assert.equal(result.kind, "uncertain");
    assert.equal(result.retryAllowed, false);
    assert.equal(result.providerWriteOutcomeCertain, false);
  });
}

test("W07 Shopify mutation rejects credential substitution, missing write_products and unrelated write scopes", async () => {
  const f = buildP88W07TestFixture();
  const base = credential(
    f.executionIntent.siteId,
    f.executionIntent.credentialProfileId,
  );
  for (const invalid of [
    { ...base, credentialProfileId: "wrong-profile" },
    { ...base, scopes: ["read_products"] },
    { ...base, scopes: ["write_products", "write_files"] },
  ]) {
    await assert.rejects(
      mutateP88W07ShopifyProductSeo({
        intent: f.executionIntent,
        credential: invalid,
        purpose: "forward",
        fetchImpl: async () => {
          throw new Error("must not be reached");
        },
      }),
      /p88_w07_shopify_write_credential_invalid/,
    );
  }
});

test("W07 mutation source has no Task53/Task54 helper import and no retry loop", async () => {
  const source = await readFile(
    new URL("./p8-8-policy-shopify-mutation.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /mutateTask53ShopifyState/);
  assert.doesNotMatch(source, /task54-persistent-apply/);
  assert.doesNotMatch(source, /APPLY_AND_VERIFY_TASK54/);
  assert.doesNotMatch(source, /EXECUTE_AND_ROLLBACK_TASK53/);
  assert.doesNotMatch(source, /\bwhile\s*\(/);
  assert.doesNotMatch(source, /\bfor\s*\([^)]*retry/i);
  assert.doesNotMatch(source, /process\.env/);
  assert.match(source, /ProductUpdateInput!/);
  assert.match(source, /seo:\s*\{\s*description:/);
});
