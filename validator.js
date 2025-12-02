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

    this.standards = {
      "ISO 27001": ["security", "data", "cloud"],
      "NIST CSF": ["security", "devops"],
      "SOC 2": ["security", "data", "cloud"],
      GDPR: ["data", "security", "backend"],
      "OWASP Top 10": ["security", "frontend", "backend"],
      "WCAG 2.1": ["frontend"],
      "PCI DSS": ["security", "data"],
      HIPAA: ["security", "data"],
      "CIS Benchmarks": ["security", "cloud", "devops"],
      "NIST 800-53": ["security", "cloud"],
    };

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
    form.addEventListener("submit", this.handleSubmit.bind(this));

    // Tab switching
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.switchTab(btn.dataset.tab));
    });

    // Export buttons
    document.getElementById("exportJsonBtn")?.addEventListener("click", () => this.exportJSON());
    document.getElementById("exportCsvBtn")?.addEventListener("click", () => this.exportCSV());
    document.getElementById("exportPdfBtn")?.addEventListener("click", () => this.exportPDF());
    document
      .getElementById("newValidationBtn")
      ?.addEventListener("click", () => this.resetValidation());
  }

  async handleSubmit(event) {
    event.preventDefault();

    const repoUrl = document.getElementById("repoUrl").value.trim();
    const selectedDomains = Array.from(
      document.querySelectorAll("input[name=\"domain\"]:checked")
    ).map((cb) => cb.value);
    const includeStandards = document.getElementById("includeStandards").checked;

    if (selectedDomains.length === 0) {
      alert("Please select at least one domain to validate.");
      return;
    }

    // Parse GitHub URL
    const repoInfo = this.parseGitHubUrl(repoUrl);
    if (!repoInfo) {
      alert("Invalid GitHub URL. Please use format: https://github.com/username/repository");
      return;
    }

    this.showLoading(true);
    await this.runValidation(repoInfo, selectedDomains, includeStandards);
  }

  parseGitHubUrl(url) {
    // Support both https://github.com/user/repo and github.com/user/repo
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const match = normalized.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);

    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ""),
        url: normalized,
      };
    }
    return null;
  }

  showLoading(show) {
    document.querySelector(".validator-input").style.display = show ? "none" : "block";
    document.getElementById("loadingSection").style.display = show ? "block" : "none";
    document.getElementById("resultsSection").style.display = "none";
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
    const progressFill = document.getElementById("progressFill");

    try {
      // Fetch repository data
      loadingText.textContent = "Fetching repository data...";
      progressFill.style.width = "10%";

      const repoData = await this.fetchRepositoryData(repoInfo);
      this.results.repositoryData = repoData;

      progressFill.style.width = "30%";

      // Run domain validations
      const totalDomains = domains.length;
      for (let i = 0; i < domains.length; i++) {
        const domain = domains[i];
        loadingText.textContent = `Validating ${domain}...`;
        progressFill.style.width = `${30 + ((i + 1) / totalDomains) * 60}%`;

        await this.domainValidators[domain](repoData, includeStandards);
        await this.sleep(500); // Simulate processing time
      }

      progressFill.style.width = "100%";
      loadingText.textContent = "Generating report...";

      await this.sleep(500);
      this.showResults();
    } catch (error) {
      console.error("Validation error:", error);
      loadingText.textContent = `Error: ${error.message}`;
      alert(`Validation failed: ${error.message}`);
      this.showLoading(false);
    }
  }

  async fetchRepositoryData(repoInfo) {
    // Use GitHub API to fetch repository data
    const apiBase = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`;

    try {
      const [repo, contents, languages, commits] = await Promise.all([
        fetch(apiBase).then((r) => (r.ok ? r.json() : Promise.reject(new Error("Repo not found")))),
        fetch(`${apiBase}/contents`).then((r) => (r.ok ? r.json() : [])),
        fetch(`${apiBase}/languages`).then((r) => (r.ok ? r.json() : {})),
        fetch(`${apiBase}/commits?per_page=10`).then((r) => (r.ok ? r.json() : [])),
      ]);

      return {
        repository: repo,
        contents: contents,
        languages: languages,
        recentCommits: commits,
      };
    } catch (error) {
      throw new Error(`Failed to fetch repository: ${error.message}`);
    }
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
      includeStandards ? ["WCAG 2.1"] : []
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
      (file) => file.name === ".eslintrc.json" || file.name === ".eslintrc.js"
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
    const hasK8s = contents.some(
      (file) => file.name === "kubernetes" || file.name.includes("k8s")
    );
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
    const hasHTTPS = contents.some((file) => file.name.includes("ssl") || file.name.includes("tls"));
    this.addResult(
      hasHTTPS ? "passed" : "warning",
      "security",
      "HTTPS/TLS Configuration",
      "SSL/TLS configuration found",
      includeStandards ? ["OWASP Top 10", "PCI DSS"] : []
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
      includeStandards ? [] : []
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
      includeStandards ? [] : []
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
      includeStandards ? [] : []
    );

    // Check for model monitoring
    const hasMonitoring = contents.some((file) => file.name.includes("monitoring"));
    this.addResult(
      hasMonitoring ? "passed" : "warning",
      "aiml",
      "Model Monitoring",
      "Model monitoring configuration found",
      includeStandards ? [] : []
    );
  }

  // Helper methods

  async checkDependencies(repoData, dependencies) {
    // In a real implementation, this would fetch package.json and check dependencies
    // For now, we'll do a simple check
    const { contents } = repoData;
    const packageJson = contents.find((file) => file.name === "package.json");

    if (packageJson) {
      try {
        const response = await fetch(packageJson.download_url);
        const content = await response.json();
        const allDeps = {
          ...content.dependencies,
          ...content.devDependencies,
        };

        return dependencies.some((dep) => dep in allDeps);
      } catch {
        return false;
      }
    }
    return false;
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

  showResults() {
    document.getElementById("loadingSection").style.display = "none";
    document.getElementById("resultsSection").style.display = "block";

    // Update summary
    document.getElementById("passedCount").textContent = this.results.passed.length;
    document.getElementById("failedCount").textContent = this.results.failed.length;
    document.getElementById("warningCount").textContent = this.results.warnings.length;

    const total = this.results.passed.length + this.results.failed.length;
    const score = total > 0 ? Math.round((this.results.passed.length / total) * 100) : 0;
    document.getElementById("scorePercent").textContent = `${score}%`;

    // Update meta info
    document.getElementById("repoName").textContent =
      `${this.results.repository.owner}/${this.results.repository.repo}`;
    document.getElementById("validationTime").textContent = new Date(
      this.results.timestamp
    ).toLocaleString();

    // Display results
    this.switchTab("all");
  }

  switchTab(tab) {
    // Update active tab
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
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
        resultsToShow = [
          ...this.results.failed,
          ...this.results.warnings,
          ...this.results.passed,
        ];
        break;
    }

    resultsContent.innerHTML = resultsToShow.length
      ? resultsToShow.map((result) => this.renderResult(result)).join("")
      : "<p style=\"text-align: center; color: var(--text-secondary); padding: 2rem;\">No results to display</p>";
  }

  renderResult(result) {
    const statusIcon = {
      passed: "✅",
      failed: "❌",
      warning: "⚠️",
    };

    const standardsTags = result.standards
      .map((std) => `<span class="standard-tag">${std}</span>`)
      .join("");

    return `
      <div class="result-item ${result.status}">
        <div class="result-item-header">
          <span class="result-status">${statusIcon[result.status]}</span>
          <span class="result-title">${result.title}</span>
          <span class="result-domain">${result.domain}</span>
        </div>
        <div class="result-description">${result.description}</div>
        ${standardsTags ? `<div class="result-standards">${standardsTags}</div>` : ""}
      </div>
    `;
  }

  showStandardsView() {
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
          <span class="result-title">${standard}</span>
        </div>
        <div class="result-description">
          ✅ ${data.passed} passed | ❌ ${data.failed} failed | ⚠️ ${data.warnings} warnings
        </div>
        <div class="result-standards">
          ${data.items.map((item) => `<span class="standard-tag">${item.title}</span>`).join("")}
        </div>
      </div>
    `
      )
      .join("");

    resultsContent.innerHTML =
      html ||
      "<p style=\"text-align: center; color: var(--text-secondary); padding: 2rem;\">No standards compliance data available</p>";
  }

  exportJSON() {
    const data = JSON.stringify(this.results, null, 2);
    this.downloadFile(data, "validation-results.json", "application/json");
  }

  exportCSV() {
    const allResults = [
      ...this.results.passed,
      ...this.results.failed,
      ...this.results.warnings,
    ];

    const headers = ["Status", "Domain", "Title", "Description", "Standards"];
    const rows = allResults.map((r) => [
      r.status,
      r.domain,
      r.title,
      r.description,
      r.standards.join("; "),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

    this.downloadFile(csv, "validation-results.csv", "text/csv");
  }

  exportPDF() {
    alert(
      "PDF export would require a PDF library. For now, please use the browser's print function (Ctrl+P) to save as PDF."
    );
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
    document.getElementById("progressFill").style.width = "0%";
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Initialize validator when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new RepositoryValidator();
});
