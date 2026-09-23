import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  installSyntheticNetwork,
  monitorBrowserErrors,
} from "./fixtures.mjs";

const WCAG_AA_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
];

const ROUTES = [
  "/",
  "/opportunities",
  "/content",
  "/site-audit",
  "/authority",
  "/automation",
  "/performance",
  "/settings",
  "/governance",
  "/actions",
  "/approvals",
  "/deployments",
  "/technical-seo",
  "/rankings",
  "/internal-links",
  "/ai-visibility",
  "/experiments",
  "/search-intelligence",
  "/learning",
  "/impact",
  "/reports",
  "/connections",
  "/__p11-5-not-found",
];

function assertNetworkBoundary(boundary) {
  expect(
    boundary.unknownApiRequests,
    "all browser API requests must be mocked",
  ).toEqual([]);
  expect(
    boundary.externalRequests,
    "browser tests must not contact external origins",
  ).toEqual([]);
}

function assertBrowserClean(errors) {
  expect(errors.pageErrors, "page errors").toEqual([]);
  expect(errors.consoleErrors, "console errors").toEqual([]);
}

async function openSyntheticPage(
  page,
  path,
  viewport = { width: 1440, height: 1000 },
) {
  await page.setViewportSize(viewport);
  const boundary = await installSyntheticNetwork(page);
  const errors = monitorBrowserErrors(page);
  await page.goto(path);
  await page.locator("#main-content").waitFor();
  await page.evaluate(() => document.fonts.ready);
  return { boundary, errors };
}

function describeNode(node) {
  return {
    target: node.target,
    html: node.html,
    failureSummary: node.failureSummary,
  };
}

for (const route of ROUTES) {
  test(`P11.5 axe WCAG 2.2 A/AA zero-violation certification on ${route}`, async ({
    page,
  }) => {
    const { boundary, errors } = await openSyntheticPage(page, route);

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_AA_TAGS)
      .analyze();

    const violations = results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      helpUrl: violation.helpUrl,
      tags: violation.tags.filter((tag) => tag.startsWith("wcag")),
      nodes: violation.nodes.map(describeNode),
    }));

    expect(
      violations,
      "every WCAG A/AA violation blocks P11.5 regardless of axe impact level",
    ).toEqual([]);

    assertNetworkBoundary(boundary);
    assertBrowserClean(errors);
  });

  test(`P11.5 320px page-level reflow certification on ${route}`, async ({
    page,
  }) => {
    const { boundary, errors } = await openSyntheticPage(
      page,
      route,
      { width: 320, height: 800 },
    );

    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      htmlClient: document.documentElement.clientWidth,
      htmlScroll: document.documentElement.scrollWidth,
      bodyScroll: document.body.scrollWidth,
    }));

    expect(
      dimensions.htmlScroll,
      `document-level horizontal overflow at 320px: ${JSON.stringify(dimensions)}`,
    ).toBeLessThanOrEqual(dimensions.viewport + 1);
    expect(
      dimensions.bodyScroll,
      `body-level horizontal overflow at 320px: ${JSON.stringify(dimensions)}`,
    ).toBeLessThanOrEqual(dimensions.viewport + 1);

    assertNetworkBoundary(boundary);
    assertBrowserClean(errors);
  });

  test(`P11.5 applicable interactive targets meet 24x24 CSS px on ${route}`, async ({
    page,
  }) => {
    const { boundary, errors } = await openSyntheticPage(
      page,
      route,
      { width: 390, height: 844 },
    );

    const failures = await page.evaluate(() => {
      const selector = [
        "button:not([disabled])",
        "input:not([type='hidden']):not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "summary",
        "[role='button']",
        "[role='checkbox']",
        "[role='radio']",
        "[role='switch']",
        "[role='tab']",
        "[role='menuitem']",
        "[role='option']",
        "a[href]",
      ].join(",");

      const isVisible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) !== 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      };

      const isInlineTextLinkException = (element) => {
        if (!(element instanceof HTMLAnchorElement)) return false;
        const style = getComputedStyle(element);
        return (
          style.display === "inline" &&
          Boolean(element.closest("p, li, dd, dt, figcaption"))
        );
      };

      const targets = [...document.querySelectorAll(selector)]
        .filter((element) => element instanceof HTMLElement)
        .filter(isVisible)
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            element,
            rect,
            width: rect.width,
            height: rect.height,
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2,
          };
        });

      const circleIntersectsRect = (centerX, centerY, radius, rect) => {
        const nearestX = Math.max(rect.left, Math.min(centerX, rect.right));
        const nearestY = Math.max(rect.top, Math.min(centerY, rect.bottom));
        const dx = centerX - nearestX;
        const dy = centerY - nearestY;
        return dx * dx + dy * dy < radius * radius;
      };

      const hasSpacingException = (target, targetIndex) =>
        targets.every((other, otherIndex) => {
          if (otherIndex === targetIndex) return true;

          const otherIsUndersized = other.width < 24 || other.height < 24;
          if (otherIsUndersized) {
            const dx = target.centerX - other.centerX;
            const dy = target.centerY - other.centerY;
            return Math.hypot(dx, dy) >= 24;
          }

          return !circleIntersectsRect(
            target.centerX,
            target.centerY,
            12,
            other.rect,
          );
        });

      return targets.flatMap((target, index) => {
        if (target.width >= 24 && target.height >= 24) return [];
        if (isInlineTextLinkException(target.element)) return [];
        if (hasSpacingException(target, index)) return [];

        return [
          {
            tag: target.element.tagName.toLowerCase(),
            role: target.element.getAttribute("role"),
            text: (
              target.element.getAttribute("aria-label") ||
              target.element.textContent ||
              ""
            )
              .trim()
              .replace(/\s+/g, " ")
              .slice(0, 100),
            width: Math.round(target.width * 100) / 100,
            height: Math.round(target.height * 100) / 100,
          },
        ];
      });
    });

    expect(
      failures,
      "WCAG 2.2 target-size candidates fail both 24x24 sizing and the spacing exception",
    ).toEqual([]);

    assertNetworkBoundary(boundary);
    assertBrowserClean(errors);
  });
}

test("P11.5 skip link, focus visibility, and focus-not-obscured contract", async ({
  page,
}) => {
  const { boundary, errors } = await openSyntheticPage(page, "/");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  const focusState = await skipLink.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const viewportIntersection = {
      width: Math.max(
        0,
        Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0),
      ),
      height: Math.max(
        0,
        Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0),
      ),
    };
    const pointX = Math.min(
      window.innerWidth - 1,
      Math.max(0, rect.left + Math.min(rect.width / 2, 8)),
    );
    const pointY = Math.min(
      window.innerHeight - 1,
      Math.max(0, rect.top + Math.min(rect.height / 2, 8)),
    );
    const hit = document.elementFromPoint(pointX, pointY);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
      viewportIntersection,
      hitIsFocusedElement:
        hit === element || (hit instanceof Node && element.contains(hit)),
    };
  });

  const outlineVisible =
    focusState.outlineStyle !== "none" &&
    Number.parseFloat(focusState.outlineWidth) > 0;
  const shadowVisible =
    focusState.boxShadow !== "none" && focusState.boxShadow !== "";

  expect(
    outlineVisible || shadowVisible,
    `focused skip link needs visible focus styling: ${JSON.stringify(focusState)}`,
  ).toBe(true);
  expect(focusState.viewportIntersection.width).toBeGreaterThan(0);
  expect(focusState.viewportIntersection.height).toBeGreaterThan(0);
  expect(
    focusState.hitIsFocusedElement,
    `focused skip link is obscured: ${JSON.stringify(focusState)}`,
  ).toBe(true);

  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

test("P11.5 route navigation preserves visible, unobscured focus on main content", async ({
  page,
}) => {
  const { boundary, errors } = await openSyntheticPage(page, "/");

  await page
    .locator(".sidebar .primaryNav")
    .getByRole("link", { name: "Site Audit", exact: true })
    .click();
  await expect(page).toHaveURL(/\/site-audit$/);
  const main = page.locator("#main-content");
  await expect(main).toBeFocused();

  const state = await main.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      intersectsViewport:
        rect.right > 0 &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.top < window.innerHeight,
    };
  });
  expect(state.intersectsViewport).toBe(true);
  expect(state.width).toBeGreaterThan(0);
  expect(state.height).toBeGreaterThan(0);

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

test("P11.5 reduced-motion preference suppresses nonessential CSS motion", async ({
  page,
}) => {
  const { boundary, errors } = await openSyntheticPage(page, "/");

  expect(
    await page.evaluate(() =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  ).toBe(true);

  const motionViolations = await page.evaluate(() => {
    const parseTimes = (value) =>
      value
        .split(",")
        .map((part) => part.trim())
        .map((part) =>
          part.endsWith("ms")
            ? Number.parseFloat(part) / 1000
            : Number.parseFloat(part),
        )
        .filter(Number.isFinite);

    return [...document.querySelectorAll("*")]
      .filter((element) => element instanceof HTMLElement)
      .flatMap((element) => {
        const style = getComputedStyle(element);
        const animationDurations = parseTimes(style.animationDuration);
        const transitionDurations = parseTimes(style.transitionDuration);
        const maxAnimation = Math.max(0, ...animationDurations);
        const maxTransition = Math.max(0, ...transitionDurations);
        if (maxAnimation <= 0.011 && maxTransition <= 0.011) return [];
        return [
          {
            tag: element.tagName.toLowerCase(),
            className: element.className,
            maxAnimation,
            maxTransition,
          },
        ];
      });
  });

  expect(
    motionViolations,
    "reduced-motion mode must collapse nonessential CSS animation/transition duration",
  ).toEqual([]);

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});