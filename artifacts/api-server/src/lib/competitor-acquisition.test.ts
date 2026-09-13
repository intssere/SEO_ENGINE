import assert from "node:assert/strict";
import test from "node:test";
import {
  acquireCompetitorObservation,
  competitorAcquisitionCapability,
  deterministicCompetitorEvidenceId,
  isPublicNetworkAddress,
  loadCompetitorAcquisitionConfig,
  persistCompetitorEvidence,
  robotsAllows,
  runConfiguredCompetitorAcquisition,
  type CompetitorCollectionTarget,
  type EvidenceInsert,
  type EvidenceStore,
} from "./competitor-acquisition.js";

const target: CompetitorCollectionTarget = {
  id: "example-unisex",
  url: "https://example-competitor.com/collections/unisex",
  source: "competitor research",
  allowedPathPrefix: "/collections/unisex",
  confidence: 0.8,
  pageType: "collection",
  keywordThemes: ["Unisex Fragrance", "Gift Sets"],
  taxonomyLabels: ["Perfume Oils"],
  entityTypes: ["Brand", "Product"],
  internalLinkPatterns: [],
};

const config = { timeoutMs: 100, maxResponseBytes: 4_096, maxRedirects: 2 };
const publicDns = async () => ["93.184.216.34"];
const allowPolicy = async () => true;
const html = `<!doctype html>
<html><head>
<title>Competitor Secret Title</title>
<meta name="description" content="Competitor Secret Meta Description">
<script type="application/ld+json">{"@context":"https://schema.org","@type":["CollectionPage","ItemList"]}</script>
</head><body>
<h1>Competitor Secret Heading</h1>
<p>Competitor secret body copy must never survive normalization.</p>
<a href="/products/example-one">one</a>
<a href="/collections/unisex/gifts">two</a>
</body></html>`;

function htmlResponse(body = html, init: ResponseInit = {}) {
  return new Response(body, {
    status: init.status ?? 200,
    headers: { "content-type": "text/html; charset=utf-8", ...(init.headers ?? {}) },
  });
}

function redirect(location: string, status = 302) {
  return new Response(null, { status, headers: { location } });
}

async function acquisition(overrides: {
  target?: CompetitorCollectionTarget;
  ownDomain?: string;
  fetchImpl?: typeof fetch;
  resolveHost?: (hostname: string) => Promise<string[]>;
  policyChecker?: typeof allowPolicy;
  maxRedirects?: number;
  maxResponseBytes?: number;
  timeoutMs?: number;
} = {}) {
  return acquireCompetitorObservation({
    target: overrides.target ?? target,
    ownDomain: overrides.ownDomain ?? "diamondshelf.us",
    config: {
      timeoutMs: overrides.timeoutMs ?? config.timeoutMs,
      maxResponseBytes: overrides.maxResponseBytes ?? config.maxResponseBytes,
      maxRedirects: overrides.maxRedirects ?? config.maxRedirects,
    },
    deps: {
      fetchImpl: overrides.fetchImpl ?? (async () => htmlResponse()),
      resolveHost: overrides.resolveHost ?? publicDns,
      policyChecker: overrides.policyChecker ?? allowPolicy,
    },
    observedAt: "2026-09-13T15:00:00.000Z",
  });
}

async function rejectsReason(promise: Promise<unknown>, reason: string) {
  await assert.rejects(promise, (error: unknown) => error instanceof Error && error.message === reason);
}

test("runtime gates and target allowlist default closed", async () => {
  const loaded = loadCompetitorAcquisitionConfig({});
  assert.equal(loaded.collectionEnabled, false);
  assert.equal(loaded.persistenceEnabled, false);
  assert.deepEqual(loaded.targets, []);

  const capability = competitorAcquisitionCapability({});
  assert.equal(capability.collectionEnabled, false);
  assert.equal(capability.persistenceEnabled, false);
  assert.equal(capability.adminOnlyMutation, true);
  assert.equal(capability.csrfRequired, true);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.autonomousWorkerEnabled, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.executionAuthorized, false);

  const disabled = await runConfiguredCompetitorAcquisition({ targetId: target.id, mode: "dry_run", env: {} });
  assert.deepEqual(disabled, { ok: false, reason: "competitor_collection_disabled" });

  const persistDisabled = await runConfiguredCompetitorAcquisition({
    targetId: target.id,
    mode: "persist",
    env: { COMPETITOR_COLLECTION_ENABLED: "true" },
  });
  assert.deepEqual(persistDisabled, { ok: false, reason: "competitor_persistence_disabled" });
});

test("configured targets reject credentials and malformed allowlist entries", () => {
  const valid = JSON.stringify([{ id: target.id, url: target.url, source: target.source, allowedPathPrefix: target.allowedPathPrefix }]);
  const loaded = loadCompetitorAcquisitionConfig({ COMPETITOR_COLLECTION_TARGETS_JSON: valid });
  assert.equal(loaded.configurationIssues.length, 0);
  assert.equal(loaded.targets.length, 1);

  const credentials = JSON.stringify([{ id: "bad", url: "https://user:pass@example-competitor.com/collections/unisex", source: "research" }]);
  const rejected = loadCompetitorAcquisitionConfig({ COMPETITOR_COLLECTION_TARGETS_JSON: credentials });
  assert.deepEqual(rejected.configurationIssues, ["COMPETITOR_COLLECTION_TARGETS_JSON_invalid_target"]);
  assert.equal(rejected.targets.length, 0);
});

test("public-network classifier fails closed for private, loopback, link-local, carrier, documentation, and reserved addresses", () => {
  for (const address of [
    "0.0.0.1",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.1.1",
    "172.16.0.1",
    "192.168.1.1",
    "192.0.2.10",
    "198.18.0.1",
    "198.51.100.20",
    "203.0.113.20",
    "224.0.0.1",
    "::1",
    "fc00::1",
    "fd00::1",
    "fe80::1",
    "ff02::1",
    "2001:db8::1",
    "::ffff:127.0.0.1",
  ]) assert.equal(isPublicNetworkAddress(address), false, address);
  assert.equal(isPublicNetworkAddress("93.184.216.34"), true);
  assert.equal(isPublicNetworkAddress("2606:2800:220:1:248:1893:25c8:1946"), true);
});

test("bounded acquisition normalizes structural evidence and never retains raw competitor copy", async () => {
  const result = await acquisition();
  const serialized = JSON.stringify(result);
  assert.equal(result.record.kind, "competitor_page_observation");
  assert.equal(result.record.payload.sourceUrl, target.url);
  assert.equal(result.record.payload.signals.titleLength, "Competitor Secret Title".length);
  assert.equal(result.record.payload.signals.metaDescriptionLength, "Competitor Secret Meta Description".length);
  assert.equal(result.record.payload.signals.h1Present, true);
  assert.ok(result.record.payload.signals.wordCount > 0);
  assert.deepEqual(result.record.payload.signals.schemaTypes, ["collectionpage", "itemlist"]);
  assert.ok(result.record.payload.signals.internalLinkPatterns.includes("collection-to-product"));
  assert.ok(result.record.payload.signals.internalLinkPatterns.includes("collection-to-collection"));
  assert.equal(serialized.includes("Competitor Secret Title"), false);
  assert.equal(serialized.includes("Competitor Secret Meta Description"), false);
  assert.equal(serialized.includes("Competitor Secret Heading"), false);
  assert.equal(serialized.includes("Competitor secret body copy"), false);
  assert.equal(result.safety.rawContentRetained, false);
  assert.equal(result.safety.executionAuthorized, false);
  assert.equal(result.safety.publicSiteWrites, false);
  assert.equal(result.safety.automaticTransition, false);
});

test("own-domain and private-network targets fail closed before fetch", async () => {
  let fetches = 0;
  const ownTarget = { ...target, url: "https://shop.diamondshelf.us/collections/unisex" };
  await rejectsReason(acquisition({ target: ownTarget, fetchImpl: async () => { fetches += 1; return htmlResponse(); } }), "own_domain_target");
  assert.equal(fetches, 0);

  await rejectsReason(acquisition({ resolveHost: async () => ["127.0.0.1"], fetchImpl: async () => { fetches += 1; return htmlResponse(); } }), "non_public_network_target");
  assert.equal(fetches, 0);
});

test("redirects cannot escape allowlisted host/path or downgrade HTTPS", async () => {
  await rejectsReason(acquisition({ fetchImpl: async () => redirect("https://other.example/collections/unisex") }), "redirect_host_escape");
  await rejectsReason(acquisition({ fetchImpl: async () => redirect("https://example-competitor.com/account") }), "path_not_allowlisted");
  await rejectsReason(acquisition({ fetchImpl: async () => redirect("http://example-competitor.com/collections/unisex") }), "https_downgrade_redirect");
});

test("redirect count is bounded", async () => {
  let requestCount = 0;
  const fetchImpl: typeof fetch = async () => {
    requestCount += 1;
    return redirect(`/collections/unisex/${requestCount}`);
  };
  await rejectsReason(acquisition({ fetchImpl, maxRedirects: 1 }), "redirect_limit_exceeded");
  assert.equal(requestCount, 2);
});

test("policy denial fails closed without requesting the page", async () => {
  let fetches = 0;
  await rejectsReason(acquisition({
    policyChecker: async () => false,
    fetchImpl: async () => { fetches += 1; return htmlResponse(); },
  }), "policy_disallowed");
  assert.equal(fetches, 0);
});

test("robots policy applies longest matching rule with Allow winning ties", () => {
  const robots = `
User-agent: *
Disallow: /collections/
Allow: /collections/unisex
Disallow: /collections/unisex/private
`;
  assert.equal(robotsAllows(robots, "/collections/unisex"), true);
  assert.equal(robotsAllows(robots, "/collections/unisex/gifts"), true);
  assert.equal(robotsAllows(robots, "/collections/unisex/private"), false);
  assert.equal(robotsAllows("User-agent: *\nDisallow:", "/anything"), true);
});

test("oversized and non-HTML responses fail closed", async () => {
  await rejectsReason(acquisition({ fetchImpl: async () => htmlResponse("x".repeat(200)), maxResponseBytes: 100 }), "response_too_large");
  await rejectsReason(acquisition({ fetchImpl: async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } }) }), "non_html_response");
});

test("request timeout aborts bounded fetch", async () => {
  const fetchImpl: typeof fetch = async (_url, init) => new Promise<Response>((_resolve, reject) => {
    const signal = init?.signal;
    if (!signal) return reject(new Error("missing_signal"));
    if (signal.aborted) return reject(new Error("aborted"));
    signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  });
  await rejectsReason(acquisition({ fetchImpl, timeoutMs: 5 }), "request_timeout");
});

class MemoryEvidenceStore implements EvidenceStore {
  readonly rows = new Map<string, EvidenceInsert>();
  insertCalls = 0;

  async insertIfAbsent(input: EvidenceInsert) {
    this.insertCalls += 1;
    if (this.rows.has(input.id)) return "exists" as const;
    this.rows.set(input.id, input);
    return "inserted" as const;
  }

  async getById(id: string) {
    const row = this.rows.get(id);
    return row ? { id, kind: row.kind, fingerprint: row.payload.fingerprint } : null;
  }
}

test("Task #58 fingerprint is reused and deterministic evidence id makes persistence idempotent", async () => {
  const result = await acquisition();
  assert.match(result.record.payload.fingerprint, /^[0-9a-f]{64}$/);
  const siteId = "11111111-1111-4111-8111-111111111111";
  const firstId = deterministicCompetitorEvidenceId(siteId, result.record.payload.fingerprint);
  const secondId = deterministicCompetitorEvidenceId(siteId, result.record.payload.fingerprint);
  assert.equal(firstId, secondId);
  assert.match(firstId, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

  const store = new MemoryEvidenceStore();
  const first = await persistCompetitorEvidence({ siteId, record: result.record, store });
  const second = await persistCompetitorEvidence({ siteId, record: result.record, store });
  assert.deepEqual(first, { id: firstId, inserted: true });
  assert.deepEqual(second, { id: firstId, inserted: false });
  assert.equal(store.rows.size, 1);
  assert.equal(store.insertCalls, 2);
  const persisted = JSON.stringify([...store.rows.values()]);
  assert.equal(persisted.includes("Competitor Secret Title"), false);
  assert.equal(persisted.includes("Competitor Secret Meta Description"), false);
  assert.equal(persisted.includes("Competitor secret body copy"), false);
});

test("dry-run acquisition has no persistence dependency or write side effect", async () => {
  const result = await acquisition();
  const store = new MemoryEvidenceStore();
  assert.equal(result.record.payload.executionAuthorized, false);
  assert.equal(result.record.payload.publicSiteWrites, false);
  assert.equal(store.insertCalls, 0);
  assert.equal(store.rows.size, 0);
});
