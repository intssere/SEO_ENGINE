import assert from "node:assert/strict";
import test from "node:test";
import { buildBacklinkEvidenceDataset } from "./backlink-evidence-contract.js";
import { discoverAuthorityOpportunities } from "./authority-opportunity-discovery.js";
import {
  qualifyAuthorityProspects,
  type AuthorityProspectQualificationSignal,
} from "./authority-prospect-qualification.js";
import {
  assertAuthorityOutreachWorkspaceIntegrity,
  buildAuthorityOutreachWorkspace,
  type AuthorityOutreachReviewInput,
} from "./authority-outreach-workspace.js";

const FP = (c: string) => c.repeat(64);

function qualification(withSignals: boolean) {
  const current = buildBacklinkEvidenceDataset({
    targetDomain: "example.com",
    source: {
      providerKey: "dataforseo",
      providerDataset: "backlinks.backlinks.live",
      sourceFingerprint: FP("a"),
      requestFingerprint: FP("b"),
      marketFingerprint: FP("c"),
      categoryFingerprint: FP("d"),
      observedAt: "2026-10-05T00:00:00Z",
      authorityMetric: {
        key: "domain_from_rank",
        min: 0,
        max: 1000,
        crossProviderComparable: false,
      },
      responseFingerprint: FP("e"),
    },
    backlinks: [{
      sourceUrl: "https://publisher.example.org/old-guide",
      sourceDomain: "publisher.example.org",
      targetUrl: "https://example.com/guide",
      anchorText: "Guide",
      firstSeenAt: "2026-01-01T00:00:00Z",
      lastSeenAt: "2026-08-01T00:00:00Z",
      lostAt: "2026-09-01T00:00:00Z",
      state: "lost",
      followState: "follow",
      rel: [],
      providerAuthority: 620,
      providerMetrics: [{ key: "is_lost", value: 1, unit: "boolean" }],
    }],
  });
  const discovery = discoverAuthorityOpportunities({ current });
  const opportunity = discovery.opportunities[0];
  assert.ok(opportunity);
  const signals: AuthorityProspectQualificationSignal[] = withSignals ? [{
    opportunityFingerprint: opportunity.opportunityFingerprint,
    topicalRelevance: { value: 0.95, evidenceFingerprint: FP("1") },
    targetPageFit: { value: 0.9, evidenceFingerprint: FP("2") },
    contactability: { value: 1, evidenceFingerprint: FP("3") },
    spamRisk: { value: 0.05, evidenceFingerprint: FP("4") },
  }] : [];
  return qualifyAuthorityProspects({ current, discovery, signals });
}

function review(
  q: ReturnType<typeof qualification>,
  decision: AuthorityOutreachReviewInput["decision"] = "approved_for_draft",
): AuthorityOutreachReviewInput {
  const prospect = q.prospects[0];
  assert.ok(prospect);
  return {
    qualificationFingerprint: q.qualificationFingerprint,
    prospectFingerprint: prospect.prospectFingerprint,
    decision,
    reasonCode: decision === "approved_for_draft"
      ? "editorial_fit_confirmed"
      : "needs_more_context",
    reviewerId: "reviewer@example.com",
    reviewedAt: "2026-10-05T12:30:00.000Z",
  };
}

test("qualified prospects enter an evidence-bound human-review queue", () => {
  const q = qualification(true);
  assert.equal(q.prospects[0]?.status, "qualified_for_review");

  const workspace = buildAuthorityOutreachWorkspace({ qualification: q });
  assert.equal(workspace.summary.total, 1);
  assert.equal(workspace.summary.awaitingHumanReview, 1);
  assert.equal(workspace.items[0]?.state, "awaiting_human_review");
  assert.equal(
    workspace.items[0]?.qualificationFingerprint,
    q.qualificationFingerprint,
  );
  assert.equal(workspace.semantics.humanReviewRequired, true);
  assert.equal(workspace.semantics.outreachDraftingPerformed, false);
  assert.equal(workspace.semantics.outreachSendingAuthorized, false);
  assert.equal(workspace.semantics.performsNetworkOperation, false);
  assert.equal(workspace.semantics.performsPersistence, false);
});

test("human approval advances only to draft eligibility, not contact or send", () => {
  const q = qualification(true);
  const input = { qualification: q, reviews: [review(q)] };
  const workspace = buildAuthorityOutreachWorkspace(input);

  assert.equal(workspace.summary.approvedForDraft, 1);
  assert.equal(workspace.items[0]?.state, "approved_for_draft");
  assert.equal(workspace.items[0]?.latestReview?.decision, "approved_for_draft");
  assert.equal(workspace.semantics.approvalForDraftOnly, true);
  assert.equal(workspace.semantics.contactDiscoveryPerformed, false);
  assert.equal(workspace.semantics.outreachDraftingPerformed, false);
  assert.equal(workspace.semantics.outreachSendingPerformed, false);
  assert.equal(workspace.semantics.outreachSendingAuthorized, false);
  assertAuthorityOutreachWorkspaceIntegrity(workspace, input);
});

test("review is rejected when bound to a stale qualification", () => {
  const q = qualification(true);
  const stale = {
    ...review(q),
    qualificationFingerprint: FP("f"),
  };
  assert.throws(
    () => buildAuthorityOutreachWorkspace({ qualification: q, reviews: [stale] }),
    /ugp_outreach_stale_qualification_review/,
  );
});

test("draft approval cannot bypass qualification evidence coverage", () => {
  const q = qualification(false);
  assert.equal(q.prospects[0]?.status, "insufficient_evidence");
  const prospect = q.prospects[0];
  assert.ok(prospect);
  const input: AuthorityOutreachReviewInput = {
    qualificationFingerprint: q.qualificationFingerprint,
    prospectFingerprint: prospect.prospectFingerprint,
    decision: "approved_for_draft",
    reasonCode: "editorial_fit_confirmed",
    reviewerId: "reviewer@example.com",
    reviewedAt: "2026-10-05T12:30:00.000Z",
  };
  assert.throws(
    () => buildAuthorityOutreachWorkspace({ qualification: q, reviews: [input] }),
    /ugp_outreach_review_requires_reviewable_prospect/,
  );
});

test("workspace integrity detects state tampering", () => {
  const q = qualification(true);
  const input = { qualification: q, reviews: [review(q, "deferred")] };
  const workspace = buildAuthorityOutreachWorkspace(input);
  const tampered = structuredClone(workspace);
  tampered.items[0]!.state = "approved_for_draft";

  assert.throws(
    () => assertAuthorityOutreachWorkspaceIntegrity(tampered, input),
    /ugp_outreach_workspace_integrity_mismatch/,
  );
});

test("workspace projection is deterministic for identical evidence and reviews", () => {
  const q = qualification(true);
  const input = { qualification: q, reviews: [review(q)] };
  const left = buildAuthorityOutreachWorkspace(input);
  const right = buildAuthorityOutreachWorkspace(input);
  assert.deepEqual(left, right);
  assert.equal(left.workspaceFingerprint, right.workspaceFingerprint);
});
