import { createHash } from "node:crypto";
import {
  EXPECTED_ACTUAL_OUTCOME_VERSION,
  buildExpectedActualOutcomeReport,
  type ExpectedActualOutcomeInput,
  type ExpectedActualOutcomeReport,
  type P105ActualComparison,
  type P105ExpectationTrack,
} from "./expected-actual-outcome.js";
import type { P104SourceIdentity } from "./experiment-holdout.js";

export const RECOMMENDATION_CALIBRATION_VERSION =
  "p10.6-recommendation-calibration-v1" as const;
export const RECOMMENDATION_CALIBRATION_MAX_DEFINITIONS = 2048 as const;

export type P106CalibrationRole = "primary" | "secondary" | "diagnostic";
export type P106DirectionalSignalKind =
  | "same_as_declared_direction"
  | "opposite_declared_direction"
  | "equal_expected"
  | "neutral_direction"
  | "unavailable";
export type P106DefinitionState = "signal_available" | "signal_unavailable";

export type P106CalibrationDefinitionInput = {
  calibrationKey: string;
  recommendationId: string;
  recommendationFingerprint: string;
  expectationId: string;
  role: P106CalibrationRole;
  source: P104SourceIdentity;
};

export type P106DirectionalSignal = {
  signalId: string;
  signalFingerprint: string;
  calibrationKey: string;
  recommendationId: string;
  recommendationFingerprint: string;
  expectationId: string;
  expectationFingerprint: string;
  actualId: string;
  actualFingerprint: string;
  observedAt: string;
  metricKey: string;
  unit: string;
  metricDirection: "higher" | "lower" | "neutral";
  role: P106CalibrationRole;
  relation: "above_expected" | "equal_expected" | "below_expected" | null;
  signedDifference: string | null;
  kind: P106DirectionalSignalKind;
  actualSource: P104SourceIdentity;
};

export type P106CalibrationDefinition = {
  calibrationKey: string;
  definitionFingerprint: string;
  recommendationId: string;
  recommendationFingerprint: string;
  expectationId: string;
  expectationFingerprint: string;
  metricKey: string;
  unit: string;
  metricDirection: "higher" | "lower" | "neutral";
  role: P106CalibrationRole;
  source: P104SourceIdentity;
  state: P106DefinitionState;
  signalCount: number;
  availableSignalCount: number;
  unavailableSignalCount: number;
  signals: P106DirectionalSignal[];
};

export type RecommendationCalibrationInput = {
  outcomeInput: ExpectedActualOutcomeInput;
  outcomeReport: ExpectedActualOutcomeReport;
  calibrationDefinitions: P106CalibrationDefinitionInput[];
};

export type RecommendationCalibrationReport = {
  version: typeof RECOMMENDATION_CALIBRATION_VERSION;
  reportId: string;
  reportFingerprint: string;
  outcomeReportId: string;
  outcomeReportFingerprint: string;
  timelineId: string;
  timelineFingerprint: string;
  treatmentActionId: string;
  recommendation: {
    recommendationId: string;
    recommendationFingerprint: string;
  };
  definitions: {
    total: number;
    signalAvailable: number;
    signalUnavailable: number;
    values: P106CalibrationDefinition[];
  };
  signals: {
    total: number;
    available: number;
    unavailable: number;
  };
  upstreamContext: {
    p104StructuralFlagCount: number;
    p104StructuralFlagFingerprints: string[];
    p103TreatmentConfounderCount: number;
  };
  semantics: ReturnType<typeof recommendationCalibrationSemantics>;
  safety: ReturnType<typeof recommendationCalibrationCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const KEY = /^[a-z0-9][a-z0-9._:-]{0,127}$/;
const SOURCE_VERSION = /^[A-Za-z0-9][A-Za-z0-9._:+\/-]{0,127}$/;

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

function normalizeFingerprint(value: unknown, errorCode: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) {
    throw new Error(errorCode);
  }
  return value;
}

function normalizeSource(source: P104SourceIdentity): P104SourceIdentity {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("invalid_p10_6_source");
  }
  const version = exactString(source.version, "invalid_p10_6_source_version", 128);
  if (!SOURCE_VERSION.test(version)) throw new Error("invalid_p10_6_source_version");
  return {
    system: normalizeKey(source.system, "invalid_p10_6_source_system"),
    version,
    eventId: exactString(source.eventId, "invalid_p10_6_source_event_id", 512),
    eventFingerprint: normalizeFingerprint(
      source.eventFingerprint,
      "invalid_p10_6_source_event_fingerprint",
    ),
  };
}

function sourceKey(source: P104SourceIdentity): string {
  return `${source.system}\u0000${source.version}\u0000${source.eventId}`;
}

function verifyOutcome(
  input: RecommendationCalibrationInput,
): ExpectedActualOutcomeReport {
  if (
    !input.outcomeReport
    || typeof input.outcomeReport !== "object"
    || Array.isArray(input.outcomeReport)
  ) {
    throw new Error("invalid_p10_6_outcome_report");
  }
  if (input.outcomeReport.version !== EXPECTED_ACTUAL_OUTCOME_VERSION) {
    throw new Error("unsupported_p10_5_outcome_version");
  }

  const rebuilt = buildExpectedActualOutcomeReport(input.outcomeInput);
  if (canonicalJson(input.outcomeReport) !== canonicalJson(rebuilt)) {
    throw new Error("p10_5_outcome_integrity_mismatch");
  }
  return rebuilt;
}

function resolveRecommendationLineage(
  input: RecommendationCalibrationInput,
  outcome: ExpectedActualOutcomeReport,
) {
  const sameActionEvents = input.outcomeInput.experimentInput.timeline.events.filter(
    (event) => event.lineage.actionId === outcome.treatmentActionId,
  );
  if (sameActionEvents.length === 0) {
    throw new Error("p10_6_treatment_action_lineage_not_found");
  }

  let recommendationId: string | null = null;
  let recommendationFingerprint: string | null = null;

  for (const event of sameActionEvents) {
    if (
      event.lineage.recommendationId === null
      || event.lineage.recommendationFingerprint === null
    ) {
      throw new Error("p10_6_recommendation_lineage_incomplete");
    }

    const candidateId = exactString(
      event.lineage.recommendationId,
      "invalid_p10_6_recommendation_id",
    );
    const candidateFingerprint = normalizeFingerprint(
      event.lineage.recommendationFingerprint,
      "invalid_p10_6_recommendation_fingerprint",
    );

    if (recommendationId === null) {
      recommendationId = candidateId;
      recommendationFingerprint = candidateFingerprint;
      continue;
    }

    if (
      recommendationId !== candidateId
      || recommendationFingerprint !== candidateFingerprint
    ) {
      throw new Error("p10_6_recommendation_lineage_conflict");
    }
  }

  if (recommendationId === null || recommendationFingerprint === null) {
    throw new Error("p10_6_recommendation_lineage_incomplete");
  }

  return {
    recommendationId,
    recommendationFingerprint,
  };
}

function directionalSignalKind(
  track: P105ExpectationTrack,
  actual: P105ActualComparison,
): P106DirectionalSignalKind {
  if (
    actual.state !== "comparison_available"
    || actual.relation === null
    || actual.signedDifference === null
  ) {
    return "unavailable";
  }

  if (track.direction === "neutral") {
    return "neutral_direction";
  }

  if (actual.relation === "equal_expected") {
    return "equal_expected";
  }

  if (
    (track.direction === "higher" && actual.relation === "above_expected")
    || (track.direction === "lower" && actual.relation === "below_expected")
  ) {
    return "same_as_declared_direction";
  }

  if (
    (track.direction === "higher" && actual.relation === "below_expected")
    || (track.direction === "lower" && actual.relation === "above_expected")
  ) {
    return "opposite_declared_direction";
  }

  return "unavailable";
}

function makeSignal(
  calibrationKey: string,
  recommendation: {
    recommendationId: string;
    recommendationFingerprint: string;
  },
  role: P106CalibrationRole,
  track: P105ExpectationTrack,
  actual: P105ActualComparison,
): P106DirectionalSignal {
  const kind = directionalSignalKind(track, actual);
  const identity = {
    version: RECOMMENDATION_CALIBRATION_VERSION,
    recordType: "directional_signal",
    calibrationKey,
    recommendationId: recommendation.recommendationId,
    recommendationFingerprint: recommendation.recommendationFingerprint,
    expectationId: track.expectationId,
    expectationFingerprint: track.expectationFingerprint,
    actualId: actual.actualId,
    actualFingerprint: actual.actualFingerprint,
    observedAt: actual.observedAt,
    metricKey: track.metricKey,
    unit: track.unit,
    metricDirection: track.direction,
    role,
    relation: actual.relation,
    signedDifference: actual.signedDifference,
    kind,
    actualSource: actual.source,
  };
  const signalFingerprint = hash(identity);
  return {
    signalId: `p106-signal-${signalFingerprint.slice(0, 24)}`,
    signalFingerprint,
    ...identity,
  };
}

function normalizeDefinitions(
  inputs: P106CalibrationDefinitionInput[],
  outcome: ExpectedActualOutcomeReport,
  recommendation: {
    recommendationId: string;
    recommendationFingerprint: string;
  },
): P106CalibrationDefinition[] {
  if (!Array.isArray(inputs)) throw new Error("invalid_p10_6_calibration_definitions");
  if (inputs.length > RECOMMENDATION_CALIBRATION_MAX_DEFINITIONS) {
    throw new Error("p10_6_calibration_definition_limit_exceeded");
  }

  const allowedRoles = new Set<P106CalibrationRole>([
    "primary",
    "secondary",
    "diagnostic",
  ]);
  const expectationMap = new Map(
    outcome.expectations.values.map((track) => [track.expectationId, track]),
  );
  const byKey = new Map<string, P106CalibrationDefinition>();
  const bySource = new Map<string, P106CalibrationDefinition>();
  const byExpectation = new Map<string, P106CalibrationDefinition>();

  for (const input of inputs) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("invalid_p10_6_calibration_definition");
    }

    const calibrationKey = normalizeKey(
      input.calibrationKey,
      "invalid_p10_6_calibration_key",
    );
    const recommendationId = exactString(
      input.recommendationId,
      "invalid_p10_6_definition_recommendation_id",
    );
    const recommendationFingerprint = normalizeFingerprint(
      input.recommendationFingerprint,
      "invalid_p10_6_definition_recommendation_fingerprint",
    );
    if (
      recommendationId !== recommendation.recommendationId
      || recommendationFingerprint !== recommendation.recommendationFingerprint
    ) {
      throw new Error("p10_6_definition_recommendation_mismatch");
    }

    const expectationId = normalizeKey(
      input.expectationId,
      "invalid_p10_6_expectation_id",
    );
    const track = expectationMap.get(expectationId);
    if (!track) throw new Error("p10_6_expectation_not_found");
    if (
      track.target.kind !== "treatment"
      || track.target.actionId !== outcome.treatmentActionId
    ) {
      throw new Error("p10_6_calibration_requires_treatment_expectation");
    }

    if (!allowedRoles.has(input.role)) {
      throw new Error("invalid_p10_6_calibration_role");
    }
    const source = normalizeSource(input.source);

    const signals = track.actuals
      .map((actual) =>
        makeSignal(
          calibrationKey,
          recommendation,
          input.role,
          track,
          actual,
        )
      )
      .sort((a, b) =>
        a.observedAt.localeCompare(b.observedAt)
        || a.actualFingerprint.localeCompare(b.actualFingerprint)
        || a.signalFingerprint.localeCompare(b.signalFingerprint)
      );

    const availableSignalCount = signals.filter(
      (signal) => signal.kind !== "unavailable",
    ).length;
    const unavailableSignalCount = signals.length - availableSignalCount;
    const state: P106DefinitionState = availableSignalCount > 0
      ? "signal_available"
      : "signal_unavailable";

    const normalized = {
      calibrationKey,
      recommendationId,
      recommendationFingerprint,
      expectationId,
      expectationFingerprint: track.expectationFingerprint,
      metricKey: track.metricKey,
      unit: track.unit,
      metricDirection: track.direction,
      role: input.role,
      source,
      state,
      signalCount: signals.length,
      availableSignalCount,
      unavailableSignalCount,
      signals,
    };
    const definitionFingerprint = hash({
      version: RECOMMENDATION_CALIBRATION_VERSION,
      recordType: "calibration_definition",
      ...normalized,
    });
    const candidate: P106CalibrationDefinition = {
      ...normalized,
      definitionFingerprint,
    };

    const existingKey = byKey.get(calibrationKey);
    if (existingKey && canonicalJson(existingKey) !== canonicalJson(candidate)) {
      throw new Error("p10_6_calibration_key_conflict");
    }

    const skey = sourceKey(source);
    const existingSource = bySource.get(skey);
    if (existingSource && canonicalJson(existingSource) !== canonicalJson(candidate)) {
      throw new Error("p10_6_calibration_source_conflict");
    }

    const existingExpectation = byExpectation.get(expectationId);
    if (
      existingExpectation
      && canonicalJson(existingExpectation) !== canonicalJson(candidate)
    ) {
      throw new Error("p10_6_expectation_calibration_conflict");
    }

    byKey.set(calibrationKey, candidate);
    bySource.set(skey, candidate);
    byExpectation.set(expectationId, candidate);
  }

  return [...byKey.values()].sort((a, b) =>
    a.calibrationKey.localeCompare(b.calibrationKey)
    || a.definitionFingerprint.localeCompare(b.definitionFingerprint)
  );
}

export function recommendationCalibrationSemantics() {
  return Object.freeze({
    exactP10_5IntegrityRequired: true,
    exactP10_1ThroughP10_4IntegrityInherited: true,
    exactTreatmentRecommendationLineageRequired: true,
    callerSuppliedCalibrationDefinitionsOnly: true,
    treatmentExpectationOnly: true,
    calibrationRoleIsMetadataOnly: true,
    perActualSignalsOnly: true,
    multipleActualsRemainIndependent: true,
    noSignalAggregation: true,
    upstreamContextProvenanceOnly: true,
    unavailableFactsRemainUnavailable: true,
    expectedValueIsCausalCounterfactual: false,
    actualValueProvesRecommendationImpact: false,
    directionalSignalIsRecommendationQuality: false,
    directionalSignalIsRewardOrPenalty: false,
    rewardScoreCalculated: false,
    recommendationScoreCalculated: false,
    recommendationRankRecalculated: false,
    modelParametersUpdated: false,
    modelWeightsUpdated: false,
    policyUpdated: false,
    promptTemplateUpdated: false,
    trendInferred: false,
    confidenceCalculated: false,
    causalAttributionPerformed: false,
    rolloutRecommendationGenerated: false,
    autonomousTransitionGenerated: false,
  });
}

export function recommendationCalibrationCapability() {
  return Object.freeze({
    version: RECOMMENDATION_CALIBRATION_VERSION,
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
    recommendationPersistenceAuthorized: false,
    recommendationMutationAuthorized: false,
    modelTrainingAuthorized: false,
    modelFineTuningAuthorized: false,
    modelWeightUpdateAuthorized: false,
    recommendationRankingMutationAuthorized: false,
    policyMutationAuthorized: false,
    promptTemplateMutationAuthorized: false,
    task51ExecutionAuthorized: false,
    task53ExecutionAuthorized: false,
    task54ExecutionAuthorized: false,
    autonomousMutationAuthorized: false,
    p98ImplementationAuthorized: false,
    p107ImplementationAuthorized: false,
    automaticTransition: false,
    publicationAuthorized: false,
  });
}

export function buildRecommendationCalibrationReport(
  input: RecommendationCalibrationInput,
): RecommendationCalibrationReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_p10_6_input");
  }

  const outcome = verifyOutcome(input);
  const recommendation = resolveRecommendationLineage(input, outcome);
  const definitions = normalizeDefinitions(
    input.calibrationDefinitions,
    outcome,
    recommendation,
  );

  const signals = definitions.flatMap((definition) => definition.signals);
  const semantics = recommendationCalibrationSemantics();
  const identity = {
    version: RECOMMENDATION_CALIBRATION_VERSION,
    outcomeReportId: outcome.reportId,
    outcomeReportFingerprint: outcome.reportFingerprint,
    timelineId: outcome.timelineId,
    timelineFingerprint: outcome.timelineFingerprint,
    treatmentActionId: outcome.treatmentActionId,
    recommendation,
    definitions: {
      total: definitions.length,
      signalAvailable: definitions.filter(
        (definition) => definition.state === "signal_available",
      ).length,
      signalUnavailable: definitions.filter(
        (definition) => definition.state === "signal_unavailable",
      ).length,
      values: definitions,
    },
    signals: {
      total: signals.length,
      available: signals.filter((signal) => signal.kind !== "unavailable").length,
      unavailable: signals.filter((signal) => signal.kind === "unavailable").length,
    },
    upstreamContext: {
      p104StructuralFlagCount: outcome.upstreamContext.p104StructuralFlagCount,
      p104StructuralFlagFingerprints: [
        ...outcome.upstreamContext.p104StructuralFlagFingerprints,
      ].sort(),
      p103TreatmentConfounderCount:
        outcome.upstreamContext.p103TreatmentConfounderCount,
    },
    semantics,
  };
  const reportFingerprint = hash(identity);

  return {
    reportId: `p106-report-${reportFingerprint.slice(0, 24)}`,
    reportFingerprint,
    ...identity,
    safety: recommendationCalibrationCapability(),
  };
}
