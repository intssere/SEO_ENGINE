import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { Readable } from "node:stream";
import {
  isPublicNetworkAddress,
  type ResolveHost,
  type RuntimeAcquisitionDependencies,
} from "./competitor-acquisition.js";

export const SECURE_COMPETITOR_TRANSPORT_VERSION = "task62-secure-competitor-transport-v1" as const;

const FORBIDDEN_FORWARD_HEADERS = new Set([
  "authorization",
  "cookie",
  "proxy-authorization",
  "proxy-connection",
]);

export type ValidatedNetworkAddress = {
  address: string;
  family: 4 | 6;
};

export type PinnedRequestPlan = {
  version: typeof SECURE_COMPETITOR_TRANSPORT_VERSION;
  url: string;
  protocol: "http:" | "https:";
  hostname: string;
  port: number;
  path: string;
  method: "GET" | "HEAD";
  address: string;
  family: 4 | 6;
  servername: string | null;
  hostHeader: string;
  proxyMode: "disabled";
  headers: Record<string, string>;
};

export type SecureRequestExecutor = (plan: PinnedRequestPlan, signal?: AbortSignal | null) => Promise<Response>;

export type SecureCompetitorFetchOptions = {
  resolveHost?: ResolveHost;
  execute?: SecureRequestExecutor;
};

function abortError(): Error {
  const error = new Error("aborted");
  error.name = "AbortError";
  return error;
}

export async function defaultSecureResolveHost(hostname: string): Promise<string[]> {
  if (isIP(hostname)) return [hostname];
  const answers = await lookup(hostname, { all: true, verbatim: true });
  return answers.map((answer) => answer.address);
}

export async function resolveValidatedPublicAddresses(
  hostname: string,
  resolveHost: ResolveHost = defaultSecureResolveHost,
): Promise<ValidatedNetworkAddress[]> {
  const raw = isIP(hostname) ? [hostname] : await resolveHost(hostname).catch(() => []);
  const seen = new Set<string>();
  const validated: ValidatedNetworkAddress[] = [];

  for (const candidate of raw) {
    const address = candidate.trim().toLowerCase().split("%")[0] ?? "";
    if (!address || seen.has(address)) continue;
    const family = isIP(address);
    if (family !== 4 && family !== 6) throw new Error("invalid_network_address");
    if (!isPublicNetworkAddress(address)) throw new Error("non_public_network_target");
    seen.add(address);
    validated.push({ address, family });
  }

  if (validated.length === 0) throw new Error("network_target_unresolved");
  return validated;
}

function inputUrl(input: Parameters<typeof fetch>[0]): URL {
  if (input instanceof URL) return new URL(input.toString());
  if (typeof input === "string") return new URL(input);
  return new URL(input.url);
}

function requestHeaders(url: URL, init?: RequestInit): Record<string, string> {
  const headers = new Headers(init?.headers);
  for (const name of FORBIDDEN_FORWARD_HEADERS) {
    if (headers.has(name)) throw new Error(`forbidden_request_header_${name.replace(/-/g, "_")}`);
  }
  headers.delete("host");

  const output: Record<string, string> = {};
  headers.forEach((value, name) => {
    output[name] = value;
  });
  output.host = url.host;
  return output;
}

export async function buildPinnedRequestPlan(input: {
  request: Parameters<typeof fetch>[0];
  init?: RequestInit;
  resolveHost?: ResolveHost;
}): Promise<PinnedRequestPlan> {
  const url = inputUrl(input.request);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported_scheme");
  if (url.username || url.password) throw new Error("credential_bearing_url");
  if (input.init?.redirect != null && input.init.redirect !== "manual") throw new Error("redirect_mode_must_be_manual");
  if (input.init?.body != null) throw new Error("request_body_not_supported");

  const method = (input.init?.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") throw new Error("request_method_not_supported");

  const addresses = await resolveValidatedPublicAddresses(url.hostname, input.resolveHost ?? defaultSecureResolveHost);
  const selected = addresses[0]!;
  const defaultPort = url.protocol === "https:" ? 443 : 80;
  const parsedPort = url.port ? Number(url.port) : defaultPort;
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65_535) throw new Error("invalid_target_port");

  return {
    version: SECURE_COMPETITOR_TRANSPORT_VERSION,
    url: url.toString(),
    protocol: url.protocol,
    hostname: url.hostname,
    port: parsedPort,
    path: `${url.pathname}${url.search}`,
    method,
    address: selected.address,
    family: selected.family,
    servername: url.protocol === "https:" && !isIP(url.hostname) ? url.hostname : null,
    hostHeader: url.host,
    proxyMode: "disabled",
    headers: requestHeaders(url, input.init),
  };
}

function responseHeaders(input: http.IncomingHttpHeaders): Headers {
  const output = new Headers();
  for (const [name, value] of Object.entries(input)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) output.append(name, item);
    } else {
      output.set(name, value);
    }
  }
  return output;
}

export const executePinnedNodeRequest: SecureRequestExecutor = async (plan, signal) => new Promise<Response>((resolve, reject) => {
  if (signal?.aborted) return reject(abortError());

  const requestOptions: https.RequestOptions = {
    protocol: plan.protocol,
    hostname: plan.address,
    port: plan.port,
    method: plan.method,
    path: plan.path,
    headers: plan.headers,
    family: plan.family,
    agent: false,
    setHost: false,
  };

  if (plan.protocol === "https:") {
    requestOptions.servername = plan.servername ?? undefined;
    requestOptions.rejectUnauthorized = true;
  }

  const request = (plan.protocol === "https:" ? https.request : http.request)(requestOptions, (incoming) => {
    const status = incoming.statusCode ?? 0;
    if (status < 200 || status > 599) {
      incoming.destroy();
      reject(new Error("invalid_http_status"));
      return;
    }

    const noBody = plan.method === "HEAD" || status === 204 || status === 304;
    const body = noBody
      ? null
      : Readable.toWeb(incoming) as unknown as ConstructorParameters<typeof Response>[0];
    resolve(new Response(body, { status, headers: responseHeaders(incoming.headers) }));
  });

  const onAbort = () => request.destroy(abortError());
  signal?.addEventListener("abort", onAbort, { once: true });
  request.once("close", () => signal?.removeEventListener("abort", onAbort));
  request.once("error", reject);
  request.end();
});

export function createSecureCompetitorFetch(options: SecureCompetitorFetchOptions = {}): typeof fetch {
  const resolveHost = options.resolveHost ?? defaultSecureResolveHost;
  const execute = options.execute ?? executePinnedNodeRequest;

  const secureFetch: typeof fetch = async (request, init) => {
    if (init?.signal?.aborted) throw abortError();
    const plan = await buildPinnedRequestPlan({ request, init, resolveHost });
    if (init?.signal?.aborted) throw abortError();
    return execute(plan, init?.signal);
  };

  return secureFetch;
}

export function createSecureCompetitorRuntimeDependencies(
  resolveHost: ResolveHost = defaultSecureResolveHost,
): Pick<RuntimeAcquisitionDependencies, "fetchImpl" | "resolveHost"> {
  return {
    resolveHost,
    fetchImpl: createSecureCompetitorFetch({ resolveHost }),
  };
}

export function secureCompetitorTransportCapability() {
  return {
    version: SECURE_COMPETITOR_TRANSPORT_VERSION,
    controlledResolution: true,
    allResolvedAddressesMustBePublic: true,
    connectionAddressPinned: true,
    connectionTimeDnsResolution: false,
    dnsRebindingMitigated: true,
    tlsCertificateVerification: true,
    tlsHostnameVerification: true,
    sniUsesOriginalHostname: true,
    ambientProxyRouting: false,
    freshPinRequiredPerRequest: true,
    callerRevalidatesRedirectHops: true,
    networkCollectionReady: false,
    collectionAuthorized: false,
    persistenceAuthorized: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    publicSiteWrites: false,
    executionAuthorized: false,
  } as const;
}
