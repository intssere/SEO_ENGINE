import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPublicWebOnboardingPlan,
  normalizeSuppliedPublicWebResolution,
  type PublicWebOnboardingPlan,
  type PublicWebOnboardingResolution,
} from "./public-web-onboarding.js";
import {
  analyzeSuppliedReadOnlySite,
  assertUniversalReadOnlySiteAnalysisIntegrity,
  projectUniversalAnalysisToCrawlPageSignals,
  type SuppliedReadOnlyPageObservation,
  type UniversalReadAnalysisCrawlSource,
} from "./universal-read-only-site-analysis.js";

const FP = {
  crawl: "a".repeat(64),
  root: "b".repeat(64),
  about: "c".repeat(64),
  redirect: "d".repeat(64),
};

function onboarding(): {
  plan: PublicWebOnboardingPlan;
  resolution: PublicWebOnboardingResolution;
} {
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
  return { plan, resolution };
}

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

function crawlSource(overrides: Partial<UniversalReadAnalysisCrawlSource> = {}): UniversalReadAnalysisCrawlSource {
  return {
    adapter: "existing_crawl_architecture",
    sourceVersion: "first_party_crawl_controller_v1",
    sourceFingerprint: FP.crawl,
    mode: "baseline",
    discoveredPages: 2,
    observedPages: 2,
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
    ...overrides,
  };
}

function successPage(
  url: string,
  sourceFingerprint: string,
  overrides: Partial<SuppliedReadOnlyPageObservation> = {},
): SuppliedReadOnlyPageObservation {
  return {
    url,
    outcome: "success",
    statusCode: 200,
    robotsAllowed: true,
    redirectTarget: null,
    failureCode: null,
    noindex: false,
    canonicalUrl: url,
    title: "Example page",
    metaDescription: "A deterministic example description.",
    h1: "Example page",
    headings: ["Example page", "Details"],
    contentText: "This is supplied visible page content used for deterministic read-only analysis.",
    structuredData: {
      types: ["WebPage"],
      validity: "valid",
      issues: [],
    },
    internalLinks: [],
    images: [{
      src: "https://cdn.example.net/image.jpg?width=800",
      alt: "Example image",
    }],
    performance: {
      responseTimeMs: 180,
      transferBytes: 12_000,
    },
    sourceFingerprint,
    ...overrides,
  };
}

function redirectPage(
  url: string,
  target: string,
): SuppliedReadOnlyPageObservation {
  return {
    url,
    outcome: "redirect",
    statusCode: 301,
    robotsAllowed: true,
    redirectTarget: target,
    failureCode: null,
    noindex: null,
    canonicalUrl: null,
    title: null,
    metaDescription: null,
    h1: null,
    headings: [],
    contentText: null,
    structuredData: {
      types: [],
      validity: "unknown",
      issues: [],
    },
    internalLinks: [],
    images: [],
    performance: null,
    sourceFingerprint: FP.redirect,
  };
}

test("UGP-3.3 normalizes supplied existing-crawl evidence across universal analysis dimensions", () => {
  const { plan, resolution } = onboarding();
  const analysis = analyzeSuppliedReadOnlySite({
    plan,
    resolution,
    crawlSource: crawlSource({ discoveredPages: 3, observedPages: 3 }),
    pages: [
      successPage("https://example.com/", FP.root, {
        internalLinks: [
          "https://example.com/about",
          "https://example.com/about",
        ],
      }),
      successPage("https://example.com/about", FP.about, {
        title: null,
        metaDescription: null,
        h1: null,
        headings: [],
        canonicalUrl: null,
        contentText: "",
        structuredData: {
          types: ["Organization"],
          validity: "invalid",
          issues: ["missing required name"],
        },
        images: [{
          src: "https://images.example.net/about.jpg",
          alt: null,
        }],
        performance: null,
      }),
      redirectPage(
        "https://example.com/old",
        "https://example.com/about",
      ),
    ],
  });

  assert.equal(analysis.version, "ugp-3-3-universal-read-analysis-v1");
  assert.equal(analysis.site.canonicalOrigin, "https://example.com");
  assert.equal(analysis.provenance.mode, "supplied_existing_crawl_observations");
  assert.equal(analysis.crawl.source.adapter, "existing_crawl_architecture");
  assert.equal(analysis.crawl.coverage.state, "observed_inventory_complete");
  assert.equal(analysis.crawl.coverage.coveragePercent, 100);
  assert.equal(analysis.crawl.coverage.wholeSiteCertified, false);
  assert.equal(
    analysis.crawl.coverage.wholeSiteReason,
    "not_independently_certified_by_ugp_3_3",
  );

  const root = analysis.pages.find((page) => page.url === "https://example.com/")!;
  const about = analysis.pages.find((page) => page.url === "https://example.com/about")!;
  const redirect = analysis.pages.find((page) => page.url === "https://example.com/old")!;

  assert.equal(root.crawlability.state, "fetched");
  assert.equal(root.indexability.state, "indexable");
  assert.equal(root.canonical.state, "self");
  assert.deepEqual(root.internalLinks, ["https://example.com/about"]);
  assert.equal(root.performance.availability, "observed");
  assert.equal(root.performance.lighthouseEvidence, "not_collected_in_ugp_3_3");

  assert.equal(about.graph.observedInboundLinks, 1);
  assert.equal(about.graph.orphanCandidate, false);
  assert.equal(about.canonical.state, "missing");
  assert.deepEqual(about.findings, [
    "canonical.missing",
    "content.empty",
    "images.alt_missing",
    "metadata.description_missing",
    "metadata.h1_missing",
    "metadata.title_missing",
    "structured_data.invalid",
  ]);

  assert.equal(redirect.crawlability.state, "redirected");
  assert.equal(redirect.indexability.state, "unavailable");
  assert.equal(redirect.canonical.state, "unavailable");
  assert.equal(analysis.summary.redirectPages, 1);
  assert.equal(analysis.summary.missingTitlePages, 1);
  assert.equal(analysis.summary.invalidStructuredDataPages, 1);
  assert.equal(analysis.summary.pagesWithMissingImageAlt, 1);
  assert.equal(analysis.summary.performanceObservedPages, 1);
  assert.equal(analysis.downstream.successfulPageSignals, 2);

  assert.deepEqual(analysis.authorization, closedAuthorization());
  assert.match(analysis.analysisFingerprint, /^[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(analysis), true);
  assertUniversalReadOnlySiteAnalysisIntegrity(analysis);
});

test("UGP-3.3 projects only successful normalized pages into the existing CrawlPageSignal contract", () => {
  const { plan, resolution } = onboarding();
  const analysis = analyzeSuppliedReadOnlySite({
    plan,
    resolution,
    crawlSource: crawlSource({ discoveredPages: 3, observedPages: 3 }),
    pages: [
      successPage("https://example.com/", FP.root, {
        internalLinks: ["https://example.com/about"],
      }),
      successPage("https://example.com/about", FP.about, {
        noindex: true,
      }),
      redirectPage("https://example.com/old", "https://example.com/about"),
    ],
  });

  const signals = projectUniversalAnalysisToCrawlPageSignals(analysis);
  assert.equal(signals.length, 2);
  assert.deepEqual(signals.map((signal) => signal.url), [
    "https://example.com/",
    "https://example.com/about",
  ]);
  assert.equal(signals[0]!.indexable, true);
  assert.equal(signals[1]!.indexable, false);
  assert.deepEqual(signals[0]!.links, ["https://example.com/about"]);
  assert.deepEqual(signals[0]!.structuredData, {
    types: ["WebPage"],
    validity: "valid",
    issues: [],
  });
  assert.match(signals[0]!.pageId, /^ugp-page-[0-9a-f]{24}$/);
  assert.match(signals[0]!.evidenceId, /^ugp-evidence-[0-9a-f]{24}$/);
});

test("UGP-3.3 is deterministic under page, heading, structured-data and link ordering", () => {
  const { plan, resolution } = onboarding();
  const root = successPage("https://example.com/", FP.root, {
    headings: ["B", "A", "B"],
    internalLinks: [
      "https://example.com/about",
      "https://example.com/about",
    ],
    structuredData: {
      types: ["Product", "WebPage", "Product"],
      validity: "unknown",
      issues: ["z issue", "a issue"],
    },
  });
  const about = successPage("https://example.com/about", FP.about);

  const first = analyzeSuppliedReadOnlySite({
    plan,
    resolution,
    crawlSource: crawlSource(),
    pages: [root, about],
  });
  const second = analyzeSuppliedReadOnlySite({
    plan,
    resolution,
    crawlSource: crawlSource(),
    pages: [
      about,
      {
        ...root,
        headings: ["A", "B"],
        internalLinks: ["https://example.com/about"],
        structuredData: {
          types: ["WebPage", "Product"],
          validity: "unknown",
          issues: ["a issue", "z issue"],
        },
      },
    ],
  });

  assert.equal(first.analysisFingerprint, second.analysisFingerprint);
  assert.deepEqual(first.pages, second.pages);
});

test("UGP-3.3 preserves partial coverage and does not elevate missing inbound evidence to an orphan candidate", () => {
  const { plan, resolution } = onboarding();
  const analysis = analyzeSuppliedReadOnlySite({
    plan,
    resolution,
    crawlSource: crawlSource({
      discoveredPages: 4,
      observedPages: 2,
      truncated: true,
    }),
    pages: [
      successPage("https://example.com/", FP.root),
      successPage("https://example.com/about", FP.about),
    ],
  });

  assert.equal(analysis.crawl.coverage.state, "partial");
  assert.equal(analysis.crawl.coverage.coveragePercent, 50);
  assert.equal(analysis.crawl.coverage.wholeSiteCertified, false);
  assert.equal(
    analysis.pages.find((page) => page.url.endsWith("/about"))!.graph.orphanCandidate,
    false,
  );
  assert.equal(analysis.summary.orphanCandidates, 0);
});

test("UGP-3.3 marks noindex, HTTP errors, failures and robots exclusions without fabricating page payload", () => {
  const { plan, resolution } = onboarding();
  const emptyPayload = {
    canonicalUrl: null,
    title: null,
    metaDescription: null,
    h1: null,
    headings: [],
    contentText: null,
    structuredData: { types: [], validity: "unknown" as const, issues: [] },
    internalLinks: [],
    images: [],
    performance: null,
  };
  const analysis = analyzeSuppliedReadOnlySite({
    plan,
    resolution,
    crawlSource: crawlSource({ discoveredPages: 4, observedPages: 4 }),
    pages: [
      successPage("https://example.com/", FP.root, { noindex: true }),
      {
        url: "https://example.com/missing",
        outcome: "http_error",
        statusCode: 404,
        robotsAllowed: true,
        redirectTarget: null,
        failureCode: null,
        noindex: null,
        ...emptyPayload,
        sourceFingerprint: "1".repeat(64),
      },
      {
        url: "https://example.com/failure",
        outcome: "failure",
        statusCode: null,
        robotsAllowed: true,
        redirectTarget: null,
        failureCode: "transport_unavailable",
        noindex: null,
        ...emptyPayload,
        sourceFingerprint: "2".repeat(64),
      },
      {
        url: "https://example.com/private",
        outcome: "robots_excluded",
        statusCode: null,
        robotsAllowed: false,
        redirectTarget: null,
        failureCode: null,
        noindex: null,
        ...emptyPayload,
        sourceFingerprint: "3".repeat(64),
      },
    ],
  });

  assert.equal(analysis.summary.noindexPages, 1);
  assert.equal(analysis.summary.httpErrorPages, 1);
  assert.equal(analysis.summary.failedPages, 1);
  assert.equal(analysis.summary.robotsExcludedPages, 1);
  assert.deepEqual(
    analysis.pages.find((page) => page.url.endsWith("/missing"))!.findings,
    ["crawlability.http_error"],
  );
  assert.deepEqual(
    analysis.pages.find((page) => page.url.endsWith("/failure"))!.findings,
    ["crawlability.fetch_failed"],
  );
  assert.deepEqual(
    analysis.pages.find((page) => page.url.endsWith("/private"))!.findings,
    ["crawlability.robots_excluded"],
  );
});

test("UGP-3.3 rejects cross-origin, query-bearing and duplicate first-party page observations", () => {
  const { plan, resolution } = onboarding();

  assert.throws(() => analyzeSuppliedReadOnlySite({
    plan,
    resolution,
    crawlSource: crawlSource({ discoveredPages: 1, observedPages: 1 }),
    pages: [successPage("https://evil.example/", FP.root)],
  }), /ugp_read_analysis_page_url_invalid/);

  assert.throws(() => analyzeSuppliedReadOnlySite({
    plan,
    resolution,
    crawlSource: crawlSource({ discoveredPages: 1, observedPages: 1 }),
    pages: [successPage("https://example.com/?sort=asc", FP.root)],
  }), /ugp_read_analysis_page_url_invalid/);

  assert.throws(() => analyzeSuppliedReadOnlySite({
    plan,
    resolution,
    crawlSource: crawlSource(),
    pages: [
      successPage("https://example.com/", FP.root),
      successPage("https://example.com/", FP.about),
    ],
  }), /ugp_read_analysis_duplicate_page_url/);
});

test("UGP-3.3 rejects cross-origin/query internal links and unsafe crawl controls", () => {
  const { plan, resolution } = onboarding();

  assert.throws(() => analyzeSuppliedReadOnlySite({
    plan,
    resolution,
    crawlSource: crawlSource({ discoveredPages: 1, observedPages: 1 }),
    pages: [successPage("https://example.com/", FP.root, {
      internalLinks: ["https://other.example/page"],
    })],
  }), /ugp_read_analysis_internal_link_invalid/);

  assert.throws(() => analyzeSuppliedReadOnlySite({
    plan,
    resolution,
    crawlSource: crawlSource({ discoveredPages: 1, observedPages: 1 }),
    pages: [successPage("https://example.com/", FP.root, {
      internalLinks: ["https://example.com/page?ref=nav"],
    })],
  }), /ugp_read_analysis_internal_link_invalid/);

  const unsafe = crawlSource() as any;
  unsafe.controls = { ...unsafe.controls, robotsEnforced: false };
  assert.throws(() => analyzeSuppliedReadOnlySite({
    plan,
    resolution,
    crawlSource: unsafe,
    pages: [
      successPage("https://example.com/", FP.root),
      successPage("https://example.com/about", FP.about),
    ],
  }), /ugp_read_analysis_crawl_controls_unsafe/);
});

test("UGP-3.3 rejects open authority, count mismatch and non-success page payload", () => {
  const { plan, resolution } = onboarding();

  const open = crawlSource() as any;
  open.authorization = { ...open.authorization, networkReadAuthorized: true };
  assert.throws(() => analyzeSuppliedReadOnlySite({
    plan,
    resolution,
    crawlSource: open,
    pages: [
      successPage("https://example.com/", FP.root),
      successPage("https://example.com/about", FP.about),
    ],
  }), /ugp_read_analysis_crawl_authority_open/);

  assert.throws(() => analyzeSuppliedReadOnlySite({
    plan,
    resolution,
    crawlSource: crawlSource({ observedPages: 2, discoveredPages: 2 }),
    pages: [successPage("https://example.com/", FP.root)],
  }), /ugp_read_analysis_observed_page_count_mismatch/);

  assert.throws(() => analyzeSuppliedReadOnlySite({
    plan,
    resolution,
    crawlSource: crawlSource({ observedPages: 1, discoveredPages: 1 }),
    pages: [{
      ...redirectPage("https://example.com/old", "https://example.com/"),
      title: "Impossible redirect title",
    }],
  }), /ugp_read_analysis_non_success_payload_invalid/);
});

test("UGP-3.3 fails closed when UGP-3.1 says read analysis is not eligible", () => {
  const { plan, resolution } = onboarding();
  const ineligible = {
    ...resolution,
    readAnalysisEligibility: {
      eligible: false,
      reason: "robots_unavailable",
    },
  } as PublicWebOnboardingResolution;

  assert.throws(() => analyzeSuppliedReadOnlySite({
    plan,
    resolution: ineligible,
    crawlSource: crawlSource({ discoveredPages: 1, observedPages: 1 }),
    pages: [successPage("https://example.com/", FP.root)],
  }), /ugp_read_analysis_resolution_not_eligible/);
});

test("UGP-3.3 integrity guard rejects mutated result state", () => {
  const { plan, resolution } = onboarding();
  const analysis = analyzeSuppliedReadOnlySite({
    plan,
    resolution,
    crawlSource: crawlSource({ discoveredPages: 1, observedPages: 1 }),
    pages: [successPage("https://example.com/", FP.root)],
  });

  const mutated = JSON.parse(JSON.stringify(analysis));
  mutated.summary.indexablePages = 999;
  assert.throws(
    () => assertUniversalReadOnlySiteAnalysisIntegrity(mutated),
    /ugp_read_analysis_integrity_failed/,
  );
});

test("UGP-3.3 keeps transport performance descriptive and defers Lighthouse evidence to UGP-3.5", () => {
  const { plan, resolution } = onboarding();
  const analysis = analyzeSuppliedReadOnlySite({
    plan,
    resolution,
    crawlSource: crawlSource({ discoveredPages: 1, observedPages: 1 }),
    pages: [successPage("https://example.com/", FP.root, {
      performance: { responseTimeMs: 321, transferBytes: 45_678 },
    })],
  });
  const page = analysis.pages[0]!;
  assert.deepEqual(page.performance, {
    availability: "observed",
    responseTimeMs: 321,
    transferBytes: 45_678,
    source: "supplied_transport_observation",
    lighthouseEvidence: "not_collected_in_ugp_3_3",
  });
  assert.equal(analysis.downstream.lighthouseAdapter, "not_performed");
});
