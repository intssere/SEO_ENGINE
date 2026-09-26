import assert from "node:assert/strict";
import test from "node:test";
import {
  assertUniversalResourceLocatorIntegrity,
  buildShopifyUniversalResourceIdentity,
  buildUniversalConnectionIdentity,
  buildUniversalResourceIdentity,
  buildUniversalResourceLocator,
  buildUniversalSiteIdentity,
  UGP_UNIVERSAL_IDENTITY_VERSION,
} from "./universal-site-resource-identity.js";

const STATE_A = "a".repeat(64);
const STATE_B = "b".repeat(64);
const OBSERVED_AT = "2026-09-23T10:00:00.000Z";

function diamondShelfSite() {
  return buildUniversalSiteIdentity({
    siteId: "eb1da9ee-539c-4200-8f04-f64ccaea7768",
    canonicalOrigin: "https://diamondshelf.us",
  });
}

function shopifyConnection() {
  const site = diamondShelfSite();
  return {
    site,
    connection: buildUniversalConnectionIdentity({
      site,
      connectionId: "shopify-primary",
      provider: "shopify",
      externalAccountId: "diamond-shelf.myshopify.com",
      connectionMode: "native_api",
    }),
  };
}

test("UGP-1.1 builds deterministic immutable site identity", () => {
  const first = diamondShelfSite();
  const second = diamondShelfSite();

  assert.deepEqual(first, second);
  assert.equal(first.version, UGP_UNIVERSAL_IDENTITY_VERSION);
  assert.equal(first.hostname, "diamondshelf.us");
  assert.match(first.siteIdentityFingerprint, /^[0-9a-f]{64}$/);
  assert.ok(Object.isFrozen(first));
});

test("UGP-1.1 rejects noncanonical site origins", () => {
  assert.throws(
    () => buildUniversalSiteIdentity({
      siteId: "site-1",
      canonicalOrigin: "https://Example.com",
    }),
    /ugp_identity_noncanonical_origin/,
  );
  assert.throws(
    () => buildUniversalSiteIdentity({
      siteId: "site-1",
      canonicalOrigin: "https://example.com/",
    }),
    /ugp_identity_noncanonical_origin/,
  );
  assert.throws(
    () => buildUniversalSiteIdentity({
      siteId: "site-1",
      canonicalOrigin: "https://example.com/path",
    }),
    /ugp_identity_noncanonical_origin/,
  );
});

test("UGP-1.1 connection identity binds provider and exact site lineage", () => {
  const { site, connection } = shopifyConnection();

  assert.equal(connection.siteId, site.siteId);
  assert.equal(
    connection.siteIdentityFingerprint,
    site.siteIdentityFingerprint,
  );
  assert.equal(connection.provider, "shopify");
  assert.equal(
    connection.externalAccountId,
    "diamond-shelf.myshopify.com",
  );
  assert.match(connection.connectionIdentityFingerprint, /^[0-9a-f]{64}$/);
  assert.ok(Object.isFrozen(connection));
});

test("UGP-1.1 supports public-web URL identity with no CMS connection", () => {
  const site = buildUniversalSiteIdentity({
    siteId: "public-example",
    canonicalOrigin: "https://example.com",
  });
  const locator = buildUniversalResourceLocator({
    site,
    provider: "public_web",
    kind: "page",
    canonicalUrl: "https://example.com/guides/example",
    locale: "en-US",
  });
  const identity = buildUniversalResourceIdentity({
    locator,
    stateFingerprint: STATE_A,
    observedAt: OBSERVED_AT,
  });

  assert.equal(locator.connectionId, null);
  assert.equal(locator.externalId, null);
  assert.equal(locator.canonicalUrl, "https://example.com/guides/example");
  assert.equal(identity.locator.resourceLocatorFingerprint, locator.resourceLocatorFingerprint);
  assert.match(identity.resourceIdentityFingerprint, /^[0-9a-f]{64}$/);
  assert.ok(Object.isFrozen(identity));
  assert.ok(Object.isFrozen(identity.locator));
});

test("UGP-1.1 preserves Shopify Product GID and URL byte-for-byte", () => {
  const { site, connection } = shopifyConnection();
  const gid = "gid://shopify/Product/8864713441479";
  const url =
    "https://diamondshelf.us/products/yves-saint-laurent-myslf-eau-de-parfum-spray-for-men";

  const first = buildShopifyUniversalResourceIdentity({
    site,
    connection,
    kind: "product",
    gid,
    canonicalUrl: url,
    stateFingerprint: STATE_A,
    observedAt: OBSERVED_AT,
    locale: "en-US",
  });
  const replay = buildShopifyUniversalResourceIdentity({
    site,
    connection,
    kind: "product",
    gid,
    canonicalUrl: url,
    stateFingerprint: STATE_A,
    observedAt: OBSERVED_AT,
    locale: "en-US",
  });

  assert.deepEqual(first, replay);
  assert.equal(first.locator.provider, "shopify");
  assert.equal(first.locator.kind, "product");
  assert.equal(first.locator.externalId, gid);
  assert.equal(first.locator.canonicalUrl, url);
  assert.equal(
    first.locator.connectionIdentityFingerprint,
    connection.connectionIdentityFingerprint,
  );
});

test("UGP-1.1 represents current Shopify Collection identity losslessly", () => {
  const { site, connection } = shopifyConnection();
  const gid = "gid://shopify/Collection/123456789";
  const url = "https://diamondshelf.us/collections/fragrance";

  const identity = buildShopifyUniversalResourceIdentity({
    site,
    connection,
    kind: "collection",
    gid,
    canonicalUrl: url,
    stateFingerprint: STATE_B,
    observedAt: OBSERVED_AT,
  });

  assert.equal(identity.locator.kind, "collection");
  assert.equal(identity.locator.externalId, gid);
  assert.equal(identity.locator.canonicalUrl, url);
});

test("UGP-1.1 keeps provider external identifiers opaque", () => {
  const site = buildUniversalSiteIdentity({
    siteId: "custom-site",
    canonicalOrigin: "https://cms.example.com",
  });
  const connection = buildUniversalConnectionIdentity({
    site,
    connectionId: "custom-cms",
    provider: "custom_cms",
    externalAccountId: "tenant::north-america/α",
    connectionMode: "openapi",
  });
  const externalId = "urn:custom:resource/abc-123?revision=7";
  const locator = buildUniversalResourceLocator({
    site,
    connection,
    provider: "custom_cms",
    kind: "article",
    externalId,
    canonicalUrl: "https://cms.example.com/articles/abc-123",
  });

  assert.equal(connection.externalAccountId, "tenant::north-america/α");
  assert.equal(locator.externalId, externalId);
});

test("UGP-1.1 fails closed on site, provider, and URL scope mismatches", () => {
  const { connection } = shopifyConnection();
  const otherSite = buildUniversalSiteIdentity({
    siteId: "other-site",
    canonicalOrigin: "https://example.com",
  });

  assert.throws(
    () => buildUniversalResourceLocator({
      site: otherSite,
      connection,
      provider: "shopify",
      kind: "product",
      externalId: "gid://shopify/Product/123",
      canonicalUrl: "https://example.com/products/test",
    }),
    /ugp_identity_connection_site_mismatch/,
  );

  const { site } = shopifyConnection();
  assert.throws(
    () => buildUniversalResourceLocator({
      site,
      connection,
      provider: "webflow",
      kind: "page",
      externalId: "page-123",
      canonicalUrl: "https://diamondshelf.us/pages/test",
    }),
    /ugp_identity_resource_provider_connection_mismatch/,
  );

  assert.throws(
    () => buildUniversalResourceLocator({
      site,
      provider: "public_web",
      kind: "page",
      canonicalUrl: "https://other.example/page",
    }),
    /ugp_identity_resource_site_origin_mismatch/,
  );
});

test("UGP-1.1 requires a resource anchor and canonical resource URLs", () => {
  const site = buildUniversalSiteIdentity({
    siteId: "site-1",
    canonicalOrigin: "https://example.com",
  });

  assert.throws(
    () => buildUniversalResourceLocator({
      site,
      provider: "public_web",
      kind: "page",
    }),
    /ugp_identity_resource_anchor_missing/,
  );

  assert.throws(
    () => buildUniversalResourceLocator({
      site,
      provider: "public_web",
      kind: "page",
      canonicalUrl: "https://example.com/page#section",
    }),
    /ugp_identity_noncanonical_url/,
  );
});

test("UGP-1.1 parent relationships require exact same scope", () => {
  const { site, connection } = shopifyConnection();
  const parent = buildUniversalResourceLocator({
    site,
    connection,
    provider: "shopify",
    kind: "collection",
    externalId: "gid://shopify/Collection/111",
    canonicalUrl: "https://diamondshelf.us/collections/fragrance",
  });
  const child = buildUniversalResourceLocator({
    site,
    connection,
    provider: "shopify",
    kind: "product",
    externalId: "gid://shopify/Product/222",
    canonicalUrl: "https://diamondshelf.us/products/example",
  });

  const identity = buildUniversalResourceIdentity({
    locator: child,
    stateFingerprint: STATE_A,
    observedAt: OBSERVED_AT,
    parent,
    relationship: "contained_by",
  });
  assert.equal(
    identity.parent?.resourceLocatorFingerprint,
    parent.resourceLocatorFingerprint,
  );
  assert.equal(identity.relationship, "contained_by");

  assert.throws(
    () => buildUniversalResourceIdentity({
      locator: child,
      stateFingerprint: STATE_A,
      observedAt: OBSERVED_AT,
      parent,
    }),
    /ugp_identity_parent_relationship_pair_required/,
  );

  const otherConnection = buildUniversalConnectionIdentity({
    site,
    connectionId: "shopify-secondary",
    provider: "shopify",
    externalAccountId: "secondary.myshopify.com",
    connectionMode: "native_api",
  });
  const wrongParent = buildUniversalResourceLocator({
    site,
    connection: otherConnection,
    provider: "shopify",
    kind: "collection",
    externalId: "gid://shopify/Collection/333",
    canonicalUrl: "https://diamondshelf.us/collections/other",
  });
  assert.throws(
    () => buildUniversalResourceIdentity({
      locator: child,
      stateFingerprint: STATE_A,
      observedAt: OBSERVED_AT,
      parent: wrongParent,
      relationship: "contained_by",
    }),
    /ugp_identity_parent_connection_mismatch/,
  );
});

test("UGP-1.1 rejects tampered locator fingerprints", () => {
  const site = buildUniversalSiteIdentity({
    siteId: "site-1",
    canonicalOrigin: "https://example.com",
  });
  const locator = buildUniversalResourceLocator({
    site,
    provider: "public_web",
    kind: "page",
    canonicalUrl: "https://example.com/page",
  });
  const tampered = {
    ...locator,
    canonicalUrl: "https://example.com/other",
  };

  assert.throws(
    () => assertUniversalResourceLocatorIntegrity(tampered),
    /ugp_identity_resource_locator_integrity_failed/,
  );
  assert.throws(
    () => buildUniversalResourceIdentity({
      locator: tampered,
      stateFingerprint: STATE_A,
      observedAt: OBSERVED_AT,
    }),
    /ugp_identity_resource_locator_integrity_failed/,
  );
});

test("UGP-1.1 rejects noncanonical observation timestamps and wrong Shopify GIDs", () => {
  const { site, connection } = shopifyConnection();
  const locator = buildUniversalResourceLocator({
    site,
    connection,
    provider: "shopify",
    kind: "product",
    externalId: "gid://shopify/Product/123",
    canonicalUrl: "https://diamondshelf.us/products/example",
  });

  assert.throws(
    () => buildUniversalResourceIdentity({
      locator,
      stateFingerprint: STATE_A,
      observedAt: "2026-09-23T10:00:00Z",
    }),
    /ugp_identity_noncanonical_observed_at/,
  );

  assert.throws(
    () => buildShopifyUniversalResourceIdentity({
      site,
      connection,
      kind: "product",
      gid: "gid://shopify/Collection/123",
      canonicalUrl: "https://diamondshelf.us/products/example",
      stateFingerprint: STATE_A,
      observedAt: OBSERVED_AT,
    }),
    /ugp_identity_invalid_shopify_gid/,
  );
});
