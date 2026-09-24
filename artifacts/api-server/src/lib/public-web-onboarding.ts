import { createHash } from "node:crypto";

export const UGP_PUBLIC_WEB_ONBOARDING_VERSION =
  "ugp-3-1-public-web-onboarding-v1" as const;

export const UGP_PUBLIC_WEB_ONBOARDING_LIMITS = Object.freeze({
  maxUrlLength: 2_048,
  maxRedirects: 5,
  maxRobotsBytes: 512_000,
  maxSitemapHints: 32,
} as const);

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const RESERVED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home",
  ".lan",
  ".test",
  ".invalid",
  ".onion",
] as const;

export type PublicWebOnboardingAuthorization = Readonly<{
  networkReadAuthorized: false;
  crawlExecutionAuthorized: false;
  persistenceAuthorized: false;
  schedulerEnabled: false;
  autonomousWorkerEnabled: false;
  providerWrites: false;
  publicSiteWrites: false;
}>;

export type PublicWebOnboardingPlan = Readonly<{
  version: typeof UGP_PUBLIC_WEB_ONBOARDING_VERSION;
  submitted: Readonly<{
    input: string;
    normalizedUrl: string;
    candidateOrigin: string;
    hostname: string;
    scheme: "http" | "https";
  }>;
  resolution: Readonly<{
    bootstrapUrl: string;
    method: "GET";
    redirectMode: "manual";
    maxRedirects: number;
    publicAddressVerification: "required_before_each_request";
    redirectTargetRevalidation: true;
    finalHttpsRequired: true;
    robotsPath: "/robots.txt";
    sitemapDiscovery: "robots_hints_plus_conventional";
    conventionalSitemapPaths: readonly ["/sitemap.xml", "/sitemap_index.xml"];
    platformDetection: "not_performed";
  }>;
  authorization: PublicWebOnboardingAuthorization;
  planFingerprint: string;
}>;

export type SuppliedPublicWebHop = Readonly<{
  requestUrl: string;
  statusCode: number;
  resolvedAddresses: readonly string[];
  location: string | null;
}>;

export type SuppliedRobotsObservation = Readonly<{
  requestUrl: string;
  statusCode: number;
  resolvedAddresses: readonly string[];
  body: string | null;
}>;

export type SuppliedPublicWebResolutionEvidence = Readonly<{
  redirectHops: readonly SuppliedPublicWebHop[];
  robots: SuppliedRobotsObservation;
}>;

export type RejectedSitemapHint = Readonly<{
  value: string;
  reason:
    | "invalid_url"
    | "unsupported_scheme"
    | "credentials_not_allowed"
    | "nonstandard_port"
    | "non_public_host"
    | "cross_origin";
}>;

export type PublicWebOnboardingResolution = Readonly<{
  version: typeof UGP_PUBLIC_WEB_ONBOARDING_VERSION;
  planFingerprint: string;
  evidenceMode: "supplied_only";
  finalUrl: string;
  canonicalOrigin: string;
  hostname: string;
  finalStatusCode: number;
  redirectCount: number;
  robots: Readonly<{
    url: string;
    statusCode: number;
    state: "observed" | "absent" | "unavailable";
  }>;
  sitemapCandidates: readonly string[];
  rejectedSitemapHints: readonly RejectedSitemapHint[];
  platformDetection: "not_performed";
  readAnalysisEligibility: Readonly<{
    eligible: boolean;
    reason:
      | "eligible"
      | "final_response_not_success"
      | "robots_unavailable";
  }>;
  authorization: PublicWebOnboardingAuthorization;
  resolutionFingerprint: string;
}>;

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
    .join(",") + "}";
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function authorizationBoundary(): PublicWebOnboardingAuthorization {
  return {
    networkReadAuthorized: false,
    crawlExecutionAuthorized: false,
    persistenceAuthorized: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
  };
}

function parseIpv4(value: string): number[] | null {
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^[0-9]{1,3}$/.test(part))) {
    return null;
  }
  const octets = parts.map(Number);
  if (octets.some((part) => part > 255)) return null;
  return octets;
}

function ipv4IsNonPublic(octets: number[]): boolean {
  const [a, b, c] = octets;
  return (
    a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0 && c === 0)
    || (a === 192 && b === 0 && c === 2)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || a >= 224
  );
}

function ipv6IsNonPublic(value: string): boolean {
  const host = value.toLowerCase();
  if (host === "::" || host === "::1") return true;
  if (/^(?:fc|fd)/.test(host)) return true;
  if (/^fe[89ab]/.test(host)) return true;
  if (/^ff/.test(host)) return true;
  if (/^2001:db8(?:\:|$)/.test(host)) return true;
  if (/^100(?:\:|$)/.test(host)) return true;
  if (host.startsWith("::ffff:")) {
    const mapped = parseIpv4(host.slice("::ffff:".length));
    return mapped ? ipv4IsNonPublic(mapped) : true;
  }
  return false;
}

function hostIsPublicCandidate(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return false;

  const ipv4 = parseIpv4(host);
  if (ipv4) return !ipv4IsNonPublic(ipv4);

  if (host.includes(":")) return !ipv6IsNonPublic(host);

  if (
    host === "localhost"
    || host === "local"
    || host === "internal"
    || host === "home"
    || host === "lan"
    || host === "test"
    || host === "invalid"
    || host === "onion"
    || RESERVED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
  ) {
    return false;
  }

  if (!host.includes(".")) return false;
  if (host.startsWith(".") || host.endsWith(".") || host.includes("..")) return false;
  return true;
}

function parsePublicUrl(
  value: string,
  options: {
    allowImplicitHttps: boolean;
    stripFragment: boolean;
  },
): URL {
  if (
    typeof value !== "string"
    || value.length < 1
    || value.length > UGP_PUBLIC_WEB_ONBOARDING_LIMITS.maxUrlLength
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_public_web_url_invalid");
  }

  const trimmed = value.trim();
  if (!trimmed) throw new Error("ugp_public_web_url_invalid");
  const candidate =
    options.allowImplicitHttps && !/^[a-z][a-z0-9+.-]*:/i.test(trimmed)
      ? "https://" + trimmed
      : trimmed;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("ugp_public_web_url_invalid");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("ugp_public_web_scheme_unsupported");
  }
  if (url.username || url.password) {
    throw new Error("ugp_public_web_credentials_not_allowed");
  }
  if (url.port) {
    throw new Error("ugp_public_web_nonstandard_port_not_allowed");
  }
  if (!hostIsPublicCandidate(url.hostname)) {
    throw new Error("ugp_public_web_host_not_public");
  }
  if (options.stripFragment) url.hash = "";
  return url;
}

function requireStatusCode(value: number): number {
  if (!Number.isInteger(value) || value < 100 || value > 599) {
    throw new Error("ugp_public_web_status_invalid");
  }
  return value;
}

function normalizeAddress(value: string): string {
  if (typeof value !== "string" || value !== value.trim() || !value) {
    throw new Error("ugp_public_web_address_invalid");
  }
  const stripped = value.toLowerCase().replace(/^\[|\]$/g, "");
  const ipv4 = parseIpv4(stripped);
  if (ipv4) {
    if (ipv4IsNonPublic(ipv4)) {
      throw new Error("ugp_public_web_address_not_public");
    }
    return stripped;
  }
  if (!stripped.includes(":") || ipv6IsNonPublic(stripped)) {
    throw new Error("ugp_public_web_address_not_public");
  }
  return stripped;
}

function normalizeAddresses(values: readonly string[]): readonly string[] {
  if (!Array.isArray(values) || values.length < 1 || values.length > 16) {
    throw new Error("ugp_public_web_addresses_invalid");
  }
  return [...new Set(values.map(normalizeAddress))].sort();
}

function resolvedRedirectTarget(currentUrl: string, location: string): string {
  if (
    typeof location !== "string"
    || !location
    || location.length > UGP_PUBLIC_WEB_ONBOARDING_LIMITS.maxUrlLength
    || /[\u0000-\u001f\u007f]/.test(location)
  ) {
    throw new Error("ugp_public_web_redirect_location_invalid");
  }
  let resolved: URL;
  try {
    resolved = new URL(location, currentUrl);
  } catch {
    throw new Error("ugp_public_web_redirect_location_invalid");
  }
  const normalized = parsePublicUrl(resolved.toString(), {
    allowImplicitHttps: false,
    stripFragment: true,
  });
  const current = new URL(currentUrl);
  if (current.protocol === "https:" && normalized.protocol === "http:") {
    throw new Error("ugp_public_web_redirect_https_downgrade");
  }
  return normalized.toString();
}

function parseSitemapHints(
  body: string,
  canonicalOrigin: string,
): {
  accepted: string[];
  rejected: RejectedSitemapHint[];
} {
  const rawHints = body
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, "").trim())
    .map((line) => {
      const match = /^sitemap\s*:\s*(.+)$/i.exec(line);
      return match?.[1]?.trim() ?? null;
    })
    .filter((value): value is string => Boolean(value));

  if (rawHints.length > UGP_PUBLIC_WEB_ONBOARDING_LIMITS.maxSitemapHints) {
    throw new Error("ugp_public_web_sitemap_hint_limit_exceeded");
  }

  const accepted: string[] = [];
  const rejected: RejectedSitemapHint[] = [];

  for (const value of rawHints) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      rejected.push({ value, reason: "invalid_url" });
      continue;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      rejected.push({ value, reason: "unsupported_scheme" });
      continue;
    }
    if (url.username || url.password) {
      rejected.push({ value, reason: "credentials_not_allowed" });
      continue;
    }
    if (url.port) {
      rejected.push({ value, reason: "nonstandard_port" });
      continue;
    }
    if (!hostIsPublicCandidate(url.hostname)) {
      rejected.push({ value, reason: "non_public_host" });
      continue;
    }
    url.hash = "";
    if (url.origin !== canonicalOrigin) {
      rejected.push({ value, reason: "cross_origin" });
      continue;
    }
    accepted.push(url.toString());
  }

  return {
    accepted: [...new Set(accepted)].sort(),
    rejected: rejected.sort((left, right) =>
      left.value.localeCompare(right.value) || left.reason.localeCompare(right.reason)
    ),
  };
}

export function buildPublicWebOnboardingPlan(input: {
  url: string;
}): PublicWebOnboardingPlan {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_public_web_input_invalid");
  }

  const parsed = parsePublicUrl(input.url, {
    allowImplicitHttps: true,
    stripFragment: true,
  });
  const normalizedUrl = parsed.toString();
  const candidateOrigin = parsed.origin;
  const bootstrapUrl = new URL("/", candidateOrigin).toString();
  const base = {
    version: UGP_PUBLIC_WEB_ONBOARDING_VERSION,
    submitted: {
      input: input.url.trim(),
      normalizedUrl,
      candidateOrigin,
      hostname: parsed.hostname.toLowerCase(),
      scheme: parsed.protocol === "https:" ? "https" as const : "http" as const,
    },
    resolution: {
      bootstrapUrl,
      method: "GET" as const,
      redirectMode: "manual" as const,
      maxRedirects: UGP_PUBLIC_WEB_ONBOARDING_LIMITS.maxRedirects,
      publicAddressVerification: "required_before_each_request" as const,
      redirectTargetRevalidation: true as const,
      finalHttpsRequired: true as const,
      robotsPath: "/robots.txt" as const,
      sitemapDiscovery: "robots_hints_plus_conventional" as const,
      conventionalSitemapPaths: ["/sitemap.xml", "/sitemap_index.xml"] as const,
      platformDetection: "not_performed" as const,
    },
    authorization: authorizationBoundary(),
  };

  return deepFreeze({
    ...base,
    planFingerprint: stableHash({
      purpose: "ugp_public_web_onboarding_plan",
      ...base,
    }),
  });
}

export function assertPublicWebOnboardingPlanIntegrity(
  plan: PublicWebOnboardingPlan,
): void {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new Error("ugp_public_web_plan_invalid");
  }
  const rebuilt = buildPublicWebOnboardingPlan({ url: plan.submitted.input });
  if (stableJson(rebuilt) !== stableJson(plan)) {
    throw new Error("ugp_public_web_plan_integrity_failed");
  }
}

export function normalizeSuppliedPublicWebResolution(input: {
  plan: PublicWebOnboardingPlan;
  evidence: SuppliedPublicWebResolutionEvidence;
}): PublicWebOnboardingResolution {
  assertPublicWebOnboardingPlanIntegrity(input.plan);
  const hops = input.evidence?.redirectHops;
  if (
    !Array.isArray(hops)
    || hops.length < 1
    || hops.length > input.plan.resolution.maxRedirects + 1
  ) {
    throw new Error("ugp_public_web_redirect_chain_invalid");
  }

  let expectedUrl = input.plan.resolution.bootstrapUrl;
  const normalizedHops = hops.map((hop, index) => {
    const request = parsePublicUrl(hop.requestUrl, {
      allowImplicitHttps: false,
      stripFragment: true,
    }).toString();
    if (request !== expectedUrl) {
      throw new Error("ugp_public_web_redirect_chain_mismatch");
    }
    const statusCode = requireStatusCode(hop.statusCode);
    const resolvedAddresses = normalizeAddresses(hop.resolvedAddresses);
    const isRedirect = REDIRECT_STATUSES.has(statusCode);

    if (isRedirect) {
      if (index === hops.length - 1) {
        throw new Error("ugp_public_web_redirect_chain_incomplete");
      }
      if (hop.location == null) {
        throw new Error("ugp_public_web_redirect_location_missing");
      }
      expectedUrl = resolvedRedirectTarget(request, hop.location);
      return {
        requestUrl: request,
        statusCode,
        resolvedAddresses,
        location: expectedUrl,
      };
    }

    if (hop.location !== null) {
      throw new Error("ugp_public_web_nonredirect_location_invalid");
    }
    if (index !== hops.length - 1) {
      throw new Error("ugp_public_web_redirect_chain_extra_hop");
    }
    return {
      requestUrl: request,
      statusCode,
      resolvedAddresses,
      location: null,
    };
  });

  const finalHop = normalizedHops[normalizedHops.length - 1]!;
  const finalUrl = finalHop.requestUrl;
  const finalParsed = new URL(finalUrl);
  if (finalParsed.protocol !== "https:") {
    throw new Error("ugp_public_web_final_https_required");
  }
  const canonicalOrigin = finalParsed.origin;

  const robots = input.evidence?.robots;
  if (!robots || typeof robots !== "object" || Array.isArray(robots)) {
    throw new Error("ugp_public_web_robots_evidence_invalid");
  }
  const robotsUrl = parsePublicUrl(robots.requestUrl, {
    allowImplicitHttps: false,
    stripFragment: true,
  }).toString();
  const expectedRobotsUrl = new URL(input.plan.resolution.robotsPath, canonicalOrigin).toString();
  if (robotsUrl !== expectedRobotsUrl) {
    throw new Error("ugp_public_web_robots_url_mismatch");
  }
  normalizeAddresses(robots.resolvedAddresses);
  const robotsStatusCode = requireStatusCode(robots.statusCode);

  let robotsState: "observed" | "absent" | "unavailable";
  let body = "";
  if (robotsStatusCode === 200) {
    if (typeof robots.body !== "string") {
      throw new Error("ugp_public_web_robots_body_required");
    }
    const bytes = new TextEncoder().encode(robots.body).byteLength;
    if (bytes > UGP_PUBLIC_WEB_ONBOARDING_LIMITS.maxRobotsBytes) {
      throw new Error("ugp_public_web_robots_body_too_large");
    }
    body = robots.body;
    robotsState = "observed";
  } else if (robotsStatusCode === 404 || robotsStatusCode === 410) {
    if (robots.body !== null && robots.body !== "") {
      throw new Error("ugp_public_web_robots_absent_body_invalid");
    }
    robotsState = "absent";
  } else {
    if (robots.body !== null && robots.body !== "") {
      throw new Error("ugp_public_web_robots_unavailable_body_invalid");
    }
    robotsState = "unavailable";
  }

  const parsedHints = parseSitemapHints(body, canonicalOrigin);
  const conventional = input.plan.resolution.conventionalSitemapPaths.map(
    (path) => new URL(path, canonicalOrigin).toString(),
  );
  const sitemapCandidates = [...new Set([...parsedHints.accepted, ...conventional])].sort();

  let reason: PublicWebOnboardingResolution["readAnalysisEligibility"]["reason"];
  if (finalHop.statusCode < 200 || finalHop.statusCode >= 300) {
    reason = "final_response_not_success";
  } else if (robotsState === "unavailable") {
    reason = "robots_unavailable";
  } else {
    reason = "eligible";
  }

  const base = {
    version: UGP_PUBLIC_WEB_ONBOARDING_VERSION,
    planFingerprint: input.plan.planFingerprint,
    evidenceMode: "supplied_only" as const,
    finalUrl,
    canonicalOrigin,
    hostname: finalParsed.hostname.toLowerCase(),
    finalStatusCode: finalHop.statusCode,
    redirectCount: normalizedHops.length - 1,
    robots: {
      url: robotsUrl,
      statusCode: robotsStatusCode,
      state: robotsState,
    },
    sitemapCandidates,
    rejectedSitemapHints: parsedHints.rejected,
    platformDetection: "not_performed" as const,
    readAnalysisEligibility: {
      eligible: reason === "eligible",
      reason,
    },
    authorization: authorizationBoundary(),
  };

  return deepFreeze({
    ...base,
    resolutionFingerprint: stableHash({
      purpose: "ugp_public_web_onboarding_resolution",
      ...base,
      redirectHops: normalizedHops,
    }),
  });
}
