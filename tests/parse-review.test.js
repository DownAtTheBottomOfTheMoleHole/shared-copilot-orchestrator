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

function runParser(reviewPayload) {
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
  const match =
    /^issue_title<<([^\n]+)\n([\s\S]*?)\n\1\nissue_body<<([^\n]+)\n([\s\S]*?)\n\3\n$/.exec(
      output,
    );
  assert.ok(match, "expected title and body to be written as output records");
  return { title: match[2], body: match[4] };
}

test("malformed, null, and empty payloads produce a no-findings result", () => {
  for (const payload of ["{", "null", ""]) {
    const result = runParser(payload);
    assert.equal(result.status, 0, result.stderr);
    assert.match(
      parseOutputs(result.output).body,
      /No structured findings were provided/,
    );
  }
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
  const { title, body } = parseOutputs(result.output);
  assert.equal(title, "Copilot review findings for PR #42");
  assert.match(body, /&lt;unsafe&gt;/);
  assert.match(body, /@​everyone/);
  assert.match(body, /&lt;script&gt;/);
  assert.doesNotMatch(body, /@everyone/);
  assert.match(body, /@copilot please propose and implement a fix/);
});

test("legacy review body payloads produce an actionable finding", () => {
  const result = runParser(
    JSON.stringify({ body: "A finding from a single review payload." }),
  );

  assert.equal(result.status, 0, result.stderr);
  const { body } = parseOutputs(result.output);
  assert.match(body, /A finding from a single review payload/);
  assert.match(body, /@copilot please propose and implement a fix/);
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
