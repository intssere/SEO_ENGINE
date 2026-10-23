import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import {
  CVI_SOURCE_LEDGER_BINDING_VERSION,
  type CviSourceLedgerBinding,
} from "./cvi-source-ledger-binding-contract.js";

export const CVI_BUSINESS_TRUTH_FRESHNESS_VERSION = "cvi-1b2-business-truth-freshness-v1" as const;
export type CviBusinessFactStatus = "EVIDENCE_LINKED_CURRENT" | "STALE" | "MISSING_EVIDENCE" | "REVIEW_REQUIRED";

export type CviBusinessFactInput = Readonly<{
  factKey: string;
  evidenceFingerprint: string;
  observedAt: string;
  expiresAt: string;
  expectedTenantId: string;
  expectedSiteId: string;
  conflictsKnown: boolean;
}>;

export type CviBusinessTruthFreshnessReport = Readonly<{
  version: typeof CVI_BUSINESS_TRUTH_FRESHNESS_VERSION;
  bindingFingerprint: string;
  evaluatedAt: string;
  scope: CviSourceLedgerBinding["scope"];
  facts: readonly Readonly<{
    factKey: string;
    evidenceFingerprint: string;
    observedAt: string;
    expiresAt: string;
    status: CviBusinessFactStatus;
  }>[];
  status: "RESEARCH_REVIEW_ONLY" | "BLOCKED";
  trust: Readonly<{
    evidenceLinkedNotFactuallyCertified: true;
    tenantAuthorityIndependentlyVerified: false;
    businessTruthIndependentlyVerified: false;
    permissionToPublish: false;
  }>;
  semantics: Readonly<{
    deterministic: true;
    readOnly: true;
    networkCalls: false;
    persistence: false;
    executionAuthorized: false;
    publicationAuthorized: false;
  }>;
  reportFingerprint: string;
}>;

const HEX64 = /^[0-9a-f]{64}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const FACT = /^[a-z][a-z0-9._:-]{0,127}$/;
function instant(value: string, field: string): number {
  if (typeof value !== "string" || !ISO.test(value)) throw new Error(`cvi_1b2_invalid_${field}`);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== value) throw new Error(`cvi_1b2_invalid_${field}`);
  return ms;
}

export function evaluateCviBusinessFactFreshness(input: Readonly<{
  binding: CviSourceLedgerBinding;
  facts: readonly CviBusinessFactInput[];
  evaluatedAt: string;
}>): CviBusinessTruthFreshnessReport {
  const { binding } = input;
  if (!binding || binding.version !== CVI_SOURCE_LEDGER_BINDING_VERSION
    || binding.trust.independentlyCertifiedTruth !== false
    || binding.trust.tenantAuthorityVerified !== false
    || binding.semantics.executionAuthorized !== false
    || binding.semantics.publicationAuthorized !== false) {
    throw new Error("cvi_1b2_unsafe_binding");
  }
  const { bindingFingerprint, ...bindingBase } = binding;
  if (typeof bindingFingerprint !== "string" || !HEX64.test(bindingFingerprint)
    || bindingFingerprint !== stableEvidenceHash({ purpose: CVI_SOURCE_LEDGER_BINDING_VERSION, ...bindingBase })) {
    throw new Error("cvi_1b2_binding_integrity_mismatch");
  }
  const evaluationTime = instant(input.evaluatedAt, "evaluated_at");
  if (!Array.isArray(input.facts) || input.facts.length === 0 || input.facts.length > 128) {
    throw new Error("cvi_1b2_fact_count_invalid");
  }
  if (!Array.isArray(binding.evidenceFingerprints) || !Array.isArray(binding.missingEvidenceFingerprints)) {
    throw new Error("cvi_1b2_evidence_list_invalid");
  }
  const evidence = new Set(binding.evidenceFingerprints);
  if (evidence.size !== binding.evidenceFingerprints.length
    || binding.evidenceFingerprints.some(x => !HEX64.test(x))) throw new Error("cvi_1b2_invalid_binding_evidence");
  const seen = new Set<string>();
  const facts = input.facts.map(fact => {
    if (!fact || typeof fact.factKey !== "string" || !FACT.test(fact.factKey) || seen.has(fact.factKey)) {
      throw new Error("cvi_1b2_invalid_or_duplicate_fact_key");
    }
    seen.add(fact.factKey);
    if (fact.expectedTenantId !== binding.scope.tenantId || fact.expectedSiteId !== binding.scope.siteId) {
      throw new Error("cvi_1b2_scope_mismatch");
    }
    if (typeof fact.evidenceFingerprint !== "string" || !HEX64.test(fact.evidenceFingerprint)
      || typeof fact.conflictsKnown !== "boolean") throw new Error("cvi_1b2_invalid_fact");
    const observed = instant(fact.observedAt, "observed_at");
    const expires = instant(fact.expiresAt, "expires_at");
    if (expires <= observed || observed > evaluationTime) throw new Error("cvi_1b2_invalid_fact_window");
    const status: CviBusinessFactStatus = fact.conflictsKnown ? "REVIEW_REQUIRED"
      : !evidence.has(fact.evidenceFingerprint) ? "MISSING_EVIDENCE"
      : evaluationTime >= expires ? "STALE" : "EVIDENCE_LINKED_CURRENT";
    return {
      factKey: fact.factKey, evidenceFingerprint: fact.evidenceFingerprint,
      observedAt: fact.observedAt, expiresAt: fact.expiresAt, status,
    };
  }).sort((a,b) => a.factKey.localeCompare(b.factKey));
  const status = binding.status === "SOURCE_BOUND"
    && facts.every(x => x.status === "EVIDENCE_LINKED_CURRENT") ? "RESEARCH_REVIEW_ONLY" as const : "BLOCKED" as const;
  const base = {
    version: CVI_BUSINESS_TRUTH_FRESHNESS_VERSION,
    bindingFingerprint, evaluatedAt: input.evaluatedAt, scope: binding.scope,
    facts, status,
    trust: {
      evidenceLinkedNotFactuallyCertified: true as const,
      tenantAuthorityIndependentlyVerified: false as const,
      businessTruthIndependentlyVerified: false as const,
      permissionToPublish: false as const,
    },
    semantics: {
      deterministic: true as const, readOnly: true as const, networkCalls: false as const,
      persistence: false as const, executionAuthorized: false as const,
      publicationAuthorized: false as const,
    },
  };
  return { ...base, reportFingerprint: stableEvidenceHash({ purpose: CVI_BUSINESS_TRUTH_FRESHNESS_VERSION, ...base }) };
}
