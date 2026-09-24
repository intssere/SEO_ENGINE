export type PlatformHintId = "shopify" | "wordpress" | "webflow" | "wix" | "unknown";

export type WebsiteTarget = {
  canonicalOrigin: string;
  hostname: string;
  publicWebOnboarding: {
    status: "planned_not_executed";
    bootstrapUrl: string;
    finalHttpsRequired: true;
    checks: readonly [
      { id: "dns"; label: "DNS / public address" },
      { id: "redirects"; label: "Redirect chain" },
      { id: "robots"; label: "robots.txt" },
      { id: "sitemaps"; label: "Sitemap hints" },
    ];
  };
  platformHint: {
    id: PlatformHintId;
    label: string;
    evidence: "url_pattern_only" | "none";
  };
};

export type WebsiteTargetResult =
  | { ok: true; target: WebsiteTarget }
  | { ok: false; error: string };

function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host === "local" ||
    host === "internal" ||
    host === "home" ||
    host === "lan" ||
    host === "test" ||
    host === "invalid" ||
    host === "onion" ||
    [".localhost", ".local", ".internal", ".home", ".lan", ".test", ".invalid", ".onion"]
      .some((suffix) => host.endsWith(suffix)) ||
    host === "::" ||
    host === "::1" ||
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    /^fe[89ab]/.test(host) ||
    host.startsWith("ff") ||
    host.startsWith("2001:db8")
  ) {
    return true;
  }

  const parts = host.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) {
    return false;
  }
  const octets = parts.map(Number);
  if (octets.some((part) => part > 255)) return true;
  const [a, b, c] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

export function platformHintForHostname(hostname: string): WebsiteTarget["platformHint"] {
  const host = hostname.toLowerCase();
  if (host === "myshopify.com" || host.endsWith(".myshopify.com")) {
    return { id: "shopify", label: "Shopify", evidence: "url_pattern_only" };
  }
  if (host === "wordpress.com" || host.endsWith(".wordpress.com")) {
    return { id: "wordpress", label: "WordPress", evidence: "url_pattern_only" };
  }
  if (host === "webflow.io" || host.endsWith(".webflow.io")) {
    return { id: "webflow", label: "Webflow", evidence: "url_pattern_only" };
  }
  if (host === "wixsite.com" || host.endsWith(".wixsite.com")) {
    return { id: "wix", label: "Wix", evidence: "url_pattern_only" };
  }
  return { id: "unknown", label: "Platform not identified", evidence: "none" };
}

export function normalizeWebsiteTarget(input: string): WebsiteTargetResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Enter a website URL." };

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, error: "Enter a valid public website URL." };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, error: "Only public HTTP or HTTPS website URLs are supported." };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: "Website URLs with embedded credentials are not supported." };
  }
  if (parsed.port) {
    return { ok: false, error: "Use a standard public website port." };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || isPrivateHostname(hostname)) {
    return { ok: false, error: "Use a public website address, not a local or private network address." };
  }
  if (!hostname.includes(".") && !hostname.includes(":")) {
    return { ok: false, error: "Enter a public website hostname." };
  }

  return {
    ok: true,
    target: {
      canonicalOrigin: parsed.origin,
      hostname,
      publicWebOnboarding: {
        status: "planned_not_executed",
        bootstrapUrl: new URL("/", parsed.origin).toString(),
        finalHttpsRequired: true,
        checks: [
          { id: "dns", label: "DNS / public address" },
          { id: "redirects", label: "Redirect chain" },
          { id: "robots", label: "robots.txt" },
          { id: "sitemaps", label: "Sitemap hints" },
        ],
      },
      platformHint: platformHintForHostname(hostname),
    },
  };
}
