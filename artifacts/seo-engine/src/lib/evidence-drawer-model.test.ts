import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOpportunityEvidenceDrawerModel,
  buildProposalEvidenceDrawerModel,
  type ProposalEvidenceInput,
} from "./evidence-drawer-model";

function proposalFixture(
  overrides: Partial<ProposalEvidenceInput> = {},
): ProposalEvidenceInput {
  return {
    id: "proposal-1",
    title: "Improve title",
    action_type: "update_title",
    field: "title",
    url: "https://example.com/a",
    query: "example query",
    confidence: 0.82,
    rationale: "Observed title gap.",
    expected_benefit: "Improve relevance.",
    evidence_ids: ["ev-a", "ev-b"],
    evidence_count: 2,
    evidence_sufficient: true,
    quality_status: "pass",
    quality_score: 91,
    quality_approval_eligible: true,
    quality_checks: [
      {
        id: "check-1",
        label: "Evidence linked",
        status: "pass",
        score: 100,
        summary: "Evidence IDs present.",
        evidenceIds: ["ev-a"],
      },
    ],
    quality_blocking_reasons: [],
    quality_warnings: [],
    quality_evidence_ids: ["ev-a"],
    semantic_provenance: [
      { source: "deterministic_rule", text: "Title relevance rule" },
    ],
    bounded_pilot: true,
    whole_site_coverage: false,
    ...overrides,
  };
}

test("proposal model preserves exposed references without mutating input", () => {
  const input = proposalFixture();
  const snapshot = structuredClone(input);
  const model = buildProposalEvidenceDrawerModel(input);

  assert.equal(model.references.completeness, "complete");
  assert.deepEqual(model.references.ids, ["ev-a", "ev-b"]);
  assert.equal(model.references.declaredCount, 2);
  assert.equal(model.quality.status, "pass");
  assert.equal(model.coverage.kind, "bounded_pilot");
  assert.match(model.coverage.label, /not whole-site/i);
  assert.deepEqual(input, snapshot);
});

test("count and ID mismatch stays partial and never synthesizes references", () => {
  const model = buildProposalEvidenceDrawerModel(
    proposalFixture({ evidence_count: 4, evidence_ids: ["ev-a", "ev-b"] }),
  );

  assert.equal(model.references.completeness, "partial");
  assert.equal(model.references.declaredCount, 4);
  assert.deepEqual(model.references.ids, ["ev-a", "ev-b"]);
  assert.match(model.references.note, /does not synthesize/i);
});

test("declared evidence without IDs is explicit unavailable state", () => {
  const model = buildProposalEvidenceDrawerModel(
    proposalFixture({ evidence_count: 3, evidence_ids: [] }),
  );

  assert.equal(model.references.completeness, "unavailable");
  assert.equal(model.references.ids.length, 0);
  assert.match(model.references.note, /not present/i);
});

test("quality warnings and blocked states are preserved exactly", () => {
  const model = buildProposalEvidenceDrawerModel(
    proposalFixture({
      quality_status: "blocked",
      quality_score: 30,
      quality_approval_eligible: false,
      quality_blocking_reasons: ["Insufficient supporting evidence"],
      quality_warnings: ["Low confidence"],
    }),
  );

  assert.equal(model.quality.status, "blocked");
  assert.equal(model.quality.approvalEligible, false);
  assert.deepEqual(model.quality.blockingReasons, [
    "Insufficient supporting evidence",
  ]);
  assert.deepEqual(model.quality.warnings, ["Low confidence"]);
});

test("semantic provenance is normalized without inventing a source", () => {
  const model = buildProposalEvidenceDrawerModel(
    proposalFixture({
      semantic_provenance: [
        { source: "rule", text: "Known source" },
        { arbitrary: "value" },
      ],
    }),
  );

  assert.equal(model.provenance[0].source, "rule");
  assert.equal(model.provenance[0].detail, "Known source");
  assert.equal(model.provenance[1].source, "Unspecified source");
  assert.match(model.provenance[1].detail, /arbitrary/);
});

test("detailed P3 evidence states remain unavailable instead of inferred", () => {
  const model = buildProposalEvidenceDrawerModel(proposalFixture());

  assert.deepEqual(
    model.detailStates.map((state) => state.key),
    ["freshness", "support", "retention_history", "conflict", "corroboration"],
  );
  assert.ok(
    model.detailStates.every(
      (state) =>
        state.availability === "unavailable" &&
        state.reason.includes("not exposed"),
    ),
  );
});

test("opportunity model treats evidence count as summary only", () => {
  const model = buildOpportunityEvidenceDrawerModel({
    id: "opp-1",
    title: "Opportunity",
    opportunity_type: "content_gap",
    url: "https://example.com/a",
    query: "query",
    confidence: 0.7,
    rationale: "Gap observed.",
    evidence_count: 5,
    why_qualifies: "Meets deterministic guardrails.",
  } as any);

  assert.equal(model.references.declaredCount, 5);
  assert.deepEqual(model.references.ids, []);
  assert.equal(model.references.completeness, "unavailable");
  assert.match(model.references.note, /count but not/i);
  assert.equal(model.quality.status, "unavailable");
  assert.equal(model.coverage.kind, "unavailable");
});
