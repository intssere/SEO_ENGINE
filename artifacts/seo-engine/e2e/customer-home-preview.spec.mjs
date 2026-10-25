import { expect, test } from "@playwright/test";
import { installSyntheticNetwork, monitorBrowserErrors } from "./fixtures.mjs";

/**
 * CH-R83: browser acceptance of the deliberately disconnected customer route.
 * This suite must never supply a fake authorized capability or contact a live provider.
 */
for (const width of [320, 390, 768, 1024, 1440]) {
  test(`customer home safe preview at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const boundary = await installSyntheticNetwork(page);
    const errors = monitorBrowserErrors(page);

    await page.goto("/home");
    await expect(page.getByRole("heading", { name: "Your website workspace" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Verification pending" })).toBeVisible();
    await expect(page.getByText("Status unverified")).toBeVisible();
    await expect(page.getByText("No certified results yet")).toBeVisible();
    await expect(page.getByText("Read-only preview. Customer data is not yet enabled.")).toBeVisible();

    await expect(page.getByRole("region", { name: "Verified website overview" })).toHaveCount(0);
    await expect(page.getByText("Organic clicks")).toHaveCount(0);
    await expect(page.getByText("Diamond Shelf Test")).toHaveCount(0);

    const horizontalOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth
    );
    expect(horizontalOverflow, `horizontal overflow at ${width}px`).toBe(false);
    expect(boundary.unknownApiRequests).toEqual([]);
    expect(boundary.externalRequests).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
    expect(errors.consoleErrors).toEqual([]);
  });
}
