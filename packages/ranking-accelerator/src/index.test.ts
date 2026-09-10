import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRankingOpportunities } from "./index.js";

const row = (date: string, position: number, ctr: number, impressions = 100) => ({
  query: "best perfume",
  pageUrl: "https://example.com/products/a",
  metricDate: date,
  impressions,
  clicks: Math.round(impressions * ctr),
  ctr,
  averagePosition: position,
});

test("detects striking-distance and CTR opportunities", () => {
  const result = evaluateRankingOpportunities([
    row("2026-09-01", 8, 0.01, 200),
  ]);
  assert.ok(result.some((x) => x.type === "striking_distance"));
  assert.ok(result.some((x) => x.type === "ctr_underperformance"));
});

test("detects ranking decay from earlier vs recent periods", () => {
  const result = evaluateRankingOpportunities([
    row("2026-09-01", 5, 0.07, 100),
    row("2026-09-02", 5.5, 0.06, 100),
    row("2026-09-03", 9, 0.03, 100),
    row("2026-09-04", 10, 0.025, 100),
  ]);
  const decay = result.find((x) => x.type === "ranking_decay");
  assert.ok(decay);
  assert.ok(Number(decay?.details.positionDelta) >= 2);
});

test("marks strong top-five rankings for protection", () => {
  const result = evaluateRankingOpportunities([
    row("2026-09-01", 2.8, 0.12, 500),
  ]);
  assert.ok(result.some((x) => x.type === "protect_winner"));
});

test("ignores low-impression noise", () => {
  const result = evaluateRankingOpportunities([
    row("2026-09-01", 8, 0.001, 10),
  ]);
  assert.equal(result.length, 0);
});

test("produces deterministic ordering and dedupe keys", () => {
  const input = [row("2026-09-01", 8, 0.01, 200)];
  const a = evaluateRankingOpportunities(input);
  const b = evaluateRankingOpportunities(input);
  assert.deepEqual(a, b);
});
