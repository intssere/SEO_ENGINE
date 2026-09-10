import assert from "node:assert/strict";
import test from "node:test";
import {
  assignExperimentCohorts,
  evaluateExperiment,
  normalizeExperimentDefinition,
  toExperimentCohortInserts,
  toExperimentInsert,
  toOutcomeInserts,
  type ExperimentCandidate,
  type ExperimentDefinition,
  type MetricObservation,
} from "./index.js";

const definition: ExperimentDefinition = {
  siteId: "site-1",
  name: "Metadata CTR test",
  hypothesis: "Improved metadata increases clicks relative to control.",
  metric: "clicks",
  baseline: { start: "2026-08-01", end: "2026-08-07T23:59:59Z" },
  measurement: { start: "2026-08-08", end: "2026-08-14T23:59:59Z" },
  seed: "stable-seed",
  minPagesPerCohort: 2,
};

const candidates: ExperimentCandidate[] = [
  { pageId: "p1" },
  { pageId: "p2" },
  { pageId: "p3" },
  { pageId: "p4" },
];

test("normalizes windows and rejects overlap", () => {
  const normalized = normalizeExperimentDefinition(definition);
  assert.equal(normalized.baseline.start, "2026-08-01T00:00:00.000Z");
  assert.throws(() => normalizeExperimentDefinition({
    ...definition,
    measurement: { start: "2026-08-07", end: "2026-08-10" },
  }), /must not overlap/);
});

test("cohort assignment is deterministic and input-order independent", () => {
  const a = assignExperimentCohorts(definition, candidates);
  const b = assignExperimentCohorts(definition, [...candidates].reverse());
  assert.deepEqual(a, b);
  assert.equal(a.filter((item) => item.cohort === "treatment").length, 2);
  assert.equal(a.filter((item) => item.cohort === "control").length, 2);
});

test("evaluates treatment effect using difference in differences", () => {
  const assignments = assignExperimentCohorts(definition, candidates);
  const observations: MetricObservation[] = [];

  for (const assignment of assignments) {
    const baseline = assignment.cohort === "treatment" ? 100 : 90;
    const measurement = assignment.cohort === "treatment" ? 130 : 100;
    observations.push(
      { pageId: assignment.pageId, observedAt: "2026-08-03", value: baseline },
      { pageId: assignment.pageId, observedAt: "2026-08-11", value: measurement },
    );
  }

  const result = evaluateExperiment(definition, assignments, observations);
  assert.equal(result.status, "positive");
  assert.equal(result.treatmentDelta, 30);
  assert.equal(result.controlDelta, 10);
  assert.equal(result.treatmentEffect, 20);
  assert.ok(result.confidence >= 0.5);
});

test("insufficient data does not claim a treatment effect", () => {
  const assignments = assignExperimentCohorts(definition, candidates);
  const firstTreatment = assignments.find((item) => item.cohort === "treatment");
  const firstControl = assignments.find((item) => item.cohort === "control");
  assert.ok(firstTreatment && firstControl);

  const result = evaluateExperiment(definition, assignments, [
    { pageId: firstTreatment.pageId, observedAt: "2026-08-03", value: 10 },
    { pageId: firstTreatment.pageId, observedAt: "2026-08-10", value: 20 },
    { pageId: firstControl.pageId, observedAt: "2026-08-03", value: 10 },
    { pageId: firstControl.pageId, observedAt: "2026-08-10", value: 11 },
  ]);

  assert.equal(result.status, "insufficient_data");
  assert.equal(result.treatmentEffect, null);
  assert.equal(result.confidence, 0);
});

test("persistence mappings preserve pending state and cohort provenance", () => {
  const assignments = assignExperimentCohorts(definition, candidates);
  const exp = toExperimentInsert(definition);
  assert.equal(exp.status, "pending");
  assert.equal(exp.metadata.metric, "clicks");

  const cohortRows = toExperimentCohortInserts("exp-1", assignments);
  assert.equal(cohortRows.length, 4);
  assert.ok(cohortRows.every((row) => typeof row.metadata.assignmentKey === "string"));

  const observations: MetricObservation[] = assignments.flatMap((assignment) => [
    { pageId: assignment.pageId, observedAt: "2026-08-03", value: 10 },
    { pageId: assignment.pageId, observedAt: "2026-08-10", value: assignment.cohort === "treatment" ? 15 : 12 },
  ]);
  const evaluation = evaluateExperiment(definition, assignments, observations);
  const outcomes = toOutcomeInserts("exp-1", evaluation);
  assert.equal(outcomes.length, 4);
  assert.ok(outcomes.every((row) => row.metadata.evaluationDedupeKey === evaluation.dedupeKey));
});
