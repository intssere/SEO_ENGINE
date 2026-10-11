import { expect, test } from "@playwright/test";
import { installSyntheticNetwork, monitorBrowserErrors } from "./fixtures.mjs";

test("UX-CH-02 desktop rail toggles without losing navigation labels", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const boundary = await installSyntheticNetwork(page);
  const errors = monitorBrowserErrors(page);
  await page.goto("/");
  const shell = page.locator(".customerShell");
  const collapse = page.getByRole("button", { name: "Collapse sidebar" });
  await expect(collapse).toBeVisible();
  await collapse.click();
  await expect(shell).toHaveClass(/customerShell--compact/);
  const expand = page.getByRole("button", { name: "Expand sidebar" });
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".customerSidebar").getByRole("link", { name: "Overview" })).toBeVisible();
  await expand.focus();
  await page.keyboard.press("Enter");
  await expect(shell).not.toHaveClass(/customerShell--compact/);
  await expect(page.getByRole("button", { name: "Collapse sidebar" })).toHaveAttribute("aria-expanded", "true");
  expect(boundary.unknownApiRequests).toEqual([]);
  expect(boundary.externalRequests).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});

test("UX-CH-02 onboarding remains a local preview, not a provider action", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const boundary = await installSyntheticNetwork(page);
  const errors = monitorBrowserErrors(page);
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "Connect your website" })).toBeVisible();
  const next = page.getByRole("button", { name: /Continue/ });
  await expect(next).toBeDisabled();
  await page.getByLabel("Website URL").fill("https://example.com");
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page.getByRole("heading", { name: "Choose your data connections" })).toBeVisible();
  await page.getByRole("button", { name: /Review readiness/ }).click();
  await expect(page.getByText("No data has been sent, no website added, and no analysis scheduled.")).toBeVisible();
  expect(boundary.unknownApiRequests).toEqual([]);
  expect(boundary.externalRequests).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});
