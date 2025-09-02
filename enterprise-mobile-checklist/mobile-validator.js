#!/usr/bin/env node

/**
 * Mobile Development Validator
 * Validates mobile applications for performance, security, and platform requirements
 */

const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");
const xml2js = require("xml2js");

class MobileValidator {
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
      "docs/training/mobile-training.md",
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
    console.log("Scanning for secrets in mobile source/config files...");
    const secretPatterns = [
      /api[_-]?key\s*[:=]\s*['\"][A-Za-z0-9\-_]{16,}/i,
      /secret\s*[:=]\s*['\"][A-Za-z0-9\-_]{8,}/i,
      /password\s*[:=]\s*['\"][^'\"]{6,}/i,
      /token\s*[:=]\s*['\"][A-Za-z0-9\-_]{16,}/i,
    ];
    const files = this.getMobileFiles();
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          this.results.failed.push(`Potential secret found in ${file}`);
        }
      }
    }
  }

  getMobileFiles() {
    // Recursively get all .js, .ts, .env, .xml files in ios/, android/, and config/
    const walk = (dir) => {
      let results = [];
      if (!fs.existsSync(dir)) return results;
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(walk(fullPath));
        } else if (/(\.js|\.ts|\.env|\.xml)$/.test(file)) {
          results.push(fullPath);
        }
      }
      return results;
    };
    return walk("ios").concat(walk("android")).concat(walk("config"));
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

  async validateIOS() {
    console.log("Checking iOS Configuration...");
    try {
      // Check Xcode project settings
      await this.checkXcodeSettings();
      // Check iOS capabilities
      await this.checkIOSCapabilities();
      // Check code signing
      await this.checkCodeSigning();
      // Scan for secrets
      await this.scanForSecrets();
      // Check for vulnerable dependencies
      await this.checkVulnerableDependencies();
    } catch (error) {
      this.results.failed.push("iOS validation failed: " + error.message);
    }
  }

  async checkXcodeSettings() {
    try {
      const pbxproj = fs.readFileSync("ios/YourApp.xcodeproj/project.pbxproj", "utf8");

      // Check deployment target
      if (pbxproj.includes("IPHONEOS_DEPLOYMENT_TARGET = 12.0")) {
        this.results.passed.push("iOS deployment target is set correctly");
      } else {
        this.results.warnings.push("iOS deployment target may need updating");
      }

      // Check build settings
      this.checkBuildSettings(pbxproj);
    } catch (error) {
      this.results.failed.push("Xcode settings check failed: " + error.message);
    }
  }

  async checkIOSCapabilities() {
    try {
      const entitlements = fs.readFileSync("ios/YourApp/YourApp.entitlements", "utf8");

      // Check required capabilities
      const requiredCapabilities = [
        "com.apple.security.application-groups",
        "com.apple.developer.associated-domains",
      ];

      for (const capability of requiredCapabilities) {
        if (entitlements.includes(capability)) {
          this.results.passed.push(`iOS capability found: ${capability}`);
        } else {
          this.results.warnings.push(`Missing iOS capability: ${capability}`);
        }
      }
    } catch (error) {
      this.results.warnings.push("iOS capabilities check failed: " + error.message);
    }
  }

  async validateAndroid() {
    console.log("Checking Android Configuration...");
    try {
      // Check Gradle settings
      await this.checkGradleSettings();
      // Check Android Manifest
      await this.checkAndroidManifest();
      // Check ProGuard rules
      await this.checkProGuardRules();
    } catch (error) {
      this.results.failed.push("Android validation failed: " + error.message);
    }
  }

  async checkGradleSettings() {
    try {
      const buildGradle = fs.readFileSync("android/app/build.gradle", "utf8");

      // Check SDK versions
      if (buildGradle.includes("minSdkVersion 21")) {
        this.results.passed.push("Android minimum SDK version is set correctly");
      } else {
        this.results.warnings.push("Android minimum SDK version may need updating");
      }

      // Check dependencies
      this.checkAndroidDependencies(buildGradle);
    } catch (error) {
      this.results.failed.push("Gradle settings check failed: " + error.message);
    }
  }

  async checkAndroidManifest() {
    try {
      const manifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(manifest);

      // Check permissions
      const permissions = result.manifest.uses - permission || [];
      const requiredPermissions = [
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
      ];

      for (const permission of requiredPermissions) {
        if (permissions.some((p) => p.$["android:name"] === permission)) {
          this.results.passed.push(`Android permission found: ${permission}`);
        } else {
          this.results.warnings.push(`Missing Android permission: ${permission}`);
        }
      }
    } catch (error) {
      this.results.failed.push("Android manifest check failed: " + error.message);
    }
  }

  async validatePerformance() {
    console.log("Checking Performance Metrics...");
    try {
      // Check bundle size
      await this.checkBundleSize();
      // Check image optimization
      await this.checkImageOptimization();
      // Check native module performance
      await this.checkNativeModules();
    } catch (error) {
      this.results.failed.push("Performance validation failed: " + error.message);
    }
  }

  async checkBundleSize() {
    try {
      // Check iOS bundle
      const iosSize = fs.statSync(
        "ios/build/Build/Products/Release-iphonesimulator/YourApp.app"
      ).size;
      const maxIOSSize = 100 * 1024 * 1024; // 100MB

      if (iosSize <= maxIOSSize) {
        this.results.passed.push("iOS bundle size within limits");
      } else {
        this.results.warnings.push("iOS bundle size exceeds recommended limit");
      }

      // Check Android bundle
      const apkSize = fs.statSync("android/app/build/outputs/apk/release/app-release.apk").size;
      const maxAPKSize = 100 * 1024 * 1024; // 100MB

      if (apkSize <= maxAPKSize) {
        this.results.passed.push("Android bundle size within limits");
      } else {
        this.results.warnings.push("Android bundle size exceeds recommended limit");
      }
    } catch (error) {
      this.results.warnings.push("Bundle size check failed: " + error.message);
    }
  }

  async validateSecurity() {
    console.log("Checking Security Controls...");
    try {
      // Check SSL pinning
      await this.checkSSLPinning();
      // Check root detection
      await this.checkRootDetection();
      // Check data encryption
      await this.checkDataEncryption();
      // Check mobile-specific security
      await this.validateMobileSecurityTesting();
      await this.validateRASP();
      await this.validateMobileThreatDetection();
      await this.validateAppShielding();
    } catch (error) {
      this.results.failed.push("Security validation failed: " + error.message);
    }
  }

  async validateMobileSecurityTesting() {
    console.log("Checking Mobile App Security Testing (MAST)...");
    try {
      // Check for mobile security testing configurations
      const securityConfigs = [
        ".github/workflows/mobile-security.yml",
        "security/mobile-security.json",
        "config/mobile-testing.yml",
      ];
      for (const config of securityConfigs) {
        if (fs.existsSync(config)) {
          this.results.passed.push(`Mobile security testing config found: ${config}`);
        } else {
          this.results.warnings.push(`Missing mobile security testing config: ${config}`);
        }
      }
    } catch (error) {
      this.results.failed.push("MAST validation failed: " + error.message);
    }
  }

  async validateRASP() {
    console.log("Checking Runtime Application Self-Protection (RASP)...");
    try {
      // Check for RASP implementation
      const raspFiles = [
        "ios/YourApp/RASP.swift",
        "android/app/src/main/java/com/yourapp/RASP.java",
        "src/security/rasp.js",
      ];
      let raspFound = false;
      for (const file of raspFiles) {
        if (fs.existsSync(file)) {
          this.results.passed.push(`RASP implementation found: ${file}`);
          raspFound = true;
        }
      }
      if (!raspFound) {
        this.results.warnings.push("No RASP implementation found");
      }
    } catch (error) {
      this.results.failed.push("RASP validation failed: " + error.message);
    }
  }

  async validateMobileThreatDetection() {
    console.log("Checking Mobile Threat Detection...");
    try {
      // Check for root/jailbreak detection
      const threatDetectionFiles = [
        "ios/YourApp/JailbreakDetection.swift",
        "android/app/src/main/java/com/yourapp/RootDetection.java",
      ];
      for (const file of threatDetectionFiles) {
        if (fs.existsSync(file)) {
          this.results.passed.push(`Threat detection found: ${file}`);
        } else {
          this.results.warnings.push(`Missing threat detection: ${file}`);
        }
      }
    } catch (error) {
      this.results.failed.push("Mobile threat detection validation failed: " + error.message);
    }
  }

  async validateAppShielding() {
    console.log("Checking App Shielding & Obfuscation...");
    try {
      // Check for obfuscation in build configs
      const buildGradle = fs.existsSync("android/app/build.gradle")
        ? fs.readFileSync("android/app/build.gradle", "utf8")
        : "";

      if (buildGradle.includes("minifyEnabled true") || buildGradle.includes("proguardFiles")) {
        this.results.passed.push("Android obfuscation configured");
      } else {
        this.results.warnings.push("No Android obfuscation found");
      }

      // Check iOS obfuscation
      if (fs.existsSync("ios/obfuscation-config.yml")) {
        this.results.passed.push("iOS obfuscation config found");
      } else {
        this.results.warnings.push("No iOS obfuscation config found");
      }
    } catch (error) {
      this.results.failed.push("App shielding validation failed: " + error.message);
    }
  }

  async checkSSLPinning() {
    try {
      // Check iOS SSL pinning
      const iosNetworkConfig = fs.readFileSync("ios/YourApp/NetworkConfig.swift", "utf8");
      if (iosNetworkConfig.includes("SSLPinningMode")) {
        this.results.passed.push("iOS SSL pinning configured");
      } else {
        this.results.warnings.push("iOS SSL pinning not found");
      }

      // Check Android SSL pinning
      const androidNetworkConfig = fs.readFileSync(
        "android/app/src/main/java/com/yourapp/NetworkConfig.java",
        "utf8"
      );
      if (androidNetworkConfig.includes("CertificatePinner")) {
        this.results.passed.push("Android SSL pinning configured");
      } else {
        this.results.warnings.push("Android SSL pinning not found");
      }
    } catch (error) {
      this.results.warnings.push("SSL pinning check failed: " + error.message);
    }
  }

  async validateAccessibility() {
    console.log("Checking Accessibility Support...");
    try {
      // Check iOS accessibility
      await this.checkIOSAccessibility();
      // Check Android accessibility
      await this.checkAndroidAccessibility();
    } catch (error) {
      this.results.failed.push("Accessibility validation failed: " + error.message);
    }
  }

  async checkIOSAccessibility() {
    try {
      const sourceFiles = this.findSourceFiles("ios", ".swift");
      let hasAccessibilityLabels = false;

      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, "utf8");
        if (content.includes("accessibilityLabel") || content.includes("accessibilityHint")) {
          hasAccessibilityLabels = true;
          break;
        }
      }

      if (hasAccessibilityLabels) {
        this.results.passed.push("iOS accessibility labels found");
      } else {
        this.results.warnings.push("No iOS accessibility labels found");
      }
    } catch (error) {
      this.results.warnings.push("iOS accessibility check failed: " + error.message);
    }
  }

  findSourceFiles(directory, extension) {
    const files = [];
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.findSourceFiles(fullPath, extension));
      } else if (entry.isFile() && entry.name.endsWith(extension)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  async runAllChecks() {
    console.log("Starting Mobile Development Validation...\n");

    await this.validateIOS();
    await this.validateAndroid();
    await this.validatePerformance();
    await this.validateSecurity();
    await this.validateAccessibility();
    await this.validateGovernanceAndTraining();

    this.printResults();
  }

  printResults() {
    console.log("\nMobile Development Validation Results:");
    console.log("====================================\n");

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
  const validator = new MobileValidator();
  validator.runAllChecks().catch((error) => {
    console.error("Validation failed:", error);
    process.exit(1);
  });
}

module.exports = MobileValidator;
