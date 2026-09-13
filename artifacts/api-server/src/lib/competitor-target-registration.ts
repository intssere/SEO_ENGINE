import { createHash } from "node:crypto";
import { isIP } from "node:net";
import type { CompetitorCollectionTarget } from "./competitor-acquisition.js";
import type { CompetitorCollectionPlan, CompetitorCandidateScore } from "./competitor-discovery-planning.js";

export const COMPETITOR_TARGET_REGISTRATION_VERSION = "task61-controlled-target-registration-preflight-v1" as const;
export const DEFAULT_REGISTRATION_TTL_MINUTES = 60;
export const DEFAULT_SOURCE_PLAN_MAX_AGE_MINUTES = 24 * 60;
export const MAX_REGISTRATION_TTL_MINUTES = 24 * 60;
export const MAX_SOURCE_PLAN_AGE_MINUTES = 7 * 24 * 60;

const SPECIAL_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".home", ".lan", ".test", ".invalid", ".example"];
const TARGET_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const HEX_64_PATTERN = /^[0-9a-f]{64}$/;

type RegistrationLifecycle = "proposed" | "review_ready" | "authorization_ready" | "expired" | "rejected";
type ReviewDecision = "pending" | "approved" | "rejected";

export type RegistrationProposalRejectionReason =
  | "invalid_source_plan"
  | "unsafe_source_plan"
  | "source_plan_from_future"
  | "source_plan_stale"
  | "selected_target_not_found"
  | "invalid_candidate_fingerprint"
  | "invalid_target"
  | "invalid_target_id"
  | "invalid_target_url"
  | "credential_bearing_url"
  | "unsupported_scheme"
  | "unsupported_port"
  | "query_or_fragment_not_allowed"
  | "invalid_domain"
  | "own_domain"
  | "ip_literal_not_supported"
  | "special_use_host"
  | "invalid_path_prefix"
  | "path_prefix_mismatch"
  | "invalid_confidence"
  | "invalid_source"
  | "invalid_page_type"
  | "invalid_timestamp";

export type TargetRegistrationProposal = {
  version: typeof COMPETITOR_TARGET_REGISTRATION_VERSION;
  proposalId: string;
  registrationFingerprint: string;
  sourcePlanFingerprint: string;
  sourcePlanVersion: string;
  sourcePlanGeneratedAt: string;
  candidateFingerprint: string;
  rank: number;
  domain: string;
  score: CompetitorCandidateScore;
  target: CompetitorCollectionTarget;
  proposedAt: string;
  expiresAt: string;
  lifecycle: "proposed";
  safety: RegistrationSafety;
};

export type RegistrationSafety = {
  advisoryOnly: true;
  targetRegistrationAuthorized: false;
  targetConfigurationMutationAuthorized: false;
  networkCollectionAuthorized: false;
  networkCollectionReady: false;
  transportHardeningRequired: true;
  evidencePersistenceAuthorized: false;
  schedulerEnabled: false;
  autonomousWorkerEnabled: false;
  publicSiteWrites: false;
  executionAuthorized: false;
};

export type TargetRegistrationPreflight = {
  ok: boolean;
  lifecycle: RegistrationLifecycle;
  proposalId: string;
  registrationFingerprint: string;
  expectedAuthorization: string | null;
  eligibleForAuthorization: boolean;
  targetRegistrationAuthorized: false;
  targetConfigurationMutationAuthorized: false;
  networkCollectionReady: false;
  blockers: string[];
  checkedAt: string;
  expiresAt: string;
  safety: RegistrationSafety;
};

export type TargetRegistrationProposalResult =
  | { ok: true; proposal: TargetRegistrationProposal }
  | { ok: false; reason: RegistrationProposalRejectionReason };

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

function normalizeDomain(value: string): string | null {
  const candidate = value.trim().toLowerCase().replace(/\.$/, "");
  if (!candidate || candidate.includes("/") || candidate.includes("@") || candidate.includes(":")) return null;
  try {
    const parsed = new URL(`https://${candidate}`);
    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
    if (!hostname || !hostname.includes(".")) return null;
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isOwnedDomain(candidate: string, ownDomain: string): boolean {
  return candidate === ownDomain || candidate.endsWith(`.${ownDomain}`);
}

function isSpecialHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost") return true;
  return SPECIAL_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .map((item) => normalizeText(item, 120))
    .filter((item): item is string => Boolean(item)))]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 50);
}

function canonicalTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function boundedMinutes(value: number | undefined, fallback: number, maximum: number): number {
  return Number.isInteger(value) && (value as number) > 0 ? Math.min(value as number, maximum) : fallback;
}

function registrationSafety(): RegistrationSafety {
  return {
    advisoryOnly: true,
    targetRegistrationAuthorized: false,
    targetConfigurationMutationAuthorized: false,
    networkCollectionAuthorized: false,
    networkCollectionReady: false,
    transportHardeningRequired: true,
    evidencePersistenceAuthorized: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    publicSiteWrites: false,
    executionAuthorized: false,
  };
}

function canonicalTargetForHash(target: CompetitorCollectionTarget) {
  return {
    id: target.id,
    url: target.url,
    source: target.source,
    allowedPathPrefix: target.allowedPathPrefix,
    confidence: target.confidence,
    pageType: target.pageType,
    keywordThemes: normalizeStringList(target.keywordThemes),
    taxonomyLabels: normalizeStringList(target.taxonomyLabels),
    entityTypes: normalizeStringList(target.entityTypes),
    internalLinkPatterns: normalizeStringList(target.internalLinkPatterns),
  };
}

export function competitorTargetRegistrationCapability() {
  return {
    version: COMPETITOR_TARGET_REGISTRATION_VERSION,
    ...registrationSafety(),
    registrationMutationImplemented: false,
    sourcePlanMaxAgeMinutesDefault: DEFAULT_SOURCE_PLAN_MAX_AGE_MINUTES,
    registrationTtlMinutesDefault: DEFAULT_REGISTRATION_TTL_MINUTES,
    schemaMutationRequired: false,
  } as const;
}

export function fingerprintCompetitorCollectionPlan(plan: CompetitorCollectionPlan): string {
  return stableHash({
    sourceVersion: plan.version,
    generatedAt: plan.generatedAt,
    ownDomain: plan.ownDomain,
    budget: plan.budget,
    selected: plan.selected.map((item) => ({
      rank: item.rank,
      candidateFingerprint: item.candidateFingerprint,
      domain: item.domain,
      score: item.score,
      target: canonicalTargetForHash(item.target),
    })),
  });
}

function validateTarget(
  target: CompetitorCollectionTarget,
  ownDomainInput: string,
): { ok: true; target: CompetitorCollectionTarget; domain: string } | { ok: false; reason: RegistrationProposalRejectionReason } {
  if (!target || typeof target !== "object") return { ok: false, reason: "invalid_target" };
  if (!TARGET_ID_PATTERN.test(target.id ?? "")) return { ok: false, reason: "invalid_target_id" };
  const ownDomain = normalizeDomain(ownDomainInput);
  if (!ownDomain) return { ok: false, reason: "invalid_domain" };

  let parsed: URL;
  try {
    parsed = new URL(target.url);
  } catch {
    return { ok: false, reason: "invalid_target_url" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return { ok: false, reason: "unsupported_scheme" };
  if (parsed.username || parsed.password) return { ok: false, reason: "credential_bearing_url" };
  if (parsed.port) return { ok: false, reason: "unsupported_port" };
  if (parsed.search || parsed.hash) return { ok: false, reason: "query_or_fragment_not_allowed" };

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || !hostname.includes(".")) return { ok: false, reason: "invalid_domain" };
  if (isIP(hostname)) return { ok: false, reason: "ip_literal_not_supported" };
  if (isSpecialHost(hostname)) return { ok: false, reason: "special_use_host" };
  const domain = hostname.replace(/^www\./, "");
  if (isOwnedDomain(domain, ownDomain)) return { ok: false, reason: "own_domain" };

  const prefix = target.allowedPathPrefix;
  if (typeof prefix !== "string" || !prefix.startsWith("/") || prefix.includes("?") || prefix.includes("#")) {
    return { ok: false, reason: "invalid_path_prefix" };
  }
  if (!parsed.pathname.startsWith(prefix)) return { ok: false, reason: "path_prefix_mismatch" };

  const confidence = Number(target.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) return { ok: false, reason: "invalid_confidence" };
  const source = normalizeText(target.source, 80);
  if (!source) return { ok: false, reason: "invalid_source" };
  const pageType = target.pageType == null ? null : normalizeText(target.pageType, 120);
  if (target.pageType != null && !pageType) return { ok: false, reason: "invalid_page_type" };

  parsed.hostname = hostname;
  parsed.search = "";
  parsed.hash = "";
  return {
    ok: true,
    domain,
    target: {
      id: target.id,
      url: parsed.toString(),
      source,
      allowedPathPrefix: prefix,
      confidence,
      pageType,
      keywordThemes: normalizeStringList(target.keywordThemes),
      taxonomyLabels: normalizeStringList(target.taxonomyLabels),
      entityTypes: normalizeStringList(target.entityTypes),
      internalLinkPatterns: normalizeStringList(target.internalLinkPatterns),
    },
  };
}

function sourcePlanSafe(plan: CompetitorCollectionPlan): boolean {
  return plan.safety?.advisoryOnly === true
    && plan.safety.networkCollectionAuthorized === false
    && plan.safety.evidencePersistenceAuthorized === false
    && plan.safety.targetConfigurationMutationAuthorized === false
    && plan.safety.schedulerEnabled === false
    && plan.safety.autonomousWorkerEnabled === false
    && plan.safety.publicSiteWrites === false
    && plan.safety.executionAuthorized === false;
}

function proposalFingerprintCore(input: {
  sourcePlanFingerprint: string;
  sourcePlanVersion: string;
  sourcePlanGeneratedAt: string;
  candidateFingerprint: string;
  rank: number;
  domain: string;
  score: CompetitorCandidateScore;
  target: CompetitorCollectionTarget;
  proposedAt: string;
  expiresAt: string;
}) {
  return {
    version: COMPETITOR_TARGET_REGISTRATION_VERSION,
    sourcePlanFingerprint: input.sourcePlanFingerprint,
    sourcePlanVersion: input.sourcePlanVersion,
    sourcePlanGeneratedAt: input.sourcePlanGeneratedAt,
    candidateFingerprint: input.candidateFingerprint,
    rank: input.rank,
    domain: input.domain,
    score: input.score,
    target: canonicalTargetForHash(input.target),
    proposedAt: input.proposedAt,
    expiresAt: input.expiresAt,
  };
}

export function createTargetRegistrationProposal(input: {
  plan: CompetitorCollectionPlan;
  selectedRank: number;
  now?: string;
  registrationTtlMinutes?: number;
  sourcePlanMaxAgeMinutes?: number;
}): TargetRegistrationProposalResult {
  const plan = input.plan;
  if (!plan || typeof plan !== "object" || !Array.isArray(plan.selected)) return { ok: false, reason: "invalid_source_plan" };
  if (!sourcePlanSafe(plan)) return { ok: false, reason: "unsafe_source_plan" };

  const now = canonicalTimestamp(input.now ?? new Date().toISOString());
  const sourceGeneratedAt = canonicalTimestamp(plan.generatedAt);
  if (!now || !sourceGeneratedAt) return { ok: false, reason: "invalid_timestamp" };
  const nowMs = Date.parse(now);
  const sourceMs = Date.parse(sourceGeneratedAt);
  if (sourceMs > nowMs + 5 * 60_000) return { ok: false, reason: "source_plan_from_future" };
  const maxAgeMinutes = boundedMinutes(input.sourcePlanMaxAgeMinutes, DEFAULT_SOURCE_PLAN_MAX_AGE_MINUTES, MAX_SOURCE_PLAN_AGE_MINUTES);
  if ((nowMs - sourceMs) / 60_000 > maxAgeMinutes) return { ok: false, reason: "source_plan_stale" };

  const selected = plan.selected.find((item) => item.rank === input.selectedRank);
  if (!selected) return { ok: false, reason: "selected_target_not_found" };
  if (!HEX_64_PATTERN.test(selected.candidateFingerprint)) return { ok: false, reason: "invalid_candidate_fingerprint" };

  const validated = validateTarget(selected.target, plan.ownDomain);
  if (!validated.ok) return validated;
  if (validated.domain !== selected.domain) return { ok: false, reason: "invalid_domain" };

  const ttlMinutes = boundedMinutes(input.registrationTtlMinutes, DEFAULT_REGISTRATION_TTL_MINUTES, MAX_REGISTRATION_TTL_MINUTES);
  const expiresAt = new Date(nowMs + ttlMinutes * 60_000).toISOString();
  const sourcePlanFingerprint = fingerprintCompetitorCollectionPlan(plan);
  const core = proposalFingerprintCore({
    sourcePlanFingerprint,
    sourcePlanVersion: plan.version,
    sourcePlanGeneratedAt: sourceGeneratedAt,
    candidateFingerprint: selected.candidateFingerprint,
    rank: selected.rank,
    domain: selected.domain,
    score: selected.score,
    target: validated.target,
    proposedAt: now,
    expiresAt,
  });
  const registrationFingerprint = stableHash(core);
  const proposalId = `ctr-${registrationFingerprint.slice(0, 24)}`;

  return {
    ok: true,
    proposal: {
      version: COMPETITOR_TARGET_REGISTRATION_VERSION,
      proposalId,
      registrationFingerprint,
      sourcePlanFingerprint,
      sourcePlanVersion: plan.version,
      sourcePlanGeneratedAt: sourceGeneratedAt,
      candidateFingerprint: selected.candidateFingerprint,
      rank: selected.rank,
      domain: selected.domain,
      score: selected.score,
      target: validated.target,
      proposedAt: now,
      expiresAt,
      lifecycle: "proposed",
      safety: registrationSafety(),
    },
  };
}

export function expectedTargetRegistrationAuthorization(proposal: TargetRegistrationProposal): string {
  return `AUTHORIZE_COMPETITOR_TARGET_REGISTRATION:${proposal.proposalId}:${proposal.registrationFingerprint}`;
}

function proposalFingerprintMatches(proposal: TargetRegistrationProposal): boolean {
  if (!HEX_64_PATTERN.test(proposal.registrationFingerprint) || !HEX_64_PATTERN.test(proposal.sourcePlanFingerprint)) return false;
  const expected = stableHash(proposalFingerprintCore({
    sourcePlanFingerprint: proposal.sourcePlanFingerprint,
    sourcePlanVersion: proposal.sourcePlanVersion,
    sourcePlanGeneratedAt: proposal.sourcePlanGeneratedAt,
    candidateFingerprint: proposal.candidateFingerprint,
    rank: proposal.rank,
    domain: proposal.domain,
    score: proposal.score,
    target: proposal.target,
    proposedAt: proposal.proposedAt,
    expiresAt: proposal.expiresAt,
  }));
  return expected === proposal.registrationFingerprint && proposal.proposalId === `ctr-${expected.slice(0, 24)}`;
}

export function preflightTargetRegistration(
  proposal: TargetRegistrationProposal,
  input: { now?: string; reviewDecision?: ReviewDecision } = {},
): TargetRegistrationPreflight {
  const safety = registrationSafety();
  const checkedAt = canonicalTimestamp(input.now ?? new Date().toISOString()) ?? new Date(0).toISOString();
  const reviewDecision = input.reviewDecision ?? "pending";
  const blockers = [
    "target_configuration_mutation_not_implemented",
    "network_transport_hardening_required",
    "network_collection_not_authorized",
    "evidence_persistence_not_authorized",
  ];

  if (!proposal || typeof proposal !== "object" || !proposalFingerprintMatches(proposal)) {
    return {
      ok: false,
      lifecycle: "rejected",
      proposalId: proposal?.proposalId ?? "invalid",
      registrationFingerprint: proposal?.registrationFingerprint ?? "invalid",
      expectedAuthorization: null,
      eligibleForAuthorization: false,
      targetRegistrationAuthorized: false,
      targetConfigurationMutationAuthorized: false,
      networkCollectionReady: false,
      blockers: ["proposal_fingerprint_mismatch", ...blockers],
      checkedAt,
      expiresAt: proposal?.expiresAt ?? checkedAt,
      safety,
    };
  }

  const checkedMs = Date.parse(checkedAt);
  const expiresMs = Date.parse(proposal.expiresAt);
  if (!Number.isFinite(checkedMs) || !Number.isFinite(expiresMs) || checkedMs > expiresMs) {
    return {
      ok: false,
      lifecycle: "expired",
      proposalId: proposal.proposalId,
      registrationFingerprint: proposal.registrationFingerprint,
      expectedAuthorization: null,
      eligibleForAuthorization: false,
      targetRegistrationAuthorized: false,
      targetConfigurationMutationAuthorized: false,
      networkCollectionReady: false,
      blockers: ["registration_proposal_expired", ...blockers],
      checkedAt,
      expiresAt: proposal.expiresAt,
      safety,
    };
  }

  if (reviewDecision === "rejected") {
    return {
      ok: false,
      lifecycle: "rejected",
      proposalId: proposal.proposalId,
      registrationFingerprint: proposal.registrationFingerprint,
      expectedAuthorization: null,
      eligibleForAuthorization: false,
      targetRegistrationAuthorized: false,
      targetConfigurationMutationAuthorized: false,
      networkCollectionReady: false,
      blockers: ["review_rejected", ...blockers],
      checkedAt,
      expiresAt: proposal.expiresAt,
      safety,
    };
  }

  if (reviewDecision !== "approved") {
    return {
      ok: true,
      lifecycle: "review_ready",
      proposalId: proposal.proposalId,
      registrationFingerprint: proposal.registrationFingerprint,
      expectedAuthorization: null,
      eligibleForAuthorization: false,
      targetRegistrationAuthorized: false,
      targetConfigurationMutationAuthorized: false,
      networkCollectionReady: false,
      blockers: ["review_required", ...blockers],
      checkedAt,
      expiresAt: proposal.expiresAt,
      safety,
    };
  }

  return {
    ok: true,
    lifecycle: "authorization_ready",
    proposalId: proposal.proposalId,
    registrationFingerprint: proposal.registrationFingerprint,
    expectedAuthorization: expectedTargetRegistrationAuthorization(proposal),
    eligibleForAuthorization: true,
    targetRegistrationAuthorized: false,
    targetConfigurationMutationAuthorized: false,
    networkCollectionReady: false,
    blockers: ["exact_registration_authorization_not_consumed", ...blockers],
    checkedAt,
    expiresAt: proposal.expiresAt,
    safety,
  };
}
