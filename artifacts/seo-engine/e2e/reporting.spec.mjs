import { expect, test } from "@playwright/test";
import {
  installSyntheticNetwork,
  monitorBrowserErrors,
} from "./fixtures.mjs";

function assertNetworkBoundary(boundary) {
  expect(
    boundary.unknownApiRequests,
    "P11.7 must not create unmocked API requests",
  ).toEqual([]);
  expect(
    boundary.externalRequests,
    "P11.7 must not contact external origins",
  ).toEqual([]);
}

function assertBrowserClean(errors) {
  expect(errors.pageErrors, "page errors").toEqual([]);
  expect(errors.consoleErrors, "console errors").toEqual([]);
}

async function openReports(page, suffix = "") {
  const boundary = await installSyntheticNetwork(page);
  const errors = monitorBrowserErrors(page);
  await page.goto("/reports" + suffix);
  await page.getByRole("heading", { name: "Executive Reports", level: 1 }).waitFor();
  return { boundary, errors };
}

test("P11.7 renders a synthetic read-only executive report with local share state", async ({
  page,
}) => {
  const { boundary, errors } = await openReports(page);

  await expect(page.getByText("SYNTHETIC READ-ONLY")).toBeVisible();
  await expect(page.getByText("LOCAL EXPORT ONLY")).toBeVisible();
  await expect(page.getByText("NO PUBLIC SHARE")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Executive KPIs", level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Executive highlights", level: 2 }),
  ).toBeVisible();

  const shareCode = page.locator(".reportsShareState code");
  await expect(shareCode).toContainText("/reports?view=executive");
  await expect(shareCode).not.toContainText("Diamond");
  await expect(shareCode).not.toContainText("fingerprint");

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

test("P11.7 report section and audience controls serialize only URL view state", async ({
  page,
}) => {
  const { boundary, errors } = await openReports(page);

  await page.getByLabel("Audience view").selectOption("operations");
  await expect(page).toHaveURL(/view=operations/);
  await expect(
    page.getByRole("heading", {
      name: "Source fingerprints & diagnostics",
      level: 2,
    }),
  ).toBeVisible();

  await page.getByRole("checkbox", { name: "KPIs" }).uncheck();
  await expect(page).toHaveURL(/sections=summary%2Chighlights%2Cguardrails/);
  await expect(
    page.getByRole("heading", { name: "Executive KPIs", level: 2 }),
  ).toHaveCount(0);

  const url = page.url();
  expect(url).not.toContain("Diamond");
  expect(url).not.toContain("diamondshelf");
  expect(url).not.toContain("1240");

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

test("P11.7 malformed share state fails closed to safe local defaults", async ({
  page,
}) => {
  const { boundary, errors } = await openReports(
    page,
    "?view=public&sections=summary&token=secret",
  );

  await expect(page.getByRole("alert")).toContainText(
    "Unsupported report URL state was ignored",
  );
  await expect(page.getByLabel("Audience view")).toHaveValue("executive");
  await expect(page.getByLabel("Executive summary")).toBeChecked();

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

test("P11.7 local CSV and JSON downloads are generated in-browser", async ({
  page,
}) => {
  const { boundary, errors } = await openReports(page);

  const csvDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download synthetic CSV" }).click();
  const csvDownload = await csvDownloadPromise;
  expect(csvDownload.suggestedFilename()).toBe(
    "seo-engine-diamondshelf-us-synthetic-report.csv",
  );
  await expect(page.getByRole("status")).toContainText(
    "Synthetic CSV generated locally",
  );

  const jsonDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download synthetic JSON" }).click();
  const jsonDownload = await jsonDownloadPromise;
  expect(jsonDownload.suggestedFilename()).toBe(
    "seo-engine-diamondshelf-us-synthetic-report.json",
  );
  await expect(page.getByRole("status")).toContainText(
    "Synthetic JSON generated locally",
  );

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

test("P11.7 local previews expose deterministic formats without external delivery", async ({
  page,
}) => {
  const { boundary, errors } = await openReports(page);

  await page.getByRole("button", { name: "Preview CSV" }).click();
  const preview = page.locator(".reportsPreview");
  await expect(preview).toContainText('"section","key","label","value","detail","source"');
  await expect(preview).toContainText("synthetic");
  await page.getByRole("button", { name: "Close preview" }).click();

  await page.getByRole("button", { name: "Preview JSON" }).click();
  await expect(preview).toContainText('"version": "p11.7-executive-report-v1"');
  await expect(preview).toContainText('"productionDataExportAuthorized": false');
  await page.getByRole("button", { name: "Close preview" }).click();

  await page.getByRole("button", { name: "Preview print text" }).click();
  await expect(preview).toContainText("Executive summary");
  await expect(preview).toContainText("Guardrails");

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});

test("P11.7 print media hides local controls while preserving report content", async ({
  page,
}) => {
  const { boundary, errors } = await openReports(page);

  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".reportsControls")).toBeHidden();
  await expect(page.locator(".reportsExportPanel")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Executive Reports", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Executive KPIs", level: 2 }),
  ).toBeVisible();

  assertNetworkBoundary(boundary);
  assertBrowserClean(errors);
});