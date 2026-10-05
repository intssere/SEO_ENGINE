import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm } from "node:fs/promises";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: {
      index: path.resolve(artifactDir, "src/index.ts"),
      "pilot-runner": path.resolve(artifactDir, "src/pilot-cli.ts"),
      "p12-2-crawl": path.resolve(artifactDir, "src/first-party-crawl-cli.ts"),
      "p12-2-l1a-observation": path.resolve(artifactDir, "src/p12-2-l1a-observation-cli.ts"),
      "p12-2-l2-one-shot": path.resolve(artifactDir, "src/lib/p12-2-l2-one-shot-operator-caller.ts"),
      "p12-2-live-operator": path.resolve(artifactDir, "src/p12-2-live-operator-cli.ts"),
      "p12-2-l7-1-0008-cert": path.resolve(artifactDir, "src/p12-2-l7-1-0008-cert-cli.ts"),
      "p12-2-l7-2-0008-apply": path.resolve(artifactDir, "src/p12-2-l7-2-0008-apply-cli.ts"),
      "p12-2-l7-3-post-apply-cert": path.resolve(artifactDir, "src/p12-2-l7-3-post-apply-cert-cli.ts"),
      "p12-2-l9-2a-0009-cert": path.resolve(artifactDir, "src/p12-2-l9-2a-0009-cert-cli.ts"),
      "p12-2-l9-2b-0009-apply": path.resolve(artifactDir, "src/p12-2-l9-2b-0009-apply-cli.ts"),
      "p12-2-l9-2c-0009-post-cert": path.resolve(artifactDir, "src/p12-2-l9-2c-0009-post-cert-cli.ts"),
      "p12-2-l10-packet-005-cert": path.resolve(artifactDir, "src/p12-2-l10-packet-005-cert-cli.ts"),
      "p12-2-l10-2-packet-006-cert": path.resolve(artifactDir, "src/p12-2-l10-2-packet-006-cert-cli.ts"),
      "p12-2-l10-4-packet-007-cert": path.resolve(artifactDir, "src/p12-2-l10-4-packet-007-cert-cli.ts"),
      "p12-2-l10-6-packet-008-cert": path.resolve(artifactDir, "src/p12-2-l10-6-packet-008-cert-cli.ts"),
      "p12-2-l10-8-packet-009-cert": path.resolve(artifactDir, "src/p12-2-l10-8-packet-009-cert-cli.ts"),
    },
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    // Some packages may not be bundleable, so we externalize them, we can add more here as needed.
    // Some of the packages below may not be imported or installed, but we're adding them in case they are in the future.
    // Examples of unbundleable packages:
    // - uses native modules and loads them dynamically (e.g. sharp)
    // - use path traversal to read files (e.g. @google-cloud/secret-manager loads sibling .proto files)
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],
    sourcemap: "linked",
    plugins: [
      // pino relies on workers to handle logging, instead of externalizing it we use a plugin to handle it
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],
    // Make sure packages that are cjs only (e.g. express) but are bundled continue to work in our esm output file
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
