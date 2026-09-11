import type { CrawlPageSignal, OpportunityCandidate } from "./opportunity-engine.js";

export type SemanticSourceKind =
  | "shopify_product"
  | "shopify_collection"
  | "shopify_collection_membership"
  | "shopify_collection_composition"
  | "shopify_page"
  | "structured_data"
  | "semantic_body"
  | "heading"
  | "internal_anchor"
  | "gsc_query";

export type ShopifySemanticResource = {
  kind: "product" | "collection" | "page";
  path: string;
  title: string;
  description: string | null;
  productType?: string | null;
  vendor?: string | null;
  tags?: string[];
  productCount?: number | null;
  collectionMembership?: {
    collectionPath: string;
    sourceEndpoint: string;
    expectedCount: number | null;
    observedCount: number;
    coverageRatio: number | null;
    cardinalityValid: boolean;
    catalogProductCount: number;
    limit: number;
    complete: boolean;
    truncated: boolean;
    suspiciouslyBroad: boolean;
    members: Array<{
      path: string;
      title: string;
      productType: string | null;
      tags: string[];
    }>;
  };
};

export type SemanticProvenance = {
  source: SemanticSourceKind;
  evidenceId: string | null;
  path: string;
  field: string;
  confidence: number;
  usedForCopy: boolean;
  resourcePath?: string;
  sourceEndpoint?: string;
};

export type CollectionMembershipCertification = {
  collectionPath: string;
  sourceEndpoint: string;
  expectedMemberCount: number | null;
  observedMemberCount: number;
  coverageRatio: number;
  cardinalityValid: boolean;
  catalogProductCount: number;
  boundedLimit: number;
  complete: boolean;
  truncated: boolean;
  suspiciouslyBroad: boolean;
  evidenceId: string | null;
};

export type SemanticPageProfile = {
  version: "semantic_evidence_v1";
  pageId: string;
  path: string;
  identity: {
    selected: string | null;
    shopify: string | null;
    h1: string | null;
    title: string | null;
  };
  candidateSentences: Array<{
    text: string;
    source: Exclude<SemanticSourceKind, "gsc_query">;
    confidence: number;
    evidenceId: string | null;
  }>;
  headings: string[];
  internalAnchors: Array<{ text: string; href: string }>;
  composition: {
    productType: string | null;
    vendor: string | null;
    tags: string[];
    productCount: number | null;
    categoryTypes: string[];
    matchedProducts: number;
    expectedMembers: number | null;
    membershipComplete: boolean;
    membershipTruncated: boolean;
    membershipSuspiciouslyBroad: boolean;
    membershipPath: string | null;
    membershipCertification: CollectionMembershipCertification | null;
  };
  supportingQueries: string[];
  provenance: SemanticProvenance[];
  conflicts: string[];
  blockers: string[];
  confidence: number;
  corroboratingSources: SemanticSourceKind[];
};

const stopWords = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "is", "of", "on", "or", "the", "to", "with", "your"]);
const absoluteClaims = /\b(?:best|#1|number one|guaranteed|certified|lowest price|free shipping|lifetime warranty|conflict[- ]free|ethically sourced|always|never)\b/i;
const naturalVerb = /\b(?:are|brings|combines|contains|crafted|designed|features|groups|helps|includes|keeps|made|offers|organizes|pairs|presents|provides|showcases|uses)\b/i;
const boilerplate = /\b(?:skip to content|free shipping|secure checkout|curated fragrance|home shop|diamond shelf new\s*&\s*trending categories|new\s*&\s*trending categories|discover all brands scent profiles|cookie settings|accept cookies|manage preferences|privacy policy|terms (?:of (?:service|use)|and conditions)|refund policy|shipping policy|return policy|all rights reserved|copyright|subscribe to (?:our )?newsletter|brand names and trademarks|trademarks? (?:are|is) the property|respective owners)\b/i;
const normalizeProposalText = (value: string | null | undefined) => (value ?? "")
  .replace(/&amp;/gi, "&").replace(/&nbsp;/gi, " ").replace(/&quot;/gi, "\"").replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#\d+;/gi, " ")
  .replace(/<[^>]*>/g, " ").replace(/\s+([,.;:!?])/g, "$1").replace(/([.!?])(?:\s*[.!?])+/g, "$1")
  .replace(/\s+/g, " ").trim();
const cleanPageEvidence = (value: string | null | undefined) => normalizeProposalText(value)
  .replace(/\b(?:skip to content|free shipping(?:\s+\$?\d+\+?)?|secure checkout|curated fragrance|home shop|diamond shelf new\s*&\s*trending categories|new\s*&\s*trending categories|discover all brands scent profiles)\b/gi, " ")
  .replace(/\s+/g, " ").trim();
const containsProposalBoilerplate = (value: string | null | undefined) => boilerplate.test(value ?? "") || /&(?:amp|nbsp|quot|apos|lt|gt|#\d+);/i.test(value ?? "");

const comparable = (value: string | null | undefined) => normalizeProposalText(value).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
const terms = (value: string | null | undefined) => comparable(value).split(" ").filter((term) => term.length > 2 && !stopWords.has(term));
const pathOf = (url: string) => {
  try {
    return new URL(url).pathname.replace(/\/$/, "") || "/";
  } catch {
    return url.replace(/\/$/, "") || "/";
  }
};
const cleanIdentity = (value: string | null | undefined) => normalizeProposalText(value)
  .replace(/\s+[–—-]\s+Diamond Shelf$/i, "")
  .trim() || null;
const unique = <T>(values: T[]) => [...new Set(values)];
const hasOwn = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key);

function normalizedEndpointPath(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value, "https://shopify.invalid").pathname.replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function validateCollectionMembershipCertification(
  certification: CollectionMembershipCertification | null | undefined,
  expectedCollectionPath: string,
) {
  if (!certification) return { valid: false, reason: "missing_certification" } as const;
  if (!hasOwn(certification, "expectedMemberCount")) return { valid: false, reason: "missing_expected_count_field" } as const;
  if (!hasOwn(certification, "observedMemberCount") || !Number.isInteger(certification.observedMemberCount) || certification.observedMemberCount < 0) {
    return { valid: false, reason: "missing_or_invalid_observed_count" } as const;
  }
  const collectionPath = pathOf(certification.collectionPath);
  if (collectionPath !== pathOf(expectedCollectionPath)) return { valid: false, reason: "collection_path_mismatch" } as const;
  const endpoint = normalizedEndpointPath(certification.sourceEndpoint);
  if (!endpoint || !/\/collections\/\d+\/products\.json$/i.test(endpoint)) return { valid: false, reason: "missing_or_invalid_direct_endpoint" } as const;
  if (certification.expectedMemberCount !== null
    && (!Number.isInteger(certification.expectedMemberCount) || certification.expectedMemberCount < 0)) {
    return { valid: false, reason: "invalid_expected_count" } as const;
  }
  const expectedCoverage = certification.expectedMemberCount === null || certification.expectedMemberCount === 0
    ? (certification.complete && certification.observedMemberCount === (certification.expectedMemberCount ?? certification.observedMemberCount) ? 1 : 0)
    : Math.min(1, certification.observedMemberCount / certification.expectedMemberCount);
  if (!Number.isFinite(certification.coverageRatio) || Math.abs(certification.coverageRatio - expectedCoverage) > 1e-9) {
    return { valid: false, reason: "coverage_ratio_mismatch" } as const;
  }
  const expectedCardinality = certification.expectedMemberCount === null || certification.expectedMemberCount === certification.observedMemberCount;
  if (certification.cardinalityValid !== expectedCardinality) return { valid: false, reason: "cardinality_mismatch" } as const;
  const computedBroad = certification.catalogProductCount > 0 && (
    certification.observedMemberCount > certification.catalogProductCount
    || (certification.observedMemberCount >= 50 && certification.observedMemberCount / certification.catalogProductCount >= 0.8)
  );
  if (certification.suspiciouslyBroad !== computedBroad || computedBroad) return { valid: false, reason: "suspiciously_broad_membership" } as const;
  if (!certification.complete || certification.truncated || !certification.cardinalityValid || certification.coverageRatio !== 1) {
    return { valid: false, reason: "incomplete_membership" } as const;
  }
  return { valid: true, reason: null } as const;
}

function certificationFromMembership(
  membership: NonNullable<ShopifySemanticResource["collectionMembership"]> | undefined,
  evidenceId: string | null,
): CollectionMembershipCertification | null {
  if (!membership) return null;
  return {
    collectionPath: membership.collectionPath,
    sourceEndpoint: membership.sourceEndpoint,
    expectedMemberCount: membership.expectedCount,
    observedMemberCount: membership.observedCount,
    coverageRatio: membership.coverageRatio ?? 0,
    cardinalityValid: membership.cardinalityValid,
    catalogProductCount: membership.catalogProductCount,
    boundedLimit: membership.limit,
    complete: membership.complete,
    truncated: membership.truncated,
    suspiciouslyBroad: membership.suspiciouslyBroad,
    evidenceId,
  };
}

function cleanNaturalSentences(value: string | null | undefined) {
  return cleanPageEvidence(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => {
      const words = terms(sentence);
      return /[.!?]$/.test(sentence)
        && words.length >= 8
        && naturalVerb.test(sentence)
        && !absoluteClaims.test(sentence)
        && !containsProposalBoilerplate(sentence)
        && !/[|·<>]/.test(sentence);
    });
}

function structuredCandidates(value: unknown): string[] {
  const found: string[] = [];
  const visit = (item: unknown, depth: number) => {
    if (depth > 5 || item == null) return;
    if (Array.isArray(item)) {
      for (const child of item.slice(0, 50)) visit(child, depth + 1);
      return;
    }
    if (typeof item !== "object") return;
    for (const [key, child] of Object.entries(item as Record<string, unknown>)) {
      if (key === "description" && typeof child === "string") found.push(child);
      else if (["@graph", "itemListElement", "mainEntity"].includes(key)) visit(child, depth + 1);
    }
  };
  visit(value, 0);
  return found.flatMap(cleanNaturalSentences);
}

const identityKey = (value: string, path: string) => {
  let key = comparable(value).replace(/\b(?:collection|products|page)\b/g, " ").replace(/\s+/g, " ").trim();
  if (/\/(?:pages|collections)\/brands$/.test(path)) key = key.replace(/^all\s+/, "");
  if (/\/pages\/scents$/.test(path)) {
    key = key.replace(/^find\s+(?:the\s+)?(?:your\s+)?/, "").replace(/\bscent profile\b/g, "scent profiles");
  }
  return key;
};

function identityConflict(values: Array<string | null>, path: string) {
  const distinct = unique(values.filter((value): value is string => Boolean(value)).map((value) => identityKey(value, path)).filter(Boolean));
  return distinct.length > 1;
}

function collectionComposition(resource: ShopifySemanticResource | undefined, identity: string | null) {
  if (!resource || resource.kind !== "collection" || !identity) return null;
  const membership = resource.collectionMembership;
  const resourcePath = pathOf(resource.path);
  const certification = certificationFromMembership(membership, null);
  if (!membership
    || !validateCollectionMembershipCertification(certification, resourcePath).valid
    || membership.observedCount < 2
    || membership.members.length !== membership.observedCount
    || (membership.expectedCount !== null && membership.expectedCount !== membership.observedCount)) return null;
  const categories = unique(membership.members.map((member) => normalizeProposalText(member.productType)).filter((value) =>
    value.length >= 3 && !containsProposalBoilerplate(value) && !absoluteClaims.test(value)))
    .sort()
    .slice(0, 4);
  if (categories.length < 2) return null;
  const list = categories.length === 2 ? categories.join(" and ") : `${categories.slice(0, -1).join(", ")}, and ${categories.at(-1)}`;
  return {
    sentence: `${identity} includes ${list}, bringing the collection's product categories together on one page.`,
    categoryTypes: categories,
    matchedProducts: membership.observedCount,
  };
}

export function buildSemanticPageProfile(input: {
  page: CrawlPageSignal;
  candidate: OpportunityCandidate;
  shopifyResources?: ShopifySemanticResource[];
  shopifyEvidenceId?: string | null;
  gscEvidenceId?: string | null;
}): SemanticPageProfile {
  const path = pathOf(input.page.url);
  const resource = (input.shopifyResources ?? []).find((item) => pathOf(item.path) === path);
  const shopifyIdentity = cleanIdentity(resource?.title);
  const h1 = cleanIdentity(input.page.h1);
  const title = cleanIdentity(input.page.title);
  const selected = shopifyIdentity ?? h1 ?? title;
  const conflicts = identityConflict([shopifyIdentity, h1, title], path) ? ["identity_source_conflict"] : [];
  const candidates: SemanticPageProfile["candidateSentences"] = [];
  const provenance: SemanticProvenance[] = [];
  const add = (
    source: Exclude<SemanticSourceKind, "gsc_query">,
    evidenceId: string | null,
    field: string,
    confidence: number,
    sentences: string[],
  ) => {
    for (const text of sentences) candidates.push({ text, source, confidence, evidenceId });
    provenance.push({ source, evidenceId, path, field, confidence, usedForCopy: false });
  };
  if (resource) {
    const source = `shopify_${resource.kind}` as "shopify_product" | "shopify_collection" | "shopify_page";
    add(source, input.shopifyEvidenceId ?? null, "description", 0.98, cleanNaturalSentences(resource.description));
    const membership = resource.collectionMembership;
    if (membership) {
      provenance.push({
        source: "shopify_collection_membership",
        evidenceId: input.shopifyEvidenceId ?? null,
        path,
        field: "exact_collection_membership",
        confidence: membership.complete && !membership.truncated && !membership.suspiciouslyBroad ? 0.98 : 0,
        usedForCopy: false,
        resourcePath: membership.collectionPath,
        sourceEndpoint: membership.sourceEndpoint,
      });
    }
    const composition = collectionComposition(resource, selected);
    if (composition && !candidates.some((candidate) => candidate.source === source)) {
      add("shopify_collection_composition", input.shopifyEvidenceId ?? null, "collection_composition", 0.92, [composition.sentence]);
    }
  }
  add("structured_data", input.page.evidenceId, "structured_data", 0.9, structuredCandidates(input.page.structuredData));
  add("semantic_body", input.page.evidenceId, "content_text", 0.82, cleanNaturalSentences(input.page.contentText));
  const headings = unique((input.page.headings ?? []).map(cleanIdentity).filter((value): value is string => Boolean(value))).slice(0, 20);
  provenance.push({ source: "heading", evidenceId: input.page.evidenceId, path, field: "headings", confidence: 0.72, usedForCopy: false });
  const internalAnchors = (input.page.internalAnchors ?? [])
    .map((anchor) => ({ text: normalizeProposalText(anchor.text), href: anchor.href }))
    .filter((anchor) => anchor.text && !containsProposalBoilerplate(anchor.text))
    .slice(0, 30);
  provenance.push({ source: "internal_anchor", evidenceId: input.page.evidenceId, path, field: "internal_anchors", confidence: 0.58, usedForCopy: false });
  const supportingQueries = input.candidate.query ? [normalizeProposalText(input.candidate.query)] : [];
  if (supportingQueries.length) provenance.push({ source: "gsc_query", evidenceId: input.gscEvidenceId ?? null, path, field: "query_context", confidence: 0.5, usedForCopy: false });
  candidates.sort((a, b) => b.confidence - a.confidence || a.source.localeCompare(b.source) || a.text.localeCompare(b.text));
  const corroboratingSources = unique(candidates.map((candidate) => candidate.source));
  const sourceConfidence = candidates[0]?.confidence ?? 0;
  const independentEvidence = unique(candidates.map((candidate) => candidate.evidenceId ?? `source:${candidate.source}`));
  const corroborationBonus = Math.min(0.08, Math.max(0, independentEvidence.length - 1) * 0.04);
  const confidence = Number(Math.min(0.99, Math.max(0, sourceConfidence + corroborationBonus - conflicts.length * 0.2)).toFixed(2));
  const resolvedComposition = collectionComposition(resource, selected);
  const membership = resource?.collectionMembership;
  const membershipCertification = certificationFromMembership(membership, input.shopifyEvidenceId ?? null);
  const profile: SemanticPageProfile = {
    version: "semantic_evidence_v1",
    pageId: input.page.pageId,
    path,
    identity: { selected, shopify: shopifyIdentity, h1, title },
    candidateSentences: candidates,
    headings,
    internalAnchors,
    composition: {
      productType: normalizeProposalText(resource?.productType) || null,
      vendor: normalizeProposalText(resource?.vendor) || null,
      tags: unique((resource?.tags ?? []).map(normalizeProposalText).filter(Boolean)).sort().slice(0, 20),
      productCount: typeof resource?.productCount === "number" ? resource.productCount : null,
      categoryTypes: resolvedComposition?.categoryTypes ?? [],
      matchedProducts: resolvedComposition?.matchedProducts ?? 0,
      expectedMembers: membership?.expectedCount ?? null,
      membershipComplete: membership?.complete ?? false,
      membershipTruncated: membership?.truncated ?? false,
      membershipSuspiciouslyBroad: membership?.suspiciouslyBroad ?? false,
      membershipPath: membership?.collectionPath ?? null,
      membershipCertification,
    },
    supportingQueries,
    provenance,
    conflicts,
    blockers: [],
    confidence,
    corroboratingSources,
  };
  const selectedSource = selectProfileSentence(profile);
  if (selectedSource) {
    profile.provenance = profile.provenance.map((entry) => ({
      ...entry,
      usedForCopy: entry.source === selectedSource.source && entry.evidenceId === selectedSource.evidenceId,
    }));
  }
  profile.blockers = conflicts.length > 0
    ? [...conflicts]
    : candidates.length === 0
      ? ["insufficient_clean_evidence"]
      : confidence < 0.7
        ? ["insufficient_corroboration"]
        : !selectedSource
          ? ["insufficient_page_relevance"]
          : [];
  return profile;
}

const danglingEnding = /\b(?:a|an|the|and|or|but|for|from|in|into|of|on|onto|to|with|by|at|as|via|through|while|than|that|which|because|when|where)\s*[.!?]$/i;

export function hasSafeSnippetIntegrity(value: string | null | undefined) {
  const normalized = normalizeProposalText(value);
  return normalized.length >= 50
    && normalized.length <= 155
    && /[.!?]$/.test(normalized)
    && !danglingEnding.test(normalized)
    && !/[.!?]{2,}/.test(normalized)
    && !/\s+[,.;:!?]/.test(normalized)
    && !/[,:;—-]\s*$/.test(normalized)
    && !/\b(?:Shopify|SEO ENGINE|provider APIs?|evidence machinery|source endpoint|direct membership|bounded crawl|catalog count)\b/i.test(normalized)
    && !/[\uFFFD<>]|&(?:amp|nbsp|quot|apos|lt|gt|#\d+);/i.test(normalized);
}

export function fitMetaDescriptionSafely(value: string): string | null {
  const normalized = normalizeProposalText(value);
  if (hasSafeSnippetIntegrity(normalized)) return normalized;
  if (normalized.length <= 155) return null;
  const candidates: string[] = [];
  for (const match of normalized.matchAll(/[.!?](?=\s|$)|[,;:—](?=\s|$)/g)) {
    const end = (match.index ?? -1) + 1;
    if (end < 50 || end > 155) continue;
    const boundary = match[0];
    const prefix = normalized.slice(0, boundary === "." || boundary === "!" || boundary === "?" ? end : end - 1).trim();
    candidates.push(/[.!?]$/.test(prefix) ? prefix : `${prefix}.`);
  }
  return candidates.reverse().find(hasSafeSnippetIntegrity) ?? null;
}

function selectProfileSentence(profile: SemanticPageProfile) {
  const identity = profile.identity.selected;
  if (!identity || profile.confidence < 0.7 || profile.conflicts.length > 0) return null;
  const identityTerms = new Set(terms(identity));
  return profile.candidateSentences.find((candidate) => {
    const bodyTerms = terms(candidate.text);
    const overlap = [...identityTerms].filter((term) => bodyTerms.includes(term)).length;
    const specific = new Set(bodyTerms.filter((term) => !identityTerms.has(term)));
    const exactFirstParty = candidate.source.startsWith("shopify_");
    return (exactFirstParty || overlap >= Math.min(2, identityTerms.size)) && specific.size >= 6;
  });
}

export function generateMetaDescriptionFromProfile(profile: SemanticPageProfile): string | null {
  const identity = profile.identity.selected;
  const source = selectProfileSentence(profile);
  if (!identity || !source) return null;
  if (source.source === "shopify_collection_composition"
    && !validateCollectionMembershipCertification(profile.composition.membershipCertification, profile.path).valid) return null;
  const sourceContainsIdentity = comparable(source.text).includes(comparable(identity));
  const value = source.text.toLowerCase().startsWith(identity.toLowerCase()) || sourceContainsIdentity ? source.text : `${identity}. ${source.text}`;
  const description = fitMetaDescriptionSafely(value);
  if (!description || !hasSafeSnippetIntegrity(description) || containsProposalBoilerplate(description) || absoluteClaims.test(description)) return null;
  return description;
}