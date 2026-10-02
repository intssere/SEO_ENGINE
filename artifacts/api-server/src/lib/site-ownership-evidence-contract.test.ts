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
  assertSiteOwnershipEvidenceIntegrity,
  buildSiteOwnershipEvidence,
  type SiteOwnershipPageInventory,
  type SiteOwnershipQueryPageObservation,
} from "./site-ownership-evidence-contract.js";

const MARKET = {
  searchEngine: "google" as const,
  locationCode: 2840,
  languageCode: "en",
  device: "desktop" as const,
};

function fixtureAnalysis(options: {
  partial?: boolean;
  secondIntentPage?: boolean;
} = {}) {
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

  const pages: SuppliedReadOnlyPageObservation[] = [
    page("https://example.com/", "a".repeat(64), {
      title: "Stress Relief Journal",
      h1: "Stress Relief Journal",
      contentText: "A journal for stress relief and daily reflection.",
      internalLinks: ["https://example.com/prompts"],
    }),
    page("https://example.com/prompts", "b".repeat(64), {
      title: options.secondIntentPage
        ? "How to Use Journal Prompts"
        : "Stress Relief Journal Prompts",
      h1: options.secondIntentPage
        ? "How to Use Journal Prompts"
        : "Stress Relief Journal Prompts",
      contentText: options.secondIntentPage
        ? "An informational guide explaining how prompts work."
        : "Prompt ideas for a stress relief journal.",
    }),
  ];

  const crawlSource: UniversalReadAnalysisCrawlSource = {
    adapter: "existing_crawl_architecture",
    sourceVersion: "first_party_crawl_controller_v1",
    sourceFingerprint: "c".repeat(64),
    mode: "baseline",
    discoveredPages: options.partial ? 3 : 2,
    observedPages: 2,
    pageHardLimit: 30,
    truncated: options.partial ?? false,
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
    authorization: {
      networkReadAuthorized: false,
      crawlExecutionAuthorized: false,
      persistenceAuthorized: false,
      connectorCapabilityGranted: false,
      schedulerEnabled: false,
      autonomousWorkerEnabled: false,
      providerWrites: false,
      publicSiteWrites: false,
    },
  };

  return analyzeSuppliedReadOnlySite({
    plan,
    resolution,
    crawlSource,
    pages,
  });
}

function projectAnalysis(
  analysis: ReturnType<typeof fixtureAnalysis>,
): SiteOwnershipPageInventory {
  return {
    version: "ugp-6-3a-page-inventory-projection-v1",
    canonicalOrigin: analysis.site.canonicalOrigin,
    sourceAnalysisFingerprint: analysis.analysisFingerprint,
    coverage: analysis.crawl.coverage.state,
    wholeSiteCertified: analysis.crawl.coverage.wholeSiteCertified,
    pages: analysis.pages.map((page) => ({
      url: page.url,
      analysisPageId: page.pageId,
      evidenceId: page.evidenceId,
      pageFingerprint: page.pageFingerprint,
      sourceFingerprint: page.sourceFingerprint,
      outcome: page.outcome,
      indexability: page.indexability.state,
      canonicalUrl: page.canonical.value,
      canonicalState: page.canonical.state,
      title: page.metadata.title,
      h1: page.metadata.h1,
      headings: page.metadata.headings,
      contentFingerprint: page.content.contentFingerprint,
    })),
  };
}

function page(
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
    title: "Example",
    metaDescription: "Example description",
    h1: "Example",
    headings: ["Example"],
    contentText: "Example content",
    structuredData: {
      types: ["WebPage"],
      validity: "valid",
      issues: [],
    },
    internalLinks: [],
    images: [],
    performance: null,
    sourceFingerprint,
    ...overrides,
  };
}

function observation(
  query: string,
  pageUrl: string,
  overrides: Partial<SiteOwnershipQueryPageObservation> = {},
): SiteOwnershipQueryPageObservation {
  return {
    query,
    pageUrl,
    market: MARKET,
    clicks: 10,
    impressions: 100,
    ctr: 0.1,
    position: 4.5,
    sourceId: "gsc-captured-query-page-evidence",
    sourceFingerprint: "d".repeat(64),
    ...overrides,
  };
}

test("UGP-6.3A builds deterministic site ownership evidence from canonical crawl analysis and query-page rows", () => {
  const analysis = fixtureAnalysis();
  const result = buildSiteOwnershipEvidence({
    pageInventory: projectAnalysis(analysis),
    market: MARKET,
    queryPageObservations: [
      observation("stress relief journal prompts", "https://example.com/prompts"),
      observation("stress relief journal", "https://example.com/"),
    ],
  });

  assert.equal(result.version, "ugp-6-3a-site-ownership-evidence-v1");
  assert.equal(result.site.canonicalOrigin, "https://example.com");
  assert.equal(result.market.locationCode, 2840);
  assert.equal(result.pages.length, 2);
  assert.equal(result.queryPageEvidence.length, 2);
  assert.deepEqual(
    result.queryPageEvidence.map((row) => row.query),
    ["stress relief journal", "stress relief journal prompts"],
  );
  assert.equal(result.pages[0]?.crawlEvidence.availability, "observed");
  assert.equal(result.pages[0]?.crawlEvidence.indexability, "indexable");
  assert.equal(result.provenance.queryPageEvidenceAvailability, "available");
  assert.deepEqual(result.missingEvidence, [
    "whole_site_not_independently_certified",
  ]);
  assertSiteOwnershipEvidenceIntegrity(result);
});

test("UGP-6.3A is invariant to input row order", () => {
  const analysis = fixtureAnalysis();
  const rows = [
    observation("stress relief journal", "https://example.com/"),
    observation("stress relief journal prompts", "https://example.com/prompts"),
  ];
  const forward = buildSiteOwnershipEvidence({
    pageInventory: projectAnalysis(analysis),
    market: MARKET,
    queryPageObservations: rows,
  });
  const reverse = buildSiteOwnershipEvidence({
    pageInventory: projectAnalysis(analysis),
    market: MARKET,
    queryPageObservations: [...rows].reverse(),
  });
  assert.deepEqual(forward, reverse);
  assert.equal(forward.evidenceFingerprint, reverse.evidenceFingerprint);
});

test("UGP-6.3A keeps explicit missing-evidence state when query-page performance is not supplied", () => {
  const result = buildSiteOwnershipEvidence({
    pageInventory: projectAnalysis(fixtureAnalysis({ partial: true })),
    market: MARKET,
  });
  assert.equal(result.queryPageEvidence.length, 0);
  assert.equal(result.provenance.queryPageEvidenceAvailability, "not_supplied");
  assert.deepEqual(result.missingEvidence, [
    "query_page_performance_not_supplied",
    "crawl_inventory_partial",
    "whole_site_not_independently_certified",
  ]);
});

test("UGP-6.3A retains same-origin ranking pages not observed by the crawl without inventing technical facts", () => {
  const result = buildSiteOwnershipEvidence({
    pageInventory: projectAnalysis(fixtureAnalysis()),
    market: MARKET,
    queryPageObservations: [
      observation("stress relief workbook", "https://example.com/workbook"),
    ],
  });
  const workbook = result.pages.find(
    (page) => page.url === "https://example.com/workbook",
  );
  assert.ok(workbook);
  assert.equal(workbook.crawlEvidence.availability, "not_observed");
  assert.equal(workbook.crawlEvidence.indexability, null);
  assert.equal(workbook.queryCount, 1);
});

test("UGP-6.3A rejects mixed markets", () => {
  assert.throws(
    () => buildSiteOwnershipEvidence({
      pageInventory: projectAnalysis(fixtureAnalysis()),
      market: MARKET,
      queryPageObservations: [
        observation("stress relief journal", "https://example.com/", {
          market: { ...MARKET, device: "mobile" },
        }),
      ],
    }),
    /ugp_site_ownership_mixed_market/,
  );
});

test("UGP-6.3A rejects cross-origin, query-string and fragment page identities", () => {
  for (const pageUrl of [
    "https://other.example.com/page",
    "https://example.com/page?x=1",
    "https://example.com/page#section",
  ]) {
    assert.throws(
      () => buildSiteOwnershipEvidence({
        pageInventory: projectAnalysis(fixtureAnalysis()),
        market: MARKET,
        queryPageObservations: [
          observation("stress relief journal", pageUrl),
        ],
      }),
      /ugp_site_ownership_invalid_page_url/,
    );
  }
});

test("UGP-6.3A rejects duplicate query-page evidence", () => {
  const row = observation(
    "stress relief journal",
    "https://example.com/",
  );
  assert.throws(
    () => buildSiteOwnershipEvidence({
      pageInventory: projectAnalysis(fixtureAnalysis()),
      market: MARKET,
      queryPageObservations: [row, { ...row }],
    }),
    /ugp_site_ownership_duplicate_query_page_evidence/,
  );
});

test("UGP-6.3A validates bounded metrics and source provenance", () => {
  assert.throws(
    () => buildSiteOwnershipEvidence({
      pageInventory: projectAnalysis(fixtureAnalysis()),
      market: MARKET,
      queryPageObservations: [
        observation("stress relief journal", "https://example.com/", {
          clicks: 101,
          impressions: 100,
        }),
      ],
    }),
    /ugp_site_ownership_clicks_exceed_impressions/,
  );
  assert.throws(
    () => buildSiteOwnershipEvidence({
      pageInventory: projectAnalysis(fixtureAnalysis()),
      market: MARKET,
      queryPageObservations: [
        observation("stress relief journal", "https://example.com/", {
          sourceFingerprint: "not-a-fingerprint",
        }),
      ],
    }),
    /ugp_site_ownership_invalid_source_fingerprint/,
  );
});

test("UGP-6.3A normalizes query text deterministically", () => {
  const result = buildSiteOwnershipEvidence({
    pageInventory: projectAnalysis(fixtureAnalysis()),
    market: MARKET,
    queryPageObservations: [
      observation("  Stress Relief Journal  ", "https://example.com/"),
    ],
  });
  assert.equal(result.queryPageEvidence[0]?.query, "stress relief journal");
});

test("UGP-6.3A emits closed read-only non-authorizing semantics", () => {
  const result = buildSiteOwnershipEvidence({
    pageInventory: projectAnalysis(fixtureAnalysis()),
    market: MARKET,
  });
  assert.deepEqual(result.semantics, {
    readOnly: true,
    deterministic: true,
    grantsAuthorization: false,
    grantsProviderWrite: false,
    grantsPublicSiteWrite: false,
    performsNetworkOperation: false,
    performsPersistence: false,
  });
});

test("UGP-6.3A integrity guard rejects fingerprint mutation", () => {
  const result = buildSiteOwnershipEvidence({
    pageInventory: projectAnalysis(fixtureAnalysis()),
    market: MARKET,
  });
  assert.throws(
    () => assertSiteOwnershipEvidenceIntegrity({
      ...result,
      evidenceFingerprint: "f".repeat(64),
    }),
    /ugp_site_ownership_fingerprint_mismatch/,
  );
});
