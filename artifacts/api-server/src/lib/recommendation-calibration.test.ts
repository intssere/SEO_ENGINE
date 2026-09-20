import assert from "node:assert/strict";
import test from "node:test";
import { buildActionAttribution } from "./action-attribution.js";
import {
  buildActionWindowConfounderReport,
  type ActionWindowConfounderInput,
} from "./action-window-confounder.js";
import {
  buildExperimentHoldoutReport,
  type ExperimentHoldoutInput,
} from "./experiment-holdout.js";
import {
  buildExpectedActualOutcomeReport,
  type ExpectedActualOutcomeInput,
  type P105ActualOutcomeInput,
  type P105ExpectedOutcomeInput,
  type P105MetricDefinitionInput,
} from "./expected-actual-outcome.js";
import {
  buildRecommendationCalibrationReport,
  recommendationCalibrationCapability,
  recommendationCalibrationSemantics,
  type P106CalibrationDefinitionInput,
} from "./recommendation-calibration.js";
import {
  buildUnifiedChangeTimeline,
  type UnifiedTimelineSourceEventInput,
} from "./unified-change-timeline.js";

const fp = (value: number) => value.toString(16).padStart(64, "0");

function event(input: {
  id: number;
  actionId: string;
  occurredAt: string;
  recommendationId?: string | null;
  recommendationFingerprint?: string | null;
}): UnifiedTimelineSourceEventInput {
  return {
    occurredAt: input.occurredAt,
    eventClass: "execution",
    eventKind: "verified_change_retained_live",
    source: {
      system: "p10_6_fixture",
      version: "v1",
      eventId: `event-${input.id}`,
      eventFingerprint: fp(input.id),
    },
    site: {
      siteId: "site-1",
      domain: "diamondshelf.us",
    },
    lineage: {
      opportunityId: "opportunity-1",
      opportunityFingerprint: fp(101),
      relatedOpportunityFingerprint: null,
      recommendationId:
        input.recommendationId === undefined
          ? "recommendation-1"
          : input.recommendationId,
      recommendationFingerprint:
        input.recommendationFingerprint === undefined
          ? fp(102)
          : input.recommendationFingerprint,
      actionPlanId: "plan-1",
      proposalFingerprint: fp(103),
      approvalId: null,
      actionId: input.actionId,
      authorizationFingerprint: null,
      deploymentId: null,
      verificationId: null,
      rollbackId: null,
    },
    target: {
      pageId: "page-treatment",
      url: "https://diamondshelf.us/products/treatment",
      resourceKind: "product",
      resourceId: `resource-${input.id}`,
      field: "meta_description",
      beforeFingerprint: fp(201),
      afterFingerprint: fp(202),
    },
    associations: {
      query: "treatment query",
      category: "fragrance",
    },
    state: {
      terminal: null,
      providerMutationOccurred: true,
      verification: "verified",
      rollback: "not_required",
      changeRetainedLive: true,
      manualInterventionRequired: false,
      measurementEligibility: null,
    },
    sourceLineage: [],
  };
}

function metric(
  metricKey: string,
  unit: string,
  direction: "higher" | "lower" | "neutral",
  id: number,
): P105MetricDefinitionInput {
  return {
    metricKey,
    unit,
    direction,
    source: {
      system: "outcome_contract",
      version: "v1",
      eventId: `metric-${metricKey}`,
      eventFingerprint: fp(id),
    },
  };
}

function treatmentExpectation(
  expectationId: string,
  metricKey: string,
  expectedValue: string | null,
  id: number,
): P105ExpectedOutcomeInput {
  return {
    expectationId,
    metricKey,
    target: {
      kind: "treatment",
      actionId: "action-treatment",
    },
    scope: {
      siteId: "site-1",
      domain: "diamondshelf.us",
      pageId: "page-treatment",
      url: "https://diamondshelf.us/products/treatment",
      query: "treatment query",
      category: "fragrance",
    },
    window: "after",
    expectedValue,
    source: {
      system: "outcome_contract",
      version: "v1",
      eventId: `expectation-${expectationId}`,
      eventFingerprint: fp(id),
    },
  };
}

function actual(
  expectation: P105ExpectedOutcomeInput,
  actualValue: string | null,
  observedAt: string,
  id: number,
): P105ActualOutcomeInput {
  return {
    expectationId: expectation.expectationId,
    metricKey: expectation.metricKey,
    target: expectation.target,
    scope: structuredClone(expectation.scope),
    observedAt,
    actualValue,
    source: {
      system: "supplied_outcome_fixture",
      version: "v1",
      eventId: `actual-${id}`,
      eventFingerprint: fp(id),
    },
  };
}

function baseFixture(options?: {
  extraEvents?: UnifiedTimelineSourceEventInput[];
  recommendationId?: string | null;
  recommendationFingerprint?: string | null;
}) {
  const primary = event({
    id: 1,
    actionId: "action-treatment",
    occurredAt: "2026-09-20T11:00:00.000Z",
    recommendationId: options?.recommendationId,
    recommendationFingerprint: options?.recommendationFingerprint,
  });
  const timeline = buildUnifiedChangeTimeline({
    timelineKey: "diamond-shelf.p10-6",
    referenceTime: "2026-09-20T18:00:00.000Z",
    events: [primary, ...(options?.extraEvents ?? [])],
  });
  const attribution = buildActionAttribution(timeline);
  const anchor = timeline.events.find(
    (candidate) =>
      candidate.lineage.actionId === "action-treatment"
      && candidate.eventKind === "verified_change_retained_live",
  )!;
  const treatmentAnalysisInput: ActionWindowConfounderInput = {
    timeline,
    attribution,
    actionId: "action-treatment",
    anchorEventFingerprint: anchor.eventFingerprint,
    beforeWindow: {
      start: "2026-09-20T09:00:00.000Z",
      end: "2026-09-20T10:59:59.999Z",
    },
    afterWindow: {
      start: "2026-09-20T11:00:00.001Z",
      end: "2026-09-20T14:00:00.000Z",
    },
    observations: [],
    externalConfounders: [],
  };
  const treatmentAnalysisReport = buildActionWindowConfounderReport(
    treatmentAnalysisInput,
  );
  const experimentInput: ExperimentHoldoutInput = {
    timeline,
    attribution,
    treatmentAnalysisInput,
    treatmentAnalysisReport,
    design: {
      experimentKey: "diamond-shelf.p10-6.experiment",
      assignmentBasis: "observational",
      source: {
        system: "experiment_manifest",
        version: "v1",
        eventId: "design-1",
        eventFingerprint: fp(301),
      },
    },
    holdouts: [
      {
        unitId: "holdout-1",
        scope: {
          siteId: "site-1",
          domain: "diamondshelf.us",
          pageId: "page-holdout",
          url: "https://diamondshelf.us/products/holdout",
          query: "holdout query",
          category: "holdout-category",
        },
        assignmentSource: {
          system: "experiment_manifest",
          version: "v1",
          eventId: "holdout-assignment-1",
          eventFingerprint: fp(302),
        },
      },
    ],
    holdoutObservations: [],
  };
  const experimentReport = buildExperimentHoldoutReport(experimentInput);
  return {
    experimentInput,
    experimentReport,
  };
}

function outcomeFixture(options?: {
  metricDirection?: "higher" | "lower" | "neutral";
  expectedValue?: string | null;
  actualValues?: Array<string | null>;
  recommendationId?: string | null;
  recommendationFingerprint?: string | null;
  extraEvents?: UnifiedTimelineSourceEventInput[];
}) {
  const base = baseFixture(options);
  const expectation = treatmentExpectation(
    "expectation-treatment",
    "gsc_clicks",
    options?.expectedValue === undefined ? "10" : options.expectedValue,
    501,
  );
  const actualValues = options?.actualValues ?? ["12"];
  const outcomeInput: ExpectedActualOutcomeInput = {
    experimentInput: base.experimentInput,
    experimentReport: base.experimentReport,
    metricDefinitions: [
      metric(
        "gsc_clicks",
        "clicks",
        options?.metricDirection ?? "higher",
        401,
      ),
    ],
    expectations: [expectation],
    actuals: actualValues.map((value, index) =>
      actual(
        expectation,
        value,
        `2026-09-20T1${index + 2}:00:00.000Z`,
        601 + index,
      )
    ),
  };
  const outcomeReport = buildExpectedActualOutcomeReport(outcomeInput);
  return {
    outcomeInput,
    outcomeReport,
    expectation,
  };
}

function definition(
  expectationId = "expectation-treatment",
  overrides: Partial<P106CalibrationDefinitionInput> = {},
): P106CalibrationDefinitionInput {
  return {
    calibrationKey: "calibration-primary",
    recommendationId: "recommendation-1",
    recommendationFingerprint: fp(102),
    expectationId,
    role: "primary",
    source: {
      system: "calibration_manifest",
      version: "v1",
      eventId: "calibration-primary",
      eventFingerprint: fp(701),
    },
    ...overrides,
  };
}

test("higher metric above expected yields same_as_declared_direction only", () => {
  const base = outcomeFixture({
    metricDirection: "higher",
    expectedValue: "10",
    actualValues: ["12"],
  });
  const report = buildRecommendationCalibrationReport({
    ...base,
    calibrationDefinitions: [definition()],
  });

  const calibration = report.definitions.values[0]!;
  assert.equal(calibration.state, "signal_available");
  assert.equal(calibration.signals[0]!.kind, "same_as_declared_direction");
  assert.equal(calibration.signals[0]!.signedDifference, "2");
  assert.equal(report.semantics.directionalSignalIsRecommendationQuality, false);
  assert.equal(report.semantics.directionalSignalIsRewardOrPenalty, false);
});

test("lower metric below expected yields same_as_declared_direction", () => {
  const base = outcomeFixture({
    metricDirection: "lower",
    expectedValue: "10",
    actualValues: ["8"],
  });
  const report = buildRecommendationCalibrationReport({
    ...base,
    calibrationDefinitions: [definition()],
  });
  assert.equal(
    report.definitions.values[0]!.signals[0]!.kind,
    "same_as_declared_direction",
  );
});

test("opposite relation yields opposite_declared_direction", () => {
  const base = outcomeFixture({
    metricDirection: "higher",
    expectedValue: "10",
    actualValues: ["8"],
  });
  const report = buildRecommendationCalibrationReport({
    ...base,
    calibrationDefinitions: [definition()],
  });
  assert.equal(
    report.definitions.values[0]!.signals[0]!.kind,
    "opposite_declared_direction",
  );
});

test("equal relation remains equal_expected", () => {
  const base = outcomeFixture({
    metricDirection: "higher",
    expectedValue: "10",
    actualValues: ["10"],
  });
  const report = buildRecommendationCalibrationReport({
    ...base,
    calibrationDefinitions: [definition()],
  });
  assert.equal(
    report.definitions.values[0]!.signals[0]!.kind,
    "equal_expected",
  );
});

test("neutral metric direction never becomes positive or negative learning", () => {
  const base = outcomeFixture({
    metricDirection: "neutral",
    expectedValue: "10",
    actualValues: ["12"],
  });
  const report = buildRecommendationCalibrationReport({
    ...base,
    calibrationDefinitions: [definition()],
  });
  assert.equal(
    report.definitions.values[0]!.signals[0]!.kind,
    "neutral_direction",
  );
});

test("unavailable P10.5 comparison remains unavailable signal", () => {
  const base = outcomeFixture({
    expectedValue: null,
    actualValues: ["12"],
  });
  const report = buildRecommendationCalibrationReport({
    ...base,
    calibrationDefinitions: [definition()],
  });

  const calibration = report.definitions.values[0]!;
  assert.equal(calibration.state, "signal_unavailable");
  assert.equal(calibration.availableSignalCount, 0);
  assert.equal(calibration.unavailableSignalCount, 1);
  assert.equal(calibration.signals[0]!.kind, "unavailable");
});

test("expectation with no actuals remains signal_unavailable without synthetic signal", () => {
  const base = outcomeFixture({
    actualValues: [],
  });
  const report = buildRecommendationCalibrationReport({
    ...base,
    calibrationDefinitions: [definition()],
  });

  const calibration = report.definitions.values[0]!;
  assert.equal(calibration.state, "signal_unavailable");
  assert.equal(calibration.signalCount, 0);
  assert.deepEqual(calibration.signals, []);
});

test("multiple actuals remain independent signals without aggregation", () => {
  const base = outcomeFixture({
    actualValues: ["12", "8"],
  });
  const report = buildRecommendationCalibrationReport({
    ...base,
    calibrationDefinitions: [definition()],
  });

  const signals = report.definitions.values[0]!.signals;
  assert.equal(signals.length, 2);
  assert.deepEqual(
    signals.map((signal) => signal.kind),
    ["same_as_declared_direction", "opposite_declared_direction"],
  );
  assert.equal(report.semantics.noSignalAggregation, true);
  assert.equal(report.semantics.trendInferred, false);
});

test("holdout expectation cannot directly calibrate treatment recommendation", () => {
  const base = baseFixture();
  const holdout = base.experimentReport.holdouts.values[0]!;
  const expectation: P105ExpectedOutcomeInput = {
    expectationId: "expectation-holdout",
    metricKey: "gsc_clicks",
    target: {
      kind: "holdout",
      unitId: holdout.unitId,
    },
    scope: structuredClone(holdout.scope),
    window: "after",
    expectedValue: "5",
    source: {
      system: "outcome_contract",
      version: "v1",
      eventId: "expectation-holdout",
      eventFingerprint: fp(510),
    },
  };
  const outcomeInput: ExpectedActualOutcomeInput = {
    experimentInput: base.experimentInput,
    experimentReport: base.experimentReport,
    metricDefinitions: [metric("gsc_clicks", "clicks", "higher", 411)],
    expectations: [expectation],
    actuals: [],
  };
  const outcomeReport = buildExpectedActualOutcomeReport(outcomeInput);

  assert.throws(
    () =>
      buildRecommendationCalibrationReport({
        outcomeInput,
        outcomeReport,
        calibrationDefinitions: [definition("expectation-holdout")],
      }),
    /p10_6_calibration_requires_treatment_expectation/,
  );
});

test("calibration definition must bind exact recommendation identity", () => {
  const base = outcomeFixture();
  assert.throws(
    () =>
      buildRecommendationCalibrationReport({
        ...base,
        calibrationDefinitions: [
          definition("expectation-treatment", {
            recommendationId: "recommendation-other",
          }),
        ],
      }),
    /p10_6_definition_recommendation_mismatch/,
  );
});

test("missing recommendation lineage fails closed", () => {
  const base = outcomeFixture({
    recommendationId: null,
    recommendationFingerprint: null,
  });

  assert.throws(
    () =>
      buildRecommendationCalibrationReport({
        ...base,
        calibrationDefinitions: [definition()],
      }),
    /p10_6_recommendation_lineage_incomplete/,
  );
});

test("conflicting same-action recommendation lineage fails closed", () => {
  const conflicting = event({
    id: 2,
    actionId: "action-treatment",
    occurredAt: "2026-09-20T13:00:00.000Z",
    recommendationId: "recommendation-2",
    recommendationFingerprint: fp(222),
  });
  const base = outcomeFixture({
    extraEvents: [conflicting],
  });

  assert.throws(
    () =>
      buildRecommendationCalibrationReport({
        ...base,
        calibrationDefinitions: [definition()],
      }),
    /p10_6_recommendation_lineage_conflict/,
  );
});

test("tampered P10.5 report fails exact integrity", () => {
  const base = outcomeFixture();
  const tampered = structuredClone(base.outcomeReport);
  tampered.expectations.total = 99;

  assert.throws(
    () =>
      buildRecommendationCalibrationReport({
        outcomeInput: base.outcomeInput,
        outcomeReport: tampered,
        calibrationDefinitions: [definition()],
      }),
    /p10_5_outcome_integrity_mismatch/,
  );
});

test("conflicting calibration replay fails closed", () => {
  const base = outcomeFixture();
  const first = definition();
  const second = {
    ...structuredClone(first),
    role: "diagnostic" as const,
  };

  assert.throws(
    () =>
      buildRecommendationCalibrationReport({
        ...base,
        calibrationDefinitions: [first, second],
      }),
    /p10_6_calibration_key_conflict/,
  );
});

test("reordering independent calibration definitions preserves report identity", () => {
  const baseFixtureValue = baseFixture();
  const clicksExpectation = treatmentExpectation(
    "expectation-clicks",
    "gsc_clicks",
    "10",
    520,
  );
  const impressionsExpectation = treatmentExpectation(
    "expectation-impressions",
    "gsc_impressions",
    "100",
    521,
  );
  const outcomeInput: ExpectedActualOutcomeInput = {
    experimentInput: baseFixtureValue.experimentInput,
    experimentReport: baseFixtureValue.experimentReport,
    metricDefinitions: [
      metric("gsc_clicks", "clicks", "higher", 420),
      metric("gsc_impressions", "impressions", "higher", 421),
    ],
    expectations: [clicksExpectation, impressionsExpectation],
    actuals: [
      actual(clicksExpectation, "12", "2026-09-20T12:00:00.000Z", 620),
      actual(impressionsExpectation, "120", "2026-09-20T13:00:00.000Z", 621),
    ],
  };
  const outcomeReport = buildExpectedActualOutcomeReport(outcomeInput);
  const clicksDefinition = definition("expectation-clicks", {
    calibrationKey: "calibration-clicks",
    role: "primary",
    source: {
      system: "calibration_manifest",
      version: "v1",
      eventId: "calibration-clicks",
      eventFingerprint: fp(720),
    },
  });
  const impressionsDefinition = definition("expectation-impressions", {
    calibrationKey: "calibration-impressions",
    role: "secondary",
    source: {
      system: "calibration_manifest",
      version: "v1",
      eventId: "calibration-impressions",
      eventFingerprint: fp(721),
    },
  });

  const first = buildRecommendationCalibrationReport({
    outcomeInput,
    outcomeReport,
    calibrationDefinitions: [clicksDefinition, impressionsDefinition],
  });
  const second = buildRecommendationCalibrationReport({
    outcomeInput,
    outcomeReport,
    calibrationDefinitions: [impressionsDefinition, clicksDefinition],
  });

  assert.equal(first.reportFingerprint, second.reportFingerprint);
  assert.equal(first.reportId, second.reportId);
});

test("P10.6 semantic and safety guards remain closed", () => {
  const semantics = recommendationCalibrationSemantics();
  assert.equal(semantics.calibrationRoleIsMetadataOnly, true);
  assert.equal(semantics.directionalSignalIsRecommendationQuality, false);
  assert.equal(semantics.directionalSignalIsRewardOrPenalty, false);
  assert.equal(semantics.rewardScoreCalculated, false);
  assert.equal(semantics.recommendationScoreCalculated, false);
  assert.equal(semantics.recommendationRankRecalculated, false);
  assert.equal(semantics.modelParametersUpdated, false);
  assert.equal(semantics.policyUpdated, false);
  assert.equal(semantics.causalAttributionPerformed, false);
  assert.equal(semantics.rolloutRecommendationGenerated, false);

  const capability = recommendationCalibrationCapability();
  assert.equal(capability.liveOutcomeLoadingAuthorized, false);
  assert.equal(capability.databaseReadsAuthorized, false);
  assert.equal(capability.databaseWritesAuthorized, false);
  assert.equal(capability.providerNetworkReadAuthorized, false);
  assert.equal(capability.recommendationPersistenceAuthorized, false);
  assert.equal(capability.recommendationMutationAuthorized, false);
  assert.equal(capability.modelTrainingAuthorized, false);
  assert.equal(capability.modelWeightUpdateAuthorized, false);
  assert.equal(capability.recommendationRankingMutationAuthorized, false);
  assert.equal(capability.policyMutationAuthorized, false);
  assert.equal(capability.task51ExecutionAuthorized, false);
  assert.equal(capability.task53ExecutionAuthorized, false);
  assert.equal(capability.task54ExecutionAuthorized, false);
  assert.equal(capability.autonomousMutationAuthorized, false);
  assert.equal(capability.p107ImplementationAuthorized, false);
  assert.equal(capability.publicationAuthorized, false);
});
