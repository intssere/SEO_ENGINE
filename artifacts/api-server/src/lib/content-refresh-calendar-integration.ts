import {
  assertContentOpportunityModelIntegrity,
  type ContentOpportunityModelResult,
} from "./content-opportunity-model-contract.js";
import {
  assertDecayOpportunityIntegrationIntegrity,
  type DecayOpportunityIntegrationResult,
  type DecayOpportunityProjection,
} from "./content-decay-opportunity-integration.js";
import {
  type ContentCalendarMode,
  type ContentCalendarPolicy,
} from "./content-calendar-policy-projection.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const UGP_REFRESH_CALENDAR_INTEGRATION_VERSION =
  "ugp-8-4d-refresh-planning-calendar-integration-v1" as const;

export type RefreshCalendarCandidateInput = Readonly<{
  opportunityFingerprint: string;
  category: string;
  priorityScore: number;
  readinessFingerprint: string;
}>;

export type RefreshCalendarScheduledItem = Readonly<{
  opportunityId: string;
  opportunityFingerprint: string;
  decayProjectionFingerprint: string;
  originalAction:
    | "create_candidate"
    | "refresh_candidate"
    | "consolidate_candidate"
    | "leave_alone"
    | "defer_insufficient_evidence";
  action: "refresh_candidate";
  requiredPublicationPlanOperation: "update";
  category: string;
  priorityScore: number;
  readinessFingerprint: string;
  boundPageUrls: readonly string[];
  boundDecayAssessmentFingerprints: readonly string[];
  scheduledDate: string;
  weekIndex: number;
  slotIndex: number;
  reviewRequired: boolean;
  autopilotPolicySelected: boolean;
  publicationAuthorized: false;
  executionAuthorized: false;
  itemFingerprint: string;
}>;

export type RefreshCalendarDeferredItem = Readonly<{
  opportunityFingerprint: string;
  reason:
    | "category_not_allowed"
    | "projected_action_not_refresh"
    | "capacity_exhausted";
}>;

export type RefreshCalendarProjection = Readonly<{
  version: typeof UGP_REFRESH_CALENDAR_INTEGRATION_VERSION;
  opportunityModelFingerprint: string;
  decayOpportunityIntegrationFingerprint: string;
  startDate: string;
  weeks: number;
  policy: ContentCalendarPolicy;
  scheduled: readonly RefreshCalendarScheduledItem[];
  deferred: readonly RefreshCalendarDeferredItem[];
  capacity: Readonly<{
    theoreticalSlots: number;
    availableDateSlots: number;
    scheduled: number;
    unused: number;
  }>;
  semantics: Readonly<{
    deterministic: true;
    planningOnly: true;
    refreshOnly: true;
    reusesCalendarPolicySemantics: true;
    canonicalReadinessFingerprintRequired: true;
    projectedActionDoesNotMutateOpportunity: true;
    schedulerMaterialized: false;
    schedulerAuthorized: false;
    grantsAuthorization: false;
    publicationAuthorized: false;
    executionAuthorized: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  projectionFingerprint: string;
}>;

export type RefreshCalendarWorkSpec = Readonly<{
  version: typeof UGP_REFRESH_CALENDAR_INTEGRATION_VERSION;
  workSpecId: string;
  workSpecFingerprint: string;
  lifecycle: "proposed";
  workClass: "content_article_refresh";
  schedule: Readonly<{
    kind: "calendar_date";
    scheduledDate: string;
  }>;
  lineage: Readonly<{
    opportunityModelFingerprint: string;
    decayOpportunityIntegrationFingerprint: string;
    decayProjectionFingerprint: string;
    refreshCalendarProjectionFingerprint: string;
    refreshCalendarItemFingerprint: string;
    opportunityFingerprint: string;
    readinessFingerprint: string;
    boundDecayAssessmentFingerprints: readonly string[];
    boundPageUrls: readonly string[];
  }>;
  operation: "update";
  policy: Readonly<{
    reviewRequired: boolean;
    autopilotPolicySelected: boolean;
  }>;
  runtimeRequirements: Readonly<{
    canonicalArticleReadinessRevalidationRequired: true;
    articleDraftAndQualityGateLineageRequired: true;
    publicationPlanRevalidationRequired: true;
    publicationPlanOperationMustBeUpdate: true;
    existingContentTargetRequired: true;
    policyRecheckAtClaimRequired: true;
    decayProjectionRevalidationRequired: true;
    explicitAuthorizationRequiredBeforeExecution: true;
    authorizationEmbedded: false;
    executionRequestEmbedded: false;
    transportMaterializationRequired: true;
  }>;
  semantics: Readonly<{
    deterministic: true;
    immutableSpecification: true;
    schedulerReady: true;
    dateOnlySchedule: true;
    planningOnly: true;
    queueMaterialized: false;
    schedulerActivated: false;
    retryPolicyGranted: false;
    deadLetterPolicyGranted: false;
    grantsAuthorization: false;
    publicationAuthorized: false;
    executionAuthorized: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
}>;

const HEX64 = /^[0-9a-f]{64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORY = /^[a-z0-9][a-z0-9._:-]{0,95}$/;
const WORK_ID = /^rcws-[0-9a-f]{24}$/;

const SEMANTICS = Object.freeze({
  deterministic: true as const,
  planningOnly: true as const,
  refreshOnly: true as const,
  reusesCalendarPolicySemantics: true as const,
  canonicalReadinessFingerprintRequired: true as const,
  projectedActionDoesNotMutateOpportunity: true as const,
  schedulerMaterialized: false as const,
  schedulerAuthorized: false as const,
  grantsAuthorization: false as const,
  publicationAuthorized: false as const,
  executionAuthorized: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  providerWrites: false as const,
  publicSiteWrites: false as const,
});

const WORK_RUNTIME = Object.freeze({
  canonicalArticleReadinessRevalidationRequired: true as const,
  articleDraftAndQualityGateLineageRequired: true as const,
  publicationPlanRevalidationRequired: true as const,
  publicationPlanOperationMustBeUpdate: true as const,
  existingContentTargetRequired: true as const,
  policyRecheckAtClaimRequired: true as const,
  decayProjectionRevalidationRequired: true as const,
  explicitAuthorizationRequiredBeforeExecution: true as const,
  authorizationEmbedded: false as const,
  executionRequestEmbedded: false as const,
  transportMaterializationRequired: true as const,
});

const WORK_SEMANTICS = Object.freeze({
  deterministic: true as const,
  immutableSpecification: true as const,
  schedulerReady: true as const,
  dateOnlySchedule: true as const,
  planningOnly: true as const,
  queueMaterialized: false as const,
  schedulerActivated: false as const,
  retryPolicyGranted: false as const,
  deadLetterPolicyGranted: false as const,
  grantsAuthorization: false as const,
  publicationAuthorized: false as const,
  executionAuthorized: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  providerWrites: false as const,
  publicSiteWrites: false as const,
});

function fp(value: unknown, field: string): string {
  if (typeof value !== "string" || !HEX64.test(value)) {
    throw new Error("ugp_refresh_calendar_invalid_" + field);
  }
  return value;
}

function exactDate(value: unknown, field: string): string {
  if (typeof value !== "string" || !DATE.test(value)) {
    throw new Error("ugp_refresh_calendar_invalid_" + field);
  }
  const parsed = new Date(value + "T00:00:00.000Z");
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("ugp_refresh_calendar_invalid_" + field);
  }
  return value;
}

function normalizeCategory(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("ugp_refresh_calendar_invalid_category");
  }
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  if (!CATEGORY.test(normalized)) {
    throw new Error("ugp_refresh_calendar_invalid_category");
  }
  return normalized;
}

function normalizeScore(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error("ugp_refresh_calendar_invalid_priority_score");
  }
  return Math.round(value * 1000) / 1000;
}

function normalizePolicy(input: ContentCalendarPolicy): ContentCalendarPolicy {
  if (!Number.isInteger(input.articlesPerWeek) || input.articlesPerWeek < 1 || input.articlesPerWeek > 7) {
    throw new Error("ugp_refresh_calendar_invalid_articles_per_week");
  }
  if (!Array.isArray(input.allowedCategories) || input.allowedCategories.length < 1 || input.allowedCategories.length > 32) {
    throw new Error("ugp_refresh_calendar_invalid_allowed_categories");
  }
  const allowedCategories = Object.freeze(
    [...new Set(input.allowedCategories.map(normalizeCategory))].sort(),
  );
  const blackoutDates = Object.freeze(
    [...new Set((input.blackoutDates ?? []).map((value) => exactDate(value, "blackout_date")))].sort(),
  );
  const mode: ContentCalendarMode = input.mode;
  if (mode !== "review_required" && mode !== "autopilot_policy") {
    throw new Error("ugp_refresh_calendar_invalid_mode");
  }
  return Object.freeze({
    articlesPerWeek: input.articlesPerWeek,
    allowedCategories,
    blackoutDates,
    mode,
  });
}

function plusDays(date: string, days: number): string {
  const parsed = new Date(date + "T00:00:00.000Z");
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function assertModelIntegrationLineage(
  opportunityModel: ContentOpportunityModelResult,
  integration: DecayOpportunityIntegrationResult,
): void {
  assertContentOpportunityModelIntegrity(opportunityModel);
  assertDecayOpportunityIntegrationIntegrity(integration);
  if (integration.opportunityModelFingerprint !== opportunityModel.opportunityModelFingerprint) {
    throw new Error("ugp_refresh_calendar_opportunity_model_lineage_mismatch");
  }

  const opportunities = new Map(
    opportunityModel.opportunities.map((opportunity) => [
      opportunity.opportunityFingerprint,
      opportunity,
    ] as const),
  );
  if (integration.projections.length !== opportunityModel.opportunities.length) {
    throw new Error("ugp_refresh_calendar_projection_set_incomplete");
  }

  const seen = new Set<string>();
  for (const projection of integration.projections) {
    if (seen.has(projection.opportunityFingerprint)) {
      throw new Error("ugp_refresh_calendar_duplicate_decay_projection");
    }
    seen.add(projection.opportunityFingerprint);
    const opportunity = opportunities.get(projection.opportunityFingerprint);
    if (!opportunity) {
      throw new Error("ugp_refresh_calendar_unknown_decay_opportunity");
    }
    if (
      projection.opportunityId !== opportunity.opportunityId
      || projection.clusterFingerprint !== opportunity.clusterFingerprint
      || projection.originalAction !== opportunity.recommendedAction
      || projection.businessRelevance !== opportunity.businessRelevance.relevance
      || projection.cannibalizationState !== opportunity.cannibalizationState
    ) {
      throw new Error("ugp_refresh_calendar_decay_projection_lineage_mismatch");
    }
  }
}

function projectionMap(
  integration: DecayOpportunityIntegrationResult,
): Map<string, DecayOpportunityProjection> {
  return new Map(
    integration.projections.map((projection) => [
      projection.opportunityFingerprint,
      projection,
    ] as const),
  );
}

export function buildRefreshCalendarProjection(input: {
  opportunityModel: ContentOpportunityModelResult;
  decayIntegration: DecayOpportunityIntegrationResult;
  candidates: readonly RefreshCalendarCandidateInput[];
  policy: ContentCalendarPolicy;
  startDate: string;
  weeks: number;
}): RefreshCalendarProjection {
  assertModelIntegrationLineage(input.opportunityModel, input.decayIntegration);
  if (!Array.isArray(input.candidates)) {
    throw new Error("ugp_refresh_calendar_candidates_required");
  }
  const startDate = exactDate(input.startDate, "start_date");
  if (!Number.isInteger(input.weeks) || input.weeks < 1 || input.weeks > 26) {
    throw new Error("ugp_refresh_calendar_invalid_weeks");
  }
  const policy = normalizePolicy(input.policy);
  const allowed = new Set(policy.allowedCategories);
  const blackout = new Set(policy.blackoutDates);
  const opportunities = new Map(
    input.opportunityModel.opportunities.map((opportunity) => [
      opportunity.opportunityFingerprint,
      opportunity,
    ] as const),
  );
  const projections = projectionMap(input.decayIntegration);
  const seen = new Set<string>();
  const eligible: Array<{
    projection: DecayOpportunityProjection;
    candidate: RefreshCalendarCandidateInput;
    category: string;
    priority: number;
  }> = [];
  const deferred: RefreshCalendarDeferredItem[] = [];

  for (const candidate of input.candidates) {
    const opportunityFingerprint = fp(candidate.opportunityFingerprint, "opportunity_fingerprint");
    if (seen.has(opportunityFingerprint)) {
      throw new Error("ugp_refresh_calendar_duplicate_candidate");
    }
    seen.add(opportunityFingerprint);
    if (!opportunities.has(opportunityFingerprint)) {
      throw new Error("ugp_refresh_calendar_unknown_opportunity");
    }
    const projection = projections.get(opportunityFingerprint);
    if (!projection) {
      throw new Error("ugp_refresh_calendar_missing_decay_projection");
    }
    const category = normalizeCategory(candidate.category);
    const priority = normalizeScore(candidate.priorityScore);
    fp(candidate.readinessFingerprint, "readiness_fingerprint");

    if (projection.projectedAction !== "refresh_candidate") {
      deferred.push(Object.freeze({
        opportunityFingerprint,
        reason: "projected_action_not_refresh",
      }));
      continue;
    }
    if (!allowed.has(category)) {
      deferred.push(Object.freeze({
        opportunityFingerprint,
        reason: "category_not_allowed",
      }));
      continue;
    }
    if (
      projection.boundPageUrls.length < 1
      || projection.boundDecayAssessmentFingerprints.length < 1
    ) {
      throw new Error("ugp_refresh_calendar_refresh_projection_missing_page_lineage");
    }
    eligible.push({ projection, candidate, category, priority });
  }

  eligible.sort((left, right) =>
    right.priority - left.priority
    || left.projection.opportunityFingerprint.localeCompare(
      right.projection.opportunityFingerprint,
    ),
  );

  const slots: Array<{ date: string; weekIndex: number; slotIndex: number }> = [];
  let availableDateSlots = 0;
  for (let weekIndex = 0; weekIndex < input.weeks; weekIndex++) {
    let assigned = 0;
    for (let dayIndex = 0; dayIndex < 7 && assigned < policy.articlesPerWeek; dayIndex++) {
      const date = plusDays(startDate, weekIndex * 7 + dayIndex);
      if (blackout.has(date)) continue;
      slots.push({ date, weekIndex, slotIndex: assigned });
      assigned++;
      availableDateSlots++;
    }
  }

  const scheduled: RefreshCalendarScheduledItem[] = [];
  for (let index = 0; index < eligible.length; index++) {
    const item = eligible[index]!;
    const slot = slots[index];
    if (!slot) {
      deferred.push(Object.freeze({
        opportunityFingerprint: item.projection.opportunityFingerprint,
        reason: "capacity_exhausted",
      }));
      continue;
    }
    const base = {
      opportunityId: item.projection.opportunityId,
      opportunityFingerprint: item.projection.opportunityFingerprint,
      decayProjectionFingerprint: item.projection.projectionFingerprint,
      originalAction: item.projection.originalAction,
      action: "refresh_candidate" as const,
      requiredPublicationPlanOperation: "update" as const,
      category: item.category,
      priorityScore: item.priority,
      readinessFingerprint: item.candidate.readinessFingerprint,
      boundPageUrls: item.projection.boundPageUrls,
      boundDecayAssessmentFingerprints:
        item.projection.boundDecayAssessmentFingerprints,
      scheduledDate: slot.date,
      weekIndex: slot.weekIndex,
      slotIndex: slot.slotIndex,
      reviewRequired: policy.mode === "review_required",
      autopilotPolicySelected: policy.mode === "autopilot_policy",
      publicationAuthorized: false as const,
      executionAuthorized: false as const,
    };
    scheduled.push(Object.freeze({
      ...base,
      itemFingerprint: stableEvidenceHash({
        purpose: "ugp_refresh_calendar_item",
        version: UGP_REFRESH_CALENDAR_INTEGRATION_VERSION,
        ...base,
      }),
    }));
  }

  deferred.sort((left, right) =>
    left.opportunityFingerprint.localeCompare(right.opportunityFingerprint)
    || left.reason.localeCompare(right.reason),
  );

  const base = {
    version: UGP_REFRESH_CALENDAR_INTEGRATION_VERSION,
    opportunityModelFingerprint: input.opportunityModel.opportunityModelFingerprint,
    decayOpportunityIntegrationFingerprint: input.decayIntegration.integrationFingerprint,
    startDate,
    weeks: input.weeks,
    policy,
    scheduled: Object.freeze(scheduled),
    deferred: Object.freeze(deferred),
    capacity: Object.freeze({
      theoreticalSlots: input.weeks * policy.articlesPerWeek,
      availableDateSlots,
      scheduled: scheduled.length,
      unused: Math.max(0, availableDateSlots - scheduled.length),
    }),
    semantics: SEMANTICS,
  };

  return Object.freeze({
    ...base,
    projectionFingerprint: stableEvidenceHash({
      purpose: "ugp_refresh_calendar_projection",
      ...base,
    }),
  });
}

export function assertRefreshCalendarProjectionIntegrity(
  result: RefreshCalendarProjection,
): void {
  if (!result || result.version !== UGP_REFRESH_CALENDAR_INTEGRATION_VERSION) {
    throw new Error("ugp_refresh_calendar_version_invalid");
  }
  fp(result.opportunityModelFingerprint, "opportunity_model_fingerprint");
  fp(result.decayOpportunityIntegrationFingerprint, "decay_integration_fingerprint");
  fp(result.projectionFingerprint, "projection_fingerprint");
  exactDate(result.startDate, "start_date");
  const policy = normalizePolicy(result.policy);
  if (JSON.stringify(policy) !== JSON.stringify(result.policy)) {
    throw new Error("ugp_refresh_calendar_policy_not_canonical");
  }

  const s = result.semantics;
  if (
    s.deterministic !== true
    || s.planningOnly !== true
    || s.refreshOnly !== true
    || s.reusesCalendarPolicySemantics !== true
    || s.canonicalReadinessFingerprintRequired !== true
    || s.projectedActionDoesNotMutateOpportunity !== true
    || s.schedulerMaterialized !== false
    || s.schedulerAuthorized !== false
    || s.grantsAuthorization !== false
    || s.publicationAuthorized !== false
    || s.executionAuthorized !== false
    || s.performsNetworkOperation !== false
    || s.performsPersistence !== false
    || s.providerWrites !== false
    || s.publicSiteWrites !== false
  ) {
    throw new Error("ugp_refresh_calendar_unsafe_semantics");
  }

  for (const item of result.scheduled) {
    if (
      item.action !== "refresh_candidate"
      || item.requiredPublicationPlanOperation !== "update"
      || item.publicationAuthorized !== false
      || item.executionAuthorized !== false
    ) {
      throw new Error("ugp_refresh_calendar_item_shape_invalid");
    }
    fp(item.opportunityFingerprint, "item_opportunity_fingerprint");
    fp(item.decayProjectionFingerprint, "item_decay_projection_fingerprint");
    fp(item.readinessFingerprint, "item_readiness_fingerprint");
    for (const fingerprint of item.boundDecayAssessmentFingerprints) {
      fp(fingerprint, "item_decay_assessment_fingerprint");
    }
    if (item.boundPageUrls.length < 1) {
      throw new Error("ugp_refresh_calendar_item_page_lineage_missing");
    }
    const { itemFingerprint, ...base } = item;
    const expected = stableEvidenceHash({
      purpose: "ugp_refresh_calendar_item",
      version: UGP_REFRESH_CALENDAR_INTEGRATION_VERSION,
      ...base,
    });
    if (itemFingerprint !== expected) {
      throw new Error("ugp_refresh_calendar_item_fingerprint_mismatch");
    }
  }

  const { projectionFingerprint, ...base } = result;
  const expected = stableEvidenceHash({
    purpose: "ugp_refresh_calendar_projection",
    ...base,
  });
  if (projectionFingerprint !== expected) {
    throw new Error("ugp_refresh_calendar_projection_fingerprint_mismatch");
  }
}

export function buildRefreshCalendarWorkSpec(input: {
  calendar: RefreshCalendarProjection;
  calendarItemFingerprint: string;
}): RefreshCalendarWorkSpec {
  assertRefreshCalendarProjectionIntegrity(input.calendar);
  fp(input.calendarItemFingerprint, "calendar_item_fingerprint");
  const item = input.calendar.scheduled.find(
    (candidate) => candidate.itemFingerprint === input.calendarItemFingerprint,
  );
  if (!item) {
    throw new Error("ugp_refresh_calendar_unknown_calendar_item");
  }
  if (item.reviewRequired === item.autopilotPolicySelected) {
    throw new Error("ugp_refresh_calendar_policy_mode_invalid");
  }

  const base = Object.freeze({
    version: UGP_REFRESH_CALENDAR_INTEGRATION_VERSION,
    lifecycle: "proposed" as const,
    workClass: "content_article_refresh" as const,
    schedule: Object.freeze({
      kind: "calendar_date" as const,
      scheduledDate: exactDate(item.scheduledDate, "scheduled_date"),
    }),
    lineage: Object.freeze({
      opportunityModelFingerprint: fp(
        input.calendar.opportunityModelFingerprint,
        "work_opportunity_model_fingerprint",
      ),
      decayOpportunityIntegrationFingerprint: fp(
        input.calendar.decayOpportunityIntegrationFingerprint,
        "work_decay_integration_fingerprint",
      ),
      decayProjectionFingerprint: fp(
        item.decayProjectionFingerprint,
        "work_decay_projection_fingerprint",
      ),
      refreshCalendarProjectionFingerprint: fp(
        input.calendar.projectionFingerprint,
        "work_calendar_projection_fingerprint",
      ),
      refreshCalendarItemFingerprint: fp(
        item.itemFingerprint,
        "work_calendar_item_fingerprint",
      ),
      opportunityFingerprint: fp(
        item.opportunityFingerprint,
        "work_opportunity_fingerprint",
      ),
      readinessFingerprint: fp(
        item.readinessFingerprint,
        "work_readiness_fingerprint",
      ),
      boundDecayAssessmentFingerprints: Object.freeze(
        [...item.boundDecayAssessmentFingerprints],
      ),
      boundPageUrls: Object.freeze([...item.boundPageUrls]),
    }),
    operation: "update" as const,
    policy: Object.freeze({
      reviewRequired: item.reviewRequired,
      autopilotPolicySelected: item.autopilotPolicySelected,
    }),
    runtimeRequirements: WORK_RUNTIME,
    semantics: WORK_SEMANTICS,
  });

  const workSpecFingerprint = stableEvidenceHash({
    purpose: "ugp_refresh_calendar_work_spec",
    ...base,
  });
  return Object.freeze({
    ...base,
    workSpecId: "rcws-" + workSpecFingerprint.slice(0, 24),
    workSpecFingerprint,
  });
}

export function assertRefreshCalendarWorkSpecIntegrity(
  spec: RefreshCalendarWorkSpec,
): void {
  if (!spec || spec.version !== UGP_REFRESH_CALENDAR_INTEGRATION_VERSION) {
    throw new Error("ugp_refresh_calendar_work_spec_version_invalid");
  }
  if (!WORK_ID.test(spec.workSpecId)) {
    throw new Error("ugp_refresh_calendar_work_spec_id_invalid");
  }
  fp(spec.workSpecFingerprint, "work_spec_fingerprint");
  if (
    spec.lifecycle !== "proposed"
    || spec.workClass !== "content_article_refresh"
    || spec.schedule.kind !== "calendar_date"
    || spec.operation !== "update"
  ) {
    throw new Error("ugp_refresh_calendar_work_spec_shape_invalid");
  }
  exactDate(spec.schedule.scheduledDate, "work_scheduled_date");
  if (spec.policy.reviewRequired === spec.policy.autopilotPolicySelected) {
    throw new Error("ugp_refresh_calendar_work_spec_policy_mode_invalid");
  }
  for (const [field, value] of Object.entries(spec.lineage)) {
    if (field === "boundPageUrls") continue;
    if (field === "boundDecayAssessmentFingerprints") {
      for (const fingerprint of value as readonly string[]) {
        fp(fingerprint, "work_decay_assessment_fingerprint");
      }
      continue;
    }
    fp(value, "work_" + field);
  }
  if (spec.lineage.boundPageUrls.length < 1) {
    throw new Error("ugp_refresh_calendar_work_spec_page_lineage_missing");
  }

  const r = spec.runtimeRequirements;
  if (
    r.canonicalArticleReadinessRevalidationRequired !== true
    || r.articleDraftAndQualityGateLineageRequired !== true
    || r.publicationPlanRevalidationRequired !== true
    || r.publicationPlanOperationMustBeUpdate !== true
    || r.existingContentTargetRequired !== true
    || r.policyRecheckAtClaimRequired !== true
    || r.decayProjectionRevalidationRequired !== true
    || r.explicitAuthorizationRequiredBeforeExecution !== true
    || r.authorizationEmbedded !== false
    || r.executionRequestEmbedded !== false
    || r.transportMaterializationRequired !== true
  ) {
    throw new Error("ugp_refresh_calendar_work_spec_runtime_requirements_invalid");
  }

  const s = spec.semantics;
  if (
    s.deterministic !== true
    || s.immutableSpecification !== true
    || s.schedulerReady !== true
    || s.dateOnlySchedule !== true
    || s.planningOnly !== true
    || s.queueMaterialized !== false
    || s.schedulerActivated !== false
    || s.retryPolicyGranted !== false
    || s.deadLetterPolicyGranted !== false
    || s.grantsAuthorization !== false
    || s.publicationAuthorized !== false
    || s.executionAuthorized !== false
    || s.performsNetworkOperation !== false
    || s.performsPersistence !== false
    || s.providerWrites !== false
    || s.publicSiteWrites !== false
  ) {
    throw new Error("ugp_refresh_calendar_work_spec_unsafe_semantics");
  }

  const { workSpecId, workSpecFingerprint, ...base } = spec;
  const expected = stableEvidenceHash({
    purpose: "ugp_refresh_calendar_work_spec",
    ...base,
  });
  if (
    workSpecFingerprint !== expected
    || workSpecId !== "rcws-" + expected.slice(0, 24)
  ) {
    throw new Error("ugp_refresh_calendar_work_spec_identity_mismatch");
  }
}
