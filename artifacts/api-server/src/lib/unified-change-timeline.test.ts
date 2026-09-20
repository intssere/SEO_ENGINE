import assert from "node:assert/strict";
import test from "node:test";
import {
  buildUnifiedChangeTimeline,
  unifiedChangeTimelineCapability,
  unifiedChangeTimelineSemantics,
  type UnifiedTimelineEventClass,
  type UnifiedTimelineEventKind,
  type UnifiedTimelineSourceEventInput,
} from "./unified-change-timeline.js";

const fp = (value: number) => value.toString(16).padStart(64, "0");

const blankLineage = () => ({
  opportunityId: null,
  opportunityFingerprint: null,
  relatedOpportunityFingerprint: null,
  recommendationId: null,
  recommendationFingerprint: null,
  actionPlanId: null,
  proposalFingerprint: null,
  approvalId: null,
  actionId: null,
  authorizationFingerprint: null,
  deploymentId: null,
  verificationId: null,
  rollbackId: null,
});

function sourceEvent(input: {
  eventClass: UnifiedTimelineEventClass;
  eventKind: UnifiedTimelineEventKind;
  sourceId: string;
  occurredAt?: string;
  sourceFingerprint?: string | null;
  overrides?: Partial<UnifiedTimelineSourceEventInput>;
}): UnifiedTimelineSourceEventInput {
  const base: UnifiedTimelineSourceEventInput = {
    occurredAt: input.occurredAt ?? "2026-09-20T10:00:00.000Z",
    eventClass: input.eventClass,
    eventKind: input.eventKind,
    source: {
      system: input.eventClass === "measurement" ? "measurement_attribution" : "p8_governance",
      version: "v1",
      eventId: input.sourceId,
      eventFingerprint: input.sourceFingerprint ?? fp(1),
    },
    site: {
      siteId: "site-1",
      domain: "diamondshelf.us",
    },
    lineage: blankLineage(),
    target: null,
    associations: {
      query: null,
      category: null,
    },
    state: {
      terminal: null,
      providerMutationOccurred: null,
      verification: null,
      rollback: null,
      changeRetainedLive: null,
      manualInterventionRequired: null,
      measurementEligibility: null,
    },
    sourceLineage: [],
  };

  return {
    ...base,
    ...input.overrides,
    source: {
      ...base.source,
      ...(input.overrides?.source ?? {}),
    },
    site: {
      ...base.site,
      ...(input.overrides?.site ?? {}),
    },
    lineage: {
      ...base.lineage,
      ...(input.overrides?.lineage ?? {}),
    },
    associations: {
      ...base.associations,
      ...(input.overrides?.associations ?? {}),
    },
    state: {
      ...base.state,
      ...(input.overrides?.state ?? {}),
    },
  };
}

test("P10.1 is deterministic across input ordering and exact duplicate replay", () => {
  const proposal = sourceEvent({
    eventClass: "proposal",
    eventKind: "proposal_created",
    sourceId: "proposal-created-1",
    sourceFingerprint: fp(11),
    overrides: {
      lineage: {
        ...blankLineage(),
        actionPlanId: "plan-1",
        proposalFingerprint: fp(12),
      },
    },
  });
  const action = sourceEvent({
    eventClass: "execution",
    eventKind: "action_authorized",
    sourceId: "action-authorized-1",
    sourceFingerprint: fp(21),
    overrides: {
      source: {
        system: "task51_execution_authorization",
        version: "controlled_execution_foundation_v1",
        eventId: "action-authorized-1",
        eventFingerprint: fp(21),
      },
      lineage: {
        ...blankLineage(),
        actionPlanId: "plan-1",
        proposalFingerprint: fp(12),
        actionId: "action-1",
        authorizationFingerprint: fp(22),
      },
    },
  });
  const measurement = sourceEvent({
    eventClass: "measurement",
    eventKind: "measurement_pending",
    sourceId: "measurement-1",
    occurredAt: "2026-09-20T10:00:01.000Z",
    sourceFingerprint: fp(31),
    overrides: {
      state: {
        terminal: null,
        providerMutationOccurred: null,
        verification: null,
        rollback: null,
        changeRetainedLive: null,
        manualInterventionRequired: null,
        measurementEligibility: "pending",
      },
    },
  });

  const a = buildUnifiedChangeTimeline({
    timelineKey: "diamond-shelf.change-history",
    referenceTime: "2026-09-20T11:00:00.000Z",
    events: [measurement, action, proposal, proposal],
  });
  const b = buildUnifiedChangeTimeline({
    timelineKey: "diamond-shelf.change-history",
    referenceTime: "2026-09-20T11:00:00.000Z",
    events: [proposal, measurement, action],
  });

  assert.equal(a.timelineFingerprint, b.timelineFingerprint);
  assert.equal(a.counts.total, 3);
  assert.deepEqual(
    a.events.map((event) => event.eventKind),
    ["proposal_created", "action_authorized", "measurement_pending"],
  );
});

test("same claimed source identity with different canonical content fails closed", () => {
  const first = sourceEvent({
    eventClass: "proposal",
    eventKind: "proposal_created",
    sourceId: "same-source",
    sourceFingerprint: fp(41),
  });
  const conflicting = sourceEvent({
    eventClass: "proposal",
    eventKind: "proposal_created",
    sourceId: "same-source",
    sourceFingerprint: fp(42),
  });

  assert.throws(
    () => buildUnifiedChangeTimeline({
      timelineKey: "conflict.test",
      referenceTime: "2026-09-20T11:00:00.000Z",
      events: [first, conflicting],
    }),
    /timeline_source_event_conflict/,
  );
});

test("canonical timestamps are required and future events fail closed", () => {
  const offsetTimestamp = sourceEvent({
    eventClass: "proposal",
    eventKind: "proposal_created",
    sourceId: "bad-time",
    occurredAt: "2026-09-20T10:00:00+00:00",
  });
  assert.throws(
    () => buildUnifiedChangeTimeline({
      timelineKey: "time.test",
      referenceTime: "2026-09-20T11:00:00.000Z",
      events: [offsetTimestamp],
    }),
    /invalid_timeline_event_timestamp/,
  );

  const future = sourceEvent({
    eventClass: "proposal",
    eventKind: "proposal_created",
    sourceId: "future-event",
    occurredAt: "2026-09-20T12:00:00.000Z",
  });
  assert.throws(
    () => buildUnifiedChangeTimeline({
      timelineKey: "time.test",
      referenceTime: "2026-09-20T11:00:00.000Z",
      events: [future],
    }),
    /timeline_event_after_reference_time/,
  );
});

test("unknown lineage remains null and temporal proximity creates no association", () => {
  const recommendation = sourceEvent({
    eventClass: "recommendation",
    eventKind: "recommendation_review_emitted",
    sourceId: "recommendation-1",
    occurredAt: "2026-09-20T10:00:00.000Z",
    sourceFingerprint: fp(51),
    overrides: {
      source: {
        system: "p9.7_recommendation_generation",
        version: "p9-7-recommendation-generation-worker-v1",
        eventId: "recommendation-1",
        eventFingerprint: fp(51),
      },
      lineage: {
        ...blankLineage(),
        opportunityId: "opportunity-1",
        opportunityFingerprint: fp(52),
        recommendationId: "recommendation-1",
        recommendationFingerprint: fp(51),
      },
    },
  });
  const proposal = sourceEvent({
    eventClass: "proposal",
    eventKind: "proposal_created",
    sourceId: "proposal-nearby",
    occurredAt: "2026-09-20T10:00:00.001Z",
    sourceFingerprint: fp(53),
    overrides: {
      lineage: {
        ...blankLineage(),
        actionPlanId: "plan-nearby",
        proposalFingerprint: fp(54),
      },
    },
  });

  const report = buildUnifiedChangeTimeline({
    timelineKey: "no-inference.test",
    referenceTime: "2026-09-20T11:00:00.000Z",
    events: [proposal, recommendation],
  });
  const normalizedProposal = report.events.find((event) => event.eventKind === "proposal_created");
  assert.ok(normalizedProposal);
  assert.equal(normalizedProposal.lineage.opportunityId, null);
  assert.equal(normalizedProposal.lineage.opportunityFingerprint, null);
  assert.equal(normalizedProposal.lineage.recommendationId, null);
  assert.equal(report.semantics.temporalProximityCreatesLineage, false);
  assert.equal(report.semantics.temporalProximityCreatesAttribution, false);
});

test("event class/kind and state semantics are validated", () => {
  const wrongClass = sourceEvent({
    eventClass: "proposal",
    eventKind: "verification_passed",
    sourceId: "wrong-class",
    overrides: {
      state: {
        terminal: null,
        providerMutationOccurred: true,
        verification: "verified",
        rollback: null,
        changeRetainedLive: null,
        manualInterventionRequired: false,
        measurementEligibility: null,
      },
    },
  });
  assert.throws(
    () => buildUnifiedChangeTimeline({
      timelineKey: "semantic.test",
      referenceTime: "2026-09-20T11:00:00.000Z",
      events: [wrongClass],
    }),
    /timeline_event_class_kind_mismatch/,
  );

  const falseAcceptedWrite = sourceEvent({
    eventClass: "execution",
    eventKind: "provider_write_accepted",
    sourceId: "write-accepted",
    overrides: {
      state: {
        terminal: null,
        providerMutationOccurred: false,
        verification: "pending",
        rollback: null,
        changeRetainedLive: null,
        manualInterventionRequired: false,
        measurementEligibility: null,
      },
    },
  });
  assert.throws(
    () => buildUnifiedChangeTimeline({
      timelineKey: "semantic.test",
      referenceTime: "2026-09-20T11:00:00.000Z",
      events: [falseAcceptedWrite],
    }),
    /timeline_provider_write_state_mismatch/,
  );

  const uncertainButFalse = sourceEvent({
    eventClass: "execution",
    eventKind: "provider_write_outcome_uncertain",
    sourceId: "write-uncertain",
    overrides: {
      state: {
        terminal: null,
        providerMutationOccurred: false,
        verification: "unknown",
        rollback: "unknown",
        changeRetainedLive: null,
        manualInterventionRequired: true,
        measurementEligibility: null,
      },
    },
  });
  assert.throws(
    () => buildUnifiedChangeTimeline({
      timelineKey: "semantic.test",
      referenceTime: "2026-09-20T11:00:00.000Z",
      events: [uncertainButFalse],
    }),
    /timeline_uncertain_write_must_remain_unknown/,
  );
});

test("verified retained-live and measurement markers remain descriptive only", () => {
  const live = sourceEvent({
    eventClass: "execution",
    eventKind: "verified_change_retained_live",
    sourceId: "live-1",
    sourceFingerprint: fp(61),
    overrides: {
      source: {
        system: "task54_persistent_apply",
        version: "verified_persistent_single_action_production_apply_v1",
        eventId: "live-1",
        eventFingerprint: fp(61),
      },
      lineage: {
        ...blankLineage(),
        actionPlanId: "plan-1",
        actionId: "action-1",
        deploymentId: "deployment-1",
        verificationId: "verification-1",
      },
      state: {
        terminal: true,
        providerMutationOccurred: true,
        verification: "verified",
        rollback: "not_required",
        changeRetainedLive: true,
        manualInterventionRequired: false,
        measurementEligibility: "eligible",
      },
    },
  });
  const marker = sourceEvent({
    eventClass: "measurement",
    eventKind: "measurement_eligible",
    sourceId: "measurement-eligible-1",
    occurredAt: "2026-09-20T10:05:00.000Z",
    sourceFingerprint: fp(62),
    overrides: {
      lineage: {
        ...blankLineage(),
        actionPlanId: "plan-1",
        actionId: "action-1",
        deploymentId: "deployment-1",
        verificationId: "verification-1",
      },
      state: {
        terminal: null,
        providerMutationOccurred: null,
        verification: null,
        rollback: null,
        changeRetainedLive: null,
        manualInterventionRequired: null,
        measurementEligibility: "eligible",
      },
    },
  });

  const report = buildUnifiedChangeTimeline({
    timelineKey: "measurement.test",
    referenceTime: "2026-09-20T11:00:00.000Z",
    events: [marker, live],
  });
  assert.equal(report.counts.execution, 1);
  assert.equal(report.counts.measurement, 1);
  assert.equal(report.semantics.causalAttributionPerformed, false);
  assert.equal(report.semantics.metricMovementAttributedToAction, false);
  assert.equal(report.semantics.measurementImpactCalculated, false);
});

test("lineage references dedupe exact replay and reject conflicting fingerprints", () => {
  const base = sourceEvent({
    eventClass: "proposal",
    eventKind: "proposal_created",
    sourceId: "lineage-1",
    overrides: {
      sourceLineage: [
        { kind: "evidence", id: "evidence-1", fingerprint: fp(71) },
        { kind: "evidence", id: "evidence-1", fingerprint: fp(71) },
      ],
    },
  });
  const report = buildUnifiedChangeTimeline({
    timelineKey: "lineage.test",
    referenceTime: "2026-09-20T11:00:00.000Z",
    events: [base],
  });
  assert.equal(report.events[0]!.sourceLineage.length, 1);

  const conflicting = sourceEvent({
    eventClass: "proposal",
    eventKind: "proposal_created",
    sourceId: "lineage-2",
    overrides: {
      sourceLineage: [
        { kind: "evidence", id: "evidence-1", fingerprint: fp(71) },
        { kind: "evidence", id: "evidence-1", fingerprint: fp(72) },
      ],
    },
  });
  assert.throws(
    () => buildUnifiedChangeTimeline({
      timelineKey: "lineage.test",
      referenceTime: "2026-09-20T11:00:00.000Z",
      events: [conflicting],
    }),
    /timeline_source_lineage_conflict/,
  );
});

test("P10.1 capability remains read-only, non-runtime and non-autonomous", () => {
  assert.deepEqual(unifiedChangeTimelineSemantics(), {
    descriptiveChronologyOnly: true,
    callerSuppliedProjectionOnly: true,
    exactP67LifecycleReconstructionAvailable: true,
    exactDuplicateSourceReplayCollapsed: true,
    conflictingSourceReplayFailsClosed: true,
    unknownValuesRemainNull: true,
    causalAttributionPerformed: false,
    metricMovementAttributedToAction: false,
    temporalProximityCreatesLineage: false,
    temporalProximityCreatesAttribution: false,
    orderingCreatesPriority: false,
    orderingCreatesRisk: false,
    orderingCreatesExecutionPreference: false,
    recommendationQualityInferencePerformed: false,
    executionSuccessInferencePerformed: false,
    measurementImpactCalculated: false,
  });
  assert.deepEqual(unifiedChangeTimelineCapability(), {
    version: "p10.1-unified-change-timeline-v1",
    deterministicProjectionOnly: true,
    readOnlyArchitectureOnly: true,
    wallClockAccess: false,
    timerActivated: false,
    schedulerActivated: false,
    liveWorkerEnabled: false,
    liveRetryLoopEnabled: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    productionDbReadAuthorized: false,
    productionDbWriteAuthorized: false,
    schemaMutationAuthorized: false,
    providerNetworkReadAuthorized: false,
    providerCredentialUseAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
    proposalPersistenceAuthorized: false,
    approvalGrantAuthorized: false,
    executionAuthorizationCreated: false,
    task51ExecutionAuthorized: false,
    task53ExecutionAuthorized: false,
    task54ExecutionAuthorized: false,
    autonomousMutationAuthorized: false,
    p98ImplementationAuthorized: false,
    automaticTransition: false,
    publicationAuthorized: false,
  });
});
