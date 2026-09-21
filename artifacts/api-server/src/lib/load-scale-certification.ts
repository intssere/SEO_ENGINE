import { createHash } from "node:crypto";

export const P11_10_LOAD_SCALE_VERSION = "p11.10-load-scale-v1" as const;

export const P11_10_LOAD_SCALE_TARGETS = Object.freeze({
  urlsPerSite: 25_000,
  querySignalsPerSite: 100_000,
  maxMaterializedOpportunityCandidates: 25_000,
  crawlBatchSize: 250,
  expectedCrawlBatches: 100,
  urlExplorerPageSize: 500,
  readSchedulesPerProjection: 100,
  providerKeywordRequestMax: 50,
} as const);

export const P11_10_LOAD_SCALE_BUDGETS = Object.freeze({
  maxScenarioElapsedMs: 20_000,
  maxCombinedElapsedMs: 45_000,
  maxHeapUsedBytes: 768 * 1024 * 1024,
} as const);

export type P1110Scenario =
  | "sitemap_inventory"
  | "crawl_execution_plan"
  | "url_explorer"
  | "opportunity_engine"
  | "read_scheduler";

export type P1110ScaleObservation = {
  scenario: P1110Scenario;
  inputRows: number;
  outputRows: number;
  elapsedMs: number;
  heapUsedBytes: number | null;
  correctnessFingerprint: string;
};

export type P1110ScenarioResult = P1110ScaleObservation & {
  passed: boolean;
  blockers: string[];
};

export type P1110LoadScaleCertification = {
  version: typeof P11_10_LOAD_SCALE_VERSION;
  certifiedSynthetic: boolean;
  targets: typeof P11_10_LOAD_SCALE_TARGETS;
  budgets: typeof P11_10_LOAD_SCALE_BUDGETS;
  scenarios: P1110ScenarioResult[];
  combinedElapsedMs: number;
  certificationFingerprint: string;
  safety: ReturnType<typeof loadScaleCapability>;
};

const REQUIRED_SCENARIOS: readonly P1110Scenario[] = Object.freeze([
  "sitemap_inventory",
  "crawl_execution_plan",
  "url_explorer",
  "opportunity_engine",
  "read_scheduler",
]);

const HEX_64 = /^[0-9a-f]{64}$/;

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const record = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(record)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => JSON.stringify(key) + ":" + stableJson(record[key]))
      .join(",") +
    "}"
  );
}

export function loadScaleFingerprint(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function finiteNonNegative(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error("invalid_" + field);
  }
  return value;
}

function integerNonNegative(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error("invalid_" + field);
  }
  return value as number;
}

function expectedCounts(scenario: P1110Scenario): {
  inputRows: number;
  outputRows: number;
  outputMode: "exact" | "maximum";
} {
  switch (scenario) {
    case "sitemap_inventory":
      return {
        inputRows: P11_10_LOAD_SCALE_TARGETS.urlsPerSite,
        outputRows: P11_10_LOAD_SCALE_TARGETS.urlsPerSite,
        outputMode: "exact",
      };
    case "crawl_execution_plan":
      return {
        inputRows: P11_10_LOAD_SCALE_TARGETS.urlsPerSite,
        outputRows: P11_10_LOAD_SCALE_TARGETS.expectedCrawlBatches,
        outputMode: "exact",
      };
    case "url_explorer":
      return {
        inputRows: P11_10_LOAD_SCALE_TARGETS.urlsPerSite,
        outputRows: P11_10_LOAD_SCALE_TARGETS.urlExplorerPageSize,
        outputMode: "exact",
      };
    case "opportunity_engine":
      return {
        inputRows: P11_10_LOAD_SCALE_TARGETS.querySignalsPerSite,
        outputRows:
          P11_10_LOAD_SCALE_TARGETS.maxMaterializedOpportunityCandidates,
        outputMode: "maximum",
      };
    case "read_scheduler":
      return {
        inputRows: P11_10_LOAD_SCALE_TARGETS.readSchedulesPerProjection,
        outputRows: P11_10_LOAD_SCALE_TARGETS.readSchedulesPerProjection,
        outputMode: "exact",
      };
  }
}

function normalizeObservation(
  observation: P1110ScaleObservation,
): P1110ScaleObservation {
  if (!REQUIRED_SCENARIOS.includes(observation.scenario)) {
    throw new Error("unsupported_scale_scenario");
  }
  const inputRows = integerNonNegative(
    observation.inputRows,
    observation.scenario + "_input_rows",
  );
  const outputRows = integerNonNegative(
    observation.outputRows,
    observation.scenario + "_output_rows",
  );
  const elapsedMs = finiteNonNegative(
    observation.elapsedMs,
    observation.scenario + "_elapsed_ms",
  );
  const heapUsedBytes =
    observation.heapUsedBytes === null
      ? null
      : integerNonNegative(
          observation.heapUsedBytes,
          observation.scenario + "_heap_used_bytes",
        );
  if (!HEX_64.test(observation.correctnessFingerprint)) {
    throw new Error("invalid_scale_correctness_fingerprint");
  }

  return {
    scenario: observation.scenario,
    inputRows,
    outputRows,
    elapsedMs: Number(elapsedMs.toFixed(3)),
    heapUsedBytes,
    correctnessFingerprint: observation.correctnessFingerprint,
  };
}

function evaluateObservation(
  observation: P1110ScaleObservation,
): P1110ScenarioResult {
  const expected = expectedCounts(observation.scenario);
  const blockers: string[] = [];

  if (observation.inputRows !== expected.inputRows) {
    blockers.push("target_input_volume_not_reached");
  }
  if (
    expected.outputMode === "exact" &&
    observation.outputRows !== expected.outputRows
  ) {
    blockers.push("expected_output_count_mismatch");
  }
  if (
    expected.outputMode === "maximum" &&
    observation.outputRows > expected.outputRows
  ) {
    blockers.push("materialized_output_ceiling_exceeded");
  }
  if (
    observation.elapsedMs >
    P11_10_LOAD_SCALE_BUDGETS.maxScenarioElapsedMs
  ) {
    blockers.push("scenario_elapsed_budget_exceeded");
  }
  if (
    observation.heapUsedBytes !== null &&
    observation.heapUsedBytes > P11_10_LOAD_SCALE_BUDGETS.maxHeapUsedBytes
  ) {
    blockers.push("heap_budget_exceeded");
  }

  return {
    ...observation,
    passed: blockers.length === 0,
    blockers,
  };
}

export function certifyLoadScale(
  observations: readonly P1110ScaleObservation[],
): P1110LoadScaleCertification {
  if (!Array.isArray(observations) || observations.length !== REQUIRED_SCENARIOS.length) {
    throw new Error("scale_scenario_count_mismatch");
  }

  const normalized = observations.map(normalizeObservation);
  const byScenario = new Map<P1110Scenario, P1110ScaleObservation>();
  for (const observation of normalized) {
    if (byScenario.has(observation.scenario)) {
      throw new Error("duplicate_scale_scenario");
    }
    byScenario.set(observation.scenario, observation);
  }
  for (const scenario of REQUIRED_SCENARIOS) {
    if (!byScenario.has(scenario)) {
      throw new Error("missing_scale_scenario");
    }
  }

  const scenarios = REQUIRED_SCENARIOS.map((scenario) =>
    evaluateObservation(byScenario.get(scenario)!),
  );
  const combinedElapsedMs = Number(
    scenarios
      .reduce((sum, scenario) => sum + scenario.elapsedMs, 0)
      .toFixed(3),
  );
  const combinedBudgetPassed =
    combinedElapsedMs <= P11_10_LOAD_SCALE_BUDGETS.maxCombinedElapsedMs;
  if (!combinedBudgetPassed) {
    scenarios[scenarios.length - 1]!.blockers.push(
      "combined_elapsed_budget_exceeded",
    );
    scenarios[scenarios.length - 1]!.passed = false;
  }

  const deterministicIdentity = {
    version: P11_10_LOAD_SCALE_VERSION,
    targets: P11_10_LOAD_SCALE_TARGETS,
    budgets: P11_10_LOAD_SCALE_BUDGETS,
    scenarios: scenarios.map((scenario) => ({
      scenario: scenario.scenario,
      inputRows: scenario.inputRows,
      outputRows: scenario.outputRows,
      correctnessFingerprint: scenario.correctnessFingerprint,
      blockers: [...scenario.blockers],
    })),
    safety: loadScaleCapability(),
  };

  return {
    version: P11_10_LOAD_SCALE_VERSION,
    certifiedSynthetic: scenarios.every((scenario) => scenario.passed),
    targets: P11_10_LOAD_SCALE_TARGETS,
    budgets: P11_10_LOAD_SCALE_BUDGETS,
    scenarios,
    combinedElapsedMs,
    certificationFingerprint: loadScaleFingerprint(deterministicIdentity),
    safety: loadScaleCapability(),
  };
}

export function loadScaleCapability() {
  return Object.freeze({
    version: P11_10_LOAD_SCALE_VERSION,
    syntheticLocalOnly: true as const,
    benchmarkRealPureFunctionsOnly: true as const,
    productionLoadAuthorized: false as const,
    publicSiteCrawlAuthorized: false as const,
    providerLoadAuthorized: false as const,
    providerRequestAuthorized: false as const,
    productionDatabaseBenchmarkAuthorized: false as const,
    databaseReadsAuthorized: false as const,
    databaseWritesAuthorized: false as const,
    ddlAuthorized: false as const,
    dmlAuthorized: false as const,
    retentionDeleteAuthorized: false as const,
    schedulerActivationAuthorized: false as const,
    workerActivationAuthorized: false as const,
    task51ExecutionAuthorized: false as const,
    task53ExecutionAuthorized: false as const,
    task54ExecutionAuthorized: false as const,
    autonomousMutationAuthorized: false as const,
    p98ImplementationAuthorized: false as const,
    runtimeConfigMutationAuthorized: false as const,
    secretMutationAuthorized: false as const,
    deploymentAuthorized: false as const,
    publicationAuthorized: false as const,
  });
}
