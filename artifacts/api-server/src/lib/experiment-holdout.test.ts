import assert from "node:assert/strict";
import test from "node:test";
import { buildActionAttribution } from "./action-attribution.js";
import {
  buildActionWindowConfounderReport,
  type ActionWindowConfounderInput,
  type P103ObservationInput,
} from "./action-window-confounder.js";
import {
  buildExperimentHoldoutReport,
  experimentHoldoutCapability,
  experimentHoldoutSemantics,
  type P104HoldoutObservationInput,
  type P104HoldoutUnitInput,
} from "./experiment-holdout.js";
import {
  buildUnifiedChangeTimeline,
  type UnifiedTimelineEventKind,
  type UnifiedTimelineSourceEventInput,
} from "./unified-change-timeline.js";

const fp = (value: number) => value.toString(16).padStart(64, "0");

function lineage(actionId: string | null) {
  return {
    opportunityId: "opportunity-1",
    opportunityFingerprint: fp(101),
    relatedOpportunityFingerprint: null,
    recommendationId: "recommendation-1",
    recommendationFingerprint: fp(102),
    actionPlanId: "plan-1",
    proposalFingerprint: fp(103),
    approvalId: null,
    actionId,
    authorizationFingerprint: null,
    deploymentId: null,
    verificationId: null,
    rollbackId: null,
  };
}

function event(input: {
  id: number;
  actionId: string;
  occurredAt: string;
  eventKind: UnifiedTimelineEventKind;
  pageId?: string;
  url?: string;
  query?: string;
  category?: string;
}): UnifiedTimelineSourceEventInput {
  const eventKind = input.eventKind;
  return {
    occurredAt: input.occurredAt,
    eventClass: "execution",
    eventKind,
    source: {
      system: "synthetic_p10_4_fixture",
      version: "v1",
      eventId: `event-${input.id}`,
      eventFingerprint: fp(input.id),
    },
    site: {
      siteId: "site-1",
      domain: "diamondshelf.us",
    },
    lineage: {
      ...lineage(input.actionId),
      rollbackId: eventKind.startsWith("rollback_") ? `rollback-${input.id}` : null,
    },
    target: {
      pageId: input.pageId ?? "page-treatment",
      url: input.url ?? "https://diamondshelf.us/products/treatment",
      resourceKind: "product",
      resourceId: `product-${input.id}`,
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
      providerMutationOccurred: eventKind === "verified_change_retained_live"
        ? true
        : eventKind === "provider_write_outcome_uncertain"
          ? null
          : null,
      verification: eventKind === "verified_change_retained_live" ? "verified" : null,
      rollback: eventKind === "rollback_started"
        ? "pending"
        : eventKind === "verified_change_retained_live"
          ? "not_required"
          : null,
      changeRetainedLive: eventKind === "verified_change_retained_live" ? true : null,
      manualInterventionRequired: eventKind === "manual_intervention_required"
        ? true
        : eventKind === "verified_change_retained_live"
          ? false
          : null,
      measurementEligibility: null,
    },
    sourceLineage: [],
  };
}

function treatmentObservation(id: number, observedAt: string): P103ObservationInput {
  return {
    observedAt,
    source: {
      system: "treatment_observation_fixture",
      version: "v1",
      eventId: `treatment-observation-${id}`,
      eventFingerprint: fp(300 + id),
    },
    scope: {
      siteId: null,
      domain: null,
      pageId: "page-treatment",
      url: null,
      query: "treatment query",
      category: null,
    },
  };
}

function fixture(extraEvents: UnifiedTimelineSourceEventInput[] = []) {
  const timeline = buildUnifiedChangeTimeline({
    timelineKey: "diamond-shelf.p10-4",
    referenceTime: "2026-09-20T18:00:00.000Z",
    events: [
      event({
        id: 1,
        actionId: "action-treatment",
        occurredAt: "2026-09-20T11:00:00.000Z",
        eventKind: "verified_change_retained_live",
      }),
      ...extraEvents,
    ],
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
    observations: [
      treatmentObservation(1, "2026-09-20T10:00:00.000Z"),
      treatmentObservation(2, "2026-09-20T12:00:00.000Z"),
    ],
    externalConfounders: [],
  };
  const treatmentAnalysisReport = buildActionWindowConfounderReport(
    treatmentAnalysisInput,
  );
  return {
    timeline,
    attribution,
    treatmentAnalysisInput,
    treatmentAnalysisReport,
  };
}

function holdout(
  id: number,
  overrides: Partial<P104HoldoutUnitInput["scope"]> = {},
): P104HoldoutUnitInput {
  return {
    unitId: `holdout-${id}`,
    scope: {
      siteId: "site-1",
      domain: "diamondshelf.us",
      pageId: `page-holdout-${id}`,
      url: `https://diamondshelf.us/products/holdout-${id}`,
      query: `holdout query ${id}`,
      category: "holdout-category",
      ...overrides,
    },
    assignmentSource: {
      system: "experiment_manifest_fixture",
      version: "v1",
      eventId: `assignment-${id}`,
      eventFingerprint: fp(500 + id),
    },
  };
}

function holdoutObservation(
  id: number,
  unit: P104HoldoutUnitInput,
  observedAt: string,
): P104HoldoutObservationInput {
  return {
    unitId: unit.unitId,
    observedAt,
    source: {
      system: "holdout_observation_fixture",
      version: "v1",
      eventId: `holdout-observation-${id}`,
      eventFingerprint: fp(700 + id),
    },
    scope: structuredClone(unit.scope),
  };
}

function design() {
  return {
    experimentKey: "diamond-shelf.p10-4.experiment-1",
    assignmentBasis: "externally_selected" as const,
    source: {
      system: "experiment_manifest_fixture",
      version: "v1",
      eventId: "design-1",
      eventFingerprint: fp(900),
    },
  };
}

test("P10.4 records a supplied holdout design without calculating causal effect", () => {
  const base = fixture();
  const unit = holdout(1);
  const report = buildExperimentHoldoutReport({
    ...base,
    design: design(),
    holdouts: [unit],
    holdoutObservations: [
      holdoutObservation(1, unit, "2026-09-20T10:00:00.000Z"),
      holdoutObservation(2, unit, "2026-09-20T12:00:00.000Z"),
      holdoutObservation(3, unit, "2026-09-20T16:00:00.000Z"),
    ],
  });

  assert.equal(report.design.state, "holdout_defined");
  assert.equal(report.holdouts.total, 1);
  assert.equal(report.observations.before, 1);
  assert.equal(report.observations.after, 1);
  assert.equal(report.observations.outside, 1);
  assert.equal(report.structuralFlags.total, 0);
  assert.equal(report.semantics.treatmentEffectCalculated, false);
  assert.equal(report.semantics.statisticalSignificanceCalculated, false);
  assert.equal(report.semantics.causalAttributionPerformed, false);
});

test("zero holdouts remains explicit treatment_only", () => {
  const base = fixture();
  const report = buildExperimentHoldoutReport({
    ...base,
    design: design(),
    holdouts: [],
    holdoutObservations: [],
  });

  assert.equal(report.design.state, "treatment_only");
  assert.equal(report.holdouts.total, 0);
  assert.equal(report.structuralFlags.total, 0);
});

test("caller-declared randomized assignment is recorded but not verified", () => {
  const base = fixture();
  const report = buildExperimentHoldoutReport({
    ...base,
    design: {
      ...design(),
      assignmentBasis: "externally_randomized",
    },
    holdouts: [],
    holdoutObservations: [],
  });

  assert.equal(report.design.assignmentBasis, "externally_randomized");
  assert.equal(report.semantics.externallyRandomizedDeclarationVerified, false);
  assert.equal(report.semantics.holdoutPresenceEstablishesComparability, false);
});

test("cross-arm exact direct scope overlap emits a structural flag", () => {
  const base = fixture();
  const unit = holdout(2, {
    pageId: "page-treatment",
    url: "https://diamondshelf.us/products/treatment",
    query: "treatment query",
    category: "fragrance",
  });
  const report = buildExperimentHoldoutReport({
    ...base,
    design: design(),
    holdouts: [unit],
    holdoutObservations: [
      holdoutObservation(4, unit, "2026-09-20T10:00:00.000Z"),
      holdoutObservation(5, unit, "2026-09-20T12:00:00.000Z"),
    ],
  });

  assert.equal(report.structuralFlags.crossArmScopeOverlap, 1);
  const flag = report.structuralFlags.values.find(
    (candidate) => candidate.kind === "cross_arm_scope_overlap",
  )!;
  assert.ok(flag.sharedScopeTokens.includes("page_id:page-treatment"));
  assert.ok(flag.sharedScopeTokens.includes("query:treatment query"));
});

test("holdout action overlap requires exact action scope and retained-live time inside a P10.3 window", () => {
  const unit = holdout(3);
  const base = fixture([
    event({
      id: 30,
      actionId: "action-holdout",
      occurredAt: "2026-09-20T12:30:00.000Z",
      eventKind: "verified_change_retained_live",
      pageId: unit.scope.pageId!,
      url: unit.scope.url!,
      query: unit.scope.query!,
      category: unit.scope.category!,
    }),
  ]);
  const report = buildExperimentHoldoutReport({
    ...base,
    design: design(),
    holdouts: [unit],
    holdoutObservations: [
      holdoutObservation(6, unit, "2026-09-20T10:00:00.000Z"),
      holdoutObservation(7, unit, "2026-09-20T13:00:00.000Z"),
    ],
  });

  assert.equal(report.structuralFlags.holdoutActionOverlap, 1);
  const overlap = report.structuralFlags.values.find(
    (candidate) => candidate.kind === "holdout_action_overlap",
  )!;
  assert.equal(overlap.relatedActionId, "action-holdout");
  assert.equal(overlap.window, "after");
});

test("existing exact P10.3 treatment confounders project as descriptive flags", () => {
  const base = fixture([
    event({
      id: 40,
      actionId: "action-treatment",
      occurredAt: "2026-09-20T12:20:00.000Z",
      eventKind: "manual_intervention_required",
    }),
  ]);
  const report = buildExperimentHoldoutReport({
    ...base,
    design: design(),
    holdouts: [],
    holdoutObservations: [],
  });

  assert.equal(report.treatment.treatmentConfounderCount, 1);
  assert.equal(report.structuralFlags.treatmentConfounderPresent, 1);
  assert.equal(report.semantics.contaminationFlagsPerformCausalAdjustment, false);
});

test("missing holdout before/after coverage is flagged separately", () => {
  const base = fixture();
  const unit = holdout(4);
  const report = buildExperimentHoldoutReport({
    ...base,
    design: design(),
    holdouts: [unit],
    holdoutObservations: [
      holdoutObservation(8, unit, "2026-09-20T12:00:00.000Z"),
    ],
  });

  assert.equal(report.structuralFlags.holdoutMissingBeforeObservation, 1);
  assert.equal(report.structuralFlags.holdoutMissingAfterObservation, 0);
});

test("holdout observation scope must exactly equal the declared holdout scope", () => {
  const base = fixture();
  const unit = holdout(5);
  const observation = holdoutObservation(9, unit, "2026-09-20T10:00:00.000Z");
  observation.scope.query = "different query";

  assert.throws(
    () => buildExperimentHoldoutReport({
      ...base,
      design: design(),
      holdouts: [unit],
      holdoutObservations: [observation],
    }),
    /p10_4_observation_scope_mismatch/,
  );
});

test("tampered P10.3 treatment report fails exact integrity", () => {
  const base = fixture();
  const tampered = structuredClone(base.treatmentAnalysisReport);
  tampered.observations.total = 99;

  assert.throws(
    () => buildExperimentHoldoutReport({
      ...base,
      treatmentAnalysisReport: tampered,
      design: design(),
      holdouts: [],
      holdoutObservations: [],
    }),
    /p10_3_treatment_integrity_mismatch/,
  );
});

test("conflicting replay under one observation source identity fails closed", () => {
  const base = fixture();
  const unit = holdout(6);
  const first = holdoutObservation(10, unit, "2026-09-20T10:00:00.000Z");
  const second = {
    ...structuredClone(first),
    observedAt: "2026-09-20T10:01:00.000Z",
  };

  assert.throws(
    () => buildExperimentHoldoutReport({
      ...base,
      design: design(),
      holdouts: [unit],
      holdoutObservations: [first, second],
    }),
    /p10_4_observation_source_conflict/,
  );
});

test("reordering supplied holdouts and observations preserves report identity", () => {
  const base = fixture();
  const one = holdout(7);
  const two = holdout(8);
  const observations = [
    holdoutObservation(11, one, "2026-09-20T10:00:00.000Z"),
    holdoutObservation(12, one, "2026-09-20T12:00:00.000Z"),
    holdoutObservation(13, two, "2026-09-20T10:30:00.000Z"),
    holdoutObservation(14, two, "2026-09-20T13:00:00.000Z"),
  ];

  const first = buildExperimentHoldoutReport({
    ...base,
    design: design(),
    holdouts: [one, two],
    holdoutObservations: observations,
  });
  const second = buildExperimentHoldoutReport({
    ...base,
    design: design(),
    holdouts: [two, one],
    holdoutObservations: [...observations].reverse(),
  });

  assert.equal(first.reportFingerprint, second.reportFingerprint);
  assert.equal(first.reportId, second.reportId);
});

test("P10.4 safety and semantic guards remain closed", () => {
  const semantics = experimentHoldoutSemantics();
  assert.equal(semantics.externallyRandomizedDeclarationVerified, false);
  assert.equal(semantics.externallyMatchedDeclarationVerified, false);
  assert.equal(semantics.scopeDisjointnessEstablishesExchangeability, false);
  assert.equal(semantics.beforeAfterTimingEstablishesCausality, false);
  assert.equal(semantics.treatmentEffectCalculated, false);
  assert.equal(semantics.statisticalSignificanceCalculated, false);
  assert.equal(semantics.rolloutRecommendationGenerated, false);

  const capability = experimentHoldoutCapability();
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
  assert.equal(capability.p105ImplementationAuthorized, false);
  assert.equal(capability.publicationAuthorized, false);
});
