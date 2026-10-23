import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import {
  CVI_SOURCE_LEDGER_BINDING_VERSION,
  type CviSourceLedgerBinding,
} from "./cvi-source-ledger-binding-contract.js";
import {
  evaluateCviBusinessFactFreshness,
  type CviBusinessFactInput,
} from "./cvi-business-truth-freshness-contract.js";

const fp = (n: number) => n.toString(16).padStart(64, "0");
function binding(): CviSourceLedgerBinding {
  const base = {
    version: CVI_SOURCE_LEDGER_BINDING_VERSION,
    status: "SOURCE_BOUND" as const,
    sourceAssessmentFingerprint: fp(1),
    sourceOpportunityId: "opportunity-1",
    sourceOpportunityFingerprint: fp(2),
    sourceModelFingerprint: fp(3),
    scope: { tenantId: "tenant-1", siteId: "site-1", siteBindingEvidenceFingerprint: fp(4) },
    sourceLedgerId: fp(5),
    sourceLedgerFingerprint: fp(6),
    evidenceFingerprints: [fp(7)],
    missingEvidenceFingerprints: [] as string[],
    reasonCodes: ["all_requested_evidence_bound"],
    trust: {
      sourceLedgerIntegrityChecked: true as const,
      lineageMatched: true as const,
      independentlyCertifiedTruth: false as const,
      tenantAuthorityVerified: false as const,
      sourceUsageRightsVerified: false as const,
      verifiedOriginalContribution: false as const,
    },
    semantics: {
      deterministic: true as const,
      readOnly: true as const,
      performsNetworkOperation: false as const,
      performsPersistence: false as const,
      publicationAuthorized: false as const,
      executionAuthorized: false as const,
    },
  };
  return {
    ...base,
    bindingFingerprint: stableEvidenceHash({ purpose: CVI_SOURCE_LEDGER_BINDING_VERSION, ...base }),
  };
}
const at = "2026-10-08T12:00:00.000Z";
function fact(): CviBusinessFactInput {
  return {
    factKey: "returns.window", evidenceFingerprint: fp(7),
    observedAt: "2026-10-07T00:00:00.000Z",
    expiresAt: "2026-10-09T00:00:00.000Z",
    expectedTenantId: "tenant-1", expectedSiteId: "site-1",
    conflictsKnown: false,
  };
}
test("current linked fact remains review-only, never independently certified", () => {
  const result = evaluateCviBusinessFactFreshness({ binding: binding(), facts: [fact()], evaluatedAt: at });
  assert.equal(result.status, "RESEARCH_REVIEW_ONLY");
  assert.equal(result.facts[0]?.status, "EVIDENCE_LINKED_CURRENT");
  assert.equal(result.trust.businessTruthIndependentlyVerified, false);
  assert.equal(result.trust.tenantAuthorityIndependentlyVerified, false);
  assert.equal(result.semantics.publicationAuthorized, false);
});
test("stale evidence is blocked including expiry boundary", () => {
  const result = evaluateCviBusinessFactFreshness({
    binding: binding(), facts: [{ ...fact(), expiresAt: at }], evaluatedAt: at,
  });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.facts[0]?.status, "STALE");
});
test("unknown evidence and conflicting facts block", () => {
  const missing = evaluateCviBusinessFactFreshness({
    binding: binding(), facts: [{ ...fact(), evidenceFingerprint: fp(99) }], evaluatedAt: at,
  });
  assert.equal(missing.facts[0]?.status, "MISSING_EVIDENCE");
  const conflict = evaluateCviBusinessFactFreshness({
    binding: binding(), facts: [{ ...fact(), conflictsKnown: true }], evaluatedAt: at,
  });
  assert.equal(conflict.facts[0]?.status, "REVIEW_REQUIRED");
});
test("rejects site or tenant mismatch and future capture", () => {
  for (const overrides of [{ expectedSiteId: "another-site" }, { expectedTenantId: "another-tenant" }, { observedAt: "2026-10-09T00:00:00.000Z" }]) {
    assert.throws(() => evaluateCviBusinessFactFreshness({
      binding: binding(), facts: [{ ...fact(), ...overrides }], evaluatedAt: at,
    }));
  }
});
test("rejects duplicate facts, malformed time and changed upstream hash", () => {
  assert.throws(() => evaluateCviBusinessFactFreshness({
    binding: binding(), facts: [fact(), fact()], evaluatedAt: at,
  }));
  assert.throws(() => evaluateCviBusinessFactFreshness({
    binding: binding(), facts: [fact()], evaluatedAt: "2026-99-08T12:00:00.000Z",
  }));
  assert.throws(() => evaluateCviBusinessFactFreshness({
    binding: { ...binding(), bindingFingerprint: fp(99) }, facts: [fact()], evaluatedAt: at,
  }));
});
test("input ordering cannot change deterministic report", () => {
  const second = { ...fact(), factKey: "pricing.current" };
  const a = evaluateCviBusinessFactFreshness({ binding: binding(), facts: [fact(), second], evaluatedAt: at });
  const b = evaluateCviBusinessFactFreshness({ binding: binding(), facts: [second, fact()], evaluatedAt: at });
  assert.equal(a.reportFingerprint, b.reportFingerprint);
});
test("no network, database, scheduler, randomness or implicit time", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(here, "cvi-business-truth-freshness-contract.ts"), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(source, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(source, /setTimeout|setInterval|queueMicrotask|Date\.now|Math\.random/);
});
