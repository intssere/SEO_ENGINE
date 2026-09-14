import assert from "node:assert/strict";
import test from "node:test";
import {
  BASELINE_CRAWL_POLICY,
  CRAWL_COMPLETION_LEDGER_FIELDS,
  planFirstPartyCrawl,
  type CrawlControllerRequest,
} from "./crawl-controller.js";

const firstPartyTarget = {
  targetClass: "first_party" as const,
  siteId: "diamond-shelf",
  canonicalOrigin: "https://DiamondShelf.us/catalog?ignored=1#fragment",
};

test("baseline remains the existing immutable 30-page depth-2 policy", () => {
  const plan = planFirstPartyCrawl({ mode: "baseline", target: firstPartyTarget });

  assert.equal(BASELINE_CRAWL_POLICY.pageHardLimit, 30);
  assert.equal(BASELINE_CRAWL_POLICY.depthLimit, 2);
  assert.equal(plan.mode, "baseline");
  assert.equal(plan.target.canonicalOrigin, "https://diamondshelf.us");
  assert.deepEqual(plan.limits, {
    pageHardLimit: 30,
    absolutePageCeiling: 30,
    depth: 2,
    unlimited: false,
  });
  assert.equal(plan.inventory.strategy, "bounded_link_bfs");
  assert.equal(plan.controls.concurrencyLimit, "sequential");
  assert.deepEqual(plan.controls.allowedMethods, ["GET"]);
  assert.equal(plan.authorization.controllerExecutionEnabled, false);
});

test("baseline cannot be widened or customized through the controller", () => {
  assert.throws(
    () => planFirstPartyCrawl({ mode: "baseline", target: firstPartyTarget, hardPageLimit: 31 }),
    /crawl_baseline_limits_are_fixed/,
  );
  assert.throws(
    () => planFirstPartyCrawl({ mode: "baseline", target: firstPartyTarget, hardPageLimit: 30 }),
    /crawl_baseline_limits_are_fixed/,
  );
});

test("full-site planning requires a finite explicit hard fuse under an independent absolute ceiling", () => {
  assert.throws(
    () => planFirstPartyCrawl({ mode: "full_site", target: firstPartyTarget, hardPageLimit: 1_000 }),
    /crawl_full_site_policy_required/,
  );
  assert.throws(
    () => planFirstPartyCrawl({ mode: "full_site", target: firstPartyTarget }, { absolutePageCeiling: 2_000 }),
    /crawl_full_site_hard_page_limit_required/,
  );
  assert.throws(
    () => planFirstPartyCrawl({ mode: "full_site", target: firstPartyTarget, hardPageLimit: 2_001 }, { absolutePageCeiling: 2_000 }),
    /crawl_full_site_hard_page_limit_exceeds_ceiling/,
  );

  for (const invalid of [Infinity, Number.NaN, 0, -1, 1.5]) {
    assert.throws(
      () => planFirstPartyCrawl({ mode: "full_site", target: firstPartyTarget, hardPageLimit: invalid }, { absolutePageCeiling: 2_000 }),
      /crawl_full_site_hard_page_limit_invalid/,
    );
    assert.throws(
      () => planFirstPartyCrawl({ mode: "full_site", target: firstPartyTarget, hardPageLimit: 100 }, { absolutePageCeiling: invalid }),
      /crawl_full_site_absolute_ceiling_invalid/,
    );
  }
});

test("full-site plan is sitemap-first, finite, ledger-bound, and non-executable", () => {
  const plan = planFirstPartyCrawl(
    { mode: "full_site", target: firstPartyTarget, hardPageLimit: 1_200 },
    { absolutePageCeiling: 2_000 },
  );

  assert.equal(plan.mode, "full_site");
  assert.deepEqual(plan.limits, {
    pageHardLimit: 1_200,
    absolutePageCeiling: 2_000,
    depth: "inventory_driven",
    unlimited: false,
  });
  assert.ok(Number.isFinite(plan.limits.pageHardLimit));
  assert.ok(plan.limits.pageHardLimit <= plan.limits.absolutePageCeiling);
  assert.deepEqual(plan.inventory, {
    strategy: "sitemap_first",
    sitemapDiscoveryRequired: true,
    internalLinkSupplement: true,
  });
  assert.equal(plan.controls.sameOriginOnly, true);
  assert.deepEqual(plan.controls.allowedMethods, ["GET"]);
  assert.equal(plan.controls.robotsEnforcement, "required");
  assert.equal(plan.controls.canonicalDeduplication, "required_before_execution");
  assert.equal(plan.controls.queryTrapControls, "required_before_execution");
  assert.equal(plan.controls.boundedBatching, "required_before_execution");
  assert.equal(plan.controls.concurrencyLimit, "required_before_execution");
  assert.equal(plan.controls.perOriginRateLimit, "required_before_execution");
  assert.equal(plan.controls.checkpointResume, "required_before_execution");
  assert.equal(plan.completionLedger.required, true);
  assert.deepEqual(plan.completionLedger.fields, CRAWL_COMPLETION_LEDGER_FIELDS);
  assert.deepEqual(plan.authorization, {
    controllerExecutionEnabled: false,
    persistenceAuthorized: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    competitorCollectionAuthorized: false,
    competitorPersistenceAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
  });
});

test("competitor and external targets cannot enter the first-party controller", () => {
  const competitor: CrawlControllerRequest = {
    mode: "full_site",
    target: {
      targetClass: "competitor",
      targetId: "competitor-1",
      canonicalOrigin: "https://competitor.example",
    },
    hardPageLimit: 100,
  };
  const external: CrawlControllerRequest = {
    mode: "baseline",
    target: {
      targetClass: "external",
      targetId: "external-1",
      canonicalOrigin: "https://example.org",
    },
  };

  assert.throws(() => planFirstPartyCrawl(competitor, { absolutePageCeiling: 500 }), /crawl_full_site_first_party_only/);
  assert.throws(() => planFirstPartyCrawl(external), /crawl_full_site_first_party_only/);
});

test("first-party identity and canonical origin fail closed", () => {
  assert.throws(
    () => planFirstPartyCrawl({ mode: "baseline", target: { ...firstPartyTarget, siteId: "  " } }),
    /crawl_site_id_required/,
  );
  assert.throws(
    () => planFirstPartyCrawl({ mode: "baseline", target: { ...firstPartyTarget, canonicalOrigin: "http://diamondshelf.us" } }),
    /crawl_origin_must_be_https/,
  );
  assert.throws(
    () => planFirstPartyCrawl({ mode: "baseline", target: { ...firstPartyTarget, canonicalOrigin: "not-a-url" } }),
    /crawl_origin_invalid/,
  );
});
