import assert from "node:assert/strict";
import test from "node:test";
import {
  buildActionAttribution,
} from "./action-attribution.js";
import {
  buildActionWindowConfounderReport,
  windowConfounderCapability,
  windowConfounderSemantics,
  type P103ExternalConfounderInput,
  type P103ObservationInput,
} from "./action-window-confounder.js";
import {
  buildUnifiedChangeTimeline,
  type UnifiedTimelineEventKind,
  type UnifiedTimelineSourceEventInput,
} from "./unified-change-timeline.js";

const fp = (value: number) => value.toString(16).padStart(64, "0");

function lineage(overrides: Partial<UnifiedTimelineSourceEventInput["lineage"]> = {}) {
  return {
    opportunityId: "opportunity-1",
    opportunityFingerprint: fp(101),
    relatedOpportunityFingerprint: null,
    recommendationId: "recommendation-1",
    recommendationFingerprint: fp(102),
    actionPlanId: "plan-1",
    proposalFingerprint: fp(103),
    approvalId: null,
    actionId: null,
    authorizationFingerprint: null,
    deploymentId: null,
    verificationId: null,
    rollbackId: null,
    ...overrides,
  };
}

function event(input: {
  id: number;
  actionId: string | null;
  occurredAt: string;
  eventKind?: UnifiedTimelineEventKind;
  pageId?: string | null;
  url?: string | null;
  query?: string | null;
  category?: string | null;
}): UnifiedTimelineSourceEventInput {
  const eventKind = input.eventKind ?? "action_authorized";
  const eventClass = eventKind.startsWith("opportunity_")
      ? "opportunity"
      : eventKind === "recommendation_review_emitted"
        ? "recommendation"
        : eventKind.startsWith("proposal_")
          || eventKind.startsWith("authorization_")
          ? "proposal"
          : eventKind === "measurement_eligible"
            || eventKind === "measurement_pending"
            || eventKind === "measurement_unavailable"
            ? "measurement"
            : "execution";

  return {
    occurredAt: input.occurredAt,
    eventClass,
    eventKind,
    source: {
      system: "synthetic_p10_3_fixture",
      version: "v1",
      eventId: `event-${input.id}`,
      eventFingerprint: fp(input.id),
    },
    site: {
      siteId: "site-1",
      domain: "diamondshelf.us",
    },
    lineage: lineage({
      actionId: input.actionId,
      rollbackId: eventKind.startsWith("rollback_") ? `rollback-${input.id}` : null,
    }),
    target: {
      pageId: input.pageId ?? "page-1",
      url: input.url ?? "https://diamondshelf.us/products/example",
      resourceKind: "product",
      resourceId: "product-1",
      field: "meta_description",
      beforeFingerprint: fp(201),
      afterFingerprint: fp(202),
    },
    associations: {
      query: input.query ?? "mens fragrance",
      category: input.category ?? "fragrance",
    },
    state: {
      terminal: null,
      providerMutationOccurred: eventKind === "provider_write_accepted"
        || eventKind === "verified_change_retained_live"
        ? true
        : eventKind === "provider_write_outcome_uncertain"
          ? null
          : null,
      verification: eventKind === "verification_passed"
        || eventKind === "verified_change_retained_live"
        ? "verified"
        : eventKind === "verification_failed"
          ? "failed"
          : null,
      rollback: eventKind === "rollback_started"
        ? "pending"
        : eventKind === "rollback_verified"
          ? "verified"
          : eventKind === "rollback_failed"
            ? "failed"
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

function fixture(events: UnifiedTimelineSourceEventInput[]) {
  const timeline = buildUnifiedChangeTimeline({
    timelineKey: "diamond-shelf.p10-3",
    referenceTime: "2026-09-20T15:00:00.000Z",
    events,
  });
  return {
    timeline,
    attribution: buildActionAttribution(timeline),
  };
}

function observation(
  id: number,
  observedAt: string,
  overrides: Partial<P103ObservationInput["scope"]> = {},
): P103ObservationInput {
  return {
    observedAt,
    source: {
      system: "gsc_supplied_fixture",
      version: "v1",
      eventId: `observation-${id}`,
      eventFingerprint: fp(500 + id),
    },
    scope: {
      siteId: null,
      domain: null,
      pageId: "page-1",
      url: null,
      query: "mens fragrance",
      category: null,
      ...overrides,
    },
  };
}

function externalFact(
  id: number,
  startsAt: string,
  endsAt: string,
): P103ExternalConfounderInput {
  return {
    kind: "tracking_change",
    startsAt,
    endsAt,
    source: {
      system: "explicit_external_fixture",
      version: "v1",
      eventId: `external-${id}`,
      eventFingerprint: fp(700 + id),
    },
    scope: {
      siteId: "site-1",
      domain: null,
      pageId: null,
      url: null,
      query: null,
      category: null,
    },
  };
}

function retainedAnchor(timeline: ReturnType<typeof buildUnifiedChangeTimeline>, actionId: string) {
  return timeline.events.find(
    (candidate) =>
      candidate.lineage.actionId === actionId
      && candidate.eventKind === "verified_change_retained_live",
  )!;
}

test("P10.3 classifies exact direct observations into supplied before/after windows", () => {
  const { timeline, attribution } = fixture([
    event({
      id: 1,
      actionId: "action-1",
      occurredAt: "2026-09-20T10:00:00.000Z",
      eventKind: "action_authorized",
    }),
    event({
      id: 2,
      actionId: "action-1",
      occurredAt: "2026-09-20T11:00:00.000Z",
      eventKind: "verified_change_retained_live",
    }),
  ]);
  const anchor = retainedAnchor(timeline, "action-1");

  const report = buildActionWindowConfounderReport({
    timeline,
    attribution,
    actionId: "action-1",
    anchorEventFingerprint: anchor.eventFingerprint,
    beforeWindow: {
      start: "2026-09-20T09:00:00.000Z",
      end: "2026-09-20T10:59:59.999Z",
    },
    afterWindow: {
      start: "2026-09-20T11:00:00.001Z",
      end: "2026-09-20T13:00:00.000Z",
    },
    observations: [
      observation(1, "2026-09-20T09:30:00.000Z"),
      observation(2, "2026-09-20T12:00:00.000Z"),
      observation(3, "2026-09-20T14:00:00.000Z"),
      observation(4, "2026-09-20T12:10:00.000Z", { pageId: "page-other" }),
    ],
    externalConfounders: [],
  });

  assert.equal(report.anchor.status, "available");
  assert.equal(report.observations.before, 1);
  assert.equal(report.observations.after, 1);
  assert.equal(report.observations.outside, 1);
  assert.equal(report.observations.unassociated, 1);
  assert.deepEqual(
    report.observations.values.map((item) => item.membership),
    ["before", "after", "unassociated", "outside"],
  );
  assert.equal(report.semantics.windowMembershipCreatesCausality, false);
  assert.equal(report.semantics.impactCalculated, false);
});

test("anchor must be exact same-action retained-live evidence", () => {
  const { timeline, attribution } = fixture([
    event({
      id: 10,
      actionId: "action-10",
      occurredAt: "2026-09-20T10:00:00.000Z",
      eventKind: "verification_passed",
    }),
  ]);
  const verification = timeline.events[0]!;

  assert.throws(
    () => buildActionWindowConfounderReport({
      timeline,
      attribution,
      actionId: "action-10",
      anchorEventFingerprint: verification.eventFingerprint,
      beforeWindow: null,
      afterWindow: null,
      observations: [],
      externalConfounders: [],
    }),
    /p10_3_anchor_must_be_verified_change_retained_live/,
  );
});

test("missing anchor preserves unavailable windows instead of inferring one", () => {
  const { timeline, attribution } = fixture([
    event({
      id: 20,
      actionId: "action-20",
      occurredAt: "2026-09-20T10:00:00.000Z",
      eventKind: "action_authorized",
    }),
  ]);

  const report = buildActionWindowConfounderReport({
    timeline,
    attribution,
    actionId: "action-20",
    anchorEventFingerprint: null,
    beforeWindow: null,
    afterWindow: null,
    observations: [observation(20, "2026-09-20T10:30:00.000Z")],
    externalConfounders: [],
  });

  assert.equal(report.anchor.status, "unavailable");
  assert.equal(report.windows.before.status, "unavailable");
  assert.equal(report.windows.after.status, "unavailable");
  assert.equal(report.observations.windowUnavailable, 1);
});

test("windows must remain strictly outside the anchor instant", () => {
  const { timeline, attribution } = fixture([
    event({
      id: 30,
      actionId: "action-30",
      occurredAt: "2026-09-20T11:00:00.000Z",
      eventKind: "verified_change_retained_live",
    }),
  ]);
  const anchor = retainedAnchor(timeline, "action-30");

  assert.throws(
    () => buildActionWindowConfounderReport({
      timeline,
      attribution,
      actionId: "action-30",
      anchorEventFingerprint: anchor.eventFingerprint,
      beforeWindow: {
        start: "2026-09-20T10:00:00.000Z",
        end: "2026-09-20T11:00:00.000Z",
      },
      afterWindow: null,
      observations: [],
      externalConfounders: [],
    }),
    /p10_3_before_window_must_precede_anchor/,
  );
});

test("same-action uncertain write, rollback and manual intervention are descriptive confounders", () => {
  const { timeline, attribution } = fixture([
    event({
      id: 40,
      actionId: "action-40",
      occurredAt: "2026-09-20T11:00:00.000Z",
      eventKind: "verified_change_retained_live",
    }),
    event({
      id: 41,
      actionId: "action-40",
      occurredAt: "2026-09-20T12:00:00.000Z",
      eventKind: "provider_write_outcome_uncertain",
    }),
    event({
      id: 42,
      actionId: "action-40",
      occurredAt: "2026-09-20T12:10:00.000Z",
      eventKind: "rollback_started",
    }),
    event({
      id: 43,
      actionId: "action-40",
      occurredAt: "2026-09-20T12:20:00.000Z",
      eventKind: "manual_intervention_required",
    }),
  ]);
  const anchor = retainedAnchor(timeline, "action-40");

  const report = buildActionWindowConfounderReport({
    timeline,
    attribution,
    actionId: "action-40",
    anchorEventFingerprint: anchor.eventFingerprint,
    beforeWindow: null,
    afterWindow: {
      start: "2026-09-20T11:00:00.001Z",
      end: "2026-09-20T13:00:00.000Z",
    },
    observations: [],
    externalConfounders: [],
  });

  assert.equal(report.confounders.sameActionUncertainWrite, 1);
  assert.equal(report.confounders.sameActionRollback, 1);
  assert.equal(report.confounders.sameActionManualIntervention, 1);
  assert.equal(report.semantics.confounderOverlapCreatesCausalAdjustment, false);
});

test("another retained-live action flags only when exact direct association overlaps", () => {
  const { timeline, attribution } = fixture([
    event({
      id: 50,
      actionId: "action-a",
      occurredAt: "2026-09-20T11:00:00.000Z",
      eventKind: "verified_change_retained_live",
      pageId: "page-1",
    }),
    event({
      id: 51,
      actionId: "action-b",
      occurredAt: "2026-09-20T12:00:00.000Z",
      eventKind: "verified_change_retained_live",
      pageId: "page-1",
    }),
    event({
      id: 52,
      actionId: "action-c",
      occurredAt: "2026-09-20T12:10:00.000Z",
      eventKind: "verified_change_retained_live",
      pageId: "page-unrelated",
      url: "https://diamondshelf.us/products/unrelated",
      query: "unrelated query",
      category: "other",
    }),
  ]);
  const anchor = retainedAnchor(timeline, "action-a");

  const report = buildActionWindowConfounderReport({
    timeline,
    attribution,
    actionId: "action-a",
    anchorEventFingerprint: anchor.eventFingerprint,
    beforeWindow: null,
    afterWindow: {
      start: "2026-09-20T11:00:00.001Z",
      end: "2026-09-20T13:00:00.000Z",
    },
    observations: [],
    externalConfounders: [],
  });

  assert.equal(report.confounders.overlappingDirectAction, 1);
  const overlap = report.confounders.values.find(
    (item) => item.kind === "overlapping_direct_action",
  )!;
  assert.equal(overlap.relatedActionId, "action-b");
  assert.ok(overlap.sharedAssociations.includes("page_id:page-1"));
});

test("explicit external confounder requires exact scope and interval overlap", () => {
  const { timeline, attribution } = fixture([
    event({
      id: 60,
      actionId: "action-60",
      occurredAt: "2026-09-20T11:00:00.000Z",
      eventKind: "verified_change_retained_live",
    }),
  ]);
  const anchor = retainedAnchor(timeline, "action-60");

  const report = buildActionWindowConfounderReport({
    timeline,
    attribution,
    actionId: "action-60",
    anchorEventFingerprint: anchor.eventFingerprint,
    beforeWindow: null,
    afterWindow: {
      start: "2026-09-20T11:00:00.001Z",
      end: "2026-09-20T13:00:00.000Z",
    },
    observations: [],
    externalConfounders: [
      externalFact(
        1,
        "2026-09-20T11:30:00.000Z",
        "2026-09-20T12:30:00.000Z",
      ),
      {
        ...externalFact(
          2,
          "2026-09-20T11:30:00.000Z",
          "2026-09-20T12:30:00.000Z",
        ),
        scope: {
          siteId: "other-site",
          domain: null,
          pageId: null,
          url: null,
          query: null,
          category: null,
        },
      },
    ],
  });

  assert.equal(report.confounders.externalSupplied, 1);
  assert.equal(
    report.confounders.values.find((item) => item.kind === "external_supplied")!.externalKind,
    "tracking_change",
  );
});

test("tampered P10.2 attribution fails exact integrity", () => {
  const { timeline, attribution } = fixture([
    event({
      id: 70,
      actionId: "action-70",
      occurredAt: "2026-09-20T11:00:00.000Z",
      eventKind: "verified_change_retained_live",
    }),
  ]);
  const tampered = structuredClone(attribution);
  tampered.counts.actions = 99;

  assert.throws(
    () => buildActionWindowConfounderReport({
      timeline,
      attribution: tampered,
      actionId: "action-70",
      anchorEventFingerprint: null,
      beforeWindow: null,
      afterWindow: null,
      observations: [],
      externalConfounders: [],
    }),
    /p10_2_attribution_integrity_mismatch/,
  );
});

test("reordering supplied observations and external facts does not change report identity", () => {
  const { timeline, attribution } = fixture([
    event({
      id: 80,
      actionId: "action-80",
      occurredAt: "2026-09-20T11:00:00.000Z",
      eventKind: "verified_change_retained_live",
    }),
  ]);
  const anchor = retainedAnchor(timeline, "action-80");
  const observations = [
    observation(81, "2026-09-20T10:00:00.000Z"),
    observation(82, "2026-09-20T12:00:00.000Z"),
  ];
  const facts = [
    externalFact(81, "2026-09-20T09:30:00.000Z", "2026-09-20T10:30:00.000Z"),
    externalFact(82, "2026-09-20T11:30:00.000Z", "2026-09-20T12:30:00.000Z"),
  ];
  const base = {
    timeline,
    attribution,
    actionId: "action-80",
    anchorEventFingerprint: anchor.eventFingerprint,
    beforeWindow: {
      start: "2026-09-20T09:00:00.000Z",
      end: "2026-09-20T10:59:59.999Z",
    },
    afterWindow: {
      start: "2026-09-20T11:00:00.001Z",
      end: "2026-09-20T13:00:00.000Z",
    },
  };

  const first = buildActionWindowConfounderReport({
    ...base,
    observations,
    externalConfounders: facts,
  });
  const second = buildActionWindowConfounderReport({
    ...base,
    observations: [...observations].reverse(),
    externalConfounders: [...facts].reverse(),
  });

  assert.equal(first.reportFingerprint, second.reportFingerprint);
  assert.equal(first.reportId, second.reportId);
});

test("conflicting same source identity fails closed", () => {
  const { timeline, attribution } = fixture([
    event({
      id: 90,
      actionId: "action-90",
      occurredAt: "2026-09-20T11:00:00.000Z",
      eventKind: "verified_change_retained_live",
    }),
  ]);
  const anchor = retainedAnchor(timeline, "action-90");
  const first = observation(90, "2026-09-20T10:00:00.000Z");
  const second = {
    ...first,
    observedAt: "2026-09-20T10:01:00.000Z",
  };

  assert.throws(
    () => buildActionWindowConfounderReport({
      timeline,
      attribution,
      actionId: "action-90",
      anchorEventFingerprint: anchor.eventFingerprint,
      beforeWindow: {
        start: "2026-09-20T09:00:00.000Z",
        end: "2026-09-20T10:59:59.999Z",
      },
      afterWindow: null,
      observations: [first, second],
      externalConfounders: [],
    }),
    /p10_3_observation_source_conflict/,
  );
});

test("P10.3 semantic and capability guards remain closed", () => {
  const semantics = windowConfounderSemantics();
  assert.equal(semantics.directP10_2ScopeOnly, true);
  assert.equal(semantics.actionAssociationCreatesCausality, false);
  assert.equal(semantics.windowMembershipCreatesCausality, false);
  assert.equal(semantics.metricDeltaCalculated, false);
  assert.equal(semantics.recommendationGenerated, false);
  assert.equal(semantics.causalAttributionPerformed, false);
  assert.equal(semantics.impactCalculated, false);

  const capability = windowConfounderCapability();
  assert.equal(capability.databaseReadsAuthorized, false);
  assert.equal(capability.databaseWritesAuthorized, false);
  assert.equal(capability.providerNetworkReadAuthorized, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.task51ExecutionAuthorized, false);
  assert.equal(capability.task53ExecutionAuthorized, false);
  assert.equal(capability.task54ExecutionAuthorized, false);
  assert.equal(capability.autonomousMutationAuthorized, false);
  assert.equal(capability.p104ImplementationAuthorized, false);
  assert.equal(capability.publicationAuthorized, false);
});
