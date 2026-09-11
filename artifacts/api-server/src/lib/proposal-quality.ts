import { createHash } from "node:crypto";
import type { DryRunProposal } from "./action-planner.js";
import type { CrawlPageSignal, OpportunityCandidate } from "./opportunity-engine.js";
import { containsProposalBoilerplate, hasRawTemplatePrefix } from "./proposal-content.js";
import { hasSafeSnippetIntegrity, validateCollectionMembershipCertification } from "./semantic-evidence.js";

export const proposalQualityCheckIds = [
  "evidence_consistency",
  "page_relevance",
  "active_set_uniqueness",
  "snippet_length",
  "existing_metadata_duplication",
  "unsupported_claims",
  "keyword_stuffing",
  "generic_filler",
  "format_integrity",
  "snippet_integrity",
  "collection_membership_certification",
  "template_boilerplate",
  "page_specific_content",
] as const;

export type ProposalQualityCheckId = typeof proposalQualityCheckIds[number];
export type ProposalQualityCheckStatus = "pass" | "warning" | "blocked";
export type ProposalQualityCheck = {
  id: ProposalQualityCheckId;
  label: string;
  status: ProposalQualityCheckStatus;
  score: number;
  summary: string;
  evidenceIds: string[];
};
export type ProposalQualityGate = {
  version: "proposal_quality_gate_v1";
  status: ProposalQualityCheckStatus;
  score: number;
  approvalEligible: boolean;
  checks: ProposalQualityCheck[];
  blockingReasons: string[];
  warnings: string[];
  evidenceReferences: string[];
};

export type ProposalQualityInput = {
  proposal: DryRunProposal;
  candidate: OpportunityCandidate;
  page?: CrawlPageSignal;
  activeProposalValues: Array<{ generationKey: string; value: string }>;
  evidence: {
    crawl?: string | null;
    shopify?: string | null;
    gsc?: string | null;
    opportunity?: string | null;
  };
};

export type QualityGatedProposal = DryRunProposal & {
  expectedOutcome: DryRunProposal["expectedOutcome"] & {
    qualityGate: ProposalQualityGate;
    proposalFingerprint: string;
  };
};

const normalize = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();
const comparable = (value: string | null | undefined) => normalize(value).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "");
const words = (value: string) => comparable(value).split(/\s+/).filter(Boolean);
const stopWords = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "is", "of", "on", "or", "the", "to", "with", "your"]);
const meaningfulWords = (value: string) => words(value).filter((word) => word.length > 2 && !stopWords.has(word));
const semanticSource = (input: ProposalQualityInput) => {
  const profile = input.proposal.expectedOutcome.semanticProfile;
  return [
    input.page?.title,
    input.page?.h1,
    input.page?.description,
    input.page?.contentText,
    profile?.identity.selected,
    ...(profile?.candidateSentences.map((item) => item.text) ?? []),
    ...(profile?.headings ?? []),
    profile?.composition.productType,
    profile?.composition.vendor,
    ...(profile?.composition.tags ?? []),
    ...(profile?.composition.categoryTypes ?? []),
  ].filter(Boolean).join(" ");
};
const check = (id: ProposalQualityCheckId, label: string, status: ProposalQualityCheckStatus, score: number, summary: string, evidenceIds: string[] = []): ProposalQualityCheck => ({
  id, label, status, score, summary, evidenceIds: [...new Set(evidenceIds.filter(Boolean))].sort(),
});

function relevanceCheck(input: ProposalQualityInput, proposed: string, evidenceIds: string[]) {
  if (!input.page || !proposed) return check("page_relevance", "Page relevance", "blocked", 0, "Persisted page content is unavailable.", evidenceIds);
  const source = semanticSource(input);
  const sourceTerms = new Set(meaningfulWords(source));
  const proposedTerms = [...new Set(meaningfulWords(proposed))];
  const overlap = proposedTerms.filter((term) => sourceTerms.has(term));
  const ratio = proposedTerms.length > 0 ? overlap.length / proposedTerms.length : 0;
  if (overlap.length < 2 || ratio < 0.25) return check("page_relevance", "Page relevance", "blocked", 0, "The proposed value is not sufficiently grounded in persisted page or query terms.", evidenceIds);
  if (ratio < 0.45) return check("page_relevance", "Page relevance", "warning", 65, "The proposal is relevant, but much of its wording is not directly present in persisted evidence.", evidenceIds);
  return check("page_relevance", "Page relevance", "pass", 100, "The proposed value substantially overlaps persisted page and query evidence.", evidenceIds);
}

function uniquenessCheck(input: ProposalQualityInput, proposed: string) {
  const normalized = comparable(proposed);
  const duplicates = input.activeProposalValues.filter((item) => item.generationKey !== input.candidate.generationKey && comparable(item.value) === normalized);
  return duplicates.length > 0
    ? check("active_set_uniqueness", "Active-set uniqueness", "blocked", 0, `The same proposed value appears in ${duplicates.length} other active proposal${duplicates.length === 1 ? "" : "s"}.`)
    : check("active_set_uniqueness", "Active-set uniqueness", "pass", 100, "The proposed value is unique across the active proposal set.");
}

function lengthCheck(field: string, proposed: string) {
  const length = proposed.length;
  if (field === "meta_description") {
    if (length < 50 || length > 160) return check("snippet_length", "Search-snippet length", "blocked", 0, `Meta description length is ${length}; the accepted range is 50–160 characters.`);
    if (length < 70 || length > 155) return check("snippet_length", "Search-snippet length", "warning", 70, `Meta description length is ${length}; review likely snippet presentation.`);
    return check("snippet_length", "Search-snippet length", "pass", 100, `Meta description length is ${length} characters.`);
  }
  if (field === "title" && (length < 15 || length > 70)) return check("snippet_length", "Content length", "blocked", 0, `Title length is ${length}; the accepted range is 15–70 characters.`);
  if (field === "h1" && (length < 8 || length > 120)) return check("snippet_length", "Content length", "blocked", 0, `H1 length is ${length}; the accepted range is 8–120 characters.`);
  return check("snippet_length", "Content length", "pass", 100, `The proposed ${field || "content"} length is within the deterministic gate.`);
}

function duplicationCheck(input: ProposalQualityInput, proposed: string, evidenceIds: string[]) {
  const values = [
    ["existing value", input.proposal.expectedOutcome.proposal.beforeValue],
    ["page title", input.page?.title],
    ["primary heading", input.page?.h1],
  ] as const;
  const duplicate = values.find(([, value]) => comparable(value) && comparable(value) === comparable(proposed));
  return duplicate
    ? check("existing_metadata_duplication", "Existing metadata duplication", "blocked", 0, `The proposal duplicates the observed ${duplicate[0]}.`, evidenceIds)
    : check("existing_metadata_duplication", "Existing metadata duplication", "pass", 100, "The proposed value does not duplicate the observed value, title, or H1.", evidenceIds);
}

function unsupportedClaimsCheck(input: ProposalQualityInput, proposed: string, evidenceIds: string[]) {
  const claimPatterns = [
    /\b(best|#1|number one|guaranteed|certified|lowest price|free shipping|lifetime warranty|conflict[- ]free|ethically sourced)\b/gi,
    /\b(always|never)\b/gi,
  ];
  const source = comparable(semanticSource(input));
  const claims = claimPatterns.flatMap((pattern) => proposed.match(pattern) ?? []).map((claim) => comparable(claim));
  const unsupported = [...new Set(claims.filter((claim) => claim && !source.includes(claim)))];
  return unsupported.length > 0
    ? check("unsupported_claims", "Supported claims", "blocked", 0, `Unsupported or unverifiable claims detected: ${unsupported.join(", ")}.`, evidenceIds)
    : check("unsupported_claims", "Supported claims", "pass", 100, "No unsupported promotional or absolute claims were detected.", evidenceIds);
}

function keywordStuffingCheck(input: ProposalQualityInput, proposed: string) {
  const query = comparable(input.candidate.query);
  const queryOccurrences = query ? comparable(proposed).split(query).length - 1 : 0;
  const counts = new Map<string, number>();
  for (const word of meaningfulWords(proposed)) counts.set(word, (counts.get(word) ?? 0) + 1);
  const repeated = [...counts.entries()].filter(([word, count]) => word.length > 3 && count >= 4);
  if (queryOccurrences >= 3 || repeated.length > 0) return check("keyword_stuffing", "Keyword stuffing", "blocked", 0, "The proposal repeats a tracked query or significant term excessively.");
  if (queryOccurrences === 2) return check("keyword_stuffing", "Keyword stuffing", "warning", 70, "The tracked query appears twice; review for natural phrasing.");
  return check("keyword_stuffing", "Keyword stuffing", "pass", 100, "No excessive query or keyword repetition was detected.");
}

function genericFillerCheck(proposed: string) {
  const generic = /\b(discover|learn more|shop now|unlock|elevate|explore our|premium quality|something for everyone|one-stop shop)\b/i;
  return generic.test(proposed)
    ? check("generic_filler", "Generic filler", "blocked", 0, "Generic marketing filler was detected.")
    : check("generic_filler", "Generic filler", "pass", 100, "No generic filler phrase was detected.");
}

function formatCheck(proposed: string) {
  if (!proposed) return check("format_integrity", "Format integrity", "blocked", 0, "The proposed value is empty.");
  if (/[\uFFFD<>]|&(?:amp|nbsp|quot|apos|lt|gt);|\.{3}$|…$/.test(proposed) || /\s{2,}/.test(proposed)) return check("format_integrity", "Format integrity", "blocked", 0, "The proposal contains markup, HTML entities, replacement characters, malformed spacing, or truncation markers.");
  const quoteCount = (proposed.match(/[“”"]/g) ?? []).length;
  if (quoteCount % 2 !== 0) return check("format_integrity", "Format integrity", "blocked", 0, "The proposal contains unbalanced quotation marks.");
  return check("format_integrity", "Format integrity", "pass", 100, "No truncation or formatting defect was detected.");
}

function snippetIntegrityCheck(field: string, proposed: string) {
  if (field !== "meta_description") return check("snippet_integrity", "Semantic snippet integrity", "pass", 100, "Semantic snippet integrity is not applicable to this field.");
  return hasSafeSnippetIntegrity(proposed)
    ? check("snippet_integrity", "Semantic snippet integrity", "pass", 100, "The meta description is grammatically closed and free of malformed or dangling endings.")
    : check("snippet_integrity", "Semantic snippet integrity", "blocked", 0, "The meta description has an incomplete, dangling, malformed, or syntactically unsafe ending.");
}

function collectionMembershipCertificationCheck(input: ProposalQualityInput) {
  const profile = input.proposal.expectedOutcome.semanticProfile;
  const compositionUsed = profile?.candidateSentences.some((item) => item.source === "shopify_collection_composition") === true;
  if (!compositionUsed) {
    return check("collection_membership_certification", "Collection membership certification", "pass", 100, "Direct collection membership certification is not required for this proposal.");
  }
  const result = validateCollectionMembershipCertification(profile?.composition.membershipCertification, profile?.path ?? "");
  return result.valid
    ? check("collection_membership_certification", "Collection membership certification", "pass", 100, "The composition is bound to complete, internally consistent direct collection membership evidence.")
    : check("collection_membership_certification", "Collection membership certification", "blocked", 0, `Direct collection membership evidence is missing or inconsistent: ${result.reason}.`);
}

function templateBoilerplateCheck(input: ProposalQualityInput, proposed: string, evidenceIds: string[]) {
  if (containsProposalBoilerplate(proposed)) return check("template_boilerplate", "Template/navigation boilerplate", "blocked", 0, "Known navigation, header/footer, utility, or promotional template text is not valid page metadata.", evidenceIds);
  if (hasRawTemplatePrefix(proposed, input.page)) return check("template_boilerplate", "Template/navigation boilerplate", "blocked", 0, "The proposal contains a raw prefix from the crawled page template.", evidenceIds);
  return check("template_boilerplate", "Template/navigation boilerplate", "pass", 100, "No known template or navigation boilerplate was detected.", evidenceIds);
}

function pageSpecificContentCheck(input: ProposalQualityInput, proposed: string, evidenceIds: string[]) {
  if (!input.page || !proposed) return check("page_specific_content", "Page-specific content", "blocked", 0, "A persisted page is required to construct page-specific metadata.", evidenceIds);
  const profile = input.proposal.expectedOutcome.semanticProfile;
  const identity = comparable(profile?.identity.selected || input.page.title || input.page.h1);
  const body = comparable(semanticSource(input));
  const proposedComparable = comparable(proposed);
  const identityTerms = meaningfulWords(profile?.identity.selected || input.page.title || input.page.h1 || "");
  const identityOverlap = identityTerms.filter((term) => proposedComparable.includes(term)).length;
  if (identityOverlap < Math.min(2, identityTerms.length) || body.length < 40 || (profile && profile.confidence < 0.7)) return check("page_specific_content", "Page-specific content", "blocked", 0, "The proposal lacks sufficient page identity and meaningful body evidence.", evidenceIds);
  return check("page_specific_content", "Page-specific content", "pass", 100, "The proposal contains page identity and meaningful persisted content.", evidenceIds);
}

function evidenceConsistencyCheck(input: ProposalQualityInput) {
  const proposalEvidence = new Set(input.proposal.expectedOutcome.proposal.supportingEvidenceIds);
  const refs = [input.evidence.crawl, input.evidence.shopify, input.evidence.gsc, input.evidence.opportunity].filter((value): value is string => Boolean(value));
  const missing: string[] = [];
  if (!input.page || !input.evidence.crawl || !proposalEvidence.has(input.evidence.crawl)) missing.push("crawl");
  if (!input.evidence.opportunity || !proposalEvidence.has(input.evidence.opportunity)) missing.push("opportunity");
  if (input.candidate.queryId && (!input.evidence.gsc || !proposalEvidence.has(input.evidence.gsc))) missing.push("gsc");
  if (/\/products?\//i.test(input.page?.url ?? "") && (!input.evidence.shopify || !proposalEvidence.has(input.evidence.shopify))) missing.push("shopify");
  return missing.length > 0
    ? check("evidence_consistency", "Evidence consistency", "blocked", 0, `Required persisted evidence is missing or inconsistent: ${missing.join(", ")}.`, refs)
    : check("evidence_consistency", "Evidence consistency", "pass", 100, "The proposal is consistent with its required persisted crawl, provider, and opportunity evidence.", refs);
}

export function evaluateProposalQuality(input: ProposalQualityInput): ProposalQualityGate {
  const proposed = normalize(input.proposal.expectedOutcome.proposal.afterValue);
  const proposalEvidence = input.proposal.expectedOutcome.proposal.supportingEvidenceIds;
  const checks = [
    evidenceConsistencyCheck(input),
    relevanceCheck(input, proposed, proposalEvidence),
    uniquenessCheck(input, proposed),
    lengthCheck(input.proposal.expectedOutcome.proposal.field, proposed),
    duplicationCheck(input, proposed, proposalEvidence),
    unsupportedClaimsCheck(input, proposed, proposalEvidence),
    keywordStuffingCheck(input, proposed),
    genericFillerCheck(proposed),
    formatCheck(proposed),
    snippetIntegrityCheck(input.proposal.expectedOutcome.proposal.field, proposed),
    collectionMembershipCertificationCheck(input),
    templateBoilerplateCheck(input, proposed, proposalEvidence),
    pageSpecificContentCheck(input, proposed, proposalEvidence),
  ];
  const blockingReasons = checks.filter((item) => item.status === "blocked").map((item) => `${item.id}:${item.summary}`);
  const warnings = checks.filter((item) => item.status === "warning").map((item) => `${item.id}:${item.summary}`);
  const score = Math.round(checks.reduce((total, item) => total + item.score, 0) / checks.length);
  const status: ProposalQualityCheckStatus = blockingReasons.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "pass";
  return {
    version: "proposal_quality_gate_v1",
    status,
    score,
    approvalEligible: blockingReasons.length === 0 && score >= 70 && input.proposal.expectedOutcome.proposal.evidenceSufficient,
    checks,
    blockingReasons,
    warnings,
    evidenceReferences: [...new Set(checks.flatMap((item) => item.evidenceIds))].sort(),
  };
}

export function applyProposalQualityGate(proposal: DryRunProposal, gate: ProposalQualityGate, generationKey: string): QualityGatedProposal {
  const lifecycleStage = proposal.expectedOutcome.lifecycleStage === "approval_ready" && gate.approvalEligible ? "approval_ready" : "draft_dry_run";
  const fingerprintPayload = JSON.stringify({
    generationKey,
    page: proposal.expectedOutcome.page.id,
    actionType: proposal.expectedOutcome.proposal.actionType,
    field: proposal.expectedOutcome.proposal.field,
    beforeValue: proposal.expectedOutcome.proposal.beforeValue,
    afterValue: proposal.expectedOutcome.proposal.afterValue,
    evidence: proposal.expectedOutcome.proposal.supportingEvidenceIds,
    qualityVersion: gate.version,
  });
  return {
    ...proposal,
    expectedOutcome: {
      ...proposal.expectedOutcome,
      lifecycleStage,
      executionAuthorized: false,
      publicSiteWrites: false,
      proposal: {
        ...proposal.expectedOutcome.proposal,
        blockedReason: lifecycleStage === "approval_ready"
          ? null
          : proposal.expectedOutcome.proposal.blockedReason ?? gate.blockingReasons[0] ?? "quality_gate_blocked",
      },
      qualityGate: gate,
      proposalFingerprint: createHash("sha256").update(fingerprintPayload).digest("hex"),
    },
  };
}