import type {
  OpportunityRecord,
  ProposalQualityCheck,
  ProposalRecord,
} from "@workspace/api-client-react";

export type EvidenceDetailKey =
  | "freshness"
  | "support"
  | "retention_history"
  | "conflict"
  | "corroboration";

export type EvidenceDetailState = {
  key: EvidenceDetailKey;
  label: string;
  availability: "unavailable";
  reason: string;
};

export type EvidenceReferenceState = {
  declaredCount: number;
  ids: string[];
  qualityEvidenceIds: string[];
  completeness: "complete" | "partial" | "unavailable";
  note: string;
};

export type EvidenceProvenanceEntry = {
  source: string;
  detail: string;
};

export type EvidenceQualitySummary = {
  status: "pass" | "warning" | "blocked" | "unavailable";
  score: number | null;
  approvalEligible: boolean | null;
  checks: ProposalQualityCheck[];
  blockingReasons: string[];
  warnings: string[];
};

export type EvidenceCoverageSummary = {
  kind: "whole_site" | "bounded_pilot" | "unavailable";
  label: string;
};

export type EvidenceDrawerModel = {
  subjectId: string;
  subjectType: "proposal" | "opportunity";
  title: string;
  subtitle: string;
  url: string | null;
  query: string | null;
  confidence: number | null;
  rationale: string;
  expectedBenefit: string | null;
  whyQualifies: string | null;
  evidenceSufficient: boolean | null;
  references: EvidenceReferenceState;
  quality: EvidenceQualitySummary;
  provenance: EvidenceProvenanceEntry[];
  coverage: EvidenceCoverageSummary;
  detailStates: EvidenceDetailState[];
};

export type ProposalEvidenceInput = Pick<
  ProposalRecord,
  | "id"
  | "title"
  | "action_type"
  | "field"
  | "url"
  | "query"
  | "confidence"
  | "rationale"
  | "expected_benefit"
  | "evidence_ids"
  | "evidence_count"
  | "evidence_sufficient"
  | "quality_status"
  | "quality_score"
  | "quality_approval_eligible"
  | "quality_checks"
  | "quality_blocking_reasons"
  | "quality_warnings"
  | "quality_evidence_ids"
  | "semantic_provenance"
  | "bounded_pilot"
  | "whole_site_coverage"
>;

export type OpportunityEvidenceInput = Pick<
  OpportunityRecord,
  | "id"
  | "title"
  | "opportunity_type"
  | "url"
  | "query"
  | "confidence"
  | "rationale"
  | "evidence_count"
  | "why_qualifies"
>;

const DETAIL_UNAVAILABLE_REASON =
  "Detailed P3 evidence state is not exposed by the current frontend API contract.";

function boundedCount(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function uniqueStrings(values: readonly string[] | undefined) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values ?? []) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}

function normalizeProvenance(
  values: ProposalRecord["semantic_provenance"],
): EvidenceProvenanceEntry[] {
  if (!Array.isArray(values)) return [];
  return values.map((value) => {
    const record =
      value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : {};
    const source =
      typeof record.source === "string" && record.source.trim()
        ? record.source.trim()
        : "Unspecified source";
    const text =
      typeof record.text === "string" && record.text.trim()
        ? record.text.trim()
        : JSON.stringify(record);
    return {
      source,
      detail: text || "No provenance detail exposed.",
    };
  });
}

function unavailableDetailStates(): EvidenceDetailState[] {
  return [
    { key: "freshness", label: "Freshness", availability: "unavailable", reason: DETAIL_UNAVAILABLE_REASON },
    { key: "support", label: "Support tier", availability: "unavailable", reason: DETAIL_UNAVAILABLE_REASON },
    { key: "retention_history", label: "Retention / history", availability: "unavailable", reason: DETAIL_UNAVAILABLE_REASON },
    { key: "conflict", label: "Conflict state", availability: "unavailable", reason: DETAIL_UNAVAILABLE_REASON },
    { key: "corroboration", label: "Corroboration", availability: "unavailable", reason: DETAIL_UNAVAILABLE_REASON },
  ];
}

function proposalReferenceState(input: ProposalEvidenceInput): EvidenceReferenceState {
  const ids = uniqueStrings(input.evidence_ids);
  const qualityEvidenceIds = uniqueStrings(input.quality_evidence_ids);
  const declaredCount = boundedCount(input.evidence_count);

  if (ids.length === 0) {
    return {
      declaredCount,
      ids,
      qualityEvidenceIds,
      completeness: "unavailable",
      note:
        declaredCount > 0
          ? "The proposal declares evidence, but detailed evidence IDs are not present in this row."
          : "No persisted evidence IDs are exposed for this proposal.",
    };
  }

  if (ids.length !== declaredCount) {
    return {
      declaredCount,
      ids,
      qualityEvidenceIds,
      completeness: "partial",
      note: `This row exposes ${ids.length} unique evidence ID(s) while declaring ${declaredCount}; the drawer does not synthesize missing references.`,
    };
  }

  return {
    declaredCount,
    ids,
    qualityEvidenceIds,
    completeness: "complete",
    note: "All evidence references declared by this row are exposed as IDs.",
  };
}

function proposalCoverage(input: ProposalEvidenceInput): EvidenceCoverageSummary {
  if (input.whole_site_coverage) {
    return { kind: "whole_site", label: "Whole-site coverage declared by current row" };
  }
  if (input.bounded_pilot) {
    return { kind: "bounded_pilot", label: "Bounded pilot evidence — not whole-site coverage" };
  }
  return { kind: "unavailable", label: "Coverage scope is not available from this row" };
}

export function buildProposalEvidenceDrawerModel(
  input: ProposalEvidenceInput,
): EvidenceDrawerModel {
  return {
    subjectId: input.id,
    subjectType: "proposal",
    title: input.title,
    subtitle: `${input.action_type.replaceAll("_", " ")} · ${input.field}`,
    url: input.url,
    query: input.query,
    confidence: input.confidence,
    rationale: input.rationale,
    expectedBenefit: input.expected_benefit,
    whyQualifies: null,
    evidenceSufficient: input.evidence_sufficient,
    references: proposalReferenceState(input),
    quality: {
      status: input.quality_status,
      score: input.quality_score,
      approvalEligible: input.quality_approval_eligible,
      checks: input.quality_checks.map((check) => ({
        ...check,
        evidenceIds: [...check.evidenceIds],
      })),
      blockingReasons: [...input.quality_blocking_reasons],
      warnings: [...input.quality_warnings],
    },
    provenance: normalizeProvenance(input.semantic_provenance),
    coverage: proposalCoverage(input),
    detailStates: unavailableDetailStates(),
  };
}

export function buildOpportunityEvidenceDrawerModel(
  input: OpportunityEvidenceInput,
): EvidenceDrawerModel {
  const declaredCount = boundedCount(input.evidence_count);
  return {
    subjectId: input.id,
    subjectType: "opportunity",
    title: input.title,
    subtitle: input.opportunity_type.replaceAll("_", " "),
    url: input.url,
    query: input.query,
    confidence: input.confidence,
    rationale: input.rationale,
    expectedBenefit: null,
    whyQualifies: input.why_qualifies,
    evidenceSufficient: null,
    references: {
      declaredCount,
      ids: [],
      qualityEvidenceIds: [],
      completeness: "unavailable",
      note:
        declaredCount > 0
          ? "This opportunity row exposes an evidence count but not the underlying evidence IDs."
          : "No evidence references are exposed by this opportunity row.",
    },
    quality: {
      status: "unavailable",
      score: null,
      approvalEligible: null,
      checks: [],
      blockingReasons: [],
      warnings: [],
    },
    provenance: [],
    coverage: {
      kind: "unavailable",
      label: "Coverage scope is not exposed by the current opportunity row.",
    },
    detailStates: unavailableDetailStates(),
  };
}
