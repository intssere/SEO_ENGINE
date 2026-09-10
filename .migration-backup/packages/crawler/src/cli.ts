import { crawlSite } from "./index.js";

const seed = process.argv[2];
if (!seed) {
  console.error("Usage: pnpm --filter @seo-engine/crawler crawl -- https://example.com [maxPages]");
  process.exit(2);
}

const maxPagesArg = process.argv[3];
const maxPages = maxPagesArg ? Number.parseInt(maxPagesArg, 10) : 5000;
if (!Number.isFinite(maxPages) || maxPages < 1) {
  console.error("maxPages must be a positive integer");
  process.exit(2);
}

try {
  const inventory = await crawlSite(seed, { maxPages });
  process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
