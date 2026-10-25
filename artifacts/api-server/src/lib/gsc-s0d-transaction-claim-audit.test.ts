import assert from "node:assert/strict";
import test from "node:test";
import { GSC_READONLY_PROFILE, GSC_READONLY_SCOPE } from "@seo-engine/oauth-connection-manager/gsc-readonly";
import {
  GSC_S0_CANONICAL_ORIGIN, GSC_S0_HISTORICAL_SITE_ID, GSC_S0_TARGET_PROPERTY,
} from "./gsc-stage0-static-review.js";
import {
  GSC_S0D_VERSION, GSC_S0D_STAGES, auditGscS0dClaimChain,
  type GscS0dClaimChain, type GscS0dClaimEvent, type GscS0dAudit,
} from "./gsc-s0d-transaction-claim-audit.js";

const id = (v: string) => v.repeat(64);
const bindings = {
  transactionFingerprint: id("1"), organizationFingerprint: id("2"),
  principalFingerprint: id("3"), sessionFingerprint: id("4"),
  clientGenerationFingerprint: id("5"), redirectFingerprint: id("6"),
};
function fixture(length: number = GSC_S0D_STAGES.length): GscS0dClaimChain {
  const events = GSC_S0D_STAGES.slice(0, length).map((stage, i): GscS0dClaimEvent => ({
    stage, atUtc: new Date(Date.parse("2026-10-24T17:00:00.000Z") + i * 60_000).toISOString(),
    claimFingerprint: id("abcdef"[i]!), ...bindings,
  }));
  return {
    version: GSC_S0D_VERSION, profile: GSC_READONLY_PROFILE,
    siteId: GSC_S0_HISTORICAL_SITE_ID, canonicalOrigin: GSC_S0_CANONICAL_ORIGIN,
    targetProperty: GSC_S0_TARGET_PROPERTY, requestedScopes: [GSC_READONLY_SCOPE],
    ...bindings, events,
  };
}
function neverAllowed(result: GscS0dAudit): void {
  assert.equal(result.kind, "untrusted_claim_sequence_review_only");
  assert.deepEqual(
    [result.trustedTransactionVerified, result.singleUseStateVerified,
      result.tokenExchangeAuthorized, result.credentialWriteAuthorized,
      result.providerReadAuthorized, result.runtimeBindingAuthorized],
    [false, false, false, false, false, false],
  );
}
function rejected(value: unknown, code: string): void {
  const out = auditGscS0dClaimChain(value);
  assert.equal(out.structurallyConformant, false);
  assert.equal(out.completeClaimChain, false);
  assert.ok(out.findings.includes(code), JSON.stringify(out.findings));
  neverAllowed(out);
}

test("complete synthetic chain has syntactic completion but grants no authority", () => {
  const r = auditGscS0dClaimChain(fixture());
  assert.equal(r.structurallyConformant, true, JSON.stringify(r.findings));
  assert.equal(r.completeClaimChain, true);
  assert.equal(r.claimedStages, 6);
  neverAllowed(r);
});
test("a partial claim prefix cannot silently authorize or imply completion", () => {
  for (let n = 1; n < 6; n++) {
    const r = auditGscS0dClaimChain(fixture(n));
    assert.equal(r.structurallyConformant, true);
    assert.equal(r.completeClaimChain, false);
    assert.equal(r.claimedStages, n);
    neverAllowed(r);
  }
});
test("one-time consumption and prerequisites are required only as shapes, never proof", () => {
  const x = fixture();
  rejected({ ...x, events: [x.events[0], x.events[2], x.events[3]] }, "out_of_order_or_replayed_stage");
  rejected({ ...x, events: [x.events[0], x.events[1], x.events[2], x.events[2]] }, "out_of_order_or_replayed_stage");
  rejected({ ...x, events: [x.events[0], x.events[1], x.events[2], x.events[3], x.events[4], x.events[4]] }, "out_of_order_or_replayed_stage");
  rejected({ ...x, events: [x.events[0], x.events[1], x.events[2], x.events[3], x.events[4], x.events[5], x.events[5]] }, "claim_events_must_be_bounded_dense_array");
});
test("identity, principal, session, client generation and transaction cannot drift between claims", () => {
  for (const key of Object.keys(bindings) as (keyof typeof bindings)[]) {
    const x = fixture();
    const altered = x.events.map(e => ({ ...e }));
    altered[3]![key] = id("e");
    rejected({ ...x, events: altered }, "actor_session_site_client_or_transaction_drift");
  }
});
test("first-party target is historical candidate only; no scope broadening or legacy profile", () => {
  rejected({ ...fixture(), profile: "legacy_google" }, "wrong_version_or_profile");
  rejected({ ...fixture(), siteId: "unrelated-uuid" }, "unverified_target_candidate_mismatch");
  rejected({ ...fixture(), canonicalOrigin: "https://other.example" }, "unverified_target_candidate_mismatch");
  rejected({ ...fixture(), targetProperty: "sc-domain:other.example" }, "unverified_target_candidate_mismatch");
  rejected({ ...fixture(), requestedScopes: ["https://www.googleapis.com/auth/webmasters"] }, "readonly_scope_required");
  rejected({ ...fixture(), requestedScopes: [GSC_READONLY_SCOPE, "https://www.googleapis.com/auth/analytics.readonly"] }, "readonly_scope_required");
});
test("state consumption claim outside ten minute TTL is rejected", () => {
  const x = fixture();
  const late = x.events.map(e => ({ ...e }));
  late[2]!.atUtc = "2026-10-24T17:10:01.000Z";
  rejected({ ...x, events: late }, "claimed_consumption_outside_ttl");
  const equal = x.events.map(e => ({ ...e }));
  equal[2]!.atUtc = equal[0]!.atUtc;
  rejected({ ...x, events: equal }, "claimed_consumption_outside_ttl");
});
test("nonmonotonic claim time, invalid calendar date and duplicate claim receipt rejected", () => {
  const x = fixture();
  const times = x.events.map(e => ({ ...e }));
  times[4]!.atUtc = times[3]!.atUtc;
  rejected({ ...x, events: times }, "event_time_invalid_or_nonmonotonic");
  const badDate = x.events.map(e => ({ ...e }));
  badDate[1]!.atUtc = "2026-02-30T17:01:00.000Z";
  rejected({ ...x, events: badDate }, "event_time_invalid_or_nonmonotonic");
  const replay = x.events.map(e => ({ ...e }));
  replay[3]!.claimFingerprint = replay[2]!.claimFingerprint;
  rejected({ ...x, events: replay }, "claim_fingerprint_missing_or_reused");
});
test("secrets, access tokens, code verifier and fake authorizations forbidden even as hidden keys", () => {
  rejected({ ...fixture(), accessToken: "secret" }, "claim_chain_requires_exact_own_data_fields");
  rejected({ ...fixture(), codeVerifier: "secret" }, "claim_chain_requires_exact_own_data_fields");
  rejected({ ...fixture(), consentAuthorized: true }, "claim_chain_requires_exact_own_data_fields");
  const x = fixture();
  const events = x.events.map(e => ({ ...e }));
  (events[0] as Record<string, unknown>).authorizationCode = "secret";
  rejected({ ...x, events }, "event_requires_exact_own_data_fields");
  const hidden = { ...fixture() };
  Object.defineProperty(hidden, "refreshToken", { value: "secret", enumerable: false });
  rejected(hidden, "claim_chain_requires_exact_own_data_fields");
});
test("holes, excess properties, symbol keys and malformed arrays rejected", () => {
  const x = fixture();
  const hole = Array.from(x.events);
  delete hole[2];
  rejected({ ...x, events: hole }, "claim_events_must_be_bounded_dense_array");
  const extras = Array.from(x.events) as unknown[] & { extra?: boolean };
  extras.extra = true;
  rejected({ ...x, events: extras }, "claim_events_must_be_bounded_dense_array");
  rejected({ ...x, events: { 0: x.events[0], length: 1 } }, "claim_events_must_be_bounded_dense_array");
  rejected({ ...x, [Symbol("role")]: "admin" }, "claim_chain_requires_exact_own_data_fields");
});
test("revoked Proxy and accessor cannot execute adversarial get traps", () => {
  const revoked = Proxy.revocable(fixture(), {});
  revoked.revoke();
  rejected(revoked.proxy, "claim_chain_requires_exact_own_data_fields");
  let reads = 0;
  const input = { ...fixture() };
  Object.defineProperty(input, "principalFingerprint", {
    enumerable: true, get() { reads++; throw new Error("never evaluate getter"); },
  });
  rejected(input, "claim_chain_requires_exact_own_data_fields");
  assert.equal(reads, 0);
});
test("Proxy descriptor snapshots allow shape reads without untrusted get traps", () => {
  let reads = 0;
  const x = fixture();
  const proxy = new Proxy(x, { get() { reads++; throw new Error("forbidden property get"); } });
  const result = auditGscS0dClaimChain(proxy);
  assert.equal(result.structurallyConformant, true);
  assert.equal(reads, 0);
  neverAllowed(result);
});
test("audit findings cannot echo user-supplied credentials", () => {
  const marker = "secret-or-code-never-log";
  const result = auditGscS0dClaimChain({ ...fixture(), authorizationCode: marker });
  assert.equal(JSON.stringify(result).includes(marker), false);
  neverAllowed(result);
});
