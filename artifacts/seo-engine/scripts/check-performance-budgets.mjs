import {
  collectBuildAssets,
  evaluateBuildAssets,
  loadPerformanceBudgets,
} from "../performance/performance-budget.mjs";

const budgets = await loadPerformanceBudgets();
const assets = await collectBuildAssets(
  new URL("../dist/public/", import.meta.url),
);
const report = evaluateBuildAssets(assets, budgets);

for (const asset of report.assets) {
  console.log(
    `P11_1_ASSET ${asset.kind} ${asset.path} raw=${asset.rawBytes} gzip=${asset.gzipBytes}`,
  );
}

for (const [kind, total] of Object.entries(report.totals)) {
  console.log(
    `P11_1_TOTAL ${kind} count=${total.assetCount} raw=${total.rawBytes} gzip=${total.gzipBytes}`,
  );
}

if (!report.pass) {
  for (const violation of report.violations) {
    console.error(`P11_1_BUDGET_VIOLATION ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log("P11_1_BUDGET_PASS");
}
