#!/usr/bin/env node

/**
 * Cloud Infrastructure Validator
 * Validates cloud infrastructure configurations across multiple providers
 */

const fs = require("fs");
const { execSync } = require("child_process");
const yaml = require("js-yaml");

class CloudValidator {
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
        "docs/training/cloud-training.md"
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
      console.log("Scanning for secrets in infrastructure files...");
      const secretPatterns = [
        /api[_-]?key\s*[:=]\s*['\"][A-Za-z0-9\-_]{16,}/i,
        /secret\s*[:=]\s*['\"][A-Za-z0-9\-_]{8,}/i,
        /password\s*[:=]\s*['\"][^'\"]{6,}/i,
        /token\s*[:=]\s*['\"][A-Za-z0-9\-_]{16,}/i
      ];
      const files = this.getInfraFiles();
      for (const file of files) {
        const content = fs.readFileSync(file, "utf8");
        for (const pattern of secretPatterns) {
          if (pattern.test(content)) {
            this.results.failed.push(`Potential secret found in ${file}`);
          }
        }
      }
    }

    getInfraFiles() {
      // Recursively get all .tf, .yml, .yaml, .env files in infra/
      const walk = (dir) => {
        let results = [];
        if (!fs.existsSync(dir)) return results;
        const list = fs.readdirSync(dir);
        for (const file of list) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
          } else if (/(\.tf|\.yml|\.yaml|\.env)$/.test(file)) {
            results.push(fullPath);
          }
        }
        return results;
      };
      return walk("infra");
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

  async validateAWS() {
    console.log("Checking AWS Configuration...");
    try {
      // Check AWS CLI configuration
      const awsConfig = this.checkAWSConfig();
      if (awsConfig) {
        await this.validateAWSResources();
      }
  // Scan for secrets
  await this.scanForSecrets();
  // Check for vulnerable dependencies
  await this.checkVulnerableDependencies();
    } catch (error) {
      this.results.failed.push("AWS validation failed: " + error.message);
    }
  }

  checkAWSConfig() {
    try {
      execSync("aws configure list");
      this.results.passed.push("AWS CLI configured");
      return true;
    } catch (error) {
      this.results.warnings.push("AWS CLI not configured or credentials missing");
      return false;
    }
  }

  async validateAWSResources() {
    // Check VPC configuration
    await this.validateAWSVPC();
    // Check security groups
    await this.validateAWSSecurityGroups();
    // Check IAM policies
    await this.validateAWSIAM();
    // Check encryption
    await this.validateAWSEncryption();
  }

  async validateAWSVPC() {
    try {
      // Check VPC settings
      const vpcCommand = "aws ec2 describe-vpcs";
      const vpcs = JSON.parse(execSync(vpcCommand).toString());

      vpcs.Vpcs.forEach((vpc) => {
        if (vpc.Tags && vpc.Tags.some((tag) => tag.Key === "Environment")) {
          this.results.passed.push(`VPC ${vpc.VpcId} properly tagged`);
        } else {
          this.results.warnings.push(`VPC ${vpc.VpcId} missing environment tag`);
        }
      });
    } catch (error) {
      this.results.failed.push("VPC validation failed: " + error.message);
    }
  }

  async validateAWSSecurityGroups() {
    try {
      // Check security group rules
      const sgCommand = "aws ec2 describe-security-groups";
      const sgs = JSON.parse(execSync(sgCommand).toString());

      sgs.SecurityGroups.forEach((sg) => {
        // Check for overly permissive rules
        const hasOpenRules = sg.IpPermissions.some((perm) =>
          perm.IpRanges.some((range) => range.CidrIp === "0.0.0.0/0" && perm.FromPort === 0)
        );

        if (hasOpenRules) {
          this.results.warnings.push(`Security Group ${sg.GroupId} has overly permissive rules`);
        } else {
          this.results.passed.push(`Security Group ${sg.GroupId} has proper restrictions`);
        }
      });
    } catch (error) {
      this.results.failed.push("Security group validation failed: " + error.message);
    }
  }

  async validateAzure() {
    console.log("Checking Azure Configuration...");
    try {
      // Check Azure CLI configuration
      const azureConfig = this.checkAzureConfig();
      if (azureConfig) {
        await this.validateAzureResources();
      }
    } catch (error) {
      this.results.failed.push("Azure validation failed: " + error.message);
    }
  }

  checkAzureConfig() {
    try {
      execSync("az account show");
      this.results.passed.push("Azure CLI configured");
      return true;
    } catch (error) {
      this.results.warnings.push("Azure CLI not configured or credentials missing");
      return false;
    }
  }

  async validateAzureResources() {
    // Check VNET configuration
    await this.validateAzureVNET();
    // Check NSG rules
    await this.validateAzureNSG();
    // Check RBAC
    await this.validateAzureRBAC();
    // Check encryption
    await this.validateAzureEncryption();
  }

  async validateGCP() {
    console.log("Checking GCP Configuration...");
    try {
      // Check GCloud CLI configuration
      const gcpConfig = this.checkGCPConfig();
      if (gcpConfig) {
        await this.validateGCPResources();
      }
    } catch (error) {
      this.results.failed.push("GCP validation failed: " + error.message);
    }
  }

  checkGCPConfig() {
    try {
      execSync("gcloud config list");
      this.results.passed.push("GCloud CLI configured");
      return true;
    } catch (error) {
      this.results.warnings.push("GCloud CLI not configured or credentials missing");
      return false;
    }
  }

  async validateGCPResources() {
    // Check VPC configuration
    await this.validateGCPVPC();
    // Check firewall rules
    await this.validateGCPFirewall();
    // Check IAM
    await this.validateGCPIAM();
    // Check encryption
    await this.validateGCPEncryption();
  }

  async validateMultiCloud() {
    console.log("Validating Multi-Cloud Configuration...");
    try {
      // Check for consistent tagging across providers
      await this.validateCrossCloudTags();
      // Check for proper DNS configuration
      await this.validateCrossCloudDNS();
      // Check for proper networking
      await this.validateCrossCloudNetworking();
    } catch (error) {
      this.results.failed.push("Multi-cloud validation failed: " + error.message);
    }
  }

  async validateCrossCloudTags() {
    // Check for consistent resource tagging across clouds
    const requiredTags = ["Environment", "Application", "Owner", "CostCenter"];

    try {
      // AWS Tags
      const awsResources = JSON.parse(
        execSync("aws resourcegroupstaggingapi get-resources").toString()
      );
      // Azure Tags
      const azureResources = JSON.parse(execSync("az tag list").toString());
      // GCP Labels
      const gcpResources = JSON.parse(
        execSync("gcloud resource-manager tags list --format=json").toString()
      );

      // Validate tag consistency
      this.validateTagConsistency(requiredTags, awsResources, azureResources, gcpResources);
    } catch (error) {
      this.results.warnings.push("Cross-cloud tag validation failed: " + error.message);
    }
  }

  validateTagConsistency(requiredTags, awsResources, azureResources, gcpResources) {
    // Implementation would check for tag presence and consistency across providers
    this.results.warnings.push(
      "Manual verification required: Check tag consistency across cloud providers"
    );
  }

  async validateCostOptimization() {
    console.log("Checking Cost Optimization...");
    try {
      // Check for unused resources
      await this.checkUnusedResources();
      // Check for right-sizing opportunities
      await this.checkResourceSizing();
      // Check for reserved instance coverage
      await this.checkReservedInstances();
    } catch (error) {
      this.results.failed.push("Cost optimization validation failed: " + error.message);
    }
  }

  async validateCompliance() {
    console.log("Checking Compliance Requirements...");
    try {
      // Check encryption settings
      await this.validateEncryption();
      // Check access controls
      await this.validateAccessControls();
      // Check audit logging
      await this.validateAuditLogging();
    } catch (error) {
      this.results.failed.push("Compliance validation failed: " + error.message);
    }
  }

  async runAllChecks() {
    console.log("Starting Cloud Infrastructure Validation...\n");

    await this.validateAWS();
    await this.validateAzure();
    await this.validateGCP();
    await this.validateMultiCloud();
    await this.validateCostOptimization();
    await this.validateCompliance();
    await this.validateCloudSecurity();
    await this.validateGovernanceAndTraining();

    this.printResults();
  }

  async validateCloudSecurity() {
    console.log("Checking Cloud Security Controls...");
    try {
      await this.validateCWPP();
      await this.validateCSPM();
      await this.validateCloudCompliance();
    } catch (error) {
      this.results.failed.push("Cloud security validation failed: " + error.message);
    }
  }

  async validateCWPP() {
    console.log("Checking Cloud Workload Protection Platform (CWPP)...");
    const cwppConfigs = [
      "config/cwpp-config.yml",
      "security/workload-protection.json",
      ".github/workflows/cwpp-scan.yml"
    ];
    for (const config of cwppConfigs) {
      if (fs.existsSync(config)) {
        this.results.passed.push(`CWPP configuration found: ${config}`);
      } else {
        this.results.warnings.push(`Missing CWPP configuration: ${config}`);
      }
    }
  }

  async validateCSPM() {
    console.log("Checking Cloud Security Posture Management (CSPM)...");
    const cspmConfigs = [
      "config/cspm-config.yml",
      "security/posture-monitoring.json",
      "terraform/security-monitoring.tf"
    ];
    for (const config of cspmConfigs) {
      if (fs.existsSync(config)) {
        this.results.passed.push(`CSPM configuration found: ${config}`);
      } else {
        this.results.warnings.push(`Missing CSPM configuration: ${config}`);
      }
    }
  }

  async validateCloudCompliance() {
    console.log("Checking Automated Security Compliance Checks...");
    const complianceConfigs = [
      ".github/workflows/compliance-check.yml",
      "config/compliance-rules.json",
      "security/compliance-automation.yml"
    ];
    for (const config of complianceConfigs) {
      if (fs.existsSync(config)) {
        this.results.passed.push(`Compliance automation found: ${config}`);
      } else {
        this.results.warnings.push(`Missing compliance automation: ${config}`);
      }
    }
  }

  printResults() {
    console.log("\nCloud Infrastructure Validation Results:");
    console.log("======================================\n");

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
  const validator = new CloudValidator();
  validator.runAllChecks().catch((error) => {
    console.error("Validation failed:", error);
    process.exit(1);
  });
}

module.exports = CloudValidator;
