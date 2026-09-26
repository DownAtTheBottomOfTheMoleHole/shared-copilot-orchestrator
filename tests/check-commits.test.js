const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { isConventionalCommit } = require("../scripts/check-commits.js");
const checkCommitsPath = path.join(
  __dirname,
  "..",
  "scripts",
  "check-commits.js",
);

function git(repositoryPath, ...args) {
  return execFileSync("git", ["-C", repositoryPath, ...args], {
    encoding: "utf8",
  }).trim();
}

test("accepts conventional subjects with optional scope and breaking marker", () => {
  for (const subject of [
    "feat: add releases",
    "fix(parser): handle null payload",
    "feat(api)!: change workflow inputs",
    "docs: update usage",
    "security(parser): escape mentions",
    "revert: undo release change",
    "Initial plan",
  ]) {
    assert.equal(isConventionalCommit(subject), true, subject);
  }
});

test("rejects non-conventional or empty subjects", () => {
  for (const subject of [
    "Add a new feature",
    "feat: ",
    "Fix(parser): capitalize type",
    "feat(parser) change syntax",
    "feet: typo in type",
    "infra: unknown type",
  ]) {
    assert.equal(isConventionalCommit(subject), false, subject);
  }
});

test("validates the commit range and rejects a non-conventional commit", () => {
  const repositoryPath = fs.mkdtempSync(
    path.join(os.tmpdir(), "orchestrator-commits-"),
  );

  try {
    git(repositoryPath, "init", "-q", "-b", "main");
    git(repositoryPath, "config", "user.name", "Test");
    git(repositoryPath, "config", "user.email", "test@example.invalid");
    const trackedFilePath = path.join(repositoryPath, "subject.txt");
    fs.writeFileSync(trackedFilePath, "baseline\n");
    git(repositoryPath, "add", "subject.txt");
    git(repositoryPath, "commit", "-qm", "docs: baseline");
    const baseSha = git(repositoryPath, "rev-parse", "HEAD");

    fs.appendFileSync(trackedFilePath, "conventional change\n");
    git(repositoryPath, "add", "subject.txt");
    git(repositoryPath, "commit", "-qm", "feat(parser): add commit validation");
    let headSha = git(repositoryPath, "rev-parse", "HEAD");
    let result = spawnSync(
      process.execPath,
      [checkCommitsPath, baseSha, headSha],
      { cwd: repositoryPath, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);

    git(repositoryPath, "commit", "--allow-empty", "-qm", "Initial plan");
    headSha = git(repositoryPath, "rev-parse", "HEAD");
    result = spawnSync(
      process.execPath,
      [checkCommitsPath, baseSha, headSha],
      { cwd: repositoryPath, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);

    fs.appendFileSync(trackedFilePath, "non conventional change\n");
    git(repositoryPath, "add", "subject.txt");
    git(repositoryPath, "commit", "-qm", "not conventional");
    headSha = git(repositoryPath, "rev-parse", "HEAD");
    result = spawnSync(
      process.execPath,
      [checkCommitsPath, baseSha, headSha],
      { cwd: repositoryPath, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Use Conventional Commit subjects/);
  } finally {
    fs.rmSync(repositoryPath, { recursive: true, force: true });
  }
});

test("allows pull requests that only contain empty non-merge commits", () => {
  const repositoryPath = fs.mkdtempSync(
    path.join(os.tmpdir(), "orchestrator-empty-commits-"),
  );

  try {
    git(repositoryPath, "init", "-q", "-b", "main");
    git(repositoryPath, "config", "user.name", "Test");
    git(repositoryPath, "config", "user.email", "test@example.invalid");
    git(repositoryPath, "commit", "--allow-empty", "-qm", "docs: baseline");
    const baseSha = git(repositoryPath, "rev-parse", "HEAD");

    git(repositoryPath, "commit", "--allow-empty", "-qm", "Initial plan");
    const headSha = git(repositoryPath, "rev-parse", "HEAD");
    const result = spawnSync(
      process.execPath,
      [checkCommitsPath, baseSha, headSha],
      { cwd: repositoryPath, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /No non-merge commits with file changes found/);
  } finally {
    fs.rmSync(repositoryPath, { recursive: true, force: true });
  }
});

test("allows the agent-created initial plan subject in the commit range", () => {
  const repositoryPath = fs.mkdtempSync(
    path.join(os.tmpdir(), "orchestrator-initial-plan-"),
  );

  try {
    git(repositoryPath, "init", "-q", "-b", "main");
    git(repositoryPath, "config", "user.name", "Test");
    git(repositoryPath, "config", "user.email", "test@example.invalid");
    const trackedFilePath = path.join(repositoryPath, "subject.txt");
    fs.writeFileSync(trackedFilePath, "baseline\n");
    git(repositoryPath, "add", "subject.txt");
    git(repositoryPath, "commit", "-qm", "docs: baseline");
    const baseSha = git(repositoryPath, "rev-parse", "HEAD");

    git(repositoryPath, "commit", "--allow-empty", "-qm", "Initial plan");
    fs.appendFileSync(trackedFilePath, "release action update\n");
    git(repositoryPath, "add", "subject.txt");
    git(repositoryPath, "commit", "-qm", "fix(ci): update action pin");
    const headSha = git(repositoryPath, "rev-parse", "HEAD");

    const result = spawnSync(
      process.execPath,
      [checkCommitsPath, baseSha, headSha],
      { cwd: repositoryPath, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
  } finally {
    fs.rmSync(repositoryPath, { recursive: true, force: true });
  }
});
