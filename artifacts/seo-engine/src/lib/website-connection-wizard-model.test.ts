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
