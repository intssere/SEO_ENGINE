import assert from "node:assert/strict";
import test from "node:test";
import {
  DIAMOND_SHELF_CANONICAL_ORIGIN,
} from "./first-party-crawl-runtime-bridge.js";
import {
  DIAMOND_SHELF_SITE_ID,
  P12_2_DEFAULT_TRANSIENT_PAGE_BYTES,
} from "./first-party-live-adapters.js";
import {
  P12_2_EXECUTION_CONFIRMATION,
  P12_2_MAX_PAGE_CEILING,
  P12_2_OPERATION,
  defaultP12_2InspectionConfig,
  executeP12_2FullCrawl,
  inspectP12_2Manual,
  p12_2ManualCapability,
} from "./first-party-crawl-manual.js";

test("manual P12.2 inspection is side-effect free and default-off", () => {
  const config = defaultP12_2InspectionConfig();
  const inspection = inspectP12_2Manual(config);
  assert.equal(inspection.operation, P12_2_OPERATION);
  assert.equal(inspection.siteId, DIAMOND_SHELF_SITE_ID);
  assert.equal(inspection.canonicalOrigin, DIAMOND_SHELF_CANONICAL_ORIGIN);
  assert.equal(inspection.confirmationValid, false);
  assert.equal(inspection.networkReady, false);
  assert.equal(inspection.liveExecutionAuthorized, false);
  assert.equal(inspection.persistenceReady, false);
  assert.equal(inspection.persistenceAuthorized, false);
  assert.equal(inspection.executable, false);
  assert.equal(inspection.schedulerEnabled, false);
  assert.equal(inspection.autonomousWorkerEnabled, false);
  assert.equal(inspection.providerWrites, false);
  assert.equal(inspection.publicSiteWrites, false);
  assert.equal(inspection.deploymentAuthorized, false);
  assert.equal(inspection.publicationAuthorized, false);
  assert.equal(inspection.executed, false);
  assert.equal(config.limits.maxTransientPageBytes, P12_2_DEFAULT_TRANSIENT_PAGE_BYTES);
});

test("manual runtime requires exact confirmation and all four independent readiness gates", () => {
  const base = defaultP12_2InspectionConfig();
  const confirmed = {
    ...base,
    confirmation: P12_2_EXECUTION_CONFIRMATION,
  };
  assert.equal(inspectP12_2Manual(confirmed).executable, false);

  const three = {
    ...confirmed,
    networkReady: true,
    liveExecutionAuthorized: true,
    persistenceReady: true,
  };
  assert.equal(inspectP12_2Manual(three).executable, false);

  const all = {
    ...three,
    persistenceAuthorized: true,
  };
  assert.equal(inspectP12_2Manual(all).executable, true);
});

test("manual runtime is pinned to exact Diamond Shelf identity and explicit bounded limits", () => {
  const base = defaultP12_2InspectionConfig();
  assert.throws(
    () => inspectP12_2Manual({ ...base, siteId: "wrong" }),
    /p12_2_manual_site_id_mismatch/,
  );
  assert.throws(
    () => inspectP12_2Manual({ ...base, canonicalOrigin: "https://example.com" }),
    /p12_2_manual_origin_mismatch/,
  );
  assert.throws(
    () => inspectP12_2Manual({ ...base, rootSitemapUrl: "https://diamondshelf.us/sitemap.xml?x=1" }),
    /p12_2_manual_root_sitemap_invalid/,
  );
  assert.throws(
    () => inspectP12_2Manual({
      ...base,
      limits: { ...base.limits, hardPageLimit: P12_2_MAX_PAGE_CEILING + 1 },
    }),
    /p12_2_manual_hard_page_limit_invalid/,
  );
  assert.throws(
    () => inspectP12_2Manual({
      ...base,
      limits: {
        ...base.limits,
        executionPolicy: {
          ...base.limits.executionPolicy,
          batchSize: 2,
          concurrency: 3,
        },
      },
    }),
    /p12_2_manual_execution_shape_invalid/,
  );
});

test("full execution refuses before adapter/network/database activity while any authorization gate is closed", async () => {
  let fetchCalls = 0;
  const config = {
    ...defaultP12_2InspectionConfig(),
    confirmation: P12_2_EXECUTION_CONFIRMATION,
    networkReady: true,
    liveExecutionAuthorized: true,
    persistenceReady: true,
    persistenceAuthorized: false,
  };
  await assert.rejects(
    executeP12_2FullCrawl({
      config,
      dependencies: {
        databaseUrl: "postgres://must-not-be-used",
        liveAdapterOptions: {
          fetchImpl: async () => {
            fetchCalls += 1;
            throw new Error("must_not_fetch");
          },
        },
      },
      runId: "manual-gate-test",
      observedAt: "2026-09-22T00:00:00.000Z",
    }),
    /p12_2_manual_persistence_not_authorized/,
  );
  assert.equal(fetchCalls, 0);
});

test("manual capability advertises no scheduler, worker, provider, public-site, deployment or publication authority", () => {
  const capability = p12_2ManualCapability();
  assert.equal(capability.confirmationRequired, true);
  assert.equal(capability.exactConfirmation, P12_2_EXECUTION_CONFIRMATION);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.autonomousWorkerEnabled, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.deploymentAuthorized, false);
  assert.equal(capability.publicationAuthorized, false);
});
