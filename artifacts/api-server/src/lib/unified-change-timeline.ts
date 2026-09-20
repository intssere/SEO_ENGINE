import { createHash } from "node:crypto";
import {
  P6_7_OPPORTUNITY_LIFECYCLE_VERSION,
  buildOpportunityLifecycle,
  type OpportunityLifecycleInput,
  type OpportunityLifecycleReport,
} from "./opportunity-lifecycle.js";

export const UNIFIED_CHANGE_TIMELINE_VERSION = "p10.1-unified-change-timeline-v1" as const;
export const UNIFIED_CHANGE_TIMELINE_MAX_EVENTS = 2048 as const;
export const UNIFIED_CHANGE_TIMELINE_MAX_LINEAGE_REFS = 64 as const;

export type UnifiedTimelineEventClass =
  | "opportunity"
  | "recommendation"
  | "proposal"
  | "execution"
  | "measurement";

export const UNIFIED_TIMELINE_EVENT_CLASS_BY_KIND = {
  opportunity_observed: "opportunity",
  opportunity_activated: "opportunity",
  opportunity_deferred: "opportunity",
  opportunity_dismissed: "opportunity",
  opportunity_closed: "opportunity",
  opportunity_superseded: "opportunity",
  recommendation_review_emitted: "recommendation",
  proposal_created: "proposal",
  proposal_edited: "proposal",
  proposal_approved: "proposal",
  proposal_rejected: "proposal",
  authorization_created: "proposal",
  authorization_renewed: "proposal",
  action_authorized: "execution",
  execution_reserved: "execution",
  provider_write_accepted: "execution",
  provider_write_outcome_uncertain: "execution",
  verification_passed: "execution",
  verification_failed: "execution",
  rollback_started: "execution",
  rollback_verified: "execution",
  rollback_failed: "execution",
  manual_intervention_required: "execution",
  verified_change_retained_live: "execution",
  measurement_eligible: "measurement",
  measurement_pending: "measurement",
  measurement_unavailable: "measurement",
} as const satisfies Record<string, UnifiedTimelineEventClass>;

export type UnifiedTimelineEventKind = keyof typeof UNIFIED_TIMELINE_EVENT_CLASS_BY_KIND;
export type UnifiedTimelineVerificationState =
  | "pending"
  | "verified"
  | "failed"
  | "unknown"
  | "unavailable";
export type UnifiedTimelineRollbackState =
  | "not_required"
  | "pending"
  | "verified"
  | "failed"
  | "unknown"
  | "unavailable";
export type UnifiedTimelineMeasurementEligibility =
  | "eligible"
  | "pending"
  | "unavailable";

export type UnifiedTimelineLineageRefInput = {
  kind: string;
  id: string;
  fingerprint: string | null;
};

export type UnifiedTimelineSourceEventInput = {
  occurredAt: string;
  eventClass: UnifiedTimelineEventClass;
  eventKind: UnifiedTimelineEventKind;
  source: {
    system: string;
    version: string;
    eventId: string;
    eventFingerprint: string | null;
  };
  site: {
    siteId: string | null;
    domain: string | null;
  };
  lineage: {
    opportunityId: string | null;
    opportunityFingerprint: string | null;
    relatedOpportunityFingerprint: string | null;
    recommendationId: string | null;
    recommendationFingerprint: string | null;
    actionPlanId: string | null;
    proposalFingerprint: string | null;
    approvalId: string | null;
    actionId: string | null;
    authorizationFingerprint: string | null;
    deploymentId: string | null;
    verificationId: string | null;
    rollbackId: string | null;
  };
  target: {
    pageId: string | null;
    url: string | null;
    resourceKind: string | null;
    resourceId: string | null;
    field: string | null;
    beforeFingerprint: string | null;
    afterFingerprint: string | null;
  } | null;
  associations: {
    query: string | null;
    category: string | null;
  };
  state: {
    terminal: boolean | null;
    providerMutationOccurred: boolean | null;
    verification: UnifiedTimelineVerificationState | null;
    rollback: UnifiedTimelineRollbackState | null;
    changeRetainedLive: boolean | null;
    manualInterventionRequired: boolean | null;
    measurementEligibility: UnifiedTimelineMeasurementEligibility | null;
  };
  sourceLineage: UnifiedTimelineLineageRefInput[];
};

export type UnifiedTimelineEvent = UnifiedTimelineSourceEventInput & {
  version: typeof UNIFIED_CHANGE_TIMELINE_VERSION;
  eventId: string;
  eventFingerprint: string;
};

export type UnifiedChangeTimelineInput = {
  timelineKey: string;
  referenceTime: string;
  events: UnifiedTimelineSourceEventInput[];
};

export type UnifiedChangeTimelineReport = {
  version: typeof UNIFIED_CHANGE_TIMELINE_VERSION;
  timelineId: string;
  timelineFingerprint: string;
  timelineKey: string;
  referenceTime: string;
  counts: {
    total: number;
    opportunity: number;
    recommendation: number;
    proposal: number;
    execution: number;
    measurement: number;
  };
  events: UnifiedTimelineEvent[];
  semantics: ReturnType<typeof unifiedChangeTimelineSemantics>;
  safety: ReturnType<typeof unifiedChangeTimelineCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const KEY = /^[a-z0-9][a-z0-9._:-]{0,127}$/;
const SOURCE_VERSION = /^[A-Za-z0-9][A-Za-z0-9._:+\/-]{0,127}$/;
const TERMINAL_OPPORTUNITY_KINDS = new Set<UnifiedTimelineEventKind>([
  "opportunity_dismissed",
  "opportunity_closed",
  "opportunity_superseded",
]);

const EVENT_KIND_PRECEDENCE: Record<UnifiedTimelineEventKind, number> = {
  opportunity_observed: 10,
  opportunity_activated: 20,
  opportunity_deferred: 30,
  opportunity_dismissed: 40,
  opportunity_closed: 50,
  opportunity_superseded: 60,
  recommendation_review_emitted: 100,
  proposal_created: 200,
  proposal_edited: 210,
  proposal_approved: 220,
  proposal_rejected: 230,
  authorization_created: 240,
  authorization_renewed: 250,
  action_authorized: 300,
  execution_reserved: 310,
  provider_write_accepted: 320,
  provider_write_outcome_uncertain: 330,
  verification_passed: 340,
  verification_failed: 350,
  rollback_started: 360,
  rollback_verified: 370,
  rollback_failed: 380,
  manual_intervention_required: 390,
  verified_change_retained_live: 400,
  measurement_eligible: 500,
  measurement_pending: 510,
  measurement_unavailable: 520,
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
  const exact = exactString(value, "invalid_timeline_source_version", 128);
  if (!SOURCE_VERSION.test(exact)) throw new Error("invalid_timeline_source_version");
  return exact;
}

function normalizeDomain(value: unknown): string | null {
  if (value === null) return null;
  const domain = exactString(value, "invalid_timeline_site_domain", 253);
  if (domain !== domain.toLowerCase() || !/^[a-z0-9.-]+$/.test(domain)) {
    throw new Error("invalid_timeline_site_domain");
  }
  return domain;
}

function normalizeUrl(value: unknown): string | null {
  if (value === null) return null;
  const url = exactString(value, "invalid_timeline_target_url", 2048);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("invalid_timeline_target_url");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("invalid_timeline_target_url");
  }
  return url;
}

function normalizeLineageRefs(value: unknown): UnifiedTimelineLineageRefInput[] {
  if (!Array.isArray(value)) throw new Error("invalid_timeline_source_lineage");
  if (value.length > UNIFIED_CHANGE_TIMELINE_MAX_LINEAGE_REFS) {
    throw new Error("timeline_source_lineage_limit_exceeded");
  }

  const output = new Map<string, UnifiedTimelineLineageRefInput>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("invalid_timeline_source_lineage_ref");
    }
    const candidate = item as Record<string, unknown>;
    const normalized = {
      kind: normalizeKey(candidate.kind, "invalid_timeline_source_lineage_kind"),
      id: exactString(candidate.id, "invalid_timeline_source_lineage_id", 512),
      fingerprint: nullableFingerprint(
        candidate.fingerprint,
        "invalid_timeline_source_lineage_fingerprint",
      ),
    };
    const identity = `${normalized.kind}\u0000${normalized.id}`;
    const existing = output.get(identity);
    if (existing && canonicalJson(existing) !== canonicalJson(normalized)) {
      throw new Error("timeline_source_lineage_conflict");
    }
    output.set(identity, normalized);
  }

  return [...output.values()].sort((a, b) =>
    a.kind.localeCompare(b.kind)
    || a.id.localeCompare(b.id)
    || (a.fingerprint ?? "").localeCompare(b.fingerprint ?? "")
  );
}

function normalizeEventClass(value: unknown): UnifiedTimelineEventClass {
  if (
    value !== "opportunity"
    && value !== "recommendation"
    && value !== "proposal"
    && value !== "execution"
    && value !== "measurement"
  ) {
    throw new Error("invalid_timeline_event_class");
  }
  return value;
}

function normalizeEventKind(value: unknown): UnifiedTimelineEventKind {
  if (typeof value !== "string" || !(value in UNIFIED_TIMELINE_EVENT_CLASS_BY_KIND)) {
    throw new Error("invalid_timeline_event_kind");
  }
  return value as UnifiedTimelineEventKind;
}

function normalizeVerification(value: unknown): UnifiedTimelineVerificationState | null {
  if (value === null) return null;
  if (
    value !== "pending"
    && value !== "verified"
    && value !== "failed"
    && value !== "unknown"
    && value !== "unavailable"
  ) {
    throw new Error("invalid_timeline_verification_state");
  }
  return value;
}

function normalizeRollback(value: unknown): UnifiedTimelineRollbackState | null {
  if (value === null) return null;
  if (
    value !== "not_required"
    && value !== "pending"
    && value !== "verified"
    && value !== "failed"
    && value !== "unknown"
    && value !== "unavailable"
  ) {
    throw new Error("invalid_timeline_rollback_state");
  }
  return value;
}

function normalizeMeasurementEligibility(value: unknown): UnifiedTimelineMeasurementEligibility | null {
  if (value === null) return null;
  if (value !== "eligible" && value !== "pending" && value !== "unavailable") {
    throw new Error("invalid_timeline_measurement_eligibility");
  }
  return value;
}

function nullableBoolean(value: unknown, errorCode: string): boolean | null {
  if (value === null) return null;
  if (typeof value !== "boolean") throw new Error(errorCode);
  return value;
}

function normalizeTarget(value: unknown): UnifiedTimelineSourceEventInput["target"] {
  if (value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid_timeline_target");
  }
  const target = value as Record<string, unknown>;
  return {
    pageId: nullableExactString(target.pageId, "invalid_timeline_page_id"),
    url: normalizeUrl(target.url),
    resourceKind: target.resourceKind === null
      ? null
      : normalizeKey(target.resourceKind, "invalid_timeline_resource_kind"),
    resourceId: nullableExactString(target.resourceId, "invalid_timeline_resource_id"),
    field: target.field === null
      ? null
      : normalizeKey(target.field, "invalid_timeline_target_field"),
    beforeFingerprint: nullableFingerprint(
      target.beforeFingerprint,
      "invalid_timeline_before_fingerprint",
    ),
    afterFingerprint: nullableFingerprint(
      target.afterFingerprint,
      "invalid_timeline_after_fingerprint",
    ),
  };
}

function assertEventSemantics(event: UnifiedTimelineSourceEventInput): void {
  if (UNIFIED_TIMELINE_EVENT_CLASS_BY_KIND[event.eventKind] !== event.eventClass) {
    throw new Error("timeline_event_class_kind_mismatch");
  }

  if (event.eventClass === "opportunity") {
    const expectedTerminal = TERMINAL_OPPORTUNITY_KINDS.has(event.eventKind);
    if (event.state.terminal !== expectedTerminal) {
      throw new Error("timeline_opportunity_terminal_state_mismatch");
    }
  }

  if (event.eventKind === "provider_write_accepted" && event.state.providerMutationOccurred !== true) {
    throw new Error("timeline_provider_write_state_mismatch");
  }
  if (
    event.eventKind === "provider_write_outcome_uncertain"
    && event.state.providerMutationOccurred !== null
  ) {
    throw new Error("timeline_uncertain_write_must_remain_unknown");
  }
  if (event.eventKind === "verification_passed" && event.state.verification !== "verified") {
    throw new Error("timeline_verification_state_mismatch");
  }
  if (event.eventKind === "verification_failed" && event.state.verification !== "failed") {
    throw new Error("timeline_verification_state_mismatch");
  }
  if (event.eventKind === "rollback_started" && event.state.rollback !== "pending") {
    throw new Error("timeline_rollback_state_mismatch");
  }
  if (event.eventKind === "rollback_verified" && event.state.rollback !== "verified") {
    throw new Error("timeline_rollback_state_mismatch");
  }
  if (event.eventKind === "rollback_failed" && event.state.rollback !== "failed") {
    throw new Error("timeline_rollback_state_mismatch");
  }
  if (
    event.eventKind === "manual_intervention_required"
    && event.state.manualInterventionRequired !== true
  ) {
    throw new Error("timeline_manual_intervention_state_mismatch");
  }
  if (event.eventKind === "verified_change_retained_live") {
    if (
      event.state.providerMutationOccurred !== true
      || event.state.verification !== "verified"
      || event.state.changeRetainedLive !== true
      || event.state.manualInterventionRequired !== false
    ) {
      throw new Error("timeline_retained_live_state_mismatch");
    }
  }

  const expectedMeasurement = event.eventKind === "measurement_eligible"
    ? "eligible"
    : event.eventKind === "measurement_pending"
      ? "pending"
      : event.eventKind === "measurement_unavailable"
        ? "unavailable"
        : null;
  if (expectedMeasurement !== null && event.state.measurementEligibility !== expectedMeasurement) {
    throw new Error("timeline_measurement_state_mismatch");
  }
}

function normalizeSourceEvent(input: UnifiedTimelineSourceEventInput): UnifiedTimelineSourceEventInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_timeline_source_event");
  }
  const eventClass = normalizeEventClass(input.eventClass);
  const eventKind = normalizeEventKind(input.eventKind);
  const occurredAt = canonicalTimestamp(input.occurredAt, "invalid_timeline_event_timestamp");

  const normalized: UnifiedTimelineSourceEventInput = {
    occurredAt,
    eventClass,
    eventKind,
    source: {
      system: normalizeKey(input.source?.system, "invalid_timeline_source_system"),
      version: normalizeSourceVersion(input.source?.version),
      eventId: exactString(input.source?.eventId, "invalid_timeline_source_event_id", 512),
      eventFingerprint: nullableFingerprint(
        input.source?.eventFingerprint,
        "invalid_timeline_source_event_fingerprint",
      ),
    },
    site: {
      siteId: nullableExactString(input.site?.siteId, "invalid_timeline_site_id"),
      domain: normalizeDomain(input.site?.domain),
    },
    lineage: {
      opportunityId: nullableExactString(
        input.lineage?.opportunityId,
        "invalid_timeline_opportunity_id",
      ),
      opportunityFingerprint: nullableFingerprint(
        input.lineage?.opportunityFingerprint,
        "invalid_timeline_opportunity_fingerprint",
      ),
      relatedOpportunityFingerprint: nullableFingerprint(
        input.lineage?.relatedOpportunityFingerprint,
        "invalid_timeline_related_opportunity_fingerprint",
      ),
      recommendationId: nullableExactString(
        input.lineage?.recommendationId,
        "invalid_timeline_recommendation_id",
      ),
      recommendationFingerprint: nullableFingerprint(
        input.lineage?.recommendationFingerprint,
        "invalid_timeline_recommendation_fingerprint",
      ),
      actionPlanId: nullableExactString(
        input.lineage?.actionPlanId,
        "invalid_timeline_action_plan_id",
      ),
      proposalFingerprint: nullableFingerprint(
        input.lineage?.proposalFingerprint,
        "invalid_timeline_proposal_fingerprint",
      ),
      approvalId: nullableExactString(
        input.lineage?.approvalId,
        "invalid_timeline_approval_id",
      ),
      actionId: nullableExactString(input.lineage?.actionId, "invalid_timeline_action_id"),
      authorizationFingerprint: nullableFingerprint(
        input.lineage?.authorizationFingerprint,
        "invalid_timeline_authorization_fingerprint",
      ),
      deploymentId: nullableExactString(
        input.lineage?.deploymentId,
        "invalid_timeline_deployment_id",
      ),
      verificationId: nullableExactString(
        input.lineage?.verificationId,
        "invalid_timeline_verification_id",
      ),
      rollbackId: nullableExactString(
        input.lineage?.rollbackId,
        "invalid_timeline_rollback_id",
      ),
    },
    target: normalizeTarget(input.target),
    associations: {
      query: nullableExactString(input.associations?.query, "invalid_timeline_query", 2048),
      category: nullableExactString(
        input.associations?.category,
        "invalid_timeline_category",
        256,
      ),
    },
    state: {
      terminal: nullableBoolean(input.state?.terminal, "invalid_timeline_terminal_state"),
      providerMutationOccurred: nullableBoolean(
        input.state?.providerMutationOccurred,
        "invalid_timeline_provider_mutation_state",
      ),
      verification: normalizeVerification(input.state?.verification),
      rollback: normalizeRollback(input.state?.rollback),
      changeRetainedLive: nullableBoolean(
        input.state?.changeRetainedLive,
        "invalid_timeline_retained_live_state",
      ),
      manualInterventionRequired: nullableBoolean(
        input.state?.manualInterventionRequired,
        "invalid_timeline_manual_intervention_state",
      ),
      measurementEligibility: normalizeMeasurementEligibility(
        input.state?.measurementEligibility,
      ),
    },
    sourceLineage: normalizeLineageRefs(input.sourceLineage),
  };

  assertEventSemantics(normalized);
  return normalized;
}

function sourceIdentity(event: UnifiedTimelineSourceEventInput): string {
  return [
    event.source.system,
    event.source.version,
    event.source.eventId,
  ].join("\u0000");
}

function materializeEvent(event: UnifiedTimelineSourceEventInput): UnifiedTimelineEvent {
  const eventFingerprint = hash({
    version: UNIFIED_CHANGE_TIMELINE_VERSION,
    sourceEvent: event,
  });
  return {
    version: UNIFIED_CHANGE_TIMELINE_VERSION,
    eventId: `p101-event-${eventFingerprint.slice(0, 24)}`,
    eventFingerprint,
    ...event,
  };
}

export function unifiedChangeTimelineSemantics() {
  return Object.freeze({
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
}

export function unifiedChangeTimelineCapability() {
  return Object.freeze({
    version: UNIFIED_CHANGE_TIMELINE_VERSION,
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
}

export function projectP67OpportunityLifecycleTimelineEvents(input: {
  lifecycleInput: OpportunityLifecycleInput;
  lifecycle: OpportunityLifecycleReport;
  site: { siteId: string | null; domain: string | null };
}): UnifiedTimelineSourceEventInput[] {
  if (!input.lifecycle || input.lifecycle.version !== P6_7_OPPORTUNITY_LIFECYCLE_VERSION) {
    throw new Error("unsupported_p67_lifecycle_version");
  }
  const rebuilt = buildOpportunityLifecycle(input.lifecycleInput);
  if (canonicalJson(rebuilt) !== canonicalJson(input.lifecycle)) {
    throw new Error("p67_lifecycle_integrity_mismatch");
  }

  const output: UnifiedTimelineSourceEventInput[] = [];
  for (const record of rebuilt.records) {
    for (const lifecycleEvent of record.events) {
      const eventKind: UnifiedTimelineEventKind = lifecycleEvent.type === "activate"
        ? "opportunity_activated"
        : lifecycleEvent.type === "defer"
          ? "opportunity_deferred"
          : lifecycleEvent.type === "dismiss"
            ? "opportunity_dismissed"
            : lifecycleEvent.type === "close"
              ? "opportunity_closed"
              : "opportunity_superseded";
      const terminal = lifecycleEvent.toState === "dismissed"
        || lifecycleEvent.toState === "closed"
        || lifecycleEvent.toState === "superseded";

      output.push({
        occurredAt: lifecycleEvent.occurredAt,
        eventClass: "opportunity",
        eventKind,
        source: {
          system: "p6.7_opportunity_lifecycle",
          version: P6_7_OPPORTUNITY_LIFECYCLE_VERSION,
          eventId: lifecycleEvent.eventId,
          eventFingerprint: lifecycleEvent.eventFingerprint,
        },
        site: {
          siteId: input.site.siteId,
          domain: input.site.domain,
        },
        lineage: {
          opportunityId: record.opportunityId,
          opportunityFingerprint: record.opportunityFingerprint,
          relatedOpportunityFingerprint: lifecycleEvent.relatedOpportunityFingerprint,
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
        },
        target: null,
        associations: {
          query: null,
          category: null,
        },
        state: {
          terminal,
          providerMutationOccurred: null,
          verification: null,
          rollback: null,
          changeRetainedLive: null,
          manualInterventionRequired: null,
          measurementEligibility: null,
        },
        sourceLineage: [
          {
            kind: "lifecycle",
            id: record.lifecycleId,
            fingerprint: record.lifecycleFingerprint,
          },
          {
            kind: "actionability",
            id: record.actionabilityId,
            fingerprint: record.actionabilityFingerprint,
          },
        ],
      });
    }
  }
  return output;
}

export function buildUnifiedChangeTimeline(
  input: UnifiedChangeTimelineInput,
): UnifiedChangeTimelineReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_unified_change_timeline_input");
  }
  const timelineKey = normalizeKey(input.timelineKey, "invalid_timeline_key");
  const referenceTime = canonicalTimestamp(
    input.referenceTime,
    "invalid_timeline_reference_time",
  );
  if (!Array.isArray(input.events)) throw new Error("invalid_timeline_events");
  if (input.events.length > UNIFIED_CHANGE_TIMELINE_MAX_EVENTS) {
    throw new Error("timeline_event_limit_exceeded");
  }

  const deduped = new Map<string, UnifiedTimelineSourceEventInput>();
  for (const eventInput of input.events) {
    const event = normalizeSourceEvent(eventInput);
    if (event.occurredAt > referenceTime) {
      throw new Error("timeline_event_after_reference_time");
    }
    const key = sourceIdentity(event);
    const existing = deduped.get(key);
    if (existing && canonicalJson(existing) !== canonicalJson(event)) {
      throw new Error("timeline_source_event_conflict");
    }
    deduped.set(key, event);
  }

  const events = [...deduped.values()]
    .map(materializeEvent)
    .sort((a, b) =>
      a.occurredAt.localeCompare(b.occurredAt)
      || EVENT_KIND_PRECEDENCE[a.eventKind] - EVENT_KIND_PRECEDENCE[b.eventKind]
      || a.eventFingerprint.localeCompare(b.eventFingerprint)
    );

  const counts = {
    total: events.length,
    opportunity: events.filter((event) => event.eventClass === "opportunity").length,
    recommendation: events.filter((event) => event.eventClass === "recommendation").length,
    proposal: events.filter((event) => event.eventClass === "proposal").length,
    execution: events.filter((event) => event.eventClass === "execution").length,
    measurement: events.filter((event) => event.eventClass === "measurement").length,
  };
  const semantics = unifiedChangeTimelineSemantics();
  const identity = {
    version: UNIFIED_CHANGE_TIMELINE_VERSION,
    timelineKey,
    referenceTime,
    counts,
    events,
    semantics,
  };
  const timelineFingerprint = hash(identity);

  return {
    version: UNIFIED_CHANGE_TIMELINE_VERSION,
    timelineId: `p101-timeline-${timelineFingerprint.slice(0, 24)}`,
    timelineFingerprint,
    timelineKey,
    referenceTime,
    counts,
    events,
    semantics,
    safety: unifiedChangeTimelineCapability(),
  };
}
