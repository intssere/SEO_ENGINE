import assert from "node:assert/strict";
import test from "node:test";
import { extractPage, normalizeUrl } from "./index.js";

test("normalizes URLs deterministically", () => {
  assert.equal(
    normalizeUrl("https://EXAMPLE.com:443/products/x/?utm_source=test&b=2#frag"),
    "https://example.com/products/x?b=2",
  );
});

test("extracts core SEO inventory signals", () => {
  const html = `<!doctype html><html><head>
    <title> Test Product </title>
    <meta name="description" content="A test product">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="/products/test">
    <script type="application/ld+json">{"@type":"Product","name":"Test"}</script>
  </head><body>
    <h1>Test Product</h1><h2>Details</h2>
    <a href="/collections/test" rel="nofollow">Collection</a>
    <a href="https://external.example/page">External</a>
    <img src="/image.jpg" alt="Test image">
  </body></html>`;

  const page = extractPage(html, "https://shop.example/products/test?utm_campaign=x");
  assert.equal(page.normalizedUrl, "https://shop.example/products/test");
  assert.equal(page.title, "Test Product");
  assert.equal(page.metaDescription, "A test product");
  assert.equal(page.canonicalUrl, "https://shop.example/products/test");
  assert.equal(page.h1, "Test Product");
  assert.equal(page.indexable, true);
  assert.equal(page.headings.length, 2);
  assert.equal(page.links.length, 2);
  assert.equal(page.links[0]?.internal, true);
  assert.equal(page.links[1]?.internal, false);
  assert.equal(page.images[0]?.src, "https://shop.example/image.jpg");
  assert.equal(page.structuredData.length, 1);
  assert.ok(page.contentHash);
});

test("marks noindex pages non-indexable", () => {
  const page = extractPage(
    '<html><head><meta name="robots" content="noindex,follow"></head><body>Hidden</body></html>',
    "https://example.com/hidden",
  );
  assert.equal(page.indexable, false);
});
