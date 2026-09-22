import assert from "node:assert/strict";
import test from "node:test";
import {
  DIAMOND_SHELF_CANONICAL_ORIGIN,
} from "./first-party-crawl-runtime-bridge.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";
import {
  FirstPartyCrawlPersistence,
  P12_2_TABLE_COUNT,
  assertFirstPartyCrawlUrlPolicy,
  assertNoForbiddenContent,
  firstPartyCrawlPersistenceCapability,
} from "./first-party-crawl-persistence.js";

test("P12.2 persistence capability is lazy and default-off", () => {
  const capability = firstPartyCrawlPersistenceCapability();
  assert.equal(capability.siteId, DIAMOND_SHELF_SITE_ID);
  assert.equal(capability.canonicalOrigin, DIAMOND_SHELF_CANONICAL_ORIGIN);
  assert.equal(capability.expectedPublicTableCount, P12_2_TABLE_COUNT);
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
