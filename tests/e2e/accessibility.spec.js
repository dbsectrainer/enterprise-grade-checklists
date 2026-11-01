import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ reducedMotion: "reduce" });

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const DOMAINS = ["frontend", "backend", "cloud", "data", "devops", "mobile", "security", "aiml"];

async function analyze(page) {
  return new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
}

function formatViolations(violations) {
  return violations
    .map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.help}\n${violation.nodes
          .map((node) => `  - ${node.target.join(" ")}: ${node.failureSummary}`)
          .join("\n")}`
    )
    .join("\n\n");
}

async function expectNoViolations(page, label) {
  const results = await analyze(page);
  expect(results.violations, `${label}\n${formatViolations(results.violations)}`).toEqual([]);
}

test("dashboard has no WCAG A/AA violations in light mode", async ({ page }) => {
  await page.goto("/");
  await expectNoViolations(page, "dashboard light");
});

test("dashboard has no WCAG A/AA violations in dark mode", async ({ page }) => {
  await page.goto("/");
  await page.click("#theme-toggle");
  await page.waitForTimeout(100);
  await expectNoViolations(page, "dashboard dark");

  await page.click("#export-data");
  await page.hover(".export-option");
  await expectNoViolations(page, "dashboard dark export modal hover");
});

for (const domain of DOMAINS) {
  test(`${domain} checklist has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(`/enterprise-${domain}-checklist/index.html`);
    await page.locator(".expand-btn").first().click();
    await page.waitForTimeout(100);
    await expectNoViolations(page, `${domain} checklist`);
  });
}

test("validator form has no WCAG A/AA violations", async ({ page }) => {
  await page.goto("/validator.html");
  await expectNoViolations(page, "validator form");
});

test("validator results and standards views have no WCAG A/AA violations", async ({ page }) => {
  const api = "https://api.github.com/repos/octocat/Hello-World";
  const raw = "https://raw.githubusercontent.com/octocat/Hello-World/main/package.json";

  await page.route(api, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ full_name: "octocat/Hello-World" }),
    })
  );
  await page.route(`${api}/contents`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { name: "package.json", download_url: raw },
        { name: ".gitignore" },
        { name: ".env.example" },
        { name: "SECURITY.md" },
        { name: "eslint.config.js" },
        { name: "tsconfig.json" },
        { name: "Dockerfile" },
      ]),
    })
  );
  await page.route(`${api}/languages`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ JavaScript: 100 }),
    })
  );
  await page.route(raw, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        dependencies: {
          "express-rate-limit": "1",
          "express-validator": "1",
          bcrypt: "1",
          zod: "1",
          passport: "1",
          winston: "1",
        },
        devDependencies: { "jest-axe": "1" },
      }),
    })
  );

  await page.goto("/validator.html");
  await page.fill("#repoUrl", "https://github.com/octocat/Hello-World");
  await page.click("#validateBtn");
  await page.waitForSelector("#resultsSection", { state: "visible" });

  await expectNoViolations(page, "validator results");
  await page.click('.tab-btn[data-tab="standards"]');
  await expectNoViolations(page, "validator standards");
});
