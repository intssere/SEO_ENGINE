export const P10_7_IMPACT_WORKSPACE_VERSION = "p10.7-impact-workspace-v2" as const;

export type ImpactLayerKey =
  | "p10.1"
  | "p10.2"
  | "p10.3"
  | "p10.4"
  | "p10.5"
  | "p10.6";

export type ImpactArtifactLayer = {
  layer: ImpactLayerKey;
  label: string;
  version: string;
  reportId: string;
  reportFingerprint: string;
  parentReportFingerprint: string | null;
};

export type ImpactMetricDirection = "higher" | "lower" | "neutral";
export type ImpactOutcomeRelation =
  | "above_expected"
  | "equal_expected"
  | "below_expected"
  | null;
export type ImpactTrackingState =
  | "comparison_available"
  | "expected_unavailable"
  | "actual_unavailable";
export type ImpactCalibrationSignalKind =
  | "same_as_declared_direction"
  | "opposite_declared_direction"
  | "equal_expected"
  | "neutral_direction"
  | "unavailable";
export type ImpactCalibrationRole = "primary" | "secondary" | "diagnostic";

export type ImpactOutcomeRow = {
  expectationId: string;
  expectationFingerprint: string;
  metricKey: string;
  unit: string;
  metricDirection: ImpactMetricDirection;
  expectedValue: string | null;
  actualId: string;
  actualFingerprint: string;
  observedAt: string;
  actualValue: string | null;
  signedDifference: string | null;
  relation: ImpactOutcomeRelation;
  trackingState: ImpactTrackingState;
};

export type ImpactCalibrationRowInput = {
  signalId: string;
  signalFingerprint: string;
  calibrationKey: string;
  role: ImpactCalibrationRole;
  recommendationId: string;
  recommendationFingerprint: string;
  expectationId: string;
  expectationFingerprint: string;
  actualId: string;
  actualFingerprint: string;
  metricDirection: ImpactMetricDirection;
  relation: ImpactOutcomeRelation;
  kind: ImpactCalibrationSignalKind;
};

export type ImpactCalibrationRow = ImpactCalibrationRowInput & {
  metricKey: string;
  observedAt: string;
};

export type ImpactWorkspaceFixture = {
  version: "p10.7-synthetic-impact-fixture-v1";
  fixtureKind: "synthetic_read_only";
  siteLabel: string;
  domain: string;
  referenceTime: string;
  layers: ImpactArtifactLayer[];
  treatment: {
    actionId: string;
    recommendationId: string;
    recommendationFingerprint: string;
    anchorEventFingerprint: string;
    anchorAt: string;
    association: {
      pageId: string;
      url: string;
      query: string;
      category: string;
    };
  };
  windows: {
    before: { start: string; end: string };
    after: { start: string; end: string };
  };
  experiment: {
    assignmentBasis:
      | "externally_randomized"
      | "externally_matched"
      | "externally_selected"
      | "observational";
    holdoutCount: number;
    structuralFlagFingerprints: string[];
    treatmentConfounderCount: number;
  };
  outcomes: ImpactOutcomeRow[];
  calibrations: ImpactCalibrationRowInput[];
  diagnostics: string[];
  semantics: {
    chronologyIsCausality: false;
    associationIsCausality: false;
    windowMembershipIsCausalEffect: false;
    holdoutPresenceProvesCounterfactualValidity: false;
    expectedActualDifferenceIsImpact: false;
    calibrationSignalIsRecommendationQuality: false;
    calibrationSignalIsRewardOrPenalty: false;
    arithmeticRelationIsSuccessOrFailure: false;
    structuralFlagAbsenceCreatesConfidence: false;
  };
};

export type ImpactWorkspaceModel = {
  version: typeof P10_7_IMPACT_WORKSPACE_VERSION;
  fixtureKind: "synthetic_read_only";
  siteLabel: string;
  domain: string;
  referenceTime: string;
  modelFingerprint: string;
  layers: ImpactArtifactLayer[];
  treatment: ImpactWorkspaceFixture["treatment"];
  windows: ImpactWorkspaceFixture["windows"];
  experiment: ImpactWorkspaceFixture["experiment"];
  outcomes: ImpactOutcomeRow[];
  calibrations: ImpactCalibrationRow[];
  summary: {
    lineageLayers: number;
    holdouts: number;
    structuralFlags: number;
    treatmentConfounders: number;
    outcomes: number;
    comparisonsAvailable: number;
    comparisonsUnavailable: number;
    calibrationSignals: number;
    calibrationAvailable: number;
    calibrationUnavailable: number;
  };
  guardrails: string[];
  diagnostics: string[];
  safety: ReturnType<typeof impactWorkspaceCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const CANONICAL_DECIMAL = /^-?(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/;
const EXPECTED_LAYERS: ReadonlyArray<{
  layer: ImpactLayerKey;
  version: string;
}> = [
  { layer: "p10.1", version: "p10.1-unified-change-timeline-v1" },
  { layer: "p10.2", version: "p10.2-action-attribution-v1" },
  { layer: "p10.3", version: "p10.3-window-confounder-v1" },
  { layer: "p10.4", version: "p10.4-experiment-holdout-v1" },
  { layer: "p10.5", version: "p10.5-expected-actual-v1" },
  { layer: "p10.6", version: "p10.6-recommendation-calibration-v1" },
];

function exactString(value: string, code: string, maxLength = 2048): string {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > maxLength
    || value.trim() !== value
  ) {
    throw new Error(code);
  }
  return value;
}

function fingerprint(value: string, code: string): string {
  if (!HEX_64.test(value)) throw new Error(code);
  return value;
}

function canonicalTime(value: string, code: string): string {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(code);
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) throw new Error(code);
  return canonical;
}

function decimalOrNull(value: string | null, code: string): string | null {
  if (value === null) return null;
  if (!CANONICAL_DECIMAL.test(value) || value === "-0") throw new Error(code);
  return value;
}

function nonNegativeInteger(value: number, code: string): number {
  if (!Number.isInteger(value) || value < 0) throw new Error(code);
  return value;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableJson).join(",") + "]";
  }
  const record = value as Record<string, unknown>;
  return "{" + Object.keys(record)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => JSON.stringify(key) + ":" + stableJson(record[key]))
    .join(",") + "}";
}

function modelFingerprint(value: unknown): string {
  const input = stableJson(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function unique<T>(
  values: readonly T[],
  key: (value: T) => string,
  code: string,
): void {
  const seen = new Set<string>();
  for (const value of values) {
    const identity = key(value);
    if (seen.has(identity)) throw new Error(code);
    seen.add(identity);
  }
}

function validateSemantics(fixture: ImpactWorkspaceFixture): void {
  for (const [key, value] of Object.entries(fixture.semantics)) {
    if (value !== false) {
      throw new Error("impact_workspace_semantic_contradiction:" + key);
    }
  }
}

function validateLayers(layers: ImpactArtifactLayer[]): void {
  if (layers.length !== EXPECTED_LAYERS.length) {
    throw new Error("impact_workspace_layer_count_mismatch");
  }

  layers.forEach((layer, index) => {
    const expected = EXPECTED_LAYERS[index]!;
    if (layer.layer !== expected.layer || layer.version !== expected.version) {
      throw new Error("impact_workspace_layer_version_mismatch");
    }
    exactString(layer.label, "invalid_impact_layer_label", 128);
    exactString(layer.reportId, "invalid_impact_report_id", 512);
    fingerprint(layer.reportFingerprint, "invalid_impact_report_fingerprint");

    if (index === 0) {
      if (layer.parentReportFingerprint !== null) {
        throw new Error("impact_workspace_root_parent_must_be_null");
      }
    } else {
      const parent = layers[index - 1]!;
      if (layer.parentReportFingerprint !== parent.reportFingerprint) {
        throw new Error("impact_workspace_parent_fingerprint_mismatch");
      }
    }
  });

  unique(layers, (layer) => layer.reportId, "duplicate_impact_report_id");
  unique(
    layers,
    (layer) => layer.reportFingerprint,
    "duplicate_impact_report_fingerprint",
  );
}

function validateWindows(fixture: ImpactWorkspaceFixture): void {
  const anchor = canonicalTime(
    fixture.treatment.anchorAt,
    "invalid_impact_anchor_time",
  );
  const beforeStart = canonicalTime(
    fixture.windows.before.start,
    "invalid_impact_before_start",
  );
  const beforeEnd = canonicalTime(
    fixture.windows.before.end,
    "invalid_impact_before_end",
  );
  const afterStart = canonicalTime(
    fixture.windows.after.start,
    "invalid_impact_after_start",
  );
  const afterEnd = canonicalTime(
    fixture.windows.after.end,
    "invalid_impact_after_end",
  );

  if (!(beforeStart <= beforeEnd && beforeEnd < anchor)) {
    throw new Error("impact_workspace_before_window_invalid");
  }
  if (!(anchor < afterStart && afterStart <= afterEnd)) {
    throw new Error("impact_workspace_after_window_invalid");
  }
}

function validateOutcome(row: ImpactOutcomeRow): void {
  exactString(row.expectationId, "invalid_impact_expectation_id", 512);
  fingerprint(
    row.expectationFingerprint,
    "invalid_impact_expectation_fingerprint",
  );
  exactString(row.metricKey, "invalid_impact_metric_key", 128);
  exactString(row.unit, "invalid_impact_metric_unit", 128);
  exactString(row.actualId, "invalid_impact_actual_id", 512);
  fingerprint(row.actualFingerprint, "invalid_impact_actual_fingerprint");
  canonicalTime(row.observedAt, "invalid_impact_actual_time");
  decimalOrNull(row.expectedValue, "invalid_impact_expected_value");
  decimalOrNull(row.actualValue, "invalid_impact_actual_value");
  decimalOrNull(row.signedDifference, "invalid_impact_signed_difference");

  if (row.trackingState === "comparison_available") {
    if (
      row.expectedValue === null
      || row.actualValue === null
      || row.signedDifference === null
      || row.relation === null
    ) {
      throw new Error("impact_workspace_available_comparison_incomplete");
    }
    return;
  }

  if (row.signedDifference !== null || row.relation !== null) {
    throw new Error("impact_workspace_unavailable_comparison_must_remain_null");
  }
}

function validateFixture(fixture: ImpactWorkspaceFixture): void {
  if (fixture.version !== "p10.7-synthetic-impact-fixture-v1") {
    throw new Error("unsupported_impact_workspace_fixture_version");
  }
  if (fixture.fixtureKind !== "synthetic_read_only") {
    throw new Error("impact_workspace_fixture_must_be_synthetic_read_only");
  }

  exactString(fixture.siteLabel, "invalid_impact_site_label", 256);
  exactString(fixture.domain, "invalid_impact_domain", 253);
  canonicalTime(fixture.referenceTime, "invalid_impact_reference_time");
  validateSemantics(fixture);
  validateLayers(fixture.layers);

  exactString(fixture.treatment.actionId, "invalid_impact_action_id", 512);
  exactString(
    fixture.treatment.recommendationId,
    "invalid_impact_recommendation_id",
    512,
  );
  fingerprint(
    fixture.treatment.recommendationFingerprint,
    "invalid_impact_recommendation_fingerprint",
  );
  fingerprint(
    fixture.treatment.anchorEventFingerprint,
    "invalid_impact_anchor_fingerprint",
  );

  const association = fixture.treatment.association;
  exactString(association.pageId, "invalid_impact_page_id", 512);
  exactString(association.url, "invalid_impact_url", 2048);
  exactString(association.query, "invalid_impact_query", 2048);
  exactString(association.category, "invalid_impact_category", 256);

  validateWindows(fixture);

  nonNegativeInteger(
    fixture.experiment.holdoutCount,
    "invalid_impact_holdout_count",
  );
  nonNegativeInteger(
    fixture.experiment.treatmentConfounderCount,
    "invalid_impact_confounder_count",
  );
  unique(
    fixture.experiment.structuralFlagFingerprints,
    (value) => fingerprint(value, "invalid_impact_structural_flag_fingerprint"),
    "duplicate_impact_structural_flag",
  );

  unique(
    fixture.outcomes,
    (row) => row.actualId,
    "duplicate_impact_actual_id",
  );
  unique(
    fixture.outcomes,
    (row) => row.actualFingerprint,
    "duplicate_impact_actual_fingerprint",
  );
  for (const row of fixture.outcomes) validateOutcome(row);

  unique(
    fixture.calibrations,
    (row) => row.signalId,
    "duplicate_impact_signal_id",
  );
  unique(
    fixture.calibrations,
    (row) => row.signalFingerprint,
    "duplicate_impact_signal_fingerprint",
  );

  const outcomesByFingerprint = new Map(
    fixture.outcomes.map((row) => [row.actualFingerprint, row]),
  );

  for (const row of fixture.calibrations) {
    exactString(row.signalId, "invalid_impact_signal_id", 512);
    fingerprint(row.signalFingerprint, "invalid_impact_signal_fingerprint");
    exactString(row.calibrationKey, "invalid_impact_calibration_key", 128);
    exactString(row.actualId, "invalid_impact_signal_actual_id", 512);
    fingerprint(row.actualFingerprint, "invalid_impact_signal_actual_fingerprint");
    fingerprint(
      row.expectationFingerprint,
      "invalid_impact_signal_expectation_fingerprint",
    );
    fingerprint(
      row.recommendationFingerprint,
      "invalid_impact_signal_recommendation_fingerprint",
    );

    if (
      row.recommendationId !== fixture.treatment.recommendationId
      || row.recommendationFingerprint
        !== fixture.treatment.recommendationFingerprint
    ) {
      throw new Error("impact_workspace_signal_recommendation_mismatch");
    }

    const outcome = outcomesByFingerprint.get(row.actualFingerprint);
    if (!outcome) throw new Error("impact_workspace_signal_actual_not_found");
    if (
      row.actualId !== outcome.actualId
      || row.expectationId !== outcome.expectationId
      || row.expectationFingerprint !== outcome.expectationFingerprint
      || row.metricDirection !== outcome.metricDirection
      || row.relation !== outcome.relation
    ) {
      throw new Error("impact_workspace_signal_outcome_mismatch");
    }
  }
}

export function impactWorkspaceCapability() {
  return Object.freeze({
    version: P10_7_IMPACT_WORKSPACE_VERSION,
    syntheticFixtureOnly: true,
    readOnly: true,
    runtimeApiBindingAuthorized: false,
    liveOutcomeLoadingAuthorized: false,
    providerNetworkReadAuthorized: false,
    providerCredentialUseAuthorized: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    productionDbReadAuthorized: false,
    productionDbWriteAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
    recommendationMutationAuthorized: false,
    modelTrainingAuthorized: false,
    modelWeightUpdateAuthorized: false,
    recommendationRankingMutationAuthorized: false,
    policyMutationAuthorized: false,
    task51ExecutionAuthorized: false,
    task53ExecutionAuthorized: false,
    task54ExecutionAuthorized: false,
    autonomousMutationAuthorized: false,
    p98ImplementationAuthorized: false,
    schedulerEnabled: false,
    workerEnabled: false,
    publicationAuthorized: false,
  });
}

export function buildImpactWorkspaceModel(
  fixture: ImpactWorkspaceFixture,
): ImpactWorkspaceModel {
  validateFixture(fixture);

  const layers = structuredClone(fixture.layers);
  const outcomes = structuredClone(fixture.outcomes).sort(
    (left, right) =>
      left.observedAt.localeCompare(right.observedAt)
      || left.actualFingerprint.localeCompare(right.actualFingerprint),
  );
  const outcomesByFingerprint = new Map(
    outcomes.map((row) => [row.actualFingerprint, row]),
  );
  const calibrations = structuredClone(fixture.calibrations)
    .map((row): ImpactCalibrationRow => {
      const outcome = outcomesByFingerprint.get(row.actualFingerprint);
      if (!outcome) throw new Error("impact_workspace_signal_actual_not_found");
      return {
        ...row,
        metricKey: outcome.metricKey,
        observedAt: outcome.observedAt,
      };
    })
    .sort(
      (left, right) =>
        left.observedAt.localeCompare(right.observedAt)
        || left.signalFingerprint.localeCompare(right.signalFingerprint),
    );

  const summary = {
    lineageLayers: layers.length,
    holdouts: fixture.experiment.holdoutCount,
    structuralFlags: fixture.experiment.structuralFlagFingerprints.length,
    treatmentConfounders: fixture.experiment.treatmentConfounderCount,
    outcomes: outcomes.length,
    comparisonsAvailable: outcomes.filter(
      (row) => row.trackingState === "comparison_available",
    ).length,
    comparisonsUnavailable: outcomes.filter(
      (row) => row.trackingState !== "comparison_available",
    ).length,
    calibrationSignals: calibrations.length,
    calibrationAvailable: calibrations.filter(
      (row) => row.kind !== "unavailable",
    ).length,
    calibrationUnavailable: calibrations.filter(
      (row) => row.kind === "unavailable",
    ).length,
  };

  const normalized = {
    version: P10_7_IMPACT_WORKSPACE_VERSION,
    fixtureKind: fixture.fixtureKind,
    siteLabel: fixture.siteLabel,
    domain: fixture.domain,
    referenceTime: fixture.referenceTime,
    layers,
    treatment: structuredClone(fixture.treatment),
    windows: structuredClone(fixture.windows),
    experiment: structuredClone(fixture.experiment),
    outcomes,
    calibrations,
    summary,
    diagnostics: [...fixture.diagnostics].sort((a, b) => a.localeCompare(b)),
  };

  return {
    ...normalized,
    modelFingerprint: modelFingerprint(normalized),
    guardrails: [
      "Chronology and event order do not establish causality.",
      "Direct page, query, and category association is lineage only—not impact attribution.",
      "Before/after membership and confounder flags are descriptive evidence, not causal adjustment.",
      "A holdout definition or assignment-basis label does not prove a valid counterfactual.",
      "Expected-vs-actual signed differences are arithmetic only and are not percentage uplift or causal effect.",
      "Directional calibration signals are not recommendation quality, reward, penalty, success, failure, or ranking weight.",
      "No row in this workspace authorizes rollout, retain, rollback, execution, provider writes, model updates, or policy changes.",
    ],
    safety: impactWorkspaceCapability(),
  };
}

function fixtureFingerprint(value: number): string {
  return value.toString(16).padStart(64, "0");
}

export const P10_7_SYNTHETIC_IMPACT_FIXTURE: ImpactWorkspaceFixture = {
  version: "p10.7-synthetic-impact-fixture-v1",
  fixtureKind: "synthetic_read_only",
  siteLabel: "Diamond Shelf · synthetic P10 projection",
  domain: "diamondshelf.us",
  referenceTime: "2026-09-20T18:00:00.000Z",
  layers: [
    {
      layer: "p10.1",
      label: "Chronology",
      version: "p10.1-unified-change-timeline-v1",
      reportId: "p101-report-synthetic",
      reportFingerprint: fixtureFingerprint(101),
      parentReportFingerprint: null,
    },
    {
      layer: "p10.2",
      label: "Direct association",
      version: "p10.2-action-attribution-v1",
      reportId: "p102-report-synthetic",
      reportFingerprint: fixtureFingerprint(102),
      parentReportFingerprint: fixtureFingerprint(101),
    },
    {
      layer: "p10.3",
      label: "Windows & confounders",
      version: "p10.3-window-confounder-v1",
      reportId: "p103-report-synthetic",
      reportFingerprint: fixtureFingerprint(103),
      parentReportFingerprint: fixtureFingerprint(102),
    },
    {
      layer: "p10.4",
      label: "Experiment / holdout",
      version: "p10.4-experiment-holdout-v1",
      reportId: "p104-report-synthetic",
      reportFingerprint: fixtureFingerprint(104),
      parentReportFingerprint: fixtureFingerprint(103),
    },
    {
      layer: "p10.5",
      label: "Expected vs actual",
      version: "p10.5-expected-actual-v1",
      reportId: "p105-report-synthetic",
      reportFingerprint: fixtureFingerprint(105),
      parentReportFingerprint: fixtureFingerprint(104),
    },
    {
      layer: "p10.6",
      label: "Directional calibration",
      version: "p10.6-recommendation-calibration-v1",
      reportId: "p106-report-synthetic",
      reportFingerprint: fixtureFingerprint(106),
      parentReportFingerprint: fixtureFingerprint(105),
    },
  ],
  treatment: {
    actionId: "action-treatment",
    recommendationId: "recommendation-1",
    recommendationFingerprint: fixtureFingerprint(201),
    anchorEventFingerprint: fixtureFingerprint(202),
    anchorAt: "2026-09-20T11:00:00.000Z",
    association: {
      pageId: "product-synthetic-1",
      url: "https://diamondshelf.us/products/synthetic-fragrance",
      query: "synthetic fragrance",
      category: "fragrance",
    },
  },
  windows: {
    before: {
      start: "2026-09-20T09:00:00.000Z",
      end: "2026-09-20T10:59:59.999Z",
    },
    after: {
      start: "2026-09-20T11:00:00.001Z",
      end: "2026-09-20T14:00:00.000Z",
    },
  },
  experiment: {
    assignmentBasis: "observational",
    holdoutCount: 1,
    structuralFlagFingerprints: [fixtureFingerprint(301)],
    treatmentConfounderCount: 1,
  },
  outcomes: [
    {
      expectationId: "expectation-clicks",
      expectationFingerprint: fixtureFingerprint(401),
      metricKey: "gsc_clicks",
      unit: "clicks",
      metricDirection: "higher",
      expectedValue: "10",
      actualId: "actual-clicks",
      actualFingerprint: fixtureFingerprint(501),
      observedAt: "2026-09-20T12:00:00.000Z",
      actualValue: "12",
      signedDifference: "2",
      relation: "above_expected",
      trackingState: "comparison_available",
    },
    {
      expectationId: "expectation-position",
      expectationFingerprint: fixtureFingerprint(402),
      metricKey: "gsc_average_position",
      unit: "position",
      metricDirection: "lower",
      expectedValue: "12",
      actualId: "actual-position",
      actualFingerprint: fixtureFingerprint(502),
      observedAt: "2026-09-20T12:30:00.000Z",
      actualValue: "10",
      signedDifference: "-2",
      relation: "below_expected",
      trackingState: "comparison_available",
    },
    {
      expectationId: "expectation-impressions",
      expectationFingerprint: fixtureFingerprint(403),
      metricKey: "gsc_impressions",
      unit: "impressions",
      metricDirection: "higher",
      expectedValue: "100",
      actualId: "actual-impressions",
      actualFingerprint: fixtureFingerprint(503),
      observedAt: "2026-09-20T13:00:00.000Z",
      actualValue: "90",
      signedDifference: "-10",
      relation: "below_expected",
      trackingState: "comparison_available",
    },
    {
      expectationId: "expectation-ctr",
      expectationFingerprint: fixtureFingerprint(404),
      metricKey: "gsc_ctr",
      unit: "ratio",
      metricDirection: "higher",
      expectedValue: null,
      actualId: "actual-ctr",
      actualFingerprint: fixtureFingerprint(504),
      observedAt: "2026-09-20T13:30:00.000Z",
      actualValue: "0.03",
      signedDifference: null,
      relation: null,
      trackingState: "expected_unavailable",
    },
  ],
  calibrations: [
    {
      signalId: "signal-clicks",
      signalFingerprint: fixtureFingerprint(601),
      calibrationKey: "calibration-clicks",
      role: "primary",
      recommendationId: "recommendation-1",
      recommendationFingerprint: fixtureFingerprint(201),
      expectationId: "expectation-clicks",
      expectationFingerprint: fixtureFingerprint(401),
      actualId: "actual-clicks",
      actualFingerprint: fixtureFingerprint(501),
      metricDirection: "higher",
      relation: "above_expected",
      kind: "same_as_declared_direction",
    },
    {
      signalId: "signal-position",
      signalFingerprint: fixtureFingerprint(602),
      calibrationKey: "calibration-position",
      role: "secondary",
      recommendationId: "recommendation-1",
      recommendationFingerprint: fixtureFingerprint(201),
      expectationId: "expectation-position",
      expectationFingerprint: fixtureFingerprint(402),
      actualId: "actual-position",
      actualFingerprint: fixtureFingerprint(502),
      metricDirection: "lower",
      relation: "below_expected",
      kind: "same_as_declared_direction",
    },
    {
      signalId: "signal-impressions",
      signalFingerprint: fixtureFingerprint(603),
      calibrationKey: "calibration-impressions",
      role: "diagnostic",
      recommendationId: "recommendation-1",
      recommendationFingerprint: fixtureFingerprint(201),
      expectationId: "expectation-impressions",
      expectationFingerprint: fixtureFingerprint(403),
      actualId: "actual-impressions",
      actualFingerprint: fixtureFingerprint(503),
      metricDirection: "higher",
      relation: "below_expected",
      kind: "opposite_declared_direction",
    },
    {
      signalId: "signal-ctr",
      signalFingerprint: fixtureFingerprint(604),
      calibrationKey: "calibration-ctr",
      role: "diagnostic",
      recommendationId: "recommendation-1",
      recommendationFingerprint: fixtureFingerprint(201),
      expectationId: "expectation-ctr",
      expectationFingerprint: fixtureFingerprint(404),
      actualId: "actual-ctr",
      actualFingerprint: fixtureFingerprint(504),
      metricDirection: "higher",
      relation: null,
      kind: "unavailable",
    },
  ],
  diagnostics: [
    "Synthetic presentation fixture only; no live P10 report loader is attached.",
    "One structural flag and one treatment confounder are retained as context only.",
    "Assignment basis is observational and is not verified randomization or matching.",
    "P10.5 arithmetic and P10.6 directional signals remain independent descriptive records.",
  ],
  semantics: {
    chronologyIsCausality: false,
    associationIsCausality: false,
    windowMembershipIsCausalEffect: false,
    holdoutPresenceProvesCounterfactualValidity: false,
    expectedActualDifferenceIsImpact: false,
    calibrationSignalIsRecommendationQuality: false,
    calibrationSignalIsRewardOrPenalty: false,
    arithmeticRelationIsSuccessOrFailure: false,
    structuralFlagAbsenceCreatesConfidence: false,
  },
};
