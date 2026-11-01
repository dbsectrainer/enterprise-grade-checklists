// Enterprise Repository Validator
// Automated validation for GitHub repositories

class RepositoryValidator {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
      repository: null,
      timestamp: null,
      domains: [],
    };

    this.validationInProgress = false;

    this.domainValidators = {
      frontend: this.validateFrontend.bind(this),
      backend: this.validateBackend.bind(this),
      cloud: this.validateCloud.bind(this),
      data: this.validateData.bind(this),
      devops: this.validateDevOps.bind(this),
      mobile: this.validateMobile.bind(this),
      security: this.validateSecurity.bind(this),
      aiml: this.validateAIML.bind(this),
    };

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    const form = document.getElementById("validationForm");
    if (!form) return;

    form.addEventListener("submit", this.handleSubmit.bind(this));

    // Tab switching, including basic left/right keyboard support.
    const tabs = Array.from(document.querySelectorAll(".tab-btn"));
    tabs.forEach((btn, index) => {
      btn.addEventListener("click", () => this.switchTab(btn.dataset.tab));
      btn.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const next = tabs[(index + direction + tabs.length) % tabs.length];
        next.focus();
        this.switchTab(next.dataset.tab);
      });
    });

    // Export buttons
    document.getElementById("exportJsonBtn")?.addEventListener("click", () => this.exportJSON());
    document.getElementById("exportCsvBtn")?.addEventListener("click", () => this.exportCSV());
    document.getElementById("exportPdfBtn")?.addEventListener("click", () => this.exportPDF());
    document
      .getElementById("newValidationBtn")
      ?.addEventListener("click", () => this.resetValidation());

    const repoInput = document.getElementById("repoUrl");
    repoInput?.addEventListener("input", () => this.clearError());
  }

  async handleSubmit(event) {
    event.preventDefault();
    if (this.validationInProgress) return;

    this.clearError();

    const repoInput = document.getElementById("repoUrl");
    const repoUrl = repoInput.value.trim();
    const selectedDomains = Array.from(
      document.querySelectorAll('input[name="domain"]:checked')
    ).map((checkbox) => checkbox.value);
    const includeStandards = document.getElementById("includeStandards").checked;

    if (!repoUrl) {
      this.showError("Enter a public GitHub repository URL.", repoInput);
      return;
    }

    if (selectedDomains.length === 0) {
      this.showError(
        "Select at least one domain to validate.",
        document.querySelector('input[name="domain"]')
      );
      return;
    }

    const repoInfo = this.parseGitHubUrl(repoUrl);
    if (!repoInfo) {
      this.showError(
        "That does not look like a GitHub repository. Use https://github.com/owner/repository or github.com/owner/repository.",
        repoInput
      );
      return;
    }

    this.validationInProgress = true;
    this.showLoading(true);

    try {
      await this.runValidation(repoInfo, selectedDomains, includeStandards);
    } finally {
      this.validationInProgress = false;
    }
  }

  parseGitHubUrl(url) {
    return window.ValidatorUtils ? window.ValidatorUtils.parseGitHubUrl(url) : null;
  }

  showLoading(show) {
    document.querySelector(".validator-input").style.display = show ? "none" : "block";
    document.getElementById("loadingSection").style.display = show ? "block" : "none";
    document.getElementById("loadingSection").setAttribute("aria-busy", String(show));
    document.getElementById("resultsSection").style.display = "none";
    if (!show) {
      this.setProgress(0);
    }
  }

  setProgress(value) {
    const progressFill = document.getElementById("progressFill");
    const progressBar = progressFill?.closest(".progress-bar");
    if (progressFill) progressFill.style.width = `${value}%`;
    if (progressBar) progressBar.setAttribute("aria-valuenow", String(Math.round(value)));
  }

  showError(message, element = null) {
    const error = document.getElementById("formError");
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
    if (element && typeof element.focus === "function") {
      element.focus();
    }
  }

  clearError() {
    const error = document.getElementById("formError");
    if (!error) return;
    error.textContent = "";
    error.hidden = true;
  }

  async runValidation(repoInfo, domains, includeStandards) {
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
      repository: repoInfo,
      timestamp: new Date().toISOString(),
      domains: domains,
      includeStandards: includeStandards,
    };

    const loadingText = document.getElementById("loadingText");

    try {
      // Fetch repository data
      loadingText.textContent = "Fetching repository data...";
      this.setProgress(5);

      const repoData = await this.fetchRepositoryData(repoInfo);
      this.results.repositoryData = repoData;

      this.setProgress(30);

      // Run domain validations
      const totalDomains = domains.length;
      for (let i = 0; i < domains.length; i++) {
        const domain = domains[i];
        loadingText.textContent = `Validating ${domain}...`;
        this.setProgress(30 + ((i + 1) / totalDomains) * 60);

        await this.domainValidators[domain](repoData, includeStandards);
        await this.sleep(150);
      }

      this.setProgress(100);
      loadingText.textContent = "Generating report...";

      await this.sleep(150);
      this.showResults();
    } catch (error) {
      console.error("Validation error:", error);
      this.showLoading(false);
      this.showError(error.message || "Validation failed. Please try again.");
    }
  }

  async fetchRepositoryData(repoInfo) {
    const apiBase = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`;
    const apiHeaders = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    let repoResponse;
    try {
      repoResponse = await fetch(apiBase, { headers: apiHeaders });
    } catch {
      throw new Error(
        "Could not reach the GitHub API. Check your internet connection and try again."
      );
    }

    if (!repoResponse.ok) {
      throw new Error(this.describeGitHubError(repoResponse));
    }

    const repository = await repoResponse.json();

    // These facets are useful but not essential; fall back rather than failing the
    // whole run if GitHub returns a transient error for one of them.
    const [contentsValue, languagesValue] = await Promise.all([
      this.fetchJsonOr(apiBase + "/contents", apiHeaders, []),
      this.fetchJsonOr(apiBase + "/languages", apiHeaders, {}),
    ]);

    const contents = Array.isArray(contentsValue) ? contentsValue : [];
    const languages =
      languagesValue && typeof languagesValue === "object" && !Array.isArray(languagesValue)
        ? languagesValue
        : {};

    // Fetch the manifest once. Dependency checks reuse this parsed object instead of
    // requesting the same file for every domain (which also burns API quota).
    let packageJson = null;
    const packageFile = contents.find((file) => file && file.name === "package.json");
    if (packageFile && packageFile.download_url) {
      try {
        const packageResponse = await fetch(packageFile.download_url);
        if (packageResponse.ok) {
          packageJson = await packageResponse.json();
        }
      } catch {
        packageJson = null;
      }
    }

    return {
      repository,
      contents,
      languages,
      packageJson,
    };
  }

  async fetchJsonOr(url, headers, fallback) {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) return fallback;
      return await response.json();
    } catch {
      return fallback;
    }
  }

  describeGitHubError(response) {
    if (response.status === 404) {
      return "Repository not found. Check the URL and confirm that the repository is public.";
    }

    if (response.status === 403 || response.status === 429) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      if (remaining === "0" || response.status === 429) {
        return window.ValidatorUtils.rateLimitMessage(response.headers.get("x-ratelimit-reset"));
      }
      return "GitHub refused the request (403). The repository may be private or access may be restricted.";
    }

    if (response.status >= 500) {
      return "GitHub API is temporarily unavailable. Please try again later.";
    }

    return `GitHub API request failed (${response.status} ${response.statusText || "error"}).`;
  }

  // Domain Validators

  async validateFrontend(repoData, includeStandards) {
    const { contents } = repoData;

    // Check for package.json
    const hasPackageJson = contents.some((file) => file.name === "package.json");
    this.addResult(
      hasPackageJson ? "passed" : "failed",
      "frontend",
      "Package Management",
      "package.json file present for dependency management",
      includeStandards ? ["OWASP Top 10"] : []
    );

    // Check for build configuration
    const hasBuildConfig = contents.some(
      (file) =>
        file.name === "webpack.config.js" ||
        file.name === "vite.config.js" ||
        file.name === "rollup.config.js" ||
        file.name === "tsconfig.json"
    );
    this.addResult(
      hasBuildConfig ? "passed" : "warning",
      "frontend",
      "Build Configuration",
      "Build tool configuration found (webpack, vite, rollup, or TypeScript)",
      includeStandards ? ["OWASP Top 10"] : []
    );

    // Check for accessibility testing
    const hasA11yTools = await this.checkDependencies(repoData, [
      "axe-core",
      "@axe-core/react",
      "jest-axe",
      "eslint-plugin-jsx-a11y",
    ]);
    this.addResult(
      hasA11yTools ? "passed" : "failed",
      "frontend",
      "Accessibility Testing",
      "Accessibility testing tools configured (axe, jest-axe, or eslint-plugin-jsx-a11y)",
      includeStandards ? ["WCAG 2.2"] : []
    );

    // Check for security headers
    const hasSecurityConfig = contents.some(
      (file) => file.name.includes("helmet") || file.name.includes("csp")
    );
    this.addResult(
      hasSecurityConfig ? "passed" : "warning",
      "frontend",
      "Security Headers",
      "Security headers configuration (CSP, helmet)",
      includeStandards ? ["OWASP Top 10"] : []
    );

    // Check for linting
    const hasESLint = contents.some(
      (file) =>
        file.name === ".eslintrc.json" ||
        file.name === ".eslintrc.js" ||
        file.name === "eslint.config.js" ||
        file.name === "eslint.config.mjs" ||
        file.name === "eslint.config.cjs"
    );
    this.addResult(
      hasESLint ? "passed" : "warning",
      "frontend",
      "Code Quality - Linting",
      "ESLint configuration found",
      includeStandards ? [] : []
    );

    // Check for testing
    const hasTests = contents.some(
      (file) =>
        file.name.includes("test") ||
        file.name.includes("spec") ||
        file.name === "jest.config.js" ||
        file.name === "vitest.config.js"
    );
    this.addResult(
      hasTests ? "passed" : "failed",
      "frontend",
      "Testing Framework",
      "Testing framework configured (jest, vitest, or test files present)",
      includeStandards ? [] : []
    );
  }

  async validateBackend(repoData, includeStandards) {
    const { contents } = repoData;

    // Check for API documentation
    const hasAPIDoc = contents.some(
      (file) =>
        file.name === "swagger.json" ||
        file.name === "openapi.json" ||
        file.name.includes("api-doc")
    );
    this.addResult(
      hasAPIDoc ? "passed" : "warning",
      "backend",
      "API Documentation",
      "API documentation found (Swagger/OpenAPI)",
      includeStandards ? ["OWASP Top 10"] : []
    );

    // Check for environment variable management
    const hasEnvExample = contents.some(
      (file) => file.name === ".env.example" || file.name === ".env.template"
    );
    this.addResult(
      hasEnvExample ? "passed" : "failed",
      "backend",
      "Environment Configuration",
      ".env.example or .env.template file present",
      includeStandards ? ["OWASP Top 10", "ISO 27001"] : []
    );

    // Check for database migrations
    const hasMigrations = contents.some(
      (file) => file.name === "migrations" || file.name.includes("migrate")
    );
    this.addResult(
      hasMigrations ? "passed" : "warning",
      "backend",
      "Database Migrations",
      "Database migration system present",
      includeStandards ? [] : []
    );

    // Check for error handling
    const hasErrorHandling = await this.checkDependencies(repoData, [
      "express-validator",
      "joi",
      "yup",
      "@hapi/joi",
    ]);
    this.addResult(
      hasErrorHandling ? "passed" : "warning",
      "backend",
      "Input Validation",
      "Validation library configured",
      includeStandards ? ["OWASP Top 10"] : []
    );

    // Check for rate limiting
    const hasRateLimit = await this.checkDependencies(repoData, [
      "express-rate-limit",
      "rate-limiter-flexible",
    ]);
    this.addResult(
      hasRateLimit ? "passed" : "failed",
      "backend",
      "Rate Limiting",
      "Rate limiting configured to prevent abuse",
      includeStandards ? ["OWASP Top 10"] : []
    );

    // Check for logging
    const hasLogging = await this.checkDependencies(repoData, [
      "winston",
      "pino",
      "bunyan",
      "morgan",
    ]);
    this.addResult(
      hasLogging ? "passed" : "warning",
      "backend",
      "Logging Framework",
      "Structured logging library configured",
      includeStandards ? ["ISO 27001"] : []
    );
  }

  async validateCloud(repoData, includeStandards) {
    const { contents } = repoData;

    // Check for Infrastructure as Code
    const hasIaC = contents.some(
      (file) =>
        file.name.includes("terraform") ||
        file.name.includes("cloudformation") ||
        file.name === "pulumi" ||
        file.name.includes(".tf")
    );
    this.addResult(
      hasIaC ? "passed" : "warning",
      "cloud",
      "Infrastructure as Code",
      "IaC configuration found (Terraform, CloudFormation, or Pulumi)",
      includeStandards ? ["CIS Benchmarks"] : []
    );

    // Check for Docker
    const hasDocker = contents.some(
      (file) => file.name === "Dockerfile" || file.name === "docker-compose.yml"
    );
    this.addResult(
      hasDocker ? "passed" : "warning",
      "cloud",
      "Containerization",
      "Docker configuration found",
      includeStandards ? [] : []
    );

    // Check for Kubernetes
    const hasK8s = contents.some((file) => file.name === "kubernetes" || file.name.includes("k8s"));
    this.addResult(
      hasK8s ? "passed" : "warning",
      "cloud",
      "Kubernetes Configuration",
      "Kubernetes manifests found",
      includeStandards ? ["CIS Benchmarks"] : []
    );

    // Check for cost monitoring
    const hasCostMonitoring = contents.some((file) => file.name.includes("cost"));
    this.addResult(
      hasCostMonitoring ? "passed" : "warning",
      "cloud",
      "Cost Optimization",
      "Cost monitoring configuration",
      includeStandards ? [] : []
    );
  }

  async validateData(repoData, includeStandards) {
    const { contents } = repoData;

    // Check for data governance docs
    const hasDataGovernance = contents.some(
      (file) => file.name.includes("governance") || file.name.includes("data-policy")
    );
    this.addResult(
      hasDataGovernance ? "passed" : "warning",
      "data",
      "Data Governance",
      "Data governance documentation found",
      includeStandards ? ["GDPR", "SOC 2"] : []
    );

    // Check for backup strategy
    const hasBackupConfig = contents.some((file) => file.name.includes("backup"));
    this.addResult(
      hasBackupConfig ? "passed" : "warning",
      "data",
      "Backup Strategy",
      "Backup configuration found",
      includeStandards ? ["ISO 27001"] : []
    );

    // Check for encryption
    const hasEncryption = await this.checkDependencies(repoData, [
      "bcrypt",
      "crypto-js",
      "node-vault",
      "@aws-sdk/client-kms",
    ]);
    this.addResult(
      hasEncryption ? "passed" : "failed",
      "data",
      "Data Encryption",
      "Encryption libraries configured",
      includeStandards ? ["GDPR", "HIPAA", "PCI DSS"] : []
    );

    // Check for data validation
    const hasDataValidation = await this.checkDependencies(repoData, ["joi", "yup", "zod"]);
    this.addResult(
      hasDataValidation ? "passed" : "warning",
      "data",
      "Data Validation",
      "Data validation schema library found",
      includeStandards ? ["GDPR"] : []
    );
  }

  async validateDevOps(repoData, includeStandards) {
    const { contents } = repoData;

    // Check for CI/CD
    const hasCI = contents.some(
      (file) =>
        file.name === ".github" ||
        file.name === ".gitlab-ci.yml" ||
        file.name === "Jenkinsfile" ||
        file.name === ".circleci"
    );
    this.addResult(
      hasCI ? "passed" : "failed",
      "devops",
      "CI/CD Pipeline",
      "CI/CD configuration found (GitHub Actions, GitLab CI, Jenkins, or CircleCI)",
      includeStandards ? ["NIST CSF"] : []
    );

    // Check for monitoring
    const hasMonitoring = contents.some(
      (file) => file.name.includes("prometheus") || file.name.includes("grafana")
    );
    this.addResult(
      hasMonitoring ? "passed" : "warning",
      "devops",
      "Monitoring Configuration",
      "Monitoring tools configured (Prometheus, Grafana)",
      includeStandards ? ["ISO 27001"] : []
    );

    // Check for secret management
    const hasSecretMgmt = contents.some(
      (file) => file.name.includes("vault") || file.name.includes("secrets")
    );
    this.addResult(
      hasSecretMgmt ? "passed" : "warning",
      "devops",
      "Secret Management",
      "Secret management configuration found",
      includeStandards ? ["OWASP Top 10", "ISO 27001"] : []
    );

    // Check for deployment strategy
    const hasDeploymentConfig = contents.some(
      (file) => file.name.includes("deploy") || file.name.includes("release")
    );
    this.addResult(
      hasDeploymentConfig ? "passed" : "warning",
      "devops",
      "Deployment Strategy",
      "Deployment configuration found",
      includeStandards ? [] : []
    );
  }

  async validateMobile(repoData, includeStandards) {
    const { contents, languages } = repoData;

    // Check for mobile framework
    const hasMobileFramework =
      languages.Swift ||
      languages.Kotlin ||
      languages.Java ||
      contents.some((file) => file.name === "pubspec.yaml" || file.name === "app.json");
    this.addResult(
      hasMobileFramework ? "passed" : "warning",
      "mobile",
      "Mobile Framework",
      "Mobile framework detected (Swift, Kotlin, Flutter, React Native)",
      includeStandards ? [] : []
    );

    // Check for app configuration
    const hasAppConfig = contents.some(
      (file) =>
        file.name === "app.json" ||
        file.name === "Info.plist" ||
        file.name === "AndroidManifest.xml"
    );
    this.addResult(
      hasAppConfig ? "passed" : "warning",
      "mobile",
      "App Configuration",
      "Mobile app configuration files found",
      includeStandards ? [] : []
    );

    // Check for offline support
    const hasOfflineSupport = await this.checkDependencies(repoData, [
      "realm",
      "async-storage",
      "redux-persist",
    ]);
    this.addResult(
      hasOfflineSupport ? "passed" : "warning",
      "mobile",
      "Offline Capabilities",
      "Offline storage configured",
      includeStandards ? [] : []
    );
  }

  async validateSecurity(repoData, includeStandards) {
    const { contents } = repoData;

    // Check for .gitignore
    const hasGitignore = contents.some((file) => file.name === ".gitignore");
    this.addResult(
      hasGitignore ? "passed" : "failed",
      "security",
      "Git Ignore Configuration",
      ".gitignore file present to prevent committing secrets",
      includeStandards ? ["OWASP Top 10"] : []
    );

    // Check for security scanning
    const hasSecurityScanning = contents.some(
      (file) =>
        file.name.includes("snyk") ||
        file.name.includes("dependabot") ||
        file.name.includes("security")
    );
    this.addResult(
      hasSecurityScanning ? "passed" : "warning",
      "security",
      "Security Scanning",
      "Security scanning tools configured (Snyk, Dependabot)",
      includeStandards ? ["OWASP Top 10", "NIST CSF"] : []
    );

    // Check for authentication
    const hasAuth = await this.checkDependencies(repoData, [
      "passport",
      "jsonwebtoken",
      "oauth",
      "auth0",
    ]);
    this.addResult(
      hasAuth ? "passed" : "warning",
      "security",
      "Authentication Library",
      "Authentication library configured",
      includeStandards ? ["OWASP Top 10", "ISO 27001"] : []
    );

    // Check for HTTPS enforcement
    const hasHTTPS = contents.some(
      (file) => file.name.includes("ssl") || file.name.includes("tls")
    );
    this.addResult(
      hasHTTPS ? "passed" : "warning",
      "security",
      "HTTPS/TLS Configuration",
      "SSL/TLS configuration found",
      includeStandards ? ["OWASP Top 10", "PCI DSS", "NIST 800-53"] : []
    );

    // Check for security policy
    const hasSecurityPolicy = contents.some((file) => file.name === "SECURITY.md");
    this.addResult(
      hasSecurityPolicy ? "passed" : "warning",
      "security",
      "Security Policy",
      "SECURITY.md file present with vulnerability reporting instructions",
      includeStandards ? ["ISO 27001"] : []
    );
  }

  async validateAIML(repoData, includeStandards) {
    const { contents, languages } = repoData;

    // Check for ML frameworks
    const hasMLFramework =
      languages.Python ||
      contents.some((file) => file.name === "requirements.txt" || file.name === "Pipfile");
    this.addResult(
      hasMLFramework ? "passed" : "warning",
      "aiml",
      "ML Framework",
      "Machine learning framework detected (Python environment)",
      includeStandards ? ["ISO/IEC 42001"] : []
    );

    // Check for model versioning
    const hasModelVersioning = contents.some(
      (file) => file.name.includes("mlflow") || file.name.includes("dvc")
    );
    this.addResult(
      hasModelVersioning ? "passed" : "warning",
      "aiml",
      "Model Versioning",
      "Model versioning system configured (MLflow, DVC)",
      includeStandards ? ["ISO/IEC 42001", "NIST AI RMF"] : []
    );

    // Check for ethics documentation
    const hasEthicsDoc = contents.some(
      (file) => file.name.includes("ethics") || file.name.includes("bias")
    );
    this.addResult(
      hasEthicsDoc ? "passed" : "warning",
      "aiml",
      "AI Ethics Documentation",
      "AI ethics and bias documentation found",
      includeStandards ? ["NIST AI RMF", "ISO/IEC 42001", "EU AI Act"] : []
    );

    // Check for model monitoring
    const hasMonitoring = contents.some((file) => file.name.includes("monitoring"));
    this.addResult(
      hasMonitoring ? "passed" : "warning",
      "aiml",
      "Model Monitoring",
      "Model monitoring configuration found",
      includeStandards ? ["NIST AI RMF", "EU AI Act"] : []
    );
  }

  // Helper methods

  async checkDependencies(repoData, dependencies) {
    const packageJson = repoData.packageJson;
    if (!packageJson || typeof packageJson !== "object") return false;

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies,
      ...packageJson.optionalDependencies,
    };

    return dependencies.some((dependency) =>
      Object.prototype.hasOwnProperty.call(allDeps, dependency)
    );
  }

  addResult(status, domain, title, description, standards = []) {
    const result = {
      status,
      domain,
      title,
      description,
      standards,
      timestamp: new Date().toISOString(),
    };

    if (status === "passed") {
      this.results.passed.push(result);
    } else if (status === "failed") {
      this.results.failed.push(result);
    } else if (status === "warning") {
      this.results.warnings.push(result);
    }
  }

  calculateScore() {
    const total = this.results.passed.length + this.results.failed.length;
    return total > 0 ? Math.round((this.results.passed.length / total) * 100) : 0;
  }

  showResults() {
    const loadingSection = document.getElementById("loadingSection");
    loadingSection.style.display = "none";
    loadingSection.setAttribute("aria-busy", "false");
    document.getElementById("resultsSection").style.display = "block";
    document.body.classList.add("results-active");

    // Update summary
    document.getElementById("passedCount").textContent = this.results.passed.length;
    document.getElementById("failedCount").textContent = this.results.failed.length;
    document.getElementById("warningCount").textContent = this.results.warnings.length;
    document.getElementById("scorePercent").textContent = `${this.calculateScore()}%`;

    // Update meta info
    document.getElementById("repoName").textContent =
      `${this.results.repository.owner}/${this.results.repository.repo}`;
    document.getElementById("validationTime").textContent = new Date(
      this.results.timestamp
    ).toLocaleString();

    // Display results
    this.switchTab("all");

    const heading = document.querySelector("#resultsSection h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }

  switchTab(tab) {
    // Update active tab and its accessible selected state.
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      const isActive = btn.dataset.tab === tab;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
      btn.tabIndex = isActive ? 0 : -1;
    });

    // Filter and display results
    const resultsContent = document.getElementById("resultsContent");
    let resultsToShow = [];

    switch (tab) {
      case "passed":
        resultsToShow = this.results.passed;
        break;
      case "failed":
        resultsToShow = this.results.failed;
        break;
      case "warnings":
        resultsToShow = this.results.warnings;
        break;
      case "standards":
        this.showStandardsView();
        return;
      case "all":
      default:
        resultsToShow = [...this.results.failed, ...this.results.warnings, ...this.results.passed];
        break;
    }

    resultsContent.innerHTML = resultsToShow.length
      ? resultsToShow.map((result) => this.renderResult(result)).join("")
      : '<p class="empty-state">No results to display.</p>';
  }

  renderResult(result) {
    const escape = window.ValidatorUtils.escapeHtml;
    const statusIcon = {
      passed: "✅",
      failed: "❌",
      warning: "⚠️",
    };

    const standardsTags = result.standards
      .map((standard) => `<span class="standard-tag">${escape(standard)}</span>`)
      .join("");

    return `
      <div class="result-item ${escape(result.status)}">
        <div class="result-item-header">
          <span class="result-status">${statusIcon[result.status] || ""}</span>
          <span class="result-title">${escape(result.title)}</span>
          <span class="result-domain">${escape(result.domain)}</span>
        </div>
        <div class="result-description">${escape(result.description)}</div>
        ${standardsTags ? `<div class="result-standards">${standardsTags}</div>` : ""}
      </div>
    `;
  }

  showStandardsView() {
    const escape = window.ValidatorUtils.escapeHtml;
    const resultsContent = document.getElementById("resultsContent");
    const standardsMap = {};

    // Group results by standards
    [...this.results.passed, ...this.results.failed, ...this.results.warnings].forEach((result) => {
      result.standards.forEach((standard) => {
        if (!standardsMap[standard]) {
          standardsMap[standard] = { passed: 0, failed: 0, warnings: 0, items: [] };
        }
        standardsMap[standard][result.status === "passed" ? "passed" : result.status]++;
        standardsMap[standard].items.push(result);
      });
    });

    const html = Object.entries(standardsMap)
      .map(
        ([standard, data]) => `
      <div class="result-item">
        <div class="result-item-header">
          <span class="result-title">${escape(standard)}</span>
        </div>
        <div class="result-description">
          ✅ ${data.passed} passed | ❌ ${data.failed} failed | ⚠️ ${data.warnings} warnings
        </div>
        <div class="result-standards">
          ${data.items.map((item) => `<span class="standard-tag">${escape(item.title)}</span>`).join("")}
        </div>
      </div>
    `
      )
      .join("");

    resultsContent.innerHTML =
      html || '<p class="empty-state">No standards compliance data available.</p>';
  }

  exportJSON() {
    const serializable = { ...this.results };
    delete serializable.repositoryData;

    const data = {
      validatorVersion: "1.1.0",
      ...serializable,
      summary: {
        passed: this.results.passed.length,
        failed: this.results.failed.length,
        warnings: this.results.warnings.length,
        score: this.calculateScore(),
      },
    };

    this.downloadFile(JSON.stringify(data, null, 2), "validation-results.json", "application/json");
  }

  exportCSV() {
    const allResults = [...this.results.passed, ...this.results.failed, ...this.results.warnings];

    const headers = ["Status", "Domain", "Title", "Description", "Standards"];
    const rows = allResults.map((result) => [
      result.status,
      result.domain,
      result.title,
      result.description,
      result.standards.join("; "),
    ]);

    const escapeCsv = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");

    this.downloadFile(csv, "validation-results.csv", "text/csv;charset=utf-8");
  }

  exportPDF() {
    // Print styles hide the form, informational sections, and action bars so the
    // browser's "Save as PDF" destination produces a clean results report.
    window.print();
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  resetValidation() {
    document.getElementById("resultsSection").style.display = "none";
    document.querySelector(".validator-input").style.display = "block";
    document.getElementById("validationForm").reset();
    document.getElementById("resultsContent").innerHTML = "";
    document.body.classList.remove("results-active");
    this.clearError();
    this.setProgress(0);
    document.getElementById("repoUrl").focus();
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Initialize validator when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new RepositoryValidator();
});
