import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function text(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("supply-chain baseline keeps release-age, frozen-lockfile, and read-only CI controls", async () => {
  const [workspace, ci] = await Promise.all([
    text("../../../../pnpm-workspace.yaml"),
    text("../../../../.github/workflows/ci.yml"),
  ]);

  assert.match(workspace, /^minimumReleaseAge:\s*1440\s*$/m);
  assert.match(workspace, /^onlyBuiltDependencies:\s*$/m);
  assert.match(workspace, /^\s+- esbuild\s*$/m);

  assert.match(ci, /^permissions:\s*\n\s+contents:\s+read\s*$/m);
  assert.match(ci, /pnpm install --frozen-lockfile/);
  assert.doesNotMatch(ci, /pull_request_target\s*:/);
  assert.match(ci, /uses: actions\\/checkout@[0-9a-f]{40}/);
  assert.match(ci, /uses: pnpm\\/action-setup@[0-9a-f]{40}/);
  assert.match(ci, /uses: actions\\/setup-node@[0-9a-f]{40}/);
  assert.match(ci, /uses: actions\\/upload-artifact@[0-9a-f]{40}/);
  assert.doesNotMatch(ci, /uses: [^\\s]+@v\\d+(?:\\s|$)/);
});

test("HTTP/logging posture suppresses framework disclosure and query/secret logging", async () => {
  const [app, logger] = await Promise.all([
    text("../app.ts"),
    text("./logger.ts"),
  ]);

  assert.match(app, /app\.disable\(["']x-powered-by["']\)/);
  assert.match(app, /req\.url\?\.split\(["']\?["']\)\[0\]/);

  assert.match(logger, /req\.headers\.authorization/);
  assert.match(logger, /req\.headers\.cookie/);
  assert.match(logger, /res\.headers\[['"]set-cookie['"]\]/);
});

test("authentication security code uses Express-resolved proxy identity, not raw forwarded parsing", async () => {
  const [middleware, authRoute] = await Promise.all([
    text("../middlewares/auth-security.ts"),
    text("../routes/auth.ts"),
  ]);

  assert.match(middleware, /typeof req\.ip === ["']string["']/);
  assert.doesNotMatch(middleware, /x-forwarded-for/i);
  assert.doesNotMatch(authRoute, /x-forwarded-for/i);
  assert.match(authRoute, /trustedRequestIp\(req\)/);
});

test("security-header source retains explicit CSP and cross-origin containment", async () => {
  const middleware = await text("../middlewares/auth-security.ts");

  assert.match(middleware, /Content-Security-Policy/);
  assert.match(middleware, /default-src 'self'/);
  assert.match(middleware, /frame-ancestors 'none'/);
  assert.match(middleware, /connect-src 'self'/);
  assert.match(middleware, /Cross-Origin-Opener-Policy/);
  assert.match(middleware, /Cross-Origin-Resource-Policy/);
  assert.match(middleware, /Strict-Transport-Security/);
});
