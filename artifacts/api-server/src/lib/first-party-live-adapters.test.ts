import assert from "node:assert/strict";
import test from "node:test";
import {
  DIAMOND_SHELF_CANONICAL_ORIGIN,
  P12_2_CRAWL_BRIDGE_VERSION,
  P12_2_ROBOTS_USER_AGENT,
  type PageTransportRequest,
  type RobotsEvaluationRequest,
  type SitemapAcquisitionRequest,
} from "./first-party-crawl-runtime-bridge.js";
import {
  DIAMOND_SHELF_SITE_ID,
  P12_2_DEFAULT_TRANSIENT_PAGE_BYTES,
  createFirstPartyPageTransport,
  createFirstPartyRobotsEvaluator,
  createFirstPartySitemapAcquirer,
  firstPartyLiveAdapterCapability,
  parseRobotsPolicy,
  robotsAllows,
} from "./first-party-live-adapters.js";
import type {
  PinnedRequestPlan,
  SecureRequestExecutor,
} from "./secure-competitor-transport.js";

const PUBLIC_V4 = "93.184.216.34";

function sitemapRequest(overrides: Partial<SitemapAcquisitionRequest> = {}): SitemapAcquisitionRequest {
  return {
    version: P12_2_CRAWL_BRIDGE_VERSION,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    rootSitemapUrl: DIAMOND_SHELF_CANONICAL_ORIGIN + "/sitemap.xml",
    maxDocuments: 5,
    maxDocumentBytes: 100_000,
    maxDepth: 2,
    maxUrlLength: 2_048,
    sameOriginOnly: true,
    httpsOnly: true,
    queryAllowed: false,
    fragmentAllowed: false,
    ...overrides,
  };
}

function pageRequest(url = DIAMOND_SHELF_CANONICAL_ORIGIN + "/products/a"): PageTransportRequest {
  return {
    version: P12_2_CRAWL_BRIDGE_VERSION,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    canonicalUrl: url,
    method: "GET",
    timeoutMs: 5_000,
    maxRedirects: 3,
    followRedirects: false,
    responseBodyPersistence: false,
  };
}

function robotsRequest(url: string): RobotsEvaluationRequest {
  return {
    version: P12_2_CRAWL_BRIDGE_VERSION,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    canonicalUrl: url,
    userAgent: P12_2_ROBOTS_USER_AGENT,
    method: "GET",
  };
}

test("live adapter capability is production-capable but authorization remains default-off", () => {
  const capability = firstPartyLiveAdapterCapability();
  assert.equal(capability.siteId, DIAMOND_SHELF_SITE_ID);
  assert.equal(capability.canonicalOrigin, DIAMOND_SHELF_CANONICAL_ORIGIN);
  assert.equal(capability.freshDnsResolutionPerRequest, true);
  assert.equal(capability.connectionAddressPinned, true);
  assert.equal(capability.dnsRebindingMitigated, true);
  assert.equal(capability.networkReady, false);
  assert.equal(capability.liveExecutionAuthorized, false);
  assert.equal(capability.persistenceReady, false);
  assert.equal(capability.persistenceAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.autonomousWorkerEnabled, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
});

test("sitemap acquisition recursively follows exact-origin indexes without network fixtures escaping scope", async () => {
  const responses = new Map<string, Response>([
    [
      DIAMOND_SHELF_CANONICAL_ORIGIN + "/sitemap.xml",
      new Response(
        '<sitemapindex><sitemap><loc>https://diamondshelf.us/products.xml</loc></sitemap></sitemapindex>',
        { status: 200, headers: { "content-type": "application/xml" } },
      ),
    ],
    [
      DIAMOND_SHELF_CANONICAL_ORIGIN + "/products.xml",
      new Response(
        '<urlset><url><loc>https://diamondshelf.us/products/a</loc></url></urlset>',
        { status: 200, headers: { "content-type": "application/xml" } },
      ),
    ],
  ]);
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(url);
    const response = responses.get(url);
    if (!response) throw new Error("unexpected_fixture_url");
    return response.clone();
  };

  const documents = await createFirstPartySitemapAcquirer({
    maxTransientPageBytes: P12_2_DEFAULT_TRANSIENT_PAGE_BYTES,
    fetchImpl,
  }).load(sitemapRequest());

  assert.deepEqual(calls, [
    DIAMOND_SHELF_CANONICAL_ORIGIN + "/sitemap.xml",
    DIAMOND_SHELF_CANONICAL_ORIGIN + "/products.xml",
  ]);
  assert.deepEqual(documents.map((item) => item.url), calls);
});

test("sitemap acquisition fails closed on cross-origin redirect, depth and response byte limits", async () => {
  const redirecting: typeof fetch = async () =>
    new Response(null, { status: 302, headers: { location: "https://example.com/sitemap.xml" } });
  await assert.rejects(
    createFirstPartySitemapAcquirer({
      maxTransientPageBytes: P12_2_DEFAULT_TRANSIENT_PAGE_BYTES,
      fetchImpl: redirecting,
    }).load(sitemapRequest()),
    /p12_2_live_url_scope_rejected/,
  );

  const deepResponses = new Map<string, Response>([
    [DIAMOND_SHELF_CANONICAL_ORIGIN + "/sitemap.xml", new Response(
      '<sitemapindex><sitemap><loc>https://diamondshelf.us/a.xml</loc></sitemap></sitemapindex>',
      { status: 200 },
    )],
    [DIAMOND_SHELF_CANONICAL_ORIGIN + "/a.xml", new Response(
      '<sitemapindex><sitemap><loc>https://diamondshelf.us/b.xml</loc></sitemap></sitemapindex>',
      { status: 200 },
    )],
  ]);
  const deepFetch: typeof fetch = async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const response = deepResponses.get(url);
    if (!response) throw new Error("unexpected_fixture_url");
    return response.clone();
  };
  await assert.rejects(
    createFirstPartySitemapAcquirer({
      maxTransientPageBytes: P12_2_DEFAULT_TRANSIENT_PAGE_BYTES,
      fetchImpl: deepFetch,
    }).load(sitemapRequest({ maxDepth: 1 })),
    /p12_2_live_sitemap_depth_exceeded/,
  );

  const oversized: typeof fetch = async () =>
    new Response("x".repeat(101), { status: 200, headers: { "content-length": "101" } });
  await assert.rejects(
    createFirstPartySitemapAcquirer({
      maxTransientPageBytes: P12_2_DEFAULT_TRANSIENT_PAGE_BYTES,
      fetchImpl: oversized,
    }).load(sitemapRequest({ maxDocumentBytes: 100 })),
    /p12_2_live_sitemap_document_oversize/,
  );
});

test("robots policy uses exact-agent precedence, longest rule, allow tie-breaking, wildcard and end anchor", () => {
  const groups = parseRobotsPolicy(`
    User-agent: *
    Disallow: /private/

    User-agent: SEO_ENGINE_P12_2_CERTIFIER
    Disallow: /products/*
    Allow: /products/public$
    Disallow: /same
    Allow: /same
    Sitemap: https://diamondshelf.us/sitemap.xml
  `);
  assert.equal(robotsAllows(groups, DIAMOND_SHELF_CANONICAL_ORIGIN + "/private/x"), true);
  assert.equal(robotsAllows(groups, DIAMOND_SHELF_CANONICAL_ORIGIN + "/products/secret"), false);
  assert.equal(robotsAllows(groups, DIAMOND_SHELF_CANONICAL_ORIGIN + "/products/public"), true);
  assert.equal(robotsAllows(groups, DIAMOND_SHELF_CANONICAL_ORIGIN + "/same"), true);
});

test("robots evaluator is cached in-memory and malformed policy fails closed", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return new Response("User-agent: *\nDisallow: /blocked\n", { status: 200 });
  };
  const evaluator = createFirstPartyRobotsEvaluator({
    maxTransientPageBytes: P12_2_DEFAULT_TRANSIENT_PAGE_BYTES,
    fetchImpl,
  });
  assert.deepEqual(
    await evaluator.evaluate(robotsRequest(DIAMOND_SHELF_CANONICAL_ORIGIN + "/blocked")),
    { allowed: false },
  );
  assert.deepEqual(
    await evaluator.evaluate(robotsRequest(DIAMOND_SHELF_CANONICAL_ORIGIN + "/open")),
    { allowed: true },
  );
  assert.equal(calls, 1);

  const malformed = createFirstPartyRobotsEvaluator({
    maxTransientPageBytes: P12_2_DEFAULT_TRANSIENT_PAGE_BYTES,
    fetchImpl: async () => new Response("User-agent *\nDisallow: /x\n", { status: 200 }),
  });
  await assert.rejects(
    malformed.evaluate(robotsRequest(DIAMOND_SHELF_CANONICAL_ORIGIN + "/x")),
    /p12_2_robots_malformed_policy_line/,
  );
});

test("page transport detects noindex, enforces transient body bound, and returns manual redirect outcome", async () => {
  const noindex = createFirstPartyPageTransport({
    maxTransientPageBytes: 1_000,
    fetchImpl: async () => new Response(
      '<html><head><meta name="robots" content="noindex,follow"></head></html>',
      { status: 200, headers: { "content-type": "text/html" } },
    ),
  });
  assert.deepEqual(await noindex.get(pageRequest()), { kind: "success", noindex: true });

  const headerNoindex = createFirstPartyPageTransport({
    maxTransientPageBytes: 1_000,
    fetchImpl: async () => new Response("", {
      status: 200,
      headers: { "x-robots-tag": "noindex", "content-type": "text/html" },
    }),
  });
  assert.deepEqual(await headerNoindex.get(pageRequest()), { kind: "success", noindex: true });

  const oversize = createFirstPartyPageTransport({
    maxTransientPageBytes: 10,
    fetchImpl: async () => new Response("01234567890", {
      status: 200,
      headers: { "content-type": "text/html", "content-length": "11" },
    }),
  });
  assert.deepEqual(await oversize.get(pageRequest()), {
    kind: "failure",
    signal: { kind: "policy_rejection" },
  });

  const redirect = createFirstPartyPageTransport({
    maxTransientPageBytes: 1_000,
    fetchImpl: async () => new Response(null, {
      status: 302,
      headers: { location: "/products/b" },
    }),
  });
  assert.deepEqual(await redirect.get(pageRequest()), {
    kind: "redirect",
    redirectTarget: DIAMOND_SHELF_CANONICAL_ORIGIN + "/products/b",
    redirectCount: 1,
  });
});

test("first-party page transport inherits public-address pinning and rejects mixed/private DNS answers", async () => {
  let executions = 0;
  const execute: SecureRequestExecutor = async (_plan: PinnedRequestPlan) => {
    executions += 1;
    return new Response("<html></html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  };
  const mixed = createFirstPartyPageTransport({
    maxTransientPageBytes: 1_000,
    resolveHost: async () => [PUBLIC_V4, "127.0.0.1"],
    execute,
  });
  assert.deepEqual(await mixed.get(pageRequest()), {
    kind: "failure",
    signal: { kind: "policy_rejection" },
  });
  assert.equal(executions, 0);

  let resolverCalls = 0;
  const rebinding = createFirstPartyPageTransport({
    maxTransientPageBytes: 1_000,
    resolveHost: async () => {
      resolverCalls += 1;
      return resolverCalls === 1 ? [PUBLIC_V4] : ["10.0.0.1"];
    },
    execute,
  });
  assert.deepEqual(await rebinding.get(pageRequest()), { kind: "success" });
  assert.deepEqual(await rebinding.get(pageRequest(DIAMOND_SHELF_CANONICAL_ORIGIN + "/products/b")), {
    kind: "failure",
    signal: { kind: "policy_rejection" },
  });
  assert.equal(resolverCalls, 2);
  assert.equal(executions, 1);
});

test("exact site/origin/HTTPS/query/credential scope fails closed before transport", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return new Response("", { status: 200 });
  };
  const transport = createFirstPartyPageTransport({
    maxTransientPageBytes: 1_000,
    fetchImpl,
  });

  assert.deepEqual(await transport.get({
    ...pageRequest(),
    siteId: "wrong-site",
  }), { kind: "failure", signal: { kind: "policy_rejection" } });

  assert.deepEqual(await transport.get(pageRequest("https://example.com/a")), {
    kind: "failure",
    signal: { kind: "policy_rejection" },
  });
  assert.deepEqual(await transport.get(pageRequest("https://diamondshelf.us/a?x=1")), {
    kind: "failure",
    signal: { kind: "policy_rejection" },
  });
  assert.equal(calls, 0);
});
