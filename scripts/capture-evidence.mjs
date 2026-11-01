import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localBrowsers = join(root, ".playwright-browsers");
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(localBrowsers)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = localBrowsers;
}
const { chromium } = await import("@playwright/test");
const outputDirectory = join(root, "docs", "evidence", "screenshots");
const port = 4175;
const baseUrl = `http://127.0.0.1:${port}`;
const serverEntry = join(root, "node_modules", "http-server", "bin", "http-server");

if (!existsSync(serverEntry)) {
  console.error("http-server is not installed. Run `npm ci` first.");
  process.exit(1);
}

mkdirSync(outputDirectory, { recursive: true });
mkdirSync(join(root, "docs", "evidence", "test-results"), { recursive: true });
mkdirSync(join(root, "docs", "evidence", "build-results"), { recursive: true });
const server = spawn(process.execPath, [serverEntry, root, "-p", String(port), "-c-1", "-s"], {
  stdio: "ignore",
});

const recorded = [];
const consoleErrors = [];
const networkErrors = [];

function record(name, description) {
  const filePath = join(outputDirectory, name);
  const bytes = readFileSync(filePath);
  recorded.push({
    file: name,
    description,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/index.html`);
      if (response.ok) return;
    } catch {
      // Server not ready yet.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
  }
  throw new Error("Timed out waiting for the evidence server");
}

function watchPage(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`${label}: ${message.text()}`);
  });
  page.on("pageerror", (error) => consoleErrors.push(`${label}: ${error.message}`));
  page.on("requestfailed", (request) =>
    networkErrors.push(`${label}: ${request.url()} ${request.failure()?.errorText}`)
  );
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().includes("favicon")) {
      networkErrors.push(`${label}: HTTP ${response.status()} ${response.url()}`);
    }
  });
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch();

  // Desktop journey: dashboard -> checklist interaction -> dashboard state.
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await desktop.newPage();
  watchPage(page, "desktop");

  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.screenshot({ path: join(outputDirectory, "homepage-desktop.png"), fullPage: true });
  record(
    "homepage-desktop.png",
    "Dashboard with all eight domains, filters, exports, and validator CTA."
  );

  await page.goto(`${baseUrl}/enterprise-frontend-checklist/index.html`, {
    waitUntil: "networkidle",
  });
  await page.locator(".checkbox").nth(0).check();
  await page.locator(".checkbox").nth(1).check();
  await page.locator(".checkbox").nth(2).check();
  await page.screenshot({ path: join(outputDirectory, "checklist-desktop.png") });
  record(
    "checklist-desktop.png",
    "Frontend checklist with checked items and visible per-section progress at desktop width."
  );

  await page.locator(".expand-btn").first().click();
  await page.waitForTimeout(350);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(outputDirectory, "checklist-details.png") });
  record(
    "checklist-details.png",
    "Expanded checklist details: full-width panel, readable content, and preserved checkbox state."
  );

  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.screenshot({
    path: join(outputDirectory, "dashboard-progress-desktop.png"),
    fullPage: true,
  });
  record(
    "dashboard-progress-desktop.png",
    "Dashboard after checking three frontend items: per-domain progress, weighted overall progress, and last-updated timestamp."
  );

  // Validator form and a live GitHub API validation run.
  await page.goto(`${baseUrl}/validator.html`, { waitUntil: "networkidle" });
  await page.screenshot({ path: join(outputDirectory, "validator-form.png"), fullPage: true });
  record(
    "validator-form.png",
    "Repository validator form with domain selection and standards note."
  );

  const apiResponses = [];
  page.on("response", (response) => {
    if (
      response.url().includes("api.github.com") ||
      response.url().includes("raw.githubusercontent.com")
    ) {
      apiResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.fill("#repoUrl", "https://github.com/dbsectrainer/enterprise-grade-checklists");
  await page.click("#validateBtn");
  await page.waitForSelector("#resultsSection", { state: "visible", timeout: 30_000 });
  await page.screenshot({
    path: join(outputDirectory, "validator-results.png"),
    fullPage: true,
  });
  record(
    "validator-results.png",
    "Live validator run against dbsectrainer/enterprise-grade-checklists with passed, failed, warning, score, and standards tabs."
  );

  await page.click('.tab-btn[data-tab="standards"]');
  await page.screenshot({ path: join(outputDirectory, "validator-standards.png") });
  record("validator-standards.png", "Standards compliance tab for the live validation run.");

  writeFileSync(
    join(root, "docs", "evidence", "test-results", "validator-live-network.log"),
    `${apiResponses.join("\n")}\n`
  );

  await desktop.close();

  // Mobile viewports.
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobile.newPage();
  watchPage(mobilePage, "mobile");

  await mobilePage.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await mobilePage.screenshot({
    path: join(outputDirectory, "homepage-mobile.png"),
    fullPage: true,
  });
  record(
    "homepage-mobile.png",
    "Dashboard at 390px: single-column cards, controls, and navigation remain usable."
  );

  await mobilePage.goto(`${baseUrl}/enterprise-frontend-checklist/index.html`, {
    waitUntil: "networkidle",
  });
  await mobilePage.screenshot({ path: join(outputDirectory, "checklist-mobile.png") });
  record(
    "checklist-mobile.png",
    "Frontend checklist at 390px with static back link and stacked item layout."
  );

  await mobilePage.goto(`${baseUrl}/validator.html`, { waitUntil: "networkidle" });
  await mobilePage.screenshot({ path: join(outputDirectory, "validator-mobile.png") });
  record("validator-mobile.png", "Repository validator form at 390px.");

  await mobile.close();
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}

const manifest = {
  capturedAt: new Date().toISOString(),
  baseUrl,
  screenshots: recorded,
  consoleErrors,
  networkErrors,
};
writeFileSync(join(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

if (consoleErrors.length > 0 || networkErrors.length > 0) {
  console.error("Browser errors were observed while capturing evidence.");
  for (const error of [...consoleErrors, ...networkErrors]) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`Captured ${recorded.length} screenshots into ${outputDirectory}`);
