import type { CrawlPageSignal } from "./opportunity-engine.js";

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
  /\b(?:cookie settings|accept cookies|privacy policy|terms of service|manage preferences)\b/i,
  /&(?:amp|nbsp|quot|apos|lt|gt|#\d+);/i,
] as const;

const utilityLabels = /\b(?:home|shop all|shop|menu|search|cart|account|login|log in|sign in|newsletter|cookie|preferences)\b/gi;

export const normalizeProposalText = (value: string | null | undefined) => (value ?? "")
  .replace(/&(?:amp|nbsp|quot|apos|lt|gt);|&#\d+;/gi, (entity) => entityMap[entity.toLowerCase()] ?? " ")
  .replace(/<[^>]*>/g, " ")
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
  .replace(/\b(?:cookie settings|accept cookies|privacy policy|terms of service|manage preferences)\b/gi, " ")
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

const meaningfulWordCount = (value: string) => cleanPageEvidence(value)
  .match(/[A-Za-z][A-Za-z'’-]*/g)?.filter((word) => word.length > 2).length ?? 0;

function cleanSentences(value: string) {
  return cleanPageEvidence(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => /[.!?]$/.test(sentence) && meaningfulWordCount(sentence) >= 6 && !containsProposalBoilerplate(sentence));
}

function fitDescription(value: string) {
  const normalized = normalizeProposalText(value).replace(/\s+/g, " ").trim();
  if (normalized.length <= 155) return normalized;
  const shortened = normalized.slice(0, 155).replace(/\s+\S*$/, "").replace(/[,:;—-]\s*$/, "").trim();
  return shortened;
}

export function buildPageSpecificMetaDescription(page: CrawlPageSignal) {
  const identity = normalizeProposalText(page.h1 || page.title);
  const sentences = cleanSentences(page.contentText);
  const identityTerms = new Set((identity.match(/[A-Za-z][A-Za-z'’-]*/g) ?? []).map((word) => word.toLowerCase()));
  const bodySentence = sentences.find((sentence) => {
    const bodyTerms = sentence.match(/[A-Za-z][A-Za-z'’-]*/g) ?? [];
    const pageSpecificTerms = bodyTerms.filter((word) => word.length > 2 && !identityTerms.has(word.toLowerCase()));
    return pageSpecificTerms.length >= 5;
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