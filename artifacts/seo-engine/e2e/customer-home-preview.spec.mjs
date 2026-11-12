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
    const operatorRequests = [];
    page.on("request", (request) => {
      if (/\/api\/(dashboard|actions|approvals|command)(?:[/?]|$)/.test(new URL(request.url()).pathname)) {
        operatorRequests.push(request.url());
      }
    });

    await page.goto("/home");
    await expect(page.getByRole("heading", { name: "Welcome to SEO ENGINE" })).toBeVisible();
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Customer preview navigation" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Get started/ })).toHaveAttribute("href", "/onboarding");
    await expect(page.getByText("Run your first analysis")).toBeVisible();
    await expect(page.getByText("Changes require authorization and verified evidence.", { exact: false })).toBeVisible();

    await expect(page.getByRole("region", { name: "Verified website overview" })).toHaveCount(0);
    await expect(page.getByText("Organic clicks")).toHaveCount(0);
    await expect(page.getByText("Diamond Shelf Test")).toHaveCount(0);
    await expect(page.getByText("Engine online")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Ask SEO|Ask AI|Ask assistant/i })).toHaveCount(0);

    const horizontalOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth
    );
    expect(horizontalOverflow, `horizontal overflow at ${width}px`).toBe(false);
    expect(operatorRequests).toEqual([]);
    expect(boundary.unknownApiRequests).toEqual([]);
    expect(boundary.externalRequests).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
    expect(errors.consoleErrors).toEqual([]);
  });
}


test("customer onboarding stays local and never claims a connection", async ({ page }) => {
  const boundary = await installSyntheticNetwork(page);
  const errors = monitorBrowserErrors(page);
  const operatorRequests = [];
  page.on("request", (request) => {
    if (/\/api\/(dashboard|actions|approvals|command)(?:[/?]|$)/.test(new URL(request.url()).pathname)) {
      operatorRequests.push(request.url());
    }
  });
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "Connect your website" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to customer home" })).toHaveAttribute("href", "/home");
  const website = page.getByLabel("Website URL");
  const continueButton = page.getByRole("button", { name: /Continue/ });
  await expect(continueButton).toBeDisabled();
  await website.fill("http://localhost:3000");
  await expect(continueButton).toBeDisabled();
  await website.fill("https://example.com");
  await expect(continueButton).toBeEnabled();
  await continueButton.click();
  await expect(page.getByRole("heading", { name: "Choose your data connections" })).toBeVisible();
  await expect(page.getByText("This preview does not start OAuth or grant access.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /Review readiness/ }).click();
  await expect(page.getByRole("heading", { name: "Ready for verified setup" })).toBeVisible();
  await expect(page.getByText("No data has been sent, no website added, and no analysis scheduled.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to customer home" })).toHaveAttribute("href", "/home");
  await expect(page.getByRole("link", { name: /Command Center|existing connections/i })).toHaveCount(0);
  expect(operatorRequests).toEqual([]);
  expect(boundary.unknownApiRequests).toEqual([]);
  expect(boundary.externalRequests).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});

const CUSTOMER_WORKSPACE_ROUTES = [
  "/onboarding", "/analysis", "/site-overview", "/customer-opportunities",
  "/opportunity-detail", "/automation-settings", "/results-impact", "/customer-portfolio",
];

test("CH visual shell: standalone home, light workspace navigation and active route", async ({ page }) => {
  const boundary = await installSyntheticNetwork(page);
  const errors = monitorBrowserErrors(page);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/home");
    await expect(page.locator(".chWelcomeStandalone")).toBeVisible();
    await expect(page.locator(".chLightSidebar")).toHaveCount(0);
    await expect(page.locator(".chLightTopbar")).toHaveCount(0);
    for (const route of CUSTOMER_WORKSPACE_ROUTES) {
      await page.goto(route);
      const sidebar = page.locator(".chLightSidebar");
      await expect(sidebar).toBeVisible();
      await expect(page.locator(".chLightTopbar")).toBeVisible();
      const active = sidebar.locator('a[aria-current="page"]');
      await expect(active).toHaveCount(1);
      await expect(active).toHaveAttribute("href", route);
      const surface = await sidebar.evaluate(element => {
        const bg = getComputedStyle(element).backgroundColor;
        const rect = element.getBoundingClientRect();
        return { bg, left: rect.left, right: rect.right, viewport: innerWidth,
          overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      });
      expect(surface.bg, route + " must have a light sidebar").toBe("rgb(255, 255, 255)");
      expect(surface.right, route + " sidebar must fit viewport").toBeLessThanOrEqual(surface.viewport + 1);
      expect(surface.left).toBeGreaterThanOrEqual(-1);
      expect(surface.overflow, route + " must not overflow horizontally").toBe(false);
    }
  }
  expect(boundary.unknownApiRequests).toEqual([]);
  expect(boundary.externalRequests).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});
