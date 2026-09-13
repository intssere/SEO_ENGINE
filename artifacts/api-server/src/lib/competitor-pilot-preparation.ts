import { createHash } from "node:crypto";
import {
  planCompetitorCollection,
  type CompetitorCandidateInput,
  type CompetitorCollectionPlan,
} from "./competitor-discovery-planning.js";
import {
  createTargetRegistrationProposal,
  fingerprintCompetitorCollectionPlan,
  type TargetRegistrationProposal,
} from "./competitor-target-registration.js";
import {
  createOneTargetPilotReadinessPlan,
  expectedOneTargetDryRunAuthorization,
  preflightOneTargetPilotReadiness,
  type OneTargetPilotPlan,
  type SecureTransportCapabilitySnapshot,
} from "./competitor-pilot-readiness.js";
import { deterministicCompetitorPilotExecutionJobId } from "./competitor-pilot-execution-identity.js";

export const COMPETITOR_PILOT_PREPARATION_VERSION = "task65-one-target-pilot-preparation-v1" as const;
export const TASK64_PILOT_GATE_ENABLE_AUTHORIZATION_PREFIX = "AUTHORIZE_TASK64_PILOT_GATE_ENABLE" as const;
export const DEFAULT_PREPARATION_REGISTRATION_TTL_MINUTES = 60;
export const DEFAULT_PREPARATION_PILOT_TTL_MINUTES = 30;

const HEX_64_PATTERN = /^[0-9a-f]{64}$/;
const PILOT_ID_PATTERN = /^cpr-[0-9a-f]{24}$/;
const JOB_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

type ReviewDecision = "pending" | "approved" | "rejected";

export type CompetitorPilotPreparationSafety = {
  preparationOnly: true;
  manualReviewRequired: true;
  targetRegistrationAuthorized: false;
  targetConfigurationMutationAuthorized: false;
  gateMutationAuthorized: false;
  networkCollectionAuthorized: false;
  networkCollectionReady: false;
  dryRunExecutionAuthorized: false;
  evidencePersistenceAuthorized: false;
  schedulerEnabled: false;
  batchEnabled: false;
  autonomousWorkerEnabled: false;
  retryLoopEnabled: false;
  publicSiteWrites: false;
  providerWrites: false;
  automaticTransition: false;
  schemaMutationRequired: false;
};

export type OneTargetPilotPreparationPackage = {
  version: typeof COMPETITOR_PILOT_PREPARATION_VERSION;
  packageId: string;
  packageFingerprint: string;
  preparedAt: string;
  expiresAt: string;
  reviewDecision: "approved";
  ownDomain: string;
  sourcePlan: CompetitorCollectionPlan;
  sourceProposal: TargetRegistrationProposal;
  pilotPlan: OneTargetPilotPlan;
  target: {
    id: string;
    domain: string;
    url: string;
    allowedPathPrefix: string;
  };
  lineage: {
    candidateFingerprint: string;
    sourcePlanFingerprint: string;
    registrationProposalId: string;
    registrationFingerprint: string;
    pilotId: string;
    pilotFingerprint: string;
    task64JobId: string;
  };
  authorizations: {
    task64GateEnable: string;
    dryRun: string;
  };
  safety: CompetitorPilotPreparationSafety;
};

export type CompetitorPilotPreparationFailureReason =
  | "invalid_timestamp"
  | "candidate_review_not_approved"
  | "candidate_rejected"
  | "candidate_not_unique"
  | "registration_proposal_rejected"
  | "pilot_plan_rejected"
  | "pilot_preflight_rejected";

export type CompetitorPilotPreparationResult =
  | { ok: true; package: OneTargetPilotPreparationPackage }
  | { ok: false; reason: CompetitorPilotPreparationFailureReason; detail?: string };

export type CompetitorPilotPreparationPreflight = {
  ok: boolean;
  lifecycle: "authorization_ready" | "expired" | "rejected";
  packageId: string;
  packageFingerprint: string;
  pilotId: string;
  pilotFingerprint: string;
  task64JobId: string;
  targetUrl: string;
  gateEnableAuthorization: string | null;
  dryRunAuthorization: string | null;
  eligibleForGateEnableAuthorization: boolean;
  eligibleForDryRunAuthorization: boolean;
  checkedAt: string;
  expiresAt: string;
  blockers: string[];
  safety: CompetitorPilotPreparationSafety;
};

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function canonicalTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function safety(): CompetitorPilotPreparationSafety {
  return {
    preparationOnly: true,
    manualReviewRequired: true,
    targetRegistrationAuthorized: false,
    targetConfigurationMutationAuthorized: false,
    gateMutationAuthorized: false,
    networkCollectionAuthorized: false,
    networkCollectionReady: false,
    dryRunExecutionAuthorized: false,
    evidencePersistenceAuthorized: false,
    schedulerEnabled: false,
    batchEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    publicSiteWrites: false,
    providerWrites: false,
    automaticTransition: false,
    schemaMutationRequired: false,
  };
}

function safetyIsFixed(value: CompetitorPilotPreparationSafety): boolean {
  return value?.preparationOnly === true
    && value.manualReviewRequired === true
    && value.targetRegistrationAuthorized === false
    && value.targetConfigurationMutationAuthorized === false
    && value.gateMutationAuthorized === false
    && value.networkCollectionAuthorized === false
    && value.networkCollectionReady === false
    && value.dryRunExecutionAuthorized === false
    && value.evidencePersistenceAuthorized === false
    && value.schedulerEnabled === false
    && value.batchEnabled === false
    && value.autonomousWorkerEnabled === false
    && value.retryLoopEnabled === false
    && value.publicSiteWrites === false
    && value.providerWrites === false
    && value.automaticTransition === false
    && value.schemaMutationRequired === false;
}

function canonicalTarget(packageValue: OneTargetPilotPreparationPackage) {
  return {
    id: packageValue.target.id,
    domain: packageValue.target.domain,
    url: packageValue.target.url,
    allowedPathPrefix: packageValue.target.allowedPathPrefix,
  };
}

function packageFingerprintCore(input: {
  preparedAt: string;
  expiresAt: string;
  ownDomain: string;
  candidateFingerprint: string;
  sourcePlanFingerprint: string;
  registrationProposalId: string;
  registrationFingerprint: string;
  pilotId: string;
  pilotFingerprint: string;
  task64JobId: string;
  target: { id: string; domain: string; url: string; allowedPathPrefix: string };
  task64GateEnableAuthorization: string;
  dryRunAuthorization: string;
}) {
  return {
    version: COMPETITOR_PILOT_PREPARATION_VERSION,
    preparedAt: input.preparedAt,
    expiresAt: input.expiresAt,
    ownDomain: input.ownDomain,
    lineage: {
      candidateFingerprint: input.candidateFingerprint,
      sourcePlanFingerprint: input.sourcePlanFingerprint,
      registrationProposalId: input.registrationProposalId,
      registrationFingerprint: input.registrationFingerprint,
      pilotId: input.pilotId,
      pilotFingerprint: input.pilotFingerprint,
      task64JobId: input.task64JobId,
    },
    target: input.target,
    authorizations: {
      task64GateEnable: input.task64GateEnableAuthorization,
      dryRun: input.dryRunAuthorization,
    },
  };
}

function buildPackageFingerprint(packageValue: Omit<OneTargetPilotPreparationPackage, "packageId" | "packageFingerprint" | "safety">): string {
  return stableHash(packageFingerprintCore({
    preparedAt: packageValue.preparedAt,
    expiresAt: packageValue.expiresAt,
    ownDomain: packageValue.ownDomain,
    candidateFingerprint: packageValue.lineage.candidateFingerprint,
    sourcePlanFingerprint: packageValue.lineage.sourcePlanFingerprint,
    registrationProposalId: packageValue.lineage.registrationProposalId,
    registrationFingerprint: packageValue.lineage.registrationFingerprint,
    pilotId: packageValue.lineage.pilotId,
    pilotFingerprint: packageValue.lineage.pilotFingerprint,
    task64JobId: packageValue.lineage.task64JobId,
    target: packageValue.target,
    task64GateEnableAuthorization: packageValue.authorizations.task64GateEnable,
    dryRunAuthorization: packageValue.authorizations.dryRun,
  }));
}

export function expectedTask64PilotGateEnableAuthorization(plan: OneTargetPilotPlan): string {
  return `${TASK64_PILOT_GATE_ENABLE_AUTHORIZATION_PREFIX}:${plan.pilotId}:${plan.pilotFingerprint}`;
}

export function competitorPilotPreparationCapability() {
  return {
    version: COMPETITOR_PILOT_PREPARATION_VERSION,
    ...safety(),
    exactCandidateCount: 1,
    exactTargetCount: 1,
    exactRunCount: 1,
    persistenceAllowed: false,
    preparationRouteImplemented: false,
    executionRouteInvoked: false,
    gateEnablementImplemented: false,
    dryRunInvocationImplemented: false,
  } as const;
}

export function prepareOneTargetPilotPackage(input: {
  ownDomain: string;
  candidate: CompetitorCandidateInput;
  reviewDecision: ReviewDecision;
  transportCapability: SecureTransportCapabilitySnapshot;
  now?: string;
  registrationTtlMinutes?: number;
  pilotTtlMinutes?: number;
}): CompetitorPilotPreparationResult {
  const preparedAt = canonicalTimestamp(input.now ?? new Date().toISOString());
  if (!preparedAt) return { ok: false, reason: "invalid_timestamp" };
  if (input.reviewDecision !== "approved") {
    return { ok: false, reason: "candidate_review_not_approved", detail: input.reviewDecision };
  }

  const sourcePlan = planCompetitorCollection({
    ownDomain: input.ownDomain,
    candidates: [input.candidate],
    now: preparedAt,
    budget: { maxCompetitors: 1, maxUrlsPerCompetitor: 1, maxTotalTargets: 1 },
  });
  if (sourcePlan.rejected.length > 0) {
    return { ok: false, reason: "candidate_rejected", detail: sourcePlan.rejected[0]?.reason };
  }
  if (sourcePlan.selected.length !== 1 || sourcePlan.candidates.length !== 1) {
    return { ok: false, reason: "candidate_not_unique" };
  }

  const proposalResult = createTargetRegistrationProposal({
    plan: sourcePlan,
    selectedRank: 1,
    now: preparedAt,
    registrationTtlMinutes: input.registrationTtlMinutes ?? DEFAULT_PREPARATION_REGISTRATION_TTL_MINUTES,
  });
  if (!proposalResult.ok) {
    return { ok: false, reason: "registration_proposal_rejected", detail: proposalResult.reason };
  }

  const pilotResult = createOneTargetPilotReadinessPlan({
    sourceProposal: proposalResult.proposal,
    registrationReviewDecision: "approved",
    transportCapability: input.transportCapability,
    now: preparedAt,
    pilotTtlMinutes: input.pilotTtlMinutes ?? DEFAULT_PREPARATION_PILOT_TTL_MINUTES,
  });
  if (!pilotResult.ok) {
    return { ok: false, reason: "pilot_plan_rejected", detail: pilotResult.reason };
  }

  const pilotPreflight = preflightOneTargetPilotReadiness(pilotResult.plan, {
    sourceProposal: proposalResult.proposal,
    registrationReviewDecision: "approved",
    transportCapability: input.transportCapability,
    now: preparedAt,
  });
  if (!pilotPreflight.ok || pilotPreflight.lifecycle !== "authorization_ready" || !pilotPreflight.expectedAuthorization) {
    return { ok: false, reason: "pilot_preflight_rejected", detail: pilotPreflight.blockers.join(",") };
  }

  const sourcePlanFingerprint = fingerprintCompetitorCollectionPlan(sourcePlan);
  const task64JobId = deterministicCompetitorPilotExecutionJobId(pilotResult.plan.pilotId, pilotResult.plan.pilotFingerprint);
  const task64GateEnable = expectedTask64PilotGateEnableAuthorization(pilotResult.plan);
  const dryRun = expectedOneTargetDryRunAuthorization(pilotResult.plan);
  const partial = {
    version: COMPETITOR_PILOT_PREPARATION_VERSION,
    preparedAt,
    expiresAt: pilotResult.plan.expiresAt,
    reviewDecision: "approved" as const,
    ownDomain: sourcePlan.ownDomain,
    sourcePlan,
    sourceProposal: proposalResult.proposal,
    pilotPlan: pilotResult.plan,
    target: {
      id: pilotResult.plan.target.id,
      domain: pilotResult.plan.domain,
      url: pilotResult.plan.target.url,
      allowedPathPrefix: pilotResult.plan.target.allowedPathPrefix,
    },
    lineage: {
      candidateFingerprint: pilotResult.plan.candidateFingerprint,
      sourcePlanFingerprint,
      registrationProposalId: proposalResult.proposal.proposalId,
      registrationFingerprint: proposalResult.proposal.registrationFingerprint,
      pilotId: pilotResult.plan.pilotId,
      pilotFingerprint: pilotResult.plan.pilotFingerprint,
      task64JobId,
    },
    authorizations: { task64GateEnable, dryRun },
  };
  const packageFingerprint = buildPackageFingerprint(partial);

  return {
    ok: true,
    package: {
      ...partial,
      packageId: `cpp-${packageFingerprint.slice(0, 24)}`,
      packageFingerprint,
      safety: safety(),
    },
  };
}

export function preflightOneTargetPilotPackage(
  packageValue: OneTargetPilotPreparationPackage,
  input: { transportCapability: SecureTransportCapabilitySnapshot; now?: string },
): CompetitorPilotPreparationPreflight {
  const checkedAt = canonicalTimestamp(input.now ?? new Date().toISOString()) ?? new Date(0).toISOString();
  const fixedSafety = safety();
  const closedBlockers = [
    "task64_gate_enablement_not_authorized",
    "exact_live_dry_run_authorization_not_consumed",
    "network_collection_not_authorized",
    "evidence_persistence_not_authorized",
    "target_configuration_unchanged",
  ];
  const rejected = (extra: string[], lifecycle: "expired" | "rejected" = "rejected"): CompetitorPilotPreparationPreflight => ({
    ok: false,
    lifecycle,
    packageId: packageValue?.packageId ?? "invalid",
    packageFingerprint: packageValue?.packageFingerprint ?? "invalid",
    pilotId: packageValue?.lineage?.pilotId ?? "invalid",
    pilotFingerprint: packageValue?.lineage?.pilotFingerprint ?? "invalid",
    task64JobId: packageValue?.lineage?.task64JobId ?? "invalid",
    targetUrl: packageValue?.target?.url ?? "",
    gateEnableAuthorization: null,
    dryRunAuthorization: null,
    eligibleForGateEnableAuthorization: false,
    eligibleForDryRunAuthorization: false,
    checkedAt,
    expiresAt: packageValue?.expiresAt ?? checkedAt,
    blockers: [...extra, ...closedBlockers],
    safety: fixedSafety,
  });

  if (!packageValue || typeof packageValue !== "object" || packageValue.version !== COMPETITOR_PILOT_PREPARATION_VERSION) {
    return rejected(["invalid_package"]);
  }
  if (!HEX_64_PATTERN.test(packageValue.packageFingerprint)
    || !HEX_64_PATTERN.test(packageValue.lineage?.candidateFingerprint ?? "")
    || !HEX_64_PATTERN.test(packageValue.lineage?.sourcePlanFingerprint ?? "")
    || !HEX_64_PATTERN.test(packageValue.lineage?.registrationFingerprint ?? "")
    || !HEX_64_PATTERN.test(packageValue.lineage?.pilotFingerprint ?? "")
    || !PILOT_ID_PATTERN.test(packageValue.lineage?.pilotId ?? "")
    || !JOB_ID_PATTERN.test(packageValue.lineage?.task64JobId ?? "")) {
    return rejected(["invalid_package_identity"]);
  }
  if (!safetyIsFixed(packageValue.safety) || packageValue.reviewDecision !== "approved") {
    return rejected(["package_safety_or_review_mismatch"]);
  }

  const expectedPackageFingerprint = buildPackageFingerprint({
    version: packageValue.version,
    preparedAt: packageValue.preparedAt,
    expiresAt: packageValue.expiresAt,
    reviewDecision: packageValue.reviewDecision,
    ownDomain: packageValue.ownDomain,
    sourcePlan: packageValue.sourcePlan,
    sourceProposal: packageValue.sourceProposal,
    pilotPlan: packageValue.pilotPlan,
    target: canonicalTarget(packageValue),
    lineage: packageValue.lineage,
    authorizations: packageValue.authorizations,
  });
  if (expectedPackageFingerprint !== packageValue.packageFingerprint
    || packageValue.packageId !== `cpp-${expectedPackageFingerprint.slice(0, 24)}`) {
    return rejected(["package_fingerprint_mismatch"]);
  }

  if (packageValue.sourcePlan.budget.maxCompetitors !== 1
    || packageValue.sourcePlan.budget.maxUrlsPerCompetitor !== 1
    || packageValue.sourcePlan.budget.maxTotalTargets !== 1
    || packageValue.sourcePlan.selected.length !== 1
    || packageValue.sourcePlan.rejected.length !== 0) {
    return rejected(["source_plan_budget_or_selection_mismatch"]);
  }
  const selected = packageValue.sourcePlan.selected[0]!;
  if (fingerprintCompetitorCollectionPlan(packageValue.sourcePlan) !== packageValue.lineage.sourcePlanFingerprint
    || packageValue.sourceProposal.sourcePlanFingerprint !== packageValue.lineage.sourcePlanFingerprint
    || selected.candidateFingerprint !== packageValue.lineage.candidateFingerprint
    || packageValue.sourceProposal.candidateFingerprint !== packageValue.lineage.candidateFingerprint
    || selected.domain !== packageValue.target.domain
    || packageValue.sourceProposal.domain !== packageValue.target.domain
    || selected.target.id !== packageValue.target.id
    || selected.target.url !== packageValue.target.url
    || selected.target.allowedPathPrefix !== packageValue.target.allowedPathPrefix) {
    return rejected(["source_lineage_mismatch"]);
  }

  const pilotPreflight = preflightOneTargetPilotReadiness(packageValue.pilotPlan, {
    sourceProposal: packageValue.sourceProposal,
    registrationReviewDecision: "approved",
    transportCapability: input.transportCapability,
    now: checkedAt,
  });
  if (!pilotPreflight.ok) {
    return rejected(
      [pilotPreflight.lifecycle === "expired" ? "pilot_package_expired" : "pilot_preflight_rejected", ...pilotPreflight.blockers],
      pilotPreflight.lifecycle === "expired" ? "expired" : "rejected",
    );
  }

  const expectedDryRun = expectedOneTargetDryRunAuthorization(packageValue.pilotPlan);
  const expectedGateEnable = expectedTask64PilotGateEnableAuthorization(packageValue.pilotPlan);
  const expectedJobId = deterministicCompetitorPilotExecutionJobId(packageValue.pilotPlan.pilotId, packageValue.pilotPlan.pilotFingerprint);
  if (packageValue.lineage.pilotId !== packageValue.pilotPlan.pilotId
    || packageValue.lineage.pilotFingerprint !== packageValue.pilotPlan.pilotFingerprint
    || packageValue.lineage.task64JobId !== expectedJobId
    || packageValue.authorizations.dryRun !== expectedDryRun
    || packageValue.authorizations.task64GateEnable !== expectedGateEnable
    || packageValue.expiresAt !== packageValue.pilotPlan.expiresAt) {
    return rejected(["pilot_authorization_or_job_identity_mismatch"]);
  }

  return {
    ok: true,
    lifecycle: "authorization_ready",
    packageId: packageValue.packageId,
    packageFingerprint: packageValue.packageFingerprint,
    pilotId: packageValue.lineage.pilotId,
    pilotFingerprint: packageValue.lineage.pilotFingerprint,
    task64JobId: packageValue.lineage.task64JobId,
    targetUrl: packageValue.target.url,
    gateEnableAuthorization: packageValue.authorizations.task64GateEnable,
    dryRunAuthorization: packageValue.authorizations.dryRun,
    eligibleForGateEnableAuthorization: true,
    eligibleForDryRunAuthorization: true,
    checkedAt,
    expiresAt: packageValue.expiresAt,
    blockers: closedBlockers,
    safety: fixedSafety,
  };
}
