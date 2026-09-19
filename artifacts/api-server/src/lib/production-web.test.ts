import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import express from "express";
import { mountProductionWeb, productionWebRoot } from "./production-web.js";

test("production web root is deterministic from the repository working directory", () => {
  assert.equal(
    productionWebRoot("/srv/seo-engine"),
    path.resolve("/srv/seo-engine", "artifacts/seo-engine/dist/public"),
  );
});

test("production web serves assets and SPA routes without swallowing unknown API routes", async () => {
  const webRoot = await mkdtemp(path.join(tmpdir(), "seo-engine-web-"));
  const app = express();
  let server: ReturnType<typeof app.listen> | undefined;
  try {
    await writeFile(
      path.join(webRoot, "index.html"),
      "<main>seo-engine-spa</main>",
    );
    await writeFile(path.join(webRoot, "asset.txt"), "asset-ok");
    mountProductionWeb(app, { webRoot });
    server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    });
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const origin = `http://127.0.0.1:${address.port}`;

    const asset = await fetch(`${origin}/asset.txt`);
    assert.equal(asset.status, 200);
    assert.equal(await asset.text(), "asset-ok");

    const route = await fetch(`${origin}/opportunities/example`);
    assert.equal(route.status, 200);
    assert.match(await route.text(), /seo-engine-spa/);

    const api = await fetch(`${origin}/api/unknown`);
    assert.equal(api.status, 404);
    assert.doesNotMatch(await api.text(), /seo-engine-spa/);
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server!.close((error) => (error ? reject(error) : resolve())),
      );
    }
    await rm(webRoot, { recursive: true, force: true });
  }
});
