import assert from "node:assert/strict";
import test from "node:test";
import { ListOpportunitiesResponse } from "@workspace/api-zod";

const active = {
  id: "opportunity-1",
  title: "Move diamond rings from striking distance",
  opportunity_type: "striking_distance",
  score: 81.2,
  status: "new",
  rationale: "Detailed GSC evidence supports a ranking opportunity.",
  evidence_count: 2,
  url: "https://diamondshelf.us/rings",
  query: "diamond rings",
  risk_classification: "low",
  confidence: 0.72,
  score_components: { demand: 30, proximity: 20, confidence: 14.4, evidence: 10 },
  why_qualifies: "Ranks between positions 11 and 20 with sufficient impressions.",
  recommendation: "Dry run: prepare ranking recommendations only.",
  execution_authorized: false,
  lifecycle: "active",
  updated_at: "2026-09-11T00:00:00.000Z",
};

test("opportunity API contract accepts active queue and superseded history", () => {
  const parsed = ListOpportunitiesResponse.parse({
    readiness: { state: "live" },
    rows: [active],
    history: [{ ...active, id: "opportunity-2", status: "dismissed", lifecycle: "invalidated_or_superseded" }],
  });
  assert.equal(parsed.rows[0]?.execution_authorized, false);
  assert.equal(parsed.history[0]?.lifecycle, "invalidated_or_superseded");
});

test("opportunity API contract remains compatible with an empty queue and history", () => {
  assert.deepEqual(ListOpportunitiesResponse.parse({ readiness: { state: "live" }, rows: [], history: [] }).rows, []);
});