import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

export const PERFORMANCE_PROFILE_VERSION = "p11.1.v1";

const PROFILE_TIME_METRICS = Object.freeze([
  "domContentLoadedMs",
  "loadEventMs",
  "firstContentfulPaintMs",
  "mainContentReadyMs",
]);

const SUPPORTED_ASSET_KINDS = Object.freeze(["js", "css"]);

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}:expected_object`);
  }
}

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label}:expected_positive_integer`);
  }
}

function assertNonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label}:expected_non_negative_integer`);
  }
}

function assertFiniteNonNegative(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label}:expected_finite_non_negative_number`);
  }
}

function quantize(value) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function validateAssetBudget(value, kind) {
  assertPlainObject(value, `buildAssets.${kind}`);
  assertPositiveInteger(value.minAssetCount, `buildAssets.${kind}.minAssetCount`);
  for (const key of [
    "maxAssetRawBytes",
    "maxAssetGzipBytes",
    "maxTotalRawBytes",
    "maxTotalGzipBytes",
  ]) {
    assertPositiveInteger(value[key], `buildAssets.${kind}.${key}`);
  }
}

export function validatePerformanceBudgets(value) {
  assertPlainObject(value, "performanceBudgets");
  if (value.version !== PERFORMANCE_PROFILE_VERSION) {
    throw new Error(
      `performanceBudgets.version:expected_${PERFORMANCE_PROFILE_VERSION}`,
    );
  }

  assertPlainObject(value.buildAssets, "buildAssets");
  for (const kind of SUPPORTED_ASSET_KINDS) {
    validateAssetBudget(value.buildAssets[kind], kind);
  }

  assertPlainObject(value.syntheticProfile, "syntheticProfile");
  const ratio = value.syntheticProfile.maxRegressionRatio;
  if (typeof ratio !== "number" || !Number.isFinite(ratio) || ratio <= 1) {
    throw new Error(
      "syntheticProfile.maxRegressionRatio:expected_finite_number_gt_1",
    );
  }
  assertFiniteNonNegative(
    value.syntheticProfile.noiseFloorMs,
    "syntheticProfile.noiseFloorMs",
  );

  const metrics = value.syntheticProfile.regressionMetrics;
  if (!Array.isArray(metrics) || metrics.length === 0) {
    throw new Error("syntheticProfile.regressionMetrics:expected_non_empty_array");
  }

  const seen = new Set();
  for (const metric of metrics) {
    if (!PROFILE_TIME_METRICS.includes(metric)) {
      throw new Error(
        `syntheticProfile.regressionMetrics:unsupported_metric:${metric}`,
      );
    }
    if (seen.has(metric)) {
      throw new Error(
        `syntheticProfile.regressionMetrics:duplicate_metric:${metric}`,
      );
    }
    seen.add(metric);
  }

  return value;
}

export async function loadPerformanceBudgets(
  source = new URL("../performance-budgets.json", import.meta.url),
) {
  const raw = await readFile(source, "utf8");
  return validatePerformanceBudgets(JSON.parse(raw));
}

function rootPath(root) {
  return root instanceof URL ? fileURLToPath(root) : path.resolve(root);
}

async function walk(directory, base, rows) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute, base, rows);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase().slice(1);
    if (!SUPPORTED_ASSET_KINDS.includes(extension)) {
      continue;
    }

    const bytes = await readFile(absolute);
    rows.push({
      path: path.relative(base, absolute).split(path.sep).join("/"),
      kind: extension,
      rawBytes: bytes.byteLength,
      gzipBytes: gzipSync(bytes, { level: 9 }).byteLength,
    });
  }
}

export async function collectBuildAssets(root) {
  const base = rootPath(root);
  const rows = [];
  await walk(base, base, rows);
  return rows;
}

function validateMeasuredAsset(asset, index) {
  assertPlainObject(asset, `assets[${index}]`);
  if (
    typeof asset.path !== "string" ||
    asset.path.length === 0 ||
    asset.path.startsWith("/") ||
    asset.path.includes("\\")
  ) {
    throw new Error(`assets[${index}].path:expected_relative_posix_path`);
  }
  if (!SUPPORTED_ASSET_KINDS.includes(asset.kind)) {
    throw new Error(`assets[${index}].kind:unsupported`);
  }
  assertNonNegativeInteger(asset.rawBytes, `assets[${index}].rawBytes`);
  assertNonNegativeInteger(asset.gzipBytes, `assets[${index}].gzipBytes`);
}

export function evaluateBuildAssets(assets, budgets) {
  validatePerformanceBudgets(budgets);
  if (!Array.isArray(assets)) {
    throw new Error("assets:expected_array");
  }

  const normalizedAssets = assets
    .map((asset, index) => {
      validateMeasuredAsset(asset, index);
      return { ...asset };
    })
    .sort((left, right) => left.path.localeCompare(right.path));

  const violations = [];
  const totals = {};

  for (const kind of SUPPORTED_ASSET_KINDS) {
    const policy = budgets.buildAssets[kind];
    const matching = normalizedAssets.filter((asset) => asset.kind === kind);
    const rawBytes = matching.reduce((sum, asset) => sum + asset.rawBytes, 0);
    const gzipBytes = matching.reduce((sum, asset) => sum + asset.gzipBytes, 0);

    totals[kind] = {
      assetCount: matching.length,
      rawBytes,
      gzipBytes,
    };

    if (matching.length < policy.minAssetCount) {
      violations.push(
        `${kind}:asset_count:${matching.length}<${policy.minAssetCount}`,
      );
    }

    for (const asset of matching) {
      if (asset.rawBytes > policy.maxAssetRawBytes) {
        violations.push(
          `${kind}:asset_raw:${asset.path}:${asset.rawBytes}>${policy.maxAssetRawBytes}`,
        );
      }
      if (asset.gzipBytes > policy.maxAssetGzipBytes) {
        violations.push(
          `${kind}:asset_gzip:${asset.path}:${asset.gzipBytes}>${policy.maxAssetGzipBytes}`,
        );
      }
    }

    if (rawBytes > policy.maxTotalRawBytes) {
      violations.push(
        `${kind}:total_raw:${rawBytes}>${policy.maxTotalRawBytes}`,
      );
    }
    if (gzipBytes > policy.maxTotalGzipBytes) {
      violations.push(
        `${kind}:total_gzip:${gzipBytes}>${policy.maxTotalGzipBytes}`,
      );
    }
  }

  return {
    version: PERFORMANCE_PROFILE_VERSION,
    assets: normalizedAssets,
    totals,
    violations,
    pass: violations.length === 0,
  };
}

function normalizeOptionalTimeMetric(value, label) {
  if (value === null) {
    return null;
  }
  assertFiniteNonNegative(value, label);
  return quantize(value);
}

export function normalizeSyntheticProfile(value) {
  assertPlainObject(value, "profile");
  if (value.version !== PERFORMANCE_PROFILE_VERSION) {
    throw new Error(`profile.version:expected_${PERFORMANCE_PROFILE_VERSION}`);
  }
  if (value.source !== "synthetic_local") {
    throw new Error("profile.source:expected_synthetic_local");
  }
  if (
    typeof value.route !== "string" ||
    value.route.length === 0 ||
    !value.route.startsWith("/")
  ) {
    throw new Error("profile.route:expected_absolute_app_path");
  }

  assertPlainObject(value.metrics, "profile.metrics");

  const metrics = {};
  for (const metric of PROFILE_TIME_METRICS) {
    metrics[metric] = normalizeOptionalTimeMetric(
      value.metrics[metric] ?? null,
      `profile.metrics.${metric}`,
    );
  }

  const resourceCount = value.metrics.resourceCount ?? null;
  if (resourceCount !== null) {
    assertNonNegativeInteger(resourceCount, "profile.metrics.resourceCount");
  }
  metrics.resourceCount = resourceCount;

  return {
    version: PERFORMANCE_PROFILE_VERSION,
    source: "synthetic_local",
    route: value.route,
    metrics,
  };
}

export function compareSyntheticProfiles(baselineInput, candidateInput, budgets) {
  validatePerformanceBudgets(budgets);
  const baseline = normalizeSyntheticProfile(baselineInput);
  const candidate = normalizeSyntheticProfile(candidateInput);

  if (baseline.route !== candidate.route) {
    throw new Error(
      `profile.route_mismatch:${baseline.route}!=${candidate.route}`,
    );
  }

  const comparisons = budgets.syntheticProfile.regressionMetrics.map((metric) => {
    const baselineValue = baseline.metrics[metric];
    const candidateValue = candidate.metrics[metric];

    if (baselineValue === null || candidateValue === null) {
      return {
        metric,
        baseline: baselineValue,
        candidate: candidateValue,
        deltaMs: null,
        ratio: null,
        allowedMaxMs: null,
        state: "unavailable",
      };
    }

    const ratio =
      baselineValue === 0
        ? candidateValue === 0
          ? 1
          : null
        : quantize(candidateValue / baselineValue);
    const allowedMaxMs = quantize(
      Math.max(
        baselineValue * budgets.syntheticProfile.maxRegressionRatio,
        baselineValue + budgets.syntheticProfile.noiseFloorMs,
      ),
    );
    const deltaMs = quantize(candidateValue - baselineValue);

    return {
      metric,
      baseline: baselineValue,
      candidate: candidateValue,
      deltaMs,
      ratio,
      allowedMaxMs,
      state: candidateValue > allowedMaxMs ? "regression" : "within_budget",
    };
  });

  return {
    version: PERFORMANCE_PROFILE_VERSION,
    route: baseline.route,
    policy: {
      maxRegressionRatio: budgets.syntheticProfile.maxRegressionRatio,
      noiseFloorMs: budgets.syntheticProfile.noiseFloorMs,
    },
    comparisons,
    regressions: comparisons
      .filter((comparison) => comparison.state === "regression")
      .map((comparison) => comparison.metric),
    pass: comparisons.every((comparison) => comparison.state !== "regression"),
  };
}
