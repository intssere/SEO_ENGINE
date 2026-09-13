import { createHash } from "node:crypto";
import type { CompetitorCollectionTarget } from "./competitor-acquisition.js";
import {
  COMPETITOR_TARGET_REGISTRATION_VERSION,
  preflightTargetRegistration,
  type TargetRegistrationProposal,
} from "./competitor-target-registration.js";

export const COMPETITOR_PILOT_READINESS_VERSION = "task63-one-target-pilot-readiness-v1" as const;
export const REQUIRED_SECURE_TRANSPORT_VERSION = "task62-secure-competitor-transport-v1" as const;
export const DEFAULT_PILOT_TTL_MINUTES = 30;
export const MAX_PILOT_TTL_MINUTES = 60;

const HEX_64_PATTERN = /^[0-9a-f]{64}$/;

type RegistrationReviewDecision = "pending" | "approved" | "rejected";
type PilotReadinessLifecycle = "proposed" | "authorization_ready" | "expired" | "rejected";

export type SecureTransportCapabilitySnapshot = {
  version: string;
  controlledResolution: boolean;
  allResolvedAddressesMustBePublic: boolean;
  connectionAddressPinned: boolean;
  connectionTimeDnsResolution: boolean;
  dnsRebindingMitigated: boolean;
  tlsCertificateVerification: boolean;
  tlsHostnameVerification: boolean;
  sniUsesOriginalHostname: boolean;
  ambientProxyRouting: boolean;
  freshPinRequiredPerRequest: boolean;
  callerRevalidatesRedirectHops: boolean;
  networkCollectionReady: boolean;
  collectionAuthorized: boolean;
  persistenceAuthorized: boolean;
  schedulerEnabled: boolean;
  autonomousWorkerEnabled: boolean;
  publicSiteWrites: boolean;
  executionAuthorized: boolean;
};

export type PilotReadinessSafety = {
  advisoryOnly: true;
  dryRunOnly: true;
  targetRegistrationAuthorized: false;
  targetConfigurationMutationAuthorized: false;
  networkCollectionAuthorized: false;
  networkCollectionReady: false;
  evidencePersistenceAuthorized: false;
  schedulerEnabled: false;
  autonomousWorkerEnabled: false;
  publicSiteWrites: false;
  executionAuthorized: false;
};

export type OneTargetPilotBudget = {
  maxTargets: 1;
  maxRuns: 1;
  persistEvidence: false;
};

export type OneTargetPilotPlan = {
  version: typeof COMPETITOR_PILOT_READINESS_VERSION;
  pilotId: string;
  pilotFingerprint: string;
  sourceRegistrationVersion: typeof COMPETITOR_TARGET_REGISTRATION_VERSION;
  sourceRegistrationProposalId: string;
  sourceRegistrationFingerprint: string;
  sourcePlanFingerprint: string;
  candidateFingerprint: string;
  domain: string;
  target: CompetitorCollectionTarget;
  createdAt: string;
  expiresAt: string;
  budget: OneTargetPilotBudget;
  transport: {
    requiredVersion: typeof REQUIRED_SECURE_TRANSPORT_VERSION;
    capabilityFingerprint: string;
  };
  lifecycle: "proposed";
  safety: PilotReadinessSafety;
};

export type PilotReadinessRejectionReason =
  | "invalid_timestamp"
  | "invalid_pilot_ttl"
  | "invalid_source_registration"
  | "unsafe_source_registration"
  | "source_registration_review_required"
  | "source_registration_rejected"
  | "source_registration_expired"
  | "invalid_transport_capability";

export type OneTargetPilotPlanResult =
  | { ok: true; plan: OneTargetPilotPlan }
  | { ok: false; reason: PilotReadinessRejectionReason };

export type OneTargetPilotReadinessPreflight = {
  ok: boolean;
  lifecycle: Exclude<PilotReadinessLifecycle, "proposed">;
  pilotId: string;
  pilotFingerprint: string;
  expectedAuthorization: string | null;
  eligibleForDryRunAuthorization: boolean;
  networkCollectionAuthorized: false;
  networkCollectionReady: false;
  evidencePersistenceAuthorized: false;
  blockers: string[];
  checkedAt: string;
  expiresAt: string;
  safety: PilotReadinessSafety;
};

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function canonicalTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function normalizedStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.normalize("NFKC").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function canonicalTarget(target: CompetitorCollectionTarget) {
  return {
    id: target.id,
    url: target.url,
    source: target.source,
    allowedPathPrefix: target.allowedPathPrefix,
    confidence: target.confidence,
    pageType: target.pageType ?? null,
    keywordThemes: normalizedStringList(target.keywordThemes),
    taxonomyLabels: normalizedStringList(target.taxonomyLabels),
    entityTypes: normalizedStringList(target.entityTypes),
    internalLinkPatterns: normalizedStringList(target.internalLinkPatterns),
  };
}

function safety(): PilotReadinessSafety {
  return {
    advisoryOnly: true,
    dryRunOnly: true,
    targetRegistrationAuthorized: false,
    targetConfigurationMutationAuthorized: false,
    networkCollectionAuthorized: false,
    networkCollectionReady: false,
    evidencePersistenceAuthorized: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    publicSiteWrites: false,
    executionAuthorized: false,
  };
}

function budget(): OneTargetPilotBudget {
  return { maxTargets: 1, maxRuns: 1, persistEvidence: false };
}

function sourceRegistrationSafetyIsRestrictive(proposal: TargetRegistrationProposal): boolean {
  const source = proposal.safety;
  return proposal.version === COMPETITOR_TARGET_REGISTRATION_VERSION
    && source?.advisoryOnly === true
    && source.targetRegistrationAuthorized === false
    && source.targetConfigurationMutationAuthorized === false
    && source.networkCollectionAuthorized === false
    && source.networkCollectionReady === false
    && source.evidencePersistenceAuthorized === false
    && source.schedulerEnabled === false
    && source.autonomousWorkerEnabled === false
    && source.publicSiteWrites === false
    && source.executionAuthorized === false;
}

function canonicalTransportCapability(capability: SecureTransportCapabilitySnapshot) {
  return {
    version: capability.version,
    controlledResolution: capability.controlledResolution,
    allResolvedAddressesMustBePublic: capability.allResolvedAddressesMustBePublic,
    connectionAddressPinned: capability.connectionAddressPinned,
    connectionTimeDnsResolution: capability.connectionTimeDnsResolution,
    dnsRebindingMitigated: capability.dnsRebindingMitigated,
    tlsCertificateVerification: capability.tlsCertificateVerification,
    tlsHostnameVerification: capability.tlsHostnameVerification,
    sniUsesOriginalHostname: capability.sniUsesOriginalHostname,
    ambientProxyRouting: capability.ambientProxyRouting,
    freshPinRequiredPerRequest: capability.freshPinRequiredPerRequest,
    callerRevalidatesRedirectHops: capability.callerRevalidatesRedirectHops,
    networkCollectionReady: capability.networkCollectionReady,
    collectionAuthorized: capability.collectionAuthorized,
    persistenceAuthorized: capability.persistenceAuthorized,
    schedulerEnabled: capability.schedulerEnabled,
    autonomousWorkerEnabled: capability.autonomousWorkerEnabled,
    publicSiteWrites: capability.publicSiteWrites,
    executionAuthorized: capability.executionAuthorized,
  };
}

export function secureTransportCapabilityMeetsPilotRequirements(capability: SecureTransportCapabilitySnapshot): boolean {
  return Boolean(capability)
    && capability.version === REQUIRED_SECURE_TRANSPORT_VERSION
    && capability.controlledResolution === true
    && capability.allResolvedAddressesMustBePublic === true
    && capability.connectionAddressPinned === true
    && capability.connectionTimeDnsResolution === false
    && capability.dnsRebindingMitigated === true
    && capability.tlsCertificateVerification === true
    && capability.tlsHostnameVerification === true
    && capability.sniUsesOriginalHostname === true
    && capability.ambientProxyRouting === false
    && capability.freshPinRequiredPerRequest === true
    && capability.callerRevalidatesRedirectHops === true
    && capability.networkCollectionReady === false
    && capability.collectionAuthorized === false
    && capability.persistenceAuthorized === false
    && capability.schedulerEnabled === false
    && capability.autonomousWorkerEnabled === false
    && capability.publicSiteWrites === false
    && capability.executionAuthorized === false;
}

export function fingerprintSecureTransportCapability(capability: SecureTransportCapabilitySnapshot): string {
  return stableHash(canonicalTransportCapability(capability));
}

function pilotFingerprintCore(input: {
  sourceRegistrationVersion: typeof COMPETITOR_TARGET_REGISTRATION_VERSION;
  sourceRegistrationProposalId: string;
  sourceRegistrationFingerprint: string;
  sourcePlanFingerprint: string;
  candidateFingerprint: string;
  domain: string;
  target: CompetitorCollectionTarget;
  createdAt: string;
  expiresAt: string;
  budget: OneTargetPilotBudget;
  requiredTransportVersion: typeof REQUIRED_SECURE_TRANSPORT_VERSION;
  transportCapabilityFingerprint: string;
}) {
  return {
    version: COMPETITOR_PILOT_READINESS_VERSION,
    sourceRegistrationVersion: input.sourceRegistrationVersion,
    sourceRegistrationProposalId: input.sourceRegistrationProposalId,
    sourceRegistrationFingerprint: input.sourceRegistrationFingerprint,
    sourcePlanFingerprint: input.sourcePlanFingerprint,
    candidateFingerprint: input.candidateFingerprint,
    domain: input.domain,
    target: canonicalTarget(input.target),
    createdAt: input.createdAt,
    expiresAt: input.expiresAt,
    budget: input.budget,
    transport: {
      requiredVersion: input.requiredTransportVersion,
      capabilityFingerprint: input.transportCapabilityFingerprint,
    },
  };
}

function pilotPlanFingerprintMatches(plan: OneTargetPilotPlan): boolean {
  if (!plan || typeof plan !== "object") return false;
  if (plan.version !== COMPETITOR_PILOT_READINESS_VERSION) return false;
  if (plan.sourceRegistrationVersion !== COMPETITOR_TARGET_REGISTRATION_VERSION) return false;
  if (!HEX_64_PATTERN.test(plan.pilotFingerprint)
    || !HEX_64_PATTERN.test(plan.sourceRegistrationFingerprint)
    || !HEX_64_PATTERN.test(plan.sourcePlanFingerprint)
    || !HEX_64_PATTERN.test(plan.candidateFingerprint)
    || !HEX_64_PATTERN.test(plan.transport?.capabilityFingerprint ?? "")) return false;
  const expected = stableHash(pilotFingerprintCore({
    sourceRegistrationVersion: plan.sourceRegistrationVersion,
    sourceRegistrationProposalId: plan.sourceRegistrationProposalId,
    sourceRegistrationFingerprint: plan.sourceRegistrationFingerprint,
    sourcePlanFingerprint: plan.sourcePlanFingerprint,
    candidateFingerprint: plan.candidateFingerprint,
    domain: plan.domain,
    target: plan.target,
    createdAt: plan.createdAt,
    expiresAt: plan.expiresAt,
    budget: plan.budget,
    requiredTransportVersion: plan.transport.requiredVersion,
    transportCapabilityFingerprint: plan.transport.capabilityFingerprint,
  }));
  return expected === plan.pilotFingerprint && plan.pilotId === `cpr-${expected.slice(0, 24)}`;
}

function budgetIsFixed(value: OneTargetPilotBudget): boolean {
  return value?.maxTargets === 1 && value.maxRuns === 1 && value.persistEvidence === false;
}

function safetyIsFixed(value: PilotReadinessSafety): boolean {
  return value?.advisoryOnly === true
    && value.dryRunOnly === true
    && value.targetRegistrationAuthorized === false
    && value.targetConfigurationMutationAuthorized === false
    && value.networkCollectionAuthorized === false
    && value.networkCollectionReady === false
    && value.evidencePersistenceAuthorized === false
    && value.schedulerEnabled === false
    && value.autonomousWorkerEnabled === false
    && value.publicSiteWrites === false
    && value.executionAuthorized === false;
}

function sourceLineageMatches(plan: OneTargetPilotPlan, proposal: TargetRegistrationProposal): boolean {
  return plan.sourceRegistrationVersion === proposal.version
    && plan.sourceRegistrationProposalId === proposal.proposalId
    && plan.sourceRegistrationFingerprint === proposal.registrationFingerprint
    && plan.sourcePlanFingerprint === proposal.sourcePlanFingerprint
    && plan.candidateFingerprint === proposal.candidateFingerprint
    && plan.domain === proposal.domain
    && JSON.stringify(canonicalTarget(plan.target)) === JSON.stringify(canonicalTarget(proposal.target));
}

export function competitorPilotReadinessCapability() {
  return {
    version: COMPETITOR_PILOT_READINESS_VERSION,
    ...safety(),
    maxTargets: 1,
    maxRuns: 1,
    persistenceAllowed: false,
    activeTargetConfigurationMutationImplemented: false,
    liveDryRunExecutionImplemented: false,
    authorizationConsumptionImplemented: false,
    schemaMutationRequired: false,
  } as const;
}

export function createOneTargetPilotReadinessPlan(input: {
  sourceProposal: TargetRegistrationProposal;
  registrationReviewDecision: RegistrationReviewDecision;
  transportCapability: SecureTransportCapabilitySnapshot;
  now?: string;
  pilotTtlMinutes?: number;
}): OneTargetPilotPlanResult {
  const now = canonicalTimestamp(input.now ?? new Date().toISOString());
  if (!now) return { ok: false, reason: "invalid_timestamp" };
  if (!input.sourceProposal || typeof input.sourceProposal !== "object") return { ok: false, reason: "invalid_source_registration" };
  if (!sourceRegistrationSafetyIsRestrictive(input.sourceProposal)) return { ok: false, reason: "unsafe_source_registration" };

  const sourcePreflight = preflightTargetRegistration(input.sourceProposal, {
    now,
    reviewDecision: input.registrationReviewDecision,
  });
  if (sourcePreflight.lifecycle === "expired") return { ok: false, reason: "source_registration_expired" };
  if (input.registrationReviewDecision === "rejected") return { ok: false, reason: "source_registration_rejected" };
  if (input.registrationReviewDecision !== "approved") return { ok: false, reason: "source_registration_review_required" };
  if (!sourcePreflight.ok || sourcePreflight.lifecycle !== "authorization_ready" || !sourcePreflight.eligibleForAuthorization) {
    return { ok: false, reason: "invalid_source_registration" };
  }
  if (!secureTransportCapabilityMeetsPilotRequirements(input.transportCapability)) {
    return { ok: false, reason: "invalid_transport_capability" };
  }

  const ttl = input.pilotTtlMinutes ?? DEFAULT_PILOT_TTL_MINUTES;
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > MAX_PILOT_TTL_MINUTES) {
    return { ok: false, reason: "invalid_pilot_ttl" };
  }
  const sourceExpiresAt = canonicalTimestamp(input.sourceProposal.expiresAt);
  if (!sourceExpiresAt) return { ok: false, reason: "invalid_source_registration" };
  const nowMs = Date.parse(now);
  const sourceExpiresMs = Date.parse(sourceExpiresAt);
  if (nowMs > sourceExpiresMs) return { ok: false, reason: "source_registration_expired" };
  const expiresAt = new Date(Math.min(nowMs + ttl * 60_000, sourceExpiresMs)).toISOString();
  const fixedBudget = budget();
  const transportCapabilityFingerprint = fingerprintSecureTransportCapability(input.transportCapability);
  const core = pilotFingerprintCore({
    sourceRegistrationVersion: COMPETITOR_TARGET_REGISTRATION_VERSION,
    sourceRegistrationProposalId: input.sourceProposal.proposalId,
    sourceRegistrationFingerprint: input.sourceProposal.registrationFingerprint,
    sourcePlanFingerprint: input.sourceProposal.sourcePlanFingerprint,
    candidateFingerprint: input.sourceProposal.candidateFingerprint,
    domain: input.sourceProposal.domain,
    target: input.sourceProposal.target,
    createdAt: now,
    expiresAt,
    budget: fixedBudget,
    requiredTransportVersion: REQUIRED_SECURE_TRANSPORT_VERSION,
    transportCapabilityFingerprint,
  });
  const pilotFingerprint = stableHash(core);

  return {
    ok: true,
    plan: {
      version: COMPETITOR_PILOT_READINESS_VERSION,
      pilotId: `cpr-${pilotFingerprint.slice(0, 24)}`,
      pilotFingerprint,
      sourceRegistrationVersion: COMPETITOR_TARGET_REGISTRATION_VERSION,
      sourceRegistrationProposalId: input.sourceProposal.proposalId,
      sourceRegistrationFingerprint: input.sourceProposal.registrationFingerprint,
      sourcePlanFingerprint: input.sourceProposal.sourcePlanFingerprint,
      candidateFingerprint: input.sourceProposal.candidateFingerprint,
      domain: input.sourceProposal.domain,
      target: input.sourceProposal.target,
      createdAt: now,
      expiresAt,
      budget: fixedBudget,
      transport: {
        requiredVersion: REQUIRED_SECURE_TRANSPORT_VERSION,
        capabilityFingerprint: transportCapabilityFingerprint,
      },
      lifecycle: "proposed",
      safety: safety(),
    },
  };
}

export function expectedOneTargetDryRunAuthorization(plan: OneTargetPilotPlan): string {
  return `AUTHORIZE_ONE_TARGET_COMPETITOR_DRY_RUN:${plan.pilotId}:${plan.pilotFingerprint}`;
}

export function preflightOneTargetPilotReadiness(
  plan: OneTargetPilotPlan,
  input: {
    sourceProposal: TargetRegistrationProposal;
    registrationReviewDecision: RegistrationReviewDecision;
    transportCapability: SecureTransportCapabilitySnapshot;
    now?: string;
  },
): OneTargetPilotReadinessPreflight {
  const checkedAt = canonicalTimestamp(input.now ?? new Date().toISOString()) ?? new Date(0).toISOString();
  const fixedSafety = safety();
  const closedBlockers = [
    "exact_live_dry_run_authorization_not_consumed",
    "task63_does_not_execute_network_collection",
    "evidence_persistence_not_authorized",
    "active_target_configuration_unchanged",
  ];
  const rejected = (extra: string[]): OneTargetPilotReadinessPreflight => ({
    ok: false,
    lifecycle: "rejected",
    pilotId: plan?.pilotId ?? "invalid",
    pilotFingerprint: plan?.pilotFingerprint ?? "invalid",
    expectedAuthorization: null,
    eligibleForDryRunAuthorization: false,
    networkCollectionAuthorized: false,
    networkCollectionReady: false,
    evidencePersistenceAuthorized: false,
    blockers: [...extra, ...closedBlockers],
    checkedAt,
    expiresAt: plan?.expiresAt ?? checkedAt,
    safety: fixedSafety,
  });

  if (!pilotPlanFingerprintMatches(plan)) return rejected(["pilot_fingerprint_mismatch"]);
  if (!budgetIsFixed(plan.budget)) return rejected(["pilot_budget_mismatch"]);
  if (!safetyIsFixed(plan.safety)) return rejected(["pilot_safety_mismatch"]);
  if (!input.sourceProposal || !sourceRegistrationSafetyIsRestrictive(input.sourceProposal)) {
    return rejected(["source_registration_invalid"]);
  }
  const sourcePreflight = preflightTargetRegistration(input.sourceProposal, {
    now: checkedAt,
    reviewDecision: input.registrationReviewDecision,
  });
  if (!sourcePreflight.ok || sourcePreflight.lifecycle !== "authorization_ready" || !sourcePreflight.eligibleForAuthorization) {
    return rejected([sourcePreflight.lifecycle === "expired" ? "source_registration_expired" : "source_registration_not_authorization_ready"]);
  }
  if (!sourceLineageMatches(plan, input.sourceProposal)) return rejected(["source_lineage_mismatch"]);
  if (!secureTransportCapabilityMeetsPilotRequirements(input.transportCapability)) {
    return rejected(["transport_capability_mismatch"]);
  }
  if (fingerprintSecureTransportCapability(input.transportCapability) !== plan.transport.capabilityFingerprint
    || plan.transport.requiredVersion !== REQUIRED_SECURE_TRANSPORT_VERSION) {
    return rejected(["transport_lineage_mismatch"]);
  }

  const checkedMs = Date.parse(checkedAt);
  const expiresMs = Date.parse(plan.expiresAt);
  if (!Number.isFinite(checkedMs) || !Number.isFinite(expiresMs) || checkedMs > expiresMs) {
    return {
      ...rejected(["pilot_plan_expired"]),
      lifecycle: "expired",
      expiresAt: plan.expiresAt,
    };
  }

  return {
    ok: true,
    lifecycle: "authorization_ready",
    pilotId: plan.pilotId,
    pilotFingerprint: plan.pilotFingerprint,
    expectedAuthorization: expectedOneTargetDryRunAuthorization(plan),
    eligibleForDryRunAuthorization: true,
    networkCollectionAuthorized: false,
    networkCollectionReady: false,
    evidencePersistenceAuthorized: false,
    blockers: closedBlockers,
    checkedAt,
    expiresAt: plan.expiresAt,
    safety: fixedSafety,
  };
}
