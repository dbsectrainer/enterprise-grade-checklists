/**
 * Shared validator helpers.
 *
 * Loaded as a classic script in validator.html so the page keeps working when the
 * site is opened directly from disk. Also importable from Node tests, where it
 * attaches the same helpers to globalThis.
 */
(function attachValidatorUtils(global) {
  const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);
  const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;
  const REPO_PATTERN = /^[A-Za-z0-9_.-]+$/;

  function parseGitHubUrl(input) {
    if (typeof input !== "string") return null;

    const trimmed = input.trim();
    if (!trimmed) return null;

    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    let parsed;
    try {
      parsed = new URL(withScheme);
    } catch {
      return null;
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (parsed.username || parsed.password) return null;
    if (!GITHUB_HOSTS.has(parsed.hostname.toLowerCase())) return null;

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return null;

    const owner = segments[0];
    let repo = segments[1];
    if (repo.toLowerCase().endsWith(".git")) {
      repo = repo.slice(0, -4);
    }

    if (!OWNER_PATTERN.test(owner) || !REPO_PATTERN.test(repo)) return null;
    if (repo === "." || repo === "..") return null;

    return {
      owner,
      repo,
      url: `https://github.com/${owner}/${repo}`,
    };
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
      switch (character) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#39;";
        default:
          return character;
      }
    });
  }

  function rateLimitMessage(resetHeader, now = Date.now()) {
    const resetSeconds = Number(resetHeader);
    if (Number.isFinite(resetSeconds) && resetSeconds > 0) {
      const resetTime = new Date(resetSeconds * 1000);
      if (resetTime.getTime() > now) {
        return `GitHub API rate limit exceeded. Try again after ${resetTime.toLocaleTimeString()}.`;
      }
    }
    return "GitHub API rate limit exceeded. Please wait a few minutes and try again.";
  }

  const utils = { parseGitHubUrl, escapeHtml, rateLimitMessage };
  global.ValidatorUtils = utils;
})(typeof globalThis !== "undefined" ? globalThis : this);
