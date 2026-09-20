import { createHash } from "node:crypto";
import {
  ACTION_ATTRIBUTION_VERSION,
  buildActionAttribution,
  type ActionAttribution,
  type ActionAttributionReport,
} from "./action-attribution.js";
import {
  WINDOW_CONFOUNDER_VERSION,
  buildActionWindowConfounderReport,
  type ActionWindowConfounderInput,
  type ActionWindowConfounderReport,
  type P103Scope,
} from "./action-window-confounder.js";
import {
  UNIFIED_CHANGE_TIMELINE_VERSION,
  type UnifiedChangeTimelineReport,
  type UnifiedTimelineEvent,
} from "./unified-change-timeline.js";

export const EXPERIMENT_HOLDOUT_VERSION = "p10.4-experiment-holdout-v1" as const;
export const EXPERIMENT_HOLDOUT_MAX_UNITS = 1024 as const;
export const EXPERIMENT_HOLDOUT_MAX_OBSERVATIONS = 8192 as const;

export type P104AssignmentBasis =
  | "externally_randomized"
  | "externally_matched"
  | "externally_selected"
  | "observational";

export type P104DesignState = "treatment_only" | "holdout_defined";
export type P104WindowMembership = "before" | "after" | "outside";

export type P104SourceIdentity = {
  system: string;
  version: string;
  eventId: string;
  eventFingerprint: string;
};

export type P104DesignInput = {
  experimentKey: string;
  assignmentBasis: P104AssignmentBasis;
  source: P104SourceIdentity;
};

export type P104HoldoutUnitInput = {
  unitId: string;
  scope: P103Scope;
  assignmentSource: P104SourceIdentity;
};

export type P104HoldoutObservationInput = {
  unitId: string;
  observedAt: string;
  source: P104SourceIdentity;
  scope: P103Scope;
};

export type P104HoldoutUnit = {
  unitId: string;
  unitFingerprint: string;
  scope: P103Scope;
  assignmentSource: P104SourceIdentity;
};

export type P104HoldoutObservation = {
  observationId: string;
  observationFingerprint: string;
  unitId: string;
  observedAt: string;
  source: P104SourceIdentity;
  scope: P103Scope;
  membership: P104WindowMembership;
};

export type P104StructuralFlagKind =
  | "cross_arm_scope_overlap"
  | "holdout_action_overlap"
  | "treatment_confounder_present"
  | "holdout_missing_before_observation"
  | "holdout_missing_after_observation";

export type P104StructuralFlag = {
  flagId: string;
  flagFingerprint: string;
  kind: P104StructuralFlagKind;
  holdoutUnitId: string | null;
  window: "before" | "after" | null;
  relatedActionId: string | null;
  timelineEventFingerprint: string | null;
  p103ConfounderFingerprint: string | null;
  sharedScopeTokens: string[];
};

export type ExperimentHoldoutInput = {
  timeline: UnifiedChangeTimelineReport;
  attribution: ActionAttributionReport;
  treatmentAnalysisInput: ActionWindowConfounderInput;
  treatmentAnalysisReport: ActionWindowConfounderReport;
  design: P104DesignInput;
  holdouts: P104HoldoutUnitInput[];
  holdoutObservations: P104HoldoutObservationInput[];
};

export type ExperimentHoldoutReport = {
  version: typeof EXPERIMENT_HOLDOUT_VERSION;
  reportId: string;
  reportFingerprint: string;
  timelineId: string;
  timelineFingerprint: string;
  attributionReportId: string;
  attributionReportFingerprint: string;
  treatment: {
    actionId: string;
    actionAttributionFingerprint: string;
    p103ReportId: string;
    p103ReportFingerprint: string;
    anchorEventFingerprint: string;
    beforeWindow: {
      start: string;
      end: string;
    };
    afterWindow: {
      start: string;
      end: string;
    };
    treatmentConfounderCount: number;
  };
  design: {
    experimentKey: string;
    assignmentBasis: P104AssignmentBasis;
    source: P104SourceIdentity;
    designFingerprint: string;
    state: P104DesignState;
  };
  holdouts: {
    total: number;
    values: P104HoldoutUnit[];
  };
  observations: {
    total: number;
    before: number;
    after: number;
    outside: number;
    values: P104HoldoutObservation[];
  };
  structuralFlags: {
    total: number;
    crossArmScopeOverlap: number;
    holdoutActionOverlap: number;
    treatmentConfounderPresent: number;
    holdoutMissingBeforeObservation: number;
    holdoutMissingAfterObservation: number;
    values: P104StructuralFlag[];
  };
  semantics: ReturnType<typeof experimentHoldoutSemantics>;
  safety: ReturnType<typeof experimentHoldoutCapability>;
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

function exactString(value: unknown, errorCode: string, maxLength = 512): string {
  if (
    typeof value !== "string"
    || value.length < 1
    || value.length > maxLength
    || value.trim() !== value
  ) {
    throw new Error(errorCode);
  }
  return value;
}

function normalizeKey(value: unknown, errorCode: string): string {
  const exact = exactString(value, errorCode, 128);
  if (!KEY.test(exact)) throw new Error(errorCode);
  return exact;
}

function canonicalTimestamp(value: unknown, errorCode: string): string {
  if (typeof value !== "string") throw new Error(errorCode);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(errorCode);
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) throw new Error(errorCode);
  return canonical;
}

function normalizeSource(source: P104SourceIdentity): P104SourceIdentity {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("invalid_p10_4_source");
  }
  const version = exactString(source.version, "invalid_p10_4_source_version", 128);
  if (!SOURCE_VERSION.test(version)) throw new Error("invalid_p10_4_source_version");
  if (typeof source.eventFingerprint !== "string" || !HEX_64.test(source.eventFingerprint)) {
    throw new Error("invalid_p10_4_source_event_fingerprint");
  }
  return {
    system: normalizeKey(source.system, "invalid_p10_4_source_system"),
    version,
    eventId: exactString(source.eventId, "invalid_p10_4_source_event_id", 512),
    eventFingerprint: source.eventFingerprint,
  };
}

function normalizeNullableString(
  value: unknown,
  errorCode: string,
  maxLength = 512,
): string | null {
  if (value === null) return null;
  return exactString(value, errorCode, maxLength);
}

function normalizeDomain(value: unknown): string | null {
  if (value === null) return null;
  const domain = exactString(value, "invalid_p10_4_scope_domain", 253);
  if (domain !== domain.toLowerCase() || !/^[a-z0-9.-]+$/.test(domain)) {
    throw new Error("invalid_p10_4_scope_domain");
  }
  return domain;
}

function normalizeUrl(value: unknown): string | null {
  if (value === null) return null;
  const url = exactString(value, "invalid_p10_4_scope_url", 2048);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("invalid_p10_4_scope_url");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("invalid_p10_4_scope_url");
  }
  return url;
}

function normalizeScope(scope: P103Scope, errorPrefix: string): P103Scope {
  if (!scope || typeof scope !== "object" || Array.isArray(scope)) {
    throw new Error(`invalid_${errorPrefix}_scope`);
  }
  return {
    siteId: normalizeNullableString(scope.siteId, `invalid_${errorPrefix}_site_id`),
    domain: normalizeDomain(scope.domain),
    pageId: normalizeNullableString(scope.pageId, `invalid_${errorPrefix}_page_id`),
    url: normalizeUrl(scope.url),
    query: normalizeNullableString(scope.query, `invalid_${errorPrefix}_query`, 2048),
    category: normalizeNullableString(scope.category, `invalid_${errorPrefix}_category`, 256),
  };
}

function hasEntityScope(scope: P103Scope): boolean {
  return scope.pageId !== null
    || scope.url !== null
    || scope.query !== null
    || scope.category !== null;
}

function sourceKey(source: P104SourceIdentity): string {
  return `${source.system}\u0000${source.version}\u0000${source.eventId}`;
}

function verifyP10Chain(input: ExperimentHoldoutInput): {
  attribution: ActionAttributionReport;
  treatmentReport: ActionWindowConfounderReport;
  treatmentAction: ActionAttribution;
} {
  if (!input.timeline || typeof input.timeline !== "object" || Array.isArray(input.timeline)) {
    throw new Error("invalid_p10_4_timeline");
  }
  if (input.timeline.version !== UNIFIED_CHANGE_TIMELINE_VERSION) {
    throw new Error("unsupported_p10_1_timeline_version");
  }
  if (!input.attribution || typeof input.attribution !== "object" || Array.isArray(input.attribution)) {
    throw new Error("invalid_p10_4_attribution");
  }
  if (input.attribution.version !== ACTION_ATTRIBUTION_VERSION) {
    throw new Error("unsupported_p10_2_attribution_version");
  }

  const rebuiltAttribution = buildActionAttribution(input.timeline);
  if (canonicalJson(input.attribution) !== canonicalJson(rebuiltAttribution)) {
    throw new Error("p10_2_attribution_integrity_mismatch");
  }

  if (
    canonicalJson(input.treatmentAnalysisInput.timeline) !== canonicalJson(input.timeline)
    || canonicalJson(input.treatmentAnalysisInput.attribution) !== canonicalJson(input.attribution)
  ) {
    throw new Error("p10_4_treatment_input_lineage_mismatch");
  }

  const rebuiltTreatment = buildActionWindowConfounderReport(input.treatmentAnalysisInput);
  if (rebuiltTreatment.version !== WINDOW_CONFOUNDER_VERSION) {
    throw new Error("unsupported_p10_3_window_confounder_version");
  }
  if (canonicalJson(input.treatmentAnalysisReport) !== canonicalJson(rebuiltTreatment)) {
    throw new Error("p10_3_treatment_integrity_mismatch");
  }
  if (
    rebuiltTreatment.timelineId !== input.timeline.timelineId
    || rebuiltTreatment.timelineFingerprint !== input.timeline.timelineFingerprint
    || rebuiltTreatment.attributionReportId !== rebuiltAttribution.reportId
    || rebuiltTreatment.attributionReportFingerprint !== rebuiltAttribution.reportFingerprint
  ) {
    throw new Error("p10_4_treatment_lineage_binding_mismatch");
  }

  const treatmentAction = rebuiltAttribution.actions.find(
    (candidate) => candidate.actionId === rebuiltTreatment.actionId,
  );
  if (!treatmentAction) throw new Error("p10_4_treatment_action_not_found");

  if (
    rebuiltTreatment.anchor.status !== "available"
    || rebuiltTreatment.anchor.timelineEventFingerprint === null
  ) {
    throw new Error("p10_4_treatment_anchor_unavailable");
  }
  if (
    rebuiltTreatment.windows.before.status !== "available"
    || rebuiltTreatment.windows.after.status !== "available"
  ) {
    throw new Error("p10_4_treatment_windows_required");
  }

  return {
    attribution: rebuiltAttribution,
    treatmentReport: rebuiltTreatment,
    treatmentAction,
  };
}

function normalizeDesign(design: P104DesignInput) {
  if (!design || typeof design !== "object" || Array.isArray(design)) {
    throw new Error("invalid_p10_4_design");
  }
  const allowed = new Set<P104AssignmentBasis>([
    "externally_randomized",
    "externally_matched",
    "externally_selected",
    "observational",
  ]);
  if (!allowed.has(design.assignmentBasis)) {
    throw new Error("invalid_p10_4_assignment_basis");
  }
  const normalized = {
    experimentKey: normalizeKey(design.experimentKey, "invalid_p10_4_experiment_key"),
    assignmentBasis: design.assignmentBasis,
    source: normalizeSource(design.source),
  };
  return {
    ...normalized,
    designFingerprint: hash({
      version: EXPERIMENT_HOLDOUT_VERSION,
      recordType: "design",
      ...normalized,
    }),
  };
}

function normalizeHoldouts(holdouts: P104HoldoutUnitInput[]): P104HoldoutUnit[] {
  if (!Array.isArray(holdouts)) throw new Error("invalid_p10_4_holdouts");
  if (holdouts.length > EXPERIMENT_HOLDOUT_MAX_UNITS) {
    throw new Error("p10_4_holdout_limit_exceeded");
  }

  const bySource = new Map<string, P104HoldoutUnit>();
  const byUnitId = new Map<string, P104HoldoutUnit>();

  for (const input of holdouts) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("invalid_p10_4_holdout");
    }
    const normalized = {
      unitId: normalizeKey(input.unitId, "invalid_p10_4_holdout_unit_id"),
      scope: normalizeScope(input.scope, "p10_4_holdout"),
      assignmentSource: normalizeSource(input.assignmentSource),
    };
    if (!hasEntityScope(normalized.scope)) {
      throw new Error("p10_4_holdout_entity_scope_required");
    }
    const unitFingerprint = hash({
      version: EXPERIMENT_HOLDOUT_VERSION,
      recordType: "holdout_unit",
      ...normalized,
    });
    const candidate: P104HoldoutUnit = {
      ...normalized,
      unitFingerprint,
    };

    const sourceIdentity = sourceKey(candidate.assignmentSource);
    const sourceExisting = bySource.get(sourceIdentity);
    if (sourceExisting && canonicalJson(sourceExisting) !== canonicalJson(candidate)) {
      throw new Error("p10_4_holdout_assignment_source_conflict");
    }

    const unitExisting = byUnitId.get(candidate.unitId);
    if (unitExisting && canonicalJson(unitExisting) !== canonicalJson(candidate)) {
      throw new Error("p10_4_holdout_unit_id_conflict");
    }

    bySource.set(sourceIdentity, candidate);
    byUnitId.set(candidate.unitId, candidate);
  }

  return [...byUnitId.values()].sort((a, b) =>
    a.unitId.localeCompare(b.unitId)
    || a.unitFingerprint.localeCompare(b.unitFingerprint)
  );
}

function normalizeObservations(
  observations: P104HoldoutObservationInput[],
  units: Map<string, P104HoldoutUnit>,
  before: { start: string; end: string },
  after: { start: string; end: string },
): P104HoldoutObservation[] {
  if (!Array.isArray(observations)) throw new Error("invalid_p10_4_holdout_observations");
  if (observations.length > EXPERIMENT_HOLDOUT_MAX_OBSERVATIONS) {
    throw new Error("p10_4_holdout_observation_limit_exceeded");
  }

  const bySource = new Map<string, P104HoldoutObservation>();

  for (const input of observations) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("invalid_p10_4_holdout_observation");
    }
    const unitId = normalizeKey(input.unitId, "invalid_p10_4_observation_unit_id");
    const unit = units.get(unitId);
    if (!unit) throw new Error("p10_4_observation_holdout_not_found");

    const observedAt = canonicalTimestamp(
      input.observedAt,
      "invalid_p10_4_holdout_observation_timestamp",
    );
    const source = normalizeSource(input.source);
    const scope = normalizeScope(input.scope, "p10_4_observation");
    if (canonicalJson(scope) !== canonicalJson(unit.scope)) {
      throw new Error("p10_4_observation_scope_mismatch");
    }

    const membership: P104WindowMembership = observedAt >= before.start && observedAt <= before.end
      ? "before"
      : observedAt >= after.start && observedAt <= after.end
        ? "after"
        : "outside";

    const observationFingerprint = hash({
      version: EXPERIMENT_HOLDOUT_VERSION,
      recordType: "holdout_observation",
      unitId,
      observedAt,
      source,
      scope,
    });
    const candidate: P104HoldoutObservation = {
      observationId: `p104-observation-${observationFingerprint.slice(0, 24)}`,
      observationFingerprint,
      unitId,
      observedAt,
      source,
      scope,
      membership,
    };

    const key = sourceKey(source);
    const existing = bySource.get(key);
    if (existing && canonicalJson(existing) !== canonicalJson(candidate)) {
      throw new Error("p10_4_observation_source_conflict");
    }
    bySource.set(key, candidate);
  }

  return [...bySource.values()].sort((a, b) =>
    a.unitId.localeCompare(b.unitId)
    || a.observedAt.localeCompare(b.observedAt)
    || a.observationFingerprint.localeCompare(b.observationFingerprint)
  );
}

function treatmentScopeTokens(action: ActionAttribution): Set<string> {
  const tokens = new Set<string>();
  if (action.pages.status === "direct") {
    for (const page of action.pages.values) {
      if (page.pageId !== null) tokens.add(`page_id:${page.pageId}`);
      if (page.url !== null) tokens.add(`url:${page.url}`);
    }
  }
  if (action.queries.status === "direct") {
    for (const query of action.queries.values) tokens.add(`query:${query.value}`);
  }
  if (action.categories.status === "direct") {
    for (const category of action.categories.values) tokens.add(`category:${category.value}`);
  }
  return tokens;
}

function scopeTokens(scope: P103Scope): string[] {
  const values: string[] = [];
  if (scope.pageId !== null) values.push(`page_id:${scope.pageId}`);
  if (scope.url !== null) values.push(`url:${scope.url}`);
  if (scope.query !== null) values.push(`query:${scope.query}`);
  if (scope.category !== null) values.push(`category:${scope.category}`);
  return values.sort();
}

function actionMatchesScope(action: ActionAttribution, scope: P103Scope): boolean {
  if (scope.siteId !== null && action.site.siteId !== scope.siteId) return false;
  if (scope.domain !== null && action.site.domain !== scope.domain) return false;

  if (scope.pageId !== null || scope.url !== null) {
    if (action.pages.status !== "direct") return false;
    const pageMatch = action.pages.values.some((page) =>
      (scope.pageId === null || page.pageId === scope.pageId)
      && (scope.url === null || page.url === scope.url)
    );
    if (!pageMatch) return false;
  }

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

  return hasEntityScope(scope);
}

function eventWindow(
  event: UnifiedTimelineEvent,
  before: { start: string; end: string },
  after: { start: string; end: string },
): "before" | "after" | null {
  if (event.occurredAt >= before.start && event.occurredAt <= before.end) return "before";
  if (event.occurredAt >= after.start && event.occurredAt <= after.end) return "after";
  return null;
}

function makeFlag(
  input: Omit<P104StructuralFlag, "flagId" | "flagFingerprint">,
): P104StructuralFlag {
  const flagFingerprint = hash({
    version: EXPERIMENT_HOLDOUT_VERSION,
    recordType: "structural_flag",
    ...input,
  });
  return {
    flagId: `p104-flag-${flagFingerprint.slice(0, 24)}`,
    flagFingerprint,
    ...input,
  };
}

function structuralFlags(
  timeline: UnifiedChangeTimelineReport,
  attribution: ActionAttributionReport,
  treatmentAction: ActionAttribution,
  treatmentReport: ActionWindowConfounderReport,
  holdouts: P104HoldoutUnit[],
  observations: P104HoldoutObservation[],
  before: { start: string; end: string },
  after: { start: string; end: string },
): P104StructuralFlag[] {
  const flags: P104StructuralFlag[] = [];
  const treatmentTokens = treatmentScopeTokens(treatmentAction);

  for (const holdout of holdouts) {
    const sharedScopeTokens = scopeTokens(holdout.scope).filter((token) =>
      treatmentTokens.has(token)
    );
    if (sharedScopeTokens.length > 0) {
      flags.push(makeFlag({
        kind: "cross_arm_scope_overlap",
        holdoutUnitId: holdout.unitId,
        window: null,
        relatedActionId: treatmentAction.actionId,
        timelineEventFingerprint: null,
        p103ConfounderFingerprint: null,
        sharedScopeTokens,
      }));
    }

    for (const action of attribution.actions) {
      if (action.actionId === treatmentAction.actionId) continue;
      if (!actionMatchesScope(action, holdout.scope)) continue;

      for (const event of timeline.events) {
        if (
          event.lineage.actionId !== action.actionId
          || event.eventKind !== "verified_change_retained_live"
        ) {
          continue;
        }
        const window = eventWindow(event, before, after);
        if (window === null) continue;
        flags.push(makeFlag({
          kind: "holdout_action_overlap",
          holdoutUnitId: holdout.unitId,
          window,
          relatedActionId: action.actionId,
          timelineEventFingerprint: event.eventFingerprint,
          p103ConfounderFingerprint: null,
          sharedScopeTokens: scopeTokens(holdout.scope),
        }));
      }
    }

    const unitObservations = observations.filter(
      (observation) => observation.unitId === holdout.unitId,
    );
    if (!unitObservations.some((observation) => observation.membership === "before")) {
      flags.push(makeFlag({
        kind: "holdout_missing_before_observation",
        holdoutUnitId: holdout.unitId,
        window: "before",
        relatedActionId: null,
        timelineEventFingerprint: null,
        p103ConfounderFingerprint: null,
        sharedScopeTokens: [],
      }));
    }
    if (!unitObservations.some((observation) => observation.membership === "after")) {
      flags.push(makeFlag({
        kind: "holdout_missing_after_observation",
        holdoutUnitId: holdout.unitId,
        window: "after",
        relatedActionId: null,
        timelineEventFingerprint: null,
        p103ConfounderFingerprint: null,
        sharedScopeTokens: [],
      }));
    }
  }

  for (const confounder of treatmentReport.confounders.values) {
    flags.push(makeFlag({
      kind: "treatment_confounder_present",
      holdoutUnitId: null,
      window: confounder.window,
      relatedActionId: treatmentAction.actionId,
      timelineEventFingerprint: confounder.timelineEventFingerprint,
      p103ConfounderFingerprint: confounder.flagFingerprint,
      sharedScopeTokens: [...confounder.sharedAssociations].sort(),
    }));
  }

  return flags.sort((a, b) =>
    a.kind.localeCompare(b.kind)
    || (a.holdoutUnitId ?? "").localeCompare(b.holdoutUnitId ?? "")
    || (a.window ?? "").localeCompare(b.window ?? "")
    || (a.relatedActionId ?? "").localeCompare(b.relatedActionId ?? "")
    || a.flagFingerprint.localeCompare(b.flagFingerprint)
  );
}

export function experimentHoldoutSemantics() {
  return Object.freeze({
    exactP10_1IntegrityRequired: true,
    exactP10_2IntegrityRequired: true,
    exactP10_3IntegrityRequired: true,
    singleTreatmentActionOnly: true,
    suppliedHoldoutDefinitionsOnly: true,
    suppliedAssignmentBasisOnly: true,
    sharedP10_3WindowsOnly: true,
    exactHoldoutScopeOnly: true,
    exactReplayDeduped: true,
    conflictingReplayFailsClosed: true,
    structuralContaminationFlagsOnly: true,
    externallyRandomizedDeclarationVerified: false,
    externallyMatchedDeclarationVerified: false,
    holdoutPresenceEstablishesComparability: false,
    scopeDisjointnessEstablishesExchangeability: false,
    beforeAfterTimingEstablishesCausality: false,
    contaminationFlagsPerformCausalAdjustment: false,
    treatmentEffectCalculated: false,
    statisticalSignificanceCalculated: false,
    confidenceIntervalCalculated: false,
    causalAttributionPerformed: false,
    rolloutRecommendationGenerated: false,
    experimentSuccessDeclared: false,
  });
}

export function experimentHoldoutCapability() {
  return Object.freeze({
    version: EXPERIMENT_HOLDOUT_VERSION,
    deterministicProjectionOnly: true,
    readOnlyArchitectureOnly: true,
    liveExperimentAssignmentAuthorized: false,
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
    p105ImplementationAuthorized: false,
    automaticTransition: false,
    publicationAuthorized: false,
  });
}

export function buildExperimentHoldoutReport(
  input: ExperimentHoldoutInput,
): ExperimentHoldoutReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_p10_4_input");
  }

  const { attribution, treatmentReport, treatmentAction } = verifyP10Chain(input);
  const design = normalizeDesign(input.design);
  const holdouts = normalizeHoldouts(input.holdouts);
  const unitMap = new Map(holdouts.map((unit) => [unit.unitId, unit]));

  const beforeState = treatmentReport.windows.before;
  const afterState = treatmentReport.windows.after;
  if (beforeState.status !== "available" || afterState.status !== "available") {
    throw new Error("p10_4_treatment_windows_required");
  }
  const before = { start: beforeState.start, end: beforeState.end };
  const after = { start: afterState.start, end: afterState.end };

  const observations = normalizeObservations(
    input.holdoutObservations,
    unitMap,
    before,
    after,
  );
  const flags = structuralFlags(
    input.timeline,
    attribution,
    treatmentAction,
    treatmentReport,
    holdouts,
    observations,
    before,
    after,
  );

  const observationSummary = {
    total: observations.length,
    before: observations.filter((item) => item.membership === "before").length,
    after: observations.filter((item) => item.membership === "after").length,
    outside: observations.filter((item) => item.membership === "outside").length,
    values: observations,
  };

  const flagSummary = {
    total: flags.length,
    crossArmScopeOverlap: flags.filter(
      (item) => item.kind === "cross_arm_scope_overlap",
    ).length,
    holdoutActionOverlap: flags.filter(
      (item) => item.kind === "holdout_action_overlap",
    ).length,
    treatmentConfounderPresent: flags.filter(
      (item) => item.kind === "treatment_confounder_present",
    ).length,
    holdoutMissingBeforeObservation: flags.filter(
      (item) => item.kind === "holdout_missing_before_observation",
    ).length,
    holdoutMissingAfterObservation: flags.filter(
      (item) => item.kind === "holdout_missing_after_observation",
    ).length,
    values: flags,
  };

  const semantics = experimentHoldoutSemantics();
  const identity = {
    version: EXPERIMENT_HOLDOUT_VERSION,
    timelineId: input.timeline.timelineId,
    timelineFingerprint: input.timeline.timelineFingerprint,
    attributionReportId: attribution.reportId,
    attributionReportFingerprint: attribution.reportFingerprint,
    treatment: {
      actionId: treatmentAction.actionId,
      actionAttributionFingerprint: treatmentAction.attributionFingerprint,
      p103ReportId: treatmentReport.reportId,
      p103ReportFingerprint: treatmentReport.reportFingerprint,
      anchorEventFingerprint: treatmentReport.anchor.timelineEventFingerprint!,
      beforeWindow: before,
      afterWindow: after,
      treatmentConfounderCount: treatmentReport.confounders.total,
    },
    design: {
      ...design,
      state: holdouts.length === 0
        ? "treatment_only" as const
        : "holdout_defined" as const,
    },
    holdouts: {
      total: holdouts.length,
      values: holdouts,
    },
    observations: observationSummary,
    structuralFlags: flagSummary,
    semantics,
  };
  const reportFingerprint = hash(identity);

  return {
    reportId: `p104-report-${reportFingerprint.slice(0, 24)}`,
    reportFingerprint,
    ...identity,
    safety: experimentHoldoutCapability(),
  };
}
