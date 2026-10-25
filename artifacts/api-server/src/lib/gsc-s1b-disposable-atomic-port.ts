// GSC-02 S1B: DISPOSABLE, OFFLINE-ONLY atomic port contract and harness.
// This is NOT an OAuth implementation or proof of a durable/transactional DB.
// The port is injected and entirely untrusted; only synthetic data is used.
// No real state, PKCE verifier, cookies, secrets, Google, SQL, or routes.
// All authority flags remain false, including after "consumed" replies.
import { GSC_READONLY_PROFILE, GSC_READONLY_SCOPE } from "@seo-engine/oauth-connection-manager/gsc-readonly";
import { GSC_S0_HISTORICAL_SITE_ID } from "./gsc-stage0-static-review.js";

export const GSC_S1B_VERSION = "pilot01-gsc02-s1b-atomic-port-offline-v1" as const;
const FINGERPRINT = /^[a-f0-9]{64}$/;
const MAX_TTL_MS = 600_000;

const BINDINGS = [
  "organizationFingerprint", "principalFingerprint", "sessionFingerprint",
  "clientGenerationFingerprint", "redirectFingerprint",
] as const;
const RECORD_KEYS = [
  "version", "purpose", "siteId", "scope", "stateFingerprint",
  ...BINDINGS, "issuedAtMs", "expiresAtMs",
] as const;
const ATTEMPT_KEYS = [
  "stateFingerprint", ...BINDINGS, "observedAtMs",
] as const;

export type GscS1bRegistration = {
  version: typeof GSC_S1B_VERSION;
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
export type GscS1bAttempt = Pick<GscS1bRegistration,
  "stateFingerprint" | "organizationFingerprint" | "principalFingerprint" |
  "sessionFingerprint" | "clientGenerationFingerprint" | "redirectFingerprint"> & {
  observedAtMs: number;
};

/**
 * Proposed boundary for a future single-statement conditional state transition.
 * Any future real adapter MUST atomically apply ALL predicates in persistent
 * storage; a read-then-update implementation is not compliant. A caller cannot
 * establish atomicity from this interface or from an adapter's claim.
 *
 * TEST DOUBLES ONLY. Do not connect this module to live OAuth or Production DB.
 */
export interface GscS1bDisposableAtomicPort {
  insertIfAbsent(record: Readonly<GscS1bRegistration>): Promise<unknown>;
  consumeIfPendingAndBound(attempt: Readonly<GscS1bAttempt>): Promise<unknown>;
}

export type GscS1bSimulationStatus =
  | "synthetic_inserted" | "synthetic_duplicate"
  | "synthetic_consumed" | "synthetic_replay" | "synthetic_missing"
  | "synthetic_mismatch" | "synthetic_expired"
  | "synthetic_invalid_input" | "synthetic_invalid_receipt" | "synthetic_port_error";

export type GscS1bObservation = {
  kind: "untrusted_disposable_store_claim_only";
  status: GscS1bSimulationStatus;
  simulatedPortReportedConsume: boolean;
  atomicityIndependentlyVerified: false;
  durableStorageVerified: false;
  distributedReplayResistanceVerified: false;
  trustedStateVerified: false;
  consentAuthorized: false;
  tokenExchangeAuthorized: false;
  credentialWriteAuthorized: false;
  providerReadAuthorized: false;
  runtimeBindingAuthorized: false;
};

function ownSnapshot(input: unknown, keys: readonly string[]): Record<string, unknown> | null {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
    const proto = Object.getPrototypeOf(input);
    if (proto !== Object.prototype && proto !== null) return null;
    const actual = Reflect.ownKeys(input);
    if (actual.length !== keys.length || actual.some(k => typeof k !== "string" || !keys.includes(k))) return null;
    const snapshot: Record<string, unknown> = Object.create(null);
    for (const key of keys) {
      const desc = Object.getOwnPropertyDescriptor(input, key);
      if (!desc || !desc.enumerable || !("value" in desc)) return null;
      snapshot[key] = desc.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}
function fp(v: unknown): v is string {
  return typeof v === "string" && FINGERPRINT.test(v);
}
function int(v: unknown): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
}
function registration(input: unknown): Readonly<GscS1bRegistration> | null {
  const v = ownSnapshot(input, RECORD_KEYS);
  if (!v || v.version !== GSC_S1B_VERSION || v.purpose !== GSC_READONLY_PROFILE ||
      v.siteId !== GSC_S0_HISTORICAL_SITE_ID || v.scope !== GSC_READONLY_SCOPE ||
      !fp(v.stateFingerprint) || BINDINGS.some(k => !fp(v[k])) ||
      !int(v.issuedAtMs) || !int(v.expiresAtMs) ||
      v.expiresAtMs <= v.issuedAtMs || v.expiresAtMs - v.issuedAtMs > MAX_TTL_MS) return null;
  return Object.freeze(v) as unknown as Readonly<GscS1bRegistration>;
}
function attempt(input: unknown): Readonly<GscS1bAttempt> | null {
  const v = ownSnapshot(input, ATTEMPT_KEYS);
  if (!v || !fp(v.stateFingerprint) || BINDINGS.some(k => !fp(v[k])) ||
      !int(v.observedAtMs)) return null;
  return Object.freeze(v) as unknown as Readonly<GscS1bAttempt>;
}
function observation(status: GscS1bSimulationStatus): GscS1bObservation {
  return {
    kind: "untrusted_disposable_store_claim_only",
    status,
    simulatedPortReportedConsume: status === "synthetic_consumed",
    atomicityIndependentlyVerified: false,
    durableStorageVerified: false,
    distributedReplayResistanceVerified: false,
    trustedStateVerified: false,
    consentAuthorized: false,
    tokenExchangeAuthorized: false,
    credentialWriteAuthorized: false,
    providerReadAuthorized: false,
    runtimeBindingAuthorized: false,
  };
}
function receiptStatus(input: unknown, allowed: readonly string[]): string | null {
  const data = ownSnapshot(input, ["status"]);
  return data && typeof data.status === "string" && allowed.includes(data.status)
    ? data.status : null;
}
const REGISTRATION_RESPONSES = ["inserted", "duplicate"] as const;
const CONSUMPTION_RESPONSES = ["consumed", "replay", "missing", "mismatch", "expired"] as const;

/** Offline only; receipt values never confer any real authorization. */
export async function simulateGscS1bRegister(
  port: GscS1bDisposableAtomicPort, proposed: unknown,
): Promise<GscS1bObservation> {
  const record = registration(proposed);
  if (!record) return observation("synthetic_invalid_input");
  try {
    const result = await port.insertIfAbsent(record);
    const status = receiptStatus(result, REGISTRATION_RESPONSES);
    return observation(status ? ("synthetic_" + status) as GscS1bSimulationStatus : "synthetic_invalid_receipt");
  } catch {
    return observation("synthetic_port_error");
  }
}
/** Does NOT authorize token exchange even if a fake port claims consumption. */
export async function simulateGscS1bConsume(
  port: GscS1bDisposableAtomicPort, proposed: unknown,
): Promise<GscS1bObservation> {
  const request = attempt(proposed);
  if (!request) return observation("synthetic_invalid_input");
  try {
    const result = await port.consumeIfPendingAndBound(request);
    const status = receiptStatus(result, CONSUMPTION_RESPONSES);
    return observation(status ? ("synthetic_" + status) as GscS1bSimulationStatus : "synthetic_invalid_receipt");
  } catch {
    return observation("synthetic_port_error");
  }
}
