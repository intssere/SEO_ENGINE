import assert from "node:assert/strict";
import test from "node:test";
import type { CompetitorCandidateInput } from "./competitor-discovery-planning.js";
import {
  deterministicCompetitorPilotExecutionJobId as task64DeterministicJobId,
} from "./competitor-pilot-execution.js";
import {
  COMPETITOR_PILOT_PREPARATION_VERSION,
  competitorPilotPreparationCapability,
  expectedTask64PilotGateEnableAuthorization,
  prepareOneTargetPilotPackage,
  preflightOneTargetPilotPackage,
  type OneTargetPilotPreparationPackage,
} from "./competitor-pilot-preparation.js";
import {
  deterministicCompetitorPilotExecutionJobId,
} from "./competitor-pilot-execution-identity.js";
import { secureCompetitorTransportCapability } from "./secure-competitor-transport.js";

const NOW = "2026-09-14T00:00:00.000Z";
const LATER = "2026-09-14T00:10:00.000Z";
const EXPIRED = "2026-09-14T00:31:00.000Z";

function candidate(url = "https://rivalshop.com/collections/fragrance"): CompetitorCandidateInput {
  return {
    domain: new URL(url).hostname,
    url,
    source: "reviewed-manual-seed",
    reason: "same-market fragrance collection coverage",
    confidence: 0.94,
    categories: ["fragrance"],
    pageTypes: ["collection"],
    keywordThemes: ["unisex fragrance"],
    taxonomyLabels: ["fragrance"],
    entityTypes: ["CollectionPage"],
    discoveredAt: NOW,
    provenance: { review: "manual", sourceType: "internal-reviewed-input" },
  };
}

function prepare(input: Partial<Parameters<typeof prepareOneTargetPilotPackage>[0]> = {}) {
  return prepareOneTargetPilotPackage({
    ownDomain: "diamondshelf.us",
    candidate: candidate(),
    reviewDecision: "approved",
    transportCapability: secureCompetitorTransportCapability(),
    now: NOW,
    ...input,
  });
}

function validPackage(): OneTargetPilotPreparationPackage {
  const result = prepare();
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("valid_package_fixture_failed");
  return result.package;
}

test("capability is preparation-only and keeps every execution/write gate closed", () => {
  const capability = competitorPilotPreparationCapability();
  assert.equal(capability.version, COMPETITOR_PILOT_PREPARATION_VERSION);
  assert.equal(capability.preparationOnly, true);
  assert.equal(capability.manualReviewRequired, true);
  assert.equal(capability.exactCandidateCount, 1);
  assert.equal(capability.exactTargetCount, 1);
  assert.equal(capability.exactRunCount, 1);
  assert.equal(capability.targetRegistrationAuthorized, false);
  assert.equal(capability.targetConfigurationMutationAuthorized, false);
  assert.equal(capability.gateMutationAuthorized, false);
  assert.equal(capability.networkCollectionAuthorized, false);
  assert.equal(capability.networkCollectionReady, false);
  assert.equal(capability.dryRunExecutionAuthorized, false);
  assert.equal(capability.evidencePersistenceAuthorized, false);
  assert.equal(capability.persistenceAllowed, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.batchEnabled, false);
  assert.equal(capability.autonomousWorkerEnabled, false);
  assert.equal(capability.retryLoopEnabled, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.automaticTransition, false);
  assert.equal(capability.schemaMutationRequired, false);
  assert.equal(capability.preparationRouteImplemented, false);
  assert.equal(capability.gateEnablementImplemented, false);
  assert.equal(capability.dryRunInvocationImplemented, false);
});

test("valid reviewed candidate produces exactly one bounded pilot package", () => {
  const result = prepare();
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("package_should_succeed");
  const packageValue = result.package;
  assert.equal(packageValue.sourcePlan.budget.maxCompetitors, 1);
  assert.equal(packageValue.sourcePlan.budget.maxUrlsPerCompetitor, 1);
  assert.equal(packageValue.sourcePlan.budget.maxTotalTargets, 1);
  assert.equal(packageValue.sourcePlan.selected.length, 1);
  assert.equal(packageValue.sourcePlan.rejected.length, 0);
  assert.equal(packageValue.target.domain, "rivalshop.com");
  assert.equal(packageValue.target.url, "https://rivalshop.com/collections/fragrance");
  assert.equal(packageValue.target.allowedPathPrefix, "/collections/fragrance");
  assert.equal(packageValue.reviewDecision, "approved");
  assert.match(packageValue.packageFingerprint, /^[0-9a-f]{64}$/);
  assert.match(packageValue.packageId, /^cpp-[0-9a-f]{24}$/);
});

test("same immutable inputs produce the same package identity", () => {
  const first = prepare();
  const second = prepare();
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) throw new Error("deterministic_fixture_failed");
  assert.equal(first.package.packageFingerprint, second.package.packageFingerprint);
  assert.equal(first.package.packageId, second.package.packageId);
  assert.equal(first.package.lineage.pilotFingerprint, second.package.lineage.pilotFingerprint);
  assert.equal(first.package.lineage.task64JobId, second.package.lineage.task64JobId);
});

test("different reviewed target changes package, pilot, and job identity", () => {
  const first = prepare();
  const second = prepare({ candidate: candidate("https://other-rival.com/collections/fragrance") });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) throw new Error("different_target_fixture_failed");
  assert.notEqual(first.package.packageFingerprint, second.package.packageFingerprint);
  assert.notEqual(first.package.lineage.pilotFingerprint, second.package.lineage.pilotFingerprint);
  assert.notEqual(first.package.lineage.task64JobId, second.package.lineage.task64JobId);
});

test("dry-run and gate-enable authorizations are exact and distinct", () => {
  const packageValue = validPackage();
  assert.equal(
    packageValue.authorizations.dryRun,
    `AUTHORIZE_ONE_TARGET_COMPETITOR_DRY_RUN:${packageValue.lineage.pilotId}:${packageValue.lineage.pilotFingerprint}`,
  );
  assert.equal(
    packageValue.authorizations.task64GateEnable,
    `AUTHORIZE_TASK64_PILOT_GATE_ENABLE:${packageValue.lineage.pilotId}:${packageValue.lineage.pilotFingerprint}`,
  );
  assert.equal(packageValue.authorizations.task64GateEnable, expectedTask64PilotGateEnableAuthorization(packageValue.pilotPlan));
  assert.notEqual(packageValue.authorizations.dryRun, packageValue.authorizations.task64GateEnable);
});

test("pure preparation job identity matches Task #64 current implementation", () => {
  const packageValue = validPackage();
  const pure = deterministicCompetitorPilotExecutionJobId(packageValue.lineage.pilotId, packageValue.lineage.pilotFingerprint);
  const task64 = task64DeterministicJobId(packageValue.lineage.pilotId, packageValue.lineage.pilotFingerprint);
  assert.equal(pure, task64);
  assert.equal(packageValue.lineage.task64JobId, task64);
});

test("pending or rejected review fails closed before package creation", () => {
  const pending = prepare({ reviewDecision: "pending" });
  const rejected = prepare({ reviewDecision: "rejected" });
  assert.deepEqual(pending, { ok: false, reason: "candidate_review_not_approved", detail: "pending" });
  assert.deepEqual(rejected, { ok: false, reason: "candidate_review_not_approved", detail: "rejected" });
});

test("owned-domain candidate is rejected by Task #60 validation", () => {
  const result = prepare({ candidate: candidate("https://diamondshelf.us/collections/fragrance") });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("owned_domain_should_fail");
  assert.equal(result.reason, "candidate_rejected");
  assert.equal(result.detail, "own_domain");
});

test("special-use candidate is rejected without network activity", () => {
  const result = prepare({ candidate: candidate("https://competitor.example/collections/fragrance") });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("special_use_should_fail");
  assert.equal(result.reason, "candidate_rejected");
  assert.equal(result.detail, "special_use_host");
});

test("transport downgrade fails closed during Task #63 plan creation", () => {
  const downgraded = { ...secureCompetitorTransportCapability(), dnsRebindingMitigated: false };
  const result = prepare({ transportCapability: downgraded });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("transport_downgrade_should_fail");
  assert.equal(result.reason, "pilot_plan_rejected");
  assert.equal(result.detail, "invalid_transport_capability");
});

test("pilot TTL outside the Task #63 maximum fails closed", () => {
  const result = prepare({ pilotTtlMinutes: 61 });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("invalid_ttl_should_fail");
  assert.equal(result.reason, "pilot_plan_rejected");
  assert.equal(result.detail, "invalid_pilot_ttl");
});

test("valid package preflight is authorization-ready but still not authorized to execute", () => {
  const packageValue = validPackage();
  const preflight = preflightOneTargetPilotPackage(packageValue, {
    transportCapability: secureCompetitorTransportCapability(),
    now: LATER,
  });
  assert.equal(preflight.ok, true);
  assert.equal(preflight.lifecycle, "authorization_ready");
  assert.equal(preflight.eligibleForGateEnableAuthorization, true);
  assert.equal(preflight.eligibleForDryRunAuthorization, true);
  assert.equal(preflight.gateEnableAuthorization, packageValue.authorizations.task64GateEnable);
  assert.equal(preflight.dryRunAuthorization, packageValue.authorizations.dryRun);
  assert.equal(preflight.safety.gateMutationAuthorized, false);
  assert.equal(preflight.safety.networkCollectionAuthorized, false);
  assert.equal(preflight.safety.networkCollectionReady, false);
  assert.equal(preflight.safety.dryRunExecutionAuthorized, false);
  assert.ok(preflight.blockers.includes("task64_gate_enablement_not_authorized"));
  assert.ok(preflight.blockers.includes("exact_live_dry_run_authorization_not_consumed"));
});

test("package fingerprint detects top-level target tampering", () => {
  const packageValue = structuredClone(validPackage());
  packageValue.target.url = "https://rivalshop.com/collections/changed";
  const preflight = preflightOneTargetPilotPackage(packageValue, {
    transportCapability: secureCompetitorTransportCapability(),
    now: LATER,
  });
  assert.equal(preflight.ok, false);
  assert.equal(preflight.lifecycle, "rejected");
  assert.ok(preflight.blockers.includes("package_fingerprint_mismatch"));
});

test("nested source-plan tampering is detected even when package fingerprint fields are untouched", () => {
  const packageValue = structuredClone(validPackage());
  packageValue.sourcePlan.selected[0]!.domain = "tampered-rival.com";
  const preflight = preflightOneTargetPilotPackage(packageValue, {
    transportCapability: secureCompetitorTransportCapability(),
    now: LATER,
  });
  assert.equal(preflight.ok, false);
  assert.equal(preflight.lifecycle, "rejected");
  assert.ok(preflight.blockers.includes("source_lineage_mismatch"));
});

test("safety-marker tampering fails closed", () => {
  const packageValue = structuredClone(validPackage());
  (packageValue.safety as { gateMutationAuthorized: boolean }).gateMutationAuthorized = true;
  const preflight = preflightOneTargetPilotPackage(packageValue, {
    transportCapability: secureCompetitorTransportCapability(),
    now: LATER,
  });
  assert.equal(preflight.ok, false);
  assert.ok(preflight.blockers.includes("package_safety_or_review_mismatch"));
});

test("expired package is no longer eligible for either future authorization", () => {
  const packageValue = validPackage();
  const preflight = preflightOneTargetPilotPackage(packageValue, {
    transportCapability: secureCompetitorTransportCapability(),
    now: EXPIRED,
  });
  assert.equal(preflight.ok, false);
  assert.equal(preflight.lifecycle, "expired");
  assert.equal(preflight.eligibleForGateEnableAuthorization, false);
  assert.equal(preflight.eligibleForDryRunAuthorization, false);
  assert.equal(preflight.gateEnableAuthorization, null);
  assert.equal(preflight.dryRunAuthorization, null);
});
