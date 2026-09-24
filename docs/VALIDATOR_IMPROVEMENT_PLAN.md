# Repository Validator Improvement Plan

**Classification:** Public documentation

**Status:** Proposed

**Branch:** `plan/multi-stack-validator-improvements`

**Trigger:** Case study from [dod-cybersec-ops-framework](https://github.com/dbsectrainer/dod-cybersec-ops-framework) compliance scan (2026-09-24)

**Related report:** [enterprise-checklist-remediation-report.md](https://github.com/dbsectrainer/dod-cybersec-ops-framework/blob/compliance-scan/docs/compliance/enterprise-checklist-remediation-report.md)

---

## Problem Statement

The Enterprise Repository Validator ([validator.js](../validator.js)) provides valuable quick feedback on public GitHub repositories, but a real-world validation of a **Python / Streamlit DoD cybersecurity framework** exposed systematic blind spots:

| Issue | Impact |
|-------|--------|
| Root-only GitHub API scan | Misses `dashboard/`, `infra/`, `k8s/`, and other nested project roots |
| npm-only dependency resolution | False failures for Python (`requirements.txt`), Go, Rust, Java projects |
| JavaScript library name matching | Rate limiting, logging, auth, encryption checks fail for equivalent Python/Go libs |
| Filename-only heuristics | Docker, Prometheus, tests, and OpenAPI in subdirectories are invisible |
| No stack detection | Cannot adapt domain weights (e.g., skip `package.json` for Python-primary repos) |

**Result:** A project with pytest, cryptography, Docker Compose, Prometheus, Grafana, Vault, CI/CD, and `.env.example` still scored **3 passed / 7 failed** on first scan.

---

## Goals

1. **Reduce false positives** for non-JavaScript enterprise repositories.
2. **Improve detection accuracy** via recursive scanning (within GitHub API limits).
3. **Support multi-ecosystem dependency manifests** (npm, pip, Go modules, Cargo, Maven).
4. **Detect primary language/stack** and apply context-aware rules.
5. **Preserve backward compatibility** with existing Node.js/full-stack expectations.
6. **Document limitations clearly** in the validator UI and export reports.

---

## Non-Goals (Phase 1)

- Deep static analysis or SAST integration
- Private repository authentication (future phase)
- Runtime / deployed environment validation
- Replacing domain checklists with fully automated compliance certification

---

## Phase 1: Foundation (4–6 weeks)

### 1.1 Recursive repository tree walk

**Current behavior:**

```javascript
fetch(`${apiBase}/contents`)  // root only
```

**Proposed behavior:**

- Walk repository tree using GitHub Git Trees API (`/git/trees/{sha}?recursive=1`) or paginated `/contents/{path}` traversal.
- Cache tree in memory for the validation session.
- Configurable `maxDepth` (default: 5) and `maxFiles` (default: 500) to respect rate limits.

**Acceptance criteria:**

- Finds `dashboard/Dockerfile`, `dashboard/tests/`, `dashboard/config/prometheus/`
- Finds `.github/workflows/ci.yml` (already at root, but confirms tree walk works)

### 1.2 Primary stack detection

Detect dominant ecosystem from:

| Signal | Ecosystem |
|--------|-----------|
| `package.json` | JavaScript/TypeScript |
| `requirements.txt`, `pyproject.toml`, `Pipfile` | Python |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `pom.xml`, `build.gradle` | Java/Kotlin |
| GitHub `languages` API | Secondary signal |

**Output:** `repoProfile: { primary: 'python', secondary: ['docker', 'hcl'], confidence: 0.92 }`

### 1.3 Multi-manifest dependency checker

Replace npm-only `checkDependencies()` with ecosystem-aware resolver:

```javascript
async checkDependencies(repoTree, packages) {
  // packages = [{ name, ecosystems: ['npm', 'pip', 'go'] }]
}
```

**Python equivalents to add:**

| Current npm check | Python equivalent |
|-------------------|-------------------|
| `express-rate-limit` | `slowapi`, `flask-limiter`, or config key `rate_limit` |
| `winston`, `pino` | `structlog`, `loguru`, or stdlib `logging` usage |
| `passport`, `jsonwebtoken` | `python-jose`, `passlib`, `authlib`, `PyJWT` |
| `bcrypt`, `crypto-js` | `cryptography`, `bcrypt`, `pynacl` |
| `joi`, `yup`, `zod` | `pydantic`, `marshmallow`, `cerberus` |

**Acceptance criteria:**

- `dod-cybersec-ops-framework` passes Data Encryption when `cryptography` is in `requirements.txt`
- Auth library warning clears when `python-jose` or `passlib` is present

---

## Phase 2: Context-Aware Rules (4–6 weeks)

### 2.1 Stack-adaptive domain scoring

When `primary === 'python'` and no frontend `package.json`:

| Check | Current | Proposed |
|-------|---------|----------|
| Package Management (frontend) | Fail | Skip or pass via `requirements.txt` / `pyproject.toml` |
| Accessibility Testing | Fail | Warning: "Manual WCAG review recommended for Streamlit/UI framework" |
| Testing Framework | Fail if no root test file | Pass if `pytest.ini`, `conftest.py`, or `**/test_*.py` found in tree |
| ESLint | Warning | Skip; suggest `ruff` / `flake8` for Python |

Display **"Adapted for Python"** badge on affected results.

### 2.2 Config-aware infrastructure detection

Expand cloud/devops checks to search tree paths:

| Check | Patterns to add |
|-------|-----------------|
| Docker | `**/Dockerfile`, `**/docker-compose.yml` |
| Kubernetes | `**/k8s/**`, `**/*deployment*.yaml`, `**/helm/**` |
| Prometheus/Grafana | `**/prometheus*.yml`, `**/grafana/**` |
| Terraform | `**/*.tf`, `**/*.hcl` (exclude `.terraform/`) |
| Vault | `**/vault/**`, `VAULT_*` in `.env.example` |

### 2.3 CI/CD depth check

**Current:** Pass if `.github` folder exists at root.

**Proposed:** Pass only if workflow files exist:

- `.github/workflows/*.yml`
- `.gitlab-ci.yml`
- `Jenkinsfile`

**Severity:** Fail if folder exists but no workflow files (soft pass today).

---

## Phase 3: Reporting & UX (2–4 weeks)

### 3.1 Result metadata enrichment

Each result should include:

```json
{
  "status": "failed",
  "domain": "frontend",
  "title": "Package Management",
  "applicable": false,
  "applicabilityReason": "Primary stack is Python; requirements.txt found at repo root",
  "suggestedAlternative": "requirements.txt",
  "evidence": ["requirements.txt", "dashboard/tests/"]
}
```

### 3.2 Export improvements

- Add `repoProfile` and `scanCoverage` (files scanned, depth, API calls) to JSON export
- CSV column: `Applicable (Y/N)`
- PDF export: replace alert with lightweight print stylesheet (existing workaround)

### 3.3 Validator UI updates

- Show detected primary stack before results
- Filter toggles: "Hide non-applicable checks"
- Link to improvement plan and case study docs

---

## Phase 4: Quality & Automation (ongoing)

### 4.1 Validator test suite

Add Node-based unit tests for:

- Tree walk parser
- Dependency resolver per ecosystem
- Stack detection
- Rule applicability engine

**Fixture repositories** (mock JSON, no live API):

- `fixtures/python-streamlit-repo.json` (based on dod-cybersec-ops-framework tree)
- `fixtures/node-fullstack-repo.json`
- `fixtures/monorepo.json`

### 4.2 GitHub Action (optional)

Action wrapper: `enterprise-checklist/validate@v1` for CI integration with SARIF or JSON artifact output.

---

## Implementation Priority Matrix

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P0 | Recursive tree walk | Medium | High |
| P0 | Python `requirements.txt` dependency checks | Medium | High |
| P0 | pytest / test file discovery in tree | Low | High |
| P1 | Stack detection + applicability flags | Medium | High |
| P1 | Nested Docker/K8s/Prometheus detection | Low | Medium |
| P1 | CI workflow file validation | Low | Medium |
| P2 | Go/Rust/Java manifest support | Medium | Medium |
| P2 | Python lint tools (ruff/flake8) | Low | Low |
| P3 | Private repo auth | High | Medium |
| P3 | GitHub Action wrapper | Medium | Low |

---

## Success Metrics

| Metric | Baseline | Target (post Phase 2) |
|--------|----------|------------------------|
| False positive rate on Python repos | ~57% (4/7 failures) | < 15% |
| Infrastructure detection (nested Docker) | 0% | > 90% |
| Dependency check accuracy (Python) | 0% | > 85% |
| User-reported "not applicable" checks | Unknown | Track via GitHub issues |

**Regression test:** Re-scan `dbsectrainer/dod-cybersec-ops-framework` on `compliance-scan` branch:

- Expected passes: Environment Configuration, Security Scanning, Testing Framework, Data Encryption, CI/CD
- Expected skips/adapted: Frontend package.json, npm a11y tools

---

## File Change Map

| File | Changes |
|------|---------|
| `validator.js` | Tree walk, stack detection, multi-ecosystem deps, applicability engine |
| `validator.html` | Stack badge, filter toggles, coverage stats |
| `validator.css` | Styles for new UI elements |
| `docs/VALIDATOR.md` | Document limitations, multi-stack support, API rate limits |
| `docs/VALIDATOR_IMPROVEMENT_PLAN.md` | This document |
| `tests/validator/` | New unit test directory |
| `fixtures/` | Mock repo trees for testing |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| GitHub API rate limits on large repos | Cache tree; configurable depth/file limits; optional PAT for higher limits |
| Breaking existing scores users track | Version validator (`validatorVersion` in exports); changelog breaking rules |
| Maintenance burden of ecosystem mappings | External JSON config (`dependency-mappings.json`) editable without code changes |
| Over-skipping checks reduces rigor | Default to strict mode; "enterprise strict" vs "stack-adapted" toggle |

---

## Recommended Next Actions

1. Review and approve this plan (maintainers)
2. Create GitHub issues per Phase 1 item
3. Implement tree walk + Python dependency resolver (P0)
4. Add fixture based on dod-cybersec-ops-framework scan
5. Re-run validator against case study repo and publish before/after score comparison in `docs/CASE_STUDY.md`

---

## References

- [Validator source](../validator.js)
- [Validator documentation](./VALIDATOR.md)
- [DoD framework remediation report](https://github.com/dbsectrainer/dod-cybersec-ops-framework/blob/compliance-scan/docs/compliance/enterprise-checklist-remediation-report.md)
- [Baseline validation export](https://github.com/dbsectrainer/dod-cybersec-ops-framework/blob/compliance-scan/validation-results.json)
