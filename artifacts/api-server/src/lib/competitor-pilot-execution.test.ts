import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPETITOR_ACQUISITION_VERSION,
  type AcquisitionResult,
} from "./competitor-acquisition.js";
import { planCompetitorCollection } from "./competitor-discovery-planning.js";
import { normalizeCompetitorObservation } from "./competitor-intelligence.js";
import {
  createOneTargetPilotReadinessPlan,
  expectedOneTargetDryRunAuthorization,
  type OneTargetPilotPlan,
  type SecureTransportCapabilitySnapshot,
} from "./competitor-pilot-readiness.js";
import {
  COMPETITOR_PILOT_EXECUTION_GATE,
  COMPETITOR_PILOT_EXECUTION_VERSION,
  competitorPilotExecutionCapability,
  deterministicCompetitorPilotExecutionJobId,
  executeAuthorizedCompetitorPilotDryRun,
  loadCompetitorPilotExecutionConfig,
  type CompetitorPilotExecutionIdentity,
  type CompetitorPilotExecutionReceipt,
  type CompetitorPilotExecutionReservation,
  type CompetitorPilotExecutionStore,
} from "./competitor-pilot-execution.js";
import {
  createTargetRegistrationProposal,
  type TargetRegistrationProposal,
} from "./competitor-target-registration.js";
import { secureCompetitorTransportCapability } from "./secure-competitor-transport.js";

const PLAN_TIME = "2026-09-13T12:00:00.000Z";
const REGISTRATION_TIME = "2026-09-13T12:05:00.000Z";
const PILOT_TIME = "2026-09-13T12:10:00.000Z";
const EXECUTION_TIME = "2026-09-13T12:15:00.000Z";
const COMPLETION_TIME = "2026-09-13T12:16:00.000Z";
const SITE_ID = "11111111-1111-4111-8111-111111111111";

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
  if (!result.ok) throw new Error("registration_fixture_creation_failed");
  return result.proposal;
}

function transport(): SecureTransportCapabilitySnapshot {
  return secureCompetitorTransportCapability();
}

function makePilot(proposal = makeRegistrationProposal()): OneTargetPilotPlan {
  const result = createOneTargetPilotReadinessPlan({
    sourceProposal: proposal,
    registrationReviewDecision: "approved",
    transportCapability: transport(),
    now: PILOT_TIME,
    pilotTtlMinutes: 30,
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("pilot_fixture_creation_failed");
  return result.plan;
}

function acquisitionFor(plan: OneTargetPilotPlan, observedAt = EXECUTION_TIME): AcquisitionResult {
  const normalized = normalizeCompetitorObservation({
    source: plan.target.source,
    sourceUrl: plan.target.url,
    competitorDomain: new URL(plan.target.url).hostname,
    pageType: plan.target.pageType,
    observedAt,
    confidence: plan.target.confidence,
    title: "Fragrance Collection",
    metaDescription: "A bounded competitor collection page.",
    h1: "Fragrance",
    wordCount: 420,
    keywordThemes: plan.target.keywordThemes,
    taxonomyLabels: plan.target.taxonomyLabels,
    schemaTypes: ["CollectionPage"],
    entityTypes: plan.target.entityTypes,
    internalLinkPatterns: ["collection-to-product"],
  }, "diamondshelf.us");
  assert.equal(normalized.ok, true);
  if (!normalized.ok) throw new Error("acquisition_fixture_normalization_failed");
  return {
    targetId: plan.target.id,
    record: normalized.record,
    request: {
      redirects: 0,
      responseBytes: 4096,
      finalUrl: plan.target.url,
      contentType: "text/html",
    },
    safety: {
      version: COMPETITOR_ACQUISITION_VERSION,
      boundedTarget: true,
      policyAllowed: true,
      rawContentRetained: false,
      executionAuthorized: false,
      publicSiteWrites: false,
      automaticTransition: false,
    },
  };
}

class FakeExecutionStore implements CompetitorPilotExecutionStore {
  identity: CompetitorPilotExecutionIdentity | null = null;
  status: string | null = null;
  completedReceipt: CompetitorPilotExecutionReceipt | null = null;
  failedReceipt: CompetitorPilotExecutionReceipt | null = null;
  reserveCalls = 0;
  claimCalls = 0;
  completeCalls = 0;
  failCalls = 0;
  forceCollision = false;
  forceClaimFailure = false;
  forceCompleteFailure = false;
  forceFailFailure = false;

  async reserve(identity: CompetitorPilotExecutionIdentity): Promise<CompetitorPilotExecutionReservation> {
    this.reserveCalls += 1;
    if (this.forceCollision) return { state: "identity_collision", status: this.status };
    if (this.identity) {
      const same = this.identity.jobId === identity.jobId
        && this.identity.siteId === identity.siteId
        && this.identity.pilotId === identity.pilotId
        && this.identity.pilotFingerprint === identity.pilotFingerprint
        && this.identity.targetId === identity.targetId;
      return same
        ? { state: "already_exists", status: this.status ?? "completed" }
        : { state: "identity_collision", status: this.status };
    }
    this.identity = structuredClone(identity);
    this.status = "pending";
    return { state: "reserved" };
  }

  async claim(jobId: string): Promise<boolean> {
    this.claimCalls += 1;
    if (this.forceClaimFailure || !this.identity || this.identity.jobId !== jobId || this.status !== "pending") return false;
    this.status = "active";
    return true;
  }

  async complete(jobId: string, receipt: CompetitorPilotExecutionReceipt): Promise<boolean> {
    this.completeCalls += 1;
    if (this.forceCompleteFailure || !this.identity || this.identity.jobId !== jobId || this.status !== "active") return false;
    this.status = "completed";
    this.completedReceipt = structuredClone(receipt);
    return true;
  }

  async fail(jobId: string, receipt: CompetitorPilotExecutionReceipt): Promise<boolean> {
    this.failCalls += 1;
    if (this.forceFailFailure || !this.identity || this.identity.jobId !== jobId || this.status !== "active") return false;
    this.status = "failed";
    this.failedReceipt = structuredClone(receipt);
    return true;
  }
}

function enabledEnv() {
  return { [COMPETITOR_PILOT_EXECUTION_GATE]: "true" };
}

function executionInput(proposal = makeRegistrationProposal(), plan = makePilot(proposal)) {
  return {
    plan,
    sourceProposal: proposal,
    registrationReviewDecision: "approved" as const,
    authorization: expectedOneTargetDryRunAuthorization(plan),
    actorId: "admin@example.com",
    env: enabledEnv(),
    now: EXECUTION_TIME,
  };
}

function dependencies(store: FakeExecutionStore, plan: OneTargetPilotPlan, acquireCounter: { count: number }) {
  return {
    transportCapability: transport,
    loadSiteContext: async () => ({ siteId: SITE_ID, domain: "diamondshelf.us" }),
    createStore: () => store,
    acquire: async () => {
      acquireCounter.count += 1;
      return acquisitionFor(plan);
    },
    now: () => COMPLETION_TIME,
  };
}

test("capability is default-off and preserves one-run zero-persistence safety", () => {
  const capability = competitorPilotExecutionCapability({});
  assert.equal(capability.version, COMPETITOR_PILOT_EXECUTION_VERSION);
  assert.equal(capability.executionGateEnabled, false);
  assert.equal(capability.networkCollectionReady, false);
  assert.equal(capability.networkCollectionAuthorized, false);
  assert.equal(capability.authorizationConsumptionImplemented, true);
  assert.equal(capability.liveDryRunExecutionPathImplemented, true);
  assert.equal(capability.durableReplayLockImplemented, true);
  assert.equal(capability.maxTargets, 1);
  assert.equal(capability.maxRuns, 1);
  assert.equal(capability.persistenceAllowed, false);
  assert.equal(capability.evidencePersistenceAuthorized, false);
  assert.equal(capability.activeTargetConfigurationRequired, false);
  assert.equal(capability.targetConfigurationMutationAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.batchEnabled, false);
  assert.equal(capability.autonomousWorkerEnabled, false);
  assert.equal(capability.retryLoopEnabled, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.automaticTransition, false);
  assert.equal(capability.executionAuthorized, false);
  assert.equal(capability.schemaMutationRequired, false);
});

test("execution gate accepts only explicit true", () => {
  assert.equal(loadCompetitorPilotExecutionConfig({}).executionEnabled, false);
  assert.equal(loadCompetitorPilotExecutionConfig({ [COMPETITOR_PILOT_EXECUTION_GATE]: "false" }).executionEnabled, false);
  assert.equal(loadCompetitorPilotExecutionConfig({ [COMPETITOR_PILOT_EXECUTION_GATE]: "1" }).executionEnabled, false);
  assert.equal(loadCompetitorPilotExecutionConfig({ [COMPETITOR_PILOT_EXECUTION_GATE]: " TRUE " }).executionEnabled, true);
});

test("deterministic replay job UUID is stable and bound to both pilot ID and fingerprint", () => {
  const pilot = makePilot();
  const one = deterministicCompetitorPilotExecutionJobId(pilot.pilotId, pilot.pilotFingerprint);
  const two = deterministicCompetitorPilotExecutionJobId(pilot.pilotId, pilot.pilotFingerprint);
  const changed = deterministicCompetitorPilotExecutionJobId(pilot.pilotId, "f".repeat(64));
  assert.equal(one, two);
  assert.notEqual(one, changed);
  assert.match(one, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("disabled execution gate performs no site, store, or acquisition work", async () => {
  const proposal = makeRegistrationProposal();
  const pilot = makePilot(proposal);
  let siteCalls = 0;
  let storeCalls = 0;
  let acquisitionCalls = 0;
  const result = await executeAuthorizedCompetitorPilotDryRun({
    ...executionInput(proposal, pilot),
    env: {},
  }, {
    loadSiteContext: async () => { siteCalls += 1; return { siteId: SITE_ID, domain: "diamondshelf.us" }; },
    createStore: () => { storeCalls += 1; return new FakeExecutionStore(); },
    acquire: async () => { acquisitionCalls += 1; return acquisitionFor(pilot); },
  });
  assert.deepEqual(result, { ok: false, reason: "competitor_pilot_execution_disabled", jobId: null, consumed: false });
  assert.equal(siteCalls, 0);
  assert.equal(storeCalls, 0);
  assert.equal(acquisitionCalls, 0);
});

test("authorization mismatch is rejected before durable reservation or acquisition", async () => {
  const proposal = makeRegistrationProposal();
  const pilot = makePilot(proposal);
  const store = new FakeExecutionStore();
  let acquisitionCalls = 0;
  const result = await executeAuthorizedCompetitorPilotDryRun({
    ...executionInput(proposal, pilot),
    authorization: `${expectedOneTargetDryRunAuthorization(pilot)}-tampered`,
  }, dependencies(store, pilot, { get count() { return acquisitionCalls; }, set count(value: number) { acquisitionCalls = value; } }));
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("authorization_mismatch_should_fail");
  assert.equal(result.reason, "competitor_pilot_authorization_mismatch");
  assert.equal(result.consumed, false);
  assert.equal(store.reserveCalls, 0);
  assert.equal(acquisitionCalls, 0);
});

test("expired pilot is rejected by Task #63 preflight before reservation", async () => {
  const proposal = makeRegistrationProposal();
  const pilot = makePilot(proposal);
  const store = new FakeExecutionStore();
  let acquisitionCalls = 0;
  const result = await executeAuthorizedCompetitorPilotDryRun({
    ...executionInput(proposal, pilot),
    now: "2026-09-13T12:41:00.000Z",
  }, dependencies(store, pilot, { get count() { return acquisitionCalls; }, set count(value: number) { acquisitionCalls = value; } }));
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("expired_pilot_should_fail");
  assert.equal(result.reason, "competitor_pilot_preflight_rejected");
  assert.equal(store.reserveCalls, 0);
  assert.equal(acquisitionCalls, 0);
});

test("pilot or source-lineage tampering fails closed before reservation", async () => {
  const source = makeRegistrationProposal();
  const other = makeRegistrationProposal("https://other-rival.com/collections/fragrance");
  const pilot = makePilot(source);
  const store = new FakeExecutionStore();
  const input = executionInput(source, pilot);
  const result = await executeAuthorizedCompetitorPilotDryRun({
    ...input,
    sourceProposal: other,
  }, dependencies(store, pilot, { count: 0 }));
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("source_lineage_tamper_should_fail");
  assert.equal(result.reason, "competitor_pilot_preflight_rejected");
  assert.equal(store.reserveCalls, 0);
});

test("transport capability downgrade fails closed before reservation", async () => {
  const proposal = makeRegistrationProposal();
  const pilot = makePilot(proposal);
  const store = new FakeExecutionStore();
  const degraded = { ...transport(), connectionAddressPinned: false };
  const result = await executeAuthorizedCompetitorPilotDryRun(executionInput(proposal, pilot), {
    ...dependencies(store, pilot, { count: 0 }),
    transportCapability: () => degraded,
  });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("transport_downgrade_should_fail");
  assert.equal(result.reason, "competitor_pilot_preflight_rejected");
  assert.equal(store.reserveCalls, 0);
});

test("first exact authorization reserves, claims, completes, and persists only bounded receipt metadata", async () => {
  const proposal = makeRegistrationProposal();
  const pilot = makePilot(proposal);
  const store = new FakeExecutionStore();
  const counter = { count: 0 };
  const result = await executeAuthorizedCompetitorPilotDryRun(executionInput(proposal, pilot), dependencies(store, pilot, counter));
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("first_execution_should_succeed");
  assert.equal(counter.count, 1);
  assert.equal(store.reserveCalls, 1);
  assert.equal(store.claimCalls, 1);
  assert.equal(store.completeCalls, 1);
  assert.equal(store.failCalls, 0);
  assert.equal(store.status, "completed");
  assert.deepEqual(result.persistence, { attempted: false, inserted: false, id: null });
  assert.equal(result.receipt.rawContentRetained, false);
  assert.equal(result.receipt.evidencePersisted, false);
  assert.equal(result.receipt.targetConfigurationMutated, false);
  assert.equal(result.receipt.publicSiteWrites, false);
  assert.equal(result.receipt.automaticTransition, false);
  assert.equal(result.receipt.outcome, "completed");
  assert.equal(result.receipt.observationFingerprint, result.acquisition.record.payload.fingerprint);
  assert.equal(store.completedReceipt?.observationFingerprint, result.acquisition.record.payload.fingerprint);
  assert.equal("record" in (store.completedReceipt as unknown as Record<string, unknown>), false);
  assert.equal("acquisition" in (store.completedReceipt as unknown as Record<string, unknown>), false);
  assert.equal("rawBody" in (store.completedReceipt as unknown as Record<string, unknown>), false);
});

test("replay of an already-consumed exact authorization is rejected before acquisition", async () => {
  const proposal = makeRegistrationProposal();
  const pilot = makePilot(proposal);
  const store = new FakeExecutionStore();
  const counter = { count: 0 };
  const deps = dependencies(store, pilot, counter);
  const first = await executeAuthorizedCompetitorPilotDryRun(executionInput(proposal, pilot), deps);
  assert.equal(first.ok, true);
  const second = await executeAuthorizedCompetitorPilotDryRun({
    ...executionInput(proposal, pilot),
    now: "2026-09-13T12:17:00.000Z",
  }, deps);
  assert.equal(second.ok, false);
  if (second.ok) throw new Error("replay_should_fail");
  assert.equal(second.reason, "competitor_pilot_authorization_already_consumed");
  assert.equal(second.consumed, true);
  assert.equal(counter.count, 1);
  assert.equal(store.claimCalls, 1);
});

test("deterministic job identity collision fails closed before claim or acquisition", async () => {
  const proposal = makeRegistrationProposal();
  const pilot = makePilot(proposal);
  const store = new FakeExecutionStore();
  store.forceCollision = true;
  const counter = { count: 0 };
  const result = await executeAuthorizedCompetitorPilotDryRun(executionInput(proposal, pilot), dependencies(store, pilot, counter));
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("collision_should_fail");
  assert.equal(result.reason, "competitor_pilot_execution_identity_collision");
  assert.equal(result.consumed, true);
  assert.equal(store.claimCalls, 0);
  assert.equal(counter.count, 0);
});

test("atomic claim failure consumes the reserved identity and prevents acquisition", async () => {
  const proposal = makeRegistrationProposal();
  const pilot = makePilot(proposal);
  const store = new FakeExecutionStore();
  store.forceClaimFailure = true;
  const counter = { count: 0 };
  const result = await executeAuthorizedCompetitorPilotDryRun(executionInput(proposal, pilot), dependencies(store, pilot, counter));
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("claim_failure_should_fail");
  assert.equal(result.reason, "competitor_pilot_claim_failed");
  assert.equal(result.consumed, true);
  assert.equal(counter.count, 0);
  assert.equal(store.status, "pending");
});

test("acquisition failure writes a bounded failure receipt and permanently consumes authorization", async () => {
  const proposal = makeRegistrationProposal();
  const pilot = makePilot(proposal);
  const store = new FakeExecutionStore();
  let acquisitionCalls = 0;
  const deps = {
    ...dependencies(store, pilot, { count: 0 }),
    acquire: async () => {
      acquisitionCalls += 1;
      throw new Error("policy_disallowed");
    },
  };
  const first = await executeAuthorizedCompetitorPilotDryRun(executionInput(proposal, pilot), deps);
  assert.equal(first.ok, false);
  if (first.ok) throw new Error("acquisition_failure_should_fail");
  assert.equal(first.reason, "competitor_pilot_acquisition_failed");
  assert.equal(first.consumed, true);
  assert.equal(first.receipt?.outcome, "failed");
  assert.equal(first.receipt?.failureCategory, "policy_disallowed");
  assert.equal(first.receipt?.request, null);
  assert.equal(first.receipt?.observationFingerprint, null);
  assert.equal(first.receipt?.evidencePersisted, false);
  assert.equal(store.status, "failed");
  assert.equal(store.failedReceipt?.rawContentRetained, false);

  const replay = await executeAuthorizedCompetitorPilotDryRun({
    ...executionInput(proposal, pilot),
    now: "2026-09-13T12:17:00.000Z",
  }, deps);
  assert.equal(replay.ok, false);
  if (replay.ok) throw new Error("failed_execution_replay_should_fail");
  assert.equal(replay.reason, "competitor_pilot_authorization_already_consumed");
  assert.equal(acquisitionCalls, 1);
});

test("successful execution does not depend on configured active target JSON or Task #59 collection gate", async () => {
  const proposal = makeRegistrationProposal();
  const pilot = makePilot(proposal);
  const store = new FakeExecutionStore();
  const counter = { count: 0 };
  const result = await executeAuthorizedCompetitorPilotDryRun({
    ...executionInput(proposal, pilot),
    env: {
      [COMPETITOR_PILOT_EXECUTION_GATE]: "true",
      COMPETITOR_COLLECTION_ENABLED: "false",
      COMPETITOR_EVIDENCE_PERSISTENCE_ENABLED: "false",
      COMPETITOR_COLLECTION_TARGETS_JSON: "",
    },
  }, dependencies(store, pilot, counter));
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("ephemeral_target_execution_should_succeed");
  assert.equal(counter.count, 1);
  assert.equal(result.receipt.targetId, pilot.target.id);
  assert.equal(result.receipt.evidencePersisted, false);
});
