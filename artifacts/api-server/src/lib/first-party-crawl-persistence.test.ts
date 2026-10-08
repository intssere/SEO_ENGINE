import assert from "node:assert/strict";
import test from "node:test";
import {
  DIAMOND_SHELF_CANONICAL_ORIGIN,
} from "./first-party-crawl-runtime-bridge.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";
import {
  FirstPartyCrawlPersistence,
  P12_2_L2_DURABLE_TABLE_COUNT,
  P12_2_L10_13B_TABLE_COUNT,
  P12_2_L10_13B_ENGINEERING_TABLE_COUNT,
  P12_2_RECOGNIZED_TABLE_COUNTS,
  P12_2_TABLE_COUNT,
  assertFirstPartyCrawlUrlPolicy,
  assertFirstPartySitemapProvenanceUrlPolicy,
  assertNoForbiddenContent,
  firstPartyCrawlPersistenceCapability,
} from "./first-party-crawl-persistence.js";

test("P12.2 persistence capability is lazy and default-off", () => {
  const capability = firstPartyCrawlPersistenceCapability();
  assert.equal(capability.siteId, DIAMOND_SHELF_SITE_ID);
  assert.equal(capability.canonicalOrigin, DIAMOND_SHELF_CANONICAL_ORIGIN);
  assert.equal(capability.expectedPublicTableCount, P12_2_TABLE_COUNT);
  assert.deepEqual(capability.recognizedPublicTableCounts, [
    37, 38, 39, 41, 42, 43, 44, 47,
  ]);
  assert.deepEqual(P12_2_RECOGNIZED_TABLE_COUNTS, [
    37, 38, 39, 41, 42, 43, 44, 47,
  ]);
  assert.equal(P12_2_TABLE_COUNT, 37);
  assert.equal(P12_2_L2_DURABLE_TABLE_COUNT, 38);
  assert.equal(P12_2_L10_13B_TABLE_COUNT, 41);
  assert.equal(P12_2_L10_13B_ENGINEERING_TABLE_COUNT, 47);
  assert.equal(capability.terminalFailureEventsAppendOnly, true);
  assert.equal(capability.accountingSnapshotsAppendOnly, true);
  assert.equal(capability.terminalFailureRecoveryReceiptsAppendOnly, true);
  assert.equal(capability.expectedAbsenceDispositionsReadOnlyLoadable, true);
  assert.equal(capability.expectedAbsenceEffectiveCertificationDeterministic, true);
  assert.equal(capability.exactFailureEvidenceRequiredForRecovery, true);
  assert.equal(capability.atomicRecoveryTransition, true);
  assert.equal(capability.lazyDatabaseConnection, true);
  assert.equal(capability.persistenceReady, false);
  assert.equal(capability.persistenceAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.autonomousWorkerEnabled, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);

  let factories = 0;
  new FirstPartyCrawlPersistence({
    databaseUrl: "postgres://unused",
    sqlFactory: () => {
      factories += 1;
      throw new Error("must_not_connect_during_construction");
    },
  });
  assert.equal(factories, 0);
});

test("persistence URL policy is exact-origin HTTPS and rejects query, fragments and credentials", () => {
  assert.equal(
    assertFirstPartyCrawlUrlPolicy("https://diamondshelf.us/products/a"),
    "https://diamondshelf.us/products/a",
  );
  for (const bad of [
    "http://diamondshelf.us/products/a",
    "https://example.com/products/a",
    "https://user:pass@diamondshelf.us/products/a",
    "https://diamondshelf.us/products/a?x=1",
    "https://diamondshelf.us/products/a#frag",
  ]) {
    assert.throws(() => assertFirstPartyCrawlUrlPolicy(bad), /p12_2_persistence_url_policy_rejected/);
  }
});

test("sitemap provenance URL policy permits same-origin query strings but rejects unsafe variants", () => {
  assert.equal(
    assertFirstPartySitemapProvenanceUrlPolicy(
      "https://diamondshelf.us/sitemap_products_1.xml?from=1&to=250",
    ),
    "https://diamondshelf.us/sitemap_products_1.xml?from=1&to=250",
  );
  assert.doesNotThrow(() => assertNoForbiddenContent({
    sourceSitemap: "https://diamondshelf.us/sitemap_products_1.xml?from=1&to=250",
    sourceSitemaps: [
      "https://diamondshelf.us/sitemap_products_1.xml?from=1&to=250",
      "https://diamondshelf.us/sitemap_pages_1.xml?from=251&to=500",
    ],
    missingSupplied: [
      "https://diamondshelf.us/sitemap_blogs_1.xml?from=501&to=750",
    ],
  }));

  for (const bad of [
    "http://diamondshelf.us/sitemap.xml?x=1",
    "https://example.com/sitemap.xml?x=1",
    "https://user:pass@diamondshelf.us/sitemap.xml?x=1",
    "https://diamondshelf.us/sitemap.xml?x=1#frag",
  ]) {
    assert.throws(
      () => assertFirstPartySitemapProvenanceUrlPolicy(bad),
      /p12_2_persistence_url_policy_rejected/,
    );
  }

  assert.throws(
    () => assertNoForbiddenContent({
      canonicalUrl: "https://diamondshelf.us/products/a?variant=1",
    }),
    /p12_2_persistence_url_policy_rejected/,
  );
});

test("deep payload guard allows explicit non-persistence markers and rejects content smuggling", () => {
  assert.doesNotThrow(() => assertNoForbiddenContent({
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    canonicalUrl: DIAMOND_SHELF_CANONICAL_ORIGIN + "/products/a",
    canonicalUrls: [DIAMOND_SHELF_CANONICAL_ORIGIN + "/products/a"],
    persistence: {
      rawResponseBodyPersisted: false,
      rawSitemapXmlPersisted: false,
      pageContentPersisted: false,
    },
  }));

  for (const value of [
    { rawResponseBody: "secret" },
    { nested: { rawSitemapXml: "<xml/>" } },
    { nested: [{ pageContent: "content" }] },
    { html: "<html></html>" },
    { contentText: "text" },
    { responseBody: "body" },
  ]) {
    assert.throws(() => assertNoForbiddenContent(value), /p12_2_persistence_forbidden_content_key/);
  }

  assert.throws(
    () => assertNoForbiddenContent({
      canonicalUrl: "https://example.com/foreign",
    }),
    /p12_2_persistence_url_policy_rejected/,
  );
});

test("database operations fail closed when no dedicated database URL is supplied", async () => {
  const persistence = new FirstPartyCrawlPersistence();
  await assert.rejects(
    persistence.loadLatestCompleted({
      version: "p12-2-first-party-crawl-bridge-v1",
      siteId: DIAMOND_SHELF_SITE_ID,
      canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    }),
    /p12_2_persistence_database_unconfigured/,
  );
});
