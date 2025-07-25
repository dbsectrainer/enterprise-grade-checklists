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
            notChecked: []
        };
    }

    async validateCICD() {
        console.log("Checking CI/CD Configuration...");
        try {
            // Check common CI/CD config files
            const configFiles = [
                ".github/workflows",
                ".gitlab-ci.yml",
                "Jenkinsfile",
                "azure-pipelines.yml"
            ];

            for (const config of configFiles) {
                if (fs.existsSync(config)) {
                    await this.validatePipelineConfig(config);
                }
            }
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
            this.results.failed.push(`Pipeline config validation failed for ${configPath}: ${error.message}`);
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
            Object.keys(workflow.jobs).forEach(job => stages.add(job.toLowerCase()));
        } else if (workflow.stages) {
            // GitLab CI format
            workflow.stages.forEach(stage => stages.add(stage.toLowerCase()));
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
            const iacFiles = [
                "terraform",
                "cloudformation",
                "kubernetes",
                "ansible"
            ];

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
            const monitoringTools = [
                "prometheus",
                "grafana",
                "elasticsearch",
                "datadog"
            ];

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
        
        this.printResults();
    }

    printResults() {
        console.log("\nDevOps Validation Results:");
        console.log("==========================\n");

        console.log("Passed Checks:");
        this.results.passed.forEach(item => console.log("✅ " + item));

        console.log("\nFailed Checks:");
        this.results.failed.forEach(item => console.log("❌ " + item));

        console.log("\nWarnings:");
        this.results.warnings.forEach(item => console.log("⚠️  " + item));

        console.log("\nNot Checked:");
        this.results.notChecked.forEach(item => console.log("❓ " + item));
    }
}

// Run the validator if this script is executed directly
if (require.main === module) {
    const validator = new DevOpsValidator();
    validator.runAllChecks().catch(error => {
        console.error("Validation failed:", error);
        process.exit(1);
    });
}

module.exports = DevOpsValidator;
