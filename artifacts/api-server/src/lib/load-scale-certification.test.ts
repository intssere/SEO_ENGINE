import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  P11_10_LOAD_SCALE_BUDGETS,
  P11_10_LOAD_SCALE_TARGETS,
  certifyLoadScale,
  loadScaleCapability,
  loadScaleFingerprint,
  type P1110ScaleObservation,
} from "./load-scale-certification.js";

function observation(
  scenario: P1110ScaleObservation["scenario"],
  inputRows: number,
  outputRows: number,
  seed: string,
): P1110ScaleObservation {
  return {
    scenario,
    inputRows,
    outputRows,
    elapsedMs: 1,
    heapUsedBytes: 16 * 1024 * 1024,
    correctnessFingerprint: loadScaleFingerprint(seed),
  };
}

function passingObservations(): P1110ScaleObservation[] {
  return [
    observation(
      "sitemap_inventory",
      P11_10_LOAD_SCALE_TARGETS.urlsPerSite,
      P11_10_LOAD_SCALE_TARGETS.urlsPerSite,
      "inventory",
    ),
    observation(
      "crawl_execution_plan",
      P11_10_LOAD_SCALE_TARGETS.urlsPerSite,
      P11_10_LOAD_SCALE_TARGETS.expectedCrawlBatches,
      "crawl-plan",
    ),
    observation(
      "url_explorer",
      P11_10_LOAD_SCALE_TARGETS.urlsPerSite,
      P11_10_LOAD_SCALE_TARGETS.urlExplorerPageSize,
      "explorer",
    ),
    observation(
      "opportunity_engine",
      P11_10_LOAD_SCALE_TARGETS.querySignalsPerSite,
      P11_10_LOAD_SCALE_TARGETS.maxMaterializedOpportunityCandidates,
      "opportunities",
    ),
    observation(
      "read_scheduler",
      P11_10_LOAD_SCALE_TARGETS.readSchedulesPerProjection,
      P11_10_LOAD_SCALE_TARGETS.readSchedulesPerProjection,
      "scheduler",
    ),
  ];
}

test("P11.10 target envelope preserves existing architecture ceilings", () => {
  assert.deepEqual(P11_10_LOAD_SCALE_TARGETS, {
    urlsPerSite: 25_000,
    querySignalsPerSite: 100_000,
    maxMaterializedOpportunityCandidates: 25_000,
    crawlBatchSize: 250,
    expectedCrawlBatches: 100,
    urlExplorerPageSize: 500,
    readSchedulesPerProjection: 100,
    providerKeywordRequestMax: 50,
  });
  assert.equal(
    P11_10_LOAD_SCALE_TARGETS.urlsPerSite /
      P11_10_LOAD_SCALE_TARGETS.crawlBatchSize,
    P11_10_LOAD_SCALE_TARGETS.expectedCrawlBatches,
  );
});

test("P11.10 synthetic certification passes exact target counts", () => {
  const report = certifyLoadScale(passingObservations());
  assert.equal(report.certifiedSynthetic, true);
  assert.equal(report.scenarios.length, 5);
  assert.equal(report.scenarios.every((scenario) => scenario.passed), true);
  assert.match(report.certificationFingerprint, /^[0-9a-f]{64}$/);
});

test("P11.10 certification fingerprint ignores noisy timing and heap measurements", () => {
  const first = passingObservations();
  const second = passingObservations().map((item, index) => ({
    ...item,
    elapsedMs: 10 + index,
    heapUsedBytes: (32 + index) * 1024 * 1024,
  }));

  assert.equal(
    certifyLoadScale(first).certificationFingerprint,
    certifyLoadScale(second).certificationFingerprint,
  );
});

test("P11.10 fails closed when target volume is missed or output expands beyond its ceiling", () => {
  const missed = passingObservations();
  missed[0] = { ...missed[0]!, inputRows: 24_999 };
  const missedReport = certifyLoadScale(missed);
  assert.equal(missedReport.certifiedSynthetic, false);
  assert.deepEqual(missedReport.scenarios[0]!.blockers, [
    "target_input_volume_not_reached",
  ]);

  const expanded = passingObservations();
  expanded[3] = {
    ...expanded[3]!,
    outputRows:
      P11_10_LOAD_SCALE_TARGETS.maxMaterializedOpportunityCandidates + 1,
  };
  const expandedReport = certifyLoadScale(expanded);
  assert.equal(expandedReport.certifiedSynthetic, false);
  assert.ok(
    expandedReport.scenarios[3]!.blockers.includes(
      "materialized_output_ceiling_exceeded",
    ),
  );
});

test("P11.10 catches catastrophic timing and heap regressions without pretending to be an SLA", () => {
  const slow = passingObservations();
  slow[1] = {
    ...slow[1]!,
    elapsedMs: P11_10_LOAD_SCALE_BUDGETS.maxScenarioElapsedMs + 1,
  };
  const slowReport = certifyLoadScale(slow);
  assert.equal(slowReport.certifiedSynthetic, false);
  assert.ok(
    slowReport.scenarios[1]!.blockers.includes(
      "scenario_elapsed_budget_exceeded",
    ),
  );

  const large = passingObservations();
  large[2] = {
    ...large[2]!,
    heapUsedBytes: P11_10_LOAD_SCALE_BUDGETS.maxHeapUsedBytes + 1,
  };
  const largeReport = certifyLoadScale(large);
  assert.equal(largeReport.certifiedSynthetic, false);
  assert.ok(
    largeReport.scenarios[2]!.blockers.includes("heap_budget_exceeded"),
  );
});

test("P11.10 requires every scale scenario exactly once", () => {
  assert.throws(
    () => certifyLoadScale(passingObservations().slice(0, 4)),
    /scale_scenario_count_mismatch/,
  );

  const duplicate = passingObservations();
  duplicate[4] = { ...duplicate[0]! };
  assert.throws(
    () => certifyLoadScale(duplicate),
    /duplicate_scale_scenario/,
  );
});

test("P11.10 grants no production, provider, database, execution or publication authority", () => {
  assert.deepEqual(loadScaleCapability(), {
    version: "p11.10-load-scale-v1",
    syntheticLocalOnly: true,
    benchmarkRealPureFunctionsOnly: true,
    productionLoadAuthorized: false,
    publicSiteCrawlAuthorized: false,
    providerLoadAuthorized: false,
    providerRequestAuthorized: false,
    productionDatabaseBenchmarkAuthorized: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    ddlAuthorized: false,
    dmlAuthorized: false,
    retentionDeleteAuthorized: false,
    schedulerActivationAuthorized: false,
    workerActivationAuthorized: false,
    task51ExecutionAuthorized: false,
    task53ExecutionAuthorized: false,
    task54ExecutionAuthorized: false,
    autonomousMutationAuthorized: false,
    p98ImplementationAuthorized: false,
    runtimeConfigMutationAuthorized: false,
    secretMutationAuthorized: false,
    deploymentAuthorized: false,
    publicationAuthorized: false,
  });
});

test("P11.10 dedicated scale gate is wired into canonical CI and does not contain network/database clients", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const packageJson = JSON.parse(
    readFileSync(join(here, "../../package.json"), "utf8"),
  );
  const workflow = readFileSync(
    join(here, "../../../../.github/workflows/ci.yml"),
    "utf8",
  );
  const profile = readFileSync(join(here, "load-scale-profile.ts"), "utf8");

  assert.equal(
    packageJson.scripts["test:scale"],
    "tsx src/lib/load-scale-profile.ts",
  );
  assert.match(workflow, /Test P11\.10 synthetic load scale/);
  assert.match(
    workflow,
    /pnpm --filter @workspace\/api-server test:scale/,
  );

  assert.doesNotMatch(profile, /\bfetch\s*\(/);
  assert.doesNotMatch(profile, /\bpostgres\b/);
  assert.doesNotMatch(profile, /DATABASE_URL/);
  assert.doesNotMatch(profile, /child_process/);
  assert.doesNotMatch(profile, /execSync|spawnSync|spawn\s*\(/);
});
