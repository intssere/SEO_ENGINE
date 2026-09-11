import { createHash } from "node:crypto";
import type { OpportunityCandidate } from "./opportunity-engine.js";
import {
  hasSafeSnippetIntegrity,
  validateCollectionMembershipCertification,
  type SemanticPageProfile,
} from "./semantic-evidence.js";

/**
 * This module is deliberately an adapter boundary: it has no provider, network,
 * persistence, authorization, or write side effects.  Callers supply both the
 * text generator and the deterministic quality gate.
 */
export type AiTextGenerator = (prompt: string) => Promise<string>;
export type AiProposalMode = "generated" | "refined";
export type AiProposalStatus = "accepted" | "rejected" | "failed";
export type AiProposalErrorCategory =
  | "insufficient_evidence"
  | "certification_failure"
  | "generator_failure"
  | "empty_response"
  | "malformed_response"
  | "implementation_leakage"
  | "unsupported_claim"
  | "quality_gate_rejection";

export type AiProposalAudit = {
  mode: AiProposalMode;
  providerModel: string;
  generatedAt: string;
  evidenceIds: string[];
  evidenceHash: string;
  status: AiProposalStatus;
  errorCategory: AiProposalErrorCategory | null;
};

export type AiProposalResult = {
  value: string | null;
  audit: AiProposalAudit;
};

export type AiProposalQualityValidator = (input: {
  value: string;
  profile: SemanticPageProfile;
  candidate: OpportunityCandidate;
  deterministicCandidate: string | null;
}) => boolean | { accepted: boolean; reason?: string };

export type AiProposalInput = {
  profile: SemanticPageProfile;
  candidate: OpportunityCandidate;
  deterministicCandidate?: string | null;
  generateText: AiTextGenerator;
  providerModel: string;
  now?: () => string;
  validateQuality: AiProposalQualityValidator;
};

type EvidencePacket = {
  page: string;
  identity: string;
  facts: string[];
  evidenceIds: string[];
};

const words = (value: string): string[] => value.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
const canonical = (value: unknown) => JSON.stringify(value);
const evidenceHash = (packet: EvidencePacket) => createHash("sha256").update(canonical(packet)).digest("hex");
const unique = <T>(items: T[]) => [...new Set(items)];

const implementationLeakage = /\b(?:shopify|implementation|source(?:s)?|evidence|provenance|observed|crawl(?:ed)?|html|json|api|schema|model|provider|prompt|keyword|according to)\b/i;
const unsupportedClaim = /\b(?:best|#1|number one|guaranteed|lowest price|price|cost|free shipping|shipping|available|availability|in stock|sale|promo(?:tion|tional)?|discount|popular|bestseller|authentic|genuine|certified|organic|vegan|waterproof|hypoallergenic|sterling|gold[- ]?plated|handmade|luxury|premium|limited edition|new)\b|\$\s*\d/i;
const labelledResponse = /^(?:meta\s*description|description|answer|output)\s*:\s*/i;

function packetFor(profile: SemanticPageProfile): EvidencePacket {
  const facts = profile.candidateSentences
    .filter((item) => item.text && item.confidence >= 0.7)
    .slice(0, 6)
    .map((item) => normalize(item.text));
  const evidenceIds = unique([
    ...profile.candidateSentences.map((item) => item.evidenceId).filter((id): id is string => Boolean(id)),
    ...profile.provenance.filter((item) => item.usedForCopy).map((item) => item.evidenceId).filter((id): id is string => Boolean(id)),
  ]).sort();
  return {
    page: profile.path,
    identity: profile.identity.selected ?? "",
    facts,
    evidenceIds,
  };
}

function audit(input: AiProposalInput, packet: EvidencePacket, status: AiProposalStatus, errorCategory: AiProposalErrorCategory | null): AiProposalAudit {
  return {
    mode: input.deterministicCandidate ? "refined" : "generated",
    providerModel: input.providerModel,
    generatedAt: (input.now ?? (() => new Date().toISOString()))(),
    evidenceIds: packet.evidenceIds,
    evidenceHash: evidenceHash(packet),
    status,
    errorCategory,
  };
}

function result(input: AiProposalInput, packet: EvidencePacket, status: AiProposalStatus, errorCategory: AiProposalErrorCategory | null, value: string | null = null): AiProposalResult {
  return { value, audit: audit(input, packet, status, errorCategory) };
}

function strictPrompt(packet: EvidencePacket, deterministicCandidate: string | null) {
  return [
    "Return exactly one plain-text meta description and nothing else.",
    "Use only the supplied evidence. Do not mention evidence, sources, implementation, Shopify, prices, availability, shipping, promotions, popularity, authenticity, or unsupported attributes.",
    "Write one complete sentence, between 50 and 155 characters, ending with punctuation. Do not use HTML, JSON, markdown, labels, or quotation marks.",
    `PAGE: ${packet.page}`,
    `IDENTITY: ${packet.identity}`,
    `EVIDENCE IDS: ${packet.evidenceIds.join(", ") || "none"}`,
    `FACTS: ${packet.facts.join(" ")}`,
    deterministicCandidate ? `DETERMINISTIC CANDIDATE TO REFINE: ${deterministicCandidate}` : "DETERMINISTIC CANDIDATE: none",
  ].join("\n");
}

function parsePlainResponse(raw: string): { value: string | null; error: AiProposalErrorCategory | null } {
  const value = normalize(raw);
  if (!value) return { value: null, error: "empty_response" };
  if (value.includes("\n") || labelledResponse.test(value) || /^[-*•]\s/.test(value) || /```|^\{|\}$/.test(value)) {
    return { value: null, error: "malformed_response" };
  }
  const parsed = value.replace(/^["“]|["”]$/g, "").trim();
  if (parsed !== value || !hasSafeSnippetIntegrity(parsed)) return { value: null, error: "malformed_response" };
  return { value: parsed, error: null };
}

function hasUnsupportedAttribute(value: string, profile: SemanticPageProfile) {
  const evidence = words([
    profile.identity.selected ?? "",
    ...profile.candidateSentences.map((item) => item.text),
    profile.composition.productType ?? "",
    profile.composition.vendor ?? "",
    ...profile.composition.tags,
    ...profile.composition.categoryTypes,
  ].join(" "));
  const lower = value.toLowerCase();
  const match = lower.match(unsupportedClaim);
  return Boolean(match && !evidence.includes(match[0].toLowerCase()));
}

export async function generateAiMetaDescriptionProposal(input: AiProposalInput): Promise<AiProposalResult> {
  const packet = packetFor(input.profile);
  const fail = (category: AiProposalErrorCategory) => result(input, packet, category === "generator_failure" ? "failed" : "rejected", category);
  if (!input.profile.identity.selected || input.profile.confidence < 0.7 || input.profile.blockers.length > 0 || input.profile.conflicts.length > 0 || packet.facts.length === 0) {
    return fail("insufficient_evidence");
  }
  const compositionUsed = input.profile.candidateSentences.some((item) => item.source === "shopify_collection_composition");
  const certification = input.profile.composition.membershipCertification;
  if ((compositionUsed || certification !== null) && !validateCollectionMembershipCertification(certification, input.profile.path).valid) {
    return fail("certification_failure");
  }
  let raw: string;
  try {
    raw = await input.generateText(strictPrompt(packet, input.deterministicCandidate ?? null));
  } catch {
    return fail("generator_failure");
  }
  const parsed = parsePlainResponse(raw);
  if (!parsed.value) return fail(parsed.error ?? "malformed_response");
  if (implementationLeakage.test(parsed.value)) return fail("implementation_leakage");
  if (unsupportedClaim.test(parsed.value) || hasUnsupportedAttribute(parsed.value, input.profile)) return fail("unsupported_claim");
  const quality = input.validateQuality({
    value: parsed.value,
    profile: input.profile,
    candidate: input.candidate,
    deterministicCandidate: input.deterministicCandidate ?? null,
  });
  if (typeof quality === "boolean" ? !quality : !quality.accepted) return fail("quality_gate_rejection");
  return result(input, packet, "accepted", null, parsed.value);
}

// Descriptive alias for adapters that call this operation "refinement".
export const refineAiMetaDescription = generateAiMetaDescriptionProposal;