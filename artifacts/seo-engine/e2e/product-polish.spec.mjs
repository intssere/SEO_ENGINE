import { expect, test } from "@playwright/test";
import {
  installSyntheticNetwork,
  monitorBrowserErrors,
} from "./fixtures.mjs";

const ROUTES = [
  "/",
  "/opportunities",
  "/governance",
  "/actions",
  "/approvals",
  "/performance",
  "/deployments",
  "/technical-seo",
  "/rankings",
  "/internal-links",
  "/ai-visibility",
  "/experiments",
  "/search-intelligence",
  "/learning",
  "/impact",
  "/connections",
  "/settings",
  "/__p11-6-not-found",
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "compact-desktop", width: 1024, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "phone", width: 390, height: 844 },
];

function assertNetworkBoundary(boundary) {
  expect(
    boundary.unknownApiRequests,
    "all browser API requests must be mocked",
  ).toEqual([]);
  expect(
    boundary.externalRequests,
    "product-polish tests must not contact external origins",
  ).toEqual([]);
}

function assertBrowserClean(errors) {
  expect(errors.pageErrors, "page errors").toEqual([]);
  expect(errors.consoleErrors, "console errors").toEqual([]);
}

async function openSyntheticPage(page, path, viewport) {
  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height,
  });
  const boundary = await installSyntheticNetwork(page);
  const errors = monitorBrowserErrors(page);
  await page.goto(path);
  await page.locator("#main-content").waitFor();
  await page.evaluate(() => document.fonts.ready);
  return { boundary, errors };
}

async function collectPolishState(page, viewport) {
  return page.evaluate(({ width }) => {
    const EPSILON = 1.5;
    const visible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
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

    const describe = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName.toLowerCase(),
        className:
          typeof element.className === "string"
            ? element.className.slice(0, 160)
            : "",
        text: (
          element.getAttribute("aria-label") ||
          element.textContent ||
          ""
        )
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 140),
        left: Math.round(rect.left * 100) / 100,
        right: Math.round(rect.right * 100) / 100,
        top: Math.round(rect.top * 100) / 100,
        bottom: Math.round(rect.bottom * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
      };
    };

    const shell = document.querySelector(".shell");
    const workspace = document.querySelector("#main-content");
    const content = document.querySelector(".content");
    const sidebar = document.querySelector(".sidebar");
    const mobileNav = document.querySelector(".mobileNav");

    const geometryFailures = [];
    for (const element of [shell, workspace, content, mobileNav]) {
      if (!(element instanceof HTMLElement) || !visible(element)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.left < -EPSILON || rect.right > window.innerWidth + EPSILON) {
        geometryFailures.push(describe(element));
      }
    }

    const contentPadding =
      content instanceof HTMLElement
        ? {
            left: Number.parseFloat(getComputedStyle(content).paddingLeft) || 0,
            right: Number.parseFloat(getComputedStyle(content).paddingRight) || 0,
          }
        : null;

    const shellMode = {
      sidebarVisible:
        sidebar instanceof HTMLElement ? visible(sidebar) : false,
      mobileNavVisible:
        mobileNav instanceof HTMLElement ? visible(mobileNav) : false,
      expectedCompact: width <= 820,
    };

    const isVisuallyHidden = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const clipped =
        (style.clip && style.clip !== "auto") ||
        (style.clipPath && style.clipPath !== "none");
      return (
        rect.width <= 1.5 &&
        rect.height <= 1.5 &&
        style.overflow === "hidden" &&
        (style.position === "absolute" || clipped)
      );
    };

    const clippingCandidates = [
      ...document.querySelectorAll(
        [
          "h1",
          "h2",
          "h3",
          "h4",
          "p",
          "small",
          "strong",
          "label",
          "button",
          "a[href]",
          ".statusBadge",
        ].join(","),
      ),
    ]
      .filter(visible)
      .filter((element) => !isVisuallyHidden(element));

    const clippingFailures = clippingCandidates.flatMap((element) => {
      if (!(element instanceof HTMLElement)) return [];
      if (
        element.closest(".dataGridWrap, .tableWrap") ||
        element.matches(".truncate") ||
        element.closest(".truncate") ||
        element.hasAttribute("title") ||
        element.closest("[title]")
      ) {
        return [];
      }
      const style = getComputedStyle(element);
      const clipsX = ["hidden", "clip"].includes(style.overflowX);
      const clipsY = ["hidden", "clip"].includes(style.overflowY);
      const clippedX =
        clipsX && element.scrollWidth > element.clientWidth + 1;
      const clippedY =
        clipsY && element.scrollHeight > element.clientHeight + 1;
      return clippedX || clippedY ? [describe(element)] : [];
    });

    const controls = [
      ...document.querySelectorAll(
        [
          "button:not([disabled])",
          "input:not([type='hidden']):not([disabled])",
          "select:not([disabled])",
          "textarea:not([disabled])",
          "a[href]",
          "[role='button']",
        ].join(","),
      ),
    ]
      .filter(visible)
      .filter((element) => !element.closest("[hidden]"))
      .map((element) => ({
        element,
        rect: element.getBoundingClientRect(),
      }));

    const overlapFailures = [];
    for (let i = 0; i < controls.length; i += 1) {
      for (let j = i + 1; j < controls.length; j += 1) {
        const first = controls[i];
        const second = controls[j];
        if (
          first.element.contains(second.element) ||
          second.element.contains(first.element)
        ) {
          continue;
        }

        const overlapWidth =
          Math.min(first.rect.right, second.rect.right) -
          Math.max(first.rect.left, second.rect.left);
        const overlapHeight =
          Math.min(first.rect.bottom, second.rect.bottom) -
          Math.max(first.rect.top, second.rect.top);

        if (overlapWidth > 2 && overlapHeight > 2) {
          overlapFailures.push({
            first: describe(first.element),
            second: describe(second.element),
            overlapWidth: Math.round(overlapWidth * 100) / 100,
            overlapHeight: Math.round(overlapHeight * 100) / 100,
          });
        }
      }
    }

    const touchSelectors = [
      "button:not([disabled]):not(.dataGridSortButton)",
      "input:not([type='hidden']):not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[role='button']",
      ".linkButton",
      ".mobileNavPanel .primaryNav a",
    ].join(",");

    const touchFailures =
      width <= 420
        ? [...document.querySelectorAll(touchSelectors)]
            .filter(visible)
            .flatMap((element) => {
              if (!(element instanceof HTMLElement)) return [];
              if (element.closest(".dataGridWrap")) return [];
              const rect = element.getBoundingClientRect();
              return rect.height + EPSILON < 44
                ? [describe(element)]
                : [];
            })
        : [];

    const scrollRegionFailures = [
      ...document.querySelectorAll(".dataGridWrap, .tableWrap"),
    ]
      .filter(visible)
      .flatMap((element) => {
        if (!(element instanceof HTMLElement)) return [];
        if (element.scrollWidth <= element.clientWidth + 1) return [];
        const style = getComputedStyle(element);
        return ["auto", "scroll"].includes(style.overflowX)
          ? []
          : [
              {
                ...describe(element),
                overflowX: style.overflowX,
                clientWidth: element.clientWidth,
                scrollWidth: element.scrollWidth,
              },
            ];
      });

    return {
      documentGeometry: {
        viewport: window.innerWidth,
        htmlClient: document.documentElement.clientWidth,
        htmlScroll: document.documentElement.scrollWidth,
        bodyScroll: document.body.scrollWidth,
      },
      geometryFailures,
      clippingFailures,
      overlapFailures,
      touchFailures,
      scrollRegionFailures,
      contentPadding,
      shellMode,
    };
  }, { width: viewport.width });
}

for (const route of ROUTES) {
  test(`P11.6 responsive/product polish certification on ${route}`, async ({
    page,
  }) => {
    for (const viewport of VIEWPORTS) {
      await test.step(viewport.name, async () => {
        const { boundary, errors } = await openSyntheticPage(
          page,
          route,
          viewport,
        );
        const state = await collectPolishState(page, viewport);

        expect(
          state.documentGeometry.htmlScroll,
          `${route} ${viewport.name} html overflow: ${JSON.stringify(
            state.documentGeometry,
          )}`,
        ).toBeLessThanOrEqual(state.documentGeometry.viewport + 1);
        expect(
          state.documentGeometry.bodyScroll,
          `${route} ${viewport.name} body overflow: ${JSON.stringify(
            state.documentGeometry,
          )}`,
        ).toBeLessThanOrEqual(state.documentGeometry.viewport + 1);

        expect(
          state.geometryFailures,
          `${route} ${viewport.name} core geometry escaped the viewport`,
        ).toEqual([]);
        expect(
          state.clippingFailures,
          `${route} ${viewport.name} has unintended clipped operational copy`,
        ).toEqual([]);
        expect(
          state.overlapFailures,
          `${route} ${viewport.name} has overlapping interactive controls`,
        ).toEqual([]);
        expect(
          state.scrollRegionFailures,
          `${route} ${viewport.name} has wide tabular content without internal horizontal scrolling`,
        ).toEqual([]);

        if (state.contentPadding) {
          expect(
            state.contentPadding.left,
            `${route} ${viewport.name} content left gutter`,
          ).toBeGreaterThanOrEqual(12);
          expect(
            state.contentPadding.right,
            `${route} ${viewport.name} content right gutter`,
          ).toBeGreaterThanOrEqual(12);
        }

        if (viewport.width <= 820) {
          expect(state.shellMode.sidebarVisible).toBe(false);
          expect(state.shellMode.mobileNavVisible).toBe(true);
        } else {
          expect(state.shellMode.sidebarVisible).toBe(true);
          expect(state.shellMode.mobileNavVisible).toBe(false);
        }

        if (viewport.width <= 420) {
          expect(
            state.touchFailures,
            `${route} ${viewport.name} has primary controls below the 44px product-polish touch target`,
          ).toEqual([]);
        }

        assertNetworkBoundary(boundary);
        assertBrowserClean(errors);
      });
    }
  });
}

test("P11.6 mobile navigation panel remains viewport-safe and touch-ergonomic", async ({
  page,
}) => {
  const viewport = { name: "phone", width: 390, height: 844 };
  const { boundary, errors } = await openSyntheticPage(page, "/", viewport);

  await page.getByRole("button", { name: "Open navigation" }).click();
  const panel = page.locator("#mobile-primary-navigation");
  await expect(panel).toBeVisible();

  const state = await panel.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const links = [...element.querySelectorAll("a[href]")].map((link) => {
      const linkRect = link.getBoundingClientRect();
      return {
        text: (link.textContent || "").trim().replace(/\s+/g, " "),
        height: linkRect.height,
        left: linkRect.left,
        right: linkRect.right,
      };
    });
    return {
      left: rect.left,
      right: rect.right,
      width: rect.width,
      viewport: window.innerWidth,
      links,
      htmlScroll: document.documentElement.scrollWidth,
      bodyScroll: document.body.scrollWidth,
    };
  });

  expect(state.left).toBeGreaterThanOrEqual(-1);
  expect(state.right).toBeLessThanOrEqual(state.viewport + 1);
  expect(state.htmlScroll).toBeLessThanOrEqual(state.viewport + 1);
  expect(state.bodyScroll).toBeLessThanOrEqual(state.viewport + 1);
  expect(
    state.links.filter(
      (link) =>
        link.height < 44 ||
        link.left < -1 ||
        link.right > state.viewport + 1,
    ),
  ).toEqual([]);

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});