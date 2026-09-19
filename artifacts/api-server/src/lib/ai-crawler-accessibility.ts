import { createHash } from "node:crypto";

export const P7_1_AI_CRAWLER_ACCESSIBILITY_VERSION =
  "p7.1-ai-crawler-accessibility-v1" as const;
export const P7_1_MAX_OBSERVATIONS = 512 as const;
export const P7_1_MAX_BOTS = 64 as const;
export const P7_1_MAX_USER_AGENT_LENGTH = 256 as const;
export const P7_1_MAX_PATH_LENGTH = 2048 as const;

export type AiCrawlerRobotsDecision = "allowed" | "disallowed" | "unknown";

export type AiCrawlerAccessibilityStatus =
  | "accessible"
  | "blocked"
  | "limited"
  | "unavailable"
  | "indeterminate";

export type AiCrawlerBotSummaryStatus =
  | AiCrawlerAccessibilityStatus
  | "mixed";

export type AiCrawlerDiagnosticReason =
  | "robots_allowed"
  | "robots_disallowed"
  | "robots_unknown"
  | "http_success"
  | "http_access_denied"
  | "resource_unavailable"
  | "rate_limited"
  | "redirect_unresolved"
  | "server_error"
  | "http_other"
  | "http_status_missing"
  | "challenge_detected"
  | "body_available"
  | "body_unavailable"
  | "body_unknown";

export type AiCrawlerAccessibilityObservationInput = {
  botKey: string;
  userAgent: string;
  path: string;
  evidenceFingerprint: string;
  observedAt: string;
  robotsDecision: AiCrawlerRobotsDecision;
  robotsRuleFingerprint: string | null;
  httpStatus: number | null;
  challengeDetected: boolean | null;
  bodyAvailable: boolean | null;
};

export type AiCrawlerAccessibilityAuditInput = {
  siteKey: string;
  referenceTime: string;
  observations: AiCrawlerAccessibilityObservationInput[];
};

export type AiCrawlerAccessibilityProbe = {
  probeId: string;
  probeFingerprint: string;
  botKey: string;
  userAgent: string;
  path: string;
  evidenceFingerprint: string;
  observedAt: string;
  robotsDecision: AiCrawlerRobotsDecision;
  robotsRuleFingerprint: string | null;
  httpStatus: number | null;
  challengeDetected: boolean | null;
  bodyAvailable: boolean | null;
  status: AiCrawlerAccessibilityStatus;
  reasons: AiCrawlerDiagnosticReason[];
};

export type AiCrawlerBotSummary = {
  botSummaryId: string;
  botSummaryFingerprint: string;
  botKey: string;
  userAgent: string;
  status: AiCrawlerBotSummaryStatus;
  counts: {
    probes: number;
    accessible: number;
    blocked: number;
    limited: number;
    unavailable: number;
    indeterminate: number;
  };
  probeFingerprints: string[];
};

export type AiCrawlerAccessibilityAuditReport = {
  version: typeof P7_1_AI_CRAWLER_ACCESSIBILITY_VERSION;
  reportId: string;
  reportFingerprint: string;
  siteKey: string;
  referenceTime: string;
  counts: {
    inputObservations: number;
    uniqueObservations: number;
    duplicatesCollapsed: number;
    bots: number;
    accessible: number;
    blocked: number;
    limited: number;
    unavailable: number;
    indeterminate: number;
  };
  probes: AiCrawlerAccessibilityProbe[];
  bots: AiCrawlerBotSummary[];
  semantics: ReturnType<typeof aiCrawlerAccessibilitySemantics>;
  safety: ReturnType<typeof aiCrawlerAccessibilityCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const KEY = /^[a-z0-9][a-z0-9._:-]{0,95}$/;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function canonicalJson(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined";
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

function hash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function normalizeKey(value: unknown, errorCode: string): string {
  if (typeof value !== "string") throw new Error(errorCode);
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  if (!KEY.test(normalized)) throw new Error(errorCode);
  return normalized;
}

function canonicalTimestamp(value: unknown, errorCode: string): string {
  if (typeof value !== "string") throw new Error(errorCode);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(errorCode);
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) throw new Error(errorCode);
  return canonical;
}

function validateUserAgent(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > P7_1_MAX_USER_AGENT_LENGTH ||
    CONTROL_CHARACTERS.test(value)
  ) {
    throw new Error("invalid_ai_crawler_user_agent");
  }
  return value;
}

function validatePath(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > P7_1_MAX_PATH_LENGTH ||
    !value.startsWith("/") ||
    value.includes("#") ||
    CONTROL_CHARACTERS.test(value)
  ) {
    throw new Error("invalid_ai_crawler_path");
  }
  return value;
}

function validateFingerprint(value: unknown, errorCode: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) throw new Error(errorCode);
  return value;
}

function validateHttpStatus(value: unknown): number | null {
  if (value === null) return null;
  if (!Number.isInteger(value) || (value as number) < 100 || (value as number) > 599) {
    throw new Error("invalid_ai_crawler_http_status");
  }
  return value as number;
}

function validateNullableBoolean(value: unknown, errorCode: string): boolean | null {
  if (value === null) return null;
  if (typeof value !== "boolean") throw new Error(errorCode);
  return value;
}

function httpReason(status: number | null): AiCrawlerDiagnosticReason {
  if (status === null) return "http_status_missing";
  if (status >= 200 && status <= 299) return "http_success";
  if (status === 401 || status === 403) return "http_access_denied";
  if (status === 404 || status === 410) return "resource_unavailable";
  if (status === 429) return "rate_limited";
  if (status >= 300 && status <= 399) return "redirect_unresolved";
  if (status >= 500 && status <= 599) return "server_error";
  return "http_other";
}

function classifyProbe(
  robotsDecision: AiCrawlerRobotsDecision,
  httpStatus: number | null,
  challengeDetected: boolean | null,
  bodyAvailable: boolean | null,
): { status: AiCrawlerAccessibilityStatus; reasons: AiCrawlerDiagnosticReason[] } {
  const reasons: AiCrawlerDiagnosticReason[] = [
    robotsDecision === "allowed"
      ? "robots_allowed"
      : robotsDecision === "disallowed"
        ? "robots_disallowed"
        : "robots_unknown",
    httpReason(httpStatus),
  ];

  if (challengeDetected === true) reasons.push("challenge_detected");
  reasons.push(
    bodyAvailable === true
      ? "body_available"
      : bodyAvailable === false
        ? "body_unavailable"
        : "body_unknown",
  );

  if (robotsDecision === "disallowed" || httpStatus === 401 || httpStatus === 403) {
    return { status: "blocked", reasons };
  }
  if (httpStatus === 404 || httpStatus === 410) {
    return { status: "unavailable", reasons };
  }
  if (
    challengeDetected === true ||
    httpStatus === 429 ||
    (httpStatus !== null && httpStatus >= 300 && httpStatus <= 399)
  ) {
    return { status: "limited", reasons };
  }
  if (
    robotsDecision === "allowed" &&
    httpStatus !== null &&
    httpStatus >= 200 &&
    httpStatus <= 299 &&
    bodyAvailable === true
  ) {
    return { status: "accessible", reasons };
  }
  return { status: "indeterminate", reasons };
}

function normalizeObservation(
  input: AiCrawlerAccessibilityObservationInput,
  referenceTime: string,
): Omit<AiCrawlerAccessibilityProbe, "probeId" | "probeFingerprint" | "status" | "reasons"> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_ai_crawler_observation");
  }

  const botKey = normalizeKey(input.botKey, "invalid_ai_crawler_bot_key");
  const userAgent = validateUserAgent(input.userAgent);
  const path = validatePath(input.path);
  const evidenceFingerprint = validateFingerprint(
    input.evidenceFingerprint,
    "invalid_ai_crawler_evidence_fingerprint",
  );
  const observedAt = canonicalTimestamp(
    input.observedAt,
    "invalid_ai_crawler_observed_at",
  );
  if (observedAt > referenceTime) throw new Error("ai_crawler_observation_after_reference_time");

  if (
    input.robotsDecision !== "allowed" &&
    input.robotsDecision !== "disallowed" &&
    input.robotsDecision !== "unknown"
  ) {
    throw new Error("invalid_ai_crawler_robots_decision");
  }

  const robotsRuleFingerprint =
    input.robotsRuleFingerprint === null
      ? null
      : validateFingerprint(
          input.robotsRuleFingerprint,
          "invalid_ai_crawler_robots_rule_fingerprint",
        );

  return {
    botKey,
    userAgent,
    path,
    evidenceFingerprint,
    observedAt,
    robotsDecision: input.robotsDecision,
    robotsRuleFingerprint,
    httpStatus: validateHttpStatus(input.httpStatus),
    challengeDetected: validateNullableBoolean(
      input.challengeDetected,
      "invalid_ai_crawler_challenge_detected",
    ),
    bodyAvailable: validateNullableBoolean(
      input.bodyAvailable,
      "invalid_ai_crawler_body_available",
    ),
  };
}

function buildProbe(
  normalized: ReturnType<typeof normalizeObservation>,
): AiCrawlerAccessibilityProbe {
  const classified = classifyProbe(
    normalized.robotsDecision,
    normalized.httpStatus,
    normalized.challengeDetected,
    normalized.bodyAvailable,
  );
  const identity = {
    version: P7_1_AI_CRAWLER_ACCESSIBILITY_VERSION,
    ...normalized,
    status: classified.status,
    reasons: classified.reasons,
  };
  const probeFingerprint = hash(identity);
  return {
    probeId: `p71-probe-${probeFingerprint.slice(0, 20)}`,
    probeFingerprint,
    ...normalized,
    status: classified.status,
    reasons: classified.reasons,
  };
}

function botSummaryStatus(
  probes: AiCrawlerAccessibilityProbe[],
): AiCrawlerBotSummaryStatus {
  const statuses = new Set(probes.map((probe) => probe.status));
  if (statuses.size === 1) return probes[0]!.status;
  return "mixed";
}

function buildBotSummary(
  botKey: string,
  userAgent: string,
  probes: AiCrawlerAccessibilityProbe[],
): AiCrawlerBotSummary {
  const counts = {
    probes: probes.length,
    accessible: probes.filter((probe) => probe.status === "accessible").length,
    blocked: probes.filter((probe) => probe.status === "blocked").length,
    limited: probes.filter((probe) => probe.status === "limited").length,
    unavailable: probes.filter((probe) => probe.status === "unavailable").length,
    indeterminate: probes.filter((probe) => probe.status === "indeterminate").length,
  };
  const status = botSummaryStatus(probes);
  const probeFingerprints = probes.map((probe) => probe.probeFingerprint);
  const identity = {
    version: P7_1_AI_CRAWLER_ACCESSIBILITY_VERSION,
    botKey,
    userAgent,
    status,
    counts,
    probeFingerprints,
  };
  const botSummaryFingerprint = hash(identity);

  return {
    botSummaryId: `p71-bot-${botSummaryFingerprint.slice(0, 20)}`,
    botSummaryFingerprint,
    botKey,
    userAgent,
    status,
    counts,
    probeFingerprints,
  };
}

export function aiCrawlerAccessibilitySemantics() {
  return Object.freeze({
    suppliedEvidenceOnly: true,
    liveCrawlPerformed: false,
    robotsTxtParsingPerformed: false,
    botIdentityCallerSupplied: true,
    vendorPolicyLookupPerformed: false,
    robotsAllowanceIsTrainingConsent: false,
    robotsAllowanceIsLicense: false,
    accessibilityImpliesIndexing: false,
    accessibilityImpliesCitation: false,
    accessibilityImpliesAiAnswerVisibility: false,
    statusDiagnosesVendorIntent: false,
    metaRobotsOrXRobotsInferred: false,
    recommendationGenerated: false,
    promptTopicModelGenerated: false,
    answerVisibilityCollected: false,
    visibilityScored: false,
    opportunityGenerated: false,
  });
}

export function aiCrawlerAccessibilityCapability() {
  return Object.freeze({
    deterministicAuditOnly: true,
    liveCrawlerEnabled: false,
    robotsFetchAuthorized: false,
    providerRequestsAuthorized: false,
    providerCredentialUseAuthorized: false,
    aiModelCallsAuthorized: false,
    sourceRegistryAdmissionAuthorized: false,
    observationPersistenceAuthorized: false,
    accessibilityPersistenceAuthorized: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    schemaMutationAuthorized: false,
    schedulerEnabled: false,
    workerEnabled: false,
    retryLoopEnabled: false,
    approvalGrantAuthorized: false,
    applyAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
    automaticTransitionEnabled: false,
    publicationAuthorized: false,
  });
}

export function auditAiCrawlerAccessibility(
  input: AiCrawlerAccessibilityAuditInput,
): AiCrawlerAccessibilityAuditReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_ai_crawler_audit_input");
  }

  const siteKey = normalizeKey(input.siteKey, "invalid_ai_crawler_site_key");
  const referenceTime = canonicalTimestamp(
    input.referenceTime,
    "invalid_ai_crawler_reference_time",
  );
  if (!Array.isArray(input.observations)) {
    throw new Error("invalid_ai_crawler_observations");
  }
  if (input.observations.length > P7_1_MAX_OBSERVATIONS) {
    throw new Error("ai_crawler_observation_limit_exceeded");
  }

  const botUserAgents = new Map<string, string>();
  const unique = new Map<string, ReturnType<typeof normalizeObservation>>();

  for (const observation of input.observations) {
    const normalized = normalizeObservation(observation, referenceTime);
    const previousUserAgent = botUserAgents.get(normalized.botKey);
    if (previousUserAgent !== undefined && previousUserAgent !== normalized.userAgent) {
      throw new Error("ai_crawler_bot_user_agent_conflict");
    }
    botUserAgents.set(normalized.botKey, normalized.userAgent);

    const duplicateKey =
      `${normalized.botKey}\u0000${normalized.path}\u0000${normalized.evidenceFingerprint}`;
    const previous = unique.get(duplicateKey);
    if (previous !== undefined) {
      if (canonicalJson(previous) !== canonicalJson(normalized)) {
        throw new Error("ai_crawler_duplicate_observation_conflict");
      }
      continue;
    }
    unique.set(duplicateKey, normalized);
  }

  if (botUserAgents.size > P7_1_MAX_BOTS) {
    throw new Error("ai_crawler_bot_limit_exceeded");
  }

  const probes = [...unique.values()]
    .map((observation) => buildProbe(observation))
    .sort((a, b) =>
      a.botKey.localeCompare(b.botKey) ||
      a.path.localeCompare(b.path) ||
      a.evidenceFingerprint.localeCompare(b.evidenceFingerprint) ||
      a.observedAt.localeCompare(b.observedAt));

  const probesByBot = new Map<string, AiCrawlerAccessibilityProbe[]>();
  for (const probe of probes) {
    const values = probesByBot.get(probe.botKey) ?? [];
    values.push(probe);
    probesByBot.set(probe.botKey, values);
  }

  const bots = [...probesByBot.entries()]
    .map(([botKey, botProbes]) =>
      buildBotSummary(botKey, botUserAgents.get(botKey)!, botProbes))
    .sort((a, b) => a.botKey.localeCompare(b.botKey));

  const counts = {
    inputObservations: input.observations.length,
    uniqueObservations: probes.length,
    duplicatesCollapsed: input.observations.length - probes.length,
    bots: bots.length,
    accessible: probes.filter((probe) => probe.status === "accessible").length,
    blocked: probes.filter((probe) => probe.status === "blocked").length,
    limited: probes.filter((probe) => probe.status === "limited").length,
    unavailable: probes.filter((probe) => probe.status === "unavailable").length,
    indeterminate: probes.filter((probe) => probe.status === "indeterminate").length,
  };
  const semantics = aiCrawlerAccessibilitySemantics();
  const identity = {
    version: P7_1_AI_CRAWLER_ACCESSIBILITY_VERSION,
    siteKey,
    referenceTime,
    counts,
    probes,
    bots,
    semantics,
  };
  const reportFingerprint = hash(identity);

  return {
    version: P7_1_AI_CRAWLER_ACCESSIBILITY_VERSION,
    reportId: `p71-report-${reportFingerprint.slice(0, 20)}`,
    reportFingerprint,
    siteKey,
    referenceTime,
    counts,
    probes,
    bots,
    semantics,
    safety: aiCrawlerAccessibilityCapability(),
  };
}
