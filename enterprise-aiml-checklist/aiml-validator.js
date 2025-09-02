#!/usr/bin/env node

/**
 * AI/ML Development Validator
 * Validates AI/ML systems for model development, deployment, and monitoring practices
 */

const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");
const yaml = require("js-yaml");

class AIMLValidator {
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
    const trainingFiles = ["docs/training/security-awareness.md", "docs/training/aiml-training.md"];
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
    console.log("Scanning for secrets in AI/ML source/config files...");
    const secretPatterns = [
      /api[_-]?key\s*[:=]\s*['\"][A-Za-z0-9\-_]{16,}/i,
      /secret\s*[:=]\s*['\"][A-Za-z0-9\-_]{8,}/i,
      /password\s*[:=]\s*['\"][^'\"]{6,}/i,
      /token\s*[:=]\s*['\"][A-Za-z0-9\-_]{16,}/i,
    ];
    const files = this.getAIMLFiles();
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          this.results.failed.push(`Potential secret found in ${file}`);
        }
      }
    }
  }

  getAIMLFiles() {
    // Recursively get all .py, .js, .ts, .env, .yml, .yaml files in src/, config/, and notebooks/
    const walk = (dir) => {
      let results = [];
      if (!fs.existsSync(dir)) return results;
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(walk(fullPath));
        } else if (/(\.py|\.js|\.ts|\.env|\.yml|\.yaml)$/.test(file)) {
          results.push(fullPath);
        }
      }
      return results;
    };
    return walk("src").concat(walk("config")).concat(walk("notebooks"));
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

  async validateDataPipeline() {
    console.log("Checking Data Pipeline...");
    try {
      // Check data versioning
      await this.checkDataVersioning();
      // Check data validation
      await this.checkDataValidation();
      // Check feature engineering
      await this.checkFeatureEngineering();
      // Scan for secrets
      await this.scanForSecrets();
      // Check for vulnerable dependencies
      await this.checkVulnerableDependencies();
    } catch (error) {
      this.results.failed.push("Data pipeline validation failed: " + error.message);
    }
  }

  async checkDataVersioning() {
    try {
      // Check DVC configuration
      if (fs.existsSync(".dvc")) {
        const dvcConfig = yaml.load(fs.readFileSync(".dvc/config", "utf8"));
        this.validateDVCConfig(dvcConfig);
      } else {
        this.results.warnings.push("No DVC configuration found");
      }

      // Check data registry
      if (fs.existsSync("data/registry.yaml")) {
        const registry = yaml.load(fs.readFileSync("data/registry.yaml", "utf8"));
        this.validateDataRegistry(registry);
      } else {
        this.results.warnings.push("No data registry found");
      }
    } catch (error) {
      this.results.failed.push("Data versioning check failed: " + error.message);
    }
  }

  validateDVCConfig(config) {
    // Check remote storage configuration
    if (config.remote && config.remote.url) {
      this.results.passed.push("DVC remote storage configured");
    } else {
      this.results.warnings.push("DVC remote storage not configured");
    }

    // Check cache configuration
    if (config.cache && config.cache.dir) {
      this.results.passed.push("DVC cache configured");
    } else {
      this.results.warnings.push("DVC cache not configured");
    }
  }

  async validateModelDevelopment() {
    console.log("Checking Model Development...");
    try {
      // Check experiment tracking
      await this.checkExperimentTracking();
      // Check model versioning
      await this.checkModelVersioning();
      // Check model testing
      await this.checkModelTesting();
    } catch (error) {
      this.results.failed.push("Model development validation failed: " + error.message);
    }
  }

  async checkExperimentTracking() {
    try {
      // Check MLflow configuration
      if (fs.existsSync("mlflow.yaml")) {
        const mlflowConfig = yaml.load(fs.readFileSync("mlflow.yaml", "utf8"));
        this.validateMLflowConfig(mlflowConfig);
      } else {
        this.results.warnings.push("No MLflow configuration found");
      }

      // Check experiment notebooks
      const notebooks = this.findFiles("notebooks", ".ipynb");
      if (notebooks.length > 0) {
        this.validateNotebooks(notebooks);
      } else {
        this.results.warnings.push("No experiment notebooks found");
      }
    } catch (error) {
      this.results.warnings.push("Experiment tracking check failed: " + error.message);
    }
  }

  async validateModelDeployment() {
    console.log("Checking Model Deployment...");
    try {
      // Check model serving
      await this.checkModelServing();
      // Check deployment pipeline
      await this.checkDeploymentPipeline();
      // Check monitoring setup
      await this.checkMonitoringSetup();
    } catch (error) {
      this.results.failed.push("Model deployment validation failed: " + error.message);
    }
  }

  async checkModelServing() {
    try {
      // Check serving configuration
      if (fs.existsSync("serving/config.yaml")) {
        const servingConfig = yaml.load(fs.readFileSync("serving/config.yaml", "utf8"));
        this.validateServingConfig(servingConfig);
      } else {
        this.results.warnings.push("No model serving configuration found");
      }

      // Check API implementation
      const apiFiles = this.findFiles("serving/api", ".py");
      if (apiFiles.length > 0) {
        this.validateAPIImplementation(apiFiles);
      } else {
        this.results.warnings.push("No model serving API implementation found");
      }
    } catch (error) {
      this.results.warnings.push("Model serving check failed: " + error.message);
    }
  }

  async validateModelMonitoring() {
    console.log("Checking Model Monitoring...");
    try {
      // Check performance monitoring
      await this.checkPerformanceMonitoring();
      // Check drift detection
      await this.checkDriftDetection();
      // Check alerting
      await this.checkAlertingSystem();
    } catch (error) {
      this.results.failed.push("Model monitoring validation failed: " + error.message);
    }
  }

  async checkPerformanceMonitoring() {
    try {
      // Check monitoring configuration
      if (fs.existsSync("monitoring/config.yaml")) {
        const monitoringConfig = yaml.load(fs.readFileSync("monitoring/config.yaml", "utf8"));
        this.validateMonitoringConfig(monitoringConfig);
      } else {
        this.results.warnings.push("No monitoring configuration found");
      }

      // Check metrics collection
      const metricsFiles = this.findFiles("monitoring/metrics", ".py");
      if (metricsFiles.length > 0) {
        this.validateMetricsCollection(metricsFiles);
      } else {
        this.results.warnings.push("No metrics collection implementation found");
      }
    } catch (error) {
      this.results.warnings.push("Performance monitoring check failed: " + error.message);
    }
  }

  async validateModelGovernance() {
    console.log("Checking Model Governance...");
    try {
      // Check model documentation
      await this.checkModelDocumentation();
      // Check fairness assessment
      await this.checkFairnessAssessment();
      // Check compliance
      await this.checkCompliance();
    } catch (error) {
      this.results.failed.push("Model governance validation failed: " + error.message);
    }
  }

  async checkModelDocumentation() {
    try {
      // Check model cards
      const modelCards = this.findFiles("models/cards", ".md");
      if (modelCards.length > 0) {
        this.validateModelCards(modelCards);
      } else {
        this.results.warnings.push("No model cards found");
      }

      // Check API documentation
      if (fs.existsSync("api/openapi.yaml")) {
        const apiSpec = yaml.load(fs.readFileSync("api/openapi.yaml", "utf8"));
        this.validateAPISpec(apiSpec);
      } else {
        this.results.warnings.push("No API documentation found");
      }
    } catch (error) {
      this.results.warnings.push("Model documentation check failed: " + error.message);
    }
  }

  findFiles(directory, extension) {
    const files = [];
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.findFiles(fullPath, extension));
      } else if (entry.isFile() && entry.name.endsWith(extension)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  async runAllChecks() {
    console.log("Starting AI/ML Development Validation...\n");

    await this.validateDataPipeline();
    await this.validateModelDevelopment();
    await this.validateModelDeployment();
    await this.validateModelMonitoring();
    await this.validateModelGovernance();
    await this.validateAIMLSecurity();
    await this.validateGovernanceAndTraining();

    this.printResults();
  }

  printResults() {
    console.log("\nAI/ML Development Validation Results:");
    console.log("==================================\n");

    console.log("Passed Checks:");
    this.results.passed.forEach((item) => console.log("✅ " + item));

    console.log("\nFailed Checks:");
    this.results.failed.forEach((item) => console.log("❌ " + item));

    console.log("\nWarnings:");
    this.results.warnings.forEach((item) => console.log("⚠️  " + item));

    console.log("\nNot Checked:");
    this.results.notChecked.forEach((item) => console.log("❓ " + item));
  }

  async validateAIMLSecurity() {
    console.log("Checking AI/ML Security Controls...");
    try {
      await this.validateAdversarialRobustness();
      await this.validateModelExtraction();
      await this.validateDifferentialPrivacy();
      await this.validateAIMLSecurityTesting();
    } catch (error) {
      this.results.failed.push("AI/ML security validation failed: " + error.message);
    }
  }

  async validateAdversarialRobustness() {
    console.log("Checking Adversarial Robustness Testing...");
    const robustnessFiles = [
      "tests/adversarial_test.py",
      "src/security/adversarial_defense.py",
      "config/robustness_config.yml",
    ];
    for (const file of robustnessFiles) {
      if (fs.existsSync(file)) {
        this.results.passed.push(`Adversarial robustness implementation found: ${file}`);
      } else {
        this.results.warnings.push(`Missing adversarial robustness file: ${file}`);
      }
    }
  }

  async validateModelExtraction() {
    console.log("Checking Model Extraction Protection...");
    const protectionFiles = ["src/security/model_protection.py", "config/extraction_defense.yml"];
    for (const file of protectionFiles) {
      if (fs.existsSync(file)) {
        this.results.passed.push(`Model extraction protection found: ${file}`);
      } else {
        this.results.warnings.push(`Missing model extraction protection: ${file}`);
      }
    }
  }

  async validateDifferentialPrivacy() {
    console.log("Checking Differential Privacy Implementation...");
    const privacyFiles = [
      "src/privacy/differential_privacy.py",
      "src/federated/federated_learning.py",
    ];
    for (const file of privacyFiles) {
      if (fs.existsSync(file)) {
        this.results.passed.push(`Differential privacy implementation found: ${file}`);
      } else {
        this.results.warnings.push(`Missing differential privacy implementation: ${file}`);
      }
    }
  }

  async validateAIMLSecurityTesting() {
    console.log("Checking AI/ML Security Testing in CI/CD...");
    const securityConfigs = [
      ".github/workflows/ml-security.yml",
      "security/ml-security-tests.py",
      "config/ml-security.yml",
    ];
    for (const config of securityConfigs) {
      if (fs.existsSync(config)) {
        this.results.passed.push(`AI/ML security testing config found: ${config}`);
      } else {
        this.results.warnings.push(`Missing AI/ML security testing config: ${config}`);
      }
    }
  }
}

// Run the validator if this script is executed directly
if (require.main === module) {
  const validator = new AIMLValidator();
  validator.runAllChecks().catch((error) => {
    console.error("Validation failed:", error);
    process.exit(1);
  });
}

module.exports = AIMLValidator;
