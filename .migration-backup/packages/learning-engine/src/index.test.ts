import assert from "node:assert/strict";
import test from "node:test";
import {
  applyLearnedMultiplier,
  dedupeLearningSignals,
  learnWeights,
  signalFromExperiment,
  signalFromVerification,
  toLearningSignalInsert,
} from "./index.js";

const observedAt = "2026-09-10T10:00:00Z";

function experimentSignal(overrides: Partial<Parameters<typeof signalFromExperiment>[0]> = {}) {
  return signalFromExperiment({
    siteId: "site-1",
    experimentId: "exp-1",
    actionType: "metadata.title",
    metric: "organic_clicks",
    status: "positive",
    treatmentEffect: 12,
    relativeEffect: 0.2,
    confidence: 0.8,
    evaluationDedupeKey: "eval-1",
    observedAt,
    ...overrides,
  });
}

test("experiment learning signal preserves bounded effect and provenance", () => {
  const signal = experimentSignal({ relativeEffect: 3 });
  assert.equal(signal.value, 1);
  assert.equal(signal.direction, "positive");
  assert.equal(signal.confidence, 0.8);
  assert.equal(signal.signalType, "experiment_effect");
  assert.equal(signal.dedupeKey.length, 64);
});

test("insufficient experiment evidence cannot influence learning", () => {
  const signal = experimentSignal({ status: "insufficient_data", relativeEffect: 0.9, confidence: 0.95 });
  assert.equal(signal.direction, "insufficient");
  assert.equal(signal.value, 0);
  assert.equal(signal.confidence, 0);
  assert.equal(learnWeights([signal]).length, 0);
});

test("deduplicates repeated source signals deterministically", () => {
  const a = experimentSignal();
  const result = dedupeLearningSignals([a, a]);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.dedupeKey, a.dedupeKey);
});

test("repeated consistent evidence strengthens but bounds learned multiplier", () => {
  const signals = [
    experimentSignal({ experimentId: "exp-1", evaluationDedupeKey: "eval-1", relativeEffect: 0.4 }),
    experimentSignal({ experimentId: "exp-2", evaluationDedupeKey: "eval-2", relativeEffect: 0.4 }),
    experimentSignal({ experimentId: "exp-3", evaluationDedupeKey: "eval-3", relativeEffect: 0.4 }),
    experimentSignal({ experimentId: "exp-4", evaluationDedupeKey: "eval-4", relativeEffect: 0.4 }),
  ];
  const weight = learnWeights(signals)[0];
  assert.ok(weight);
  assert.equal(weight.sampleCount, 4);
  assert.ok(weight.confidence > 0.2);
  assert.ok(weight.multiplier > 1);
  assert.ok(weight.multiplier <= 1.2);
});

test("contradictory evidence reduces confidence", () => {
  const consistent = learnWeights([
    experimentSignal({ experimentId: "a", evaluationDedupeKey: "a", status: "positive", relativeEffect: 0.3 }),
    experimentSignal({ experimentId: "b", evaluationDedupeKey: "b", status: "positive", relativeEffect: 0.3 }),
  ])[0];
  const contradictory = learnWeights([
    experimentSignal({ experimentId: "a", evaluationDedupeKey: "a", status: "positive", relativeEffect: 0.3 }),
    experimentSignal({ experimentId: "b", evaluationDedupeKey: "b", status: "negative", relativeEffect: -0.3 }),
  ])[0];
  assert.ok(consistent && contradictory);
  assert.ok(contradictory.confidence < consistent.confidence);
  assert.equal(contradictory.contradictionRate, 0.5);
});

test("single noisy result does not change a future score", () => {
  const weight = learnWeights([experimentSignal({ relativeEffect: 1, confidence: 1 })])[0];
  assert.ok(weight);
  assert.equal(applyLearnedMultiplier(80, weight), 80);
});

test("verification regression emits stronger negative reliability signal", () => {
  const verified = signalFromVerification({ siteId: "site-1", actionType: "metadata.title", verificationStatus: "verified", verificationDedupeKey: "v1", observedAt });
  const regressed = signalFromVerification({ siteId: "site-1", actionType: "metadata.title", verificationStatus: "regressed", verificationDedupeKey: "v2", observedAt });
  assert.ok(regressed.value < verified.value);
  assert.ok(regressed.confidence > verified.confidence);
});

test("maps learning signal to persistence without policy mutation", () => {
  const insert = toLearningSignalInsert(experimentSignal());
  assert.equal(insert.siteId, "site-1");
  assert.equal(insert.signalType, "experiment_effect");
  assert.equal(insert.context.actionType, "metadata.title");
  assert.equal(insert.context.dedupeKey.length, 64);
});
