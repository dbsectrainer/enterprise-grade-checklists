import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const localBrowsers = join(root, ".playwright-browsers");
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(localBrowsers)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = localBrowsers;
}
const { chromium } = await import("@playwright/test");
const port = 4174;
const baseUrl = `http://127.0.0.1:${port}`;

if (!existsSync(join(dist, "index.html"))) {
  console.error("dist/ is missing. Run `npm run build` first.");
  process.exit(1);
}

const serverEntry = join(root, "node_modules", "http-server", "bin", "http-server");
if (!existsSync(serverEntry)) {
  console.error("http-server is not installed. Run `npm ci` first.");
  process.exit(1);
}

const server = spawn(process.execPath, [serverEntry, dist, "-p", String(port), "-c-1", "-s"], {
  stdio: "ignore",
});

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
  throw new Error("Timed out waiting for the dist server");
}

const pages = [
  {
    path: "/",
    check: async (page) =>
      page
        .locator(".checklist-card")
        .count()
        .then((n) => n === 8),
  },
  {
    path: "/validator.html",
    check: async (page) => (await page.locator("#repoUrl").count()) === 1,
  },
  ...["frontend", "backend", "cloud", "data", "devops", "mobile", "security", "aiml"].map(
    (domain) => ({
      path: `/enterprise-${domain}-checklist/index.html`,
      check: async (page) => (await page.locator("input.checkbox").count()) > 0,
    })
  ),
];

let browser;
const failures = [];

try {
  await waitForServer();
  browser = await chromium.launch();

  for (const target of pages) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors = [];

    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("requestfailed", (request) =>
      errors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`)
    );
    page.on("response", (response) => {
      if (response.status() >= 400) errors.push(`http ${response.status()}: ${response.url()}`);
    });

    const response = await page.goto(`${baseUrl}${target.path}`, { waitUntil: "networkidle" });
    if (!response || response.status() !== 200) {
      errors.push(`document status: ${response ? response.status() : "no response"}`);
    }
    if (!(await target.check(page))) {
      errors.push("page content check failed");
    }

    // Verify the favicon resolves too (a previous 404 source of console noise).
    const favicon = await page.request.get(`${baseUrl}/favicon.svg`);
    if (!favicon.ok()) errors.push(`favicon status: ${favicon.status()}`);

    if (errors.length > 0) {
      failures.push({ path: target.path, errors });
    } else {
      console.log(`PASS ${target.path}`);
    }

    await context.close();
  }
} catch (error) {
  failures.push({ path: "verifier", errors: [error.message] });
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`FAIL ${failure.path}`);
    for (const error of failure.errors) console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log(
  `Verified ${pages.length} production pages from dist/ with no console, network, or content errors.`
);
