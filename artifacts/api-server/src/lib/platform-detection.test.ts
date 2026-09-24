import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPublicWebOnboardingPlan,
  normalizeSuppliedPublicWebResolution,
  type PublicWebOnboardingPlan,
  type PublicWebOnboardingResolution,
} from "./public-web-onboarding.js";
import {
  detectPlatformFromSuppliedObservations,
  UGP_PLATFORM_DETECTION_LIMITS,
  type SuppliedPlatformObservation,
} from "./platform-detection.js";

function resolvedSite(url = "https://example.com"): {
  plan: PublicWebOnboardingPlan;
  resolution: PublicWebOnboardingResolution;
} {
  const plan = buildPublicWebOnboardingPlan({ url });
  const origin = new URL(plan.resolution.bootstrapUrl).origin;
  const resolution = normalizeSuppliedPublicWebResolution({
    plan,
    evidence: {
      redirectHops: [{
        requestUrl: plan.resolution.bootstrapUrl,
        statusCode: 200,
        resolvedAddresses: ["93.184.216.34"],
        location: null,
      }],
      robots: {
        requestUrl: new URL("/robots.txt", origin).toString(),
        statusCode: 404,
        resolvedAddresses: ["93.184.216.34"],
        body: null,
      },
    },
  });
  return { plan, resolution };
}

test("UGP-3.2 identifies Shopify from independent supplied evidence without granting authority", () => {
  const { plan, resolution } = resolvedSite();
  const result = detectPlatformFromSuppliedObservations({
    plan,
    resolution,
    observations: [
      { kind: "header", name: "X-Shopify-Stage", value: "production" },
      { kind: "asset_url", value: "https://cdn.shopify.com/s/files/theme.css?v=123" },
    ],
  });

  assert.equal(result.state, "identified");
  assert.equal(result.candidatePlatform, "shopify");
  assert.equal(result.evidenceGrade, "strong");
  assert.equal(result.confidence, "high");
  assert.deepEqual(result.supportingEvidence.map((item) => item.id), [
    "header_shopify",
    "asset_shopify",
  ]);
  assert.deepEqual(result.contradictoryEvidence, []);
  assert.equal(result.provenance.mode, "supplied_observations_only");
  assert.equal(result.provenance.resolutionFingerprint, resolution.resolutionFingerprint);
  assert.deepEqual(result.authorization, {
    networkReadAuthorized: false,
    crawlExecutionAuthorized: false,
    persistenceAuthorized: false,
    connectorCapabilityGranted: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
  });
  assert.match(result.provenance.observationFingerprint, /^[0-9a-f]{64}$/);
  assert.match(result.detectionFingerprint, /^[0-9a-f]{64}$/);
});

test("UGP-3.2 identifies WordPress from generator and asset evidence", () => {
  const { plan, resolution } = resolvedSite();
  const result = detectPlatformFromSuppliedObservations({
    plan,
    resolution,
    observations: [
      { kind: "meta", name: "generator", value: "WordPress 6.8" },
      { kind: "asset_url", value: "/wp-content/themes/site/style.css?ver=6.8" },
    ],
  });

  assert.equal(result.state, "identified");
  assert.equal(result.candidatePlatform, "wordpress");
  assert.equal(result.evidenceGrade, "strong");
  assert.ok(result.supportingEvidence.some((item) => item.id === "generator_wordpress"));
  assert.ok(result.supportingEvidence.some((item) => item.id === "asset_wordpress"));
});

test("UGP-3.2 prefers WooCommerce when Woo evidence is layered on WordPress evidence", () => {
  const { plan, resolution } = resolvedSite();
  const result = detectPlatformFromSuppliedObservations({
    plan,
    resolution,
    observations: [
      { kind: "meta", name: "generator", value: "WordPress 6.8" },
      { kind: "html_marker", value: "woocommerce-page" },
      { kind: "asset_url", value: "/wp-content/plugins/woocommerce/assets/client.css" },
    ],
  });

  assert.equal(result.state, "identified");
  assert.equal(result.candidatePlatform, "woocommerce");
  assert.ok(result.supportingEvidence.some((item) => item.family === "woocommerce"));
  assert.ok(result.supportingEvidence.some((item) => item.family === "wordpress"));
  assert.equal(
    result.contradictoryEvidence.some((item) => item.family === "wordpress"),
    false,
  );
});

test("UGP-3.2 identifies Webflow from supplied generator and HTML markers", () => {
  const { plan, resolution } = resolvedSite();
  const result = detectPlatformFromSuppliedObservations({
    plan,
    resolution,
    observations: [
      { kind: "meta", name: "generator", value: "Webflow" },
      { kind: "html_marker", value: "data-wf-page" },
    ],
  });

  assert.equal(result.state, "identified");
  assert.equal(result.candidatePlatform, "webflow");
  assert.equal(result.confidence, "high");
});

test("UGP-3.2 identifies Wix from supplied response and asset evidence", () => {
  const { plan, resolution } = resolvedSite();
  const result = detectPlatformFromSuppliedObservations({
    plan,
    resolution,
    observations: [
      { kind: "header", name: "X-Wix-Request-Id", value: "request-123" },
      { kind: "asset_url", value: "https://static.wixstatic.com/media/image.png" },
    ],
  });

  assert.equal(result.state, "identified");
  assert.equal(result.candidatePlatform, "wix");
  assert.equal(result.evidenceGrade, "strong");
});

test("UGP-3.2 identifies headless/custom only when framework evidence is supplied", () => {
  const { plan, resolution } = resolvedSite();
  const result = detectPlatformFromSuppliedObservations({
    plan,
    resolution,
    observations: [
      { kind: "asset_url", value: "/_next/static/chunks/app.js" },
      { kind: "html_marker", value: "__NEXT_DATA__" },
    ],
  });

  assert.equal(result.state, "identified");
  assert.equal(result.candidatePlatform, "headless_custom");
  assert.equal(result.evidenceGrade, "strong");
  assert.ok(result.evidence.every((item) => item.family === "headless_custom"));
});

test("UGP-3.2 keeps URL-host patterns weak and does not identify from hostname alone", () => {
  const { plan, resolution } = resolvedSite("https://store.myshopify.com");
  const result = detectPlatformFromSuppliedObservations({
    plan,
    resolution,
    observations: [],
  });

  assert.equal(result.state, "unknown");
  assert.equal(result.candidatePlatform, "unknown");
  assert.equal(result.confidence, "low");
  assert.equal(result.evidenceGrade, "weak");
  assert.deepEqual(result.alternateCandidates.map((item) => item.family), ["shopify"]);
  assert.equal(result.evidence[0]?.id, "hostname_myshopify");
});

test("UGP-3.2 reports ambiguity instead of overclaiming conflicting strong evidence", () => {
  const { plan, resolution } = resolvedSite();
  const result = detectPlatformFromSuppliedObservations({
    plan,
    resolution,
    observations: [
      { kind: "header", name: "X-Shopify-Stage", value: "production" },
      { kind: "header", name: "X-Wix-Request-Id", value: "request-123" },
    ],
  });

  assert.equal(result.state, "ambiguous");
  assert.equal(result.candidatePlatform, "unknown");
  assert.equal(result.confidence, "low");
  assert.deepEqual(
    result.alternateCandidates.slice(0, 2).map((item) => item.family),
    ["shopify", "wix"],
  );
  assert.ok(result.contradictoryEvidence.some((item) => item.family === "shopify"));
  assert.ok(result.contradictoryEvidence.some((item) => item.family === "wix"));
});

test("UGP-3.2 preserves contradictory framework evidence when one platform still leads", () => {
  const { plan, resolution } = resolvedSite();
  const result = detectPlatformFromSuppliedObservations({
    plan,
    resolution,
    observations: [
      { kind: "header", name: "X-Shopify-Stage", value: "production" },
      { kind: "asset_url", value: "https://cdn.shopify.com/s/files/theme.css" },
      { kind: "html_marker", value: "__NEXT_DATA__" },
    ],
  });

  assert.equal(result.state, "identified");
  assert.equal(result.candidatePlatform, "shopify");
  assert.ok(result.contradictoryEvidence.some((item) =>
    item.family === "headless_custom" && item.id === "html_headless_framework"
  ));
});

test("UGP-3.2 remains unknown when supplied observations contain no platform-specific evidence", () => {
  const { plan, resolution } = resolvedSite();
  const result = detectPlatformFromSuppliedObservations({
    plan,
    resolution,
    observations: [
      { kind: "structured_data_type", value: "Product" },
      { kind: "header", name: "Cache-Control", value: "public, max-age=60" },
    ],
  });

  assert.equal(result.state, "unknown");
  assert.equal(result.candidatePlatform, "unknown");
  assert.equal(result.evidenceGrade, "none");
  assert.equal(result.confidence, "none");
  assert.deepEqual(result.evidence, []);
});

test("UGP-3.2 uses successful supplied known-path observations without issuing requests", () => {
  const { plan, resolution } = resolvedSite();
  const found = detectPlatformFromSuppliedObservations({
    plan,
    resolution,
    observations: [
      { kind: "path", value: "/wp-json/", statusCode: 200 },
    ],
  });
  const missing = detectPlatformFromSuppliedObservations({
    plan,
    resolution,
    observations: [
      { kind: "path", value: "/wp-json/", statusCode: 404 },
    ],
  });

  assert.equal(found.candidatePlatform, "wordpress");
  assert.equal(found.state, "identified");
  assert.equal(missing.candidatePlatform, "unknown");
  assert.equal(missing.state, "unknown");
});

test("UGP-3.2 is deterministic across observation order and duplicate evidence", () => {
  const { plan, resolution } = resolvedSite();
  const observations: SuppliedPlatformObservation[] = [
    { kind: "html_marker", value: "data-wf-site" },
    { kind: "asset_url", value: "https://assets.website-files.com/site/app.js?x=1" },
    { kind: "html_marker", value: "data-wf-site" },
  ];

  const first = detectPlatformFromSuppliedObservations({
    plan,
    resolution,
    observations,
  });
  const second = detectPlatformFromSuppliedObservations({
    plan,
    resolution,
    observations: [...observations].reverse(),
  });

  assert.equal(first.provenance.observationFingerprint, second.provenance.observationFingerprint);
  assert.equal(first.detectionFingerprint, second.detectionFingerprint);
  assert.deepEqual(first, second);
  assert.equal(first.observationSummary.html_marker, 1);
});

test("UGP-3.2 fingerprints sensitive-looking header/meta values instead of returning raw values", () => {
  const { plan, resolution } = resolvedSite();
  const secretLike = "Bearer should-not-be-returned";
  const result = detectPlatformFromSuppliedObservations({
    plan,
    resolution,
    observations: [
      { kind: "header", name: "Authorization", value: secretLike },
      { kind: "meta", name: "description", value: secretLike },
    ],
  });

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(secretLike), false);
  assert.equal(result.observationSummary.header, 1);
  assert.equal(result.observationSummary.meta, 1);
});

test("UGP-3.2 rejects cross-origin path evidence, malformed markers and excessive observations", () => {
  const { plan, resolution } = resolvedSite();

  assert.throws(
    () => detectPlatformFromSuppliedObservations({
      plan,
      resolution,
      observations: [{ kind: "path", value: "https://other.example/wp-json/", statusCode: 200 }],
    }),
    /ugp_platform_detection_path_cross_origin/,
  );

  assert.throws(
    () => detectPlatformFromSuppliedObservations({
      plan,
      resolution,
      observations: [{ kind: "html_marker", value: "<script>raw html</script>" }],
    }),
    /ugp_platform_detection_html_marker_invalid/,
  );

  assert.throws(
    () => detectPlatformFromSuppliedObservations({
      plan,
      resolution,
      observations: Array.from(
        { length: UGP_PLATFORM_DETECTION_LIMITS.maxObservations + 1 },
        (_, index) => ({ kind: "structured_data_type" as const, value: "Type" + index }),
      ),
    }),
    /ugp_platform_detection_observation_limit_exceeded/,
  );
});

test("UGP-3.2 fails closed on stale UGP-3.1 lineage or unexpectedly open authority", () => {
  const { plan, resolution } = resolvedSite();
  const stale = {
    ...resolution,
    planFingerprint: "0".repeat(64),
  } as PublicWebOnboardingResolution;
  assert.throws(
    () => detectPlatformFromSuppliedObservations({
      plan,
      resolution: stale,
      observations: [],
    }),
    /ugp_platform_detection_plan_lineage_mismatch/,
  );

  const openAuthority = {
    ...resolution,
    authorization: {
      ...resolution.authorization,
      networkReadAuthorized: true,
    },
  } as unknown as PublicWebOnboardingResolution;
  assert.throws(
    () => detectPlatformFromSuppliedObservations({
      plan,
      resolution: openAuthority,
      observations: [],
    }),
    /ugp_platform_detection_resolution_authority_open/,
  );
});
