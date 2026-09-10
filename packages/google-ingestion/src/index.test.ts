import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchGa4PageAnalytics,
  fetchGscSearchAnalytics,
  normalizeGa4Rows,
  normalizeGscRows,
  toAnalyticsEvidence,
  toSearchMetricUpserts,
} from "./index.js";

test("normalizes GSC rows using fixed dimension order", () => {
  const rows = normalizeGscRows([{
    keys: ["2026-09-01", "perfume", "https://example.com/p/perfume", "usa", "MOBILE"],
    clicks: 12,
    impressions: 400,
    ctr: 0.03,
    position: 8.4,
  }]);
  assert.deepEqual(rows[0], {
    date: "2026-09-01",
    query: "perfume",
    page: "https://example.com/p/perfume",
    country: "usa",
    device: "MOBILE",
    clicks: 12,
    impressions: 400,
    ctr: 0.03,
    averagePosition: 8.4,
  });
});

test("converts complete GSC rows to search metric upserts", () => {
  const result = toSearchMetricUpserts([{
    date: "2026-09-01",
    query: "perfume",
    page: "https://example.com/p/perfume",
    country: "usa",
    device: "DESKTOP",
    clicks: 2,
    impressions: 50,
    ctr: 0.04,
    averagePosition: 6.2,
  }]);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.source, "google_search_console");
});

test("normalizes GA4 rows and preserves numeric metrics", () => {
  const rows = normalizeGa4Rows([{
    dimensionValues: [{ value: "20260901" }, { value: "/products/a?variant=1" }],
    metricValues: [
      { value: "100" },
      { value: "75" },
      { value: "60" },
      { value: "3" },
      { value: "250.45" },
    ],
  }]);
  assert.equal(rows[0]?.sessions, 100);
  assert.equal(rows[0]?.totalRevenue, 250.45);
  assert.equal(toAnalyticsEvidence(rows)[0]?.pagePath, "/products/a?variant=1");
});

test("GSC client uses POST and never places token in URL", async () => {
  let seenUrl = "";
  let seenInit: RequestInit | undefined;
  const fakeFetch: typeof fetch = async (input, init) => {
    seenUrl = String(input);
    seenInit = init;
    return new Response(JSON.stringify({ rows: [] }), { status: 200 });
  };
  await fetchGscSearchAnalytics({
    siteUrl: "sc-domain:example.com",
    accessToken: "secret-token",
    startDate: "2026-09-01",
    endDate: "2026-09-02",
    fetchImpl: fakeFetch,
  });
  assert.equal(seenInit?.method, "POST");
  assert.equal(seenUrl.includes("secret-token"), false);
  assert.match(String(new Headers(seenInit?.headers).get("authorization")), /^Bearer /);
});

test("GA4 client validates property id and uses runReport", async () => {
  let seenUrl = "";
  const fakeFetch: typeof fetch = async (input) => {
    seenUrl = String(input);
    return new Response(JSON.stringify({ rows: [] }), { status: 200 });
  };
  await fetchGa4PageAnalytics({
    propertyId: "properties/123456",
    accessToken: "secret-token",
    startDate: "2026-09-01",
    endDate: "2026-09-02",
    fetchImpl: fakeFetch,
  });
  assert.match(seenUrl, /properties\/123456:runReport$/);
  await assert.rejects(() => fetchGa4PageAnalytics({
    propertyId: "bad-id",
    accessToken: "secret-token",
    startDate: "2026-09-01",
    endDate: "2026-09-02",
    fetchImpl: fakeFetch,
  }));
});
