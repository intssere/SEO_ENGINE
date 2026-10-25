import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import {
  CVI_CLAIM_PROVENANCE_VERSION,
  type CviClaimProvenanceReport,
} from "./cvi-claim-provenance-contract.js";
import {
  CVI_BUSINESS_TRUTH_FRESHNESS_VERSION,
  type CviBusinessTruthFreshnessReport,
} from "./cvi-business-truth-freshness-contract.js";
import {
  evaluateCviAuthorityAdmission,
  type CviAuthorityAccessEvaluation,
} from "./cvi-authority-admission-contract.js";
const fp = (n: number) => n.toString(16).padStart(64, "0");
const at = "2026-10-08T12:00:00.000Z";
function claimReport(): CviClaimProvenanceReport {
  const base = {
    version: CVI_CLAIM_PROVENANCE_VERSION,
    sourceBindingFingerprint: fp(1),
    sourceLedgerFingerprint: fp(2),
    claims: [],
    disposition: "RESEARCH_REVIEW_ONLY" as const,
    trust: {
      sourceReferenceIntegrityChecked: true as const,
      claimsIndependentlyVerified: false as const,
      originalityIndependentlyVerified: false as const,
      licensingIndependentlyVerified: false as const,
      reviewerAuthorityVerified: false as const,
      tenantAuthorityVerified: false as const,
    },
    semantics: {
      deterministic: true as const,
      readOnly: true as const,
      publicationAuthorized: false as const,
      executionAuthorized: false as const,
      performsNetworkOperation: false as const,
      performsPersistence: false as const,
    },
  };
  return { ...base, reportFingerprint: stableEvidenceHash({ purpose: CVI_CLAIM_PROVENANCE_VERSION, ...base }) };
}
function businessReport(): CviBusinessTruthFreshnessReport {
  const base = {
    version: CVI_BUSINESS_TRUTH_FRESHNESS_VERSION,
    bindingFingerprint: fp(1),
    evaluatedAt: at,
    scope: { tenantId: "tenant-1", siteId: "site-1", siteBindingEvidenceFingerprint: fp(3) },
    facts: [],
    status: "RESEARCH_REVIEW_ONLY" as const,
    trust: {
      evidenceLinkedNotFactuallyCertified: true as const,
      tenantAuthorityIndependentlyVerified: false as const,
      businessTruthIndependentlyVerified: false as const,
      permissionToPublish: false as const,
    },
    semantics: {
      deterministic: true as const,
      readOnly: true as const,
      networkCalls: false as const,
      persistence: false as const,
      executionAuthorized: false as const,
      publicationAuthorized: false as const,
    },
  };
  return { ...base, reportFingerprint: stableEvidenceHash({ purpose: CVI_BUSINESS_TRUTH_FRESHNESS_VERSION, ...base }) };
}
function access(): CviAuthorityAccessEvaluation {
  return {
    principalSubject: "subject-1",
    sessionExpiresAt: "2026-10-08T13:00:00.000Z",
    checkedAt: "2026-10-08T11:30:00.000Z",
    tenantId: "tenant-1",
    siteId: "site-1",
    siteBindingFingerprint: fp(3),
    access: "NOT_RESOLVED",
    accessSource: "unresolved",
    connectionAccess: "NOT_RESOLVED",
    tenantMembershipSource: "unresolved",
  };
}
function report(overrides: Partial<CviAuthorityAccessEvaluation> = {}) {
  return evaluateCviAuthorityAdmission({
    claimReport: claimReport(),
    businessReport: businessReport(),
    accessEvaluation: { ...access(), ...overrides },
    evaluatedAt: at,
  });
}
test("unresolved authority always requests evidence and never publishes", () => {
  const result = report();
  assert.equal(result.outcome, "REQUEST_EVIDENCE");
  assert.equal(result.semantics.publicationAuthorized, false);
  assert.equal(result.semantics.executionAuthorized, false);
  assert.equal(result.semantics.independentEvidenceTruthVerified, false);
});
test("declared trusted access still requires independent truth and expert review", () => {
  const result = report({
    access: "VERIFIED_READ",
    accessSource: "trusted_backend_resolver",
    connectionAccess: "VERIFIED_READ",
    tenantMembershipSource: "verified_server_side_record",
  });
  assert.equal(result.outcome, "HUMAN_REVIEW_REQUIRED");
  assert.ok(result.reasonCodes.includes("independent_truth_and_editorial_authority_not_verified"));
});
test("tenant drift, site drift and changed binding are denied", () => {
  for (const item of [
    { tenantId: "tenant-2" }, { siteId: "site-2" }, { siteBindingFingerprint: fp(9) },
  ]) {
    assert.equal(report(item).outcome, "DENY");
  }
});
test("expired session denied and malformed time rejected", () => {
  assert.equal(report({ sessionExpiresAt: at }).outcome, "DENY");
  assert.throws(() => report({ checkedAt: "invalid" }), /invalid_timestamp/);
  assert.throws(() => report({ checkedAt: "2026-10-09T11:00:00.000Z" }), /invalid_session_window/);
});
test("tampered or mismatched report provenance fails closed", () => {
  assert.throws(() => evaluateCviAuthorityAdmission({
    claimReport: { ...claimReport(), reportFingerprint: fp(99) },
    businessReport: businessReport(),
    accessEvaluation: access(),
    evaluatedAt: at,
  }));
  const initial = claimReport();
  const modified = { ...initial, sourceBindingFingerprint: fp(9) };
  const { reportFingerprint: _discard, ...body } = modified;
  const coherent = {
    ...body,
    reportFingerprint: stableEvidenceHash({ purpose: CVI_CLAIM_PROVENANCE_VERSION, ...body }),
  };
  assert.equal(evaluateCviAuthorityAdmission({
    claimReport: coherent,
    businessReport: businessReport(),
    accessEvaluation: access(),
    evaluatedAt: at,
  }).outcome, "DENY");
});
test("deterministic report fingerprint", () => {
  assert.equal(report().reportFingerprint, report().reportFingerprint);
});
test("no provider, persistence, environment or implicit clock", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(here, "cvi-authority-admission-contract.ts"), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(source, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(source, /setTimeout|setInterval|queueMicrotask|Date\.now|Math\.random/);
});
