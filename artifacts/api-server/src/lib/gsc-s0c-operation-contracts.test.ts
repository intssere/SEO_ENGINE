import assert from "node:assert/strict";
import test from "node:test";
import {
  GSC_READONLY_EXTERNAL_ACCOUNT_ID, GSC_READONLY_PROFILE, GSC_READONLY_SCOPE,
} from "@seo-engine/oauth-connection-manager/gsc-readonly";
import {
  GSC_S0_CANONICAL_ORIGIN, GSC_S0_HISTORICAL_SITE_ID, GSC_S0_TARGET_PROPERTY,
} from "./gsc-stage0-static-review.js";
import {
  GSC_S0C_VERSION, reviewGscS0cOperation,
  type GscS0cOperation, type GscS0cPacket, type GscS0cReview,
} from "./gsc-s0c-operation-contracts.js";

const hex = (c: string) => c.repeat(64);
const evidence: Record<GscS0cOperation, Record<string, unknown>> = {
  consent_preflight: {
    storageCandidateFingerprint: hex("a"), callbackCandidateFingerprint: hex("b"),
    proposedWriteBoundary: "gsc_only_unattested",
  },
  callback_state: {
    stateClaimFingerprint: hex("a"), pkceMethod: "S256", consumptionClaimFingerprint: hex("b"),
  },
  token_exchange: {
    consumptionClaimFingerprint: hex("a"), scopeEvidenceFingerprint: hex("b"),
    grantedScopes: [GSC_READONLY_SCOPE],
  },
  credential_persistence: {
    scopeEvidenceFingerprint: hex("a"), storageCandidateFingerprint: hex("b"),
    credentialAccount: GSC_READONLY_EXTERNAL_ACCOUNT_ID, writeBoundaryClaim: "gsc_only_unattested",
  },
  property_discovery: {
    storedCredentialClaimFingerprint: hex("a"), discoveryGrantClaimFingerprint: hex("b"),
    maxProperties: 256, maxAttempts: 1, retryEnabled: false,
  },
};
function packet(operation: GscS0cOperation = "consent_preflight"): GscS0cPacket {
  return {
    version: GSC_S0C_VERSION, operation, profile: GSC_READONLY_PROFILE,
    externalAccountId: GSC_READONLY_EXTERNAL_ACCOUNT_ID,
    siteId: GSC_S0_HISTORICAL_SITE_ID, canonicalOrigin: GSC_S0_CANONICAL_ORIGIN,
    targetProperty: GSC_S0_TARGET_PROPERTY,
    organizationFingerprint: hex("1"), principalFingerprint: hex("2"),
    sessionFingerprint: hex("3"), clientGenerationFingerprint: hex("4"),
    transactionFingerprint: hex("5"), requestFingerprint: hex("6"),
    requestedScopes: [GSC_READONLY_SCOPE],
    issuedAtUtc: "2026-10-24T17:00:00.000Z",
    expiresAtUtc: "2026-10-24T17:10:00.000Z",
    boundaryEvidence: { ...evidence[operation] },
  };
}
function blocked(r: GscS0cReview) {
  assert.equal(r.kind, "source_only_structure_not_authority");
  assert.deepEqual([
    r.consentAuthorized, r.stateConsumptionAuthorized, r.tokenExchangeAuthorized,
    r.credentialWriteAuthorized, r.providerReadAuthorized, r.propertySelectionAuthorized,
    r.evidenceWriteAuthorized, r.runtimeBindingAuthorized,
  ], [false, false, false, false, false, false, false, false]);
}
function denied(value: unknown, code: string) {
  const r = reviewGscS0cOperation(value);
  assert.equal(r.structurallyConformant, false);
  assert.ok(r.findings.includes(code), JSON.stringify(r.findings));
  blocked(r);
}

test("five distinct source-only operations are NEVER executable even with conformant packets", () => {
  for (const op of Object.keys(evidence) as GscS0cOperation[]) {
    const result = reviewGscS0cOperation(packet(op));
    assert.equal(result.operation, op);
    assert.equal(result.structurallyConformant, true, JSON.stringify(result.findings));
    assert.deepEqual(result.findings, []);
    blocked(result);
  }
});
test("legacy OAuth identity, wrong site and actor/client fingerprints rejected", () => {
  denied({ ...packet(), profile: "legacy_google" }, "gsc_profile_mismatch");
  denied({ ...packet(), externalAccountId: "google" }, "gsc_profile_mismatch");
  denied({ ...packet(), siteId: "incorrect-site" }, "site_candidate_mismatch");
  denied({ ...packet(), canonicalOrigin: "https://other.example" }, "site_candidate_mismatch");
  denied({ ...packet(), targetProperty: "sc-domain:other.example" }, "site_candidate_mismatch");
  denied({ ...packet(), clientGenerationFingerprint: "" }, "identity_fingerprint_invalid");
  denied({ ...packet(), principalFingerprint: hex("G") }, "identity_fingerprint_invalid");
  denied({ ...packet(), organizationFingerprint: null }, "identity_fingerprint_invalid");
});
test("unknown and cross-stage evidence cannot claim permission", () => {
  denied({ ...packet(), operation: "combined_exchange_discovery_persist" }, "operation_unknown");
  denied({ ...packet("token_exchange"), boundaryEvidence: evidence.consent_preflight }, "stage_evidence_mismatch");
  denied({ ...packet("credential_persistence"), boundaryEvidence: evidence.callback_state }, "stage_evidence_mismatch");
  denied({ ...packet("property_discovery"), boundaryEvidence: evidence.token_exchange }, "stage_evidence_mismatch");
  denied({ ...packet(), boundaryEvidence: {} }, "stage_evidence_mismatch");
});
test("token/code/secret smuggling and injected runtime grants are never accepted", () => {
  denied({ ...packet(), accessToken: "fake-not-real" }, "packet_requires_exact_own_data_fields");
  denied({ ...packet(), authorizationCode: "fake-not-real" }, "packet_requires_exact_own_data_fields");
  denied({ ...packet(), databaseWriteAuthorized: true }, "packet_requires_exact_own_data_fields");
  denied({ ...packet(), liveTransportBound: true }, "packet_requires_exact_own_data_fields");
  denied({ ...packet("token_exchange"), boundaryEvidence: { ...evidence.token_exchange, refreshToken: "fake-not-real" } }, "stage_evidence_mismatch");
});
test("only the exact sole readonly scope, not analytics or write extras", () => {
  denied({ ...packet(), requestedScopes: [GSC_READONLY_SCOPE, "https://www.googleapis.com/auth/analytics.readonly"] }, "scope_must_be_exact_gsc_readonly");
  denied({ ...packet(), requestedScopes: ["https://www.googleapis.com/auth/webmasters"] }, "scope_must_be_exact_gsc_readonly");
  denied({ ...packet("token_exchange"), boundaryEvidence: {
    ...evidence.token_exchange, grantedScopes: [GSC_READONLY_SCOPE, "https://www.googleapis.com/auth/analytics.readonly"],
  } }, "stage_evidence_mismatch");
  const scopes = [GSC_READONLY_SCOPE] as string[] & { extra?: boolean };
  scopes.extra = true;
  denied({ ...packet(), requestedScopes: scopes }, "scope_must_be_exact_gsc_readonly");
});
test("discovery is single-shot and bounded, with no authorization", () => {
  const p = packet("property_discovery");
  denied({ ...p, boundaryEvidence: { ...p.boundaryEvidence, retryEnabled: true } }, "stage_evidence_mismatch");
  denied({ ...p, boundaryEvidence: { ...p.boundaryEvidence, maxAttempts: 2 } }, "stage_evidence_mismatch");
  denied({ ...p, boundaryEvidence: { ...p.boundaryEvidence, maxProperties: 257 } }, "stage_evidence_mismatch");
  blocked(reviewGscS0cOperation(p));
});
test("timestamp fields are canonical UTC and at most ten minutes, not runtime freshness", () => {
  denied({ ...packet(), issuedAtUtc: "invalid" }, "timestamp_window_invalid");
  denied({ ...packet(), expiresAtUtc: "2026-10-24T17:00:00.000Z" }, "timestamp_window_invalid");
  denied({ ...packet(), expiresAtUtc: "2026-10-24T17:10:01.000Z" }, "timestamp_window_invalid");
  denied({ ...packet(), expiresAtUtc: "2026-02-30T17:10:00.000Z" }, "timestamp_window_invalid");
  // A stale synthetic packet can remain structurally conformant: never permission.
  const old = reviewGscS0cOperation(packet());
  assert.equal(old.structurallyConformant, true);
  blocked(old);
});
test("missing, hostile, nonenumerable and symbol keys are fail closed", () => {
  for (const v of [null, undefined, [], "", 3, new Date()]) denied(v, "packet_requires_exact_own_data_fields");
  denied({ ...packet(), [Symbol("grant")]: true }, "packet_requires_exact_own_data_fields");
  const hidden = { ...packet() };
  Object.defineProperty(hidden, "secret", { value: "fake", enumerable: false });
  denied(hidden, "packet_requires_exact_own_data_fields");
  let getterCalled = false;
  const accessor = { ...packet() };
  Object.defineProperty(accessor, "principalFingerprint", {
    enumerable: true, get() { getterCalled = true; throw new Error("getter-called"); },
  });
  denied(accessor, "packet_requires_exact_own_data_fields");
  assert.equal(getterCalled, false);
});
test("Proxy reads and revoked Proxies never authorize, including nested evidence", () => {
  let read = false;
  const proxy = new Proxy(packet(), {
    get() { read = true; throw new Error("forbidden direct read"); },
  });
  const r = reviewGscS0cOperation(proxy);
  assert.equal(r.structurallyConformant, true);
  assert.equal(read, false);
  blocked(r);
  const revoked = Proxy.revocable(packet(), {});
  revoked.revoke();
  denied(revoked.proxy, "packet_requires_exact_own_data_fields");
  let nestedRead = false;
  const nested = new Proxy({ ...evidence.callback_state }, {
    get() { nestedRead = true; throw new Error("nested direct read"); },
  });
  const nestedResult = reviewGscS0cOperation({ ...packet("callback_state"), boundaryEvidence: nested });
  assert.equal(nestedResult.structurallyConformant, true);
  assert.equal(nestedRead, false);
  blocked(nestedResult);
});
test("diagnostics do not reproduce caller tokens or auth codes", () => {
  const secret = "synthetic-secret-code-must-not-appear";
  const r = reviewGscS0cOperation({ ...packet(), authorizationCode: secret });
  assert.equal(JSON.stringify(r).includes(secret), false);
  blocked(r);
});
