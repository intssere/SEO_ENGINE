import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  PERFORMANCE_PROFILE_VERSION,
  collectBuildAssets,
  compareSyntheticProfiles,
  evaluateBuildAssets,
  loadPerformanceBudgets,
  normalizeSyntheticProfile,
  validatePerformanceBudgets,
} from "../performance/performance-budget.mjs";

const budgets = await loadPerformanceBudgets();

function profile(route, metrics) {
  return {
    version: PERFORMANCE_PROFILE_VERSION,
    source: "synthetic_local",
    route,
    metrics,
  };
}

test("P11.1 budget config is explicit and current", () => {
  assert.equal(budgets.version, PERFORMANCE_PROFILE_VERSION);
  assert.equal(budgets.buildAssets.js.maxAssetRawBytes, 622000);
  assert.equal(budgets.buildAssets.js.maxAssetGzipBytes, 180000);
  assert.equal(budgets.buildAssets.js.maxTotalRawBytes, 640000);
  assert.equal(budgets.buildAssets.js.maxTotalGzipBytes, 185000);
  assert.equal(budgets.buildAssets.css.maxAssetRawBytes, 191000);
  assert.equal(budgets.buildAssets.css.maxAssetGzipBytes, 33000);
  assert.equal(budgets.buildAssets.css.maxTotalRawBytes, 191000);
  assert.equal(budgets.syntheticProfile.maxRegressionRatio, 1.25);
  assert.equal(budgets.syntheticProfile.noiseFloorMs, 100);
});

test("build asset evaluator passes a bounded supplied fixture", () => {
  const report = evaluateBuildAssets(
    [
      {
        path: "assets/index.js",
        kind: "js",
        rawBytes: 589405,
        gzipBytes: 169949,
      },
      {
        path: "assets/index.css",
        kind: "css",
        rawBytes: 179974,
        gzipBytes: 30188,
      },
    ],
    budgets,
  );

  assert.equal(report.pass, true);
  assert.deepEqual(report.violations, []);
  assert.equal(report.totals.js.rawBytes, 589405);
  assert.equal(report.totals.css.gzipBytes, 30188);
});

test("build asset evaluator fails closed on a raw or gzip regression", () => {
  const report = evaluateBuildAssets(
    [
      {
        path: "assets/index.js",
        kind: "js",
        rawBytes: 640001,
        gzipBytes: 185001,
      },
      {
        path: "assets/index.css",
        kind: "css",
        rawBytes: 179974,
        gzipBytes: 30188,
      },
    ],
    budgets,
  );

  assert.equal(report.pass, false);
  assert.deepEqual(report.violations, [
    "js:asset_raw:assets/index.js:640001>622000",
    "js:asset_gzip:assets/index.js:185001>180000",
    "js:total_raw:640001>640000",
    "js:total_gzip:185001>185000",
  ]);
});

test("build asset evaluator fails when a required asset class disappears", () => {
  const report = evaluateBuildAssets(
    [
      {
        path: "assets/index.js",
        kind: "js",
        rawBytes: 1,
        gzipBytes: 1,
      },
    ],
    budgets,
  );

  assert.equal(report.pass, false);
  assert.deepEqual(report.violations, ["css:asset_count:0<1"]);
});

test("build scanner is recursive, sorted, and measures raw/gzip bytes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "seo-engine-p11-1-"));
  await mkdir(path.join(root, "assets", "nested"), { recursive: true });
  await writeFile(path.join(root, "assets", "z.css"), "body{color:black}");
  await writeFile(path.join(root, "assets", "nested", "a.js"), "export const a=1;");
  await writeFile(path.join(root, "ignored.txt"), "ignored");

  const assets = await collectBuildAssets(root);

  assert.deepEqual(
    assets.map((asset) => [asset.path, asset.kind]),
    [
      ["assets/nested/a.js", "js"],
      ["assets/z.css", "css"],
    ],
  );
  assert.ok(assets.every((asset) => asset.rawBytes > 0));
  assert.ok(assets.every((asset) => asset.gzipBytes > 0));
});

test("profile normalization preserves unavailable metrics instead of inventing zero", () => {
  const normalized = normalizeSyntheticProfile(
    profile("/impact", {
      domContentLoadedMs: 100.12349,
      loadEventMs: null,
      firstContentfulPaintMs: null,
      mainContentReadyMs: 140.98765,
      resourceCount: 12,
    }),
  );

  assert.deepEqual(normalized.metrics, {
    domContentLoadedMs: 100.123,
    loadEventMs: null,
    firstContentfulPaintMs: null,
    mainContentReadyMs: 140.988,
    resourceCount: 12,
  });
});

test("profile comparison requires both relative and noise-floor regression bounds to be exceeded", () => {
  const baseline = profile("/", {
    domContentLoadedMs: 1000,
    loadEventMs: 1000,
    firstContentfulPaintMs: 1000,
    mainContentReadyMs: 1000,
    resourceCount: 10,
  });
  const candidate = profile("/", {
    domContentLoadedMs: 1260,
    loadEventMs: 1100,
    firstContentfulPaintMs: 1250,
    mainContentReadyMs: 1300,
    resourceCount: 11,
  });

  const report = compareSyntheticProfiles(baseline, candidate, budgets);

  assert.equal(report.pass, false);
  assert.deepEqual(report.regressions, [
    "domContentLoadedMs",
    "mainContentReadyMs",
  ]);
  assert.equal(
    report.comparisons.find(
      (row) => row.metric === "firstContentfulPaintMs",
    ).state,
    "within_budget",
  );
});

test("profile comparison keeps missing baseline/candidate metrics unavailable", () => {
  const report = compareSyntheticProfiles(
    profile("/connections", {
      domContentLoadedMs: null,
      loadEventMs: 100,
      firstContentfulPaintMs: null,
      mainContentReadyMs: 100,
      resourceCount: 1,
    }),
    profile("/connections", {
      domContentLoadedMs: 5000,
      loadEventMs: 100,
      firstContentfulPaintMs: null,
      mainContentReadyMs: 100,
      resourceCount: 1,
    }),
    budgets,
  );

  const dom = report.comparisons.find(
    (row) => row.metric === "domContentLoadedMs",
  );
  assert.equal(dom.state, "unavailable");
  assert.equal(dom.allowedMaxMs, null);
  assert.equal(report.pass, true);
});

test("malformed budgets and profiles fail closed", () => {
  assert.throws(
    () =>
      validatePerformanceBudgets({
        ...budgets,
        version: "future",
      }),
    /performanceBudgets\.version/,
  );
  assert.throws(
    () =>
      normalizeSyntheticProfile(
        profile("/", {
          domContentLoadedMs: -1,
          loadEventMs: 1,
          firstContentfulPaintMs: 1,
          mainContentReadyMs: 1,
          resourceCount: 1,
        }),
      ),
    /expected_finite_non_negative_number/,
  );
  assert.throws(
    () =>
      compareSyntheticProfiles(
        profile("/a", {
          domContentLoadedMs: 1,
          loadEventMs: 1,
          firstContentfulPaintMs: 1,
          mainContentReadyMs: 1,
          resourceCount: 1,
        }),
        profile("/b", {
          domContentLoadedMs: 1,
          loadEventMs: 1,
          firstContentfulPaintMs: 1,
          mainContentReadyMs: 1,
          resourceCount: 1,
        }),
        budgets,
      ),
    /profile\.route_mismatch/,
  );
});
