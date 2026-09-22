# Changelog

All notable changes to the Enterprise-Grade Checklists will be documented in this file.

## [2.1.0] - 2026-09-22

### 2026 Technology Refresh

A repo-wide pass to bring checklist content, standards references, and root
tooling up to date for 2026. Evergreen content (accessibility, Zero Trust,
DORA metrics, data-quality fundamentals, etc.) was left untouched — this
release is additive and corrective, not a rewrite.

#### AI/ML Checklist

- Added a new **Generative AI & LLM** section: prompt injection & jailbreak
  defenses, RAG evaluation & retrieval quality, vector database access
  control, hallucination detection/mitigation
- Added agentic AI governance items (tool-use permission scoping,
  autonomous action guardrails, human-in-the-loop checkpoints)
- Added foundation-model/system-card items, distinct from classical Model
  Cards
- Added LLM red-teaming & safety evaluations, distinct from existing
  adversarial-ML red-teaming
- Added a new **AI Risk Tiering & Regulatory Compliance** section (EU AI
  Act risk tiers, NIST AI RMF, ISO/IEC 42001)
- Existing classical/predictive ML content (MLflow tracking, drift
  detection, fairness metrics, classical Model Cards) preserved and now
  explicitly scoped alongside the new generative-AI coverage

#### Mobile Checklist

- Updated React Native guidance to the New Architecture (Fabric,
  TurboModules, JSI, Codegen) with Expo as the standard bootstrap tool;
  legacy bridge examples retained and clearly labeled
- Added SwiftUI and Jetpack Compose as modern platform-UI patterns
  alongside existing UIKit/View-based examples
- Added Kotlin Multiplatform (KMP) as a named cross-platform option
- Added on-device AI/ML items (Apple Intelligence/CoreML, Android ML
  Kit/Gemini Nano)
- Added a Privacy Manifest / Privacy Nutrition Label & Play Data Safety
  disclosure item

#### Frontend Checklist

- Modernized React Error Boundary example (functional usage via
  `react-error-boundary`) and added a brief React Server Components /
  React 19 `use()`/Actions API note
- Added Zustand/TanStack Query as lighter state-management alternatives
  alongside existing Redux Toolkit guidance
- Flipped bundler framing to present Vite as the default recommendation,
  webpack as a legacy/complex-project option
- Updated React documentation links from reactjs.org to react.dev
- Added an AI-assisted development tooling item (Copilot/Cursor/Claude
  Code governance) and a passkeys/WebAuthn authentication mention

#### Backend Checklist

- Added a new **AI/LLM Backend Integration** item group: RAG pipeline
  architecture, vector database access control, prompt-injection defense
  at the API boundary, LLM API rate limiting/cost control, AI
  agent/tool-calling security
- Added tRPC and GraphQL Federation as named modern API options
- Added current-LTS-runtime guidance (Node 22/24, Python 3.13, Java 21+)
- Added EU AI Act / NIST AI RMF references for AI-serving backends

#### Security Checklist

- Added passkeys/WebAuthn/FIDO2 as a named MFA option
- Added a post-quantum cryptography migration item referencing NIST's
  finalized PQC standards (FIPS 203/204/205)
- Added SLSA framework reference alongside existing SBOM/SPDX/CycloneDX
  content
- Added an AI/LLM security item (prompt injection, model supply-chain
  risk, AI red-teaming), cross-linked to the AI/ML checklist

#### Cloud Checklist

- Updated GCP terminology from Preemptible VMs to Spot VMs
- Added Terraform `required_providers` version-pinning example and an
  OpenTofu mention
- Added OpenTelemetry as the named observability standard and an
  eBPF/Cilium mention alongside existing CWPP content

#### DevOps Checklist

- Reframed CI/CD defaults to GitHub Actions/GitLab CI/Buildkite, with
  Jenkins noted as legacy/still-supported
- Named ArgoCD and Flux for existing GitOps requirements
- Added a new Platform Engineering / Internal Developer Platform item
  (Backstage, golden paths, self-service provisioning)
- Added OpenTelemetry by name; named SLSA levels, Sigstore/cosign, and
  SBOM formats (SPDX/CycloneDX) on the existing supply-chain item

#### Data Checklist

- Added a Vector Databases & Embedding Stores item (access control,
  embedding drift, RAG pipeline considerations)
- Added an LLMOps & AI Data Pipeline Governance item (prompt/data
  lineage, PII risk in embeddings, log retention)
- Added illustrative modern platform/table-format examples (Databricks,
  Snowflake, Apache Iceberg, Delta Lake) alongside existing abstract
  warehouse/lake/lakehouse guidance

#### Root Tooling & Standards

- Removed stale `.eslintrc.json` (dead under ESLint v9 flat config);
  simplified the `lint` script; bumped `engines.node` and CI Node
  version to 22
- Updated `standards-mapping.json`: ISO/IEC 27001:2022, WCAG 2.2, EU AI
  Act (no longer "proposed"), added NIST AI RMF and ISO/IEC 42001
  entries
- Refreshed stale `Last Updated: 2024-02-13` date stamps in each
  checklist's `compliance-mapping.md`

## [2.0.0] - 2025-02-13

### Added

#### Data Management Checklist

- Added comprehensive data quality management guide
- Created automated data validation script
- Added detailed compliance mapping for data protection regulations
- Included real-world examples and case studies
- Added implementation guides for data governance

#### Frontend Checklist

- Added detailed frontend architecture diagrams
- Created automated frontend validation script
- Added comprehensive best practices guide
- Included performance optimization strategies
- Added accessibility and security guidelines

#### Mobile Development Checklist

- Added detailed mobile architecture diagrams
- Created automated mobile validation script
- Added platform-specific implementation guide
- Included native module development patterns
- Added performance optimization strategies

#### Backend Development Checklist

- Added detailed backend architecture diagrams
- Created automated backend validation script
- Added comprehensive performance guide
- Included database optimization strategies
- Added security and monitoring guidelines

#### AI/ML Development Checklist

- Added detailed ML system architecture diagrams
- Created automated AI/ML validation script
- Added comprehensive model governance guide
- Included ethics and fairness guidelines
- Added model monitoring and compliance strategies

### Changed

- Updated all documentation with Mermaid.js diagrams
- Enhanced validation scripts with more comprehensive checks
- Improved code examples with TypeScript support
- Updated best practices with latest industry standards
- Enhanced security guidelines across all checklists

### Documentation

- Added detailed README files for each checklist
- Added real-world examples and case studies
- Added implementation guides and templates
- Added automation examples and best practices
- Added visual documentation with Mermaid.js diagrams

### Security

- Enhanced security validation across all checklists
- Added compliance mapping for various regulations
- Added security best practices and guidelines
- Added automated security checks
- Added incident response procedures

### Performance

- Added performance optimization guides
- Added automated performance checks
- Added monitoring and metrics collection
- Added load testing strategies
- Added caching and optimization patterns

### Testing

- Enhanced testing strategies across all checklists
- Added automated validation scripts
- Added test templates and examples
- Added integration testing guidelines
- Added performance testing procedures

### Accessibility

- Added accessibility guidelines
- Added automated accessibility checks
- Added ARIA implementation examples
- Added semantic HTML patterns
- Added keyboard navigation support

### Infrastructure

- Added deployment guidelines
- Added monitoring strategies
- Added scaling patterns
- Added high availability configurations
- Added disaster recovery procedures

## [1.0.0] - 2024-01-01

### Initial Release

- Basic checklist structure
- Initial documentation
- Basic validation scripts
- Core best practices
- Essential guidelines
