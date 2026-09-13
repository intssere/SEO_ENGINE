import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPinnedRequestPlan,
  createSecureCompetitorFetch,
  resolveValidatedPublicAddresses,
  secureCompetitorTransportCapability,
  type PinnedRequestPlan,
  type SecureRequestExecutor,
} from "./secure-competitor-transport.js";

const PUBLIC_V4 = "93.184.216.34";
const PUBLIC_V6 = "2606:2800:220:1:248:1893:25c8:1946";

function response(body = "ok") {
  return new Response(body, { status: 200, headers: { "content-type": "text/plain" } });
}

async function rejectsReason(promise: Promise<unknown>, reason: string) {
  await assert.rejects(promise, (error: unknown) => error instanceof Error && error.message === reason);
}

test("capability declares connection-level SSRF hardening while keeping collection authorization closed", () => {
  const capability = secureCompetitorTransportCapability();
  assert.equal(capability.controlledResolution, true);
  assert.equal(capability.allResolvedAddressesMustBePublic, true);
  assert.equal(capability.connectionAddressPinned, true);
  assert.equal(capability.connectionTimeDnsResolution, false);
  assert.equal(capability.dnsRebindingMitigated, true);
  assert.equal(capability.tlsCertificateVerification, true);
  assert.equal(capability.tlsHostnameVerification, true);
  assert.equal(capability.sniUsesOriginalHostname, true);
  assert.equal(capability.ambientProxyRouting, false);
  assert.equal(capability.freshPinRequiredPerRequest, true);
  assert.equal(capability.callerRevalidatesRedirectHops, true);
  assert.equal(capability.networkCollectionReady, false);
  assert.equal(capability.collectionAuthorized, false);
  assert.equal(capability.persistenceAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.autonomousWorkerEnabled, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.executionAuthorized, false);
});

test("mixed public and private DNS answers fail closed before any request executor runs", async () => {
  let executions = 0;
  const fetchImpl = createSecureCompetitorFetch({
    resolveHost: async () => [PUBLIC_V4, "127.0.0.1"],
    execute: async () => {
      executions += 1;
      return response();
    },
  });
  await rejectsReason(fetchImpl("https://example.com/collections/unisex", { redirect: "manual" }), "non_public_network_target");
  assert.equal(executions, 0);
});

test("private-only and unresolved DNS answers fail closed", async () => {
  await rejectsReason(resolveValidatedPublicAddresses("example.com", async () => ["10.0.0.1"]), "non_public_network_target");
  await rejectsReason(resolveValidatedPublicAddresses("example.com", async () => []), "network_target_unresolved");
});

test("all public A and AAAA answers are accepted and first validated answer is pinned deterministically", async () => {
  const plan = await buildPinnedRequestPlan({
    request: "https://example.com/collections/unisex",
    init: { method: "GET", redirect: "manual", headers: { accept: "text/html" } },
    resolveHost: async () => [PUBLIC_V6, PUBLIC_V4, PUBLIC_V6],
  });
  assert.equal(plan.address, PUBLIC_V6.toLowerCase());
  assert.equal(plan.family, 6);
  assert.equal(plan.hostname, "example.com");
  assert.equal(plan.hostHeader, "example.com");
  assert.equal(plan.headers.host, "example.com");
  assert.equal(plan.proxyMode, "disabled");
});

test("HTTPS connects to the pinned address while preserving original hostname and SNI metadata", async () => {
  const plan = await buildPinnedRequestPlan({
    request: "https://www.example.com:8443/collections/unisex?view=all",
    init: { redirect: "manual", headers: { "user-agent": "SEO-ENGINE-Test/1.0" } },
    resolveHost: async () => [PUBLIC_V4],
  });
  assert.equal(plan.protocol, "https:");
  assert.equal(plan.address, PUBLIC_V4);
  assert.equal(plan.hostname, "www.example.com");
  assert.equal(plan.servername, "www.example.com");
  assert.equal(plan.port, 8443);
  assert.equal(plan.path, "/collections/unisex?view=all");
  assert.equal(plan.hostHeader, "www.example.com:8443");
  assert.equal(plan.headers.host, "www.example.com:8443");
});

test("HTTP uses a pinned address without TLS servername", async () => {
  const plan = await buildPinnedRequestPlan({
    request: "http://example.com/path",
    init: { redirect: "manual" },
    resolveHost: async () => [PUBLIC_V4],
  });
  assert.equal(plan.protocol, "http:");
  assert.equal(plan.address, PUBLIC_V4);
  assert.equal(plan.servername, null);
  assert.equal(plan.port, 80);
});

test("each secure request resolves afresh and a later rebinding to private space is blocked", async () => {
  let resolverCalls = 0;
  const plans: PinnedRequestPlan[] = [];
  const resolveHost = async () => {
    resolverCalls += 1;
    return resolverCalls === 1 ? [PUBLIC_V4] : ["127.0.0.1"];
  };
  const execute: SecureRequestExecutor = async (plan) => {
    plans.push(plan);
    return response();
  };
  const fetchImpl = createSecureCompetitorFetch({ resolveHost, execute });

  const first = await fetchImpl("https://example.com/collections/unisex", { redirect: "manual" });
  assert.equal(first.status, 200);
  assert.equal(plans.length, 1);
  assert.equal(plans[0]?.address, PUBLIC_V4);

  await rejectsReason(fetchImpl("https://example.com/collections/unisex/next", { redirect: "manual" }), "non_public_network_target");
  assert.equal(resolverCalls, 2);
  assert.equal(plans.length, 1);
});

test("ambient proxy variables cannot change the pinned request plan", async () => {
  const beforeHttps = process.env.HTTPS_PROXY;
  const beforeHttp = process.env.HTTP_PROXY;
  const beforeAll = process.env.ALL_PROXY;
  process.env.HTTPS_PROXY = "http://127.0.0.1:9999";
  process.env.HTTP_PROXY = "http://127.0.0.1:9999";
  process.env.ALL_PROXY = "socks5://127.0.0.1:9999";
  try {
    const plan = await buildPinnedRequestPlan({
      request: "https://example.com/collections/unisex",
      init: { redirect: "manual" },
      resolveHost: async () => [PUBLIC_V4],
    });
    assert.equal(plan.address, PUBLIC_V4);
    assert.equal(plan.proxyMode, "disabled");
    assert.equal(plan.hostname, "example.com");
  } finally {
    if (beforeHttps == null) delete process.env.HTTPS_PROXY; else process.env.HTTPS_PROXY = beforeHttps;
    if (beforeHttp == null) delete process.env.HTTP_PROXY; else process.env.HTTP_PROXY = beforeHttp;
    if (beforeAll == null) delete process.env.ALL_PROXY; else process.env.ALL_PROXY = beforeAll;
  }
});

test("aborted requests fail before resolver or executor work", async () => {
  let resolverCalls = 0;
  let executions = 0;
  const controller = new AbortController();
  controller.abort();
  const fetchImpl = createSecureCompetitorFetch({
    resolveHost: async () => {
      resolverCalls += 1;
      return [PUBLIC_V4];
    },
    execute: async () => {
      executions += 1;
      return response();
    },
  });
  await assert.rejects(fetchImpl("https://example.com/path", { redirect: "manual", signal: controller.signal }), (error: unknown) => error instanceof Error && error.name === "AbortError");
  assert.equal(resolverCalls, 0);
  assert.equal(executions, 0);
});

test("unsupported methods, bodies, redirect modes, credentials, and sensitive forwarding headers fail closed", async () => {
  const resolver = async () => [PUBLIC_V4];
  await rejectsReason(buildPinnedRequestPlan({ request: "https://example.com/", init: { method: "POST", redirect: "manual" }, resolveHost: resolver }), "request_method_not_supported");
  await rejectsReason(buildPinnedRequestPlan({ request: "https://example.com/", init: { method: "GET", body: "x", redirect: "manual" }, resolveHost: resolver }), "request_body_not_supported");
  await rejectsReason(buildPinnedRequestPlan({ request: "https://example.com/", init: { redirect: "follow" }, resolveHost: resolver }), "redirect_mode_must_be_manual");
  await rejectsReason(buildPinnedRequestPlan({ request: "https://user:pass@example.com/", init: { redirect: "manual" }, resolveHost: resolver }), "credential_bearing_url");
  await rejectsReason(buildPinnedRequestPlan({ request: "https://example.com/", init: { redirect: "manual", headers: { authorization: "Bearer secret" } }, resolveHost: resolver }), "forbidden_request_header_authorization");
  await rejectsReason(buildPinnedRequestPlan({ request: "https://example.com/", init: { redirect: "manual", headers: { cookie: "session=secret" } }, resolveHost: resolver }), "forbidden_request_header_cookie");
});

test("secure fetch returns the executor response and exposes only the validated pinned plan", async () => {
  let captured: PinnedRequestPlan | null = null;
  const fetchImpl = createSecureCompetitorFetch({
    resolveHost: async () => [PUBLIC_V4],
    execute: async (plan) => {
      captured = plan;
      return new Response("safe", { status: 203, headers: { "x-test": "yes" } });
    },
  });
  const result = await fetchImpl("https://example.com/collections/unisex", { redirect: "manual" });
  assert.equal(result.status, 203);
  assert.equal(await result.text(), "safe");
  assert.equal(result.headers.get("x-test"), "yes");
  assert.equal(captured?.address, PUBLIC_V4);
  assert.equal(captured?.servername, "example.com");
  assert.equal(captured?.proxyMode, "disabled");
});
