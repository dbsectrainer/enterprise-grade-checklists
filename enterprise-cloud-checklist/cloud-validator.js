#!/usr/bin/env node

/**
 * Cloud Infrastructure Validator
 * Validates cloud infrastructure configurations across multiple providers
 */

const fs = require('fs');
const { execSync } = require('child_process');
const yaml = require('js-yaml');

class CloudValidator {
    constructor() {
        this.results = {
            passed: [],
            failed: [],
            warnings: [],
            notChecked: []
        };
    }

    async validateAWS() {
        console.log('Checking AWS Configuration...');
        try {
            // Check AWS CLI configuration
            const awsConfig = this.checkAWSConfig();
            if (awsConfig) {
                await this.validateAWSResources();
            }
        } catch (error) {
            this.results.failed.push('AWS validation failed: ' + error.message);
        }
    }

    checkAWSConfig() {
        try {
            execSync('aws configure list');
            this.results.passed.push('AWS CLI configured');
            return true;
        } catch (error) {
            this.results.warnings.push('AWS CLI not configured or credentials missing');
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
            const vpcCommand = 'aws ec2 describe-vpcs';
            const vpcs = JSON.parse(execSync(vpcCommand).toString());
            
            vpcs.Vpcs.forEach(vpc => {
                if (vpc.Tags && vpc.Tags.some(tag => tag.Key === 'Environment')) {
                    this.results.passed.push(`VPC ${vpc.VpcId} properly tagged`);
                } else {
                    this.results.warnings.push(`VPC ${vpc.VpcId} missing environment tag`);
                }
            });
        } catch (error) {
            this.results.failed.push('VPC validation failed: ' + error.message);
        }
    }

    async validateAWSSecurityGroups() {
        try {
            // Check security group rules
            const sgCommand = 'aws ec2 describe-security-groups';
            const sgs = JSON.parse(execSync(sgCommand).toString());
            
            sgs.SecurityGroups.forEach(sg => {
                // Check for overly permissive rules
                const hasOpenRules = sg.IpPermissions.some(
                    perm => perm.IpRanges.some(
                        range => range.CidrIp === '0.0.0.0/0' && perm.FromPort === 0
                    )
                );
                
                if (hasOpenRules) {
                    this.results.warnings.push(`Security Group ${sg.GroupId} has overly permissive rules`);
                } else {
                    this.results.passed.push(`Security Group ${sg.GroupId} has proper restrictions`);
                }
            });
        } catch (error) {
            this.results.failed.push('Security group validation failed: ' + error.message);
        }
    }

    async validateAzure() {
        console.log('Checking Azure Configuration...');
        try {
            // Check Azure CLI configuration
            const azureConfig = this.checkAzureConfig();
            if (azureConfig) {
                await this.validateAzureResources();
            }
        } catch (error) {
            this.results.failed.push('Azure validation failed: ' + error.message);
        }
    }

    checkAzureConfig() {
        try {
            execSync('az account show');
            this.results.passed.push('Azure CLI configured');
            return true;
        } catch (error) {
            this.results.warnings.push('Azure CLI not configured or credentials missing');
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
        console.log('Checking GCP Configuration...');
        try {
            // Check GCloud CLI configuration
            const gcpConfig = this.checkGCPConfig();
            if (gcpConfig) {
                await this.validateGCPResources();
            }
        } catch (error) {
            this.results.failed.push('GCP validation failed: ' + error.message);
        }
    }

    checkGCPConfig() {
        try {
            execSync('gcloud config list');
            this.results.passed.push('GCloud CLI configured');
            return true;
        } catch (error) {
            this.results.warnings.push('GCloud CLI not configured or credentials missing');
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
        console.log('Validating Multi-Cloud Configuration...');
        try {
            // Check for consistent tagging across providers
            await this.validateCrossCloudTags();
            // Check for proper DNS configuration
            await this.validateCrossCloudDNS();
            // Check for proper networking
            await this.validateCrossCloudNetworking();
        } catch (error) {
            this.results.failed.push('Multi-cloud validation failed: ' + error.message);
        }
    }

    async validateCrossCloudTags() {
        // Check for consistent resource tagging across clouds
        const requiredTags = ['Environment', 'Application', 'Owner', 'CostCenter'];
        
        try {
            // AWS Tags
            const awsResources = JSON.parse(execSync('aws resourcegroupstaggingapi get-resources').toString());
            // Azure Tags
            const azureResources = JSON.parse(execSync('az tag list').toString());
            // GCP Labels
            const gcpResources = JSON.parse(execSync('gcloud resource-manager tags list --format=json').toString());
            
            // Validate tag consistency
            this.validateTagConsistency(requiredTags, awsResources, azureResources, gcpResources);
        } catch (error) {
            this.results.warnings.push('Cross-cloud tag validation failed: ' + error.message);
        }
    }

    validateTagConsistency(requiredTags, awsResources, azureResources, gcpResources) {
        // Implementation would check for tag presence and consistency across providers
        this.results.warnings.push('Manual verification required: Check tag consistency across cloud providers');
    }

    async validateCostOptimization() {
        console.log('Checking Cost Optimization...');
        try {
            // Check for unused resources
            await this.checkUnusedResources();
            // Check for right-sizing opportunities
            await this.checkResourceSizing();
            // Check for reserved instance coverage
            await this.checkReservedInstances();
        } catch (error) {
            this.results.failed.push('Cost optimization validation failed: ' + error.message);
        }
    }

    async validateCompliance() {
        console.log('Checking Compliance Requirements...');
        try {
            // Check encryption settings
            await this.validateEncryption();
            // Check access controls
            await this.validateAccessControls();
            // Check audit logging
            await this.validateAuditLogging();
        } catch (error) {
            this.results.failed.push('Compliance validation failed: ' + error.message);
        }
    }

    async runAllChecks() {
        console.log('Starting Cloud Infrastructure Validation...\n');
        
        await this.validateAWS();
        await this.validateAzure();
        await this.validateGCP();
        await this.validateMultiCloud();
        await this.validateCostOptimization();
        await this.validateCompliance();
        
        this.printResults();
    }

    printResults() {
        console.log('\nCloud Infrastructure Validation Results:');
        console.log('======================================\n');

        console.log('Passed Checks:');
        this.results.passed.forEach(item => console.log('✅ ' + item));

        console.log('\nFailed Checks:');
        this.results.failed.forEach(item => console.log('❌ ' + item));

        console.log('\nWarnings:');
        this.results.warnings.forEach(item => console.log('⚠️  ' + item));

        console.log('\nNot Checked:');
        this.results.notChecked.forEach(item => console.log('❓ ' + item));
    }
}

// Run the validator if this script is executed directly
if (require.main === module) {
    const validator = new CloudValidator();
    validator.runAllChecks().catch(error => {
        console.error('Validation failed:', error);
        process.exit(1);
    });
}

module.exports = CloudValidator;
