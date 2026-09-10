import { createHash } from "node:crypto";

export type LearningDirection = "positive" | "negative" | "neutral" | "insufficient";
export type LearningSignalType = "experiment_effect" | "verification_reliability";

export interface ExperimentLearningInput {
  siteId: string;
  experimentId: string;
  actionType: string;
  metric: string;
  status: "insufficient_data" | "positive" | "negative" | "neutral";
  treatmentEffect: number | null;
  relativeEffect: number | null;
  confidence: number;
  evaluationDedupeKey: string;
  observedAt: string;
}

export interface VerificationLearningInput {
  siteId: string;
  actionType: string;
  verificationStatus: "verified" | "failed" | "regressed";
  verificationDedupeKey: string;
  observedAt: string;
}

export interface LearningSignal {
  siteId: string;
  experimentId: string | null;
  signalType: LearningSignalType;
  actionType: string;
  metric: string;
  value: number;
  confidence: number;
  direction: LearningDirection;
  sourceKey: string;
  observedAt: string;
  dedupeKey: string;
}

export interface LearnedWeight {
  siteId: string;
  actionType: string;
  metric: string;
  sampleCount: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  contradictionRate: number;
  meanValue: number;
  confidence: number;
  multiplier: number;
  dedupeKey: string;
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function bounded(value: number, min = 0, max = 1): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function iso(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error("observedAt must be a valid timestamp.");
  return new Date(parsed).toISOString();
}

export function signalFromExperiment(input: ExperimentLearningInput): LearningSignal {
  if (!input.siteId.trim() || !input.experimentId.trim() || !input.actionType.trim() || !input.metric.trim()) {
    throw new Error("siteId, experimentId, actionType, and metric are required.");
  }
  const confidence = bounded(input.confidence);
  const direction: LearningDirection = input.status === "positive"
    ? "positive"
    : input.status === "negative"
      ? "negative"
      : input.status === "neutral"
        ? "neutral"
        : "insufficient";
  const raw = direction === "insufficient" ? 0 : (input.relativeEffect ?? input.treatmentEffect ?? 0);
  const value = round(bounded(raw, -1, 1));
  const observedAt = iso(input.observedAt);
  const sourceKey = input.evaluationDedupeKey.trim();
  if (!sourceKey) throw new Error("evaluationDedupeKey is required.");
  return {
    siteId: input.siteId.trim(),
    experimentId: input.experimentId.trim(),
    signalType: "experiment_effect",
    actionType: input.actionType.trim(),
    metric: input.metric.trim(),
    value,
    confidence: direction === "insufficient" ? 0 : confidence,
    direction,
    sourceKey,
    observedAt,
    dedupeKey: hash([input.siteId.trim(), input.experimentId.trim(), input.actionType.trim(), input.metric.trim(), sourceKey]),
  };
}

export function signalFromVerification(input: VerificationLearningInput): LearningSignal {
  if (!input.siteId.trim() || !input.actionType.trim() || !input.verificationDedupeKey.trim()) {
    throw new Error("siteId, actionType, and verificationDedupeKey are required.");
  }
  const direction: LearningDirection = input.verificationStatus === "verified" ? "positive" : "negative";
  const value = input.verificationStatus === "verified" ? 0.1 : input.verificationStatus === "failed" ? -0.25 : -0.5;
  const observedAt = iso(input.observedAt);
  return {
    siteId: input.siteId.trim(),
    experimentId: null,
    signalType: "verification_reliability",
    actionType: input.actionType.trim(),
    metric: "verification_reliability",
    value,
    confidence: input.verificationStatus === "verified" ? 0.8 : 0.95,
    direction,
    sourceKey: input.verificationDedupeKey.trim(),
    observedAt,
    dedupeKey: hash([input.siteId.trim(), input.actionType.trim(), input.verificationStatus, input.verificationDedupeKey.trim()]),
  };
}

export function dedupeLearningSignals(signals: LearningSignal[]): LearningSignal[] {
  const map = new Map<string, LearningSignal>();
  for (const signal of signals) {
    if (!map.has(signal.dedupeKey)) map.set(signal.dedupeKey, signal);
  }
  return [...map.values()].sort((a, b) => a.observedAt.localeCompare(b.observedAt) || a.dedupeKey.localeCompare(b.dedupeKey));
}

export function learnWeights(signalsInput: LearningSignal[]): LearnedWeight[] {
  const signals = dedupeLearningSignals(signalsInput).filter((signal) => signal.direction !== "insufficient");
  const groups = new Map<string, LearningSignal[]>();
  for (const signal of signals) {
    const key = `${signal.siteId}\u0000${signal.actionType}\u0000${signal.metric}`;
    const group = groups.get(key) ?? [];
    group.push(signal);
    groups.set(key, group);
  }

  const weights: LearnedWeight[] = [];
  for (const group of groups.values()) {
    const first = group[0];
    if (!first) continue;
    const positiveCount = group.filter((s) => s.direction === "positive").length;
    const negativeCount = group.filter((s) => s.direction === "negative").length;
    const neutralCount = group.filter((s) => s.direction === "neutral").length;
    const directional = positiveCount + negativeCount;
    const contradictionRate = directional === 0 ? 0 : Math.min(positiveCount, negativeCount) / directional;
    const confidenceWeight = group.reduce((sum, s) => sum + s.confidence, 0);
    const weightedMean = confidenceWeight > 0
      ? group.reduce((sum, s) => sum + s.value * s.confidence, 0) / confidenceWeight
      : 0;

    // Conservative shrinkage: one result has little effect; repeated evidence approaches full weight.
    const evidenceStrength = group.length / (group.length + 4);
    const contradictionPenalty = 1 - contradictionRate;
    const confidence = round(bounded((confidenceWeight / group.length) * evidenceStrength * contradictionPenalty));
    const meanValue = round(weightedMean);
    // Keep learned prioritization adjustments intentionally small: ±20% maximum.
    const multiplier = round(bounded(1 + meanValue * confidence * 0.2, 0.8, 1.2));

    weights.push({
      siteId: first.siteId,
      actionType: first.actionType,
      metric: first.metric,
      sampleCount: group.length,
      positiveCount,
      negativeCount,
      neutralCount,
      contradictionRate: round(contradictionRate),
      meanValue,
      confidence,
      multiplier,
      dedupeKey: hash([first.siteId, first.actionType, first.metric, group.map((s) => s.dedupeKey).sort()]),
    });
  }

  return weights.sort((a, b) => a.actionType.localeCompare(b.actionType) || a.metric.localeCompare(b.metric));
}

export function applyLearnedMultiplier(baseScore: number, weight: LearnedWeight | null): number {
  const score = bounded(baseScore, 0, 100);
  if (!weight || weight.sampleCount < 2 || weight.confidence < 0.2) return round(score);
  return round(bounded(score * weight.multiplier, 0, 100));
}

export function toLearningSignalInsert(signal: LearningSignal) {
  return {
    siteId: signal.siteId,
    experimentId: signal.experimentId,
    signalType: signal.signalType,
    metric: signal.metric,
    value: signal.value,
    confidence: signal.confidence,
    context: {
      actionType: signal.actionType,
      direction: signal.direction,
      sourceKey: signal.sourceKey,
      dedupeKey: signal.dedupeKey,
    },
    observedAt: signal.observedAt,
  };
}
