import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const CHECKLIST_DIRS = [
  "enterprise-frontend-checklist",
  "enterprise-backend-checklist",
  "enterprise-cloud-checklist",
  "enterprise-data-checklist",
  "enterprise-devops-checklist",
  "enterprise-mobile-checklist",
  "enterprise-security-checklist",
  "enterprise-aiml-checklist",
];

const SITE_FILES = [
  "index.html",
  "validator.html",
  "styles.css",
  "validator.css",
  "script.js",
  "validator.js",
  "validator-utils.js",
  "favicon.svg",
  "standards-mapping.json",
  "LICENSE",
  "README.md",
  "CODE_OF_CONDUCT.md",
];

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function fail(message) {
  console.error(`Build failed: ${message}`);
  process.exit(1);
}

// Start from a clean output directory.
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// Copy root application files.
for (const file of SITE_FILES) {
  const source = join(root, file);
  if (!existsSync(source)) fail(`missing required file ${file}`);
  cpSync(source, join(dist, file));
}

// Copy only the browser assets each checklist actually loads.
for (const directory of CHECKLIST_DIRS) {
  const sourceDirectory = join(root, directory);
  const targetDirectory = join(dist, directory);
  mkdirSync(targetDirectory, { recursive: true });

  for (const file of ["index.html", "styles.css", "script.js"]) {
    const source = join(sourceDirectory, file);
    if (!existsSync(source)) fail(`missing ${directory}/${file}`);
    cpSync(source, join(targetDirectory, file));
  }
}

// Documentation is linked from the dashboard footer; keep it (including the
// verification evidence) in the artifact so every published link resolves.
const docsSource = join(root, "docs");
const docsTarget = join(dist, "docs");
if (existsSync(docsSource)) {
  mkdirSync(docsTarget, { recursive: true });
  for (const entry of readdirSync(docsSource, { withFileTypes: true })) {
    cpSync(join(docsSource, entry.name), join(docsTarget, entry.name), { recursive: true });
  }
}

// Verify every local href/src in the built HTML resolves inside dist.
const htmlFiles = walk(dist).filter((file) => file.endsWith(".html"));
const missingLinks = [];
const linkPattern = /(?:href|src)="([^"]+)"/g;

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    const link = match[1].trim();
    if (!link || link.startsWith("#")) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith("//")) continue;
    if (link.startsWith("mailto:") || link.startsWith("tel:")) continue;

    const clean = decodeURIComponent(link.split("#")[0].split("?")[0]);
    const target = resolve(dirname(file), clean);
    if (!target.startsWith(dist)) {
      missingLinks.push(`${relative(dist, file)} -> ${link} (escapes dist)`);
      continue;
    }
    if (!existsSync(target)) {
      missingLinks.push(`${relative(dist, file)} -> ${link}`);
    }
  }
}

// Documentation pages are part of the artifact too, so validate their local links.
const markdownFiles = walk(dist).filter((file) => file.endsWith(".md"));
const markdownLinkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

for (const file of markdownFiles) {
  const markdown = readFileSync(file, "utf8");
  let match;
  while ((match = markdownLinkPattern.exec(markdown)) !== null) {
    const link = match[1].trim().replace(/^<|>$/g, "");
    if (!link || link.startsWith("#")) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith("//")) continue;

    const clean = decodeURIComponent(link.split("#")[0].split("?")[0]);
    if (!clean) continue;
    const target = resolve(dirname(file), clean);
    if (!target.startsWith(dist)) {
      missingLinks.push(`${relative(dist, file)} -> ${link} (escapes dist)`);
      continue;
    }
    if (!existsSync(target)) {
      missingLinks.push(`${relative(dist, file)} -> ${link}`);
    }
  }
}

if (missingLinks.length > 0) {
  fail(`broken local links:\n  ${missingLinks.join("\n  ")}`);
}

// Guard the key content invariants that the tests also exercise.
const builtIndex = readFileSync(join(dist, "index.html"), "utf8");
if ((builtIndex.match(/class="checklist-card"/g) || []).length !== 8) {
  fail("dashboard does not contain exactly 8 checklist cards");
}
for (const directory of CHECKLIST_DIRS) {
  const html = readFileSync(join(dist, directory, "index.html"), "utf8");
  if (html.includes('<label class="checklist-item">')) {
    fail(`${directory} still contains invalid label-wrapped checklist items`);
  }
  if (!html.includes('class="item-label"')) {
    fail(`${directory} is missing accessible item labels`);
  }
}

// Write a deterministic manifest (timestamps are the only non-deterministic field).
const manifestFiles = walk(dist)
  .map((file) => ({
    path: relative(dist, file).split("\\").join("/"),
    bytes: statSync(file).size,
    sha256: sha256(file),
  }))
  .sort((left, right) => left.path.localeCompare(right.path));

const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const manifest = {
  name: packageJson.name,
  version: packageJson.version,
  builtAt: new Date().toISOString(),
  fileCount: manifestFiles.length,
  totalBytes: manifestFiles.reduce((total, file) => total + file.bytes, 0),
  files: manifestFiles,
};

writeFileSync(join(dist, "build-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `Build complete: ${manifest.fileCount} files, ${(manifest.totalBytes / 1024).toFixed(1)} KiB -> ${relative(root, dist)}/`
);
