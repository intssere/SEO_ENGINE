import assert from "node:assert/strict";
import test from "node:test";
import { planFirstPartyCrawl } from "./crawl-controller.js";
import { buildSitemapInventory, type SitemapInventoryPolicy } from "./sitemap-inventory.js";

const target = {
  targetClass: "first_party" as const,
  siteId: "diamond-shelf",
  canonicalOrigin: "https://diamondshelf.us",
};

function fullSitePlan(hardPageLimit = 100) {
  return planFirstPartyCrawl(
    { mode: "full_site", target, hardPageLimit },
    { absolutePageCeiling: 1_000 },
  );
}

function policy(overrides: Partial<SitemapInventoryPolicy> = {}): SitemapInventoryPolicy {
  return {
    maxDocuments: 10,
    maxDepth: 3,
    maxDocumentBytes: 10_000,
    maxInventoryUrls: 100,
    maxPathSegments: 20,
    ...overrides,
  };
}

test("supplied sitemap document count is bounded at ingestion", () => {
  const documents = [
    { url: "https://diamondshelf.us/sitemap.xml", xml: "<urlset></urlset>" },
    { url: "https://diamondshelf.us/extra.xml", xml: "<urlset></urlset>" },
  ];

  assert.throws(
    () => buildSitemapInventory({
      plan: fullSitePlan(),
      rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
      documents,
      policy: policy({ maxDocuments: 1 }),
    }),
    /sitemap_supplied_document_count_exceeds_limit/,
  );
});

test("per-document UTF-8 byte ceiling is enforced before XML parsing", () => {
  const xml = "<urlset><url><loc>https://diamondshelf.us/a</loc></url></urlset>";
  const bytes = Buffer.byteLength(xml, "utf8");

  assert.throws(
    () => buildSitemapInventory({
      plan: fullSitePlan(),
      rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
      documents: [{ url: "https://diamondshelf.us/sitemap.xml", xml }],
      policy: policy({ maxDocumentBytes: bytes - 1 }),
    }),
    /sitemap_document_bytes_exceeds_limit/,
  );

  const accepted = buildSitemapInventory({
    plan: fullSitePlan(),
    rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
    documents: [{ url: "https://diamondshelf.us/sitemap.xml", xml }],
    policy: policy({ maxDocumentBytes: bytes }),
  });
  assert.equal(accepted.inventory.uniqueUrls, 1);
});

test("nested sitemap extension loc elements cannot overwrite the direct page loc", () => {
  const result = buildSitemapInventory({
    plan: fullSitePlan(),
    rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
    documents: [{
      url: "https://diamondshelf.us/sitemap.xml",
      xml: `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
        <url>
          <loc>https://diamondshelf.us/products/alpha</loc>
          <image:image><image:loc>https://cdn.example.com/alpha.jpg</image:loc></image:image>
        </url>
      </urlset>`,
    }],
    policy: policy(),
  });

  assert.equal(result.inventory.uniqueUrls, 1);
  assert.equal(result.inventory.entries[0]?.canonicalUrl, "https://diamondshelf.us/products/alpha");
  assert.equal(result.rejectionCounts.cross_origin, 0);
});

test("malformed element attributes fail closed", () => {
  assert.throws(
    () => buildSitemapInventory({
      plan: fullSitePlan(),
      rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
      documents: [{
        url: "https://diamondshelf.us/sitemap.xml",
        xml: `<urlset bad-attribute><url><loc>https://diamondshelf.us/a</loc></url></urlset>`,
      }],
      policy: policy(),
    }),
    /sitemap_xml_malformed_tag/,
  );
});
