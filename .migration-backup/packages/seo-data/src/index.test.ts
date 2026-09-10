import assert from "node:assert/strict";
import test from "node:test";
import { OpenSeoAdapter, type ToolCallTransport } from "./index.js";

class FakeTransport implements ToolCallTransport {
  calls: Array<{ name: string; args: Record<string, unknown> }> = [];

  async callTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
    this.calls.push({ name, args });
    const responses: Record<string, unknown> = {
      keyword_research: { results: [{ keyword: "perfume", search_volume: "12000", competition: 0.62, cpc: "1.45" }] },
      get_serp_results: { organic: [{ position: 3, url: "https://example.com/p", title: "P", snippet: "S" }] },
      get_domain_overview: { organic_traffic: "4400", organic_keywords: 820, backlinks: "9000", referring_domains: 420 },
      get_ranked_keywords: { items: [{ keyword: "designer perfume", position: 8, url: "https://example.com/a", search_volume: 1000 }] },
      get_backlinks_overview: { total_backlinks: 9000, referring_domains: 420, dofollow_backlinks: 7600 },
    };
    return responses[name] as T;
  }
}

test("normalizes OpenSEO keyword research without leaking provider shape", async () => {
  const transport = new FakeTransport();
  const provider = new OpenSeoAdapter(transport);
  const result = await provider.keywordResearch({ keywords: ["perfume"], location: { countryCode: "US" } });
  assert.equal(result[0]?.keyword, "perfume");
  assert.equal(result[0]?.searchVolume, 12000);
  assert.equal(result[0]?.source, "openseo");
  assert.equal(transport.calls[0]?.name, "keyword_research");
});

test("normalizes SERP results and derives domain", async () => {
  const provider = new OpenSeoAdapter(new FakeTransport());
  const result = await provider.serp({ keyword: "perfume" });
  assert.equal(result[0]?.rank, 3);
  assert.equal(result[0]?.domain, "example.com");
});

test("normalizes domain, ranked keyword, and backlink summaries", async () => {
  const provider = new OpenSeoAdapter(new FakeTransport());
  assert.equal((await provider.domainOverview("example.com")).organicTraffic, 4400);
  assert.equal((await provider.rankedKeywords("example.com"))[0]?.rank, 8);
  assert.equal((await provider.backlinks("example.com")).referringDomains, 420);
});
