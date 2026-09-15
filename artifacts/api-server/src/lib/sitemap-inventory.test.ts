import assert from "node:assert/strict";
import test from "node:test";
import { planFirstPartyCrawl } from "./crawl-controller.js";
import {
  SITEMAP_INVENTORY_ABSOLUTE_LIMITS,
  buildSitemapInventory,
  type SitemapInventoryPolicy,
  type SuppliedSitemapDocument,
} from "./sitemap-inventory.js";

const target = {
  targetClass: "first_party" as const,
  siteId: "diamond-shelf",
  canonicalOrigin: "https://diamondshelf.us",
};

function fullSitePlan(hardPageLimit = 5_000) {
  return planFirstPartyCrawl(
    { mode: "full_site", target, hardPageLimit },
    { absolutePageCeiling: 10_000 },
  );
}

function policy(overrides: Partial<SitemapInventoryPolicy> = {}): SitemapInventoryPolicy {
  return {
    maxDocuments: 20,
    maxDepth: 3,
    maxDocumentBytes: 100_000,
    maxInventoryUrls: 5_000,
    maxPathSegments: 20,
    ...overrides,
  };
}

function docs(): SuppliedSitemapDocument[] {
  return [
    {
      url: "https://diamondshelf.us/sitemap.xml",
      xml: `<?xml version="1.0" encoding="UTF-8"?>
        <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <sitemap><loc>https://diamondshelf.us/products-sitemap.xml</loc></sitemap>
          <sitemap><loc>https://diamondshelf.us/collections-sitemap.xml</loc></sitemap>
        </sitemapindex>`,
    },
    {
      url: "https://diamondshelf.us/products-sitemap.xml",
      xml: `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://diamondshelf.us/products/alpha/</loc><lastmod>2026-09-14</lastmod></url>
        <url><loc>https://diamondshelf.us/products/beta</loc><lastmod>2026-09-14T10:00:00Z</lastmod></url>
      </urlset>`,
    },
    {
      url: "https://diamondshelf.us/collections-sitemap.xml",
      xml: `<sm:urlset xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9">
        <sm:url><sm:loc>https://diamondshelf.us/products/alpha</sm:loc><sm:lastmod>2026-09-15</sm:lastmod></sm:url>
        <sm:url><sm:loc><![CDATA[https://diamondshelf.us/collections/fragrance]]></sm:loc></sm:url>
      </sm:urlset>`,
    },
  ];
}

test("supplied sitemap index and urlsets produce deterministic canonical inventory", () => {
  const result = buildSitemapInventory({
    plan: fullSitePlan(),
    rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
    documents: docs(),
    policy: policy(),
  });

  assert.equal(result.completeness.complete, true);
  assert.equal(result.completeness.hardLimitReached, false);
  assert.deepEqual(result.documents, {
    supplied: 3,
    processed: 3,
    referenced: 2,
    missingSupplied: [],
  });
  assert.equal(result.inventory.acceptedOccurrences, 4);
  assert.equal(result.inventory.duplicateOccurrences, 1);
  assert.equal(result.inventory.uniqueUrls, 3);
  assert.deepEqual(result.inventory.entries.map((entry) => entry.canonicalUrl), [
    "https://diamondshelf.us/collections/fragrance",
    "https://diamondshelf.us/products/alpha",
    "https://diamondshelf.us/products/beta",
  ]);
  assert.deepEqual(result.inventory.entries.find((entry) => entry.canonicalUrl.endsWith("/alpha")), {
    canonicalUrl: "https://diamondshelf.us/products/alpha",
    sourceSitemaps: [
      "https://diamondshelf.us/collections-sitemap.xml",
      "https://diamondshelf.us/products-sitemap.xml",
    ],
    lastmod: "2026-09-15",
  });
  assert.match(result.fingerprint, /^[a-f0-9]{64}$/);
  assert.deepEqual(result.authorization, {
    networkFetchingEnabled: false,
    crawlExecutionEnabled: false,
    persistenceAuthorized: false,
    schedulerEnabled: false,
    batchExecutorEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    competitorCollectionAuthorized: false,
    competitorPersistenceAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
  });
});

test("equivalent supplied-document ordering produces identical fingerprint and inventory", () => {
  const forward = buildSitemapInventory({
    plan: fullSitePlan(),
    rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
    documents: docs(),
    policy: policy(),
  });
  const reversed = buildSitemapInventory({
    plan: fullSitePlan(),
    rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
    documents: docs().reverse(),
    policy: policy(),
  });

  assert.equal(forward.fingerprint, reversed.fingerprint);
  assert.deepEqual(forward.inventory, reversed.inventory);
  assert.deepEqual(forward.rejections, reversed.rejections);
});

test("missing supplied child is explicit and incomplete without network fallback", () => {
  const result = buildSitemapInventory({
    plan: fullSitePlan(),
    rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
    documents: [docs()[0]!],
    policy: policy(),
  });

  assert.equal(result.completeness.complete, false);
  assert.equal(result.completeness.hardLimitReached, false);
  assert.deepEqual(result.completeness.reasons, ["missing_supplied_sitemap_document"]);
  assert.deepEqual(result.documents.missingSupplied, [
    "https://diamondshelf.us/collections-sitemap.xml",
    "https://diamondshelf.us/products-sitemap.xml",
  ]);
  assert.equal(result.inventory.uniqueUrls, 0);
  assert.equal(result.authorization.networkFetchingEnabled, false);
});

test("URL policy rejects unsupported scheme, credentials, cross-origin, fragment, query and trap paths", () => {
  const document: SuppliedSitemapDocument = {
    url: "https://diamondshelf.us/sitemap.xml",
    xml: `<urlset>
      <url><loc>http://diamondshelf.us/http</loc></url>
      <url><loc>https://user:pass@diamondshelf.us/secret</loc></url>
      <url><loc>https://example.com/external</loc></url>
      <url><loc>https://diamondshelf.us/page#section</loc></url>
      <url><loc>https://diamondshelf.us/search?q=test</loc></url>
      <url><loc>https://diamondshelf.us/cart</loc></url>
      <url><loc>https://diamondshelf.us/a/b/c/d</loc></url>
      <url><loc>https://diamondshelf.us/ok</loc></url>
    </urlset>`,
  };
  const result = buildSitemapInventory({
    plan: fullSitePlan(),
    rootSitemapUrl: document.url,
    documents: [document],
    policy: policy({ maxPathSegments: 3 }),
  });

  assert.equal(result.inventory.uniqueUrls, 1);
  assert.equal(result.rejectionCounts.unsupported_scheme, 1);
  assert.equal(result.rejectionCounts.credentials_not_allowed, 1);
  assert.equal(result.rejectionCounts.cross_origin, 1);
  assert.equal(result.rejectionCounts.fragment_not_allowed, 1);
  assert.equal(result.rejectionCounts.query_not_allowed, 1);
  assert.equal(result.rejectionCounts.excluded_path, 1);
  assert.equal(result.rejectionCounts.path_depth_exceeded, 1);
  assert.ok(result.rejections.every((rejection) => !JSON.stringify(rejection).includes("user:pass")));
});

test("XML DTD/entities, unsupported roots and malformed nesting fail closed", () => {
  const base = {
    plan: fullSitePlan(),
    rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
    policy: policy(),
  };

  assert.throws(
    () => buildSitemapInventory({ ...base, documents: [{ url: base.rootSitemapUrl, xml: `<!DOCTYPE foo [<!ENTITY x "https://diamondshelf.us/x">]><urlset><url><loc>&x;</loc></url></urlset>` }] }),
    /sitemap_xml_dtd_or_entity_not_allowed/,
  );
  assert.throws(
    () => buildSitemapInventory({ ...base, documents: [{ url: base.rootSitemapUrl, xml: `<rss><url><loc>https://diamondshelf.us/x</loc></url></rss>` }] }),
    /sitemap_xml_unsupported_root/,
  );
  assert.throws(
    () => buildSitemapInventory({ ...base, documents: [{ url: base.rootSitemapUrl, xml: `<urlset><url><loc>https://diamondshelf.us/x</url></loc></urlset>` }] }),
    /sitemap_xml_malformed_nesting/,
  );
  assert.throws(
    () => buildSitemapInventory({ ...base, documents: [{ url: base.rootSitemapUrl, xml: `<urlset><url><loc>https://diamondshelf.us/x&amp;unknown;</loc></url></urlset>` }] }),
    /sitemap_xml_entity_unsupported/,
  );
});

test("all explicit sitemap planning ceilings are finite integers within code absolute ceilings", () => {
  const base = {
    plan: fullSitePlan(),
    rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
    documents: [{ url: "https://diamondshelf.us/sitemap.xml", xml: "<urlset></urlset>" }],
  };

  for (const invalid of [Infinity, Number.NaN, -1, 1.5]) {
    assert.throws(() => buildSitemapInventory({ ...base, policy: policy({ maxDocuments: invalid }) }), /sitemap_max_documents_invalid/);
    assert.throws(() => buildSitemapInventory({ ...base, policy: policy({ maxDepth: invalid }) }), /sitemap_max_depth_invalid/);
    assert.throws(() => buildSitemapInventory({ ...base, policy: policy({ maxDocumentBytes: invalid }) }), /sitemap_max_document_bytes_invalid/);
    assert.throws(() => buildSitemapInventory({ ...base, policy: policy({ maxInventoryUrls: invalid }) }), /sitemap_max_inventory_urls_invalid/);
    assert.throws(() => buildSitemapInventory({ ...base, policy: policy({ maxPathSegments: invalid }) }), /sitemap_max_path_segments_invalid/);
  }
  assert.throws(() => buildSitemapInventory({ ...base, policy: policy({ maxDocuments: SITEMAP_INVENTORY_ABSOLUTE_LIMITS.documents + 1 }) }), /sitemap_max_documents_invalid/);
  assert.throws(() => buildSitemapInventory({ ...base, policy: policy({ maxDepth: SITEMAP_INVENTORY_ABSOLUTE_LIMITS.depth + 1 }) }), /sitemap_max_depth_invalid/);
  assert.throws(() => buildSitemapInventory({ ...base, policy: policy({ maxDocumentBytes: SITEMAP_INVENTORY_ABSOLUTE_LIMITS.documentBytes + 1 }) }), /sitemap_max_document_bytes_invalid/);
  assert.throws(() => buildSitemapInventory({ ...base, policy: policy({ maxInventoryUrls: SITEMAP_INVENTORY_ABSOLUTE_LIMITS.inventoryUrls + 1 }) }), /sitemap_max_inventory_urls_invalid/);
  assert.throws(() => buildSitemapInventory({ ...base, policy: policy({ maxPathSegments: SITEMAP_INVENTORY_ABSOLUTE_LIMITS.pathSegments + 1 }) }), /sitemap_max_path_segments_invalid/);
});

test("inventory URL ceiling cannot exceed the P2.1 crawl hard page fuse", () => {
  assert.throws(
    () => buildSitemapInventory({
      plan: fullSitePlan(100),
      rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
      documents: [{ url: "https://diamondshelf.us/sitemap.xml", xml: "<urlset></urlset>" }],
      policy: policy({ maxInventoryUrls: 101 }),
    }),
    /sitemap_inventory_limit_exceeds_crawl_plan/,
  );
});

test("baseline plans are rejected before inventory parsing", () => {
  const baseline = planFirstPartyCrawl({ mode: "baseline", target });
  assert.throws(
    () => buildSitemapInventory({
      plan: baseline,
      rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
      documents: [{ url: "https://diamondshelf.us/sitemap.xml", xml: "<urlset></urlset>" }],
      policy: policy({ maxInventoryUrls: 30 }),
    }),
    /sitemap_full_site_plan_required/,
  );
});

test("inventory hard limit is explicit and prevents false whole-inventory completeness", () => {
  const result = buildSitemapInventory({
    plan: fullSitePlan(2),
    rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
    documents: [{
      url: "https://diamondshelf.us/sitemap.xml",
      xml: `<urlset>
        <url><loc>https://diamondshelf.us/a</loc></url>
        <url><loc>https://diamondshelf.us/b</loc></url>
        <url><loc>https://diamondshelf.us/c</loc></url>
      </urlset>`,
    }],
    policy: policy({ maxInventoryUrls: 2 }),
  });

  assert.equal(result.inventory.uniqueUrls, 2);
  assert.equal(result.completeness.complete, false);
  assert.equal(result.completeness.hardLimitReached, true);
  assert.deepEqual(result.completeness.reasons, ["inventory_url_limit_reached"]);
  assert.equal(result.rejectionCounts.inventory_url_limit_reached, 1);
});

test("nested sitemap depth ceiling is explicit and marks inventory incomplete", () => {
  const documents: SuppliedSitemapDocument[] = [
    { url: "https://diamondshelf.us/sitemap.xml", xml: `<sitemapindex><sitemap><loc>https://diamondshelf.us/level-1.xml</loc></sitemap></sitemapindex>` },
    { url: "https://diamondshelf.us/level-1.xml", xml: `<sitemapindex><sitemap><loc>https://diamondshelf.us/level-2.xml</loc></sitemap></sitemapindex>` },
    { url: "https://diamondshelf.us/level-2.xml", xml: `<urlset><url><loc>https://diamondshelf.us/final</loc></url></urlset>` },
  ];
  const result = buildSitemapInventory({
    plan: fullSitePlan(),
    rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
    documents,
    policy: policy({ maxDepth: 1 }),
  });

  assert.equal(result.completeness.complete, false);
  assert.equal(result.completeness.hardLimitReached, true);
  assert.ok(result.completeness.reasons.includes("sitemap_depth_limit_reached"));
  assert.equal(result.rejectionCounts.sitemap_depth_exceeded, 1);
  assert.equal(result.inventory.uniqueUrls, 0);
});

test("raw supplied XML and credential-bearing candidates never appear in output", () => {
  const secretMarker = "RAW_XML_SECRET_MARKER";
  const result = buildSitemapInventory({
    plan: fullSitePlan(),
    rootSitemapUrl: "https://diamondshelf.us/sitemap.xml",
    documents: [{
      url: "https://diamondshelf.us/sitemap.xml",
      xml: `<urlset><!-- ${secretMarker} --><url><loc>https://user:password@diamondshelf.us/private</loc></url><url><loc>https://diamondshelf.us/safe</loc></url></urlset>`,
    }],
    policy: policy(),
  });
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(secretMarker), false);
  assert.equal(serialized.includes("user:password"), false);
});
