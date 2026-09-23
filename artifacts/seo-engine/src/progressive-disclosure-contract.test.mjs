import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => readFileSync(join(here, relativePath), "utf8");

const disclosure = read("components/progressive-disclosure.tsx");
const drawer = read("components/evidence-drawer.tsx");
const layout = read("components/layout.tsx");

test("UGP-2.2 defines customer, evidence, and advanced levels with native disclosure", () => {
  assert.ok(disclosure.includes('data-disclosure-level="customer"'));
  assert.ok(disclosure.includes('data-disclosure-level="evidence"'));
  assert.ok(disclosure.includes('data-disclosure-level="advanced"'));
  assert.equal((disclosure.match(/<details/g) ?? []).length, 2);
  assert.ok(disclosure.includes("<summary>{evidenceLabel}</summary>"));
  assert.ok(disclosure.includes("<summary>{advancedLabel}</summary>"));
  assert.doesNotMatch(disclosure, /useState|useEffect|localStorage|sessionStorage/);
});

test("UGP-2.2 evidence drawer progressively reveals traceability then technical state", () => {
  assert.ok(drawer.includes('from "./progressive-disclosure"'));
  assert.ok(drawer.includes("<ProgressiveDisclosure"));
  assert.ok(drawer.includes('evidenceLabel="Show traceable evidence"'));
  assert.ok(drawer.includes('advancedLabel="Show technical details"'));
  assert.ok(drawer.includes("Traceable evidence"));
  assert.ok(drawer.includes("Quality & provenance"));
  assert.ok(drawer.includes("Unavailable technical dimensions"));
});

test("UGP-2.2 nested customer routes identify evidence or advanced views", () => {
  assert.ok(layout.includes("ADVANCED_DETAIL_ROUTES"));
  assert.ok(layout.includes('"ADVANCED VIEW"'));
  assert.ok(layout.includes('"EVIDENCE VIEW"'));
  assert.ok(layout.includes('className="detailViewBanner"'));
  assert.ok(layout.includes("Back to {detailParent.label}"));
  assert.ok(layout.includes('location.startsWith(item.path + "/")'));
});

test("UGP-2.2 disclosure remains presentation-only", () => {
  const source = [disclosure, drawer, layout].join("\n");
  assert.doesNotMatch(source, /useMutation|fetch\(|XMLHttpRequest|WebSocket/);
  assert.doesNotMatch(source, /PUBLIC_SITE_WRITES_ENABLED|providerWriteAllowed/);
});
