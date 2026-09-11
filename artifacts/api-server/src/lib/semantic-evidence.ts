import type { CrawlPageSignal, OpportunityCandidate } from "./opportunity-engine.js";

export type SemanticSourceKind =
  | "shopify_product"
  | "shopify_collection"
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
  collectionComposition?: {
    productTypes: string[];
    tags: string[];
    productsObserved: number;
    truncated: boolean;
  };
};

export type SemanticProvenance = {
  source: SemanticSourceKind;
  evidenceId: string | null;
  path: string;
  field: string;
  confidence: number;
  usedForCopy: boolean;
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

function collectionComposition(resource: ShopifySemanticResource | undefined, resources: ShopifySemanticResource[], identity: string | null) {
  if (!resource || resource.kind !== "collection" || !identity) return null;
  const identityTerms = new Set(terms(identity));
  const matchingProducts = resources.filter((item) => item.kind === "product" && [...identityTerms].some((term) =>
    terms([item.title, item.productType, ...(item.tags ?? [])].filter(Boolean).join(" ")).includes(term)));
  const composition = resource.collectionComposition ?? {
    productTypes: matchingProducts.map((item) => item.productType ?? "").filter(Boolean),
    tags: matchingProducts.flatMap((item) => item.tags ?? []),
    productsObserved: matchingProducts.length,
    truncated: false,
  };
  if (!composition || composition.productsObserved < 2) return null;
  const categories = unique(composition.productTypes.map(normalizeProposalText).filter((value) =>
    value.length >= 3 && !containsProposalBoilerplate(value) && !absoluteClaims.test(value)))
    .sort()
    .slice(0, 4);
  if (categories.length < 2) return null;
  const list = categories.length === 2 ? categories.join(" and ") : `${categories.slice(0, -1).join(", ")}, and ${categories.at(-1)}`;
  return {
    sentence: `${identity} includes ${list} products represented in the observed Shopify catalog.`,
    categoryTypes: categories,
    matchedProducts: composition.productsObserved,
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
    const composition = collectionComposition(resource, input.shopifyResources ?? [], selected);
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
  const resolvedComposition = collectionComposition(resource, input.shopifyResources ?? [], selected);
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

function fitDescription(value: string) {
  const normalized = normalizeProposalText(value);
  if (normalized.length <= 155) return normalized;
  const shortened = normalized.slice(0, 154).replace(/\s+\S*$/, "").replace(/[,:;—-]\s*$/, "").trim();
  return /[.!?]$/.test(shortened) ? shortened : `${shortened}.`;
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
  const value = source.text.toLowerCase().startsWith(identity.toLowerCase()) ? source.text : `${identity}. ${source.text}`;
  const description = fitDescription(value).replace(/([.!?])(?:\s*[.!?])+/g, "$1");
  if (description.length < 50 || description.length > 155 || containsProposalBoilerplate(description) || absoluteClaims.test(description)) return null;
  return description;
}