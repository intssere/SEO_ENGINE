import { createHash } from "node:crypto";
import {
  ACTION_ATTRIBUTION_VERSION,
  buildActionAttribution,
  type ActionAttribution,
  type ActionAttributionReport,
} from "./action-attribution.js";
import {
  UNIFIED_CHANGE_TIMELINE_VERSION,
  type UnifiedChangeTimelineReport,
  type UnifiedTimelineEvent,
} from "./unified-change-timeline.js";

export const WINDOW_CONFOUNDER_VERSION = "p10.3-window-confounder-v1" as const;
export const WINDOW_CONFOUNDER_MAX_OBSERVATIONS = 4096 as const;
export const WINDOW_CONFOUNDER_MAX_EXTERNAL_FACTS = 1024 as const;

export type WindowAvailability = "available" | "unavailable";
export type WindowMembership =
  | "before"
  | "after"
  | "outside"
  | "unassociated"
  | "window_unavailable";

export type AnalysisWindowInput = {
  start: string;
  end: string;
};

export type AnalysisWindow = AnalysisWindowInput & {
  status: "available";
};

export type WindowState =
  | AnalysisWindow
  | {
      status: "unavailable";
      start: null;
      end: null;
    };

export type P103SourceIdentity = {
  system: string;
  version: string;
  eventId: string;
  eventFingerprint: string | null;
};

export type P103Scope = {
  siteId: string | null;
  domain: string | null;
  pageId: string | null;
  url: string | null;
  query: string | null;
  category: string | null;
};

export type P103ObservationInput = {
  observedAt: string;
  source: P103SourceIdentity;
  scope: P103Scope;
};

export type P103ExternalConfounderKind =
  | "sitewide_release"
  | "tracking_change"
  | "search_engine_update"
  | "external_campaign"
  | "inventory_or_price_change"
  | "seasonality_event"
  | "other_explicit";

export type P103ExternalConfounderInput = {
  kind: P103ExternalConfounderKind;
  startsAt: string;
  endsAt: string;
  source: P103SourceIdentity;
  scope: P103Scope;
};

export type ClassifiedObservation = {
  observationId: string;
  observationFingerprint: string;
  observedAt: string;
  source: P103SourceIdentity;
  scope: P103Scope;
  membership: WindowMembership;
};

export type P103ConfounderKind =
  | "same_action_uncertain_write"
  | "same_action_rollback"
  | "same_action_manual_intervention"
  | "overlapping_direct_action"
  | "external_supplied";

export type ConfounderFlag = {
  flagId: string;
  flagFingerprint: string;
  kind: P103ConfounderKind;
  window: "before" | "after";
  evidenceTime: string | null;
  evidenceInterval: {
    start: string;
    end: string;
  } | null;
  timelineEventFingerprint: string | null;
  relatedActionId: string | null;
  externalKind: P103ExternalConfounderKind | null;
  source: P103SourceIdentity | null;
  sharedAssociations: string[];
};

export type ActionWindowConfounderInput = {
  timeline: UnifiedChangeTimelineReport;
  attribution: ActionAttributionReport;
  actionId: string;
  anchorEventFingerprint: string | null;
  beforeWindow: AnalysisWindowInput | null;
  afterWindow: AnalysisWindowInput | null;
  observations: P103ObservationInput[];
  externalConfounders: P103ExternalConfounderInput[];
};

export type ActionWindowConfounderReport = {
  version: typeof WINDOW_CONFOUNDER_VERSION;
  reportId: string;
  reportFingerprint: string;
  timelineId: string;
  timelineFingerprint: string;
  attributionReportId: string;
  attributionReportFingerprint: string;
  actionId: string;
  actionAttributionFingerprint: string;
  anchor: {
    status: WindowAvailability;
    timelineEventId: string | null;
    timelineEventFingerprint: string | null;
    occurredAt: string | null;
    eventKind: "verified_change_retained_live" | null;
  };
  windows: {
    before: WindowState;
    after: WindowState;
  };
  observations: {
    total: number;
    before: number;
    after: number;
    outside: number;
    unassociated: number;
    windowUnavailable: number;
    values: ClassifiedObservation[];
  };
  confounders: {
    total: number;
    sameActionUncertainWrite: number;
    sameActionRollback: number;
    sameActionManualIntervention: number;
    overlappingDirectAction: number;
    externalSupplied: number;
    values: ConfounderFlag[];
  };
  semantics: ReturnType<typeof windowConfounderSemantics>;
  safety: ReturnType<typeof windowConfounderCapability>;
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

function canonicalTimestamp(value: unknown, errorCode: string): string {
  if (typeof value !== "string") throw new Error(errorCode);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(errorCode);
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) throw new Error(errorCode);
  return canonical;
}

function exactString(value: unknown, errorCode: string, maxLength = 512): string {
  if (typeof value !== "string" || value.length < 1 || value.length > maxLength || value.trim() !== value) {
    throw new Error(errorCode);
  }
  return value;
}

function nullableExactString(value: unknown, errorCode: string, maxLength = 512): string | null {
  if (value === null) return null;
  return exactString(value, errorCode, maxLength);
}

function nullableFingerprint(value: unknown, errorCode: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !HEX_64.test(value)) throw new Error(errorCode);
  return value;
}

function normalizeKey(value: unknown, errorCode: string): string {
  const exact = exactString(value, errorCode, 128);
  if (!KEY.test(exact)) throw new Error(errorCode);
  return exact;
}

function normalizeSourceVersion(value: unknown): string {
  const exact = exactString(value, "invalid_p10_3_source_version", 128);
  if (!SOURCE_VERSION.test(exact)) throw new Error("invalid_p10_3_source_version");
  return exact;
}

function normalizeDomain(value: unknown): string | null {
  if (value === null) return null;
  const domain = exactString(value, "invalid_p10_3_scope_domain", 253);
  if (domain !== domain.toLowerCase() || !/^[a-z0-9.-]+$/.test(domain)) {
    throw new Error("invalid_p10_3_scope_domain");
  }
  return domain;
}

function normalizeUrl(value: unknown): string | null {
  if (value === null) return null;
  const url = exactString(value, "invalid_p10_3_scope_url", 2048);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("invalid_p10_3_scope_url");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("invalid_p10_3_scope_url");
  }
  return url;
}

function normalizeSource(source: P103SourceIdentity): P103SourceIdentity {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("invalid_p10_3_source");
  }
  return {
    system: normalizeKey(source.system, "invalid_p10_3_source_system"),
    version: normalizeSourceVersion(source.version),
    eventId: exactString(source.eventId, "invalid_p10_3_source_event_id", 512),
    eventFingerprint: nullableFingerprint(
      source.eventFingerprint,
      "invalid_p10_3_source_event_fingerprint",
    ),
  };
}

function normalizeScope(scope: P103Scope): P103Scope {
  if (!scope || typeof scope !== "object" || Array.isArray(scope)) {
    throw new Error("invalid_p10_3_scope");
  }
  return {
    siteId: nullableExactString(scope.siteId, "invalid_p10_3_scope_site_id"),
    domain: normalizeDomain(scope.domain),
    pageId: nullableExactString(scope.pageId, "invalid_p10_3_scope_page_id"),
    url: normalizeUrl(scope.url),
    query: nullableExactString(scope.query, "invalid_p10_3_scope_query", 2048),
    category: nullableExactString(scope.category, "invalid_p10_3_scope_category", 256),
  };
}

function sourceIdentityKey(source: P103SourceIdentity): string {
  return `${source.system}\u0000${source.version}\u0000${source.eventId}`;
}

function verifyAttribution(
  timeline: UnifiedChangeTimelineReport,
  supplied: ActionAttributionReport,
): ActionAttributionReport {
  if (!timeline || typeof timeline !== "object" || Array.isArray(timeline)) {
    throw new Error("invalid_p10_3_timeline");
  }
  if (timeline.version !== UNIFIED_CHANGE_TIMELINE_VERSION) {
    throw new Error("unsupported_p10_1_timeline_version");
  }
  if (!supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
    throw new Error("invalid_p10_3_attribution");
  }
  if (supplied.version !== ACTION_ATTRIBUTION_VERSION) {
    throw new Error("unsupported_p10_2_attribution_version");
  }

  const rebuilt = buildActionAttribution(timeline);
  if (canonicalJson(supplied) !== canonicalJson(rebuilt)) {
    throw new Error("p10_2_attribution_integrity_mismatch");
  }
  if (
    rebuilt.timelineId !== timeline.timelineId
    || rebuilt.timelineFingerprint !== timeline.timelineFingerprint
  ) {
    throw new Error("p10_3_timeline_attribution_binding_mismatch");
  }
  return rebuilt;
}

function normalizeWindow(
  value: AnalysisWindowInput | null,
  side: "before" | "after",
  anchorAt: string | null,
): WindowState {
  if (value === null) {
    return {
      status: "unavailable",
      start: null,
      end: null,
    };
  }
  if (anchorAt === null) throw new Error("p10_3_anchor_required_for_windows");
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`invalid_p10_3_${side}_window`);
  }

  const start = canonicalTimestamp(value.start, `invalid_p10_3_${side}_window_start`);
  const end = canonicalTimestamp(value.end, `invalid_p10_3_${side}_window_end`);
  if (start > end) throw new Error(`p10_3_${side}_window_order_invalid`);

  if (side === "before" && end >= anchorAt) {
    throw new Error("p10_3_before_window_must_precede_anchor");
  }
  if (side === "after" && start <= anchorAt) {
    throw new Error("p10_3_after_window_must_follow_anchor");
  }

  return {
    status: "available",
    start,
    end,
  };
}

function contains(window: WindowState, timestamp: string): boolean {
  return window.status === "available"
    && timestamp >= window.start
    && timestamp <= window.end;
}

function intervalOverlaps(window: WindowState, start: string, end: string): boolean {
  return window.status === "available" && start <= window.end && end >= window.start;
}

function findAction(
  attribution: ActionAttributionReport,
  actionId: string,
): ActionAttribution {
  const action = attribution.actions.find((candidate) => candidate.actionId === actionId);
  if (!action) throw new Error("p10_3_action_not_found");
  return action;
}

function pageScopeMatches(action: ActionAttribution, scope: P103Scope): boolean {
  if (scope.pageId === null && scope.url === null) return true;
  if (action.pages.status !== "direct") return false;
  return action.pages.values.some((page) =>
    (scope.pageId === null || page.pageId === scope.pageId)
    && (scope.url === null || page.url === scope.url)
  );
}

function actionScopeMatches(
  action: ActionAttribution,
  scope: P103Scope,
  requireEntityDimension: boolean,
): boolean {
  const entityDimensionPresent = scope.pageId !== null
    || scope.url !== null
    || scope.query !== null
    || scope.category !== null;
  if (requireEntityDimension && !entityDimensionPresent) return false;

  const anyDimensionPresent = entityDimensionPresent
    || scope.siteId !== null
    || scope.domain !== null;
  if (!anyDimensionPresent) return false;

  if (scope.siteId !== null && action.site.siteId !== scope.siteId) return false;
  if (scope.domain !== null && action.site.domain !== scope.domain) return false;
  if (!pageScopeMatches(action, scope)) return false;

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

function normalizeObservations(
  observations: P103ObservationInput[],
): Array<P103ObservationInput & { observationFingerprint: string }> {
  if (!Array.isArray(observations)) throw new Error("invalid_p10_3_observations");
  if (observations.length > WINDOW_CONFOUNDER_MAX_OBSERVATIONS) {
    throw new Error("p10_3_observation_limit_exceeded");
  }

  const bySource = new Map<string, P103ObservationInput & { observationFingerprint: string }>();
  for (const input of observations) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("invalid_p10_3_observation");
    }
    const normalized = {
      observedAt: canonicalTimestamp(input.observedAt, "invalid_p10_3_observation_timestamp"),
      source: normalizeSource(input.source),
      scope: normalizeScope(input.scope),
    };
    const entityDimensionPresent = normalized.scope.pageId !== null
      || normalized.scope.url !== null
      || normalized.scope.query !== null
      || normalized.scope.category !== null;
    if (!entityDimensionPresent) {
      throw new Error("p10_3_observation_scope_required");
    }
    const observationFingerprint = hash({
      version: WINDOW_CONFOUNDER_VERSION,
      kind: "observation",
      ...normalized,
    });
    const candidate = { ...normalized, observationFingerprint };
    const key = sourceIdentityKey(normalized.source);
    const existing = bySource.get(key);
    if (existing && canonicalJson(existing) !== canonicalJson(candidate)) {
      throw new Error("p10_3_observation_source_conflict");
    }
    bySource.set(key, candidate);
  }

  return [...bySource.values()].sort((a, b) =>
    a.observedAt.localeCompare(b.observedAt)
    || a.observationFingerprint.localeCompare(b.observationFingerprint)
  );
}

function normalizeExternalConfounders(
  facts: P103ExternalConfounderInput[],
): Array<P103ExternalConfounderInput & { factFingerprint: string }> {
  if (!Array.isArray(facts)) throw new Error("invalid_p10_3_external_confounders");
  if (facts.length > WINDOW_CONFOUNDER_MAX_EXTERNAL_FACTS) {
    throw new Error("p10_3_external_confounder_limit_exceeded");
  }

  const allowed = new Set<P103ExternalConfounderKind>([
    "sitewide_release",
    "tracking_change",
    "search_engine_update",
    "external_campaign",
    "inventory_or_price_change",
    "seasonality_event",
    "other_explicit",
  ]);
  const bySource = new Map<string, P103ExternalConfounderInput & { factFingerprint: string }>();

  for (const input of facts) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("invalid_p10_3_external_confounder");
    }
    if (!allowed.has(input.kind)) throw new Error("invalid_p10_3_external_confounder_kind");

    const normalized = {
      kind: input.kind,
      startsAt: canonicalTimestamp(
        input.startsAt,
        "invalid_p10_3_external_confounder_start",
      ),
      endsAt: canonicalTimestamp(
        input.endsAt,
        "invalid_p10_3_external_confounder_end",
      ),
      source: normalizeSource(input.source),
      scope: normalizeScope(input.scope),
    };
    if (normalized.startsAt > normalized.endsAt) {
      throw new Error("p10_3_external_confounder_interval_invalid");
    }

    const anyScope = Object.values(normalized.scope).some((value) => value !== null);
    if (!anyScope) throw new Error("p10_3_external_confounder_scope_required");

    const factFingerprint = hash({
      version: WINDOW_CONFOUNDER_VERSION,
      recordType: "external_confounder",
      ...normalized,
    });
    const candidate = { ...normalized, factFingerprint };
    const key = sourceIdentityKey(normalized.source);
    const existing = bySource.get(key);
    if (existing && canonicalJson(existing) !== canonicalJson(candidate)) {
      throw new Error("p10_3_external_confounder_source_conflict");
    }
    bySource.set(key, candidate);
  }

  return [...bySource.values()].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt)
    || a.endsAt.localeCompare(b.endsAt)
    || a.factFingerprint.localeCompare(b.factFingerprint)
  );
}

function classifyObservation(
  observation: P103ObservationInput & { observationFingerprint: string },
  action: ActionAttribution,
  anchorAvailable: boolean,
  before: WindowState,
  after: WindowState,
): ClassifiedObservation {
  let membership: WindowMembership;
  if (!actionScopeMatches(action, observation.scope, true)) {
    membership = "unassociated";
  } else if (!anchorAvailable || (before.status === "unavailable" && after.status === "unavailable")) {
    membership = "window_unavailable";
  } else if (contains(before, observation.observedAt)) {
    membership = "before";
  } else if (contains(after, observation.observedAt)) {
    membership = "after";
  } else {
    membership = "outside";
  }

  return {
    observationId: `p103-observation-${observation.observationFingerprint.slice(0, 24)}`,
    observationFingerprint: observation.observationFingerprint,
    observedAt: observation.observedAt,
    source: observation.source,
    scope: observation.scope,
    membership,
  };
}

function eventWindow(
  event: UnifiedTimelineEvent,
  before: WindowState,
  after: WindowState,
): "before" | "after" | null {
  if (contains(before, event.occurredAt)) return "before";
  if (contains(after, event.occurredAt)) return "after";
  return null;
}

function sharedAssociationTokens(
  left: ActionAttribution,
  right: ActionAttribution,
): string[] {
  const shared = new Set<string>();

  if (left.pages.status === "direct" && right.pages.status === "direct") {
    for (const a of left.pages.values) {
      for (const b of right.pages.values) {
        if (a.pageId !== null && a.pageId === b.pageId) shared.add(`page_id:${a.pageId}`);
        if (a.url !== null && a.url === b.url) shared.add(`url:${a.url}`);
      }
    }
  }

  if (left.queries.status === "direct" && right.queries.status === "direct") {
    const rightQueries = new Set(right.queries.values.map((value) => value.value));
    for (const value of left.queries.values) {
      if (rightQueries.has(value.value)) shared.add(`query:${value.value}`);
    }
  }

  if (left.categories.status === "direct" && right.categories.status === "direct") {
    const rightCategories = new Set(right.categories.values.map((value) => value.value));
    for (const value of left.categories.values) {
      if (rightCategories.has(value.value)) shared.add(`category:${value.value}`);
    }
  }

  return [...shared].sort();
}

function flag(input: Omit<ConfounderFlag, "flagId" | "flagFingerprint">): ConfounderFlag {
  const flagFingerprint = hash({
    version: WINDOW_CONFOUNDER_VERSION,
    ...input,
  });
  return {
    flagId: `p103-confounder-${flagFingerprint.slice(0, 24)}`,
    flagFingerprint,
    ...input,
  };
}

function timelineConfounders(
  timeline: UnifiedChangeTimelineReport,
  attribution: ActionAttributionReport,
  action: ActionAttribution,
  before: WindowState,
  after: WindowState,
): ConfounderFlag[] {
  const flags: ConfounderFlag[] = [];

  for (const event of timeline.events) {
    if (event.lineage.actionId !== action.actionId) continue;
    const window = eventWindow(event, before, after);
    if (window === null) continue;

    let kind: P103ConfounderKind | null = null;
    if (event.eventKind === "provider_write_outcome_uncertain") {
      kind = "same_action_uncertain_write";
    } else if (
      event.eventKind === "rollback_started"
      || event.eventKind === "rollback_verified"
      || event.eventKind === "rollback_failed"
    ) {
      kind = "same_action_rollback";
    } else if (event.eventKind === "manual_intervention_required") {
      kind = "same_action_manual_intervention";
    }
    if (kind === null) continue;

    flags.push(flag({
      kind,
      window,
      evidenceTime: event.occurredAt,
      evidenceInterval: null,
      timelineEventFingerprint: event.eventFingerprint,
      relatedActionId: action.actionId,
      externalKind: null,
      source: {
        system: event.source.system,
        version: event.source.version,
        eventId: event.source.eventId,
        eventFingerprint: event.source.eventFingerprint,
      },
      sharedAssociations: [],
    }));
  }

  for (const other of attribution.actions) {
    if (other.actionId === action.actionId) continue;
    const sharedAssociations = sharedAssociationTokens(action, other);
    if (sharedAssociations.length === 0) continue;

    for (const event of timeline.events) {
      if (
        event.lineage.actionId !== other.actionId
        || event.eventKind !== "verified_change_retained_live"
      ) {
        continue;
      }
      const window = eventWindow(event, before, after);
      if (window === null) continue;

      flags.push(flag({
        kind: "overlapping_direct_action",
        window,
        evidenceTime: event.occurredAt,
        evidenceInterval: null,
        timelineEventFingerprint: event.eventFingerprint,
        relatedActionId: other.actionId,
        externalKind: null,
        source: {
          system: event.source.system,
          version: event.source.version,
          eventId: event.source.eventId,
          eventFingerprint: event.source.eventFingerprint,
        },
        sharedAssociations,
      }));
    }
  }

  return flags;
}

function externalConfounderFlags(
  facts: Array<P103ExternalConfounderInput & { factFingerprint: string }>,
  action: ActionAttribution,
  before: WindowState,
  after: WindowState,
): ConfounderFlag[] {
  const flags: ConfounderFlag[] = [];

  for (const fact of facts) {
    if (!actionScopeMatches(action, fact.scope, false)) continue;

    for (const windowName of ["before", "after"] as const) {
      const window = windowName === "before" ? before : after;
      if (!intervalOverlaps(window, fact.startsAt, fact.endsAt)) continue;
      flags.push(flag({
        kind: "external_supplied",
        window: windowName,
        evidenceTime: null,
        evidenceInterval: {
          start: fact.startsAt,
          end: fact.endsAt,
        },
        timelineEventFingerprint: null,
        relatedActionId: null,
        externalKind: fact.kind,
        source: fact.source,
        sharedAssociations: [],
      }));
    }
  }

  return flags;
}

export function windowConfounderSemantics() {
  return Object.freeze({
    exactP10_1IntegrityRequired: true,
    exactP10_2IntegrityRequired: true,
    exactActionIdRequired: true,
    retainedLiveAnchorOnly: true,
    suppliedWindowBoundsOnly: true,
    windowMembershipDescriptiveOnly: true,
    directP10_2ScopeOnly: true,
    unassociatedObservationPreserved: true,
    unavailableWindowPreserved: true,
    exactReplayDeduped: true,
    conflictingReplayFailsClosed: true,
    confounderEvidenceDirectOnly: true,
    chronologyCreatesAssociation: false,
    actionAssociationCreatesCausality: false,
    windowMembershipCreatesCausality: false,
    confounderOverlapCreatesCausalAdjustment: false,
    temporalProximityCreatesCausality: false,
    metricDeltaCalculated: false,
    confidenceCalculated: false,
    recommendationGenerated: false,
    causalAttributionPerformed: false,
    impactCalculated: false,
  });
}

export function windowConfounderCapability() {
  return Object.freeze({
    version: WINDOW_CONFOUNDER_VERSION,
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
    p104ImplementationAuthorized: false,
    automaticTransition: false,
    publicationAuthorized: false,
  });
}

export function buildActionWindowConfounderReport(
  input: ActionWindowConfounderInput,
): ActionWindowConfounderReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_p10_3_input");
  }

  const attribution = verifyAttribution(input.timeline, input.attribution);
  const actionId = exactString(input.actionId, "invalid_p10_3_action_id");
  const action = findAction(attribution, actionId);

  let anchorEvent: UnifiedTimelineEvent | null = null;
  if (input.anchorEventFingerprint !== null) {
    const anchorFingerprint = nullableFingerprint(
      input.anchorEventFingerprint,
      "invalid_p10_3_anchor_fingerprint",
    )!;
    anchorEvent = input.timeline.events.find((event) =>
      event.eventFingerprint === anchorFingerprint
      && event.lineage.actionId === actionId
    ) ?? null;
    if (anchorEvent === null) throw new Error("p10_3_anchor_event_not_found");
    if (anchorEvent.eventKind !== "verified_change_retained_live") {
      throw new Error("p10_3_anchor_must_be_verified_change_retained_live");
    }
  }

  if (
    anchorEvent === null
    && (input.beforeWindow !== null || input.afterWindow !== null)
  ) {
    throw new Error("p10_3_anchor_required_for_windows");
  }

  const before = normalizeWindow(
    input.beforeWindow,
    "before",
    anchorEvent?.occurredAt ?? null,
  );
  const after = normalizeWindow(
    input.afterWindow,
    "after",
    anchorEvent?.occurredAt ?? null,
  );

  const normalizedObservations = normalizeObservations(input.observations);
  const observations = normalizedObservations
    .map((observation) =>
      classifyObservation(
        observation,
        action,
        anchorEvent !== null,
        before,
        after,
      )
    )
    .sort((a, b) =>
      a.observedAt.localeCompare(b.observedAt)
      || a.observationFingerprint.localeCompare(b.observationFingerprint)
    );

  const externalFacts = normalizeExternalConfounders(input.externalConfounders);
  const confounders = [
    ...timelineConfounders(input.timeline, attribution, action, before, after),
    ...externalConfounderFlags(externalFacts, action, before, after),
  ].sort((a, b) =>
    a.window.localeCompare(b.window)
    || a.kind.localeCompare(b.kind)
    || (a.evidenceTime ?? a.evidenceInterval?.start ?? "").localeCompare(
      b.evidenceTime ?? b.evidenceInterval?.start ?? "",
    )
    || a.flagFingerprint.localeCompare(b.flagFingerprint)
  );

  const observationSummary = {
    total: observations.length,
    before: observations.filter((item) => item.membership === "before").length,
    after: observations.filter((item) => item.membership === "after").length,
    outside: observations.filter((item) => item.membership === "outside").length,
    unassociated: observations.filter((item) => item.membership === "unassociated").length,
    windowUnavailable: observations.filter(
      (item) => item.membership === "window_unavailable",
    ).length,
    values: observations,
  };
  const confounderSummary = {
    total: confounders.length,
    sameActionUncertainWrite: confounders.filter(
      (item) => item.kind === "same_action_uncertain_write",
    ).length,
    sameActionRollback: confounders.filter(
      (item) => item.kind === "same_action_rollback",
    ).length,
    sameActionManualIntervention: confounders.filter(
      (item) => item.kind === "same_action_manual_intervention",
    ).length,
    overlappingDirectAction: confounders.filter(
      (item) => item.kind === "overlapping_direct_action",
    ).length,
    externalSupplied: confounders.filter(
      (item) => item.kind === "external_supplied",
    ).length,
    values: confounders,
  };

  const semantics = windowConfounderSemantics();
  const identity = {
    version: WINDOW_CONFOUNDER_VERSION,
    timelineId: input.timeline.timelineId,
    timelineFingerprint: input.timeline.timelineFingerprint,
    attributionReportId: attribution.reportId,
    attributionReportFingerprint: attribution.reportFingerprint,
    actionId,
    actionAttributionFingerprint: action.attributionFingerprint,
    anchor: anchorEvent === null
      ? {
          status: "unavailable" as const,
          timelineEventId: null,
          timelineEventFingerprint: null,
          occurredAt: null,
          eventKind: null,
        }
      : {
          status: "available" as const,
          timelineEventId: anchorEvent.eventId,
          timelineEventFingerprint: anchorEvent.eventFingerprint,
          occurredAt: anchorEvent.occurredAt,
          eventKind: "verified_change_retained_live" as const,
        },
    windows: {
      before,
      after,
    },
    observations: observationSummary,
    confounders: confounderSummary,
    semantics,
  };
  const reportFingerprint = hash(identity);

  return {
    reportId: `p103-report-${reportFingerprint.slice(0, 24)}`,
    reportFingerprint,
    ...identity,
    safety: windowConfounderCapability(),
  };
}
