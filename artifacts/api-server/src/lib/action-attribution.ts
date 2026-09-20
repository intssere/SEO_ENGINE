import { createHash } from "node:crypto";
import {
  buildUnifiedChangeTimeline,
  UNIFIED_CHANGE_TIMELINE_VERSION,
  type UnifiedChangeTimelineReport,
  type UnifiedTimelineEvent,
  type UnifiedTimelineSourceEventInput,
} from "./unified-change-timeline.js";

export const ACTION_ATTRIBUTION_VERSION = "p10.2-action-attribution-v1" as const;
export const ACTION_ATTRIBUTION_MAX_ACTIONS = 2048 as const;

export type DirectAssociationStatus = "direct" | "unavailable";

export type ActionAttributionProvenance = {
  timelineEventId: string;
  timelineEventFingerprint: string;
  eventKind: UnifiedTimelineEvent["eventKind"];
  occurredAt: string;
  sourceSystem: string;
  sourceVersion: string;
  sourceEventId: string;
  sourceEventFingerprint: string | null;
};

export type PageAssociation = {
  pageId: string | null;
  url: string | null;
  associationFingerprint: string;
  provenance: ActionAttributionProvenance[];
};

export type ValueAssociation = {
  value: string;
  associationFingerprint: string;
  provenance: ActionAttributionProvenance[];
};

export type ActionAttribution = {
  version: typeof ACTION_ATTRIBUTION_VERSION;
  attributionId: string;
  attributionFingerprint: string;
  actionId: string;
  site: {
    siteId: string | null;
    domain: string | null;
  };
  lineage: {
    opportunityId: string | null;
    opportunityFingerprint: string | null;
    recommendationId: string | null;
    recommendationFingerprint: string | null;
    actionPlanId: string | null;
    proposalFingerprint: string | null;
  };
  pages: {
    status: DirectAssociationStatus;
    values: PageAssociation[];
  };
  queries: {
    status: DirectAssociationStatus;
    values: ValueAssociation[];
  };
  categories: {
    status: DirectAssociationStatus;
    values: ValueAssociation[];
  };
  sourceEventCount: number;
  sourceEventFingerprints: string[];
};

export type ActionAttributionReport = {
  version: typeof ACTION_ATTRIBUTION_VERSION;
  reportId: string;
  reportFingerprint: string;
  timelineId: string;
  timelineFingerprint: string;
  timelineKey: string;
  referenceTime: string;
  counts: {
    actions: number;
    withPageAssociation: number;
    withQueryAssociation: number;
    withCategoryAssociation: number;
    fullyAssociated: number;
  };
  actions: ActionAttribution[];
  semantics: ReturnType<typeof actionAttributionSemantics>;
  safety: ReturnType<typeof actionAttributionCapability>;
};

type MutablePageAssociation = {
  pageId: string | null;
  url: string | null;
  provenance: Map<string, ActionAttributionProvenance>;
};

type MutableValueAssociation = {
  value: string;
  provenance: Map<string, ActionAttributionProvenance>;
};

type MutableAction = {
  actionId: string;
  site: {
    siteId: string | null;
    domain: string | null;
  };
  lineage: {
    opportunityId: string | null;
    opportunityFingerprint: string | null;
    recommendationId: string | null;
    recommendationFingerprint: string | null;
    actionPlanId: string | null;
    proposalFingerprint: string | null;
  };
  pages: MutablePageAssociation[];
  queries: Map<string, MutableValueAssociation>;
  categories: Map<string, MutableValueAssociation>;
  sourceEventFingerprints: Set<string>;
};

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

function sourceEvent(event: UnifiedTimelineEvent): UnifiedTimelineSourceEventInput {
  return {
    occurredAt: event.occurredAt,
    eventClass: event.eventClass,
    eventKind: event.eventKind,
    source: event.source,
    site: event.site,
    lineage: event.lineage,
    target: event.target,
    associations: event.associations,
    state: event.state,
    sourceLineage: event.sourceLineage,
  };
}

function sortedTimelineEvents(events: UnifiedTimelineEvent[]): UnifiedTimelineEvent[] {
  return [...events].sort((a, b) =>
    a.occurredAt.localeCompare(b.occurredAt)
    || a.eventKind.localeCompare(b.eventKind)
    || a.eventFingerprint.localeCompare(b.eventFingerprint)
  );
}

function verifyTimeline(input: UnifiedChangeTimelineReport): UnifiedChangeTimelineReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_p10_2_timeline");
  }
  if (input.version !== UNIFIED_CHANGE_TIMELINE_VERSION) {
    throw new Error("unsupported_p10_1_timeline_version");
  }
  if (!Array.isArray(input.events)) throw new Error("invalid_p10_2_timeline_events");

  const rebuilt = buildUnifiedChangeTimeline({
    timelineKey: input.timelineKey,
    referenceTime: input.referenceTime,
    events: input.events.map(sourceEvent),
  });

  const suppliedCanonical = {
    ...input,
    events: sortedTimelineEvents(input.events),
  };
  const rebuiltCanonical = {
    ...rebuilt,
    events: sortedTimelineEvents(rebuilt.events),
  };
  if (canonicalJson(suppliedCanonical) !== canonicalJson(rebuiltCanonical)) {
    throw new Error("p10_1_timeline_integrity_mismatch");
  }
  return rebuilt;
}

function provenance(event: UnifiedTimelineEvent): ActionAttributionProvenance {
  return {
    timelineEventId: event.eventId,
    timelineEventFingerprint: event.eventFingerprint,
    eventKind: event.eventKind,
    occurredAt: event.occurredAt,
    sourceSystem: event.source.system,
    sourceVersion: event.source.version,
    sourceEventId: event.source.eventId,
    sourceEventFingerprint: event.source.eventFingerprint,
  };
}

function provenanceSort(
  a: ActionAttributionProvenance,
  b: ActionAttributionProvenance,
): number {
  return a.occurredAt.localeCompare(b.occurredAt)
    || a.timelineEventFingerprint.localeCompare(b.timelineEventFingerprint);
}

function mergeNullable(
  current: string | null,
  next: string | null,
  errorCode: string,
): string | null {
  if (current === null) return next;
  if (next === null || next === current) return current;
  throw new Error(errorCode);
}

function mergeActionLineage(action: MutableAction, event: UnifiedTimelineEvent): void {
  action.site.siteId = mergeNullable(
    action.site.siteId,
    event.site.siteId,
    "action_attribution_site_id_conflict",
  );
  action.site.domain = mergeNullable(
    action.site.domain,
    event.site.domain,
    "action_attribution_site_domain_conflict",
  );
  action.lineage.opportunityId = mergeNullable(
    action.lineage.opportunityId,
    event.lineage.opportunityId,
    "action_attribution_opportunity_id_conflict",
  );
  action.lineage.opportunityFingerprint = mergeNullable(
    action.lineage.opportunityFingerprint,
    event.lineage.opportunityFingerprint,
    "action_attribution_opportunity_fingerprint_conflict",
  );
  action.lineage.recommendationId = mergeNullable(
    action.lineage.recommendationId,
    event.lineage.recommendationId,
    "action_attribution_recommendation_id_conflict",
  );
  action.lineage.recommendationFingerprint = mergeNullable(
    action.lineage.recommendationFingerprint,
    event.lineage.recommendationFingerprint,
    "action_attribution_recommendation_fingerprint_conflict",
  );
  action.lineage.actionPlanId = mergeNullable(
    action.lineage.actionPlanId,
    event.lineage.actionPlanId,
    "action_attribution_action_plan_id_conflict",
  );
  action.lineage.proposalFingerprint = mergeNullable(
    action.lineage.proposalFingerprint,
    event.lineage.proposalFingerprint,
    "action_attribution_proposal_fingerprint_conflict",
  );
}

function addPageAssociation(
  action: MutableAction,
  event: UnifiedTimelineEvent,
): void {
  const pageId = event.target?.pageId ?? null;
  const url = event.target?.url ?? null;
  if (pageId === null && url === null) return;

  for (const existing of action.pages) {
    if (
      pageId !== null
      && existing.pageId === pageId
      && url !== null
      && existing.url !== null
      && existing.url !== url
    ) {
      throw new Error("action_attribution_page_id_url_conflict");
    }
    if (
      url !== null
      && existing.url === url
      && pageId !== null
      && existing.pageId !== null
      && existing.pageId !== pageId
    ) {
      throw new Error("action_attribution_page_url_id_conflict");
    }
  }

  const matches = action.pages.filter((existing) =>
    (pageId !== null && existing.pageId === pageId)
    || (url !== null && existing.url === url)
  );

  const p = provenance(event);
  if (matches.length === 0) {
    action.pages.push({
      pageId,
      url,
      provenance: new Map([[p.timelineEventFingerprint, p]]),
    });
    return;
  }

  let mergedPageId = pageId;
  let mergedUrl = url;
  const mergedProvenance = new Map<string, ActionAttributionProvenance>([
    [p.timelineEventFingerprint, p],
  ]);
  for (const match of matches) {
    mergedPageId = mergeNullable(
      mergedPageId,
      match.pageId,
      "action_attribution_page_id_conflict",
    );
    mergedUrl = mergeNullable(
      mergedUrl,
      match.url,
      "action_attribution_page_url_conflict",
    );
    for (const [key, value] of match.provenance) mergedProvenance.set(key, value);
  }

  action.pages = action.pages.filter((candidate) => !matches.includes(candidate));
  action.pages.push({
    pageId: mergedPageId,
    url: mergedUrl,
    provenance: mergedProvenance,
  });
}

function addValueAssociation(
  store: Map<string, MutableValueAssociation>,
  value: string | null,
  event: UnifiedTimelineEvent,
): void {
  if (value === null) return;
  const p = provenance(event);
  const current = store.get(value);
  if (current) {
    current.provenance.set(p.timelineEventFingerprint, p);
    return;
  }
  store.set(value, {
    value,
    provenance: new Map([[p.timelineEventFingerprint, p]]),
  });
}

function pageAssociations(action: MutableAction): PageAssociation[] {
  return action.pages
    .map((page) => {
      const provenanceValues = [...page.provenance.values()].sort(provenanceSort);
      const identity = {
        version: ACTION_ATTRIBUTION_VERSION,
        actionId: action.actionId,
        pageId: page.pageId,
        url: page.url,
        provenance: provenanceValues,
      };
      return {
        pageId: page.pageId,
        url: page.url,
        associationFingerprint: hash(identity),
        provenance: provenanceValues,
      };
    })
    .sort((a, b) =>
      (a.pageId ?? "").localeCompare(b.pageId ?? "")
      || (a.url ?? "").localeCompare(b.url ?? "")
      || a.associationFingerprint.localeCompare(b.associationFingerprint)
    );
}

function valueAssociations(
  action: MutableAction,
  dimension: "query" | "category",
  values: Map<string, MutableValueAssociation>,
): ValueAssociation[] {
  return [...values.values()]
    .map((association) => {
      const provenanceValues = [...association.provenance.values()].sort(provenanceSort);
      return {
        value: association.value,
        associationFingerprint: hash({
          version: ACTION_ATTRIBUTION_VERSION,
          actionId: action.actionId,
          dimension,
          value: association.value,
          provenance: provenanceValues,
        }),
        provenance: provenanceValues,
      };
    })
    .sort((a, b) =>
      a.value.localeCompare(b.value)
      || a.associationFingerprint.localeCompare(b.associationFingerprint)
    );
}

function materializeAction(action: MutableAction): ActionAttribution {
  const pages = pageAssociations(action);
  const queries = valueAssociations(action, "query", action.queries);
  const categories = valueAssociations(action, "category", action.categories);
  const sourceEventFingerprints = [...action.sourceEventFingerprints].sort();
  const identity = {
    version: ACTION_ATTRIBUTION_VERSION,
    actionId: action.actionId,
    site: action.site,
    lineage: action.lineage,
    pages,
    queries,
    categories,
    sourceEventFingerprints,
  };
  const attributionFingerprint = hash(identity);

  return {
    version: ACTION_ATTRIBUTION_VERSION,
    attributionId: `p102-action-${attributionFingerprint.slice(0, 24)}`,
    attributionFingerprint,
    actionId: action.actionId,
    site: action.site,
    lineage: action.lineage,
    pages: {
      status: pages.length > 0 ? "direct" : "unavailable",
      values: pages,
    },
    queries: {
      status: queries.length > 0 ? "direct" : "unavailable",
      values: queries,
    },
    categories: {
      status: categories.length > 0 ? "direct" : "unavailable",
      values: categories,
    },
    sourceEventCount: sourceEventFingerprints.length,
    sourceEventFingerprints,
  };
}

export function actionAttributionSemantics() {
  return Object.freeze({
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
}

export function actionAttributionCapability() {
  return Object.freeze({
    version: ACTION_ATTRIBUTION_VERSION,
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
}

export function buildActionAttribution(
  timelineInput: UnifiedChangeTimelineReport,
): ActionAttributionReport {
  const timeline = verifyTimeline(timelineInput);
  const actions = new Map<string, MutableAction>();

  for (const event of timeline.events) {
    const actionId = event.lineage.actionId;
    if (actionId === null) continue;

    let action = actions.get(actionId);
    if (!action) {
      if (actions.size >= ACTION_ATTRIBUTION_MAX_ACTIONS) {
        throw new Error("action_attribution_action_limit_exceeded");
      }
      action = {
        actionId,
        site: {
          siteId: null,
          domain: null,
        },
        lineage: {
          opportunityId: null,
          opportunityFingerprint: null,
          recommendationId: null,
          recommendationFingerprint: null,
          actionPlanId: null,
          proposalFingerprint: null,
        },
        pages: [],
        queries: new Map(),
        categories: new Map(),
        sourceEventFingerprints: new Set(),
      };
      actions.set(actionId, action);
    }

    mergeActionLineage(action, event);
    addPageAssociation(action, event);
    addValueAssociation(action.queries, event.associations.query, event);
    addValueAssociation(action.categories, event.associations.category, event);
    action.sourceEventFingerprints.add(event.eventFingerprint);
  }

  const materializedActions = [...actions.values()]
    .map(materializeAction)
    .sort((a, b) =>
      a.actionId.localeCompare(b.actionId)
      || a.attributionFingerprint.localeCompare(b.attributionFingerprint)
    );

  const counts = {
    actions: materializedActions.length,
    withPageAssociation: materializedActions.filter((action) => action.pages.status === "direct").length,
    withQueryAssociation: materializedActions.filter((action) => action.queries.status === "direct").length,
    withCategoryAssociation: materializedActions.filter((action) => action.categories.status === "direct").length,
    fullyAssociated: materializedActions.filter((action) =>
      action.pages.status === "direct"
      && action.queries.status === "direct"
      && action.categories.status === "direct"
    ).length,
  };
  const semantics = actionAttributionSemantics();
  const identity = {
    version: ACTION_ATTRIBUTION_VERSION,
    timelineId: timeline.timelineId,
    timelineFingerprint: timeline.timelineFingerprint,
    timelineKey: timeline.timelineKey,
    referenceTime: timeline.referenceTime,
    counts,
    actions: materializedActions,
    semantics,
  };
  const reportFingerprint = hash(identity);

  return {
    version: ACTION_ATTRIBUTION_VERSION,
    reportId: `p102-report-${reportFingerprint.slice(0, 24)}`,
    reportFingerprint,
    timelineId: timeline.timelineId,
    timelineFingerprint: timeline.timelineFingerprint,
    timelineKey: timeline.timelineKey,
    referenceTime: timeline.referenceTime,
    counts,
    actions: materializedActions,
    semantics,
    safety: actionAttributionCapability(),
  };
}
