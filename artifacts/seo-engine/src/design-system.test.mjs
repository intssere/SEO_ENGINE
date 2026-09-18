import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => readFileSync(join(here, relativePath), "utf8");

const layout = read("components/layout.tsx");
const badge = read("components/status-badge.tsx");
const css = read("index.css");

const migratedSources = [
  "components/operational-table.tsx",
  "components/informational-page.tsx",
  "components/proposal-table.tsx",
  "pages/opportunities.tsx",
  "pages/dashboard.tsx",
  "pages/approvals.tsx",
  "pages/actions.tsx",
  "pages/connections.tsx",
  "pages/settings.tsx",
].map(read);

test("P4.2 defines a closed five-tone product status vocabulary", () => {
  const grammar = read("lib/status-grammar.ts");
  for (const tone of ["neutral", "info", "success", "warning", "danger"]) {
    assert.match(grammar, new RegExp(`"\\b${tone}\\b"`));
  }
  assert.match(badge, /tone\?: StatusTone/);
  assert.match(badge, /statusBadge--\$\{tone\}/);
});

test("legacy layout Badge and ambiguous product tone names are removed", () => {
  assert.doesNotMatch(layout, /export function Badge/);
  assert.doesNotMatch(layout, /export function riskTone/);

  const migrated = migratedSources.join("\n");
  assert.doesNotMatch(migrated, /import\s+\{\s*Badge[^}]*\}\s+from\s+["'][^"']*components\/layout["']/);
  assert.doesNotMatch(migrated, /<Badge\b/);
  assert.doesNotMatch(migrated, /tone=["'](?:verified|approval|experiment|ready)["']/);
});

test("semantic status CSS is tokenized and exposes all component variants", () => {
  for (const token of [
    "--status-neutral-bg",
    "--status-neutral-fg",
    "--status-neutral-border",
    "--status-info-bg",
    "--status-info-fg",
    "--status-info-border",
    "--status-success-bg",
    "--status-success-fg",
    "--status-success-border",
    "--status-warning-bg",
    "--status-warning-fg",
    "--status-warning-border",
    "--status-danger-bg",
    "--status-danger-fg",
    "--status-danger-border",
  ]) {
    assert.match(css, new RegExp(token));
  }

  for (const tone of ["neutral", "info", "success", "warning", "danger"]) {
    assert.match(css, new RegExp(`\\.statusBadge--${tone}\\s*\\{`));
  }

  assert.doesNotMatch(css, /\.badge\.(?:verified|approval|experiment)/);
});

test("legacy repeated status hex colors remain only at their token declarations", () => {
  const legacyColors = [
    "#e7f8ef",
    "#bfead2",
    "#14764a",
    "#fff3dc",
    "#f1d49b",
    "#8d5c0d",
  ];

  for (const color of legacyColors) {
    const count = css.toLowerCase().split(color).length - 1;
    assert.equal(count, 1, `${color} should appear only once in the status token declaration`);
  }

  const migrated = migratedSources.join("\n").toLowerCase();
  for (const color of legacyColors) {
    assert.equal(migrated.includes(color), false, `${color} should not remain in migrated TSX surfaces`);
  }
});
