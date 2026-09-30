import assert from "node:assert/strict";
import test from "node:test";
import { buildConnectionsUiModel, type ConnectionsStatus } from "./connections-ui-model.js";

function status(overrides: Partial<ConnectionsStatus> = {}): ConnectionsStatus {
  return {
    readOnly: true,
    shopify: { connected: false },
    google: { connected: false },
    ...overrides,
  };
}

test("UGP-5.3 exposes the five required connection domains", () => {
  const model = buildConnectionsUiModel(status());
  assert.deepEqual(
    model.cards.map((card) => card.domain),
    ["website", "search_console", "analytics", "cms", "backlink_serp"],
  );
});

test("UGP-5.3 makes site scope explicit when Shopify identifies the site", () => {
  const model = buildConnectionsUiModel(status({
    shopify: { connected: true, domain: "example.myshopify.com" },
    google: { connected: true, authorized: true },
  }));
  assert.equal(model.activeSiteScope, "https://example.myshopify.com");
  assert.equal(model.cards.find((card) => card.domain === "website")?.state, "connected");
  assert.equal(model.cards.find((card) => card.domain === "cms")?.statusLabel, "Connected");
});

test("UGP-5.3 surfaces Google connection loss as recoverable attention", () => {
  const model = buildConnectionsUiModel(status({
    shopify: { connected: true, domain: "example.myshopify.com" },
    google: {
      connected: false,
      authorized: true,
      needsAttention: true,
      hasRefreshToken: false,
    },
  }));
  for (const domain of ["search_console", "analytics"] as const) {
    const card = model.cards.find((entry) => entry.domain === domain);
    assert.equal(card?.state, "needs_attention");
    assert.equal(card?.recoveryLabel, "Reconnect Google");
    assert.equal(card?.recoveryHref, "/api/connections/google/start");
  }
});

test("UGP-5.3 disables OAuth actions when current safety mode disallows them", () => {
  const model = buildConnectionsUiModel(status({ readOnly: false }));
  assert.equal(model.oauthDisabled, true);
  for (const domain of ["search_console", "analytics"] as const) {
    const card = model.cards.find((entry) => entry.domain === domain);
    assert.equal(card?.disabled, true);
    assert.equal(card?.connectHref, null);
  }
});

test("UGP-5.3 does not fabricate Backlink/SERP connectivity", () => {
  const model = buildConnectionsUiModel(status());
  const card = model.cards.find((entry) => entry.domain === "backlink_serp");
  assert.equal(card?.state, "planned");
  assert.equal(card?.disabled, true);
  assert.equal(card?.connectHref, null);
  assert.equal(card?.recoveryHref, null);
});
