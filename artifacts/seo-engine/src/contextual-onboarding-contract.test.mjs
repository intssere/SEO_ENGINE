import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(here, path), "utf8");
const layout = read("components/layout.tsx");
const component = read("components/contextual-onboarding.tsx");
const model = read("lib/contextual-onboarding-model.ts");
const adapter = read("lib/contextual-onboarding-adapter.ts");
const pkg = JSON.parse(read("../package.json"));

test("UGP-2.5 exposes contextual onboarding from the customer shell", () => {
  assert.match(layout, /Guide this page/);
  assert.match(layout, /ContextualOnboarding/);
  assert.match(component, /role="dialog"/);
  assert.match(component, /Close guide/);
  assert.match(component, /Step \{index \+ 1\} of/);
});

test("UGP-2.5 keeps tour definitions library-neutral behind one adapter", () => {
  assert.match(adapter, /CONTEXTUAL_ONBOARDING_ADAPTER = "native-dom-v1"/);
  assert.match(adapter, /createContextualOnboardingAdapter/);
  assert.doesNotMatch(model, /document\.|window\.|driver\.js|intro\.js|shepherd/i);
  assert.doesNotMatch(component, /querySelector|scrollIntoView|data-onboarding-active/);
  assert.equal(pkg.devDependencies["driver.js"], undefined);
  assert.equal(pkg.devDependencies["intro.js"], undefined);
  assert.equal(pkg.devDependencies["shepherd.js"], undefined);
});

test("UGP-2.5 has no persistence, analytics, network or execution authority", () => {
  const source = [layout, component, model, adapter].join("\n");
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|fetch\s*\(|XMLHttpRequest/);
  assert.doesNotMatch(source, /analytics|telemetry|trackEvent|DATABASE_URL|postgres\(/i);
  assert.doesNotMatch(source, /PUBLIC_SITE_WRITES_ENABLED|startCrawl|productUpdate|Task\s*#|UGP-[0-9]/);
});
