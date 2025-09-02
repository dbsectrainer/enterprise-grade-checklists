#!/usr/bin/env node

/**
 * DevOps Checklist Validation Script
 * Automates validation of DevOps practices and configurations
 */

const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");
const yaml = require("js-yaml");

class DevOpsValidator {
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
        "docs/training/devops-training.md"
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
      console.log("Scanning for secrets in pipeline/config files...");
      const secretPatterns = [
        /api[_-]?key\s*[:=]\s*['\"][A-Za-z0-9\-_]{16,}/i,
        /secret\s*[:=]\s*['\"][A-Za-z0-9\-_]{8,}/i,
        /password\s*[:=]\s*['\"][^'\"]{6,}/i,
        /token\s*[:=]\s*['\"][A-Za-z0-9\-_]{16,}/i
      ];
      const files = this.getPipelineFiles();
      for (const file of files) {
        const content = fs.readFileSync(file, "utf8");
        for (const pattern of secretPatterns) {
          if (pattern.test(content)) {
            this.results.failed.push(`Potential secret found in ${file}`);
          }
        }
      }
    }

    getPipelineFiles() {
      // Recursively get all .yml, .yaml, .env files in .github/, .gitlab/, and config/
      const walk = (dir) => {
        let results = [];
        if (!fs.existsSync(dir)) return results;
        const list = fs.readdirSync(dir);
        for (const file of list) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
          } else if (/(\.yml|\.yaml|\.env)$/.test(file)) {
            results.push(fullPath);
          }
        }
        return results;
      };
      return walk(".github").concat(walk(".gitlab")).concat(walk("config"));
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

  async validateCICD() {
    console.log("Checking CI/CD Configuration...");
    try {
      // Check common CI/CD config files
      const configFiles = [
        ".github/workflows",
        ".gitlab-ci.yml",
        "Jenkinsfile",
        "azure-pipelines.yml",
      ];

      for (const config of configFiles) {
        if (fs.existsSync(config)) {
          await this.validatePipelineConfig(config);
        }
      }
  // Scan for secrets
  await this.scanForSecrets();
  // Check for vulnerable dependencies
  await this.checkVulnerableDependencies();
    } catch (error) {
      this.results.failed.push("CI/CD validation failed: " + error.message);
    }
  }

  async validatePipelineConfig(configPath) {
    try {
      const stats = fs.statSync(configPath);

      if (stats.isDirectory()) {
        // GitHub Actions workflows
        const files = fs.readdirSync(configPath);
        for (const file of files) {
          if (file.endsWith(".yml") || file.endsWith(".yaml")) {
            const content = yaml.load(fs.readFileSync(path.join(configPath, file), "utf8"));
            this.validateWorkflowStructure(content);
          }
        }
      } else {
        // Single pipeline file
        const content = fs.readFileSync(configPath, "utf8");
        if (configPath.includes("Jenkinsfile")) {
          this.validateJenkinsfile(content);
        } else {
          const yamlContent = yaml.load(content);
          this.validateWorkflowStructure(yamlContent);
        }
      }
    } catch (error) {
      this.results.failed.push(
        `Pipeline config validation failed for ${configPath}: ${error.message}`
      );
    }
  }

  validateWorkflowStructure(workflow) {
    // Check for essential stages
    const requiredStages = ["build", "test", "deploy"];
    const stages = this.extractStages(workflow);

    for (const stage of requiredStages) {
      if (stages.includes(stage)) {
        this.results.passed.push(`Pipeline includes ${stage} stage`);
      } else {
        this.results.warnings.push(`Pipeline missing ${stage} stage`);
      }
    }
  }

  extractStages(workflow) {
    // Extract stages from different CI/CD formats
    const stages = new Set();

    if (workflow.jobs) {
      // GitHub Actions format
      Object.keys(workflow.jobs).forEach((job) => stages.add(job.toLowerCase()));
    } else if (workflow.stages) {
      // GitLab CI format
      workflow.stages.forEach((stage) => stages.add(stage.toLowerCase()));
    }

    return Array.from(stages);
  }

  validateJenkinsfile(content) {
    // Basic Jenkinsfile validation
    const requiredSections = ["pipeline", "stages", "stage"];
    for (const section of requiredSections) {
      if (!content.includes(section)) {
        this.results.warnings.push(`Jenkinsfile missing ${section} section`);
      }
    }
  }

  async validateInfrastructure() {
    console.log("Validating Infrastructure Configuration...");
    try {
      // Check for IaC files
      const iacFiles = ["terraform", "cloudformation", "kubernetes", "ansible"];

      for (const tool of iacFiles) {
        await this.validateIaCTool(tool);
      }
    } catch (error) {
      this.results.failed.push("Infrastructure validation failed: " + error.message);
    }
  }

  async validateIaCTool(tool) {
    try {
      switch (tool) {
        case "terraform":
          if (fs.existsSync("terraform")) {
            this.validateTerraform();
          }
          break;
        case "kubernetes":
          if (fs.existsSync("kubernetes") || fs.existsSync("k8s")) {
            this.validateKubernetes();
          }
          break;
        // Add more IaC tools as needed
      }
    } catch (error) {
      this.results.failed.push(`${tool} validation failed: ${error.message}`);
    }
  }

  validateTerraform() {
    // Check Terraform structure
    const requiredFiles = ["main.tf", "variables.tf", "outputs.tf"];
    for (const file of requiredFiles) {
      if (fs.existsSync(`terraform/${file}`)) {
        this.results.passed.push(`Terraform ${file} exists`);
      } else {
        this.results.warnings.push(`Missing ${file} in Terraform config`);
      }
    }
  }

  validateKubernetes() {
    // Check Kubernetes manifests
    const requiredResources = ["deployments", "services", "configmaps"];
    for (const resource of requiredResources) {
      if (fs.existsSync(`kubernetes/${resource}`)) {
        this.results.passed.push(`Kubernetes ${resource} configured`);
      } else {
        this.results.warnings.push(`Missing ${resource} in Kubernetes config`);
      }
    }
  }

  async validateMonitoring() {
    console.log("Checking Monitoring Configuration...");
    try {
      // Check monitoring tools configuration
      const monitoringTools = ["prometheus", "grafana", "elasticsearch", "datadog"];

      for (const tool of monitoringTools) {
        await this.validateMonitoringTool(tool);
      }
    } catch (error) {
      this.results.failed.push("Monitoring validation failed: " + error.message);
    }
  }

  async validateMonitoringTool(tool) {
    try {
      const configPath = `monitoring/${tool}`;
      if (fs.existsSync(configPath)) {
        this.results.passed.push(`${tool} monitoring configured`);
        // Validate specific tool configuration
        switch (tool) {
          case "prometheus":
            this.validatePrometheusConfig(configPath);
            break;
          case "grafana":
            this.validateGrafanaConfig(configPath);
            break;
          // Add more monitoring tools as needed
        }
      } else {
        this.results.warnings.push(`${tool} monitoring not configured`);
      }
    } catch (error) {
      this.results.failed.push(`${tool} validation failed: ${error.message}`);
    }
  }

  validatePrometheusConfig(configPath) {
    // Check Prometheus configuration
    const requiredFiles = ["prometheus.yml", "alerts.yml"];
    for (const file of requiredFiles) {
      if (fs.existsSync(path.join(configPath, file))) {
        this.results.passed.push(`Prometheus ${file} configured`);
      } else {
        this.results.warnings.push(`Missing ${file} in Prometheus config`);
      }
    }
  }

  validateGrafanaConfig(configPath) {
    // Check Grafana configuration
    const requiredFiles = ["datasources", "dashboards"];
    for (const file of requiredFiles) {
      if (fs.existsSync(path.join(configPath, file))) {
        this.results.passed.push(`Grafana ${file} configured`);
      } else {
        this.results.warnings.push(`Missing ${file} in Grafana config`);
      }
    }
  }

  async runAllChecks() {
    console.log("Starting DevOps Practice Validation...\n");

    await this.validateCICD();
    await this.validateInfrastructure();
    await this.validateMonitoring();
    await this.validateDevOpsSecurity();
    await this.validateGovernanceAndTraining();

    this.printResults();
  }

  async validateDevOpsSecurity() {
    console.log("Checking DevOps Security Integration...");
    try {
      await this.validateSecurityScanning();
      await this.validateSecurityPolicyAsCode();
      await this.validateSecretsInCICD();
    } catch (error) {
      this.results.failed.push("DevOps security validation failed: " + error.message);
    }
  }

  async validateSecurityScanning() {
    console.log("Checking Comprehensive Security Scanning...");
    const scanningConfigs = [
      ".github/workflows/security-scan.yml",
      "sonar-project.properties",
      "Dockerfile.security",
      ".snyk"
    ];
    for (const config of scanningConfigs) {
      if (fs.existsSync(config)) {
        this.results.passed.push(`Security scanning config found: ${config}`);
      } else {
        this.results.warnings.push(`Missing security scanning config: ${config}`);
      }
    }
  }

  async validateSecurityPolicyAsCode() {
    console.log("Checking Security Policy as Code...");
    const policyFiles = [
      "policies/security-policies.yml",
      "config/security-rules.json",
      "terraform/security-policies.tf"
    ];
    for (const file of policyFiles) {
      if (fs.existsSync(file)) {
        this.results.passed.push(`Security policy as code found: ${file}`);
      } else {
        this.results.warnings.push(`Missing security policy as code: ${file}`);
      }
    }
  }

  async validateSecretsInCICD() {
    console.log("Checking Secrets Management in CI/CD...");
    const secretsConfigs = [
      ".github/workflows/secrets-check.yml",
      "config/vault-integration.yml",
      "scripts/secrets-rotation.sh"
    ];
    for (const config of secretsConfigs) {
      if (fs.existsSync(config)) {
        this.results.passed.push(`Secrets management in CI/CD found: ${config}`);
      } else {
        this.results.warnings.push(`Missing secrets management in CI/CD: ${config}`);
      }
    }
  }

  printResults() {
    console.log("\nDevOps Validation Results:");
    console.log("==========================\n");

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
  const validator = new DevOpsValidator();
  validator.runAllChecks().catch((error) => {
    console.error("Validation failed:", error);
    process.exit(1);
  });
}

module.exports = DevOpsValidator;
