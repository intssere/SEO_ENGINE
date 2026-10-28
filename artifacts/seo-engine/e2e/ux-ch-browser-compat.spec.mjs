import { expect, test } from "@playwright/test";
import { installSyntheticNetwork, monitorBrowserErrors } from "./fixtures.mjs";

// Chromium runs in existing CI. UX_CH_CROSS_BROWSER=1 opts in to Firefox/WebKit.
// All API and external requests are intercepted; no live providers are accessed.
for (const viewport of [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
]) {
  test(`UX-CH customer route compatibility at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const boundary = await installSyntheticNetwork(page);
    const errors = monitorBrowserErrors(page);

    await page.goto("/home");
    await expect(page.getByRole("heading", { name: "Welcome to SEO ENGINE" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Customer preview navigation" })).toHaveCount(0);

    // Exercise the lazy dynamic import with the browser's actual module loader.
    await page.getByRole("link", { name: /Get started/ }).click();
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.locator("#main-content")).toBeVisible();

    await page.goto("/__ux_ch_not_found");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await page.getByRole("link", { name: "Return to Command Center" }).click();
    await expect(page).toHaveURL(/\/$/);

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflow).toBe(false);
    expect(boundary.unknownApiRequests).toEqual([]);
    expect(boundary.externalRequests).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
    expect(errors.consoleErrors).toEqual([]);
  });
}
