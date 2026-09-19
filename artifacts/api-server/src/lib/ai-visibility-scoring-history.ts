import { createHash } from "node:crypto";
import {
  P7_4_AI_CITATION_COMPETITOR_COMPARISON_VERSION,
  buildAiCitationCompetitorComparison,
  type AiCitationCompetitorComparisonInput,
  type AiCitationCompetitorComparisonReport,
  type AiCompetitorComparisonGroup,
} from "./ai-citation-competitor-comparison.js";
import type {
  AiAnswerObservationRecord,
  AiAnswerVisibilityCollectionReport,
  AiCollectionProviderRecord,
  AiTrackedBrandRecord,
} from "./ai-answer-visibility-collection.js";
import type {
  AiPromptSetRecord,
  AiPromptTopicModelReport,
} from "./ai-prompt-topic-model.js";

export const P7_5_AI_VISIBILITY_SCORING_HISTORY_VERSION =
  "p7.5-ai-visibility-scoring-history-v1" as const;

export const P7_5_MAX_SNAPSHOTS = 64 as const;
export const P7_5_MAX_SCORES_PER_SNAPSHOT = 256 as const;
export const P7_5_MAX_COMPONENTS_PER_SCORE = 16 as const;
export const P7_5_MAX_EVIDENCE_PER_COMPONENT = 64 as const;

export type AiVisibilityScoreStatus = "scored" | "unscorable";
export type AiVisibilityHistoryDirection =
  | "increased"
  | "decreased"
  | "unchanged"
  | "indeterminate";

export type AiVisibilityScoreComponentInput = {
  componentCode: string;
  weight: number;
  value: number | null;
  basisCode: string | null;
  evidenceObservationFingerprints: string[];
};

export type AiVisibilityScoreInput = {
  scoreKey: string;
  comparisonKey: string;
  providerKey: string;
  modelKey: string;
  brandKey: string;
  promptSetKey: string;
  components: AiVisibilityScoreComponentInput[];
};

export type AiVisibilityScoreSnapshotInput = {
  comparisonInput: AiCitationCompetitorComparisonInput;
  comparison: AiCitationCompetitorComparisonReport;
  scores: AiVisibilityScoreInput[];
};

export type AiVisibilityScoringHistoryInput = {
  historyReferenceTime: string;
  snapshots: AiVisibilityScoreSnapshotInput[];
};

export type AiVisibilityScoreComponentRecord = {
  componentCode: string;
  weight: number;
  value: number | null;
  basisCode: string | null;
  evidenceObservationFingerprints: string[];
};

export type AiVisibilityScoreProfile = {
  profileId: string;
  profileFingerprint: string;
  components: Array<{
    componentCode: string;
    weight: number;
  }>;
};

export type AiVisibilityScoreScope = {
  siteKey: string;
  comparisonKey: string;
  comparisonFrameFingerprint: string;
  providerKey: string;
  providerFingerprint: string;
  modelKey: string;
  modelFingerprint: string;
  brandKey: string;
  brandFingerprint: string;
  promptSetKey: string;
  promptSetFingerprint: string;
};

export type AiVisibilityScoreRecord = {
  scoreId: string;
  scoreFingerprint: string;
  scoreKey: string;
  status: AiVisibilityScoreStatus;
  scope: AiVisibilityScoreScope;
  profile: AiVisibilityScoreProfile;
  components: AiVisibilityScoreComponentRecord[];
  missingComponentCodes: string[];
  score01: number | null;
  score100: number | null;
  comparisonReportFingerprint: string;
  collectionReportFingerprint: string;
};

export type AiVisibilityScoreSnapshot = {
  snapshotId: string;
  snapshotFingerprint: string;
  collectionReferenceTime: string;
  comparisonReportFingerprint: string;
  collectionReportFingerprint: string;
  counts: {
    scores: number;
    scored: number;
    unscorable: number;
  };
  scores: AiVisibilityScoreRecord[];
};

export type AiVisibilityHistoryPoint = {
  collectionReferenceTime: string;
  snapshotFingerprint: string;
  scoreId: string;
  scoreFingerprint: string;
  status: AiVisibilityScoreStatus;
  score100: number | null;
};

export type AiVisibilityHistoryDelta = {
  fromCollectionReferenceTime: string;
  toCollectionReferenceTime: string;
  fromScoreFingerprint: string;
  toScoreFingerprint: string;
  delta100: number | null;
  direction: AiVisibilityHistoryDirection;
};

export type AiVisibilityHistorySeries = {
  seriesId: string;
  seriesFingerprint: string;
  scoreKey: string;
  scope: AiVisibilityScoreScope;
  profile: AiVisibilityScoreProfile;
  points: AiVisibilityHistoryPoint[];
  deltas: AiVisibilityHistoryDelta[];
};

export type AiVisibilityScoringHistoryReport = {
  version: typeof P7_5_AI_VISIBILITY_SCORING_HISTORY_VERSION;
  reportId: string;
  reportFingerprint: string;
  siteKey: string;
  historyReferenceTime: string;
  counts: {
    snapshots: number;
    scores: number;
    scored: number;
    unscorable: number;
    series: number;
    deltas: number;
  };
  snapshots: AiVisibilityScoreSnapshot[];
  series: AiVisibilityHistorySeries[];
  semantics: ReturnType<typeof aiVisibilityScoringHistorySemantics>;
  safety: ReturnType<typeof aiVisibilityScoringHistoryCapability>;
};

const KEY = /^[a-z0-9][a-z0-9._:-]{0,95}$/;
const HEX_64 = /^[0-9a-f]{64}$/;
const ROUND_SCALE = 1_000_000;
const WEIGHT_TOLERANCE = 0.000001;

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

function canonicalTimestamp(value: unknown, errorCode: string): string {
  if (typeof value !== "string") throw new Error(errorCode);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(errorCode);
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) throw new Error(errorCode);
  return canonical;
}

function round6(value: number): number {
  return Math.round((value + Number.EPSILON) * ROUND_SCALE) / ROUND_SCALE;
}

function validateUnitInterval(value: unknown, errorCode: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(errorCode);
  }
  return round6(value);
}

function validateWeight(value: unknown): number {
  const weight = validateUnitInterval(value, "invalid_ai_visibility_component_weight");
  if (weight <= 0) throw new Error("invalid_ai_visibility_component_weight");
  return weight;
}

function validateFingerprint(value: unknown, errorCode: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) throw new Error(errorCode);
  return value;
}

function canonicalComparison(
  input: AiCitationCompetitorComparisonInput,
  supplied: AiCitationCompetitorComparisonReport,
): AiCitationCompetitorComparisonReport {
  if (!supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
    throw new Error("invalid_p74_comparison_report");
  }
  if (supplied.version !== P7_4_AI_CITATION_COMPETITOR_COMPARISON_VERSION) {
    throw new Error("unsupported_p74_comparison_version");
  }
  const rebuilt = buildAiCitationCompetitorComparison(input);
  if (canonicalJson(rebuilt) !== canonicalJson(supplied)) {
    throw new Error("p74_comparison_integrity_mismatch");
  }
  return rebuilt;
}

function comparisonFrameFingerprint(group: AiCompetitorComparisonGroup): string {
  return hash({
    version: P7_5_AI_VISIBILITY_SCORING_HISTORY_VERSION,
    comparisonKey: group.comparisonKey,
    subject: {
      brandKey: group.subject.brandKey,
      brandFingerprint: group.subject.brandFingerprint,
    },
    competitors: group.competitors.map((brand) => ({
      brandKey: brand.brandKey,
      brandFingerprint: brand.brandFingerprint,
    })),
  });
}

function findProvider(
  collection: AiAnswerVisibilityCollectionReport,
  providerKey: string,
): AiCollectionProviderRecord {
  const provider = collection.providers.find((candidate) => candidate.providerKey === providerKey);
  if (!provider) throw new Error("unknown_ai_visibility_provider");
  return provider;
}

function findBrand(
  collection: AiAnswerVisibilityCollectionReport,
  brandKey: string,
): AiTrackedBrandRecord {
  const brand = collection.brands.find((candidate) => candidate.brandKey === brandKey);
  if (!brand) throw new Error("unknown_ai_visibility_brand");
  return brand;
}

function findPromptSet(
  promptModel: AiPromptTopicModelReport,
  promptSetKey: string,
): AiPromptSetRecord {
  const set = promptModel.sets.find((candidate) => candidate.setKey === promptSetKey);
  if (!set) throw new Error("unknown_ai_visibility_prompt_set");
  return set;
}

function scopedObservations(
  collection: AiAnswerVisibilityCollectionReport,
  providerKey: string,
  modelKey: string,
  promptSet: AiPromptSetRecord,
): AiAnswerObservationRecord[] {
  const promptKeys = new Set(promptSet.promptKeys);
  return collection.observations.filter(
    (observation) =>
      observation.providerKey === providerKey &&
      observation.modelKey === modelKey &&
      promptKeys.has(observation.promptKey),
  );
}

function normalizeComponents(
  input: AiVisibilityScoreComponentInput[],
  allowedEvidence: Set<string>,
): {
  components: AiVisibilityScoreComponentRecord[];
  profile: AiVisibilityScoreProfile;
  missingComponentCodes: string[];
  status: AiVisibilityScoreStatus;
  score01: number | null;
  score100: number | null;
} {
  if (!Array.isArray(input) || input.length < 1) {
    throw new Error("invalid_ai_visibility_components");
  }
  if (input.length > P7_5_MAX_COMPONENTS_PER_SCORE) {
    throw new Error("ai_visibility_component_limit_exceeded");
  }

  const seen = new Set<string>();
  const components = input.map((component) => {
    if (!component || typeof component !== "object" || Array.isArray(component)) {
      throw new Error("invalid_ai_visibility_component");
    }
    const componentCode = normalizeKey(
      component.componentCode,
      "invalid_ai_visibility_component_code",
    );
    if (seen.has(componentCode)) throw new Error("duplicate_ai_visibility_component_code");
    seen.add(componentCode);

    const weight = validateWeight(component.weight);
    const evidence = Array.isArray(component.evidenceObservationFingerprints)
      ? component.evidenceObservationFingerprints
      : (() => { throw new Error("invalid_ai_visibility_component_evidence"); })();
    if (evidence.length > P7_5_MAX_EVIDENCE_PER_COMPONENT) {
      throw new Error("ai_visibility_component_evidence_limit_exceeded");
    }
    const evidenceObservationFingerprints = [...new Set(
      evidence.map((value) =>
        validateFingerprint(value, "invalid_ai_visibility_evidence_fingerprint")),
    )].sort((a, b) => a.localeCompare(b));

    if (component.value === null) {
      if (component.basisCode !== null || evidenceObservationFingerprints.length > 0) {
        throw new Error("null_ai_visibility_component_has_basis_or_evidence");
      }
      return {
        componentCode,
        weight,
        value: null,
        basisCode: null,
        evidenceObservationFingerprints: [],
      };
    }

    const value = validateUnitInterval(
      component.value,
      "invalid_ai_visibility_component_value",
    );
    const basisCode = normalizeKey(
      component.basisCode,
      "invalid_ai_visibility_component_basis_code",
    );
    if (evidenceObservationFingerprints.length < 1) {
      throw new Error("scored_ai_visibility_component_missing_evidence");
    }
    for (const fingerprint of evidenceObservationFingerprints) {
      if (!allowedEvidence.has(fingerprint)) {
        throw new Error("ai_visibility_evidence_outside_scope");
      }
    }

    return {
      componentCode,
      weight,
      value,
      basisCode,
      evidenceObservationFingerprints,
    };
  }).sort((a, b) => a.componentCode.localeCompare(b.componentCode));

  const weightTotal = round6(components.reduce((sum, component) => sum + component.weight, 0));
  if (Math.abs(weightTotal - 1) > WEIGHT_TOLERANCE) {
    throw new Error("ai_visibility_component_weights_must_sum_to_one");
  }

  const profileIdentity = {
    version: P7_5_AI_VISIBILITY_SCORING_HISTORY_VERSION,
    components: components.map((component) => ({
      componentCode: component.componentCode,
      weight: component.weight,
    })),
  };
  const profileFingerprint = hash(profileIdentity);
  const profile: AiVisibilityScoreProfile = {
    profileId: `p75-profile-${profileFingerprint.slice(0, 20)}`,
    profileFingerprint,
    components: profileIdentity.components,
  };

  const missingComponentCodes = components
    .filter((component) => component.value === null)
    .map((component) => component.componentCode);

  if (missingComponentCodes.length > 0) {
    return {
      components,
      profile,
      missingComponentCodes,
      status: "unscorable",
      score01: null,
      score100: null,
    };
  }

  const score01 = round6(components.reduce(
    (sum, component) => sum + component.weight * (component.value as number),
    0,
  ));

  return {
    components,
    profile,
    missingComponentCodes,
    status: "scored",
    score01,
    score100: round6(score01 * 100),
  };
}

function buildScoreRecords(
  input: AiVisibilityScoreInput[],
  comparisonInput: AiCitationCompetitorComparisonInput,
  comparison: AiCitationCompetitorComparisonReport,
): AiVisibilityScoreRecord[] {
  if (!Array.isArray(input)) throw new Error("invalid_ai_visibility_scores");
  if (input.length > P7_5_MAX_SCORES_PER_SNAPSHOT) {
    throw new Error("ai_visibility_score_limit_exceeded");
  }

  const collection = comparisonInput.collection;
  const promptModel = comparisonInput.collectionInput.promptModel;
  const comparisons = new Map(comparison.comparisons.map((group) => [group.comparisonKey, group]));
  const seen = new Set<string>();

  return input.map((score) => {
    if (!score || typeof score !== "object" || Array.isArray(score)) {
      throw new Error("invalid_ai_visibility_score");
    }
    const scoreKey = normalizeKey(score.scoreKey, "invalid_ai_visibility_score_key");
    const comparisonKey = normalizeKey(
      score.comparisonKey,
      "invalid_ai_visibility_comparison_key",
    );
    const providerKey = normalizeKey(
      score.providerKey,
      "invalid_ai_visibility_provider_key",
    );
    const modelKey = normalizeKey(score.modelKey, "invalid_ai_visibility_model_key");
    const brandKey = normalizeKey(score.brandKey, "invalid_ai_visibility_brand_key");
    const promptSetKey = normalizeKey(
      score.promptSetKey,
      "invalid_ai_visibility_prompt_set_key",
    );
    const duplicateKey = [
      scoreKey,
      comparisonKey,
      providerKey,
      modelKey,
      brandKey,
      promptSetKey,
    ].join("\u0000");
    if (seen.has(duplicateKey)) throw new Error("duplicate_ai_visibility_score_scope");
    seen.add(duplicateKey);

    const group = comparisons.get(comparisonKey);
    if (!group) throw new Error("unknown_ai_visibility_comparison");
    const groupBrandKeys = new Set([
      group.subject.brandKey,
      ...group.competitors.map((brand) => brand.brandKey),
    ]);
    if (!groupBrandKeys.has(brandKey)) {
      throw new Error("ai_visibility_brand_outside_comparison");
    }

    const provider = findProvider(collection, providerKey);
    const model = provider.models.find((candidate) => candidate.modelKey === modelKey);
    if (!model) throw new Error("unknown_ai_visibility_model");
    const brand = findBrand(collection, brandKey);
    const promptSet = findPromptSet(promptModel, promptSetKey);
    const observations = scopedObservations(collection, providerKey, modelKey, promptSet);
    const allowedEvidence = new Set(
      observations.map((observation) => observation.observationFingerprint),
    );
    const normalizedComponents = normalizeComponents(score.components, allowedEvidence);

    const scope: AiVisibilityScoreScope = {
      siteKey: comparison.siteKey,
      comparisonKey,
      comparisonFrameFingerprint: comparisonFrameFingerprint(group),
      providerKey,
      providerFingerprint: provider.providerFingerprint,
      modelKey,
      modelFingerprint: model.modelFingerprint,
      brandKey,
      brandFingerprint: brand.brandFingerprint,
      promptSetKey,
      promptSetFingerprint: promptSet.setFingerprint,
    };

    const identity = {
      version: P7_5_AI_VISIBILITY_SCORING_HISTORY_VERSION,
      scoreKey,
      status: normalizedComponents.status,
      scope,
      profile: normalizedComponents.profile,
      components: normalizedComponents.components,
      missingComponentCodes: normalizedComponents.missingComponentCodes,
      score01: normalizedComponents.score01,
      score100: normalizedComponents.score100,
      comparisonReportFingerprint: comparison.reportFingerprint,
      collectionReportFingerprint: collection.reportFingerprint,
    };
    const scoreFingerprint = hash(identity);

    return {
      scoreId: `p75-score-${scoreFingerprint.slice(0, 20)}`,
      scoreFingerprint,
      scoreKey,
      status: normalizedComponents.status,
      scope,
      profile: normalizedComponents.profile,
      components: normalizedComponents.components,
      missingComponentCodes: normalizedComponents.missingComponentCodes,
      score01: normalizedComponents.score01,
      score100: normalizedComponents.score100,
      comparisonReportFingerprint: comparison.reportFingerprint,
      collectionReportFingerprint: collection.reportFingerprint,
    };
  }).sort((a, b) =>
    a.scoreKey.localeCompare(b.scoreKey) ||
    a.scope.comparisonKey.localeCompare(b.scope.comparisonKey) ||
    a.scope.providerKey.localeCompare(b.scope.providerKey) ||
    a.scope.modelKey.localeCompare(b.scope.modelKey) ||
    a.scope.brandKey.localeCompare(b.scope.brandKey) ||
    a.scope.promptSetKey.localeCompare(b.scope.promptSetKey));
}

function buildSnapshot(input: AiVisibilityScoreSnapshotInput): AiVisibilityScoreSnapshot {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_ai_visibility_snapshot");
  }
  const comparison = canonicalComparison(input.comparisonInput, input.comparison);
  const scores = buildScoreRecords(input.scores, input.comparisonInput, comparison);
  const counts = {
    scores: scores.length,
    scored: scores.filter((score) => score.status === "scored").length,
    unscorable: scores.filter((score) => score.status === "unscorable").length,
  };
  const identity = {
    version: P7_5_AI_VISIBILITY_SCORING_HISTORY_VERSION,
    collectionReferenceTime: comparison.collectionReferenceTime,
    comparisonReportFingerprint: comparison.reportFingerprint,
    collectionReportFingerprint: comparison.collectionReportFingerprint,
    counts,
    scores,
  };
  const snapshotFingerprint = hash(identity);

  return {
    snapshotId: `p75-snapshot-${snapshotFingerprint.slice(0, 20)}`,
    snapshotFingerprint,
    collectionReferenceTime: comparison.collectionReferenceTime,
    comparisonReportFingerprint: comparison.reportFingerprint,
    collectionReportFingerprint: comparison.collectionReportFingerprint,
    counts,
    scores,
  };
}

function seriesKey(score: AiVisibilityScoreRecord): string {
  return [
    score.scoreKey,
    score.scope.siteKey,
    score.scope.comparisonKey,
    score.scope.comparisonFrameFingerprint,
    score.scope.providerFingerprint,
    score.scope.modelFingerprint,
    score.scope.brandFingerprint,
    score.scope.promptSetFingerprint,
    score.profile.profileFingerprint,
  ].join("\u0000");
}

function deltaDirection(
  from: number | null,
  to: number | null,
): { delta100: number | null; direction: AiVisibilityHistoryDirection } {
  if (from === null || to === null) {
    return { delta100: null, direction: "indeterminate" };
  }
  const delta100 = round6(to - from);
  if (delta100 > 0) return { delta100, direction: "increased" };
  if (delta100 < 0) return { delta100, direction: "decreased" };
  return { delta100: 0, direction: "unchanged" };
}

function buildSeries(snapshots: AiVisibilityScoreSnapshot[]): AiVisibilityHistorySeries[] {
  const groups = new Map<
    string,
    {
      scoreKey: string;
      scope: AiVisibilityScoreScope;
      profile: AiVisibilityScoreProfile;
      points: AiVisibilityHistoryPoint[];
    }
  >();

  for (const snapshot of snapshots) {
    for (const score of snapshot.scores) {
      const key = seriesKey(score);
      const current = groups.get(key) ?? {
        scoreKey: score.scoreKey,
        scope: score.scope,
        profile: score.profile,
        points: [],
      };
      current.points.push({
        collectionReferenceTime: snapshot.collectionReferenceTime,
        snapshotFingerprint: snapshot.snapshotFingerprint,
        scoreId: score.scoreId,
        scoreFingerprint: score.scoreFingerprint,
        status: score.status,
        score100: score.score100,
      });
      groups.set(key, current);
    }
  }

  return [...groups.values()]
    .map((group) => {
      const points = group.points.sort((a, b) =>
        a.collectionReferenceTime.localeCompare(b.collectionReferenceTime));
      const deltas = points.slice(1).map((point, index) => {
        const previous = points[index]!;
        const change = deltaDirection(previous.score100, point.score100);
        return {
          fromCollectionReferenceTime: previous.collectionReferenceTime,
          toCollectionReferenceTime: point.collectionReferenceTime,
          fromScoreFingerprint: previous.scoreFingerprint,
          toScoreFingerprint: point.scoreFingerprint,
          delta100: change.delta100,
          direction: change.direction,
        };
      });
      const identity = {
        version: P7_5_AI_VISIBILITY_SCORING_HISTORY_VERSION,
        scoreKey: group.scoreKey,
        scope: group.scope,
        profile: group.profile,
        points,
        deltas,
      };
      const seriesFingerprint = hash(identity);
      return {
        seriesId: `p75-series-${seriesFingerprint.slice(0, 20)}`,
        seriesFingerprint,
        scoreKey: group.scoreKey,
        scope: group.scope,
        profile: group.profile,
        points,
        deltas,
      };
    })
    .sort((a, b) =>
      a.scoreKey.localeCompare(b.scoreKey) ||
      a.scope.comparisonKey.localeCompare(b.scope.comparisonKey) ||
      a.scope.providerKey.localeCompare(b.scope.providerKey) ||
      a.scope.modelKey.localeCompare(b.scope.modelKey) ||
      a.scope.brandKey.localeCompare(b.scope.brandKey) ||
      a.scope.promptSetKey.localeCompare(b.scope.promptSetKey) ||
      a.profile.profileFingerprint.localeCompare(b.profile.profileFingerprint));
}

export function aiVisibilityScoringHistorySemantics() {
  return Object.freeze({
    exactP74LineageRequired: true,
    suppliedNormalizedComponentsOnly: true,
    rawP73CountsAutomaticallyScored: false,
    rawP74CountsAutomaticallyScored: false,
    nullDistinctFromZero: true,
    weightedFormulaTransparent: true,
    providerModelScopeExplicit: true,
    brandScopeExplicit: true,
    promptSetScopeExplicit: true,
    comparisonScopeExplicit: true,
    crossProviderNormalizedComparabilityClaimed: false,
    crossModelNormalizedComparabilityClaimed: false,
    aggregateProviderWinnerScoreGenerated: false,
    scoreImpliesMarketShare: false,
    scoreImpliesPreference: false,
    scoreImpliesRank: false,
    scoreImpliesQuality: false,
    scoreImpliesCorrectness: false,
    scoreImpliesRecommendation: false,
    scoreImpliesExecutionPriority: false,
    historyDirectionImpliesImprovementOrRegression: false,
    citationCooccurrenceImpliesSupport: false,
    citationCooccurrenceImpliesEndorsement: false,
    missingMentionEvidenceImpliesBrandAbsent: false,
    historyStored: false,
    opportunityGenerated: false,
  });
}

export function aiVisibilityScoringHistoryCapability() {
  return Object.freeze({
    deterministicScoringHistoryOnly: true,
    liveProviderRequestsAuthorized: false,
    providerCredentialUseAuthorized: false,
    aiModelCallsAuthorized: false,
    sourceRegistryAdmissionAuthorized: false,
    scorePersistenceAuthorized: false,
    historyPersistenceAuthorized: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    schemaMutationAuthorized: false,
    schedulerEnabled: false,
    workerEnabled: false,
    retryLoopEnabled: false,
    opportunityGenerationAuthorized: false,
    approvalGrantAuthorized: false,
    applyAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
    automaticTransitionEnabled: false,
    publicationAuthorized: false,
  });
}

export function buildAiVisibilityScoringHistory(
  input: AiVisibilityScoringHistoryInput,
): AiVisibilityScoringHistoryReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_ai_visibility_scoring_history_input");
  }
  const historyReferenceTime = canonicalTimestamp(
    input.historyReferenceTime,
    "invalid_ai_visibility_history_reference_time",
  );
  if (!Array.isArray(input.snapshots) || input.snapshots.length < 1) {
    throw new Error("invalid_ai_visibility_snapshots");
  }
  if (input.snapshots.length > P7_5_MAX_SNAPSHOTS) {
    throw new Error("ai_visibility_snapshot_limit_exceeded");
  }

  const snapshots = input.snapshots
    .map((snapshot) => buildSnapshot(snapshot))
    .sort((a, b) =>
      a.collectionReferenceTime.localeCompare(b.collectionReferenceTime) ||
      a.snapshotFingerprint.localeCompare(b.snapshotFingerprint));

  const times = new Set<string>();
  for (const snapshot of snapshots) {
    if (times.has(snapshot.collectionReferenceTime)) {
      throw new Error("duplicate_ai_visibility_snapshot_time");
    }
    times.add(snapshot.collectionReferenceTime);
    if (snapshot.collectionReferenceTime > historyReferenceTime) {
      throw new Error("ai_visibility_snapshot_after_history_reference");
    }
  }

  const siteKey = snapshots[0]!.scores[0]?.scope.siteKey ??
    input.snapshots[0]!.comparison.siteKey;
  for (const snapshot of input.snapshots) {
    if (snapshot.comparison.siteKey !== siteKey) {
      throw new Error("mixed_ai_visibility_site_scope");
    }
  }

  const series = buildSeries(snapshots);
  const counts = {
    snapshots: snapshots.length,
    scores: snapshots.reduce((sum, snapshot) => sum + snapshot.counts.scores, 0),
    scored: snapshots.reduce((sum, snapshot) => sum + snapshot.counts.scored, 0),
    unscorable: snapshots.reduce((sum, snapshot) => sum + snapshot.counts.unscorable, 0),
    series: series.length,
    deltas: series.reduce((sum, item) => sum + item.deltas.length, 0),
  };
  const semantics = aiVisibilityScoringHistorySemantics();
  const identity = {
    version: P7_5_AI_VISIBILITY_SCORING_HISTORY_VERSION,
    siteKey,
    historyReferenceTime,
    counts,
    snapshots,
    series,
    semantics,
  };
  const reportFingerprint = hash(identity);

  return {
    version: P7_5_AI_VISIBILITY_SCORING_HISTORY_VERSION,
    reportId: `p75-report-${reportFingerprint.slice(0, 20)}`,
    reportFingerprint,
    siteKey,
    historyReferenceTime,
    counts,
    snapshots,
    series,
    semantics,
    safety: aiVisibilityScoringHistoryCapability(),
  };
}
