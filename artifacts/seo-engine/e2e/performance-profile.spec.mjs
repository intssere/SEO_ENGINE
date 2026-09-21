import { expect, test } from "@playwright/test";
import {
  PERFORMANCE_PROFILE_VERSION,
  normalizeSyntheticProfile,
} from "../performance/performance-budget.mjs";
import {
  installSyntheticNetwork,
  monitorBrowserErrors,
} from "./fixtures.mjs";

const routes = [
  "/",
  "/technical-seo",
  "/search-intelligence",
  "/ai-visibility",
  "/governance",
  "/impact",
  "/connections",
];

for (const route of routes) {
  test(`P11.1 synthetic local profile contract: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const boundary = await installSyntheticNetwork(page);
    const errors = monitorBrowserErrors(page);
    const start = Date.now();

    await page.goto(route);
    await page.locator("#main-content").waitFor();
    await page.evaluate(() => document.fonts.ready);

    const mainContentReadyMs = Date.now() - start;
    const browserMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0] ?? null;
      const firstContentfulPaint =
        performance.getEntriesByName("first-contentful-paint")[0] ?? null;

      return {
        domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? null,
        loadEventMs: navigation?.loadEventEnd ?? null,
        firstContentfulPaintMs: firstContentfulPaint?.startTime ?? null,
        resourceCount: performance.getEntriesByType("resource").length,
      };
    });

    const profile = normalizeSyntheticProfile({
      version: PERFORMANCE_PROFILE_VERSION,
      source: "synthetic_local",
      route,
      metrics: {
        ...browserMetrics,
        mainContentReadyMs,
      },
    });

    expect(profile.metrics.domContentLoadedMs).not.toBeNull();
    expect(profile.metrics.loadEventMs).not.toBeNull();
    expect(profile.metrics.mainContentReadyMs).not.toBeNull();
    expect(profile.metrics.resourceCount).not.toBeNull();

    for (const value of [
      profile.metrics.domContentLoadedMs,
      profile.metrics.loadEventMs,
      profile.metrics.firstContentfulPaintMs,
      profile.metrics.mainContentReadyMs,
    ]) {
      if (value !== null) {
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }

    console.log("P11_1_SYNTHETIC_PROFILE", JSON.stringify(profile));

    expect(boundary.unknownApiRequests).toEqual([]);
    expect(boundary.externalRequests).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
    expect(errors.consoleErrors).toEqual([]);
  });
}
