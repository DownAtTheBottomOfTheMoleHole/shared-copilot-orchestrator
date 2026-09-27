const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const parserPath = path.join(__dirname, "..", "scripts", "parse-review.js");
const validEnvironment = {
  TARGET_REPOSITORY: "owner/repository",
  TARGET_PR_NUMBER: "42",
  TARGET_SHA: "abcdef1234567",
};

function runParser(reviewPayload, environment = {}) {
  const outputDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "orchestrator-parser-"),
  );
  const outputPath = path.join(outputDirectory, "github-output");

  try {
    const result = spawnSync(process.execPath, [parserPath], {
      encoding: "utf8",
      env: {
        ...process.env,
        ...validEnvironment,
        REVIEW_PAYLOAD: reviewPayload,
        GITHUB_OUTPUT: outputPath,
        ...environment,
      },
    });

    return {
      ...result,
      output: fs.existsSync(outputPath)
        ? fs.readFileSync(outputPath, "utf8")
        : "",
    };
  } finally {
    fs.rmSync(outputDirectory, { recursive: true, force: true });
  }
}

function parseOutputs(output) {
  const records = {};
  const recordPattern = /^([a-z_]+)<<([^\n]+)\n([\s\S]*?)\n\2\n/;
  let remaining = output;
  while (remaining.length > 0) {
    const match = recordPattern.exec(remaining);
    assert.ok(match, `unexpected output record format: ${remaining}`);
    records[match[1]] = match[3];
    remaining = remaining.slice(match[0].length);
  }
  assert.deepEqual(
    Object.keys(records),
    ["issue_title", "issue_body", "actionable_count", "issue_marker"],
    "expected title, body, actionable count, and marker output records",
  );
  return {
    title: records.issue_title,
    body: records.issue_body,
    actionableCount: Number(records.actionable_count),
    marker: records.issue_marker,
  };
}

test("malformed, null, and empty payloads produce a no-findings result", () => {
  for (const payload of ["{", "null", ""]) {
    const result = runParser(payload);
    assert.equal(result.status, 0, result.stderr);
    const { body, actionableCount } = parseOutputs(result.output);
    assert.match(body, /No structured findings were provided/);
    assert.match(body, /No actionable findings were parsed/);
    assert.equal(actionableCount, 0);
  }
});

test("findings without a body are not actionable", () => {
  const result = runParser(
    JSON.stringify({ findings: [{ path: "a.js", line: 1, body: "   " }] }),
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(parseOutputs(result.output).actionableCount, 0);
});

test("a Copilot overview with no inline findings is not actionable", () => {
  const result = runParser(
    JSON.stringify({
      body: "Copilot review overview: Approval recommended; Findings: None",
      findings: [],
    }),
  );

  assert.equal(result.status, 0, result.stderr);
  const { body, actionableCount } = parseOutputs(result.output);
  assert.equal(actionableCount, 0);
  assert.doesNotMatch(body, /Approval recommended/);
});

test("structured findings are sanitized and included in the issue output", () => {
  const result = runParser(
    JSON.stringify({
      findings: [
        {
          path: "src/<unsafe>.js",
          line: 7,
          severity: "high",
          body: "Notify @everyone and render <script>alert(1)</script> **now**.",
        },
      ],
    }),
  );

  assert.equal(result.status, 0, result.stderr);
  const { title, body, actionableCount, marker } = parseOutputs(result.output);
  assert.equal(title, "Copilot review findings for PR #42");
  assert.match(body, /&lt;unsafe&gt;/);
  assert.match(body, /@​everyone/);
  assert.match(body, /&lt;script&gt;/);
  assert.doesNotMatch(body, /@everyone/);
  assert.doesNotMatch(body, /@copilot/);
  assert.match(body, /Copilot: please propose and implement a fix/);
  assert.equal(actionableCount, 1);
  assert.match(marker, /^Review fingerprint: [0-9a-f]{64}$/);
  assert.ok(body.endsWith(marker));
});

test("identical findings use one marker and changed findings use another", () => {
  const first = JSON.stringify({ findings: [{ path: "a.js", body: "Fix this" }] });
  const changed = JSON.stringify({ findings: [{ path: "a.js", body: "Fix that" }] });
  const firstRun = parseOutputs(runParser(first).output);
  const retry = parseOutputs(runParser(first).output);
  const updated = parseOutputs(runParser(changed).output);
  const newCommit = parseOutputs(runParser(first, { TARGET_SHA: "fedcba1234567" }).output);

  assert.equal(firstRun.marker, retry.marker);
  assert.notEqual(firstRun.marker, updated.marker);
  assert.notEqual(firstRun.marker, newCommit.marker);
});

test("finding order and non-actionable entries do not change the marker", () => {
  const first = JSON.stringify({
    findings: [
      { path: "a.js", line: 1, body: "Fix A" },
      { path: "b.js", line: 2, body: "Fix B" },
    ],
  });
  const reordered = JSON.stringify({
    findings: [
      { path: "ignored.js", body: " " },
      { path: "b.js", line: 2, body: "Fix B" },
      { path: "a.js", line: 1, body: "Fix A" },
    ],
  });

  assert.equal(
    parseOutputs(runParser(first).output).marker,
    parseOutputs(runParser(reordered).output).marker,
  );
});

test("legacy review body payloads produce an actionable finding", () => {
  const result = runParser(
    JSON.stringify({ body: "A finding from a single review payload." }),
  );

  assert.equal(result.status, 0, result.stderr);
  const { body, actionableCount } = parseOutputs(result.output);
  assert.match(body, /A finding from a single review payload/);
  assert.match(body, /Copilot: please propose and implement a fix/);
  assert.equal(actionableCount, 1);
});

test("invalid required metadata exits without writing issue outputs", () => {
  const outputDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "orchestrator-parser-"),
  );
  const outputPath = path.join(outputDirectory, "github-output");

  try {
    const result = spawnSync(process.execPath, [parserPath], {
      encoding: "utf8",
      env: {
        ...process.env,
        ...validEnvironment,
        TARGET_PR_NUMBER: "0",
        GITHUB_OUTPUT: outputPath,
      },
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /TARGET_PR_NUMBER must be a positive integer/);
    assert.equal(fs.existsSync(outputPath), false);
  } finally {
    fs.rmSync(outputDirectory, { recursive: true, force: true });
  }
});
