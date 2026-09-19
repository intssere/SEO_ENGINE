import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  installSyntheticNetwork,
  monitorBrowserErrors,
} from "./fixtures.mjs";

function assertNetworkBoundary(boundary) {
  expect(boundary.unknownApiRequests, "all browser API requests must be mocked").toEqual([]);
  expect(boundary.externalRequests, "browser tests must not contact external origins").toEqual([]);
}

function assertBrowserClean(errors) {
  expect(errors.pageErrors, "page errors").toEqual([]);
  expect(errors.consoleErrors, "console errors").toEqual([]);
}

async function openSyntheticPage(page, path, viewport = { width: 1440, height: 1000 }) {
  await page.setViewportSize(viewport);
  const boundary = await installSyntheticNetwork(page);
  const errors = monitorBrowserErrors(page);
  await page.goto(path);
  await page.locator("#main-content").waitFor();
  await page.evaluate(() => document.fonts.ready);
  return { boundary, errors };
}

test("desktop Command Center navigates without live network and hands route focus to main", async ({
  page,
}) => {
  const { boundary, errors } = await openSyntheticPage(page, "/");

  await expect(
    page.getByRole("heading", { name: "SEO operations overview" }),
  ).toBeVisible();
  await expect(
    page.getByText("Freshness marker: Synthetic fixture · 5 minutes").first(),
  ).toBeVisible();
  await expect(page.getByRole("main")).toHaveAttribute("id", "main-content");

  const technicalLink = page.getByRole("link", { name: "Technical SEO" });
  await technicalLink.click();

  await expect(page).toHaveURL(/\/technical-seo$/);
  await expect(
    page.getByRole("heading", { name: "Technical SEO & crawl explorer" }),
  ).toBeVisible();
  await expect(page.locator("#main-content")).toBeFocused();

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

test("compact mobile navigation closes with Escape and restores toggle focus", async ({
  page,
}) => {
  const { boundary, errors } = await openSyntheticPage(
    page,
    "/",
    { width: 390, height: 844 },
  );

  const toggle = page.locator(".mobileNavToggle");
  await expect(toggle).toHaveAccessibleName("Open navigation");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toggle).toHaveAccessibleName("Close navigation");
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toHaveAttribute("aria-expanded", "false");

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

test("Audit DataGrid is keyboard-scrollable and search/sort behavior is deterministic", async ({
  page,
}) => {
  const { boundary, errors } = await openSyntheticPage(page, "/technical-seo");

  const gridRegion = page.getByRole("region", {
    name: /Technical findings table\. Scroll horizontally/,
  });
  await gridRegion.focus();
  await expect(gridRegion).toBeFocused();

  const search = page.getByPlaceholder("Search finding, category, status or URL");
  await search.fill("canonical");
  await expect(page.getByText("Missing canonical tag")).toBeVisible();
  await expect(page.getByText("Title element is too short")).toHaveCount(0);

  await search.fill("");
  const severitySort = page.getByRole("button", { name: "Sort by Severity" });
  await severitySort.click();
  await expect(
    page.getByRole("columnheader", { name: /Severity/ }),
  ).toHaveAttribute("aria-sort", "ascending");

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

test("Search Intelligence stays synthetic, searchable, sortable, and network-closed", async ({
  page,
}) => {
  const { boundary, errors } = await openSyntheticPage(page, "/search-intelligence");

  await expect(
    page.getByRole("heading", { name: "Competitor intelligence workspace" }),
  ).toBeVisible();
  await expect(page.getByText("SYNTHETIC READ-ONLY")).toBeVisible();
  await expect(page.getByText("DEFAULT-OFF")).toBeVisible();

  const competitorRegion = page.getByRole("region", {
    name: /Competitor visibility table\. Scroll horizontally/,
  });
  await competitorRegion.focus();
  await expect(competitorRegion).toBeFocused();

  const competitorSearch = page.getByPlaceholder("Search competitor domain");
  await competitorSearch.fill("competitor-b");
  await expect(competitorRegion.getByText("competitor-b.test").first()).toBeVisible();
  await expect(competitorRegion.getByText("competitor-a.test").first()).toHaveCount(0);
  await competitorSearch.fill("");

  const visibleSort = page.getByRole("button", { name: "Sort by Visible / measured" });
  await visibleSort.click();
  await expect(
    page.getByRole("columnheader", { name: /Visible \/ measured/ }).first(),
  ).toHaveAttribute("aria-sort", "ascending");

  const topicRegion = page.getByRole("region", {
    name: /Topic gap evidence table\. Scroll horizontally/,
  });
  const topicSearch = page.getByPlaceholder("Search topic or state");
  await topicSearch.fill("oud perfume");
  await expect(topicRegion.getByText("oud perfume").first()).toBeVisible();
  await expect(topicRegion.getByText("vanilla perfume").first()).toHaveCount(0);

  await expect(
    page.getByText(/Observed-topic visibility is limited to this supplied cohort and is not market share/),
  ).toBeVisible();

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

test("AI Visibility workspace is synthetic, searchable, sortable, and network-closed", async ({
  page,
}) => {
  const { boundary, errors } = await openSyntheticPage(page, "/ai-visibility");

  await expect(
    page.getByRole("heading", { name: "AI Visibility workspace" }),
  ).toBeVisible();
  await expect(page.getByText("SYNTHETIC READ-ONLY")).toBeVisible();
  await expect(page.getByText("DEFAULT-OFF")).toBeVisible();
  await expect(page.getByText("LIVE DISABLED")).toBeVisible();
  await expect(page.getByText("Coming soon")).toHaveCount(0);

  const answerRegion = page.getByRole("region", {
    name: /AI answer observations table\. Scroll horizontally/,
  });
  await answerRegion.focus();
  await expect(answerRegion).toBeFocused();

  const answerSearch = page.getByPlaceholder("Search provider, model, prompt or brand");
  await answerSearch.fill("provider-beta");
  await expect(answerRegion.getByText("provider-beta").first()).toBeVisible();
  await expect(answerRegion.getByText("provider-alpha").first()).toHaveCount(0);
  await answerSearch.fill("");

  const scoreSort = page.getByRole("button", { name: "Sort by P7.5 score" });
  await scoreSort.click();
  await expect(
    page.getByRole("columnheader", { name: /P7\.5 score/ }),
  ).toHaveAttribute("aria-sort", "ascending");

  await expect(
    page.getByText(/P7\.5 score is source evidence and is not a P6\.2 opportunity score/),
  ).toBeVisible();
  await expect(
    page.getByText(/not a recommendation, approval, priority or execution authorization/),
  ).toBeVisible();

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

test("Governance workspace is read-only, searchable, sortable, and network-closed", async ({ page }) => {
  const { boundary, errors } = await openSyntheticPage(page, "/governance");
  await expect(page.getByRole("heading", { name: "Governance workspace" })).toBeVisible();
  await expect(page.getByText("READ-ONLY GOVERNANCE")).toBeVisible();
  await expect(page.getByText("NO APPROVAL GRANT")).toBeVisible();
  await expect(page.getByText("NO EXECUTION")).toBeVisible();
  const region = page.getByRole("region", { name: /Governance pipeline table\. Scroll horizontally/ });
  await region.focus();
  await expect(region).toBeFocused();
  const search = page.getByPlaceholder("Search opportunity, proposal, review state or risk");
  await search.fill("approved");
  await expect(region.getByText("Approved").first()).toBeVisible();
  await search.fill("");
  const sort = page.getByRole("button", { name: "Sort by Review state" });
  await sort.click();
  await expect(page.getByRole("columnheader", { name: /Review state/ })).toHaveAttribute("aria-sort", "ascending");
  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

test("Ask dialog traps focus, answers from fixture, closes with Escape, and restores focus", async ({
  page,
}) => {
  const { boundary, errors } = await openSyntheticPage(page, "/");

  const restoreTarget = page.getByRole("link", { name: "Technical SEO" });
  await restoreTarget.focus();
  await expect(restoreTarget).toBeFocused();

  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        bubbles: true,
      }),
    );
  });

  const dialog = page.getByRole("dialog", { name: "Ask SEO ENGINE" });
  await expect(dialog).toBeVisible();
  const question = page.getByRole("textbox", { name: "Question for SEO Engine" });
  await expect(question).toBeFocused();

  await question.fill("What is the current synthetic test state?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(
    dialog.getByText(/Synthetic browser fixture: no provider/),
  ).toBeVisible();

  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => {
      const active = document.activeElement;
      const modal = document.querySelector('[role="dialog"]');
      return Boolean(active && modal && modal.contains(active));
    });
    expect(inside).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(restoreTarget).toBeFocused();

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

for (const route of ["/", "/technical-seo", "/search-intelligence", "/ai-visibility", "/governance", "/connections"]) {
  test(`axe serious/critical scan passes on ${route}`, async ({ page }) => {
    const { boundary, errors } = await openSyntheticPage(page, route);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    const blocking = results.violations
      .filter((violation) =>
        violation.impact === "serious" || violation.impact === "critical",
      )
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        targets: violation.nodes.flatMap((node) => node.target),
      }));

    expect(blocking).toEqual([]);
    assertNetworkBoundary(boundary);
    assertBrowserClean(errors);
  });
}
