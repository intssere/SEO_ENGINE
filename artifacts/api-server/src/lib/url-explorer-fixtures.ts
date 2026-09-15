import { planFirstPartyCrawl } from "./crawl-controller.js";
import { compareFullSiteCrawlHistory } from "./crawl-history-comparison.js";
import { buildIncrementalRecrawlPlan } from "./incremental-recrawl-planner.js";
import { buildIncrementalRecrawlTestSource } from "./incremental-recrawl-planner-fixtures.js";
import { buildSitemapInventory, type SitemapInventoryPolicy } from "./sitemap-inventory.js";

const ORIGIN = "https://diamondshelf.us";
const SITE_ID = "diamond-shelf";

function sitemapPolicy(maxInventoryUrls = 20): SitemapInventoryPolicy {
  return {
    maxDocuments: 10,
    maxDepth: 3,
    maxDocumentBytes: 20_000,
    maxInventoryUrls,
    maxPathSegments: 20,
  };
}

export function buildUrlExplorerInventory(
  entries: Array<{ path: string; lastmod?: string }> = [],
  input: { siteId?: string; canonicalOrigin?: string } = {},
) {
  const siteId = input.siteId ?? SITE_ID;
  const canonicalOrigin = input.canonicalOrigin ?? ORIGIN;
  const plan = planFirstPartyCrawl(
    {
      mode: "full_site",
      target: { targetClass: "first_party", siteId, canonicalOrigin },
      hardPageLimit: 20,
    },
    { absolutePageCeiling: 1_000 },
  );
  const body = entries
    .map(({ path, lastmod }) => `<url><loc>${canonicalOrigin}${path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`)
    .join("");
  return buildSitemapInventory({
    plan,
    rootSitemapUrl: `${canonicalOrigin}/sitemap.xml`,
    documents: [{ url: `${canonicalOrigin}/sitemap.xml`, xml: `<urlset>${body}</urlset>` }],
    policy: sitemapPolicy(),
  });
}

export function buildUrlExplorerTestContext(input: {
  siteId?: string;
  canonicalOrigin?: string;
  maxPlanUrls?: number;
} = {}) {
  const siteId = input.siteId ?? SITE_ID;
  const canonicalOrigin = input.canonicalOrigin ?? ORIGIN;
  const before = buildIncrementalRecrawlTestSource({
    siteId,
    canonicalOrigin,
    entries: [
      { path: "/a", lastmod: "2026-09-01" },
      { path: "/b", lastmod: "2026-09-02" },
      { path: "/e" },
    ],
  });
  const after = buildIncrementalRecrawlTestSource({
    siteId,
    canonicalOrigin,
    entries: [
      { path: "/a", lastmod: "2026-09-10" },
      { path: "/b", lastmod: "2026-09-02" },
      { path: "/c", lastmod: "2026-09-11" },
      { path: "/d", lastmod: "2026-09-12" },
      { path: "/e" },
    ],
  });
  const comparison = compareFullSiteCrawlHistory({ before, after });
  const recrawlPlan = buildIncrementalRecrawlPlan({
    comparison,
    before,
    after,
    policy: { maxPlanUrls: input.maxPlanUrls ?? 3, batchSize: 2 },
    trustedCandidates: [
      { canonicalUrl: `${canonicalOrigin}/b`, signals: ["unresolved_issue", "high_value"] },
    ],
  });
  return { before, after, comparison, inventory: after.inventory, recrawlPlan };
}
