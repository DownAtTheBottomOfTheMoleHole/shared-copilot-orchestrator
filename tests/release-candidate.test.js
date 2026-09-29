const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const scriptPath = path.join(__dirname, "..", "scripts", "release-candidate.sh");
const workflowPath = path.join(__dirname, "..", ".github", "workflows", "release.yml");

function createRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-release-"));
  const remote = path.join(root, "remote.git");
  const worktree = path.join(root, "worktree");

  execFileSync("git", ["init", "--bare", "-q", remote]);
  execFileSync("git", ["init", "-q", "-b", "main", worktree]);
  execFileSync("git", ["-C", worktree, "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--allow-empty", "-qm", "feat: first"]);
  execFileSync("git", ["-C", worktree, "remote", "add", "origin", remote]);
  execFileSync("git", ["-C", worktree, "push", "-qu", "origin", "main"]);

  return { root, worktree };
}

function runCandidate(worktree, testedSha, output, summary) {
  fs.writeFileSync(output, "");
  fs.writeFileSync(summary, "");

  return spawnSync("bash", [scriptPath], {
    cwd: worktree,
    encoding: "utf8",
    env: {
      ...process.env,
      TESTED_SHA: testedSha,
      GITHUB_OUTPUT: output,
      GITHUB_STEP_SUMMARY: summary,
    },
  });
}

test("publishes only when Quality tested the checked-out and current main commit", () => {
  const { root, worktree } = createRepository();
  const output = path.join(root, "output");
  const summary = path.join(root, "summary");

  try {
    const firstSha = execFileSync("git", ["-C", worktree, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();

    let result = runCandidate(worktree, firstSha, output, summary);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(output, "utf8"), "publish=true\n");

    execFileSync("git", ["-C", worktree, "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--allow-empty", "-qm", "feat: second"]);
    const secondSha = execFileSync("git", ["-C", worktree, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    execFileSync("git", ["-C", worktree, "push", "-q", "origin", "main"]);

    execFileSync("git", ["-C", worktree, "checkout", "-q", "--detach", firstSha]);
    result = runCandidate(worktree, firstSha, output, summary);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(output, "utf8"), "publish=false\n");
    assert.match(fs.readFileSync(summary, "utf8"), new RegExp(`current main is ${secondSha}`));

    result = runCandidate(worktree, secondSha, output, summary);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(output, "utf8"), "publish=false\n");
    assert.match(fs.readFileSync(summary, "utf8"), /checked-out commit is/);

    execFileSync("git", ["-C", worktree, "checkout", "-q", "--detach", secondSha]);
    result = runCandidate(worktree, secondSha, output, summary);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(output, "utf8"), "publish=true\n");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("release workflow pins and revalidates the Quality-tested SHA", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");

  assert.match(workflow, /ref: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
  assert.match(workflow, /tag_commit="\$\(git rev-parse "refs\/tags\/\$\{release_tag\}\^\{commit\}"\)"/);
  assert.match(workflow, /if \[\[ "\$\{tag_commit\}" != "\$\{RELEASE_SHA\}" \]\]; then/);
  assert.equal((workflow.match(/^\s+assert_current_main$/gm) || []).length, 2);
});
