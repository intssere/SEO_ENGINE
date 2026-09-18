import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  buildP5_1ProviderSelectionReview,
  classifyP5_1ReviewFreshness,
  P5_1_PROVIDER_REVIEWED_AT,
  P5_1_REVIEWED_PROVIDER_CANDIDATES,
  providerSelectionReviewCapability,
  type ProviderCandidate,
} from "./external-search-provider-selection.js";

function candidates(): ProviderCandidate[] {
  return JSON.parse(JSON.stringify(P5_1_REVIEWED_PROVIDER_CANDIDATES)) as ProviderCandidate[];
}

test("P5.1 review deterministically selects separate provider roles", () => {
  const review = buildP5_1ProviderSelectionReview(candidates());
  assert.deepEqual(
    review.selections.map((selection) => [selection.role, selection.providerKey]),
    [
      ["dual_purpose_engineering", "dataforseo"],
      ["serp_benchmark_fallback", "serpapi"],
      ["official_keyword_reference", "google_ads_keyword_planner"],
    ],
  );
  assert.deepEqual(review.deferredBroadSuites, ["ahrefs", "semrush"]);
  assert.match(review.reviewId, /^p51-[0-9a-f]{24}$/);
  assert.match(review.fingerprint, /^[0-9a-f]{64}$/);
});

test("provider review identity is stable independent of input ordering", () => {
  const a = buildP5_1ProviderSelectionReview(candidates());
  const reversed = candidates().reverse();
  const b = buildP5_1ProviderSelectionReview(reversed);
  assert.equal(a.fingerprint, b.fingerprint);
  assert.equal(a.reviewId, b.reviewId);
});

test("review keeps cost and reliability provenance dated and explicit", () => {
  const review = buildP5_1ProviderSelectionReview(candidates());
  assert.equal(review.reviewedAt, P5_1_PROVIDER_REVIEWED_AT);
  for (const candidate of review.candidates) {
    assert.equal(candidate.pricing.reviewedAt, P5_1_PROVIDER_REVIEWED_AT);
    assert.equal(candidate.reliability.reviewedAt, P5_1_PROVIDER_REVIEWED_AT);
    assert.ok(candidate.pricing.sourceUrls.length > 0);
    assert.ok(candidate.reliability.sourceUrls.length > 0);
    assert.ok(candidate.pricing.sourceUrls.every((url) => url.startsWith("https://")));
    assert.ok(candidate.reliability.sourceUrls.every((url) => url.startsWith("https://")));
    assert.ok(candidate.pricing.summary.length > 20);
    assert.ok(candidate.reliability.summary.length > 20);
  }
});

test("review freshness is caller-time deterministic and becomes stale after the bounded review window", () => {
  const review = buildP5_1ProviderSelectionReview(candidates());
  assert.equal(classifyP5_1ReviewFreshness(review, "2026-09-18T12:00:00.000Z"), "fresh");
  assert.equal(classifyP5_1ReviewFreshness(review, review.reReviewAfter), "fresh");
  assert.equal(classifyP5_1ReviewFreshness(review, "2026-12-18T00:00:01.000Z"), "stale");
  assert.throws(
    () => classifyP5_1ReviewFreshness(review, "2026-09-17T23:59:59.000Z"),
    /review_date_in_future/,
  );
});

test("dual-purpose role fails closed when required SERP plus keyword coverage is unavailable", () => {
  const changed = candidates().map((candidate) =>
    candidate.key === "dataforseo"
      ? { ...candidate, capabilities: candidate.capabilities.filter((value) => value !== "keyword_ideas") }
      : candidate,
  );
  assert.throws(() => buildP5_1ProviderSelectionReview(changed), /no_eligible_provider_for_role:dual_purpose_engineering/);
});

test("SERP benchmark role requires explicit public status/SLA evidence", () => {
  const changed = candidates().map((candidate) =>
    candidate.key === "serpapi"
      ? {
          ...candidate,
          reliability: {
            ...candidate.reliability,
            evidenceClass: "vendor_documentation_only" as const,
          },
        }
      : candidate,
  );
  assert.throws(() => buildP5_1ProviderSelectionReview(changed), /no_eligible_provider_for_role:serp_benchmark_fallback/);
});

test("pricing or reliability evidence without provenance fails closed", () => {
  const missingPricing = candidates();
  missingPricing[0]!.pricing.sourceUrls = [];
  assert.throws(() => buildP5_1ProviderSelectionReview(missingPricing), /invalid_pricing_source_urls/);

  const missingReliability = candidates();
  missingReliability[0]!.reliability.summary = " ";
  assert.throws(() => buildP5_1ProviderSelectionReview(missingReliability), /missing_reliability_summary/);
});

test("duplicate provider identities fail closed", () => {
  const duplicated = candidates();
  duplicated.push(JSON.parse(JSON.stringify(duplicated[0])) as ProviderCandidate);
  assert.throws(() => buildP5_1ProviderSelectionReview(duplicated), /duplicate_provider_key/);
});

test("P5.1 capability is research-only and authorizes no provider/runtime mutation", () => {
  const capability = providerSelectionReviewCapability();
  assert.equal(capability.researchPlanningOnly, true);
  assert.equal(capability.providerEnrollmentAuthorized, false);
  assert.equal(capability.providerPurchaseAuthorized, false);
  assert.equal(capability.credentialCreationAuthorized, false);
  assert.equal(capability.credentialUseAuthorized, false);
  assert.equal(capability.sourceRegistryAdmissionAuthorized, false);
  assert.equal(capability.networkCollectionAuthorized, false);
  assert.equal(capability.task70ExecutionAuthorized, false);
  assert.equal(capability.observationPersistenceAuthorized, false);
  assert.equal(capability.evidencePersistenceAuthorized, false);
  assert.equal(capability.databaseReadsAuthorized, false);
  assert.equal(capability.databaseWritesAuthorized, false);
  assert.equal(capability.schemaMutationAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.batchEnabled, false);
  assert.equal(capability.autonomousWorkerEnabled, false);
  assert.equal(capability.retryLoopEnabled, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.publicationAuthorized, false);
  assert.equal(capability.automaticTransition, false);
});

test("P5.1 source contains no executable provider, credential, DB, or scheduler binding", () => {
  const source = readFileSync(
    fileURLToPath(new URL("./external-search-provider-selection.ts", import.meta.url)),
    "utf8",
  );
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /axios|undici|got\(/);
  assert.doesNotMatch(source, /process\.env|DATABASE_URL|postgres\(|drizzle/);
  assert.doesNotMatch(source, /api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token/i);
  assert.doesNotMatch(source, /setInterval|setTimeout|scheduler|worker_threads|child_process/);
  assert.doesNotMatch(source, /from ["']\.\/signal-source-registry/);
});
