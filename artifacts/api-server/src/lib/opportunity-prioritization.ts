import { createHash } from "node:crypto";
import {
  buildUnifiedOpportunityRecord,
  type UnifiedOpportunityRecord,
} from "./unified-opportunity-types.js";
import {
  P6_2_OPPORTUNITY_SCORING_VERSION,
  scoreUnifiedOpportunity,
  type UnifiedOpportunityScore,
} from "./opportunity-scoring.js";

export const P6_3_OPPORTUNITY_PRIORITIZATION_VERSION = "p6.3-opportunity-prioritization-v1" as const;
export const P6_3_MAX_COLLECTION_ENTRIES = 256 as const;
export const P6_3_MAX_SUPPRESSION_CODES = 8 as const;

export type OpportunityCollectionEntryInput = {
  opportunity: UnifiedOpportunityRecord;
  score: UnifiedOpportunityScore;
  conflictKey?: string | null;
  suppressionCodes?: string[];
};

export type OpportunityPrioritizationInput = {
  collectionKey: string;
  entries: OpportunityCollectionEntryInput[];
};

export type OpportunitySystemSuppressionReason =
  | "unscorable_score"
  | "explicit_suppression"
  | "conflict_lower_score"
  | "conflict_top_score_tie";

export type OpportunityPriorityDecision = {
  opportunityId: string;
  opportunityFingerprint: string;
  family: UnifiedOpportunityRecord["family"];
  kind: UnifiedOpportunityRecord["kind"];
  subjectKey: string;
  scoreId: string;
  scoreFingerprint: string;
  score100: number | null;
  status: "eligible" | "suppressed";
  priorityRank: number | null;
  priorityTieCount: number | null;
  conflictKey: string | null;
  explicitSuppressionCodes: string[];
  systemSuppressionReasons: OpportunitySystemSuppressionReason[];
};

export type OpportunityConflictGroup = {
  conflictKey: string;
  memberOpportunityFingerprints: string[];
  activeMemberOpportunityFingerprints: string[];
  status: "inactive" | "single_active" | "resolved_unique_top" | "unresolved_top_tie";
  topScore100: number | null;
  selectedOpportunityFingerprint: string | null;
};

export type OpportunityPrioritizationReport = {
  version: typeof P6_3_OPPORTUNITY_PRIORITIZATION_VERSION;
  reportId: string;
  reportFingerprint: string;
  collectionKey: string;
  referenceTime: string;
  scope: {
    marketFingerprint: string | null;
    categoryFingerprint: string | null;
  };
  counts: {
    input: number;
    unique: number;
    duplicatesCollapsed: number;
    eligible: number;
    suppressed: number;
    conflictGroups: number;
  };
  conflicts: OpportunityConflictGroup[];
  decisions: OpportunityPriorityDecision[];
  semantics: ReturnType<typeof opportunityPrioritizationSemantics>;
  safety: ReturnType<typeof opportunityPrioritizationCapability>;
};

type NormalizedEntry = {
  opportunity: UnifiedOpportunityRecord;
  score: UnifiedOpportunityScore;
  conflictKey: string | null;
  suppressionCodes: string[];
};

type WorkingDecision = NormalizedEntry & {
  systemReasons: Set<OpportunitySystemSuppressionReason>;
  priorityRank: number | null;
  priorityTieCount: number | null;
};

const CODE = /^[a-z0-9][a-z0-9._:-]{0,95}$/;

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
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

function exactOpaqueText(value: unknown, name: string, max: number): string {
  if (typeof value !== "string" || value.length < 1 || value.length > max) throw new Error(`invalid_${name}`);
  if (value !== value.trim() || /[\u0000-\u001f\u007f]/.test(value)) throw new Error(`invalid_${name}`);
  return value;
}

function normalizeCode(value: unknown, name: string): string {
  if (typeof value !== "string") throw new Error(`invalid_${name}`);
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  if (!CODE.test(normalized)) throw new Error(`invalid_${name}`);
  return normalized;
}

function canonicalOpportunity(input: UnifiedOpportunityRecord): UnifiedOpportunityRecord {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_opportunity");
  const rebuilt = buildUnifiedOpportunityRecord({
    family: input.family,
    kind: input.kind,
    subjectKey: input.subjectKey,
    referenceTime: input.referenceTime,
    marketFingerprint: input.scope?.marketFingerprint,
    categoryFingerprint: input.scope?.categoryFingerprint,
    evidence: input.evidence,
    missingEvidence: input.missingEvidence,
    legacyType: input.legacyType,
  });
  if (canonicalJson(rebuilt) !== canonicalJson(input)) throw new Error("p61_opportunity_integrity_mismatch");
  return rebuilt;
}

function canonicalScore(
  opportunity: UnifiedOpportunityRecord,
  input: UnifiedOpportunityScore,
): UnifiedOpportunityScore {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_opportunity_score");
  if (input.version !== P6_2_OPPORTUNITY_SCORING_VERSION) throw new Error("unsupported_p62_score_version");
  const rebuilt = scoreUnifiedOpportunity({
    opportunity,
    components: input.components,
  });
  if (canonicalJson(rebuilt) !== canonicalJson(input)) throw new Error("p62_score_integrity_mismatch");
  return rebuilt;
}

function normalizeSuppressionCodes(values: string[] | undefined): string[] {
  if (values == null) return [];
  if (!Array.isArray(values)) throw new Error("invalid_suppression_codes");
  if (values.length > P6_3_MAX_SUPPRESSION_CODES) throw new Error("suppression_code_limit_exceeded");
  return [...new Set(values.map((value) => normalizeCode(value, "suppression_code")))]
    .sort((a, b) => a.localeCompare(b));
}

function normalizeEntry(input: OpportunityCollectionEntryInput): NormalizedEntry {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_collection_entry");
  const opportunity = canonicalOpportunity(input.opportunity);
  const score = canonicalScore(opportunity, input.score);
  const conflictKey = input.conflictKey == null ? null : normalizeCode(input.conflictKey, "conflict_key");
  return {
    opportunity,
    score,
    conflictKey,
    suppressionCodes: normalizeSuppressionCodes(input.suppressionCodes),
  };
}

function duplicatePolicyIdentity(entry: NormalizedEntry): string {
  return canonicalJson({
    scoreFingerprint: entry.score.scoreFingerprint,
    conflictKey: entry.conflictKey,
    suppressionCodes: entry.suppressionCodes,
  });
}

export function opportunityPrioritizationSemantics() {
  return Object.freeze({
    exactDuplicateCollapseOnly: true,
    lifecycleSupersessionIncluded: false,
    explicitConflictKeysOnly: true,
    conflictInferredFromFamilyKindOrSubject: false,
    arbitraryWinnerOnEqualTopConflictScore: false,
    explicitSuppressionPreserved: true,
    unscorableExcludedFromPriority: true,
    sameReferenceTimeRequired: true,
    sameScopeRequired: true,
    densePriorityRanking: true,
    equalScoreSharesPriorityRank: true,
    deterministicSerializationTieBreakIsPreference: false,
    priorityIsExecutionOrder: false,
    recommendationGenerated: false,
    explanationGenerated: false,
    actionabilityClassified: false,
    providerNativeCrossComparisonPerformed: false,
    p61SemanticGuardsPreserved: true,
    p62CanonicalScoreOnly: true,
  });
}

export function opportunityPrioritizationCapability() {
  return Object.freeze({
    deterministicCollectionPolicyOnly: true,
    legacyOpportunityEngineMutationEnabled: false,
    openApiMutationEnabled: false,
    liveProviderReadsAuthorized: false,
    providerCredentialUseAuthorized: false,
    sourceRegistryAdmissionAuthorized: false,
    refreshPlanReorderingEnabled: false,
    task64ExecutionAuthorized: false,
    task70ExecutionAuthorized: false,
    observationPersistenceAuthorized: false,
    evidencePersistenceAuthorized: false,
    scorePersistenceAuthorized: false,
    prioritizationPersistenceAuthorized: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    schemaMutationAuthorized: false,
    schedulerEnabled: false,
    workerEnabled: false,
    retryLoopEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    automaticTransitionEnabled: false,
    publicationAuthorized: false,
  });
}

export function prioritizeUnifiedOpportunities(
  input: OpportunityPrioritizationInput,
): OpportunityPrioritizationReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_prioritization_input");
  const collectionKey = exactOpaqueText(input.collectionKey, "collection_key", 160);
  if (!Array.isArray(input.entries) || input.entries.length < 1) throw new Error("collection_entries_required");
  if (input.entries.length > P6_3_MAX_COLLECTION_ENTRIES) throw new Error("collection_entry_limit_exceeded");

  const normalized = input.entries
    .map(normalizeEntry)
    .sort((a, b) => a.opportunity.opportunityFingerprint.localeCompare(b.opportunity.opportunityFingerprint));

  const referenceTime = normalized[0].opportunity.referenceTime;
  const scope = { ...normalized[0].opportunity.scope };
  for (const entry of normalized) {
    if (entry.opportunity.referenceTime !== referenceTime) throw new Error("mixed_collection_reference_time");
    if (
      entry.opportunity.scope.marketFingerprint !== scope.marketFingerprint ||
      entry.opportunity.scope.categoryFingerprint !== scope.categoryFingerprint
    ) {
      throw new Error("mixed_collection_scope");
    }
  }

  const uniqueByOpportunity = new Map<string, NormalizedEntry>();
  let duplicatesCollapsed = 0;
  for (const entry of normalized) {
    const key = entry.opportunity.opportunityFingerprint;
    const previous = uniqueByOpportunity.get(key);
    if (previous === undefined) {
      uniqueByOpportunity.set(key, entry);
      continue;
    }
    if (duplicatePolicyIdentity(previous) !== duplicatePolicyIdentity(entry)) {
      throw new Error("duplicate_opportunity_metadata_conflict");
    }
    duplicatesCollapsed += 1;
  }

  const unique = [...uniqueByOpportunity.values()]
    .sort((a, b) => a.opportunity.opportunityFingerprint.localeCompare(b.opportunity.opportunityFingerprint));

  const working: WorkingDecision[] = unique.map((entry) => {
    const systemReasons = new Set<OpportunitySystemSuppressionReason>();
    if (entry.score.status === "unscorable") systemReasons.add("unscorable_score");
    if (entry.suppressionCodes.length > 0) systemReasons.add("explicit_suppression");
    return {
      ...entry,
      systemReasons,
      priorityRank: null,
      priorityTieCount: null,
    };
  });

  const byConflictKey = new Map<string, WorkingDecision[]>();
  for (const entry of working) {
    if (entry.conflictKey === null) continue;
    const list = byConflictKey.get(entry.conflictKey) ?? [];
    list.push(entry);
    byConflictKey.set(entry.conflictKey, list);
  }

  const conflicts: OpportunityConflictGroup[] = [];
  for (const conflictKey of [...byConflictKey.keys()].sort((a, b) => a.localeCompare(b))) {
    const members = (byConflictKey.get(conflictKey) ?? [])
      .sort((a, b) => a.opportunity.opportunityFingerprint.localeCompare(b.opportunity.opportunityFingerprint));
    const active = members.filter((entry) => entry.systemReasons.size === 0);

    let status: OpportunityConflictGroup["status"] = "inactive";
    let topScore100: number | null = null;
    let selectedOpportunityFingerprint: string | null = null;

    if (active.length === 1) {
      status = "single_active";
      topScore100 = active[0].score.score100;
    } else if (active.length > 1) {
      const scores = active.map((entry) => entry.score.score100);
      if (scores.some((value) => value === null)) throw new Error("active_conflict_member_unscorable");
      topScore100 = Math.max(...(scores as number[]));
      const top = active.filter((entry) => entry.score.score100 === topScore100);
      if (top.length === 1) {
        status = "resolved_unique_top";
        selectedOpportunityFingerprint = top[0].opportunity.opportunityFingerprint;
        for (const entry of active) {
          if (entry !== top[0]) entry.systemReasons.add("conflict_lower_score");
        }
      } else {
        status = "unresolved_top_tie";
        for (const entry of active) {
          if (entry.score.score100 === topScore100) {
            entry.systemReasons.add("conflict_top_score_tie");
          } else {
            entry.systemReasons.add("conflict_lower_score");
          }
        }
      }
    }

    conflicts.push({
      conflictKey,
      memberOpportunityFingerprints: members.map((entry) => entry.opportunity.opportunityFingerprint),
      activeMemberOpportunityFingerprints: active.map((entry) => entry.opportunity.opportunityFingerprint),
      status,
      topScore100,
      selectedOpportunityFingerprint,
    });
  }

  const eligible = working
    .filter((entry) => entry.systemReasons.size === 0)
    .sort((a, b) => {
      const scoreA = a.score.score100;
      const scoreB = b.score.score100;
      if (scoreA === null || scoreB === null) throw new Error("eligible_opportunity_unscorable");
      return scoreB - scoreA || a.opportunity.opportunityFingerprint.localeCompare(b.opportunity.opportunityFingerprint);
    });

  const tieCounts = new Map<number, number>();
  for (const entry of eligible) {
    const score = entry.score.score100;
    if (score === null) throw new Error("eligible_opportunity_unscorable");
    tieCounts.set(score, (tieCounts.get(score) ?? 0) + 1);
  }

  let rank = 0;
  let previousScore: number | null = null;
  for (const entry of eligible) {
    const score = entry.score.score100;
    if (score === null) throw new Error("eligible_opportunity_unscorable");
    if (previousScore === null || score !== previousScore) rank += 1;
    entry.priorityRank = rank;
    entry.priorityTieCount = tieCounts.get(score) ?? 1;
    previousScore = score;
  }

  const decisions: OpportunityPriorityDecision[] = [
    ...eligible,
    ...working
      .filter((entry) => entry.systemReasons.size > 0)
      .sort((a, b) => a.opportunity.opportunityFingerprint.localeCompare(b.opportunity.opportunityFingerprint)),
  ].map((entry) => ({
    opportunityId: entry.opportunity.opportunityId,
    opportunityFingerprint: entry.opportunity.opportunityFingerprint,
    family: entry.opportunity.family,
    kind: entry.opportunity.kind,
    subjectKey: entry.opportunity.subjectKey,
    scoreId: entry.score.scoreId,
    scoreFingerprint: entry.score.scoreFingerprint,
    score100: entry.score.score100,
    status: entry.systemReasons.size === 0 ? "eligible" : "suppressed",
    priorityRank: entry.priorityRank,
    priorityTieCount: entry.priorityTieCount,
    conflictKey: entry.conflictKey,
    explicitSuppressionCodes: [...entry.suppressionCodes],
    systemSuppressionReasons: [...entry.systemReasons].sort((a, b) => a.localeCompare(b)),
  }));

  const semantics = opportunityPrioritizationSemantics();
  const counts = {
    input: input.entries.length,
    unique: unique.length,
    duplicatesCollapsed,
    eligible: decisions.filter((decision) => decision.status === "eligible").length,
    suppressed: decisions.filter((decision) => decision.status === "suppressed").length,
    conflictGroups: conflicts.length,
  };

  const identity = {
    version: P6_3_OPPORTUNITY_PRIORITIZATION_VERSION,
    collectionKey,
    referenceTime,
    scope,
    counts,
    conflicts,
    decisions,
    semantics,
  };
  const reportFingerprint = hash(identity);

  return {
    version: P6_3_OPPORTUNITY_PRIORITIZATION_VERSION,
    reportId: `p63-priority-${reportFingerprint.slice(0, 20)}`,
    reportFingerprint,
    collectionKey,
    referenceTime,
    scope,
    counts,
    conflicts,
    decisions,
    semantics,
    safety: opportunityPrioritizationCapability(),
  };
}
