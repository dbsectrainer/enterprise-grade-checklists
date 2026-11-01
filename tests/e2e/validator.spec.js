import { test, expect } from "@playwright/test";

const OWNER = "octocat";
const REPO = "Hello-World";
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const RAW_MANIFEST = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/package.json`;

const packageJson = {
  dependencies: {
    "express-rate-limit": "^7.0.0",
    "express-validator": "^7.0.0",
    bcrypt: "^5.0.0",
    zod: "^3.0.0",
    passport: "^0.7.0",
    winston: "^3.0.0",
  },
  devDependencies: {
    "jest-axe": "^8.0.0",
    eslint: "^9.0.0",
  },
};

const contents = [
  { name: ".gitignore", type: "file" },
  { name: ".env.example", type: "file" },
  { name: "SECURITY.md", type: "file" },
  { name: "eslint.config.js", type: "file" },
  { name: "tsconfig.json", type: "file" },
  { name: "Dockerfile", type: "file" },
  {
    name: "package.json",
    type: "file",
    download_url: RAW_MANIFEST,
  },
];

async function mockRepository(page, overrides = {}) {
  const repoBody = overrides.repoBody || { full_name: `${OWNER}/${REPO}`, default_branch: "main" };
  const contentsBody = overrides.contentsBody || contents;
  const languagesBody = overrides.languagesBody || { JavaScript: 100 };
  const manifestBody = overrides.manifestBody || packageJson;

  await page.route(API, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(repoBody),
    })
  );
  await page.route(`${API}/contents`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(contentsBody),
    })
  );
  await page.route(`${API}/languages`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(languagesBody),
    })
  );
  if (contentsBody.some((file) => file.name === "package.json")) {
    await page.route(RAW_MANIFEST, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(manifestBody),
      })
    );
  }
}

async function setDomains(page, domains) {
  const boxes = page.locator('input[name="domain"]');
  const count = await boxes.count();
  for (let index = 0; index < count; index += 1) {
    const box = boxes.nth(index);
    const value = await box.getAttribute("value");
    if (domains.includes(value)) {
      await box.check();
    } else {
      await box.uncheck();
    }
  }
}

async function runValidation(page, url = `https://github.com/${OWNER}/${REPO}`) {
  await page.fill("#repoUrl", url);
  await page.click("#validateBtn");
  await expect(page.locator("#resultsSection")).toBeVisible({ timeout: 15_000 });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/validator.html");
});

test("validator form accepts both documented URL formats without a native pattern", async ({
  page,
}) => {
  await mockRepository(page);

  await expect(page.locator("#repoUrl")).toHaveAttribute("type", "text");
  await expect(page.locator("#repoUrl")).not.toHaveAttribute("pattern");
  await expect(page.locator("#formError")).toBeHidden();

  await runValidation(page, `github.com/${OWNER}/${REPO}`);
  await expect(page.locator("#repoName")).toHaveText(`${OWNER}/${REPO}`);
});

test("invalid URL, empty domain selection, and empty input show inline errors", async ({
  page,
}) => {
  let dialogs = 0;
  page.on("dialog", async (dialog) => {
    dialogs += 1;
    await dialog.dismiss();
  });

  await page.fill("#repoUrl", "https://gitlab.com/owner/repo");
  await page.click("#validateBtn");
  await expect(page.locator("#formError")).toBeVisible();
  await expect(page.locator("#formError")).toContainText("does not look like a GitHub repository");
  await expect(page.locator("#repoUrl")).toBeFocused();

  await page.fill("#repoUrl", `https://github.com/${OWNER}/${REPO}`);
  await expect(page.locator("#formError")).toBeHidden();

  await setDomains(page, []);
  await page.click("#validateBtn");
  await expect(page.locator("#formError")).toContainText("Select at least one domain");

  await page.fill("#repoUrl", "");
  await setDomains(page, ["frontend"]);
  await page.click("#validateBtn");
  await expect(page.locator("#formError")).toContainText("Enter a public GitHub repository URL");
  expect(dialogs).toBe(0);
});

test("validates a repository, renders summary and tabs, and caches the manifest fetch", async ({
  page,
}) => {
  const apiRequests = [];
  const manifestRequests = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://api.github.com/")) apiRequests.push(request.url());
    if (request.url() === RAW_MANIFEST) manifestRequests.push(request.url());
  });

  await mockRepository(page);
  await setDomains(page, ["frontend", "backend", "data", "security"]);
  await runValidation(page);

  await expect(page.locator("#repoName")).toHaveText(`${OWNER}/${REPO}`);
  await expect(page.locator("#validationTime")).not.toBeEmpty();
  await expect(page.locator("#scorePercent")).toHaveText(/^\d+%$/);

  const passed = Number(await page.locator("#passedCount").textContent());
  const failed = Number(await page.locator("#failedCount").textContent());
  const warnings = Number(await page.locator("#warningCount").textContent());
  expect(passed).toBeGreaterThan(0);
  // The fixture has no test file, so the frontend Testing Framework check fails.
  expect(failed).toBe(1);
  expect(warnings).toBeGreaterThan(0);

  const expectedScore = Math.round((passed / (passed + failed)) * 100);
  await expect(page.locator("#scorePercent")).toHaveText(`${expectedScore}%`);
  await expect(page.locator(".result-item")).toHaveCount(passed + failed + warnings);

  await expect.poll(() => manifestRequests.length).toBe(1);
  expect(apiRequests).toHaveLength(3);
  expect(apiRequests.some((url) => url.includes("/commits"))).toBe(false);
  expect(manifestRequests).toHaveLength(1);

  // Result tabs filter the rendered list.
  await page.click('.tab-btn[data-tab="passed"]');
  await expect(page.locator(".tab-btn[data-tab='passed']")).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(page.locator(".result-item")).toHaveCount(passed);
  await page.click('.tab-btn[data-tab="failed"]');
  await expect(page.locator(".result-item")).toHaveCount(failed);
  await page.click('.tab-btn[data-tab="warnings"]');
  await expect(page.locator(".result-item")).toHaveCount(warnings);

  await page.click('.tab-btn[data-tab="standards"]');
  await expect(page.locator(".result-item").first()).toBeVisible();
  await expect(page.locator(".standard-tag").first()).toBeVisible();

  const standardBadges = await page.locator(".standard-badge").allTextContents();
  for (const standard of ["EU AI Act", "NIST AI RMF", "ISO/IEC 42001", "NIST 800-53"]) {
    expect(standardBadges).toContain(standard);
  }
});

test("repository without package.json makes no manifest request", async ({ page }) => {
  const manifestRequests = [];
  page.on("request", (request) => {
    if (request.url() === RAW_MANIFEST) manifestRequests.push(request.url());
  });

  await mockRepository(page, {
    contentsBody: contents.filter((file) => file.name !== "package.json"),
  });
  await setDomains(page, ["frontend"]);
  await runValidation(page);

  expect(manifestRequests).toHaveLength(0);
  await expect(page.locator("#failedCount")).not.toHaveText("0");
});

test("GitHub rate limits produce an actionable inline error", async ({ page }) => {
  await page.route(API, (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": "*",
        "access-control-expose-headers": "x-ratelimit-remaining,x-ratelimit-reset",
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 600),
      },
      body: JSON.stringify({ message: "API rate limit exceeded" }),
    })
  );
  await setDomains(page, ["frontend"]);
  await page.fill("#repoUrl", `https://github.com/${OWNER}/${REPO}`);
  await page.click("#validateBtn");

  await expect(page.locator("#formError")).toBeVisible();
  await expect(page.locator("#formError")).toContainText("GitHub API rate limit exceeded");
  await expect(page.locator("#resultsSection")).toBeHidden();
  await expect(page.locator(".validator-input")).toBeVisible();
});

test("missing repositories produce a clear message", async ({ page }) => {
  await page.route(API, (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ message: "Not Found" }),
    })
  );
  await setDomains(page, ["frontend"]);
  await page.fill("#repoUrl", `https://github.com/${OWNER}/${REPO}`);
  await page.click("#validateBtn");

  await expect(page.locator("#formError")).toContainText("Repository not found");
  await expect(page.locator("#formError")).toContainText("public");
});

test("JSON/CSV exports and print flow reflect the validated results", async ({ page }) => {
  await mockRepository(page);
  await setDomains(page, ["frontend", "backend", "data", "security"]);
  await runValidation(page);

  const jsonDownloadPromise = page.waitForEvent("download");
  await page.click("#exportJsonBtn");
  const jsonDownload = await jsonDownloadPromise;
  expect(jsonDownload.suggestedFilename()).toBe("validation-results.json");
  const { readFile } = await import("node:fs/promises");
  const json = JSON.parse(await readFile(await jsonDownload.path(), "utf8"));
  expect(json.validatorVersion).toBe("1.1.0");
  expect(json.repository).toMatchObject({ owner: OWNER, repo: REPO });
  expect(json).not.toHaveProperty("repositoryData");
  expect(json.summary.passed).toBe(json.passed.length);
  expect(json.summary.failed).toBe(json.failed.length);
  expect(json.summary.warnings).toBe(json.warnings.length);

  const csvDownloadPromise = page.waitForEvent("download");
  await page.click("#exportCsvBtn");
  const csvDownload = await csvDownloadPromise;
  expect(csvDownload.suggestedFilename()).toBe("validation-results.csv");
  const csv = await readFile(await csvDownload.path(), "utf8");
  expect(csv).toContain('"Status","Domain","Title","Description","Standards"');
  expect(csv).toContain('"passed"');

  await page.evaluate(() => {
    window.__printCalls = 0;
    window.print = () => {
      window.__printCalls += 1;
    };
  });
  await page.click("#exportPdfBtn");
  await expect.poll(() => page.evaluate(() => window.__printCalls)).toBe(1);

  await page.click("#newValidationBtn");
  await expect(page.locator(".validator-input")).toBeVisible();
  await expect(page.locator("#resultsSection")).toBeHidden();
  await expect(page.locator("#repoUrl")).toHaveValue("");
  await expect(page.locator("#formError")).toBeHidden();
});

test("keyboard arrows move between result tabs", async ({ page }) => {
  await mockRepository(page);
  await setDomains(page, ["frontend"]);
  await runValidation(page);

  await page.locator('.tab-btn[data-tab="all"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('.tab-btn[data-tab="passed"]')).toBeFocused();
  await expect(page.locator('.tab-btn[data-tab="passed"]')).toHaveAttribute(
    "aria-selected",
    "true"
  );

  await page.keyboard.press("ArrowLeft");
  await expect(page.locator('.tab-btn[data-tab="all"]')).toBeFocused();
});
