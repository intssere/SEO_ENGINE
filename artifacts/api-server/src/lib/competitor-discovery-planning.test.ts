import assert from "node:assert/strict";
import test from "node:test";
import {
  competitorDiscoveryPlanningCapability,
  dedupeCompetitorCandidates,
  normalizeCompetitorCandidate,
  normalizeCompetitorPlanBudget,
  planCompetitorCollection,
  rankCompetitorCandidates,
  scoreCompetitorCandidate,
  type CompetitorCandidateInput,
} from "./competitor-discovery-planning.js";

const NOW = "2026-09-13T16:00:00.000Z";
const OWN_DOMAIN = "diamondshelf.us";

function candidate(overrides: Partial<CompetitorCandidateInput> = {}): CompetitorCandidateInput {
  return {
    url: "https://www.alpha-fragrance.com/collections/unisex?utm_source=test#top",
    source: "manual research",
    reason: "Overlapping unisex fragrance assortment",
    confidence: 0.8,
    categories: ["Fragrance", "Unisex"],
    pageTypes: ["collection"],
    keywordThemes: ["unisex fragrance", "gift sets"],
    taxonomyLabels: ["perfume oils"],
    entityTypes: ["Brand", "Product"],
    discoveredAt: "2026-09-10T12:00:00Z",
    provenance: { sourceType: "manual", analystConfidence: 0.8, nested: { ignored: true } },
    ...overrides,
  };
}

test("capability is advisory-only and authorizes no collection, persistence, config mutation, scheduler, or execution", () => {
  assert.deepEqual(competitorDiscoveryPlanningCapability(), {
    version: "task60-competitor-discovery-planning-v1",
    advisoryOnly: true,
    networkCollectionAuthorized: false,
    evidencePersistenceAuthorized: false,
    targetConfigurationMutationAuthorized: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    publicSiteWrites: false,
    executionAuthorized: false,
    schemaMutationRequired: false,
  });
});

test("normalization canonicalizes tracking URL data and produces deterministic fingerprint", () => {
  const first = normalizeCompetitorCandidate(candidate(), OWN_DOMAIN, NOW);
  const second = normalizeCompetitorCandidate(candidate(), OWN_DOMAIN, NOW);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.equal(first.candidate.domain, "alpha-fragrance.com");
  assert.equal(first.candidate.url, "https://www.alpha-fragrance.com/collections/unisex");
  assert.equal(first.candidate.identityKey, "url:alpha-fragrance.com/collections/unisex");
  assert.equal(first.candidate.fingerprint, second.candidate.fingerprint);
  assert.match(first.candidate.fingerprint, /^[0-9a-f]{64}$/);
  assert.deepEqual(first.candidate.provenance, { analystConfidence: 0.8, sourceType: "manual" });
  assert.equal(first.candidate.freshnessDays, 3);
});

test("domain-only and equivalent root URL variants share identity for deterministic dedupe", () => {
  const domainOnly = normalizeCompetitorCandidate(candidate({ domain: "www.alpha-fragrance.com", url: null, confidence: 0.6 }), OWN_DOMAIN, NOW);
  const rootUrl = normalizeCompetitorCandidate(candidate({ domain: null, url: "https://alpha-fragrance.com/?ref=x", confidence: 0.9 }), OWN_DOMAIN, NOW);
  assert.equal(domainOnly.ok, true);
  assert.equal(rootUrl.ok, true);
  if (!domainOnly.ok || !rootUrl.ok) return;
  assert.equal(domainOnly.candidate.identityKey, "domain:alpha-fragrance.com");
  assert.equal(rootUrl.candidate.identityKey, "domain:alpha-fragrance.com");
  const deduped = dedupeCompetitorCandidates([domainOnly.candidate, rootUrl.candidate]);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0]?.duplicateCount, 2);
  assert.equal(deduped[0]?.confidence, 0.9);
  assert.deepEqual(deduped[0]?.sources, ["manual research"]);
});

test("owned domain and owned subdomains fail closed", () => {
  for (const url of ["https://diamondshelf.us/collections/a", "https://shop.diamondshelf.us/collections/a"]) {
    const result = normalizeCompetitorCandidate(candidate({ url }), OWN_DOMAIN, NOW);
    assert.deepEqual(result, { ok: false, reason: "own_domain" });
  }
});

test("credentials, unsupported schemes/ports, IP literals, local/special hosts, and domain mismatch fail closed", () => {
  assert.deepEqual(
    normalizeCompetitorCandidate(candidate({ url: "https://user:pass@alpha-fragrance.com/a" }), OWN_DOMAIN, NOW),
    { ok: false, reason: "credential_bearing_url" },
  );
  assert.deepEqual(
    normalizeCompetitorCandidate(candidate({ url: "ftp://alpha-fragrance.com/a" }), OWN_DOMAIN, NOW),
    { ok: false, reason: "unsupported_scheme" },
  );
  assert.deepEqual(
    normalizeCompetitorCandidate(candidate({ url: "https://alpha-fragrance.com:8443/a" }), OWN_DOMAIN, NOW),
    { ok: false, reason: "unsupported_port" },
  );
  assert.deepEqual(
    normalizeCompetitorCandidate(candidate({ domain: "127.0.0.1", url: null }), OWN_DOMAIN, NOW),
    { ok: false, reason: "ip_literal_not_supported" },
  );
  assert.deepEqual(
    normalizeCompetitorCandidate(candidate({ domain: "competitor.local", url: null }), OWN_DOMAIN, NOW),
    { ok: false, reason: "special_use_host" },
  );
  assert.deepEqual(
    normalizeCompetitorCandidate(candidate({ domain: "other-fragrance.com" }), OWN_DOMAIN, NOW),
    { ok: false, reason: "domain_url_mismatch" },
  );
});

test("invalid confidence and future or malformed discovery timestamps fail closed", () => {
  assert.deepEqual(
    normalizeCompetitorCandidate(candidate({ confidence: 2 }), OWN_DOMAIN, NOW),
    { ok: false, reason: "invalid_confidence" },
  );
  assert.deepEqual(
    normalizeCompetitorCandidate(candidate({ discoveredAt: "not-a-date" }), OWN_DOMAIN, NOW),
    { ok: false, reason: "invalid_discovered_at" },
  );
  assert.deepEqual(
    normalizeCompetitorCandidate(candidate({ discoveredAt: "2026-09-14T16:00:00Z" }), OWN_DOMAIN, NOW),
    { ok: false, reason: "invalid_discovered_at" },
  );
});

test("scoring is transparent and deterministic with freshness and duplicate penalties", () => {
  const normalized = normalizeCompetitorCandidate(candidate(), OWN_DOMAIN, NOW);
  assert.equal(normalized.ok, true);
  if (!normalized.ok) return;
  const fresh = scoreCompetitorCandidate(normalized.candidate);
  const duplicate = scoreCompetitorCandidate({ ...normalized.candidate, duplicateCount: 4 });
  assert.equal(fresh.components.confidence, 32);
  assert.equal(fresh.components.freshness, 20);
  assert.ok(fresh.components.relevance > 0);
  assert.ok(fresh.components.coverage > 0);
  assert.equal(duplicate.components.duplicatePenalty, 6);
  assert.equal(duplicate.total, fresh.total - 6);
});

test("ranking is deterministic and uses score then stable lexical tie-breaks", () => {
  const inputs = [
    candidate({ url: "https://bravo-fragrance.com/collections/a", confidence: 0.5, discoveredAt: null }),
    candidate({ url: "https://alpha-fragrance.com/collections/a", confidence: 0.9 }),
    candidate({ url: "https://charlie-fragrance.com/collections/a", confidence: 0.7 }),
  ];
  const normalized = inputs.map((input) => normalizeCompetitorCandidate(input, OWN_DOMAIN, NOW));
  assert.ok(normalized.every((item) => item.ok));
  const ranked = rankCompetitorCandidates(normalized.flatMap((item) => item.ok ? [item.candidate] : []));
  assert.equal(ranked[0]?.domain, "alpha-fragrance.com");
  assert.equal(ranked[1]?.domain, "charlie-fragrance.com");
  assert.equal(ranked[2]?.domain, "bravo-fragrance.com");
});

test("plan uses diversity-aware round robin and enforces competitor, per-domain, and total target budgets", () => {
  const inputs: CompetitorCandidateInput[] = [
    candidate({ url: "https://alpha-fragrance.com/a", confidence: 0.95 }),
    candidate({ url: "https://alpha-fragrance.com/b", confidence: 0.94 }),
    candidate({ url: "https://alpha-fragrance.com/c", confidence: 0.93 }),
    candidate({ url: "https://bravo-fragrance.com/a", confidence: 0.85 }),
    candidate({ url: "https://bravo-fragrance.com/b", confidence: 0.84 }),
    candidate({ url: "https://charlie-fragrance.com/a", confidence: 0.75 }),
  ];
  const plan = planCompetitorCollection({
    ownDomain: OWN_DOMAIN,
    candidates: inputs,
    now: NOW,
    budget: { maxCompetitors: 2, maxUrlsPerCompetitor: 2, maxTotalTargets: 3 },
  });
  assert.equal(plan.selected.length, 3);
  assert.deepEqual(plan.selected.map((item) => item.domain), ["alpha-fragrance.com", "bravo-fragrance.com", "alpha-fragrance.com"]);
  assert.equal(new Set(plan.selected.map((item) => item.domain)).size, 2);
  assert.equal(plan.diagnostics.selectedCompetitors, 2);
  assert.equal(plan.diagnostics.selectedTargets, 3);
});

test("plan outputs Task #59-compatible proposed targets without authorizing configuration mutation", () => {
  const plan = planCompetitorCollection({ ownDomain: OWN_DOMAIN, candidates: [candidate()], now: NOW });
  assert.equal(plan.selected.length, 1);
  const target = plan.selected[0]?.target;
  assert.ok(target);
  assert.match(target!.id, /^plan-[0-9a-f]{16}$/);
  assert.equal(target!.url, "https://www.alpha-fragrance.com/collections/unisex");
  assert.equal(target!.allowedPathPrefix, "/collections/unisex");
  assert.equal(target!.confidence, 0.8);
  assert.equal(target!.pageType, "collection");
  assert.deepEqual(target!.internalLinkPatterns, []);
  assert.equal(plan.safety.targetConfigurationMutationAuthorized, false);
  assert.equal(plan.safety.networkCollectionAuthorized, false);
  assert.equal(plan.safety.evidencePersistenceAuthorized, false);
  assert.equal(plan.safety.executionAuthorized, false);
});

test("plan records rejection diagnostics and never lets rejected candidates consume budget", () => {
  const plan = planCompetitorCollection({
    ownDomain: OWN_DOMAIN,
    candidates: [
      candidate({ url: "https://diamondshelf.us/a" }),
      candidate({ domain: "competitor.local", url: null }),
      candidate({ url: "https://alpha-fragrance.com/a" }),
    ],
    now: NOW,
    budget: { maxTotalTargets: 1 },
  });
  assert.equal(plan.rejected.length, 2);
  assert.deepEqual(plan.rejected.map((item) => item.reason), ["own_domain", "special_use_host"]);
  assert.equal(plan.selected.length, 1);
  assert.equal(plan.selected[0]?.domain, "alpha-fragrance.com");
});

test("budget normalization fails closed to bounded defaults and clamps excessive requests", () => {
  assert.deepEqual(normalizeCompetitorPlanBudget({ maxCompetitors: 0, maxUrlsPerCompetitor: -1, maxTotalTargets: Number.NaN }), {
    maxCompetitors: 5,
    maxUrlsPerCompetitor: 3,
    maxTotalTargets: 10,
  });
  assert.deepEqual(normalizeCompetitorPlanBudget({ maxCompetitors: 999, maxUrlsPerCompetitor: 999, maxTotalTargets: 999 }), {
    maxCompetitors: 20,
    maxUrlsPerCompetitor: 10,
    maxTotalTargets: 50,
  });
});

test("planning result is deterministic regardless of candidate input order", () => {
  const inputs = [
    candidate({ url: "https://alpha-fragrance.com/a", source: "manual", confidence: 0.8 }),
    candidate({ url: "https://bravo-fragrance.com/b", source: "catalog", confidence: 0.7 }),
    candidate({ url: "https://alpha-fragrance.com/a?tracking=x", source: "catalog", confidence: 0.9, categories: ["Unisex", "Perfume"] }),
  ];
  const forward = planCompetitorCollection({ ownDomain: OWN_DOMAIN, candidates: inputs, now: NOW });
  const reverse = planCompetitorCollection({ ownDomain: OWN_DOMAIN, candidates: [...inputs].reverse(), now: NOW });
  assert.deepEqual(forward.candidates, reverse.candidates);
  assert.deepEqual(forward.selected, reverse.selected);
  assert.equal(forward.diagnostics.duplicateCount, 1);
  assert.equal(reverse.diagnostics.duplicateCount, 1);
});
