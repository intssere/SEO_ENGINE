import { createHash } from "node:crypto";
import {
  P6_5_OPPORTUNITY_ACTIONABILITY_VERSION,
  classifyOpportunityActionability,
  type OpportunityActionabilityInput,
  type OpportunityActionabilityReport,
} from "./opportunity-actionability.js";

export const P6_6_OPPORTUNITY_PREVIEW_DIFF_VERSION = "p6.6-opportunity-preview-diff-v1" as const;
export const P6_6_MAX_PREVIEWS = 256 as const;
export const P6_6_MAX_FIELDS_PER_PREVIEW = 64 as const;
export const P6_6_MAX_VALUE_LENGTH = 8192 as const;

export type OpportunityPreviewFieldInput = {
  fieldKey: string;
  currentValue: string | null;
  proposedValue: string | null;
};

export type OpportunityPreviewInput = {
  opportunityFingerprint: string;
  actionabilityFingerprint: string;
  previewKey: string;
  fields: OpportunityPreviewFieldInput[];
};

export type OpportunityPreviewDiffInput = {
  actionabilityInput: OpportunityActionabilityInput;
  actionability: OpportunityActionabilityReport;
  previews: OpportunityPreviewInput[];
};

export type OpportunityPreviewFieldStatus =
  | "unchanged"
  | "added"
  | "removed"
  | "modified";

export type OpportunityPreviewFieldDiff = {
  fieldKey: string;
  status: OpportunityPreviewFieldStatus;
  currentValue: string | null;
  proposedValue: string | null;
};

export type OpportunityPreviewDiff = {
  previewId: string;
  previewFingerprint: string;
  opportunityId: string;
  opportunityFingerprint: string;
  actionabilityId: string;
  actionabilityFingerprint: string;
  previewKey: string;
  actionability: {
    classification: "informational" | "recommend" | "approval" | "blocked";
    reasons: Array<
      "explicit_block" |
      "p63_suppressed" |
      "approval_required" |
      "recommendation_allowed" |
      "informational_only"
    >;
    approvalGranted: false;
    executionAuthorized: false;
    automaticTransitionAuthorized: false;
  };
  counts: {
    total: number;
    unchanged: number;
    added: number;
    removed: number;
    modified: number;
    changed: number;
  };
  fields: OpportunityPreviewFieldDiff[];
  applyAuthorized: false;
};

export type OpportunityPreviewDiffReport = {
  version: typeof P6_6_OPPORTUNITY_PREVIEW_DIFF_VERSION;
  reportId: string;
  reportFingerprint: string;
  collectionKey: string;
  referenceTime: string;
  scope: OpportunityActionabilityReport["scope"];
  actionabilityReportFingerprint: string;
  counts: {
    previews: number;
    fields: number;
    unchanged: number;
    added: number;
    removed: number;
    modified: number;
    changed: number;
  };
  previews: OpportunityPreviewDiff[];
  semantics: ReturnType<typeof opportunityPreviewDiffSemantics>;
  safety: ReturnType<typeof opportunityPreviewDiffCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const KEY = /^[a-z0-9][a-z0-9._:-]{0,95}$/;

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

function normalizeKey(value: unknown, errorCode: string): string {
  if (typeof value !== "string") throw new Error(errorCode);
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  if (!KEY.test(normalized)) throw new Error(errorCode);
  return normalized;
}

function validateValue(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") throw new Error("invalid_preview_value");
  if (value.length > P6_6_MAX_VALUE_LENGTH) throw new Error("preview_value_limit_exceeded");
  return value;
}

function canonicalActionability(
  input: OpportunityActionabilityInput,
  supplied: OpportunityActionabilityReport,
): OpportunityActionabilityReport {
  if (!supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
    throw new Error("invalid_p65_actionability_report");
  }
  if (supplied.version !== P6_5_OPPORTUNITY_ACTIONABILITY_VERSION) {
    throw new Error("unsupported_p65_actionability_version");
  }
  const rebuilt = classifyOpportunityActionability(input);
  if (canonicalJson(rebuilt) !== canonicalJson(supplied)) {
    throw new Error("p65_actionability_integrity_mismatch");
  }
  return rebuilt;
}

function fieldStatus(
  currentValue: string | null,
  proposedValue: string | null,
): OpportunityPreviewFieldStatus {
  if (currentValue === proposedValue) return "unchanged";
  if (currentValue === null) return "added";
  if (proposedValue === null) return "removed";
  return "modified";
}

function normalizeFields(fields: OpportunityPreviewFieldInput[]): OpportunityPreviewFieldDiff[] {
  if (!Array.isArray(fields) || fields.length < 1) throw new Error("invalid_preview_fields");
  if (fields.length > P6_6_MAX_FIELDS_PER_PREVIEW) throw new Error("preview_field_limit_exceeded");

  const output = new Map<string, OpportunityPreviewFieldDiff>();
  for (const field of fields) {
    if (!field || typeof field !== "object" || Array.isArray(field)) throw new Error("invalid_preview_field");
    const fieldKey = normalizeKey(field.fieldKey, "invalid_preview_field_key");
    if (output.has(fieldKey)) throw new Error("duplicate_preview_field_key");
    const currentValue = validateValue(field.currentValue);
    const proposedValue = validateValue(field.proposedValue);
    output.set(fieldKey, {
      fieldKey,
      status: fieldStatus(currentValue, proposedValue),
      currentValue,
      proposedValue,
    });
  }

  return [...output.values()].sort((a, b) => a.fieldKey.localeCompare(b.fieldKey));
}

function normalizePreviews(
  previews: OpportunityPreviewInput[],
  actionability: OpportunityActionabilityReport,
): Array<{
  opportunityFingerprint: string;
  actionabilityFingerprint: string;
  previewKey: string;
  fields: OpportunityPreviewFieldDiff[];
}> {
  if (!Array.isArray(previews)) throw new Error("invalid_preview_collection");
  if (previews.length > P6_6_MAX_PREVIEWS) throw new Error("preview_limit_exceeded");

  const decisions = new Map(actionability.decisions.map((decision, index) => [
    decision.opportunityFingerprint,
    { decision, index },
  ]));
  const seen = new Set<string>();
  const normalized = previews.map((preview) => {
    if (!preview || typeof preview !== "object" || Array.isArray(preview)) {
      throw new Error("invalid_preview");
    }
    if (typeof preview.opportunityFingerprint !== "string" || !HEX_64.test(preview.opportunityFingerprint)) {
      throw new Error("invalid_preview_opportunity_fingerprint");
    }
    if (typeof preview.actionabilityFingerprint !== "string" || !HEX_64.test(preview.actionabilityFingerprint)) {
      throw new Error("invalid_preview_actionability_fingerprint");
    }
    const match = decisions.get(preview.opportunityFingerprint);
    if (!match) throw new Error("unknown_preview_opportunity");
    if (match.decision.actionabilityFingerprint !== preview.actionabilityFingerprint) {
      throw new Error("preview_actionability_lineage_mismatch");
    }
    const previewKey = normalizeKey(preview.previewKey, "invalid_preview_key");
    const identity = `${preview.opportunityFingerprint}:${previewKey}`;
    if (seen.has(identity)) throw new Error("duplicate_preview_key");
    seen.add(identity);

    return {
      opportunityFingerprint: preview.opportunityFingerprint,
      actionabilityFingerprint: preview.actionabilityFingerprint,
      previewKey,
      fields: normalizeFields(preview.fields),
      order: match.index,
    };
  });

  return normalized
    .sort((a, b) => a.order - b.order || a.previewKey.localeCompare(b.previewKey))
    .map(({ order: _order, ...preview }) => preview);
}

function buildPreview(
  normalized: ReturnType<typeof normalizePreviews>[number],
  actionability: OpportunityActionabilityReport,
): OpportunityPreviewDiff {
  const decision = actionability.decisions.find((candidate) =>
    candidate.opportunityFingerprint === normalized.opportunityFingerprint);
  if (!decision) throw new Error("preview_actionability_decision_missing");
  if (decision.actionabilityFingerprint !== normalized.actionabilityFingerprint) {
    throw new Error("preview_actionability_lineage_mismatch");
  }

  const counts = {
    total: normalized.fields.length,
    unchanged: normalized.fields.filter((field) => field.status === "unchanged").length,
    added: normalized.fields.filter((field) => field.status === "added").length,
    removed: normalized.fields.filter((field) => field.status === "removed").length,
    modified: normalized.fields.filter((field) => field.status === "modified").length,
    changed: normalized.fields.filter((field) => field.status !== "unchanged").length,
  };
  const actionabilityProjection = {
    classification: decision.classification,
    reasons: [...decision.reasons],
    approvalGranted: decision.governance.approvalGranted,
    executionAuthorized: decision.governance.executionAuthorized,
    automaticTransitionAuthorized: decision.governance.automaticTransitionAuthorized,
  };
  const identity = {
    version: P6_6_OPPORTUNITY_PREVIEW_DIFF_VERSION,
    opportunityId: decision.opportunityId,
    opportunityFingerprint: decision.opportunityFingerprint,
    actionabilityId: decision.actionabilityId,
    actionabilityFingerprint: decision.actionabilityFingerprint,
    previewKey: normalized.previewKey,
    actionability: actionabilityProjection,
    counts,
    fields: normalized.fields,
    applyAuthorized: false,
  };
  const previewFingerprint = hash(identity);

  return {
    previewId: `p66-preview-${previewFingerprint.slice(0, 20)}`,
    previewFingerprint,
    opportunityId: decision.opportunityId,
    opportunityFingerprint: decision.opportunityFingerprint,
    actionabilityId: decision.actionabilityId,
    actionabilityFingerprint: decision.actionabilityFingerprint,
    previewKey: normalized.previewKey,
    actionability: actionabilityProjection,
    counts,
    fields: normalized.fields,
    applyAuthorized: false,
  };
}

export function opportunityPreviewDiffSemantics() {
  return Object.freeze({
    callerSuppliedCurrentStateOnly: true,
    callerSuppliedProposedStateOnly: true,
    currentStateDiscoveryPerformed: false,
    proposedStateGenerated: false,
    valueSemanticNormalizationPerformed: false,
    nullDistinctFromEmptyString: true,
    exactStringEqualityUsed: true,
    actionabilityPreserved: true,
    blockedPreviewInspectionAllowed: true,
    proposedStateTreatedAsApplied: false,
    proposedStateTreatedAsApproved: false,
    proposedStateTreatedAsRecommended: false,
    proposedStateTreatedAsBetter: false,
    proposedStateTreatedAsSafeOrValid: false,
    diffOrderCreatesExecutionPreference: false,
    patchOrApplyInstructionGenerated: false,
    lifecycleInferred: false,
  });
}

export function opportunityPreviewDiffCapability() {
  return Object.freeze({
    deterministicPreviewOnly: true,
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

export function buildOpportunityPreviewDiff(
  input: OpportunityPreviewDiffInput,
): OpportunityPreviewDiffReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_preview_diff_input");
  if (!input.actionabilityInput || typeof input.actionabilityInput !== "object" || Array.isArray(input.actionabilityInput)) {
    throw new Error("invalid_preview_actionability_input");
  }

  const actionability = canonicalActionability(input.actionabilityInput, input.actionability);
  const normalized = normalizePreviews(input.previews, actionability);
  const previews = normalized.map((preview) => buildPreview(preview, actionability));
  const fields = previews.flatMap((preview) => preview.fields);
  const counts = {
    previews: previews.length,
    fields: fields.length,
    unchanged: fields.filter((field) => field.status === "unchanged").length,
    added: fields.filter((field) => field.status === "added").length,
    removed: fields.filter((field) => field.status === "removed").length,
    modified: fields.filter((field) => field.status === "modified").length,
    changed: fields.filter((field) => field.status !== "unchanged").length,
  };
  const semantics = opportunityPreviewDiffSemantics();
  const identity = {
    version: P6_6_OPPORTUNITY_PREVIEW_DIFF_VERSION,
    collectionKey: actionability.collectionKey,
    referenceTime: actionability.referenceTime,
    scope: actionability.scope,
    actionabilityReportFingerprint: actionability.reportFingerprint,
    counts,
    previews,
    semantics,
  };
  const reportFingerprint = hash(identity);

  return {
    version: P6_6_OPPORTUNITY_PREVIEW_DIFF_VERSION,
    reportId: `p66-report-${reportFingerprint.slice(0, 20)}`,
    reportFingerprint,
    collectionKey: actionability.collectionKey,
    referenceTime: actionability.referenceTime,
    scope: { ...actionability.scope },
    actionabilityReportFingerprint: actionability.reportFingerprint,
    counts,
    previews,
    semantics,
    safety: opportunityPreviewDiffCapability(),
  };
}
