const readiness = {
  state: "live",
  message: "Synthetic browser-test fixture is available.",
};

export const dashboardFixture = {
  state: "live",
  reason: null,
  siteName: "Diamond Shelf Test",
  domain: "example.test",
  generatedAt: "2026-09-18T12:00:00.000Z",
  dataFreshness: "Synthetic fixture · 5 minutes",
  stale: false,
  approvalsPending: 2,
  metrics: [
    { label: "Organic clicks", value: "1,240", delta: "+8.2%" },
    { label: "Impressions", value: "48,300", delta: "+5.1%" },
    { label: "Organic CTR", value: "2.6%", delta: "+0.2%" },
    { label: "Top-10 keywords", value: "84", delta: "+7" },
    { label: "Average position", value: "14.2", delta: "-1.3" },
    { label: "AI citation rate", value: "18.0%", delta: "+2.0%" },
    { label: "Open findings", value: "3", delta: "Synthetic fixture" },
  ],
  engine: {
    pagesAnalyzed: 30,
    activeCandidatesRefreshed: 4,
    dryRunPlansPrepared: 2,
    executableActionsPrepared: 0,
    opportunities: 4,
    actionsPrepared: 0,
    executed: 0,
    verified: 5,
    regressions: 0,
  },
  opportunities: [
    {
      title: "metadata · title",
      page: "/collections/fragrance",
      score: "91.4",
      evidence: "3 refs",
      risk: "approval",
      state: "new",
    },
    {
      title: "internal links",
      page: "/collections/men",
      score: "82.0",
      evidence: "2 refs",
      risk: "approval",
      state: "planned",
    },
  ],
  activity: [
    {
      title: "Active opportunities refreshed",
      detail: "4 candidates refreshed from synthetic persisted evidence",
      result: "Current queue ranked",
      tone: "ready",
    },
    {
      title: "Verification complete",
      detail: "5 synthetic changes remain verified",
      result: "No regressions detected",
      tone: "verified",
    },
  ],
  verification: {
    verified: 5,
    total: 6,
    pending: 1,
    rolledBack: 0,
    regressions: 0,
  },
  aiVisibility: {
    citationRate: "18.0%",
    brandMentionRate: "31.0%",
    citationShare: "12.0%",
  },
  learning: {
    signalCount: 7,
    averageConfidence: "86.0%",
  },
  impact: {
    verifiedOptimizations: 5,
    completedExperiments: 2,
    rollbacks: 0,
    regressionsDetected: 0,
  },
  pilot: {
    status: "completed",
    readiness: "ready",
    phase: "synthetic_browser_fixture",
    freshness: "2026-09-18T12:00:00.000Z",
    blockers: [],
    counts: {
      products: 30,
      catalogProducts: 100,
      productsObserved: 30,
      shopifyComplete: false,
      gscRows: 18,
      gscDetailedRows: 18,
      ga4Rows: 12,
      pages: 30,
      findings: 3,
      opportunities: 4,
    },
    diagnostics: {
      shopify: { status: "available", category: null, httpStatus: 200 },
      gsc: { status: "available", category: null, httpStatus: 200 },
      gscAggregate: { status: "available", category: null, httpStatus: 200 },
      ga4: { status: "available", category: null, httpStatus: 200 },
      crawl: { status: "available", category: null, httpStatus: 200 },
    },
    certification: {
      status: "partial",
      wholeSiteCertified: false,
      wholeSiteReason: "Synthetic bounded baseline only.",
      crawlCoverage: {
        fetched: 30,
        discovered: 42,
        percent: 71.4,
        boundedLimit: 30,
        truncated: true,
      },
      technicalFindings: {
        total: 3,
        withValidEvidence: 3,
        valid: true,
      },
      gscAggregate: {
        status: "available",
        metrics: {
          clicks: 1240,
          impressions: 48300,
          ctr: 0.0257,
          position: 14.2,
        },
        reconciliation: {
          status: "reconciled",
          detailedClicks: 1240,
          detailedImpressions: 48300,
          clickCoverage: 1,
          impressionCoverage: 1,
        },
      },
    },
  },
};

export const findingsFixture = {
  readiness,
  rows: [
    {
      id: "finding-001",
      title: "Missing canonical tag",
      category: "canonical",
      severity: "high",
      status: "open",
      description: "Canonical target is unavailable on the persisted page snapshot.",
      url: "https://example.test/products/amber-noir",
    },
    {
      id: "finding-002",
      title: "Title element is too short",
      category: "metadata",
      severity: "medium",
      status: "open",
      description: "Persisted title length is below the configured quality range.",
      url: "https://example.test/collections/fragrance",
    },
    {
      id: "finding-003",
      title: "Internal link opportunity",
      category: "internal_links",
      severity: "low",
      status: "observed",
      description: "Relevant destination has no persisted contextual link from this page.",
      url: "https://example.test/collections/men",
    },
  ],
};

const emptyListFixture = {
  readiness,
  rows: [],
};

const performanceFixture = {
  readiness,
  rows: [
    {
      query: "synthetic fragrance",
      clicks: 120,
      impressions: 4200,
      ctr: 0.0286,
      average_position: 8.4,
    },
  ],
};

const connectionsFixture = {
  readOnly: true,
  shopify: {
    connected: false,
  },
  google: {
    connected: false,
    authorized: false,
    needsConfirmation: false,
    needsAttention: false,
    hasRefreshToken: false,
    searchConsoleDiscovery: null,
    ga4Discovery: null,
    searchConsoleProperties: [],
    ga4Properties: [],
  },
};

const executionFixture = {
  task53: {
    capability: {
      connected: false,
      writeProductsScopePresent: false,
      credentialAvailable: false,
    },
  },
};

const authFixture = {
  version: "p4.10-synthetic",
  enforcementEnabled: false,
  configured: true,
  authenticated: false,
  user: null,
};

function json(route, payload, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

export async function installSyntheticNetwork(page) {
  const unknownApiRequests = [];
  const externalRequests = [];

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    const isLocal =
      url.origin === "http://127.0.0.1:4174" ||
      url.origin === "http://localhost:4174";

    if (!isLocal) {
      externalRequests.push(`${method} ${url.href}`);
      await route.abort("blockedbyclient");
      return;
    }

    if (!url.pathname.startsWith("/api/")) {
      await route.continue();
      return;
    }

    const path = url.pathname;

    if (method === "GET" && path === "/api/auth/session") {
      await json(route, authFixture);
      return;
    }
    if (method === "GET" && path === "/api/dashboard") {
      await json(route, dashboardFixture);
      return;
    }
    if (
      method === "GET" &&
      (path === "/api/technical-seo" ||
        path === "/api/technical-seo/findings" ||
        path === "/api/findings")
    ) {
      await json(route, findingsFixture);
      return;
    }
    if (
      method === "GET" &&
      [
        "/api/opportunities",
        "/api/actions",
        "/api/approvals",
        "/api/ai-visibility",
        "/api/learning",
        "/api/verification",
        "/api/policies",
      ].includes(path)
    ) {
      await json(route, emptyListFixture);
      return;
    }
    if (method === "GET" && path === "/api/performance") {
      await json(route, performanceFixture);
      return;
    }
    if (
      method === "GET" &&
      (path === "/api/deployments" || path === "/api/impact")
    ) {
      await json(route, emptyListFixture);
      return;
    }
    if (method === "GET" && path === "/api/connections/status") {
      await json(route, connectionsFixture);
      return;
    }
    if (method === "GET" && path === "/api/execution") {
      await json(route, executionFixture);
      return;
    }
    if (method === "POST" && path === "/api/command") {
      await json(route, {
        answer:
          "Synthetic browser fixture: no provider, database, crawl, or public-site request was executed.",
      });
      return;
    }

    unknownApiRequests.push(`${method} ${path}`);
    await json(route, { error: "unmocked_browser_test_api_request" }, 418);
  });

  return {
    unknownApiRequests,
    externalRequests,
  };
}

export function monitorBrowserErrors(page) {
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  return {
    consoleErrors,
    pageErrors,
  };
}
