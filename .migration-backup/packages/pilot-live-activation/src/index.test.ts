import test from "node:test";
import assert from "node:assert/strict";
import { runSecureReadOnlyActivation } from "./index.js";

const config = {
  siteDomain: "diamondshelf.us",
  shopDomain: "vcuxm7-76.myshopify.com",
  shopAccessToken: "runtime-secret",
  gscSiteUrl: "https://diamondshelf.us/",
  ga4PropertyId: "123456789",
  googleAccessToken: "runtime-google-token",
  publicSiteWritesEnabled: "false",
};

function mockFetch(input: string | URL | Request): Promise<Response> {
  const url = String(input);
  if (url.includes("myshopify.com")) {
    return Promise.resolve(new Response(JSON.stringify({ data: { shop: { name: "Diamond Shelf", myshopifyDomain: "vcuxm7-76.myshopify.com" } } }), { status: 200, headers: { "content-type": "application/json" } }));
  }
  if (url.includes("webmasters/v3/sites")) {
    return Promise.resolve(new Response(JSON.stringify({ siteEntry: [{ siteUrl: "https://diamondshelf.us/", permissionLevel: "siteOwner" }] }), { status: 200, headers: { "content-type": "application/json" } }));
  }
  if (url.includes("analyticsdata.googleapis.com")) {
    return Promise.resolve(new Response(JSON.stringify({ name: "properties/123456789/metadata" }), { status: 200, headers: { "content-type": "application/json" } }));
  }
  return Promise.resolve(new Response("not found", { status: 404 }));
}

test("all secure read-only live probes can become ready", async () => {
  const result = await runSecureReadOnlyActivation(config, {
    fetchImpl: mockFetch as typeof fetch,
    seoProviderProbe: async () => ({ ok: true, detail: "OpenSEO provider mapping verified." }),
  });
  assert.equal(result.status, "ready");
  assert.equal(result.readOnlyReady, true);
  assert.equal(result.blockers.length, 0);
  assert.equal(result.probes.filter((probe) => probe.state === "ready").length, 5);
});

test("write gate blocks all live probes before any network request", async () => {
  let calls = 0;
  const result = await runSecureReadOnlyActivation({ ...config, publicSiteWritesEnabled: "true" }, {
    fetchImpl: (async () => { calls += 1; return new Response("unexpected"); }) as typeof fetch,
    seoProviderProbe: async () => { throw new Error("should not run"); },
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.readOnlyReady, false);
  assert.equal(calls, 0);
  assert.match(result.blockers.join(" "), /PUBLIC_SITE_WRITES_ENABLED/);
});

test("wrong live GSC property blocks read-only readiness", async () => {
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("myshopify.com")) return new Response(JSON.stringify({ data: { shop: { myshopifyDomain: "vcuxm7-76.myshopify.com" } } }), { status: 200 });
    if (url.includes("webmasters/v3/sites")) return new Response(JSON.stringify({ siteEntry: [{ siteUrl: "https://example.com/", permissionLevel: "siteOwner" }] }), { status: 200 });
    if (url.includes("analyticsdata.googleapis.com")) return new Response(JSON.stringify({ name: "properties/123456789/metadata" }), { status: 200 });
    return new Response("", { status: 404 });
  }) as typeof fetch;

  const result = await runSecureReadOnlyActivation(config, {
    fetchImpl,
    seoProviderProbe: async () => ({ ok: true }),
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.readOnlyReady, false);
  assert.ok(result.probes.some((probe) => probe.id === "gsc" && probe.state === "failed"));
});

test("probe output never contains configured access tokens", async () => {
  const result = await runSecureReadOnlyActivation(config, {
    fetchImpl: mockFetch as typeof fetch,
    seoProviderProbe: async () => ({ ok: true }),
  });
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(config.shopAccessToken), false);
  assert.equal(serialized.includes(config.googleAccessToken), false);
});
