import assert from "node:assert/strict";
import test from "node:test";
import { planCompetitorCollection } from "./competitor-discovery-planning.js";
import { createTargetRegistrationProposal, type TargetRegistrationProposal } from "./competitor-target-registration.js";
import { secureCompetitorTransportCapability } from "./secure-competitor-transport.js";
import {
  COMPETITOR_PILOT_READINESS_VERSION,
  createOneTargetPilotReadinessPlan,
  competitorPilotReadinessCapability,
  expectedOneTargetDryRunAuthorization,
  preflightOneTargetPilotReadiness,
  secureTransportCapabilityMeetsPilotRequirements,
  type OneTargetPilotPlan,
  type SecureTransportCapabilitySnapshot,
} from "./competitor-pilot-readiness.js";

const PLAN_TIME = "2026-09-13T12:00:00.000Z";
const REGISTRATION_TIME = "2026-09-13T12:05:00.000Z";
const PILOT_TIME = "2026-09-13T12:10:00.000Z";

function makeRegistrationProposal(url = "https://rivalshop.com/collections/fragrance"): TargetRegistrationProposal {
  const plan = planCompetitorCollection({
    ownDomain: "diamondshelf.us",
    now: PLAN_TIME,
    budget: { maxCompetitors: 1, maxUrlsPerCompetitor: 1, maxTotalTargets: 1 },
    candidates: [{
      domain: new URL(url).hostname,
      url,
      source: "reviewed-manual-seed",
      reason: "same-market collection coverage",
      confidence: 0.92,
      categories: ["fragrance"],
      pageTypes: ["collection"],
      keywordThemes: ["unisex fragrance"],
      taxonomyLabels: ["fragrance"],
      entityTypes: ["CollectionPage"],
      discoveredAt: PLAN_TIME,
    }],
  });
  const result = createTargetRegistrationProposal({
    plan,
    selectedRank: 1,
    now: REGISTRATION_TIME,
    registrationTtlMinutes: 60,
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.reason);
  return result.proposal;
}

function transport(): SecureTransportCapabilitySnapshot {
  return secureCompetitorTransportCapability();
}

function makePilot(options: { ttl?: number; proposal?: TargetRegistrationProposal; now?: string } = {}): OneTargetPilotPlan {
  const result = createOneTargetPilotReadinessPlan({
    sourceProposal: options.proposal ?? makeRegistrationProposal(),
    registrationReviewDecision: "approved",
    transportCapability: transport(),
    now: options.now ?? PILOT_TIME,
    pilotTtlMinutes: options.ttl ?? 30,
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.reason);
  return result.plan;
}

test("capability is readiness-only and keeps every execution/mutation gate closed", () => {
  const capability = competitorPilotReadinessCapability();
  assert.equal(capability.version, COMPETITOR_PILOT_READINESS_VERSION);
  assert.equal(capability.advisoryOnly, true);
  assert.equal(capability.dryRunOnly, true);
  assert.equal(capability.maxTargets, 1);
  assert.equal(capability.maxRuns, 1);
  assert.equal(capability.persistenceAllowed, false);
  assert.equal(capability.targetRegistrationAuthorized, false);
  assert.equal(capability.targetConfigurationMutationAuthorized, false);
  assert.equal(capability.networkCollectionAuthorized, false);
  assert.equal(capability.networkCollectionReady, false);
  assert.equal(capability.evidencePersistenceAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.autonomousWorkerEnabled, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.executionAuthorized, false);
  assert.equal(capability.liveDryRunExecutionImplemented, false);
  assert.equal(capability.authorizationConsumptionImplemented, false);
});

test("certified Task #62 capability satisfies pilot-readiness transport requirements without network work", () => {
  assert.equal(secureTransportCapabilityMeetsPilotRequirements(transport()), true);
});

test("plan creation is deterministic for identical reviewed lineage, transport, time, and TTL", () => {
  const proposal = makeRegistrationProposal();
  const one = createOneTargetPilotReadinessPlan({
    sourceProposal: proposal,
    registrationReviewDecision: "approved",
    transportCapability: transport(),
    now: PILOT_TIME,
    pilotTtlMinutes: 30,
  });
  const two = createOneTargetPilotReadinessPlan({
    sourceProposal: proposal,
    registrationReviewDecision: "approved",
    transportCapability: transport(),
    now: PILOT_TIME,
    pilotTtlMinutes: 30,
  });
  assert.deepEqual(one, two);
});

test("pilot preserves exact Task #61 lineage and fixes one-target one-run zero-persistence budget", () => {
  const proposal = makeRegistrationProposal();
  const pilot = makePilot({ proposal });
  assert.equal(pilot.sourceRegistrationProposalId, proposal.proposalId);
  assert.equal(pilot.sourceRegistrationFingerprint, proposal.registrationFingerprint);
  assert.equal(pilot.sourcePlanFingerprint, proposal.sourcePlanFingerprint);
  assert.equal(pilot.candidateFingerprint, proposal.candidateFingerprint);
  assert.equal(pilot.domain, proposal.domain);
  assert.deepEqual(pilot.target, proposal.target);
  assert.deepEqual(pilot.budget, { maxTargets: 1, maxRuns: 1, persistEvidence: false });
  assert.equal(pilot.safety.dryRunOnly, true);
  assert.equal(pilot.safety.networkCollectionReady, false);
});

test("future live dry-run authorization wording is exact and deterministic but not consumed", () => {
  const pilot = makePilot();
  const expected = `AUTHORIZE_ONE_TARGET_COMPETITOR_DRY_RUN:${pilot.pilotId}:${pilot.pilotFingerprint}`;
  assert.equal(expectedOneTargetDryRunAuthorization(pilot), expected);
  const preflight = preflightOneTargetPilotReadiness(pilot, {
    sourceProposal: makeRegistrationProposal(),
    registrationReviewDecision: "approved",
    transportCapability: transport(),
    now: "2026-09-13T12:15:00.000Z",
  });
  assert.equal(preflight.ok, true);
  assert.equal(preflight.lifecycle, "authorization_ready");
  assert.equal(preflight.expectedAuthorization, expected);
  assert.equal(preflight.eligibleForDryRunAuthorization, true);
  assert.equal(preflight.networkCollectionAuthorized, false);
  assert.equal(preflight.networkCollectionReady, false);
  assert.equal(preflight.evidencePersistenceAuthorized, false);
  assert.ok(preflight.blockers.includes("exact_live_dry_run_authorization_not_consumed"));
  assert.ok(preflight.blockers.includes("task63_does_not_execute_network_collection"));
});

test("pending or rejected Task #61 review cannot create a pilot-readiness plan", () => {
  const proposal = makeRegistrationProposal();
  const pending = createOneTargetPilotReadinessPlan({
    sourceProposal: proposal,
    registrationReviewDecision: "pending",
    transportCapability: transport(),
    now: PILOT_TIME,
  });
  assert.deepEqual(pending, { ok: false, reason: "source_registration_review_required" });

  const rejected = createOneTargetPilotReadinessPlan({
    sourceProposal: proposal,
    registrationReviewDecision: "rejected",
    transportCapability: transport(),
    now: PILOT_TIME,
  });
  assert.deepEqual(rejected, { ok: false, reason: "source_registration_rejected" });
});

test("tampered Task #61 proposal is rejected before pilot creation", () => {
  const proposal = structuredClone(makeRegistrationProposal());
  proposal.target.url = "https://rivalshop.com/collections/tampered";
  const result = createOneTargetPilotReadinessPlan({
    sourceProposal: proposal,
    registrationReviewDecision: "approved",
    transportCapability: transport(),
    now: PILOT_TIME,
  });
  assert.deepEqual(result, { ok: false, reason: "invalid_source_registration" });
});

test("expired Task #61 proposal cannot create a pilot", () => {
  const result = createOneTargetPilotReadinessPlan({
    sourceProposal: makeRegistrationProposal(),
    registrationReviewDecision: "approved",
    transportCapability: transport(),
    now: "2026-09-13T13:06:00.000Z",
  });
  assert.deepEqual(result, { ok: false, reason: "source_registration_expired" });
});

test("pilot TTL is bounded and cannot outlive its Task #61 source proposal", () => {
  const invalid = createOneTargetPilotReadinessPlan({
    sourceProposal: makeRegistrationProposal(),
    registrationReviewDecision: "approved",
    transportCapability: transport(),
    now: PILOT_TIME,
    pilotTtlMinutes: 61,
  });
  assert.deepEqual(invalid, { ok: false, reason: "invalid_pilot_ttl" });

  const capped = makePilot({ now: "2026-09-13T12:50:00.000Z", ttl: 30 });
  assert.equal(capped.expiresAt, "2026-09-13T13:05:00.000Z");
});

test("transport capability downgrade or authorization opening fails closed", () => {
  const degraded = { ...transport(), connectionAddressPinned: false };
  const result = createOneTargetPilotReadinessPlan({
    sourceProposal: makeRegistrationProposal(),
    registrationReviewDecision: "approved",
    transportCapability: degraded,
    now: PILOT_TIME,
  });
  assert.deepEqual(result, { ok: false, reason: "invalid_transport_capability" });

  const opened = { ...transport(), collectionAuthorized: true };
  assert.equal(secureTransportCapabilityMeetsPilotRequirements(opened), false);
});

test("expired pilot preflight fails even while source registration remains valid", () => {
  const proposal = makeRegistrationProposal();
  const pilot = makePilot({ proposal, ttl: 10 });
  const preflight = preflightOneTargetPilotReadiness(pilot, {
    sourceProposal: proposal,
    registrationReviewDecision: "approved",
    transportCapability: transport(),
    now: "2026-09-13T12:21:00.000Z",
  });
  assert.equal(preflight.ok, false);
  assert.equal(preflight.lifecycle, "expired");
  assert.equal(preflight.eligibleForDryRunAuthorization, false);
  assert.ok(preflight.blockers.includes("pilot_plan_expired"));
});

test("pilot target or budget tampering invalidates the deterministic pilot fingerprint", () => {
  const proposal = makeRegistrationProposal();
  const targetTamper = structuredClone(makePilot({ proposal }));
  targetTamper.target.url = "https://rivalshop.com/collections/other";
  const targetResult = preflightOneTargetPilotReadiness(targetTamper, {
    sourceProposal: proposal,
    registrationReviewDecision: "approved",
    transportCapability: transport(),
    now: "2026-09-13T12:15:00.000Z",
  });
  assert.equal(targetResult.ok, false);
  assert.ok(targetResult.blockers.includes("pilot_fingerprint_mismatch"));

  const budgetTamper = structuredClone(makePilot({ proposal }));
  (budgetTamper.budget as { maxTargets: number }).maxTargets = 2;
  const budgetResult = preflightOneTargetPilotReadiness(budgetTamper, {
    sourceProposal: proposal,
    registrationReviewDecision: "approved",
    transportCapability: transport(),
    now: "2026-09-13T12:15:00.000Z",
  });
  assert.equal(budgetResult.ok, false);
  assert.ok(budgetResult.blockers.includes("pilot_fingerprint_mismatch"));
});

test("a different valid Task #61 source proposal cannot satisfy pilot lineage", () => {
  const source = makeRegistrationProposal();
  const other = makeRegistrationProposal("https://another-rival.com/collections/fragrance");
  const pilot = makePilot({ proposal: source });
  const preflight = preflightOneTargetPilotReadiness(pilot, {
    sourceProposal: other,
    registrationReviewDecision: "approved",
    transportCapability: transport(),
    now: "2026-09-13T12:15:00.000Z",
  });
  assert.equal(preflight.ok, false);
  assert.ok(preflight.blockers.includes("source_lineage_mismatch"));
});
