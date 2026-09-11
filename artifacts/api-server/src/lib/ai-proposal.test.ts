import assert from "node:assert/strict";
import test from "node:test";
import { buildSemanticPageProfile, type SemanticPageProfile } from "./semantic-evidence.js";
import type { CrawlPageSignal, OpportunityCandidate } from "./opportunity-engine.js";
import { generateAiMetaDescriptionProposal } from "./ai-proposal.js";

const page: CrawlPageSignal = {
  pageId: "ai-page",
  url: "https://example.test/collections/bath-body",
  indexable: true,
  title: "Bath & Body",
  description: null,
  h1: "Bath & Body",
  contentText: "The Bath & Body collection includes cleansers, lotions, and body-care products organized by product type.",
  links: [],
  headings: [],
  structuredData: [],
  evidenceId: "crawl-ai",
};
const candidate: OpportunityCandidate = {
  generationKey: "candidate-ai",
  opportunityType: "technical_remediation",
  pageId: page.pageId,
  queryId: null,
  query: null,
  title: "Meta description is missing",
  confidence: 0.8,
  risk: "medium",
  score: 70,
  scoreComponents: { demand: 10, proximity: 10, confidence: 20, evidence: 20 },
  rationale: "A description is missing.",
  recommendation: "Prepare a description.",
  sourceEvidenceIds: ["crawl-ai"],
  metrics: {},
};
const profile = () => buildSemanticPageProfile({ page, candidate });
const base = {
  providerModel: "test-injected",
  now: () => "2027-01-01T00:00:00.000Z",
  validateQuality: () => true,
};

test("AI proposal rejects unsupported claims and has no authorization/write fields", async () => {
  const result = await generateAiMetaDescriptionProposal({
    ...base,
    profile: profile(),
    candidate,
    generateText: async () => "Bath & Body offers the best lotions with free shipping and guaranteed quality.",
  });
  assert.equal(result.value, null);
  assert.equal(result.audit.errorCategory, "unsupported_claim");
  assert.equal("executionAuthorized" in result, false);
  assert.equal("publicSiteWrites" in result, false);
});

test("generator failure is closed and audit metadata is deterministic", async () => {
  const result = await generateAiMetaDescriptionProposal({
    ...base,
    profile: profile(),
    candidate,
    deterministicCandidate: "Bath & Body includes cleansers and lotions for everyday care.",
    generateText: async () => { throw new Error("provider unavailable"); },
  });
  assert.equal(result.value, null);
  assert.equal(result.audit.status, "failed");
  assert.equal(result.audit.errorCategory, "generator_failure");
  assert.equal(result.audit.mode, "refined");
  assert.equal(result.audit.providerModel, "test-injected");
  assert.equal(result.audit.generatedAt, "2027-01-01T00:00:00.000Z");
  assert.deepEqual(result.audit.evidenceIds, ["crawl-ai"]);
  assert.match(result.audit.evidenceHash, /^[a-f0-9]{64}$/);
});

test("insufficient semantic evidence fails before calling generator", async () => {
  const thin: SemanticPageProfile = { ...profile(), candidateSentences: [], blockers: ["insufficient_clean_evidence"] };
  let called = false;
  const result = await generateAiMetaDescriptionProposal({
    ...base,
    profile: thin,
    candidate,
    generateText: async () => { called = true; return "Bath & Body includes cleansers, lotions, and body-care products for shoppers."; },
  });
  assert.equal(called, false);
  assert.equal(result.audit.errorCategory, "insufficient_evidence");
});

test("quality rejection preserves the certified profile and fails closed", async () => {
  const source = profile();
  const result = await generateAiMetaDescriptionProposal({
    ...base,
    profile: source,
    candidate,
    generateText: async () => "Bath & Body includes cleansers, lotions, and body-care products for shoppers.",
    validateQuality: () => false,
  });
  assert.equal(result.audit.errorCategory, "quality_gate_rejection");
  assert.equal(source.version, "semantic_evidence_v1");
  assert.deepEqual(source.composition.membershipCertification, null);
});