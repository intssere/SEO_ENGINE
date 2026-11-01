import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 6_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4174",
    browserName: "chromium",
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "light",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      },
    },
    ...(process.env.UX_CH_CROSS_BROWSER === "1"
      ? [
          { name: "firefox", use: { browserName: "firefox" } },
          { name: "webkit", use: { browserName: "webkit" } },
        ]
      : []),
  ],
  webServer: {
    command: process.env.UX_CH_PRODUCTION_PREVIEW === "1"
      ? "pnpm run serve"
      : "pnpm run test:e2e:server",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
  outputDir: "test-results",
});
