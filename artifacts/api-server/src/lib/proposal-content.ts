import type { CrawlPageSignal } from "./opportunity-engine.js";
import { buildSemanticPageProfile, generateMetaDescriptionFromProfile, type SemanticPageProfile } from "./semantic-evidence.js";

const entityMap: Record<string, string> = {
  "&amp;": "&",
  "&nbsp;": " ",
  "&quot;": "\"",
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

export const proposalBoilerplatePatterns = [
  /\bskip\s+to\s+content\b/i,
  /\bfree\s+shipping(?:\s+\$?\d+\+?)?/i,
  /\bsecure\s+checkout\b/i,
  /\bcurated\s+fragrance\b/i,
  /\bhome\s+shop\b/i,
  /\bdiamond\s+shelf\s+new\s*&\s*trending\s+categories\b/i,
  /\bnew\s*&\s*trending\s+categories\b/i,
  /\bcategories\s+fragrance\s+beauty\s+bath\s*&\s*body\s+fragrance\s+hair\b/i,
  /\bdiscover\s+all\s+brands\s+scent\s+profiles\b/i,
  /\b(?:cookie settings|accept cookies|privacy policy|terms of service|manage preferences)\b/i,
  /\b(?:all rights reserved|copyright|brand names and trademarks|trademarks? (?:are|is) the property|respective owners|refund policy|shipping policy|return policy|subscribe to (?:our )?newsletter)\b/i,
  /&(?:amp|nbsp|quot|apos|lt|gt|#\d+);/i,
] as const;

const utilityLabels = /\b(?:home|shop all|shop|menu|search|cart|account|login|log in|sign in|newsletter|cookie|preferences|categories|all brands|scent profiles)\b/gi;
const naturalLanguageVerbs = /\b(?:are|brings|combines|contains|crafted|designed|features|helps|includes|keeps|made|offers|pairs|presents|provides|showcases|uses)\b/i;
const chromeTerms = new Set([
  "account", "brands", "cart", "categories", "checkout", "discover", "footer", "home",
  "login", "menu", "navigation", "newsletter", "profiles", "search", "shipping", "shop",
]);

export const normalizeProposalText = (value: string | null | undefined) => (value ?? "")
  .replace(/&(?:amp|nbsp|quot|apos|lt|gt);|&#\d+;/gi, (entity) => entityMap[entity.toLowerCase()] ?? " ")
  .replace(/<[^>]*>/g, " ")
  .replace(/\s+([,.;:!?])/g, "$1")
  .replace(/([.!?])(?:\s*[.!?])+/g, "$1")
  .replace(/\s+/g, " ")
  .trim();

export const containsProposalBoilerplate = (value: string | null | undefined) =>
  proposalBoilerplatePatterns.some((pattern) => pattern.test(value ?? ""));

const containsNavigationBoilerplate = (value: string | null | undefined) =>
  proposalBoilerplatePatterns.slice(0, -1).some((pattern) => pattern.test(value ?? ""));

const stripTemplateText = (value: string) => value
  .replace(/\bskip\s+to\s+content\b/gi, " ")
  .replace(/\bfree\s+shipping(?:\s+\$?\d+\+?)?/gi, " ")
  .replace(/\bsecure\s+checkout\b/gi, " ")
  .replace(/\bcurated\s+fragrance\b/gi, " ")
  .replace(/\bhome\s+shop\b/gi, " ")
  .replace(/\bdiamond\s+shelf\s+new\s*&\s*trending\s+categories\b/gi, " ")
  .replace(/\bnew\s*&\s*trending\s+categories\b/gi, " ")
  .replace(/\bcategories\s+fragrance\s+beauty\s+bath\s*&\s*body\s+fragrance\s+hair\b/gi, " ")
  .replace(/\bdiscover\s+all\s+brands\s+scent\s+profiles\b/gi, " ")
  .replace(/\b(?:cookie settings|accept cookies|privacy policy|terms of service|manage preferences)\b/gi, " ")
  .replace(/\b(?:all rights reserved|copyright|brand names and trademarks|trademarks? (?:are|is) the property|respective owners|refund policy|shipping policy|return policy|subscribe to (?:our )?newsletter)\b/gi, " ")
  .replace(utilityLabels, " ");

const dedupeAdjacentWords = (value: string) => value.replace(/\b([A-Za-z][A-Za-z'’-]*)\s+\1\b/gi, "$1");

export function cleanPageEvidence(value: string | null | undefined) {
  const decoded = normalizeProposalText(value);
  return dedupeAdjacentWords(stripTemplateText(decoded))
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/[|·]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const stripNonSemanticRegions = (html: string) => html
  .replace(/<(?:script|style|noscript|template|svg|header|nav|footer|aside|form)\b[\s\S]*?<\/(?:script|style|noscript|template|svg|header|nav|footer|aside|form)>/gi, " ");

const htmlToText = (html: string) => normalizeProposalText(html
  .replace(/<(?:br|hr)\b[^>]*>/gi, ". ")
  .replace(/<\/(?:p|li|h[1-6]|section|div)>/gi, ". ")
  .replace(/<[^>]+>/g, " "));

export function extractSemanticPageText(html: string) {
  const withoutChrome = stripNonSemanticRegions(html);
  const semanticRegion = withoutChrome.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]
    ?? withoutChrome.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]
    ?? withoutChrome;
  return htmlToText(semanticRegion).slice(0, 100_000);
}

const meaningfulWordCount = (value: string) => cleanPageEvidence(value)
  .match(/[A-Za-z][A-Za-z'’-]*/g)?.filter((word) => word.length > 2).length ?? 0;

const terms = (value: string) => normalizeProposalText(value)
  .toLowerCase()
  .match(/[a-z][a-z'’-]*/g)?.filter((word) => word.length > 2) ?? [];

function hasNaturalSentenceShape(sentence: string) {
  const sentenceTerms = terms(sentence);
  const chromeCount = sentenceTerms.filter((word) => chromeTerms.has(word)).length;
  return naturalLanguageVerbs.test(sentence)
    && sentenceTerms.length >= 8
    && chromeCount / sentenceTerms.length < 0.2
    && !/[|·]/.test(sentence);
}

function cleanSentences(value: string) {
  return cleanPageEvidence(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => /[.!?]$/.test(sentence)
      && meaningfulWordCount(sentence) >= 8
      && hasNaturalSentenceShape(sentence)
      && !containsProposalBoilerplate(sentence));
}

function fitDescription(value: string) {
  const normalized = normalizeProposalText(value).replace(/\s+/g, " ").trim();
  if (normalized.length <= 155) return normalized;
  const shortened = normalized.slice(0, 155).replace(/\s+\S*$/, "").replace(/[,:;—-]\s*$/, "").trim();
  return shortened;
}

export function buildPageSpecificMetaDescription(page: CrawlPageSignal, profile?: SemanticPageProfile) {
  if (profile) return generateMetaDescriptionFromProfile(profile);
  const identity = normalizeProposalText(page.h1 || page.title);
  const sentences = cleanSentences(page.contentText);
  const identityTerms = new Set(terms(identity));
  const bodySentence = sentences.find((sentence) => {
    const bodyTerms = terms(sentence);
    const identityOverlap = [...identityTerms].filter((word) => bodyTerms.includes(word)).length;
    const pageSpecificTerms = new Set(bodyTerms.filter((word) => !identityTerms.has(word) && !chromeTerms.has(word)));
    return identityOverlap >= Math.min(2, identityTerms.size) && pageSpecificTerms.size >= 6;
  });
  if (!identity || !bodySentence) return null;
  const body = bodySentence.toLowerCase().startsWith(identity.toLowerCase()) ? bodySentence : `${identity}. ${bodySentence}`;
  const description = fitDescription(body);
  return description.length >= 50 && description.length <= 155 ? description : null;
}

export function hasRawTemplatePrefix(proposed: string, page: CrawlPageSignal | undefined) {
  if (!page || !containsNavigationBoilerplate(page.contentText)) return false;
  const rawPrefix = normalizeProposalText(page.contentText).slice(0, 80).toLowerCase();
  return rawPrefix.length >= 40 && normalizeProposalText(proposed).toLowerCase().includes(rawPrefix);
}