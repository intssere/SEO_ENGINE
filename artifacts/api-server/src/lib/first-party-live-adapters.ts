import {
  DIAMOND_SHELF_CANONICAL_ORIGIN,
  P12_2_CRAWL_BRIDGE_VERSION,
  P12_2_ROBOTS_USER_AGENT,
  type FirstPartyCrawlClock,
  type FirstPartyPageTransport,
  type FirstPartyRobotsEvaluator,
  type FirstPartySitemapAcquirer,
  type PageTransportRequest,
  type PageTransportResult,
  type RobotsEvaluationRequest,
  type SitemapAcquisitionRequest,
} from "./first-party-crawl-runtime-bridge.js";
import { parseSitemapXml, type SuppliedSitemapDocument } from "./sitemap-inventory.js";
import {
  createSecureCompetitorFetch,
  type SecureCompetitorFetchOptions,
} from "./secure-competitor-transport.js";

export const DIAMOND_SHELF_SITE_ID = "eb1da9ee-539c-4200-8f04-f64ccaea7768" as const;
export const P12_2_LIVE_ADAPTER_VERSION = "p12-2-first-party-live-adapters-v1" as const;
export const P12_2_ABSOLUTE_TRANSIENT_PAGE_BYTES = 5_000_000;
export const P12_2_ROBOTS_MAX_BYTES = 1_000_000;
export const P12_2_SITEMAP_REDIRECT_LIMIT = 3;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const SECURITY_ERRORS = new Set([
  "non_public_network_target",
  "network_target_unresolved",
  "invalid_network_address",
  "unsupported_scheme",
  "credential_bearing_url",
  "redirect_mode_must_be_manual",
  "request_body_not_supported",
  "request_method_not_supported",
  "forbidden_request_header_authorization",
  "forbidden_request_header_cookie",
  "forbidden_request_header_proxy_authorization",
]);

export type FirstPartyLiveAdapterOptions = SecureCompetitorFetchOptions & {
  maxTransientPageBytes: number;
  fetchImpl?: typeof fetch;
};

type RobotsRule = {
  allow: boolean;
  pattern: string;
  specificity: number;
  expression: RegExp;
};

type RobotsGroup = {
  agents: string[];
  rules: RobotsRule[];
};

function boundedPositiveInteger(value: number, maximum: number, code: string): number {
  if (!Number.isInteger(value) || value < 1 || value > maximum) throw new Error(code);
  return value;
}

function exactSiteId(value: string): void {
  if (value !== DIAMOND_SHELF_SITE_ID) throw new Error("p12_2_live_site_id_mismatch");
}

function exactFirstPartyUrl(
  value: string,
  options: { maxUrlLength: number; queryAllowed?: boolean; fragmentAllowed?: boolean },
): string {
  const raw = value.trim();
  if (!raw || raw.length > options.maxUrlLength || /[\u0000-\u001f\u007f]/.test(raw)) {
    throw new Error("p12_2_live_url_invalid");
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("p12_2_live_url_invalid");
  }
  if (
    url.protocol !== "https:" ||
    url.origin !== DIAMOND_SHELF_CANONICAL_ORIGIN ||
    url.username ||
    url.password
  ) {
    throw new Error("p12_2_live_url_scope_rejected");
  }
  if (!options.queryAllowed && url.search) throw new Error("p12_2_live_query_rejected");
  if (!options.fragmentAllowed && url.hash) throw new Error("p12_2_live_fragment_rejected");
  return url.toString();
}

function statusRedirectTarget(response: Response, requestedUrl: string, maxUrlLength: number): string | null {
  if (!REDIRECT_STATUSES.has(response.status)) return null;
  const location = response.headers.get("location");
  if (!location) throw new Error("p12_2_live_redirect_location_missing");
  let resolved: string;
  try {
    resolved = new URL(location, requestedUrl).toString();
  } catch {
    throw new Error("p12_2_live_redirect_location_invalid");
  }
  return exactFirstPartyUrl(resolved, {
    maxUrlLength,
    queryAllowed: false,
    fragmentAllowed: false,
  });
}

async function readBoundedText(response: Response, maxBytes: number, code: string): Promise<string> {
  boundedPositiveInteger(maxBytes, 50_000_000, "p12_2_live_body_limit_invalid");
  const declared = response.headers.get("content-length");
  if (declared) {
    const parsed = Number(declared);
    if (Number.isFinite(parsed) && parsed > maxBytes) throw new Error(code);
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error(code);
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  boundedPositiveInteger(timeoutMs, 30_000, "p12_2_live_timeout_invalid");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function transportFailure(error: unknown): PageTransportResult {
  if (error instanceof Error && error.name === "AbortError") {
    return { kind: "failure", signal: { kind: "network_timeout" } };
  }
  if (error instanceof Error && SECURITY_ERRORS.has(error.message)) {
    return { kind: "failure", signal: { kind: "policy_rejection" } };
  }
  if (error instanceof Error && error.message.startsWith("p12_2_live_")) {
    return { kind: "failure", signal: { kind: "policy_rejection" } };
  }
  return { kind: "failure", signal: { kind: "transport_unavailable" } };
}

function robotsRuleExpression(pattern: string): { expression: RegExp; specificity: number } {
  const endAnchored = pattern.endsWith("$");
  const source = endAnchored ? pattern.slice(0, -1) : pattern;
  const escaped = source
    .split("*")
    .map((part) => part.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  const specificity = source.replace(/\*/g, "").length;
  return {
    expression: new RegExp("^" + escaped + (endAnchored ? "$" : "")),
    specificity,
  };
}

export function parseRobotsPolicy(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let currentAgents: string[] = [];
  let currentRules: RobotsRule[] = [];

  const flush = () => {
    if (currentAgents.length) groups.push({ agents: [...currentAgents], rules: [...currentRules] });
    currentAgents = [];
    currentRules = [];
  };

  for (const rawLine of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const withoutComment = rawLine.split("#", 1)[0]!.trim();
    if (!withoutComment) continue;
    const colon = withoutComment.indexOf(":");
    if (colon < 0) {
      if (/^(?:user-agent|allow|disallow)\b/i.test(withoutComment)) {
        throw new Error("p12_2_robots_malformed_policy_line");
      }
      continue;
    }
    const directive = withoutComment.slice(0, colon).trim().toLowerCase();
    const value = withoutComment.slice(colon + 1).trim();

    if (directive === "user-agent") {
      if (!value || /[\u0000-\u001f\u007f]/.test(value)) {
        throw new Error("p12_2_robots_user_agent_invalid");
      }
      if (currentRules.length) flush();
      currentAgents.push(value.toLowerCase());
      continue;
    }

    if (directive === "allow" || directive === "disallow") {
      if (!currentAgents.length) throw new Error("p12_2_robots_rule_without_agent");
      if (/[\u0000-\u001f\u007f]/.test(value)) throw new Error("p12_2_robots_rule_invalid");
      if (directive === "disallow" && value === "") continue;
      const { expression, specificity } = robotsRuleExpression(value || "/");
      currentRules.push({ allow: directive === "allow", pattern: value || "/", specificity, expression });
      continue;
    }
  }
  flush();
  return groups;
}

export function robotsAllows(groups: RobotsGroup[], canonicalUrl: string): boolean {
  const userAgent = P12_2_ROBOTS_USER_AGENT.toLowerCase();
  const candidates = groups
    .map((group) => {
      const specificity = Math.max(
        ...group.agents.map((agent) => agent === "*" ? 0 : (userAgent.includes(agent) ? agent.length : -1)),
      );
      return { group, specificity };
    })
    .filter((item) => item.specificity >= 0);
  if (!candidates.length) return true;
  const bestAgentSpecificity = Math.max(...candidates.map((item) => item.specificity));
  const path = new URL(canonicalUrl).pathname;
  const rules = candidates
    .filter((item) => item.specificity === bestAgentSpecificity)
    .flatMap((item) => item.group.rules)
    .filter((rule) => rule.expression.test(path));
  if (!rules.length) return true;
  const bestRuleSpecificity = Math.max(...rules.map((rule) => rule.specificity));
  return rules.filter((rule) => rule.specificity === bestRuleSpecificity).some((rule) => rule.allow);
}

function metaRobotsNoindex(html: string): boolean {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const name = tag.match(/\bname\s*=\s*(?:["']([^"']+)["']|([^\s"'=<>]+))/i);
    const content = tag.match(/\bcontent\s*=\s*(?:["']([^"']+)["']|([^\s"'=<>]+))/i);
    const nameValue = (name?.[1] ?? name?.[2] ?? "").trim().toLowerCase();
    const contentValue = (content?.[1] ?? content?.[2] ?? "").trim().toLowerCase();
    if ((nameValue === "robots" || nameValue === P12_2_ROBOTS_USER_AGENT.toLowerCase()) &&
        contentValue.split(/[\s,]+/).includes("noindex")) {
      return true;
    }
  }
  return false;
}

function xRobotsNoindex(response: Response): boolean {
  const value = response.headers.get("x-robots-tag")?.toLowerCase() ?? "";
  return value.split(/[\s,;]+/).includes("noindex");
}

export function createFirstPartySitemapAcquirer(
  options: FirstPartyLiveAdapterOptions,
): FirstPartySitemapAcquirer {
  const fetchImpl = options.fetchImpl ?? createSecureCompetitorFetch(options);
  return {
    async load(request: SitemapAcquisitionRequest): Promise<SuppliedSitemapDocument[]> {
      if (request.version !== P12_2_CRAWL_BRIDGE_VERSION) throw new Error("p12_2_live_version_mismatch");
      exactSiteId(request.siteId);
      if (
        request.canonicalOrigin !== DIAMOND_SHELF_CANONICAL_ORIGIN ||
        request.sameOriginOnly !== true ||
        request.httpsOnly !== true ||
        request.queryAllowed !== false ||
        request.fragmentAllowed !== false
      ) throw new Error("p12_2_live_sitemap_scope_invalid");
      boundedPositiveInteger(request.maxDocuments, 1_024, "p12_2_live_sitemap_document_limit_invalid");
      if (!Number.isInteger(request.maxDepth) || request.maxDepth < 0 || request.maxDepth > 8) {
        throw new Error("p12_2_live_sitemap_depth_invalid");
      }
      boundedPositiveInteger(request.maxDocumentBytes, 50_000_000, "p12_2_live_sitemap_bytes_invalid");
      boundedPositiveInteger(request.maxUrlLength, 2_048, "p12_2_live_sitemap_url_length_invalid");

      const root = exactFirstPartyUrl(request.rootSitemapUrl, {
        maxUrlLength: request.maxUrlLength,
        queryAllowed: false,
        fragmentAllowed: false,
      });
      const queue: Array<{ url: string; depth: number }> = [{ url: root, depth: 0 }];
      const queued = new Set([root]);
      const documents: SuppliedSitemapDocument[] = [];

      while (queue.length) {
        queue.sort((a, b) => a.depth - b.depth || a.url.localeCompare(b.url));
        const item = queue.shift()!;
        if (item.depth > request.maxDepth) throw new Error("p12_2_live_sitemap_depth_exceeded");
        if (documents.length >= request.maxDocuments) throw new Error("p12_2_live_sitemap_document_limit_exceeded");
        let currentUrl = item.url;
        let redirects = 0;
        let response: Response;
        while (true) {
          response = await fetchImpl(currentUrl, {
            method: "GET",
            redirect: "manual",
            headers: {
              accept: "application/xml,text/xml;q=0.9,*/*;q=0.1",
              "user-agent": P12_2_ROBOTS_USER_AGENT,
            },
          });
          const redirect = statusRedirectTarget(response, currentUrl, request.maxUrlLength);
          if (!redirect) break;
          redirects += 1;
          if (redirects > P12_2_SITEMAP_REDIRECT_LIMIT) throw new Error("p12_2_live_sitemap_redirect_limit_exceeded");
          currentUrl = redirect;
        }
        if (response.status !== 200) throw new Error("p12_2_live_sitemap_http_status");
        const xml = await readBoundedText(response, request.maxDocumentBytes, "p12_2_live_sitemap_document_oversize");
        const parsed = parseSitemapXml(xml);
        documents.push({ url: currentUrl, xml });

        if (parsed.root === "sitemapindex") {
          for (const rawChild of [...parsed.sitemapLocations].sort()) {
            const child = exactFirstPartyUrl(rawChild, {
              maxUrlLength: request.maxUrlLength,
              queryAllowed: false,
              fragmentAllowed: false,
            });
            if (item.depth + 1 > request.maxDepth) throw new Error("p12_2_live_sitemap_depth_exceeded");
            if (!queued.has(child)) {
              if (queued.size >= request.maxDocuments) throw new Error("p12_2_live_sitemap_document_limit_exceeded");
              queued.add(child);
              queue.push({ url: child, depth: item.depth + 1 });
            }
          }
        }
      }
      return documents;
    },
  };
}

export function createFirstPartyRobotsEvaluator(
  options: FirstPartyLiveAdapterOptions,
): FirstPartyRobotsEvaluator {
  const fetchImpl = options.fetchImpl ?? createSecureCompetitorFetch(options);
  let cached: Promise<RobotsGroup[]> | null = null;
  const loadPolicy = () => {
    if (!cached) {
      cached = (async () => {
        const robotsUrl = DIAMOND_SHELF_CANONICAL_ORIGIN + "/robots.txt";
        const response = await fetchImpl(robotsUrl, {
          method: "GET",
          redirect: "manual",
          headers: {
            accept: "text/plain,*/*;q=0.1",
            "user-agent": P12_2_ROBOTS_USER_AGENT,
          },
        });
        if (REDIRECT_STATUSES.has(response.status)) {
          const target = statusRedirectTarget(response, robotsUrl, 2_048);
          if (!target || target !== robotsUrl) throw new Error("p12_2_live_robots_redirect_rejected");
          throw new Error("p12_2_live_robots_redirect_not_followed");
        }
        if (response.status !== 200) throw new Error("p12_2_live_robots_unavailable");
        const text = await readBoundedText(response, P12_2_ROBOTS_MAX_BYTES, "p12_2_live_robots_oversize");
        return parseRobotsPolicy(text);
      })();
    }
    return cached;
  };

  return {
    async evaluate(request: RobotsEvaluationRequest): Promise<{ allowed: boolean }> {
      if (request.version !== P12_2_CRAWL_BRIDGE_VERSION) throw new Error("p12_2_live_version_mismatch");
      exactSiteId(request.siteId);
      if (
        request.canonicalOrigin !== DIAMOND_SHELF_CANONICAL_ORIGIN ||
        request.userAgent !== P12_2_ROBOTS_USER_AGENT ||
        request.method !== "GET"
      ) throw new Error("p12_2_live_robots_scope_invalid");
      const url = exactFirstPartyUrl(request.canonicalUrl, {
        maxUrlLength: 2_048,
        queryAllowed: false,
        fragmentAllowed: false,
      });
      return { allowed: robotsAllows(await loadPolicy(), url) };
    },
  };
}

export function createFirstPartyPageTransport(
  options: FirstPartyLiveAdapterOptions,
): FirstPartyPageTransport {
  const maxTransientPageBytes = boundedPositiveInteger(
    options.maxTransientPageBytes,
    P12_2_ABSOLUTE_TRANSIENT_PAGE_BYTES,
    "p12_2_live_transient_page_bytes_invalid",
  );
  const fetchImpl = options.fetchImpl ?? createSecureCompetitorFetch(options);
  return {
    async get(request: PageTransportRequest): Promise<PageTransportResult> {
      try {
        if (request.version !== P12_2_CRAWL_BRIDGE_VERSION) throw new Error("p12_2_live_version_mismatch");
        exactSiteId(request.siteId);
        if (
          request.canonicalOrigin !== DIAMOND_SHELF_CANONICAL_ORIGIN ||
          request.method !== "GET" ||
          request.followRedirects !== false ||
          request.responseBodyPersistence !== false
        ) throw new Error("p12_2_live_page_scope_invalid");
        const url = exactFirstPartyUrl(request.canonicalUrl, {
          maxUrlLength: 2_048,
          queryAllowed: false,
          fragmentAllowed: false,
        });
        const response = await fetchWithTimeout(fetchImpl, url, {
          method: "GET",
          redirect: "manual",
          headers: {
            accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
            "user-agent": P12_2_ROBOTS_USER_AGENT,
          },
        }, request.timeoutMs);
        const redirect = statusRedirectTarget(response, url, 2_048);
        if (redirect) return { kind: "redirect", redirectTarget: redirect, redirectCount: 1 };
        if (response.status < 200 || response.status >= 300) {
          await response.body?.cancel().catch(() => undefined);
          return { kind: "failure", signal: { kind: "http_status", httpStatus: response.status } };
        }

        const headerNoindex = xRobotsNoindex(response);
        const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
        let htmlNoindex = false;
        if (contentType.includes("text/html") || contentType.includes("application/xhtml+xml")) {
          const html = await readBoundedText(response, maxTransientPageBytes, "p12_2_live_page_body_oversize");
          htmlNoindex = metaRobotsNoindex(html);
        } else {
          const declared = Number(response.headers.get("content-length") ?? "0");
          if (Number.isFinite(declared) && declared > maxTransientPageBytes) {
            await response.body?.cancel().catch(() => undefined);
            throw new Error("p12_2_live_page_body_oversize");
          }
          await response.body?.cancel().catch(() => undefined);
        }
        return headerNoindex || htmlNoindex ? { kind: "success", noindex: true } : { kind: "success" };
      } catch (error) {
        return transportFailure(error);
      }
    },
  };
}

export const firstPartyCrawlClock: FirstPartyCrawlClock = Object.freeze({
  async sleep(milliseconds: number): Promise<void> {
    if (!Number.isInteger(milliseconds) || milliseconds < 0 || milliseconds > 120_000) {
      throw new Error("p12_2_live_sleep_invalid");
    }
    if (milliseconds === 0) return;
    await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
  },
});

export function firstPartyLiveAdapterCapability() {
  return Object.freeze({
    version: P12_2_LIVE_ADAPTER_VERSION,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    httpsOnly: true,
    sameOriginOnly: true,
    freshDnsResolutionPerRequest: true,
    publicAddressesOnly: true,
    connectionAddressPinned: true,
    dnsRebindingMitigated: true,
    tlsHostnameVerification: true,
    ambientProxyRouting: false,
    redirectsManual: true,
    rawSitemapXmlPersistence: false,
    responseBodyPersistence: false,
    pageContentPersistence: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    networkReady: false,
    liveExecutionAuthorized: false,
    persistenceReady: false,
    persistenceAuthorized: false,
  });
}
