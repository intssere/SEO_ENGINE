import assert from "node:assert/strict";
import test from "node:test";
import { planCompetitorCollection, type CompetitorCollectionPlan } from "./competitor-discovery-planning.js";
import {
  competitorTargetRegistrationCapability,
  createTargetRegistrationProposal,
  expectedTargetRegistrationAuthorization,
  fingerprintCompetitorCollectionPlan,
  preflightTargetRegistration,
  type TargetRegistrationProposal,
} from "./competitor-target-registration.js";

const NOW = "2026-09-13T16:00:00.000Z";

function makePlan(now = NOW): CompetitorCollectionPlan {
  return planCompetitorCollection({
    ownDomain: "diamondshelf.us",
    now,
    candidates: [
      {
        domain: "alpha-fragrance.com",
        url: "https://alpha-fragrance.com/collections/unisex",
        source: "manual research",
        reason: "category overlap",
        confidence: 0.9,
        categories: ["fragrance"],
        pageTypes: ["collection"],
        keywordThemes: ["unisex fragrance"],
        taxonomyLabels: ["perfume oils"],
        entityTypes: ["Product"],
        discoveredAt: now,
        provenance: { analyst: "internal", sourceType: "manual" },
      },
      {
        domain: "beta-beauty.com",
        url: "https://beta-beauty.com/collections/perfume",
        source: "internal taxonomy",
        confidence: 0.8,
        categories: ["fragrance"],
        pageTypes: ["collection"],
        discoveredAt: now,
      },
    ],
  });
}

function proposal(): TargetRegistrationProposal {
  const created = createTargetRegistrationProposal({ plan: makePlan(), selectedRank: 1, now: NOW });
  if (!created.ok) throw new Error("proposal_creation_failed");
  return created.proposal;
}

test("capability is advisory-only and permanently blocks live collection in v1", () => {
  const capability = competitorTargetRegistrationCapability();
  assert.equal(capability.advisoryOnly, true);
  assert.equal(capability.targetRegistrationAuthorized, false);
  assert.equal(capability.targetConfigurationMutationAuthorized, false);
  assert.equal(capability.networkCollectionAuthorized, false);
  assert.equal(capability.networkCollectionReady, false);
  assert.equal(capability.transportHardeningRequired, true);
  assert.equal(capability.evidencePersistenceAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.autonomousWorkerEnabled, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.executionAuthorized, false);
  assert.equal(capability.registrationMutationImplemented, false);
  assert.equal(capability.schemaMutationRequired, false);
});

test("Task #60 plan lineage fingerprint is deterministic", () => {
  const first = makePlan();
  const second = makePlan();
  const a = fingerprintCompetitorCollectionPlan(first);
  const b = fingerprintCompetitorCollectionPlan(second);
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
});

test("registration proposal is deterministic for identical plan/rank/time and preserves lineage", () => {
  const plan = makePlan();
  const first = createTargetRegistrationProposal({ plan, selectedRank: 1, now: NOW });
  const second = createTargetRegistrationProposal({ plan, selectedRank: 1, now: NOW });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.deepEqual(first.proposal, second.proposal);
  assert.equal(first.proposal.sourcePlanFingerprint, fingerprintCompetitorCollectionPlan(plan));
  assert.equal(first.proposal.candidateFingerprint, plan.selected[0]?.candidateFingerprint);
  assert.equal(first.proposal.lifecycle, "proposed");
  assert.match(first.proposal.registrationFingerprint, /^[0-9a-f]{64}$/);
  assert.match(first.proposal.proposalId, /^ctr-[0-9a-f]{24}$/);
});

test("future exact authorization string binds proposal id and registration fingerprint but is not consumed", () => {
  const item = proposal();
  const expected = expectedTargetRegistrationAuthorization(item);
  assert.equal(expected, `AUTHORIZE_COMPETITOR_TARGET_REGISTRATION:${item.proposalId}:${item.registrationFingerprint}`);
  const preflight = preflightTargetRegistration(item, { now: NOW, reviewDecision: "approved" });
  assert.equal(preflight.lifecycle, "authorization_ready");
  assert.equal(preflight.expectedAuthorization, expected);
  assert.equal(preflight.eligibleForAuthorization, true);
  assert.equal(preflight.targetRegistrationAuthorized, false);
  assert.equal(preflight.targetConfigurationMutationAuthorized, false);
  assert.equal(preflight.networkCollectionReady, false);
  assert.ok(preflight.blockers.includes("exact_registration_authorization_not_consumed"));
  assert.ok(preflight.blockers.includes("network_transport_hardening_required"));
});

test("pending and rejected review decisions remain advisory lifecycle states", () => {
  const item = proposal();
  const pending = preflightTargetRegistration(item, { now: NOW });
  assert.equal(pending.ok, true);
  assert.equal(pending.lifecycle, "review_ready");
  assert.equal(pending.expectedAuthorization, null);
  assert.equal(pending.eligibleForAuthorization, false);
  assert.ok(pending.blockers.includes("review_required"));

  const rejected = preflightTargetRegistration(item, { now: NOW, reviewDecision: "rejected" });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.lifecycle, "rejected");
  assert.equal(rejected.expectedAuthorization, null);
  assert.equal(rejected.networkCollectionReady, false);
});

test("registration proposal expires deterministically and cannot become authorization-ready", () => {
  const item = proposal();
  const expired = preflightTargetRegistration(item, { now: "2026-09-13T17:01:00.000Z", reviewDecision: "approved" });
  assert.equal(expired.ok, false);
  assert.equal(expired.lifecycle, "expired");
  assert.equal(expired.expectedAuthorization, null);
  assert.equal(expired.eligibleForAuthorization, false);
  assert.ok(expired.blockers.includes("registration_proposal_expired"));
});

test("stale Task #60 plan lineage fails closed before proposal creation", () => {
  const plan = makePlan("2026-09-11T16:00:00.000Z");
  const result = createTargetRegistrationProposal({ plan, selectedRank: 1, now: NOW });
  assert.deepEqual(result, { ok: false, reason: "source_plan_stale" });
});

test("selected target is revalidated and credential/query/owned-domain mutations fail closed", () => {
  const credentialPlan = structuredClone(makePlan());
  credentialPlan.selected[0]!.target.url = "https://user:pass@alpha-fragrance.com/collections/unisex";
  assert.deepEqual(
    createTargetRegistrationProposal({ plan: credentialPlan, selectedRank: 1, now: NOW }),
    { ok: false, reason: "credential_bearing_url" },
  );

  const queryPlan = structuredClone(makePlan());
  queryPlan.selected[0]!.target.url = "https://alpha-fragrance.com/collections/unisex?ref=tracking";
  assert.deepEqual(
    createTargetRegistrationProposal({ plan: queryPlan, selectedRank: 1, now: NOW }),
    { ok: false, reason: "query_or_fragment_not_allowed" },
  );

  const ownedPlan = structuredClone(makePlan());
  ownedPlan.selected[0]!.target.url = "https://shop.diamondshelf.us/collections/unisex";
  ownedPlan.selected[0]!.domain = "shop.diamondshelf.us";
  assert.deepEqual(
    createTargetRegistrationProposal({ plan: ownedPlan, selectedRank: 1, now: NOW }),
    { ok: false, reason: "own_domain" },
  );
});

test("special-use and IP-literal targets fail closed", () => {
  const special = structuredClone(makePlan());
  special.selected[0]!.target.url = "https://competitor.test/collections/unisex";
  special.selected[0]!.domain = "competitor.test";
  assert.deepEqual(
    createTargetRegistrationProposal({ plan: special, selectedRank: 1, now: NOW }),
    { ok: false, reason: "special_use_host" },
  );

  const literal = structuredClone(makePlan());
  literal.selected[0]!.target.url = "https://93.184.216.34/collections/unisex";
  literal.selected[0]!.domain = "93.184.216.34";
  assert.deepEqual(
    createTargetRegistrationProposal({ plan: literal, selectedRank: 1, now: NOW }),
    { ok: false, reason: "ip_literal_not_supported" },
  );
});

test("target path must remain within the declared allowlisted prefix", () => {
  const plan = structuredClone(makePlan());
  plan.selected[0]!.target.allowedPathPrefix = "/collections/fragrance";
  assert.deepEqual(
    createTargetRegistrationProposal({ plan, selectedRank: 1, now: NOW }),
    { ok: false, reason: "path_prefix_mismatch" },
  );
});

test("proposal tampering is detected by preflight fingerprint validation", () => {
  const item = proposal();
  const tampered = structuredClone(item);
  tampered.target.url = "https://alpha-fragrance.com/collections/changed";
  const result = preflightTargetRegistration(tampered, { now: NOW, reviewDecision: "approved" });
  assert.equal(result.ok, false);
  assert.equal(result.lifecycle, "rejected");
  assert.equal(result.expectedAuthorization, null);
  assert.ok(result.blockers.includes("proposal_fingerprint_mismatch"));
  assert.equal(result.networkCollectionReady, false);
});

test("different proposal timestamps produce different proposal instances while keeping source lineage stable", () => {
  const plan = makePlan();
  const first = createTargetRegistrationProposal({ plan, selectedRank: 1, now: NOW });
  const second = createTargetRegistrationProposal({ plan, selectedRank: 1, now: "2026-09-13T16:05:00.000Z" });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.equal(first.proposal.sourcePlanFingerprint, second.proposal.sourcePlanFingerprint);
  assert.notEqual(first.proposal.registrationFingerprint, second.proposal.registrationFingerprint);
  assert.notEqual(first.proposal.proposalId, second.proposal.proposalId);
});

test("no preflight lifecycle ever makes live network collection ready in v1", () => {
  const item = proposal();
  for (const reviewDecision of ["pending", "approved", "rejected"] as const) {
    const result = preflightTargetRegistration(item, { now: NOW, reviewDecision });
    assert.equal(result.networkCollectionReady, false);
    assert.equal(result.targetRegistrationAuthorized, false);
    assert.equal(result.targetConfigurationMutationAuthorized, false);
    assert.equal(result.safety.transportHardeningRequired, true);
    assert.equal(result.safety.evidencePersistenceAuthorized, false);
    assert.equal(result.safety.executionAuthorized, false);
  }
});
