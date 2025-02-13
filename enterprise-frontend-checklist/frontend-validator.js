#!/usr/bin/env node

/**
 * Frontend Checklist Validator
 * Validates frontend application for performance, accessibility, and best practices
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const lighthouse = require('lighthouse');
const puppeteer = require('puppeteer');
const axe = require('axe-core');

class FrontendValidator {
    constructor() {
        this.results = {
            passed: [],
            failed: [],
            warnings: [],
            notChecked: []
        };
    }

    async validatePerformance() {
        console.log('Checking Performance Metrics...');
        try {
            // Run Lighthouse performance audit
            const performanceMetrics = await this.runLighthouseAudit();
            await this.validatePerformanceMetrics(performanceMetrics);
            
            // Check bundle size
            await this.checkBundleSize();
            
            // Check image optimization
            await this.checkImageOptimization();
        } catch (error) {
            this.results.failed.push('Performance validation failed: ' + error.message);
        }
    }

    async runLighthouseAudit() {
        try {
            const browser = await puppeteer.launch();
            const page = await browser.newPage();
            
            const results = await lighthouse(page, {
                onlyCategories: ['performance']
            });

            await browser.close();
            return results;
        } catch (error) {
            this.results.failed.push('Lighthouse audit failed: ' + error.message);
        }
    }

    async validatePerformanceMetrics(metrics) {
        const thresholds = {
            'first-contentful-paint': 1000,
            'largest-contentful-paint': 2500,
            'time-to-interactive': 3500,
            'cumulative-layout-shift': 0.1,
            'total-blocking-time': 300
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
            const stats = JSON.parse(fs.readFileSync('dist/stats.json', 'utf8'));
            const maxBundleSize = 244 * 1024; // 244KB threshold
            
            for (const asset of stats.assets) {
                if (asset.size > maxBundleSize) {
                    this.results.warnings.push(`Bundle ${asset.name} exceeds size threshold: ${asset.size} bytes`);
                } else {
                    this.results.passed.push(`Bundle ${asset.name} within size threshold: ${asset.size} bytes`);
                }
            }
        } catch (error) {
            this.results.warnings.push('Bundle size check failed: ' + error.message);
        }
    }

    async validateAccessibility() {
        console.log('Checking Accessibility...');
        try {
            // Run axe accessibility audit
            const accessibilityResults = await this.runAxeAudit();
            await this.validateAccessibilityResults(accessibilityResults);
            
            // Check semantic HTML
            await this.checkSemanticHTML();
            
            // Check ARIA attributes
            await this.checkARIAAttributes();
        } catch (error) {
            this.results.failed.push('Accessibility validation failed: ' + error.message);
        }
    }

    async runAxeAudit() {
        try {
            const browser = await puppeteer.launch();
            const page = await browser.newPage();
            
            await page.setContent(fs.readFileSync('dist/index.html', 'utf8'));
            const results = await axe.run(page);
            
            await browser.close();
            return results;
        } catch (error) {
            this.results.failed.push('Axe audit failed: ' + error.message);
        }
    }

    async validateAccessibilityResults(results) {
        if (results.violations.length === 0) {
            this.results.passed.push('No accessibility violations found');
        } else {
            results.violations.forEach(violation => {
                this.results.failed.push(`Accessibility violation: ${violation.help} - ${violation.description}`);
            });
        }
    }

    async validateBestPractices() {
        console.log('Checking Best Practices...');
        try {
            // Check code style
            await this.checkCodeStyle();
            
            // Check documentation
            await this.checkDocumentation();
            
            // Check testing coverage
            await this.checkTestCoverage();
        } catch (error) {
            this.results.failed.push('Best practices validation failed: ' + error.message);
        }
    }

    async checkCodeStyle() {
        try {
            execSync('npm run lint');
            this.results.passed.push('Code style validation passed');
        } catch (error) {
            this.results.failed.push('Code style validation failed: ' + error.message);
        }
    }

    async checkTestCoverage() {
        try {
            const coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
            const threshold = 80;
            
            if (coverage.total.lines.pct >= threshold) {
                this.results.passed.push(`Test coverage above threshold: ${coverage.total.lines.pct}%`);
            } else {
                this.results.failed.push(`Test coverage below threshold: ${coverage.total.lines.pct}%`);
            }
        } catch (error) {
            this.results.warnings.push('Test coverage check failed: ' + error.message);
        }
    }

    async validateSecurity() {
        console.log('Checking Security Controls...');
        try {
            // Check dependencies
            await this.checkDependencies();
            
            // Check CSP
            await this.checkContentSecurityPolicy();
            
            // Check XSS protection
            await this.checkXSSProtection();
        } catch (error) {
            this.results.failed.push('Security validation failed: ' + error.message);
        }
    }

    async checkDependencies() {
        try {
            execSync('npm audit');
            this.results.passed.push('Dependency security check passed');
        } catch (error) {
            this.results.failed.push('Dependency security check failed: ' + error.message);
        }
    }

    async checkContentSecurityPolicy() {
        try {
            const html = fs.readFileSync('dist/index.html', 'utf8');
            if (html.includes('content-security-policy')) {
                this.results.passed.push('CSP header found');
            } else {
                this.results.warnings.push('No CSP header found');
            }
        } catch (error) {
            this.results.warnings.push('CSP check failed: ' + error.message);
        }
    }

    async validateBuildOutput() {
        console.log('Checking Build Output...');
        try {
            // Check build artifacts
            await this.checkBuildArtifacts();
            
            // Check source maps
            await this.checkSourceMaps();
            
            // Check asset optimization
            await this.checkAssetOptimization();
        } catch (error) {
            this.results.failed.push('Build output validation failed: ' + error.message);
        }
    }

    async checkBuildArtifacts() {
        const requiredFiles = [
            'dist/index.html',
            'dist/main.js',
            'dist/styles.css'
        ];

        for (const file of requiredFiles) {
            if (fs.existsSync(file)) {
                this.results.passed.push(`Build artifact exists: ${file}`);
            } else {
                this.results.failed.push(`Missing build artifact: ${file}`);
            }
        }
    }

    async runAllChecks() {
        console.log('Starting Frontend Validation...\n');
        
        await this.validatePerformance();
        await this.validateAccessibility();
        await this.validateBestPractices();
        await this.validateSecurity();
        await this.validateBuildOutput();
        
        this.printResults();
    }

    printResults() {
        console.log('\nFrontend Validation Results:');
        console.log('===========================\n');

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
    const validator = new FrontendValidator();
    validator.runAllChecks().catch(error => {
        console.error('Validation failed:', error);
        process.exit(1);
    });
}

module.exports = FrontendValidator;
