import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  P7_1_MAX_BOTS,
  P7_1_MAX_OBSERVATIONS,
  P7_1_MAX_PATH_LENGTH,
  P7_1_MAX_USER_AGENT_LENGTH,
  auditAiCrawlerAccessibility,
  aiCrawlerAccessibilityCapability,
  type AiCrawlerAccessibilityObservationInput,
} from "./ai-crawler-accessibility.js";

const REFERENCE = "2026-09-19T12:00:00.000Z";

function fp(value: number): string {
  return value.toString(16).padStart(64, "0");
}

function observation(
  botKey: string,
  path: string,
  index: number,
  overrides: Partial<AiCrawlerAccessibilityObservationInput> = {},
): AiCrawlerAccessibilityObservationInput {
  return {
    botKey,
    userAgent: `${botKey}/1.0`,
    path,
    evidenceFingerprint: fp(index),
    observedAt: "2026-09-19T10:00:00.000Z",
    robotsDecision: "allowed",
    robotsRuleFingerprint: fp(index + 1000),
    httpStatus: 200,
    challengeDetected: false,
    bodyAvailable: true,
    ...overrides,
  };
}

test("P7.1 classifies accessible, blocked, unavailable, limited and indeterminate probes deterministically", () => {
  const report = auditAiCrawlerAccessibility({
    siteKey: "DiamondShelf",
    referenceTime: REFERENCE,
    observations: [
      observation("bot-accessible", "/", 1),
      observation("bot-robots-block", "/blocked", 2, { robotsDecision: "disallowed" }),
      observation("bot-http-block", "/forbidden", 3, { httpStatus: 403 }),
      observation("bot-missing", "/gone", 4, { httpStatus: 404, bodyAvailable: false }),
      observation("bot-rate", "/rate", 5, { httpStatus: 429, bodyAvailable: false }),
      observation("bot-redirect", "/redirect", 6, { httpStatus: 302, bodyAvailable: false }),
      observation("bot-challenge", "/challenge", 7, { challengeDetected: true }),
      observation("bot-unknown", "/unknown", 8, { robotsDecision: "unknown" }),
    ],
  });

  const byPath = new Map(report.probes.map((probe) => [probe.path, probe]));
  assert.equal(byPath.get("/")?.status, "accessible");
  assert.equal(byPath.get("/blocked")?.status, "blocked");
  assert.equal(byPath.get("/forbidden")?.status, "blocked");
  assert.equal(byPath.get("/gone")?.status, "unavailable");
  assert.equal(byPath.get("/rate")?.status, "limited");
  assert.equal(byPath.get("/redirect")?.status, "limited");
  assert.equal(byPath.get("/challenge")?.status, "limited");
  assert.equal(byPath.get("/unknown")?.status, "indeterminate");

  assert.deepEqual(report.counts, {
    inputObservations: 8,
    uniqueObservations: 8,
    duplicatesCollapsed: 0,
    bots: 8,
    accessible: 1,
    blocked: 2,
    limited: 3,
    unavailable: 1,
    indeterminate: 1,
  });
});

test("classification precedence keeps explicit blocks above unavailable/limited/accessibility", () => {
  const report = auditAiCrawlerAccessibility({
    siteKey: "site",
    referenceTime: REFERENCE,
    observations: [
      observation("bot-a", "/a", 10, {
        robotsDecision: "disallowed",
        httpStatus: 404,
        challengeDetected: true,
      }),
      observation("bot-b", "/b", 11, {
        httpStatus: 403,
        challengeDetected: true,
      }),
    ],
  });

  assert.ok(report.probes.every((probe) => probe.status === "blocked"));
  assert.ok(report.probes[0]?.reasons.includes("robots_disallowed"));
  assert.ok(report.probes[0]?.reasons.includes("resource_unavailable"));
  assert.ok(report.probes[0]?.reasons.includes("challenge_detected"));
});

test("bot summaries are homogeneous only when all probes share one status, otherwise mixed", () => {
  const report = auditAiCrawlerAccessibility({
    siteKey: "site",
    referenceTime: REFERENCE,
    observations: [
      observation("mixed-bot", "/", 20),
      observation("mixed-bot", "/private", 21, { robotsDecision: "disallowed" }),
      observation("blocked-bot", "/a", 22, { robotsDecision: "disallowed" }),
      observation("blocked-bot", "/b", 23, { httpStatus: 403 }),
    ],
  });
  const summaries = new Map(report.bots.map((bot) => [bot.botKey, bot]));

  assert.equal(summaries.get("mixed-bot")?.status, "mixed");
  assert.equal(summaries.get("blocked-bot")?.status, "blocked");
  assert.deepEqual(summaries.get("mixed-bot")?.counts, {
    probes: 2,
    accessible: 1,
    blocked: 1,
    limited: 0,
    unavailable: 0,
    indeterminate: 0,
  });
});

test("exact duplicate observations collapse and input order cannot change report identity", () => {
  const a = observation("bot-a", "/", 30);
  const b = observation("bot-b", "/products/x", 31, { robotsDecision: "unknown" });

  const one = auditAiCrawlerAccessibility({
    siteKey: " SITE.KEY ",
    referenceTime: REFERENCE,
    observations: [a, b, a],
  });
  const two = auditAiCrawlerAccessibility({
    siteKey: "site.key",
    referenceTime: REFERENCE,
    observations: [a, a, b],
  });

  assert.equal(one.reportFingerprint, two.reportFingerprint);
  assert.deepEqual(one, two);
  assert.equal(one.counts.inputObservations, 3);
  assert.equal(one.counts.uniqueObservations, 2);
  assert.equal(one.counts.duplicatesCollapsed, 1);
});

test("conflicting duplicate evidence and conflicting bot user agents fail closed", () => {
  const base = observation("bot-a", "/", 40);

  assert.throws(
    () => auditAiCrawlerAccessibility({
      siteKey: "site",
      referenceTime: REFERENCE,
      observations: [base, { ...base, httpStatus: 403 }],
    }),
    /ai_crawler_duplicate_observation_conflict/,
  );

  assert.throws(
    () => auditAiCrawlerAccessibility({
      siteKey: "site",
      referenceTime: REFERENCE,
      observations: [
        base,
        observation("bot-a", "/other", 41, { userAgent: "DifferentBot/2.0" }),
      ],
    }),
    /ai_crawler_bot_user_agent_conflict/,
  );
});

test("bot names never infer vendor policy or change classification semantics", () => {
  const report = auditAiCrawlerAccessibility({
    siteKey: "site",
    referenceTime: REFERENCE,
    observations: [
      observation("gptbot", "/", 50, { robotsDecision: "unknown" }),
      observation("totally-generic-bot", "/other", 51, { robotsDecision: "unknown" }),
    ],
  });

  assert.ok(report.probes.every((probe) => probe.status === "indeterminate"));
  assert.equal(report.semantics.botIdentityCallerSupplied, true);
  assert.equal(report.semantics.vendorPolicyLookupPerformed, false);
  assert.equal(report.semantics.statusDiagnosesVendorIntent, false);
});

test("robots allowance does not imply consent, indexing, citation or AI-answer visibility", () => {
  const report = auditAiCrawlerAccessibility({
    siteKey: "site",
    referenceTime: REFERENCE,
    observations: [observation("bot-a", "/", 60)],
  });

  assert.equal(report.probes[0]?.status, "accessible");
  assert.equal(report.semantics.robotsAllowanceIsTrainingConsent, false);
  assert.equal(report.semantics.robotsAllowanceIsLicense, false);
  assert.equal(report.semantics.accessibilityImpliesIndexing, false);
  assert.equal(report.semantics.accessibilityImpliesCitation, false);
  assert.equal(report.semantics.accessibilityImpliesAiAnswerVisibility, false);
  assert.equal(report.semantics.metaRobotsOrXRobotsInferred, false);
});

test("HTTP/body evidence remains descriptive and missing policy evidence stays indeterminate", () => {
  const report = auditAiCrawlerAccessibility({
    siteKey: "site",
    referenceTime: REFERENCE,
    observations: [
      observation("bot-a", "/body-missing", 70, { bodyAvailable: null }),
      observation("bot-b", "/http-missing", 71, {
        robotsDecision: "allowed",
        httpStatus: null,
        bodyAvailable: true,
      }),
      observation("bot-c", "/server-error", 72, { httpStatus: 503, bodyAvailable: false }),
    ],
  });

  assert.ok(report.probes.every((probe) => probe.status === "indeterminate"));
  assert.ok(report.probes.find((probe) => probe.path === "/body-missing")?.reasons.includes("body_unknown"));
  assert.ok(report.probes.find((probe) => probe.path === "/http-missing")?.reasons.includes("http_status_missing"));
  assert.ok(report.probes.find((probe) => probe.path === "/server-error")?.reasons.includes("server_error"));
});

test("canonical timestamp, future observation, fingerprint, HTTP and path validation fail closed", () => {
  const base = observation("bot-a", "/", 80);

  assert.throws(
    () => auditAiCrawlerAccessibility({
      siteKey: "site",
      referenceTime: "2026-09-19T12:00:00Z",
      observations: [base],
    }),
    /invalid_ai_crawler_reference_time/,
  );
  assert.throws(
    () => auditAiCrawlerAccessibility({
      siteKey: "site",
      referenceTime: REFERENCE,
      observations: [{ ...base, observedAt: "2026-09-19T13:00:00.000Z" }],
    }),
    /ai_crawler_observation_after_reference_time/,
  );
  assert.throws(
    () => auditAiCrawlerAccessibility({
      siteKey: "site",
      referenceTime: REFERENCE,
      observations: [{ ...base, evidenceFingerprint: "not-a-fingerprint" }],
    }),
    /invalid_ai_crawler_evidence_fingerprint/,
  );
  assert.throws(
    () => auditAiCrawlerAccessibility({
      siteKey: "site",
      referenceTime: REFERENCE,
      observations: [{ ...base, httpStatus: 99 }],
    }),
    /invalid_ai_crawler_http_status/,
  );
  assert.throws(
    () => auditAiCrawlerAccessibility({
      siteKey: "site",
      referenceTime: REFERENCE,
      observations: [{ ...base, path: "https://example.com/" }],
    }),
    /invalid_ai_crawler_path/,
  );
});

test("observation, bot, user-agent and path bounds fail closed", () => {
  const base = observation("bot-a", "/", 90);

  assert.throws(
    () => auditAiCrawlerAccessibility({
      siteKey: "site",
      referenceTime: REFERENCE,
      observations: Array.from({ length: P7_1_MAX_OBSERVATIONS + 1 }, (_, index) =>
        observation(`bot-${index % 2}`, `/p/${index}`, 1000 + index)),
    }),
    /ai_crawler_observation_limit_exceeded/,
  );

  assert.throws(
    () => auditAiCrawlerAccessibility({
      siteKey: "site",
      referenceTime: REFERENCE,
      observations: Array.from({ length: P7_1_MAX_BOTS + 1 }, (_, index) =>
        observation(`bot-${index}`, "/", 3000 + index)),
    }),
    /ai_crawler_bot_limit_exceeded/,
  );

  assert.throws(
    () => auditAiCrawlerAccessibility({
      siteKey: "site",
      referenceTime: REFERENCE,
      observations: [{ ...base, userAgent: "x".repeat(P7_1_MAX_USER_AGENT_LENGTH + 1) }],
    }),
    /invalid_ai_crawler_user_agent/,
  );

  assert.throws(
    () => auditAiCrawlerAccessibility({
      siteKey: "site",
      referenceTime: REFERENCE,
      observations: [{ ...base, path: `/${"x".repeat(P7_1_MAX_PATH_LENGTH)}` }],
    }),
    /invalid_ai_crawler_path/,
  );
});

test("P7.1 capability keeps crawl, provider, persistence, execution and publication closed", () => {
  const capability = aiCrawlerAccessibilityCapability();
  assert.equal(capability.deterministicAuditOnly, true);
  assert.equal(capability.liveCrawlerEnabled, false);
  assert.equal(capability.robotsFetchAuthorized, false);
  assert.equal(capability.providerRequestsAuthorized, false);
  assert.equal(capability.providerCredentialUseAuthorized, false);
  assert.equal(capability.aiModelCallsAuthorized, false);
  assert.equal(capability.sourceRegistryAdmissionAuthorized, false);
  assert.equal(capability.observationPersistenceAuthorized, false);
  assert.equal(capability.accessibilityPersistenceAuthorized, false);
  assert.equal(capability.databaseReadsAuthorized, false);
  assert.equal(capability.databaseWritesAuthorized, false);
  assert.equal(capability.schemaMutationAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.workerEnabled, false);
  assert.equal(capability.retryLoopEnabled, false);
  assert.equal(capability.approvalGrantAuthorized, false);
  assert.equal(capability.applyAuthorized, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.automaticTransitionEnabled, false);
  assert.equal(capability.publicationAuthorized, false);
});

test("P7.1 source contains no network, AI, environment, database, persistence, execution or scheduler primitive", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const sourceText = readFileSync(join(here, "ai-crawler-accessibility.ts"), "utf8");
  assert.doesNotMatch(sourceText, /\bfetch\s*\(/);
  assert.doesNotMatch(sourceText, /XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(sourceText, /\bOpenAI\b|chat\.completions|responses\.create/);
  assert.doesNotMatch(sourceText, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(sourceText, /executeCompetitorPilot|executeAuthorizedSignalCollectionJob/);
  assert.doesNotMatch(sourceText, /\b(?:insertInto|updateTable|deleteFrom|persistRecord|sql\s*\`|db\.(?:insert|update|delete))\b/);
  assert.doesNotMatch(sourceText, /setTimeout|setInterval|queueMicrotask/);
});
