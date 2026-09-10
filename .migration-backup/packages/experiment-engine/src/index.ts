import { createHash } from "node:crypto";

export type ExperimentCohort = "treatment" | "control";
export type ExperimentEvaluationStatus = "insufficient_data" | "positive" | "negative" | "neutral";

export interface ExperimentWindow {
  start: string;
  end: string;
}

export interface ExperimentDefinition {
  siteId: string;
  name: string;
  hypothesis: string;
  metric: string;
  baseline: ExperimentWindow;
  measurement: ExperimentWindow;
  seed?: string;
  minPagesPerCohort?: number;
  neutralThreshold?: number;
}

export interface ExperimentCandidate {
  pageId: string;
  metadata?: Record<string, unknown>;
}

export interface ExperimentAssignment {
  pageId: string;
  cohort: ExperimentCohort;
  assignmentKey: string;
  metadata: Record<string, unknown>;
}

export interface MetricObservation {
  pageId: string;
  observedAt: string;
  value: number;
}

export interface PageExperimentOutcome {
  pageId: string;
  cohort: ExperimentCohort;
  baselineValue: number;
  measurementValue: number;
  deltaValue: number;
}

export interface ExperimentEvaluation {
  status: ExperimentEvaluationStatus;
  metric: string;
  treatmentPages: number;
  controlPages: number;
  treatmentBaseline: number | null;
  treatmentMeasurement: number | null;
  treatmentDelta: number | null;
  controlBaseline: number | null;
  controlMeasurement: number | null;
  controlDelta: number | null;
  treatmentEffect: number | null;
  relativeEffect: number | null;
  confidence: number;
  pageOutcomes: PageExperimentOutcome[];
  dedupeKey: string;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function iso(value: string, field: string): string {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new Error(`${field} must be a valid timestamp.`);
  return new Date(time).toISOString();
}

function validateWindow(window: ExperimentWindow, field: string): ExperimentWindow {
  const start = iso(window.start, `${field}.start`);
  const end = iso(window.end, `${field}.end`);
  if (Date.parse(start) >= Date.parse(end)) throw new Error(`${field} start must be before end.`);
  return { start, end };
}

export function normalizeExperimentDefinition(input: ExperimentDefinition): ExperimentDefinition {
  if (!input.siteId.trim()) throw new Error("siteId is required.");
  if (!input.name.trim()) throw new Error("name is required.");
  if (!input.hypothesis.trim()) throw new Error("hypothesis is required.");
  if (!input.metric.trim()) throw new Error("metric is required.");

  const baseline = validateWindow(input.baseline, "baseline");
  const measurement = validateWindow(input.measurement, "measurement");
  if (Date.parse(baseline.end) > Date.parse(measurement.start)) {
    throw new Error("Baseline and measurement windows must not overlap.");
  }

  const minPagesPerCohort = input.minPagesPerCohort ?? 2;
  if (!Number.isInteger(minPagesPerCohort) || minPagesPerCohort < 1) {
    throw new Error("minPagesPerCohort must be a positive integer.");
  }

  const neutralThreshold = input.neutralThreshold ?? 0;
  if (!Number.isFinite(neutralThreshold) || neutralThreshold < 0) {
    throw new Error("neutralThreshold must be a finite non-negative number.");
  }

  return {
    siteId: input.siteId.trim(),
    name: input.name.trim(),
    hypothesis: input.hypothesis.trim(),
    metric: input.metric.trim(),
    baseline,
    measurement,
    seed: input.seed?.trim() || `${input.siteId.trim()}|${input.name.trim()}|${input.metric.trim()}`,
    minPagesPerCohort,
    neutralThreshold,
  };
}

export function assignExperimentCohorts(
  definitionInput: ExperimentDefinition,
  candidates: ExperimentCandidate[],
): ExperimentAssignment[] {
  const definition = normalizeExperimentDefinition(definitionInput);
  const seen = new Set<string>();
  const unique = candidates
    .filter((candidate) => {
      const id = candidate.pageId.trim();
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((candidate) => ({
      pageId: candidate.pageId.trim(),
      metadata: candidate.metadata ?? {},
      assignmentKey: hash(`${definition.seed}|${candidate.pageId.trim()}`),
    }))
    .sort((a, b) => a.assignmentKey.localeCompare(b.assignmentKey) || a.pageId.localeCompare(b.pageId));

  return unique.map((candidate, index) => ({
    pageId: candidate.pageId,
    cohort: index % 2 === 0 ? "treatment" : "control",
    assignmentKey: candidate.assignmentKey,
    metadata: candidate.metadata,
  }));
}

function inWindow(timestamp: string, window: ExperimentWindow): boolean {
  const value = Date.parse(timestamp);
  return value >= Date.parse(window.start) && value <= Date.parse(window.end);
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function evaluateExperiment(
  definitionInput: ExperimentDefinition,
  assignments: ExperimentAssignment[],
  observations: MetricObservation[],
): ExperimentEvaluation {
  const definition = normalizeExperimentDefinition(definitionInput);
  const assignmentMap = new Map(assignments.map((assignment) => [assignment.pageId, assignment.cohort]));
  const grouped = new Map<string, { baseline: number[]; measurement: number[] }>();

  for (const observation of observations) {
    if (!assignmentMap.has(observation.pageId) || !Number.isFinite(observation.value)) continue;
    const observedAt = iso(observation.observedAt, "observation.observedAt");
    let bucket = grouped.get(observation.pageId);
    if (!bucket) {
      bucket = { baseline: [], measurement: [] };
      grouped.set(observation.pageId, bucket);
    }
    if (inWindow(observedAt, definition.baseline)) bucket.baseline.push(observation.value);
    if (inWindow(observedAt, definition.measurement)) bucket.measurement.push(observation.value);
  }

  const pageOutcomes: PageExperimentOutcome[] = [];
  for (const assignment of assignments) {
    const values = grouped.get(assignment.pageId);
    if (!values) continue;
    const baselineValue = average(values.baseline);
    const measurementValue = average(values.measurement);
    if (baselineValue === null || measurementValue === null) continue;
    pageOutcomes.push({
      pageId: assignment.pageId,
      cohort: assignment.cohort,
      baselineValue: round(baselineValue),
      measurementValue: round(measurementValue),
      deltaValue: round(measurementValue - baselineValue),
    });
  }

  pageOutcomes.sort((a, b) => a.cohort.localeCompare(b.cohort) || a.pageId.localeCompare(b.pageId));
  const treatment = pageOutcomes.filter((item) => item.cohort === "treatment");
  const control = pageOutcomes.filter((item) => item.cohort === "control");

  const treatmentBaseline = average(treatment.map((item) => item.baselineValue));
  const treatmentMeasurement = average(treatment.map((item) => item.measurementValue));
  const treatmentDelta = average(treatment.map((item) => item.deltaValue));
  const controlBaseline = average(control.map((item) => item.baselineValue));
  const controlMeasurement = average(control.map((item) => item.measurementValue));
  const controlDelta = average(control.map((item) => item.deltaValue));
  const sufficient = treatment.length >= (definition.minPagesPerCohort ?? 2) && control.length >= (definition.minPagesPerCohort ?? 2);

  let treatmentEffect: number | null = null;
  let relativeEffect: number | null = null;
  let status: ExperimentEvaluationStatus = "insufficient_data";
  let confidence = 0;

  if (sufficient && treatmentDelta !== null && controlDelta !== null) {
    treatmentEffect = round(treatmentDelta - controlDelta);
    const controlReference = controlBaseline ?? 0;
    relativeEffect = Math.abs(controlReference) > 1e-12 ? round(treatmentEffect / Math.abs(controlReference)) : null;
    const threshold = definition.neutralThreshold ?? 0;
    status = Math.abs(treatmentEffect) <= threshold ? "neutral" : treatmentEffect > 0 ? "positive" : "negative";
    const minN = Math.min(treatment.length, control.length);
    confidence = round(Math.min(0.95, 0.5 + Math.log10(Math.max(1, minN)) * 0.2));
  }

  return {
    status,
    metric: definition.metric,
    treatmentPages: treatment.length,
    controlPages: control.length,
    treatmentBaseline: treatmentBaseline === null ? null : round(treatmentBaseline),
    treatmentMeasurement: treatmentMeasurement === null ? null : round(treatmentMeasurement),
    treatmentDelta: treatmentDelta === null ? null : round(treatmentDelta),
    controlBaseline: controlBaseline === null ? null : round(controlBaseline),
    controlMeasurement: controlMeasurement === null ? null : round(controlMeasurement),
    controlDelta: controlDelta === null ? null : round(controlDelta),
    treatmentEffect,
    relativeEffect,
    confidence,
    pageOutcomes,
    dedupeKey: hash(JSON.stringify([
      definition.siteId,
      definition.name,
      definition.metric,
      definition.baseline,
      definition.measurement,
      pageOutcomes,
    ])),
  };
}

export function toExperimentInsert(definitionInput: ExperimentDefinition) {
  const definition = normalizeExperimentDefinition(definitionInput);
  return {
    siteId: definition.siteId,
    name: definition.name,
    hypothesis: definition.hypothesis,
    status: "pending" as const,
    metadata: {
      metric: definition.metric,
      baseline: definition.baseline,
      measurement: definition.measurement,
      seed: definition.seed,
      minPagesPerCohort: definition.minPagesPerCohort,
      neutralThreshold: definition.neutralThreshold,
    },
  };
}

export function toExperimentCohortInserts(experimentId: string, assignments: ExperimentAssignment[]) {
  if (!experimentId.trim()) throw new Error("experimentId is required.");
  return assignments.map((assignment) => ({
    experimentId,
    pageId: assignment.pageId,
    cohort: assignment.cohort,
    metadata: { ...assignment.metadata, assignmentKey: assignment.assignmentKey },
  }));
}

export function toOutcomeInserts(experimentId: string, evaluation: ExperimentEvaluation) {
  if (!experimentId.trim()) throw new Error("experimentId is required.");
  return evaluation.pageOutcomes.map((outcome) => ({
    experimentId,
    pageId: outcome.pageId,
    metric: evaluation.metric,
    baselineValue: outcome.baselineValue,
    currentValue: outcome.measurementValue,
    deltaValue: outcome.deltaValue,
    metadata: {
      cohort: outcome.cohort,
      experimentStatus: evaluation.status,
      treatmentEffect: evaluation.treatmentEffect,
      confidence: evaluation.confidence,
      evaluationDedupeKey: evaluation.dedupeKey,
    },
  }));
}
