#!/usr/bin/env node

/**
 * Frontend Checklist Validator
 * Validates frontend application for performance, accessibility, and best practices
 */

const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");
const lighthouse = require("lighthouse");
const puppeteer = require("puppeteer");
const axe = require("axe-core");

class FrontendValidator {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
      notChecked: [],
    };
  }

  async validateGovernanceAndTraining() {
    console.log("Checking Governance, Training, and Security Awareness...");
    // Governance documentation
    const governanceDocs = [
      "docs/governance/security-policy.md",
      "docs/governance/roles-responsibilities.md",
      "docs/governance/code-of-conduct.md",
    ];
    for (const doc of governanceDocs) {
      if (fs.existsSync(doc)) {
        this.results.passed.push(`Governance doc exists: ${doc}`);
      } else {
        this.results.warnings.push(`Missing governance doc: ${doc}`);
      }
    }

    // Training records
    const trainingFiles = [
      "docs/training/security-awareness.md",
      "docs/training/frontend-training.md",
    ];
    for (const file of trainingFiles) {
      if (fs.existsSync(file)) {
        this.results.passed.push(`Training record exists: ${file}`);
      } else {
        this.results.warnings.push(`Missing training record: ${file}`);
      }
    }

    // Security awareness materials
    const awarenessFiles = [
      "docs/security/security-awareness.md",
      "docs/security/incident-response-guide.md",
    ];
    for (const file of awarenessFiles) {
      if (fs.existsSync(file)) {
        this.results.passed.push(`Security awareness material exists: ${file}`);
      } else {
        this.results.warnings.push(`Missing security awareness material: ${file}`);
      }
    }
  }

  async scanForSecrets() {
    console.log("Scanning for secrets in source files...");
    const secretPatterns = [
      /api[_-]?key\s*[:=]\s*['\"][A-Za-z0-9\-_]{16,}/i,
      /secret\s*[:=]\s*['\"][A-Za-z0-9\-_]{8,}/i,
      /password\s*[:=]\s*['\"][^'\"]{6,}/i,
      /token\s*[:=]\s*['\"][A-Za-z0-9\-_]{16,}/i,
    ];
    const files = this.getSourceFiles();
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          this.results.failed.push(`Potential secret found in ${file}`);
        }
      }
    }
  }

  getSourceFiles() {
    // Recursively get all .js, .ts, .env files in src/
    const walk = (dir) => {
      let results = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(walk(fullPath));
        } else if (/(\.js|\.ts|\.env)$/.test(file)) {
          results.push(fullPath);
        }
      }
      return results;
    };
    return walk("src");
  }

  async checkVulnerableDependencies() {
    console.log("Checking for vulnerable dependencies...");
    try {
      const output = execSync("npm audit --json").toString();
      const audit = JSON.parse(output);
      if (
        audit.metadata &&
        audit.metadata.vulnerabilities &&
        audit.metadata.vulnerabilities.total > 0
      ) {
        this.results.failed.push(
          `Vulnerable dependencies found: ${audit.metadata.vulnerabilities.total}`
        );
      } else {
        this.results.passed.push("No vulnerable dependencies detected");
      }
    } catch (error) {
      this.results.warnings.push("Dependency audit failed: " + error.message);
    }
  }

  async validatePerformance() {
    console.log("Checking Performance Metrics...");
    try {
      // Run Lighthouse performance audit
      const performanceMetrics = await this.runLighthouseAudit();
      await this.validatePerformanceMetrics(performanceMetrics);

      // Check bundle size
      await this.checkBundleSize();

      // Check image optimization
      await this.checkImageOptimization();
      // Scan for secrets
      await this.scanForSecrets();
      // Check for vulnerable dependencies
      await this.checkVulnerableDependencies();
    } catch (error) {
      this.results.failed.push("Performance validation failed: " + error.message);
    }
  }

  async runLighthouseAudit() {
    try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      const results = await lighthouse(page, {
        onlyCategories: ["performance"],
      });

      await browser.close();
      return results;
    } catch (error) {
      this.results.failed.push("Lighthouse audit failed: " + error.message);
    }
  }

  async validatePerformanceMetrics(metrics) {
    const thresholds = {
      "first-contentful-paint": 1000,
      "largest-contentful-paint": 2500,
      "time-to-interactive": 3500,
      "cumulative-layout-shift": 0.1,
      "total-blocking-time": 300,
    };

    for (const [metric, threshold] of Object.entries(thresholds)) {
      if (metrics[metric] <= threshold) {
        this.results.passed.push(`${metric} within threshold: ${metrics[metric]}ms`);
      } else {
        this.results.failed.push(`${metric} exceeds threshold: ${metrics[metric]}ms`);
      }
    }
  }

  async checkBundleSize() {
    try {
      const stats = JSON.parse(fs.readFileSync("dist/stats.json", "utf8"));
      const maxBundleSize = 244 * 1024; // 244KB threshold

      for (const asset of stats.assets) {
        if (asset.size > maxBundleSize) {
          this.results.warnings.push(
            `Bundle ${asset.name} exceeds size threshold: ${asset.size} bytes`
          );
        } else {
          this.results.passed.push(
            `Bundle ${asset.name} within size threshold: ${asset.size} bytes`
          );
        }
      }
    } catch (error) {
      this.results.warnings.push("Bundle size check failed: " + error.message);
    }
  }

  async validateAccessibility() {
    console.log("Checking Accessibility...");
    try {
      // Run axe accessibility audit
      const accessibilityResults = await this.runAxeAudit();
      await this.validateAccessibilityResults(accessibilityResults);

      // Check semantic HTML
      await this.checkSemanticHTML();

      // Check ARIA attributes
      await this.checkARIAAttributes();
    } catch (error) {
      this.results.failed.push("Accessibility validation failed: " + error.message);
    }
  }

  async runAxeAudit() {
    try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.setContent(fs.readFileSync("dist/index.html", "utf8"));
      const results = await axe.run(page);

      await browser.close();
      return results;
    } catch (error) {
      this.results.failed.push("Axe audit failed: " + error.message);
    }
  }

  async validateAccessibilityResults(results) {
    if (results.violations.length === 0) {
      this.results.passed.push("No accessibility violations found");
    } else {
      results.violations.forEach((violation) => {
        this.results.failed.push(
          `Accessibility violation: ${violation.help} - ${violation.description}`
        );
      });
    }
  }

  async validateBestPractices() {
    console.log("Checking Best Practices...");
    try {
      // Check code style
      await this.checkCodeStyle();

      // Check documentation
      await this.checkDocumentation();

      // Check testing coverage
      await this.checkTestCoverage();
    } catch (error) {
      this.results.failed.push("Best practices validation failed: " + error.message);
    }
  }

  async checkCodeStyle() {
    try {
      execSync("npm run lint");
      this.results.passed.push("Code style validation passed");
    } catch (error) {
      this.results.failed.push("Code style validation failed: " + error.message);
    }
  }

  async checkTestCoverage() {
    try {
      const coverage = JSON.parse(fs.readFileSync("coverage/coverage-summary.json", "utf8"));
      const threshold = 80;

      if (coverage.total.lines.pct >= threshold) {
        this.results.passed.push(`Test coverage above threshold: ${coverage.total.lines.pct}%`);
      } else {
        this.results.failed.push(`Test coverage below threshold: ${coverage.total.lines.pct}%`);
      }
    } catch (error) {
      this.results.warnings.push("Test coverage check failed: " + error.message);
    }
  }

  async validateSecurity() {
    console.log("Checking Security Controls...");
    try {
      // Check dependencies
      await this.checkDependencies();

      // Check CSP
      await this.checkContentSecurityPolicy();

      // Check XSS protection
      await this.checkXSSProtection();
    } catch (error) {
      this.results.failed.push("Security validation failed: " + error.message);
    }
  }

  async checkDependencies() {
    try {
      execSync("npm audit");
      this.results.passed.push("Dependency security check passed");
    } catch (error) {
      this.results.failed.push("Dependency security check failed: " + error.message);
    }
  }

  async checkContentSecurityPolicy() {
    try {
      const html = fs.readFileSync("dist/index.html", "utf8");
      if (html.includes("content-security-policy")) {
        this.results.passed.push("CSP header found");
      } else {
        this.results.warnings.push("No CSP header found");
      }
    } catch (error) {
      this.results.warnings.push("CSP check failed: " + error.message);
    }
  }

  async validateBuildOutput() {
    console.log("Checking Build Output...");
    try {
      // Check build artifacts
      await this.checkBuildArtifacts();

      // Check source maps
      await this.checkSourceMaps();

      // Check asset optimization
      await this.checkAssetOptimization();
    } catch (error) {
      this.results.failed.push("Build output validation failed: " + error.message);
    }
  }

  async checkBuildArtifacts() {
    const requiredFiles = ["dist/index.html", "dist/main.js", "dist/styles.css"];

    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        this.results.passed.push(`Build artifact exists: ${file}`);
      } else {
        this.results.failed.push(`Missing build artifact: ${file}`);
      }
    }
  }

  async runAllChecks() {
    console.log("Starting Frontend Validation...\n");

    await this.validatePerformance();
    await this.validateAccessibility();
    await this.validateBestPractices();
    await this.validateSecurity();
    await this.validateBuildOutput();
    await this.validateFrontendSecurity();
    await this.validateGovernanceAndTraining();

    this.printResults();
  }

  async validateFrontendSecurity() {
    console.log("Checking Frontend Security Controls...");
    try {
      await this.validateCSP();
      await this.validateInputValidation();
      await this.validateDependencyScanning();
      await this.validateClickjackingProtection();
    } catch (error) {
      this.results.failed.push("Frontend security validation failed: " + error.message);
    }
  }

  async validateCSP() {
    console.log("Checking Content Security Policy...");
    const securityConfigs = [
      "public/index.html",
      "src/security/csp.js",
      "config/security-headers.json",
    ];
    for (const config of securityConfigs) {
      if (fs.existsSync(config)) {
        const content = fs.readFileSync(config, "utf8");
        if (content.includes("Content-Security-Policy") || content.includes("csp")) {
          this.results.passed.push(`CSP configuration found in: ${config}`);
        }
      }
    }
  }

  async validateInputValidation() {
    console.log("Checking Input Validation & Output Encoding...");
    const validationFiles = [
      "src/utils/validation.js",
      "src/security/sanitizer.js",
      "src/utils/encoder.js",
    ];
    for (const file of validationFiles) {
      if (fs.existsSync(file)) {
        this.results.passed.push(`Input validation found: ${file}`);
      } else {
        this.results.warnings.push(`Missing input validation: ${file}`);
      }
    }
  }

  async validateDependencyScanning() {
    console.log("Checking Dependency Vulnerability Scanning...");
    const securityConfigs = [".github/workflows/security.yml", "package.json", ".snyk"];
    for (const config of securityConfigs) {
      if (fs.existsSync(config)) {
        this.results.passed.push(`Security scanning config found: ${config}`);
      } else {
        this.results.warnings.push(`Missing security scanning config: ${config}`);
      }
    }
  }

  async validateClickjackingProtection() {
    console.log("Checking Clickjacking Protection...");
    // Check for X-Frame-Options or CSP frame-ancestors
    this.results.warnings.push("Manual verification required: Check X-Frame-Options headers");
  }

  printResults() {
    console.log("\nFrontend Validation Results:");
    console.log("===========================\n");

    console.log("Passed Checks:");
    this.results.passed.forEach((item) => console.log("✅ " + item));

    console.log("\nFailed Checks:");
    this.results.failed.forEach((item) => console.log("❌ " + item));

    console.log("\nWarnings:");
    this.results.warnings.forEach((item) => console.log("⚠️  " + item));

    console.log("\nNot Checked:");
    this.results.notChecked.forEach((item) => console.log("❓ " + item));
  }
}

// Run the validator if this script is executed directly
if (require.main === module) {
  const validator = new FrontendValidator();
  validator.runAllChecks().catch((error) => {
    console.error("Validation failed:", error);
    process.exit(1);
  });
}

module.exports = FrontendValidator;
