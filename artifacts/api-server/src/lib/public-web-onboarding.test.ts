import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPublicWebOnboardingPlan,
  normalizeSuppliedPublicWebResolution,
} from "./public-web-onboarding.js";

test("UGP-3.1 normalizes a customer URL into an origin-scoped default-off plan", () => {
  const plan = buildPublicWebOnboardingPlan({
    url: "  Example.COM/products/item?ref=campaign#details  ",
  });

  assert.equal(plan.submitted.input, "Example.COM/products/item?ref=campaign#details");
  assert.equal(plan.submitted.normalizedUrl, "https://example.com/products/item?ref=campaign");
  assert.equal(plan.submitted.candidateOrigin, "https://example.com");
  assert.equal(plan.submitted.hostname, "example.com");
  assert.equal(plan.submitted.scheme, "https");
  assert.equal(plan.resolution.bootstrapUrl, "https://example.com/");
  assert.equal(plan.resolution.method, "GET");
  assert.equal(plan.resolution.redirectMode, "manual");
  assert.equal(plan.resolution.maxRedirects, 5);
  assert.equal(plan.resolution.publicAddressVerification, "required_before_each_request");
  assert.equal(plan.resolution.redirectTargetRevalidation, true);
  assert.equal(plan.resolution.finalHttpsRequired, true);
  assert.equal(plan.resolution.platformDetection, "not_performed");
  assert.deepEqual(plan.authorization, {
    networkReadAuthorized: false,
    crawlExecutionAuthorized: false,
    persistenceAuthorized: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
  });
  assert.match(plan.planFingerprint, /^[0-9a-f]{64}$/);
});

test("UGP-3.1 accepts HTTP only as an unresolved candidate and still requires a final HTTPS origin", () => {
  const plan = buildPublicWebOnboardingPlan({ url: "http://www.example.com/path" });
  assert.equal(plan.submitted.scheme, "http");
  assert.equal(plan.resolution.bootstrapUrl, "http://www.example.com/");
  assert.equal(plan.resolution.finalHttpsRequired, true);

  assert.throws(
    () => normalizeSuppliedPublicWebResolution({
      plan,
      evidence: {
        redirectHops: [{
          requestUrl: "http://www.example.com/",
          statusCode: 200,
          resolvedAddresses: ["93.184.216.34"],
          location: null,
        }],
        robots: {
          requestUrl: "http://www.example.com/robots.txt",
          statusCode: 404,
          resolvedAddresses: ["93.184.216.34"],
          body: null,
        },
      },
    }),
    /ugp_public_web_final_https_required/,
  );
});

test("UGP-3.1 rejects malformed, credentialed, reserved, private and nonstandard-port targets", () => {
  for (const input of [
    "",
    "file:///tmp/site",
    "ftp://example.com",
    "https://user:pass@example.com",
    "http://localhost:3000",
    "http://127.0.0.1",
    "https://10.1.2.3",
    "https://169.254.1.1",
    "https://172.16.0.1",
    "https://192.168.1.10",
    "https://192.0.2.2",
    "https://198.51.100.3",
    "https://203.0.113.4",
    "https://store.internal",
    "https://brand.test",
    "https://brand.onion",
    "https://example.com:8443",
    "intranet",
  ]) {
    assert.throws(() => buildPublicWebOnboardingPlan({ url: input }), /ugp_public_web_/, input);
  }
});

test("UGP-3.1 deterministically normalizes supplied redirect, public-address, robots and sitemap evidence", () => {
  const plan = buildPublicWebOnboardingPlan({ url: "http://www.example.com/products?q=1" });
  const evidence = {
    redirectHops: [
      {
        requestUrl: "http://www.example.com/",
        statusCode: 301,
        resolvedAddresses: ["93.184.216.34"],
        location: "https://example.com/",
      },
      {
        requestUrl: "https://example.com/",
        statusCode: 200,
        resolvedAddresses: ["2606:2800:220:1:248:1893:25c8:1946", "93.184.216.34"],
        location: null,
      },
    ],
    robots: {
      requestUrl: "https://example.com/robots.txt",
      statusCode: 200,
      resolvedAddresses: ["93.184.216.34"],
      body: [
        "User-agent: *",
        "Disallow:",
        "Sitemap: https://example.com/custom-sitemap.xml",
        "Sitemap: https://example.com/custom-sitemap.xml#fragment",
        "Sitemap: https://other.example.net/sitemap.xml",
      ].join("\n"),
    },
  } as const;

  const first = normalizeSuppliedPublicWebResolution({ plan, evidence });
  const second = normalizeSuppliedPublicWebResolution({ plan, evidence });

  assert.equal(first.finalUrl, "https://example.com/");
  assert.equal(first.canonicalOrigin, "https://example.com");
  assert.equal(first.hostname, "example.com");
  assert.equal(first.redirectCount, 1);
  assert.equal(first.robots.state, "observed");
  assert.deepEqual(first.sitemapCandidates, [
    "https://example.com/custom-sitemap.xml",
    "https://example.com/sitemap.xml",
    "https://example.com/sitemap_index.xml",
  ]);
  assert.deepEqual(first.rejectedSitemapHints, [{
    value: "https://other.example.net/sitemap.xml",
    reason: "cross_origin",
  }]);
  assert.deepEqual(first.readAnalysisEligibility, {
    eligible: true,
    reason: "eligible",
  });
  assert.equal(first.platformDetection, "not_performed");
  assert.deepEqual(first.authorization, plan.authorization);
  assert.equal(first.resolutionFingerprint, second.resolutionFingerprint);
});

test("UGP-3.1 fails closed on private supplied addresses and HTTPS downgrade redirects", () => {
  const httpsPlan = buildPublicWebOnboardingPlan({ url: "https://example.com" });

  assert.throws(
    () => normalizeSuppliedPublicWebResolution({
      plan: httpsPlan,
      evidence: {
        redirectHops: [{
          requestUrl: "https://example.com/",
          statusCode: 200,
          resolvedAddresses: ["10.0.0.2"],
          location: null,
        }],
        robots: {
          requestUrl: "https://example.com/robots.txt",
          statusCode: 404,
          resolvedAddresses: ["93.184.216.34"],
          body: null,
        },
      },
    }),
    /ugp_public_web_address_not_public/,
  );

  assert.throws(
    () => normalizeSuppliedPublicWebResolution({
      plan: httpsPlan,
      evidence: {
        redirectHops: [
          {
            requestUrl: "https://example.com/",
            statusCode: 301,
            resolvedAddresses: ["93.184.216.34"],
            location: "http://example.com/",
          },
          {
            requestUrl: "http://example.com/",
            statusCode: 200,
            resolvedAddresses: ["93.184.216.34"],
            location: null,
          },
        ],
        robots: {
          requestUrl: "https://example.com/robots.txt",
          statusCode: 404,
          resolvedAddresses: ["93.184.216.34"],
          body: null,
        },
      },
    }),
    /ugp_public_web_redirect_https_downgrade/,
  );
});

test("UGP-3.1 keeps a valid resolution ineligible when robots cannot be safely observed", () => {
  const plan = buildPublicWebOnboardingPlan({ url: "https://example.com" });
  const result = normalizeSuppliedPublicWebResolution({
    plan,
    evidence: {
      redirectHops: [{
        requestUrl: "https://example.com/",
        statusCode: 200,
        resolvedAddresses: ["93.184.216.34"],
        location: null,
      }],
      robots: {
        requestUrl: "https://example.com/robots.txt",
        statusCode: 503,
        resolvedAddresses: ["93.184.216.34"],
        body: null,
      },
    },
  });

  assert.equal(result.robots.state, "unavailable");
  assert.deepEqual(result.readAnalysisEligibility, {
    eligible: false,
    reason: "robots_unavailable",
  });
});

test("UGP-3.1 does not turn URL onboarding into execution authority", () => {
  const plan = buildPublicWebOnboardingPlan({ url: "https://example.com" });
  assert.equal(plan.authorization.networkReadAuthorized, false);
  assert.equal(plan.authorization.crawlExecutionAuthorized, false);
  assert.equal(plan.authorization.persistenceAuthorized, false);
  assert.equal(plan.authorization.providerWrites, false);
  assert.equal(plan.authorization.publicSiteWrites, false);
});
