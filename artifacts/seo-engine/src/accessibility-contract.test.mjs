import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => readFileSync(join(here, relativePath), "utf8");

const layout = read("components/layout.tsx");
const grid = read("components/data-grid.tsx");
const ask = read("components/ask-modal.tsx");
const connections = read("pages/connections.tsx");
const performance = read("pages/performance.tsx");
const approvals = read("pages/approvals.tsx");
const governance = read("pages/governance.tsx");
const dashboard = read("pages/dashboard.tsx");
const technical = read("pages/technical-seo.tsx");
const css = read("index.css");

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const value = hex.replace("#", "");
  const red = channel(Number.parseInt(value.slice(0, 2), 16));
  const green = channel(Number.parseInt(value.slice(2, 4), 16));
  const blue = channel(Number.parseInt(value.slice(4, 6), 16));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("app shell has a skip link, one focusable main landmark, and route focus handoff", () => {
  assert.ok(layout.includes('className="skipLink" href="#main-content"'));
  assert.ok(layout.includes('id="main-content"'));
  assert.ok(layout.includes("ref={mainContentRef}"));
  assert.ok(layout.includes("tabIndex={-1}"));
  assert.ok(layout.includes("focus({ preventScroll: true })"));
  assert.ok(layout.includes("previousLocationRef"));
  assert.doesNotMatch(layout, /<main className="shell"/);
  assert.doesNotMatch(dashboard, /<main className="content commandCenter"/);
  assert.doesNotMatch(technical, /<main className="content auditWorkspace"/);
});

test("mobile navigation exposes group semantics and Escape returns focus to the toggle", () => {
  assert.ok(layout.includes('role="group" aria-labelledby={domainId}'));
  assert.ok(layout.includes("mobileNavToggleRef"));
  assert.ok(layout.includes('e.key === "Escape" && isMobileNavOpen'));
  assert.ok(layout.includes("mobileNavToggleRef.current?.focus()"));
  assert.ok(layout.includes("aria-expanded={isMobileNavOpen}"));
  assert.ok(layout.includes('aria-controls="mobile-primary-navigation"'));
});

test("DataGrid horizontal scroll regions are keyboard focusable and labelled", () => {
  assert.ok(grid.includes('role="region"'));
  assert.ok(grid.includes("tabIndex={0}"));
  assert.ok(
    grid.includes(
      "Scroll horizontally for additional columns.",
    ),
  );
  assert.ok(grid.includes('role="group" aria-label="Table pagination"'));
  assert.ok(grid.includes('aria-sort={ariaSort}'));
});

test("Ask uses the Radix Dialog primitive with labelled input and live states", () => {
  assert.ok(ask.includes("<Dialog open={open}"));
  assert.ok(ask.includes("<DialogContent"));
  assert.ok(ask.includes("<DialogTitle"));
  assert.ok(ask.includes("<DialogDescription"));
  assert.ok(ask.includes('htmlFor="ask-seo-question"'));
  assert.ok(ask.includes('id="ask-seo-question"'));
  assert.ok(ask.includes('aria-describedby="ask-modal-help"'));
  assert.ok(ask.includes('aria-live="polite"'));
  assert.ok(ask.includes('role="alert"'));
  assert.ok(ask.includes('role="status"'));
  assert.ok(ask.includes("onOpenAutoFocus"));
  assert.doesNotMatch(ask, /role="dialog"/);
  assert.doesNotMatch(ask, /window\.addEventListener\("keydown"/);
});

test("Connections, Performance, and Approvals expose programmatic form labels", () => {
  assert.ok(connections.includes('htmlFor="shopify-domain"'));
  assert.ok(connections.includes('id="shopify-domain"'));
  assert.ok(performance.includes('htmlFor="performance-days"'));
  assert.ok(performance.includes('htmlFor="performance-country"'));
  assert.ok(performance.includes('htmlFor="performance-device"'));
  assert.ok(performance.includes('aria-label="Reporting window"'));
  assert.ok(performance.includes('aria-label="Country"'));
  assert.ok(performance.includes('aria-label="Device"'));
  assert.ok(approvals.includes("const draftTextareaId"));
  assert.ok(approvals.includes("htmlFor={draftTextareaId}"));
  assert.ok(approvals.includes("id={draftTextareaId}"));
});

test("remediated loading, success, and failure states are announced", () => {
  assert.ok(connections.includes('role="status" aria-live="polite"'));
  assert.ok(connections.includes('role="alert"'));
  assert.ok(performance.includes('role="status" aria-live="polite"'));
  assert.ok(performance.includes('role="alert"'));
  assert.ok(approvals.includes('role="status" aria-live="polite"'));
  assert.ok(approvals.includes('role="alert"'));
  assert.ok(dashboard.includes('role="status" aria-live="polite"'));
  assert.ok(dashboard.includes('role="alert"'));
  assert.ok(technical.includes('role="status" aria-live="polite"'));
});

test("normal-size light-surface accessibility palette meets 4.5:1 contrast", () => {
  const pairs = [
    ["#647087", "#ffffff"],
    ["#5f6d83", "#ffffff"],
    ["#607089", "#ffffff"],
    ["#68758a", "#ffffff"],
    ["#5d6879", "#eef1f5"],
    ["#245ea8", "#e8f1ff"],
    ["#14764a", "#e7f8ef"],
    ["#8d5c0d", "#fff3dc"],
    ["#a43131", "#fdeaea"],
  ];
  for (const [foreground, background] of pairs) {
    assert.ok(
      contrastRatio(foreground, background) >= 4.5,
      `${foreground} on ${background} must meet 4.5:1`,
    );
  }

  for (const disallowed of [
    "#77839a",
    "#8792a4",
    "#7d899c",
    "#8590a2",
    "#728096",
    "#76839a",
    "#758197",
    "#7c889b",
    "#7b879a",
    "#6f7c92",
    "#6f7b8f",
  ]) {
    assert.ok(!css.includes(disallowed), `light-surface low-contrast color remains: ${disallowed}`);
  }
});

test("shared focus, reduced-motion, and forced-colors baselines are present", () => {
  assert.ok(css.includes(".skipLink"));
  assert.ok(css.includes(":focus-visible"));
  assert.ok(css.includes("0 0 0 5px #1d4ed8"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(css.includes("animation-duration: 0.01ms !important"));
  assert.ok(css.includes("transition-duration: 0.01ms !important"));
  assert.ok(css.includes("@media (forced-colors: active)"));
  assert.ok(css.includes("outline: 2px solid CanvasText"));
});

test("P4.8 remains a frontend accessibility baseline, not browser certification", () => {
  const source = [layout, grid, ask, connections, performance, approvals].join("\n");
  assert.doesNotMatch(source, /DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(source, /startCrawl|resumeCrawl|fetchSitemap/);
  assert.doesNotMatch(source, /PUBLIC_SITE_WRITES_ENABLED|SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED/);
});

test("P8.1 governance page preserves read-only accessible DataGrid semantics", () => {
  assert.ok(governance.includes('label="Governance pipeline"'));
  assert.ok(governance.includes("READ-ONLY GOVERNANCE"));
  assert.ok(governance.includes("NO APPROVAL GRANT"));
  assert.ok(governance.includes("NO EXECUTION"));
  assert.doesNotMatch(governance, /useDecideApproval|useAuthorizeInternalAction|mutate\s*\(/);
});
