import assert from "node:assert/strict";
import test from "node:test";
import { compareFullSiteCrawlHistory } from "./crawl-history-comparison.js";
import { buildIncrementalRecrawlPlan } from "./incremental-recrawl-planner.js";
import { buildIncrementalRecrawlTestSource } from "./incremental-recrawl-planner-fixtures.js";
import { buildUrlExplorerTestContext } from "./url-explorer-fixtures.js";
import {
  URL_EXPLORER_LIMITS,
  assertUrlExplorerResultIntegrity,
  queryUrlExplorer,
  type UrlExplorerResult,
} from "./url-explorer.js";

const ORIGIN = "https://diamondshelf.us";

function validOtherInventoryPlan() {
  const before = buildIncrementalRecrawlTestSource({
    entries: [{ path: "/a", lastmod: "2026-09-01" }],
  });
  const after = buildIncrementalRecrawlTestSource({
    entries: [
      { path: "/a", lastmod: "2026-09-10" },
      { path: "/different", lastmod: "2026-09-12" },
    ],
  });
  const comparison = compareFullSiteCrawlHistory({ before, after });
  return buildIncrementalRecrawlPlan({
    comparison,
    before,
    after,
    policy: { maxPlanUrls: 10, batchSize: 2 },
  });
}

test("P2.7 validates generated result fingerprints and rejects ordinary result tampering", () => {
  const { inventory, recrawlPlan } = buildUrlExplorerTestContext();
  const result = queryUrlExplorer({ inventory, recrawlPlan, query: { page: { limit: 2 } } });
  assertUrlExplorerResultIntegrity(result);

  const authorizationTamper = structuredClone(result) as UrlExplorerResult;
  (authorizationTamper.authorization as { networkExecutionEnabled: boolean }).networkExecutionEnabled = true;
  assert.throws(() => assertUrlExplorerResultIntegrity(authorizationTamper), /url_explorer_result_authorization_must_be_closed/);

  const urlTamper = structuredClone(result) as UrlExplorerResult;
  urlTamper.items[0].canonicalUrl = "https://example.com/a";
  assert.throws(() => assertUrlExplorerResultIntegrity(urlTamper), /url_explorer_item_url_invalid/);

  const accountingTamper = structuredClone(result) as UrlExplorerResult;
  accountingTamper.page.returned = 1;
  assert.throws(() => assertUrlExplorerResultIntegrity(accountingTamper), /url_explorer_result_page_accounting_mismatch/);

  const dimensionTamper = structuredClone(result) as UrlExplorerResult;
  dimensionTamper.items[0].unavailablePerUrlDimensions = [];
  assert.throws(() => assertUrlExplorerResultIntegrity(dimensionTamper), /url_explorer_item_unavailable_dimensions_invalid/);
});

test("P2.7 rejects malformed, cross-origin and noncanonical inventory input before querying", () => {
  const { inventory } = buildUrlExplorerTestContext();

  const crossOrigin = structuredClone(inventory);
  crossOrigin.inventory.entries[0].canonicalUrl = "https://example.com/a";
  assert.throws(() => queryUrlExplorer({ inventory: crossOrigin }), /url_explorer_inventory_url_invalid/);

  const queryBearing = structuredClone(inventory);
  queryBearing.inventory.entries[0].canonicalUrl = `${ORIGIN}/a?x=1`;
  assert.throws(() => queryUrlExplorer({ inventory: queryBearing }), /url_explorer_inventory_url_invalid/);

  const credentialBearing = structuredClone(inventory);
  credentialBearing.inventory.entries[0].canonicalUrl = "https://user:pass@diamondshelf.us/a";
  assert.throws(() => queryUrlExplorer({ inventory: credentialBearing }), /url_explorer_inventory_url_invalid/);

  const openAuthorization = structuredClone(inventory);
  (openAuthorization.authorization as { persistenceAuthorized: boolean }).persistenceAuthorized = true;
  assert.throws(() => queryUrlExplorer({ inventory: openAuthorization }), /url_explorer_inventory_authorization_must_be_closed/);
});

test("P2.7 binds a valid recrawl plan to the exact current inventory lineage and identity", () => {
  const { inventory } = buildUrlExplorerTestContext();
  const otherPlan = validOtherInventoryPlan();
  assert.throws(
    () => queryUrlExplorer({ inventory, recrawlPlan: otherPlan }),
    /url_explorer_recrawl_inventory_lineage_mismatch/,
  );

  const otherBefore = buildIncrementalRecrawlTestSource({
    siteId: "other-site",
    canonicalOrigin: "https://other.example",
    entries: [{ path: "/a", lastmod: "2026-09-01" }],
  });
  const otherAfter = buildIncrementalRecrawlTestSource({
    siteId: "other-site",
    canonicalOrigin: "https://other.example",
    entries: [
      { path: "/a", lastmod: "2026-09-10" },
      { path: "/b", lastmod: "2026-09-11" },
    ],
  });
  const otherComparison = compareFullSiteCrawlHistory({ before: otherBefore, after: otherAfter });
  const otherIdentityPlan = buildIncrementalRecrawlPlan({
    comparison: otherComparison,
    before: otherBefore,
    after: otherAfter,
    policy: { maxPlanUrls: 10, batchSize: 2 },
  });
  assert.throws(
    () => queryUrlExplorer({ inventory, recrawlPlan: otherIdentityPlan }),
    /url_explorer_recrawl_identity_mismatch/,
  );
});

test("P2.7 enforces query, filter and cursor hard bounds", () => {
  const { inventory, recrawlPlan } = buildUrlExplorerTestContext();
  assert.throws(
    () => queryUrlExplorer({ inventory, recrawlPlan, query: { page: { limit: URL_EXPLORER_LIMITS.pageSize + 1 } } }),
    /url_explorer_page_limit_invalid/,
  );
  assert.throws(
    () => queryUrlExplorer({ inventory, recrawlPlan, query: { filters: { canonicalUrlPrefix: "https://example.com/" } } }),
    /url_explorer_url_prefix_invalid/,
  );
  assert.throws(
    () => queryUrlExplorer({ inventory, recrawlPlan, query: { filters: { pathnamePrefix: "not-a-path" } } }),
    /url_explorer_path_prefix_invalid/,
  );
  assert.throws(
    () => queryUrlExplorer({ inventory, recrawlPlan, query: { page: { cursor: "%%%" } } }),
    /url_explorer_cursor_invalid/,
  );
  assert.throws(
    () => queryUrlExplorer({ inventory, recrawlPlan, query: { page: { cursor: "a".repeat(URL_EXPLORER_LIMITS.cursorBytes + 1) } } }),
    /url_explorer_cursor_invalid/,
  );
});
