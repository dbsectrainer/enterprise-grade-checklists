import { test, expect } from "@playwright/test";

const CHECKLISTS = {
  frontend: { count: 118, label: "frontend" },
  backend: { count: 63, label: "backend" },
  cloud: { count: 44, label: "cloud" },
  data: { count: 47, label: "data" },
  devops: { count: 46, label: "devops" },
  mobile: { count: 47, label: "mobile" },
  security: { count: 84, label: "security" },
  aiml: { count: 56, label: "aiml" },
};

for (const [domain, { count, label }] of Object.entries(CHECKLISTS)) {
  test(`${domain} checklist renders accessible items and visible progress`, async ({ page }) => {
    await page.goto(`/enterprise-${domain}-checklist/index.html`);

    await expect(page.locator(".checkbox")).toHaveCount(count);
    await expect(page.locator(".checklist-item")).toHaveCount(count);
    await expect(page.locator(".item-label")).toHaveCount(count);
    await expect(page.locator(".details")).toHaveCount(count);
    await expect(page.locator("label.checklist-item")).toHaveCount(0);

    const structure = await page
      .locator(".checklist-item")
      .evaluateAll((items) =>
        items.every(
          (item) =>
            item.tagName === "DIV" &&
            item.children[0]?.classList.contains("item-label") &&
            item.children[1]?.classList.contains("expand-btn") &&
            item.children[2]?.classList.contains("details")
        )
      );
    expect(structure).toBe(true);

    const sections = await page.locator(".section").count();
    await expect(page.locator(".section-progress")).toHaveCount(sections);
    await expect(page.locator(".section-progress").first()).toHaveText(/^0\/\d+ · 0%$/);

    // The first item is a valid, self-contained label plus a sibling toggle.
    const first = page.locator(".checklist-item").first();
    await expect(first.locator(".expand-btn")).toHaveAttribute("aria-expanded", "false");
    await expect(first.locator(".details")).toBeHidden();

    await first.locator(".expand-btn").click();
    await expect(first.locator(".details")).toBeVisible();
    await expect(first.locator(".expand-btn")).toHaveAttribute("aria-expanded", "true");

    // Clicking inside the details panel must not toggle the checkbox or close the panel.
    await first.locator(".details strong").first().click();
    await expect(first.locator(".checkbox")).not.toBeChecked();
    await expect(first.locator(".details")).toBeVisible();

    // Native buttons handle Enter exactly once (previous custom handler toggled twice).
    await first.locator(".expand-btn").focus();
    await page.keyboard.press("Enter");
    await expect(first.locator(".details")).toBeHidden();
    await page.keyboard.press("Enter");
    await expect(first.locator(".details")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(first.locator(".details")).toBeHidden();
    await expect(first.locator(".expand-btn")).toHaveAttribute("aria-expanded", "false");

    // Details use the full item width instead of being squeezed next to the label.
    await first.locator(".expand-btn").click();
    const geometry = await first.evaluate((item) => {
      const details = item.querySelector(".details");
      return {
        itemWidth: item.getBoundingClientRect().width,
        detailsWidth: details.getBoundingClientRect().width,
        detailsTop: details.getBoundingClientRect().top,
        labelBottom: item.querySelector(".item-label").getBoundingClientRect().bottom,
      };
    });
    expect(geometry.detailsWidth).toBeGreaterThan(geometry.itemWidth * 0.9);
    expect(geometry.detailsTop).toBeGreaterThanOrEqual(geometry.labelBottom - 1);

    // Persistence and section progress.
    await page.locator(".checkbox").nth(0).check();
    await page.locator(".checkbox").nth(2).check();
    await expect(page.locator(".section-progress").first()).toHaveText(/^2\/\d+ · \d+%$/);
    await expect(page.locator(".checklist-item").nth(0)).toHaveClass(/checked/);

    const stored = await page.evaluate((key) => {
      const states = JSON.parse(localStorage.getItem(`${key}ChecklistStates`));
      return {
        keys: Object.keys(states).length,
        checked: Object.values(states).filter(Boolean).length,
        updated: localStorage.getItem(`${key}LastUpdated`),
      };
    }, label);
    expect(stored.keys).toBe(count);
    expect(stored.checked).toBe(2);
    expect(stored.updated).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    await page.reload();
    await expect(page.locator(".checkbox").nth(0)).toBeChecked();
    await expect(page.locator(".checkbox").nth(2)).toBeChecked();
    await expect(page.locator(".checklist-item").nth(0)).toHaveClass(/checked/);
    await expect(page.locator(".section-progress").first()).toHaveText(/^2\/\d+ · \d+%$/);

    // Reset requires confirmation and clears the persisted state.
    page.once("dialog", (dialog) => dialog.accept());
    await page.click("#reset-checklist");
    await expect(page.locator(".checkbox:checked")).toHaveCount(0);
    await expect(page.locator(".checklist-item.checked")).toHaveCount(0);
    await expect(page.locator(".section-progress").first()).toHaveText(/^0\/\d+ · 0%$/);
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(`${key}ChecklistStates`), label))
      .toBeNull();
  });
}

test("frontend checklist is usable at a 390px mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/enterprise-frontend-checklist/index.html");

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

  await expect(page.locator(".return-dashboard")).toBeVisible();
  await expect(page.locator(".return-dashboard")).toHaveCSS("position", "static");

  const first = page.locator(".checklist-item").first();
  await first.locator(".expand-btn").click();
  const geometry = await first.evaluate((item) => ({
    itemWidth: item.getBoundingClientRect().width,
    detailsWidth: item.querySelector(".details").getBoundingClientRect().width,
  }));
  expect(geometry.detailsWidth).toBeGreaterThan(geometry.itemWidth * 0.9);
});
