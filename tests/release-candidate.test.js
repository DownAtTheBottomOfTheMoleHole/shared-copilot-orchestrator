const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const scriptPath = path.join(__dirname, "..", "scripts", "release-candidate.sh");

test("publishes only when Quality tested the checked-out commit", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-release-"));
  const output = path.join(directory, "output");
  const summary = path.join(directory, "summary");

  try {
    execFileSync("git", ["init", "-q", "-b", "main", directory]);
    execFileSync("git", ["-C", directory, "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--allow-empty", "-qm", "feat: test"]);
    const currentSha = execFileSync("git", ["-C", directory, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();

    for (const [testedSha, expected] of [
      [currentSha, "publish=true\n"],
      ["0".repeat(40), "publish=false\n"],
    ]) {
      fs.writeFileSync(output, "");
      const result = spawnSync("bash", [scriptPath], {
        cwd: directory,
        encoding: "utf8",
        env: {
          ...process.env,
          TESTED_SHA: testedSha,
          GITHUB_OUTPUT: output,
          GITHUB_STEP_SUMMARY: summary,
        },
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(fs.readFileSync(output, "utf8"), expected);
    }
    assert.match(fs.readFileSync(summary, "utf8"), /Skipping superseded Quality run/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
