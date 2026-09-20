import assert from "node:assert/strict";
import test from "node:test";
import {
  actionAttributionCapability,
  actionAttributionSemantics,
  buildActionAttribution,
} from "./action-attribution.js";
import {
  buildUnifiedChangeTimeline,
  type UnifiedTimelineSourceEventInput,
} from "./unified-change-timeline.js";

const fp = (value: number) => value.toString(16).padStart(64, "0");

function lineage(overrides: Partial<UnifiedTimelineSourceEventInput["lineage"]> = {}) {
  return {
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
    ...overrides,
  };
}

function event(input: {
  sourceId: string;
  actionId?: string | null;
  occurredAt?: string;
  pageId?: string | null;
  url?: string | null;
  query?: string | null;
  category?: string | null;
  actionPlanId?: string | null;
  opportunityId?: string | null;
  opportunityFingerprint?: string | null;
  recommendationId?: string | null;
  recommendationFingerprint?: string | null;
  proposalFingerprint?: string | null;
  resourceKind?: string | null;
}): UnifiedTimelineSourceEventInput {
  const hasTarget = input.pageId !== undefined
    || input.url !== undefined
    || input.resourceKind !== undefined;
  return {
    occurredAt: input.occurredAt ?? "2026-09-20T11:00:00.000Z",
    eventClass: "execution",
    eventKind: "action_authorized",
    source: {
      system: "task51_execution_authorization",
      version: "controlled_execution_foundation_v1",
      eventId: input.sourceId,
      eventFingerprint: fp(Number(input.sourceId.replace(/\D/g, "")) || 1),
    },
    site: {
      siteId: "site-1",
      domain: "diamondshelf.us",
    },
    lineage: lineage({
      actionId: input.actionId ?? null,
      actionPlanId: input.actionPlanId ?? "plan-1",
      opportunityId: input.opportunityId ?? "opportunity-1",
      opportunityFingerprint: input.opportunityFingerprint ?? fp(101),
      recommendationId: input.recommendationId ?? "recommendation-1",
      recommendationFingerprint: input.recommendationFingerprint ?? fp(102),
      proposalFingerprint: input.proposalFingerprint ?? fp(103),
    }),
    target: hasTarget ? {
      pageId: input.pageId ?? null,
      url: input.url ?? null,
      resourceKind: input.resourceKind ?? null,
      resourceId: null,
      field: "meta_description",
      beforeFingerprint: fp(201),
      afterFingerprint: fp(202),
    } : null,
    associations: {
      query: input.query ?? null,
      category: input.category ?? null,
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
}

function timeline(events: UnifiedTimelineSourceEventInput[]) {
  return buildUnifiedChangeTimeline({
    timelineKey: "diamond-shelf.change-history",
    referenceTime: "2026-09-20T12:00:00.000Z",
    events,
  });
}

test("P10.2 aggregates only direct same-action page/query/category evidence", () => {
  const report = buildActionAttribution(timeline([
    event({
      sourceId: "event-1",
      actionId: "action-1",
      pageId: "page-1",
      query: "mens fragrance",
      category: "fragrance",
    }),
    event({
      sourceId: "event-2",
      actionId: "action-1",
      pageId: "page-1",
      url: "https://diamondshelf.us/products/example",
      query: "luxury mens fragrance",
      category: "mens-fragrance",
      occurredAt: "2026-09-20T11:01:00.000Z",
    }),
    event({
      sourceId: "event-3",
      actionId: "action-1",
      url: "https://diamondshelf.us/products/example",
      query: "mens fragrance",
      category: "fragrance",
      occurredAt: "2026-09-20T11:02:00.000Z",
    }),
  ]));

  assert.equal(report.counts.actions, 1);
  assert.equal(report.counts.fullyAssociated, 1);
  const action = report.actions[0]!;
  assert.equal(action.actionId, "action-1");
  assert.equal(action.pages.status, "direct");
  assert.equal(action.pages.values.length, 1);
  assert.deepEqual(
    {
      pageId: action.pages.values[0]!.pageId,
      url: action.pages.values[0]!.url,
    },
    {
      pageId: "page-1",
      url: "https://diamondshelf.us/products/example",
    },
  );
  assert.equal(action.pages.values[0]!.provenance.length, 3);
  assert.deepEqual(
    action.queries.values.map((item) => item.value),
    ["luxury mens fragrance", "mens fragrance"],
  );
  assert.deepEqual(
    action.categories.values.map((item) => item.value),
    ["fragrance", "mens-fragrance"],
  );
  assert.equal(action.sourceEventCount, 3);
});

test("shared plan, opportunity, URL or time without explicit action ID creates no action association", () => {
  const direct = event({
    sourceId: "event-10",
    actionId: "action-10",
    pageId: "page-10",
    actionPlanId: "plan-shared",
    opportunityId: "opportunity-shared",
  });
  const nearbyButUnbound = event({
    sourceId: "event-11",
    actionId: null,
    pageId: "page-10",
    url: "https://diamondshelf.us/collections/mens",
    query: "must not inherit",
    category: "must-not-inherit",
    actionPlanId: "plan-shared",
    opportunityId: "opportunity-shared",
    occurredAt: "2026-09-20T11:00:00.001Z",
  });

  const report = buildActionAttribution(timeline([nearbyButUnbound, direct]));
  assert.equal(report.actions.length, 1);
  const action = report.actions[0]!;
  assert.equal(action.queries.status, "unavailable");
  assert.equal(action.categories.status, "unavailable");
  assert.deepEqual(action.queries.values, []);
  assert.deepEqual(action.categories.values, []);
  assert.equal(action.pages.values[0]!.url, null);
  assert.equal(report.semantics.temporalProximityCreatesAssociation, false);
  assert.equal(report.semantics.sharedActionPlanCreatesAssociation, false);
  assert.equal(report.semantics.matchingUrlWithoutActionIdCreatesAssociation, false);
});

test("actions with no direct dimension evidence preserve unavailable states", () => {
  const report = buildActionAttribution(timeline([
    event({
      sourceId: "event-20",
      actionId: "action-20",
    }),
  ]));
  const action = report.actions[0]!;
  assert.equal(action.pages.status, "unavailable");
  assert.equal(action.queries.status, "unavailable");
  assert.equal(action.categories.status, "unavailable");
  assert.deepEqual(action.pages.values, []);
  assert.deepEqual(action.queries.values, []);
  assert.deepEqual(action.categories.values, []);
});

test("resource kind and URL path do not infer category", () => {
  const report = buildActionAttribution(timeline([
    event({
      sourceId: "event-30",
      actionId: "action-30",
      pageId: "page-30",
      url: "https://diamondshelf.us/collections/fragrance",
      resourceKind: "collection",
    }),
  ]));
  const action = report.actions[0]!;
  assert.equal(action.categories.status, "unavailable");
  assert.deepEqual(action.categories.values, []);
  assert.equal(report.semantics.pagePathInferencePerformed, false);
  assert.equal(report.semantics.resourceKindCreatesCategory, false);
});

test("same page ID with conflicting direct URLs fails closed", () => {
  assert.throws(
    () => buildActionAttribution(timeline([
      event({
        sourceId: "event-40",
        actionId: "action-40",
        pageId: "page-40",
        url: "https://diamondshelf.us/products/a",
      }),
      event({
        sourceId: "event-41",
        actionId: "action-40",
        pageId: "page-40",
        url: "https://diamondshelf.us/products/b",
      }),
    ])),
    /action_attribution_page_id_url_conflict/,
  );
});

test("same URL with conflicting direct page IDs fails closed", () => {
  assert.throws(
    () => buildActionAttribution(timeline([
      event({
        sourceId: "event-50",
        actionId: "action-50",
        pageId: "page-50a",
        url: "https://diamondshelf.us/products/a",
      }),
      event({
        sourceId: "event-51",
        actionId: "action-50",
        pageId: "page-50b",
        url: "https://diamondshelf.us/products/a",
      }),
    ])),
    /action_attribution_page_url_id_conflict/,
  );
});

test("page-ID-only and URL-only evidence without a shared identifier remain separate", () => {
  const report = buildActionAttribution(timeline([
    event({
      sourceId: "event-60",
      actionId: "action-60",
      pageId: "page-60",
    }),
    event({
      sourceId: "event-61",
      actionId: "action-60",
      url: "https://diamondshelf.us/products/unlinked",
    }),
  ]));
  assert.equal(report.actions[0]!.pages.values.length, 2);
});

test("conflicting singular lineage for the same action fails closed", () => {
  assert.throws(
    () => buildActionAttribution(timeline([
      event({
        sourceId: "event-70",
        actionId: "action-70",
        actionPlanId: "plan-a",
      }),
      event({
        sourceId: "event-71",
        actionId: "action-70",
        actionPlanId: "plan-b",
      }),
    ])),
    /action_attribution_action_plan_id_conflict/,
  );
});

test("supplied P10.1 event ordering does not change P10.2 identity", () => {
  const sourceTimeline = timeline([
    event({
      sourceId: "event-80",
      actionId: "action-80",
      pageId: "page-80",
      query: "query b",
      category: "category b",
    }),
    event({
      sourceId: "event-81",
      actionId: "action-80",
      url: "https://diamondshelf.us/products/eighty",
      pageId: "page-80",
      query: "query a",
      category: "category a",
      occurredAt: "2026-09-20T11:01:00.000Z",
    }),
  ]);
  const shuffled = {
    ...sourceTimeline,
    events: [...sourceTimeline.events].reverse(),
  };

  const a = buildActionAttribution(sourceTimeline);
  const b = buildActionAttribution(shuffled);
  assert.equal(a.reportFingerprint, b.reportFingerprint);
  assert.equal(a.actions[0]!.attributionFingerprint, b.actions[0]!.attributionFingerprint);
});

test("tampered P10.1 event content fails exact timeline integrity", () => {
  const sourceTimeline = timeline([
    event({
      sourceId: "event-90",
      actionId: "action-90",
      query: "original query",
    }),
  ]);
  const tampered = structuredClone(sourceTimeline);
  tampered.events[0]!.associations.query = "tampered query";

  assert.throws(
    () => buildActionAttribution(tampered),
    /p10_1_timeline_integrity_mismatch/,
  );
});

test("P10.2 semantics and capability remain direct-only, read-only and non-causal", () => {
  assert.deepEqual(actionAttributionSemantics(), {
    directAssociationOnly: true,
    explicitActionIdJoinOnly: true,
    unavailableAssociationPreserved: true,
    exactTimelineIntegrityRequired: true,
    exactReplayDeduped: true,
    conflictingLineageFailsClosed: true,
    pagePathInferencePerformed: false,
    resourceKindCreatesCategory: false,
    sharedOpportunityCreatesAssociation: false,
    sharedActionPlanCreatesAssociation: false,
    matchingUrlWithoutActionIdCreatesAssociation: false,
    temporalProximityCreatesAssociation: false,
    temporalProximityCreatesCausality: false,
    measurementMovementCreatesAssociation: false,
    orderingCreatesAssociationStrength: false,
    semanticQueryExpansionPerformed: false,
    categoryTaxonomyInferencePerformed: false,
    causalAttributionPerformed: false,
    impactCalculated: false,
  });
  assert.deepEqual(actionAttributionCapability(), {
    version: "p10.2-action-attribution-v1",
    deterministicProjectionOnly: true,
    readOnlyArchitectureOnly: true,
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
    p103ImplementationAuthorized: false,
    automaticTransition: false,
    publicationAuthorized: false,
  });
});
