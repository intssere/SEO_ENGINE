import test from "node:test";
import assert from "node:assert/strict";
import { activationConfigFromEnvironment, createSeoProviderProbe, runActivationFromEnvironment, serializedActivationEvidence } from "./runner.js";

const secretShop = "shpat_secret_value";
const secretGoogle = "ya29.secret_value";
const secretProvider = "provider-secret";

function readyFetch(input: URL | RequestInfo): Promise<Response> {
  const url = String(input);
  if (url.includes("myshopify.com")) {
    return Promise.resolve(new Response(JSON.stringify({ data: { shop: { myshopifyDomain: "vcuxm7-76.myshopify.com" } } }), { status: 200 }));
  }
  if (url.includes("googleapis.com/webmasters")) {
    return Promise.resolve(new Response(JSON.stringify({ siteEntry: [{ siteUrl: "https://diamondshelf.us/", permissionLevel: "siteOwner" }] }), { status: 200 }));
  }
  if (url.includes("analyticsdata.googleapis.com")) {
    return Promise.resolve(new Response(JSON.stringify({ name: "properties/123456/metadata" }), { status: 200 }));
  }
  if (url.includes("provider.example")) return Promise.resolve(new Response("ok", { status: 200 }));
  return Promise.resolve(new Response("not found", { status: 404 }));
}

const env: NodeJS.ProcessEnv = {
  SHOPIFY_SHOP_DOMAIN: "vcuxm7-76.myshopify.com",
  SHOPIFY_ADMIN_ACCESS_TOKEN: secretShop,
  SHOPIFY_ADMIN_API_VERSION: "2026-07",
  GOOGLE_SEARCH_CONSOLE_SITE_URL: "https://diamondshelf.us/",
  GA4_PROPERTY_ID: "123456",
  GOOGLE_OAUTH_ACCESS_TOKEN: secretGoogle,
  PUBLIC_SITE_WRITES_ENABLED: "false",
  SEO_PROVIDER_PROBE_URL: "https://provider.example/health",
  OPENSEO_API_KEY: secretProvider,
  SEO_ENGINE_ACTIVATION_RUN_ID: "activation-test-1",
  GIT_COMMIT_SHA: "abc123",
};

test("environment config remains read-only and carries required runtime values", () => {
  const config = activationConfigFromEnvironment(env);
  assert.equal(config.siteDomain, "diamondshelf.us");
  assert.equal(config.publicSiteWritesEnabled, "false");
  assert.equal(config.shopDomain, "vcuxm7-76.myshopify.com");
});

test("secure runner returns sanitized evidence without secrets", async () => {
  const times = [new Date("2026-09-10T13:50:00Z"), new Date("2026-09-10T13:50:01Z")];
  const evidence = await runActivationFromEnvironment(env, {
    fetchImpl: readyFetch as typeof fetch,
    now: () => times.shift() ?? new Date("2026-09-10T13:50:01Z"),
  });
  assert.equal(evidence.readOnlyReady, true);
  assert.equal(evidence.status, "ready");
  assert.equal(evidence.runId, "activation-test-1");
  assert.equal(evidence.gitCommit, "abc123");
  const serialized = serializedActivationEvidence(evidence);
  assert.doesNotMatch(serialized, new RegExp(secretShop));
  assert.doesNotMatch(serialized, new RegExp(secretGoogle));
  assert.doesNotMatch(serialized, new RegExp(secretProvider));
});

test("write-enabled runtime blocks before network probes", async () => {
  let calls = 0;
  const blockedFetch = (async () => {
    calls += 1;
    return new Response("should not be called", { status: 500 });
  }) as typeof fetch;
  const evidence = await runActivationFromEnvironment({ ...env, PUBLIC_SITE_WRITES_ENABLED: "true" }, { fetchImpl: blockedFetch });
  assert.equal(evidence.readOnlyReady, false);
  assert.equal(evidence.status, "blocked");
  assert.equal(calls, 0);
});

test("provider probe rejects insecure remote HTTP endpoints without network access", async () => {
  let calls = 0;
  const noNetworkFetch = (async () => {
    calls += 1;
    return new Response("ok", { status: 200 });
  }) as typeof fetch;
  const probe = createSeoProviderProbe({ SEO_PROVIDER_PROBE_URL: "http://provider.example/health" }, noNetworkFetch);
  const result = await probe();
  assert.equal(result.ok, false);
  assert.equal(calls, 0);
});
