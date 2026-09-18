import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => readFileSync(join(here, relativePath), "utf8");

const css = read("index.css");
const layout = read("components/layout.tsx");
const grid = read("components/data-grid.tsx");
const drawer = read("components/evidence-drawer.tsx");

function blockAfter(marker) {
  const index = css.lastIndexOf(marker);
  assert.ok(index >= 0, `missing CSS marker: ${marker}`);
  return css.slice(index);
}

test("P4.7 introduces a dedicated compact-tablet mobile-shell breakpoint", () => {
  const block = blockAfter("@media (max-width: 820px)");
  assert.ok(block.includes(".sidebar"));
  assert.ok(block.includes("display: none"));
  assert.ok(block.includes(".mobileNav"));
  assert.ok(block.includes("display: block"));
  assert.ok(block.includes(".topbar"));
  assert.ok(block.includes("position: static"));
  assert.ok(layout.includes('className="mobileNavToggle"'));
  assert.ok(layout.includes('className="mobileNavPanel"'));
});

test("shared data grids scroll internally instead of widening the page", () => {
  const polish = blockAfter("/* P4.7 responsive/mobile/tablet professional polish */");
  assert.ok(polish.includes(".workspace"));
  assert.ok(polish.includes("overflow-x: clip"));
  assert.ok(polish.includes(".tableWrap"));
  assert.ok(polish.includes("overscroll-behavior-inline: contain"));
  assert.ok(polish.includes(".dataGridWrap table"));
  assert.ok(polish.includes("min-width: 720px"));
  assert.ok(grid.includes("tableWrap dataGridWrap"));
});

test("workbench controls stack before phone-only widths", () => {
  const tablet = blockAfter("@media (max-width: 900px)");
  assert.ok(tablet.includes(".dataWorkbenchToolbar"));
  assert.ok(tablet.includes("flex-direction: column"));
  assert.ok(tablet.includes(".dataGridSearch"));
  assert.ok(tablet.includes("width: 100%"));
  assert.ok(tablet.includes(".dataGridPagination"));
  assert.ok(tablet.includes("width: 100%"));
});

test("core shared touch targets reach at least 44px", () => {
  const polish = blockAfter("/* P4.7 responsive/mobile/tablet professional polish */");
  for (const selector of [
    ".dataGridSearch",
    ".dataGridPageSize",
    ".commandCenterFilters select",
    ".mobileNavToggle",
    ".evidenceDrawerTrigger",
    ".dataGridPagination button",
    ".reviewButton",
    ".draftButton",
  ]) {
    assert.ok(polish.includes(selector), selector);
  }
  assert.ok(polish.includes("min-height: 44px"));
  const compact = blockAfter("@media (max-width: 820px)");
  assert.ok(compact.includes(".mobileNavPanel .primaryNav a"));
  assert.ok(compact.includes("min-height: 44px"));
});

test("status, long text and shared headers are wrap-safe", () => {
  const polish = blockAfter("/* P4.7 responsive/mobile/tablet professional polish */");
  assert.ok(polish.includes(".statusBadge"));
  assert.ok(polish.includes("white-space: normal"));
  assert.ok(polish.includes(".titleRow"));
  assert.ok(polish.includes(".sectionHead"));
  assert.ok(polish.includes("overflow-wrap: anywhere"));
  const compact = blockAfter("@media (max-width: 820px)");
  assert.ok(compact.includes("flex-direction: column"));
});

test("evidence drawer uses viewport-safe tablet and mobile sizing", () => {
  assert.ok(drawer.includes("evidenceDrawerContent"));
  const tablet = blockAfter("@media (max-width: 900px)");
  assert.ok(tablet.includes("width: min(96vw, 680px)"));
  const phone = blockAfter("@media (max-width: 640px)");
  assert.ok(phone.includes("width: 100vw"));
  assert.ok(css.includes("100dvh"));
});

test("P4.7 changes remain presentation-only", () => {
  const sources = [layout, grid, drawer].join("\n");
  assert.doesNotMatch(sources, /startPilotRun|useMutation|startCrawl|fetchSitemap/);
  assert.doesNotMatch(sources, /DATABASE_URL|postgres|drizzle/);
});
