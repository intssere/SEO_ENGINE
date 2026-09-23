import { expect, test } from "@playwright/test";
import { installSyntheticNetwork, monitorBrowserErrors } from "./fixtures.mjs";
import { VISUAL_BASELINES } from "./visual-baselines.mjs";
import { hammingDistance, perceptualHash } from "./visual-hash.mjs";

const captureMode = process.env.P4_10_CAPTURE_VISUAL === "1";

const cases = {
  "command-center-desktop": {
    path: "/",
    ready: { role: "heading", name: "Search growth overview" },
  },
  "command-center-tablet": {
    path: "/",
    ready: { role: "heading", name: "Search growth overview" },
  },
  "command-center-mobile": {
    path: "/",
    ready: { role: "heading", name: "Search growth overview" },
  },
  "audit-desktop": {
    path: "/technical-seo",
    ready: { role: "heading", name: "Technical SEO & crawl explorer" },
  },
};

for (const [name, baseline] of Object.entries(VISUAL_BASELINES)) {
  test(`visual fingerprint: ${name}`, async ({ page }) => {
    const definition = cases[name];
    expect(definition, `missing visual case for ${name}`).toBeTruthy();

    await page.setViewportSize(baseline.viewport);
    const boundary = await installSyntheticNetwork(page);
    const errors = monitorBrowserErrors(page);

    await page.goto(definition.path);
    await expect(
      page.getByRole(definition.ready.role, { name: definition.ready.name }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({
      content:
        "*,*::before,*::after{caret-color:transparent!important;} html{scroll-behavior:auto!important;}",
    });

    const screenshot = await page.screenshot({
      fullPage: false,
      animations: "disabled",
      type: "png",
    });
    const actualHash = perceptualHash(screenshot);

    if (captureMode || baseline.hash === "CAPTURE") {
      console.log(
        `P4_10_VISUAL_BASELINE ${name} ${actualHash} ${baseline.viewport.width}x${baseline.viewport.height}`,
      );
      if (!captureMode) {
        throw new Error(
          `visual_baseline_missing:${name}: run pnpm test:e2e:capture and commit the emitted hash`,
        );
      }
    } else {
      const distance = hammingDistance(actualHash, baseline.hash);
      expect(
        distance,
        `${name} visual Hamming distance ${distance} exceeds ${baseline.maxDistance}; actual ${actualHash}, expected ${baseline.hash}`,
      ).toBeLessThanOrEqual(baseline.maxDistance);
    }

    expect(boundary.unknownApiRequests).toEqual([]);
    expect(boundary.externalRequests).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
    expect(errors.consoleErrors).toEqual([]);
  });
}
