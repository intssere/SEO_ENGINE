import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const sourceUrl = new URL("./js-rendered-backend-evaluation.ts", import.meta.url);
const libDir = new URL("./", import.meta.url);

test("UGP-3.4 evaluation has no renderer, network, database or runtime activation binding", async () => {
  const source = await readFile(sourceUrl, "utf8");
  for (const forbidden of [
    'from "@playwright/test',
    'from "playwright',
    'from "playwright-core',
    'from "crawlee',
    'import("playwright',
    'import("crawlee',
    "chromium.launch",
    "page.goto(",
    "browser.newPage(",
    'from "node:dns',
    'from "node:http',
    'from "node:https',
    'from "node:net',
    'from "undici',
    'from "postgres',
    'from "drizzle',
    "process.env",
    "fetch(",
    "DATABASE_URL",
    "PUBLIC_SITE_WRITES_ENABLED",
    "P8_8_STAGE_0",
    "createSecureCompetitorFetch",
    "createFirstPartyPageTransport",
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      "UGP-3.4 evaluation must not contain runtime binding: " + forbidden,
    );
  }
});

test("UGP-3.4 pure evaluation is not imported by non-test API runtime source", async () => {
  const entries = await readdir(libDir, { withFileTypes: true });
  const offenders: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    if (
      entry.name === "js-rendered-backend-evaluation.ts"
      || entry.name.endsWith(".test.ts")
    ) continue;
    const source = await readFile(join(libDir.pathname, entry.name), "utf8");
    if (source.includes("js-rendered-backend-evaluation")) offenders.push(entry.name);
  }
  assert.deepEqual(offenders, []);
});

test("UGP-3.4 source preserves static-fetch default and closed renderer authority", async () => {
  const source = await readFile(sourceUrl, "utf8");
  assert.match(source, /disposition: "default"/);
  assert.match(source, /staticFetchRemainsDefault: true/);
  assert.match(source, /frameworkHeuristicAloneAccepted: false/);
  assert.match(source, /productionEligible: false/);
  assert.match(source, /browserExecutionAuthorized: false/);
  assert.match(source, /networkReadAuthorized: false/);
  assert.match(source, /crawlExecutionAuthorized: false/);
  assert.match(source, /persistenceAuthorized: false/);
  assert.match(source, /rendererRuntimeBindingAuthorized: false/);
  assert.match(source, /newQueueAuthorized: false/);
  assert.match(source, /providerWrites: false/);
  assert.match(source, /publicSiteWrites: false/);
});

test("UGP-3.4 source encodes mandatory future browser safety controls", async () => {
  const source = await readFile(sourceUrl, "utf8");
  for (const expected of [
    'serviceWorkers: "block"',
    "requestInterceptionBeforeNavigation: true",
    'downloads: "deny"',
    'permissions: "deny"',
    'browserEgressPublicAddressValidation: "required_per_request"',
    'dnsRebindingMitigation: "must_be_equivalent_to_existing_secure_transport"',
    'connectionAddressPinningOrEquivalentIsolation: "required"',
    'topLevelNavigationScope: "same_origin_only"',
    'nonGetHeadRequests: "abort"',
    'crossOriginSubresources: "deny_until_browser_egress_certified"',
    'redirectRevalidation: "required_each_hop"',
    "newRequestQueue: false",
    "crawleeStoragePlane: false",
    "adaptiveAutoscaling: false",
    "existingCheckpointAuthoritative: true",
    "existingRetryPolicyAuthoritative: true",
    "existingRateLimitAuthoritative: true",
    "responseBodyPersistence: false",
    "screenshotPersistence: false",
    "browserStoragePersistence: false",
  ]) {
    assert.equal(source.includes(expected), true, "missing UGP-3.4 control: " + expected);
  }
});

test("UGP-3.4 source evaluates Crawlee without selecting it as a crawl execution plane", async () => {
  const source = await readFile(sourceUrl, "utf8");
  assert.match(source, /not_selected_as_execution_plane/);
  assert.match(source, /would_duplicate_existing_request_queue_ownership/);
  assert.match(source, /would_duplicate_existing_checkpoint_and_retry_state/);
  assert.match(source, /would_introduce_crawlee_storage_plane/);
  assert.match(source, /autoscaled_concurrency_conflicts_with_existing_crawl_policy_ownership/);
  assert.match(source, /direct_playwright_is_lower_level_if_a_renderer_is_later_certified/);
  assert.match(source, /blocked_pending_renderer_safety_certification/);
});
