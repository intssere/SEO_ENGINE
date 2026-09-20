import { createHash } from "node:crypto";
import type { ActionAttribution } from "./action-attribution.js";
import type { P103Scope } from "./action-window-confounder.js";
import {
  EXPERIMENT_HOLDOUT_VERSION,
  buildExperimentHoldoutReport,
  type ExperimentHoldoutInput,
  type ExperimentHoldoutReport,
  type P104SourceIdentity,
} from "./experiment-holdout.js";

export const EXPECTED_ACTUAL_OUTCOME_VERSION = "p10.5-expected-actual-v1" as const;
export const EXPECTED_ACTUAL_MAX_METRICS = 512 as const;
export const EXPECTED_ACTUAL_MAX_EXPECTATIONS = 4096 as const;
export const EXPECTED_ACTUAL_MAX_ACTUALS = 16384 as const;
export const EXPECTED_ACTUAL_MAX_DECIMAL_DIGITS = 40 as const;
export const EXPECTED_ACTUAL_MAX_DECIMAL_SCALE = 12 as const;

export type P105MetricDirection = "higher" | "lower" | "neutral";
export type P105ComparisonRelation =
  | "above_expected"
  | "equal_expected"
  | "below_expected";
export type P105TrackingState =
  | "comparison_available"
  | "expected_unavailable"
  | "actual_unavailable";

export type P105MetricDefinitionInput = {
  metricKey: string;
  unit: string;
  direction: P105MetricDirection;
  source: P104SourceIdentity;
};

export type P105OutcomeTarget =
  | {
      kind: "treatment";
      actionId: string;
    }
  | {
      kind: "holdout";
      unitId: string;
    };

export type P105ExpectedOutcomeInput = {
  expectationId: string;
  metricKey: string;
  target: P105OutcomeTarget;
  scope: P103Scope;
  window: "after";
  expectedValue: string | null;
  source: P104SourceIdentity;
};

export type P105ActualOutcomeInput = {
  expectationId: string;
  metricKey: string;
  target: P105OutcomeTarget;
  scope: P103Scope;
  observedAt: string;
  actualValue: string | null;
  source: P104SourceIdentity;
};

export type P105MetricDefinition = P105MetricDefinitionInput & {
  metricFingerprint: string;
};

export type P105ActualComparison = {
  actualId: string;
  actualFingerprint: string;
  observedAt: string;
  actualValue: string | null;
  source: P104SourceIdentity;
  state: P105TrackingState;
  signedDifference: string | null;
  relation: P105ComparisonRelation | null;
};

export type P105ExpectationTrack = {
  expectationId: string;
  expectationFingerprint: string;
  metricKey: string;
  unit: string;
  direction: P105MetricDirection;
  target: P105OutcomeTarget;
  scope: P103Scope;
  window: "after";
  expectedValue: string | null;
  source: P104SourceIdentity;
  state: P105TrackingState;
  actualCount: number;
  comparisonAvailableCount: number;
  actualUnavailableCount: number;
  actuals: P105ActualComparison[];
};

export type ExpectedActualOutcomeInput = {
  experimentInput: ExperimentHoldoutInput;
  experimentReport: ExperimentHoldoutReport;
  metricDefinitions: P105MetricDefinitionInput[];
  expectations: P105ExpectedOutcomeInput[];
  actuals: P105ActualOutcomeInput[];
};

export type ExpectedActualOutcomeReport = {
  version: typeof EXPECTED_ACTUAL_OUTCOME_VERSION;
  reportId: string;
  reportFingerprint: string;
  experimentReportId: string;
  experimentReportFingerprint: string;
  timelineId: string;
  timelineFingerprint: string;
  treatmentActionId: string;
  afterWindow: {
    start: string;
    end: string;
  };
  metricDefinitions: {
    total: number;
    values: P105MetricDefinition[];
  };
  expectations: {
    total: number;
    comparisonAvailable: number;
    expectedUnavailable: number;
    actualUnavailable: number;
    values: P105ExpectationTrack[];
  };
  upstreamContext: {
    p104StructuralFlagCount: number;
    p104StructuralFlagFingerprints: string[];
    p103TreatmentConfounderCount: number;
  };
  semantics: ReturnType<typeof expectedActualSemantics>;
  safety: ReturnType<typeof expectedActualCapability>;
};

type ParsedDecimal = {
  integer: bigint;
  scale: number;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const KEY = /^[a-z0-9][a-z0-9._:-]{0,127}$/;
const SOURCE_VERSION = /^[A-Za-z0-9][A-Za-z0-9._:+\/-]{0,127}$/;
const CANONICAL_DECIMAL = /^-?(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/;

function canonicalJson(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined";
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

function hash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function exactString(value: unknown, errorCode: string, maxLength = 512): string {
  if (
    typeof value !== "string"
    || value.length < 1
    || value.length > maxLength
    || value.trim() !== value
  ) {
    throw new Error(errorCode);
  }
  return value;
}

function normalizeKey(value: unknown, errorCode: string): string {
  const exact = exactString(value, errorCode, 128);
  if (!KEY.test(exact)) throw new Error(errorCode);
  return exact;
}

function normalizeSource(source: P104SourceIdentity): P104SourceIdentity {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("invalid_p10_5_source");
  }
  const version = exactString(source.version, "invalid_p10_5_source_version", 128);
  if (!SOURCE_VERSION.test(version)) throw new Error("invalid_p10_5_source_version");
  if (typeof source.eventFingerprint !== "string" || !HEX_64.test(source.eventFingerprint)) {
    throw new Error("invalid_p10_5_source_event_fingerprint");
  }
  return {
    system: normalizeKey(source.system, "invalid_p10_5_source_system"),
    version,
    eventId: exactString(source.eventId, "invalid_p10_5_source_event_id", 512),
    eventFingerprint: source.eventFingerprint,
  };
}

function sourceKey(source: P104SourceIdentity): string {
  return `${source.system}\u0000${source.version}\u0000${source.eventId}`;
}

function canonicalTimestamp(value: unknown, errorCode: string): string {
  if (typeof value !== "string") throw new Error(errorCode);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(errorCode);
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) throw new Error(errorCode);
  return canonical;
}

function nullableExactString(
  value: unknown,
  errorCode: string,
  maxLength = 512,
): string | null {
  if (value === null) return null;
  return exactString(value, errorCode, maxLength);
}

function normalizeDomain(value: unknown): string | null {
  if (value === null) return null;
  const domain = exactString(value, "invalid_p10_5_scope_domain", 253);
  if (domain !== domain.toLowerCase() || !/^[a-z0-9.-]+$/.test(domain)) {
    throw new Error("invalid_p10_5_scope_domain");
  }
  return domain;
}

function normalizeUrl(value: unknown): string | null {
  if (value === null) return null;
  const url = exactString(value, "invalid_p10_5_scope_url", 2048);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("invalid_p10_5_scope_url");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("invalid_p10_5_scope_url");
  }
  return url;
}

function normalizeScope(scope: P103Scope, prefix: string): P103Scope {
  if (!scope || typeof scope !== "object" || Array.isArray(scope)) {
    throw new Error(`invalid_${prefix}_scope`);
  }
  return {
    siteId: nullableExactString(scope.siteId, `invalid_${prefix}_site_id`),
    domain: normalizeDomain(scope.domain),
    pageId: nullableExactString(scope.pageId, `invalid_${prefix}_page_id`),
    url: normalizeUrl(scope.url),
    query: nullableExactString(scope.query, `invalid_${prefix}_query`, 2048),
    category: nullableExactString(scope.category, `invalid_${prefix}_category`, 256),
  };
}

function hasEntityScope(scope: P103Scope): boolean {
  return scope.pageId !== null
    || scope.url !== null
    || scope.query !== null
    || scope.category !== null;
}

function normalizeTarget(
  target: P105OutcomeTarget,
  experiment: ExperimentHoldoutReport,
): P105OutcomeTarget {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new Error("invalid_p10_5_target");
  }
  if (target.kind === "treatment") {
    const actionId = exactString(target.actionId, "invalid_p10_5_treatment_action_id");
    if (actionId !== experiment.treatment.actionId) {
      throw new Error("p10_5_treatment_action_mismatch");
    }
    return {
      kind: "treatment",
      actionId,
    };
  }
  if (target.kind === "holdout") {
    const unitId = normalizeKey(target.unitId, "invalid_p10_5_holdout_unit_id");
    if (!experiment.holdouts.values.some((unit) => unit.unitId === unitId)) {
      throw new Error("p10_5_holdout_unit_not_found");
    }
    return {
      kind: "holdout",
      unitId,
    };
  }
  throw new Error("invalid_p10_5_target_kind");
}

function actionScopeMatches(action: ActionAttribution, scope: P103Scope): boolean {
  if (!hasEntityScope(scope)) return false;
  if (scope.siteId !== null && action.site.siteId !== scope.siteId) return false;
  if (scope.domain !== null && action.site.domain !== scope.domain) return false;

  if (scope.pageId !== null || scope.url !== null) {
    if (action.pages.status !== "direct") return false;
    const match = action.pages.values.some((page) =>
      (scope.pageId === null || page.pageId === scope.pageId)
      && (scope.url === null || page.url === scope.url)
    );
    if (!match) return false;
  }

  if (
    scope.query !== null
    && (
      action.queries.status !== "direct"
      || !action.queries.values.some((query) => query.value === scope.query)
    )
  ) {
    return false;
  }

  if (
    scope.category !== null
    && (
      action.categories.status !== "direct"
      || !action.categories.values.some((category) => category.value === scope.category)
    )
  ) {
    return false;
  }
  return true;
}

function validateTargetScope(
  target: P105OutcomeTarget,
  scope: P103Scope,
  input: ExperimentHoldoutInput,
  experiment: ExperimentHoldoutReport,
): void {
  if (target.kind === "treatment") {
    const action = input.attribution.actions.find(
      (candidate) => candidate.actionId === target.actionId,
    );
    if (!action) throw new Error("p10_5_treatment_action_not_found");
    if (!actionScopeMatches(action, scope)) {
      throw new Error("p10_5_treatment_scope_mismatch");
    }
    return;
  }

  const holdout = experiment.holdouts.values.find(
    (candidate) => candidate.unitId === target.unitId,
  );
  if (!holdout) throw new Error("p10_5_holdout_unit_not_found");
  if (canonicalJson(scope) !== canonicalJson(holdout.scope)) {
    throw new Error("p10_5_holdout_scope_mismatch");
  }
}

function normalizeDecimal(value: string | null, errorCode: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !CANONICAL_DECIMAL.test(value) || value === "-0") {
    throw new Error(errorCode);
  }
  const unsigned = value.startsWith("-") ? value.slice(1) : value;
  const [whole, fraction = ""] = unsigned.split(".");
  if (whole.length + fraction.length > EXPECTED_ACTUAL_MAX_DECIMAL_DIGITS) {
    throw new Error(`${errorCode}_precision`);
  }
  if (fraction.length > EXPECTED_ACTUAL_MAX_DECIMAL_SCALE) {
    throw new Error(`${errorCode}_scale`);
  }
  return value;
}

function parseDecimal(value: string): ParsedDecimal {
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ""] = unsigned.split(".");
  const integer = BigInt(`${whole}${fraction}`);
  return {
    integer: negative ? -integer : integer,
    scale: fraction.length,
  };
}

function pow10(power: number): bigint {
  return 10n ** BigInt(power);
}

function alignDecimals(left: ParsedDecimal, right: ParsedDecimal) {
  const scale = Math.max(left.scale, right.scale);
  return {
    left: left.integer * pow10(scale - left.scale),
    right: right.integer * pow10(scale - right.scale),
    scale,
  };
}

function formatDecimal(integer: bigint, scale: number): string {
  if (integer === 0n) return "0";
  const negative = integer < 0n;
  let digits = (negative ? -integer : integer).toString();

  if (scale === 0) return `${negative ? "-" : ""}${digits}`;

  digits = digits.padStart(scale + 1, "0");
  const whole = digits.slice(0, -scale);
  let fraction = digits.slice(-scale).replace(/0+$/, "");
  if (fraction.length === 0) {
    return `${negative ? "-" : ""}${whole}`;
  }
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

function compareAndSubtract(actual: string, expected: string) {
  const aligned = alignDecimals(parseDecimal(actual), parseDecimal(expected));
  const difference = aligned.left - aligned.right;
  const relation: P105ComparisonRelation = difference > 0n
    ? "above_expected"
    : difference < 0n
      ? "below_expected"
      : "equal_expected";
  return {
    signedDifference: formatDecimal(difference, aligned.scale),
    relation,
  };
}

function verifyExperiment(
  input: ExpectedActualOutcomeInput,
): ExperimentHoldoutReport {
  if (
    !input.experimentReport
    || typeof input.experimentReport !== "object"
    || Array.isArray(input.experimentReport)
  ) {
    throw new Error("invalid_p10_5_experiment_report");
  }
  if (input.experimentReport.version !== EXPERIMENT_HOLDOUT_VERSION) {
    throw new Error("unsupported_p10_4_experiment_version");
  }

  const rebuilt = buildExperimentHoldoutReport(input.experimentInput);
  if (canonicalJson(input.experimentReport) !== canonicalJson(rebuilt)) {
    throw new Error("p10_4_experiment_integrity_mismatch");
  }
  return rebuilt;
}

function normalizeMetricDefinitions(
  definitions: P105MetricDefinitionInput[],
): P105MetricDefinition[] {
  if (!Array.isArray(definitions)) throw new Error("invalid_p10_5_metric_definitions");
  if (definitions.length > EXPECTED_ACTUAL_MAX_METRICS) {
    throw new Error("p10_5_metric_definition_limit_exceeded");
  }

  const allowedDirections = new Set<P105MetricDirection>(["higher", "lower", "neutral"]);
  const byKey = new Map<string, P105MetricDefinition>();
  const bySource = new Map<string, P105MetricDefinition>();

  for (const input of definitions) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("invalid_p10_5_metric_definition");
    }
    const metricKey = normalizeKey(input.metricKey, "invalid_p10_5_metric_key");
    const unit = normalizeKey(input.unit, "invalid_p10_5_metric_unit");
    if (!allowedDirections.has(input.direction)) {
      throw new Error("invalid_p10_5_metric_direction");
    }
    const source = normalizeSource(input.source);
    const normalized = {
      metricKey,
      unit,
      direction: input.direction,
      source,
    };
    const candidate: P105MetricDefinition = {
      ...normalized,
      metricFingerprint: hash({
        version: EXPECTED_ACTUAL_OUTCOME_VERSION,
        recordType: "metric_definition",
        ...normalized,
      }),
    };

    const existingKey = byKey.get(metricKey);
    if (existingKey && canonicalJson(existingKey) !== canonicalJson(candidate)) {
      throw new Error("p10_5_metric_key_conflict");
    }
    const skey = sourceKey(source);
    const existingSource = bySource.get(skey);
    if (existingSource && canonicalJson(existingSource) !== canonicalJson(candidate)) {
      throw new Error("p10_5_metric_source_conflict");
    }
    byKey.set(metricKey, candidate);
    bySource.set(skey, candidate);
  }

  return [...byKey.values()].sort((a, b) =>
    a.metricKey.localeCompare(b.metricKey)
    || a.metricFingerprint.localeCompare(b.metricFingerprint)
  );
}

type NormalizedExpectation = {
  expectationId: string;
  expectationFingerprint: string;
  metricKey: string;
  target: P105OutcomeTarget;
  scope: P103Scope;
  window: "after";
  expectedValue: string | null;
  source: P104SourceIdentity;
};

function normalizeExpectations(
  expectations: P105ExpectedOutcomeInput[],
  metricMap: Map<string, P105MetricDefinition>,
  experimentInput: ExperimentHoldoutInput,
  experiment: ExperimentHoldoutReport,
): NormalizedExpectation[] {
  if (!Array.isArray(expectations)) throw new Error("invalid_p10_5_expectations");
  if (expectations.length > EXPECTED_ACTUAL_MAX_EXPECTATIONS) {
    throw new Error("p10_5_expectation_limit_exceeded");
  }

  const byId = new Map<string, NormalizedExpectation>();
  const bySource = new Map<string, NormalizedExpectation>();

  for (const input of expectations) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("invalid_p10_5_expectation");
    }
    const expectationId = normalizeKey(input.expectationId, "invalid_p10_5_expectation_id");
    const metricKey = normalizeKey(input.metricKey, "invalid_p10_5_expectation_metric_key");
    if (!metricMap.has(metricKey)) throw new Error("p10_5_metric_not_found");
    if (input.window !== "after") throw new Error("p10_5_expectation_window_must_be_after");

    const target = normalizeTarget(input.target, experiment);
    const scope = normalizeScope(input.scope, "p10_5_expectation");
    validateTargetScope(target, scope, experimentInput, experiment);
    const expectedValue = normalizeDecimal(
      input.expectedValue,
      "invalid_p10_5_expected_value",
    );
    const source = normalizeSource(input.source);

    const normalized = {
      expectationId,
      metricKey,
      target,
      scope,
      window: "after" as const,
      expectedValue,
      source,
    };
    const candidate: NormalizedExpectation = {
      ...normalized,
      expectationFingerprint: hash({
        version: EXPECTED_ACTUAL_OUTCOME_VERSION,
        recordType: "expectation",
        ...normalized,
      }),
    };

    const existingId = byId.get(expectationId);
    if (existingId && canonicalJson(existingId) !== canonicalJson(candidate)) {
      throw new Error("p10_5_expectation_id_conflict");
    }
    const skey = sourceKey(source);
    const existingSource = bySource.get(skey);
    if (existingSource && canonicalJson(existingSource) !== canonicalJson(candidate)) {
      throw new Error("p10_5_expectation_source_conflict");
    }

    byId.set(expectationId, candidate);
    bySource.set(skey, candidate);
  }

  return [...byId.values()].sort((a, b) =>
    a.expectationId.localeCompare(b.expectationId)
    || a.expectationFingerprint.localeCompare(b.expectationFingerprint)
  );
}

type NormalizedActual = {
  actualFingerprint: string;
  expectationId: string;
  metricKey: string;
  target: P105OutcomeTarget;
  scope: P103Scope;
  observedAt: string;
  actualValue: string | null;
  source: P104SourceIdentity;
};

function normalizeActuals(
  actuals: P105ActualOutcomeInput[],
  expectationMap: Map<string, NormalizedExpectation>,
  experiment: ExperimentHoldoutReport,
): NormalizedActual[] {
  if (!Array.isArray(actuals)) throw new Error("invalid_p10_5_actuals");
  if (actuals.length > EXPECTED_ACTUAL_MAX_ACTUALS) {
    throw new Error("p10_5_actual_limit_exceeded");
  }

  const bySource = new Map<string, NormalizedActual>();
  for (const input of actuals) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("invalid_p10_5_actual");
    }
    const expectationId = normalizeKey(input.expectationId, "invalid_p10_5_actual_expectation_id");
    const expectation = expectationMap.get(expectationId);
    if (!expectation) throw new Error("p10_5_actual_expectation_not_found");

    const metricKey = normalizeKey(input.metricKey, "invalid_p10_5_actual_metric_key");
    const target = normalizeTarget(input.target, experiment);
    const scope = normalizeScope(input.scope, "p10_5_actual");
    if (
      metricKey !== expectation.metricKey
      || canonicalJson(target) !== canonicalJson(expectation.target)
      || canonicalJson(scope) !== canonicalJson(expectation.scope)
    ) {
      throw new Error("p10_5_actual_expectation_binding_mismatch");
    }

    const observedAt = canonicalTimestamp(
      input.observedAt,
      "invalid_p10_5_actual_timestamp",
    );
    if (
      observedAt < experiment.treatment.afterWindow.start
      || observedAt > experiment.treatment.afterWindow.end
    ) {
      throw new Error("p10_5_actual_outside_after_window");
    }

    const source = normalizeSource(input.source);
    const actualValue = normalizeDecimal(
      input.actualValue,
      "invalid_p10_5_actual_value",
    );
    const normalized = {
      expectationId,
      metricKey,
      target,
      scope,
      observedAt,
      actualValue,
      source,
    };
    const candidate: NormalizedActual = {
      ...normalized,
      actualFingerprint: hash({
        version: EXPECTED_ACTUAL_OUTCOME_VERSION,
        recordType: "actual",
        ...normalized,
      }),
    };

    const skey = sourceKey(source);
    const existing = bySource.get(skey);
    if (existing && canonicalJson(existing) !== canonicalJson(candidate)) {
      throw new Error("p10_5_actual_source_conflict");
    }
    bySource.set(skey, candidate);
  }

  return [...bySource.values()].sort((a, b) =>
    a.expectationId.localeCompare(b.expectationId)
    || a.observedAt.localeCompare(b.observedAt)
    || a.actualFingerprint.localeCompare(b.actualFingerprint)
  );
}

function buildExpectationTrack(
  expectation: NormalizedExpectation,
  metric: P105MetricDefinition,
  actuals: NormalizedActual[],
): P105ExpectationTrack {
  const matching = actuals.filter(
    (actual) => actual.expectationId === expectation.expectationId,
  );

  const actualComparisons: P105ActualComparison[] = matching.map((actual) => {
    if (expectation.expectedValue === null) {
      return {
        actualId: `p105-actual-${actual.actualFingerprint.slice(0, 24)}`,
        actualFingerprint: actual.actualFingerprint,
        observedAt: actual.observedAt,
        actualValue: actual.actualValue,
        source: actual.source,
        state: "expected_unavailable",
        signedDifference: null,
        relation: null,
      };
    }
    if (actual.actualValue === null) {
      return {
        actualId: `p105-actual-${actual.actualFingerprint.slice(0, 24)}`,
        actualFingerprint: actual.actualFingerprint,
        observedAt: actual.observedAt,
        actualValue: null,
        source: actual.source,
        state: "actual_unavailable",
        signedDifference: null,
        relation: null,
      };
    }

    const comparison = compareAndSubtract(actual.actualValue, expectation.expectedValue);
    return {
      actualId: `p105-actual-${actual.actualFingerprint.slice(0, 24)}`,
      actualFingerprint: actual.actualFingerprint,
      observedAt: actual.observedAt,
      actualValue: actual.actualValue,
      source: actual.source,
      state: "comparison_available",
      ...comparison,
    };
  });

  const state: P105TrackingState = expectation.expectedValue === null
    ? "expected_unavailable"
    : actualComparisons.length === 0
      || actualComparisons.every((actual) => actual.state === "actual_unavailable")
      ? "actual_unavailable"
      : "comparison_available";

  return {
    expectationId: expectation.expectationId,
    expectationFingerprint: expectation.expectationFingerprint,
    metricKey: expectation.metricKey,
    unit: metric.unit,
    direction: metric.direction,
    target: expectation.target,
    scope: expectation.scope,
    window: "after",
    expectedValue: expectation.expectedValue,
    source: expectation.source,
    state,
    actualCount: actualComparisons.length,
    comparisonAvailableCount: actualComparisons.filter(
      (actual) => actual.state === "comparison_available",
    ).length,
    actualUnavailableCount: actualComparisons.filter(
      (actual) => actual.state === "actual_unavailable",
    ).length,
    actuals: actualComparisons,
  };
}

export function expectedActualSemantics() {
  return Object.freeze({
    exactP10_4IntegrityRequired: true,
    exactP10_1ThroughP10_3IntegrityInherited: true,
    suppliedMetricDefinitionsOnly: true,
    suppliedExpectedValuesOnly: true,
    suppliedActualValuesOnly: true,
    exactDecimalArithmeticOnly: true,
    afterWindowOnly: true,
    exactTargetScopeOnly: true,
    exactReplayDeduped: true,
    conflictingReplayFailsClosed: true,
    missingValuesRemainUnavailable: true,
    metricDirectionIsMetadataOnly: true,
    expectedValueIsCausalCounterfactual: false,
    actualValueProvesActionImpact: false,
    signedDifferenceIsCausalEffect: false,
    comparisonRelationIsEvaluation: false,
    percentageChangeCalculated: false,
    treatmentVsHoldoutEffectCalculated: false,
    differenceInDifferencesCalculated: false,
    trendInferredFromMultipleActuals: false,
    statisticalSignificanceCalculated: false,
    confidenceIntervalCalculated: false,
    causalAttributionPerformed: false,
    recommendationGenerated: false,
    rolloutDecisionGenerated: false,
  });
}

export function expectedActualCapability() {
  return Object.freeze({
    version: EXPECTED_ACTUAL_OUTCOME_VERSION,
    deterministicProjectionOnly: true,
    readOnlyArchitectureOnly: true,
    liveOutcomeLoadingAuthorized: false,
    liveExperimentAssignmentAuthorized: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    productionDbReadAuthorized: false,
    productionDbWriteAuthorized: false,
    schemaMutationAuthorized: false,
    providerNetworkReadAuthorized: false,
    providerCredentialUseAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
    timerActivated: false,
    schedulerActivated: false,
    liveWorkerEnabled: false,
    liveRetryLoopEnabled: false,
    proposalPersistenceAuthorized: false,
    approvalGrantAuthorized: false,
    executionAuthorizationCreated: false,
    task51ExecutionAuthorized: false,
    task53ExecutionAuthorized: false,
    task54ExecutionAuthorized: false,
    autonomousMutationAuthorized: false,
    p98ImplementationAuthorized: false,
    p106ImplementationAuthorized: false,
    automaticTransition: false,
    publicationAuthorized: false,
  });
}

export function buildExpectedActualOutcomeReport(
  input: ExpectedActualOutcomeInput,
): ExpectedActualOutcomeReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_p10_5_input");
  }

  const experiment = verifyExperiment(input);
  const metrics = normalizeMetricDefinitions(input.metricDefinitions);
  const metricMap = new Map(metrics.map((metric) => [metric.metricKey, metric]));
  const expectations = normalizeExpectations(
    input.expectations,
    metricMap,
    input.experimentInput,
    experiment,
  );
  const expectationMap = new Map(
    expectations.map((expectation) => [expectation.expectationId, expectation]),
  );
  const actuals = normalizeActuals(input.actuals, expectationMap, experiment);

  const tracks = expectations.map((expectation) =>
    buildExpectationTrack(
      expectation,
      metricMap.get(expectation.metricKey)!,
      actuals,
    )
  );

  const semantics = expectedActualSemantics();
  const identity = {
    version: EXPECTED_ACTUAL_OUTCOME_VERSION,
    experimentReportId: experiment.reportId,
    experimentReportFingerprint: experiment.reportFingerprint,
    timelineId: experiment.timelineId,
    timelineFingerprint: experiment.timelineFingerprint,
    treatmentActionId: experiment.treatment.actionId,
    afterWindow: {
      ...experiment.treatment.afterWindow,
    },
    metricDefinitions: {
      total: metrics.length,
      values: metrics,
    },
    expectations: {
      total: tracks.length,
      comparisonAvailable: tracks.filter(
        (track) => track.state === "comparison_available",
      ).length,
      expectedUnavailable: tracks.filter(
        (track) => track.state === "expected_unavailable",
      ).length,
      actualUnavailable: tracks.filter(
        (track) => track.state === "actual_unavailable",
      ).length,
      values: tracks,
    },
    upstreamContext: {
      p104StructuralFlagCount: experiment.structuralFlags.total,
      p104StructuralFlagFingerprints: experiment.structuralFlags.values
        .map((flag) => flag.flagFingerprint)
        .sort(),
      p103TreatmentConfounderCount: experiment.treatment.treatmentConfounderCount,
    },
    semantics,
  };

  const reportFingerprint = hash(identity);
  return {
    reportId: `p105-report-${reportFingerprint.slice(0, 24)}`,
    reportFingerprint,
    ...identity,
    safety: expectedActualCapability(),
  };
}
