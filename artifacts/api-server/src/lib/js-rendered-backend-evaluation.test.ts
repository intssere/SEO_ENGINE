import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPublicWebOnboardingPlan,
  normalizeSuppliedPublicWebResolution,
} from "./public-web-onboarding.js";
import {
  analyzeSuppliedReadOnlySite,
  type SuppliedReadOnlyPageObservation,
  type UniversalReadAnalysisCrawlSource,
} from "./universal-read-only-site-analysis.js";
import {
  assertJsRenderedBackendEvaluationIntegrity,
  evaluateJsRenderedExecutionBackend,
  type SuppliedRenderGapEvidence,
} from "./js-rendered-backend-evaluation.js";

const FP = {
  crawl: "a".repeat(64),
  page: "b".repeat(64),
  gap1: "c".repeat(64),
  gap2: "d".repeat(64),
  gap3: "e".repeat(64),
};

function closedAuthorization() {
  return {
    networkReadAuthorized: false,
    crawlExecutionAuthorized: false,
    persistenceAuthorized: false,
    connectorCapabilityGranted: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
  } as const;
}

function crawlSource(): UniversalReadAnalysisCrawlSource {
  return {
    adapter: "existing_crawl_architecture",
    sourceVersion: "first_party_crawl_controller_v1",
    sourceFingerprint: FP.crawl,
    mode: "baseline",
    discoveredPages: 1,
    observedPages: 1,
    pageHardLimit: 30,
    truncated: false,
    controls: {
      method: "GET",
      sameOriginOnly: true,
      httpsOnly: true,
      robotsEnforced: true,
      redirectTargetRevalidation: true,
      queryPolicy: "reject_all",
      fragmentPolicy: "reject_all",
      responseBodyPersistence: false,
    },
    authorization: closedAuthorization(),
  };
}

function pageObservation(
  overrides: Partial<SuppliedReadOnlyPageObservation> = {},
): SuppliedReadOnlyPageObservation {
  return {
    url: "https://example.com/",
    outcome: "success",
    statusCode: 200,
    robotsAllowed: true,
    redirectTarget: null,
    failureCode: null,
    noindex: false,
    canonicalUrl: "https://example.com/",
    title: "Example",
    metaDescription: "Example description",
    h1: "Example",
    headings: ["Example"],
    contentText: "Server rendered content is visible in the static response.",
    structuredData: {
      types: ["WebPage"],
      validity: "valid",
      issues: [],
    },
    internalLinks: ["https://example.com/about"],
    images: [{
      src: "https://cdn.example.net/image.jpg",
      alt: "Example",
    }],
    performance: null,
    sourceFingerprint: FP.page,
    ...overrides,
  };
}

function analysis(overrides: Partial<SuppliedReadOnlyPageObservation> = {}) {
  const plan = buildPublicWebOnboardingPlan({ url: "https://example.com/" });
  const resolution = normalizeSuppliedPublicWebResolution({
    plan,
    evidence: {
      redirectHops: [{
        requestUrl: "https://example.com/",
        statusCode: 200,
        resolvedAddresses: ["93.184.216.34"],
        location: null,
      }],
      robots: {
        requestUrl: "https://example.com/robots.txt",
        statusCode: 404,
        resolvedAddresses: ["93.184.216.34"],
        body: null,
      },
    },
  });
  return analyzeSuppliedReadOnlySite({
    plan,
    resolution,
    crawlSource: crawlSource(),
    pages: [pageObservation(overrides)],
  });
}

function evidence(
  overrides: Partial<SuppliedRenderGapEvidence> = {},
): SuppliedRenderGapEvidence {
  return {
    pageUrl: "https://example.com/",
    dimension: "metadata",
    signal: "client_rendered_metadata_marker",
    strength: "strong",
    sourceFingerprint: FP.gap1,
    ...overrides,
  };
}

test("UGP-3.4 keeps secure static fetch as the default when no render gap is indicated", () => {
  const result = evaluateJsRenderedExecutionBackend({
    analysis: analysis(),
    gapEvidence: [],
  });

  assert.equal(result.version, "ugp-3-4-js-rendered-backend-evaluation-v1");
  assert.equal(result.renderNeed.state, "not_indicated");
  assert.equal(result.renderNeed.staticFetchRemainsDefault, true);
  assert.equal(result.renderNeed.frameworkHeuristicAloneAccepted, false);
  assert.equal(result.backendEvaluation.secureStaticFetch.disposition, "default");
  assert.equal(result.backendEvaluation.directPlaywright.disposition, "standby");
  assert.equal(result.backendEvaluation.crawleePlaywright.disposition, "not_selected_as_execution_plane");
  assert.equal(result.activation.decision, "not_required");
  assert.equal(result.activation.futureCandidate, null);
  assert.deepEqual(result.activation.blockers, []);
  assertJsRenderedBackendEvaluationIntegrity(result);
});

test("UGP-3.4 marks direct Playwright only as a conditional future candidate for a strong specific static gap", () => {
  const result = evaluateJsRenderedExecutionBackend({
    analysis: analysis({
      title: null,
    }),
    gapEvidence: [evidence()],
  });

  assert.equal(result.renderNeed.state, "render_candidate");
  assert.equal(result.renderNeed.qualifyingEvidence, 1);
  assert.deepEqual(result.renderNeed.candidatePages, ["https://example.com/"]);
  assert.deepEqual(result.renderNeed.dimensions, ["metadata"]);
  assert.equal(result.backendEvaluation.directPlaywright.disposition, "conditional_candidate");
  assert.equal(result.backendEvaluation.directPlaywright.productionEligible, false);
  assert.equal(result.activation.decision, "blocked_pending_renderer_safety_certification");
  assert.equal(result.activation.futureCandidate, "direct_playwright");
  assert.deepEqual(result.activation.blockers, [
    "browser_egress_ssrf_equivalence_uncertified",
    "browser_dns_rebinding_equivalence_uncertified",
    "browser_request_policy_not_runtime_certified",
    "renderer_runtime_not_implemented",
    "explicit_renderer_execution_authorization_absent",
  ]);
});

test("UGP-3.4 does not escalate generic framework/hydration evidence even when static content is empty", () => {
  const result = evaluateJsRenderedExecutionBackend({
    analysis: analysis({ contentText: "" }),
    gapEvidence: [evidence({
      dimension: null,
      signal: "framework_hydration_marker",
      strength: "strong",
    })],
  });

  assert.equal(result.renderNeed.state, "insufficient_evidence");
  assert.equal(result.renderNeed.qualifyingEvidence, 0);
  assert.equal(result.evidence[0]!.disposition, "generic_framework_context_only");
  assert.equal(result.backendEvaluation.directPlaywright.disposition, "standby");
  assert.equal(result.activation.decision, "not_authorized_insufficient_evidence");
  assert.equal(result.activation.futureCandidate, null);
});

test("UGP-3.4 requires strong evidence and a genuinely missing static dimension", () => {
  const weak = evaluateJsRenderedExecutionBackend({
    analysis: analysis({ title: null }),
    gapEvidence: [evidence({ strength: "moderate" })],
  });
  assert.equal(weak.renderNeed.state, "insufficient_evidence");
  assert.equal(weak.evidence[0]!.disposition, "evidence_not_strong_enough");

  const alreadyObserved = evaluateJsRenderedExecutionBackend({
    analysis: analysis(),
    gapEvidence: [evidence()],
  });
  assert.equal(alreadyObserved.renderNeed.state, "insufficient_evidence");
  assert.equal(alreadyObserved.evidence[0]!.disposition, "static_dimension_already_observed");
});

test("UGP-3.4 is deterministic across supplied evidence order and duplicate evidence", () => {
  const source = analysis({
    title: null,
    contentText: "",
  });
  const metadata = evidence();
  const content = evidence({
    dimension: "content",
    signal: "client_rendered_content_marker",
    sourceFingerprint: FP.gap2,
  });
  const framework = evidence({
    dimension: null,
    signal: "framework_hydration_marker",
    strength: "moderate",
    sourceFingerprint: FP.gap3,
  });

  const first = evaluateJsRenderedExecutionBackend({
    analysis: source,
    gapEvidence: [content, metadata, framework, metadata],
  });
  const second = evaluateJsRenderedExecutionBackend({
    analysis: source,
    gapEvidence: [framework, metadata, content],
  });

  assert.equal(first.evaluationFingerprint, second.evaluationFingerprint);
  assert.deepEqual(first, second);
  assert.deepEqual(first.renderNeed.dimensions, ["metadata", "content"]);
  assert.equal(first.renderNeed.qualifyingEvidence, 2);
  assert.equal(first.evidence.length, 3);
});

test("UGP-3.4 rejects signal/dimension mismatches and pages outside the UGP-3.3 analysis", () => {
  assert.throws(() => evaluateJsRenderedExecutionBackend({
    analysis: analysis({ title: null }),
    gapEvidence: [evidence({
      dimension: "content",
    })],
  }), /ugp_render_eval_signal_dimension_mismatch/);

  assert.throws(() => evaluateJsRenderedExecutionBackend({
    analysis: analysis({ title: null }),
    gapEvidence: [evidence({
      pageUrl: "https://example.com/other",
    })],
  }), /ugp_render_eval_page_not_in_analysis/);

  assert.throws(() => evaluateJsRenderedExecutionBackend({
    analysis: analysis({ title: null }),
    gapEvidence: [evidence({
      pageUrl: "https://evil.example/",
    })],
  }), /ugp_render_eval_page_url_invalid/);
});

test("UGP-3.4 rejects a dimension on generic framework evidence", () => {
  assert.throws(() => evaluateJsRenderedExecutionBackend({
    analysis: analysis({ contentText: "" }),
    gapEvidence: [evidence({
      signal: "framework_hydration_marker",
      dimension: "content",
    })],
  }), /ugp_render_eval_generic_signal_dimension_invalid/);
});

test("UGP-3.4 evaluates Crawlee as not selected because crawl-plane ownership must remain existing", () => {
  const result = evaluateJsRenderedExecutionBackend({
    analysis: analysis({ title: null }),
    gapEvidence: [evidence()],
  });

  assert.equal(result.backendEvaluation.crawleePlaywright.productionEligible, false);
  assert.equal(result.backendEvaluation.crawleePlaywright.repositoryAvailability, "not_installed");
  assert.deepEqual(result.backendEvaluation.crawleePlaywright.reasons, [
    "would_duplicate_existing_request_queue_ownership",
    "would_duplicate_existing_checkpoint_and_retry_state",
    "would_introduce_crawlee_storage_plane",
    "autoscaled_concurrency_conflicts_with_existing_crawl_policy_ownership",
    "direct_playwright_is_lower_level_if_a_renderer_is_later_certified",
  ]);

  assert.equal(result.requiredControls.crawlPlane.newRequestQueue, false);
  assert.equal(result.requiredControls.crawlPlane.crawleeStoragePlane, false);
  assert.equal(result.requiredControls.crawlPlane.adaptiveAutoscaling, false);
  assert.equal(result.requiredControls.crawlPlane.existingCheckpointAuthoritative, true);
});

test("UGP-3.4 requires browser interception and SSRF/DNS-equivalent egress controls before any future renderer", () => {
  const result = evaluateJsRenderedExecutionBackend({
    analysis: analysis({ title: null }),
    gapEvidence: [evidence()],
  });

  assert.deepEqual(result.requiredControls.browserContext, {
    serviceWorkers: "block",
    requestInterceptionBeforeNavigation: true,
    persistentProfile: false,
    downloads: "deny",
    permissions: "deny",
    harRecording: false,
    videoRecording: false,
  });
  assert.deepEqual(result.requiredControls.network, {
    httpsOnly: true,
    credentialBearingUrls: "deny",
    browserEgressPublicAddressValidation: "required_per_request",
    dnsRebindingMitigation: "must_be_equivalent_to_existing_secure_transport",
    connectionAddressPinningOrEquivalentIsolation: "required",
    topLevelNavigationScope: "same_origin_only",
    nonGetHeadRequests: "abort",
    crossOriginSubresources: "deny_until_browser_egress_certified",
    redirectRevalidation: "required_each_hop",
  });
});

test("UGP-3.4 authority stays completely closed even when rendering is a candidate", () => {
  const result = evaluateJsRenderedExecutionBackend({
    analysis: analysis({ title: null }),
    gapEvidence: [evidence()],
  });

  assert.deepEqual(result.activation.authorization, {
    browserExecutionAuthorized: false,
    networkReadAuthorized: false,
    crawlExecutionAuthorized: false,
    persistenceAuthorized: false,
    rendererRuntimeBindingAuthorized: false,
    newQueueAuthorized: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
  });
  assert.equal(Object.isFrozen(result), true);
  assert.match(result.evaluationFingerprint, /^[0-9a-f]{64}$/);
});

test("UGP-3.4 integrity guard rejects mutated evaluation state", () => {
  const result = evaluateJsRenderedExecutionBackend({
    analysis: analysis({ title: null }),
    gapEvidence: [evidence()],
  });
  const mutated = JSON.parse(JSON.stringify(result));
  mutated.backendEvaluation.directPlaywright.productionEligible = true;

  assert.throws(
    () => assertJsRenderedBackendEvaluationIntegrity(mutated),
    /ugp_render_eval_playwright_overclaim|ugp_render_eval_integrity_failed/,
  );
});
