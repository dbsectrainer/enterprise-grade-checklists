import { test, expect } from "@playwright/test";

const PAGES = [
  "/",
  "/validator.html",
  "/enterprise-frontend-checklist/index.html",
  "/enterprise-security-checklist/index.html",
];

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
]) {
  for (const path of PAGES) {
    test(`${path} has no horizontal overflow at ${viewport.name} width`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(path);
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    });
  }
}

test("dashboard stacks cards on mobile and keeps all actions reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.locator(".checklist-card")).toHaveCount(8);
  await expect(page.locator("#export-pdf")).toBeVisible();
  await expect(page.locator("#export-data")).toBeVisible();
  await expect(page.locator("#theme-toggle")).toBeVisible();

  const columns = await page.locator(".dashboard-grid").evaluate((grid) => {
    return getComputedStyle(grid).gridTemplateColumns.split(" ").length;
  });
  expect(columns).toBe(1);
});

test("validator actions remain usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/validator.html");
  await expect(page.locator("#validateBtn")).toBeVisible();
  await expect(page.locator(".domain-checkboxes")).toBeVisible();

  const columns = await page.locator(".domain-checkboxes").evaluate((grid) => {
    return getComputedStyle(grid).gridTemplateColumns.split(" ").length;
  });
  expect(columns).toBeLessThanOrEqual(2);
});
