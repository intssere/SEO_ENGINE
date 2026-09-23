import assert from "node:assert/strict";
import test from "node:test";
import {
  mutateP88W07ShopifyMetaDescription,
} from "./p8-8-policy-single-action-shopify.js";
import { buildP88W07TestFixture } from "./p8-8-w07-test-fixture.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "x-request-id": "req-w07-test",
    },
  });
}

test("W07 Shopify mutation preserves exact bytes and sends only Product SEO description", async () => {
  const f = buildP88W07TestFixture();
  let calls = 0;
  let body = "";
  const exactValue = f.lineage.w02Materialization.after.value;
  const receipt = await mutateP88W07ShopifyMetaDescription({
    phase: "forward",
    credential: {
      ...f.credentialBinding,
      accessToken: "synthetic-token",
    },
    expectedCredentialProfileId: f.credentialBinding.credentialProfileId,
    expectedSiteId: f.credentialBinding.siteId,
    resourceGid: f.lineage.w02Materialization.target.resourceGid,
    exactValue,
    fetchImpl: async (_url, init) => {
      calls += 1;
      body = String(init?.body ?? "");
      return jsonResponse({
        data: {
          productUpdate: {
            product: {
              id: f.lineage.w02Materialization.target.resourceGid,
              seo: { description: exactValue },
            },
            userErrors: [],
          },
        },
      });
    },
  });

  assert.equal(calls, 1);
  assert.equal(receipt.status, "accepted");
  assert.equal(receipt.automaticRetryPerformed, false);
  const parsed = JSON.parse(body) as {
    variables: { product: Record<string, unknown> };
    query: string;
  };
  assert.deepEqual(Object.keys(parsed.variables.product).sort(), ["id", "seo"]);
  const seo = parsed.variables.product.seo as Record<string, unknown>;
  assert.deepEqual(Object.keys(seo), ["description"]);
  assert.equal(seo.description, exactValue);
  assert.match(exactValue ?? "", /  /);
  assert.match(exactValue ?? "", /\n/);
  assert.doesNotMatch(body, /title|handle|bodyHtml|variants|tags|status/);
  assert.match(parsed.query, /mutation SeoEngineW07ProductMetaDescription/);
});

test("W07 rollback uses exact original W02 bytes without normalization", async () => {
  const f = buildP88W07TestFixture();
  let sent: string | null | undefined;
  const before = f.lineage.w02Materialization.before.value;
  const receipt = await mutateP88W07ShopifyMetaDescription({
    phase: "rollback",
    credential: {
      ...f.credentialBinding,
      accessToken: "synthetic-token",
    },
    expectedCredentialProfileId: f.credentialBinding.credentialProfileId,
    expectedSiteId: f.credentialBinding.siteId,
    resourceGid: f.lineage.w02Materialization.target.resourceGid,
    exactValue: before,
    fetchImpl: async (_url, init) => {
      const parsed = JSON.parse(String(init?.body ?? "")) as {
        variables: { product: { seo: { description: string | null } } };
      };
      sent = parsed.variables.product.seo.description;
      return jsonResponse({
        data: {
          productUpdate: {
            product: {
              id: f.lineage.w02Materialization.target.resourceGid,
              seo: { description: before },
            },
            userErrors: [],
          },
        },
      });
    },
  });
  assert.equal(receipt.status, "accepted");
  assert.equal(sent, before);
});

test("W07 authoritative Shopify userErrors are rejected without retry", async () => {
  const f = buildP88W07TestFixture();
  let calls = 0;
  const receipt = await mutateP88W07ShopifyMetaDescription({
    phase: "forward",
    credential: {
      ...f.credentialBinding,
      accessToken: "synthetic-token",
    },
    expectedCredentialProfileId: f.credentialBinding.credentialProfileId,
    expectedSiteId: f.credentialBinding.siteId,
    resourceGid: f.lineage.w02Materialization.target.resourceGid,
    exactValue: f.lineage.w02Materialization.after.value,
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({
        data: {
          productUpdate: {
            product: null,
            userErrors: [{ field: ["seo", "description"], message: "rejected" }],
          },
        },
      });
    },
  });
  assert.equal(calls, 1);
  assert.equal(receipt.status, "rejected");
  assert.equal(receipt.publicWriteOccurrence, "none");
  assert.equal(receipt.automaticRetryPerformed, false);
  assert.equal(receipt.userErrorFingerprints.length, 1);
});

test("W07 transport ambiguity spends one attempt and never retries", async () => {
  const f = buildP88W07TestFixture();
  let calls = 0;
  const receipt = await mutateP88W07ShopifyMetaDescription({
    phase: "forward",
    credential: {
      ...f.credentialBinding,
      accessToken: "synthetic-token",
    },
    expectedCredentialProfileId: f.credentialBinding.credentialProfileId,
    expectedSiteId: f.credentialBinding.siteId,
    resourceGid: f.lineage.w02Materialization.target.resourceGid,
    exactValue: f.lineage.w02Materialization.after.value,
    fetchImpl: async () => {
      calls += 1;
      throw new Error("synthetic timeout");
    },
  });
  assert.equal(calls, 1);
  assert.equal(receipt.status, "ambiguous");
  assert.equal(receipt.publicWriteOccurrence, "possible");
  assert.equal(receipt.automaticRetryPerformed, false);
});

test("W07 write credential must match profile/site and include write_products", async () => {
  const f = buildP88W07TestFixture();
  await assert.rejects(
    mutateP88W07ShopifyMetaDescription({
      phase: "forward",
      credential: {
        ...f.credentialBinding,
        scopes: ["read_products"],
        accessToken: "synthetic-token",
      },
      expectedCredentialProfileId: f.credentialBinding.credentialProfileId,
      expectedSiteId: f.credentialBinding.siteId,
      resourceGid: f.lineage.w02Materialization.target.resourceGid,
      exactValue: f.lineage.w02Materialization.after.value,
      fetchImpl: async () => jsonResponse({}),
    }),
    /p88_w07_shopify_write_credential_invalid/,
  );
});
