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
  expectedActualCapability,
  expectedActualSemantics,
  type P105ActualOutcomeInput,
  type P105ExpectedOutcomeInput,
  type P105MetricDefinitionInput,
} from "./expected-actual-outcome.js";
import {
  buildUnifiedChangeTimeline,
  type UnifiedTimelineSourceEventInput,
} from "./unified-change-timeline.js";

const fp = (value: number) => value.toString(16).padStart(64, "0");

function event(input: {
  id: number;
  actionId: string;
  occurredAt: string;
  pageId?: string;
  url?: string;
  query?: string;
  category?: string;
}): UnifiedTimelineSourceEventInput {
  return {
    occurredAt: input.occurredAt,
    eventClass: "execution",
    eventKind: "verified_change_retained_live",
    source: {
      system: "p10_5_fixture",
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
      recommendationId: "recommendation-1",
      recommendationFingerprint: fp(102),
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
      pageId: input.pageId ?? "page-treatment",
      url: input.url ?? "https://diamondshelf.us/products/treatment",
      resourceKind: "product",
      resourceId: `resource-${input.id}`,
      field: "meta_description",
      beforeFingerprint: fp(201),
      afterFingerprint: fp(202),
    },
    associations: {
      query: input.query ?? "treatment query",
      category: input.category ?? "fragrance",
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

function fixture() {
  const timeline = buildUnifiedChangeTimeline({
    timelineKey: "diamond-shelf.p10-5",
    referenceTime: "2026-09-20T18:00:00.000Z",
    events: [
      event({
        id: 1,
        actionId: "action-treatment",
        occurredAt: "2026-09-20T11:00:00.000Z",
      }),
    ],
  });
  const attribution = buildActionAttribution(timeline);
  const anchor = timeline.events[0]!;
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
      experimentKey: "diamond-shelf.p10-5.experiment",
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
          category: "fragrance-holdout",
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

function metric(
  metricKey = "gsc_clicks",
  unit = "clicks",
): P105MetricDefinitionInput {
  return {
    metricKey,
    unit,
    direction: "higher",
    source: {
      system: "outcome_contract",
      version: "v1",
      eventId: `metric-${metricKey}`,
      eventFingerprint: fp(metricKey.length + 400),
    },
  };
}

function treatmentExpectation(
  expectedValue: string | null = "10",
): P105ExpectedOutcomeInput {
  return {
    expectationId: "expectation-treatment-clicks",
    metricKey: "gsc_clicks",
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
      eventId: "expectation-treatment-clicks",
      eventFingerprint: fp(501),
    },
  };
}

function actual(
  id: number,
  actualValue: string | null,
  observedAt = "2026-09-20T12:00:00.000Z",
): P105ActualOutcomeInput {
  const expectation = treatmentExpectation();
  return {
    expectationId: expectation.expectationId,
    metricKey: expectation.metricKey,
    target: expectation.target,
    scope: expectation.scope,
    observedAt,
    actualValue,
    source: {
      system: "supplied_outcome_fixture",
      version: "v1",
      eventId: `actual-${id}`,
      eventFingerprint: fp(600 + id),
    },
  };
}

test("P10.5 performs exact descriptive decimal comparison only", () => {
  const base = fixture();
  const report = buildExpectedActualOutcomeReport({
    ...base,
    metricDefinitions: [metric()],
    expectations: [treatmentExpectation("10.25")],
    actuals: [actual(1, "12.5")],
  });

  const track = report.expectations.values[0]!;
  assert.equal(track.state, "comparison_available");
  assert.equal(track.actuals[0]!.signedDifference, "2.25");
  assert.equal(track.actuals[0]!.relation, "above_expected");
  assert.equal(report.semantics.signedDifferenceIsCausalEffect, false);
  assert.equal(report.semantics.comparisonRelationIsEvaluation, false);
});

test("exact decimal arithmetic avoids floating-point approximation", () => {
  const base = fixture();
  const report = buildExpectedActualOutcomeReport({
    ...base,
    metricDefinitions: [metric()],
    expectations: [treatmentExpectation("0.1")],
    actuals: [actual(2, "0.3")],
  });

  assert.equal(
    report.expectations.values[0]!.actuals[0]!.signedDifference,
    "0.2",
  );
});

test("below and equal relations are descriptive", () => {
  const base = fixture();
  const report = buildExpectedActualOutcomeReport({
    ...base,
    metricDefinitions: [metric()],
    expectations: [treatmentExpectation("10")],
    actuals: [
      actual(3, "9", "2026-09-20T12:00:00.000Z"),
      actual(4, "10", "2026-09-20T13:00:00.000Z"),
    ],
  });

  assert.deepEqual(
    report.expectations.values[0]!.actuals.map((value) => value.relation),
    ["below_expected", "equal_expected"],
  );
});

test("null expected value remains expected_unavailable", () => {
  const base = fixture();
  const report = buildExpectedActualOutcomeReport({
    ...base,
    metricDefinitions: [metric()],
    expectations: [treatmentExpectation(null)],
    actuals: [actual(5, "12")],
  });

  const track = report.expectations.values[0]!;
  assert.equal(track.state, "expected_unavailable");
  assert.equal(track.actuals[0]!.state, "expected_unavailable");
  assert.equal(track.actuals[0]!.signedDifference, null);
  assert.equal(track.actuals[0]!.relation, null);
});

test("missing or null actual remains actual_unavailable", () => {
  const base = fixture();
  const noActual = buildExpectedActualOutcomeReport({
    ...base,
    metricDefinitions: [metric()],
    expectations: [treatmentExpectation("10")],
    actuals: [],
  });
  assert.equal(noActual.expectations.values[0]!.state, "actual_unavailable");

  const nullActual = buildExpectedActualOutcomeReport({
    ...base,
    metricDefinitions: [metric()],
    expectations: [treatmentExpectation("10")],
    actuals: [actual(6, null)],
  });
  assert.equal(nullActual.expectations.values[0]!.state, "actual_unavailable");
  assert.equal(nullActual.expectations.values[0]!.actuals[0]!.state, "actual_unavailable");
});

test("holdout expectation scope must equal exact P10.4 holdout scope", () => {
  const base = fixture();
  const holdout = base.experimentReport.holdouts.values[0]!;
  const expectation: P105ExpectedOutcomeInput = {
    expectationId: "expectation-holdout",
    metricKey: "gsc_clicks",
    target: {
      kind: "holdout",
      unitId: holdout.unitId,
    },
    scope: {
      ...holdout.scope,
      query: "wrong query",
    },
    window: "after",
    expectedValue: "5",
    source: {
      system: "outcome_contract",
      version: "v1",
      eventId: "expectation-holdout",
      eventFingerprint: fp(700),
    },
  };

  assert.throws(
    () => buildExpectedActualOutcomeReport({
      ...base,
      metricDefinitions: [metric()],
      expectations: [expectation],
      actuals: [],
    }),
    /p10_5_holdout_scope_mismatch/,
  );
});

test("actual record must bind exactly to expectation metric target and scope", () => {
  const base = fixture();
  const bad = actual(7, "12");
  bad.scope.query = "different query";

  assert.throws(
    () => buildExpectedActualOutcomeReport({
      ...base,
      metricDefinitions: [metric()],
      expectations: [treatmentExpectation("10")],
      actuals: [bad],
    }),
    /p10_5_actual_expectation_binding_mismatch/,
  );
});

test("actual timestamp must remain inside exact P10.4 after window", () => {
  const base = fixture();
  assert.throws(
    () => buildExpectedActualOutcomeReport({
      ...base,
      metricDefinitions: [metric()],
      expectations: [treatmentExpectation("10")],
      actuals: [actual(8, "12", "2026-09-20T15:00:00.000Z")],
    }),
    /p10_5_actual_outside_after_window/,
  );
});

test("non-canonical decimal forms fail closed", () => {
  const base = fixture();
  for (const invalid of ["01", "1.0", "+1", "1e2", "-0"]) {
    assert.throws(
      () => buildExpectedActualOutcomeReport({
        ...base,
        metricDefinitions: [metric()],
        expectations: [treatmentExpectation(invalid)],
        actuals: [],
      }),
      /invalid_p10_5_expected_value/,
    );
  }
});

test("tampered P10.4 report fails exact integrity", () => {
  const base = fixture();
  const tampered = structuredClone(base.experimentReport);
  tampered.holdouts.total = 99;

  assert.throws(
    () => buildExpectedActualOutcomeReport({
      experimentInput: base.experimentInput,
      experimentReport: tampered,
      metricDefinitions: [metric()],
      expectations: [treatmentExpectation("10")],
      actuals: [],
    }),
    /p10_4_experiment_integrity_mismatch/,
  );
});

test("conflicting actual replay under one source identity fails closed", () => {
  const base = fixture();
  const first = actual(9, "12");
  const second = {
    ...structuredClone(first),
    actualValue: "13",
  };

  assert.throws(
    () => buildExpectedActualOutcomeReport({
      ...base,
      metricDefinitions: [metric()],
      expectations: [treatmentExpectation("10")],
      actuals: [first, second],
    }),
    /p10_5_actual_source_conflict/,
  );
});

test("reordering definitions, expectations and actuals preserves report identity", () => {
  const base = fixture();
  const secondMetric = metric("gsc_impressions", "impressions");
  const secondExpectation: P105ExpectedOutcomeInput = {
    ...treatmentExpectation("100"),
    expectationId: "expectation-treatment-impressions",
    metricKey: "gsc_impressions",
    source: {
      system: "outcome_contract",
      version: "v1",
      eventId: "expectation-treatment-impressions",
      eventFingerprint: fp(801),
    },
  };
  const secondActual: P105ActualOutcomeInput = {
    ...actual(10, "120", "2026-09-20T13:00:00.000Z"),
    expectationId: secondExpectation.expectationId,
    metricKey: secondExpectation.metricKey,
    source: {
      system: "supplied_outcome_fixture",
      version: "v1",
      eventId: "actual-impressions",
      eventFingerprint: fp(802),
    },
  };
  const inputs = {
    metricDefinitions: [metric(), secondMetric],
    expectations: [treatmentExpectation("10"), secondExpectation],
    actuals: [actual(11, "12"), secondActual],
  };

  const first = buildExpectedActualOutcomeReport({
    ...base,
    ...inputs,
  });
  const second = buildExpectedActualOutcomeReport({
    ...base,
    metricDefinitions: [...inputs.metricDefinitions].reverse(),
    expectations: [...inputs.expectations].reverse(),
    actuals: [...inputs.actuals].reverse(),
  });

  assert.equal(first.reportFingerprint, second.reportFingerprint);
  assert.equal(first.reportId, second.reportId);
});

test("P10.5 semantic and safety guards remain closed", () => {
  const semantics = expectedActualSemantics();
  assert.equal(semantics.expectedValueIsCausalCounterfactual, false);
  assert.equal(semantics.actualValueProvesActionImpact, false);
  assert.equal(semantics.percentageChangeCalculated, false);
  assert.equal(semantics.treatmentVsHoldoutEffectCalculated, false);
  assert.equal(semantics.differenceInDifferencesCalculated, false);
  assert.equal(semantics.statisticalSignificanceCalculated, false);
  assert.equal(semantics.causalAttributionPerformed, false);
  assert.equal(semantics.rolloutDecisionGenerated, false);

  const capability = expectedActualCapability();
  assert.equal(capability.liveOutcomeLoadingAuthorized, false);
  assert.equal(capability.liveExperimentAssignmentAuthorized, false);
  assert.equal(capability.databaseReadsAuthorized, false);
  assert.equal(capability.databaseWritesAuthorized, false);
  assert.equal(capability.providerNetworkReadAuthorized, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.task51ExecutionAuthorized, false);
  assert.equal(capability.task53ExecutionAuthorized, false);
  assert.equal(capability.task54ExecutionAuthorized, false);
  assert.equal(capability.autonomousMutationAuthorized, false);
  assert.equal(capability.p106ImplementationAuthorized, false);
  assert.equal(capability.publicationAuthorized, false);
});
