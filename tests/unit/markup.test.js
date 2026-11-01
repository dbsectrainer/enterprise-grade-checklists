import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const CHECKLISTS = {
  frontend: 118,
  backend: 63,
  cloud: 44,
  data: 47,
  devops: 46,
  mobile: 47,
  security: 84,
  aiml: 56,
};

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

test("every checklist uses accessible item markup", () => {
  for (const [domain, expectedCount] of Object.entries(CHECKLISTS)) {
    const html = read(`enterprise-${domain}-checklist/index.html`);

    assert.equal(
      html.includes('<label class="checklist-item">'),
      false,
      `${domain}: items must not be wrapped in a label`
    );
    assert.equal(
      (html.match(/class="checklist-item"/g) || []).length,
      expectedCount,
      `${domain}: checklist item count`
    );
    assert.equal(
      (html.match(/<label class="item-label">/g) || []).length,
      expectedCount,
      `${domain}: item label count`
    );
    assert.equal(
      (html.match(/class="details"/g) || []).length,
      expectedCount,
      `${domain}: details count`
    );
    assert.equal(
      (html.match(/class="expand-btn"/g) || []).length,
      expectedCount,
      `${domain}: expand button count`
    );
    assert.equal(
      (
        html.match(
          /<button\s+class="expand-btn"\s+type="button"\s+aria-label="Show details"\s+aria-expanded="false"\s*>/g
        ) || []
      ).length,
      expectedCount,
      `${domain}: expand button type, label, and expanded state`
    );
    assert.equal(
      (html.match(/class="section-progress"/g) || []).length,
      0,
      `${domain}: progress badge is created at runtime`
    );
  }
});

test("dashboard manifest matches the rendered checklist totals", () => {
  const dashboard = read("script.js");
  for (const [domain, expectedCount] of Object.entries(CHECKLISTS)) {
    const pattern = new RegExp(`\\b${domain}:\\s*${expectedCount}\\b`);
    assert.match(dashboard, pattern, `dashboard total for ${domain}`);
  }
  assert.equal(
    Object.values(CHECKLISTS).reduce((sum, count) => sum + count, 0),
    505,
    "total checklist items"
  );
});

test("all pages declare a favicon and a page description", () => {
  const pages = [
    "index.html",
    "validator.html",
    ...Object.keys(CHECKLISTS).map((domain) => `enterprise-${domain}-checklist/index.html`),
  ];

  for (const page of pages) {
    const html = read(page);
    assert.match(html, /rel="icon" href="(?:\.\.\/)?favicon\.svg"/, `${page}: favicon`);
  }

  assert.match(read("index.html"), /name="description"/);
  assert.match(read("validator.html"), /name="description"/);
});

test("validator form does not rely on an invalid HTML pattern", () => {
  const html = read("validator.html");
  assert.doesNotMatch(html, /id="repoUrl"[\s\S]{0,400}?pattern=/);
  assert.match(html, /id="repoUrl"[\s\S]{0,400}?inputmode="url"/);
  assert.match(html, /id="formError"/);
  assert.match(
    html,
    /<script src="validator-utils\.js"><\/script>\s*<script src="validator\.js"><\/script>/
  );
  assert.equal((html.match(/id="repoUrl"/g) || []).length, 1);
});

test("validator no longer fetches unused commit data", () => {
  const source = read("validator.js");
  assert.doesNotMatch(source, /recentCommits|commits\?per_page/);
  assert.match(source, /packageJson/);
});
