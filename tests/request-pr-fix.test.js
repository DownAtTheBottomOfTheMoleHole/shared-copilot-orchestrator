const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const scriptPath = path.join(__dirname, "..", "scripts", "request-pr-fix.sh");
const sha = "abcdef1234567890abcdef1234567890abcdef12";

function runRequest(options = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-pr-fix-"));
  const mockGh = path.join(directory, "gh");
  const outputPath = path.join(directory, "output");
  const summaryPath = path.join(directory, "summary");
  const callsPath = path.join(directory, "calls");
  const postedBodyPath = path.join(directory, "posted-body");
  fs.writeFileSync(
    mockGh,
    `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.MOCK_CALLS, JSON.stringify(args) + "\\n");
const route = args.find((arg) => arg.startsWith("repos/") || arg === "user");
if (route?.endsWith("/pulls/42")) {
  process.stdout.write(JSON.stringify({ state: process.env.MOCK_STATE, head_sha: process.env.MOCK_SHA, head_repo: process.env.MOCK_REPO }));
} else if (route === "user") {
  process.stdout.write("test-user");
} else if (route?.includes("/comments?")) {
  process.stdout.write(process.env.MOCK_EXISTING || "");
} else if (route?.endsWith("/comments") && args.includes("POST")) {
  const field = args.find((arg) => arg.startsWith("body=@"));
  fs.writeFileSync(process.env.MOCK_POSTED_BODY, fs.readFileSync(field.slice(6)));
  process.stdout.write("https://github.com/owner/repository/pull/42#issuecomment-123");
} else {
  process.stderr.write("Unexpected gh call: " + args.join(" "));
  process.exit(1);
}
`,
  );
  fs.chmodSync(mockGh, 0o755);

  try {
    const result = spawnSync("bash", [scriptPath], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${directory}${path.delimiter}${process.env.PATH}`,
        GH_TOKEN: "test-token",
        TARGET_REPOSITORY: "owner/repository",
        TARGET_PR_NUMBER: "42",
        TARGET_SHA: sha,
        ISSUE_BODY: "A finding to fix.\nReview fingerprint: abc123",
        ISSUE_MARKER: "Review fingerprint: abc123",
        GITHUB_OUTPUT: outputPath,
        GITHUB_STEP_SUMMARY: summaryPath,
        MOCK_CALLS: callsPath,
        MOCK_POSTED_BODY: postedBodyPath,
        MOCK_STATE: options.state || "open",
        MOCK_SHA: options.sha || sha,
        MOCK_REPO: options.repo || "owner/repository",
        MOCK_EXISTING: options.existing || "",
      },
    });
    return {
      ...result,
      output: fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "",
      calls: fs.readFileSync(callsPath, "utf8"),
      postedBody: fs.existsSync(postedBodyPath)
        ? fs.readFileSync(postedBodyPath, "utf8")
        : null,
    };
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test("requests a fix on the current PR branch", () => {
  const result = runRequest();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.output, /pr_comment_url=https:\/\/github\.com\//);
  assert.match(result.postedBody, /^@copilot Please address these findings on this pull request branch\./);
  assert.match(result.postedBody, /Review fingerprint: abc123/);
});

test("skips a stale, closed, or fork PR without posting", () => {
  for (const options of [
    { sha: "fedcba1234567890abcdef1234567890abcdef12" },
    { state: "closed" },
    { repo: "someone/fork" },
  ]) {
    const result = runRequest(options);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.output, "");
    assert.equal(result.postedBody, null);
  }
});

test("reuses an existing matching comment", () => {
  const existing = "https://github.com/owner/repository/pull/42#issuecomment-99";
  const result = runRequest({ existing });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.output, `pr_comment_url=${existing}\n`);
  assert.equal(result.postedBody, null);
});
