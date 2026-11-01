import test from "node:test";
import assert from "node:assert/strict";

// Importing the classic browser script attaches its helpers to globalThis.
import "../../validator-utils.js";

const { parseGitHubUrl, escapeHtml, rateLimitMessage } = globalThis.ValidatorUtils;

test("parseGitHubUrl accepts the documented URL forms", () => {
  assert.deepEqual(parseGitHubUrl("https://github.com/facebook/react"), {
    owner: "facebook",
    repo: "react",
    url: "https://github.com/facebook/react",
  });

  assert.deepEqual(parseGitHubUrl("github.com/microsoft/vscode"), {
    owner: "microsoft",
    repo: "vscode",
    url: "https://github.com/microsoft/vscode",
  });

  assert.deepEqual(parseGitHubUrl("https://www.github.com/owner/repo.git"), {
    owner: "owner",
    repo: "repo",
    url: "https://github.com/owner/repo",
  });

  assert.deepEqual(parseGitHubUrl("https://github.com/owner/repo/tree/main"), {
    owner: "owner",
    repo: "repo",
    url: "https://github.com/owner/repo",
  });

  assert.deepEqual(parseGitHubUrl("https://github.com/owner/.github"), {
    owner: "owner",
    repo: ".github",
    url: "https://github.com/owner/.github",
  });
});

test("parseGitHubUrl rejects non-GitHub and malformed input", () => {
  const invalidInputs = [
    "",
    "   ",
    "not a url",
    "https://gitlab.com/owner/repo",
    "https://github.com.evil.example/owner/repo",
    "https://notgithub.com/github.com/owner/repo",
    "https://github.com/owner",
    "https://github.com/",
    "https://github.com/owner/repo with space",
    "ftp://github.com/owner/repo",
    "https://github.com/../repo",
    "https://user:pass@github.com/owner/repo",
    null,
    undefined,
    42,
  ];

  for (const input of invalidInputs) {
    assert.equal(parseGitHubUrl(input), null, `expected null for ${String(input)}`);
  }
});

test("escapeHtml neutralizes HTML metacharacters", () => {
  assert.equal(
    escapeHtml("<img src=x onerror=\"alert('x')\">&"),
    "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;"
  );
  assert.equal(escapeHtml("plain"), "plain");
});

test("rateLimitMessage includes the reset time when available", () => {
  const resetAt = Math.floor(Date.now() / 1000) + 3600;
  const message = rateLimitMessage(String(resetAt));
  assert.match(message, /GitHub API rate limit exceeded/);
  assert.match(message, /Try again after/);

  assert.match(rateLimitMessage(null), /Please wait/);
  assert.match(rateLimitMessage("0"), /Please wait/);
});
