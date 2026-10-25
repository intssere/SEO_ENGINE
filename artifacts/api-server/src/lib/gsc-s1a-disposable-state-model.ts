// GSC-02 S1A — disposable, single-process, deterministic simulation ONLY.
//
// This is NOT an OAuth state store: no cryptographic nonce generation or
// verification, no durable/atomic database transaction, no real session,
// identity/provider trust, no distributed lock and no runtime route binding.
// Never use any result from this model as a consent or token-exchange grant.
// Production needs an independently certified atomic durable store and #1159.
import { GSC_READONLY_PROFILE, GSC_READONLY_SCOPE } from "@seo-engine/oauth-connection-manager/gsc-readonly";
import { GSC_S0_HISTORICAL_SITE_ID } from "./gsc-stage0-static-review.js";

export const GSC_S1A_MODEL_VERSION = "pilot01-gsc02-s1a-disposable-v1" as const;
const MAX_TTL_MS = 600_000;
const ISSUE_KEYS = [
  "version", "purpose", "siteId", "scope", "stateFingerprint",
  "organizationFingerprint", "principalFingerprint", "sessionFingerprint",
  "clientGenerationFingerprint", "redirectFingerprint", "issuedAtMs", "expiresAtMs",
] as const;
const CONSUME_KEYS = [
  "stateFingerprint", "organizationFingerprint", "principalFingerprint",
  "sessionFingerprint", "clientGenerationFingerprint", "redirectFingerprint",
  "observedAtMs",
] as const;
const ID_KEYS = [
  "organizationFingerprint", "principalFingerprint", "sessionFingerprint",
  "clientGenerationFingerprint", "redirectFingerprint",
] as const;

export type GscS1aSyntheticIssue = {
  version: typeof GSC_S1A_MODEL_VERSION;
  purpose: typeof GSC_READONLY_PROFILE;
  siteId: typeof GSC_S0_HISTORICAL_SITE_ID;
  scope: typeof GSC_READONLY_SCOPE;
  stateFingerprint: string;
  organizationFingerprint: string;
  principalFingerprint: string;
  sessionFingerprint: string;
  clientGenerationFingerprint: string;
  redirectFingerprint: string;
  issuedAtMs: number;
  expiresAtMs: number;
};
export type GscS1aSyntheticAttempt = Pick<GscS1aSyntheticIssue,
  "stateFingerprint" | "organizationFingerprint" | "principalFingerprint" |
  "sessionFingerprint" | "clientGenerationFingerprint" | "redirectFingerprint"> & {
  observedAtMs: number;
};

export type GscS1aModelResult = {
  kind: "disposable_single_process_simulation_only";
  status: "synthetic_issued" | "synthetic_consumed" | "synthetic_duplicate" |
    "synthetic_replay" | "synthetic_missing" | "synthetic_mismatch" |
    "synthetic_expired" | "synthetic_invalid";
  simulatedConsumptionObserved: boolean;
  trustedNonceVerified: false;
  durableAtomicStateVerified: false;
  distributedReplayResistanceVerified: false;
  consentAuthorized: false;
  tokenExchangeAuthorized: false;
  credentialWriteAuthorized: false;
  providerReadAuthorized: false;
  runtimeBindingAuthorized: false;
};

type Saved = {
  state: GscS1aSyntheticIssue;
  consumed: boolean;
};

function ownData(value: unknown, expected: readonly string[]): Record<string, unknown> | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== expected.length || keys.some(key => typeof key !== "string" || !expected.includes(key))) return null;
    const result: Record<string, unknown> = Object.create(null);
    for (const key of expected) {
      const d = Object.getOwnPropertyDescriptor(value, key);
      if (!d || !d.enumerable || !("value" in d)) return null;
      result[key] = d.value;
    }
    return result;
  } catch { return null; }
}
function fingerprint(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}
function finiteSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function issueShape(value: unknown): GscS1aSyntheticIssue | null {
  const v = ownData(value, ISSUE_KEYS);
  if (!v || v.version !== GSC_S1A_MODEL_VERSION ||
      v.purpose !== GSC_READONLY_PROFILE || v.siteId !== GSC_S0_HISTORICAL_SITE_ID ||
      v.scope !== GSC_READONLY_SCOPE || !fingerprint(v.stateFingerprint) ||
      ID_KEYS.some(k => !fingerprint(v[k])) ||
      !finiteSafeInteger(v.issuedAtMs) || !finiteSafeInteger(v.expiresAtMs) ||
      v.expiresAtMs <= v.issuedAtMs ||
      v.expiresAtMs - v.issuedAtMs > MAX_TTL_MS) return null;
  return v as GscS1aSyntheticIssue;
}
function attemptShape(value: unknown): GscS1aSyntheticAttempt | null {
  const v = ownData(value, CONSUME_KEYS);
  if (!v || !fingerprint(v.stateFingerprint) ||
      ID_KEYS.some(k => !fingerprint(v[k])) || !finiteSafeInteger(v.observedAtMs)) return null;
  return v as GscS1aSyntheticAttempt;
}
function verdict(status: GscS1aModelResult["status"]): GscS1aModelResult {
  return {
    kind: "disposable_single_process_simulation_only",
    status,
    simulatedConsumptionObserved: status === "synthetic_consumed",
    trustedNonceVerified: false,
    durableAtomicStateVerified: false,
    distributedReplayResistanceVerified: false,
    consentAuthorized: false,
    tokenExchangeAuthorized: false,
    credentialWriteAuthorized: false,
    providerReadAuthorized: false,
    runtimeBindingAuthorized: false,
  };
}

/**
 * Disposable synthetic model demonstrating the compare-and-consume invariant.
 *
 * Within ONE JavaScript instance, a synchronous check-and-set occurs without
 * await so two local callbacks cannot each win. This proves nothing about
 * multiple instances, restarts, Redis/Postgres isolation, actual OAuth state,
 * real principals or external authorization. Never connect to live routes.
 */
export class DisposableGscS1aStateModel {
  private readonly states = new Map<string, Saved>();

  issue(input: unknown): GscS1aModelResult {
    const proposed = issueShape(input);
    if (!proposed) return verdict("synthetic_invalid");
    // No overwrite: issuing a duplicate state must never reset consumption.
    if (this.states.has(proposed.stateFingerprint)) return verdict("synthetic_duplicate");
    this.states.set(proposed.stateFingerprint, { state: proposed, consumed: false });
    return verdict("synthetic_issued");
  }

  attemptConsume(input: unknown): GscS1aModelResult {
    const requested = attemptShape(input);
    if (!requested) return verdict("synthetic_invalid");
    const saved = this.states.get(requested.stateFingerprint);
    if (!saved) return verdict("synthetic_missing");
    if (saved.consumed) return verdict("synthetic_replay");
    if (ID_KEYS.some(k => requested[k] !== saved.state[k])) return verdict("synthetic_mismatch");
    if (requested.observedAtMs <= saved.state.issuedAtMs ||
        requested.observedAtMs > saved.state.expiresAtMs) return verdict("synthetic_expired");
    // Single-instance synchronous compare/set, NOT a database transaction.
    saved.consumed = true;
    return verdict("synthetic_consumed");
  }
}
