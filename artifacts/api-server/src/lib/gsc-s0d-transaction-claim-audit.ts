// GSC-02 S0D: OFFLINE-ONLY structural audit of a claimed OAuth transaction.
// Never use this to validate a real nonce, state consumption, session, provider
// receipt, consent, credential write, replay lock or Production identity.
// All fingerprints, timestamps and claims are caller-controlled and forgeable.
// No IO, crypto, database, provider transport, route import, or execution grant.
import { GSC_READONLY_PROFILE, GSC_READONLY_SCOPE } from "@seo-engine/oauth-connection-manager/gsc-readonly";
import {
  GSC_S0_CANONICAL_ORIGIN,
  GSC_S0_HISTORICAL_SITE_ID,
  GSC_S0_TARGET_PROPERTY,
} from "./gsc-stage0-static-review.js";

export const GSC_S0D_VERSION = "pilot-01-gsc02-s0d-offline-transaction-audit-v1";
export const GSC_S0D_STAGES = [
  "state_issued_claim",
  "callback_bound_claim",
  "state_consumed_claim",
  "token_exchange_claim",
  "credential_persisted_claim",
  "discovery_requested_claim",
] as const;
export type GscS0dStage = (typeof GSC_S0D_STAGES)[number];

// Prefix completeness is ONLY a syntactic property. It is not authorization.
// A separate trusted, durable atomic state-consumption store is necessary for
// replay resistance: a caller-provided "consumed" claim is never sufficient.
export type GscS0dClaimEvent = {
  stage: GscS0dStage;
  atUtc: string;
  claimFingerprint: string;
  transactionFingerprint: string;
  organizationFingerprint: string;
  principalFingerprint: string;
  sessionFingerprint: string;
  clientGenerationFingerprint: string;
  redirectFingerprint: string;
};
export type GscS0dClaimChain = {
  version: typeof GSC_S0D_VERSION;
  profile: typeof GSC_READONLY_PROFILE;
  siteId: string;
  canonicalOrigin: typeof GSC_S0_CANONICAL_ORIGIN;
  targetProperty: typeof GSC_S0_TARGET_PROPERTY;
  requestedScopes: readonly [typeof GSC_READONLY_SCOPE];
  transactionFingerprint: string;
  organizationFingerprint: string;
  principalFingerprint: string;
  sessionFingerprint: string;
  clientGenerationFingerprint: string;
  redirectFingerprint: string;
  events: readonly GscS0dClaimEvent[];
};
export type GscS0dAudit = {
  kind: "untrusted_claim_sequence_review_only";
  structurallyConformant: boolean;
  claimedStages: number;
  completeClaimChain: boolean;
  findings: readonly string[];
  trustedTransactionVerified: false;
  singleUseStateVerified: false;
  tokenExchangeAuthorized: false;
  credentialWriteAuthorized: false;
  providerReadAuthorized: false;
  runtimeBindingAuthorized: false;
};

const ROOT = [
  "version", "profile", "siteId", "canonicalOrigin", "targetProperty",
  "requestedScopes", "transactionFingerprint", "organizationFingerprint",
  "principalFingerprint", "sessionFingerprint", "clientGenerationFingerprint",
  "redirectFingerprint", "events",
] as const;
const EVENT = [
  "stage", "atUtc", "claimFingerprint", "transactionFingerprint",
  "organizationFingerprint", "principalFingerprint", "sessionFingerprint",
  "clientGenerationFingerprint", "redirectFingerprint",
] as const;
const BINDINGS = [
  "transactionFingerprint", "organizationFingerprint", "principalFingerprint",
  "sessionFingerprint", "clientGenerationFingerprint", "redirectFingerprint",
] as const;
function ownData(value: unknown, expected: readonly string[]): Record<string, unknown> | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== expected.length || keys.some(k => typeof k !== "string" || !expected.includes(k))) return null;
    const copied: Record<string, unknown> = Object.create(null);
    for (const key of expected) {
      const d = Object.getOwnPropertyDescriptor(value, key);
      if (!d || !d.enumerable || !("value" in d)) return null;
      copied[key] = d.value;
    }
    return copied;
  } catch {
    return null;
  }
}
function exactArray(value: unknown, maximum: number): unknown[] | null {
  try {
    if (!Array.isArray(value)) return null;
    const length = Object.getOwnPropertyDescriptor(value, "length");
    if (!length || !("value" in length) || !Number.isInteger(length.value) ||
        length.value < 1 || length.value > maximum) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== length.value + 1 || !keys.includes("length")) return null;
    const items: unknown[] = [];
    for (let i = 0; i < length.value; i++) {
      const d = Object.getOwnPropertyDescriptor(value, String(i));
      if (!d || !d.enumerable || !("value" in d)) return null;
      items.push(d.value);
    }
    return items;
  } catch { return null; }
}
const fingerprint = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
function utcMillis(value: unknown): number | null {
  if (typeof value !== "string" ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && new Date(ms).toISOString() === value ? ms : null;
}
function readonlyScope(value: unknown): boolean {
  const list = exactArray(value, 1);
  return list !== null && list.length === 1 && list[0] === GSC_READONLY_SCOPE;
}

/**
 * Audits syntactic order, bounded claim time and invariant identity claims.
 * Intentionally performs no real-time freshness check: its clock is untrusted.
 * None of its outputs can serve as authorization for any OAuth operation.
 */
export function auditGscS0dClaimChain(input: unknown): GscS0dAudit {
  const findings: string[] = [];
  const root = ownData(input, ROOT);
  let claimedStages = 0;
  if (!root) {
    findings.push("claim_chain_requires_exact_own_data_fields");
  } else {
    if (root.version !== GSC_S0D_VERSION || root.profile !== GSC_READONLY_PROFILE)
      findings.push("wrong_version_or_profile");
    if (root.siteId !== GSC_S0_HISTORICAL_SITE_ID ||
        root.canonicalOrigin !== GSC_S0_CANONICAL_ORIGIN ||
        root.targetProperty !== GSC_S0_TARGET_PROPERTY)
      findings.push("unverified_target_candidate_mismatch");
    if (!readonlyScope(root.requestedScopes)) findings.push("readonly_scope_required");
    if (BINDINGS.some(k => !fingerprint(root[k]))) findings.push("binding_fingerprint_invalid");
    const claims = exactArray(root.events, GSC_S0D_STAGES.length);
    if (!claims) {
      findings.push("claim_events_must_be_bounded_dense_array");
    } else {
      claimedStages = claims.length;
      const seenClaims = new Set<string>();
      let issuedTime: number | null = null;
      let lastTime: number | null = null;
      for (let i = 0; i < claims.length; i++) {
        const event = ownData(claims[i], EVENT);
        if (!event) { findings.push("event_requires_exact_own_data_fields"); continue; }
        if (event.stage !== GSC_S0D_STAGES[i]) findings.push("out_of_order_or_replayed_stage");
        const instant = utcMillis(event.atUtc);
        if (instant === null || (lastTime !== null && instant <= lastTime))
          findings.push("event_time_invalid_or_nonmonotonic");
        if (instant !== null) {
          if (i === 0) issuedTime = instant;
          lastTime = instant;
        }
        if (BINDINGS.some(key => !fingerprint(event[key]) || event[key] !== root[key]))
          findings.push("actor_session_site_client_or_transaction_drift");
        if (!fingerprint(event.claimFingerprint) || seenClaims.has(event.claimFingerprint as string))
          findings.push("claim_fingerprint_missing_or_reused");
        if (typeof event.claimFingerprint === "string") seenClaims.add(event.claimFingerprint);
        // The state-consumption claim must occur within 10 minutes of issuance.
        // This does NOT attest a real atomic consume or prevent actual replay.
        if (i === 2 && (issuedTime === null || instant === null ||
            instant - issuedTime <= 0 || instant - issuedTime > 600_000))
          findings.push("claimed_consumption_outside_ttl");
      }
    }
  }
  return {
    kind: "untrusted_claim_sequence_review_only",
    structurallyConformant: findings.length === 0,
    claimedStages,
    completeClaimChain: findings.length === 0 && claimedStages === GSC_S0D_STAGES.length,
    findings: [...new Set(findings)],
    trustedTransactionVerified: false,
    singleUseStateVerified: false,
    tokenExchangeAuthorized: false,
    credentialWriteAuthorized: false,
    providerReadAuthorized: false,
    runtimeBindingAuthorized: false,
  };
}
