import { test, expect } from "@playwright/test";

async function resetStorage(page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
}

test.beforeEach(async ({ page }) => {
  await resetStorage(page);
});

test("dashboard renders all eight domains and verified footer", async ({ page }) => {
  await expect(page).toHaveTitle("Enterprise Checklist Dashboard");
  await expect(page.locator(".checklist-card")).toHaveCount(8);
  await expect(page.locator("#global-progress-text")).toHaveText("0%");
  await expect(page.locator(".update-time")).toHaveCount(8);
  await expect(page.locator(".update-time").first()).toHaveText("Not started");
  await expect(page.locator(".priority-badge.critical")).toHaveText("Critical Priority");
  await expect(page.locator(".footer-links a")).toHaveCount(3);
  await expect(page.locator("#search-empty")).toBeHidden();
});

test("progress, weighted overall score, and last-updated render from storage", async ({ page }) => {
  await page.evaluate(() => {
    const states = {};
    for (let index = 0; index < 118; index += 1) states[index] = index < 3;
    localStorage.setItem("frontendChecklistStates", JSON.stringify(states));
    localStorage.setItem("frontendLastUpdated", "2026-01-02T03:04:05.000Z");
  });
  await page.reload();

  await expect(page.locator("#frontend-progress")).toHaveAttribute("style", /width:\s*3%/);
  await expect(page.locator("#frontend-progress + .progress-text")).toHaveText("3%");
  await expect(page.locator("#frontend-progress").locator("..")).toHaveAttribute(
    "aria-valuenow",
    "3"
  );
  await expect(page.locator("#global-progress-text")).toHaveText("1%");
  await expect(page.locator('[data-checklist="frontend"] .update-time')).toContainText("Updated");
  await expect(page.locator('[data-checklist="frontend"] .update-time')).toHaveAttribute(
    "datetime",
    /2026-01-02/
  );
});

test("search and priority filters update the visible cards", async ({ page }) => {
  await page.fill("#search", "security");
  await expect(page.locator(".checklist-card:visible")).toHaveCount(3);
  await expect(page.locator("#search-empty")).toBeHidden();

  await page.fill("#search", "no-such-checklist");
  await expect(page.locator(".checklist-card:visible")).toHaveCount(0);
  await expect(page.locator("#search-empty")).toBeVisible();

  await page.fill("#search", "");
  await page.selectOption("#filter-type", "critical");
  await expect(page.locator(".checklist-card:visible")).toHaveCount(1);
  await expect(page.locator(".checklist-card:visible h2")).toHaveText("Security");

  await page.selectOption("#filter-type", "high");
  await expect(page.locator(".checklist-card:visible")).toHaveCount(4);

  // Search and filter state survive a reload in the same tab.
  await page.reload();
  await expect(page.locator("#filter-type")).toHaveValue("high");
  await expect(page.locator(".checklist-card:visible")).toHaveCount(4);
});

test("theme toggle persists and exposes accessible state", async ({ page }) => {
  await expect(page.locator("body")).toHaveAttribute("data-theme", "light");
  await page.click("#theme-toggle");
  await expect(page.locator("body")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#theme-toggle")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#theme-toggle")).toHaveAttribute("aria-label", "Switch to light mode");

  await page.reload();
  await expect(page.locator("body")).toHaveAttribute("data-theme", "dark");
});

test("export modal supports keyboard dismissal and focus restoration", async ({ page }) => {
  await page.click("#export-data");
  await expect(page.locator("#export-modal")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#export-modal")).toHaveClass(/active/);
  await expect(page.locator(".export-option").first()).toBeFocused();

  // Focus is contained inside the dialog.
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator(".modal-close")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator(".export-option").first()).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page.locator("#export-modal")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#export-data")).toBeFocused();
});

test("JSON and CSV exports contain the verified progress data", async ({ page }) => {
  await page.evaluate(() => {
    const states = {};
    for (let index = 0; index < 118; index += 1) states[index] = index < 10;
    localStorage.setItem("frontendChecklistStates", JSON.stringify(states));
  });
  await page.reload();

  await page.click("#export-data");
  const jsonDownloadPromise = page.waitForEvent("download");
  await page.click('.export-option[data-format="json"]');
  const jsonDownload = await jsonDownloadPromise;
  expect(jsonDownload.suggestedFilename()).toMatch(
    /^checklist-export-\d{4}-\d{2}-\d{2}T[\d-]+Z\.json$/
  );

  const jsonPath = await jsonDownload.path();
  const { readFile } = await import("node:fs/promises");
  const json = JSON.parse(await readFile(jsonPath, "utf8"));
  expect(json.overallProgress).toBe(2);
  expect(json.progress.frontend).toBe(8);
  expect(json.counts.frontend).toEqual({ checked: 10, total: 118 });
  expect(json.counts.backend).toEqual({ checked: 0, total: 63 });

  await page.click("#export-data");
  const csvDownloadPromise = page.waitForEvent("download");
  await page.click('.export-option[data-format="csv"]');
  const csvDownload = await csvDownloadPromise;
  const csv = await readFile(await csvDownload.path(), "utf8");
  expect(csv).toContain('"Checklist","Progress","Checked","Total"');
  expect(csv).toContain('"frontend","8","10","118"');
});

test("print/save PDF invokes the browser print dialog", async ({ page }) => {
  await page.evaluate(() => {
    window.__printCalls = 0;
    window.print = () => {
      window.__printCalls += 1;
    };
  });

  await page.click("#export-pdf");
  await expect.poll(() => page.evaluate(() => window.__printCalls)).toBe(1);
  await expect(page.locator("#export-modal")).not.toHaveClass(/active/);
});

test("reset all clears progress after confirmation", async ({ page }) => {
  await page.evaluate(() => {
    const states = {};
    for (let index = 0; index < 118; index += 1) states[index] = index < 5;
    localStorage.setItem("frontendChecklistStates", JSON.stringify(states));
    localStorage.setItem("frontendLastUpdated", new Date().toISOString());
  });
  await page.reload();
  await expect(page.locator("#global-progress-text")).toHaveText("1%");

  page.once("dialog", (dialog) => dialog.accept());
  await page.click("#reset-all");

  await expect(page.locator("#global-progress-text")).toHaveText("0%");
  await expect(page.locator('[data-checklist="frontend"] .update-time')).toHaveText("Not started");
  await expect
    .poll(() =>
      page.evaluate(() => ({
        states: localStorage.getItem("frontendChecklistStates"),
        updated: localStorage.getItem("frontendLastUpdated"),
      }))
    )
    .toEqual({ states: null, updated: null });
});

test("dashboard updates when another tab changes a checklist", async ({ page, context }) => {
  const checklist = await context.newPage();
  await checklist.goto("/enterprise-frontend-checklist/index.html");
  await checklist.locator(".checkbox").first().check();

  await expect
    .poll(() => page.locator("#frontend-progress + .progress-text").textContent())
    .toBe("1%");
  await expect(page.locator('[data-checklist="frontend"] .update-time')).toContainText("Updated");

  await checklist.close();
});

test("reset all in the dashboard clears an open checklist tab", async ({ page, context }) => {
  const checklist = await context.newPage();
  await checklist.goto("/enterprise-frontend-checklist/index.html");
  await checklist.locator(".checkbox").first().check();
  await expect(checklist.locator(".checkbox").first()).toBeChecked();

  page.once("dialog", (dialog) => dialog.accept());
  await page.click("#reset-all");

  await expect(checklist.locator(".checkbox").first()).not.toBeChecked();
  await expect(checklist.locator(".section-progress").first()).toHaveText(/^0\/\d+ · 0%$/);
  await checklist.close();
});
