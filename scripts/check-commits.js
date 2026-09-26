#!/usr/bin/env node

const { execFileSync } = require("node:child_process");

const CONVENTIONAL_COMMIT =
  /^[a-z][a-z0-9-]*(?:\([^)]+\))?!?: \S.*$/;
const ALLOWED_NON_CONVENTIONAL_SUBJECTS = new Set(["Initial plan"]);

function isConventionalCommit(subject) {
  return (
    CONVENTIONAL_COMMIT.test(subject) ||
    ALLOWED_NON_CONVENTIONAL_SUBJECTS.has(subject)
  );
}

function main() {
  const [baseSha, headSha] = process.argv.slice(2);
  if (
    !baseSha ||
    !headSha ||
    !/^[0-9a-f]{7,64}$/i.test(baseSha) ||
    !/^[0-9a-f]{7,64}$/i.test(headSha)
  ) {
    throw new Error("Usage: check-commits.js <base-sha> <head-sha>");
  }

  const subjects = execFileSync(
    "git",
    [
      "log",
      "--format=%x1e%H%x00%s",
      "--name-only",
      "--no-merges",
      `${baseSha}..${headSha}`,
    ],
    { encoding: "utf8" },
  )
    .split("\u001e")
    .map((entry) => entry.replace(/^\n+/, ""))
    .filter(Boolean)
    .map((entry) => {
      const [header, ...fileLines] = entry.split("\n");
      const separatorIndex = header.indexOf("\u0000");
      if (separatorIndex === -1) {
        return { sha: header, subject: "", hasFileChanges: false };
      }
      const sha = header.slice(0, separatorIndex);
      const subject = header.slice(separatorIndex + 1);
      const hasFileChanges =
        fileLines.map((line) => line.trim()).filter(Boolean).length > 0;
      return { sha, subject, hasFileChanges };
    })
    .filter(({ hasFileChanges }) => hasFileChanges)
    .map(({ subject }) => subject);

  if (subjects.length === 0) {
    console.log(
      "No non-merge commits with file changes found in the pull request.",
    );
    return;
  }

  const invalidSubjects = subjects.filter(
    (subject) => !isConventionalCommit(subject),
  );
  if (invalidSubjects.length > 0) {
    throw new Error(
      `Use Conventional Commit subjects for every commit:\n${invalidSubjects
        .map((subject) => `- ${subject}`)
        .join("\n")}`,
    );
  }

  console.log(`Validated ${subjects.length} Conventional Commit subject(s).`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

module.exports = { isConventionalCommit };
