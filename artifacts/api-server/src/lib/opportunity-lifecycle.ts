import { createHash } from "node:crypto";
import {
  P6_6_OPPORTUNITY_PREVIEW_DIFF_VERSION,
  buildOpportunityPreviewDiff,
  type OpportunityPreviewDiffInput,
  type OpportunityPreviewDiffReport,
} from "./opportunity-preview-diff.js";

export const P6_7_OPPORTUNITY_LIFECYCLE_VERSION = "p6.7-opportunity-lifecycle-v1" as const;
export const P6_7_MAX_HISTORIES = 256 as const;
export const P6_7_MAX_EVENTS_PER_HISTORY = 64 as const;

export type OpportunityLifecycleState =
  | "observed"
  | "active"
  | "deferred"
  | "dismissed"
  | "closed"
  | "superseded";

export type OpportunityLifecycleEventType =
  | "activate"
  | "defer"
  | "dismiss"
  | "close"
  | "supersede";

export type OpportunityLifecycleEventInput = {
  sequence: number;
  occurredAt: string;
  type: OpportunityLifecycleEventType;
  reasonCode: string | null;
  relatedOpportunityFingerprint: string | null;
};

export type OpportunityLifecycleHistoryInput = {
  opportunityFingerprint: string;
  actionabilityFingerprint: string;
  events: OpportunityLifecycleEventInput[];
};

export type OpportunityLifecycleInput = {
  previewDiffInput: OpportunityPreviewDiffInput;
  previewDiff: OpportunityPreviewDiffReport;
  historyReferenceTime: string;
  histories: OpportunityLifecycleHistoryInput[];
};

export type OpportunityLifecycleEvent = OpportunityLifecycleEventInput & {
  eventId: string;
  eventFingerprint: string;
  fromState: OpportunityLifecycleState;
  toState: OpportunityLifecycleState;
};

export type OpportunityLifecycleRecord = {
  lifecycleId: string;
  lifecycleFingerprint: string;
  opportunityId: string;
  opportunityFingerprint: string;
  actionabilityId: string;
  actionabilityFingerprint: string;
  actionabilityClassification: "informational" | "recommend" | "approval" | "blocked";
  previewFingerprints: string[];
  initialState: "observed";
  currentState: OpportunityLifecycleState;
  terminal: boolean;
  eventCount: number;
  events: OpportunityLifecycleEvent[];
};

export type OpportunityLifecycleReport = {
  version: typeof P6_7_OPPORTUNITY_LIFECYCLE_VERSION;
  reportId: string;
  reportFingerprint: string;
  collectionKey: string;
  opportunityReferenceTime: string;
  historyReferenceTime: string;
  scope: OpportunityPreviewDiffReport["scope"];
  previewDiffReportFingerprint: string;
  counts: {
    total: number;
    observed: number;
    active: number;
    deferred: number;
    dismissed: number;
    closed: number;
    superseded: number;
    events: number;
  };
  records: OpportunityLifecycleRecord[];
  semantics: ReturnType<typeof opportunityLifecycleSemantics>;
  safety: ReturnType<typeof opportunityLifecycleCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const REASON_CODE = /^[a-z0-9][a-z0-9._:-]{0,95}$/;
const TERMINAL_STATES = new Set<OpportunityLifecycleState>([
  "dismissed",
  "closed",
  "superseded",
]);

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

function canonicalPreviewDiff(
  input: OpportunityPreviewDiffInput,
  supplied: OpportunityPreviewDiffReport,
): OpportunityPreviewDiffReport {
  if (!supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
    throw new Error("invalid_p66_preview_diff_report");
  }
  if (supplied.version !== P6_6_OPPORTUNITY_PREVIEW_DIFF_VERSION) {
    throw new Error("unsupported_p66_preview_diff_version");
  }
  const rebuilt = buildOpportunityPreviewDiff(input);
  if (canonicalJson(rebuilt) !== canonicalJson(supplied)) {
    throw new Error("p66_preview_diff_integrity_mismatch");
  }
  return rebuilt;
}

function canonicalTimestamp(value: unknown, errorCode: string): string {
  if (typeof value !== "string") throw new Error(errorCode);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(errorCode);
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) throw new Error(errorCode);
  return canonical;
}

function normalizeReasonCode(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") throw new Error("invalid_lifecycle_reason_code");
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  if (!REASON_CODE.test(normalized)) throw new Error("invalid_lifecycle_reason_code");
  return normalized;
}

function nextState(
  current: OpportunityLifecycleState,
  type: OpportunityLifecycleEventType,
): OpportunityLifecycleState {
  if (TERMINAL_STATES.has(current)) throw new Error("terminal_lifecycle_state_transition");

  if (type === "activate") {
    if (current !== "observed" && current !== "deferred") {
      throw new Error("invalid_lifecycle_transition");
    }
    return "active";
  }

  if (type === "defer") {
    if (current !== "observed" && current !== "active") {
      throw new Error("invalid_lifecycle_transition");
    }
    return "deferred";
  }

  if (type === "dismiss") {
    if (current !== "observed" && current !== "active" && current !== "deferred") {
      throw new Error("invalid_lifecycle_transition");
    }
    return "dismissed";
  }

  if (type === "close") {
    if (current !== "observed" && current !== "active" && current !== "deferred") {
      throw new Error("invalid_lifecycle_transition");
    }
    return "closed";
  }

  if (type === "supersede") {
    if (current !== "observed" && current !== "active" && current !== "deferred") {
      throw new Error("invalid_lifecycle_transition");
    }
    return "superseded";
  }

  throw new Error("invalid_lifecycle_event_type");
}

function normalizeEvents(
  opportunityFingerprint: string,
  actionabilityFingerprint: string,
  events: OpportunityLifecycleEventInput[],
  historyReferenceTime: string,
  knownOpportunities: Set<string>,
): OpportunityLifecycleEvent[] {
  if (!Array.isArray(events) || events.length < 1) throw new Error("invalid_lifecycle_events");
  if (events.length > P6_7_MAX_EVENTS_PER_HISTORY) throw new Error("lifecycle_event_limit_exceeded");

  const normalized = events.map((event) => {
    if (!event || typeof event !== "object" || Array.isArray(event)) {
      throw new Error("invalid_lifecycle_event");
    }
    if (!Number.isInteger(event.sequence) || event.sequence < 1) {
      throw new Error("invalid_lifecycle_sequence");
    }
    if (
      event.type !== "activate" &&
      event.type !== "defer" &&
      event.type !== "dismiss" &&
      event.type !== "close" &&
      event.type !== "supersede"
    ) {
      throw new Error("invalid_lifecycle_event_type");
    }

    const occurredAt = canonicalTimestamp(event.occurredAt, "invalid_lifecycle_event_timestamp");
    if (occurredAt > historyReferenceTime) throw new Error("lifecycle_event_after_reference_time");
    const reasonCode = normalizeReasonCode(event.reasonCode);

    let relatedOpportunityFingerprint: string | null = null;
    if (event.type === "supersede") {
      if (
        typeof event.relatedOpportunityFingerprint !== "string" ||
        !HEX_64.test(event.relatedOpportunityFingerprint)
      ) {
        throw new Error("invalid_supersession_target");
      }
      if (event.relatedOpportunityFingerprint === opportunityFingerprint) {
        throw new Error("self_supersession_not_allowed");
      }
      if (!knownOpportunities.has(event.relatedOpportunityFingerprint)) {
        throw new Error("unknown_supersession_target");
      }
      relatedOpportunityFingerprint = event.relatedOpportunityFingerprint;
    } else if (event.relatedOpportunityFingerprint !== null) {
      throw new Error("unexpected_related_opportunity");
    }

    return {
      sequence: event.sequence,
      occurredAt,
      type: event.type,
      reasonCode,
      relatedOpportunityFingerprint,
    };
  }).sort((a, b) => a.sequence - b.sequence);

  let previousTime: string | null = null;
  let state: OpportunityLifecycleState = "observed";
  return normalized.map((event, index) => {
    if (event.sequence !== index + 1) throw new Error("noncontiguous_lifecycle_sequence");
    if (previousTime !== null && event.occurredAt < previousTime) {
      throw new Error("lifecycle_event_time_regression");
    }

    const fromState = state;
    const toState = nextState(fromState, event.type);
    const identity = {
      version: P6_7_OPPORTUNITY_LIFECYCLE_VERSION,
      opportunityFingerprint,
      actionabilityFingerprint,
      ...event,
      fromState,
      toState,
    };
    const eventFingerprint = hash(identity);
    state = toState;
    previousTime = event.occurredAt;

    return {
      ...event,
      eventId: `p67-event-${eventFingerprint.slice(0, 20)}`,
      eventFingerprint,
      fromState,
      toState,
    };
  });
}

function assertAcyclicSupersession(records: OpportunityLifecycleRecord[]): void {
  const edges = new Map<string, string>();
  for (const record of records) {
    const event = record.events.find((candidate) => candidate.type === "supersede");
    if (event?.relatedOpportunityFingerprint) {
      edges.set(record.opportunityFingerprint, event.relatedOpportunityFingerprint);
    }
  }

  for (const start of edges.keys()) {
    const seen = new Set<string>();
    let cursor: string | undefined = start;
    while (cursor !== undefined) {
      if (seen.has(cursor)) throw new Error("supersession_cycle");
      seen.add(cursor);
      cursor = edges.get(cursor);
    }
  }
}

function normalizeHistories(
  input: OpportunityLifecycleHistoryInput[],
  actionability: OpportunityPreviewDiffInput["actionability"],
  historyReferenceTime: string,
): Map<string, OpportunityLifecycleEvent[]> {
  if (!Array.isArray(input)) throw new Error("invalid_lifecycle_histories");
  if (input.length > P6_7_MAX_HISTORIES) throw new Error("lifecycle_history_limit_exceeded");

  const decisions = new Map(actionability.decisions.map((decision) => [
    decision.opportunityFingerprint,
    decision,
  ]));
  const knownOpportunities = new Set(decisions.keys());
  const output = new Map<string, OpportunityLifecycleEvent[]>();

  for (const history of input) {
    if (!history || typeof history !== "object" || Array.isArray(history)) {
      throw new Error("invalid_lifecycle_history");
    }
    if (
      typeof history.opportunityFingerprint !== "string" ||
      !HEX_64.test(history.opportunityFingerprint)
    ) {
      throw new Error("invalid_lifecycle_opportunity_fingerprint");
    }
    const decision = decisions.get(history.opportunityFingerprint);
    if (!decision) throw new Error("unknown_lifecycle_opportunity");
    if (
      typeof history.actionabilityFingerprint !== "string" ||
      !HEX_64.test(history.actionabilityFingerprint)
    ) {
      throw new Error("invalid_lifecycle_actionability_fingerprint");
    }
    if (history.actionabilityFingerprint !== decision.actionabilityFingerprint) {
      throw new Error("lifecycle_actionability_lineage_mismatch");
    }
    if (output.has(history.opportunityFingerprint)) throw new Error("duplicate_lifecycle_history");

    output.set(
      history.opportunityFingerprint,
      normalizeEvents(
        history.opportunityFingerprint,
        history.actionabilityFingerprint,
        history.events,
        historyReferenceTime,
        knownOpportunities,
      ),
    );
  }

  return output;
}

export function opportunityLifecycleSemantics() {
  return Object.freeze({
    callerSuppliedEventsOnly: true,
    initialObservedMeansSnapshotPresenceOnly: true,
    actionabilityInferencePerformed: false,
    scoreOrRankInferencePerformed: false,
    previewDiffInferencePerformed: false,
    supersessionExplicitOnly: true,
    supersessionSimilarityInferencePerformed: false,
    terminalFingerprintReactivationAllowed: false,
    deferredReactivationRequiresExplicitActivate: true,
    closeImpliesIssueFixed: false,
    lifecycleStateImpliesImplementation: false,
    lifecycleStateImpliesApproval: false,
    lifecycleStateImpliesVerification: false,
    wallClockUsed: false,
    automaticTransitionEnabled: false,
    lifecycleOrderCreatesExecutionPreference: false,
  });
}

export function opportunityLifecycleCapability() {
  return Object.freeze({
    deterministicLifecycleOnly: true,
    legacyOpportunityEngineMutationEnabled: false,
    openApiMutationEnabled: false,
    liveProviderReadsAuthorized: false,
    providerCredentialUseAuthorized: false,
    aiModelCallsAuthorized: false,
    sourceRegistryAdmissionAuthorized: false,
    refreshPlanReorderingEnabled: false,
    task64ExecutionAuthorized: false,
    task70ExecutionAuthorized: false,
    observationPersistenceAuthorized: false,
    evidencePersistenceAuthorized: false,
    scorePersistenceAuthorized: false,
    prioritizationPersistenceAuthorized: false,
    explanationPersistenceAuthorized: false,
    actionabilityPersistenceAuthorized: false,
    previewPersistenceAuthorized: false,
    lifecyclePersistenceAuthorized: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    schemaMutationAuthorized: false,
    schedulerEnabled: false,
    workerEnabled: false,
    retryLoopEnabled: false,
    approvalGrantAuthorized: false,
    applyAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
    automaticTransitionEnabled: false,
    publicationAuthorized: false,
  });
}

export function buildOpportunityLifecycle(
  input: OpportunityLifecycleInput,
): OpportunityLifecycleReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_lifecycle_input");
  }
  if (!input.previewDiffInput || typeof input.previewDiffInput !== "object" || Array.isArray(input.previewDiffInput)) {
    throw new Error("invalid_lifecycle_preview_input");
  }

  const previewDiff = canonicalPreviewDiff(input.previewDiffInput, input.previewDiff);
  const historyReferenceTime = canonicalTimestamp(
    input.historyReferenceTime,
    "invalid_lifecycle_reference_time",
  );
  if (historyReferenceTime < previewDiff.referenceTime) {
    throw new Error("lifecycle_reference_before_opportunity_reference");
  }

  const actionability = input.previewDiffInput.actionability;
  const histories = normalizeHistories(input.histories, actionability, historyReferenceTime);
  const previewsByOpportunity = new Map<string, string[]>();
  for (const preview of previewDiff.previews) {
    const values = previewsByOpportunity.get(preview.opportunityFingerprint) ?? [];
    values.push(preview.previewFingerprint);
    previewsByOpportunity.set(preview.opportunityFingerprint, values);
  }

  const records = actionability.decisions.map((decision) => {
    const events = histories.get(decision.opportunityFingerprint) ?? [];
    const currentState = events.length > 0
      ? events[events.length - 1]!.toState
      : "observed";
    const previewFingerprints = [...(previewsByOpportunity.get(decision.opportunityFingerprint) ?? [])]
      .sort((a, b) => a.localeCompare(b));
    const identity = {
      version: P6_7_OPPORTUNITY_LIFECYCLE_VERSION,
      opportunityId: decision.opportunityId,
      opportunityFingerprint: decision.opportunityFingerprint,
      actionabilityId: decision.actionabilityId,
      actionabilityFingerprint: decision.actionabilityFingerprint,
      actionabilityClassification: decision.classification,
      previewFingerprints,
      initialState: "observed",
      currentState,
      terminal: TERMINAL_STATES.has(currentState),
      eventCount: events.length,
      events,
    };
    const lifecycleFingerprint = hash(identity);

    return {
      lifecycleId: `p67-lifecycle-${lifecycleFingerprint.slice(0, 20)}`,
      lifecycleFingerprint,
      opportunityId: decision.opportunityId,
      opportunityFingerprint: decision.opportunityFingerprint,
      actionabilityId: decision.actionabilityId,
      actionabilityFingerprint: decision.actionabilityFingerprint,
      actionabilityClassification: decision.classification,
      previewFingerprints,
      initialState: "observed" as const,
      currentState,
      terminal: TERMINAL_STATES.has(currentState),
      eventCount: events.length,
      events,
    };
  });

  assertAcyclicSupersession(records);

  const counts = {
    total: records.length,
    observed: records.filter((record) => record.currentState === "observed").length,
    active: records.filter((record) => record.currentState === "active").length,
    deferred: records.filter((record) => record.currentState === "deferred").length,
    dismissed: records.filter((record) => record.currentState === "dismissed").length,
    closed: records.filter((record) => record.currentState === "closed").length,
    superseded: records.filter((record) => record.currentState === "superseded").length,
    events: records.reduce((sum, record) => sum + record.eventCount, 0),
  };
  const semantics = opportunityLifecycleSemantics();
  const identity = {
    version: P6_7_OPPORTUNITY_LIFECYCLE_VERSION,
    collectionKey: previewDiff.collectionKey,
    opportunityReferenceTime: previewDiff.referenceTime,
    historyReferenceTime,
    scope: previewDiff.scope,
    previewDiffReportFingerprint: previewDiff.reportFingerprint,
    counts,
    records,
    semantics,
  };
  const reportFingerprint = hash(identity);

  return {
    version: P6_7_OPPORTUNITY_LIFECYCLE_VERSION,
    reportId: `p67-report-${reportFingerprint.slice(0, 20)}`,
    reportFingerprint,
    collectionKey: previewDiff.collectionKey,
    opportunityReferenceTime: previewDiff.referenceTime,
    historyReferenceTime,
    scope: { ...previewDiff.scope },
    previewDiffReportFingerprint: previewDiff.reportFingerprint,
    counts,
    records,
    semantics,
    safety: opportunityLifecycleCapability(),
  };
}
