import { runSecureReadOnlyActivation, type LiveActivationConfig, type LiveActivationResult } from "./index.js";

export interface ActivationEvidence {
  runId: string;
  siteDomain: "diamondshelf.us";
  startedAt: string;
  completedAt: string;
  gitCommit: string | null;
  status: LiveActivationResult["status"];
  readOnlyReady: boolean;
  probes: LiveActivationResult["probes"];
  blockers: string[];
}

export function activationConfigFromEnvironment(env: NodeJS.ProcessEnv = process.env): LiveActivationConfig {
  return {
    siteDomain: "diamondshelf.us",
    shopDomain: env.SHOPIFY_SHOP_DOMAIN?.trim() ?? "",
    shopAccessToken: env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim() ?? "",
    shopApiVersion: env.SHOPIFY_ADMIN_API_VERSION?.trim() || undefined,
    gscSiteUrl: env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim() ?? "https://diamondshelf.us/",
    ga4PropertyId: env.GA4_PROPERTY_ID?.trim() ?? "",
    googleAccessToken: env.GOOGLE_OAUTH_ACCESS_TOKEN?.trim() ?? "",
    publicSiteWritesEnabled: env.PUBLIC_SITE_WRITES_ENABLED,
  };
}

export function createSeoProviderProbe(env: NodeJS.ProcessEnv = process.env, fetchImpl: typeof fetch = fetch) {
  return async (): Promise<{ ok: boolean; detail?: string }> => {
    const rawUrl = env.SEO_PROVIDER_PROBE_URL?.trim() || env.OPENSEO_BASE_URL?.trim();
    if (!rawUrl) return { ok: false, detail: "SEO provider probe URL is not configured." };

    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return { ok: false, detail: "SEO provider probe URL is invalid." };
    }
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      return { ok: false, detail: "SEO provider probe URL must use HTTPS outside localhost." };
    }

    const headers: Record<string, string> = { Accept: "application/json, text/plain;q=0.9, */*;q=0.8" };
    const token = env.OPENSEO_API_KEY?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const response = await fetchImpl(url, { method: "GET", headers, signal: AbortSignal.timeout(15_000) });
      return response.ok
        ? { ok: true, detail: `SEO provider read probe succeeded with HTTP ${response.status}.` }
        : { ok: false, detail: `SEO provider read probe failed with HTTP ${response.status}.` };
    } catch {
      return { ok: false, detail: "SEO provider read probe raised an exception." };
    }
  };
}

export async function runActivationFromEnvironment(
  env: NodeJS.ProcessEnv = process.env,
  options: { fetchImpl?: typeof fetch; now?: () => Date } = {},
): Promise<ActivationEvidence> {
  const now = options.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const runId = env.SEO_ENGINE_ACTIVATION_RUN_ID?.trim() || `activation-${startedAt.replace(/[:.]/g, "-")}`;
  const result = await runSecureReadOnlyActivation(activationConfigFromEnvironment(env), {
    fetchImpl: options.fetchImpl,
    seoProviderProbe: createSeoProviderProbe(env, options.fetchImpl ?? fetch),
  });
  const completedAt = now().toISOString();

  return {
    runId,
    siteDomain: "diamondshelf.us",
    startedAt,
    completedAt,
    gitCommit: env.GIT_COMMIT_SHA?.trim() || env.REPLIT_GIT_COMMIT_SHA?.trim() || null,
    status: result.status,
    readOnlyReady: result.readOnlyReady,
    probes: result.probes,
    blockers: result.blockers,
  };
}

export function serializedActivationEvidence(evidence: ActivationEvidence): string {
  return `${JSON.stringify(evidence, null, 2)}\n`;
}
