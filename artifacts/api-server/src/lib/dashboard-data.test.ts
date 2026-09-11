import assert from "node:assert/strict";
import test from "node:test";
import { pilotCountsFromPayload, selectGscHeadlineMetrics } from "./dashboard-data.js";

test("dashboard distinguishes Shopify catalog total from products observed", () => {
  assert.deepEqual(pilotCountsFromPayload({
    products: 272,
    catalogProducts: 2997,
    productsObserved: 272,
    shopifyComplete: false,
    gscRows: 2088,
    gscDetailedRows: 2088,
    ga4Rows: 0,
    pages: 30,
  }), {
    products: 272,
    catalogProducts: 2997,
    productsObserved: 272,
    shopifyComplete: false,
    gscRows: 2088,
    gscDetailedRows: 2088,
    ga4Rows: 0,
    pages: 30,
    findings: 0,
    opportunities: 0,
  });
});

test("dashboard remains compatible with pre-diagnostic pilot counts", () => {
  assert.deepEqual(pilotCountsFromPayload({ products: 272 }).catalogProducts, 272);
  assert.deepEqual(pilotCountsFromPayload({ products: 272 }).productsObserved, 272);
});

test("dashboard retains the last credible catalog total after a false-zero run", () => {
  assert.deepEqual(pilotCountsFromPayload({
    products: 0,
    catalogProducts: 0,
    productsObserved: 0,
    shopifyComplete: true,
  }, {
    productCount: 2997,
    productsObserved: 272,
    truncated: true,
  }), {
    products: 0,
    catalogProducts: 2997,
    productsObserved: 0,
    shopifyComplete: false,
    gscRows: 0,
    gscDetailedRows: 0,
    ga4Rows: 0,
    pages: 0,
    findings: 0,
    opportunities: 0,
  });
});

test("dashboard headline KPIs use property aggregate without summing incomplete dimensional rows", () => {
  const dimensional = { clicks: 0, impressions: 2709, position: 58.7 };
  const aggregate = { clicks: 5, impressions: 3160, ctr: 0.002, position: 53.5 };
  assert.deepEqual(selectGscHeadlineMetrics(dimensional, aggregate, true), { ...aggregate, source: "property_aggregate" });
  assert.deepEqual(selectGscHeadlineMetrics(dimensional, aggregate, false), { clicks: 0, impressions: 2709, ctr: 0, position: 58.7, source: "dimensional" });
});