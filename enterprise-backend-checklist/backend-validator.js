#!/usr/bin/env node

/**
 * Backend Development Validator
 * Validates backend systems for API design, database optimization, and security controls
 */

const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");
const yaml = require("js-yaml");

class BackendValidator {
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
      "docs/training/backend-training.md",
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

  async validateAPI() {
    console.log("Checking API Design...");
    try {
      // Check OpenAPI/Swagger documentation
      await this.checkAPIDocumentation();
      // Check API endpoints
      await this.checkAPIEndpoints();
      // Check rate limiting
      await this.checkRateLimiting();
      // Scan for secrets
      await this.scanForSecrets();
      // Check for vulnerable dependencies
      await this.checkVulnerableDependencies();
    } catch (error) {
      this.results.failed.push("API validation failed: " + error.message);
    }
  }

  async checkAPIDocumentation() {
    try {
      const swaggerPath = "src/swagger.yaml";
      if (fs.existsSync(swaggerPath)) {
        const swagger = yaml.load(fs.readFileSync(swaggerPath, "utf8"));
        this.validateSwaggerSpec(swagger);
      } else {
        this.results.warnings.push("No OpenAPI/Swagger documentation found");
      }
    } catch (error) {
      this.results.failed.push("API documentation check failed: " + error.message);
    }
  }

  validateSwaggerSpec(swagger) {
    // Check API versioning
    if (swagger.info && swagger.info.version) {
      this.results.passed.push("API versioning implemented");
    } else {
      this.results.warnings.push("API versioning not found");
    }

    // Check security definitions
    if (swagger.components && swagger.components.securitySchemes) {
      this.results.passed.push("Security schemes defined");
    } else {
      this.results.warnings.push("No security schemes defined");
    }

    // Check response schemas
    let hasResponseSchemas = false;
    for (const path in swagger.paths) {
      for (const method in swagger.paths[path]) {
        const operation = swagger.paths[path][method];
        if (operation.responses && Object.keys(operation.responses).length > 0) {
          hasResponseSchemas = true;
          break;
        }
      }
    }

    if (hasResponseSchemas) {
      this.results.passed.push("Response schemas defined");
    } else {
      this.results.warnings.push("No response schemas found");
    }
  }

  async validateDatabase() {
    console.log("Checking Database Configuration...");
    try {
      // Check database schema
      await this.checkDatabaseSchema();
      // Check indexes
      await this.checkDatabaseIndexes();
      // Check query performance
      await this.checkQueryPerformance();
    } catch (error) {
      this.results.failed.push("Database validation failed: " + error.message);
    }
  }

  async checkDatabaseSchema() {
    try {
      const prismaSchema = fs.readFileSync("prisma/schema.prisma", "utf8");

      // Check model definitions
      if (prismaSchema.includes("model")) {
        this.results.passed.push("Database models defined");
      } else {
        this.results.warnings.push("No database models found");
      }

      // Check relations
      if (prismaSchema.includes("@relation")) {
        this.results.passed.push("Model relations defined");
      } else {
        this.results.warnings.push("No model relations found");
      }

      // Check indexes
      if (prismaSchema.includes("@@index")) {
        this.results.passed.push("Database indexes defined");
      } else {
        this.results.warnings.push("No database indexes found");
      }
    } catch (error) {
      this.results.warnings.push("Database schema check failed: " + error.message);
    }
  }

  async validateSecurity() {
    console.log("Checking Security Controls...");
    try {
      // Check authentication
      await this.checkAuthentication();
      // Check authorization
      await this.checkAuthorization();
      // Check data validation
      await this.checkDataValidation();
    } catch (error) {
      this.results.failed.push("Security validation failed: " + error.message);
    }
  }

  async checkAuthentication() {
    try {
      const files = this.findSourceFiles("src", ".ts");
      let hasAuthImplementation = false;
      let hasJWTImplementation = false;

      for (const file of files) {
        const content = fs.readFileSync(file, "utf8");
        if (content.includes("@UseGuards") || content.includes("AuthGuard")) {
          hasAuthImplementation = true;
        }
        if (content.includes("jwt.verify") || content.includes("JwtService")) {
          hasJWTImplementation = true;
        }
      }

      if (hasAuthImplementation) {
        this.results.passed.push("Authentication guards implemented");
      } else {
        this.results.warnings.push("No authentication guards found");
      }

      if (hasJWTImplementation) {
        this.results.passed.push("JWT authentication implemented");
      } else {
        this.results.warnings.push("No JWT implementation found");
      }
    } catch (error) {
      this.results.warnings.push("Authentication check failed: " + error.message);
    }
  }

  async validatePerformance() {
    console.log("Checking Performance Optimizations...");
    try {
      // Check caching implementation
      await this.checkCaching();
      // Check connection pooling
      await this.checkConnectionPooling();
      // Check query optimization
      await this.checkQueryOptimization();
    } catch (error) {
      this.results.failed.push("Performance validation failed: " + error.message);
    }
  }

  async checkCaching() {
    try {
      const files = this.findSourceFiles("src", ".ts");
      let hasCacheImplementation = false;
      let hasRedisImplementation = false;

      for (const file of files) {
        const content = fs.readFileSync(file, "utf8");
        if (content.includes("@CacheInterceptor") || content.includes("CacheModule")) {
          hasCacheImplementation = true;
        }
        if (content.includes("Redis") || content.includes("RedisModule")) {
          hasRedisImplementation = true;
        }
      }

      if (hasCacheImplementation) {
        this.results.passed.push("Caching implemented");
      } else {
        this.results.warnings.push("No caching implementation found");
      }

      if (hasRedisImplementation) {
        this.results.passed.push("Redis caching implemented");
      } else {
        this.results.warnings.push("No Redis implementation found");
      }
    } catch (error) {
      this.results.warnings.push("Cache check failed: " + error.message);
    }
  }

  async validateErrorHandling() {
    console.log("Checking Error Handling...");
    try {
      // Check global error handling
      await this.checkGlobalErrorHandler();
      // Check domain error handling
      await this.checkDomainErrors();
      // Check validation pipes
      await this.checkValidationPipes();
    } catch (error) {
      this.results.failed.push("Error handling validation failed: " + error.message);
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
    console.log("Starting Backend Development Validation...\n");

    await this.validateAPI();
    await this.validateDatabase();
    await this.validateSecurity();
    await this.validatePerformance();
    await this.validateErrorHandling();
    await this.validateBackendSecurity();
    await this.validateGovernanceAndTraining();

    this.printResults();
  }

  async validateBackendSecurity() {
    console.log("Checking Backend Security Controls...");
    try {
      await this.validateSecretsManagement();
      await this.validateSecurityHeaders();
      await this.validateAuditLogging();
    } catch (error) {
      this.results.failed.push("Backend security validation failed: " + error.message);
    }
  }

  async validateSecretsManagement() {
    console.log("Checking Secrets Management Integration...");
    const secretsFiles = ["config/secrets.yml", "src/config/vault.js", ".env.example"];
    for (const file of secretsFiles) {
      if (fs.existsSync(file)) {
        this.results.passed.push(`Secrets management config found: ${file}`);
      } else {
        this.results.warnings.push(`Missing secrets management config: ${file}`);
      }
    }
  }

  async validateSecurityHeaders() {
    console.log("Checking Security Headers Implementation...");
    const securityFiles = ["src/middleware/security.js", "config/security-headers.json"];
    for (const file of securityFiles) {
      if (fs.existsSync(file)) {
        this.results.passed.push(`Security headers implementation found: ${file}`);
      } else {
        this.results.warnings.push(`Missing security headers implementation: ${file}`);
      }
    }
  }

  async validateAuditLogging() {
    console.log("Checking Comprehensive Audit Logging...");
    const auditFiles = [
      "src/middleware/audit.js",
      "config/logging.yml",
      "src/utils/security-logger.js",
    ];
    for (const file of auditFiles) {
      if (fs.existsSync(file)) {
        this.results.passed.push(`Audit logging implementation found: ${file}`);
      } else {
        this.results.warnings.push(`Missing audit logging implementation: ${file}`);
      }
    }
  }

  printResults() {
    console.log("\nBackend Development Validation Results:");
    console.log("=====================================\n");

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
  const validator = new BackendValidator();
  validator.runAllChecks().catch((error) => {
    console.error("Validation failed:", error);
    process.exit(1);
  });
}

module.exports = BackendValidator;
