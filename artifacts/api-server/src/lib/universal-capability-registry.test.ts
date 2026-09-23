import assert from "node:assert/strict";
import test from "node:test";
import {
  UNIVERSAL_CAPABILITIES,
  assertUniversalCapabilityRegistryIntegrity,
  buildUniversalCapabilityRegistry,
  capabilityIsExternalMutation,
  findUniversalCapability,
} from "./universal-capability-registry.js";
import {
  buildUniversalConnectionIdentity,
  buildUniversalSiteIdentity,
} from "./universal-site-resource-identity.js";

function site() {
  return buildUniversalSiteIdentity({
    siteId: "eb1da9ee-539c-4200-8f04-f64ccaea7768",
    canonicalOrigin: "https://diamondshelf.us",
  });
}

function shopifyConnection() {
  const currentSite = site();
  return {
    site: currentSite,
    connection: buildUniversalConnectionIdentity({
      site: currentSite,
      connectionId: "shopify-primary",
      provider: "shopify",
      externalAccountId: "diamond-shelf.myshopify.com",
      connectionMode: "native_api",
    }),
  };
}

function publicReadDefinitions() {
  return [
    {
      capability: "read.metadata" as const,
      resourceKinds: ["homepage", "page", "product", "collection"] as const,
      verification: "not_applicable" as const,
      rollback: "not_applicable" as const,
      maxOperationsPerRequest: 100,
      maxPayloadBytes: 2_000_000,
    },
    {
      capability: "read.resource" as const,
      resourceKinds: ["homepage", "page", "product", "collection"] as const,
      verification: "not_applicable" as const,
      rollback: "not_applicable" as const,
      maxOperationsPerRequest: 100,
      maxPayloadBytes: 5_000_000,
    },
  ];
}

test("UGP-1.2 builds deterministic connectionless public-read registry", () => {
  const currentSite = site();
  const first = buildUniversalCapabilityRegistry({
    site: currentSite,
    provider: "public_web",
    connectorVersion: "public-web-v1",
    capabilities: publicReadDefinitions(),
  });
  const replay = buildUniversalCapabilityRegistry({
    site: currentSite,
    provider: "public_web",
    connectorVersion: "public-web-v1",
    capabilities: [...publicReadDefinitions()].reverse(),
  });

  assert.deepEqual(first, replay);
  assert.equal(first.connection, null);
  assert.equal(first.credentialProfileId, null);
  assert.equal(first.capabilities.length, 2);
  assert.equal(first.capabilities[0]!.capability, "read.metadata");
  assert.equal(first.capabilities[1]!.capability, "read.resource");
  assert.match(first.registryFingerprint, /^[0-9a-f]{64}$/);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.capabilities));
  assert.ok(Object.isFrozen(first.capabilities[0]));
});

test("UGP-1.2 describes Shopify mutation capability without granting authorization", () => {
  const { site: currentSite, connection } = shopifyConnection();
  const registry = buildUniversalCapabilityRegistry({
    site: currentSite,
    connection,
    provider: "shopify",
    connectorVersion: "native-shopify-v1",
    credentialProfileId: "task53-write-products-profile",
    capabilities: [{
      capability: "write.meta_description",
      resourceKinds: ["product", "collection"],
      requiredProviderScopes: ["write_products"],
      verification: "required",
      rollback: "supported",
      maxOperationsPerRequest: 1,
      maxPayloadBytes: 16_384,
    }],
  });

  const capability = registry.capabilities[0]!;
  assert.equal(capability.sideEffect, "external_mutation");
  assert.deepEqual(capability.resourceKinds, ["collection", "product"]);
  assert.deepEqual(capability.requiredProviderScopes, ["write_products"]);
  assert.equal(capability.verification, "required");
  assert.equal(capability.rollback, "supported");
  assert.deepEqual(registry.semantics, {
    availabilityOnly: true,
    grantsAuthorization: false,
    grantsProviderWrite: false,
    grantsPublicSiteWrite: false,
    automaticTransition: false,
  });
});

test("UGP-1.2 external mutation capabilities require an exact connection", () => {
  const currentSite = site();
  assert.throws(
    () => buildUniversalCapabilityRegistry({
      site: currentSite,
      provider: "wordpress",
      connectorVersion: "wp-v1",
      capabilities: [{
        capability: "publish.article",
        resourceKinds: ["article"],
        verification: "supported",
        rollback: "unsupported",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 1_000_000,
      }],
    }),
    /ugp_capability_external_mutation_requires_connection/,
  );
});

test("UGP-1.2 anonymous registries reject credential profiles and provider scopes", () => {
  const currentSite = site();

  assert.throws(
    () => buildUniversalCapabilityRegistry({
      site: currentSite,
      provider: "public_web",
      connectorVersion: "public-web-v1",
      credentialProfileId: "should-not-exist",
      capabilities: publicReadDefinitions(),
    }),
    /ugp_capability_anonymous_registry_rejects_credential_profile/,
  );

  assert.throws(
    () => buildUniversalCapabilityRegistry({
      site: currentSite,
      provider: "public_web",
      connectorVersion: "public-web-v1",
      capabilities: [{
        capability: "read.resource",
        resourceKinds: ["page"],
        requiredProviderScopes: ["read_pages"],
        verification: "not_applicable",
        rollback: "not_applicable",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 1_000_000,
      }],
    }),
    /ugp_capability_anonymous_registry_rejects_provider_scopes/,
  );
});

test("UGP-1.2 connection provider and site lineage mismatches fail closed", () => {
  const { connection } = shopifyConnection();
  const otherSite = buildUniversalSiteIdentity({
    siteId: "other-site",
    canonicalOrigin: "https://example.com",
  });

  assert.throws(
    () => buildUniversalCapabilityRegistry({
      site: otherSite,
      connection,
      provider: "shopify",
      connectorVersion: "native-shopify-v1",
      credentialProfileId: "profile-1",
      capabilities: [{
        capability: "read.resource",
        resourceKinds: ["product"],
        verification: "not_applicable",
        rollback: "not_applicable",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 1000,
      }],
    }),
    /ugp_capability_connection_site_mismatch/,
  );

  const { site: currentSite } = shopifyConnection();
  assert.throws(
    () => buildUniversalCapabilityRegistry({
      site: currentSite,
      connection,
      provider: "webflow",
      connectorVersion: "webflow-v1",
      credentialProfileId: "profile-2",
      capabilities: [{
        capability: "read.resource",
        resourceKinds: ["page"],
        verification: "not_applicable",
        rollback: "not_applicable",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 1000,
      }],
    }),
    /ugp_capability_connection_provider_mismatch/,
  );
});

test("UGP-1.2 mutation assurance must be explicit and nonmutation assurance not applicable", () => {
  const { site: currentSite, connection } = shopifyConnection();

  assert.throws(
    () => buildUniversalCapabilityRegistry({
      site: currentSite,
      connection,
      provider: "shopify",
      connectorVersion: "native-shopify-v1",
      credentialProfileId: "profile-1",
      capabilities: [{
        capability: "write.seo_title",
        resourceKinds: ["product"],
        verification: "not_applicable",
        rollback: "supported",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 1000,
      }],
    }),
    /external_mutation_verification_must_be_explicit/,
  );

  assert.throws(
    () => buildUniversalCapabilityRegistry({
      site: currentSite,
      connection,
      provider: "shopify",
      connectorVersion: "native-shopify-v1",
      credentialProfileId: "profile-1",
      capabilities: [{
        capability: "read.content",
        resourceKinds: ["product"],
        verification: "supported",
        rollback: "not_applicable",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 1000,
      }],
    }),
    /nonmutation_assurance_must_be_not_applicable/,
  );
});

test("UGP-1.2 rejects duplicate capabilities, resource kinds, and scopes", () => {
  const currentSite = site();

  assert.throws(
    () => buildUniversalCapabilityRegistry({
      site: currentSite,
      provider: "public_web",
      connectorVersion: "public-web-v1",
      capabilities: [
        publicReadDefinitions()[0]!,
        publicReadDefinitions()[0]!,
      ],
    }),
    /ugp_capability_duplicate_capability/,
  );

  assert.throws(
    () => buildUniversalCapabilityRegistry({
      site: currentSite,
      provider: "public_web",
      connectorVersion: "public-web-v1",
      capabilities: [{
        capability: "read.resource",
        resourceKinds: ["page", "page"],
        verification: "not_applicable",
        rollback: "not_applicable",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 1000,
      }],
    }),
    /ugp_capability_duplicate_resource_kind/,
  );

  const { site: connectedSite, connection } = shopifyConnection();
  assert.throws(
    () => buildUniversalCapabilityRegistry({
      site: connectedSite,
      connection,
      provider: "shopify",
      connectorVersion: "native-shopify-v1",
      credentialProfileId: "profile-1",
      capabilities: [{
        capability: "write.meta_description",
        resourceKinds: ["product"],
        requiredProviderScopes: ["write_products", "write_products"],
        verification: "required",
        rollback: "supported",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 1000,
      }],
    }),
    /ugp_capability_duplicate_provider_scope/,
  );
});

test("UGP-1.2 rejects invalid bounded limits", () => {
  const currentSite = site();

  assert.throws(
    () => buildUniversalCapabilityRegistry({
      site: currentSite,
      provider: "public_web",
      connectorVersion: "public-web-v1",
      capabilities: [{
        capability: "read.resource",
        resourceKinds: ["page"],
        verification: "not_applicable",
        rollback: "not_applicable",
        maxOperationsPerRequest: 0,
        maxPayloadBytes: 1000,
      }],
    }),
    /ugp_capability_invalid_max_operations_per_request/,
  );

  assert.throws(
    () => buildUniversalCapabilityRegistry({
      site: currentSite,
      provider: "public_web",
      connectorVersion: "public-web-v1",
      capabilities: [{
        capability: "read.resource",
        resourceKinds: ["page"],
        verification: "not_applicable",
        rollback: "not_applicable",
        maxOperationsPerRequest: 1,
        maxPayloadBytes: 100_000_001,
      }],
    }),
    /ugp_capability_invalid_max_payload_bytes/,
  );
});

test("UGP-1.2 find capability is integrity-checked and resource-aware", () => {
  const currentSite = site();
  const registry = buildUniversalCapabilityRegistry({
    site: currentSite,
    provider: "public_web",
    connectorVersion: "public-web-v1",
    capabilities: publicReadDefinitions(),
  });

  assert.equal(
    findUniversalCapability(registry, "read.metadata", "product")?.capability,
    "read.metadata",
  );
  assert.equal(
    findUniversalCapability(registry, "read.metadata", "article"),
    null,
  );

  const tampered = {
    ...registry,
    connectorVersion: "public-web-v2",
  };
  assert.throws(
    () => findUniversalCapability(tampered, "read.resource"),
    /ugp_capability_registry_integrity_failed/,
  );
});

test("UGP-1.2 classifies side effects consistently across the vocabulary", () => {
  assert.equal(capabilityIsExternalMutation("read.resource"), false);
  assert.equal(capabilityIsExternalMutation("preview.change"), false);
  assert.equal(capabilityIsExternalMutation("verify.change"), false);
  assert.equal(capabilityIsExternalMutation("outreach.draft"), false);

  assert.equal(capabilityIsExternalMutation("write.meta_description"), true);
  assert.equal(capabilityIsExternalMutation("publish.article"), true);
  assert.equal(capabilityIsExternalMutation("rollback.change"), true);
  assert.equal(capabilityIsExternalMutation("git.pull_request"), true);
  assert.equal(capabilityIsExternalMutation("outreach.send"), true);

  assert.equal(new Set(UNIVERSAL_CAPABILITIES).size, UNIVERSAL_CAPABILITIES.length);
});

test("UGP-1.2 supports a Git PR connector without implying direct deployment", () => {
  const currentSite = site();
  const connection = buildUniversalConnectionIdentity({
    site: currentSite,
    connectionId: "github-site-repository",
    provider: "github",
    externalAccountId: "intssere/example-site",
    connectionMode: "git_pr",
  });

  const registry = buildUniversalCapabilityRegistry({
    site: currentSite,
    connection,
    provider: "github",
    connectorVersion: "github-git-v1",
    credentialProfileId: "github-installation-123",
    capabilities: [{
      capability: "git.pull_request",
      resourceKinds: ["source_file"],
      requiredProviderScopes: ["contents:write", "pull_requests:write"],
      verification: "supported",
      rollback: "supported",
      maxOperationsPerRequest: 1,
      maxPayloadBytes: 5_000_000,
    }],
  });

  const pr = findUniversalCapability(
    registry,
    "git.pull_request",
    "source_file",
  );
  assert.equal(pr?.sideEffect, "external_mutation");
  assert.equal(registry.semantics.grantsProviderWrite, false);
  assert.equal(registry.semantics.grantsPublicSiteWrite, false);
  assert.equal(registry.semantics.automaticTransition, false);
});

test("UGP-1.2 registry integrity detects capability tampering", () => {
  const currentSite = site();
  const registry = buildUniversalCapabilityRegistry({
    site: currentSite,
    provider: "public_web",
    connectorVersion: "public-web-v1",
    capabilities: publicReadDefinitions(),
  });
  const tampered = {
    ...registry,
    capabilities: registry.capabilities.map((capability, index) =>
      index === 0
        ? {
            ...capability,
            limits: {
              ...capability.limits,
              maxOperationsPerRequest: 999,
            },
          }
        : capability
    ),
  };

  assert.throws(
    () => assertUniversalCapabilityRegistryIntegrity(tampered),
    /ugp_capability_registry_integrity_failed/,
  );
});
