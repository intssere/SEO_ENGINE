import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(here, path), "utf8");
const page = read("pages/website-connection-wizard.tsx");
const model = read("lib/website-connection-wizard-model.ts");
const app = read("App.tsx");
const settings = read("pages/settings.tsx");

test("UGP-2.4 mounts a customer-facing Settings wizard and entry point", () => {
  assert.ok(app.includes('path="/settings/add-website"'));
  assert.ok(settings.includes('href="/settings/add-website"'));
  assert.match(settings, /Add website/);
  assert.match(page, /Website setup progress/);
});

test("UGP-2.4 preserves the seven-step customer sequence", () => {
  for (const label of ["Website", "Platform", "Analysis", "Connection", "Search data", "Automation", "Review"]) {
    assert.ok(page.includes(`"${label}"`), label);
  }
  assert.match(page, /Continue to Connections/);
});

test("UGP-2.4 is truthful about hints, availability and persistence", () => {
  assert.match(page, /URL-pattern hint only/);
  assert.match(page, /has not been scanned or provider-verified/);
  assert.match(page, /Nothing has been saved, authorized, scanned, or changed/);
  assert.match(page, /UNAVAILABLE/);
  assert.match(page, /does not grant execution authority/);
  assert.match(model, /url_pattern_only/);
});

test("UGP-2.4 performs no network, persistence or provider mutation", () => {
  const source = [page, model].join("\n");
  assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|\/api\/|localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(source, /DATABASE_URL|postgres|drizzle|productUpdate|PUBLIC_SITE_WRITES_ENABLED/);
  assert.doesNotMatch(source, /Task\s*#|UGP-[0-9]|P[0-9]+\.[0-9]+/);
});


test("UGP-3.1 exposes truthful public-web URL onboarding checks without executing them", () => {
  assert.match(page, /Public web onboarding/);
  assert.match(page, /NOT RUN/);
  assert.match(page, /website\.publicWebOnboarding\.checks/);
  assert.match(model, /DNS \/ public address/);
  assert.match(model, /Redirect chain/);
  assert.match(model, /robots\.txt/);
  assert.match(model, /Sitemap hints/);
  assert.match(page, /final analysis origin must resolve to HTTPS/);
  assert.match(model, /planned_not_executed/);
  assert.match(model, /finalHttpsRequired: true/);
});
