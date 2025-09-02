#!/usr/bin/env node

/**
 * Data Management Validator
 * Validates data management practices, quality, and security controls
 */

const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");
const crypto = require("crypto");

class DataValidator {
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
        "docs/governance/code-of-conduct.md"
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
        "docs/training/data-training.md"
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
        "docs/security/incident-response-guide.md"
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
      console.log("Scanning for secrets in data/config files...");
      const secretPatterns = [
        /api[_-]?key\s*[:=]\s*['\"][A-Za-z0-9\-_]{16,}/i,
        /secret\s*[:=]\s*['\"][A-Za-z0-9\-_]{8,}/i,
        /password\s*[:=]\s*['\"][^'\"]{6,}/i,
        /token\s*[:=]\s*['\"][A-Za-z0-9\-_]{16,}/i
      ];
      const files = this.getDataFiles();
      for (const file of files) {
        const content = fs.readFileSync(file, "utf8");
        for (const pattern of secretPatterns) {
          if (pattern.test(content)) {
            this.results.failed.push(`Potential secret found in ${file}`);
          }
        }
      }
    }

    getDataFiles() {
      // Recursively get all .json, .yml, .yaml, .env files in config/ and data/
      const walk = (dir) => {
        let results = [];
        if (!fs.existsSync(dir)) return results;
        const list = fs.readdirSync(dir);
        for (const file of list) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
          } else if (/(\.json|\.yml|\.yaml|\.env)$/.test(file)) {
            results.push(fullPath);
          }
        }
        return results;
      };
      return walk("config").concat(walk("data"));
    }

    async checkVulnerableDependencies() {
      console.log("Checking for vulnerable dependencies...");
      try {
        const output = execSync("npm audit --json").toString();
        const audit = JSON.parse(output);
        if (audit.metadata && audit.metadata.vulnerabilities && audit.metadata.vulnerabilities.total > 0) {
          this.results.failed.push(`Vulnerable dependencies found: ${audit.metadata.vulnerabilities.total}`);
        } else {
          this.results.passed.push("No vulnerable dependencies detected");
        }
      } catch (error) {
        this.results.warnings.push("Dependency audit failed: " + error.message);
      }
    }

  async validateDataGovernance() {
    console.log("Checking Data Governance Framework...");
    try {
      // Check governance documentation
      await this.checkGovernanceDocumentation();
      // Check policies
      await this.checkDataPolicies();
      // Check procedures
      await this.checkDataProcedures();
  // Scan for secrets
  await this.scanForSecrets();
  // Check for vulnerable dependencies
  await this.checkVulnerableDependencies();
    } catch (error) {
      this.results.failed.push("Data governance validation failed: " + error.message);
    }
  }

  async checkGovernanceDocumentation() {
    const requiredDocs = ["data-governance-framework.md", "data-policies.md", "data-procedures.md"];

    for (const doc of requiredDocs) {
      if (fs.existsSync(`docs/governance/${doc}`)) {
        this.results.passed.push(`Governance document exists: ${doc}`);
      } else {
        this.results.warnings.push(`Missing governance document: ${doc}`);
      }
    }
  }

  async validateDataQuality() {
    console.log("Checking Data Quality Controls...");
    try {
      // Check data quality rules
      await this.checkDataQualityRules();
      // Check data validation
      await this.validateDatasets();
      // Check data profiling
      await this.checkDataProfiling();
    } catch (error) {
      this.results.failed.push("Data quality validation failed: " + error.message);
    }
  }

  async checkDataQualityRules() {
    try {
      const rulesPath = "config/data-quality-rules.json";
      if (fs.existsSync(rulesPath)) {
        const rules = JSON.parse(fs.readFileSync(rulesPath));
        this.validateQualityRules(rules);
      } else {
        this.results.warnings.push("Missing data quality rules configuration");
      }
    } catch (error) {
      this.results.failed.push("Data quality rules validation failed: " + error.message);
    }
  }

  validateQualityRules(rules) {
    const requiredDimensions = ["completeness", "accuracy", "consistency", "timeliness"];

    for (const dimension of requiredDimensions) {
      if (rules[dimension]) {
        this.results.passed.push(`Quality rules defined for: ${dimension}`);
      } else {
        this.results.warnings.push(`Missing quality rules for: ${dimension}`);
      }
    }
  }

  async validateDatasets() {
    console.log("Validating Datasets...");
    try {
      const datasets = this.getDatasets();
      for (const dataset of datasets) {
        await this.validateDataset(dataset);
      }
    } catch (error) {
      this.results.failed.push("Dataset validation failed: " + error.message);
    }
  }

  getDatasets() {
    // Implementation would return list of datasets to validate
    return ["dataset1", "dataset2"]; // Placeholder
  }

  async validateDataset(dataset) {
    try {
      // Check completeness
      this.checkCompleteness(dataset);
      // Check accuracy
      this.checkAccuracy(dataset);
      // Check consistency
      this.checkConsistency(dataset);
      // Check timeliness
      this.checkTimeliness(dataset);
    } catch (error) {
      this.results.failed.push(`Dataset validation failed for ${dataset}: ${error.message}`);
    }
  }

  checkCompleteness(dataset) {
    // Implementation would check for null values, required fields, etc.
    this.results.warnings.push(`Manual verification required: Check completeness for ${dataset}`);
  }

  checkAccuracy(dataset) {
    // Implementation would validate data against known good values
    this.results.warnings.push(`Manual verification required: Check accuracy for ${dataset}`);
  }

  async validateDataSecurity() {
    console.log("Checking Data Security Controls...");
    try {
      // Check access controls
      await this.checkAccessControls();
      // Check encryption
      await this.checkEncryption();
      // Check audit logging
      await this.checkAuditLogging();
    } catch (error) {
      this.results.failed.push("Data security validation failed: " + error.message);
    }
  }

  async checkAccessControls() {
    try {
      // Check access control configuration
      const aclPath = "config/access-controls.json";
      if (fs.existsSync(aclPath)) {
        const acls = JSON.parse(fs.readFileSync(aclPath));
        this.validateAccessControls(acls);
      } else {
        this.results.warnings.push("Missing access control configuration");
      }
    } catch (error) {
      this.results.failed.push("Access control validation failed: " + error.message);
    }
  }

  validateAccessControls(acls) {
    const requiredControls = ["roles", "permissions", "restrictions"];

    for (const control of requiredControls) {
      if (acls[control]) {
        this.results.passed.push(`Access control defined for: ${control}`);
      } else {
        this.results.warnings.push(`Missing access control for: ${control}`);
      }
    }
  }

  async validateDataPrivacy() {
    console.log("Checking Data Privacy Controls...");
    try {
      // Check privacy policies
      await this.checkPrivacyPolicies();
      // Check PII handling
      await this.checkPIIHandling();
      // Check consent management
      await this.checkConsentManagement();
    } catch (error) {
      this.results.failed.push("Data privacy validation failed: " + error.message);
    }
  }

  async checkPrivacyPolicies() {
    const requiredPolicies = ["privacy-policy.md", "data-handling.md", "consent-management.md"];

    for (const policy of requiredPolicies) {
      if (fs.existsSync(`docs/privacy/${policy}`)) {
        this.results.passed.push(`Privacy policy exists: ${policy}`);
      } else {
        this.results.warnings.push(`Missing privacy policy: ${policy}`);
      }
    }
  }

  async validateDataLifecycle() {
    console.log("Checking Data Lifecycle Management...");
    try {
      // Check retention policies
      await this.checkRetentionPolicies();
      // Check archival procedures
      await this.checkArchivalProcedures();
      // Check disposal procedures
      await this.checkDisposalProcedures();
    } catch (error) {
      this.results.failed.push("Data lifecycle validation failed: " + error.message);
    }
  }

  async checkRetentionPolicies() {
    try {
      const retentionPath = "config/retention-policies.json";
      if (fs.existsSync(retentionPath)) {
        const policies = JSON.parse(fs.readFileSync(retentionPath));
        this.validateRetentionPolicies(policies);
      } else {
        this.results.warnings.push("Missing retention policies configuration");
      }
    } catch (error) {
      this.results.failed.push("Retention policy validation failed: " + error.message);
    }
  }

  async runAllChecks() {
    console.log("Starting Data Management Validation...\n");

    await this.validateDataGovernance();
    await this.validateDataQuality();
    await this.validateDataSecurity();
    await this.validateDataPrivacy();
    await this.validateDataLifecycle();
    await this.validateDataSecurity();
    await this.validateGovernanceAndTraining();

    this.printResults();
  }

  async validateDataSecurity() {
    console.log("Checking Data Security Enhancements...");
    try {
      await this.validatePrivacyImpactAssessments();
      await this.validateDataSubjectRights();
      await this.validateCrossBorderControls();
      await this.validateEnhancedAccessControls();
    } catch (error) {
      this.results.failed.push("Data security validation failed: " + error.message);
    }
  }

  async validatePrivacyImpactAssessments() {
    console.log("Checking Privacy Impact Assessments...");
    const piaFiles = [
      "docs/privacy/privacy-impact-assessment.md",
      "docs/compliance/pia-template.md",
      "config/pia-config.yml"
    ];
    for (const file of piaFiles) {
      if (fs.existsSync(file)) {
        this.results.passed.push(`Privacy impact assessment found: ${file}`);
      } else {
        this.results.warnings.push(`Missing privacy impact assessment: ${file}`);
      }
    }
  }

  async validateDataSubjectRights() {
    console.log("Checking Data Subject Rights Management...");
    const rightsFiles = [
      "src/privacy/data-subject-rights.js",
      "docs/privacy/gdpr-procedures.md",
      "config/data-rights.yml"
    ];
    for (const file of rightsFiles) {
      if (fs.existsSync(file)) {
        this.results.passed.push(`Data subject rights implementation found: ${file}`);
      } else {
        this.results.warnings.push(`Missing data subject rights implementation: ${file}`);
      }
    }
  }

  async validateCrossBorderControls() {
    console.log("Checking Cross-Border Data Transfer Controls...");
    const transferFiles = [
      "docs/compliance/cross-border-transfers.md",
      "config/data-transfer-controls.yml"
    ];
    for (const file of transferFiles) {
      if (fs.existsSync(file)) {
        this.results.passed.push(`Cross-border controls found: ${file}`);
      } else {
        this.results.warnings.push(`Missing cross-border controls: ${file}`);
      }
    }
  }

  async validateEnhancedAccessControls() {
    console.log("Checking Enhanced Access Controls...");
    const accessFiles = [
      "src/security/access-control.js",
      "config/access-policies.yml",
      "src/audit/access-logger.js"
    ];
    for (const file of accessFiles) {
      if (fs.existsSync(file)) {
        this.results.passed.push(`Enhanced access controls found: ${file}`);
      } else {
        this.results.warnings.push(`Missing enhanced access controls: ${file}`);
      }
    }
  }

  printResults() {
    console.log("\nData Management Validation Results:");
    console.log("=================================\n");

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
  const validator = new DataValidator();
  validator.runAllChecks().catch((error) => {
    console.error("Validation failed:", error);
    process.exit(1);
  });
}

module.exports = DataValidator;
