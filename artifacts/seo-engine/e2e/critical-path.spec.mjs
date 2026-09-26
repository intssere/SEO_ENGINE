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

test("desktop Home navigates through customer IA and hands route focus to main", async ({
  page,
}) => {
  const { boundary, errors } = await openSyntheticPage(page, "/");

  await expect(
    page.getByRole("heading", { name: "Search growth overview" }),
  ).toBeVisible();
  await expect(
    page.getByText("Freshness marker: Synthetic fixture · 5 minutes").first(),
  ).toBeVisible();
  await expect(page.getByRole("main")).toHaveAttribute("id", "main-content");

  const siteAuditLink = page
    .locator(".sidebar .primaryNav")
    .getByRole("link", { name: "Site Audit", exact: true });
  await siteAuditLink.click();

  await expect(page).toHaveURL(/\/site-audit$/);
  await expect(
    page.getByRole("heading", { name: "Site Audit" }),
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

test("UGP-3.1 URL onboarding stays network-closed and shows pending safety checks", async ({ page }) => {
  const { boundary, errors } = await openSyntheticPage(page, "/settings/add-website");

  const input = page.getByRole("textbox", { name: "Website URL" });
  await input.fill("http://www.example.com/products?q=1#fragment");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Platform hint" })).toBeVisible();
  await expect(page.getByText("http://www.example.com", { exact: true })).toBeVisible();

  const onboarding = page.getByRole("region", { name: "Public web onboarding" });
  await expect(onboarding).toBeVisible();
  await expect(onboarding.getByText("NOT RUN")).toBeVisible();
  for (const label of ["DNS / public address", "Redirect chain", "robots.txt", "Sitemap hints"]) {
    await expect(onboarding.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(onboarding.getByText("PENDING")).toHaveCount(4);
  await expect(onboarding).toContainText("final analysis origin must resolve to HTTPS");
  await expect(onboarding).toContainText("No DNS lookup");

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze();
  expect(axe.violations.map((violation) => violation.id)).toEqual([]);

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

test("UGP-2.5 contextual guide is route-aware, keyboard dismissible, focus-restoring and axe-clean", async ({
  page,
}) => {
  const { boundary, errors } = await openSyntheticPage(page, "/content");

  await expect(page.getByRole("dialog", { name: /guide/i })).toHaveCount(0);
  const trigger = page.locator(".sidebar").getByRole("button", { name: "Guide this page" });
  await trigger.focus();
  await trigger.click();

  const guide = page.getByRole("dialog", { name: "Move between workspaces" });
  await expect(guide).toBeVisible();
  await expect(page.locator(".sidebar .primaryNav")).toHaveAttribute("data-onboarding-active", "true");
  await expect(guide.getByText("Step 1 of 3")).toBeVisible();
  await expect(guide.getByRole("button", { name: "Close guide" })).toBeFocused();

  await guide.getByRole("button", { name: "Next" }).click();
  await expect(page.locator(".customerHubHero")).toHaveAttribute("data-onboarding-active", "true");
  await expect(page.locator(".sidebar .primaryNav")).not.toHaveAttribute("data-onboarding-active", "true");
  await expect(page.getByRole("dialog", { name: "Content overview" })).toBeVisible();

  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.locator(".sidebar .primaryNav")).toHaveAttribute("data-onboarding-active", "true");

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze();
  expect(axe.violations.map((violation) => violation.id)).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator(".sidebar .primaryNav")).not.toHaveAttribute("data-onboarding-active", "true");

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

test("UGP-2.5 mobile Guide control and panel stay viewport-safe", async ({ page }) => {
  const { boundary, errors } = await openSyntheticPage(
    page,
    "/settings",
    { width: 390, height: 844 },
  );

  const trigger = page.locator(".mobileNav").getByRole("button", { name: "Guide this page" });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const guide = page.getByRole("dialog", { name: "Move between workspaces" });
  await expect(guide).toBeVisible();
  const geometry = await guide.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);

  await page.getByRole("button", { name: "Close guide" }).click();
  await expect(trigger).toBeFocused();

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

test("P12.1 primary navigation excludes engineering-only routes while direct engineering access stays honest", async ({
  page,
}) => {
  const { boundary, errors } = await openSyntheticPage(page, "/");

  const primary = page.locator(".sidebar .primaryNav");
  for (const label of [
    "Home",
    "Opportunities",
    "Content",
    "Site Audit",
    "Authority",
    "Automation",
    "Performance",
    "Settings",
  ]) {
    await expect(primary.getByRole("link", { name: new RegExp("^" + label) })).toBeVisible();
  }

  for (const label of [
    "Technical SEO",
    "Governance",
    "Actions",
    "Approvals",
    "Deployments",
    "Connections",
    "Rankings",
    "Search Intelligence",
    "AI Visibility",
    "Internal Links",
    "Impact",
    "Reports",
    "Experiments",
    "Learning",
  ]) {
    await expect(primary.getByRole("link", { name: new RegExp("^" + label) })).toHaveCount(0);
  }

  await page.goto("/search-intelligence");
  await expect(
    page.getByRole("heading", { name: "Competitor intelligence workspace" }),
  ).toBeVisible();
  await expect(page.getByText("SYNTHETIC READ-ONLY")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }).first(),
  ).not.toContainText("Search Intelligence");

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

test("UGP-2.2 customer routes declare detail level and return to their parent", async ({
  page,
}) => {
  const { boundary, errors } = await openSyntheticPage(page, "/site-audit/technical");

  const banner = page.getByRole("note");
  await expect(banner).toContainText("ADVANCED VIEW");
  await expect(banner).toContainText("Site Audit details");
  const back = banner.getByRole("link", { name: "Back to Site Audit" });
  await back.click();
  await expect(page).toHaveURL(/\/site-audit$/);

  await page.goto("/content/research");
  await expect(page.getByRole("note")).toContainText("EVIDENCE VIEW");

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

test("UGP-2.3 opportunity card exposes the complete customer decision grammar", async ({
  page,
}) => {
  const { boundary, errors } = await openSyntheticPage(page, "/opportunities");

  const card = page.locator("article.approvalReviewCard").first();
  await expect(card.getByRole("heading", { name: "Improve product meta description" })).toBeVisible();
  for (const label of [
    "Impact",
    "Risk",
    "Current state",
    "Recommended state",
    "Why",
    "Review / apply",
    "Measurement",
  ]) {
    await expect(card.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(card.getByText("Impact not available.")).toBeVisible();
  await expect(card.getByText("Not available", { exact: true })).toBeVisible();
  await expect(card.getByText("Synthetic proposal")).toBeVisible();
  await expect(card.getByText("Not measured")).toBeVisible();
  await expect(card.getByText("Preview after proposal")).toBeVisible();
  await expect(card.getByRole("button", { name: "See evidence" })).toBeVisible();
  await expect(card.getByRole("link", { name: "Review workflow" })).toHaveAttribute("href", "/automation");

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

test("UGP-2.2 opportunity evidence reveals traceability before technical details", async ({
  page,
}) => {
  const { boundary, errors } = await openSyntheticPage(page, "/opportunities");

  await page.getByRole("button", { name: "See evidence" }).first().click();
  await expect(page.getByText("What supports this")).toBeVisible();

  const evidence = page.getByText("Show traceable evidence");
  const advanced = page.getByText("Show technical details");
  await expect(evidence).toBeVisible();
  await expect(advanced).toBeHidden();

  await evidence.click();
  await expect(page.getByRole("heading", { name: "Traceable evidence" })).toBeVisible();
  await expect(advanced).toBeVisible();

  await advanced.click();
  await expect(page.getByText("Quality & provenance")).toBeVisible();
  await expect(page.getByText("Unavailable technical dimensions")).toBeVisible();

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
  await expect(page.getByRole("heading", { name: "Action inspection cards" })).toBeVisible();
  await expect(page.getByText("VERIFICATION DETAIL UNAVAILABLE")).toBeVisible();
  await expect(page.getByText("ROLLBACK PLAN ONLY")).toBeVisible();
  await expect(page.getByText("ROLLBACK STATUS UNAVAILABLE")).toBeVisible();
  await expect(page.getByText("Restore prior value")).toBeVisible();
  await expect(page.getByText("Old description", { exact: true })).toBeVisible();
  await expect(page.getByText("Proposed description", { exact: true })).toBeVisible();
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

  const restoreTarget = page
    .locator(".sidebar .primaryNav")
    .getByRole("link", { name: "Site Audit", exact: true });
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

for (const route of ["/", "/content", "/site-audit", "/authority", "/automation", "/settings", "/content/research", "/site-audit/technical", "/automation/safety", "/settings/connections", "/settings/add-website", "/technical-seo", "/search-intelligence", "/ai-visibility", "/governance", "/connections"]) {
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