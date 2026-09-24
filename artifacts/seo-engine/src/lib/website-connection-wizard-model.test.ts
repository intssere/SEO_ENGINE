import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeWebsiteTarget,
  platformHintForHostname,
} from "./website-connection-wizard-model";

test("website target normalization is deterministic and origin-scoped", () => {
  assert.deepEqual(normalizeWebsiteTarget(" Example.COM/products/item?x=1#top "), {
    ok: true,
    target: {
      canonicalOrigin: "https://example.com",
      hostname: "example.com",
      publicWebOnboarding: {
        status: "planned_not_executed",
        bootstrapUrl: "https://example.com/",
        finalHttpsRequired: true,
        checks: [
          { id: "dns", label: "DNS / public address" },
          { id: "redirects", label: "Redirect chain" },
          { id: "robots", label: "robots.txt" },
          { id: "sitemaps", label: "Sitemap hints" },
        ],
      },
      platformHint: {
        id: "unknown",
        label: "Platform not identified",
        evidence: "none",
      },
    },
  });
});

test("website target validation rejects unsafe or unsupported targets", () => {
  for (const input of [
    "",
    "file:///tmp/site",
    "ftp://example.com",
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://10.1.2.3",
    "https://192.168.1.10",
    "https://192.0.2.2",
    "https://198.51.100.3",
    "https://203.0.113.4",
    "https://brand.test",
    "https://example.com:8443",
    "https://user:pass@example.com",
    "intranet",
  ]) {
    assert.equal(normalizeWebsiteTarget(input).ok, false, input);
  }
});

test("platform hints are URL-pattern hints only", () => {
  assert.deepEqual(platformHintForHostname("store.myshopify.com"), {
    id: "shopify",
    label: "Shopify",
    evidence: "url_pattern_only",
  });
  assert.equal(platformHintForHostname("brand.wordpress.com").id, "wordpress");
  assert.equal(platformHintForHostname("brand.webflow.io").id, "webflow");
  assert.equal(platformHintForHostname("brand.wixsite.com").id, "wix");
  assert.deepEqual(platformHintForHostname("example.com"), {
    id: "unknown",
    label: "Platform not identified",
    evidence: "none",
  });
});


test("public web onboarding remains planned and requires final HTTPS resolution", () => {
  const result = normalizeWebsiteTarget("http://www.example.com/path?q=1#fragment");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.target.canonicalOrigin, "http://www.example.com");
  assert.equal(result.target.publicWebOnboarding.status, "planned_not_executed");
  assert.equal(result.target.publicWebOnboarding.bootstrapUrl, "http://www.example.com/");
  assert.equal(result.target.publicWebOnboarding.finalHttpsRequired, true);
  assert.deepEqual(
    result.target.publicWebOnboarding.checks.map((check) => check.label),
    ["DNS / public address", "Redirect chain", "robots.txt", "Sitemap hints"],
  );
});
