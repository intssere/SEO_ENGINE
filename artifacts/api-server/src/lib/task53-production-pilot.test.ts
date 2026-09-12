import test from "node:test";
import assert from "node:assert/strict";
import { executionStateFingerprint, type AuthorizationEnvelope } from "./execution-foundation.js";
import {
  TASK53_REQUIRED_WRITE_SCOPE,
  buildTask53Preflight,
  mutateTask53ShopifyState,
  readTask53ShopifyState,
  task53RequiredConfirmation,
  verifyTask53Storefront,
  type Task53ShopifyCredential,
} from "./task53-production-pilot.js";

const credential = (scopes = ["read_products", "write_products"]): Task53ShopifyCredential => ({
  shopDomain: "vcuxm7-76.myshopify.com",
  accessToken: "test-access-token",
  scopes,
});

function envelope(): AuthorizationEnvelope {
  const before = "Old SEO description";
  const after = "New controlled SEO description";
  return {
    version: "controlled_execution_foundation_v1",
    planId: "11111111-1111-4111-8111-111111111111",
    target: { pageId: "22222222-2222-4222-8222-222222222222", url: "https://diamondshelf.us/products/example", field: "meta_description" },
    actionType: "update_meta_description",
    expectedCurrentState: { value: before, fingerprint: executionStateFingerprint("meta_description", before) },
    proposedState: { value: after, fingerprint: executionStateFingerprint("meta_description", after) },
    evidence: { ids: ["33333333-3333-4333-8333-333333333333", "44444444-4444-4444-8444-444444444444"], proposalFingerprint: "proposal-fingerprint" },
    risk: { classification: "low", boundedPilot: true },
    rollback: { value: before, fingerprint: executionStateFingerprint("meta_description", before) },
    authorization: {
      issuedAt: "2026-09-12T07:00:00.000Z",
      expiresAt: "2026-09-12T07:15:00.000Z",
      executionAuthorized: true,
      providerWriteAllowed: false,
      publicSiteWrites: false,
      automaticTransition: false,
    },
    verification: {
      status: "pending",
      mode: "independent_read_after_write",
      expectedField: "meta_description",
      expectedValue: after,
      expectedFingerprint: executionStateFingerprint("meta_description", after),
      failureDisposition: "rollback_eligible",
    },
    envelopeFingerprint: "task53-envelope-fingerprint",
  };
}

const resource = { kind: "product" as const, gid: "gid://shopify/Product/123456789" };

test("preflight blocks live execution until every Task #53 gate is satisfied", () => {
  const auth = envelope();
  const providerState = {
    resource,
    field: auth.target.field,
    value: auth.expectedCurrentState.value,
    fingerprint: auth.expectedCurrentState.fingerprint,
    seoTitle: null,
    seoDescription: auth.expectedCurrentState.value,
    providerRequestId: "read-request",
  };
  const blocked = buildTask53Preflight({
    actionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    envelope: auth,
    resource,
    providerState,
    credentialScopes: ["read_products"],
    publicWriteGateEnabled: false,
    priorDeploymentCount: 0,
    otherActiveExecutionCount: 0,
    now: "2026-09-12T07:05:00.000Z",
  });
  assert.equal(blocked.readyForLivePilot, false);
  assert.deepEqual(blocked.blockers.sort(), ["public_site_write_gate_disabled", "shopify_write_products_scope_missing"].sort());
  assert.equal(blocked.rollbackIncluded, true);
  assert.equal(blocked.requiredWriteScope, TASK53_REQUIRED_WRITE_SCOPE);

  const ready = buildTask53Preflight({
    actionId: blocked.actionId,
    envelope: auth,
    resource,
    providerState,
    credentialScopes: ["write_products"],
    publicWriteGateEnabled: true,
    priorDeploymentCount: 0,
    otherActiveExecutionCount: 0,
    now: "2026-09-12T07:05:00.000Z",
  });
  assert.equal(ready.readyForLivePilot, true);
  assert.equal(ready.blockers.length, 0);
  assert.equal(ready.requiredConfirmation, task53RequiredConfirmation(ready.actionId, ready.preflightFingerprint));
  assert.match(ready.requiredConfirmation, /^EXECUTE_AND_ROLLBACK_TASK53:/);
});

test("preflight fails closed on stale provider state, expired authorization, duplicate deployment, or another active execution", () => {
  const auth = envelope();
  const result = buildTask53Preflight({
    actionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    envelope: auth,
    resource,
    providerState: {
      resource,
      field: auth.target.field,
      value: "changed outside the system",
      fingerprint: executionStateFingerprint(auth.target.field, "changed outside the system"),
      seoTitle: null,
      seoDescription: "changed outside the system",
      providerRequestId: null,
    },
    credentialScopes: ["write_products"],
    publicWriteGateEnabled: true,
    priorDeploymentCount: 1,
    otherActiveExecutionCount: 1,
    now: "2026-09-12T07:16:00.000Z",
  });
  assert.equal(result.readyForLivePilot, false);
  assert.ok(result.blockers.includes("provider_state_changed_since_approval"));
  assert.ok(result.blockers.includes("authorization_expired_or_invalid"));
  assert.ok(result.blockers.includes("duplicate_provider_execution_blocked"));
  assert.ok(result.blockers.includes("another_site_execution_is_active"));
});

test("Shopify provider pre-read returns independently fingerprinted SEO state", async () => {
  const fetchImpl = async (_input: URL | Request | string, init?: RequestInit) => {
    assert.equal(init?.method, "POST");
    assert.equal((init?.headers as Record<string, string>)["X-Shopify-Access-Token"], "test-access-token");
    return new Response(JSON.stringify({ data: { node: { __typename: "Product", id: resource.gid, seo: { title: "SEO title", description: " Old SEO description " } } } }), {
      status: 200,
      headers: { "x-request-id": "provider-read-1" },
    });
  };
  const state = await readTask53ShopifyState({ credential: credential(), resource, field: "meta_description", fetchImpl: fetchImpl as typeof fetch });
  assert.equal(state.value, "Old SEO description");
  assert.equal(state.fingerprint, executionStateFingerprint("meta_description", "Old SEO description"));
  assert.equal(state.providerRequestId, "provider-read-1");
});

test("Shopify mutation requires write_products and preserves provider receipt", async () => {
  await assert.rejects(
    () => mutateTask53ShopifyState({ credential: credential(["read_products"]), resource, field: "meta_description", value: "New value", fetchImpl: (async () => new Response()) as typeof fetch }),
    /shopify_write_products_scope_missing/,
  );

  const fetchImpl = async (_input: URL | Request | string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    assert.match(body.query, /productUpdate/);
    assert.equal(body.variables.product.id, resource.gid);
    assert.equal(body.variables.product.seo.description, "New value");
    return new Response(JSON.stringify({ data: { productUpdate: { product: { id: resource.gid, seo: { title: null, description: "New value" } }, userErrors: [] } } }), {
      status: 200,
      headers: { "x-request-id": "provider-write-1" },
    });
  };
  const receipt = await mutateTask53ShopifyState({ credential: credential(), resource, field: "meta_description", value: "New value", fetchImpl: fetchImpl as typeof fetch });
  assert.equal(receipt.ok, true);
  assert.equal(receipt.providerRequestId, "provider-write-1");
  assert.equal(receipt.errorCategory, null);
});

test("collection mutation uses bounded CollectionUpdateInput SEO update", async () => {
  const collection = { kind: "collection" as const, gid: "gid://shopify/Collection/987654321" };
  const fetchImpl = async (_input: URL | Request | string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    assert.match(body.query, /CollectionUpdateInput/);
    assert.equal(body.variables.collection.id, collection.gid);
    assert.deepEqual(body.variables.collection.seo, { title: "New collection SEO title" });
    return new Response(JSON.stringify({ data: { collectionUpdate: { collection: { id: collection.gid, seo: { title: "New collection SEO title", description: null } }, userErrors: [] } } }), { status: 200 });
  };
  const receipt = await mutateTask53ShopifyState({ credential: credential(), resource: collection, field: "title", value: "New collection SEO title", fetchImpl: fetchImpl as typeof fetch });
  assert.equal(receipt.ok, true);
});

test("storefront verification independently checks title and meta description without trusting provider write response", async () => {
  const html = `<!doctype html><html><head><title>New SEO Title</title><meta name="description" content="New &amp; safer description"></head><body></body></html>`;
  const fetchImpl = async () => new Response(html, { status: 200, headers: { "content-type": "text/html" } });
  const title = await verifyTask53Storefront({ url: "https://diamondshelf.us/products/example", field: "title", expectedValue: "New SEO Title", fetchImpl: fetchImpl as typeof fetch });
  assert.equal(title.ok, true);
  const description = await verifyTask53Storefront({ url: "https://diamondshelf.us/products/example", field: "meta_description", expectedValue: "New & safer description", fetchImpl: fetchImpl as typeof fetch });
  assert.equal(description.ok, true);
  const mismatch = await verifyTask53Storefront({ url: "https://diamondshelf.us/products/example", field: "meta_description", expectedValue: "Different", fetchImpl: fetchImpl as typeof fetch });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.errorCategory, "storefront_state_mismatch");
});

test("storefront verification rejects non-Diamond-Shelf targets", async () => {
  const result = await verifyTask53Storefront({ url: "https://example.com/products/example", field: "title", expectedValue: "x" });
  assert.equal(result.ok, false);
  assert.equal(result.errorCategory, "storefront_site_mismatch");
});
